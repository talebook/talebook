#!/usr/bin/env python3
"""Feature-routed API for creator-private AI tasks."""

import datetime
import hashlib
import json
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask
from webserver.services.metadata_ai import (
    FEATURE_KEY as METADATA_FEATURE_KEY,
)
from webserver.services.metadata_ai import (
    MAX_BATCH_SIZE,
    MetadataAIService,
    MetadataValidationError,
    build_book_input,
    inputs_from_record,
    prepare_draft,
    validate_selection,
)
from webserver.services.metadata_ai import (
    PROMPT_VERSION as METADATA_PROMPT_VERSION,
)
from webserver.services.metadata_ai import (
    SCHEMA_VERSION as METADATA_SCHEMA_VERSION,
)
from webserver.services.metadata_ai import (
    apply_task as apply_metadata_task,
)
from webserver.services.metadata_ai import (
    task_dict as metadata_task_dict,
)
from webserver.services.metadata_ai import (
    task_request_key as metadata_request_key,
)
from webserver.services.metadata_ai import (
    undo_task as undo_metadata_task,
)
from webserver.services.summary_duck import (
    FEATURE_KEY,
    PROMPT_VERSION,
    SCHEMA_VERSION,
    SummaryDuckService,
    SummaryDuckValidationError,
    chapter_hash,
    clean_markdown,
    export_markdown,
    request_key,
    task_dict,
    task_items,
    validate_chapter_input,
)


CONF = loader.get_settings()


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise SummaryDuckValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise SummaryDuckValidationError("请求 JSON 必须是对象")
    return value


def _book_version(book):
    path = book.get("fmt_epub")
    if path and os.path.isfile(path):
        stat = os.stat(path)
        value = f"epub:{stat.st_size}:{stat.st_mtime_ns}"
    else:
        value = "book:%s:%s" % (book.get("id"), book.get("timestamp", ""))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


