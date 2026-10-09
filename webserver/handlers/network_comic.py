"""Authenticated online-comic manifests and same-origin image transport."""

import functools
import urllib.parse

import tornado.escape
import tornado.ioloop
import tornado.web

from webserver.base_path import public_url
from webserver.handlers.base import auth, js
from webserver.handlers.comic import KOMGA_READER_VERSION
from webserver.handlers.network_library import NetworkBaseHandler
from webserver.i18n import _, get_language
from webserver.plugins.runtime.domains import SourceChapter
from webserver.plugins.source.venera import PLUGIN_ID, image_endpoint, public_http
from webserver.services.plugin_runtime import PluginRuntimeError


TOKEN_NAME = "online-comic-image-v1"


def public_image(handler, source_key, image):
    image_endpoint(image["url"])
    token = tornado.web.create_signed_value(
        str(handler.settings["cookie_secret"]),
        TOKEN_NAME,
        tornado.escape.json_encode({"user_id": handler.user_id(), "source_id": source_key, "image": image}),
    ).decode("ascii")
    return public_url("/api/book-sources/comic/image") + "?token=" + urllib.parse.quote(token, safe="")


def comic_book(handler, item, source_key):
    if item.get("media_type") == "comic" and item.get("online_readable") and item.get("cover_url"):
        item["cover_url"] = public_image(handler, source_key, {"url": item["cover_url"]})
    return item


class OnlineComicPages(NetworkBaseHandler):
    @js
    @auth
    def get(self):
        if not self.current_user.is_active():
            return {"err": "user.activation_required", "msg": _("账号尚未激活，无法在线阅读")}
        if not self.current_user.can_read():
            return {"err": "permission.not_permit", "msg": "无阅读权限"}
        source = self.get_source(self.get_argument("source_id", ""))
        if not source or source.plugin_key != PLUGIN_ID:
            return {"err": "venera.unsupported", "msg": "漫画源不存在、未启用或不兼容"}
        chapter = self.get_argument("chapter_url", "")
        if not chapter:
            return {"err": "params.error", "msg": "缺少漫画章节标识"}
        try:
            content = self.get_catalog().read(source, "get_chapter", SourceChapter(chapter, ""))
            images = content.extra["images"]
            return {
                "err": "ok",
                "pages": [
                    {"id": str(index), "url": public_image(self, source.key, image)} for index, image in enumerate(images)
                ],
            }
        except Exception as exc:
            return {"err": getattr(exc, "code", "source.fetch_failed"), "msg": str(exc)}


def fetch_image(image):
    """Fetch bytes in a worker without a handler or database session."""
    http = public_http(max_bytes=20 * 1024 * 1024)
    try:
        candidates = [image["url"]]
        if image.get("fallback"):
            candidates.append(image["fallback"])
        for index, url in enumerate(candidates):
            try:
                response = http.request(
                    "GET",
                    image_endpoint(url),
                    headers={"Referer": "https://mangadex.org/", "Origin": "https://mangadex.org"},
                    timeout=20,
                )
                mime = response.headers.get("Content-Type", "").split(";", 1)[0].lower()
                if mime not in {"image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"}:
                    raise ValueError("Unsupported image response")
                return mime, response.content
            except Exception:
                if index == len(candidates) - 1:
                    raise
    finally:
        http.session.close()


class OnlineComicImage(NetworkBaseHandler):
    async def get(self):
        if not self.current_user or not self.current_user.can_read():
            raise tornado.web.HTTPError(401)
        if not self.current_user.is_active():
            raise tornado.web.HTTPError(403)
        raw = tornado.web.decode_signed_value(
            str(self.settings["cookie_secret"]),
            TOKEN_NAME,
            self.get_argument("token", ""),
            max_age_days=15 / 1440,
        )
        try:
            payload = tornado.escape.json_decode(raw) if raw else {}
            if payload.get("user_id") != self.user_id():
                raise ValueError("Image scope mismatch")
            source = self.get_source(payload["source_id"])
            if source is None or source.plugin_key != PLUGIN_ID:
                raise ValueError("Source unavailable")
            image = payload["image"]
            image_endpoint(image["url"])
            self.get_catalog().runtime.require_scopes(source.connection, "books.read", "network.read")
        except (KeyError, TypeError, ValueError, PluginRuntimeError):
            raise tornado.web.HTTPError(403) from None

        try:
            mime, content = await tornado.ioloop.IOLoop.current().run_in_executor(None, functools.partial(fetch_image, image))
            self.set_header("Content-Type", mime)
            self.set_header("Cache-Control", "private, no-store")
            self.set_header("X-Content-Type-Options", "nosniff")
            self.set_header("Content-Security-Policy", "default-src 'none'; sandbox")
            self.finish(content)
        except Exception:
            self.set_status(502)
            self.set_header("Cache-Control", "no-store")
            self.finish("漫画图片获取失败，请重新打开章节或检查源连接")


class OnlineComicReader(NetworkBaseHandler):
    def get(self):
        if not self.current_user:
            return self.redirect(public_url("/login"))
        if not self.current_user.is_active() or not self.current_user.can_read():
            raise tornado.web.HTTPError(403)
        source = self.get_source(self.get_argument("source_id", ""))
        if not source or source.plugin_key != PLUGIN_ID:
            raise tornado.web.HTTPError(404)
        self.set_header("Referrer-Policy", "same-origin")
        self.html_page(
            "book/online-comic-reader.html",
            {
                "READER_VERSION": KOMGA_READER_VERSION,
                "LANGUAGE": get_language(),
                "reader_messages": {
                    "title": _("在线漫画"),
                    "reader": _("漫画阅读器"),
                    "loading": _("正在加载在线漫画…"),
                    "retry": _("重试"),
                    "back": _("返回漫画详情"),
                    "refresh": _("重新加载章节"),
                    "session": _("登录已失效，请重新登录"),
                    "empty": _("该章节没有可读取的页面"),
                    "invalid": _("漫画页面列表无效"),
                    "failure": _("漫画加载失败"),
                    "image": _("漫画页面加载失败。请重新打开章节，或检查源连接与登录状态。"),
                },
            },
        )
        # html_page sets its default cache header; the authenticated Reader must override it.
        self.set_header("Cache-Control", "no-store")


def routes():
    return [
        (r"/api/book-sources/comic/pages", OnlineComicPages),
        (r"/api/book-sources/comic/image", OnlineComicImage),
        (r"/read-online-comic", OnlineComicReader),
    ]
