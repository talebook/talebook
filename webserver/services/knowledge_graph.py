"""Grounded, single-book knowledge graph extraction and merging."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import logging
import posixpath
import re
import threading
import unicodedata
import zipfile
from collections import defaultdict
from html.parser import HTMLParser
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple
from urllib.parse import unquote, urlparse
from xml.etree import ElementTree

from webserver.models import AITask
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeEvent, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


LOG = logging.getLogger(__name__)
FEATURE_KEY = "knowledge_graph"
SCHEMA_VERSION = "knowledge_graph.v1"
PROMPT_VERSION = "knowledge_graph.zh.v1"
ENTITY_TYPES = ("person", "place", "organization", "event", "concept", "claim", "evidence")
RELATION_DIRECTIONS = ("forward", "bidirectional")
CONFIDENCE_THRESHOLD = 0.65
MAX_NAME_CHARACTERS = 160
MAX_DESCRIPTION_CHARACTERS = 800
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


KNOWLEDGE_GRAPH_OUTPUT_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "entities": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "name": {"type": "string"},
                    "type": {"type": "string", "enum": list(ENTITY_TYPES)},
                    "aliases": {"type": "array", "items": {"type": "string"}},
                    "description": {"type": "string"},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
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
                "required": ["id", "name", "type", "aliases", "description", "confidence", "citations"],
                "additionalProperties": False,
            },
        },
        "relations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "source_id": {"type": "string"},
                    "target_id": {"type": "string"},
                    "type": {"type": "string"},
                    "description": {"type": "string"},
                    "direction": {"type": "string", "enum": list(RELATION_DIRECTIONS)},
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
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
                "required": [
                    "source_id",
                    "target_id",
                    "type",
                    "description",
                    "direction",
                    "confidence",
                    "citations",
                ],
                "additionalProperties": False,
            },
        },
    },
    "required": ["entities", "relations"],
    "additionalProperties": False,
}


class KnowledgeGraphValidationError(ValueError):
    pass


class _XHTMLTextExtractor(HTMLParser):
    """Mirror the reader's text-node concatenation without exposing markup."""

    SKIPPED = {"script", "style", "noscript", "template"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts: List[str] = []
        self.title_parts: List[str] = []
        self._skip_depth = 0
        self._title_depth = 0
        self._body_depth = 0

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        name = tag.lower()
        if name in self.SKIPPED:
            self._skip_depth += 1
        if name == "body":
            self._body_depth += 1
        if name in {"title", "h1"}:
            self._title_depth += 1

    def handle_endtag(self, tag: str) -> None:
        name = tag.lower()
        if name in self.SKIPPED and self._skip_depth:
            self._skip_depth -= 1
        if name == "body" and self._body_depth:
            self._body_depth -= 1
        if name in {"title", "h1"} and self._title_depth:
            self._title_depth -= 1

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        if self._title_depth and data.strip():
            self.title_parts.append(data.strip())
        if self._body_depth:
            self.parts.append(data)


def _clean_text(value: Any, limit: int, label: str) -> str:
    if not isinstance(value, str):
        raise KnowledgeGraphValidationError(f"{label}必须是文本")
    value = html.unescape(value).replace("\r\n", "\n").replace("\r", "\n")
    value = CONTROL_RE.sub("", value).strip()
    if not value or len(value) > limit:
        raise KnowledgeGraphValidationError(f"{label}为空或过长")
    return value


def _normalize_quote(value: str) -> str:
    return " ".join(html.unescape(value).split())


def _citation(value: Any, chapter: Dict[str, str]) -> Dict[str, Any]:
    if not isinstance(value, dict) or set(value) != {"href", "start", "end", "quote"}:
        raise KnowledgeGraphValidationError("引用 locator 结构无效")
    start, end = value.get("start"), value.get("end")
    if value.get("href") != chapter["href"] or not isinstance(start, int) or not isinstance(end, int):
        raise KnowledgeGraphValidationError("引用不属于当前章节")
    if start < 0 or end <= start or end > len(chapter["text"]):
        raise KnowledgeGraphValidationError("引用 locator 越界")
    quote = str(value.get("quote", "")).strip()
    if not quote or _normalize_quote(quote) != _normalize_quote(chapter["text"][start:end]):
        raise KnowledgeGraphValidationError("引用文本与 locator 不匹配")
    return {"href": chapter["href"], "start": start, "end": end, "quote": quote}


def _citations(values: Any, chapter: Dict[str, str]) -> List[Dict[str, Any]]:
    if not isinstance(values, list) or not values:
        raise KnowledgeGraphValidationError("正式节点和关系必须包含原文引用")
    checked = [_citation(value, chapter) for value in values[:5]]
    return _dedupe_citations(checked)


def _confidence(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)) or value < 0 or value > 1:
        raise KnowledgeGraphValidationError("置信度必须在 0 到 1 之间")
    return round(float(value), 4)


