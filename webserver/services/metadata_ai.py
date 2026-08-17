"""Validated preview, apply and undo workflow for AI metadata suggestions."""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import posixpath
import re
import threading
import zipfile
from copy import deepcopy
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree

from bs4 import BeautifulSoup

from webserver.models import AITask
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime
from webserver.services.external_index import set_metadata_preserving_external_paths


LOG = logging.getLogger(__name__)
FEATURE_KEY = "metadata"
SCHEMA_VERSION = "metadata.v2"
PROMPT_VERSION = "metadata.zh.v3"
MAX_BATCH_SIZE = 50
HIGH_CONFIDENCE = 0.85
EXCERPT_CHAR_LIMIT = 1000
EXCERPT_MEMBER_BYTE_LIMIT = 128 * 1024
EXCERPT_TOTAL_BYTE_LIMIT = 512 * 1024
FIELD_LIMITS = {
    "title": 500,
    "authors": 20,
    "publisher": 500,
    "pubdate": 32,
    "isbn": 32,
    "language": 32,
    "comments": 10_000,
}
SOURCE_FIELD_LABELS = {
    "title": "书名",
    "authors": "作者",
    "publisher": "出版社",
    "pubdate": "出版时间",
    "isbn": "ISBN",
    "language": "语言",
    "comments": "简介",
}
LIST_FIELDS = {"authors"}
DATE_RE = re.compile(r"^\d{4}(?:-\d{2}(?:-\d{2})?)?$")
ISBN_RE = re.compile(r"^[0-9Xx -]{10,20}$")


METADATA_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "suggestions": {
            "type": "array",
            "maxItems": len(FIELD_LIMITS),
            "items": {
                "type": "object",
                "properties": {
                    "field": {"type": "string", "enum": list(FIELD_LIMITS)},
                    "value": {"type": ["string", "array"]},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "reason": {"type": "string"},
                    "evidence": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "source_id": {"type": "string"},
                                "quote": {"type": "string"},
                            },
                            "required": ["source_id", "quote"],
                            "additionalProperties": False,
                        },
                    },
                },
                "required": ["field", "value", "confidence", "reason", "evidence"],
                "additionalProperties": False,
            },
        }
    },
    "required": ["suggestions"],
    "additionalProperties": False,
}


class MetadataValidationError(ValueError):
    pass


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.date().isoformat() if isinstance(value, datetime.datetime) else value.isoformat()
    if isinstance(value, tuple):
        return list(value)
    return value


def normalize_value(field: str, value: Any) -> Any:
    if field not in FIELD_LIMITS:
        raise MetadataValidationError("建议字段不在允许列表中")
    if field in LIST_FIELDS:
        if not isinstance(value, (list, tuple)):
            raise MetadataValidationError(f"{field} 必须是数组")
        items = []
        for item in value:
            if not isinstance(item, str) or not item.strip() or len(item.strip()) > 200:
                raise MetadataValidationError(f"{field} 包含无效值")
            if item.strip() not in items:
                items.append(item.strip())
        if not items or len(items) > FIELD_LIMITS[field]:
            raise MetadataValidationError(f"{field} 数量无效")
        return items
    if value is None:
        return ""
    value = str(_json_value(value)).strip()
    if not value or len(value) > FIELD_LIMITS[field]:
        raise MetadataValidationError(f"{field} 为空或过长")
    if field == "pubdate" and not DATE_RE.fullmatch(value):
        raise MetadataValidationError("出版日期格式无效")
    if field == "isbn" and not ISBN_RE.fullmatch(value):
        raise MetadataValidationError("ISBN 格式无效")
    return value


def metadata_snapshot(db, book_id: int) -> Dict[str, Any]:
    mi = db.get_metadata(int(book_id), index_is_id=True)
    if not mi:
        raise MetadataValidationError("书籍不存在")
    result = {}
    for field in FIELD_LIMITS:
        value = getattr(mi, field, None)
        if field in LIST_FIELDS:
            value = list(value or [])
        elif value is None:
            value = ""
        else:
            value = _json_value(value)
        result[field] = value
    return result


