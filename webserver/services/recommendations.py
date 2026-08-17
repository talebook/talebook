"""Privacy-preserving candidate ranking for explainable book recommendations."""

from __future__ import annotations

import datetime
import hashlib
import html
import json
import re
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Set, Tuple

from webserver.services.agent_runtime import AgentRuntimeError, RuntimeRequest
from webserver.services.codex_app_server import CodexAppServerRuntime


FEATURE_KEY = "recommendations"
SCHEMA_VERSION = "recommendations.v1"
PROMPT_VERSION = "recommendations.zh.v1"
MAX_CANDIDATES_FOR_RUNTIME = 30
MAX_REASON_CHARACTERS = 240
VALID_CONFIDENCE = {"low", "medium", "high"}
VALID_FEEDBACK = {"not_interested", "less_like", "read"}
VALID_LENGTHS = {"", "short", "medium", "long"}
VALID_DIFFICULTIES = {"", "light", "balanced", "deep"}
CONTROL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
HTML_RE = re.compile(r"<[^>]+>")
LIGHT_TAGS = {"儿童", "童话", "绘本", "入门", "科普", "随笔", "children", "beginner", "popular science"}
DEEP_TAGS = {"哲学", "理论", "学术", "研究", "技术", "历史", "philosophy", "theory", "academic", "research"}


class RecommendationValidationError(ValueError):
    pass


def _strings(values: Any, limit: int = 10, item_limit: int = 80) -> List[str]:
    if not isinstance(values, list):
        return []
    result = []
    seen = set()
    for value in values:
        text = CONTROL_RE.sub("", str(value or "")).strip()[:item_limit]
        key = text.casefold()
        if text and key not in seen:
            result.append(text)
            seen.add(key)
        if len(result) >= limit:
            break
    return result


def normalize_preferences(value: Any) -> Dict[str, Any]:
    data = value if isinstance(value, dict) else {}
    length = str(data.get("length", "") or "").strip()
    difficulty = str(data.get("difficulty", "") or "").strip()
    if length not in VALID_LENGTHS:
        raise RecommendationValidationError("长度偏好无效")
    if difficulty not in VALID_DIFFICULTIES:
        raise RecommendationValidationError("难度偏好无效")
    seed_book_ids = []
    for value in data.get("seed_book_ids", []) if isinstance(data.get("seed_book_ids", []), list) else []:
        try:
            book_id = int(value)
        except (TypeError, ValueError):
            continue
        if book_id > 0 and book_id not in seed_book_ids:
            seed_book_ids.append(book_id)
        if len(seed_book_ids) >= 5:
            break
    return {
        "topics": _strings(data.get("topics"), limit=10),
        "length": length,
        "difficulty": difficulty,
        "seed_book_ids": seed_book_ids,
        "popular_enabled": data.get("popular_enabled") is not False,
    }


def _normalized_tags(book: Mapping[str, Any]) -> List[str]:
    return _strings(book.get("tags"), limit=30)


def _normalized_authors(book: Mapping[str, Any]) -> List[str]:
    authors = book.get("authors")
    if isinstance(authors, list):
        return _strings(authors, limit=10)
    return _strings([book.get("author")], limit=10)


def _stable_unit(reader_id: int, book_id: int, batch: int) -> float:
    digest = hashlib.sha256(f"{reader_id}:{book_id}:{batch}".encode("utf-8")).digest()
    return int.from_bytes(digest[:8], "big") / float(2**64 - 1)


def _book_size_hint(book: Mapping[str, Any]) -> str:
    try:
        size = int(book.get("size_bytes", 0) or 0)
    except (TypeError, ValueError):
        size = 0
    if not size:
        return ""
    if size < 1024 * 1024:
        return "short"
    if size <= 5 * 1024 * 1024:
        return "medium"
    return "long"


