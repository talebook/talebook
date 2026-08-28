#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""Authenticated HTTP contract between Talebook and the comic reader."""

import functools
import math

import tornado.escape
import tornado.ioloop

from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import ReadingState
from webserver.services.comic_archive import ComicArchiveError, comic_archive_service, select_comic_container


COMIC_PROGRESS_VERSION = 1
MAX_COMIC_PROGRESS_BYTES = 2048


class ComicHandlerMixin:
    def get_authorized_comic(self, book_id):
        book_id = int(book_id)
        if not self.can_view_book(book_id):
            raise ComicArchiveError("comic.book_not_found", _("书籍不存在"), status=404)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            raise ComicArchiveError("comic.book_not_found", _("书籍不存在"), status=404)
        user = self.current_user
        if not user:
            raise ComicArchiveError("comic.login_required", _("请先登录"), status=401)
        if not user.can_read():
            raise ComicArchiveError("comic.no_permission", _("无权在线阅读"), status=403)
        if not user.is_active():
            raise ComicArchiveError("comic.account_inactive", _("账号尚未激活，无法在线阅读"), status=403)
        archive_path, archive_format = select_comic_container(book)
        return book, archive_path, archive_format

    async def load_comic_manifest(self, archive_path, archive_format):
        callback = functools.partial(comic_archive_service.get_manifest, archive_path, archive_format)
        return await tornado.ioloop.IOLoop.current().run_in_executor(None, callback)

    @staticmethod
    def error_envelope(error):
        return {"err": error.code, "msg": error.message}


class ComicManifestHandler(ComicHandlerMixin, BaseHandler):
    @js
    @auth
    async def get(self, book_id):
        try:
            book, archive_path, archive_format = self.get_authorized_comic(book_id)
            manifest = await self.load_comic_manifest(archive_path, archive_format)
        except ComicArchiveError as error:
            return self.error_envelope(error)

        self.user_history("read_history", book)
        return {
            "err": "ok",
            "contract_version": 1,
            "book_id": int(book_id),
            "title": book.get("title") or _("漫画"),
            "format": archive_format.upper(),
            "revision": manifest.revision,
            "pages_count": len(manifest.pages),
            "pages": [page.to_public_dict(int(book_id), manifest.revision) for page in manifest.pages],
        }


class ComicPageHandler(ComicHandlerMixin, BaseHandler):
    async def get(self, book_id, page_index):
        try:
            _book, archive_path, archive_format = self.get_authorized_comic(book_id)
            revision = self.get_argument("revision", "")
            callback = functools.partial(
                comic_archive_service.read_page,
                archive_path,
                archive_format,
                int(page_index),
                revision,
            )
            content = await tornado.ioloop.IOLoop.current().run_in_executor(None, callback)
        except ComicArchiveError as error:
            return self.write_protocol_error(error)
        except (TypeError, ValueError):
            return self.write_protocol_error(ComicArchiveError("comic.page_not_found", _("漫画页码超出范围"), status=404))

        self.set_header("Content-Type", content.page.mime_type)
        self.set_header("Content-Length", str(len(content.data)))
        self.set_header("Cache-Control", "private, max-age=3600, immutable")
        self.set_header("Vary", "Cookie")
        self.set_header("X-Content-Type-Options", "nosniff")
        self.set_header("Content-Security-Policy", "default-src 'none'; sandbox")
        self.write(content.data)
        self.finish()

    def write_protocol_error(self, error):
        self.set_status(error.status)
        self.set_header("Content-Type", "text/plain; charset=UTF-8")
        self.set_header("Cache-Control", "no-store")
        self.set_header("X-Content-Type-Options", "nosniff")
        self.finish(error.message)


class ComicProgressHandler(ComicHandlerMixin, BaseHandler):
    @staticmethod
    def normalized_progress(manifest, progress):
        if not isinstance(progress, dict):
            return None
        if progress.get("kind") != "comic" or progress.get("version") != COMIC_PROGRESS_VERSION:
            return None
        page_index = progress.get("pageIndex")
        if isinstance(page_index, bool) or not isinstance(page_index, int) or not manifest.pages:
            return None
        page_index = min(max(page_index, 0), len(manifest.pages) - 1)
        page = manifest.pages[page_index]
        return {
            "kind": "comic",
            "version": COMIC_PROGRESS_VERSION,
            "pageId": page.page_id,
            "pageIndex": page_index,
            "percent": round((page_index + 1) * 100 / len(manifest.pages), 2),
            "completed": page_index == len(manifest.pages) - 1,
        }

    async def _context(self, book_id):
        book, archive_path, archive_format = self.get_authorized_comic(book_id)
        manifest = await self.load_comic_manifest(archive_path, archive_format)
        return book, manifest

    @js
    @auth
    async def get(self, book_id):
        try:
            _book, manifest = await self._context(book_id)
        except ComicArchiveError as error:
            return self.error_envelope(error)

        state = (
            self.session.query(ReadingState)
            .filter(ReadingState.book_id == int(book_id), ReadingState.reader_id == self.user_id())
            .first()
        )
        progress = self.normalized_progress(manifest, state.get_progress() if state else {}) or {}
        update_time = state.progress_update_time.isoformat() if state and state.progress_update_time else None
        return {"err": "ok", "progress": progress, "update_time": update_time}

    @js
    @auth
    async def post(self, book_id):
        try:
            _book, manifest = await self._context(book_id)
        except ComicArchiveError as error:
            return self.error_envelope(error)

        if len(self.request.body) > MAX_COMIC_PROGRESS_BYTES:
            return {"err": "comic.progress_invalid", "msg": _("漫画阅读进度数据过大")}
        try:
            data = tornado.escape.json_decode(self.request.body)
        except (TypeError, ValueError):
            return {"err": "comic.progress_invalid", "msg": _("漫画阅读进度参数错误")}
        progress = data.get("progress") if isinstance(data, dict) else None
        normalized = self.normalized_progress(manifest, progress)
        if not normalized:
            return {"err": "comic.progress_invalid", "msg": _("漫画阅读进度参数错误")}

        page_id = progress.get("pageId")
        percent = progress.get("percent")
        completed = progress.get("completed")
        if (
            page_id != normalized["pageId"]
            or isinstance(percent, bool)
            or not isinstance(percent, (int, float))
            or not math.isfinite(percent)
            or not isinstance(completed, bool)
        ):
            return {"err": "comic.progress_stale", "msg": _("漫画页面列表已更新，请刷新阅读器")}

        reading_state = (
            self.session.query(ReadingState)
            .filter(ReadingState.book_id == int(book_id), ReadingState.reader_id == self.user_id())
            .first()
        )
        if not reading_state:
            reading_state = ReadingState(int(book_id), self.user_id())
            self.session.add(reading_state)
        reading_state.set_progress(normalized)
        reading_state.set_online_read(True)
        self.session.commit()
        return {"err": "ok", "msg": _("漫画阅读进度已保存"), "progress": normalized}


def routes():
    return [
        (r"/api/book/([0-9]+)/comic/pages", ComicManifestHandler),
        (r"/api/book/([0-9]+)/comic/pages/([0-9]+)", ComicPageHandler),
        (r"/api/book/([0-9]+)/comic/progress", ComicProgressHandler),
    ]