def validate_segment(payload: Any, chapter: Dict[str, str]) -> Dict[str, Any]:
    if not isinstance(payload, dict) or set(payload) != {"entities", "relations"}:
        raise KnowledgeGraphValidationError("结果根对象不符合 knowledge_graph.v1")
    entities = payload.get("entities")
    relations = payload.get("relations")
    if not isinstance(entities, list) or not isinstance(relations, list):
        raise KnowledgeGraphValidationError("实体和关系必须是数组")
    checked_entities = []
    source_ids = set()
    entity_keys = {"id", "name", "type", "aliases", "description", "confidence", "citations"}
    for entity in entities:
        if not isinstance(entity, dict) or set(entity) != entity_keys:
            raise KnowledgeGraphValidationError("实体结构无效")
        source_id = _clean_text(entity["id"], 96, "实体标识")
        if source_id in source_ids:
            raise KnowledgeGraphValidationError("实体标识重复")
        source_ids.add(source_id)
        entity_type = entity.get("type")
        if entity_type not in ENTITY_TYPES:
            raise KnowledgeGraphValidationError("实体类型无效")
        aliases = entity.get("aliases")
        if not isinstance(aliases, list):
            raise KnowledgeGraphValidationError("实体别名必须是数组")
        checked_entities.append(
            {
                "source_id": source_id,
                "name": _clean_text(entity["name"], MAX_NAME_CHARACTERS, "实体名称"),
                "type": entity_type,
                "aliases": sorted({_clean_text(alias, MAX_NAME_CHARACTERS, "实体别名") for alias in aliases[:20]}),
                "description": _clean_text(entity["description"], MAX_DESCRIPTION_CHARACTERS, "实体描述"),
                "confidence": _confidence(entity["confidence"]),
                "citations": _citations(entity["citations"], chapter),
            }
        )
    checked_relations = []
    relation_keys = {"source_id", "target_id", "type", "description", "direction", "confidence", "citations"}
    for relation in relations:
        if not isinstance(relation, dict) or set(relation) != relation_keys:
            raise KnowledgeGraphValidationError("关系结构无效")
        source_id = _clean_text(relation["source_id"], 96, "关系起点")
        target_id = _clean_text(relation["target_id"], 96, "关系终点")
        if source_id not in source_ids or target_id not in source_ids or source_id == target_id:
            raise KnowledgeGraphValidationError("关系端点无效")
        direction = relation.get("direction")
        if direction not in RELATION_DIRECTIONS:
            raise KnowledgeGraphValidationError("关系方向无效")
        checked_relations.append(
            {
                "source_id": source_id,
                "target_id": target_id,
                "type": _clean_text(relation["type"], 96, "关系类型"),
                "description": _clean_text(relation["description"], MAX_DESCRIPTION_CHARACTERS, "关系描述"),
                "direction": direction,
                "confidence": _confidence(relation["confidence"]),
                "citations": _citations(relation["citations"], chapter),
            }
        )
    return {"entities": checked_entities, "relations": checked_relations}


