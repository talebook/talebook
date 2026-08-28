#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""Authenticated HTTP contract between Talebook and the comic reader."""

import functools
import math
import urllib.parse

import tornado.escape
import tornado.ioloop
import tornado.web

from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _
from webserver.models import Item, Reader, ReadingState
from webserver.services.comic_archive import ComicArchiveError, comic_archive_service, select_comic_container


COMIC_PROGRESS_VERSION = 1
MAX_COMIC_PROGRESS_BYTES = 2048
COMIC_PAGE_TOKEN_NAME = "comic-page-v1"
COMIC_PAGE_TOKEN_MAX_AGE_DAYS = 1


class ComicHandlerMixin:
    def _can_user_view_book(self, book_id, user):
        item = self.session.get(Item, int(book_id))
        if not item or item.scope != "private":
            return True
        return bool(user and (user.is_admin() or item.collector_id == user.id))

    def get_authorized_comic(self, book_id, authenticated_user=None):
        book_id = int(book_id)
        if authenticated_user is None:
            if not self.can_view_book(book_id):
                raise ComicArchiveError("comic.book_not_found", _("书籍不存在"), status=404)
            user = self.current_user
        else:
            user = authenticated_user
            if not self._can_user_view_book(book_id, user):
                raise ComicArchiveError("comic.book_not_found", _("书籍不存在"), status=404)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            raise ComicArchiveError("comic.book_not_found", _("书籍不存在"), status=404)
        if not user:
            raise ComicArchiveError("comic.login_required", _("请先登录"), status=401)
        if not user.can_read():
            raise ComicArchiveError("comic.no_permission", _("无权在线阅读"), status=403)
        if not user.is_active():
            raise ComicArchiveError("comic.account_inactive", _("账号尚未激活，无法在线阅读"), status=403)
        archive_path, archive_format = select_comic_container(book)
        return book, archive_path, archive_format

    def create_page_token(self, book_id, page_index, revision):
        principal = self.admin_user or self.current_user
        payload = tornado.escape.json_encode(
            {
                "book_id": int(book_id),
                "page_index": int(page_index),
                "revision": revision,
                "user_id": principal.id,
            }
        )
        token = tornado.web.create_signed_value(
            str(self.settings["cookie_secret"]),
            COMIC_PAGE_TOKEN_NAME,
            payload,
        )
        return token.decode("ascii")

    def page_token_user(self, book_id, page_index, revision):
        token = self.get_argument("token", "")
        raw = tornado.web.decode_signed_value(
            str(self.settings["cookie_secret"]),
            COMIC_PAGE_TOKEN_NAME,
            token,
            max_age_days=COMIC_PAGE_TOKEN_MAX_AGE_DAYS,
        )
        try:
            payload = tornado.escape.json_decode(raw) if raw else {}
            token_book_id = payload.get("book_id")
            token_page_index = payload.get("page_index")
            token_revision = payload.get("revision")
            token_user_id = payload.get("user_id")
            if (
                isinstance(token_book_id, bool)
                or int(token_book_id) != int(book_id)
                or isinstance(token_page_index, bool)
                or int(token_page_index) != int(page_index)
                or token_revision != revision
                or isinstance(token_user_id, bool)
            ):
                raise ValueError("page token scope mismatch")
            user = self.session.get(Reader, int(token_user_id))
        except (AttributeError, TypeError, ValueError):
            user = None
        if not user:
            raise ComicArchiveError("comic.page_token", _("漫画页面访问凭证无效或已过期"), status=401)
        return user

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
            "pages": [self._public_page(int(book_id), manifest.revision, page) for page in manifest.pages],
        }

    def _public_page(self, book_id, revision, page):
        data = page.to_public_dict(book_id, revision)
        token = self.create_page_token(book_id, page.index, revision)
        data["url"] += "&token=" + urllib.parse.quote(token, safe="")
        return data


class ComicPageHandler(ComicHandlerMixin, BaseHandler):
    def should_be_invited(self):
        # A valid page-scoped signed token is checked in get(). Invalid tokens
        # only reach this handler and cannot unlock any other application route.
        if self.get_argument("token", ""):
            return
        return super().should_be_invited()

    async def get(self, book_id, page_index):
        try:
            page_index = int(page_index)
            revision = self.get_argument("revision", "")
            token_user = None if self.current_user else self.page_token_user(book_id, page_index, revision)
            _book, archive_path, archive_format = self.get_authorized_comic(book_id, token_user)
            callback = functools.partial(
                comic_archive_service.read_page,
                archive_path,
                archive_format,
                page_index,
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
