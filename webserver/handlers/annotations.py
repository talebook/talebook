#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime

import tornado.escape
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import Annotation, AnnotationSource
from webserver.services.annotation_sync import AnnotationSyncService


ANNOTATION_TYPES = {"highlight", "note", "bookmark", "chapter_comment"}
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
        scope = self.get_argument("scope", "visible")
        if scope not in {"visible", "public", "mine"}:
            return {"err": "params.invalid", "msg": _("笔记范围错误")}
        query = self.session.query(Annotation).filter(
            Annotation.book_id == book_id,
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

    @js
    @auth
    def post(self, book_id):
        book_id = int(book_id)
        if not self._book_is_accessible(book_id):
            return {"err": "params.book.invalid", "msg": _("书籍已不存在或无权访问")}
        data = self._json_body()
        if data is None:
            return {"err": "params.invalid", "msg": _("笔记参数错误")}

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
                "chapter": str(data.get("chapter") or "")[:500],
                "quote_text": str(data.get("quote_text") or ""),
                "content": str(data.get("content") or ""),
                "color": str(data.get("color") or "")[:32],
                # The authenticated reader owns every write through this public endpoint.
                # External providers preserve their remote author through the internal
                # annotation writer, never through client-controlled provenance fields.
                "author_name": self._reader_name(),
            }
            if created or not source_name:
                values["is_private"] = _as_bool(data.get("is_private", annotation.is_private))
            for field, value in values.items():
                if getattr(annotation, field) != value:
                    setattr(annotation, field, value)
                    content_changed = True
        if not source_name and not created and content_changed:
            annotation.user_modified_at = now
        annotation.update_time = now

        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            return {"err": "annotation.id_conflict", "msg": _("笔记幂等标识已被其他记录占用")}

        sync_enqueued = bool(not annotation.is_private and content_changed)
        if sync_enqueued:
            AnnotationSyncService().sync_annotation(
                annotation.id,
                exclude_source_name=source_name,
                exclude_source_connection_id=source_connection_id,
            )
        return {
            "err": "ok",
            "annotation": self._annotation_dict(annotation),
            "created": created,
            "stale_ignored": False,
            "conflict_protected": conflict_protected,
            "sync_enqueued": sync_enqueued,
        }


class BookAnnotationItem(AnnotationHandlerMixin, BaseHandler):
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
        mutable = {
            "annotation_type",
            "is_private",
            "cfi",
            "chapter",
            "quote_text",
            "content",
            "color",
        }
        changed = False
        for field in mutable:
            if field not in data:
                continue
            value = data[field]
            if field == "annotation_type" and value not in ANNOTATION_TYPES:
                return {"err": "params.invalid", "msg": _("笔记类型错误")}
            if field == "is_private":
                value = _as_bool(value)
            elif field == "cfi":
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
            self.session.commit()
            if not annotation.is_private:
                AnnotationSyncService().sync_annotation(annotation.id)
        return {
            "err": "ok",
            "annotation": self._annotation_dict(annotation),
            "sync_enqueued": changed and not annotation.is_private,
        }

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
        query = self.session.query(Annotation).filter(Annotation.reader_id == self.user_id())
        return self._apply_filters(query)

    @js
    @auth
    def get(self):
        query = self._query()
        if query is None:
            return {"err": "params.invalid", "msg": _("书籍参数错误")}
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
        for source in sources:
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
        annotations = [self._annotation_dict(item) for item in annotations if self.can_view_book(item.book_id)]
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
        (r"/api/book/([0-9]+)/annotations/([0-9]+)", BookAnnotationItem),
        (r"/api/annotations", AnnotationCollection),
        (r"/api/annotations/export", AnnotationExport),
    ]
