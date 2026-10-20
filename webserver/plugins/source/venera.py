"""Run a verified Venera source in a bounded QuickJS process, through SourceProvider."""

import base64
import hashlib
import json
import re
import selectors
import subprocess
import sys
import threading
import time
import urllib.parse
import uuid
from pathlib import Path

import requests

from webserver.plugins.runtime.domains import (
    Category,
    CheckReport,
    Page,
    SourceBook,
    SourceBookDetail,
    SourceChapter,
    SourceContent,
)
from webserver.plugins.runtime.protocol import UpstreamAuthError, UpstreamError
from webserver.plugins.runtime.safe_http import EndpointPolicyError, EndpointResponseTooLarge, SafeHttpClient
from webserver.plugins.source.base import _manifest


PLUGIN_ID = "talebook.source.venera"
SOURCE_COMMIT = "d8a71168a83a6797482a5be9c000989dabf21c08"
SOURCE_URL = f"https://api.github.com/repos/venera-app/venera-configs/contents/manga_dex.js?ref={SOURCE_COMMIT}"
SOURCE_SHA256 = "c8beb84262da8fa3922ff0392fc2f79f03ee36ae08933d10571172ef6c8ce21d"
MAX_REQUESTS = 40
MAX_PAGES = 1000
_SOURCE = None
_SOURCE_LOCK = threading.Lock()


class VeneraUnsupported(UpstreamError):
    code = "venera.unsupported"


class VeneraTimeout(UpstreamError):
    code = "venera.timeout"


class VeneraScopeDenied(UpstreamError):
    code = "plugin.scope_denied"


class PublicSession(requests.Session):
    """Bound the response while streaming and retain no upstream session cookies."""

    def __init__(self, max_bytes):
        super().__init__()
        self.max_bytes = max_bytes

    def request(self, *args, **kwargs):
        self.cookies.clear()
        kwargs["stream"] = True
        deadline = time.monotonic() + float(kwargs.get("timeout", 20))
        response = super().request(*args, **kwargs)
        try:
            content = bytearray()
            for chunk in response.iter_content(65536):
                if time.monotonic() >= deadline:
                    raise requests.ReadTimeout("Venera upstream deadline exceeded")
                content.extend(chunk)
                if len(content) > self.max_bytes:
                    raise EndpointResponseTooLarge("漫画源响应超出大小限制")
            response._content = bytes(content)
            response._content_consumed = True
            return response
        finally:
            response.close()
            self.cookies.clear()


def public_http(max_bytes=4 * 1024 * 1024):
    session = PublicSession(max_bytes)
    session.trust_env = False
    session.headers.clear()
    return SafeHttpClient(session=session, max_bytes=max_bytes, max_redirects=0, plugin_key=PLUGIN_ID)


def image_endpoint(url):
    parsed = urllib.parse.urlsplit(str(url))
    host = parsed.hostname or ""
    allowed_host = host in {"mangadex.org", "uploads.mangadex.org"} or host.endswith(".mangadex.network")
    if (
        parsed.scheme != "https"
        or not allowed_host
        or parsed.port not in {None, 443}
        or parsed.username
        or parsed.password
        or parsed.fragment
        or not re.fullmatch(r"/(?:covers|data|data-saver)/[^?#]+", parsed.path)
    ):
        raise EndpointPolicyError("漫画图片地址不在已验证的源兼容范围内")
    return str(url)


def source_script(http, timeout):
    global _SOURCE
    deadline = time.monotonic() + timeout
    if not _SOURCE_LOCK.acquire(timeout=timeout):
        raise VeneraTimeout("源脚本加载超时，请重试")
    try:
        if _SOURCE is None:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise VeneraTimeout("源脚本加载超时，请重试")
            raw = http.request(
                "GET", SOURCE_URL, timeout=remaining, headers={"Accept": "application/vnd.github.raw+json"}
            ).content
            if hashlib.sha256(raw).hexdigest() != SOURCE_SHA256:
                raise VeneraUnsupported("Venera 源脚本摘要不匹配，请管理员检查源版本")
            _SOURCE = raw.decode("utf-8")
        return _SOURCE
    finally:
        _SOURCE_LOCK.release()


