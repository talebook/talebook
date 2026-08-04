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
                job.data = {**job.data, "inspected": True}
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
            elif name == "completed" and job.status == "inspecting":
                data.pop("normalization", None)
                normalization = _bounded_normalization_report(event.get("normalization"))
                if normalization:
                    data["normalization"] = normalization
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
