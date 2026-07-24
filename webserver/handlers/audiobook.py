#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import hashlib
import ipaddress
import json
import re
import secrets
import shutil
import subprocess
import uuid
from email.utils import format_datetime
from pathlib import Path
from urllib.parse import quote
from xml.sax.saxutils import escape

import tornado.escape
import tornado.web
from sqlalchemy import func

from webserver import loader, utils
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.i18n import _
from webserver.models import (
    AudiobookBookmark,
    AudiobookChapter,
    AudiobookEdition,
    AudiobookJob,
    AudiobookPlaybackSession,
    AudiobookProgress,
    Item,
    PodcastAccessLog,
    PodcastSubscription,
    Reader,
)
from webserver.services.audiobook import (
    ACTIVE_JOB_STATUSES,
    AudiobookScheduler,
    AudiobookStorage,
    ScriptValidationError,
    VoicebookProcess,
    read_script_workspace,
    request_cancel,
    reset_for_retry,
    save_script_chapter,
    save_script_roles,
    stable_json_hash,
    utcnow,
)


CONF = loader.get_settings()


def _json_body(handler):
    try:
        value = tornado.escape.json_decode(handler.request.body or b"{}")
    except (ValueError, TypeError):
        raise ValueError("请求参数格式错误")
    if not isinstance(value, dict):
        raise ValueError("请求参数必须是对象")
    return value


def _edition_dict(edition, chapters=None):
    data = {
        "id": edition.id,
        "book_id": edition.book_id,
        "status": edition.status,
        "engine": edition.engine,
        "config": edition.config or {},
        "chapter_count": edition.chapter_count,
        "completed_count": edition.completed_count,
        "duration_ms": edition.duration_ms,
        "size_bytes": edition.size_bytes,
        "created_by": edition.created_by,
        "created_at": edition.create_time.isoformat() if edition.create_time else None,
        "published_at": edition.published_at.isoformat() if edition.published_at else None,
    }
    if chapters is not None:
        data["chapters"] = [_chapter_dict(chapter) for chapter in chapters]
    return data


def _chapter_dict(chapter):
    return {
        "id": chapter.id,
        "number": chapter.number,
        "source_key": chapter.source_key,
        "title": chapter.title,
        "duration_ms": chapter.duration_ms,
        "size_bytes": chapter.size_bytes,
        "audio_url": f"/media/audio/{chapter.edition_id}/chapter/{chapter.number}.mp3",
        "timeline_url": f"/api/audio/{chapter.edition_id}/chapter/{chapter.number}/timeline",
    }


def _job_dict(job):
    return {
        "id": job.id,
        "book_id": job.book_id,
        "edition_id": job.edition_id,
        "creator_id": job.creator_id,
        "mode": job.mode,
        "status": job.status,
        "phase": job.phase,
        "priority": job.priority,
        "config": job.config or {},
        "chapter_selection": job.chapter_selection,
        "progress": job.progress,
        "cancel_requested": bool(job.cancel_requested),
        "attempts": job.attempts,
        "error_code": job.error_code,
        "error_message": job.error_message,
        "data": job.data or {},
        "created_at": job.create_time.isoformat() if job.create_time else None,
        "updated_at": job.update_time.isoformat() if job.update_time else None,
    }


def _source_ip(handler):
    remote = handler.request.remote_ip or ""
    trusted = {str(value) for value in CONF.get("PODCAST_TRUSTED_PROXIES", [])}
    if remote in trusted:
        forwarded = handler.request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            pass
    return remote


def _published_edition(session, book_id):
    return (
        session.query(AudiobookEdition)
        .filter(AudiobookEdition.book_id == int(book_id), AudiobookEdition.status == "published")
        .first()
    )


def _can_subscription_view(session, reader, book_id):
    if reader and reader.is_admin():
        return True
    item = session.get(Item, int(book_id))
    return not item or item.scope != "private" or (reader and item.collector_id == reader.id)


class AudiobookHome(BaseHandler):
    @js
    def get(self):
        editions = (
            self.session.query(AudiobookEdition)
            .filter(AudiobookEdition.status == "published")
            .order_by(AudiobookEdition.published_at.desc())
            .all()
        )
        visible = [edition for edition in editions if self.can_view_book(edition.book_id)]
        books = {book["id"]: book for book in self.get_books(ids=[item.book_id for item in visible])} if visible else {}
        progress = {}
        if self.current_user:
            rows = (
                self.session.query(AudiobookProgress)
                .filter(
                    AudiobookProgress.reader_id == self.user_id(), AudiobookProgress.edition_id.in_([e.id for e in visible])
                )
                .all()
            )
            progress = {row.edition_id: row for row in rows}

        def item(edition):
            book = books.get(edition.book_id)
            if not book:
                return None
            value = utils.BookFormatter(self, book).format()
            value["edition"] = _edition_dict(edition)
            row = progress.get(edition.id)
            value["listening_progress"] = (
                {
                    "chapter_id": row.chapter_id,
                    "position_ms": row.position_ms,
                    "listened_ms": row.listened_ms,
                    "finished": bool(row.is_finished),
                }
                if row
                else None
            )
            return value

        items = [value for value in (item(edition) for edition in visible) if value]
        return {
            "err": "ok",
            "enabled": bool(CONF.get("AUDIOBOOK_ENABLED", True)),
            "continue_listening": [
                value for value in items if value["listening_progress"] and not value["listening_progress"]["finished"]
            ],
            "recent": items[:24],
            "completed": [value for value in items if value["listening_progress"] and value["listening_progress"]["finished"]],
        }