def build_prompt(chapter: Dict[str, str]) -> str:
    value = {
        "role": "你是严谨的文学与非虚构知识工程师。只从给定章节提取可逐字核验的实体和关系。",
        "objective": "提取人物、地点、组织、事件、概念、论点、证据，以及有方向、描述、置信度和原文引用的关系。",
        "rules": [
            "只能使用 chapter.text，不得使用外部知识或章节外推断。",
            "实体 type 只允许 person/place/organization/event/concept/claim/evidence。",
            "每个实体和关系必须有 1—3 条最小充分引用；没有直接证据就不要输出。",
            "同一章节内同一对象只输出一次，aliases 只写原文明示的别名，不猜测同名身份。",
            "关系 source_id 指向 target_id；direction 为 forward，原文明示双向时才用 bidirectional。",
            "confidence 表示证据与指代确定性；同名、代词或别名不确定时降低置信度，不强行合并。",
            "href 必须逐字复制 chapter.href；start/end 是 chapter.text 的 Unicode 字符下标，end 为开区间。",
            "quote 必须逐字等于 chapter.text[start:end]；提交前逐条机械核对。",
            "只输出符合 output schema 的 JSON，不输出解释、Markdown 或代码围栏。",
        ],
        "chapter": {**chapter, "length": len(chapter["text"])},
        "schema_version": SCHEMA_VERSION,
        "prompt_version": PROMPT_VERSION,
    }
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _decode_document(raw: bytes) -> str:
    head = raw[:1024].decode("ascii", errors="ignore")
    match = re.search(r"charset\s*=\s*['\"]?([\w.-]+)", head, re.IGNORECASE)
    encodings = [match.group(1)] if match else []
    encodings.extend(["utf-8", "utf-16", "gb18030"])
    for encoding in encodings:
        try:
            return raw.decode(encoding)
        except (LookupError, UnicodeDecodeError):
            continue
    return raw.decode("utf-8", errors="replace")


def _xml_local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _requested_match(requested: str, href: str) -> bool:
    path = unquote(urlparse(str(requested)).path).lstrip("/")
    href = unquote(href).lstrip("/")
    return bool(path and (path == href or path.endswith("/" + href) or href.endswith("/" + path)))


def extract_epub_chapters(
    epub_path: str,
    requested_hrefs: Optional[Sequence[str]] = None,
    max_chapters: int = 80,
    max_chapter_characters: int = 16_000,
    max_total_characters: int = 400_000,
) -> List[Dict[str, str]]:
    try:
        archive = zipfile.ZipFile(epub_path)
    except (OSError, zipfile.BadZipFile) as exc:
        raise KnowledgeGraphValidationError("EPUB 文件无法读取") from exc
    with archive:
        try:
            container = ElementTree.fromstring(archive.read("META-INF/container.xml"))
            rootfile = next(node for node in container.iter() if _xml_local(node.tag) == "rootfile")
            opf_path = rootfile.attrib["full-path"]
            package = ElementTree.fromstring(archive.read(opf_path))
        except (KeyError, StopIteration, ElementTree.ParseError) as exc:
            raise KnowledgeGraphValidationError("EPUB 目录结构无效") from exc
        opf_dir = posixpath.dirname(opf_path)
        # Keep the ZIP member name separate from the OPF-relative href exposed to
        # epub.js.  They differ whenever the package document lives in a
        # subdirectory (for example OPS/package.opf + chapter2.html).
        manifest: Dict[str, Tuple[str, str, str]] = {}
        spine_ids: List[str] = []
        for node in package.iter():
            name = _xml_local(node.tag)
            if name == "item" and node.attrib.get("id") and node.attrib.get("href"):
                reader_href = posixpath.normpath(unquote(urlparse(node.attrib["href"]).path))
                archive_href = posixpath.normpath(posixpath.join(opf_dir, reader_href))
                manifest[node.attrib["id"]] = (
                    archive_href,
                    reader_href,
                    node.attrib.get("media-type", ""),
                )
            elif name == "itemref" and node.attrib.get("idref") and node.attrib.get("linear", "yes") != "no":
                spine_ids.append(node.attrib["idref"])
        candidates = [manifest[item_id] for item_id in spine_ids if item_id in manifest]
        candidates = [
            (archive_href, reader_href, media)
            for archive_href, reader_href, media in candidates
            if media in {"application/xhtml+xml", "text/html", ""}
        ]
        if requested_hrefs:
            matched: List[Tuple[str, str, str]] = []
            missing = []
            for requested in requested_hrefs:
                options = [
                    candidate
                    for candidate in candidates
                    if _requested_match(requested, candidate[1]) or _requested_match(requested, candidate[0])
                ]
                if len(options) == 1:
                    if options[0] not in matched:
                        matched.append(options[0])
                else:
                    missing.append(str(requested))
            if missing:
                raise KnowledgeGraphValidationError("指定章节已变化或不存在，请刷新后重试")
            candidates = matched
        if not candidates:
            raise KnowledgeGraphValidationError("EPUB 中没有可处理的正文章节")
        if len(candidates) > max_chapters:
            raise KnowledgeGraphValidationError(f"所选范围超过 {max_chapters} 章，请缩小范围")
        chapters: List[Dict[str, str]] = []
        total = 0
        for archive_href, reader_href, _media in candidates:
            try:
                document = _decode_document(archive.read(archive_href))
            except KeyError as exc:
                raise KnowledgeGraphValidationError("EPUB 正文章节缺失") from exc
            parser = _XHTMLTextExtractor()
            parser.feed(document)
            text = CONTROL_RE.sub("", "".join(parser.parts)).replace("\r\n", "\n").replace("\r", "\n")
            if len(text.strip()) < 80:
                continue
            text = text[:max_chapter_characters]
            total += len(text)
            if total > max_total_characters:
                raise KnowledgeGraphValidationError(f"所选正文超过 {max_total_characters} 字，请缩小范围")
            title = " ".join(parser.title_parts).strip()[:512] or posixpath.basename(reader_href)
            chapters.append({"href": reader_href, "title": title, "text": text})
        if not chapters:
            raise KnowledgeGraphValidationError("所选范围没有足够正文")
        return chapters


