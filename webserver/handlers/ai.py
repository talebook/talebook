#!/usr/bin/env python3
"""Feature-routed API for creator-private AI tasks."""

import datetime
import hashlib
import json
import logging
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask
from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore
from webserver.services.knowledge_graph import (
    FEATURE_KEY as KNOWLEDGE_GRAPH_FEATURE_KEY,
)
from webserver.services.knowledge_graph import (
    PROMPT_VERSION as KNOWLEDGE_GRAPH_PROMPT_VERSION,
)
from webserver.services.knowledge_graph import (
    SCHEMA_VERSION as KNOWLEDGE_GRAPH_SCHEMA_VERSION,
)
from webserver.services.knowledge_graph import (
    KnowledgeGraphService,
    KnowledgeGraphValidationError,
    extract_epub_chapters,
    scope_fingerprint,
)
from webserver.services.knowledge_graph import (
    request_key as knowledge_graph_request_key,
)
from webserver.services.knowledge_graph import (
    task_dict as knowledge_graph_task_dict,
)
from webserver.services.summary_duck import (
    FEATURE_KEY,
    PROMPT_VERSION,
    SCHEMA_VERSION,
    SummaryDuckService,
    SummaryDuckValidationError,
    artifact_payload,
    chapter_hash,
    clean_markdown,
    export_markdown,
    request_key,
    task_dict,
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
    def task_dict(record):
        return task_dict(record, CONF)

    @staticmethod
    def artifacts():
        return AIArtifactStore(CONF)

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
        if record.status == "succeeded":
            try:
                SummaryDuckFeature.artifacts().migrate_summary_duck_record(handler.session, record)
                SummaryDuckFeature.artifacts().read_summary_duck(record)
            except AIArtifactError as exc:
                return False, {"err": exc.code, "msg": exc.safe_message}
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
        for record in records:
            if record.status == "succeeded" and not record.artifact_sha256:
                try:
                    cls.artifacts().migrate_summary_duck_record(handler.session, record)
                except AIArtifactError as exc:
                    logging.warning("Summary Duck legacy artifact migration failed task_id=%s code=%s", record.id, exc.code)
        return {"err": "ok", "tasks": [cls.task_dict(record) for record in records]}

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
        cls.artifacts().prepare_summary_duck_record(record)
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
            document = SummaryDuckFeature.artifacts().read_summary_duck(record)
            items = body.get("items")
            original_payload = document.get("ai_draft") or {}
            original = original_payload.get("items", [])
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
        except AIArtifactError as exc:
            return {"err": exc.code, "msg": exc.safe_message}
        record.update_time = datetime.datetime.now()
        try:
            SummaryDuckFeature.artifacts().write_summary_duck(
                record,
                original_payload,
                {"items": revision},
                status="succeeded",
                updated_at=record.update_time,
            )
        except AIArtifactError as exc:
            return {"err": exc.code, "msg": exc.safe_message}
        record.user_revision = {}
        record.result_data = {}
        record.ai_draft = {}
        handler.session.commit()
        return {"err": "ok", "task": SummaryDuckFeature.task_dict(record)}

    @staticmethod
    def delete(handler, record):
        SummaryDuckFeature.artifacts().delete_summary_duck(record)

    @staticmethod
    def export(handler, record):
        if record.status != "succeeded":
            handler.set_header("Content-Type", "application/json; charset=UTF-8")
            handler.write({"err": "ai.not_ready", "msg": "总结尚未完成"})
            return
        try:
            markdown = export_markdown(record, artifact_payload(record, CONF))
        except AIArtifactError as exc:
            handler.set_header("Content-Type", "application/json; charset=UTF-8")
            handler.write({"err": exc.code, "msg": exc.safe_message})
            return
        filename = f"summary-duck-{record.book_id}-{record.id[:8]}.md"
        handler.set_header("Content-Type", "text/markdown; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        handler.write(markdown)


class KnowledgeGraphFeature:
    """Grounded single-book graph behavior on the shared AI task surface."""

    key = KNOWLEDGE_GRAPH_FEATURE_KEY
    task_dict = staticmethod(knowledge_graph_task_dict)

    @staticmethod
    def enabled():
        return CONF.get("AI_ENABLED", True) and CONF.get("AI_KNOWLEDGE_GRAPH_ENABLED", True)

    @staticmethod
    def service(handler):
        service = KnowledgeGraphService()
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
        if record.status in {"queued", "running"}:
            scope = (record.ai_draft or {}).get("scope") or {}
            hrefs = scope.get("chapter_hrefs") or []
            if book.get("fmt_epub") and hrefs:
                KnowledgeGraphFeature.service(handler).submit(record.id, book["fmt_epub"], hrefs)
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
        return {"err": "ok", "tasks": [cls.task_dict(record) for record in records]}

    @staticmethod
    def _requested_hrefs(body):
        scope = str(body.get("scope", "book") or "book")
        if scope == "book":
            return scope, None
        if scope == "chapter":
            href = body.get("chapter_href")
            if not isinstance(href, str) or not href.strip():
                raise KnowledgeGraphValidationError("请选择当前章节")
            return scope, [href.strip()]
        if scope == "chapters":
            hrefs = body.get("chapter_hrefs")
            if not isinstance(hrefs, list) or not hrefs or not all(isinstance(href, str) and href.strip() for href in hrefs):
                raise KnowledgeGraphValidationError("请选择章节范围")
            return scope, [href.strip() for href in hrefs]
        raise KnowledgeGraphValidationError("生成范围无效")

    @classmethod
    def create(cls, handler, body):
        if not cls.enabled():
            return {"err": "ai.disabled", "msg": "知识图谱未启用"}
        try:
            book_id = int(body.get("book_id", 0))
            scope_kind, requested_hrefs = cls._requested_hrefs(body)
        except (TypeError, ValueError, KnowledgeGraphValidationError) as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book = handler.get_book(book_id, raise_exception=False)
        epub_path = book.get("fmt_epub") if book else None
        if not book or not epub_path or not os.path.isfile(epub_path) or not handler.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        try:
            chapters = extract_epub_chapters(
                epub_path,
                requested_hrefs,
                int(CONF.get("AI_KNOWLEDGE_GRAPH_MAX_CHAPTERS", 80)),
                int(CONF.get("AI_KNOWLEDGE_GRAPH_MAX_CHAPTER_CHARACTERS", 16_000)),
                int(CONF.get("AI_KNOWLEDGE_GRAPH_MAX_TOTAL_CHARACTERS", 400_000)),
            )
        except KnowledgeGraphValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        character_count = sum(len(chapter["text"]) for chapter in chapters)
        scope_hash = scope_fingerprint(chapters)
        scope = {
            "kind": scope_kind,
            "label": "全书"
            if scope_kind == "book"
            else (chapters[0]["title"] if len(chapters) == 1 else f"{len(chapters)} 个章节"),
            "chapter_hrefs": [chapter["href"] for chapter in chapters],
            "chapter_count": len(chapters),
            "character_count": character_count,
        }
        estimate = {
            "chapter_count": len(chapters),
            "character_count": character_count,
            "runtime_calls": len(chapters),
        }
        if bool(body.get("preview_only")):
            return {"err": "ok", "scope": scope, "estimate": estimate}
        version = _book_version(book)
        key = knowledge_graph_request_key(handler.user_id(), book_id, version, scope_hash)
        if bool(body.get("regenerate")):
            key = hashlib.sha256((key + ":" + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = handler.session.query(AITask).filter(AITask.request_key == key).first()
        if existing:
            if existing.creator_id != handler.user_id() or existing.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建知识图谱"}
            if existing.status in {"failed", "cancelled"}:
                draft = dict(existing.ai_draft or {})
                draft["scope"] = scope
                draft.setdefault("segments", {})
                existing.ai_draft = draft
                existing.status = "queued"
                existing.cancel_requested = False
                existing.error_code = ""
                existing.error_message = ""
                existing.progress_message = "等待提取"
                existing.update_time = datetime.datetime.now()
                handler.session.commit()
                cls.service(handler).submit(existing.id, epub_path, scope["chapter_hrefs"])
            return {"err": "ok", "task": cls.task_dict(existing), "idempotent": True, "estimate": estimate}
        record = AITask(
            id=str(uuid.uuid4()),
            request_key=key,
            feature=cls.key,
            creator_id=handler.user_id(),
            book_id=book_id,
            book_version=version,
            chapter_href=f"graph:{scope_hash[:24]}",
            chapter_title=scope["label"],
            chapter_text_hash=scope_hash,
            chapter_length=character_count,
            status="queued",
            progress_message="等待提取",
            ai_draft={"scope": scope, "segments": {}},
            schema_version=KNOWLEDGE_GRAPH_SCHEMA_VERSION,
            prompt_version=KNOWLEDGE_GRAPH_PROMPT_VERSION,
        )
        handler.session.add(record)
        try:
            handler.session.commit()
        except IntegrityError:
            handler.session.rollback()
            record = handler.session.query(AITask).filter(AITask.request_key == key).first()
            if not record or record.creator_id != handler.user_id() or record.feature != cls.key:
                return {"err": "ai.conflict", "msg": "无法创建知识图谱"}
        cls.service(handler).submit(record.id, epub_path, scope["chapter_hrefs"])
        return {"err": "ok", "task": cls.task_dict(record), "idempotent": False, "estimate": estimate}

    @staticmethod
    def update(handler, record, body):
        return {"err": "ai.not_editable", "msg": "知识图谱首版不支持手工编辑"}

    @staticmethod
    def export(handler, record):
        if record.status != "succeeded":
            handler.set_header("Content-Type", "application/json; charset=UTF-8")
            handler.write({"err": "ai.not_ready", "msg": "知识图谱尚未完成"})
            return
        filename = f"knowledge-graph-{record.book_id}-{record.id[:8]}.json"
        handler.set_header("Content-Type", "application/json; charset=UTF-8")
        handler.set_header("Content-Disposition", f'attachment; filename="{filename}"')
        handler.write(json.dumps(record.result_data or {}, ensure_ascii=False, separators=(",", ":")))


AI_FEATURES = {
    SummaryDuckFeature.key: SummaryDuckFeature,
    KnowledgeGraphFeature.key: KnowledgeGraphFeature,
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
        return error or {"err": "ok", "task": feature.task_dict(record)}

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
        feature = _feature(feature_name)
        if not feature:
            return {"err": "ai.feature_not_found", "msg": "不支持的 AI 功能"}
        record = self._own_task(feature.key, task_id)
        if not record:
            return {"err": "ai.not_found", "msg": "AI 任务不存在"}
        visible, error = feature.can_access(self, record)
        removable_artifact_errors = {"artifact.unavailable", "artifact.digest_mismatch", "artifact.invalid"}
        if not visible and error.get("err") not in removable_artifact_errors:
            return error
        if record.status in {"queued", "running"}:
            feature.service(self).cancel(record.id)
        try:
            delete = getattr(feature, "delete", None)
            if delete:
                delete(self, record)
        except AIArtifactError as exc:
            return {"err": exc.code, "msg": exc.safe_message}
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
    ]
