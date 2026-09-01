#!/usr/bin/env python3
"""Feature-routed API for creator-private AI tasks."""

import asyncio
import datetime
import hashlib
import json
import logging
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask, ReadingState, TaleAgent, TaleAgentConversation
from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore, TaleAgentArtifactError, TaleAgentArtifactStore
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
from webserver.services.tale_agent import (
    FEATURE_KEY as TALE_AGENT_FEATURE_KEY,
)
from webserver.services.tale_agent import (
    MANIFEST_PROMPT_VERSION,
    MANIFEST_SCHEMA_VERSION,
    TaleAgentService,
    TaleAgentValidationError,
    agent_dict,
    bounded_evidence,
    conversation_dict,
    conversation_messages,
    epub_spine,
    evidence_hash,
    find_conversation_message,
    message_dict,
    new_id,
    new_message,
    preview_dict,
    resolve_cutoff,
    store_conversation_messages,
    update_conversation_message,
    validate_user_prompt,
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


class _TaleAgentBase(BaseHandler):
    def _artifacts(self):
        return TaleAgentArtifactStore.from_config(CONF, "agents")

    def _service(self):
        service = TaleAgentService()
        service.setup(self.settings["SessionMaker"], CONF)
        return service

    @staticmethod
    def _artifact_error():
        return {"err": "ai.artifact_unavailable", "msg": "Agent 产物缺失或未通过完整性校验"}

    def _preview_manifest(self, record):
        ref = record.result_data or {}
        if ref.get("artifact_status") != "ready":
            raise TaleAgentArtifactError("preview artifact is not ready")
        return self._artifacts().read_agent(
            record.creator_id,
            ref.get("artifact_path", ""),
            ref.get("artifact_sha256", ""),
        )

    def _agent_manifest(self, record):
        if record.artifact_status != "ready":
            raise TaleAgentArtifactError("agent artifact is not ready")
        return self._artifacts().read_agent(record.creator_id, record.manifest_path, record.manifest_sha256)

    def _preview_dict(self, record):
        manifest = self._preview_manifest(record) if record.status == "succeeded" else {}
        return preview_dict(record, manifest)

    def _agent_dict(self, record):
        return agent_dict(record, self._agent_manifest(record))

    def _book(self, book_id, expected_version=""):
        try:
            book_id = int(book_id)
        except (TypeError, ValueError):
            return None, {"err": "params.invalid", "msg": "书籍参数无效"}
        if not self.can_view_book(book_id):
            return None, {"err": "book.not_found", "msg": "书籍不存在"}
        book = self.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub"):
            return None, {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        if expected_version and _book_version(book) != expected_version:
            return None, {"err": "ai.book_version_changed", "msg": "书籍版本已变化，派生 Agent 已暂停"}
        return book, None

    def _own_preview(self, preview_id):
        return (
            self.session.query(AITask)
            .filter(
                AITask.id == preview_id,
                AITask.feature == TALE_AGENT_FEATURE_KEY,
                AITask.creator_id == self.user_id(),
            )
            .first()
        )

    def _own_agent(self, agent_id):
        return self.session.query(TaleAgent).filter(TaleAgent.id == agent_id, TaleAgent.creator_id == self.user_id()).first()

    def _agent_access(self, agent_id):
        agent = self._own_agent(agent_id)
        if not agent:
            return None, None, {"err": "ai.not_found", "msg": "Agent 不存在"}
        book, error = self._book(agent.book_id, agent.book_version)
        if error:
            return None, None, error
        return agent, book, None

    def _conversation_access(self, conversation_id):
        conversation = (
            self.session.query(TaleAgentConversation)
            .filter(
                TaleAgentConversation.id == conversation_id,
                TaleAgentConversation.creator_id == self.user_id(),
            )
            .first()
        )
        if not conversation:
            return None, None, None, {"err": "ai.not_found", "msg": "会话不存在"}
        agent, book, error = self._agent_access(conversation.tale_agent_id)
        return conversation, agent, book, error

    def _message_access(self, message_id):
        conversations = self.session.query(TaleAgentConversation).filter(TaleAgentConversation.creator_id == self.user_id())
        for conversation in conversations:
            message, _index = find_conversation_message(conversation, message_id)
            if message:
                accessed, agent, book, error = self._conversation_access(conversation.id)
                return message, accessed, agent, book, error
        return None, None, None, None, {"err": "ai.not_found", "msg": "消息不存在"}

    def _evidence(self, book, cutoff_index):
        chapters = epub_spine(book["fmt_epub"])
        return chapters, bounded_evidence(chapters, cutoff_index)


class TaleAgentSpine(_TaleAgentBase):
    @js
    @auth
    def get(self):
        book, error = self._book(self.get_argument("book_id", ""))
        if error:
            return error
        try:
            chapters = epub_spine(book["fmt_epub"])
            state = (
                self.session.query(ReadingState)
                .filter(ReadingState.book_id == book["id"], ReadingState.reader_id == self.user_id())
                .first()
            )
            cutoff = resolve_cutoff(chapters, progress=state.get_progress() if state else {})
        except TaleAgentValidationError as exc:
            return {"err": "ai.source_invalid", "msg": str(exc)}
        return {
            "err": "ok",
            "chapters": [{key: chapter[key] for key in ("index", "href", "title")} for chapter in chapters],
            "default_cutoff": {key: cutoff[key] for key in ("index", "href", "title")},
        }


class TaleAgentPreviews(_TaleAgentBase):
    @js
    @auth
    def post(self):
        if not CONF.get("AI_ENABLED", True):
            return {"err": "ai.disabled", "msg": "AI 功能未启用"}
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book, error = self._book(body.get("book_id"))
        if error:
            return error
        requested_name = str(body.get("name", "") or "").strip()
        if len(requested_name) > 200:
            return {"err": "params.invalid", "msg": "人物名称过长"}
        try:
            chapters = epub_spine(book["fmt_epub"])
            requested_href = str(body.get("cutoff_href", "") or "")
            cutoff = resolve_cutoff(chapters, requested_href=requested_href) if requested_href else chapters[-1]
            evidence = bounded_evidence(chapters, cutoff["index"])
        except TaleAgentValidationError as exc:
            return {"err": "ai.source_invalid", "msg": str(exc)}
        version = _book_version(book)
        raw_key = ":".join(
            [
                TALE_AGENT_FEATURE_KEY,
                str(self.user_id()),
                str(book["id"]),
                version,
                cutoff["href"],
                evidence_hash(evidence),
                requested_name,
                MANIFEST_SCHEMA_VERSION,
                MANIFEST_PROMPT_VERSION,
            ]
        )
        request_key_value = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
        if body.get("regenerate"):
            request_key_value = hashlib.sha256((request_key_value + uuid.uuid4().hex).encode("utf-8")).hexdigest()
        existing = self.session.query(AITask).filter(AITask.request_key == request_key_value).first()
        if existing:
            try:
                payload = self._preview_dict(existing)
            except TaleAgentArtifactError:
                return self._artifact_error()
            return {"err": "ok", "preview": payload, "idempotent": True}
        record = AITask(
            id=new_id(),
            request_key=request_key_value,
            feature=TALE_AGENT_FEATURE_KEY,
            creator_id=self.user_id(),
            book_id=book["id"],
            book_version=version,
            chapter_href=cutoff["href"],
            chapter_title=cutoff["title"],
            chapter_text_hash=evidence_hash(evidence),
            chapter_length=sum(len(chapter["text"]) for chapter in evidence),
            status="queued",
            progress_message="等待生成角色预览",
            ai_draft={"requested_name": requested_name, "cutoff_index": cutoff["index"]},
            schema_version=MANIFEST_SCHEMA_VERSION,
            prompt_version=MANIFEST_PROMPT_VERSION,
        )
        self.session.add(record)
        self.session.commit()
        self._service().submit_preview(record.id, evidence, requested_name)
        return {"err": "ok", "preview": self._preview_dict(record), "idempotent": False}


class TaleAgentPreviewItem(_TaleAgentBase):
    @js
    @auth
    def get(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        _book, error = self._book(record.book_id, record.book_version)
        if error:
            return error
        try:
            return {"err": "ok", "preview": self._preview_dict(record)}
        except TaleAgentArtifactError:
            return self._artifact_error()

    @js
    @auth
    def delete(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        artifact_ref = dict(record.result_data or {})
        owner_id = record.creator_id
        if record.status in {"queued", "running"}:
            self._service().cancel(record.id)
        self.session.delete(record)
        self.session.commit()
        if artifact_ref.get("artifact_path"):
            try:
                self._artifacts().delete(owner_id, artifact_ref["artifact_path"])
            except TaleAgentArtifactError:
                logging.exception("Failed to clean TaleAgent preview artifact preview_id=%s", preview_id)
                return {"err": "ai.artifact_cleanup_failed", "msg": "预览已删除，但产物目录清理失败"}
        return {"err": "ok"}


class TaleAgentPreviewCancel(_TaleAgentBase):
    @js
    @auth
    def post(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        if record.status not in {"queued", "running"}:
            try:
                payload = self._preview_dict(record)
            except TaleAgentArtifactError:
                return self._artifact_error()
            return {"err": "ok", "preview": payload, "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        self.session.commit()
        active = self._service().cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "preview": self._preview_dict(record), "idempotent": False}


class TaleAgents(_TaleAgentBase):
    @js
    @auth
    def get(self):
        query = self.session.query(TaleAgent).filter(TaleAgent.creator_id == self.user_id())
        book_id = self.get_argument("book_id", "")
        if book_id:
            try:
                query = query.filter(TaleAgent.book_id == int(book_id))
            except ValueError:
                return {"err": "params.invalid", "msg": "书籍参数无效"}
        records = query.order_by(TaleAgent.update_time.desc()).all()
        visible = []
        for record in records:
            _book, error = self._book(record.book_id, record.book_version)
            if not error:
                try:
                    visible.append(self._agent_dict(record))
                except TaleAgentArtifactError:
                    unavailable = agent_dict(record, {})
                    unavailable["artifact_status"] = "unavailable"
                    visible.append(unavailable)
        return {"err": "ok", "agents": visible}

    @js
    @auth
    def post(self):
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        preview = self._own_preview(str(body.get("preview_id", "")))
        if not preview or preview.status != "succeeded" or not preview.result_data:
            return {"err": "ai.preview_not_ready", "msg": "角色预览尚未就绪"}
        _book, error = self._book(preview.book_id, preview.book_version)
        if error:
            return error
        try:
            manifest = self._preview_manifest(preview)
        except TaleAgentArtifactError:
            return self._artifact_error()
        context = preview.ai_draft or {}
        agent_id = new_id()
        write = self._artifacts().replace_agent(self.user_id(), agent_id, manifest)
        record = TaleAgent(
            id=agent_id,
            creator_id=self.user_id(),
            book_id=preview.book_id,
            book_version=preview.book_version,
            display_name=manifest["display_name"],
            manifest_path=write.ref.relative_path,
            manifest_sha256=write.ref.sha256,
            artifact_status=write.ref.status,
            cutoff_href=preview.chapter_href,
            cutoff_title=preview.chapter_title,
            cutoff_index=int(context.get("cutoff_index", 0)),
            schema_version=preview.schema_version,
            prompt_version=preview.prompt_version,
        )
        try:
            self.session.add(record)
            self.session.commit()
        except Exception:
            self.session.rollback()
            self._artifacts().restore(self.user_id(), write)
            raise
        return {"err": "ok", "agent": agent_dict(record, manifest)}


class TaleAgentItem(_TaleAgentBase):
    @js
    @auth
    def get(self, agent_id):
        agent, _book, error = self._agent_access(agent_id)
        if error:
            return error
        try:
            return {"err": "ok", "agent": self._agent_dict(agent)}
        except TaleAgentArtifactError:
            return self._artifact_error()

    @js
    @auth
    def patch(self, agent_id):
        agent, _book, error = self._agent_access(agent_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        preview = self._own_preview(str(body.get("preview_id", "")))
        if (
            not preview
            or preview.status != "succeeded"
            or preview.book_id != agent.book_id
            or preview.book_version != agent.book_version
        ):
            return {"err": "ai.preview_required", "msg": "调整边界前需要生成并确认新的安全预览"}
        new_index = int((preview.ai_draft or {}).get("cutoff_index", 0))
        try:
            manifest = self._preview_manifest(preview)
        except TaleAgentArtifactError:
            return self._artifact_error()
        if manifest["display_name"] != agent.display_name:
            return {"err": "ai.preview_required", "msg": "调整边界不能改变 TaleAgent 人物"}
        write = self._artifacts().replace_agent(agent.creator_id, agent.id, manifest)
        agent.display_name = manifest["display_name"]
        agent.manifest_path = write.ref.relative_path
        agent.manifest_sha256 = write.ref.sha256
        agent.artifact_status = write.ref.status
        agent.cutoff_href = preview.chapter_href
        agent.cutoff_title = preview.chapter_title
        agent.cutoff_index = new_index
        agent.schema_version = preview.schema_version
        agent.prompt_version = preview.prompt_version
        agent.update_time = datetime.datetime.now()
        try:
            self.session.commit()
        except Exception:
            self.session.rollback()
            self._artifacts().restore(agent.creator_id, write)
            raise
        return {"err": "ok", "agent": agent_dict(agent, manifest)}

    @js
    @auth
    def delete(self, agent_id):
        agent = self._own_agent(agent_id)
        if not agent:
            return {"err": "ai.not_found", "msg": "Agent 不存在"}
        artifact_path = agent.manifest_path
        owner_id = agent.creator_id
        conversations = self.session.query(TaleAgentConversation).filter_by(tale_agent_id=agent.id).all()
        for conversation in conversations:
            for message in conversation_messages(conversation):
                if message.get("status") in {"queued", "running"}:
                    self._service().cancel(message["id"])
        self.session.query(TaleAgentConversation).filter_by(tale_agent_id=agent.id).delete(synchronize_session=False)
        self.session.delete(agent)
        self.session.commit()
        try:
            self._artifacts().delete(owner_id, artifact_path)
        except TaleAgentArtifactError:
            logging.exception("Failed to clean TaleAgent artifact agent_id=%s", agent_id)
            return {"err": "ai.artifact_cleanup_failed", "msg": "Agent 已删除，但产物目录清理失败"}
        return {"err": "ok", "msg": "Agent、私有会话与反馈已删除"}


class TaleAgentConversations(_TaleAgentBase):
    @js
    @auth
    def post(self, agent_id):
        agent, _book, error = self._agent_access(agent_id)
        if error:
            return error
        record = TaleAgentConversation(
            id=new_id(),
            tale_agent_id=agent.id,
            creator_id=self.user_id(),
            cutoff_href=agent.cutoff_href,
            cutoff_title=agent.cutoff_title,
            cutoff_index=agent.cutoff_index,
            messages={"items": []},
        )
        self.session.add(record)
        self.session.commit()
        return {"err": "ok", "conversation": conversation_dict(record)}


class TaleAgentConversationItem(_TaleAgentBase):
    @js
    @auth
    def get(self, conversation_id):
        conversation, _agent, _book, error = self._conversation_access(conversation_id)
        if error:
            return error
        return {"err": "ok", "conversation": conversation_dict(conversation)}

    @js
    @auth
    def delete(self, conversation_id):
        conversation, _agent, _book, error = self._conversation_access(conversation_id)
        if error:
            return error
        for message in conversation_messages(conversation):
            if message.get("status") in {"queued", "running"}:
                self._service().cancel(message["id"])
        self.session.delete(conversation)
        self.session.commit()
        return {"err": "ok"}


class TaleAgentMessages(_TaleAgentBase):
    def _create_message(self, conversation, agent, user_content):
        try:
            content = validate_user_prompt(user_content)
        except TaleAgentValidationError as exc:
            return None, {"err": "params.invalid", "msg": str(exc)}
        try:
            manifest = self._agent_manifest(agent)
        except TaleAgentArtifactError:
            return None, self._artifact_error()
        messages = conversation_messages(conversation)
        if any(message.get("status") in {"queued", "running"} for message in messages):
            return None, {"err": "ai.busy", "msg": "当前会话仍有消息在生成"}
        previous = [message for message in messages if message.get("status") == "succeeded"]
        history = []
        for message in previous[-6:]:
            history.extend(
                [
                    {"role": "user", "content": message.get("user_content", "")},
                    {"role": "assistant", "content": message.get("assistant_content", "")},
                ]
            )
        record = new_message(content)
        store_conversation_messages(conversation, [*messages, record])
        self.session.commit()
        self._service().submit_message(conversation.id, record["id"], manifest, history)
        return record, None

    @js
    @auth
    def post(self, conversation_id):
        conversation, agent, _book, error = self._conversation_access(conversation_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record, error = self._create_message(conversation, agent, body.get("content"))
        return error or {"err": "ok", "message": message_dict(record)}


class TaleAgentMessageCancel(_TaleAgentBase):
    @js
    @auth
    def post(self, message_id):
        message, conversation, _agent, _book, error = self._message_access(message_id)
        if error:
            return error
        if message.get("status") not in {"queued", "running"}:
            return {"err": "ok", "message": message_dict(message), "idempotent": True}
        original_status = message.get("status")
        updated = update_conversation_message(
            conversation,
            message_id,
            {"cancel_requested": True, "progress_message": "正在取消"},
        )
        self.session.commit()
        active = self._service().cancel(message_id)
        if not active and original_status == "queued":
            updated = update_conversation_message(
                conversation,
                message_id,
                {"status": "cancelled", "finished_at": datetime.datetime.now().isoformat()},
            )
            self.session.commit()
        return {"err": "ok", "message": message_dict(updated or message), "idempotent": False}


class TaleAgentMessageRetry(TaleAgentMessages):
    @js
    @auth
    def post(self, message_id):
        message, conversation, agent, _book, error = self._message_access(message_id)
        if error:
            return error
        if message.get("status") in {"queued", "running"}:
            return {"err": "ai.busy", "msg": "消息仍在生成"}
        record, error = self._create_message(conversation, agent, message.get("user_content", ""))
        return error or {"err": "ok", "message": message_dict(record)}


class TaleAgentMessageFeedback(_TaleAgentBase):
    @js
    @auth
    def patch(self, message_id):
        message, conversation, _agent, _book, error = self._message_access(message_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        feedback = str(body.get("feedback", ""))
        if feedback not in {"", "not_like", "not_useful", "too_vague", "spoiler", "too_much_quote"}:
            return {"err": "params.invalid", "msg": "反馈类型无效"}
        message = update_conversation_message(conversation, message_id, {"feedback": feedback})
        self.session.commit()
        return {"err": "ok", "message": message_dict(message)}


class TaleAgentMessageStream(_TaleAgentBase):
    @js
    @auth
    async def get(self, message_id):
        message, conversation, _agent, _book, error = self._message_access(message_id)
        if error:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write(error)
            return
        self.set_header("Content-Type", "application/x-ndjson; charset=UTF-8")
        self.set_header("Cache-Control", "no-cache, no-store")
        self.set_header("X-Accel-Buffering", "no")
        last_snapshot = None
        for _attempt in range(240):
            self.session.expire_all()
            conversation = self.session.get(TaleAgentConversation, conversation.id)
            message, _index = find_conversation_message(conversation, message_id) if conversation else (None, -1)
            if not conversation or not message:
                break
            snapshot = message_dict(message)
            serialized = json.dumps({"type": "message", "message": snapshot}, ensure_ascii=False)
            if serialized != last_snapshot:
                try:
                    self.write(serialized + "\n")
                    await self.flush()
                except Exception:
                    return
                last_snapshot = serialized
            if message.get("status") in {"succeeded", "failed", "cancelled"}:
                break
            await asyncio.sleep(0.5)


def routes():
    return [
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks", AITaskCollection),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)", AITaskItem),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/cancel", AITaskCancel),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/export", AITaskExport),
        (r"/api/ai/tale-agent/spine", TaleAgentSpine),
        (r"/api/ai/tale-agent/previews", TaleAgentPreviews),
        (r"/api/ai/tale-agent/previews/([0-9a-f-]+)", TaleAgentPreviewItem),
        (r"/api/ai/tale-agent/previews/([0-9a-f-]+)/cancel", TaleAgentPreviewCancel),
        (r"/api/ai/tale-agent/agents", TaleAgents),
        (r"/api/ai/tale-agent/agents/([0-9a-f-]+)", TaleAgentItem),
        (r"/api/ai/tale-agent/agents/([0-9a-f-]+)/conversations", TaleAgentConversations),
        (r"/api/ai/tale-agent/conversations/([0-9a-f-]+)", TaleAgentConversationItem),
        (r"/api/ai/tale-agent/conversations/([0-9a-f-]+)/messages", TaleAgentMessages),
        (r"/api/ai/tale-agent/messages/([0-9a-f-]+)/stream", TaleAgentMessageStream),
        (r"/api/ai/tale-agent/messages/([0-9a-f-]+)/cancel", TaleAgentMessageCancel),
        (r"/api/ai/tale-agent/messages/([0-9a-f-]+)/retry", TaleAgentMessageRetry),
        (r"/api/ai/tale-agent/messages/([0-9a-f-]+)/feedback", TaleAgentMessageFeedback),
    ]