def scope_fingerprint(chapters: Sequence[Dict[str, str]]) -> str:
    digest = hashlib.sha256()
    for chapter in chapters:
        digest.update(chapter["href"].encode("utf-8"))
        digest.update(b"\0")
        digest.update(hashlib.sha256(chapter["text"].encode("utf-8")).digest())
    return digest.hexdigest()


def request_key(creator_id: int, book_id: int, book_version: str, scope_hash: str) -> str:
    raw = f"{FEATURE_KEY}:{creator_id}:{book_id}:{book_version}:{scope_hash}:{SCHEMA_VERSION}:{PROMPT_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _canonical(value: str) -> str:
    value = unicodedata.normalize("NFKC", html.unescape(value)).casefold()
    return " ".join(value.split())


def _dedupe_citations(values: Iterable[Dict[str, Any]]) -> List[Dict[str, Any]]:
    unique: Dict[Tuple[str, int, int], Dict[str, Any]] = {}
    for value in values:
        key = (value["href"], value["start"], value["end"])
        unique[key] = value
    return list(unique.values())


def _stable_id(prefix: str, *values: str) -> str:
    digest = hashlib.sha256("\0".join(values).encode("utf-8")).hexdigest()[:12]
    return f"{prefix}_{digest}"


def merge_segments(segments: Iterable[Dict[str, Any]]) -> Dict[str, Any]:
    raw_nodes: List[Dict[str, Any]] = []
    raw_relations: List[Tuple[Dict[str, Any], Dict[str, int]]] = []
    for segment in segments:
        local_map: Dict[str, int] = {}
        for entity in segment.get("entities", []):
            local_map[entity["source_id"]] = len(raw_nodes)
            raw_nodes.append(dict(entity))
        for relation in segment.get("relations", []):
            raw_relations.append((relation, local_map))

    parent = list(range(len(raw_nodes)))

    def find(value: int) -> int:
        while parent[value] != value:
            parent[value] = parent[parent[value]]
            value = parent[value]
        return value

    def union(left: int, right: int) -> None:
        left, right = find(left), find(right)
        if left != right:
            parent[right] = left

    exact: Dict[Tuple[str, str], int] = {}
    for index, node in enumerate(raw_nodes):
        key = (node["type"], _canonical(node["name"]))
        if key in exact:
            union(index, exact[key])
        else:
            exact[key] = index
    alias_sources: Dict[Tuple[str, str], set] = defaultdict(set)
    for index, node in enumerate(raw_nodes):
        for alias in node.get("aliases", []):
            alias_sources[(node["type"], _canonical(alias))].add(index)
    for key, sources in alias_sources.items():
        target = exact.get(key)
        if target is None:
            continue
        target_root = find(target)
        source_roots = {find(index) for index in sources if find(index) != target_root}
        if len(source_roots) == 1:
            union(next(iter(source_roots)), target_root)

    grouped: Dict[int, List[int]] = defaultdict(list)
    for index in range(len(raw_nodes)):
        grouped[find(index)].append(index)
    merged_nodes: List[Dict[str, Any]] = []
    node_index_to_id: Dict[int, str] = {}
    for indices in grouped.values():
        values = [raw_nodes[index] for index in indices]
        primary = max(values, key=lambda item: (item["confidence"], len(item["name"])))
        names = sorted({item["name"] for item in values})
        node_id = _stable_id("n", primary["type"], *sorted(_canonical(name) for name in names))
        citations = _dedupe_citations(citation for item in values for citation in item["citations"])
        aliases = sorted({alias for item in values for alias in item.get("aliases", [])} | (set(names) - {primary["name"]}))
        merged_nodes.append(
            {
                "id": node_id,
                "name": primary["name"],
                "type": primary["type"],
                "aliases": aliases,
                "description": primary["description"],
                "confidence": round(max(item["confidence"] for item in values), 4),
                "citations": citations,
                "mentions": len(citations),
            }
        )
        for index in indices:
            node_index_to_id[index] = node_id

    alias_owners: Dict[Tuple[str, str], set] = defaultdict(set)
    for node in merged_nodes:
        alias_owners[(node["type"], _canonical(node["name"]))].add(node["id"])
        for alias in node["aliases"]:
            alias_owners[(node["type"], _canonical(alias))].add(node["id"])
    node_by_id = {node["id"]: node for node in merged_nodes}
    alias_conflicts = []
    for (entity_type, alias), owners in sorted(alias_owners.items()):
        if len(owners) > 1:
            alias_conflicts.append(
                {
                    "alias": alias,
                    "type": entity_type,
                    "entity_ids": sorted(owners),
                    "names": sorted(node_by_id[owner]["name"] for owner in owners),
                }
            )

    relation_groups: Dict[Tuple[str, str, str, str], List[Dict[str, Any]]] = defaultdict(list)
    for relation, local_map in raw_relations:
        source_index = local_map.get(relation["source_id"])
        target_index = local_map.get(relation["target_id"])
        if source_index is None or target_index is None:
            continue
        source = node_index_to_id[source_index]
        target = node_index_to_id[target_index]
        if source == target:
            continue
        if relation["direction"] == "bidirectional" and source > target:
            source, target = target, source
        key = (source, target, _canonical(relation["type"]), relation["direction"])
        relation_groups[key].append(relation)
    merged_relations = []
    for (source, target, _type_key, direction), values in relation_groups.items():
        primary = max(values, key=lambda item: item["confidence"])
        citations = _dedupe_citations(citation for item in values for citation in item["citations"])
        merged_relations.append(
            {
                "id": _stable_id("r", source, target, _type_key, direction),
                "source": source,
                "target": target,
                "type": primary["type"],
                "description": primary["description"],
                "direction": direction,
                "confidence": round(max(item["confidence"] for item in values), 4),
                "citations": citations,
                "mentions": len(citations),
            }
        )

    high_confidence_nodes = [node for node in merged_nodes if node["confidence"] >= CONFIDENCE_THRESHOLD]
    high_confidence_ids = {node["id"] for node in high_confidence_nodes}
    formal_nodes = [node for node in high_confidence_nodes if node["citations"]]
    formal_ids = {node["id"] for node in formal_nodes}
    high_confidence_relations = [
        relation
        for relation in merged_relations
        if relation["confidence"] >= CONFIDENCE_THRESHOLD
        and relation["source"] in high_confidence_ids
        and relation["target"] in high_confidence_ids
    ]
    formal_relations = [
        relation
        for relation in high_confidence_relations
        if relation["citations"] and relation["source"] in formal_ids and relation["target"] in formal_ids
    ]
    degree = defaultdict(int)
    for relation in formal_relations:
        degree[relation["source"]] += 1
        degree[relation["target"]] += 1
    for node in formal_nodes:
        node["importance"] = round(degree[node["id"]] * 2 + node["mentions"] + node["confidence"], 4)
    formal_nodes.sort(key=lambda item: (-item["importance"], item["type"], item["name"]))
    formal_relations.sort(key=lambda item: (-item["confidence"], item["type"]))
    low_confidence = [{"kind": "node", "item": node} for node in merged_nodes if node["id"] not in formal_ids]
    low_confidence.extend(
        {"kind": "relation", "item": relation} for relation in merged_relations if relation not in formal_relations
    )
    node_coverage = (
        1.0
        if not high_confidence_nodes
        else sum(bool(node["citations"]) for node in high_confidence_nodes) / len(high_confidence_nodes)
    )
    relation_coverage = (
        1.0
        if not high_confidence_relations
        else sum(bool(relation["citations"]) for relation in high_confidence_relations) / len(high_confidence_relations)
    )
    return {
        "graph": {"nodes": formal_nodes, "relations": formal_relations},
        "review": {"low_confidence": low_confidence, "alias_conflicts": alias_conflicts},
        "stats": {
            "extracted_nodes": len(raw_nodes),
            "formal_nodes": len(formal_nodes),
            "formal_relations": len(formal_relations),
            "node_citation_coverage": round(node_coverage, 4),
            "relation_citation_coverage": round(relation_coverage, 4),
        },
    }