def run_source(script, operation, args, config, http):
    timeout = max(0.01, min(60, float(config.get("timeout_seconds", 20))))
    deadline = time.monotonic() + timeout
    payload = {
        "source": script,
        "host": Path(__file__).with_name("venera_host.js").read_text(),
        "input": {
            "operation": operation,
            "args": args,
            "locale": config.get("locale", "zh_CN"),
            "rating": config.get("content_rating", "safe"),
            "settings": {"image_quality": config.get("image_quality", "Original")},
        },
    }
    process = subprocess.Popen(
        [sys.executable, "-I", str(Path(__file__).with_name("venera_worker.py"))],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        env={"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8"},
    )
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    try:
        process.stdin.write((json.dumps(payload) + "\n").encode())
        process.stdin.flush()
        buffer = b""
        request_count = 0
        request_failures = {}
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not selector.select(remaining):
                raise VeneraTimeout("Venera 漫画源请求超时，请重试或调整连接超时")
            chunk = process.stdout.read1(65536)
            if not chunk:
                raise VeneraUnsupported("Venera 源执行失败或超出资源限制")
            buffer += chunk
            if len(buffer) > 8 * 1024 * 1024:
                raise VeneraUnsupported("Venera 源结果超出大小限制")
            while b"\n" in buffer:
                line, buffer = buffer.split(b"\n", 1)
                message = json.loads(line)
                if message.get("error"):
                    failure = request_failures.get(message.get("requestId"))
                    if failure is not None:
                        raise failure
                    raise VeneraUnsupported("Venera 源执行失败：接口不兼容或上游响应异常")
                if "result" in message:
                    return message["result"]
                request_count += 1
                if request_count > MAX_REQUESTS:
                    raise VeneraUnsupported("漫画源请求过多，章节列表超出当前兼容范围")
                request = message["request"]
                parsed = urllib.parse.urlsplit(str(request["url"]))
                if (
                    request["method"] != "GET"
                    or request.get("data")
                    or parsed.scheme != "https"
                    or parsed.hostname != "api.mangadex.org"
                    or parsed.port not in {None, 443}
                    or parsed.username
                    or parsed.password
                    or parsed.fragment
                    or request.get("headers")
                ):
                    raise EndpointPolicyError("Venera 源发起了不受支持的网络请求")
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise VeneraTimeout("Venera 漫画源请求超时")
                try:
                    response = http.request("GET", request["url"], timeout=remaining)
                except (EndpointPolicyError, EndpointResponseTooLarge):
                    # Host policy and resource limits cannot be swallowed by source code.
                    raise
                except (requests.RequestException, UpstreamError) as exc:
                    request_failures[request["id"]] = exc
                    # Only a correlation ID crosses IPC; exception text may contain secrets.
                    reply = {"id": request["id"], "error": True}
                else:
                    reply = {
                        "id": request["id"],
                        "response": {
                            "status": response.status_code,
                            "headers": {},
                            "body": response.content.decode("utf-8"),
                        },
                    }
                process.stdin.write((json.dumps(reply) + "\n").encode())
                process.stdin.flush()
    except (BrokenPipeError, ValueError, KeyError, TypeError) as exc:
        raise VeneraUnsupported("Venera 漫画源返回了不兼容的数据") from exc
    finally:
        selector.close()
        if process.poll() is None:
            process.kill()
        process.communicate()


def manga_id(value):
    try:
        return str(uuid.UUID(str(value)))
    except ValueError as exc:
        raise VeneraUnsupported("无效的 MangaDex 漫画或章节标识") from exc


def chapter_id(book_id, episode_id):
    return base64.urlsafe_b64encode(json.dumps([book_id, episode_id]).encode()).decode().rstrip("=")


