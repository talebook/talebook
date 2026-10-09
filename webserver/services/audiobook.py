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
from pathlib import Path, PurePosixPath

from sqlalchemy import func
from sqlalchemy.orm import object_session

from webserver import loader
from webserver.models import AudiobookChapter, AudiobookEdition, AudiobookJob
from webserver.services.convert import ConvertService


CONF = loader.get_settings()
ACTIVE_JOB_STATUSES = {"queued", "inspecting", "awaiting_review", "generating", "finalizing"}
ROLE_COLUMNS = 9
CHAPTER_HEADING = re.compile(r"^##\s+章节\s+(\d+)\s*\|\s*(.*?)(?:\s+#\s*(.+))?$")
SCRIPT_LINE = re.compile(r"^\[([^\]]+)\]\s+(.+)$")
PLAN_PHASE_KEYS = ("queue", "inspect", "review", "generate", "finalize", "complete")
NORMALIZATION_REPORT_KEYS = (
    "version",
    "chapters_before",
    "chapters_after",
    "segments_before",
    "segments_after",
    "removed_chapter_count",
    "renamed_chapter_count",
    "removed_noncontent_block_count",
    "locator_unmapped_count",
)
PROGRESS_SCHEMA = "voicebook-progress.v2"
PROGRESS_COUNTS = (
    "total",
    "completed",
    "active",
    "retrying",
    "failed",
    "cancelled",
    "pending",
    "queued",
    "active_requests",
    "concurrency",
    "retries",
    "cache_hits",
    "chapters_total",
    "chapters_completed",
    "requests_started",
)
PROGRESS_STATUSES = {
    "running",
    "rate_queued",
    "rate_limit_retry",
    "retrying",
    "cooling_down",
    "cancelling",
    "completed",
    "failed",
    "cancelled",
}
WAIT_REASONS = {
    "request_interval",
    "fair_queue",
    "global_concurrency",
    "starting_request",
    "request_budget",
    "network_error",
    "provider_error",
    "clock_skew_adjustment",
    "shared_cooldown",
    "rate_limited",
}


def _progress_snapshot(value):
    """Keep supported, bounded v2 fields; reject inconsistent absolute counts."""
    if not isinstance(value, dict) or value.get("schema") != PROGRESS_SCHEMA or value.get("unit") != "speech_segment":
        return None
    if value.get("status") not in PROGRESS_STATUSES:
        return None
    if value.get("stage") not in {"preparing", "synthesizing", "assembling", "finalizing", "completed"}:
        return None
    result = {key: value[key] for key in ("schema", "unit", "status", "stage")}
    for key in PROGRESS_COUNTS:
        count = value.get(key, 0)
        if isinstance(count, bool) or not isinstance(count, int) or not 0 <= count <= 1_000_000_000:
            return None
        result[key] = count
    if result["total"] != sum(
        result[key] for key in ("completed", "active", "retrying", "failed", "cancelled", "pending", "queued")
    ):
        return None
    result["updated_at"] = str(value.get("updated_at") or "")[:80]
    wait_seconds = value.get("wait_seconds", 0)
    if isinstance(wait_seconds, (int, float)) and not isinstance(wait_seconds, bool) and 0 <= wait_seconds <= 86400:
        result["wait_seconds"] = wait_seconds
    waiting = value.get("waiting")
    result["waiting"] = None
    if isinstance(waiting, dict):
        retry_count = waiting.get("retry_count", 0)
        result["waiting"] = {
            "reason": waiting.get("reason") if waiting.get("reason") in WAIT_REASONS else "unknown",
            "retry_count": retry_count if isinstance(retry_count, int) and 0 <= retry_count <= 10 else 0,
            "next_request_at": str(waiting.get("next_request_at") or "")[:80] or None,
        }
    budget = value.get("edge_budget")
    if isinstance(budget, dict):
        result["edge_budget"] = {
            key: item
            for key, item in budget.items()
            if key in {"requests", "rate_limits", "retries", "cooldowns", "cooldown_until"}
            and isinstance(item, (int, float))
            and not isinstance(item, bool)
            and 0 <= item <= 1_000_000_000_000
        }
    return result


def _reset_generation_progress(job):
    data = dict(job.data or {})
    for key in (
        "generation",
        "voicebook_invocation",
        "last_event",
        "current_chapter",
        "completed_segments",
        "chapter_segments",
    ):
        data.pop(key, None)
    plan = _copy_job_plan(data, job.mode)
    for key in ("generate", "finalize", "complete"):
        plan.get("phases", {}).pop(key, None)
    for chapter in plan.get("chapters", []):
        chapter.update(status="pending", completed_segments=0, cache_hits=0, resumed=False, duration_ms=0, size_bytes=0)
        for key in ("started_at", "completed_at", "completed_indices"):
            chapter.pop(key, None)
    data["plan"] = plan
    job.data = data
    job.progress = 0.0
    job.last_event_seq = -1


