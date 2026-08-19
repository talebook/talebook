"""Business validation and persistence orchestration for Summary Duck TOP5."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import logging
import re
import threading
from typing import Any, Dict, List, Optional

from webserver import loader
from webserver.models import AITask
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
SCHEMA_VERSION = "summary_duck.v1"
PROMPT_VERSION = "summary_duck.zh.v2"
FEATURE_KEY = "summary_duck"
MAX_CHAPTER_CHARACTERS = 20_000
MAX_QUESTION_CHARACTERS = 300
MAX_ANSWER_CHARACTERS = 4_000
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


SUMMARY_DUCK_OUTPUT_SCHEMA: Dict[str, Any] = {
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


class SummaryDuckValidationError(ValueError):
    pass


def clean_markdown(value: Any, limit: int) -> str:
    if not isinstance(value, str):
        raise SummaryDuckValidationError("问答内容必须是文本")
    normalized = CONTROL_RE.sub("", value).replace("\r\n", "\n").replace("\r", "\n").strip()
    # Normalize already escaped input before escaping again, making edits idempotent.
    normalized = html.escape(html.unescape(normalized), quote=False)
    if not normalized or len(normalized) > limit:
        raise SummaryDuckValidationError("问答内容为空或过长")
    return normalized


def _normalize_quote(value: str) -> str:
    return " ".join(html.unescape(value).split())


def validate_summary_duck(payload: Any, chapter_text: str, chapter_href: str) -> Dict[str, List[Dict[str, Any]]]:
    if not isinstance(payload, dict) or set(payload) != {"items"}:
        raise SummaryDuckValidationError("结果根对象不符合 summary_duck.v1")
    items = payload.get("items")
    if not isinstance(items, list) or len(items) != 5:
        raise SummaryDuckValidationError("结果必须恰好包含五组问答")
    checked: List[Dict[str, Any]] = []
    for index, item in enumerate(items):
        if not isinstance(item, dict) or set(item) != {"question", "answer", "citations"}:
            raise SummaryDuckValidationError(f"第 {index + 1} 组问答结构无效")
        question = clean_markdown(item["question"], MAX_QUESTION_CHARACTERS)
        answer = clean_markdown(item["answer"], MAX_ANSWER_CHARACTERS)
        citations = item.get("citations")
        if not isinstance(citations, list) or not citations:
            raise SummaryDuckValidationError(f"第 {index + 1} 个答案缺少原文引用")
        checked_citations = []
        for citation in citations:
            if not isinstance(citation, dict) or set(citation) != {"href", "start", "end", "quote"}:
                raise SummaryDuckValidationError("引用 locator 结构无效")
            start, end = citation.get("start"), citation.get("end")
            if citation.get("href") != chapter_href or not isinstance(start, int) or not isinstance(end, int):
                raise SummaryDuckValidationError("引用不属于当前章节")
            if start < 0 or end <= start or end > len(chapter_text):
                raise SummaryDuckValidationError("引用 locator 越界")
            quote = str(citation.get("quote", "")).strip()
            if not quote or _normalize_quote(quote) != _normalize_quote(chapter_text[start:end]):
                raise SummaryDuckValidationError("引用文本与 locator 不匹配")
            checked_citations.append({"href": chapter_href, "start": start, "end": end, "quote": quote})
        checked.append({"question": question, "answer": answer, "citations": checked_citations})
    return {"items": checked}


def validate_chapter_input(chapter_text: Any, chapter_href: Any, chapter_title: Any = "") -> Dict[str, str]:
    if not isinstance(chapter_text, str):
        raise SummaryDuckValidationError("当前章节正文缺失")
    chapter_text = CONTROL_RE.sub("", chapter_text).replace("\r\n", "\n").replace("\r", "\n")
    if len(chapter_text.strip()) < 80:
        raise SummaryDuckValidationError("当前章节正文过短")
    if len(chapter_text) > MAX_CHAPTER_CHARACTERS:
        chapter_text = chapter_text[:MAX_CHAPTER_CHARACTERS]
    if not isinstance(chapter_href, str) or not chapter_href.strip() or len(chapter_href) > 1024:
        raise SummaryDuckValidationError("当前章节 locator 无效")
    title = str(chapter_title or "").strip()[:512]
    return {"text": chapter_text, "href": chapter_href.strip(), "title": title}


def build_prompt(chapter: Dict[str, str]) -> str:
    instructions = {
        "role": "你是严肃阅读场景中的资深编辑和苏格拉底式阅读教练。你的任务不是压缩段落，而是帮助读者重建本章的论证或叙事结构。",
        "objective": "从当前章节中选出最值得读者记住、追问和复核的五个问题，并给出可由原文逐字核验的答案。",
        "source_boundary": [
            "只能使用 chapter.text；不得补充外部知识、常识推断、作者背景或章节之外的信息。",
            "忽略目录、推广、二维码、赞赏、上一篇/下一篇、图片占位和其他与正文论证无关的页面噪声。",
            "如果某个分析维度在原文中没有充分证据，改选另一个有证据的问题，不得臆测。",
        ],
        "selection_framework": [
            "优先覆盖中心判断：本章最重要、最值得关注的主张、冲突或转折是什么，为什么重要。",
            "覆盖关键机制：作者如何解释因果链、人物动机、系统关系或事件推进。",
            "覆盖决定性证据：哪些事实、数据、例子、细节或原话最能支持中心判断。",
            "覆盖边界与张力：原文明确呈现的风险、限制、反例、代价、矛盾或不确定性是什么。",
            "覆盖后续含义：原文支持的影响、选择、启示、伏笔或尚待回答的问题是什么。",
            "五题必须彼此区分并共同覆盖章节；不要把同一结论换词重复，也不要机械照搬小标题。",
            "非虚构章节按主张—机制—证据—风险—含义组织；叙事章节按冲突—动机—关键细节—主题张力—后果/伏笔组织。",
        ],
        "question_rules": [
            "问题应让未读原文的人也能理解，使用具体对象和关系，避免‘本章讲了什么’之类空泛问法。",
            "每题只问一个核心问题，优先使用为什么、如何、什么证据、什么限制、意味着什么。",
            "问题保持简洁，必要的核心短语可用 **...** 或 __...__ 强调，不要输出编号。",
        ],
        "answer_rules": [
            "先用一句话直接回答，再用原文中的逻辑或事实展开；通常为 2—5 句，信息密度优先于篇幅。",
            "区分原文事实、作者判断与推论，不把观点伪装成事实，不夸大确定性。",
            "每个答案只强调 1—3 个真正关键的短语；不得整段加粗，不得使用标题、列表或引用块替代答案。",
            "答案中的每个关键事实都必须被 citations 中至少一处原文覆盖；证据不足时收窄答案。",
        ],
        "citation_rules": [
            "每个答案提供 1—3 条最小充分引用，优先选择直接支持结论的连续原文，不要引用整段无关上下文。",
            "href 必须逐字复制 chapter.href。start/end 是 chapter.text 的 Python/Unicode 字符下标，end 为开区间。",
            "quote 必须逐字等于 chapter.text[start:end]，包括标点和空白；提交前逐条自行核对，不得改写引用。",
        ],
        "format_rules": [
            "只输出符合 output schema 的 JSON 对象，恰好五组 items，顺序按阅读价值从高到低。",
            "只允许纯文本及 **...** / __...__ 强调；不得输出 HTML、链接、图片、style、script 或代码围栏。",
            "使用章节主要语言作答；术语、人名、数字和专有名词保持原文写法。",
        ],
        "quality_check": [
            "五题是否各有独立价值并覆盖章节核心，而非五段摘要。",
            "每个答案是否先给结论、再给依据，且没有超出原文。",
            "每条 quote、start、end、href 是否可机械校验。任一项不满足时先修正再输出。",
        ],
        "chapter": {**chapter, "length": len(chapter["text"])},
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(instructions, ensure_ascii=False, separators=(",", ":"))


def chapter_hash(chapter_text: str) -> str:
    return hashlib.sha256(chapter_text.encode("utf-8")).hexdigest()


def request_key(creator_id: int, book_id: int, book_version: str, chapter_href: str, text_hash: str) -> str:
    raw = f"{FEATURE_KEY}:{creator_id}:{book_id}:{book_version}:{chapter_href}:{text_hash}:{SCHEMA_VERSION}:{PROMPT_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def artifact_payload(record: AITask, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    document = AIArtifactStore(config or loader.get_settings()).read_summary_duck(record)
    return document.get("user_revision") or document.get("ai_draft") or {}


def export_markdown(record: AITask, data: Optional[Dict[str, Any]] = None) -> str:
    data = data if data is not None else artifact_payload(record)
    lines = [f"# 总结鸭 TOP5：{record.chapter_title or record.chapter_href}", ""]
    for number, item in enumerate(data.get("items", []), 1):
        lines.extend([f"## {number}. {item.get('question', '')}", "", item.get("answer", ""), "", "原文引用："])
        for citation in item.get("citations", []):
            lines.append(f"> {citation.get('quote', '')}")
            lines.append(f"> `{citation.get('href', '')}:{citation.get('start', 0)}-{citation.get('end', 0)}`")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


class SummaryDuckService:
    _instance: Optional["SummaryDuckService"] = None
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
        self.artifacts = AIArtifactStore(config)
        if runtime is not None:
            self.runtime = runtime
        elif not self._configured:
            self.runtime = CodexAppServerRuntime(config)
        self._configured = True

    def submit(self, record_id: str, chapter: Dict[str, str]) -> None:
        if not self._configured:
            raise RuntimeError("SummaryDuckService is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, dict(chapter)),
                name=f"summary-duck-{record_id[:8]}",
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
                    output_schema=SUMMARY_DUCK_OUTPUT_SCHEMA,
                    model=self.config.get("AI_CODEX_MODEL", "") or None,
                ),
                lambda event: self._update_event(record_id, event),
            )
            checked = validate_summary_duck(result.output, chapter["text"], chapter["href"])
            session = self.session_maker()
            artifact_written = False
            try:
                record = session.get(AITask, record_id)
                if not record:
                    return
                finished_at = datetime.datetime.now()
                if record.cancel_requested:
                    record.status = "cancelled"
                else:
                    self.artifacts.write_summary_duck(
                        record,
                        checked,
                        checked,
                        status="succeeded",
                        updated_at=finished_at,
                    )
                    artifact_written = True
                    record.status = "succeeded"
                    record.result_data = {}
                    record.ai_draft = {}
                    record.user_revision = {}
                    record.usage = result.usage or {}
                    record.runtime_session_id = (result.session_id or "")[:128]
                    record.progress_message = "生成完成"
                record.finished_at = finished_at
                record.update_time = record.finished_at
                session.commit()
            except Exception:
                if artifact_written:
                    try:
                        self.artifacts.delete_summary_duck(record)
                    except AIArtifactError as cleanup_error:
                        LOG.error(
                            "Summary Duck artifact rollback failed record_id=%s code=%s",
                            record_id,
                            cleanup_error.code,
                        )
                raise
            finally:
                session.close()
        except (AgentRuntimeError, SummaryDuckValidationError, AIArtifactError) as exc:
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if not record:
                    return
                cancelled = isinstance(exc, AgentRuntimeError) and exc.code.value == "runtime.cancelled"
                record.status = "cancelled" if cancelled or record.cancel_requested else "failed"
                code = getattr(exc, "code", None)
                record.error_code = getattr(code, "value", code) or "result.invalid"
                record.error_message = str(getattr(exc, "safe_message", "AI 返回结果未通过校验"))[:500]
                record.progress_message = record.error_message
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except Exception:
            LOG.exception("Summary Duck task failed record_id=%s", record_id)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
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


def task_dict(record: AITask, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    data: Dict[str, Any] = {}
    artifact_error = None
    if record.status == "succeeded":
        try:
            data = artifact_payload(record, config)
        except AIArtifactError as exc:
            artifact_error = {"code": exc.code, "message": exc.safe_message}
    return {
        "id": record.id,
        "feature": record.feature,
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
        "error": artifact_error
        or ({"code": record.error_code, "message": record.error_message} if record.error_code else None),
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }
