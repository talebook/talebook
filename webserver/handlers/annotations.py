#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime

import tornado.escape
from sqlalchemy.exc import IntegrityError

from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import BookAnnotation, ChapterComment


ANNOTATION_KINDS = {"highlight", "note", "bookmark"}
SOURCE_FILTERS = ("source", "run_id", "connection_id")


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
    return str(value).lower() in {"1", "true", "yes", "on"}


class AnnotationHandlerMixin:
    def _json_body(self):
        try:
            data = tornado.escape.json_decode(self.request.body)
        except (TypeError, ValueError):
            return None
        return data if isinstance(data, dict) else None

    def _book_is_accessible(self, book_id):
        return self.get_book(int(book_id), raise_exception=False) is not None

    def _apply_filters(self, query, model, include_book=True):
        if include_book:
            book_id = self.get_argument("book_id", None)
            if book_id is not None:
                try:
                    query = query.filter(model.book_id == int(book_id))
                except (TypeError, ValueError):
                    return None
        for field in SOURCE_FILTERS:
            value = self.get_argument(field, None)
            if value is not None:
                query = query.filter(getattr(model, field) == value)
        return query

    def _has_source_filter(self):
        return any(self.get_argument(field, None) is not None for field in SOURCE_FILTERS)

    @staticmethod
    def _source_fields_are_valid(data):
        limits = {"connection_id": 128, "run_id": 128, "raw_hash": 128}
        return all(
            data.get(field) in (None, "") or isinstance(data[field], str) and len(data[field]) <= limit
            for field, limit in limits.items()
        )