def _difficulty_hint(book: Mapping[str, Any]) -> str:
    tags = {tag.casefold() for tag in _normalized_tags(book)}
    if tags & {tag.casefold() for tag in LIGHT_TAGS}:
        return "light"
    if tags & {tag.casefold() for tag in DEEP_TAGS}:
        return "deep"
    return "balanced"


def _state_strength(state: Any) -> float:
    if not state:
        return 0.0
    score = 0.0
    score += 4.0 if getattr(state, "favorite", 0) else 0.0
    score += 3.0 if getattr(state, "wants", 0) else 0.0
    score += 2.5 if getattr(state, "read_state", 0) == 2 else 0.0
    score += 1.5 if getattr(state, "read_state", 0) == 1 else 0.0
    score += 0.75 if getattr(state, "online_read", 0) else 0.0
    recent_at = getattr(state, "progress_update_time", None) or getattr(state, "read_date", None)
    if isinstance(recent_at, datetime.datetime) and recent_at >= datetime.datetime.now() - datetime.timedelta(days=90):
        score += 1.0
    return score


def _add_profile_book(
    book: Mapping[str, Any],
    strength: float,
    tag_weights: Dict[str, float],
    author_weights: Dict[str, float],
) -> None:
    for tag in _normalized_tags(book):
        tag_weights[tag.casefold()] = tag_weights.get(tag.casefold(), 0.0) + strength
    for author in _normalized_authors(book):
        author_weights[author.casefold()] = author_weights.get(author.casefold(), 0.0) + strength