class AudiobookList(BaseHandler):
    @js
    def get(self):
        query = self.session.query(AudiobookEdition).filter(AudiobookEdition.status == "published")
        editions = query.order_by(AudiobookEdition.published_at.desc()).all()
        editions = [edition for edition in editions if self.can_view_book(edition.book_id)]
        books = (
            {book["id"]: book for book in self.get_books(ids=[edition.book_id for edition in editions])} if editions else {}
        )
        values = []
        keyword = self.get_argument("keyword", "").strip().lower()
        for edition in editions:
            book = books.get(edition.book_id)
            if not book:
                continue
            if (
                keyword
                and keyword not in str(book.get("title", "")).lower()
                and keyword not in str(book.get("author", "")).lower()
            ):
                continue
            value = utils.BookFormatter(self, book).format()
            value["edition"] = _edition_dict(edition)
            values.append(value)
        return {"err": "ok", "total": len(values), "books": values}


class AudiobookDetail(BaseHandler):
    @js
    def get(self, book_id):
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "not_found", "msg": _("书籍不存在")}
        query = self.session.query(AudiobookEdition).filter(AudiobookEdition.book_id == int(book_id))
        if not (self.is_admin() or (self.current_user and self.is_book_owner(int(book_id), self.user_id()))):
            query = query.filter(AudiobookEdition.status == "published")
        editions = query.order_by(AudiobookEdition.create_time.desc()).all()
        edition_values = []
        for edition in editions:
            chapters = (
                self.session.query(AudiobookChapter)
                .filter(AudiobookChapter.edition_id == edition.id)
                .order_by(AudiobookChapter.number)
                .all()
            )
            edition_values.append(_edition_dict(edition, chapters))
        return {"err": "ok", "book": utils.BookFormatter(self, book).format(with_files=True), "editions": edition_values}


class AudiobookJobCreate(BaseHandler):
    @js
    @auth
    def post(self, book_id):
        if not CONF.get("AUDIOBOOK_ENABLED", True):
            return {"err": "audiobook.disabled", "msg": _("有声书功能未启用")}
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "not_found", "msg": _("书籍不存在")}
        owner_allowed = CONF.get("AUDIOBOOK_OWNER_GENERATE", False) and self.is_book_owner(int(book_id), self.user_id())
        if not self.is_admin() and not owner_allowed:
            return {"err": "permission", "msg": _("只有管理员或获准的书籍所有者可以生成有声书")}
        formats = {str(value).upper() for value in book.get("available_formats", [])}
        if not formats.intersection({"EPUB", "TXT"}):
            return {"err": "format.not_supported", "msg": _("生成有声书需要 EPUB 或 TXT 格式")}
        try:
            body = _json_body(self)
        except ValueError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        mode = body.get("mode", "quick")
        engine = body.get("engine", "edgetts")
        if mode not in {"quick", "advanced"} or engine not in {"edgetts", "qwen3tts"}:
            return {"err": "params.invalid", "msg": _("生成模式或引擎无效")}
        chapters = str(body.get("chapters", "")).strip()
        config = {
            "engine": engine,
            "speed": str(body.get("speed", "x1.0")),
            "quality": body.get("quality", "standard"),
            "protagonist_voices": body.get("protagonist_voices", {}),
        }
        config_hash = stable_json_hash({"book_id": int(book_id), "mode": mode, "chapters": chapters, **config})
        duplicate = (
            self.session.query(AudiobookJob)
            .filter(
                AudiobookJob.book_id == int(book_id),
                AudiobookJob.config_hash == config_hash,
                AudiobookJob.status.in_(ACTIVE_JOB_STATUSES),
            )
            .first()
        )
        if duplicate:
            return {"err": "ok", "job": _job_dict(duplicate), "deduplicated": True}
        now = utcnow()
        edition = AudiobookEdition(
            book_id=int(book_id),
            status="draft",
            engine=engine,
            config=config,
            created_by=self.user_id(),
            create_time=now,
            update_time=now,
        )
        self.session.add(edition)
        self.session.flush()
        job = AudiobookJob(
            book_id=int(book_id),
            edition_id=edition.id,
            creator_id=self.user_id(),
            mode=mode,
            status="queued",
            phase="QUEUED",
            priority=max(-100, min(100, int(body.get("priority", 0)))),
            config=config,
            chapter_selection=chapters,
            config_hash=config_hash,
            data={},
            create_time=now,
            update_time=now,
        )
        self.session.add(job)
        self.session.commit()
        AudiobookScheduler().wake()
        return {"err": "ok", "job": _job_dict(job), "deduplicated": False}


