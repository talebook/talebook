from __future__ import annotations

import http.cookiejar
import json
import socket
import urllib.error
import urllib.parse
import urllib.request
from collections.abc import Mapping
from typing import Any

from .config import AppPaths, Config, secure_cookie_file
from .models import Audiobook, Chapter


class TalebookError(RuntimeError):
    """Base error with a user-safe message."""


class AuthenticationError(TalebookError):
    pass


class TransportError(TalebookError):
    pass


class ResponseError(TalebookError):
    pass


class TalebookClient:
    def __init__(self, config: Config, paths: AppPaths | None = None, timeout: float = 15.0):
        self.config = config
        self.paths = paths or AppPaths.default()
        self.timeout = timeout
        self.cookie_jar = http.cookiejar.MozillaCookieJar(str(secure_cookie_file(self.paths)))
        if self.paths.cookie_file.exists():
            try:
                self.cookie_jar.load(ignore_discard=True, ignore_expires=False)
            except (OSError, http.cookiejar.LoadError):
                self.paths.cookie_file.unlink(missing_ok=True)
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.cookie_jar))

    def login(self, password: str) -> None:
        if not password:
            raise AuthenticationError("密码不能为空")
        response = self._request_json(
            "/api/user/sign_in",
            method="POST",
            form={"username": self.config.username, "password": password},
        )
        if response.get("err") != "ok":
            raise AuthenticationError(str(response.get("msg") or "登录失败，请检查账号和密码"))
        self.cookie_jar.save(ignore_discard=True, ignore_expires=True)
        self.paths.cookie_file.chmod(0o600)

    def logout(self) -> None:
        self.cookie_jar.clear()
        self.paths.cookie_file.unlink(missing_ok=True)

    def require_login(self) -> Mapping[str, Any]:
        response = self._request_json("/api/user/info")
        user = response.get("user")
        if response.get("err") != "ok" or not isinstance(user, dict) or not user.get("is_login"):
            raise AuthenticationError("登录态无效或已过期；请运行 talebook-audio login")
        return user

    def list_audiobooks(self) -> list[Audiobook]:
        self.require_login()
        response = self._request_json("/api/audios")
        if response.get("err") != "ok":
            raise ResponseError(str(response.get("msg") or "无法获取有声书列表"))
        return parse_audiobook_list(response)

    def list_chapters(self, edition_id: int) -> list[Chapter]:
        response = self._request_json(f"/api/audio/{int(edition_id)}")
        if response.get("err") != "ok":
            raise ResponseError(str(response.get("msg") or "无法获取有声书章节"))
        return parse_manifest(response, self.config.server)

    def _request_json(
        self,
        path: str,
        *,
        method: str = "GET",
        form: Mapping[str, str] | None = None,
    ) -> dict[str, Any]:
        url = self.config.server.rstrip("/") + "/" + path.lstrip("/")
        data = urllib.parse.urlencode(form).encode("utf-8") if form is not None else None
        request = urllib.request.Request(
            url,
            data=data,
            method=method,
            headers={"Accept": "application/json", "User-Agent": "talebook-audio-cli/0.1"},
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                payload = response.read()
        except urllib.error.HTTPError as exc:
            raise TransportError(f"Talebook 返回 HTTP {exc.code}") from exc
        except (urllib.error.URLError, socket.timeout, TimeoutError, OSError) as exc:
            reason = getattr(exc, "reason", None)
            detail = str(reason) if reason else exc.__class__.__name__
            raise TransportError(f"无法连接 Talebook（{detail}）") from exc
        try:
            value = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise ResponseError("Talebook 返回了无法解析的响应") from exc
        if not isinstance(value, dict):
            raise ResponseError("Talebook 返回的数据格式无效")
        return value


def _integer(value: Any, field: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ResponseError(f"Talebook 响应缺少有效的 {field}") from exc


def parse_audiobook_list(response: Mapping[str, Any]) -> list[Audiobook]:
    raw_books = response.get("books", [])
    if not isinstance(raw_books, list):
        raise ResponseError("Talebook 有声书列表格式无效")
    books: list[Audiobook] = []
    for raw in raw_books:
        if not isinstance(raw, dict) or not isinstance(raw.get("edition"), dict):
            raise ResponseError("Talebook 有声书条目格式无效")
        edition = raw["edition"]
        books.append(
            Audiobook(
                book_id=_integer(raw.get("id"), "book id"),
                edition_id=_integer(edition.get("id"), "edition id"),
                title=str(raw.get("title") or "未命名书籍"),
                author=str(raw.get("author") or "未知作者"),
                chapter_count=max(0, _integer(edition.get("chapter_count", 0), "chapter count")),
                duration_ms=max(0, _integer(edition.get("duration_ms", 0), "duration")),
            )
        )
    return books


def parse_manifest(response: Mapping[str, Any], server: str) -> list[Chapter]:
    manifest = response.get("manifest")
    if not isinstance(manifest, dict) or not isinstance(manifest.get("chapters"), list):
        raise ResponseError("Talebook 有声书章节格式无效")
    chapters: list[Chapter] = []
    for raw in manifest["chapters"]:
        if not isinstance(raw, dict):
            raise ResponseError("Talebook 章节条目格式无效")
        audio_path = str(raw.get("audio_url") or "")
        if not audio_path:
            raise ResponseError("Talebook 章节缺少音频地址")
        audio_url = urllib.parse.urljoin(server.rstrip("/") + "/", audio_path.lstrip("/"))
        chapters.append(
            Chapter(
                id=_integer(raw.get("id"), "chapter id"),
                number=_integer(raw.get("number"), "chapter number"),
                title=str(raw.get("title") or f"第 {raw.get('number', '?')} 章"),
                duration_ms=max(0, _integer(raw.get("duration_ms", 0), "chapter duration")),
                audio_url=audio_url,
            )
        )
    return sorted(chapters, key=lambda chapter: chapter.number)