def metadata_version(snapshot: Dict[str, Any]) -> str:
    payload = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()[:32]


def _normalize_excerpt(value: str, limit: int = EXCERPT_CHAR_LIMIT) -> str:
    return re.sub(r"\s+", " ", value or "").strip()[:limit]


def _visible_html_text(value: bytes) -> str:
    soup = BeautifulSoup(value, "html.parser")
    for element in soup(["script", "style", "noscript", "nav"]):
        element.decompose()
    return " ".join(soup.stripped_strings)


def _zip_member(archive: zipfile.ZipFile, name: str, limit: int) -> bytes:
    with archive.open(name) as stream:
        return stream.read(limit)


def _epub_spine_members(archive: zipfile.ZipFile) -> List[str]:
    container = ElementTree.fromstring(_zip_member(archive, "META-INF/container.xml", 64 * 1024))
    rootfile = next((node for node in container.iter() if node.tag.rsplit("}", 1)[-1] == "rootfile"), None)
    if rootfile is None or not rootfile.attrib.get("full-path"):
        return []
    opf_path = rootfile.attrib["full-path"]
    package = ElementTree.fromstring(_zip_member(archive, opf_path, 256 * 1024))
    manifest = {
        node.attrib.get("id"): node.attrib.get("href")
        for node in package.iter()
        if node.tag.rsplit("}", 1)[-1] == "item" and node.attrib.get("id") and node.attrib.get("href")
    }
    base = posixpath.dirname(opf_path)
    members = []
    for node in package.iter():
        if node.tag.rsplit("}", 1)[-1] != "itemref":
            continue
        href = manifest.get(node.attrib.get("idref"))
        if not href:
            continue
        path = unquote(urlsplit(href).path)
        member = posixpath.normpath(posixpath.join(base, path))
        if member.startswith("../") or member == "..":
            continue
        members.append(member)
    return members


def extract_epub_excerpt(path: str, limit: int = EXCERPT_CHAR_LIMIT) -> str:
    with zipfile.ZipFile(path) as archive:
        try:
            members = _epub_spine_members(archive)
        except (KeyError, ElementTree.ParseError, zipfile.BadZipFile):
            members = []
        if not members:
            members = [
                value.filename for value in archive.infolist() if value.filename.lower().endswith((".xhtml", ".html", ".htm"))
            ]
        parts = []
        bytes_read = 0
        for member in members:
            if bytes_read >= EXCERPT_TOTAL_BYTE_LIMIT:
                break
            try:
                allowed = min(EXCERPT_MEMBER_BYTE_LIMIT, EXCERPT_TOTAL_BYTE_LIMIT - bytes_read)
                raw = _zip_member(archive, member, allowed)
            except KeyError:
                continue
            bytes_read += len(raw)
            text = _visible_html_text(raw)
            if text:
                parts.append(text)
            excerpt = _normalize_excerpt(" ".join(parts), limit)
            if len(excerpt) >= limit:
                return excerpt
        return _normalize_excerpt(" ".join(parts), limit)


def extract_txt_excerpt(path: str, limit: int = EXCERPT_CHAR_LIMIT) -> str:
    with open(path, "rb") as stream:
        raw = stream.read(EXCERPT_MEMBER_BYTE_LIMIT)
    for encoding in ("utf-8-sig", "gb18030"):
        try:
            return _normalize_excerpt(raw.decode(encoding), limit)
        except UnicodeDecodeError:
            continue
    return _normalize_excerpt(raw.decode("utf-8", errors="replace"), limit)


def book_opening_excerpt(db, book_id: int, limit: int = EXCERPT_CHAR_LIMIT) -> str:
    try:
        formats = {str(value).upper() for value in (db.new_api.formats(int(book_id)) or [])}
    except Exception:
        LOG.warning("Unable to list formats for AI metadata excerpt book=%s", book_id)
        return ""
    for format_name, extractor in (("EPUB", extract_epub_excerpt), ("TXT", extract_txt_excerpt)):
        if format_name not in formats:
            continue
        try:
            path = db.format_abspath(int(book_id), format_name, index_is_id=True)
            if path and os.path.isfile(path):
                return extractor(path, limit)
        except Exception as exc:
            LOG.warning("Unable to extract AI metadata excerpt book=%s format=%s: %s", book_id, format_name, exc)
    return ""