class BookAnnotations(AnnotationHandlerMixin, BaseHandler):
    @js
    @auth
    def get(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        query = self.session.query(BookAnnotation).filter(
            BookAnnotation.reader_id == self.user_id(), BookAnnotation.book_id == book_id
        )
        query = self._apply_filters(query, BookAnnotation, include_book=False)
        annotations = query.order_by(BookAnnotation.chapter, BookAnnotation.cfi, BookAnnotation.id).all()
        return {"err": "ok", "annotations": [item.to_api_dict() for item in annotations]}

    @js
    @auth
    def post(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("笔记参数错误")}

        kind = data.get("kind")
        source = str(data.get("source") or "talebook").strip()
        external_id = str(data.get("external_id") or "").strip() or None
        client_id = str(data.get("client_id") or "").strip() or None
        if kind not in ANNOTATION_KINDS or not source or not (external_id or client_id):
            return {"err": "params.invalid", "msg": _("笔记类型或幂等标识错误")}
        if (
            len(source) > 64
            or (client_id and len(client_id) > 64)
            or (external_id and len(external_id) > 255)
            or not self._source_fields_are_valid(data)
        ):
            return {"err": "params.invalid", "msg": _("笔记来源标识过长")}

        remote_updated_at, invalid_time = _parse_datetime(data.get("remote_updated_at"))
        if invalid_time:
            return {"err": "params.invalid", "msg": _("远端更新时间格式错误")}

        owner_id = self.user_id()
        query = self.session.query(BookAnnotation).filter(
            BookAnnotation.reader_id == owner_id, BookAnnotation.book_id == book_id
        )
        if external_id:
            annotation = query.filter(BookAnnotation.source == source, BookAnnotation.external_id == external_id).first()
        else:
            annotation = query.filter(BookAnnotation.client_id == client_id).first()

        created = annotation is None
        if created:
            annotation = BookAnnotation(
                reader_id=owner_id,
                book_id=book_id,
                source=source,
                external_id=external_id,
                client_id=client_id,
                kind=kind,
            )
            self.session.add(annotation)
        else:
            existing_remote = annotation.remote_updated_at
            incoming_hash = data.get("raw_hash") or None
            if (
                remote_updated_at
                and existing_remote
                and remote_updated_at < existing_remote
                and incoming_hash != annotation.raw_hash
            ):
                return {
                    "err": "ok",
                    "annotation": annotation.to_api_dict(),
                    "created": False,
                    "stale_ignored": True,
                    "conflict_protected": False,
                }

        for field in ("connection_id", "run_id", "raw_hash"):
            if field in data:
                setattr(annotation, field, data.get(field) or None)
        if "remote_updated_at" in data:
            annotation.remote_updated_at = remote_updated_at
        if client_id and not annotation.client_id:
            annotation.client_id = client_id

        conflict_protected = bool(not created and annotation.user_modified_at and source != "talebook")
        if not conflict_protected:
            annotation.kind = kind
            annotation.cfi = data.get("cfi") or None
            annotation.chapter = str(data.get("chapter") or "")[:500]
            annotation.refer_text = str(data.get("refer_text") or "")
            annotation.text = str(data.get("text") or "")
            annotation.color = str(data.get("color") or "")[:32]
            annotation.source_position = data.get("source_position") or None
        annotation.update_time = datetime.datetime.now()

        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            return {"err": "annotation.id_conflict", "msg": _("笔记幂等标识已被其他记录占用")}
        return {
            "err": "ok",
            "annotation": annotation.to_api_dict(),
            "created": created,
            "stale_ignored": False,
            "conflict_protected": conflict_protected,
        }


class BookAnnotationItem(AnnotationHandlerMixin, BaseHandler):
    def _owned(self, book_id, annotation_id):
        return (
            self.session.query(BookAnnotation)
            .filter(
                BookAnnotation.id == int(annotation_id),
                BookAnnotation.book_id == int(book_id),
                BookAnnotation.reader_id == self.user_id(),
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
        mutable = {"kind", "cfi", "chapter", "refer_text", "text", "color", "source_position"}
        changed = False
        for field in mutable:
            if field not in data:
                continue
            value = data[field]
            if field == "kind" and value not in ANNOTATION_KINDS:
                return {"err": "params.invalid", "msg": _("笔记类型错误")}
            if field == "cfi":
                value = value or None
            elif field == "chapter":
                value = str(value or "")[:500]
            elif field == "color":
                value = str(value or "")[:32]
            elif field in {"refer_text", "text"}:
                value = str(value or "")
            elif field == "source_position":
                value = value or None
            if getattr(annotation, field) != value:
                setattr(annotation, field, value)
                changed = True
        if changed:
            now = datetime.datetime.now()
            annotation.user_modified_at = now
            annotation.update_time = now
            self.session.commit()
        return {"err": "ok", "annotation": annotation.to_api_dict()}

    @js
    @auth
    def delete(self, book_id, annotation_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        annotation = self._owned(book_id, annotation_id)
        if not annotation:
            return {"err": "annotation.not_found", "msg": _("笔记不存在")}
        self.session.delete(annotation)
        self.session.commit()
        return {"err": "ok", "deleted": 1}


class AnnotationCollection(AnnotationHandlerMixin, BaseHandler):
    def _query(self):
        query = self.session.query(BookAnnotation).filter(BookAnnotation.reader_id == self.user_id())
        return self._apply_filters(query, BookAnnotation)

    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        annotations = query.order_by(BookAnnotation.book_id, BookAnnotation.id).all()
        annotations = [item for item in annotations if self.can_view_book(item.book_id)]
        return {"err": "ok", "annotations": [item.to_api_dict() for item in annotations]}

    @js
    @auth
    def delete(self):
        if not self._has_source_filter():
            return {"err": "params.invalid", "msg": _("来源删除至少需要 source、run_id 或 connection_id")}
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        candidates = query.all()
        visible = [item for item in candidates if self.can_view_book(item.book_id)]
        include_modified = _as_bool(self.get_argument("include_modified", "false"))
        protected = [item for item in visible if item.user_modified_at and not include_modified]
        deleted = [item for item in visible if item not in protected]
        for item in deleted:
            self.session.delete(item)
        self.session.commit()
        return {"err": "ok", "deleted": len(deleted), "protected": len(protected)}


class AnnotationExport(AnnotationCollection):
    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        annotations = query.order_by(BookAnnotation.book_id, BookAnnotation.id).all()
        annotations = [item.to_api_dict() for item in annotations if self.can_view_book(item.book_id)]
        return {
            "err": "ok",
            "export": {
                "schema": "talebook.annotations.v1",
                "exported_at": datetime.datetime.now().isoformat(),
                "annotations": annotations,
            },
        }


class BookChapterComments(AnnotationHandlerMixin, BaseHandler):
    @js
    @auth
    def get(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        query = self.session.query(ChapterComment).filter(ChapterComment.book_id == book_id)
        query = self._apply_filters(query, ChapterComment, include_book=False)
        comments = query.order_by(ChapterComment.chapter, ChapterComment.id).all()
        return {"err": "ok", "chapter_comments": [item.to_api_dict() for item in comments]}

    @js
    @auth
    def post(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("章评参数错误")}
        source = str(data.get("source") or "").strip()
        external_id = str(data.get("external_id") or "").strip()
        text = str(data.get("text") or "")
        if (
            not source
            or not external_id
            or not text
            or len(source) > 64
            or len(external_id) > 255
            or not self._source_fields_are_valid(data)
        ):
            return {"err": "params.invalid", "msg": _("章评来源标识或正文错误")}
        remote_updated_at, invalid_time = _parse_datetime(data.get("remote_updated_at"))
        if invalid_time:
            return {"err": "params.invalid", "msg": _("远端更新时间格式错误")}

        owner_id = self.user_id()
        comment = (
            self.session.query(ChapterComment)
            .filter(
                ChapterComment.reader_id == owner_id,
                ChapterComment.book_id == book_id,
                ChapterComment.source == source,
                ChapterComment.external_id == external_id,
            )
            .first()
        )
        created = comment is None
        if created:
            comment = ChapterComment(
                reader_id=owner_id,
                book_id=book_id,
                source=source,
                external_id=external_id,
                text=text,
            )
            self.session.add(comment)
        elif (
            remote_updated_at
            and comment.remote_updated_at
            and remote_updated_at < comment.remote_updated_at
            and (data.get("raw_hash") or None) != comment.raw_hash
        ):
            return {"err": "ok", "chapter_comment": comment.to_api_dict(), "created": False, "stale_ignored": True}

        comment.chapter = str(data.get("chapter") or "")[:500]
        comment.cfi = data.get("cfi") or None
        comment.source_position = data.get("source_position") or None
        comment.text = text
        comment.author_name = str(data.get("author_name") or "")[:255]
        for field in ("connection_id", "run_id", "raw_hash"):
            if field in data:
                setattr(comment, field, data.get(field) or None)
        if "remote_updated_at" in data:
            comment.remote_updated_at = remote_updated_at
        comment.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "chapter_comment": comment.to_api_dict(), "created": created, "stale_ignored": False}


class BookChapterCommentItem(AnnotationHandlerMixin, BaseHandler):
    def _owned(self, book_id, comment_id):
        return (
            self.session.query(ChapterComment)
            .filter(
                ChapterComment.id == int(comment_id),
                ChapterComment.book_id == int(book_id),
                ChapterComment.reader_id == self.user_id(),
            )
            .first()
        )

    @js
    @auth
    def put(self, book_id, comment_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        comment = self._owned(book_id, comment_id)
        if not comment:
            return {"err": "chapter_comment.not_found", "msg": _("章评不存在")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("章评参数错误")}
        for field in ("chapter", "cfi", "source_position", "text", "author_name"):
            if field in data:
                value = data[field]
                if field == "chapter":
                    value = str(value or "")[:500]
                elif field == "author_name":
                    value = str(value or "")[:255]
                elif field == "text":
                    value = str(value or "")
                    if not value:
                        return {"err": "params.invalid", "msg": _("章评正文不能为空")}
                else:
                    value = value or None
                setattr(comment, field, value)
        comment.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "chapter_comment": comment.to_api_dict()}

    @js
    @auth
    def delete(self, book_id, comment_id):
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        comment = self._owned(book_id, comment_id)
        if not comment:
            return {"err": "chapter_comment.not_found", "msg": _("章评不存在")}
        self.session.delete(comment)
        self.session.commit()
        return {"err": "ok", "deleted": 1}


class ChapterCommentCollection(AnnotationHandlerMixin, BaseHandler):
    def _query(self):
        query = self.session.query(ChapterComment).filter(ChapterComment.reader_id == self.user_id())
        return self._apply_filters(query, ChapterComment)

    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        comments = query.order_by(ChapterComment.book_id, ChapterComment.id).all()
        comments = [item.to_api_dict() for item in comments if self.can_view_book(item.book_id)]
        return {"err": "ok", "chapter_comments": comments}

    @js
    @auth
    def delete(self):
        if not self._has_source_filter():
            return {"err": "params.invalid", "msg": _("来源删除至少需要 source、run_id 或 connection_id")}
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        comments = [item for item in query.all() if self.can_view_book(item.book_id)]
        for item in comments:
            self.session.delete(item)
        self.session.commit()
        return {"err": "ok", "deleted": len(comments)}


class ChapterCommentExport(ChapterCommentCollection):
    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
        comments = query.order_by(ChapterComment.book_id, ChapterComment.id).all()
        comments = [item.to_api_dict() for item in comments if self.can_view_book(item.book_id)]
        return {
            "err": "ok",
            "export": {
                "schema": "talebook.chapter-comments.v1",
                "exported_at": datetime.datetime.now().isoformat(),
                "chapter_comments": comments,
            },
        }


def routes():
    return [
        (r"/api/book/([0-9]+)/annotations", BookAnnotations),
        (r"/api/book/([0-9]+)/annotations/([0-9]+)", BookAnnotationItem),
        (r"/api/annotations", AnnotationCollection),
        (r"/api/annotations/export", AnnotationExport),
        (r"/api/book/([0-9]+)/chapter-comments", BookChapterComments),
        (r"/api/book/([0-9]+)/chapter-comments/([0-9]+)", BookChapterCommentItem),
        (r"/api/chapter-comments", ChapterCommentCollection),
        (r"/api/chapter-comments/export", ChapterCommentExport),
    ]