class AudiobookJobs(BaseHandler):
    @js
    @auth
    def get(self):
        query = self.session.query(AudiobookJob)
        if not self.is_admin():
            query = query.filter(AudiobookJob.creator_id == self.user_id())
        status = self.get_argument("status", "")
        if status:
            query = query.filter(AudiobookJob.status == status)
        jobs = query.order_by(AudiobookJob.create_time.desc()).limit(200).all()
        return {"err": "ok", "jobs": [_job_dict(job) for job in jobs]}


class AudiobookJobAction(BaseHandler):
    @js
    @auth
    def patch(self, job_id):
        job = self.session.get(AudiobookJob, int(job_id))
        if not job or (not self.is_admin() and job.creator_id != self.user_id()):
            return {"err": "not_found", "msg": _("任务不存在")}
        try:
            body = _json_body(self)
        except ValueError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        action = body.get("action")
        storage = AudiobookStorage()
        if action == "cancel":
            if job.status == "queued":
                job.status = "cancelled"
                job.phase = "CANCELLED"
                job.finished_at = utcnow()
            elif job.status in {"inspecting", "awaiting_review", "generating", "finalizing"}:
                request_cancel(storage, job)
            else:
                return {"err": "state.invalid", "msg": _("当前状态不能取消")}
        elif action == "retry":
            if job.status not in {"failed", "cancelled"}:
                return {"err": "state.invalid", "msg": _("只有失败或已取消任务可以重试")}
            reset_for_retry(storage, job)
        elif action == "priority" and self.is_admin():
            job.priority = max(-100, min(100, int(body.get("priority", 0))))
            job.update_time = utcnow()
        else:
            return {"err": "params.invalid", "msg": _("任务操作无效")}
        self.session.commit()
        return {"err": "ok", "job": _job_dict(job)}


class AudiobookWorkspace(BaseHandler):
    def _job(self, job_id):
        job = self.session.get(AudiobookJob, int(job_id))
        if not job or (not self.is_admin() and job.creator_id != self.user_id()):
            return None, None
        edition = self.session.get(AudiobookEdition, job.edition_id)
        path = AudiobookStorage().resolve(edition.script_path, must_exist=True) if edition.script_path else None
        return job, path

    @js
    @auth
    def get(self, job_id):
        job, path = self._job(job_id)
        if not job or not path:
            return {"err": "not_found", "msg": _("审查脚本不存在")}
        return {"err": "ok", "job": _job_dict(job), "workspace": read_script_workspace(path)}

    @js
    @auth
    def patch(self, job_id):
        job, path = self._job(job_id)
        if not job or not path:
            return {"err": "not_found", "msg": _("审查脚本不存在")}
        if job.status != "awaiting_review":
            return {"err": "state.invalid", "msg": _("任务当前不在审查阶段")}
        body = _json_body(self)
        try:
            if body.get("kind") == "characters":
                workspace = save_script_roles(path, body.get("characters"), body.get("revision"))
            elif body.get("kind") == "chapter":
                workspace = save_script_chapter(path, body.get("chapter_number"), body.get("text", ""), body.get("revision"))
            else:
                return {"err": "params.invalid", "msg": _("审查操作无效")}
        except ScriptValidationError as exc:
            return {"err": "script.invalid", "msg": str(exc), "errors": exc.errors}
        except ValueError as exc:
            return {"err": "script.invalid", "msg": str(exc)}
        return {"err": "ok", "workspace": workspace}


class AudiobookConfirm(BaseHandler):
    @js
    @auth
    def post(self, job_id):
        job = self.session.get(AudiobookJob, int(job_id))
        if not job or (not self.is_admin() and job.creator_id != self.user_id()):
            return {"err": "not_found", "msg": _("任务不存在")}
        if job.status != "awaiting_review":
            return {"err": "state.invalid", "msg": _("任务当前不在审查阶段")}
        job.status = "queued"
        job.phase = "QUEUED"
        job.data = {**(job.data or {}), "confirmed": True}
        job.update_time = utcnow()
        self.session.commit()
        AudiobookScheduler().wake()
        return {"err": "ok", "job": _job_dict(job)}


class AudiobookEditionAction(BaseHandler):
    @js
    @is_admin
    def patch(self, edition_id):
        edition = self.session.get(AudiobookEdition, int(edition_id))
        if not edition:
            return {"err": "not_found", "msg": _("有声版本不存在")}
        body = _json_body(self)
        action = body.get("action")
        if action == "publish":
            old = (
                self.session.query(AudiobookEdition)
                .filter(AudiobookEdition.book_id == edition.book_id, AudiobookEdition.status == "published")
                .all()
            )
            for item in old:
                item.status = "historical"
            edition.status = "published"
            edition.published_at = utcnow()
            chapters = self.session.query(AudiobookChapter).filter(AudiobookChapter.edition_id == edition.id).all()
            for chapter in chapters:
                chapter.first_published_at = chapter.first_published_at or utcnow()
        elif action == "delete":
            if edition.status == "published":
                return {"err": "state.invalid", "msg": _("当前发布版本不能直接删除")}
            directory = AudiobookStorage().edition_dir(edition.id)
            self.session.query(AudiobookChapter).filter(AudiobookChapter.edition_id == edition.id).delete()
            self.session.delete(edition)
            self.session.commit()
            if directory.is_dir():
                shutil.rmtree(directory)
            return {"err": "ok"}
        else:
            return {"err": "params.invalid", "msg": _("版本操作无效")}
        edition.update_time = utcnow()
        self.session.commit()
        return {"err": "ok", "edition": _edition_dict(edition)}


