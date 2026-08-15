"""Business validation and persistence orchestration for Summary Duck TOP5."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import logging
import re
import threading
from typing import Any, Dict, Iterable, List, Optional

from webserver.models import AITop5Result
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
SCHEMA_VERSION = "top5.v1"
PROMPT_VERSION = "top5.zh.v1"
MAX_CHAPTER_CHARACTERS = 20_000
MAX_QUESTION_CHARACTERS = 300
MAX_ANSWER_CHARACTERS = 4_000
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


TOP5_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "answer": {"type": "string"},
                    "citations": {
                        "type": "array",
                        "minItems": 1,
                        "items": {
                            "type": "object",
                            "properties": {
                                "href": {"type": "string"},
                                "start": {"type": "integer", "minimum": 0},
                                "end": {"type": "integer", "minimum": 1},
                                "quote": {"type": "string"},
                            },
                            "required": ["href", "start", "end", "quote"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["question", "answer", "citations"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}


class Top5ValidationError(ValueError):
    pass


def clean_markdown(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        raise Top5ValidationError("问答内容必须是文本")
    normalized = CONTROL_RE.sub("", value).replace("\r\n", "\n").replace("\r", "\n").strip()
    # Normalize already escaped input before escaping again, making edits idempotent.
    normalized = html.escape(html.unescape(normalized), quote=False)
    if not normalized or len(normalized) > limit:
        raise Top5ValidationError("问答内容为空或过长")
    return normalized


def _normalize_quote(value: str) -> str:
    return " ".join(html.unescape(value).split())


def validate_top5(payload: Any, chapter_text: str, chapter_href: str) -> Dict[str, List[Dict[str, Any]]]:
    if not isinstance(payload, dict) or set(payload) != {"items"}:
        raise Top5ValidationError("结果根对象不符合 top5.v1")
    items = payload.get("items")
    if not isinstance(items, list) or len(items) != 5:
        raise Top5ValidationError("结果必须恰好包含五组问答")
    checked: List[Dict[str, Any]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict) or set(item) != {"question", "answer", "citations"}:
            raise Top5ValidationError(f"第 {index + 1} 组问答结构无效")
        question = clean_markdown(item["question"], MAX_QUESTION_CHARACTERS)
        answer = clean_markdown(item["answer"], MAX_ANSWER_CHARACTERS)
        citations = item.get("citations")
        if not isinstance(citations, list) or not citations:
            raise Top5ValidationError(f"第 {index + 1} 个答案缺少原文引用")
        checked_citations = []
        for citation in citations:
            if not isinstance(citation, dict) or set(citation) != {"href", "start", "end", "quote"}:
                raise Top5ValidationError("引用 locator 结构无效")
            start, end = citation.get("start"), citation.get("end")
            if citation.get("href") != chapter_href or not isinstance(start, int) or not isinstance(end, int):
                raise Top5ValidationError("引用不属于当前章节")
            if start < 0 or end <= start or end > len(chapter_text):
                raise Top5ValidationError("引用 locator 越界")
            quote = str(citation.get("quote", "")).strip()
            if not quote or _normalize_quote(quote) != _normalize_quote(chapter_text[start:end]):
                raise Top5ValidationError("引用文本与 locator 不匹配")
            checked_citations.append({"href": chapter_href, "start": start, "end": end, "quote": quote})
        checked.append({"question": question, "answer": answer, "citations": checked_citations})
    return {"items": checked}


def validate_chapter_input(chapter_text: Any, chapter_href: Any, chapter_title: Any = "") -> Dict[str, str]:
    if not isinstance(chapter_text, str):
        raise Top5ValidationError("当前章节正文缺失")
    chapter_text = CONTROL_RE.sub("", chapter_text).replace("\r\n", "\n").replace("\r", "\n")
    if len(chapter_text.strip()) < 80:
        raise Top5ValidationError("当前章节正文过短")
    if len(chapter_text) > MAX_CHAPTER_CHARACTERS:
        chapter_text = chapter_text[:MAX_CHAPTER_CHARACTERS]
    if not isinstance(chapter_href, str) or not chapter_href.strip() or len(chapter_href) > 1024:
        raise Top5ValidationError("当前章节 locator 无效")
    title = str(chapter_title or "").strip()[:512]
    return {"text": chapter_text, "href": chapter_href.strip(), "title": title}


def build_prompt(chapter: Dict[str, str]) -> str:
    instructions = {
        "task": "为严肃阅读者生成当前章节最值得掌握的五组问答",
        "rules": [
            "只使用输入章节，不使用外部知识，不调用任何工具",
            "恰好输出五组，问题简洁、答案准确；答案可用 **重点** Markdown",
            "每个答案至少一条引用；start/end 是 Python 字符下标，quote 必须等于正文[start:end]",
            "href 必须原样复制 chapter.href；不要输出 HTML、链接、style 或 script",
        ],
        "chapter": chapter,
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(instructions, ensure_ascii=False, separators=(",", ":"))


def chapter_hash(chapter_text: str) -> str:
    return hashlib.sha256(chapter_text.encode("utf-8")).hexdigest()


def request_key(creator_id: int, book_id: int, book_version: str, chapter_href: str, text_hash: str) -> str:
    raw = f"{creator_id}:{book_id}:{book_version}:{chapter_href}:{text_hash}:{SCHEMA_VERSION}:{PROMPT_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def export_markdown(record: AITop5Result) -> str:
    data = record.user_revision or record.qa_data or {}
    lines = [f"# 总结鸭 TOP5：{record.chapter_title or record.chapter_href}", ""]
    for number, item in enumerate(data.get("items", []), 1):
        lines.extend([f"## {number}. {item.get('question', '')}", "", item.get("answer", ""), "", "原文引用："])
        for citation in item.get("citations", []):
            lines.append(f"> {citation.get('quote', '')}")
            lines.append(f"> `{citation.get('href', '')}:{citation.get('start', 0)}-{citation.get('end', 0)}`")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


class AITop5Service:
    _instance: Optional["AITop5Service"] = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._configured = False
                cls._instance._threads = {}
                cls._instance._threads_lock = threading.Lock()
        return cls._instance

    def setup(self, session_maker, config: Dict[str, Any], runtime=None) -> None:
        self.session_maker = session_maker
        self.config = config
        if runtime is not None:
            self.runtime = runtime
        elif not self._configured:
            self.runtime = CodexAppServerRuntime(config)
        self._configured = True

    def submit(self, record_id: str, chapter: Dict[str, str]) -> None:
        if not self._configured:
            raise RuntimeError("AITop5Service is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, dict(chapter)),
                name=f"ai-top5-{record_id[:8]}",
                daemon=True,
            )
            self._threads[record_id] = thread
            thread.start()

    def _update_event(self, record_id: str, event: RuntimeEvent) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITop5Result, record_id)
            if not record:
                return
            record.progress_message = event.message[:256]
            if event.session_id:
                record.runtime_session_id = event.session_id[:128]
            if event.usage:
                record.usage = event.usage
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

    def _run(self, record_id: str, chapter: Dict[str, str]) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITop5Result, record_id)
            if not record or record.status not in {"queued", "failed", "cancelled"}:
                return
            if record.cancel_requested:
                record.status = "cancelled"
                record.finished_at = datetime.datetime.now()
                session.commit()
                return
            record.status = "running"
            record.runtime_name = self.runtime.name
            record.error_code = ""
            record.error_message = ""
            record.started_at = datetime.datetime.now()
            record.update_time = record.started_at
            session.commit()
        finally:
            session.close()

        try:
            result = self.runtime.generate(
                RuntimeRequest(
                    task_id=record_id,
                    prompt=build_prompt(chapter),
                    output_schema=TOP5_OUTPUT_SCHEMA,
                    model=self.config.get("AI_CODEX_MODEL", "") or None,
                ),
                lambda event: self._update_event(record_id, event),
            )
            checked = validate_top5(result.output, chapter["text"], chapter["href"])
            session = self.session_maker()
            try:
                record = session.get(AITop5Result, record_id)
                if not record:
                    return
                if record.cancel_requested:
                    record.status = "cancelled"
                else:
                    record.status = "succeeded"
                    record.qa_data = checked
                    record.ai_draft = checked
                    record.user_revision = checked
                    record.usage = result.usage or {}
                    record.runtime_session_id = (result.session_id or "")[:128]
                    record.progress_message = "生成完成"
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except (AgentRuntimeError, Top5ValidationError) as exc:
            session = self.session_maker()
            try:
                record = session.get(AITop5Result, record_id)
                if not record:
                    return
                cancelled = isinstance(exc, AgentRuntimeError) and exc.code.value == "runtime.cancelled"
                record.status = "cancelled" if cancelled or record.cancel_requested else "failed"
                record.error_code = getattr(getattr(exc, "code", None), "value", "result.invalid")
                record.error_message = str(getattr(exc, "safe_message", "AI 返回结果未通过校验"))[:500]
                record.progress_message = record.error_message
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except Exception:
            LOG.exception("AI TOP5 task failed record_id=%s", record_id)
            session = self.session_maker()
            try:
                record = session.get(AITop5Result, record_id)
                if record:
                    record.status = "failed"
                    record.error_code = "runtime.internal"
                    record.error_message = "AI 生成暂时失败，请重试"
                    record.progress_message = record.error_message
                    record.finished_at = datetime.datetime.now()
                    record.update_time = record.finished_at
                    session.commit()
            finally:
                session.close()
        finally:
            with self._threads_lock:
                self._threads.pop(record_id, None)

    def cancel(self, record_id: str) -> bool:
        if not self._configured:
            return False
        return self.runtime.cancel(record_id)

    def retry(self, record_id: str, chapter: Dict[str, str]) -> None:
        self.submit(record_id, chapter)


def artifact_items(records: Iterable[AITop5Result]) -> List[Dict[str, Any]]:
    return [artifact_dict(record) for record in records]


def artifact_dict(record: AITop5Result) -> Dict[str, Any]:
    data = record.user_revision or record.qa_data or {}
    return {
        "id": record.id,
        "book_id": record.book_id,
        "book_version": record.book_version,
        "chapter_href": record.chapter_href,
        "chapter_title": record.chapter_title,
        "status": record.status,
        "progress_message": record.progress_message,
        "items": data.get("items", []),
        "schema_version": record.schema_version,
        "prompt_version": record.prompt_version,
        "runtime": record.runtime_name,
        "usage": record.usage or {},
        "error": {"code": record.error_code, "message": record.error_message} if record.error_code else None,
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }
