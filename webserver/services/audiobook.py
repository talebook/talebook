"""有声书持久队列、Voicebook 子进程协议与资源存储。"""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import queue
import re
import shlex
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path

import yaml

from webserver import loader
from webserver.models import AudiobookChapter, AudiobookEdition, AudiobookJob
from webserver.services.convert import ConvertService


CONF = loader.get_settings()
ACTIVE_JOB_STATUSES = {"queued", "inspecting", "awaiting_review", "generating", "finalizing"}
ROLE_COLUMNS = 9
CHAPTER_HEADING = re.compile(r"^##\s+章节\s+(\d+)\s*\|\s*(.*?)(?:\s+#\s*(.+))?$")
SCRIPT_LINE = re.compile(r"^\[([^\]]+)\]\s+(.+)$")
PLAN_PHASE_KEYS = ("queue", "inspect", "review", "generate", "finalize", "complete")
SCRIPT_NORMALIZATION_VERSION = 1
SCRIPT_SEGMENT_TARGET_CHARS = 50
SCRIPT_SEGMENT_MIN_CHARS = 28
SCRIPT_SEGMENT_MAX_CHARS = 80
GENERIC_CHAPTER_TITLE = re.compile(
    r"^(?:titlepage|cover(?:page)?|index(?:_split)?[_-]?\d+|chapter[_-]?\d+|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$",
    re.IGNORECASE,
)
CHAPTER_TEXT_HEADING = re.compile(
    r"^\s*(第\s*[0-9０-９一二三四五六七八九十百千万零〇两壹贰叁肆伍陆柒捌玖拾佰仟\s]+\s*"
    r"(?:章|节|回|幕|集)|(?:序章|序幕|楔子|引子|前言|尾声|终章|后记|译后记|大结局))"
    r"(?:[\s:：·、-]+)?",
    re.IGNORECASE,
)
CSS_DECLARATION = re.compile(
    r"(?:margin|padding|font(?:-family|-size|-weight)?|text-align|line-height|color|display|width|height)\s*:",
    re.IGNORECASE,
)


def utcnow():
    return datetime.datetime.now()


def stable_json_hash(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def stable_site_uuid():
    """Return a non-secret, stable identity scoped to this Talebook instance."""

    secret = str(CONF.get("cookie_secret", "talebook"))
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"talebook-instance:{secret}"))


class AudiobookStorage:
    def __init__(self, root=None):
        self.root = Path(root or CONF["AUDIOBOOK_PATH"]).expanduser().resolve()

    def ensure(self):
        for relative in ("editions", "jobs", "cache/segments", "cache/dynamic-previews", "audit"):
            (self.root / relative).mkdir(parents=True, exist_ok=True)

    def resolve(self, relative, *, must_exist=False):
        candidate = (self.root / str(relative)).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as exc:
            raise ValueError("有声书资源路径越界") from exc
        if must_exist and not candidate.exists():
            raise FileNotFoundError(candidate)
        return candidate

    def relative(self, path):
        return Path(path).resolve().relative_to(self.root).as_posix()

    def edition_dir(self, edition_id):
        return self.resolve(f"editions/{int(edition_id)}")

    def job_dir(self, job_id):
        return self.resolve(f"jobs/{int(job_id)}")


def _script_sections(path):
    lines = Path(path).read_text(encoding="utf-8-sig").splitlines()
    roles = []
    chapters = []
    section = ""
    current = None
    for index, raw in enumerate(lines):
        stripped = raw.strip()
        if stripped == "## 角色表":
            section = "roles"
            continue
        match = CHAPTER_HEADING.match(stripped)
        if match:
            current = {
                "number": int(match.group(1)),
                "title": match.group(2).strip(),
                "volume": (match.group(3) or "").strip(),
                "heading_index": index,
                "start": index + 1,
                "end": len(lines),
                "lines": [],
            }
            if chapters:
                chapters[-1]["end"] = index
            chapters.append(current)
            section = "chapter"
            continue
        if section == "roles" and stripped and not stripped.startswith("#"):
            columns = [part.strip() for part in raw.split("|")]
            if len(columns) == ROLE_COLUMNS:
                roles.append(
                    {
                        "name": columns[0],
                        "position": columns[1],
                        "type": columns[2],
                        "gender": columns[3],
                        "age": columns[4],
                        "region": columns[5],
                        "description": columns[6],
                        "speed": columns[7],
                        "voice_overrides": columns[8],
                    }
                )
        elif section == "chapter" and current is not None and stripped and not stripped.startswith("#"):
            current["lines"].append(stripped)
    revision = hashlib.sha256("\n".join(lines).encode("utf-8")).hexdigest()
    return lines, roles, chapters, revision


def read_script_workspace(path):
    _, roles, chapters, revision = _script_sections(path)
    return {"characters": roles, "chapters": chapters, "revision": revision}


def _segment_locator_key(tag, value):
    normalized = " ".join(str(value).split())
    return hashlib.sha256(f"{tag}\0{normalized}".encode("utf-8")).hexdigest()


def _script_meta(lines):
    if not lines or lines[0].strip() != "---":
        return {}, -1
    try:
        end = next(index for index in range(1, len(lines)) if lines[index].strip() == "---")
    except StopIteration:
        return {}, -1
    value = yaml.safe_load("\n".join(lines[1:end])) or {}
    return (value if isinstance(value, dict) else {}), end


def _is_stylesheet_text(value):
    text = " ".join(str(value).split()).strip()
    lowered = text.lower()
    if not text:
        return False
    if lowered.startswith(("@page", "@font-face", "<?xml", "<!doctype")):
        return True
    selector = re.match(r"^(?:html|body|p|div|h[1-6]|\.[\w-]+|#[\w-]+)(?:\s+[^{}]+)?\s*\{", lowered)
    return bool(selector and "}" in lowered and CSS_DECLARATION.search(lowered))


def _trimmed_range(value, start, end):
    while start < end and value[start].isspace():
        start += 1
    while end > start and value[end - 1].isspace():
        end -= 1
    return start, end


def _sentence_ranges(value):
    ranges = []
    start = 0
    for match in re.finditer(r"[。！？!?；;…]+[”’\"」』）)]*", value):
        end = match.end()
        left, right = _trimmed_range(value, start, end)
        if left < right:
            ranges.append((left, right))
        start = end
    left, right = _trimmed_range(value, start, len(value))
    if left < right:
        ranges.append((left, right))
    return ranges or ([(0, len(value))] if value else [])


def _split_long_range(value, start, end):
    ranges = []
    while end - start > SCRIPT_SEGMENT_MAX_CHARS:
        minimum = start + SCRIPT_SEGMENT_MIN_CHARS
        maximum = min(end, start + SCRIPT_SEGMENT_MAX_CHARS)
        target = min(maximum, start + SCRIPT_SEGMENT_TARGET_CHARS)
        candidates = [
            match.end()
            for match in re.finditer(r"[，,、：:）)】\]》〉」』”’]", value[start:maximum])
            if minimum <= start + match.end() <= maximum
        ]
        cut = min(candidates, key=lambda item: abs((start + item) - target)) + start if candidates else maximum
        left, right = _trimmed_range(value, start, cut)
        if left < right:
            ranges.append((left, right))
        start = cut
        while start < end and value[start].isspace():
            start += 1
    left, right = _trimmed_range(value, start, end)
    if left < right:
        ranges.append((left, right))
    return ranges


def split_script_text(value):
    """Return sentence-aware text ranges targeting roughly fifty characters."""

    text = str(value).strip()
    units = []
    for start, end in _sentence_ranges(text):
        units.extend(_split_long_range(text, start, end))
    grouped = []
    for start, end in units:
        if not grouped:
            grouped.append([start, end])
            continue
        current = grouped[-1]
        combined_length = end - current[0]
        current_length = current[1] - current[0]
        if combined_length <= SCRIPT_SEGMENT_MAX_CHARS and (
            current_length < SCRIPT_SEGMENT_MIN_CHARS or combined_length <= SCRIPT_SEGMENT_TARGET_CHARS + 10
        ):
            current[1] = end
        else:
            grouped.append([start, end])
    if len(grouped) > 1 and grouped[-1][1] - grouped[-1][0] < SCRIPT_SEGMENT_MIN_CHARS:
        previous = grouped[-2]
        if grouped[-1][1] - previous[0] <= SCRIPT_SEGMENT_MAX_CHARS:
            previous[1] = grouped[-1][1]
            grouped.pop()
    return [(text[start:end], start, end) for start, end in grouped if text[start:end].strip()]


def _normalized_locator(locator, source_text, start, end):
    if not isinstance(locator, dict):
        return None
    value = dict(locator)
    if isinstance(value.get("start_char"), int) and isinstance(value.get("end_char"), int):
        base = int(value["start_char"])
        value["start_char"] = base + start
        value["end_char"] = base + end
    value["text_sha256"] = hashlib.sha256(source_text[start:end].encode("utf-8")).hexdigest()
    return value


def _natural_chapter_heading(value):
    match = CHAPTER_TEXT_HEADING.match(str(value))
    if not match:
        return "", 0
    title = re.sub(r"\s+", "", match.group(1))
    return title, match.end()


def _load_script_locators(path, meta):
    filename = str(meta.get("定位文件", "")).strip()
    if not filename:
        return {}, None
    candidate = (Path(path).parent / filename).resolve()
    if candidate.parent != Path(path).parent.resolve() or not candidate.is_file():
        return {}, None
    payload = json.loads(candidate.read_text(encoding="utf-8"))
    entries = {}
    for item in payload.get("segments", []):
        key = (int(item.get("chapter_number", 0)), str(item.get("segment_sha256", "")), int(item.get("occurrence", 0)))
        entries[key] = item.get("locator")
    return entries, candidate