class AudiobookManifest(AudiobookEditionAction):
    @js
    def get(self, edition_id):
        edition = self.session.get(AudiobookEdition, int(edition_id))
        if not edition or edition.status != "published" or not self.can_view_book(edition.book_id):
            return {"err": "not_found", "msg": _("有声版本不存在")}
        chapters = (
            self.session.query(AudiobookChapter)
            .filter(AudiobookChapter.edition_id == edition.id)
            .order_by(AudiobookChapter.number)
            .all()
        )
        progress = None
        if self.current_user:
            progress = (
                self.session.query(AudiobookProgress)
                .filter(AudiobookProgress.reader_id == self.user_id(), AudiobookProgress.edition_id == edition.id)
                .first()
            )
        return {
            "err": "ok",
            "manifest": _edition_dict(edition, chapters),
            "progress": {
                "chapter_id": progress.chapter_id,
                "position_ms": progress.position_ms,
                "segment_id": progress.segment_id,
                "listened_ms": progress.listened_ms,
                "finished": bool(progress.is_finished),
                "version": progress.version,
            }
            if progress
            else None,
        }


class AudiobookTimeline(BaseHandler):
    @js
    def get(self, edition_id, chapter_number):
        edition = self.session.get(AudiobookEdition, int(edition_id))
        if not edition or edition.status != "published" or not self.can_view_book(edition.book_id):
            return {"err": "not_found", "msg": _("有声版本不存在")}
        chapter = (
            self.session.query(AudiobookChapter)
            .filter(AudiobookChapter.edition_id == edition.id, AudiobookChapter.number == int(chapter_number))
            .first()
        )
        if not chapter:
            return {"err": "not_found", "msg": _("章节不存在")}
        payload = json.loads(AudiobookStorage().resolve(chapter.timeline_path, must_exist=True).read_text(encoding="utf-8"))
        return {"err": "ok", "timeline": payload}


def _range(handler, path, content_type="audio/mpeg"):
    size = path.stat().st_size
    start, end = 0, size - 1
    status = 200
    value = handler.request.headers.get("Range", "")
    if value:
        if not value.startswith("bytes=") or "," in value:
            handler.set_status(416)
            handler.set_header("Content-Range", f"bytes */{size}")
            handler.finish()
            return 416, 0, None, None
        left, right = value[6:].split("-", 1)
        try:
            if left:
                start = int(left)
                end = min(int(right), size - 1) if right else size - 1
            else:
                length = int(right)
                start = max(0, size - length)
        except ValueError:
            start = size
        if start < 0 or start >= size or end < start:
            handler.set_status(416)
            handler.set_header("Content-Range", f"bytes */{size}")
            handler.finish()
            return 416, 0, None, None
        status = 206
        handler.set_status(206)
        handler.set_header("Content-Range", f"bytes {start}-{end}/{size}")
    length = end - start + 1
    handler.set_header("Content-Type", content_type)
    handler.set_header("Accept-Ranges", "bytes")
    handler.set_header("Content-Length", str(length))
    handler.set_header("Cache-Control", "private, max-age=31536000, immutable")
    if handler.request.method != "HEAD":
        with path.open("rb") as source:
            source.seek(start)
            remaining = length
            while remaining:
                chunk = source.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                handler.write(chunk)
                remaining -= len(chunk)
    handler.finish()
    return status, length, start, end


class AudiobookAudio(BaseHandler):
    def get(self, edition_id, chapter_number):
        edition = self.session.get(AudiobookEdition, int(edition_id))
        if not edition or edition.status != "published" or not self.can_view_book(edition.book_id):
            raise tornado.web.HTTPError(404)
        chapter = (
            self.session.query(AudiobookChapter)
            .filter(AudiobookChapter.edition_id == edition.id, AudiobookChapter.number == int(chapter_number))
            .first()
        )
        if not chapter:
            raise tornado.web.HTTPError(404)
        _range(self, AudiobookStorage().resolve(chapter.audio_path, must_exist=True))

    head = get


class PlaybackSessionCreate(BaseHandler):
    @js
    @auth
    def post(self, edition_id):
        edition = self.session.get(AudiobookEdition, int(edition_id))
        if not edition or edition.status != "published" or not self.can_view_book(edition.book_id):
            return {"err": "not_found", "msg": _("有声版本不存在")}
        body = _json_body(self)
        session = AudiobookPlaybackSession(
            uuid=uuid.uuid4().hex,
            reader_id=self.user_id(),
            edition_id=edition.id,
            source=body.get("source", "web") if body.get("source") in {"web", "candle"} else "web",
            device_id=str(body.get("device_id", ""))[:128],
            ip=_source_ip(self),
            user_agent=self.request.headers.get("User-Agent", "")[:1000],
            started_at=utcnow(),
        )
        self.session.add(session)
        self.session.commit()
        return {"err": "ok", "session_id": session.uuid}