def audiobook_job_generation(job):
    """Public generation state is independent of the scheduler's lease heartbeat."""
    data = job.data or {}
    invocation = data.get("voicebook_invocation") or {}
    snapshot = data.get("generation")
    connection = "idle"
    if job.status in {"inspecting", "generating"}:
        connection = "unknown"
        received = invocation.get("last_received_at") or invocation.get("started_at")
        if received:
            try:
                age = (
                    datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(received)
                ).total_seconds()
                connection = "stale" if age > max(3, float(CONF.get("AUDIOBOOK_PROGRESS_STALE_SECONDS", 15))) else "live"
            except (TypeError, ValueError):
                pass
        if job.lease_until and job.lease_until < utcnow():
            connection = "interrupted"
    if data.get("generation_interrupted"):
        connection = "interrupted"
    return {
        "available": bool(snapshot),
        "protocol_version": invocation.get("version", 1),
        "task_id": invocation.get("task_id"),
        "attempt_id": invocation.get("attempt_id"),
        "seq": job.last_event_seq,
        "connection": connection,
        "snapshot": snapshot,
    }


def utcnow():
    return datetime.datetime.now()


def stable_json_hash(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


def stable_site_uuid():
    """Return a non-secret, stable identity scoped to this Talebook instance."""

    secret = str(CONF.get("cookie_secret", "talebook"))
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"talebook-instance:{secret}"))


def _bounded_normalization_report(value):
    """Keep only bounded counters from Voicebook's optional inspect report."""

    if not isinstance(value, dict):
        return {}
    report = {}
    for key in NORMALIZATION_REPORT_KEYS:
        item = value.get(key)
        if isinstance(item, bool) or not isinstance(item, int):
            continue
        report[key] = max(0, min(item, 1_000_000_000))
    return report


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
    job.progress = 0.0


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
    chapters = sorted(
        ({key: value for key, value in item.items() if key != "completed_indices"} for item in plan.get("chapters", [])),
        key=lambda item: int(item.get("number", 0)),
    )
    chapters_total = len(chapters)
    chapters_completed = sum(1 for item in chapters if item.get("status") == "completed")
    segments_total = sum(max(0, int(item.get("total_segments", 0))) for item in chapters)
    segments_completed = sum(
        min(max(0, int(item.get("completed_segments", 0))), max(0, int(item.get("total_segments", 0)))) for item in chapters
    )
    cache_hits = sum(max(0, int(item.get("cache_hits", 0))) for item in chapters)

    # There is no meaningful denominator across inspect, human review and publication.
    overall_percent = 100 if job.status == "completed" else None

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
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary.write_text(value, encoding="utf-8")
    temporary.replace(path)


def _manifest_chapter_map(manifest, label):
    if manifest.get("format") != "voicebook-project" or manifest.get("version") != 2:
        raise ValueError(f"{label}版本不兼容")
    records = manifest.get("chapters")
    if not isinstance(records, list) or not records:
        raise ValueError(f"{label}没有章节")
    chapters = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError(f"{label}章节格式错误")
        try:
            number = int(record["number"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"{label}章节编号无效") from exc
        if number in chapters:
            raise ValueError(f"{label}包含重复章节编号：{number}")
        chapters[number] = dict(record)
    return chapters


def _safe_manifest_asset(root, value, label):
    relative = PurePosixPath(str(value or ""))
    if not relative.parts or relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts):
        raise ValueError(f"{label}路径无效")
    root = Path(root).resolve()
    candidate = (root / Path(*relative.parts)).resolve()
    try:
        candidate.relative_to(root)
    except ValueError as exc:
        raise ValueError(f"{label}路径越界") from exc
    if not candidate.is_file():
        raise FileNotFoundError(candidate)
    return relative, candidate


def merge_revision_manifest(base_manifest, generated_manifest):
    """Merge regenerated chapters into a complete revision manifest."""

    base_records = _manifest_chapter_map(base_manifest, "修订来源 manifest")
    replacements = _manifest_chapter_map(generated_manifest, "修订章节 manifest")
    chapters = []
    for source in base_manifest.get("chapters", []):
        number = int(source["number"])
        chapters.append(replacements.pop(number, dict(source)))
    if replacements:
        raise ValueError(f"修订章节不在来源版本中：{','.join(map(str, sorted(replacements)))}")
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
        "chapter_count": len(base_records),
        "duration_ms": sum(int(item.get("duration_ms", 0)) for item in chapters),
    }


class ScriptValidationError(ValueError):
    def __init__(self, errors):
        super().__init__("章节脚本校验失败")
        self.errors = errors


