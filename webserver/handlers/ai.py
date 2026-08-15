#!/usr/bin/env python3
"""Authenticated API for creator-private Summary Duck TOP5 artifacts."""

import datetime
import hashlib
import json
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITop5Result
from webserver.services.ai_top5 import (
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


class _Top5Base(BaseHandler):
    def _service(self):
        service = AITop5Service()
        service.setup(self.settings["SessionMaker"], CONF)
        return service

    def _own_record(self, artifact_id):
        return (
            self.session.query(AITop5Result)
            .filter(AITop5Result.id == artifact_id, AITop5Result.creator_id == self.user_id())
            .first()
        )

    def _visible_record(self, artifact_id):
        record = self._own_record(artifact_id)
        if not record or not self.can_view_book(record.book_id):
            return None, {"err": "ai.not_found", "msg": "总结结果不存在"}
        book = self.get_book(record.book_id, raise_exception=False)
        if not book:
            return None, {"err": "ai.not_found", "msg": "总结结果不存在"}
        if _book_version(book) != record.book_version:
            return None, {"err": "ai.book_version_changed", "msg": "书籍版本已变化，请重新生成"}
        return record, None


class AITop5Collection(_Top5Base):
    @js
    @auth
    def get(self):
        book_id = int(self.get_argument("book_id", "0") or 0)
        if not book_id or not self.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "书籍不存在"}
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": "书籍不存在"}
        version = _book_version(book)
        records = (
            self.session.query(AITop5Result)
            .filter(
                AITop5Result.creator_id == self.user_id(),
                AITop5Result.book_id == book_id,
                AITop5Result.book_version == version,
            )
            .order_by(AITop5Result.create_time.desc())
            .all()
        )
        return {"err": "ok", "items": artifact_items(records)}

    @js
    @auth
    def post(self):
        if not CONF.get("AI_TOP5_ENABLED", True):
            return {"err": "ai.disabled", "msg": "总结鸭未启用"}
        try:
            body = _json_body(self)
            book_id = int(body.get("book_id", 0))
            chapter = validate_chapter_input(body.get("chapter_text"), body.get("chapter_href"), body.get("chapter_title"))
        except (TypeError, ValueError, Top5ValidationError) as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book = self.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub"):
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        version = _book_version(book)
        text_hash = chapter_hash(chapter["text"])
        key = request_key(self.user_id(), book_id, version, chapter["href"], text_hash)
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = self.session.query(AITop5Result).filter(AITop5Result.request_key == key).first()
        if existing:
            if existing.creator_id != self.user_id():
                return {"err": "ai.conflict", "msg": "无法创建总结"}
            if existing.status in {"failed", "cancelled"}:
                existing.status = "queued"
                existing.cancel_requested = False
                existing.error_code = ""
                existing.error_message = ""
                existing.progress_message = "等待生成"
                existing.update_time = datetime.datetime.now()
                self.session.commit()
                self._service().submit(existing.id, chapter)
            return {"err": "ok", "artifact": artifact_dict(existing), "idempotent": True}
        record = AITop5Result(
            id=str(uuid.uuid4()),
            request_key=key,
            creator_id=self.user_id(),
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
        self.session.add(record)
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            record = self.session.query(AITop5Result).filter(AITop5Result.request_key == key).first()
            if not record or record.creator_id != self.user_id():
                return {"err": "ai.conflict", "msg": "无法创建总结"}
        self._service().submit(record.id, chapter)
        return {"err": "ok", "artifact": artifact_dict(record), "idempotent": False}


class AITop5Item(_Top5Base):
    @js
    @auth
    def get(self, artifact_id):
        record, error = self._visible_record(artifact_id)
        return error or {"err": "ok", "artifact": artifact_dict(record)}

    @js
    @auth
    def patch(self, artifact_id):
        record, error = self._visible_record(artifact_id)
        if error:
            return error
        if record.status != "succeeded":
            return {"err": "ai.not_editable", "msg": "仅成功结果可编辑"}
        try:
            body = _json_body(self)
            items = body.get("items")
            original = (record.ai_draft or {}).get("items", [])
            if not isinstance(items, list) or len(items) != 5 or len(original) != 5:
                raise Top5ValidationError("结果必须恰好包含五组问答")
            revision = []
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise Top5ValidationError("问答结构无效")
                # Locators are immutable after generation because chapter text is intentionally not persisted.
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
        record.qa_data = {"items": revision}
        record.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "artifact": artifact_dict(record)}

    @js
    @auth
    def delete(self, artifact_id):
        record = self._own_record(artifact_id)
        if not record or not self.can_view_book(record.book_id):
            return {"err": "ai.not_found", "msg": "总结结果不存在"}
        if record.status in {"queued", "running"}:
            self._service().cancel(record.id)
        self.session.delete(record)
        self.session.commit()
        return {"err": "ok", "msg": "总结结果已删除"}


class AITop5Cancel(_Top5Base):
    @js
    @auth
    def post(self, artifact_id):
        record, error = self._visible_record(artifact_id)
        if error:
            return error
        if record.status not in {"queued", "running"}:
            return {"err": "ok", "artifact": artifact_dict(record), "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        active = self._service().cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "artifact": artifact_dict(record), "idempotent": False}


class AITop5Export(_Top5Base):
    @auth
    def get(self, artifact_id):
        record, error = self._visible_record(artifact_id)
        if error:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write(error)
            return
        if record.status != "succeeded":
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write({"err": "ai.not_ready", "msg": "总结尚未完成"})
            return
        filename = f"top5-{record.book_id}-{record.id[:8]}.md"
        self.set_header("Content-Type", "text/markdown; charset=UTF-8")
        self.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.write(export_markdown(record))


def routes():
    return [
        (r"/api/ai/top5", AITop5Collection),
        (r"/api/ai/top5/([0-9a-f-]+)", AITop5Item),
        (r"/api/ai/top5/([0-9a-f-]+)/cancel", AITop5Cancel),
        (r"/api/ai/top5/([0-9a-f-]+)/export", AITop5Export),
    ]