def task_dict(record: AITask) -> Dict[str, Any]:
    data = record.result_data or {}
    draft = record.ai_draft or {}
    scope = data.get("scope") or draft.get("scope") or {}
    return {
        "id": record.id,
        "feature": record.feature,
        "book_id": record.book_id,
        "book_version": record.book_version,
        "scope": scope,
        "status": record.status,
        "progress_message": record.progress_message,
        "completed_segments": len((draft.get("segments") or {})),
        "total_segments": int(scope.get("chapter_count", 0) or 0),
        "graph": data.get("graph", {"nodes": [], "relations": []}),
        "review": data.get("review", {"low_confidence": [], "alias_conflicts": []}),
        "stats": data.get("stats", {}),
        "schema_version": record.schema_version,
        "prompt_version": record.prompt_version,
        "runtime": record.runtime_name,
        "usage": record.usage or {},
        "error": {"code": record.error_code, "message": record.error_message} if record.error_code else None,
        "created_at": record.create_time.isoformat() if record.create_time else None,
        "updated_at": record.update_time.isoformat() if record.update_time else None,
    }


class KnowledgeGraphService:
    _instance: Optional["KnowledgeGraphService"] = None
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

    def submit(self, record_id: str, epub_path: str, chapter_hrefs: Sequence[str]) -> None:
        if not self._configured:
            raise RuntimeError("KnowledgeGraphService is not configured")
        with self._threads_lock:
            thread = self._threads.get(record_id)
            if thread and thread.is_alive():
                return
            thread = threading.Thread(
                target=self._run,
                args=(record_id, epub_path, list(chapter_hrefs)),
                name=f"knowledge-graph-{record_id[:8]}",
                daemon=True,
            )
            self._threads[record_id] = thread
            thread.start()

    def _is_cancelled(self, record_id: str) -> bool:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            return not record or bool(record.cancel_requested)
        finally:
            session.close()

    def _update_event(self, record_id: str, event: RuntimeEvent, index: int, total: int) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if not record:
                return
            record.progress_message = f"正在提取第 {index}/{total} 章"
            if event.session_id:
                record.runtime_session_id = event.session_id[:128]
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

    def _save_segment(
        self, record_id: str, chapter: Dict[str, str], segment: Dict[str, Any], usage: Dict[str, Any], index: int, total: int
    ) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if not record:
                return
            draft = dict(record.ai_draft or {})
            segments = dict(draft.get("segments") or {})
            segments[chapter["href"]] = segment
            draft["segments"] = segments
            record.ai_draft = draft
            aggregate = dict(record.usage or {})
            for key, value in (usage or {}).items():
                if isinstance(value, (int, float)) and not isinstance(value, bool):
                    aggregate[key] = aggregate.get(key, 0) + value
            record.usage = aggregate
            record.progress_message = f"已校验 {index}/{total} 章"
            record.update_time = datetime.datetime.now()
            session.commit()
        finally:
            session.close()

    def _run(self, record_id: str, epub_path: str, chapter_hrefs: Sequence[str]) -> None:
        session = self.session_maker()
        try:
            record = session.get(AITask, record_id)
            if not record or record.status not in {"queued", "running", "failed", "cancelled"}:
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
            chapters = extract_epub_chapters(
                epub_path,
                chapter_hrefs,
                int(self.config.get("AI_KNOWLEDGE_GRAPH_MAX_CHAPTERS", 80)),
                int(self.config.get("AI_KNOWLEDGE_GRAPH_MAX_CHAPTER_CHARACTERS", 16_000)),
                int(self.config.get("AI_KNOWLEDGE_GRAPH_MAX_TOTAL_CHARACTERS", 400_000)),
            )
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                completed = dict((record.ai_draft or {}).get("segments") or {}) if record else {}
            finally:
                session.close()
            for index, chapter in enumerate(chapters, 1):
                if self._is_cancelled(record_id):
                    raise _cancel_error()
                if chapter["href"] in completed:
                    continue
                result = self.runtime.generate(
                    RuntimeRequest(
                        task_id=record_id,
                        prompt=build_prompt(chapter),
                        output_schema=KNOWLEDGE_GRAPH_OUTPUT_SCHEMA,
                        model=self.config.get("AI_CODEX_MODEL", "") or None,
                    ),
                    lambda event, current=index: self._update_event(record_id, event, current, len(chapters)),
                )
                checked = validate_segment(result.output, chapter)
                completed[chapter["href"]] = checked
                self._save_segment(record_id, chapter, checked, result.usage or {}, index, len(chapters))
            result_data = merge_segments(completed[href] for href in chapter_hrefs if href in completed)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if not record:
                    return
                if record.cancel_requested:
                    record.status = "cancelled"
                else:
                    result_data["scope"] = dict((record.ai_draft or {}).get("scope") or {})
                    record.status = "succeeded"
                    record.result_data = result_data
                    record.progress_message = "知识图谱生成完成"
                record.finished_at = datetime.datetime.now()
                record.update_time = record.finished_at
                session.commit()
            finally:
                session.close()
        except (AgentRuntimeError, KnowledgeGraphValidationError) as exc:
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if record:
                    cancelled = isinstance(exc, AgentRuntimeError) and getattr(exc.code, "value", "") == "runtime.cancelled"
                    record.status = "cancelled" if cancelled or record.cancel_requested else "failed"
                    record.error_code = getattr(getattr(exc, "code", None), "value", "result.invalid")
                    record.error_message = str(getattr(exc, "safe_message", str(exc)))[:500]
                    record.progress_message = record.error_message
                    record.finished_at = datetime.datetime.now()
                    record.update_time = record.finished_at
                    session.commit()
            finally:
                session.close()
        except Exception:
            LOG.exception("Knowledge graph task failed record_id=%s", record_id)
            session = self.session_maker()
            try:
                record = session.get(AITask, record_id)
                if record:
                    record.status = "failed"
                    record.error_code = "runtime.internal"
                    record.error_message = "知识图谱生成暂时失败，请重试"
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


def _cancel_error() -> AgentRuntimeError:
    from webserver.services.agent_runtime import RuntimeErrorCode

    return AgentRuntimeError(RuntimeErrorCode.CANCELLED, "生成已取消")
