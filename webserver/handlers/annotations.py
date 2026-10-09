#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime

import tornado.escape
from sqlalchemy import case, func, or_
from sqlalchemy.exc import IntegrityError

from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import Annotation, AnnotationSource, AnnotationVote, PluginSourceRecord
from webserver.services.annotation_sync import AnnotationSyncService


ANNOTATION_TYPES = {"highlight", "note", "bookmark", "chapter_comment", "book_comment"}
# 阅读器的查看范围。公开范围只列评论类记录（不含划线和书签）；旧章评作为所在章节的公开评论。
READER_VIEWS = {"paragraph", "chapter", "book", "mine"}
PUBLIC_COMMENT_TYPES = ("note", "chapter_comment", "book_comment")
CHAPTER_COMMENT_TYPES = ("note", "chapter_comment")
MINE_TYPES = ("highlight", "note", "chapter_comment", "book_comment")
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
SOURCE_FILTERS = (
    "source_name",
    "source_connection_id",
    "source_annotation_id",
    "source_run_id",
    "source_sync_status",
)
SOURCE_DELETE_FILTERS = SOURCE_FILTERS[:-1]
SOURCE_FIELD_LIMITS = {
    "source_name": 64,
    "source_connection_id": 128,
    "source_annotation_id": 255,
    "source_run_id": 128,
    "source_raw_hash": 128,
}
SOURCE_INPUT_FIELDS = set(SOURCE_FIELD_LIMITS) | {"source_position", "source_updated_at"}
LEGACY_SOURCE_FIELDS = {"source", "external_id", "connection_id", "run_id", "raw_hash", "remote_updated_at"}


def _mark_plugin_records_locally_modified(session, annotation_id, now, connection_id=None):
    query = session.query(PluginSourceRecord).filter(
        PluginSourceRecord.entity_type == "annotation",
        PluginSourceRecord.entity_id == str(annotation_id),
    )
    if connection_id is not None:
        try:
            query = query.filter(PluginSourceRecord.connection_id == int(connection_id))
        except (TypeError, ValueError):
            return
    query.update(
        {PluginSourceRecord.local_modified: True, PluginSourceRecord.update_time: now},
        synchronize_session="fetch",
    )


def _parse_datetime(value):
    if value in (None, ""):
        return None, False
    if not isinstance(value, str):
        return None, True
    try:
        parsed = datetime.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo:
            parsed = parsed.astimezone(datetime.timezone.utc).replace(tzinfo=None)
        return parsed, False
    except ValueError:
        return None, True


def _as_bool(value):
    if isinstance(value, bool):
        return value
    return str(value).lower() in {"1", "true", "yes", "on"}


