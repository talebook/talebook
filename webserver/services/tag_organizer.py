"""Validated suggestions for preview-gated tag organization tasks."""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import re
import threading
import unicodedata
from typing import Any, Dict, Iterable, List, Optional, Sequence

from webserver.models import TagOrganizationTask
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
FEATURE_KEY = "tag_organizer"
SCHEMA_VERSION = "tag_organizer.v1"
PROMPT_VERSION = "tag_organizer.zh.v1"
MAX_TAG_LENGTH = 100
MAX_REASON_LENGTH = 300
CONTROL_RE = re.compile(r"[\x00-\x1f\x7f]")
SPACE_RE = re.compile(r"\s+")
ALLOWED_ACTIONS = {"merge", "rename", "keep", "remove"}


TAG_ORGANIZER_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "maxItems": 200,
            "items": {
                "type": "object",
                "properties": {
                    "source": {"type": "string"},
                    "action": {"type": "string", "enum": sorted(ALLOWED_ACTIONS)},
                    "target": {"type": "string"},
                    "reason": {"type": "string"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
                "required": ["source", "action", "target", "reason", "confidence"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["suggestions"],
    "additionalProperties": False,
}


class TagOrganizerValidationError(ValueError):
    pass


def normalize_tag(value: Any) -> str:
    if not isinstance(value, str):
        raise TagOrganizerValidationError("标签必须是文本")
    value = unicodedata.normalize("NFKC", CONTROL_RE.sub("", value))
    value = SPACE_RE.sub(" ", value).strip()
    if not value or len(value) > MAX_TAG_LENGTH:
        raise TagOrganizerValidationError("标签为空或过长")
    return value


def tag_key(value: str) -> str:
    return normalize_tag(value).casefold()


def tag_version(tags: Sequence[str]) -> str:
    normalized = sorted({normalize_tag(tag) for tag in tags}, key=lambda value: (value.casefold(), value))
    raw = json.dumps(normalized, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def suggestion_id(source: str, action: str, target: str) -> str:
    raw = f"{source}\0{action}\0{target}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:20]


def _suggestion(source: str, action: str, target: str, reason: str, confidence: float, origin: str) -> Dict[str, Any]:
    return {
        "id": suggestion_id(source, action, target),
        "source": source,
        "action": action,
        "target": target,
        "reason": reason[:MAX_REASON_LENGTH],
        "confidence": round(float(confidence), 3),
        "selected": float(confidence) >= 0.8 and action != "keep",
        "origin": origin,
    }


def deterministic_suggestions(tags: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Find whitespace/full-width/case-equivalent groups deterministically."""

    by_name = {str(item["name"]): item for item in tags}
    suggestions: List[Dict[str, Any]] = []
    occupied_sources = set()

    groups: Dict[str, List[str]] = {}
    for name in by_name:
        groups.setdefault(tag_key(name), []).append(name)
    for names in groups.values():
        if len(names) < 2:
            continue
        target = sorted(
            names,
            key=lambda name: (-int(by_name[name].get("count", 0)), len(normalize_tag(name)), normalize_tag(name), name),
        )[0]
        target = normalize_tag(target)
        for source in sorted(names):
            if source == target:
                continue
            suggestions.append(_suggestion(source, "merge", target, "大小写、全半角或空白归一后等价", 0.99, "rule"))
            occupied_sources.add(source)

    for source in sorted(by_name):
        target = normalize_tag(source)
        if source in occupied_sources or source == target:
            continue
        suggestions.append(_suggestion(source, "rename", target, "规范全半角和多余空白", 0.99, "rule"))

    return suggestions


def _clean_reason(value: Any) -> str:
    if not isinstance(value, str):
        raise TagOrganizerValidationError("建议理由必须是文本")
    value = SPACE_RE.sub(" ", CONTROL_RE.sub("", value)).strip()
    if not value or len(value) > MAX_REASON_LENGTH:
        raise TagOrganizerValidationError("建议理由为空或过长")
    return value


def validate_runtime_suggestions(payload: Any, available_tags: Sequence[str]) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict) or set(payload) != {"suggestions"}:
        raise TagOrganizerValidationError("结果根对象不符合 tag_organizer.v1")
    items = payload.get("suggestions")
    if not isinstance(items, list) or len(items) > 200:
        raise TagOrganizerValidationError("建议列表无效")
    available = set(available_tags)
    checked = []
    sources = set()
    for item in items:
        if not isinstance(item, dict) or set(item) != {"source", "action", "target", "reason", "confidence"}:
            raise TagOrganizerValidationError("建议结构无效")
        source = item.get("source")
        action = item.get("action")
        if source not in available or source in sources or action not in ALLOWED_ACTIONS:
            raise TagOrganizerValidationError("建议来源或动作无效")
        sources.add(source)
        target = str(item.get("target") or "").strip()
        if action in {"merge", "rename"}:
            target = normalize_tag(target)
            if tag_key(source) == tag_key(target):
                raise TagOrganizerValidationError("语义建议不得重复确定性格式建议")
        elif target:
            raise TagOrganizerValidationError("保留或移除动作不得包含目标标签")
        confidence = item.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            raise TagOrganizerValidationError("建议置信度无效")
        checked.append(_suggestion(source, action, target, _clean_reason(item.get("reason")), confidence, "agent"))
    return checked


def merge_suggestions(rule_items: Sequence[Dict[str, Any]], agent_items: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    result = list(rule_items)
    occupied = {item["source"] for item in result}
    for item in agent_items:
        if item["source"] not in occupied:
            result.append(item)
            occupied.add(item["source"])
    return result


def build_prompt(tags: Sequence[Dict[str, Any]], rule_items: Sequence[Dict[str, Any]]) -> str:
    rule_sources = {item["source"] for item in rule_items}
    safe_tags = [
        {"name": item["name"], "count": int(item.get("count", 0))} for item in tags if item["name"] not in rule_sources
    ]
    instructions = {
        "role": "你是私人电子书库的标签编辑。只判断标签名称之间的语义关系，不访问书籍正文。",
        "objective": "找出高价值的近义合并、明确错别字重命名、应保留的歧义词和极低价值标签移除建议。",
        "rules": [
            "只使用 tags 中的 name 和 count，不补充书籍内容或外部知识。",
            "同一来源最多一条建议；不处理确定性规则已覆盖的大小写、全半角或空白差异。",
            "merge/rename 必须给出明确 target；keep/remove 的 target 必须为空字符串。",
            "低使用率本身不是删除理由；可能有独立语义时选择 keep。",
            "不确定或语义可能丢失时降低 confidence；低置信建议默认不会被用户界面选中。",
            "只输出符合 output schema 的 JSON，禁止 Markdown、解释文本或额外字段。",
        ],
        "tags": safe_tags,
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(instructions, ensure_ascii=False, separators=(",", ":"))


def request_key(creator_id: int, scope: Dict[str, Any], books: Sequence[Dict[str, Any]]) -> str:
    baseline = [{"id": book["id"], "version": book["version"]} for book in books]
    raw = json.dumps(
        [FEATURE_KEY, creator_id, scope, baseline, SCHEMA_VERSION, PROMPT_VERSION],
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def apply_adjustments(suggestions: Sequence[Dict[str, Any]], adjustments: Dict[str, Any]) -> List[Dict[str, Any]]:
    by_id = adjustments.get("by_id", {}) if isinstance(adjustments, dict) else {}
    result = []
    for base in suggestions:
        item = dict(base)
        edit = by_id.get(base["id"], {}) if isinstance(by_id, dict) else {}
        if isinstance(edit, dict):
            if "selected" in edit:
                item["selected"] = bool(edit["selected"])
            if item["action"] in {"merge", "rename"} and "target" in edit:
                item["target"] = normalize_tag(edit["target"])
            excluded = edit.get("excluded_book_ids", [])
            if not isinstance(excluded, list) or any(
                isinstance(value, bool) or not isinstance(value, int) for value in excluded
            ):
                raise TagOrganizerValidationError("排除书籍列表无效")
            item["excluded_book_ids"] = sorted(set(excluded))
        else:
            item["excluded_book_ids"] = []
        result.append(item)
    return result


def changed_tags(tags: Sequence[str], suggestions: Sequence[Dict[str, Any]], book_id: int) -> List[str]:
    current = list(tags)
    for item in suggestions:
        if not item.get("selected") or book_id in item.get("excluded_book_ids", []):
            continue
        source = item["source"]
        if source not in current:
            continue
        if item["action"] in {"merge", "rename"}:
            current = [item["target"] if tag == source else tag for tag in current]
        elif item["action"] == "remove":
            current = [tag for tag in current if tag != source]
    deduplicated = []
    seen = set()
    for value in current:
        value = normalize_tag(value)
        key = tag_key(value)
        if key not in seen:
            deduplicated.append(value)
            seen.add(key)
    return deduplicated


def task_dict(record: TagOrganizationTask, include_books: bool = False) -> Dict[str, Any]:
    scope = dict(record.scope_data or {})
    books = scope.pop("books", [])
    data = {
        "id": record.id,
        "feature": FEATURE_KEY,
        "status": record.status,
        "scope": scope,
        "suggestions": apply_adjustments((record.suggestions or {}).get("items", []), record.adjustments or {}),
        "preview": record.preview_data or {},
        "result": record.result_data or {},
        "metrics": record.metrics or {},
        "schema_version": record.schema_version,
        "prompt_version": record.prompt_version,
        "runtime": record.runtime_name,
        "usage": record.usage or {},
        "error": {"code": record.error_code, "message": record.error_message} if record.error_code else None,
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }
    if include_books:
        data["books"] = [{"id": book["id"], "title": book.get("title", ""), "tags": book.get("tags", [])} for book in books]
    return data


class TagOrganizerService:
    _instance: Optional["TagOrganizerService"] = None
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

    def submit(self, record_id: str) -> None:
        if not self._configured:
            raise RuntimeError("TagOrganizerService is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(target=self._run, args=(record_id,), name=f"tag-organizer-{record_id[:8]}", daemon=True)
            self._threads[record_id] = thread
            thread.start()

    def _event(self, record_id: str, event: RuntimeEvent) -> None:
        session = self.session_maker()
        try:
            record = session.get(TagOrganizationTask, record_id)
            if not record:
                return
            if event.session_id:
                record.runtime_session_id = event.session_id[:128]
            if event.usage:
                record.usage = event.usage
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

    def _run(self, record_id: str) -> None:
        session = self.session_maker()
        try:
            record = session.get(TagOrganizationTask, record_id)
            if not record or record.status not in {"analyzing", "failed"}:
                return
            tags = list((record.scope_data or {}).get("tags", []))
            rule_items = deterministic_suggestions(tags)
            record.status = "analyzing"
            record.runtime_name = self.runtime.name
            record.error_code = ""
            record.error_message = ""
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

        try:
            result = self.runtime.generate(
                RuntimeRequest(
                    task_id=record_id,
                    prompt=build_prompt(tags, rule_items),
                    output_schema=TAG_ORGANIZER_OUTPUT_SCHEMA,
                    model=self.config.get("AI_CODEX_MODEL", "") or None,
                ),
                lambda event: self._event(record_id, event),
            )
            agent_items = validate_runtime_suggestions(result.output, [item["name"] for item in tags])
            items = merge_suggestions(rule_items, agent_items)
            session = self.session_maker()
            try:
                record = session.get(TagOrganizationTask, record_id)
                if not record:
                    return
                record.status = "ready"
                record.suggestions = {"items": items}
                record.runtime_session_id = (result.session_id or "")[:128]
                record.usage = result.usage or {}
                record.metrics = {"suggested": len(items), "rule": len(rule_items), "agent": len(agent_items)}
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except (AgentRuntimeError, TagOrganizerValidationError) as exc:
            self._fail(record_id, getattr(getattr(exc, "code", None), "value", "result.invalid"), str(exc))
        except Exception:
            LOG.exception("Tag organizer task failed record_id=%s", record_id)
            self._fail(record_id, "runtime.internal", "AI 标签分析暂时失败，请重试")
        finally:
            with self._threads_lock:
                self._threads.pop(record_id, None)

    def _fail(self, record_id: str, code: str, message: str) -> None:
        session = self.session_maker()
        try:
            record = session.get(TagOrganizationTask, record_id)
            if record:
                record.status = "failed"
                record.suggestions = {}
                record.error_code = code[:128]
                record.error_message = message[:500]
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
        finally:
            session.close()


def task_items(records: Iterable[TagOrganizationTask]) -> List[Dict[str, Any]]:
    return [task_dict(record) for record in records]