def normalize_voicebook_script(path):
    """Normalize generated script quality while preserving Voicebook locators."""

    path = Path(path)
    lines, _, chapters, _ = _script_sections(path)
    meta, _ = _script_meta(lines)
    locator_entries, locator_path = _load_script_locators(path, meta)
    chapter_sources = meta.get("章节来源") if isinstance(meta.get("章节来源"), dict) else {}
    report = {
        "version": SCRIPT_NORMALIZATION_VERSION,
        "chapters_before": len(chapters),
        "chapters_after": 0,
        "segments_before": 0,
        "segments_after": 0,
        "removed_chapters": [],
        "renamed_chapters": [],
        "removed_style_lines": 0,
        "structural_changed": False,
    }
    normalized = []
    occurrences = {}
    for chapter in chapters:
        segments = []
        for raw in chapter.get("lines", []):
            match = SCRIPT_LINE.fullmatch(raw)
            if not match:
                continue
            tag, text = match.group(1).strip(), match.group(2).strip()
            report["segments_before"] += 1
            key = _segment_locator_key(tag, text)
            occurrence_key = (chapter["number"], key)
            occurrence = occurrences.get(occurrence_key, 0)
            occurrences[occurrence_key] = occurrence + 1
            locator = locator_entries.get((chapter["number"], key, occurrence))
            if _is_stylesheet_text(text):
                report["removed_style_lines"] += 1
                continue
            segments.append({"tag": tag, "text": text, "locator": locator})

        original_title = chapter["title"]
        title = original_title
        inferred_end = 0
        if GENERIC_CHAPTER_TITLE.fullmatch(original_title):
            for segment in segments:
                title, inferred_end = _natural_chapter_heading(segment["text"])
                if title:
                    if inferred_end:
                        old_text = segment["text"]
                        start, end = _trimmed_range(old_text, inferred_end, len(old_text))
                        segment["text"] = old_text[start:end]
                        segment["locator"] = _normalized_locator(segment["locator"], old_text, start, end)
                    break
            if not title:
                title = f"第{len(normalized) + 1}章"

        segments = [segment for segment in segments if segment["text"]]
        text_size = sum(len(segment["text"]) for segment in segments)
        if (
            GENERIC_CHAPTER_TITLE.fullmatch(original_title)
            and original_title.lower() in {"titlepage", "cover", "coverpage"}
            and text_size < 50
        ):
            report["removed_chapters"].append({"number": chapter["number"], "title": original_title})
            continue
        if title != original_title:
            report["renamed_chapters"].append({"number": chapter["number"], "from": original_title, "to": title})

        output_segments = []
        for segment in segments:
            for chunk, start, end in split_script_text(segment["text"]):
                output_segments.append(
                    {
                        "tag": segment["tag"],
                        "text": chunk,
                        "locator": _normalized_locator(segment["locator"], segment["text"], start, end),
                    }
                )
        if not output_segments:
            report["removed_chapters"].append({"number": chapter["number"], "title": original_title})
            continue
        normalized.append(
            {
                "old_number": chapter["number"],
                "number": len(normalized) + 1,
                "title": title,
                "volume": chapter["volume"],
                "source_key": str(chapter_sources.get(str(chapter["number"]), "")),
                "segments": output_segments,
            }
        )

    report["chapters_after"] = len(normalized)
    report["segments_after"] = sum(len(chapter["segments"]) for chapter in normalized)
    report["structural_changed"] = bool(
        report["removed_chapters"]
        or report["renamed_chapters"]
        or any(chapter["old_number"] != chapter["number"] for chapter in normalized)
    )
    if not normalized:
        raise ValueError("剧本清理后没有可朗读章节")

    meta["章节来源"] = {str(chapter["number"]): chapter["source_key"] for chapter in normalized if chapter["source_key"]}
    meta["Talebook规范化"] = {
        "版本": SCRIPT_NORMALIZATION_VERSION,
        "目标字数": SCRIPT_SEGMENT_TARGET_CHARS,
        "最大字数": SCRIPT_SEGMENT_MAX_CHARS,
    }
    meta_lines = yaml.safe_dump(meta, allow_unicode=True, sort_keys=False, default_flow_style=False).rstrip().splitlines()
    role_heading = lines.index("## 角色表")
    first_chapter = chapters[0]["heading_index"] if chapters else len(lines)
    updated = ["---", *meta_lines, "---", "", *lines[role_heading:first_chapter]]
    while updated and not updated[-1].strip():
        updated.pop()
    updated.append("")
    for chapter in normalized:
        heading = f"## 章节 {chapter['number']:04d} | {chapter['title']}"
        if chapter["volume"]:
            heading += f"  # {chapter['volume']}"
        updated.extend((heading, ""))
        updated.extend(f"[{segment['tag']}] {segment['text']}" for segment in chapter["segments"])
        updated.append("")
    _atomic_text(path, "\n".join(updated).rstrip() + "\n")

    if locator_path:
        locator_rows = []
        locator_occurrences = {}
        for chapter in normalized:
            for segment in chapter["segments"]:
                if not segment["locator"]:
                    continue
                key = _segment_locator_key(segment["tag"], segment["text"])
                occurrence_key = (chapter["number"], key)
                occurrence = locator_occurrences.get(occurrence_key, 0)
                locator_occurrences[occurrence_key] = occurrence + 1
                locator_rows.append(
                    {
                        "chapter_number": chapter["number"],
                        "segment_sha256": key,
                        "occurrence": occurrence,
                        "locator": segment["locator"],
                    }
                )
        _atomic_text(
            locator_path,
            json.dumps({"format": "voicebook-locators", "version": 1, "segments": locator_rows}, ensure_ascii=False, indent=2)
            + "\n",
        )
    return report


def create_audiobook_job_plan(mode, created_at=None):
    """Create the compact, persisted plan used to resume and explain a job."""

    timestamp = (created_at or utcnow()).isoformat()
    return {
        "version": 1,
        "chapters": [],
        "phases": {"queue": {"started_at": timestamp}},
        "last_active_phase": "queue",
        "review_status": "pending" if mode == "advanced" else "not_started",
    }


def _copy_job_plan(data, mode):
    stored = (data or {}).get("plan") or {}
    plan = dict(stored)
    plan["chapters"] = [dict(chapter) for chapter in stored.get("chapters", [])]
    plan["phases"] = {key: dict(value) for key, value in stored.get("phases", {}).items()}
    plan.setdefault("review_status", "pending" if mode == "advanced" else "not_started")
    return plan


def _mark_plan_phase(plan, key, state, timestamp=None):
    timestamp = timestamp or utcnow().isoformat()
    phases = plan.setdefault("phases", {})
    phase = dict(phases.get(key) or {})
    if state == "started":
        phase.setdefault("started_at", timestamp)
        plan["last_active_phase"] = key
    elif state == "completed":
        phase.setdefault("started_at", timestamp)
        phase["completed_at"] = timestamp
    phases[key] = phase


def _mark_current_chapter_terminal(data, plan, status):
    try:
        number = int(data.get("current_chapter"))
    except (TypeError, ValueError):
        return
    chapter = next((item for item in plan.get("chapters", []) if int(item.get("number", 0)) == number), None)
    if chapter and chapter.get("status") != "completed":
        chapter["status"] = status


def initialize_audiobook_job_plan(job, workspace):
    """Persist chapter metadata after inspection without retaining script text."""

    data = dict(job.data or {})
    plan = _copy_job_plan(data, job.mode)
    plan.setdefault("version", 1)
    existing = {int(item.get("number", 0)): item for item in plan.get("chapters", [])}
    chapters = []
    for source in workspace.get("chapters", []):
        number = int(source.get("number", 0))
        chapter = dict(existing.get(number) or {})
        chapter.update(
            {
                "number": number,
                "title": str(source.get("title", "")),
                "status": chapter.get("status", "pending"),
                "total_segments": len(source.get("lines") or []),
                "completed_segments": int(chapter.get("completed_segments", 0)),
                "cache_hits": int(chapter.get("cache_hits", 0)),
                "resumed": bool(chapter.get("resumed", False)),
                "duration_ms": int(chapter.get("duration_ms", 0)),
                "size_bytes": int(chapter.get("size_bytes", 0)),
            }
        )
        chapters.append(chapter)
    plan["chapters"] = chapters
    timestamp = utcnow().isoformat()
    _mark_plan_phase(plan, "inspect", "completed", timestamp)
    if job.mode == "quick":
        plan["review_status"] = "skipped"
        _mark_plan_phase(plan, "review", "completed", timestamp)
    else:
        plan["review_status"] = "pending"
        _mark_plan_phase(plan, "review", "started", timestamp)
    data["plan"] = plan
    job.data = data
    return plan


def confirm_audiobook_job_plan(job):
    data = dict(job.data or {})
    plan = _copy_job_plan(data, job.mode)
    plan.setdefault("version", 1)
    plan["review_status"] = "completed"
    _mark_plan_phase(plan, "review", "completed")
    data["plan"] = plan
    job.data = data
    job.progress = max(float(job.progress or 0), 0.20)


