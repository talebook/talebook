#!/usr/bin/env python3
"""Feature-routed API for creator-private AI tasks."""

import asyncio
import datetime
import hashlib
import json
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import AITask, ProtagonistAgent, ProtagonistConversation, ProtagonistMessage, ReadingState
from webserver.services.protagonist_agent import (
    CHAT_PROMPT_VERSION,
    CHAT_SCHEMA_VERSION,
    MANIFEST_PROMPT_VERSION,
    MANIFEST_SCHEMA_VERSION,
    ProtagonistService,
    ProtagonistValidationError,
    agent_dict,
    bounded_evidence,
    conversation_dict,
    epub_spine,
    evidence_hash,
    message_dict,
    new_id,
    preview_dict,
    resolve_cutoff,
    validate_user_prompt,
)
from webserver.services.protagonist_agent import (
    FEATURE_KEY as PROTAGONIST_FEATURE_KEY,
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


AI_FEATURES = {SummaryDuckFeature.key: SummaryDuckFeature}


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
        record.cancel_requested = True
        record.progress_message = "正在取消"
        record.update_time = datetime.datetime.now()
        self.session.commit()
        active = feature.service(self).cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
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


class _ProtagonistBase(BaseHandler):
    def _service(self):
        service = ProtagonistService()
        service.setup(self.settings["SessionMaker"], CONF)
        return service

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
                AITask.feature == PROTAGONIST_FEATURE_KEY,
                AITask.creator_id == self.user_id(),
            )
            .first()
        )

    def _own_agent(self, agent_id):
        return (
            self.session.query(ProtagonistAgent)
            .filter(ProtagonistAgent.id == agent_id, ProtagonistAgent.creator_id == self.user_id())
            .first()
        )

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
            self.session.query(ProtagonistConversation)
            .filter(
                ProtagonistConversation.id == conversation_id,
                ProtagonistConversation.creator_id == self.user_id(),
            )
            .first()
        )
        if not conversation:
            return None, None, None, {"err": "ai.not_found", "msg": "会话不存在"}
        agent, book, error = self._agent_access(conversation.agent_id)
        return conversation, agent, book, error

    def _message_access(self, message_id):
        message = (
            self.session.query(ProtagonistMessage)
            .filter(ProtagonistMessage.id == message_id, ProtagonistMessage.creator_id == self.user_id())
            .first()
        )
        if not message:
            return None, None, None, None, {"err": "ai.not_found", "msg": "消息不存在"}
        conversation, agent, book, error = self._conversation_access(message.conversation_id)
        return message, conversation, agent, book, error

    def _evidence(self, book, cutoff_index):
        chapters = epub_spine(book["fmt_epub"])
        return chapters, bounded_evidence(chapters, cutoff_index)


class ProtagonistSpine(_ProtagonistBase):
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
        except ProtagonistValidationError as exc:
            return {"err": "ai.source_invalid", "msg": str(exc)}
        return {
            "err": "ok",
            "chapters": [{key: chapter[key] for key in ("index", "href", "title")} for chapter in chapters],
            "default_cutoff": {key: cutoff[key] for key in ("index", "href", "title")},
        }