class PlaybackSessionUpdate(BaseHandler):
    @js
    @auth
    def patch(self, session_id):
        row = (
            self.session.query(AudiobookPlaybackSession)
            .filter(AudiobookPlaybackSession.uuid == session_id, AudiobookPlaybackSession.reader_id == self.user_id())
            .first()
        )
        if not row:
            return {"err": "not_found", "msg": _("播放会话不存在")}
        body = _json_body(self)
        chapter = self.session.get(AudiobookChapter, int(body.get("chapter_id", 0)))
        if not chapter or chapter.edition_id != row.edition_id:
            return {"err": "params.invalid", "msg": _("章节无效")}
        delta = max(0, min(60_000, int(body.get("listened_delta_ms", 0))))
        row.current_ms = max(0, int(body.get("position_ms", 0)))
        row.listened_ms += delta
        row.completed = bool(body.get("completed", False))
        progress = (
            self.session.query(AudiobookProgress)
            .filter(AudiobookProgress.reader_id == self.user_id(), AudiobookProgress.edition_id == row.edition_id)
            .first()
        )
        if not progress:
            progress = AudiobookProgress(
                reader_id=self.user_id(),
                edition_id=row.edition_id,
                listened_ms=0,
                version=0,
            )
            self.session.add(progress)
        expected = int(body.get("version", progress.version))
        if expected < progress.version and row.current_ms < progress.position_ms:
            return {"err": "progress.conflict", "msg": _("其他设备已有更新进度"), "version": progress.version}
        progress.chapter_id = chapter.id
        progress.position_ms = row.current_ms
        progress.segment_id = str(body.get("segment_id", ""))[:64]
        progress.listened_ms += delta
        progress.is_finished = row.completed
        progress.version += 1
        progress.update_time = utcnow()
        self.session.commit()
        return {"err": "ok", "version": progress.version}

    @js
    @auth
    def post(self, session_id):
        row = (
            self.session.query(AudiobookPlaybackSession)
            .filter(AudiobookPlaybackSession.uuid == session_id, AudiobookPlaybackSession.reader_id == self.user_id())
            .first()
        )
        if not row:
            return {"err": "not_found", "msg": _("播放会话不存在")}
        row.ended_at = utcnow()
        self.session.commit()
        return {"err": "ok"}


class AudiobookBookmarks(BaseHandler):
    @js
    @auth
    def get(self, edition_id):
        rows = (
            self.session.query(AudiobookBookmark)
            .filter(AudiobookBookmark.reader_id == self.user_id(), AudiobookBookmark.edition_id == int(edition_id))
            .order_by(AudiobookBookmark.create_time.desc())
            .all()
        )
        return {"err": "ok", "bookmarks": [row.to_dict() for row in rows]}

    @js
    @auth
    def post(self, edition_id):
        body = _json_body(self)
        chapter = self.session.get(AudiobookChapter, int(body.get("chapter_id", 0)))
        if not chapter or chapter.edition_id != int(edition_id):
            return {"err": "params.invalid", "msg": _("章节无效")}
        row = AudiobookBookmark(
            reader_id=self.user_id(),
            edition_id=int(edition_id),
            chapter_id=chapter.id,
            position_ms=max(0, int(body.get("position_ms", 0))),
            segment_id=str(body.get("segment_id", ""))[:64],
            note=str(body.get("note", ""))[:1000],
            create_time=utcnow(),
        )
        self.session.add(row)
        self.session.commit()
        return {"err": "ok", "bookmark": row.to_dict()}


class PodcastSubscriptionAPI(BaseHandler):
    @js
    @auth
    def get(self):
        row = (
            self.session.query(PodcastSubscription)
            .filter(PodcastSubscription.reader_id == self.user_id(), PodcastSubscription.active.is_(True))
            .first()
        )
        return {"err": "ok", "subscription": {"active": True, "token_hint": row.token_hint} if row else None}

    @js
    @auth
    def post(self):
        if not CONF.get("PODCAST_ENABLED", True):
            return {"err": "podcast.disabled", "msg": _("私人 Podcast 未启用")}
        rows = self.session.query(PodcastSubscription).filter(PodcastSubscription.reader_id == self.user_id()).all()
        for row in rows:
            row.active = False
            row.revoked_at = utcnow()
        token = secrets.token_urlsafe(32)
        row = PodcastSubscription(
            reader_id=self.user_id(),
            token_hash=hashlib.sha256(token.encode("utf-8")).hexdigest(),
            token_hint=token[-6:],
            active=True,
            hidden_books={},
            create_time=utcnow(),
        )
        self.session.add(row)
        self.session.commit()
        return {"err": "ok", "feed_url": f"{self.site_url}/podcast/v1/{quote(token)}/feed.xml", "token_hint": row.token_hint}

    @js
    @auth
    def delete(self):
        rows = (
            self.session.query(PodcastSubscription)
            .filter(PodcastSubscription.reader_id == self.user_id(), PodcastSubscription.active.is_(True))
            .all()
        )
        for row in rows:
            row.active = False
            row.revoked_at = utcnow()
        self.session.commit()
        return {"err": "ok"}

    @js
    @auth
    def patch(self):
        row = (
            self.session.query(PodcastSubscription)
            .filter(PodcastSubscription.reader_id == self.user_id(), PodcastSubscription.active.is_(True))
            .first()
        )
        if not row:
            return {"err": "not_found", "msg": _("私人 Podcast 尚未创建")}
        body = _json_body(self)
        values = body.get("hidden_book_ids", [])
        if not isinstance(values, list) or len(values) > 5000:
            return {"err": "params.invalid", "msg": _("隐藏书籍列表无效")}
        try:
            ids = sorted({int(value) for value in values if int(value) > 0})
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": _("隐藏书籍列表无效")}
        row.hidden_books = {"ids": ids}
        self.session.commit()
        return {"err": "ok", "hidden_book_ids": ids}