def _terminal_phase_status(job, key, plan):
    if job.status not in {"failed", "cancelled"}:
        return None
    active = plan.get("last_active_phase") or "queue"
    if active == key:
        return job.status
    return None


def audiobook_job_plan(job):
    """Build a stable, public plan for new jobs and a useful fallback for old jobs."""

    data = job.data or {}
    stored = data.get("plan") or {}
    plan = _copy_job_plan(data, job.mode)
    chapters = sorted(plan.get("chapters", []), key=lambda item: int(item.get("number", 0)))
    chapters_total = len(chapters)
    chapters_completed = sum(1 for item in chapters if item.get("status") == "completed")
    segments_total = sum(max(0, int(item.get("total_segments", 0))) for item in chapters)
    segments_completed = sum(
        min(max(0, int(item.get("completed_segments", 0))), max(0, int(item.get("total_segments", 0)))) for item in chapters
    )
    cache_hits = sum(max(0, int(item.get("cache_hits", 0))) for item in chapters)

    derived_progress = 0.0
    if job.status == "inspecting":
        derived_progress = 0.05
    elif data.get("inspected"):
        derived_progress = 0.15
    if plan.get("review_status") in {"completed", "skipped"}:
        derived_progress = max(derived_progress, 0.20)
    if segments_total:
        derived_progress = max(derived_progress, 0.20 + 0.75 * segments_completed / segments_total)
    if job.status == "finalizing":
        derived_progress = max(derived_progress, 0.98)
    if job.status == "completed":
        derived_progress = 1.0
    overall_percent = int(max(float(job.progress or 0), derived_progress) * 100 + 0.5000001)
    overall_percent = max(0, min(100, overall_percent))

    phase_times = plan.get("phases", {})
    phase_statuses = {
        "queue": "current" if job.status == "queued" else "done",
        "inspect": "current" if job.status == "inspecting" else ("done" if data.get("inspected") else "pending"),
        "review": "current" if job.status == "awaiting_review" else "pending",
        "generate": "current"
        if job.status == "generating"
        else ("done" if job.status in {"finalizing", "completed"} else "pending"),
        "finalize": "current" if job.status == "finalizing" else ("done" if job.status == "completed" else "pending"),
        "complete": "done" if job.status == "completed" else "pending",
    }
    if plan.get("review_status") == "skipped":
        phase_statuses["review"] = "skipped"
    elif plan.get("review_status") == "completed" or data.get("confirmed"):
        phase_statuses["review"] = "done"
    for key in PLAN_PHASE_KEYS:
        terminal = _terminal_phase_status(job, key, plan)
        if terminal:
            phase_statuses[key] = terminal

    summaries = {
        "queue": {"attempts": int(job.attempts or 0)},
        "inspect": {"chapters_total": chapters_total},
        "review": {"mode": job.mode},
        "generate": {
            "chapters_total": chapters_total,
            "chapters_completed": chapters_completed,
            "segments_total": segments_total,
            "segments_completed": segments_completed,
            "cache_hits": cache_hits,
        },
        "finalize": {"chapters_completed": chapters_completed},
        "complete": {"chapters_completed": chapters_completed},
    }
    phases = []
    for key in PLAN_PHASE_KEYS:
        timing = phase_times.get(key) or {}
        phases.append(
            {
                "key": key,
                "status": phase_statuses[key],
                "started_at": timing.get("started_at"),
                "completed_at": timing.get("completed_at"),
                "summary": summaries[key],
            }
        )
    return {
        "version": int(stored.get("version", 0)),
        "detailed": bool(stored.get("version")),
        "overall_percent": overall_percent,
        "phases": phases,
        "summary": {
            "chapters_total": chapters_total,
            "chapters_completed": chapters_completed,
            "segments_total": segments_total,
            "segments_completed": segments_completed,
            "cache_hits": cache_hits,
            "attempts": int(job.attempts or 0),
        },
        "chapters": chapters,
    }


def save_script_roles(path, roles, revision):
    lines, _, chapters, actual = _script_sections(path)
    if revision and revision != actual:
        raise ValueError("脚本已被其他操作更新，请刷新后重试")
    if not isinstance(roles, list) or not roles:
        raise ValueError("角色表不能为空")
    names = []
    role_lines = []
    keys = ("name", "position", "type", "gender", "age", "region", "description", "speed", "voice_overrides")
    for role in roles:
        values = [str(role.get(key, "")).replace("|", "／").replace("\n", " ").strip() for key in keys]
        if not values[0] or values[0] in names:
            raise ValueError("角色名不能为空或重复")
        if not re.fullmatch(r"自动|x(?:0\.7[5-9]|0\.[89]\d?|1(?:\.\d+)?)", values[7]):
            raise ValueError(f"{values[0]} 的语速无效")
        names.append(values[0])
        role_lines.append(" | ".join(values).rstrip())
    if "旁白" not in names:
        raise ValueError("角色表必须包含旁白")
    role_heading = lines.index("## 角色表")
    role_end = chapters[0]["heading_index"] if chapters else len(lines)
    prefix = lines[: role_heading + 1]
    header = "# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖"
    updated = prefix + [header] + role_lines + [""] + lines[role_end:]
    _atomic_text(Path(path), "\n".join(updated).rstrip() + "\n")
    return read_script_workspace(path)


def save_script_chapter(path, chapter_number, text, revision):
    lines, roles, chapters, actual = _script_sections(path)
    if revision and revision != actual:
        raise ValueError("脚本已被其他操作更新，请刷新后重试")
    chapter = next((item for item in chapters if item["number"] == int(chapter_number)), None)
    if not chapter:
        raise ValueError("章节不存在")
    names = {role["name"] for role in roles} | {"旁白", "?", "音"}
    clean = []
    errors = []
    for line_number, raw in enumerate(str(text).replace("\r", "").split("\n"), start=1):
        line = raw.strip()
        if not line:
            continue
        match = SCRIPT_LINE.fullmatch(line)
        if not match:
            errors.append({"line": line_number, "message": "每行必须使用 [角色] 正文"})
            continue
        tag = match.group(1).strip()
        if tag.split("@", 1)[0] not in names:
            errors.append({"line": line_number, "message": f"未定义角色：{tag}"})
            continue
        clean.append(line)
    if errors:
        raise ScriptValidationError(errors)
    if not clean:
        raise ValueError("章节正文不能为空")
    updated = lines[: chapter["start"]] + [""] + clean + [""] + lines[chapter["end"] :]
    _atomic_text(Path(path), "\n".join(updated).rstrip() + "\n")
    return read_script_workspace(path)


