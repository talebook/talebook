#!/usr/bin/env python3
"""Feature-routed API for creator-private AI tasks."""

import datetime
import hashlib
import json
import logging
import math
import os
import time
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask
from webserver.services.ai_registry import AIFeatureRegistry
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
LOG = logging.getLogger(__name__)

TASK_CATEGORIES = ("running", "pending_confirmation", "failed", "completed")
TASK_STATUS_CATEGORIES = {
    "queued": "running",
    "running": "running",
    "failed": "failed",
    "cancelled": "failed",
    "succeeded": "completed",
}


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
    _probe_cache = None

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_SUMMARY_DUCK_ENABLED", True)

    @staticmethod
    def service(handler):
        service = SummaryDuckService()
        service.setup(handler.settings["SessionMaker"], CONF)
        return service

    @classmethod
    def capability(cls, handler):
        result = {
            "id": cls.key,
            "name": "总结鸭 TOP5",
            "description": "提炼当前章节最值得记住的五组问答，并附上可核对的原文引用。",
            "icon": "mdi-duck",
            "scope": "chapter",
            "entry": "/library",
            "permissions": ["login", "book.read"],
            "feature_flag": "AI_SUMMARY_DUCK_ENABLED",
            "available": False,
            "reason": "",
        }
        if not CONF.get("AI_ENABLED", True):
            result["reason"] = "ai_disabled"
            return result
        if not CONF.get("AI_SUMMARY_DUCK_ENABLED", True):
            result["reason"] = "feature_disabled"
            return result

        now = time.monotonic()
        if cls._probe_cache is None or now - cls._probe_cache[0] > 60:
            probe = cls.service(handler).runtime.probe()
            cls._probe_cache = (now, probe)
        else:
            probe = cls._probe_cache[1]
        result["available"] = bool(probe.available)
        result["reason"] = "" if probe.available else "runtime.%s" % (probe.reason or "unavailable")
        return result

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

    @classmethod
    def task_summary(cls, handler, record):
        book = handler.get_book(record.book_id, raise_exception=False)
        if not book:
            raise ValueError("book is no longer visible")
        category = TASK_STATUS_CATEGORIES.get(record.status)
        if not category:
            raise ValueError("unsupported task status")
        return {
            "id": record.id,
            "feature": cls.key,
            "object": {
                "library": "local",
                "book_id": record.book_id,
                "book_title": str(book.get("title") or "")[:300],
                "chapter_title": str(record.chapter_title or "")[:300],
            },
            "category": category,
            "status": record.status,
            "progress": None,
            "progress_message": str(record.progress_message or "")[:256],
            "created_at": record.create_time.isoformat() if record.create_time else None,
            "updated_at": record.update_time.isoformat() if record.update_time else None,
            "detail_url": "/read/%s?ai_task=%s" % (record.book_id, record.id),
            "allowed_actions": {
                "cancel": record.status in {"queued", "running"},
                # Retrying needs chapter text, which is deliberately not persisted.
                "retry": False,
            },
            "safe_error": {"code": record.error_code} if record.error_code else None,
        }

    @classmethod
    def cancel(cls, handler, record):
        if record.status not in {"queued", "running"}:
            return {"err": "ai.action_not_allowed", "msg": "当前任务不可取消"}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        active = cls.service(handler).cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            record.update_time = record.finished_at
            handler.session.commit()
        return {"err": "ok", "task": cls.task_summary(handler, record)}

    @staticmethod
    def retry(handler, record):
        return {"err": "ai.action_not_allowed", "msg": "请从原功能重新提交任务"}


AI_FEATURES = AIFeatureRegistry([SummaryDuckFeature])


def _feature(name):
    return AI_FEATURES.get(str(name or "").strip())


def _page_argument(handler, name, default, minimum, maximum):
    try:
        value = int(handler.get_argument(name, str(default)))
    except (TypeError, ValueError):
        value = default
    return min(maximum, max(minimum, value))


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
        record, _feature_adapter, error = self._visible_task(feature_name, task_id)
        return error or {"err": "ok", "task": task_dict(record)}

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
            return {"err": "ok", "task": task_dict(record), "idempotent": True}
        response = feature.cancel(self, record)
        if response.get("err") != "ok":
            return response
        return {"err": "ok", "task": task_dict(record), "idempotent": False}