def _subscription(handler, token):
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = (
        handler.session.query(PodcastSubscription)
        .filter(PodcastSubscription.token_hash == digest, PodcastSubscription.active.is_(True))
        .first()
    )
    if not row:
        raise tornado.web.HTTPError(404)
    reader = handler.session.get(Reader, row.reader_id)
    if not reader or not reader.is_active():
        raise tornado.web.HTTPError(404)
    row.last_access_at = utcnow()
    return row, reader


def _audit(
    handler, subscription, *, kind, status, book_id=None, edition_id=None, chapter_id=None, size=0, start=None, end=None
):
    handler.session.add(
        PodcastAccessLog(
            subscription_id=subscription.id,
            book_id=book_id,
            edition_id=edition_id,
            chapter_id=chapter_id,
            kind=kind,
            method=handler.request.method,
            status=status,
            range_start=start,
            range_end=end,
            bytes_sent=size,
            ip=_source_ip(handler),
            user_agent=handler.request.headers.get("User-Agent", "")[:1000],
            create_time=utcnow(),
        )
    )
    retention_days = max(1, int(CONF.get("PODCAST_IP_RETENTION_DAYS", 90)))
    handler.session.query(PodcastAccessLog).filter(
        PodcastAccessLog.protected.is_(False),
        PodcastAccessLog.create_time < utcnow() - datetime.timedelta(days=retention_days),
    ).delete(synchronize_session=False)
    handler.session.commit()


class PodcastBaseHandler(BaseHandler):
    def _request_summary(self):
        safe_uri = re.sub(r"(/podcast/v1/)[^/]+", r"\1[redacted]", self.request.uri)
        return '%s %s (%s) "podcast-token-redacted"' % (
            self.request.method,
            safe_uri,
            self.request.remote_ip,
        )


class PodcastFeed(PodcastBaseHandler):
    def get(self, token):
        subscription, reader = _subscription(self, token)
        hidden = {int(value) for value in (subscription.hidden_books or {}).get("ids", [])}
        editions = (
            self.session.query(AudiobookEdition)
            .filter(AudiobookEdition.status == "published")
            .order_by(AudiobookEdition.book_id, AudiobookEdition.published_at.desc())
            .all()
        )
        editions = [
            item
            for item in editions
            if item.book_id not in hidden and _can_subscription_view(self.session, reader, item.book_id)
        ]
        books = (
            {book["id"]: book for book in self.get_books(ids=[item.book_id for item in editions], check_permission=False)}
            if editions
            else {}
        )
        feed_dates = []
        items = []
        for edition in editions:
            book = books.get(edition.book_id)
            if not book:
                continue
            chapters = (
                self.session.query(AudiobookChapter)
                .filter(AudiobookChapter.edition_id == edition.id)
                .order_by(AudiobookChapter.number)
                .all()
            )
            for chapter in chapters:
                audio_url = f"{self.site_url}/podcast/v1/{quote(token)}/audio/{edition.id}/chapter/{chapter.number}.mp3"
                pubdate = chapter.first_published_at or edition.published_at or edition.create_time or utcnow()
                if pubdate.tzinfo is None:
                    pubdate = pubdate.replace(tzinfo=datetime.timezone.utc)
                feed_dates.append(pubdate)
                duration = max(0, chapter.duration_ms // 1000)
                duration_text = f"{duration // 3600:02d}:{duration % 3600 // 60:02d}:{duration % 60:02d}"
                items.append(
                    "".join(
                        (
                            "<item>",
                            f"<title>{escape('《' + book['title'] + '》·' + chapter.title)}</title>",
                            f'<guid isPermaLink="false">{escape(chapter.episode_guid)}</guid>',
                            f"<pubDate>{format_datetime(pubdate)}</pubDate>",
                            f'<enclosure url="{escape(audio_url)}" length="{chapter.size_bytes}" type="audio/mpeg" />',
                            f"<itunes:season>{edition.book_id}</itunes:season>",
                            f"<itunes:episode>{chapter.number}</itunes:episode>",
                            "<itunes:episodeType>full</itunes:episodeType>",
                            f"<itunes:duration>{duration_text}</itunes:duration>",
                            f'<itunes:image href="{escape(self.site_url + "/podcast/v1/" + quote(token) + "/cover/" + str(edition.book_id) + ".jpg")}" />',
                            "</item>",
                        )
                    )
                )
        title = f"{CONF.get('site_title', 'Talebook')} · 私人有声书"
        build_date = max(feed_dates, default=datetime.datetime(1970, 1, 1, tzinfo=datetime.timezone.utc))
        body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">'
            f"<channel><title>{escape(title)}</title><link>{escape(self.site_url)}</link>"
            "<description>你的 Talebook 私人有声书馆藏</description><language>zh-cn</language>"
            "<itunes:type>serial</itunes:type><itunes:block>Yes</itunes:block>"
            f"<lastBuildDate>{format_datetime(build_date)}</lastBuildDate>{''.join(items)}</channel></rss>"
        ).encode("utf-8")
        etag = '"' + hashlib.sha256(body).hexdigest() + '"'
        last_modified = format_datetime(build_date, usegmt=True)
        self.set_header("Content-Type", "application/rss+xml; charset=utf-8")
        self.set_header("ETag", etag)
        self.set_header("Last-Modified", last_modified)
        self.set_header("Cache-Control", "private, max-age=300")
        if self.request.headers.get("If-None-Match") == etag or self.request.headers.get("If-Modified-Since") == last_modified:
            self.set_status(304)
            self.finish()
            _audit(self, subscription, kind="feed", status=304)
            return
        self.set_header("Content-Length", str(len(body)))
        if self.request.method != "HEAD":
            self.write(body)
        self.finish()
        _audit(self, subscription, kind="feed", status=200, size=len(body))

    head = get


