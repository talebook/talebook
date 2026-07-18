"""有声书持久队列、Voicebook 子进程协议与资源存储。"""

from __future__ import annotations

import datetime
import hashlib
import json
import logging
import os
import re
import shlex
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


def utcnow():
    return datetime.datetime.now()


def stable_json_hash(value):
    data = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(data).hexdigest()


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

    def run(self, job, arguments, on_event):
        job_dir = self.storage.job_dir(job.id)
        job_dir.mkdir(parents=True, exist_ok=True)
        cancel_file = job_dir / "cancel"
        events_file = job_dir / "events.jsonl"
        log_file = job_dir / "stderr.log"
        command = self.command + arguments + ["--progress-format", "jsonl", "--cancel-file", str(cancel_file)]
        with log_file.open("a", encoding="utf-8") as errors, events_file.open("a", encoding="utf-8") as events:
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=errors, text=True, bufsize=1)
            for line in process.stdout:
                events.write(line)
                events.flush()
                try:
                    on_event(json.loads(line))
                except (ValueError, TypeError):
                    logging.warning("invalid voicebook event: %s", line[:300])
            status = process.wait()
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
                    },
                    synchronize_session=False,
                )
            )
            session.commit()
            job = (
                session.query(AudiobookJob)
                .filter(AudiobookJob.status == "queued")
                .order_by(AudiobookJob.priority.desc(), AudiobookJob.create_time.asc())
                .first()
            )
            if not job:
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
                        AudiobookJob.lease_until: now + datetime.timedelta(seconds=30),
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

            if not job.data.get("inspected"):
                args = ["inspect", str(source), "-o", str(script)]
                if job.chapter_selection:
                    args.extend(("--chapters", job.chapter_selection))
                status = process.run(job, args, on_event)
                if status == 3:
                    self._finish_cancelled(job_id)
                    return
                session.expire_all()
                job = session.get(AudiobookJob, job_id)
                edition = session.get(AudiobookEdition, job.edition_id)
                job.data = {**job.data, "inspected": True}
                edition.script_path = self.storage.relative(script)
                job.update_time = utcnow()
                if job.mode == "advanced":
                    job.status = "awaiting_review"
                    job.phase = "AWAITING_REVIEW"
                    session.commit()
                    return
                session.commit()

            job.status = "generating"
            job.phase = "GENERATING"
            session.commit()
            args = ["generate", str(script), "-o", str(edition_dir), "--engine", edition.engine, "--resume"]
            status = process.run(job, args, on_event)
            if status == 3:
                self._finish_cancelled(job_id)
                return
            self._finalize(job_id)
        except Exception as exc:
            logging.exception("audiobook job %s failed", job_id)
            session.rollback()
            job = session.get(AudiobookJob, job_id)
            if job:
                job.status = "failed"
                job.phase = "FAILED"
                job.error_code = type(exc).__name__
                job.error_message = str(exc)[:4000]
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
            name = event.get("event")
            if name == "phase_started":
                job.phase = str(event.get("job_phase", job.phase))
            data = dict(job.data or {})
            data["last_event"] = event
            if name == "chapter_started":
                data["current_chapter"] = event.get("chapter_number")
                data["chapter_segments"] = event.get("total_segments", 0)
                data["completed_segments"] = 0
            elif name == "segment_completed":
                data["completed_segments"] = int(data.get("completed_segments", 0)) + 1
            job.data = data
            job.lease_until = utcnow() + datetime.timedelta(seconds=30)
            job.update_time = utcnow()
            session.commit()
        finally:
            session.close()

    def _finish_cancelled(self, job_id):
        session = self.session_maker()
        try:
            job = session.get(AudiobookJob, job_id)
            job.status = "cancelled"
            job.phase = "CANCELLED"
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
                    episode_guid=stable_json_hash([job.book_id, record.get("source_key")]),
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
            complete = not bool(job.chapter_selection)
            if complete and not existing:
                edition.status = "published"
                edition.published_at = utcnow()
            else:
                edition.status = "ready" if complete else "partial"
            edition.update_time = utcnow()
            job.status = "completed"
            job.phase = "COMPLETED"
            job.progress = 1.0
            job.finished_at = utcnow()
            job.update_time = utcnow()
            session.commit()
        finally:
            session.close()


def request_cancel(storage, job):
    job.cancel_requested = True
    job.update_time = utcnow()
    directory = storage.job_dir(job.id)
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "cancel").touch()


def reset_for_retry(storage, job):
    cancel = storage.job_dir(job.id) / "cancel"
    cancel.unlink(missing_ok=True)
    job.cancel_requested = False
    job.status = "queued"
    job.phase = "QUEUED"
    job.error_code = ""
    job.error_message = ""
    job.finished_at = None
    job.update_time = utcnow()