class AITaskExport(_AITaskBase):
    @auth
    def get(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write(error)
            return
        feature.export(self, record)


class AIHubCapabilities(_AITaskBase):
    @js
    @auth
    def get(self):
        capabilities, partial_errors = AI_FEATURES.capabilities(self)
        return {"err": "ok", "capabilities": capabilities, "partial_errors": partial_errors}


class AIHubTasks(_AITaskBase):
    @js
    @auth
    def get(self):
        category = str(self.get_argument("category", "all") or "all")
        library = str(self.get_argument("library", "all") or "all")
        if category not in {"all", *TASK_CATEGORIES}:
            return {"err": "params.invalid", "msg": "任务状态筛选无效"}
        if library not in {"all", "local"}:
            return {"err": "params.invalid", "msg": "书库筛选无效"}
        page = _page_argument(self, "page", 1, 1, 1_000_000)
        page_size = _page_argument(self, "page_size", 12, 1, 50)

        records = (
            self.session.query(AITask)
            .filter(AITask.creator_id == self.user_id())
            .order_by(AITask.update_time.desc(), AITask.create_time.desc())
            .all()
        )
        summaries = []
        error_features = set()
        partial_errors = []
        for record in records:
            feature = _feature(record.feature)
            if not feature:
                if record.feature not in error_features:
                    partial_errors.append({"feature": record.feature, "code": "feature_unregistered"})
                    error_features.add(record.feature)
                continue
            try:
                visible, _error = feature.can_access(self, record)
                if not visible:
                    continue
                summaries.append(feature.task_summary(self, record))
            except Exception:
                LOG.exception("AI task projection failed feature=%s task=%s", record.feature, record.id)
                if record.feature not in error_features:
                    partial_errors.append({"feature": record.feature, "code": "task_projection_failed"})
                    error_features.add(record.feature)

        category_counts = {name: 0 for name in TASK_CATEGORIES}
        for summary in summaries:
            category_counts[summary["category"]] += 1
        filtered = [item for item in summaries if library == "all" or item["object"]["library"] == library]
        if category != "all":
            filtered = [item for item in filtered if item["category"] == category]
        total = len(filtered)
        start = (page - 1) * page_size
        tasks = filtered[start : start + page_size]
        return {
            "err": "ok",
            "tasks": tasks,
            "category_counts": category_counts,
            "libraries": [{"id": "local", "name": "本地书库"}],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "total": total,
                "pages": math.ceil(total / page_size) if total else 0,
            },
            "partial_errors": partial_errors,
        }


class AIHubTaskAction(_AITaskBase):
    @js
    @auth
    def post(self, feature_name, task_id, action):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        try:
            summary = feature.task_summary(self, record)
        except Exception:
            LOG.exception("AI hub action projection failed feature=%s task=%s", feature_name, task_id)
            return {"err": "ai.not_found", "msg": "AI 任务不存在"}
        if action not in {"cancel", "retry"} or not summary["allowed_actions"].get(action, False):
            return {"err": "ai.action_not_allowed", "msg": "当前任务不支持此操作"}
        return getattr(feature, action)(self, record)


class AIHubEvent(_AITaskBase):
    @js
    @auth
    def post(self):
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        event = str(body.get("event") or "")
        feature_name = str(body.get("feature") or "")
        task_id = str(body.get("task_id") or "")
        if event not in {"hub_view", "capability_open", "task_open"}:
            return {"err": "params.invalid", "msg": "埋点事件无效"}
        feature = _feature(feature_name) if feature_name else None
        if event != "hub_view" and not feature:
            return {"err": "params.invalid", "msg": "AI 功能无效"}
        if event == "task_open":
            record, _feature_adapter, error = self._visible_task(feature_name, task_id)
            if error or not record:
                return error or {"err": "ai.not_found", "msg": "AI 任务不存在"}
        LOG.info(
            "ai_hub_event event=%s feature=%s user_id=%s has_task=%s",
            event,
            feature_name,
            self.user_id(),
            bool(task_id),
        )
        return {"err": "ok"}


def routes():
    return [
        (r"/api/ai/hub/capabilities", AIHubCapabilities),
        (r"/api/ai/hub/tasks", AIHubTasks),
        (r"/api/ai/hub/tasks/([a-z][a-z0-9_]*)/([0-9a-f-]+)/(cancel|retry)", AIHubTaskAction),
        (r"/api/ai/hub/events", AIHubEvent),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks", AITaskCollection),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)", AITaskItem),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/cancel", AITaskCancel),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/export", AITaskExport),
    ]