class PodcastCover(PodcastBaseHandler):
    def get(self, token, book_id):
        subscription, reader = _subscription(self, token)
        if not _can_subscription_view(self.session, reader, int(book_id)):
            raise tornado.web.HTTPError(404)
        cover = self.db.cover(int(book_id), index_is_id=True)
        if not cover:
            raise tornado.web.HTTPError(404)
        self.set_header("Content-Type", "image/jpeg")
        self.set_header("Content-Length", str(len(cover)))
        self.set_header("Cache-Control", "private, max-age=86400")
        if self.request.method != "HEAD":
            self.write(cover)
        self.finish()
        _audit(self, subscription, kind="cover", status=200, book_id=int(book_id), size=len(cover))

    head = get


class PodcastAudio(PodcastBaseHandler):
    def get(self, token, edition_id, chapter_number):
        subscription, reader = _subscription(self, token)
        edition = self.session.get(AudiobookEdition, int(edition_id))
        hidden = {int(value) for value in (subscription.hidden_books or {}).get("ids", [])}
        if (
            not edition
            or edition.status != "published"
            or edition.book_id in hidden
            or not _can_subscription_view(self.session, reader, edition.book_id)
        ):
            raise tornado.web.HTTPError(404)
        chapter = (
            self.session.query(AudiobookChapter)
            .filter(AudiobookChapter.edition_id == edition.id, AudiobookChapter.number == int(chapter_number))
            .first()
        )
        if not chapter:
            raise tornado.web.HTTPError(404)
        status, size, start, end = _range(self, AudiobookStorage().resolve(chapter.audio_path, must_exist=True))
        _audit(
            self,
            subscription,
            kind="audio",
            status=status,
            book_id=edition.book_id,
            edition_id=edition.id,
            chapter_id=chapter.id,
            size=size,
            start=start,
            end=end,
        )

    head = get


class PodcastAudit(BaseHandler):
    @js
    @is_admin
    def get(self):
        query = self.session.query(PodcastAccessLog).order_by(PodcastAccessLog.create_time.desc())
        rows = query.limit(500).all()
        return {
            "err": "ok",
            "logs": [
                {
                    "id": row.id,
                    "subscription_id": row.subscription_id,
                    "book_id": row.book_id,
                    "chapter_id": row.chapter_id,
                    "kind": row.kind,
                    "method": row.method,
                    "status": row.status,
                    "range_start": row.range_start,
                    "range_end": row.range_end,
                    "bytes_sent": row.bytes_sent,
                    "ip": row.ip,
                    "user_agent": row.user_agent,
                    "protected": bool(row.protected),
                    "created_at": row.create_time.isoformat(),
                }
                for row in rows
            ],
        }

    @js
    @is_admin
    def patch(self):
        try:
            body = _json_body(self)
            ids = {int(value) for value in body.get("ids", [])}
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": _("审计记录参数无效")}
        if not ids or len(ids) > 500:
            return {"err": "params.invalid", "msg": _("审计记录参数无效")}
        protected = bool(body.get("protected", True))
        count = (
            self.session.query(PodcastAccessLog)
            .filter(PodcastAccessLog.id.in_(ids))
            .update({PodcastAccessLog.protected: protected}, synchronize_session=False)
        )
        self.session.commit()
        return {"err": "ok", "updated": count, "protected": protected}


