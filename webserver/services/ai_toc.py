"""EPUB TOC diagnosis, AI suggestion validation, and atomic apply/undo."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import logging
import os
import posixpath
import re
import shutil
import tempfile
import threading
import uuid
import zipfile
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import unquote, urlsplit
from xml.etree import ElementTree as ET

from webserver.models import AITask
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
FEATURE_KEY = "toc_organizer"
SCHEMA_VERSION = "toc_organizer.v1"
PROMPT_VERSION = "toc_organizer.zh.v1"
MAX_NODES = 300
MAX_CONTEXT_CHARACTERS = 20_000
MAX_LABEL_CHARACTERS = 300
NOISE_RE = re.compile(r"(?:广告|推广|公众号|二维码|赞赏|打赏|下载|关注我们|上一章|下一章)", re.I)
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_BOOK_LOCKS: Dict[str, threading.RLock] = {}
_BOOK_LOCKS_GUARD = threading.Lock()


class TocValidationError(ValueError):
    pass


class TocWriteError(RuntimeError):
    pass


TOC_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "nodes": {
            "type": "array",
            "minItems": 1,
            "maxItems": MAX_NODES,
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "parent_id": {"type": ["string", "null"]},
                    "order": {"type": "integer", "minimum": 0},
                    "label": {"type": "string"},
                    "href": {"type": "string"},
                    "reason": {"type": "string"},
                    "evidence": {"type": "array", "minItems": 1, "items": {"type": "string"}},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "risk": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": [
                    "id",
                    "parent_id",
                    "order",
                    "label",
                    "href",
                    "reason",
                    "evidence",
                    "confidence",
                    "risk",
                ],
                "additionalProperties": False,
            },
        },
        "changes": {
            "type": "array",
            "maxItems": MAX_NODES * 2,
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "operation": {
                        "type": "string",
                        "enum": ["add", "remove", "rename", "move", "relevel", "fix_anchor"],
                    },
                    "node_id": {"type": "string"},
                    "before": {"type": ["string", "null"]},
                    "after": {"type": ["string", "null"]},
                    "reason": {"type": "string"},
                    "evidence": {"type": "array", "minItems": 1, "items": {"type": "string"}},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                    "risk": {"type": "string", "enum": ["low", "medium", "high"]},
                },
                "required": [
                    "id",
                    "operation",
                    "node_id",
                    "before",
                    "after",
                    "reason",
                    "evidence",
                    "confidence",
                    "risk",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": ["nodes", "changes"],
    "additionalProperties": False,
}


def file_version(path: str) -> str:
    stat = os.stat(path)
    value = f"epub:{stat.st_size}:{stat.st_mtime_ns}"
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _text(element: Optional[ET.Element]) -> str:
    if element is None:
        return ""
    return " ".join("".join(element.itertext()).split())


def _clean_text(value: Any, limit: int, field: str) -> str:
    if not isinstance(value, str):
        raise TocValidationError(f"{field}必须是文本")
    value = CONTROL_RE.sub("", html.unescape(value)).strip()
    if not value or len(value) > limit:
        raise TocValidationError(f"{field}为空或过长")
    return value


def _safe_archive_path(base: str, href: str) -> Tuple[str, str]:
    parsed = urlsplit(str(href or ""))
    if parsed.scheme or parsed.netloc or parsed.path.startswith("/"):
        raise TocValidationError("目录包含外部或绝对链接")
    decoded = unquote(parsed.path)
    target = posixpath.normpath(posixpath.join(base, decoded))
    if target == ".." or target.startswith("../"):
        raise TocValidationError("目录链接越出 EPUB 根目录")
    return target.lstrip("./"), unquote(parsed.fragment)


def _relative_href(from_path: str, target: str) -> str:
    parsed = urlsplit(target)
    target_path = parsed.path
    relative = posixpath.relpath(target_path, posixpath.dirname(from_path) or ".")
    return relative + (f"#{parsed.fragment}" if parsed.fragment else "")


def _parse_xml(data: bytes, label: str) -> ET.Element:
    try:
        return ET.fromstring(data)
    except (ET.ParseError, UnicodeError) as exc:
        raise TocValidationError(f"{label} XML 无法解析") from exc


def _find_opf(archive: zipfile.ZipFile) -> str:
    try:
        container = _parse_xml(archive.read("META-INF/container.xml"), "container")
    except KeyError as exc:
        raise TocValidationError("EPUB 缺少 META-INF/container.xml") from exc
    for element in container.iter():
        if _local_name(element.tag) == "rootfile" and element.get("full-path"):
            path = posixpath.normpath(element.get("full-path", ""))
            if path in archive.namelist():
                return path
    raise TocValidationError("EPUB container 未指向有效 OPF")


def _manifest_and_spine(archive: zipfile.ZipFile, opf_path: str) -> Tuple[ET.Element, Dict[str, Dict[str, str]], List[str]]:
    root = _parse_xml(archive.read(opf_path), "OPF")
    opf_dir = posixpath.dirname(opf_path)
    manifest: Dict[str, Dict[str, str]] = {}
    for element in root.iter():
        if _local_name(element.tag) != "item" or not element.get("id") or not element.get("href"):
            continue
        target, _fragment = _safe_archive_path(opf_dir, element.get("href", ""))
        manifest[element.get("id", "")] = {
            "path": target,
            "href": element.get("href", ""),
            "media_type": element.get("media-type", ""),
            "properties": element.get("properties", ""),
        }
    spine_ids = []
    for element in root.iter():
        if _local_name(element.tag) == "itemref" and element.get("idref"):
            spine_ids.append(element.get("idref", ""))
    spine = [manifest[item_id]["path"] for item_id in spine_ids if item_id in manifest]
    return root, manifest, spine


def _document_ids(archive: zipfile.ZipFile, path: str) -> Set[str]:
    try:
        root = _parse_xml(archive.read(path), path)
    except (KeyError, TocValidationError):
        return set()
    return {value for element in root.iter() for value in [element.get("id")] if value}


def _nav_nodes(root: ET.Element, nav_path: str, opf_dir: str) -> List[Dict[str, Any]]:
    nav = None
    for element in root.iter():
        if _local_name(element.tag) != "nav":
            continue
        nav_type = element.get("{http://www.idpf.org/2007/ops}type", element.get("epub:type", ""))
        if nav is None or "toc" in nav_type.split():
            nav = element
        if "toc" in nav_type.split():
            break
    if nav is None:
        return []
    top_ol = next((child for child in nav if _local_name(child.tag) == "ol"), None)
    nodes: List[Dict[str, Any]] = []

    def visit(ol: ET.Element, parent_id: Optional[str], depth: int) -> None:
        for child in ol:
            if _local_name(child.tag) != "li":
                continue
            link = next((value for value in child if _local_name(value.tag) in {"a", "span"}), None)
            node_id = f"source-{len(nodes) + 1}"
            href = link.get("href", "") if link is not None else ""
            normalized_href = ""
            if href:
                try:
                    target, fragment = _safe_archive_path(posixpath.dirname(nav_path), href)
                    normalized_href = target + (f"#{fragment}" if fragment else "")
                except TocValidationError:
                    normalized_href = href
            nodes.append(
                {
                    "id": node_id,
                    "parent_id": parent_id,
                    "order": len(nodes),
                    "depth": depth,
                    "label": _text(link),
                    "href": normalized_href,
                }
            )
            nested = next((value for value in child if _local_name(value.tag) == "ol"), None)
            if nested is not None:
                visit(nested, node_id, depth + 1)

    if top_ol is not None:
        visit(top_ol, None, 0)
    return nodes


def _ncx_nodes(root: ET.Element, ncx_path: str) -> List[Dict[str, Any]]:
    nav_map = next((element for element in root.iter() if _local_name(element.tag) == "navMap"), None)
    nodes: List[Dict[str, Any]] = []

    def visit(parent: ET.Element, parent_id: Optional[str], depth: int) -> None:
        for point in parent:
            if _local_name(point.tag) != "navPoint":
                continue
            node_id = f"source-{len(nodes) + 1}"
            label_element = next((value for value in point.iter() if _local_name(value.tag) == "navLabel"), None)
            content = next((value for value in point if _local_name(value.tag) == "content"), None)
            href = content.get("src", "") if content is not None else ""
            normalized_href = ""
            if href:
                try:
                    target, fragment = _safe_archive_path(posixpath.dirname(ncx_path), href)
                    normalized_href = target + (f"#{fragment}" if fragment else "")
                except TocValidationError:
                    normalized_href = href
            nodes.append(
                {
                    "id": node_id,
                    "parent_id": parent_id,
                    "order": len(nodes),
                    "depth": depth,
                    "label": _text(label_element),
                    "href": normalized_href,
                }
            )
            visit(point, node_id, depth + 1)

    if nav_map is not None:
        visit(nav_map, None, 0)
    return nodes


def _headings_and_context(archive: zipfile.ZipFile, spine: List[str]) -> Tuple[List[Dict[str, Any]], str]:
    headings: List[Dict[str, Any]] = []
    context_parts: List[str] = []
    remaining = MAX_CONTEXT_CHARACTERS
    for spine_index, path in enumerate(spine):
        try:
            root = _parse_xml(archive.read(path), path)
        except (KeyError, TocValidationError):
            continue
        candidates = []
        for element in root.iter():
            name = _local_name(element.tag).lower()
            if name in {"h1", "h2", "h3", "title"}:
                label = _text(element)
                if label:
                    candidates.append((name, label, element.get("id", "")))
        if not candidates:
            label = posixpath.basename(path)
            candidates.append(("file", label, ""))
        for name, label, anchor in candidates[:8]:
            href = path + (f"#{anchor}" if anchor else "")
            headings.append({"href": href, "label": label[:MAX_LABEL_CHARACTERS], "level": name, "spine_index": spine_index})
        if remaining > 0:
            body = next((element for element in root.iter() if _local_name(element.tag).lower() == "body"), root)
            excerpt = " ".join(_text(body).split())[: min(600, remaining)]
            if excerpt:
                part = f"[{path}] {excerpt}"
                context_parts.append(part)
                remaining -= len(part)
    return headings[:MAX_NODES], "\n".join(context_parts)


def _anchor_catalog(archive: zipfile.ZipFile, manifest: Dict[str, Dict[str, str]], excluded: Iterable[str] = ()) -> Set[str]:
    catalog: Set[str] = set()
    names = set(archive.namelist())
    excluded_paths = set(excluded)
    for item in manifest.values():
        path = item["path"]
        if path not in names or path in excluded_paths:
            continue
        if item["media_type"] not in {"application/xhtml+xml", "text/html"}:
            continue
        catalog.add(path)
        catalog.update(f"{path}#{anchor}" for anchor in _document_ids(archive, path))
    return catalog


def _diagnostics(nodes: List[Dict[str, Any]], anchors: Set[str], spine: List[str]) -> List[Dict[str, Any]]:
    findings: List[Dict[str, Any]] = []

    def add(code: str, severity: str, message: str, node_ids: Iterable[str] = ()) -> None:
        findings.append({"code": code, "severity": severity, "message": message, "node_ids": list(node_ids)})

    if not nodes:
        add("toc.missing", "high", "EPUB 没有可用目录")
        return findings
    seen: Dict[Tuple[str, str], str] = {}
    spine_index = {path: index for index, path in enumerate(spine)}
    previous_index = -1
    for node in nodes:
        label = str(node.get("label", "")).strip()
        href = str(node.get("href", ""))
        if not label:
            add("toc.empty_title", "high", "目录项标题为空", [node["id"]])
        if label and NOISE_RE.search(label):
            add("toc.suspected_noise", "medium", f"“{label}”疑似推广或导航噪声", [node["id"]])
        key = (" ".join(label.lower().split()), href)
        if key in seen:
            add("toc.duplicate", "medium", f"目录项“{label or href}”重复", [seen[key], node["id"]])
        else:
            seen[key] = node["id"]
        if not href or href not in anchors:
            add("toc.invalid_anchor", "high", f"“{label or node['id']}”指向无效锚点", [node["id"]])
        path = href.split("#", 1)[0]
        index = spine_index.get(path)
        if index is not None:
            if index < previous_index:
                add("toc.order_anomaly", "medium", f"“{label or href}”在书脊顺序中倒退", [node["id"]])
            previous_index = max(previous_index, index)
        if int(node.get("depth", 0)) > 8:
            add("toc.depth_anomaly", "medium", f"“{label or href}”目录层级过深", [node["id"]])
    return findings


def analyze_epub(path: str) -> Dict[str, Any]:
    try:
        with zipfile.ZipFile(path, "r") as archive:
            if archive.testzip() is not None:
                raise TocValidationError("EPUB ZIP 完整性校验失败")
            opf_path = _find_opf(archive)
            _opf_root, manifest, spine = _manifest_and_spine(archive, opf_path)
            nav_item = next((item for item in manifest.values() if "nav" in item["properties"].split()), None)
            ncx_item = next((item for item in manifest.values() if item["media_type"] == "application/x-dtbncx+xml"), None)
            nodes: List[Dict[str, Any]] = []
            toc_path = ""
            toc_kind = "missing"
            if nav_item and nav_item["path"] in archive.namelist():
                toc_path = nav_item["path"]
                toc_kind = "nav"
                nodes = _nav_nodes(
                    _parse_xml(archive.read(toc_path), "EPUB navigation"), toc_path, posixpath.dirname(opf_path)
                )
            elif ncx_item and ncx_item["path"] in archive.namelist():
                toc_path = ncx_item["path"]
                toc_kind = "ncx"
                nodes = _ncx_nodes(_parse_xml(archive.read(toc_path), "NCX"), toc_path)
            excluded_toc = [item["path"] for item in [nav_item, ncx_item] if item]
            anchors = _anchor_catalog(archive, manifest, excluded_toc)
            headings, context = _headings_and_context(archive, spine)
            diagnostics = _diagnostics(nodes, anchors, spine)
    except (OSError, zipfile.BadZipFile) as exc:
        raise TocValidationError("EPUB 文件损坏或无法读取") from exc
    source = {
        "opf_path": opf_path,
        "toc_path": toc_path,
        "toc_kind": toc_kind,
        "spine": spine,
        "original_nodes": nodes,
        "heading_candidates": headings,
        "diagnostics": diagnostics,
        "anchor_catalog": sorted(anchors),
        "context": context,
        "writable": bool(spine and anchors and (not nav_item or nav_item["path"] not in spine)),
    }
    source["analysis_hash"] = hashlib.sha256(
        json.dumps(source, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    return source


def build_prompt(analysis: Dict[str, Any]) -> str:
    payload = {
        "role": "你是 EPUB 结构编辑。只整理目录，不改写正文或书籍元数据。",
        "objective": "根据机械诊断、原目录、书脊顺序、章节标题与有限正文证据生成可解释的建议目录树和逐项 diff。",
        "rules": [
            "nodes 是按阅读顺序排列的扁平树；parent_id 必须为空或引用另一节点，且不得成环。",
            "href 只能逐字选自 anchor_catalog；不得构造未验证的路径或锚点。",
            "优先保留用户已有目录，只在证据明确时删除、重命名、移动或修复锚点。",
            "疑似广告可以建议删除，但风险至少 medium；章节拆并不在范围内。",
            "每个节点和变更都给出具体理由、证据、置信度和风险。",
            "只输出符合 schema 的 JSON，不输出 Markdown 或额外文字。",
        ],
        "source": {
            "toc_kind": analysis["toc_kind"],
            "spine": analysis["spine"],
            "original_nodes": analysis["original_nodes"],
            "heading_candidates": analysis["heading_candidates"],
            "diagnostics": analysis["diagnostics"],
            "anchor_catalog": analysis["anchor_catalog"],
            "limited_body_context": analysis["context"],
        },
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def _validate_tree(nodes: Any, anchors: Set[str], editable: bool = False) -> List[Dict[str, Any]]:
    if not isinstance(nodes, list) or not 1 <= len(nodes) <= MAX_NODES:
        raise TocValidationError("建议目录节点数量无效")
    checked: List[Dict[str, Any]] = []
    ids: Set[str] = set()
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise TocValidationError("建议目录节点结构无效")
        node_id = str(node.get("id", "")).strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}", node_id) or node_id in ids:
            raise TocValidationError("建议目录节点 ID 无效或重复")
        ids.add(node_id)
        parent_id = node.get("parent_id")
        if parent_id is not None:
            parent_id = str(parent_id).strip() or None
        href = _clean_text(node.get("href"), 1024, "目录锚点")
        if href not in anchors:
            raise TocValidationError(f"目录锚点未通过校验：{href}")
        evidence = node.get("evidence", [])
        if not isinstance(evidence, list) or not evidence:
            raise TocValidationError("目录节点缺少证据")
        evidence = [_clean_text(value, 1000, "证据") for value in evidence[:10]]
        confidence = node.get("confidence")
        if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= confidence <= 1:
            raise TocValidationError("目录节点置信度无效")
        risk = node.get("risk")
        if risk not in {"low", "medium", "high"}:
            raise TocValidationError("目录节点风险无效")
        checked.append(
            {
                "id": node_id,
                "parent_id": parent_id,
                "order": index,
                "label": _clean_text(node.get("label"), MAX_LABEL_CHARACTERS, "目录标题"),
                "href": href,
                "reason": _clean_text(node.get("reason"), 1000, "建议理由"),
                "evidence": evidence,
                "confidence": float(confidence),
                "risk": risk,
                "selected": bool(node.get("selected", True)) if editable else True,
            }
        )
    by_id = {node["id"]: node for node in checked}
    for node in checked:
        if node["parent_id"] and node["parent_id"] not in by_id:
            raise TocValidationError("目录父节点不存在")
        seen = {node["id"]}
        parent_id = node["parent_id"]
        while parent_id:
            if parent_id in seen:
                raise TocValidationError("目录层级存在循环")
            seen.add(parent_id)
            parent_id = by_id[parent_id]["parent_id"]
    if editable:
        selected = {node["id"] for node in checked if node["selected"]}
        for node in checked:
            if node["selected"] and node["parent_id"] and node["parent_id"] not in selected:
                raise TocValidationError("已选择节点的父节点也必须选择")
    return checked


def validate_suggestion(payload: Any, analysis: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(payload, dict) or set(payload) != {"nodes", "changes"}:
        raise TocValidationError("结果根对象不符合 toc_organizer.v1")
    nodes = _validate_tree(payload.get("nodes"), set(analysis["anchor_catalog"]))
    changes = payload.get("changes")
    if not isinstance(changes, list) or len(changes) > MAX_NODES * 2:
        raise TocValidationError("目录变更列表无效")
    known_nodes = {node["id"] for node in nodes} | {node["id"] for node in analysis["original_nodes"]}
    checked_changes = []
    change_ids = set()
    for change in changes:
        if not isinstance(change, dict):
            raise TocValidationError("目录变更结构无效")
        change_id = str(change.get("id", "")).strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}", change_id) or change_id in change_ids:
            raise TocValidationError("目录变更 ID 无效或重复")
        change_ids.add(change_id)
        operation = change.get("operation")
        if operation not in {"add", "remove", "rename", "move", "relevel", "fix_anchor"}:
            raise TocValidationError("目录变更类型无效")
        node_id = str(change.get("node_id", "")).strip()
        if node_id not in known_nodes:
            raise TocValidationError("目录变更引用未知节点")
        evidence = change.get("evidence", [])
        if not isinstance(evidence, list) or not evidence:
            raise TocValidationError("目录变更缺少证据")
        confidence = change.get("confidence")
        risk = change.get("risk")
        if not isinstance(confidence, (int, float)) or isinstance(confidence, bool) or not 0 <= confidence <= 1:
            raise TocValidationError("目录变更置信度无效")
        if risk not in {"low", "medium", "high"}:
            raise TocValidationError("目录变更风险无效")
        checked_changes.append(
            {
                "id": change_id,
                "operation": operation,
                "node_id": node_id,
                "before": None if change.get("before") is None else str(change.get("before"))[:1000],
                "after": None if change.get("after") is None else str(change.get("after"))[:1000],
                "reason": _clean_text(change.get("reason"), 1000, "变更理由"),
                "evidence": [_clean_text(value, 1000, "证据") for value in evidence[:10]],
                "confidence": float(confidence),
                "risk": risk,
                "selected": True,
            }
        )
    return {"nodes": nodes, "changes": checked_changes}


def validate_revision(payload: Any, record: AITask) -> Dict[str, Any]:
    if not isinstance(payload, dict) or not isinstance(payload.get("nodes"), list):
        raise TocValidationError("目录修订结构无效")
    draft = record.ai_draft or {}
    nodes = _validate_tree(payload["nodes"], set(draft.get("anchor_catalog", [])), editable=True)
    change_selection = payload.get("change_selection", {})
    if not isinstance(change_selection, dict):
        raise TocValidationError("变更选择结构无效")
    changes = []
    for change in draft.get("changes", []):
        copied = dict(change)
        copied["selected"] = bool(change_selection.get(change["id"], change.get("selected", True)))
        changes.append(copied)
    revision = dict(draft)
    revision["nodes"] = nodes
    revision["changes"] = changes
    return revision


def _selected_nodes(record: AITask) -> List[Dict[str, Any]]:
    data = record.user_revision or record.result_data or {}
    nodes = [dict(node) for node in data.get("nodes", []) if node.get("selected", True)]
    selected_ids = {node["id"] for node in nodes}
    for node in nodes:
        if node.get("parent_id") not in selected_ids:
            node["parent_id"] = None
    return nodes


def _render_nav(nodes: List[Dict[str, Any]], nav_path: str) -> bytes:
    xhtml_ns = "http://www.w3.org/1999/xhtml"
    epub_ns = "http://www.idpf.org/2007/ops"
    ET.register_namespace("", xhtml_ns)
    ET.register_namespace("epub", epub_ns)
    root = ET.Element(f"{{{xhtml_ns}}}html", {"lang": "zh-CN"})
    head = ET.SubElement(root, f"{{{xhtml_ns}}}head")
    ET.SubElement(head, f"{{{xhtml_ns}}}title").text = "目录"
    body = ET.SubElement(root, f"{{{xhtml_ns}}}body")
    nav = ET.SubElement(body, f"{{{xhtml_ns}}}nav", {f"{{{epub_ns}}}type": "toc", "id": "toc"})
    ET.SubElement(nav, f"{{{xhtml_ns}}}h1").text = "目录"
    top = ET.SubElement(nav, f"{{{xhtml_ns}}}ol")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    for node in nodes:
        by_parent.setdefault(node.get("parent_id"), []).append(node)

    def append(parent: ET.Element, parent_id: Optional[str]) -> None:
        for node in by_parent.get(parent_id, []):
            li = ET.SubElement(parent, f"{{{xhtml_ns}}}li")
            link = ET.SubElement(li, f"{{{xhtml_ns}}}a", {"href": _relative_href(nav_path, node["href"])})
            link.text = node["label"]
            if by_parent.get(node["id"]):
                nested = ET.SubElement(li, f"{{{xhtml_ns}}}ol")
                append(nested, node["id"])

    append(top, None)
    return b'<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(root, encoding="utf-8")


def _render_ncx(nodes: List[Dict[str, Any]], ncx_path: str) -> bytes:
    ns = "http://www.daisy.org/z3986/2005/ncx/"
    ET.register_namespace("", ns)
    root = ET.Element(f"{{{ns}}}ncx", {"version": "2005-1"})
    head = ET.SubElement(root, f"{{{ns}}}head")
    ET.SubElement(head, f"{{{ns}}}meta", {"name": "dtb:uid", "content": str(uuid.uuid4())})
    title = ET.SubElement(root, f"{{{ns}}}docTitle")
    ET.SubElement(title, f"{{{ns}}}text").text = "目录"
    nav_map = ET.SubElement(root, f"{{{ns}}}navMap")
    by_parent: Dict[Optional[str], List[Dict[str, Any]]] = {}
    for node in nodes:
        by_parent.setdefault(node.get("parent_id"), []).append(node)
    play_order = 0

    def append(parent: ET.Element, parent_id: Optional[str]) -> None:
        nonlocal play_order
        for node in by_parent.get(parent_id, []):
            play_order += 1
            point = ET.SubElement(parent, f"{{{ns}}}navPoint", {"id": f"nav-{play_order}", "playOrder": str(play_order)})
            label = ET.SubElement(point, f"{{{ns}}}navLabel")
            ET.SubElement(label, f"{{{ns}}}text").text = node["label"]
            ET.SubElement(point, f"{{{ns}}}content", {"src": _relative_href(ncx_path, node["href"])})
            append(point, node["id"])

    append(nav_map, None)
    return b'<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(root, encoding="utf-8")


def _add_nav_manifest(opf_data: bytes, opf_path: str, nav_path: str) -> bytes:
    root = _parse_xml(opf_data, "OPF")
    manifest = next((element for element in root.iter() if _local_name(element.tag) == "manifest"), None)
    if manifest is None:
        raise TocWriteError("OPF 缺少 manifest，无法安全写入")
    namespace = root.tag.split("}", 1)[0].lstrip("{") if "}" in root.tag else ""
    tag = f"{{{namespace}}}item" if namespace else "item"
    item_id = "talebook-ai-toc"
    used_ids = {element.get("id") for element in manifest if element.get("id")}
    suffix = 1
    while item_id in used_ids:
        suffix += 1
        item_id = f"talebook-ai-toc-{suffix}"
    ET.SubElement(
        manifest,
        tag,
        {
            "id": item_id,
            "href": posixpath.relpath(nav_path, posixpath.dirname(opf_path) or "."),
            "media-type": "application/xhtml+xml",
            "properties": "nav",
        },
    )
    return b'<?xml version="1.0" encoding="utf-8"?>\n' + ET.tostring(root, encoding="utf-8")


def _archive_plan(source_path: str, nodes: List[Dict[str, Any]]) -> Tuple[Dict[str, bytes], Set[str]]:
    with zipfile.ZipFile(source_path, "r") as archive:
        opf_path = _find_opf(archive)
        _root, manifest, _spine = _manifest_and_spine(archive, opf_path)
        nav_item = next((item for item in manifest.values() if "nav" in item["properties"].split()), None)
        ncx_item = next((item for item in manifest.values() if item["media_type"] == "application/x-dtbncx+xml"), None)
        replacements: Dict[str, bytes] = {}
        excluded: Set[str] = set()
        if nav_item:
            nav_path = nav_item["path"]
            if nav_path in _spine:
                raise TocWriteError("目录文档同时承载正文，无法保证正文不变")
            replacements[nav_path] = _render_nav(nodes, nav_path)
            excluded.add(nav_path)
        if ncx_item:
            ncx_path = ncx_item["path"]
            replacements[ncx_path] = _render_ncx(nodes, ncx_path)
            excluded.add(ncx_path)
        if not nav_item:
            nav_path = posixpath.join(posixpath.dirname(opf_path), "talebook-toc.xhtml")
            replacements[nav_path] = _render_nav(nodes, nav_path)
            replacements[opf_path] = _add_nav_manifest(archive.read(opf_path), opf_path, nav_path)
            excluded.add(nav_path)
        return replacements, excluded


def _content_hashes(path: str, excluded: Set[str]) -> Dict[str, str]:
    hashes = {}
    with zipfile.ZipFile(path, "r") as archive:
        opf_path = _find_opf(archive)
        _root, manifest, _spine = _manifest_and_spine(archive, opf_path)
        for item in manifest.values():
            if item["media_type"] not in {"application/xhtml+xml", "text/html"} or item["path"] in excluded:
                continue
            if item["path"] in archive.namelist():
                hashes[item["path"]] = hashlib.sha256(archive.read(item["path"])).hexdigest()
    return hashes


def _validate_written_epub(path: str, nodes: List[Dict[str, Any]], expected_content: Dict[str, str]) -> None:
    try:
        with zipfile.ZipFile(path, "r") as archive:
            if archive.testzip() is not None:
                raise TocWriteError("写入后的 EPUB ZIP 校验失败")
            if archive.read("mimetype") != b"application/epub+zip":
                raise TocWriteError("EPUB mimetype 无效")
            opf_path = _find_opf(archive)
            _root, manifest, _spine = _manifest_and_spine(archive, opf_path)
            toc_paths = [
                item["path"]
                for item in manifest.values()
                if "nav" in item["properties"].split() or item["media_type"] == "application/x-dtbncx+xml"
            ]
            anchors = _anchor_catalog(archive, manifest, toc_paths)
            invalid = [node["href"] for node in nodes if node["href"] not in anchors]
            if invalid:
                raise TocWriteError("写入后的目录包含无效锚点")
        current_content = _content_hashes(path, set())
        for name, digest in expected_content.items():
            if current_content.get(name) != digest:
                raise TocWriteError("EPUB 正文在目录写入过程中发生变化")
    except (OSError, KeyError, zipfile.BadZipFile, TocValidationError) as exc:
        if isinstance(exc, TocWriteError):
            raise
        raise TocWriteError("写入后的 EPUB 完整性校验失败") from exc


def _book_lock(path: str) -> threading.RLock:
    key = os.path.realpath(path)
    with _BOOK_LOCKS_GUARD:
        return _BOOK_LOCKS.setdefault(key, threading.RLock())


def apply_toc(source_path: str, nodes: List[Dict[str, Any]], snapshot_path: str, expected_version: str) -> Dict[str, str]:
    if not nodes:
        raise TocWriteError("至少选择一个目录节点")
    lock = _book_lock(source_path)
    with lock:
        if file_version(source_path) != expected_version:
            raise TocWriteError("书籍版本已变化，请重新分析")
        replacements, excluded = _archive_plan(source_path, nodes)
        original_content = _content_hashes(source_path, excluded)
        Path(snapshot_path).parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        shutil.copy2(source_path, snapshot_path)
        os.chmod(snapshot_path, 0o600)
        descriptor, temporary_path = tempfile.mkstemp(
            prefix=".talebook-toc-", suffix=".epub", dir=os.path.dirname(os.path.abspath(source_path))
        )
        os.close(descriptor)
        try:
            with zipfile.ZipFile(source_path, "r") as source, zipfile.ZipFile(temporary_path, "w") as target:
                written = set()
                for info in source.infolist():
                    data = replacements.get(info.filename, source.read(info.filename))
                    if info.filename == "mimetype":
                        info.compress_type = zipfile.ZIP_STORED
                    target.writestr(info, data)
                    written.add(info.filename)
                for name, data in replacements.items():
                    if name not in written:
                        target.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)
            _validate_written_epub(temporary_path, nodes, original_content)
            os.chmod(temporary_path, os.stat(source_path).st_mode & 0o777)
            os.replace(temporary_path, source_path)
        except Exception:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)
            if os.path.exists(snapshot_path):
                os.unlink(snapshot_path)
            raise
        return {
            "before_version": expected_version,
            "after_version": file_version(source_path),
            "snapshot_sha256": file_sha256(snapshot_path),
        }


def undo_toc(source_path: str, snapshot_path: str, expected_current_version: str, snapshot_sha256: str) -> str:
    lock = _book_lock(source_path)
    with lock:
        if file_version(source_path) != expected_current_version:
            raise TocWriteError("书籍已再次变化，无法安全撤销")
        if not os.path.isfile(snapshot_path) or file_sha256(snapshot_path) != snapshot_sha256:
            raise TocWriteError("撤销快照不存在或已损坏")
        try:
            with zipfile.ZipFile(snapshot_path, "r") as archive:
                if archive.testzip() is not None:
                    raise TocWriteError("撤销快照完整性校验失败")
                _find_opf(archive)
        except (OSError, zipfile.BadZipFile, TocValidationError) as exc:
            raise TocWriteError("撤销快照完整性校验失败") from exc
        descriptor, temporary_path = tempfile.mkstemp(
            prefix=".talebook-toc-undo-", suffix=".epub", dir=os.path.dirname(os.path.abspath(source_path))
        )
        os.close(descriptor)
        try:
            shutil.copy2(snapshot_path, temporary_path)
            os.replace(temporary_path, source_path)
        finally:
            if os.path.exists(temporary_path):
                os.unlink(temporary_path)
        return file_version(source_path)


def snapshot_path(config: Dict[str, Any], record_id: str) -> str:
    root = config.get("AI_TOC_SNAPSHOT_ROOT") or os.path.join(config.get("AI_TASK_ROOT", "/tmp"), "toc-snapshots")
    return os.path.join(root, f"{record_id}.epub")


def cleanup_task_files(config: Dict[str, Any], record: AITask) -> None:
    path = (record.application_data or {}).get("snapshot_path") if hasattr(record, "application_data") else None
    path = path or snapshot_path(config, record.id)
    try:
        if path and os.path.isfile(path):
            os.unlink(path)
    except OSError:
        LOG.warning("Unable to remove TOC snapshot task_id=%s", record.id, exc_info=True)


class TocOrganizerService:
    _instance: Optional["TocOrganizerService"] = None
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

    def submit(self, record_id: str, analysis: Dict[str, Any]) -> None:
        if not self._configured:
            raise RuntimeError("TocOrganizerService is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, dict(analysis)),
                name=f"toc-organizer-{record_id[:8]}",
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

    def _run(self, record_id: str, analysis: Dict[str, Any]) -> None:
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
                    prompt=build_prompt(analysis),
                    output_schema=TOC_OUTPUT_SCHEMA,
                    model=self.config.get("AI_CODEX_MODEL", "") or None,
                    service_name="talebook_toc_organizer",
                    started_message="正在诊断目录结构",
                    progress_message="正在生成目录建议",
                ),
                lambda event: self._update_event(record_id, event),
            )
            checked = validate_suggestion(result.output, analysis)
            persisted = {
                "diagnostics": analysis["diagnostics"],
                "original_nodes": analysis["original_nodes"],
                "heading_candidates": analysis["heading_candidates"],
                "anchor_catalog": analysis["anchor_catalog"],
                "toc_kind": analysis["toc_kind"],
                "writable": analysis["writable"],
                "nodes": checked["nodes"],
                "changes": checked["changes"],
            }
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if not record:
                    return
                if record.cancel_requested:
                    record.status = "cancelled"
                else:
                    record.status = "succeeded"
                    record.result_data = persisted
                    record.ai_draft = persisted
                    record.user_revision = persisted
                    record.usage = result.usage or {}
                    record.runtime_session_id = (result.session_id or "")[:128]
                    record.progress_message = "目录建议已生成"
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except (AgentRuntimeError, TocValidationError) as exc:
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if record:
                    cancelled = isinstance(exc, AgentRuntimeError) and exc.code.value == "runtime.cancelled"
                    record.status = "cancelled" if cancelled or record.cancel_requested else "failed"
                    record.error_code = getattr(getattr(exc, "code", None), "value", "result.invalid")
                    record.error_message = str(getattr(exc, "safe_message", "AI 返回目录未通过校验"))[:500]
                    record.progress_message = record.error_message
                    record.finished_at = datetime.datetime.now()
                    record.update_time = record.finished_at
                    session.commit()
            finally:
                session.close()
        except Exception:
            LOG.exception("TOC organizer task failed record_id=%s", record_id)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if record:
                    record.status = "failed"
                    record.error_code = "runtime.internal"
                    record.error_message = "目录分析暂时失败，请重试"
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
        return bool(self._configured and self.runtime.cancel(record_id))


def task_dict(record: AITask) -> Dict[str, Any]:
    data = record.user_revision or record.result_data or {}
    application = record.application_data or {}
    return {
        "id": record.id,
        "feature": record.feature,
        "book_id": record.book_id,
        "book_version": record.book_version,
        "status": record.status,
        "progress_message": record.progress_message,
        "schema_version": record.schema_version,
        "prompt_version": record.prompt_version,
        "runtime": record.runtime_name,
        "usage": record.usage or {},
        "error": {"code": record.error_code, "message": record.error_message} if record.error_code else None,
        "diagnostics": data.get("diagnostics", []),
        "original_nodes": data.get("original_nodes", []),
        "nodes": data.get("nodes", []),
        "changes": data.get("changes", []),
        "toc_kind": data.get("toc_kind", ""),
        "writable": bool(data.get("writable", False)),
        "application": {
            "status": application.get("status", "not_applied"),
            "applied_at": application.get("applied_at"),
            "undone_at": application.get("undone_at"),
            "selected_count": application.get("selected_count", 0),
        },
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }


def task_items(records: Iterable[AITask]) -> List[Dict[str, Any]]:
    return [task_dict(record) for record in records]