def metadata_sources(snapshot: Dict[str, Any], excerpt: str = "") -> List[Dict[str, str]]:
    sources = []
    for field, value in snapshot.items():
        if value not in (None, "", []):
            text = " / ".join(value) if isinstance(value, list) else str(value)
            sources.append(
                {
                    "id": f"library:{field}",
                    "kind": "library_metadata",
                    "label": f"书库现有{SOURCE_FIELD_LABELS[field]}",
                    "value": text[:10_000],
                }
            )
    if excerpt:
        sources.append(
            {
                "id": "book:opening_excerpt",
                "kind": "book_excerpt",
                "label": f"书籍开头 {EXCERPT_CHAR_LIMIT} 字",
                "value": excerpt[:EXCERPT_CHAR_LIMIT],
            }
        )
    return sources


def build_book_input(db, book_id: int) -> Dict[str, Any]:
    snapshot = metadata_snapshot(db, book_id)
    excerpt = book_opening_excerpt(db, book_id)
    return {
        "book_id": int(book_id),
        "version": metadata_version(snapshot),
        "original": snapshot,
        "sources": metadata_sources(snapshot, excerpt),
        "source_digest": hashlib.sha256(excerpt.encode("utf-8")).hexdigest()[:32] if excerpt else "",
    }


def build_prompt(book_input: Dict[str, Any]) -> str:
    prompt = {
        "role": "你是图书馆元数据校对员。只提出可复核的字段候选，不能直接修改数据。",
        "rules": [
            "只使用 sources 中给出的信息，不得使用记忆、外部搜索或未提供的常识。",
            "每个证据 source_id 必须来自 sources；纯格式或规范化推断使用 model_inference，并明确写在 reason 中。",
            "信息不足时省略该字段，绝不猜测。候选必须与 original 不同。",
            "title/publisher/pubdate/isbn/language/comments 为字符串，authors 为非空字符串数组。",
            "pubdate 只允许 YYYY、YYYY-MM 或 YYYY-MM-DD；confidence 是 0 到 1。",
            "只输出符合 schema 的 JSON，不输出解释、Markdown 或额外字段。",
        ],
        "book_id": book_input["book_id"],
        "original": book_input["original"],
        "sources": book_input["sources"],
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(prompt, ensure_ascii=False, separators=(",", ":"))


def validate_metadata_output(payload: Any, book_input: Dict[str, Any]) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict) or set(payload) != {"suggestions"}:
        raise MetadataValidationError("结果根对象不符合 metadata.v2")
    values = payload.get("suggestions")
    if not isinstance(values, list) or len(values) > len(FIELD_LIMITS):
        raise MetadataValidationError("建议列表无效")
    sources_by_id = {item["id"]: item for item in book_input.get("sources", [])}
    known_sources = set(sources_by_id)
    original = book_input["original"]
    checked = []
    seen = set()
    for item in values:
        if not isinstance(item, dict) or set(item) != {"field", "value", "confidence", "reason", "evidence"}:
            raise MetadataValidationError("建议结构无效")
        field = item.get("field")
        if field in seen:
            raise MetadataValidationError("同一字段只能有一个建议")
        seen.add(field)
        value = normalize_value(field, item.get("value"))
        confidence = item.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            raise MetadataValidationError("置信度无效")
        reason = str(item.get("reason") or "").strip()
        if not reason or len(reason) > 1000:
            raise MetadataValidationError("推断说明为空或过长")
        evidence = item.get("evidence")
        if not isinstance(evidence, list) or len(evidence) > 10:
            raise MetadataValidationError("证据列表无效")
        normalized_evidence = []
        has_verifiable_evidence = False
        for proof in evidence:
            if not isinstance(proof, dict) or set(proof) != {"source_id", "quote"}:
                raise MetadataValidationError("证据结构无效")
            source_id = str(proof.get("source_id") or "")
            quote = str(proof.get("quote") or "").strip()
            if source_id != "model_inference" and source_id not in known_sources:
                raise MetadataValidationError("证据来源不存在")
            if len(quote) > 2000:
                raise MetadataValidationError("证据摘录过长")
            if source_id in known_sources and quote:
                source = sources_by_id[source_id]
                if quote not in source["value"]:
                    raise MetadataValidationError("证据摘录与来源不匹配")
                has_verifiable_evidence = True
            source_label = "模型推断" if source_id == "model_inference" else sources_by_id[source_id]["label"]
            normalized_evidence.append({"source_id": source_id, "source_label": source_label, "quote": quote})
        old_value = original.get(field, [] if field in LIST_FIELDS else "")
        if value == old_value:
            continue
        checked.append(
            {
                "field": field,
                "old_value": old_value,
                "value": value,
                "confidence": round(float(confidence), 4),
                "reason": reason,
                "evidence": normalized_evidence,
                "has_evidence": has_verifiable_evidence,
                "conflict": old_value not in (None, "", []),
                "default_selected": has_verifiable_evidence and confidence >= HIGH_CONFIDENCE,
            }
        )
    return checked