class AudiobookLeaseLost(RuntimeError):
    """A stale invocation must stop without writing another worker's state."""


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

    def progress_version(self):
        health = self.health()
        match = re.search(r"\b(\d+)\.(\d+)\.(\d+)\b", health.get("version", ""))
        return 2 if health.get("ok") and match and tuple(map(int, match.groups())) >= (0, 8, 0) else 1

    def generation_options(self, engine):
        """Every worker uses the same persistent Edge budget, including retries."""
        configured = str(CONF.get("VOICEBOOK_EDGE_BUDGET_PATH") or "")
        budget = Path(configured).expanduser() if configured else self.storage.root / "rate-limits/edge-budget.sqlite3"
        if not budget.is_absolute():
            raise ValueError("VOICEBOOK_EDGE_BUDGET_PATH 必须是绝对路径")
        options = ["--edge-budget-path", str(budget.resolve())]
        settings = {
            "--concurrency": ("VOICEBOOK_EDGE_CONCURRENCY", 1) if engine == "edgetts" else ("VOICEBOOK_QWEN_CONCURRENCY", 2),
            "--edge-max-concurrency": ("VOICEBOOK_EDGE_MAX_CONCURRENCY", 1),
            "--edge-interval": ("VOICEBOOK_EDGE_INTERVAL", 5),
            "--max-retries": ("VOICEBOOK_MAX_RETRIES", 2),
            "--retry-backoff": ("VOICEBOOK_RETRY_BACKOFF", 1),
            "--max-wait-seconds": ("VOICEBOOK_MAX_WAIT_SECONDS", 300),
            "--edge-cooldown-seconds": ("VOICEBOOK_EDGE_COOLDOWN_SECONDS", 30),
            "--edge-request-limit": ("VOICEBOOK_EDGE_REQUEST_LIMIT", 0),
            "--edge-window-seconds": ("VOICEBOOK_EDGE_WINDOW_SECONDS", 3600),
        }
        for option, (key, default) in settings.items():
            options.extend((option, str(CONF.get(key, default))))
        return options

    def run(self, job, arguments, on_event, on_control=None):
        job_dir = self.storage.job_dir(job.id)
        job_dir.mkdir(parents=True, exist_ok=True)
        cancel_file = job_dir / "cancel"
        events_file = job_dir / "events.jsonl"
        log_file = job_dir / "stderr.log"
        command = self.command + arguments + ["--progress-format", "jsonl", "--cancel-file", str(cancel_file)]
        invocation = (getattr(job, "data", None) or {}).get("voicebook_invocation") or {}
        if invocation.get("version") == 2:
            command.extend(
                ("--progress-version", "2", "--task-id", invocation["task_id"], "--attempt-id", invocation["attempt_id"])
            )
            if arguments[0] == "generate":
                engine = arguments[arguments.index("--engine") + 1] if "--engine" in arguments else "edgetts"
                command.extend(self.generation_options(engine))
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
                        logging.warning("invalid voicebook event for job %s", job.id)

                now = time.monotonic()
                if on_control and now - last_control_at >= heartbeat:
                    control = on_control() or {}
                    last_control_at = now
                if control.get("lease_owned") is False:
                    lease_lost = True
                    if process.poll() is None and term_sent_at is None:
                        process.terminate()
                        term_sent_at = now
                    if process.poll() is None and now - term_sent_at >= kill_after:
                        process.kill()
                if control.get("cancel_requested"):
                    cancel_seen_at = cancel_seen_at or now
                    if process.poll() is None and now - cancel_seen_at >= term_after and term_sent_at is None:
                        process.terminate()
                        term_sent_at = now
                    if process.poll() is None and term_sent_at is not None and now - term_sent_at >= kill_after:
                        process.kill()
            status = process.wait()
            reader.join()
            process.stdout.close()
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
            expired = (
                session.query(AudiobookJob)
                .filter(
                    AudiobookJob.status.in_(("inspecting", "generating", "finalizing")),
                    AudiobookJob.lease_until.isnot(None),
                    AudiobookJob.lease_until < now,
                )
                .all()
            )
            for job in expired:
                # Recovery competes with lease heartbeats and other workers: compare again on write.
                conditions = self._job_write_conditions(job)
                with session.no_autoflush:
                    _reset_generation_progress(job)
                    reset_data = {**job.data, "generation_interrupted": True}
                    session.expire(job)
                    session.query(AudiobookJob).filter(
                        *conditions,
                    ).update(
                        {
                            AudiobookJob.data: reset_data,
                            AudiobookJob.status: "queued",
                            AudiobookJob.phase: "QUEUED",
                            AudiobookJob.lease_owner: "",
                            AudiobookJob.lease_until: None,
                            AudiobookJob.progress: 0.0,
                            AudiobookJob.last_event_seq: -1,
                        },
                        synchronize_session=False,
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
            now = utcnow()
            conditions = self._job_write_conditions(job)
            identity = (self.worker_id, int(job.attempts or 0) + 1, self._job_identity(job)[2])
            status = "inspecting" if not job.data.get("inspected") else "generating"
            phase = "INSPECTING" if not job.data.get("inspected") else "GENERATING"
            claimed = (
                session.query(AudiobookJob)
                .filter(*conditions)
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
        self._process(job_id, identity)
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

    @staticmethod
    def _job_identity(job):
        invocation = (job.data or {}).get("voicebook_invocation") or {}
        return job.lease_owner, int(job.attempts or 0), invocation.get("attempt_id")

    def _owned_job(self, session, job_id, identity=None, *, allow_cancel=False):
        job = session.get(AudiobookJob, job_id)
        if (
            not job
            or job.lease_owner != self.worker_id
            or job.status not in {"inspecting", "generating", "finalizing"}
            or not job.lease_until
            or job.lease_until <= utcnow()
            or (identity is not None and self._job_identity(job) != identity)
            or (job.cancel_requested and not allow_cancel)
        ):
            raise AudiobookLeaseLost("有声书任务租约或尝试已丢失，已停止旧调用")
        return job

    def _worker_write_conditions(self, session, job):
        conditions = (*self._job_write_conditions(job), AudiobookJob.lease_until > utcnow())
        if session.get_bind().dialect.name == "sqlite":
            # SQLite executes this clock after a blocked UPDATE resumes. Its local
            # timezone matches the existing naive datetime.now() lease storage.
            conditions += (AudiobookJob.lease_until > func.strftime("%Y-%m-%d %H:%M:%f", "now", "localtime"),)
        return conditions

    @staticmethod
    def _write_worker_job(session, job, conditions, values):
        with session.no_autoflush:
            session.expire(job)
            updated = session.query(AudiobookJob).filter(*conditions).update(values, synchronize_session=False)
        if not updated:
            session.rollback()
            raise AudiobookLeaseLost("有声书任务写入竞争失败，已停止旧调用")

    def _control(self, job_id, identity=None):
        session = self.session_maker()
        checked_identity = None
        try:
            job = self._owned_job(session, int(job_id), identity, allow_cancel=True)
            checked_identity = self._job_identity(job)
            state = {
                "lease_owned": True,
                "cancel_requested": bool(job.cancel_requested),
                "cancel_requested_at": job.cancel_requested_at,
            }
            self._write_worker_job(
                session,
                job,
                self._worker_write_conditions(session, job),
                {
                    AudiobookJob.lease_until: utcnow()
                    + datetime.timedelta(seconds=max(5, int(CONF.get("AUDIOBOOK_LEASE_SECONDS", 30)))),
                    AudiobookJob.update_time: utcnow(),
                },
            )
            session.commit()
            return state
        except AudiobookLeaseLost:
            if checked_identity is not None:
                # A progress event or user cancellation can win this UPDATE while
                # the same invocation remains valid. Re-read its identity without
                # adopting a replacement claim/attempt or renewing a stale lease.
                session.expire_all()
                try:
                    current = self._owned_job(session, int(job_id), checked_identity, allow_cancel=True)
                except AudiobookLeaseLost:
                    pass
                else:
                    return {
                        "lease_owned": True,
                        "cancel_requested": bool(current.cancel_requested),
                        "cancel_requested_at": current.cancel_requested_at,
                    }
            return {"lease_owned": False, "cancel_requested": False}
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

    def _commit_revision_output(self, job, edition, output_dir):
        """Validate and commit a revision attempt without mutating its baseline manifest."""

        edition_dir = self.storage.edition_dir(edition.id)
        baseline_path = self.storage.resolve(edition.manifest_path, must_exist=True)
        try:
            baseline_path.relative_to(edition_dir.resolve())
        except ValueError as exc:
            raise ValueError("修订来源 manifest 不属于候选版本") from exc
        generated_path = Path(output_dir) / "manifest.v2.json"
        baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
        generated = json.loads(generated_path.read_text(encoding="utf-8"))
        baseline_chapters = _manifest_chapter_map(baseline, "修订来源 manifest")
        generated_chapters = _manifest_chapter_map(generated, "修订输出 manifest")
        if generated.get("status") != "completed":
            raise ValueError("修订输出 manifest 尚未完成")

        revision = dict((job.data or {}).get("revision") or {})
        scope = revision.get("scope", "book")
        if scope == "chapter":
            expected = {int(revision["chapter_number"])}
            if set(generated_chapters) != expected:
                raise ValueError("单章修订输出的章节集合与选择范围不一致")
        elif scope == "book":
            if set(generated_chapters) != set(baseline_chapters):
                raise ValueError("整本修订输出的章节集合与来源版本不一致")
        else:
            raise ValueError("修订生成范围无效")

        version_relative = PurePosixPath("versions") / f"job-{job.id}"
        prepared_chapters = []
        assets = []
        for number in sorted(generated_chapters):
            prepared = dict(generated_chapters[number])
            for field, label in (("audio", "修订音频"), ("timeline", "修订时间轴")):
                relative, source = _safe_manifest_asset(output_dir, prepared.get(field), label)
                assets.append((relative, source))
                prepared[field] = (version_relative / relative).as_posix()
            prepared_chapters.append(prepared)
        prepared_generated = {**generated, "chapters": prepared_chapters}
        if scope == "chapter":
            committed = merge_revision_manifest(baseline, prepared_generated)
        else:
            committed = {
                **prepared_generated,
                "selected_chapters": sorted(baseline_chapters),
                "chapter_count": len(prepared_chapters),
                "duration_ms": sum(int(item.get("duration_ms", 0)) for item in prepared_chapters),
                "status": "completed",
            }
        if set(_manifest_chapter_map(committed, "修订候选 manifest")) != set(baseline_chapters):
            raise ValueError("修订候选 manifest 章节集合与来源版本不一致")

        version_dir = edition_dir / Path(*version_relative.parts)
        if not version_dir.exists():
            temporary = version_dir.with_name(f".{version_dir.name}.tmp")
            if temporary.exists():
                shutil.rmtree(temporary)
            for relative, source in assets:
                target = temporary / Path(*relative.parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
            temporary.replace(version_dir)
        for relative, _source in assets:
            if not (version_dir / Path(*relative.parts)).is_file():
                raise ValueError("已提交的修订资产不完整")

        manifest_path = edition_dir / "manifests" / f"job-{job.id}.v2.json"
        _atomic_text(manifest_path, json.dumps(committed, ensure_ascii=False, indent=2) + "\n")
        return manifest_path

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

    def _begin_invocation(self, job_id, version, phase, identity=None):
        session = self.session_maker()
        try:
            job = self._owned_job(session, job_id, identity)
            if job.status == "finalizing" or (phase == "INSPECTING" and job.status != "inspecting"):
                raise AudiobookLeaseLost("有声书任务阶段已改变，已停止旧调用")
            conditions = self._worker_write_conditions(session, job)
            if phase == "GENERATING":
                _reset_generation_progress(job)
            data = dict(job.data or {})
            data.pop("generation_interrupted", None)
            data["voicebook_invocation"] = {
                "version": version,
                "task_id": f"talebook-job-{job.id}",
                "attempt_id": str(uuid.uuid4()),
                "started_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            }
            plan = _copy_job_plan(data, job.mode)
            _mark_plan_phase(plan, "generate" if phase == "GENERATING" else "inspect", "started")
            data["plan"] = plan
            job.data = data
            job.last_event_seq = -1
            job.error_code = ""
            job.error_message = ""
            job.status = "generating" if phase == "GENERATING" else "inspecting"
            job.phase = phase
            invocation_identity = self._job_identity(job)
            self._write_worker_job(
                session,
                job,
                conditions,
                {
                    column: getattr(job, column.key)
                    for column in (
                        AudiobookJob.data,
                        AudiobookJob.last_event_seq,
                        AudiobookJob.error_code,
                        AudiobookJob.error_message,
                        AudiobookJob.status,
                        AudiobookJob.phase,
                        AudiobookJob.progress,
                    )
                },
            )
            session.commit()
            return invocation_identity
        finally:
            session.close()

    def _process(self, job_id, identity=None):
        session = self.session_maker()
        try:
            job = self._owned_job(session, job_id, identity)
            identity = self._job_identity(job)
            edition = session.get(AudiobookEdition, job.edition_id)
            job_dir = self.storage.job_dir(job.id)
            edition_dir = self.storage.edition_dir(edition.id)
            job_dir.mkdir(parents=True, exist_ok=True)
            edition_dir.mkdir(parents=True, exist_ok=True)
            script = edition_dir / "book.script"
            source = self._source_path(job, job_dir)
            process = VoicebookProcess(self.storage)
            version = process.progress_version()

            def on_event(event):
                self._consume_event(job_id, event, identity)

            def on_control():
                return self._control(job_id, identity)

            if not job.data.get("inspected"):
                identity = self._begin_invocation(job_id, version, "INSPECTING", identity)
                session.expire_all()
                args = ["inspect", str(source), "-o", str(script)]
                if job.chapter_selection:
                    args.extend(("--chapters", job.chapter_selection))
                status = process.run(job, args, on_event, on_control)
                if status == 3:
                    self._finish_cancelled(job_id, identity)
                    return
                session.expire_all()
                job = self._owned_job(session, job_id, identity)
                conditions = self._worker_write_conditions(session, job)
                edition = session.get(AudiobookEdition, job.edition_id)
                job.data = {**job.data, "inspected": True}
                edition.script_path = self.storage.relative(script)
                self._apply_generation_defaults(script, job, edition)
                workspace = read_script_workspace(script)
                initialize_audiobook_job_plan(job, workspace)
                job.progress = 0.0
                job.update_time = utcnow()
                if job.mode == "advanced":
                    job.status = "awaiting_review"
                    job.phase = "AWAITING_REVIEW"
                    job.lease_owner = ""
                    job.lease_until = None
                self._write_worker_job(
                    session,
                    job,
                    conditions,
                    {
                        column: getattr(job, column.key)
                        for column in (
                            AudiobookJob.data,
                            AudiobookJob.progress,
                            AudiobookJob.update_time,
                            AudiobookJob.status,
                            AudiobookJob.phase,
                            AudiobookJob.lease_owner,
                            AudiobookJob.lease_until,
                        )
                    },
                )
                session.commit()
                if job.mode == "advanced":
                    return

            identity = self._begin_invocation(job_id, version, "GENERATING", identity)
            session.expire_all()
            revision = (job.data or {}).get("revision") or {}
            output_dir = job_dir / "revision-output" if revision else edition_dir
            output_dir.mkdir(parents=True, exist_ok=True)
            args = ["generate", str(script), "-o", str(output_dir), "--engine", edition.engine]
            if revision:
                if revision.get("scope") == "chapter":
                    args.extend(("--chapters", str(int(revision["chapter_number"]))))
                args.append("--resume")
            else:
                args.append("--resume")
            status = process.run(job, args, on_event, on_control)
            if status == 3:
                self._finish_cancelled(job_id, identity)
                return
            session.expire_all()
            job = self._owned_job(session, job_id, identity)
            if revision:
                self._commit_revision_output(job, edition, output_dir)
            session.expire_all()
            job = self._owned_job(session, job_id, identity)
            conditions = self._worker_write_conditions(session, job)
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            timestamp = utcnow().isoformat()
            _mark_plan_phase(plan, "generate", "completed", timestamp)
            _mark_plan_phase(plan, "finalize", "started", timestamp)
            data["plan"] = plan
            job.data = data
            job.status = "finalizing"
            job.phase = "FINALIZING"
            job.progress = 0.0
            job.update_time = utcnow()
            self._write_worker_job(
                session,
                job,
                conditions,
                {
                    column: getattr(job, column.key)
                    for column in (
                        AudiobookJob.data,
                        AudiobookJob.status,
                        AudiobookJob.phase,
                        AudiobookJob.progress,
                        AudiobookJob.update_time,
                    )
                },
            )
            session.commit()
            published = self._finalize(job_id, identity)
            if published and revision:
                shutil.rmtree(output_dir, ignore_errors=True)
        except AudiobookLeaseLost:
            session.rollback()
            self._finish_cancelled(job_id, identity, requested_only=True)
        except Exception as exc:
            logging.exception("audiobook job %s failed", job_id)
            session.rollback()
            self._finish_failed(job_id, identity, exc)
        finally:
            session.close()

    def _finish_failed(self, job_id, identity, exc):
        session = self.session_maker()
        try:
            job = self._owned_job(session, job_id, identity, allow_cancel=True)
            if job.cancel_requested:
                self._finish_cancelled(job_id, identity, requested_only=True)
            else:
                conditions = self._worker_write_conditions(session, job)
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
                job.error_code = job.error_code or type(exc).__name__
                job.error_message = job.error_message or str(exc)[:4000]
                job.lease_owner = ""
                job.lease_until = None
                job.finished_at = utcnow()
                job.update_time = utcnow()
                self._write_worker_job(
                    session,
                    job,
                    conditions,
                    {
                        column: getattr(job, column.key)
                        for column in (
                            AudiobookJob.data,
                            AudiobookJob.status,
                            AudiobookJob.phase,
                            AudiobookJob.error_code,
                            AudiobookJob.error_message,
                            AudiobookJob.lease_owner,
                            AudiobookJob.lease_until,
                            AudiobookJob.finished_at,
                            AudiobookJob.update_time,
                        )
                    },
                )
                session.commit()
        except AudiobookLeaseLost:
            session.rollback()
        finally:
            session.close()

    @staticmethod
    def _job_write_conditions(job):
        # JSONType stores text. Comparing the complete original value also fences
        # attempt_id changes without relying on database-specific JSON operators.
        data = json.loads(json.dumps(job.data)) if job.data is not None else None
        return (
            AudiobookJob.id == job.id,
            AudiobookJob.lease_owner == job.lease_owner,
            AudiobookJob.status == job.status,
            AudiobookJob.last_event_seq == job.last_event_seq,
            AudiobookJob.data == data,
            AudiobookJob.attempts == job.attempts,
            AudiobookJob.lease_until == job.lease_until,
            AudiobookJob.cancel_requested == bool(job.cancel_requested),
        )

    def _consume_event(self, job_id, event, identity=None):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            if not job or job.lease_owner != self.worker_id or job.status not in {"inspecting", "generating"}:
                return
            if identity is not None and self._job_identity(job) != identity:
                return
            if not isinstance(event, dict):
                return
            write_conditions = self._worker_write_conditions(session, job)
            data = dict(job.data or {})
            invocation = data.get("voicebook_invocation") or {}
            if invocation.get("version") == 2:
                if (
                    event.get("schema") != PROGRESS_SCHEMA
                    or event.get("task_id") != invocation.get("task_id")
                    or event.get("attempt_id") != invocation.get("attempt_id")
                    or job.lease_owner != self.worker_id
                    or job.status not in {"inspecting", "generating"}
                    or isinstance(event.get("seq"), bool)
                    or not isinstance(event.get("seq"), int)
                    or event.get("seq", 0) < 1
                ):
                    return
            elif event.get("schema") not in {None, "voicebook-progress.v1"}:
                return
            snapshot = _progress_snapshot(event.get("snapshot")) if invocation.get("version") == 2 else None
            if invocation.get("version") == 2 and "snapshot" in event and snapshot is None:
                return
            try:
                sequence = int(event.get("seq"))
            except (TypeError, ValueError):
                sequence = None
            if sequence is not None and sequence <= int(job.last_event_seq if job.last_event_seq is not None else -1):
                return
            if sequence is not None:
                job.last_event_seq = sequence
            if invocation:
                data["voicebook_invocation"] = {
                    **invocation,
                    "last_received_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
                }
            if snapshot is not None:
                data["generation"] = snapshot
            name = event.get("event")
            timestamp = str(event.get("at") or utcnow().isoformat())
            plan = _copy_job_plan(data, job.mode)
            if name == "phase_started":
                job.phase = str(event.get("job_phase", job.phase))
                phase_key = {"INSPECTING": "inspect", "GENERATING": "generate"}.get(job.phase)
                if phase_key:
                    _mark_plan_phase(plan, "queue", "completed", timestamp)
                    _mark_plan_phase(plan, phase_key, "started", timestamp)
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
                "schema",
                "task_id",
                "attempt_id",
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
                chapter = chapter_record()
                if chapter is not None:
                    total = max(0, int(chapter.get("total_segments", 0)))
                    indices = list(chapter.get("completed_indices") or [])
                    index = event.get("segment_index")
                    duplicate = isinstance(index, int) and index in indices
                    if isinstance(index, int) and not duplicate:
                        indices.append(index)
                        chapter["completed_indices"] = indices
                    completed = len(indices) if indices else int(chapter.get("completed_segments", 0)) + 1
                    chapter["completed_segments"] = min(completed, total) if total else completed
                    data["completed_segments"] = chapter["completed_segments"]
                    if event.get("cache_hit") and not duplicate:
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
            elif name == "completed" and job.status == "inspecting":
                data.pop("normalization", None)
                normalization = _bounded_normalization_report(event.get("normalization"))
                if normalization:
                    data["normalization"] = normalization
            elif name == "completed" and job.status == "generating":
                _mark_plan_phase(plan, "generate", "completed", timestamp)
            elif name == "failed":
                job.error_code = str(event.get("code") or "VoicebookError")[:100]
                job.error_message = str(event.get("message") or "语音生成失败")[:4000]
                data["generation_retryable"] = bool(event.get("retryable"))
            data["plan"] = plan
            job.data = data
            job.progress = 0.0
            job.lease_until = utcnow() + datetime.timedelta(seconds=max(5, int(CONF.get("AUDIOBOOK_LEASE_SECONDS", 30))))
            job.update_time = utcnow()
            values = {
                column: getattr(job, column.key)
                for column in (
                    AudiobookJob.data,
                    AudiobookJob.phase,
                    AudiobookJob.last_event_seq,
                    AudiobookJob.progress,
                    AudiobookJob.lease_until,
                    AudiobookJob.update_time,
                    AudiobookJob.error_code,
                    AudiobookJob.error_message,
                )
            }
            with session.no_autoflush:
                # Discard the pending ORM write before executing the guarded UPDATE.
                session.expire(job)
                updated = session.query(AudiobookJob).filter(*write_conditions).update(values, synchronize_session=False)
            if not updated:
                session.rollback()
                return
            session.commit()
        finally:
            session.close()

    def _finish_cancelled(self, job_id, identity=None, *, requested_only=False):
        session = self.session_maker()
        try:
            job = self._owned_job(session, job_id, identity, allow_cancel=True)
            if requested_only and not job.cancel_requested:
                return
            write_conditions = self._worker_write_conditions(session, job)
            data = dict(job.data or {})
            plan = _copy_job_plan(data, job.mode)
            plan["last_active_phase"] = plan.get("last_active_phase", "queue")
            _mark_current_chapter_terminal(data, plan, "cancelled")
            data["plan"] = plan
            updated = (
                session.query(AudiobookJob)
                .filter(*write_conditions)
                .update(
                    {
                        AudiobookJob.data: data,
                        AudiobookJob.status: "cancelled",
                        AudiobookJob.phase: "CANCELLED",
                        AudiobookJob.progress: 0.0,
                        AudiobookJob.lease_owner: "",
                        AudiobookJob.lease_until: None,
                        AudiobookJob.finished_at: utcnow(),
                        AudiobookJob.update_time: utcnow(),
                    },
                    synchronize_session=False,
                )
            )
            if not updated:
                session.rollback()
                return
            session.commit()
        except AudiobookLeaseLost:
            session.rollback()
        finally:
            session.close()

    def _finalize(self, job_id, identity=None):
        session = self.session_maker()
        try:
            job = self._owned_job(session, job_id, identity, allow_cancel=True)
            if job.cancel_requested:
                self._finish_cancelled(job_id, identity)
                return False
            if job.status != "finalizing":
                return False
            write_conditions = self._worker_write_conditions(session, job)
            edition = session.get(AudiobookEdition, job.edition_id)
            edition_dir = self.storage.edition_dir(edition.id)
            data = dict(job.data or {})
            revision = data.get("revision") or {}
            if revision:
                manifest_path = edition_dir / "manifests" / f"job-{job.id}.v2.json"
                if not manifest_path.is_file():
                    raise ValueError("修订候选 manifest 尚未提交")
            else:
                manifest_path = edition_dir / "manifest.v2.json"
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("status") != "completed":
                raise ValueError("Voicebook manifest 尚未完成")
            manifest_chapters = _manifest_chapter_map(manifest, "Voicebook manifest")
            if revision:
                baseline_path = self.storage.resolve(edition.manifest_path, must_exist=True)
                baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
                baseline_chapters = _manifest_chapter_map(baseline, "修订来源 manifest")
                if set(manifest_chapters) != set(baseline_chapters):
                    raise ValueError("修订候选 manifest 章节集合与来源版本不一致")
            chapters = []
            for record in manifest.get("chapters", []):
                _audio_relative, audio = _safe_manifest_asset(edition_dir, record.get("audio"), "Voicebook 音频")
                _timeline_relative, timeline = _safe_manifest_asset(
                    edition_dir,
                    record.get("timeline"),
                    "Voicebook 时间轴",
                )
                if not audio.stat().st_size or not isinstance(json.loads(timeline.read_text(encoding="utf-8")), dict):
                    raise ValueError("Voicebook 音频或时间轴不可用")
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
                chapters.append(chapter)
            plan = _copy_job_plan(data, job.mode)
            timestamp = utcnow().isoformat()
            _mark_plan_phase(plan, "finalize", "completed", timestamp)
            _mark_plan_phase(plan, "complete", "completed", timestamp)
            data["plan"] = plan
            # This write decides publication versus cancellation/recovery. It holds
            # the job's write lock through all chapter/edition changes and commit.
            updated = (
                session.query(AudiobookJob)
                .filter(
                    *write_conditions,
                    AudiobookJob.cancel_requested.is_(False),
                    AudiobookJob.lease_until > utcnow(),
                )
                .update(
                    {
                        AudiobookJob.data: data,
                        AudiobookJob.status: "completed",
                        AudiobookJob.phase: "COMPLETED",
                        AudiobookJob.progress: 1.0,
                        AudiobookJob.lease_owner: "",
                        AudiobookJob.lease_until: None,
                        AudiobookJob.finished_at: utcnow(),
                        AudiobookJob.update_time: utcnow(),
                    },
                    synchronize_session=False,
                )
            )
            if not updated:
                session.rollback()
                current = session.get(AudiobookJob, job_id)
                if current and current.cancel_requested and current.lease_owner == self.worker_id:
                    self._finish_cancelled(job_id, identity, requested_only=True)
                return False
            session.query(AudiobookChapter).filter(AudiobookChapter.edition_id == edition.id).delete()
            session.add_all(chapters)
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
            complete = bool(revision) or not bool(job.chapter_selection)
            if complete and not existing:
                edition.status = "published"
                edition.published_at = utcnow()
            else:
                edition.status = "ready" if complete else "partial"
            edition.update_time = utcnow()
            session.commit()
            return True
        except AudiobookLeaseLost:
            return False
        finally:
            session.close()


def request_cancel(storage, job):
    session = object_session(job)
    if session is None:
        raise ValueError("取消请求必须在任务数据库事务中执行")
    now = utcnow()
    with session.no_autoflush:
        updated = (
            session.query(AudiobookJob)
            .filter(AudiobookJob.id == job.id, AudiobookJob.status.in_(ACTIVE_JOB_STATUSES))
            .update(
                {
                    AudiobookJob.cancel_requested: True,
                    AudiobookJob.cancel_requested_at: func.coalesce(AudiobookJob.cancel_requested_at, now),
                    AudiobookJob.update_time: now,
                },
                synchronize_session="fetch",
            )
        )
    if not updated:
        return False
    directory = storage.job_dir(job.id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "cancel").touch()
    return True


def reset_for_retry(storage, job):
    session = object_session(job)
    if session is None or job.status not in {"failed", "cancelled"}:
        return False
    try:
        # Reserve the original terminal row before touching cancellation/staging
        # files. A concurrent retry/claim cannot be cleared by this stale request.
        AudiobookScheduler._write_worker_job(
            session,
            job,
            AudiobookScheduler._job_write_conditions(job),
            {AudiobookJob.update_time: utcnow()},
        )
    except AudiobookLeaseLost:
        return False
    cancel = storage.job_dir(job.id) / "cancel"
    cancel.unlink(missing_ok=True)
    revision = (job.data or {}).get("revision") or {}
    if revision and job.error_code in {"FileNotFoundError", "JSONDecodeError", "ValueError"}:
        manifest = storage.job_dir(job.id) / "revision-output" / "manifest.v2.json"
        if manifest.is_file():
            archived = manifest.with_name(f"manifest.invalid-attempt-{max(1, int(job.attempts or 0))}.json")
            manifest.replace(archived)
    job.cancel_requested = False
    job.cancel_requested_at = None
    job.status = "queued"
    job.phase = "QUEUED"
    _reset_generation_progress(job)
    data = dict(job.data or {})
    data.pop("generation_retryable", None)
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
    return True
