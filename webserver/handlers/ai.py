#!/usr/bin/env python3
"""Feature-routed API for creator-private AI generation artifacts."""

import datetime
import hashlib
import json
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AIGeneration
from webserver.services.ai_top5 import (
    FEATURE_KEY,
    PROMPT_VERSION,
    SCHEMA_VERSION,
    AITop5Service,
    Top5ValidationError,
    artifact_dict,
    artifact_items,
    chapter_hash,
    clean_markdown,
    export_markdown,
    request_key,
    validate_chapter_input,
)


CONF = loader.get_settings()


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise Top5ValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise Top5ValidationError("请求 JSON 必须是对象")
    return value


def _book_version(book):
    path = book.get("fmt_epub")
    if path and os.path.isfile(path):
        stat = os.stat(path)
        value = f"epub:{stat.st_size}:{stat.st_mtime_ns}"
    else:
        value = "book:%s:%s" % (book.get("id"), book.get("timestamp", ""))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


class SummaryTop5Feature:
    """TOP5 behavior plugged into the stable AI generation HTTP surface."""

    key = FEATURE_KEY

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_SUMMARY_TOP5_ENABLED", True)

    @staticmethod
    def service(handler):
        service = AITop5Service()
        service.setup(handler.settings["SessionMaker"], CONF)
        return service

    @staticmethod
    def can_access(handler, record):
        if not handler.can_view_book(record.book_id):
            return False, {"err": "ai.not_found", "msg": "AI 结果不存在"}
        book = handler.get_book(record.book_id, raise_exception=False)
        if not book:
            return False, {"err": "ai.not_found", "msg": "AI 结果不存在"}
        if _book_version(book) != record.book_version:
            return False, {"err": "ai.book_version_changed", "msg": "书籍版本已变化，请重新生成"}
        return True, None

    @classmethod
    def list(cls, handler):
        try:
            book_id = int(handler.get_argument("book_id", "0") or 0)
        except (TypeError, ValueError):
            book_id = 0
        if not book_id or not handler.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "书籍不存在"}
        book = handler.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": "书籍不存在"}
        records = (
            handler.session.query(AIGeneration)
            .filter(
                AIGeneration.feature == cls.key,
                AIGeneration.creator_id == handler.user_id(),
                AIGeneration.book_id == book_id,
                AIGeneration.book_version == _book_version(book),
            )
            .order_by(AIGeneration.create_time.desc())
            .all()
        )
        return {"err": "ok", "items": artifact_items(records)}

    @classmethod
    def create(cls, handler, body):
        if not cls.enabled():
            return {"err": "ai.disabled", "msg": "总结鸭未启用"}
        try:
            book_id = int(body.get("book_id", 0))
            chapter = validate_chapter_input(body.get("chapter_text"), body.get("chapter_href"), body.get("chapter_title"))
        except (TypeError, ValueError, Top5ValidationError) as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book = handler.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub") or not handler.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        version = _book_version(book)
        text_hash = chapter_hash(chapter["text"])
        key = request_key(handler.user_id(), book_id, version, chapter["href"], text_hash)
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = handler.session.query(AIGeneration).filter(AIGeneration.request_key == key).first()
        if existing:
            if existing.creator_id != handler.user_id() or existing.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建总结"}
            if existing.status in {"failed", "cancelled"}:
                existing.status = "queued"
                existing.cancel_requested = False
                existing.error_code = ""
                existing.error_message = ""
                existing.progress_message = "等待生成"
                existing.update_time = datetime.datetime.now()
                handler.session.commit()
                cls.service(handler).submit(existing.id, chapter)
            return {"err": "ok", "artifact": artifact_dict(existing), "idempotent": True}
        record = AIGeneration(
            id=str(uuid.uuid4()),
            request_key=key,
            feature=cls.key,
            creator_id=handler.user_id(),
            book_id=book_id,
            book_version=version,
            chapter_href=chapter["href"],
            chapter_title=chapter["title"],
            chapter_text_hash=text_hash,
            chapter_length=len(chapter["text"]),
            status="queued",
            progress_message="等待生成",
            schema_version=SCHEMA_VERSION,
            prompt_version=PROMPT_VERSION,
        )
        handler.session.add(record)
        try:
            handler.session.commit()
        except IntegrityError:
            handler.session.rollback()
            record = handler.session.query(AIGeneration).filter(AIGeneration.request_key == key).first()
            if not record or record.creator_id != handler.user_id() or record.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建总结"}
        cls.service(handler).submit(record.id, chapter)
        return {"err": "ok", "artifact": artifact_dict(record), "idempotent": False}

    @staticmethod
    def update(handler, record, body):
        if record.status != "succeeded":
            return {"err": "ai.not_editable", "msg": "仅成功结果可编辑"}
        try:
            items = body.get("items")
            original = (record.ai_draft or {}).get("items", [])
            if not isinstance(items, list) or len(items) != 5 or len(original) != 5:
                raise Top5ValidationError("结果必须恰好包含五组问答")
            revision = []
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise Top5ValidationError("问答结构无效")
                # Locators are immutable because the minimized chapter text is intentionally not persisted.
                citations = item.get("citations", original[index].get("citations", []))
                if citations != original[index].get("citations", []):
                    raise Top5ValidationError("原文引用不可在编辑时修改")
                revision.append(
                    {
                        "question": clean_markdown(item.get("question"), 300),
                        "answer": clean_markdown(item.get("answer"), 4000),
                        "citations": citations,
                    }
                )
        except Top5ValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record.user_revision = {"items": revision}
        record.result_data = {"items": revision}
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        return {"err": "ok", "artifact": artifact_dict(record)}

    @staticmethod
    def export(handler, record):
        if record.status != "succeeded":
            handler.set_header("Content-Type", "application/json; charset=UTF-8")
            handler.write({"err": "ai.not_ready", "msg": "总结尚未完成"})
            return
        filename = f"top5-{record.book_id}-{record.id[:8]}.md"
        handler.set_header("Content-Type", "text/markdown; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        handler.write(export_markdown(record))


AI_FEATURES = {SummaryTop5Feature.key: SummaryTop5Feature}


def _feature(name):
    return AI_FEATURES.get(str(name or "").strip())


class _AIGenerationBase(BaseHandler):
    def _own_record(self, artifact_id):
        return (
            self.session.query(AIGeneration)
            .filter(AIGeneration.id == artifact_id, AIGeneration.creator_id == self.user_id())
            .first()
        )

    def _visible_record(self, artifact_id):
        record = self._own_record(artifact_id)
        feature = _feature(record.feature) if record else None
        if not record or not feature:
            return None, None, {"err": "ai.not_found", "msg": "AI 结果不存在"}
        visible, error = feature.can_access(self, record)
        if not visible:
            return None, None, error
        return record, feature, None


class AIGenerationCollection(_AIGenerationBase):
    @js
    @auth
    def get(self):
        feature = _feature(self.get_argument("feature", ""))
        if not feature:
            return {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        return feature.list(self)

    @js
    @auth
    def post(self):
        if not CONF.get("AI_ENABLED", True):
            return {"err": "ai.disabled", "msg": "AI 功能未启用"}
        try:
            body = _json_body(self)
        except Top5ValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        feature = _feature(body.get("feature"))
        if not feature:
            return {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        return feature.create(self, body)


class AIGenerationItem(_AIGenerationBase):
    @js
    @auth
    def get(self, artifact_id):
        record, _feature_adapter, error = self._visible_record(artifact_id)
        return error or {"err": "ok", "artifact": artifact_dict(record)}

    @js
    @auth
    def patch(self, artifact_id):
        record, feature, error = self._visible_record(artifact_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except Top5ValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        return feature.update(self, record, body)

    @js
    @auth
    def delete(self, artifact_id):
        record, feature, error = self._visible_record(artifact_id)
        if error:
            return error
        if record.status in {"queued", "running"}:
            feature.service(self).cancel(record.id)
        self.session.delete(record)
        self.session.commit()
        return {"err": "ok", "msg": "AI 结果已删除"}


class AIGenerationCancel(_AIGenerationBase):
    @js
    @auth
    def post(self, artifact_id):
        record, feature, error = self._visible_record(artifact_id)
        if error:
            return error
        if record.status not in {"queued", "running"}:
            return {"err": "ok", "artifact": artifact_dict(record), "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        active = feature.service(self).cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "artifact": artifact_dict(record), "idempotent": False}


class AIGenerationExport(_AIGenerationBase):
    @auth
    def get(self, artifact_id):
        record, feature, error = self._visible_record(artifact_id)
        if error:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write(error)
            return
        feature.export(self, record)


def routes():
    return [
        (r"/api/ai/generations", AIGenerationCollection),
        (r"/api/ai/generations/([0-9a-f-]+)", AIGenerationItem),
        (r"/api/ai/generations/([0-9a-f-]+)/cancel", AIGenerationCancel),
        (r"/api/ai/generations/([0-9a-f-]+)/export", AIGenerationExport),
    ]