def _atomic_text(path, value):
    temporary = path.with_name(f".{path.name}.tmp")
    temporary.write_text(value, encoding="utf-8")
    temporary.replace(path)


def merge_revision_manifest(base_manifest, generated_manifest):
    """Merge regenerated chapters into a complete revision manifest."""

    if base_manifest.get("format") != "voicebook-project" or base_manifest.get("version") != 2:
        raise ValueError("修订来源 manifest 版本不兼容")
    if generated_manifest.get("format") != "voicebook-project" or generated_manifest.get("version") != 2:
        raise ValueError("修订章节 manifest 版本不兼容")
    replacements = {int(item["number"]): dict(item) for item in generated_manifest.get("chapters", [])}
    if not replacements:
        raise ValueError("修订任务没有生成任何章节")
    chapters = []
    base_numbers = set()
    for source in base_manifest.get("chapters", []):
        number = int(source["number"])
        base_numbers.add(number)
        chapters.append(replacements.pop(number, dict(source)))
    if replacements:
        raise ValueError(f"修订章节不在来源版本中：{','.join(map(str, sorted(replacements)))}")
    if len(base_numbers) != len(chapters):
        raise ValueError("修订来源包含重复章节编号")
    chapters.sort(key=lambda item: int(item["number"]))
    return {
        **base_manifest,
        "engine": generated_manifest.get("engine", base_manifest.get("engine")),
        "script_sha256": generated_manifest.get("script_sha256", ""),
        "title": generated_manifest.get("title", base_manifest.get("title", "")),
        "author": generated_manifest.get("author", base_manifest.get("author", "")),
        "cast": generated_manifest.get("cast", base_manifest.get("cast", {})),
        "selected_chapters": [int(item["number"]) for item in chapters],
        "status": "completed",
        "chapters": chapters,
        "chapter_count": len(chapters),
        "duration_ms": sum(int(item.get("duration_ms", 0)) for item in chapters),
    }


class ScriptValidationError(ValueError):
    def __init__(self, errors):
        super().__init__("章节脚本校验失败")
        self.errors = errors


class VoicebookProcess:
    def __init__(self, storage):
        self.storage = storage

    @property
    def command(self):
        return shlex.split(str(CONF.get("VOICEBOOK_COMMAND", "voicebook-tool")))

    def health(self):
        try:
            result = subprocess.run(self.command + ["--version"], capture_output=True, text=True, timeout=8, check=False)
        except (OSError, subprocess.SubprocessError) as exc:
            return {"ok": False, "reason": str(exc)}
        return {"ok": result.returncode == 0, "version": result.stdout.strip(), "reason": result.stderr.strip()}

    def run(self, job, arguments, on_event, on_control=None):
        job_dir = self.storage.job_dir(job.id)
        job_dir.mkdir(parents=True, exist_ok=True)
        cancel_file = job_dir / "cancel"
        events_file = job_dir / "events.jsonl"
        log_file = job_dir / "stderr.log"
        command = self.command + arguments + ["--progress-format", "jsonl", "--cancel-file", str(cancel_file)]
        with log_file.open("a", encoding="utf-8") as errors, events_file.open("a", encoding="utf-8") as events:
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors, text=True, bufsize=1)
            output = queue.Queue()
            finished = object()

            def read_output():
                try:
                    for line in process.stdout:
                        output.put(line)
                finally:
                    output.put(finished)

            reader = threading.Thread(target=read_output, name=f"voicebook-output-{job.id}", daemon=True)
            reader.start()
            heartbeat = max(0.05, float(CONF.get("AUDIOBOOK_HEARTBEAT_SECONDS", 3)))
            term_after = max(0.0, float(CONF.get("AUDIOBOOK_CANCEL_TERM_SECONDS", 15)))
            kill_after = max(0.0, float(CONF.get("AUDIOBOOK_CANCEL_KILL_SECONDS", 5)))
            cancel_seen_at = None
            term_sent_at = None
            lease_lost = False
            output_finished = False
            control = {}
            last_control_at = 0.0
            while process.poll() is None or not output_finished:
                try:
                    line = output.get(timeout=heartbeat)
                except queue.Empty:
                    line = None
                if line is finished:
                    output_finished = True
                elif line:
                    events.write(line)
                    events.flush()
                    try:
                        on_event(json.loads(line))
                    except (ValueError, TypeError):
                        logging.warning("invalid voicebook event: %s", line[:300])

                now = time.monotonic()
                if on_control and now - last_control_at >= heartbeat:
                    control = on_control() or {}
                    last_control_at = now
                if control.get("lease_owned") is False:
                    lease_lost = True
                    if process.poll() is None:
                        process.terminate()
                if control.get("cancel_requested"):
                    cancel_seen_at = cancel_seen_at or now
                    if process.poll() is None and now - cancel_seen_at >= term_after and term_sent_at is None:
                        process.terminate()
                        term_sent_at = now
                    if process.poll() is None and term_sent_at is not None and now - term_sent_at >= kill_after:
                        process.kill()
            status = process.wait()
        if lease_lost:
            raise RuntimeError("有声书任务租约已丢失，已停止重复进程")
        if cancel_seen_at is not None:
            return 3
        if status not in (0, 3):
            raise RuntimeError(f"voicebook-tool 退出码 {status}")
        return status