class AudiobookVoices(BaseHandler):
    @js
    @auth
    def get(self):
        process = VoicebookProcess(AudiobookStorage())
        try:
            result = subprocess.run(
                process.command + ["voices", "--format", "json", "--include-paths"],
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            )
            catalog = json.loads(result.stdout)
        except (OSError, subprocess.SubprocessError, ValueError) as exc:
            return {"err": "voicebook.unavailable", "msg": str(exc), "catalog": {"voices": [], "scene_definitions": []}}
        for voice in catalog.get("voices", []):
            preview_path = voice.pop("preview_path", None)
            if preview_path:
                voice["preview_url"] = f"/media/audio-voice/{quote(str(voice['engine']))}/{quote(str(voice['voice_id']))}.mp3"
        return {"err": "ok", "catalog": catalog}


class AudiobookVoicePreview(BaseHandler):
    @auth
    def get(self, engine, voice_id):
        process = VoicebookProcess(AudiobookStorage())
        try:
            result = subprocess.run(
                process.command + ["voices", "--engine", engine, "--format", "json", "--include-paths"],
                capture_output=True,
                text=True,
                timeout=10,
                check=True,
            )
            catalog = json.loads(result.stdout)
            voice = next(
                item for item in catalog.get("voices", []) if item.get("engine") == engine and item.get("voice_id") == voice_id
            )
            path = Path(voice["preview_path"]).resolve()
        except (OSError, subprocess.SubprocessError, ValueError, KeyError, StopIteration):
            raise tornado.web.HTTPError(404)
        if not path.is_file() or path.suffix.lower() != ".mp3":
            raise tornado.web.HTTPError(404)
        _range(self, path)

    head = get


class AudiobookMyStats(BaseHandler):
    @js
    @auth
    def get(self):
        sessions = self.session.query(AudiobookPlaybackSession).filter(AudiobookPlaybackSession.reader_id == self.user_id())
        progress = self.session.query(AudiobookProgress).filter(AudiobookProgress.reader_id == self.user_id())
        return {
            "err": "ok",
            "first_party": {
                "listened_ms": sessions.with_entities(
                    func.coalesce(func.sum(AudiobookPlaybackSession.listened_ms), 0)
                ).scalar(),
                "sessions": sessions.count(),
                "completed_books": progress.filter(AudiobookProgress.is_finished.is_(True)).count(),
            },
            "podcast_estimated": {"requests": 0, "bytes": 0},
        }


class AudiobookAdminStats(BaseHandler):
    @js
    @is_admin
    def get(self):
        podcast = self.session.query(PodcastAccessLog)
        return {
            "err": "ok",
            "first_party": {
                "listened_ms": self.session.query(func.coalesce(func.sum(AudiobookPlaybackSession.listened_ms), 0)).scalar(),
                "sessions": self.session.query(AudiobookPlaybackSession).count(),
            },
            "podcast_estimated": {
                "requests": podcast.count(),
                "bytes": podcast.with_entities(func.coalesce(func.sum(PodcastAccessLog.bytes_sent), 0)).scalar(),
            },
            "jobs": {
                "total": self.session.query(AudiobookJob).count(),
                "failed": self.session.query(AudiobookJob).filter(AudiobookJob.status == "failed").count(),
            },
        }


def routes():
    return [
        (r"/api/audios/home", AudiobookHome),
        (r"/api/audios", AudiobookList),
        (r"/api/book/([0-9]+)/audios", AudiobookDetail),
        (r"/api/book/([0-9]+)/audio-jobs", AudiobookJobCreate),
        (r"/api/audio-jobs", AudiobookJobs),
        (r"/api/audio-job/([0-9]+)", AudiobookJobAction),
        (r"/api/audio-job/([0-9]+)/workspace", AudiobookWorkspace),
        (r"/api/audio-job/([0-9]+)/confirm", AudiobookConfirm),
        (r"/api/audio/([0-9]+)", AudiobookManifest),
        (r"/api/audio/([0-9]+)/chapter/([0-9]+)/timeline", AudiobookTimeline),
        (r"/media/audio/([0-9]+)/chapter/([0-9]+)\.mp3", AudiobookAudio),
        (r"/api/audio/([0-9]+)/sessions", PlaybackSessionCreate),
        (r"/api/audio-session/([a-f0-9]+)", PlaybackSessionUpdate),
        (r"/api/audio-session/([a-f0-9]+)/close", PlaybackSessionUpdate),
        (r"/api/audio/([0-9]+)/bookmarks", AudiobookBookmarks),
        (r"/api/me/podcast-subscription", PodcastSubscriptionAPI),
        (r"/podcast/v1/([^/]+)/feed\.xml", PodcastFeed),
        (r"/podcast/v1/([^/]+)/cover/([0-9]+)\.jpg", PodcastCover),
        (r"/podcast/v1/([^/]+)/audio/([0-9]+)/chapter/([0-9]+)\.mp3", PodcastAudio),
        (r"/api/audio-voices", AudiobookVoices),
        # Qwen voice IDs may contain spaces. The handler resolves the decoded ID
        # against Voicebook's catalog before serving the catalog-owned MP3 path.
        (r"/media/audio-voice/([a-z0-9]+)/([^/]+)\.mp3", AudiobookVoicePreview),
        (r"/api/audio-stats/me", AudiobookMyStats),
        (r"/api/admin/audio-stats", AudiobookAdminStats),
        (r"/api/admin/podcast-audits", PodcastAudit),
    ]