class VeneraProvider:
    download_mode = "none"

    def __init__(self):
        self.manifest = _manifest(
            PLUGIN_ID,
            "Venera 漫画源",
            "在在线书库浏览、搜索并阅读 MangaDex。固定官方 Venera 源脚本；公开阅读无需源账号，论坛登录不支持。",
            ["sources.search", "sources.browse"],
            {
                "type": "object",
                "required": ["source"],
                "additionalProperties": False,
                "properties": {
                    "source": {"type": "string", "title": "漫画源", "enum": ["MangaDex"], "default": "MangaDex"},
                    "locale": {"type": "string", "title": "标题语言", "enum": ["zh_CN", "zh_TW", "en"], "default": "zh_CN"},
                    "image_quality": {
                        "type": "string",
                        "title": "图片质量",
                        "enum": ["Original", "Compressed"],
                        "default": "Original",
                    },
                    "content_rating": {
                        "type": "string",
                        "title": "搜索内容分级",
                        "enum": ["safe", "suggestive", "erotica"],
                        "default": "safe",
                    },
                    "timeout_seconds": {
                        "type": "integer",
                        "title": "连接超时（秒）",
                        "minimum": 1,
                        "maximum": 60,
                        "default": 20,
                    },
                },
            },
            homepage="https://github.com/venera-app/venera",
            runtime_kind="managed_process",
        )
        self.manifest.update(download_mode="none", actions=["test"], permissions=["books.read", "network.read"])
        self.manifest["ui"]["icon"] = "mdi-book-open-page-variant"

    def _call(self, operation, args, context):
        config = context.get("config") or {}
        if config.get("source", "MangaDex") not in {"manga_dex", "MangaDex"} or context.get("secrets"):
            raise VeneraUnsupported("本接入仅支持 MangaDex 公开阅读，无需账号；论坛登录与其他源暂不支持")
        if "scopes" in context and {"books.read", "network.read"} - set(context["scopes"]):
            raise VeneraScopeDenied("漫画源连接缺少阅读或网络权限，请管理员检查连接权限")
        http = public_http()
        try:
            timeout = max(1, min(60, float(config.get("timeout_seconds", 20))))
            started = time.monotonic()
            script = source_script(http, timeout)
            remaining = timeout - (time.monotonic() - started)
            if remaining <= 0:
                raise VeneraTimeout("源脚本加载超时，请重试")
            config = {**config, "timeout_seconds": remaining}
            return run_source(script, operation, args, config, http)
        except UpstreamAuthError as exc:
            raise UpstreamAuthError("漫画源拒绝公开访问；本接入不支持论坛登录，请检查源服务状态") from exc
        except requests.Timeout as exc:
            raise VeneraTimeout("漫画源连接超时，请稍后重试或调整超时") from exc
        except requests.RequestException as exc:
            raise UpstreamError("无法连接 Venera 漫画源，请检查网络后重试", error_type="network") from exc
        finally:
            http.session.close()

    @staticmethod
    def _summary(item):
        return SourceBook(
            external_id=manga_id(item["id"]),
            title=str(item["title"]),
            authors=tuple(item.get("authors") or [item.get("subtitle") or ""]),
            source="MangaDex · Venera",
            cover_url=str(item.get("cover") or ""),
            description=str(item.get("description") or ""),
            format="comic",
            access="online",
            extra={"media_type": "comic", "online_readable": True},
        )

    def search(self, query, cursor, context):
        page = max(1, min(500, int((cursor or {}).get("page", 1))))
        result = self._call("search", {"query": urllib.parse.quote(str(query), safe=" "), "page": page}, context)
        return self._page(result, page)

    def browse(self, category_id, cursor, context):
        category = category_id or "recent"
        if category not in {"recent", "popular", "updated"}:
            raise VeneraUnsupported("不支持的 MangaDex 浏览分类")
        page = max(1, min(500, int((cursor or {}).get("page", 1))))
        return self._page(self._call("browse", {"category": category, "page": page}, context), page)

    def _page(self, result, page):
        more = page < min(500, int(result.get("maxPage") or 0))
        return Page(
            items=[self._summary(item) for item in result["comics"]],
            has_more=more,
            next_cursor={"page": page + 1} if more else {},
        )

    def get_categories(self, context):
        return [Category("recent", "最新漫画"), Category("popular", "热门漫画"), Category("updated", "最近更新")]

    def get_book(self, external_id, context):
        book_id = manga_id(external_id)
        item = self._call("book", {"id": book_id}, context)
        return SourceBookDetail(
            external_id=book_id,
            title=str(item["title"]),
            authors=(str(item.get("subtitle") or ""),),
            description=str(item.get("description") or ""),
            cover_url=str(item.get("cover") or ""),
            toc_ref=book_id,
            source="MangaDex · Venera",
            format="comic",
            extra={"media_type": "comic", "online_readable": True, "chapters": item.get("chapters") or []},
        )

    def get_toc(self, book, context):
        if "chapters" not in book.extra:
            book = self.get_book(book.external_id or book.toc_ref, context)
        return [
            SourceChapter(chapter_id(book.external_id, manga_id(item["id"])), str(item["title"]))
            for item in book.extra["chapters"]
        ]

    def get_chapter(self, chapter, context):
        try:
            book_id, episode_id = json.loads(
                base64.urlsafe_b64decode(chapter.external_id + "=" * (-len(chapter.external_id) % 4))
            )
        except (ValueError, TypeError) as exc:
            raise VeneraUnsupported("漫画章节标识无效") from exc
        result = self._call("pages", {"id": manga_id(book_id), "chapter": manga_id(episode_id)}, context)
        images = result.get("images")
        if not isinstance(images, list) or not 1 <= len(images) <= MAX_PAGES:
            raise VeneraUnsupported("该章节没有可读取的页面，或页面数量超出当前兼容范围")
        for item in images:
            image_endpoint(item["url"])
            if item.get("fallback"):
                image_endpoint(item["fallback"])
            if item.get("headers") != {"Referer": "https://mangadex.org/", "Origin": "https://mangadex.org"}:
                raise VeneraUnsupported("漫画图片请求配置不兼容")
        return SourceContent(title=chapter.title, extra={"media_type": "comic", "images": images})

    def download(self, book, context):
        raise VeneraUnsupported("此漫画源仅支持在线阅读")

    def self_check(self, context):
        self.browse("recent", {"page": 1}, context)
        return CheckReport(True, "MangaDex 连接可用；公开阅读无需源账号")


PROVIDER = VeneraProvider()