class SummaryDuckFeature:
    """Summary Duck behavior plugged into the stable AI task HTTP surface."""

    key = FEATURE_KEY

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_SUMMARY_DUCK_ENABLED", True)

    @staticmethod
    def service(handler):
        service = SummaryDuckService()
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
            handler.session.query(AITask)
            .filter(
                AITask.feature == cls.key,
                AITask.creator_id == handler.user_id(),
                AITask.book_id == book_id,
                AITask.book_version == _book_version(book),
            )
            .order_by(AITask.create_time.desc())
            .all()
        )
        return {"err": "ok", "tasks": task_items(records)}

    @classmethod
    def create(cls, handler, body):
        if not cls.enabled():
            return {"err": "ai.disabled", "msg": "总结鸭未启用"}
        try:
            book_id = int(body.get("book_id", 0))
            chapter = validate_chapter_input(body.get("chapter_text"), body.get("chapter_href"), body.get("chapter_title"))
        except (TypeError, ValueError, SummaryDuckValidationError) as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book = handler.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub") or not handler.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        version = _book_version(book)
        text_hash = chapter_hash(chapter["text"])
        key = request_key(handler.user_id(), book_id, version, chapter["href"], text_hash)
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = handler.session.query(AITask).filter(AITask.request_key == key).first()
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
            return {"err": "ok", "task": task_dict(existing), "idempotent": True}
        record = AITask(
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
            record = handler.session.query(AITask).filter(AITask.request_key == key).first()
            if not record or record.creator_id != handler.user_id() or record.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建总结"}
        cls.service(handler).submit(record.id, chapter)
        return {"err": "ok", "task": task_dict(record), "idempotent": False}

    @staticmethod
    def update(handler, record, body):
        if record.status != "succeeded":
            return {"err": "ai.not_editable", "msg": "仅成功结果可编辑"}
        try:
            items = body.get("items")
            original = (record.ai_draft or {}).get("items", [])
            if not isinstance(items, list) or len(items) != 5 or len(original) != 5:
                raise SummaryDuckValidationError("结果必须恰好包含五组问答")
            revision = []
            for index, item in enumerate(items):
                if not isinstance(item, dict):
                    raise SummaryDuckValidationError("问答结构无效")
                # Locators are immutable because the minimized chapter text is intentionally not persisted.
                citations = item.get("citations", original[index].get("citations", []))
                if citations != original[index].get("citations", []):
                    raise SummaryDuckValidationError("原文引用不可在编辑时修改")
                revision.append(
                    {
                        "question": clean_markdown(item.get("question"), 300),
                        "answer": clean_markdown(item.get("answer"), 4000),
                        "citations": citations,
                    }
                )
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record.user_revision = {"items": revision}
        record.result_data = {"items": revision}
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        return {"err": "ok", "task": task_dict(record)}

    @staticmethod
    def export(handler, record):
        if record.status != "succeeded":
            handler.set_header("Content-Type", "application/json; charset=UTF-8")
            handler.write({"err": "ai.not_ready", "msg": "总结尚未完成"})
            return
        filename = f"summary-duck-{record.book_id}-{record.id[:8]}.md"
        handler.set_header("Content-Type", "text/markdown; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        handler.write(export_markdown(record))

    @staticmethod
    def serialize(handler, record):
        return task_dict(record)


class MetadataFeature:
    """Batch metadata proposals with explicit review, apply and safe undo."""

    key = METADATA_FEATURE_KEY

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_METADATA_ENABLED", True)

    @staticmethod
    def service(handler):
        service = MetadataAIService()
        service.setup(handler.settings["SessionMaker"], CONF)
        return service

    @staticmethod
    def _editable(handler, record):
        items = (record.ai_draft or {}).get("items", [])
        return bool(
            handler.current_user
            and handler.current_user.can_edit()
            and all(handler.is_admin() or handler.is_book_owner(item["book_id"], handler.user_id()) for item in items)
        )

    @classmethod
    def serialize(cls, handler, record):
        return metadata_task_dict(record, editable=cls._editable(handler, record))

    @staticmethod
    def can_access(handler, record):
        for item in (record.ai_draft or {}).get("items", []):
            if not handler.can_view_book(item["book_id"]):
                return False, {"err": "ai.not_found", "msg": "AI 结果不存在"}
        return True, None

    @classmethod
    def list(cls, handler):
        query = handler.session.query(AITask).filter(
            AITask.feature == cls.key,
            AITask.creator_id == handler.user_id(),
        )
        try:
            book_id = int(handler.get_argument("book_id", "0") or 0)
        except (TypeError, ValueError):
            book_id = 0
        records = query.order_by(AITask.create_time.desc()).limit(50).all()
        visible = []
        for record in records:
            items = (record.ai_draft or {}).get("items", [])
            if book_id and not any(item.get("book_id") == book_id for item in items):
                continue
            allowed, _error = cls.can_access(handler, record)
            if allowed:
                visible.append(cls.serialize(handler, record))
        return {"err": "ok", "tasks": visible}

    @classmethod
    def create(cls, handler, body):
        if not cls.enabled():
            return {"err": "ai.disabled", "msg": "AI 元数据分析未启用"}
        raw_ids = body.get("book_ids")
        if not isinstance(raw_ids, list):
            return {"err": "params.invalid", "msg": "book_ids 必须是数组"}
        try:
            book_ids = [int(value) for value in raw_ids]
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": "书籍 ID 无效"}
        if not book_ids or len(book_ids) > MAX_BATCH_SIZE or len(set(book_ids)) != len(book_ids):
            return {"err": "params.invalid", "msg": f"每批须包含 1–{MAX_BATCH_SIZE} 本不重复书籍"}
        inputs = []
        for book_id in book_ids:
            if not handler.can_view_book(book_id):
                return {"err": "book.not_found", "msg": "书籍不存在或无权访问"}
            try:
                inputs.append(build_book_input(handler.db, book_id))
            except MetadataValidationError as exc:
                return {"err": "book.not_found", "msg": str(exc)}
        key = metadata_request_key(handler.user_id(), inputs)
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = handler.session.query(AITask).filter(AITask.request_key == key).first()
        if existing:
            return {"err": "ok", "task": cls.serialize(handler, existing), "idempotent": True}
        combined_version = hashlib.sha256(
            json.dumps([(item["book_id"], item["version"]) for item in inputs]).encode("utf-8")
        ).hexdigest()[:32]
        record = AITask(
            id=str(uuid.uuid4()),
            request_key=key,
            feature=cls.key,
            creator_id=handler.user_id(),
            book_id=book_ids[0],
            book_version=combined_version,
            chapter_href="metadata-batch",
            chapter_title=f"{len(book_ids)} 本书籍元数据",
            chapter_text_hash=combined_version,
            chapter_length=len(book_ids),
            status="queued",
            progress_message=f"等待分析 {len(book_ids)} 本书籍",
            ai_draft=prepare_draft(inputs),
            schema_version=METADATA_SCHEMA_VERSION,
            prompt_version=METADATA_PROMPT_VERSION,
        )
        handler.session.add(record)
        try:
            handler.session.commit()
        except IntegrityError:
            handler.session.rollback()
            record = handler.session.query(AITask).filter(AITask.request_key == key).first()
            if not record or record.creator_id != handler.user_id() or record.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建元数据分析任务"}
        cls.service(handler).submit(record.id, inputs)
        return {"err": "ok", "task": cls.serialize(handler, record), "idempotent": False}

    @classmethod
    def update(cls, handler, record, body):
        if record.status != "succeeded":
            return {"err": "ai.not_editable", "msg": "分析完成后才能选择建议"}
        try:
            selected, token = validate_selection(record, body.get("items"))
        except MetadataValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record.user_revision = {"items": selected, "selection_revision": token}
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        count = sum(len(item["fields"]) for item in selected)
        return {
            "err": "ok",
            "task": cls.serialize(handler, record),
            "confirmation": {"selection_revision": token, "book_count": len(selected), "field_count": count},
        }

    @staticmethod
    def export(handler, record):
        handler.set_header("Content-Type", "application/json; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="metadata-{record.id[:8]}.json"')
        handler.write(metadata_task_dict(record))

    @classmethod
    def action(cls, handler, record, action, body):
        if action in {"apply", "undo"} and not cls._editable(handler, record):
            return {"err": "permission", "msg": "无权修改批次中的书籍"}
        if action == "apply":
            return apply_metadata_task(handler, record, body)
        if action == "undo":
            return undo_metadata_task(handler, record)
        if action == "retry":
            if record.status in {"queued", "running"}:
                return {"err": "ai.not_ready", "msg": "当前分析尚未结束"}
            failed = inputs_from_record(record, failed_only=True)
            if not failed:
                return {"err": "ok", "task": cls.serialize(handler, record), "idempotent": True}
            draft = json.loads(json.dumps(record.ai_draft or {}, ensure_ascii=False))
            for item in draft.get("items", []):
                if item.get("status") in {"failed", "cancelled"}:
                    item.update({"status": "queued", "error": None, "suggestions": []})
            record.ai_draft = draft
            record.status = "queued"
            record.cancel_requested = False
            record.finished_at = None
            record.update_time = datetime.datetime.now()
            handler.session.commit()
            cls.service(handler).submit(record.id, failed)
            return {"err": "ok", "task": cls.serialize(handler, record), "idempotent": False}
        return {"err": "params.invalid", "msg": "不支持的任务操作"}


AI_FEATURES = {
    SummaryDuckFeature.key: SummaryDuckFeature,
    MetadataFeature.key: MetadataFeature,
}


def _feature(name):
    return AI_FEATURES.get(str(name or "").strip())


class _AITaskBase(BaseHandler):
    def _own_task(self, feature_key, task_id):
        return (
            self.session.query(AITask)
            .filter(
                AITask.id == task_id,
                AITask.feature == feature_key,
                AITask.creator_id == self.user_id(),
            )
            .first()
        )

    def _visible_task(self, feature_name, task_id):
        feature = _feature(feature_name)
        if not feature:
            return None, None, {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        record = self._own_task(feature.key, task_id)
        if not record:
            return None, None, {"err": "ai.not_found", "msg": "AI 任务不存在"}
        visible, error = feature.can_access(self, record)
        if not visible:
            return None, None, error
        return record, feature, None


class AITaskCollection(_AITaskBase):
    @js
    @auth
    def get(self, feature_name):
        feature = _feature(feature_name)
        if not feature:
            return {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        return feature.list(self)

    @js
    @auth
    def post(self, feature_name):
        if not CONF.get("AI_ENABLED", True):
            return {"err": "ai.disabled", "msg": "AI 功能未启用"}
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        feature = _feature(feature_name)
        if not feature:
            return {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        return feature.create(self, body)


class AITaskItem(_AITaskBase):
    @js
    @auth
    def get(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        return error or {"err": "ok", "task": feature.serialize(self, record)}

    @js
    @auth
    def patch(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        return feature.update(self, record, body)

    @js
    @auth
    def delete(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        if record.status in {"queued", "running"}:
            feature.service(self).cancel(record.id)
        self.session.delete(record)
        self.session.commit()
        return {"err": "ok", "msg": "AI 任务已删除"}


class AITaskCancel(_AITaskBase):
    @js
    @auth
    def post(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        if record.status not in {"queued", "running"}:
            return {"err": "ok", "task": feature.serialize(self, record), "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        active = feature.service(self).cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "task": feature.serialize(self, record), "idempotent": False}


class AITaskAction(_AITaskBase):
    @js
    @auth
    def post(self, feature_name, task_id, action):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        if not hasattr(feature, "action"):
            return {"err": "params.invalid", "msg": "该 AI 功能不支持此操作"}
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        return feature.action(self, record, action, body)


class AITaskExport(_AITaskBase):
    @auth
    def get(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write(error)
            return
        feature.export(self, record)


def routes():
    return [
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks", AITaskCollection),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)", AITaskItem),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/cancel", AITaskCancel),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/export", AITaskExport),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/(apply|undo|retry)", AITaskAction),
    ]