def deterministic_candidates(
    books: Sequence[Mapping[str, Any]],
    states: Mapping[int, Any],
    feedback: Sequence[Any],
    preferences: Mapping[str, Any],
    personalization_enabled: bool,
    reader_id: int,
    batch: int = 0,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Return stable, explainable candidates and a non-sensitive signal summary."""

    by_id = {int(book["id"]): book for book in books}
    explicit = normalize_preferences(dict(preferences))
    excluded: Set[int] = set()
    negative_tags: Dict[str, float] = {}
    negative_authors: Dict[str, float] = {}
    feedback_read: Set[int] = set()
    for item in feedback:
        if not getattr(item, "active", False):
            continue
        book_id = int(getattr(item, "book_id", 0) or 0)
        action = getattr(item, "action", "")
        if action in {"not_interested", "read"}:
            excluded.add(book_id)
        if action == "read":
            feedback_read.add(book_id)
        if action == "less_like" and book_id in by_id:
            _add_profile_book(by_id[book_id], 1.0, negative_tags, negative_authors)

    seed_tags: Dict[str, float] = {}
    seed_authors: Dict[str, float] = {}
    history_tags: Dict[str, float] = {}
    history_authors: Dict[str, float] = {}
    seed_ids = {book_id for book_id in explicit["seed_book_ids"] if book_id in by_id}
    for book_id in seed_ids:
        _add_profile_book(by_id[book_id], 5.0, seed_tags, seed_authors)
    if personalization_enabled:
        for book_id, state in states.items():
            strength = _state_strength(state)
            if strength and book_id in by_id:
                _add_profile_book(by_id[book_id], strength, history_tags, history_authors)
            if getattr(state, "read_state", 0) in {1, 2} or getattr(state, "favorite", 0):
                excluded.add(book_id)
        for book_id in feedback_read:
            if book_id in by_id:
                _add_profile_book(by_id[book_id], 2.5, history_tags, history_authors)

    topic_keys = {topic.casefold(): topic for topic in explicit["topics"]}
    ranked: List[Dict[str, Any]] = []
    for book in books:
        book_id = int(book["id"])
        if book_id in excluded or book_id in seed_ids:
            continue
        tags = _normalized_tags(book)
        authors = _normalized_authors(book)
        tag_keys = {tag.casefold(): tag for tag in tags}
        author_keys = {author.casefold(): author for author in authors}
        score = 0.0
        evidence: List[str] = []
        reason_parts: List[str] = []

        topic_matches = [tag_keys[key] for key in topic_keys if key in tag_keys]
        if topic_matches:
            score += 8.0 + min(4.0, len(topic_matches) * 1.5)
            evidence.append("topic:" + topic_matches[0])
            reason_parts.append("符合你选择的“%s”主题" % topic_matches[0])

        positive_tag_matches = sorted(
            (
                (seed_tags.get(key, 0.0) + history_tags.get(key, 0.0), value, key)
                for key, value in tag_keys.items()
                if key in seed_tags or key in history_tags
            ),
            reverse=True,
        )
        if positive_tag_matches:
            score += min(10.0, positive_tag_matches[0][0] * 0.75)
            _weight, value, key = positive_tag_matches[0]
            if history_tags.get(key, 0.0) >= seed_tags.get(key, 0.0):
                evidence.append("history_topic:" + value)
                reason_parts.append("延续你读过或收藏过的“%s”方向" % positive_tag_matches[0][1])
            else:
                evidence.append("seed_topic:" + value)
                reason_parts.append("与你选择的种子书同属“%s”主题" % value)

        positive_author_matches = sorted(
            (
                (seed_authors.get(key, 0.0) + history_authors.get(key, 0.0), value, key)
                for key, value in author_keys.items()
                if key in seed_authors or key in history_authors
            ),
            reverse=True,
        )
        if positive_author_matches:
            score += min(8.0, positive_author_matches[0][0] * 0.8)
            _weight, value, key = positive_author_matches[0]
            if history_authors.get(key, 0.0) >= seed_authors.get(key, 0.0):
                evidence.append("history_author:" + value)
                reason_parts.append("作者与你的既有阅读偏好相近")
            else:
                evidence.append("seed_author:" + value)
                reason_parts.append("作者与你选择的种子书相近")

        negative = sum(negative_tags.get(key, 0.0) for key in tag_keys) + sum(
            negative_authors.get(key, 0.0) for key in author_keys
        )
        score -= min(16.0, negative * 5.0)

        length_hint = _book_size_hint(book)
        if explicit["length"] and length_hint == explicit["length"]:
            score += 3.0
            evidence.append("length:" + length_hint)
            reason_parts.append("篇幅更接近你这次的选择")
        difficulty_hint = _difficulty_hint(book)
        if explicit["difficulty"] and difficulty_hint == explicit["difficulty"]:
            score += 2.0
            evidence.append("difficulty:" + difficulty_hint)

        try:
            rating = float(book.get("rating", 0) or 0)
        except (TypeError, ValueError):
            rating = 0.0
        if rating and explicit["popular_enabled"]:
            score += min(2.0, rating / 5.0)
            evidence.append("library_rating")

        exploration = _stable_unit(reader_id, book_id, batch)
        score += exploration * 1.5
        if not reason_parts:
            reason_parts.append("为你保留的一本探索性选择")
            evidence.append("exploration")
        ranked.append(
            {
                "book_id": book_id,
                "score": round(score, 6),
                "reason": "；".join(reason_parts[:2]) + "。",
                "evidence": evidence[:5],
                "allowed_evidence": sorted(set(evidence)),
                "confidence": "medium" if score >= 5 else "low",
                "exploration": exploration,
            }
        )

    ranked.sort(key=lambda item: (-item["score"], item["exploration"], item["book_id"]))
    signal_count = len(seed_ids) + len(explicit["topics"]) + int(bool(explicit["length"])) + int(bool(explicit["difficulty"]))
    if personalization_enabled:
        signal_count += sum(1 for state in states.values() if _state_strength(state))
        signal_count += sum(1 for item in feedback if getattr(item, "active", False))
    summary = {
        "personalization_enabled": bool(personalization_enabled),
        "signal_count": signal_count,
        "cold_start": signal_count < 2,
        "topics": explicit["topics"],
        "length": explicit["length"],
        "difficulty": explicit["difficulty"],
        "seed_count": len(seed_ids),
        "popular_enabled": explicit["popular_enabled"],
    }
    return ranked, summary


def _plain_summary(value: Any) -> str:
    text = html.unescape(HTML_RE.sub(" ", str(value or "")))
    return " ".join(CONTROL_RE.sub("", text).split())[:500]


def output_schema(count: int) -> Dict[str, Any]:
    return {
        "type": "object",
        "properties": {
            "items": {
                "type": "array",
                "minItems": count,
                "maxItems": count,
                "items": {
                    "type": "object",
                    "properties": {
                        "book_id": {"type": "integer"},
                        "rank": {"type": "integer", "minimum": 1, "maximum": count},
                        "reason": {"type": "string"},
                        "evidence": {"type": "array", "items": {"type": "string"}},
                        "confidence": {"type": "string", "enum": sorted(VALID_CONFIDENCE)},
                    },
                    "required": ["book_id", "rank", "reason", "evidence", "confidence"],
                    "additionalProperties": False,
                },
            }
        },
        "required": ["items"],
        "additionalProperties": False,
    }


def _runtime_prompt(
    candidates: Sequence[Mapping[str, Any]],
    books: Mapping[int, Mapping[str, Any]],
    summary: Mapping[str, Any],
    count: int,
) -> str:
    payload = []
    for candidate in candidates:
        book = books[candidate["book_id"]]
        payload.append(
            {
                "book_id": candidate["book_id"],
                "title": str(book.get("title", ""))[:160],
                "authors": _normalized_authors(book),
                "tags": _normalized_tags(book),
                "summary": _plain_summary(book.get("comments")),
                "deterministic_score": candidate["score"],
                "allowed_evidence": candidate["allowed_evidence"],
            }
        )
    return (
        "你是 Talebook 的候选重排器。服务端已完成权限校验与候选召回。"
        "请只在给定候选内选择并排序，输出恰好 %d 本。理由必须简短、非剧透，且只能依据该候选的元数据、"
        "deterministic_score 与 allowed_evidence；evidence 必须逐字取自 allowed_evidence。"
        "不得推断人格、身份或候选之外的事实。信号不足时 confidence 使用 low，不要伪装高置信个性化。\n"
        "信号摘要：%s\n候选：%s" % (count, json.dumps(summary, ensure_ascii=False), json.dumps(payload, ensure_ascii=False))
    )


def _clean_reason(value: Any) -> str:
    if not isinstance(value, str):
        raise RecommendationValidationError("推荐理由必须是文本")
    reason = " ".join(CONTROL_RE.sub("", value).split())
    if not reason or len(reason) > MAX_REASON_CHARACTERS:
        raise RecommendationValidationError("推荐理由为空或过长")
    return reason


def validate_runtime_output(payload: Any, candidates: Sequence[Mapping[str, Any]], count: int) -> List[Dict[str, Any]]:
    if not isinstance(payload, dict) or set(payload) != {"items"}:
        raise RecommendationValidationError("结果根对象不符合 recommendations.v1")
    items = payload.get("items")
    if not isinstance(items, list) or len(items) != count:
        raise RecommendationValidationError("推荐数量不符合要求")
    allowed = {candidate["book_id"]: set(candidate["allowed_evidence"]) for candidate in candidates}
    result = []
    seen_ids: Set[int] = set()
    seen_ranks: Set[int] = set()
    for item in items:
        if not isinstance(item, dict) or set(item) != {"book_id", "rank", "reason", "evidence", "confidence"}:
            raise RecommendationValidationError("推荐结构无效")
        try:
            book_id = int(item["book_id"])
            rank = int(item["rank"])
        except (TypeError, ValueError):
            raise RecommendationValidationError("推荐 ID 或排序无效")
        if book_id not in allowed or book_id in seen_ids or rank < 1 or rank > count or rank in seen_ranks:
            raise RecommendationValidationError("推荐越界、重复或排序无效")
        evidence = item.get("evidence")
        if not isinstance(evidence, list) or not evidence or any(value not in allowed[book_id] for value in evidence):
            raise RecommendationValidationError("推荐依据不可追溯")
        confidence = item.get("confidence")
        if confidence not in VALID_CONFIDENCE:
            raise RecommendationValidationError("推荐置信度无效")
        result.append(
            {
                "book_id": book_id,
                "rank": rank,
                "reason": _clean_reason(item.get("reason")),
                "evidence": _strings(evidence, limit=5),
                "confidence": confidence,
            }
        )
        seen_ids.add(book_id)
        seen_ranks.add(rank)
    return sorted(result, key=lambda item: item["rank"])


def generate_with_runtime(
    config: Mapping[str, Any],
    books: Sequence[Mapping[str, Any]],
    candidates: Sequence[Mapping[str, Any]],
    summary: Mapping[str, Any],
    count: int,
    task_id: str,
    runtime: Optional[Any] = None,
) -> List[Dict[str, Any]]:
    if count < 1:
        return []
    selected = list(candidates[:MAX_CANDIDATES_FOR_RUNTIME])
    by_id = {int(book["id"]): book for book in books}
    adapter = runtime or CodexAppServerRuntime(dict(config))
    result = adapter.generate(
        RuntimeRequest(
            task_id=task_id,
            prompt=_runtime_prompt(selected, by_id, summary, count),
            output_schema=output_schema(count),
            model=config.get("AI_CODEX_MODEL", "") or None,
        ),
        lambda _event: None,
    )
    checked = validate_runtime_output(result.output, selected, count)
    if summary.get("cold_start"):
        for item in checked:
            item["confidence"] = "low"
    return checked


def deterministic_result(candidates: Sequence[Mapping[str, Any]], count: int) -> List[Dict[str, Any]]:
    return [
        {
            "book_id": item["book_id"],
            "rank": index + 1,
            "reason": item["reason"],
            "evidence": item["evidence"],
            "confidence": item["confidence"],
        }
        for index, item in enumerate(candidates[:count])
    ]


def cache_key(
    books: Iterable[Mapping[str, Any]],
    states: Mapping[int, Any],
    feedback: Sequence[Any],
    preferences: Mapping[str, Any],
    personalization_enabled: bool,
    batch: int,
    limit: int,
) -> str:
    state_values = []
    if personalization_enabled:
        state_values = [
            [
                int(book_id),
                int(getattr(state, "favorite", 0) or 0),
                int(getattr(state, "wants", 0) or 0),
                int(getattr(state, "read_state", 0) or 0),
                str(getattr(state, "progress_update_time", "") or ""),
            ]
            for book_id, state in sorted(states.items())
        ]
    feedback_values = [
        [int(getattr(item, "id", 0) or 0), int(getattr(item, "book_id", 0) or 0), getattr(item, "action", "")]
        for item in feedback
        if getattr(item, "active", False)
    ]
    payload = {
        "books": sorted(
            [
                int(book["id"]),
                str(book.get("title", ""))[:160],
                _normalized_authors(book),
                _normalized_tags(book),
                str(book.get("rating", 0) or 0),
                int(book.get("size_bytes", 0) or 0),
                hashlib.sha256(_plain_summary(book.get("comments")).encode("utf-8")).hexdigest(),
            ]
            for book in books
        ),
        "states": state_values,
        "feedback": feedback_values,
        "preferences": normalize_preferences(dict(preferences)),
        "personalization_enabled": bool(personalization_enabled),
        "batch": int(batch),
        "limit": int(limit),
        "schema": SCHEMA_VERSION,
        "prompt": PROMPT_VERSION,
    }
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def safe_fallback_reason(exc: Exception) -> str:
    if isinstance(exc, AgentRuntimeError):
        return exc.code.value
    if isinstance(exc, RecommendationValidationError):
        return "runtime.invalid_output"
    return "runtime.unavailable"