class ProtagonistPreviews(_ProtagonistBase):
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
        except ProtagonistValidationError as exc:
            return {"err": "ai.source_invalid", "msg": str(exc)}
        version = _book_version(book)
        raw_key = ":".join(
            [
                PROTAGONIST_FEATURE_KEY,
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
            return {"err": "ok", "preview": preview_dict(existing), "idempotent": True}
        record = AITask(
            id=new_id(),
            request_key=request_key_value,
            feature=PROTAGONIST_FEATURE_KEY,
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
        return {"err": "ok", "preview": preview_dict(record), "idempotent": False}


class ProtagonistPreviewItem(_ProtagonistBase):
    @js
    @auth
    def get(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        _book, error = self._book(record.book_id, record.book_version)
        return error or {"err": "ok", "preview": preview_dict(record)}

    @js
    @auth
    def delete(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        if record.status in {"queued", "running"}:
            self._service().cancel(record.id)
        self.session.delete(record)
        self.session.commit()
        return {"err": "ok"}


class ProtagonistPreviewCancel(_ProtagonistBase):
    @js
    @auth
    def post(self, preview_id):
        record = self._own_preview(preview_id)
        if not record:
            return {"err": "ai.not_found", "msg": "预览不存在"}
        if record.status not in {"queued", "running"}:
            return {"err": "ok", "preview": preview_dict(record), "idempotent": True}
        record.cancel_requested = True
        record.progress_message = "正在取消"
        self.session.commit()
        active = self._service().cancel(record.id)
        if not active and record.status == "queued":
            record.status = "cancelled"
            record.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "preview": preview_dict(record), "idempotent": False}


class ProtagonistAgents(_ProtagonistBase):
    @js
    @auth
    def get(self):
        query = self.session.query(ProtagonistAgent).filter(ProtagonistAgent.creator_id == self.user_id())
        book_id = self.get_argument("book_id", "")
        if book_id:
            try:
                query = query.filter(ProtagonistAgent.book_id == int(book_id))
            except ValueError:
                return {"err": "params.invalid", "msg": "书籍参数无效"}
        records = query.order_by(ProtagonistAgent.update_time.desc()).all()
        visible = []
        for record in records:
            _book, error = self._book(record.book_id, record.book_version)
            if not error:
                visible.append(agent_dict(record))
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
        manifest = dict(preview.result_data)
        context = preview.ai_draft or {}
        record = ProtagonistAgent(
            id=new_id(),
            creator_id=self.user_id(),
            book_id=preview.book_id,
            book_version=preview.book_version,
            display_name=manifest["display_name"],
            manifest=manifest,
            cutoff_href=preview.chapter_href,
            cutoff_title=preview.chapter_title,
            cutoff_index=int(context.get("cutoff_index", 0)),
            schema_version=preview.schema_version,
            prompt_version=preview.prompt_version,
        )
        self.session.add(record)
        self.session.commit()
        return {"err": "ok", "agent": agent_dict(record)}


class ProtagonistAgentItem(_ProtagonistBase):
    @js
    @auth
    def get(self, agent_id):
        agent, _book, error = self._agent_access(agent_id)
        return error or {"err": "ok", "agent": agent_dict(agent)}

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
            or (preview.ai_draft or {}).get("requested_name") != agent.display_name
        ):
            return {"err": "ai.preview_required", "msg": "调整边界前需要生成并确认新的安全预览"}
        new_index = int((preview.ai_draft or {}).get("cutoff_index", 0))
        manifest = dict(preview.result_data or {})
        if not manifest:
            return {"err": "ai.preview_required", "msg": "新的安全预览不可用"}
        agent.display_name = manifest["display_name"]
        agent.manifest = manifest
        agent.cutoff_href = preview.chapter_href
        agent.cutoff_title = preview.chapter_title
        agent.cutoff_index = new_index
        agent.schema_version = preview.schema_version
        agent.prompt_version = preview.prompt_version
        agent.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "agent": agent_dict(agent)}

    @js
    @auth
    def delete(self, agent_id):
        agent = self._own_agent(agent_id)
        if not agent:
            return {"err": "ai.not_found", "msg": "Agent 不存在"}
        conversation_ids = [row[0] for row in self.session.query(ProtagonistConversation.id).filter_by(agent_id=agent.id)]
        if conversation_ids:
            messages = self.session.query(ProtagonistMessage).filter(ProtagonistMessage.conversation_id.in_(conversation_ids))
            for message in messages.filter(ProtagonistMessage.status.in_(["queued", "running"])):
                self._service().cancel(message.id)
            messages.delete(synchronize_session=False)
            self.session.query(ProtagonistConversation).filter(ProtagonistConversation.id.in_(conversation_ids)).delete(
                synchronize_session=False
            )
        self.session.delete(agent)
        self.session.commit()
        return {"err": "ok", "msg": "Agent、私有会话与反馈已删除"}


class ProtagonistConversations(_ProtagonistBase):
    @js
    @auth
    def post(self, agent_id):
        agent, _book, error = self._agent_access(agent_id)
        if error:
            return error
        record = ProtagonistConversation(
            id=new_id(),
            agent_id=agent.id,
            creator_id=self.user_id(),
            cutoff_href=agent.cutoff_href,
            cutoff_title=agent.cutoff_title,
            cutoff_index=agent.cutoff_index,
        )
        self.session.add(record)
        self.session.commit()
        return {"err": "ok", "conversation": conversation_dict(record)}


class ProtagonistConversationItem(_ProtagonistBase):
    @js
    @auth
    def get(self, conversation_id):
        conversation, _agent, _book, error = self._conversation_access(conversation_id)
        if error:
            return error
        messages = (
            self.session.query(ProtagonistMessage)
            .filter(ProtagonistMessage.conversation_id == conversation.id)
            .order_by(ProtagonistMessage.create_time.asc(), ProtagonistMessage.id.asc())
            .all()
        )
        return {"err": "ok", "conversation": conversation_dict(conversation, messages)}

    @js
    @auth
    def delete(self, conversation_id):
        conversation, _agent, _book, error = self._conversation_access(conversation_id)
        if error:
            return error
        messages = self.session.query(ProtagonistMessage).filter(ProtagonistMessage.conversation_id == conversation.id)
        for message in messages.filter(ProtagonistMessage.status.in_(["queued", "running"])):
            self._service().cancel(message.id)
        messages.delete(synchronize_session=False)
        self.session.delete(conversation)
        self.session.commit()
        return {"err": "ok"}


class ProtagonistMessages(_ProtagonistBase):
    def _create_message(self, conversation, agent, book, user_content):
        try:
            content = validate_user_prompt(user_content)
        except ProtagonistValidationError as exc:
            return None, {"err": "params.invalid", "msg": str(exc)}
        previous = (
            self.session.query(ProtagonistMessage)
            .filter(
                ProtagonistMessage.conversation_id == conversation.id,
                ProtagonistMessage.status == "succeeded",
            )
            .order_by(ProtagonistMessage.create_time.asc())
            .all()
        )
        history = []
        for message in previous[-6:]:
            history.extend(
                [
                    {"role": "user", "content": message.user_content},
                    {"role": "assistant", "content": message.assistant_content},
                ]
            )
        record = ProtagonistMessage(
            id=new_id(),
            conversation_id=conversation.id,
            creator_id=self.user_id(),
            user_content=content,
            status="queued",
            progress_message="等待生成",
            schema_version=CHAT_SCHEMA_VERSION,
            prompt_version=CHAT_PROMPT_VERSION,
        )
        conversation.update_time = datetime.datetime.now()
        self.session.add(record)
        self.session.commit()
        self._service().submit_message(record.id, dict(agent.manifest or {}), history)
        return record, None

    @js
    @auth
    def post(self, conversation_id):
        conversation, agent, book, error = self._conversation_access(conversation_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        record, error = self._create_message(conversation, agent, book, body.get("content"))
        return error or {"err": "ok", "message": message_dict(record)}


class ProtagonistMessageCancel(_ProtagonistBase):
    @js
    @auth
    def post(self, message_id):
        message, _conversation, _agent, _book, error = self._message_access(message_id)
        if error:
            return error
        if message.status not in {"queued", "running"}:
            return {"err": "ok", "message": message_dict(message), "idempotent": True}
        message.cancel_requested = True
        message.progress_message = "正在取消"
        self.session.commit()
        active = self._service().cancel(message.id)
        if not active and message.status == "queued":
            message.status = "cancelled"
            message.finished_at = datetime.datetime.now()
            self.session.commit()
        return {"err": "ok", "message": message_dict(message), "idempotent": False}


class ProtagonistMessageRetry(ProtagonistMessages):
    @js
    @auth
    def post(self, message_id):
        message, conversation, agent, book, error = self._message_access(message_id)
        if error:
            return error
        if message.status in {"queued", "running"}:
            return {"err": "ai.busy", "msg": "消息仍在生成"}
        record, error = self._create_message(conversation, agent, book, message.user_content)
        return error or {"err": "ok", "message": message_dict(record)}


class ProtagonistMessageFeedback(_ProtagonistBase):
    @js
    @auth
    def patch(self, message_id):
        message, _conversation, _agent, _book, error = self._message_access(message_id)
        if error:
            return error
        try:
            body = _json_body(self)
        except SummaryDuckValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        feedback = str(body.get("feedback", ""))
        if feedback not in {"", "not_like", "not_useful", "too_vague", "spoiler", "too_much_quote"}:
            return {"err": "params.invalid", "msg": "反馈类型无效"}
        message.feedback = feedback
        message.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "message": message_dict(message)}


class ProtagonistMessageStream(_ProtagonistBase):
    @auth
    async def get(self, message_id):
        message, _conversation, _agent, _book, error = self._message_access(message_id)
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
            message = self.session.get(ProtagonistMessage, message_id)
            if not message:
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
            if message.status in {"succeeded", "failed", "cancelled"}:
                break
            await asyncio.sleep(0.5)


def routes():
    return [
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks", AITaskCollection),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)", AITaskItem),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/cancel", AITaskCancel),
        (r"/api/ai/([a-z][a-z0-9_]*)/tasks/([0-9a-f-]+)/export", AITaskExport),
        (r"/api/ai/protagonist/spine", ProtagonistSpine),
        (r"/api/ai/protagonist/previews", ProtagonistPreviews),
        (r"/api/ai/protagonist/previews/([0-9a-f-]+)", ProtagonistPreviewItem),
        (r"/api/ai/protagonist/previews/([0-9a-f-]+)/cancel", ProtagonistPreviewCancel),
        (r"/api/ai/protagonist/agents", ProtagonistAgents),
        (r"/api/ai/protagonist/agents/([0-9a-f-]+)", ProtagonistAgentItem),
        (r"/api/ai/protagonist/agents/([0-9a-f-]+)/conversations", ProtagonistConversations),
        (r"/api/ai/protagonist/conversations/([0-9a-f-]+)", ProtagonistConversationItem),
        (r"/api/ai/protagonist/conversations/([0-9a-f-]+)/messages", ProtagonistMessages),
        (r"/api/ai/protagonist/messages/([0-9a-f-]+)/stream", ProtagonistMessageStream),
        (r"/api/ai/protagonist/messages/([0-9a-f-]+)/cancel", ProtagonistMessageCancel),
        (r"/api/ai/protagonist/messages/([0-9a-f-]+)/retry", ProtagonistMessageRetry),
        (r"/api/ai/protagonist/messages/([0-9a-f-]+)/feedback", ProtagonistMessageFeedback),
    ]
