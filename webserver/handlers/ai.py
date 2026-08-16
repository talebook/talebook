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
from webserver.services.ai_toc import (
    FEATURE_KEY as TOC_FEATURE_KEY,
)
from webserver.services.ai_toc import (
    PROMPT_VERSION as TOC_PROMPT_VERSION,
)
from webserver.services.ai_toc import (
    SCHEMA_VERSION as TOC_SCHEMA_VERSION,
)
from webserver.services.ai_toc import (
    TocOrganizerService,
    TocValidationError,
    TocWriteError,
    analyze_epub,
    apply_toc,
    cleanup_task_files,
    file_version,
    snapshot_path,
    undo_toc,
    validate_revision,
)
from webserver.services.ai_toc import (
    task_dict as toc_task_dict,
)
from webserver.services.ai_toc import (
    task_items as toc_task_items,
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


def _can_manage_book(handler, book_id):
    return bool(
        handler.current_user
        and handler.current_user.can_edit()
        and (handler.is_admin() or handler.is_book_owner(book_id, handler.user_id()))
    )


class SummaryDuckFeature:
    """Summary Duck behavior plugged into the stable AI task HTTP surface."""

    key = FEATURE_KEY

    @staticmethod
    def task_dict(record):
        return task_dict(record)

    @staticmethod
    def task_items(records):
        return task_items(records)

    @staticmethod
    def cleanup(record):
        return None

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
        return {"err": "ok", "tasks": cls.task_items(records)}

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
            return {"err": "ok", "task": cls.task_dict(existing), "idempotent": True}
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
        return {"err": "ok", "task": cls.task_dict(record), "idempotent": False}

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
        return {"err": "ok", "task": SummaryDuckFeature.task_dict(record)}

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


class TocOrganizerFeature:
    """Server-extracted EPUB TOC suggestions and controlled file writes."""

    key = TOC_FEATURE_KEY

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_TOC_ORGANIZER_ENABLED", True)

    @staticmethod
    def service(handler):
        service = TocOrganizerService()
        service.setup(handler.settings["SessionMaker"], CONF)
        return service

    @staticmethod
    def task_dict(record):
        return toc_task_dict(record)

    @staticmethod
    def task_items(records):
        return toc_task_items(records)

    @staticmethod
    def cleanup(record):
        cleanup_task_files(CONF, record)

    @staticmethod
    def can_access(handler, record):
        if not handler.can_view_book(record.book_id) or not _can_manage_book(handler, record.book_id):
            return False, {"err": "ai.not_found", "msg": "AI 目录任务不存在"}
        book = handler.get_book(record.book_id, raise_exception=False)
        if not book or not book.get("fmt_epub"):
            return False, {"err": "ai.not_found", "msg": "AI 目录任务不存在"}
        application = record.application_data or {}
        allowed_versions = {record.book_version}
        allowed_versions.update(
            value for value in [application.get("after_version"), application.get("restored_version")] if value
        )
        if file_version(book["fmt_epub"]) not in allowed_versions:
            return False, {"err": "ai.book_version_changed", "msg": "书籍版本已变化，请重新分析"}
        return True, None

    @classmethod
    def list(cls, handler):
        try:
            book_id = int(handler.get_argument("book_id", "0") or 0)
        except (TypeError, ValueError):
            book_id = 0
        if not book_id or not handler.can_view_book(book_id) or not _can_manage_book(handler, book_id):
            return {"err": "book.not_found", "msg": "书籍不存在或无权整理目录"}
        book = handler.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub"):
            return {"err": "book.not_found", "msg": "仅支持 EPUB 书籍"}
        current_version = file_version(book["fmt_epub"])
        records = (
            handler.session.query(AITask)
            .filter(
                AITask.feature == cls.key,
                AITask.creator_id == handler.user_id(),
                AITask.book_id == book_id,
            )
            .order_by(AITask.create_time.desc())
            .all()
        )
        records = [
            record
            for record in records
            if current_version
            in {
                record.book_version,
                (record.application_data or {}).get("after_version"),
                (record.application_data or {}).get("restored_version"),
            }
        ]
        return {"err": "ok", "tasks": cls.task_items(records)}

    @classmethod
    def create(cls, handler, body):
        if not cls.enabled():
            return {"err": "ai.disabled", "msg": "AI 目录整理未启用"}
        try:
            book_id = int(body.get("book_id", 0))
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": "书籍标识无效"}
        book = handler.get_book(book_id, raise_exception=False)
        if (
            not book
            or not book.get("fmt_epub")
            or not handler.can_view_book(book_id)
            or not _can_manage_book(handler, book_id)
        ):
            return {"err": "permission", "msg": "仅书籍拥有者或编辑者可整理 EPUB 目录"}
        try:
            analysis = analyze_epub(book["fmt_epub"])
        except TocValidationError as exc:
            return {"err": "epub.invalid", "msg": str(exc)}
        version = file_version(book["fmt_epub"])
        raw_key = (
            f"{cls.key}:{handler.user_id()}:{book_id}:{version}:{analysis['analysis_hash']}:"
            f"{TOC_SCHEMA_VERSION}:{TOC_PROMPT_VERSION}"
        )
        key = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = handler.session.query(AITask).filter(AITask.request_key == key).first()
        if existing:
            if existing.creator_id != handler.user_id() or existing.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建目录任务"}
            if existing.status in {"failed", "cancelled"}:
                existing.status = "queued"
                existing.cancel_requested = False
                existing.error_code = ""
                existing.error_message = ""
                existing.progress_message = "等待目录分析"
                existing.update_time = datetime.datetime.now()
                handler.session.commit()
                cls.service(handler).submit(existing.id, analysis)
            return {"err": "ok", "task": cls.task_dict(existing), "idempotent": True}
        record = AITask(
            id=str(uuid.uuid4()),
            request_key=key,
            feature=cls.key,
            creator_id=handler.user_id(),
            book_id=book_id,
            book_version=version,
            chapter_href=analysis.get("toc_path", ""),
            chapter_title="EPUB 目录",
            chapter_text_hash=analysis["analysis_hash"],
            chapter_length=len(analysis.get("context", "")),
            status="queued",
            progress_message="等待目录分析",
            schema_version=TOC_SCHEMA_VERSION,
            prompt_version=TOC_PROMPT_VERSION,
        )
        handler.session.add(record)
        try:
            handler.session.commit()
        except IntegrityError:
            handler.session.rollback()
            record = handler.session.query(AITask).filter(AITask.request_key == key).first()
            if not record or record.creator_id != handler.user_id() or record.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建目录任务"}
        cls.service(handler).submit(record.id, analysis)
        return {"err": "ok", "task": cls.task_dict(record), "idempotent": False}

    @staticmethod
    def update(handler, record, body):
        if record.status != "succeeded":
            return {"err": "ai.not_editable", "msg": "仅成功的目录建议可编辑"}
        if (record.application_data or {}).get("status") == "applied":
            return {"err": "ai.not_editable", "msg": "已应用的目录请先撤销再编辑"}
        try:
            revision = validate_revision(body, record)
        except TocValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record.user_revision = revision
        record.result_data = revision
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        return {"err": "ok", "task": toc_task_dict(record)}

    @staticmethod
    def export(handler, record):
        filename = f"toc-organizer-{record.book_id}-{record.id[:8]}.json"
        handler.set_header("Content-Type", "application/json; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        handler.write(json.dumps(toc_task_dict(record), ensure_ascii=False, indent=2))

    @classmethod
    def apply(cls, handler, record, body):
        if record.status != "succeeded":
            return {"err": "ai.not_ready", "msg": "目录建议尚未完成"}
        if not body.get("confirmed"):
            return {"err": "confirmation.required", "msg": "请二次确认后应用目录"}
        if body.get("book_version") != record.book_version:
            return {"err": "ai.book_version_changed", "msg": "预览版本不匹配，请重新分析"}
        book = handler.get_book(record.book_id, raise_exception=False)
        if not book or not book.get("fmt_epub") or not _can_manage_book(handler, record.book_id):
            return {"err": "permission", "msg": "无权写入该书籍"}
        application = dict(record.application_data or {})
        if application.get("status") == "applied":
            if file_version(book["fmt_epub"]) == application.get("after_version"):
                return {"err": "ok", "task": toc_task_dict(record), "idempotent": True}
            return {"err": "ai.book_version_changed", "msg": "书籍已再次变化，无法重复应用"}
        selected = [node for node in (record.user_revision or {}).get("nodes", []) if node.get("selected", True)]
        if not selected:
            return {"err": "params.invalid", "msg": "至少选择一个目录节点"}
        if not (record.user_revision or {}).get("writable", False):
            return {"err": "epub.read_only", "msg": "此 EPUB 没有安全写入路径，仅提供诊断"}
        path = snapshot_path(CONF, record.id)
        try:
            result = apply_toc(book["fmt_epub"], selected, path, record.book_version)
        except (TocWriteError, TocValidationError, OSError) as exc:
            return {"err": "epub.apply_failed", "msg": str(exc)}
        now = datetime.datetime.now().isoformat()
        record.application_data = {
            **result,
            "status": "applied",
            "snapshot_path": path,
            "applied_at": now,
            "undone_at": None,
            "selected_count": len(selected),
            "audit": [{"action": "apply", "at": now, "actor_id": handler.user_id(), "version": result["after_version"]}],
        }
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        handler.cache.invalidate()
        return {"err": "ok", "task": toc_task_dict(record), "idempotent": False}

    @classmethod
    def undo(cls, handler, record, body):
        application = dict(record.application_data or {})
        if application.get("status") == "undone":
            return {"err": "ok", "task": toc_task_dict(record), "idempotent": True}
        if application.get("status") != "applied":
            return {"err": "ai.not_applied", "msg": "该目录尚未应用"}
        if not body.get("confirmed"):
            return {"err": "confirmation.required", "msg": "请确认后撤销目录变更"}
        book = handler.get_book(record.book_id, raise_exception=False)
        if not book or not book.get("fmt_epub") or not _can_manage_book(handler, record.book_id):
            return {"err": "permission", "msg": "无权撤销该书籍目录"}
        try:
            restored_version = undo_toc(
                book["fmt_epub"],
                application.get("snapshot_path", ""),
                application.get("after_version", ""),
                application.get("snapshot_sha256", ""),
            )
        except (TocWriteError, TocValidationError, OSError) as exc:
            return {"err": "epub.undo_failed", "msg": str(exc)}
        now = datetime.datetime.now().isoformat()
        audit = list(application.get("audit", []))
        audit.append({"action": "undo", "at": now, "actor_id": handler.user_id(), "version": restored_version})
        record.application_data = {
            **application,
            "status": "undone",
            "undone_at": now,
            "restored_version": restored_version,
            "audit": audit,
        }
        record.update_time = datetime.datetime.now()
        handler.session.commit()
        handler.cache.invalidate()
        return {"err": "ok", "task": toc_task_dict(record), "idempotent": False}


AI_FEATURES = {SummaryDuckFeature.key: SummaryDuckFeature, TocOrganizerFeature.key: TocOrganizerFeature}


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
        record, _feature_adapter, error = self._visible_task(feature_name, task_id)
        return error or {"err": "ok", "task": _feature_adapter.task_dict(record)}

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
        feature.cleanup(record)
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
            return {"err": "ok", "task": feature.task_dict(record), "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        active = feature.service(self).cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "task": feature.task_dict(record), "idempotent": False}


class AITaskApply(_AITaskBase):
    @js
    @auth
    def post(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        if not hasattr(feature, "apply"):
            return {"err": "ai.operation_not_supported", "msg": "该 AI 功能不支持应用"}
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        return feature.apply(self, record, body)


class AITaskUndo(_AITaskBase):
    @js
    @auth
    def post(self, feature_name, task_id):
        record, feature, error = self._visible_task(feature_name, task_id)
        if error:
            return error
        if not hasattr(feature, "undo"):
            return {"err": "ai.operation_not_supported", "msg": "该 AI 功能不支持撤销"}
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        return feature.undo(self, record, body)


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
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/apply", AITaskApply),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/undo", AITaskUndo),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/export", AITaskExport),
    ]