class AudiobookScheduler:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def setup(self, book_db, session_maker):
        if getattr(self, "started", False):
            return
        self.book_db = book_db
        self.session_maker = session_maker
        self.storage = AudiobookStorage()
        self.storage.ensure()
        self.worker_id = f"{os.getpid()}-{uuid.uuid4().hex[:8]}"
        self._last_maintenance = 0.0
        self.started = True
        if not CONF.get("AUDIOBOOK_ENABLED", True) or not CONF.get("AUDIOBOOK_RUNNER_ENABLED", True):
            return
        workers = min(3, max(1, int(CONF.get("AUDIOBOOK_WORKERS", 1))))
        for index in range(workers):
            thread = threading.Thread(target=self._loop, name=f"audiobook-worker-{index}", daemon=True)
            thread.start()

    def wake(self):
        return None

    def _loop(self):
        while True:
            try:
                if not self.run_once():
                    time.sleep(1)
            except Exception:
                logging.exception("audiobook scheduler iteration failed")
                time.sleep(2)

    def run_once(self):
        session = self.session_maker()
        try:
            now = utcnow()
            (
                session.query(AudiobookJob)
                .filter(
                    AudiobookJob.status.in_(("inspecting", "generating", "finalizing")),
                    AudiobookJob.lease_until.isnot(None),
                    AudiobookJob.lease_until < now,
                )
                .update(
                    {
                        AudiobookJob.status: "queued",
                        AudiobookJob.phase: "QUEUED",
                        AudiobookJob.lease_owner: "",
                        AudiobookJob.last_event_seq: -1,
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            self._run_maintenance()
            job = (
                session.query(AudiobookJob)
                .filter(AudiobookJob.status == "queued")
                .order_by(AudiobookJob.priority.desc(), AudiobookJob.create_time.asc())
                .first()
            )
            if not job:
                return False
            if not self._has_capacity():
                logging.warning("audiobook scheduler paused: free disk space is below AUDIOBOOK_MIN_FREE_GB")
                return False
            job_id = job.id
            status = "inspecting" if not job.data.get("inspected") else "generating"
            phase = "INSPECTING" if not job.data.get("inspected") else "GENERATING"
            claimed = (
                session.query(AudiobookJob)
                .filter(AudiobookJob.id == job_id, AudiobookJob.status == "queued")
                .update(
                    {
                        AudiobookJob.status: status,
                        AudiobookJob.phase: phase,
                        AudiobookJob.lease_owner: self.worker_id,
                        AudiobookJob.lease_until: now
                        + datetime.timedelta(seconds=max(5, int(CONF.get("AUDIOBOOK_LEASE_SECONDS", 30)))),
                        AudiobookJob.started_at: job.started_at or now,
                        AudiobookJob.update_time: now,
                        AudiobookJob.attempts: AudiobookJob.attempts + 1,
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            if not claimed:
                return True
        finally:
            session.close()
        self._process(job_id)
        return True

    def _has_capacity(self):
        minimum = max(0.0, float(CONF.get("AUDIOBOOK_MIN_FREE_GB", 5))) * 1024**3
        return shutil.disk_usage(self.storage.root).free >= minimum

    def _run_maintenance(self):
        interval = max(60, int(CONF.get("AUDIOBOOK_MAINTENANCE_SECONDS", 3600)))
        now = time.monotonic()
        if now - self._last_maintenance < interval:
            return
        self._last_maintenance = now
        wall_clock = time.time()
        cache_cutoff = wall_clock - max(1, int(CONF.get("AUDIOBOOK_CACHE_DAYS", 30))) * 86400
        for path in (self.storage.root / "cache").rglob("*"):
            if path.is_file() and path.stat().st_mtime < cache_cutoff:
                path.unlink(missing_ok=True)

        failed_cutoff = utcnow() - datetime.timedelta(days=max(1, int(CONF.get("AUDIOBOOK_FAILED_TEMP_DAYS", 7))))
        session = self.session_maker()
        try:
            jobs = (
                session.query(AudiobookJob)
                .filter(
                    AudiobookJob.status.in_(("failed", "cancelled")),
                    AudiobookJob.update_time < failed_cutoff,
                )
                .all()
            )
            for job in jobs:
                directory = self.storage.job_dir(job.id)
                if not directory.is_dir():
                    continue
                for path in directory.iterdir():
                    if path.name not in {"events.jsonl", "stderr.log"}:
                        if path.is_dir():
                            shutil.rmtree(path)
                        else:
                            path.unlink(missing_ok=True)
        finally:
            session.close()

    def _control(self, job_id):
        session = self.session_maker()
        try:
            job = (
                session.query(AudiobookJob)
                .filter(
                    AudiobookJob.id == int(job_id),
                    AudiobookJob.lease_owner == self.worker_id,
                    AudiobookJob.status.in_(("inspecting", "generating", "finalizing")),
                )
                .first()
            )
            if not job:
                return {"lease_owned": False, "cancel_requested": False}
            job.lease_until = utcnow() + datetime.timedelta(seconds=max(5, int(CONF.get("AUDIOBOOK_LEASE_SECONDS", 30))))
            job.update_time = utcnow()
            state = {
                "lease_owned": True,
                "cancel_requested": bool(job.cancel_requested),
                "cancel_requested_at": job.cancel_requested_at,
            }
            session.commit()
            return state
        finally:
            session.close()

    @staticmethod
    def _configured_voice(config, role, engine):
        values = config.get("protagonist_voices") or {}
        if not isinstance(values, dict):
            return ""
        candidate = (
            values.get(role.get("name"))
            or values.get(role.get("gender"))
            or values.get({"男": "male", "女": "female"}.get(role.get("gender"), ""))
            or values.get("default")
        )
        if isinstance(candidate, dict):
            candidate = candidate.get(engine)
        return str(candidate or "").strip()

    def _apply_generation_defaults(self, script, job, edition):
        workspace = read_script_workspace(script)
        roles = workspace["characters"]
        speed = str((job.config or {}).get("speed", "x1.0"))
        for role in roles:
            role["speed"] = speed
            if role.get("position") != "主角":
                continue
            voice = self._configured_voice(job.config or {}, role, edition.engine)
            if not voice:
                continue
            overrides = {}
            for token in re.split(r"[;；]", role.get("voice_overrides", "")):
                if "=" in token:
                    key, value = (part.strip() for part in token.split("=", 1))
                    if key and value:
                        overrides[key] = value
            overrides[edition.engine] = voice
            role["voice_overrides"] = "; ".join(f"{key}={value}" for key, value in overrides.items())
        save_script_roles(script, roles, workspace["revision"])

    def _source_path(self, job, job_dir):
        formats = {str(item).upper() for item in (self.book_db.new_api.formats(job.book_id) or [])}
        if "EPUB" in formats:
            return Path(self.book_db.format_abspath(job.book_id, "EPUB", index_is_id=True))
        if "TXT" not in formats:
            raise ValueError("生成有声书只支持 EPUB 或 TXT")
        source = Path(self.book_db.format_abspath(job.book_id, "TXT", index_is_id=True))
        converted = job_dir / "source.epub"
        if not converted.is_file():
            ok = ConvertService().do_ebook_convert(str(source), str(converted), str(job_dir / "ebook-convert.log"))
            if not ok:
                raise RuntimeError("TXT 转规范 EPUB 失败")
        return converted

    def _process(self, job_id):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            edition = session.get(AudiobookEdition, job.edition_id)
            job_dir = self.storage.job_dir(job.id)
            edition_dir = self.storage.edition_dir(edition.id)
            job_dir.mkdir(parents=True, exist_ok=True)
            edition_dir.mkdir(parents=True, exist_ok=True)
            script = edition_dir / "book.script"
            source = self._source_path(job, job_dir)
            process = VoicebookProcess(self.storage)

            def on_event(event):
                self._consume_event(job_id, event)

            def on_control():
                return self._control(job_id)

            if not job.data.get("inspected"):
                args = ["inspect", str(source), "-o", str(script)]
                if job.chapter_selection:
                    args.extend(("--chapters", job.chapter_selection))
                status = process.run(job, args, on_event, on_control)
                if status == 3:
                    self._finish_cancelled(job_id)
                    return
                session.expire_all()
                job = session.get(AudiobookJob, job_id)
                edition = session.get(AudiobookEdition, job.edition_id)
                normalization = normalize_voicebook_script(script)
                job.data = {**job.data, "inspected": True, "normalization": normalization}
                edition.script_path = self.storage.relative(script)
                self._apply_generation_defaults(script, job, edition)
                workspace = read_script_workspace(script)
                initialize_audiobook_job_plan(job, workspace)
                job.progress = max(float(job.progress or 0), 0.15)
                job.update_time = utcnow()
                if job.mode == "advanced":
                    job.status = "awaiting_review"
                    job.phase = "AWAITING_REVIEW"
                    session.commit()
                    return
                job.progress = max(float(job.progress or 0), 0.20)
                session.commit()

            job.status = "generating"
            job.phase = "GENERATING"
            job.last_event_seq = -1
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            _mark_plan_phase(plan, "generate", "started")
            data["plan"] = plan
            job.data = data
            job.progress = max(float(job.progress or 0), 0.20)
            session.commit()
            revision = (job.data or {}).get("revision") or {}
            baseline_manifest = None
            args = ["generate", str(script), "-o", str(edition_dir), "--engine", edition.engine]
            if revision:
                if revision.get("scope") == "chapter":
                    manifest_path = edition_dir / "manifest.v2.json"
                    baseline_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                    args.extend(("--chapters", str(int(revision["chapter_number"]))))
            else:
                args.append("--resume")
            status = process.run(job, args, on_event, on_control)
            if status == 3:
                self._finish_cancelled(job_id)
                return
            if baseline_manifest is not None:
                manifest_path = edition_dir / "manifest.v2.json"
                generated_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
                merged_manifest = merge_revision_manifest(baseline_manifest, generated_manifest)
                _atomic_text(manifest_path, json.dumps(merged_manifest, ensure_ascii=False, indent=2) + "\n")
            session.expire_all()
            job = session.get(AudiobookJob, job_id)
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            timestamp = utcnow().isoformat()
            _mark_plan_phase(plan, "generate", "completed", timestamp)
            _mark_plan_phase(plan, "finalize", "started", timestamp)
            data["plan"] = plan
            job.data = data
            job.status = "finalizing"
            job.phase = "FINALIZING"
            job.progress = max(float(job.progress or 0), 0.98)
            job.update_time = utcnow()
            session.commit()
            self._finalize(job_id)
        except Exception as exc:
            logging.exception("audiobook job %s failed", job_id)
            session.rollback()
            job = session.get(AudiobookJob, job_id)
            if job:
                data = dict(job.data or {})
                plan = _copy_job_plan(data, job.mode)
                plan["last_active_phase"] = {
                    "INSPECTING": "inspect",
                    "AWAITING_REVIEW": "review",
                    "GENERATING": "generate",
                    "FINALIZING": "finalize",
                }.get(job.phase, plan.get("last_active_phase", "queue"))
                _mark_current_chapter_terminal(data, plan, "failed")
                data["plan"] = plan
                job.data = data
                job.status = "failed"
                job.phase = "FAILED"
                job.error_code = type(exc).__name__
                job.error_message = str(exc)[:4000]
                job.lease_owner = ""
                job.lease_until = None
                job.finished_at = utcnow()
                job.update_time = utcnow()
                session.commit()
        finally:
            session.close()

    def _consume_event(self, job_id, event):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            if not job:
                return
            try:
                sequence = int(event.get("seq"))
            except (TypeError, ValueError):
                sequence = None
            if sequence is not None and sequence <= int(job.last_event_seq if job.last_event_seq is not None else -1):
                return
            if sequence is not None:
                job.last_event_seq = sequence
            name = event.get("event")
            timestamp = str(event.get("at") or utcnow().isoformat())
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            if name == "phase_started":
                job.phase = str(event.get("job_phase", job.phase))
                phase_key = {"INSPECTING": "inspect", "GENERATING": "generate"}.get(job.phase)
                if phase_key:
                    _mark_plan_phase(plan, "queue", "completed", timestamp)
                    _mark_plan_phase(plan, phase_key, "started", timestamp)
                    job.progress = max(float(job.progress or 0), 0.05 if phase_key == "inspect" else 0.20)
            public_event_keys = {
                "seq",
                "event",
                "at",
                "job_phase",
                "chapter_number",
                "title",
                "total_segments",
                "segment_index",
                "cache_hit",
                "duration_ms",
                "size_bytes",
                "resumed",
                "code",
                "message",
                "retryable",
            }
            data["last_event"] = {key: value for key, value in event.items() if key in public_event_keys}
            chapters = plan.setdefault("chapters", [])

            def chapter_record():
                try:
                    number = int(event.get("chapter_number"))
                except (TypeError, ValueError):
                    return None
                chapter = next((item for item in chapters if int(item.get("number", 0)) == number), None)
                if chapter is None:
                    chapter = {
                        "number": number,
                        "title": str(event.get("title", "")),
                        "status": "pending",
                        "total_segments": 0,
                        "completed_segments": 0,
                        "cache_hits": 0,
                        "resumed": False,
                        "duration_ms": 0,
                        "size_bytes": 0,
                    }
                    chapters.append(chapter)
                return chapter

            if name == "chapter_started":
                data["current_chapter"] = event.get("chapter_number")
                data["chapter_segments"] = event.get("total_segments", 0)
                data["completed_segments"] = 0
                chapter = chapter_record()
                if chapter is not None:
                    chapter["title"] = str(event.get("title") or chapter.get("title", ""))
                    chapter["status"] = "generating"
                    chapter["total_segments"] = max(0, int(event.get("total_segments", 0)))
                    chapter["completed_segments"] = 0
                    chapter["cache_hits"] = 0
                    chapter["started_at"] = timestamp
            elif name == "segment_completed":
                data["completed_segments"] = int(data.get("completed_segments", 0)) + 1
                chapter = chapter_record()
                if chapter is not None:
                    total = max(0, int(chapter.get("total_segments", 0)))
                    completed = int(chapter.get("completed_segments", 0)) + 1
                    chapter["completed_segments"] = min(completed, total) if total else completed
                    if event.get("cache_hit"):
                        chapter["cache_hits"] = int(chapter.get("cache_hits", 0)) + 1
            elif name == "chapter_completed":
                chapter = chapter_record()
                if chapter is not None:
                    total = max(
                        int(chapter.get("total_segments", 0)),
                        int(event.get("segment_count", 0) or 0),
                    )
                    chapter.update(
                        {
                            "status": "completed",
                            "total_segments": total,
                            "completed_segments": total,
                            "resumed": bool(event.get("resumed", False)),
                            "duration_ms": max(0, int(event.get("duration_ms", 0) or 0)),
                            "size_bytes": max(0, int(event.get("size_bytes", 0) or 0)),
                            "completed_at": timestamp,
                        }
                    )
            elif name == "completed" and job.status == "generating":
                _mark_plan_phase(plan, "generate", "completed", timestamp)
                job.progress = max(float(job.progress or 0), 0.95)
            data["plan"] = plan
            job.data = data
            summary = audiobook_job_plan(job)["summary"]
            if summary["segments_total"]:
                progress = 0.20 + 0.75 * summary["segments_completed"] / summary["segments_total"]
                job.progress = max(float(job.progress or 0), min(0.95, progress))
            if "progress" in event:
                job.progress = max(float(job.progress or 0), max(0.0, min(1.0, float(event["progress"]))))
            job.lease_until = utcnow() + datetime.timedelta(seconds=max(5, int(CONF.get("AUDIOBOOK_LEASE_SECONDS", 30))))
            job.update_time = utcnow()
            session.commit()
        finally:
            session.close()

    def _finish_cancelled(self, job_id):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            plan["last_active_phase"] = plan.get("last_active_phase", "queue")
            _mark_current_chapter_terminal(data, plan, "cancelled")
            data["plan"] = plan
            job.data = data
            job.status = "cancelled"
            job.phase = "CANCELLED"
            job.lease_owner = ""
            job.lease_until = None
            job.finished_at = utcnow()
            job.update_time = utcnow()
            session.commit()
        finally:
            session.close()

    def _finalize(self, job_id):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            edition = session.get(AudiobookEdition, job.edition_id)
            edition_dir = self.storage.edition_dir(edition.id)
            manifest_path = edition_dir / "manifest.v2.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("format") != "voicebook-project" or manifest.get("version") != 2:
                raise ValueError("Voicebook manifest 版本不兼容")
            session.query(AudiobookChapter).filter(AudiobookChapter.edition_id == edition.id).delete()
            for record in manifest.get("chapters", []):
                audio = self.storage.resolve(f"editions/{edition.id}/{record['audio']}", must_exist=True)
                timeline = self.storage.resolve(f"editions/{edition.id}/{record['timeline']}", must_exist=True)
                chapter = AudiobookChapter(
                    edition_id=edition.id,
                    source_key=str(record.get("source_key", "")),
                    number=int(record["number"]),
                    title=str(record.get("title", "")),
                    audio_path=self.storage.relative(audio),
                    timeline_path=self.storage.relative(timeline),
                    duration_ms=int(record.get("duration_ms", 0)),
                    size_bytes=int(record.get("size_bytes", 0)),
                    content_hash=str(record.get("sha256", "")),
                    episode_guid=stable_json_hash([stable_site_uuid(), job.book_id, record.get("source_key")]),
                )
                session.add(chapter)
            edition.manifest_path = self.storage.relative(manifest_path)
            edition.chapter_count = len(manifest.get("chapters", []))
            edition.completed_count = edition.chapter_count
            edition.duration_ms = int(manifest.get("duration_ms", 0))
            edition.size_bytes = sum(int(item.get("size_bytes", 0)) for item in manifest.get("chapters", []))
            existing = (
                session.query(AudiobookEdition)
                .filter(AudiobookEdition.book_id == edition.book_id, AudiobookEdition.status == "published")
                .first()
            )
            complete = bool((job.data or {}).get("revision")) or not bool(job.chapter_selection)
            if complete and not existing:
                edition.status = "published"
                edition.published_at = utcnow()
            else:
                edition.status = "ready" if complete else "partial"
            edition.update_time = utcnow()
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            timestamp = utcnow().isoformat()
            _mark_plan_phase(plan, "finalize", "completed", timestamp)
            _mark_plan_phase(plan, "complete", "completed", timestamp)
            data["plan"] = plan
            job.data = data
            job.status = "completed"
            job.phase = "COMPLETED"
            job.progress = 1.0
            job.lease_owner = ""
            job.lease_until = None
            job.finished_at = utcnow()
            job.update_time = utcnow()
            session.commit()
        finally:
            session.close()


def request_cancel(storage, job):
    job.cancel_requested = True
    job.cancel_requested_at = job.cancel_requested_at or utcnow()
    job.update_time = utcnow()
    directory = storage.job_dir(job.id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "cancel").touch()


def reset_for_retry(storage, job):
    cancel = storage.job_dir(job.id) / "cancel"
    cancel.unlink(missing_ok=True)
    job.cancel_requested = False
    job.cancel_requested_at = None
    job.status = "queued"
    job.phase = "QUEUED"
    data = dict(job.data or {})
    plan = _copy_job_plan(data, job.mode)
    _mark_plan_phase(plan, "queue", "started")
    data["plan"] = plan
    job.data = data
    job.error_code = ""
    job.error_message = ""
    job.last_event_seq = -1
    job.lease_owner = ""
    job.lease_until = None
    job.finished_at = None
    job.update_time = utcnow()