def task_request_key(creator_id: int, inputs: Iterable[Dict[str, Any]]) -> str:
    versions = [(item["book_id"], item["version"], item.get("source_digest", "")) for item in inputs]
    raw = json.dumps([FEATURE_KEY, creator_id, versions, SCHEMA_VERSION, PROMPT_VERSION], separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _counts(items: Iterable[Dict[str, Any]]) -> Dict[str, int]:
    values = list(items)
    return {
        "total": len(values),
        "queued": sum(item.get("status") == "queued" for item in values),
        "running": sum(item.get("status") == "running" for item in values),
        "succeeded": sum(item.get("status") == "succeeded" for item in values),
        "failed": sum(item.get("status") == "failed" for item in values),
        "cancelled": sum(item.get("status") == "cancelled" for item in values),
    }


def task_dict(record: AITask, editable: Optional[bool] = None) -> Dict[str, Any]:
    draft = record.ai_draft or {}
    result = record.result_data or {}
    revision = record.user_revision or {}
    items = []
    for value in draft.get("items", []):
        item = {key: deepcopy(data) for key, data in value.items() if key != "sources"}
        items.append(item)
    return {
        "id": record.id,
        "feature": record.feature,
        "status": record.status,
        "progress_message": record.progress_message,
        "items": items,
        "counts": _counts(items),
        "selection": revision.get("items", []),
        "selection_revision": revision.get("selection_revision"),
        "application": result.get("application"),
        "editable": editable,
        "schema_version": record.schema_version,
        "prompt_version": record.prompt_version,
        "runtime": record.runtime_name,
        "usage": record.usage or {},
        "error": {"code": record.error_code, "message": record.error_message} if record.error_code else None,
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }


def prepare_draft(inputs: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "items": [
            {
                "book_id": item["book_id"],
                "version": item["version"],
                "original": item["original"],
                "sources": item["sources"],
                "status": "queued",
                "suggestions": [],
                "error": None,
            }
            for item in inputs
        ]
    }


def inputs_from_record(record: AITask, failed_only: bool = False) -> List[Dict[str, Any]]:
    values = []
    for item in (record.ai_draft or {}).get("items", []):
        if failed_only and item.get("status") not in {"failed", "cancelled"}:
            continue
        values.append(
            {
                "book_id": item["book_id"],
                "version": item["version"],
                "original": deepcopy(item["original"]),
                "sources": deepcopy(item.get("sources", [])),
            }
        )
    return values


def selection_revision(items: List[Dict[str, Any]]) -> str:
    raw = json.dumps(items, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def validate_selection(record: AITask, value: Any) -> Tuple[List[Dict[str, Any]], str]:
    if not isinstance(value, list):
        raise MetadataValidationError("选择项必须是数组")
    draft_items = {item["book_id"]: item for item in (record.ai_draft or {}).get("items", [])}
    checked = []
    seen_books = set()
    for item in value:
        if not isinstance(item, dict) or set(item) != {"book_id", "fields"}:
            raise MetadataValidationError("选择项结构无效")
        try:
            book_id = int(item["book_id"])
        except (TypeError, ValueError):
            raise MetadataValidationError("书籍 ID 无效")
        if book_id in seen_books or book_id not in draft_items:
            raise MetadataValidationError("选择项包含未知或重复书籍")
        seen_books.add(book_id)
        fields = item.get("fields")
        available = {entry["field"] for entry in draft_items[book_id].get("suggestions", [])}
        if not isinstance(fields, list) or any(field not in available for field in fields) or len(set(fields)) != len(fields):
            raise MetadataValidationError("选择项包含未知或重复字段")
        checked.append({"book_id": book_id, "fields": sorted(fields)})
    if not checked or not any(item["fields"] for item in checked):
        raise MetadataValidationError("至少选择一个字段")
    checked.sort(key=lambda item: item["book_id"])
    return checked, selection_revision(checked)


def _can_edit(handler, book_id: int) -> bool:
    return bool(
        handler.current_user
        and handler.current_user.can_edit()
        and (handler.is_admin() or handler.is_book_owner(book_id, handler.user_id()))
    )


def _set_metadata_fields(mi, values: Dict[str, Any]) -> None:
    for field, value in values.items():
        if field == "pubdate":
            if value in (None, ""):
                mi.set(field, None)
                continue
            parsed = None
            for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
                try:
                    parsed = datetime.datetime.strptime(value, fmt)
                    break
                except ValueError:
                    continue
            if parsed is None:
                raise MetadataValidationError("出版日期格式无效")
            mi.set(field, parsed)
        else:
            mi.set(field, value)


def apply_task(handler, record: AITask, body: Dict[str, Any]) -> Dict[str, Any]:
    key = str(body.get("idempotency_key") or "").strip()
    revision_token = str(body.get("selection_revision") or "").strip()
    if not key or len(key) > 128:
        return {"err": "params.invalid", "msg": "确认幂等键无效"}
    revision = record.user_revision or {}
    if not revision_token or revision_token != revision.get("selection_revision"):
        return {"err": "ai.review_changed", "msg": "复核内容已变化，请重新确认"}
    result = deepcopy(record.result_data or {})
    existing = result.get("application") or {}
    if existing.get("state") in {"applied", "partially_applied", "undone", "partially_undone"}:
        if existing.get("idempotency_key") == key:
            return {"err": "ok", "task": task_dict(record, editable=True), "idempotent": True}
        return {"err": "ai.already_applied", "msg": "该任务已经确认写入"}
    if existing.get("state") == "applying" and (
        existing.get("idempotency_key") != key or existing.get("selection_revision") != revision_token
    ):
        return {"err": "ai.apply_in_progress", "msg": "该任务正在使用另一确认请求写入"}

    selected = {item["book_id"]: set(item["fields"]) for item in revision.get("items", [])}
    outcomes = deepcopy(existing.get("items", [])) if existing.get("state") == "applying" else []
    completed_books = {item["book_id"] for item in outcomes if item.get("status") == "applied"}
    draft_items = (record.ai_draft or {}).get("items", [])
    for item in draft_items:
        book_id = item["book_id"]
        fields = selected.get(book_id, set())
        if not fields or book_id in completed_books:
            continue
        outcome = {"book_id": book_id, "status": "failed", "fields": [], "error": None}
        if not _can_edit(handler, book_id):
            outcome["error"] = {"code": "permission", "message": "无权编辑该书籍"}
            outcomes.append(outcome)
            continue
        try:
            current = metadata_snapshot(handler.db, book_id)
            if metadata_version(current) != item["version"]:
                raise MetadataValidationError("书籍元数据已变化，请重新分析")
            suggestions = {entry["field"]: entry for entry in item.get("suggestions", [])}
            values = {field: normalize_value(field, suggestions[field]["value"]) for field in fields}
            mi = handler.db.get_metadata(book_id, index_is_id=True)
            _set_metadata_fields(mi, values)
            set_metadata_preserving_external_paths(handler.db, handler.session, book_id, mi)
            after = metadata_snapshot(handler.db, book_id)
            outcome.update(
                {
                    "status": "applied",
                    "fields": sorted(fields),
                    "before": {field: current[field] for field in fields},
                    "after": {field: after[field] for field in fields},
                    "after_version": metadata_version(after),
                }
            )
        except Exception as exc:
            LOG.warning("AI metadata apply failed task=%s book=%s: %s", record.id, book_id, exc)
            outcome["error"] = {"code": "metadata.conflict", "message": str(exc)[:500]}
        outcomes.append(outcome)
        result["application"] = {
            "state": "applying",
            "idempotency_key": key,
            "selection_revision": revision_token,
            "items": outcomes,
        }
        record.result_data = deepcopy(result)
        record.update_time = datetime.datetime.now()
        handler.session.commit()

    applied = sum(item["status"] == "applied" for item in outcomes)
    state = "applied" if outcomes and applied == len(outcomes) else "partially_applied"
    result["application"] = {
        "state": state,
        "idempotency_key": key,
        "selection_revision": revision_token,
        "items": outcomes,
        "applied_at": datetime.datetime.now().isoformat(),
    }
    record.result_data = result
    record.update_time = datetime.datetime.now()
    handler.session.commit()
    return {"err": "ok", "task": task_dict(record, editable=True), "idempotent": False}


def undo_task(handler, record: AITask) -> Dict[str, Any]:
    result = deepcopy(record.result_data or {})
    application = result.get("application") or {}
    if application.get("state") in {"undone", "partially_undone"}:
        return {"err": "ok", "task": task_dict(record, editable=True), "idempotent": True}
    if application.get("state") not in {"applied", "partially_applied"}:
        return {"err": "ai.not_applied", "msg": "该任务没有可撤销的写入"}
    outcomes = []
    for applied in application.get("items", []):
        if applied.get("status") != "applied":
            continue
        book_id = applied["book_id"]
        outcome = {"book_id": book_id, "status": "failed", "restored_fields": [], "conflicts": []}
        if not _can_edit(handler, book_id):
            outcome["error"] = {"code": "permission", "message": "无权编辑该书籍"}
            outcomes.append(outcome)
            continue
        try:
            current = metadata_snapshot(handler.db, book_id)
            restore = {}
            for field in applied.get("fields", []):
                if current.get(field) == applied.get("after", {}).get(field):
                    restore[field] = applied.get("before", {}).get(field)
                else:
                    outcome["conflicts"].append(field)
            if restore:
                mi = handler.db.get_metadata(book_id, index_is_id=True)
                _set_metadata_fields(mi, restore)
                set_metadata_preserving_external_paths(handler.db, handler.session, book_id, mi)
            outcome["restored_fields"] = sorted(restore)
            outcome["status"] = "undone" if not outcome["conflicts"] else "partially_undone"
        except Exception as exc:
            LOG.warning("AI metadata undo failed task=%s book=%s: %s", record.id, book_id, exc)
            outcome["error"] = {"code": "metadata.undo_failed", "message": str(exc)[:500]}
        outcomes.append(outcome)
    complete = outcomes and all(item["status"] == "undone" for item in outcomes)
    application["state"] = "undone" if complete else "partially_undone"
    application["undo_items"] = outcomes
    application["undone_at"] = datetime.datetime.now().isoformat()
    result["application"] = application
    record.result_data = result
    record.update_time = datetime.datetime.now()
    handler.session.commit()
    return {"err": "ok", "task": task_dict(record, editable=True), "idempotent": False}


class MetadataAIService:
    _instance: Optional["MetadataAIService"] = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._configured = False
                cls._instance._threads = {}
                cls._instance._active_children = {}
                cls._instance._lock = threading.Lock()
        return cls._instance

    def setup(self, session_maker, config: Dict[str, Any], runtime=None) -> None:
        self.session_maker = session_maker
        self.config = config
        if runtime is not None:
            self.runtime = runtime
        elif not self._configured:
            self.runtime = CodexAppServerRuntime(config)
        self._configured = True

    def submit(self, record_id: str, inputs: List[Dict[str, Any]]) -> None:
        if not self._configured:
            raise RuntimeError("MetadataAIService is not configured")
        with self._lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, deepcopy(inputs)),
                name=f"metadata-ai-{record_id[:8]}",
                daemon=True,
            )
            self._threads[record_id] = thread
            thread.start()

    def _save_item(self, record_id: str, book_id: int, **changes) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if not record:
                return
            draft = deepcopy(record.ai_draft or {})
            for item in draft.get("items", []):
                if item.get("book_id") == book_id:
                    item.update(changes)
                    break
            record.ai_draft = draft
            counts = _counts(draft.get("items", []))
            done = counts["succeeded"] + counts["failed"] + counts["cancelled"]
            record.progress_message = f"已分析 {done}/{counts['total']} 本"
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

    def _event(self, record_id: str, book_id: int, event: RuntimeEvent) -> None:
        self._save_item(record_id, book_id, progress_message=event.message[:256])

    def _run(self, record_id: str, inputs: List[Dict[str, Any]]) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if not record:
                return
            if record.cancel_requested:
                draft = deepcopy(record.ai_draft or {})
                target_ids = {item["book_id"] for item in inputs}
                for item in draft.get("items", []):
                    if item.get("book_id") in target_ids and item.get("status") in {"queued", "running"}:
                        item.update({"status": "cancelled", "error": None})
                record.ai_draft = draft
                record.status = "cancelled"
                record.progress_message = "分析已取消"
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
                with self._lock:
                    self._threads.pop(record_id, None)
                    self._active_children.pop(record_id, None)
                return
            record.status = "running"
            record.runtime_name = self.runtime.name
            record.started_at = record.started_at or datetime.datetime.now()
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

        total_usage: Dict[str, Any] = {}
        for book_input in inputs:
            book_id = book_input["book_id"]
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if not record or record.cancel_requested:
                    self._save_item(record_id, book_id, status="cancelled", error=None)
                    continue
            finally:
                session.close()
            child_id = f"{record_id}:{book_id}"
            with self._lock:
                self._active_children[record_id] = child_id
            self._save_item(record_id, book_id, status="running", error=None)
            try:
                result = self.runtime.generate(
                    RuntimeRequest(
                        task_id=child_id,
                        prompt=build_prompt(book_input),
                        output_schema=METADATA_OUTPUT_SCHEMA,
                        model=self.config.get("AI_CODEX_MODEL", "") or None,
                    ),
                    lambda event, bid=book_id: self._event(record_id, bid, event),
                )
                suggestions = validate_metadata_output(result.output, book_input)
                self._save_item(record_id, book_id, status="succeeded", suggestions=suggestions, error=None)
                total_usage[str(book_id)] = result.usage or {}
            except AgentRuntimeError as exc:
                cancelled = exc.code.value == "runtime.cancelled"
                self._save_item(
                    record_id,
                    book_id,
                    status="cancelled" if cancelled else "failed",
                    error={"code": exc.code.value, "message": exc.safe_message},
                )
            except MetadataValidationError as exc:
                self._save_item(
                    record_id,
                    book_id,
                    status="failed",
                    error={"code": "result.invalid", "message": str(exc)[:500]},
                )
            except Exception:
                LOG.exception("AI metadata task failed task=%s book=%s", record_id, book_id)
                self._save_item(
                    record_id,
                    book_id,
                    status="failed",
                    error={"code": "runtime.internal", "message": "AI 分析暂时失败，请重试"},
                )
            finally:
                with self._lock:
                    self._active_children.pop(record_id, None)

        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if record:
                counts = _counts((record.ai_draft or {}).get("items", []))
                record.status = "cancelled" if counts["cancelled"] == counts["total"] else "succeeded"
                record.progress_message = f"分析完成：成功 {counts['succeeded']} 本，失败 {counts['failed']} 本"
                record.usage = total_usage
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
        finally:
            session.close()
            with self._lock:
                self._threads.pop(record_id, None)
                self._active_children.pop(record_id, None)

    def cancel(self, record_id: str) -> bool:
        with self._lock:
            child_id = self._active_children.get(record_id)
        return bool(child_id and self.runtime.cancel(child_id))