class AnnotationHandlerMixin:
    def _annotation_dict(self, annotation):
        data = annotation.to_api_dict()
        data["can_edit"] = annotation.reader_id == self.user_id()
        return data

    def _json_body(self):
        try:
            data = tornado.escape.json_decode(self.request.body)
        except (TypeError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def _reader_name(self):
        reader = self.current_user
        return str(getattr(reader, "name", "") or getattr(reader, "username", "") or "读者 %s" % self.user_id())[:255]

    def _book_is_accessible(self, book_id):
        return self.get_book(int(book_id), raise_exception=False) is not None

    def _source_filters(self):
        return {field: self.get_argument(field, None) for field in SOURCE_FILTERS}

    def _apply_filters(self, query, include_book=True):
        if include_book:
            book_id = self.get_argument("book_id", None)
            if book_id is not None:
                try:
                    query = query.filter(Annotation.book_id == int(book_id))
                except (TypeError, ValueError):
                    return None
        source_filters = {field: value for field, value in self._source_filters().items() if value is not None}
        if source_filters:
            query = query.join(AnnotationSource)
            for field, value in source_filters.items():
                query = query.filter(getattr(AnnotationSource, field) == value)
            query = query.distinct()
        return query

    def _page_args(self):
        try:
            offset = max(0, int(self.get_argument("cursor", "") or 0))
            limit = min(MAX_PAGE_SIZE, max(1, int(self.get_argument("limit", "") or DEFAULT_PAGE_SIZE)))
        except (TypeError, ValueError):
            return None, None
        return offset, limit

    def _page(self, query, offset, limit):
        rows = query.offset(offset).limit(limit + 1).all()
        has_more = len(rows) > limit
        rows = rows[:limit]
        return {
            "err": "ok",
            "items": self._reader_items(rows),
            "next_cursor": str(offset + limit) if has_more else None,
            "has_more": has_more,
        }

    def _root_of(self, annotation):
        if annotation.root_id is None:
            return annotation
        return self.session.get(Annotation, annotation.root_id)

    def _is_visible(self, annotation):
        """回复没有独立的公开范围：私有主评论及其全部回复只有主评论作者可见。"""
        root = self._root_of(annotation)
        return root is not None and (root.reader_id == self.user_id() or not root.is_private)

    def _visible_item(self, book_id, annotation_id):
        annotation = self.session.get(Annotation, int(annotation_id))
        if annotation is None or annotation.book_id != int(book_id) or not self._is_visible(annotation):
            return None
        return annotation

    def _descendants(self, annotation):
        query = self.session.query(Annotation)
        if annotation.root_id is None:
            return query.filter(Annotation.root_id == annotation.id).all()
        return query.filter(Annotation.thread_id == annotation.id).all()

    def _is_publicly_visible(self, annotation):
        root = self._root_of(annotation)
        return root is not None and not root.is_private

    def _detach_remote_copies(self, annotations, drop=True):
        """记下这些记录在外部来源的副本身份；drop 时同时解除映射，之后重新公开会作为新记录同步。"""
        remote = []
        for annotation in annotations:
            for source in list(annotation.sources):
                if source.source_annotation_id:
                    remote.append(source.to_api_dict())
                if drop:
                    self.session.delete(source)
        return remote

    def _reader_items(self, annotations, keep_sources=False):
        """阅读器用的序列化：附上计数、当前读者的票和回复对象；按页批量查询，不逐条查询。"""
        ids = [item.id for item in annotations]
        if not ids:
            return []
        me = self.user_id()
        counts = {}
        for annotation_id, value, count in (
            self.session.query(AnnotationVote.annotation_id, AnnotationVote.value, func.count(AnnotationVote.id))
            .filter(AnnotationVote.annotation_id.in_(ids))
            .group_by(AnnotationVote.annotation_id, AnnotationVote.value)
        ):
            counts[(annotation_id, value)] = count
        my_votes = dict(
            self.session.query(AnnotationVote.annotation_id, AnnotationVote.value).filter(
                AnnotationVote.annotation_id.in_(ids), AnnotationVote.reader_id == me
            )
        )
        reply_counts = dict(
            self.session.query(Annotation.root_id, func.count(Annotation.id))
            .filter(Annotation.root_id.in_(ids))
            .group_by(Annotation.root_id)
        )
        reply_to_ids = {item.reply_to_id for item in annotations if item.reply_to_id}
        names = (
            dict(self.session.query(Annotation.id, Annotation.author_name).filter(Annotation.id.in_(reply_to_ids)))
            if reply_to_ids
            else {}
        )
        items = []
        for item in annotations:
            data = self._annotation_dict(item)
            # 同步状态属于作者自己的连接，不展示给其他读者。
            if not keep_sources or item.reader_id != me:
                data.pop("sources", None)
            data.update(
                {
                    "is_mine": item.reader_id == me,
                    "like_count": counts.get((item.id, 1), 0),
                    "dislike_count": counts.get((item.id, -1), 0),
                    "user_vote": my_votes.get(item.id, 0),
                    "reply_count": reply_counts.get(item.id, 0) if item.root_id is None else 0,
                    "reply_to_name": names.get(item.reply_to_id, "") if item.reply_to_id else "",
                }
            )
            items.append(data)
        return items

    def _has_source_delete_filter(self):
        return any(self.get_argument(field, None) is not None for field in SOURCE_DELETE_FILTERS)

    @staticmethod
    def _source_fields_are_valid(data):
        return all(
            data.get(field) in (None, "") or isinstance(data[field], str) and len(data[field]) <= limit
            for field, limit in SOURCE_FIELD_LIMITS.items()
        )

    @staticmethod
    def _source_identity(data):
        source_name = str(data.get("source_name") or "").strip() or None
        source_connection_id = str(data.get("source_connection_id") or "").strip()
        source_annotation_id = str(data.get("source_annotation_id") or "").strip() or None
        return source_name, source_connection_id, source_annotation_id

    def _source_query(self):
        query = self.session.query(AnnotationSource).join(Annotation).filter(Annotation.reader_id == self.user_id())
        book_id = self.get_argument("book_id", None)
        if book_id is not None:
            try:
                query = query.filter(Annotation.book_id == int(book_id))
            except (TypeError, ValueError):
                return None
        for field, value in self._source_filters().items():
            if value is not None:
                query = query.filter(getattr(AnnotationSource, field) == value)
        return query


class BookAnnotations(AnnotationHandlerMixin, BaseHandler):
    @js
    @auth
    def get(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        view = self.get_argument("view", None)
        if view is not None:
            return self._reader_list(book_id, view)
        scope = self.get_argument("scope", "visible")
        if scope not in {"visible", "public", "mine"}:
            return {"err": "params.invalid", "msg": _("笔记范围错误")}
        # 回复挂在主评论下，只在阅读器的评论详情里出现，不进入笔记列表。
        query = self.session.query(Annotation).filter(
            Annotation.book_id == book_id,
            Annotation.root_id.is_(None),
            or_(Annotation.reader_id == self.user_id(), Annotation.is_private.is_(False)),
        )
        if scope == "public":
            query = query.filter(Annotation.is_private.is_(False))
        elif scope == "mine":
            query = query.filter(Annotation.reader_id == self.user_id())
        chapter = self.get_argument("chapter", None)
        if chapter is not None:
            query = query.filter(Annotation.chapter == str(chapter)[:500])
        query = self._apply_filters(query, include_book=False)
        annotations = query.order_by(Annotation.chapter, Annotation.cfi, Annotation.id).all()
        return {"err": "ok", "annotations": [self._annotation_dict(item) for item in annotations]}

    def _reader_list(self, book_id, view):
        """阅读器的分页列表：只含顶层记录；自己的在前、再按时间倒序，全量排序后再分页。"""
        if view not in READER_VIEWS:
            return {"err": "params.invalid", "msg": _("笔记范围错误")}
        offset, limit = self._page_args()
        if offset is None:
            return {"err": "params.invalid", "msg": _("分页参数错误")}
        me = self.user_id()
        query = self.session.query(Annotation).filter(Annotation.book_id == book_id, Annotation.root_id.is_(None))
        if view == "mine":
            query = query.filter(Annotation.reader_id == me, Annotation.annotation_type.in_(MINE_TYPES))
        else:
            query = query.filter(Annotation.is_private.is_(False))
            if view == "book":
                query = query.filter(Annotation.annotation_type.in_(PUBLIC_COMMENT_TYPES))
            else:
                chapter = self.get_argument("chapter", "")
                query = query.filter(
                    Annotation.chapter == str(chapter)[:500], Annotation.annotation_type.in_(CHAPTER_COMMENT_TYPES)
                )
                if view == "paragraph":
                    paragraph_cfi = self.get_argument("paragraph_cfi", "")
                    if not paragraph_cfi:
                        return {"err": "params.invalid", "msg": _("缺少段落位置")}
                    query = query.filter(Annotation.annotation_type == "note", Annotation.cfi == paragraph_cfi)
        query = query.order_by(
            case((Annotation.reader_id == me, 0), else_=1), Annotation.create_time.desc(), Annotation.id.desc()
        )
        return self._page(query, offset, limit)

    def _reply_values(self, book_id, data):
        """校验回复关系，返回 (主评论, thread_id) 或错误响应。"""
        try:
            root = self.session.get(Annotation, int(data.get("root_id")))
            reply_to_id = int(data["reply_to_id"]) if data.get("reply_to_id") else None
        except (TypeError, ValueError):
            return None, None, {"err": "params.invalid", "msg": _("回复参数错误")}
        if (
            root is None
            or root.book_id != book_id
            or root.root_id is not None
            or root.is_private
            or root.annotation_type not in PUBLIC_COMMENT_TYPES
        ):
            return None, None, {"err": "annotation.not_found", "msg": _("要回复的评论不存在或不接受回复")}
        thread_id = None
        if reply_to_id and reply_to_id != root.id:
            target = self.session.get(Annotation, reply_to_id)
            if target is None or target.root_id != root.id:
                return None, None, {"err": "annotation.not_found", "msg": _("要回复的评论不存在")}
            thread_id = target.thread_id or target.id
        return root, (reply_to_id if reply_to_id != root.id else None, thread_id), None

    @js
    @auth
    def post(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("笔记参数错误")}

        reply_root = None
        if data.get("root_id") not in (None, ""):
            reply_root, reply_link, error = self._reply_values(book_id, data)
            if error:
                return error
            # 回复没有独立的类型与公开范围：一律为文字评论，跟随主评论公开。
            data = {**data, "annotation_type": "note", "is_private": False}

        annotation_type = data.get("annotation_type")
        client_id = str(data.get("client_id") or "").strip() or None
        source_name, source_connection_id, source_annotation_id = self._source_identity(data)
        has_source_fields = any(field in data for field in SOURCE_INPUT_FIELDS)
        if (
            annotation_type not in ANNOTATION_TYPES
            or not (client_id or source_annotation_id)
            or source_name == "talebook"
            or has_source_fields != bool(source_name)
            or source_name
            and not source_annotation_id
            or client_id
            and len(client_id) > 64
            or any(field in data for field in LEGACY_SOURCE_FIELDS)
            or not self._source_fields_are_valid(data)
        ):
            return {"err": "params.invalid", "msg": _("笔记类型或来源标识错误")}

        source_updated_at, invalid_time = _parse_datetime(data.get("source_updated_at"))
        if invalid_time:
            return {"err": "params.invalid", "msg": _("来源更新时间格式错误")}

        owner_id = self.user_id()
        source = None
        annotation = None
        if source_name:
            source = (
                self.session.query(AnnotationSource)
                .join(Annotation)
                .filter(
                    Annotation.reader_id == owner_id,
                    Annotation.book_id == book_id,
                    AnnotationSource.source_name == source_name,
                    AnnotationSource.source_connection_id == source_connection_id,
                    AnnotationSource.source_annotation_id == source_annotation_id,
                )
                .first()
            )
            annotation = source.annotation if source else None
        if annotation is None and client_id:
            annotation = (
                self.session.query(Annotation)
                .filter(
                    Annotation.reader_id == owner_id,
                    Annotation.book_id == book_id,
                    Annotation.client_id == client_id,
                )
                .first()
            )

        if annotation is not None:
            # 幂等更新不能改变记录的回复关系：client_id 已属于顶层记录或其他主评论下的回复时拒绝。
            expected = (reply_root.id, *reply_link) if reply_root is not None else (None, None, None)
            if (annotation.root_id, annotation.reply_to_id, annotation.thread_id) != expected:
                return {"err": "annotation.id_conflict", "msg": _("笔记幂等标识已被其他记录占用")}

        created = annotation is None
        now = datetime.datetime.now()
        if created:
            annotation = Annotation(
                reader_id=owner_id,
                book_id=book_id,
                client_id=client_id,
                annotation_type=annotation_type,
                is_private=_as_bool(data.get("is_private", True)),
            )
            if reply_root is not None:
                annotation.root_id = reply_root.id
                annotation.reply_to_id, annotation.thread_id = reply_link
            self.session.add(annotation)
            self.session.flush()
        elif client_id and not annotation.client_id:
            annotation.client_id = client_id

        if source_name and source is None:
            source = AnnotationSource(
                annotation=annotation,
                source_name=source_name,
                source_connection_id=source_connection_id,
                source_annotation_id=source_annotation_id,
            )
            self.session.add(source)

        if source and not created:
            incoming_hash = data.get("source_raw_hash") or None
            if (
                source_updated_at
                and source.source_updated_at
                and source_updated_at < source.source_updated_at
                and incoming_hash != source.source_raw_hash
            ):
                return {
                    "err": "ok",
                    "annotation": self._annotation_dict(annotation),
                    "created": False,
                    "stale_ignored": True,
                    "conflict_protected": False,
                    "sync_enqueued": False,
                }

        if source:
            for field in ("source_run_id", "source_position", "source_raw_hash"):
                if field in data:
                    setattr(source, field, data.get(field) or None)
            if "source_updated_at" in data:
                source.source_updated_at = source_updated_at
            source.source_sync_status = "synced"
            source.source_synced_at = now
            source.source_sync_error = None
            source.update_time = now

        conflict_protected = bool(source and not created and annotation.user_modified_at)
        content_changed = created
        if not conflict_protected:
            values = {
                "annotation_type": annotation_type,
                "cfi": data.get("cfi") or None,
                "range_cfi": data.get("range_cfi") or None,
                "chapter": str(data.get("chapter") or "")[:500],
                "quote_text": str(data.get("quote_text") or ""),
                "content": str(data.get("content") or ""),
                "color": str(data.get("color") or "")[:32],
                # The authenticated reader owns every write through this public endpoint.
                # External providers preserve their remote author through the internal
                # annotation writer, never through client-controlled provenance fields.
                "author_name": self._reader_name(),
            }
            if annotation.root_id is not None:
                # 回复只保存正文；位置与章节跟随主评论，不信任客户端传值。
                root = self.session.get(Annotation, annotation.root_id)
                values.update({"cfi": None, "range_cfi": None, "chapter": root.chapter if root else "", "quote_text": ""})
            if created or not source_name:
                values["is_private"] = _as_bool(data.get("is_private", annotation.is_private))
            for field, value in values.items():
                if getattr(annotation, field) != value:
                    setattr(annotation, field, value)
                    content_changed = True
        if not source_name and not created and content_changed:
            annotation.user_modified_at = now
            _mark_plugin_records_locally_modified(self.session, annotation.id, now)
        annotation.update_time = now

        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            return {"err": "annotation.id_conflict", "msg": _("笔记幂等标识已被其他记录占用")}

        sync_enqueued = bool(not annotation.is_private and content_changed and self._is_publicly_visible(annotation))
        if sync_enqueued:
            AnnotationSyncService().sync_annotation(
                annotation.id,
                exclude_source_name=source_name,
                exclude_source_connection_id=source_connection_id,
            )
        return {
            "err": "ok",
            "annotation": self._reader_items([annotation], keep_sources=True)[0],
            "created": created,
            "stale_ignored": False,
            "conflict_protected": conflict_protected,
            "sync_enqueued": sync_enqueued,
        }


class BookAnnotationItem(AnnotationHandlerMixin, BaseHandler):
    @js
    @auth
    def get(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        annotation = self._visible_item(book_id, annotation_id)
        if annotation is None:
            return {"err": "annotation.not_found", "msg": _("这条评论已不存在")}
        return {"err": "ok", "annotation": self._reader_items([annotation])[0]}

    def _owned(self, book_id, annotation_id):
        return (
            self.session.query(Annotation)
            .filter(
                Annotation.id == int(annotation_id),
                Annotation.book_id == int(book_id),
                Annotation.reader_id == self.user_id(),
            )
            .first()
        )

    @js
    @auth
    def put(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        annotation = self._owned(book_id, annotation_id)
        if not annotation:
            return {"err": "annotation.not_found", "msg": _("笔记不存在")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("笔记参数错误")}
        if not self._is_visible(annotation):
            return {"err": "annotation.not_found", "msg": _("笔记不存在")}
        was_public = not annotation.is_private
        mutable = {
            "annotation_type",
            "is_private",
            "cfi",
            "range_cfi",
            "chapter",
            "quote_text",
            "content",
            "color",
        }
        if annotation.root_id is not None:
            # 回复只能改正文。
            mutable = {"content"}
        elif annotation.annotation_type == "highlight":
            # 划线固定私有。
            mutable.discard("is_private")
        changed = False
        for field in mutable:
            if field not in data:
                continue
            value = data[field]
            if field == "annotation_type" and value not in ANNOTATION_TYPES:
                return {"err": "params.invalid", "msg": _("笔记类型错误")}
            if field == "is_private":
                value = _as_bool(value)
            elif field in ("cfi", "range_cfi"):
                value = value or None
            elif field == "chapter":
                value = str(value or "")[:500]
            elif field == "color":
                value = str(value or "")[:32]
            elif field == "author_name":
                value = str(value or "")[:255]
            else:
                value = str(value or "")
            if getattr(annotation, field) != value:
                setattr(annotation, field, value)
                changed = True
        if changed:
            now = datetime.datetime.now()
            annotation.user_modified_at = now
            annotation.update_time = now
            _mark_plugin_records_locally_modified(self.session, annotation.id, now)
            remote = []
            if was_public and annotation.is_private:
                # 改为私有：外部副本必须撤回，私有内容永不外发。
                # 外部来源删除主评论时会级联删除其下回复；回复的映射在本地一并解除。
                remote = self._detach_remote_copies([annotation])
                self._detach_remote_copies(self._descendants(annotation))
            self.session.commit()
            if remote:
                AnnotationSyncService().delete_remote(remote)
            elif not annotation.is_private and self._is_publicly_visible(annotation):
                service = AnnotationSyncService()
                service.sync_annotation(annotation.id)
                if not was_public and annotation.root_id is None:
                    # 重新公开：改私有时回复的映射已解除，主评论之后按创建顺序重新同步其下回复。
                    for reply in sorted(self._descendants(annotation), key=lambda item: item.id):
                        service.sync_annotation(reply.id)
        return {
            "err": "ok",
            "annotation": self._reader_items([annotation], keep_sources=True)[0],
            "sync_enqueued": changed and not annotation.is_private,
        }

    @js
    @auth
    def delete(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        annotation = self._owned(book_id, annotation_id)
        if not annotation or not self._is_visible(annotation):
            return {"err": "annotation.not_found", "msg": _("笔记不存在")}
        # 真删除：主评论连同全部回复，第一层回复连同其下回复；投票一并删除。
        targets = [annotation] + self._descendants(annotation)
        ids = [item.id for item in targets]
        now = datetime.datetime.now()
        # 外部来源只需删除最上层这条：来源自己会级联删除其下回复。
        remote = self._detach_remote_copies([annotation], drop=False)
        for item in targets:
            _mark_plugin_records_locally_modified(self.session, item.id, now)
        self.session.query(AnnotationVote).filter(AnnotationVote.annotation_id.in_(ids)).delete(synchronize_session=False)
        for item in targets:
            self.session.delete(item)
        self.session.commit()
        if remote:
            AnnotationSyncService().delete_remote(remote)
        return {"err": "ok", "deleted": len(ids)}


class BookAnnotationSummary(AnnotationHandlerMixin, BaseHandler):
    """段尾评论气泡：某章各段的公开顶层文字评论数。"""

    @js
    @auth
    def get(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        chapter = str(self.get_argument("chapter", ""))[:500]
        rows = (
            self.session.query(Annotation.cfi, func.count(Annotation.id))
            .filter(
                Annotation.book_id == book_id,
                Annotation.chapter == chapter,
                Annotation.root_id.is_(None),
                Annotation.is_private.is_(False),
                Annotation.annotation_type == "note",
                Annotation.cfi.isnot(None),
            )
            .group_by(Annotation.cfi)
            .all()
        )
        return {"err": "ok", "items": [{"paragraph_cfi": cfi, "count": count} for cfi, count in rows]}


class BookAnnotationReplies(AnnotationHandlerMixin, BaseHandler):
    """一条主评论的回复，按时间正序分页。"""

    @js
    @auth
    def get(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        root = self._visible_item(book_id, annotation_id)
        if root is None or root.root_id is not None:
            return {"err": "annotation.not_found", "msg": _("这条评论已不存在")}
        offset, limit = self._page_args()
        if offset is None:
            return {"err": "params.invalid", "msg": _("分页参数错误")}
        query = (
            self.session.query(Annotation)
            .filter(Annotation.root_id == root.id)
            .order_by(Annotation.create_time.asc(), Annotation.id.asc())
        )
        return self._page(query, offset, limit)


class BookAnnotationVote(AnnotationHandlerMixin, BaseHandler):
    """赞（1）、踩（-1）或取消（0）。每人每条一票，私有记录不接受投票。"""

    @js
    @auth
    def put(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        data = self._json_body()
        value = data.get("value") if data else None
        if value not in (1, -1, 0):
            return {"err": "params.invalid", "msg": _("投票参数错误")}
        annotation = self._visible_item(book_id, annotation_id)
        if annotation is None or not self._is_publicly_visible(annotation):
            return {"err": "annotation.not_found", "msg": _("这条评论已不存在或不接受投票")}
        me = self.user_id()
        vote = (
            self.session.query(AnnotationVote)
            .filter(AnnotationVote.annotation_id == annotation.id, AnnotationVote.reader_id == me)
            .first()
        )
        now = datetime.datetime.now()
        if value == 0:
            if vote:
                self.session.delete(vote)
        elif vote:
            vote.value = value
            vote.update_time = now
        else:
            self.session.add(AnnotationVote(annotation_id=annotation.id, reader_id=me, value=value))
        try:
            self.session.commit()
        except IntegrityError:
            # 同一读者并发投票：唯一约束兜底，以已存在的那一票为准。
            self.session.rollback()
        AnnotationSyncService().sync_vote(annotation.id, me, value)
        item = self._reader_items([annotation])[0]
        return {
            "err": "ok",
            "like_count": item["like_count"],
            "dislike_count": item["dislike_count"],
            "user_vote": item["user_vote"],
        }


class AnnotationCollection(AnnotationHandlerMixin, BaseHandler):
    def _query(self):
        query = self.session.query(Annotation).filter(Annotation.reader_id == self.user_id())
        return self._apply_filters(query)

    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        # 与单书笔记列表一致：回复只在阅读器的评论详情里出现。
        query = query.filter(Annotation.root_id.is_(None))
        annotations = query.order_by(Annotation.book_id, Annotation.id).all()
        annotations = [item for item in annotations if self.can_view_book(item.book_id)]
        return {"err": "ok", "annotations": [self._annotation_dict(item) for item in annotations]}

    @js
    @auth
    def delete(self):
        if not self._has_source_delete_filter():
            return {"err": "params.invalid", "msg": _("来源清理至少需要一个 source_ 筛选条件")}
        query = self._source_query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        sources = [source for source in query.all() if self.can_view_book(source.annotation.book_id)]
        now = datetime.datetime.now()
        for source in sources:
            _mark_plugin_records_locally_modified(
                self.session,
                source.annotation_id,
                now,
                connection_id=source.source_connection_id,
            )
            self.session.delete(source)
        self.session.commit()
        return {"err": "ok", "sources_deleted": len(sources), "annotations_deleted": 0}


class AnnotationExport(AnnotationCollection):
    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        annotations = query.order_by(Annotation.book_id, Annotation.id).all()
        # 回复跟随主评论的可见性：主评论改为私有后，回复作者也不能再导出。
        annotations = [
            self._annotation_dict(item)
            for item in annotations
            if self.can_view_book(item.book_id) and (item.root_id is None or self._is_visible(item))
        ]
        return {
            "err": "ok",
            "export": {
                "schema": "talebook.annotations.v2",
                "exported_at": datetime.datetime.now().isoformat(),
                "annotations": annotations,
            },
        }


def routes():
    return [
        (r"/api/book/([0-9]+)/annotations", BookAnnotations),
        (r"/api/book/([0-9]+)/annotations/summary", BookAnnotationSummary),
        (r"/api/book/([0-9]+)/annotations/([0-9]+)", BookAnnotationItem),
        (r"/api/book/([0-9]+)/annotations/([0-9]+)/replies", BookAnnotationReplies),
        (r"/api/book/([0-9]+)/annotations/([0-9]+)/vote", BookAnnotationVote),
        (r"/api/annotations", AnnotationCollection),
        (r"/api/annotations/export", AnnotationExport),
    ]
