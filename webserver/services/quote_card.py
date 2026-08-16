"""Grounded quote-card validation and AgentRuntime recommendation orchestration."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import logging
import os
import re
import threading
import zipfile
from typing import Any, Dict, List, Optional
from urllib.parse import unquote, urlsplit

from lxml import html as lxml_html

from webserver.models import AITask, QuoteCard
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
FEATURE_KEY = "quote_card"
SCHEMA_VERSION = "quote_card.v1"
PROMPT_VERSION = "quote_card.zh.v1"
MAX_CHAPTER_CHARACTERS = 20_000
MAX_QUOTE_CHARACTERS = 600
MAX_EXPLANATION_CHARACTERS = 1_500
MAX_NOTE_CHARACTERS = 4_000
MAX_TOPICS = 8
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


QUOTE_CARD_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "items": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": {
                "type": "object",
                "properties": {
                    "quote": {"type": "string"},
                    "why_important": {"type": "string"},
                    "topics": {"type": "array", "maxItems": MAX_TOPICS, "items": {"type": "string"}},
                    "locator": {
                        "type": "object",
                        "properties": {
                            "href": {"type": "string"},
                            "start": {"type": "integer", "minimum": 0},
                            "end": {"type": "integer", "minimum": 1},
                        },
                        "required": ["href", "start", "end"],
                        "additionalProperties": False,
                    },
                },
                "required": ["quote", "why_important", "topics", "locator"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["items"],
    "additionalProperties": False,
}


class QuoteCardValidationError(ValueError):
    pass


def clean_text(value: Any, limit: int, required: bool = False) -> str:
    if value is None and not required:
        return ""
    if not isinstance(value, str):
        raise QuoteCardValidationError("卡片内容必须是文本")
    normalized = CONTROL_RE.sub("", value).replace("\r\n", "\n").replace("\r", "\n").strip()
    normalized = html.escape(html.unescape(normalized), quote=False)
    if required and not normalized:
        raise QuoteCardValidationError("卡片内容不能为空")
    if len(normalized) > limit:
        raise QuoteCardValidationError("卡片内容过长")
    return normalized


def clean_topics(value: Any) -> List[str]:
    if value in (None, ""):
        return []
    if isinstance(value, str):
        value = [part.strip() for part in value.split(",")]
    if not isinstance(value, list) or len(value) > MAX_TOPICS:
        raise QuoteCardValidationError("主题标签最多八个")
    topics = []
    for item in value:
        topic = clean_text(item, 40)
        if topic and topic not in topics:
            topics.append(topic)
    return topics


def normalize_quote(value: str) -> str:
    return " ".join(html.unescape(str(value or "")).split())


def validate_chapter_input(chapter_text: Any, chapter_href: Any, chapter_title: Any = "") -> Dict[str, str]:
    if not isinstance(chapter_text, str):
        raise QuoteCardValidationError("当前章节正文缺失")
    text = CONTROL_RE.sub("", chapter_text).replace("\r\n", "\n").replace("\r", "\n")
    if len(text.strip()) < 80:
        raise QuoteCardValidationError("当前章节正文过短")
    if len(text) > MAX_CHAPTER_CHARACTERS:
        text = text[:MAX_CHAPTER_CHARACTERS]
    if not isinstance(chapter_href, str) or not chapter_href.strip() or len(chapter_href) > 1024:
        raise QuoteCardValidationError("当前章节 locator 无效")
    return {"text": text, "href": chapter_href.strip(), "title": str(chapter_title or "").strip()[:512]}


def load_epub_chapter(epub_path: str, chapter_href: Any, chapter_title: Any = "") -> Dict[str, str]:
    """Resolve and extract a chapter from the server-owned EPUB, never client prose."""
    if not isinstance(chapter_href, str) or not chapter_href.strip() or len(chapter_href) > 1024:
        raise QuoteCardValidationError("当前章节 locator 无效")
    if not epub_path or not os.path.isfile(epub_path) or not zipfile.is_zipfile(epub_path):
        raise QuoteCardValidationError("EPUB 原文不可校验")
    requested = chapter_href.strip()
    path = unquote(urlsplit(requested).path).replace("\\", "/").lstrip("/")
    if not path or ".." in path.split("/"):
        raise QuoteCardValidationError("当前章节 locator 无效")
    with zipfile.ZipFile(epub_path) as archive:
        names = [name for name in archive.namelist() if not name.endswith("/")]
        exact = [name for name in names if name == path or path.endswith("/" + name) or name.endswith("/" + path)]
        if not exact:
            basename = path.rsplit("/", 1)[-1]
            exact = [name for name in names if name.rsplit("/", 1)[-1] == basename]
        if len(exact) != 1 or not exact[0].lower().endswith((".xhtml", ".html", ".htm")):
            raise QuoteCardValidationError("无法在 EPUB 中唯一定位当前章节")
        raw = archive.read(exact[0])
    if len(raw) > 2_000_000:
        raise QuoteCardValidationError("当前章节正文过大")
    try:
        markup = raw.decode("utf-8-sig")
        root = lxml_html.fromstring(markup)
        for unsafe in root.xpath("//script|//style|//noscript"):
            unsafe.drop_tree()
        bodies = root.xpath("//body")
        container = bodies[0] if bodies else root
        text = "".join(container.itertext())
    except (TypeError, ValueError, UnicodeDecodeError, lxml_html.ParserError) as exc:
        raise QuoteCardValidationError("EPUB 章节解析失败") from exc
    text = CONTROL_RE.sub("", text).replace("\r\n", "\n").replace("\r", "\n")
    if len(text.strip()) < 80:
        raise QuoteCardValidationError("当前章节正文过短")
    if len(text) > MAX_CHAPTER_CHARACTERS:
        text = text[:MAX_CHAPTER_CHARACTERS]
    return {
        "text": text,
        "href": requested,
        "canonical_href": exact[0],
        "title": str(chapter_title or "").strip()[:512],
    }


def validate_locator_quote(chapter: Dict[str, str], quote: Any, locator: Any) -> Dict[str, Any]:
    if not isinstance(locator, dict) or set(locator) != {"href", "start", "end"}:
        raise QuoteCardValidationError("原文 locator 结构无效")
    start, end = locator.get("start"), locator.get("end")
    if locator.get("href") != chapter["href"] or not isinstance(start, int) or not isinstance(end, int):
        raise QuoteCardValidationError("原文 locator 不属于当前章节")
    if start < 0 or end <= start or end > len(chapter["text"]):
        raise QuoteCardValidationError("原文 locator 越界")
    checked_quote = clean_text(quote, MAX_QUOTE_CHARACTERS, required=True)
    source = chapter["text"][start:end]
    if normalize_quote(checked_quote) != normalize_quote(source):
        raise QuoteCardValidationError("原句与 locator 对应原文不匹配")
    return {"quote": checked_quote, "locator": {"href": chapter["href"], "start": start, "end": end}}


def validate_recommendations(payload: Any, chapter: Dict[str, str]) -> Dict[str, List[Dict[str, Any]]]:
    if not isinstance(payload, dict) or set(payload) != {"items"} or not isinstance(payload.get("items"), list):
        raise QuoteCardValidationError("结果根对象不符合 quote_card.v1")
    if not 1 <= len(payload["items"]) <= 5:
        raise QuoteCardValidationError("推荐结果必须包含一至五条候选")
    checked: List[Dict[str, Any]] = []
    seen = set()
    for item in payload["items"]:
        try:
            if not isinstance(item, dict) or set(item) != {"quote", "why_important", "topics", "locator"}:
                raise QuoteCardValidationError("候选结构无效")
            grounded = validate_locator_quote(chapter, item.get("quote"), item.get("locator"))
            source_key = (grounded["locator"]["start"], grounded["locator"]["end"], normalize_quote(grounded["quote"]))
            if source_key in seen:
                continue
            seen.add(source_key)
            checked.append(
                {
                    "quote": grounded["quote"],
                    "why_important": clean_text(item.get("why_important"), MAX_EXPLANATION_CHARACTERS, required=True),
                    "topics": clean_topics(item.get("topics")),
                    "locator": grounded["locator"],
                }
            )
        except QuoteCardValidationError:
            # One malformed candidate must never be presented as a successful result.
            continue
    if not checked:
        raise QuoteCardValidationError("推荐结果没有可核验的原句")
    return {"items": checked[:5]}


def build_prompt(chapter: Dict[str, str]) -> str:
    prompt = {
        "role": "你是严肃阅读场景中的摘录编辑，只能从给定 EPUB 当前章节逐字选择值得长期复习的原句。",
        "objective": "推荐一至五条信息密度高、可独立理解且值得回看的原句，并解释为什么重要。",
        "rules": [
            "只能使用 chapter.text，不得使用外部知识或改写作者原句。",
            "quote 必须逐字等于 chapter.text[start:end]，href 必须逐字复制 chapter.href，end 为开区间。",
            "优先选择中心判断、关键机制、决定性证据、边界条件或能概括主题张力的句子。",
            "候选彼此不得重复；不要选择目录、广告、导航、版权或孤立残句。",
            "why_important 是明确标注的 AI 解释，不得冒充作者观点；topics 使用短标签。",
            "只输出符合 output schema 的 JSON，不输出 HTML、Markdown、链接或代码围栏。",
        ],
        "quality_check": [
            "逐条核对 quote、start、end 与 href。",
            "无法定位或无法逐字匹配的候选必须删除，最多保留五条。",
        ],
        "chapter": {**chapter, "length": len(chapter["text"])},
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(prompt, ensure_ascii=False, separators=(",", ":"))


def chapter_hash(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def request_key(creator_id: int, book_id: int, book_version: str, chapter_href: str, text_hash: str) -> str:
    raw = f"{FEATURE_KEY}:{creator_id}:{book_id}:{book_version}:{chapter_href}:{text_hash}:{SCHEMA_VERSION}:{PROMPT_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def source_hash(chapter_href: str, locator: Dict[str, Any], quote: str) -> str:
    raw = f"{chapter_href}:{locator['start']}:{locator['end']}:{normalize_quote(quote)}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def card_dict(card: QuoteCard, source_valid: Optional[bool] = None) -> Dict[str, Any]:
    return {
        "id": card.id,
        "book_id": card.book_id,
        "book_title": card.book_title or "",
        "chapter_href": card.chapter_href,
        "chapter_title": card.chapter_title or "",
        "quote_type": card.quote_type,
        "verbatim_quote": card.verbatim_quote,
        "quote_text": card.quote_text,
        "locator": card.locator or {},
        "source_valid": card.source_valid if source_valid is None else bool(source_valid),
        "why_important": card.explanation or "",
        "topics": (card.topics or {}).get("items", []),
        "note": card.note or "",
        "schema_version": card.schema_version,
        "prompt_version": card.prompt_version,
        "created_at": card.create_time.isoformat() if card.create_time else None,
        "updated_at": card.update_time.isoformat() if card.update_time else None,
    }


def export_markdown(cards: List[QuoteCard], book_title: str) -> str:
    lines = [f"# 金句卡片：{clean_text(book_title, 512) or '未命名书籍'}", ""]
    total = 0
    for index, card in enumerate(cards, 1):
        quote = (card.quote_text or "")[:MAX_QUOTE_CHARACTERS]
        block = [
            f"## {index}. {'逐字引用' if card.quote_type == 'verbatim' else '摘录改写/笔记'}",
            "",
            f"> {quote.replace(chr(10), chr(10) + '> ')}",
            "",
        ]
        if card.explanation:
            block.extend(["**为什么重要（AI 解释，可编辑）**", "", card.explanation, ""])
        if (card.topics or {}).get("items"):
            block.extend(["**主题**：" + "、".join((card.topics or {}).get("items", [])), ""])
        if card.note:
            block.extend(["**我的笔记**", "", card.note, ""])
        locator = card.locator or {}
        block.extend(
            [
                f"来源：{card.book_title or book_title} · {card.chapter_title or card.chapter_href}",
                f"Locator：`{locator.get('href', '')}:{locator.get('start', 0)}-{locator.get('end', 0)}`",
                f"创建时间：{card.create_time.isoformat() if card.create_time else ''}",
                "",
            ]
        )
        rendered = "\n".join(block)
        if total + len(rendered) > 40_000:
            lines.extend(["_其余卡片因导出长度限制未包含。_", ""])
            break
        lines.extend(block)
        total += len(rendered)
    return "\n".join(lines).rstrip() + "\n"


class QuoteCardService:
    _instance: Optional["QuoteCardService"] = None
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
            raise RuntimeError("QuoteCardService is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, dict(chapter)),
                name=f"quote-card-{record_id[:8]}",
                daemon=True,
            )
            self._threads[record_id] = thread
            thread.start()

    def _update_event(self, record_id: str, event: RuntimeEvent) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
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
            record = session.get(AITask, record_id)
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
                    output_schema=QUOTE_CARD_OUTPUT_SCHEMA,
                    model=self.config.get("AI_CODEX_MODEL", "") or None,
                ),
                lambda event: self._update_event(record_id, event),
            )
            checked = validate_recommendations(result.output, chapter)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if not record:
                    return
                if record.cancel_requested:
                    record.status = "cancelled"
                else:
                    record.status = "succeeded"
                    record.result_data = checked
                    record.ai_draft = checked
                    record.user_revision = checked
                    record.usage = result.usage or {}
                    record.runtime_session_id = (result.session_id or "")[:128]
                    record.progress_message = "推荐完成"
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except (AgentRuntimeError, QuoteCardValidationError) as exc:
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
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
            LOG.exception("Quote Card recommendation failed record_id=%s", record_id)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if record:
                    record.status = "failed"
                    record.error_code = "runtime.internal"
                    record.error_message = "AI 推荐暂时失败，仍可手动保存选文"
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
