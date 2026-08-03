#!/usr/bin/env python3
"""Command-line client for operating a Talebook instance."""

from __future__ import annotations

import argparse
import base64
import json
import mimetypes
import os
import re
import shutil
import sys
import tempfile
import uuid
from dataclasses import dataclass
from http import client as http_client
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence, TextIO
from urllib import error, parse, request


EXIT_OK = 0
EXIT_USAGE = 2
EXIT_GUARD = 3
EXIT_TRANSPORT = 4
EXIT_API = 5
SUCCESS_ERRORS = {None, "ok", "free"}
RISK_CONFIRMATION = {"external", "admin-write", "destructive"}
TRUE_ENV_VALUES = {"1", "true", "yes", "on"}
DOWNLOAD_CHUNK_SIZE = 1024 * 1024
MAX_DOWNLOAD_ERROR_BYTES = 4 * 1024 * 1024


class CliFailure(Exception):
    def __init__(self, code: str, message: str, exit_code: int, **details: Any) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.exit_code = exit_code
        self.details = details

    def payload(self) -> dict[str, Any]:
        result = {"err": self.code, "msg": self.message}
        result.update(self.details)
        return result


def normalize_site(value: str) -> str:
    site = (value or "").strip()
    if not site:
        raise CliFailure("config.site.required", "请通过 --site 或 TALEBOOK_URL 指定 Talebook 地址", EXIT_USAGE)
    if "://" not in site:
        site = "https://" + site
    parts = parse.urlsplit(site)
    if parts.scheme not in {"http", "https"}:
        raise CliFailure("config.site.scheme", "Talebook 地址仅支持 HTTP 或 HTTPS", EXIT_USAGE)
    if not parts.netloc:
        raise CliFailure("config.site.invalid", "Talebook 地址缺少主机名", EXIT_USAGE)
    try:
        _ = parts.port
    except ValueError:
        raise CliFailure("config.site.invalid", "Talebook 地址端口不合法", EXIT_USAGE)
    if parts.username or parts.password or parts.query or parts.fragment:
        raise CliFailure("config.site.invalid", "Talebook 地址不能包含凭据、查询参数或片段", EXIT_USAGE)
    path = parts.path.rstrip("/")
    return parse.urlunsplit((parts.scheme, parts.netloc, path, "", ""))


@dataclass(frozen=True)
class Config:
    site: str
    user: str | None
    password: str | None
    timeout: float

    @classmethod
    def from_sources(cls, args: argparse.Namespace, environ: Mapping[str, str]) -> "Config":
        site = normalize_site(args.site if args.site is not None else environ.get("TALEBOOK_URL", ""))
        user = args.user if args.user is not None else environ.get("TALEBOOK_USERNAME")
        password = args.password if args.password is not None else environ.get("TALEBOOK_PASSWORD")
        user = user.strip() if user else None
        password = password if password else None
        if bool(user) != bool(password):
            raise CliFailure(
                "config.auth.pair",
                "用户名和密码必须同时提供；guest 访问时两者都不要提供",
                EXIT_USAGE,
            )
        return cls(site=site, user=user, password=password, timeout=args.timeout)


class SameOriginRedirectHandler(request.HTTPRedirectHandler):
    """Follow only same-origin redirects so Basic credentials cannot cross hosts."""

    def redirect_request(self, req: request.Request, fp: Any, code: int, msg: str, headers: Any, newurl: str) -> Any:
        old = parse.urlsplit(req.full_url)
        new = parse.urlsplit(parse.urljoin(req.full_url, newurl))
        if (old.scheme, old.hostname, old.port) != (new.scheme, new.hostname, new.port):
            raise error.HTTPError(req.full_url, 470, "cross-origin redirect refused", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def encode_multipart(fields: Mapping[str, Any], file_field: str, filename: str, content: bytes) -> tuple[bytes, str]:
    boundary = "----talebook-cli-" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for key, value in fields.items():
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode(),
                str(value).encode("utf-8"),
                b"\r\n",
            ]
        )
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    safe_filename = parse.quote(Path(filename).name)
    chunks.extend(
        [
            f"--{boundary}\r\n".encode(),
            f'Content-Disposition: form-data; name="{file_field}"; filename="{safe_filename}"\r\n'.encode(),
            f"Content-Type: {content_type}\r\n\r\n".encode(),
            content,
            b"\r\n",
            f"--{boundary}--\r\n".encode(),
        ]
    )
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


class TalebookClient:
    def __init__(self, config: Config) -> None:
        self.config = config
        self.opener = request.build_opener(SameOriginRedirectHandler())
        self._status: dict[str, Any] | None = None

    def _url(self, path: str, query: Mapping[str, Any] | Sequence[tuple[str, Any]] | None = None) -> str:
        if not path.startswith("/"):
            raise CliFailure("client.path.invalid", "内部接口路径必须以斜杠开头", EXIT_USAGE)
        url = self.config.site + path
        if query:
            url += "?" + parse.urlencode(query, doseq=True)
        return url

    def _headers(self, extra: Mapping[str, str] | None = None) -> dict[str, str]:
        headers = {"Accept": "application/json", "User-Agent": "talebook-agent-skill/1"}
        if self.config.user and self.config.password:
            token = base64.b64encode(f"{self.config.user}:{self.config.password}".encode("utf-8")).decode("ascii")
            headers["Authorization"] = "Basic " + token
        if extra:
            headers.update(extra)
        return headers

    def _open(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | Sequence[tuple[str, Any]] | None = None,
        body: bytes | None = None,
        headers: Mapping[str, str] | None = None,
    ) -> tuple[bytes, Mapping[str, str], str]:
        req = request.Request(self._url(path, query), data=body, headers=self._headers(headers), method=method)
        try:
            with self.opener.open(req, timeout=self.config.timeout) as response:
                return response.read(), response.headers, response.geturl()
        except error.HTTPError as exc:
            content = exc.read()
            parsed = parse_json_bytes(content)
            if parsed is not None:
                raise CliFailure(
                    parsed.get("err", "http.error"),
                    parsed.get("msg", f"Talebook 返回 HTTP {exc.code}"),
                    EXIT_API,
                    status=exc.code,
                )
            raise CliFailure("http.error", f"Talebook 返回 HTTP {exc.code}: {exc.reason}", EXIT_TRANSPORT, status=exc.code)
        except error.URLError as exc:
            raise CliFailure("transport.error", f"无法连接 Talebook：{exc.reason}", EXIT_TRANSPORT)
        except TimeoutError:
            raise CliFailure("transport.timeout", "连接 Talebook 超时", EXIT_TRANSPORT)

    def json(
        self,
        method: str,
        path: str,
        *,
        query: Mapping[str, Any] | Sequence[tuple[str, Any]] | None = None,
        json_body: Any = None,
        form: Mapping[str, Any] | None = None,
        multipart: tuple[Mapping[str, Any], str, str, bytes] | None = None,
    ) -> dict[str, Any]:
        body = None
        headers: dict[str, str] = {}
        if json_body is not None:
            body = json.dumps(json_body, ensure_ascii=False).encode("utf-8")
            headers["Content-Type"] = "application/json; charset=utf-8"
        elif form is not None:
            body = parse.urlencode(form).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded; charset=utf-8"
        elif multipart is not None:
            fields, file_field, filename, content = multipart
            body, content_type = encode_multipart(fields, file_field, filename, content)
            headers["Content-Type"] = content_type
        content, _, _ = self._open(method, path, query=query, body=body, headers=headers)
        result = parse_json_bytes(content)
        if result is None:
            raise CliFailure("response.not_json", "Talebook 返回了非 JSON 响应", EXIT_API)
        return result

    def download(self, path: str, output: Path, *, overwrite: bool = False) -> dict[str, Any]:
        if (output.exists() or output.is_symlink()) and not overwrite:
            raise CliFailure("file.exists", f"目标文件已存在：{output}", EXIT_USAGE)
        req = request.Request(self._url(path), headers=self._headers(), method="GET")
        try:
            response = self.opener.open(req, timeout=self.config.timeout)
        except error.HTTPError as exc:
            content = exc.read(MAX_DOWNLOAD_ERROR_BYTES + 1)
            if len(content) > MAX_DOWNLOAD_ERROR_BYTES:
                raise CliFailure("response.too_large", "Talebook 下载错误响应过大", EXIT_API, status=exc.code)
            parsed = parse_json_bytes(content)
            if parsed is not None:
                raise CliFailure(
                    str(parsed.get("err") or "http.error"),
                    str(parsed.get("msg") or f"Talebook 返回 HTTP {exc.code}"),
                    EXIT_API,
                    status=exc.code,
                )
            raise CliFailure("http.error", f"Talebook 返回 HTTP {exc.code}: {exc.reason}", EXIT_TRANSPORT, status=exc.code)
        except error.URLError as exc:
            raise CliFailure("transport.error", f"无法连接 Talebook：{exc.reason}", EXIT_TRANSPORT)
        except TimeoutError:
            raise CliFailure("transport.timeout", "连接 Talebook 超时", EXIT_TRANSPORT)

        temporary = None
        try:
            with response:
                headers = response.headers
                final_url = response.geturl()
                content_type = headers.get("Content-Type", "")
                lowered_type = content_type.lower()
                if "application/json" in lowered_type or "+json" in lowered_type:
                    content = response.read(MAX_DOWNLOAD_ERROR_BYTES + 1)
                    if len(content) > MAX_DOWNLOAD_ERROR_BYTES:
                        raise CliFailure("response.too_large", "Talebook 下载响应过大且不是文件", EXIT_API)
                    parsed = parse_json_bytes(content)
                    if parsed is None:
                        raise CliFailure("response.not_json", "Talebook 返回了无效的 JSON 下载响应", EXIT_API)
                    if parsed.get("err") not in SUCCESS_ERRORS:
                        return parsed
                    raise CliFailure("download.not_binary", "Talebook 下载接口返回了 JSON 而不是文件", EXIT_API)
                if "text/html" in lowered_type:
                    raise CliFailure("download.login_redirect", "下载被重定向到 HTML 页面，请检查登录与下载权限", EXIT_API)

                expected_bytes = None
                transfer_encoding = str(headers.get("Transfer-Encoding", "")).lower()
                content_length = headers.get("Content-Length")
                if content_length is not None and "chunked" not in transfer_encoding:
                    try:
                        expected_bytes = int(content_length)
                    except (TypeError, ValueError):
                        raise CliFailure("response.invalid", "Talebook 下载响应的 Content-Length 无效", EXIT_TRANSPORT)
                    if expected_bytes < 0:
                        raise CliFailure("response.invalid", "Talebook 下载响应的 Content-Length 无效", EXIT_TRANSPORT)

                output.parent.mkdir(parents=True, exist_ok=True)
                fd, temporary_name = tempfile.mkstemp(prefix=f".{output.name}.", suffix=".download", dir=output.parent)
                temporary = Path(temporary_name)
                written = 0
                with os.fdopen(fd, "wb") as stream:
                    while True:
                        try:
                            chunk = response.read(DOWNLOAD_CHUNK_SIZE)
                        except http_client.IncompleteRead as exc:
                            partial = exc.partial if isinstance(exc.partial, (bytes, bytearray)) else b""
                            raise CliFailure(
                                "download.incomplete",
                                "Talebook 下载连接提前结束",
                                EXIT_TRANSPORT,
                                received_bytes=written + len(partial),
                            )
                        except http_client.HTTPException as exc:
                            raise CliFailure("transport.error", f"Talebook 下载连接异常：{exc}", EXIT_TRANSPORT)
                        except TimeoutError:
                            raise CliFailure("transport.timeout", "下载 Talebook 文件超时", EXIT_TRANSPORT)
                        except OSError as exc:
                            raise CliFailure("transport.error", f"Talebook 下载连接异常：{exc}", EXIT_TRANSPORT)
                        if not chunk:
                            break
                        stream.write(chunk)
                        written += len(chunk)

            if expected_bytes is not None and written != expected_bytes:
                raise CliFailure(
                    "download.incomplete",
                    "Talebook 下载内容不完整",
                    EXIT_TRANSPORT,
                    expected_bytes=expected_bytes,
                    received_bytes=written,
                )

            if (output.exists() or output.is_symlink()) and not overwrite:
                raise CliFailure("file.exists", f"目标文件已存在：{output}", EXIT_USAGE)
            if overwrite:
                os.replace(temporary, output)
            else:
                temporary.rename(output)
            temporary = None
            return {
                "err": "ok",
                "path": str(output.resolve()),
                "bytes": written,
                "content_type": content_type,
                "source": final_url,
            }
        except TimeoutError:
            raise CliFailure("transport.timeout", "下载 Talebook 文件超时", EXIT_TRANSPORT)
        finally:
            if temporary is not None:
                try:
                    temporary.unlink()
                except OSError:
                    pass

    def status(self, *, refresh: bool = False) -> dict[str, Any]:
        if refresh or self._status is None:
            self._status = self.json("GET", "/api/user/info")
        return self._status


def parse_json_bytes(content: bytes) -> dict[str, Any] | None:
    try:
        value = json.loads(content.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    return value if isinstance(value, dict) else {"err": "ok", "data": value}


def json_file(path: str) -> Any:
    try:
        return json.loads(Path(path).read_text(encoding="utf-8"))
    except OSError as exc:
        raise CliFailure("file.read", f"无法读取文件 {path}：{exc}", EXIT_USAGE)
    except json.JSONDecodeError as exc:
        raise CliFailure("file.json", f"JSON 文件格式错误 {path}：{exc}", EXIT_USAGE)


def json_argument(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError as exc:
        raise CliFailure("params.json", f"JSON 参数格式错误：{exc}", EXIT_USAGE)


def parse_scalar(value: str) -> Any:
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def key_values(values: Sequence[str] | None) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for item in values or []:
        if "=" not in item:
            raise CliFailure("params.key_value", f"参数必须使用 KEY=VALUE 格式：{item}", EXIT_USAGE)
        key, value = item.split("=", 1)
        if not key:
            raise CliFailure("params.key_value", "KEY 不能为空", EXIT_USAGE)
        result[key] = parse_scalar(value)
    return result


def csv_ints(value: str) -> list[int]:
    try:
        values = [int(item.strip()) for item in value.split(",") if item.strip()]
    except ValueError:
        raise CliFailure("params.ids", "ID 列表必须是逗号分隔的整数", EXIT_USAGE)
    if not values:
        raise CliFailure("params.ids", "ID 列表不能为空", EXIT_USAGE)
    return values


def csv_values(value: str) -> list[str]:
    values = [item.strip() for item in value.split(",") if item.strip()]
    if not values:
        raise CliFailure("params.values", "列表不能为空", EXIT_USAGE)
    return values


def require_auth(client: TalebookClient) -> dict[str, Any]:
    status = client.status()
    if status.get("err") not in SUCCESS_ERRORS:
        raise CliFailure(
            str(status.get("err") or "auth.preflight"),
            str(status.get("msg") or "读取 Talebook 身份失败"),
            EXIT_API,
        )
    if not status.get("user", {}).get("is_login"):
        raise CliFailure("auth.required", "该命令需要登录用户；请提供 --user 与 --password", EXIT_GUARD)
    return status


def require_admin(client: TalebookClient) -> dict[str, Any]:
    status = require_auth(client)
    if not status.get("user", {}).get("is_admin"):
        raise CliFailure("permission.not_admin", "该命令需要 Talebook 管理员权限", EXIT_GUARD)
    return status


def api_result(result: dict[str, Any]) -> dict[str, Any]:
    return result


def update_notifier_disabled(environ: Mapping[str, str]) -> bool:
    value = environ.get("TALEBOOK_NO_UPDATE_NOTIFIER", "")
    return value.strip().lower() in TRUE_ENV_VALUES


def update_notice(status: Any) -> dict[str, Any] | None:
    if not isinstance(status, Mapping) or not status.get("has_update"):
        return None
    current_version = str(status.get("current_version") or "未知版本")
    latest_version = str(status.get("latest_version") or "新版本")
    notice = {
        "message": f"Talebook 有新版本 {latest_version}（当前 {current_version}）",
        "current_version": status.get("current_version"),
        "latest_version": status.get("latest_version"),
    }
    release_url = status.get("latest_release_url")
    if release_url:
        notice["release_url"] = release_url
    return notice


def attach_update_notice(
    client: TalebookClient,
    result: dict[str, Any],
    *,
    command_path: str,
    environ: Mapping[str, str],
) -> dict[str, Any]:
    """Best-effort update notice that never changes the command outcome."""
    if result.get("err") not in SUCCESS_ERRORS or not client.config.user or update_notifier_disabled(environ):
        return result
    try:
        if command_path == "admin settings check-update":
            status = result.get("status")
        else:
            identity = client.status()
            user = identity.get("user")
            if identity.get("err") not in SUCCESS_ERRORS or not isinstance(user, Mapping) or not user.get("is_admin"):
                return result
            response = client.json("GET", "/api/admin/update")
            if response.get("err") not in SUCCESS_ERRORS:
                return result
            status = response.get("status")
        notice = update_notice(status)
    except CliFailure:
        return result
    if notice is None:
        return result
    enriched = dict(result)
    existing = result.get("_notice")
    notices = dict(existing) if isinstance(existing, Mapping) else {}
    notices["update"] = notice
    enriched["_notice"] = notices
    return enriched


# me commands


def cmd_me_status(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.status(refresh=True)


def cmd_me_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    if bool(args.current_password) != bool(args.new_password):
        raise CliFailure("params.password.pair", "修改密码时必须同时提供当前密码与新密码", EXIT_USAGE)
    body = {
        "nickname": args.nickname or "",
        "kindle_email": args.kindle_email or "",
        "password0": args.current_password or "",
        "password1": args.new_password or "",
        "password2": args.new_password or "",
    }
    if not any(body.values()):
        raise CliFailure("params.empty", "至少提供一个需要修改的字段", EXIT_USAGE)
    return client.json("POST", "/api/user/update", json_body=body)


def _devices(client: TalebookClient) -> list[dict[str, Any]]:
    require_auth(client)
    result = client.json("GET", "/api/user/devices")
    if result.get("err") not in SUCCESS_ERRORS:
        raise CliFailure(result.get("err", "api.error"), result.get("msg", "读取设备失败"), EXIT_API)
    return list(result.get("devices") or [])


def cmd_me_devices_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/user/devices")


def cmd_me_devices_add(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    devices = [device for device in _devices(client) if device.get("name") != args.name]
    devices.append(
        {
            "name": args.name,
            "type": args.type,
            "ip": args.ip or "",
            "port": args.port,
            "schema": args.schema,
            "mailbox": args.mailbox or "",
        }
    )
    return client.json("POST", "/api/user/devices", json_body={"devices": devices})


def cmd_me_devices_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    devices = _devices(client)
    remaining = [device for device in devices if device.get("name") != args.name]
    if len(remaining) == len(devices):
        raise CliFailure("device.not_found", f"未找到设备：{args.name}", EXIT_USAGE)
    return client.json("POST", "/api/user/devices", json_body={"devices": remaining})


# books commands


BOOK_VIEWS = {
    "library": "/api/library",
    "recent": "/api/recent",
    "hot": "/api/hot",
    "favorites": "/api/favorites",
    "shelf": "/api/shelf",
    "reading": "/api/reading",
    "finished": "/api/read-done",
    "private": "/api/scopedbooks",
}
AUTH_BOOK_VIEWS = {"favorites", "shelf", "reading", "finished", "private"}


def cmd_books_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    if args.view in AUTH_BOOK_VIEWS:
        require_auth(client)
    query = {"start": args.start}
    if args.sort:
        query["sort"] = args.sort
    return client.json("GET", BOOK_VIEWS[args.view], query=query)


def cmd_books_search(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/search", query={"name": args.name, "start": args.start})


def cmd_books_show(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", f"/api/book/{args.id}")


def cmd_books_upload(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    path = Path(args.file)
    if not path.is_file():
        raise CliFailure("file.not_found", f"找不到电子书文件：{path}", EXIT_USAGE)
    status = client.status()
    if status.get("err") not in SUCCESS_ERRORS:
        return status
    upload = status.get("sys", {}).get("upload", {})
    chunk_enabled = bool(upload.get("chunk_enabled", True))
    threshold = int(upload.get("chunk_threshold") or 8 * 1024 * 1024)
    chunk_size = max(1, int(upload.get("chunk_size") or 4 * 1024 * 1024))
    if not chunk_enabled or path.stat().st_size <= threshold:
        return client.json(
            "POST",
            "/api/book/upload",
            multipart=({}, "ebook", path.name, path.read_bytes()),
        )

    total_chunks = (path.stat().st_size + chunk_size - 1) // chunk_size
    upload_id = uuid.uuid4().hex
    with path.open("rb") as stream:
        for index in range(total_chunks):
            chunk = stream.read(chunk_size)
            result = client.json(
                "POST",
                "/api/book/upload/chunk",
                multipart=(
                    {"upload_id": upload_id, "chunk_index": index, "total_chunks": total_chunks},
                    "chunk",
                    f"{path.name}.{index}.part",
                    chunk,
                ),
            )
            if result.get("err") not in SUCCESS_ERRORS:
                return result
    return client.json(
        "POST",
        "/api/book/upload/complete",
        multipart=(
            {"upload_id": upload_id, "filename": parse.quote(path.name), "total_chunks": total_chunks},
            "chunk",
            "complete.marker",
            b"",
        ),
    )


def cmd_books_download(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    status = client.status()
    if status.get("err") not in SUCCESS_ERRORS:
        return status
    if not status.get("user", {}).get("is_login") and not status.get("sys", {}).get("allow", {}).get("download"):
        raise CliFailure("permission.guest_download", "当前实例未开放 guest 下载，请提供登录凭据", EXIT_GUARD)
    output = Path(args.output or f"{args.id}.{args.format.lower()}")
    return client.download(f"/api/book/{args.id}.{args.format.lower()}", output, overwrite=args.overwrite)


def cmd_books_edit(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    changes = key_values(args.set)
    cover = Path(args.cover) if args.cover else None
    if cover is not None and not cover.is_file():
        raise CliFailure("file.not_found", f"找不到封面文件：{cover}", EXIT_USAGE)
    cover_content = cover.read_bytes() if cover is not None else None
    if not changes and cover is None:
        raise CliFailure("params.empty", "请通过 --set 或 --cover 提供修改内容", EXIT_USAGE)

    responses: list[dict[str, Any]] = []
    if changes:
        result = client.json("POST", f"/api/book/{args.id}/edit", json_body=changes)
        if result.get("err") not in SUCCESS_ERRORS:
            return result
        responses.append(result)
    if cover is not None:
        result = client.json("POST", f"/api/book/{args.id}/edit", multipart=({}, "cover", cover.name, cover_content))
        if result.get("err") not in SUCCESS_ERRORS:
            if responses:
                partial = dict(result)
                partial["err"] = result.get("err") or "api.error"
                partial["msg"] = result.get("msg") or "封面修改失败"
                partial.update({"partial": True, "completed": ["metadata"], "failed": "cover"})
                return partial
            return result
        responses.append(result)
    return responses[-1] if len(responses) == 1 else {"err": "ok", "results": responses}


def cmd_books_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json("POST", f"/api/book/{args.id}/delete")


def cmd_books_favorite(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json("POST", f"/api/book/{args.id}/favorite", json_body={"favorite": args.favorite})


def cmd_books_shelf(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json("POST", f"/api/book/{args.id}/shelf", json_body={"shelf": args.shelf})


def cmd_books_reading_state(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    if args.value is None:
        return client.json("GET", f"/api/book/{args.id}/readstate")
    states = {"unread": 0, "reading": 1, "finished": 2}
    return client.json("POST", f"/api/book/{args.id}/readstate", json_body={"read_state": states[args.value]})


def cmd_books_reading_progress(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    if args.value is None and args.file is None:
        return client.json("GET", f"/api/book/{args.id}/progress")
    progress = json_file(args.file) if args.file else json_argument(args.value)
    if not isinstance(progress, dict):
        raise CliFailure("params.progress", "阅读进度必须是 JSON 对象", EXIT_USAGE)
    return client.json("POST", f"/api/book/{args.id}/progress", json_body={"progress": progress})


def cmd_books_reading_stats(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json("GET", "/api/reading/stats")


def cmd_books_send_device(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body = {"device_type": args.type}
    if args.type == "kindle":
        if not args.mailbox:
            raise CliFailure("params.mailbox", "Kindle 设备需要 --mailbox", EXIT_USAGE)
        body["mailbox"] = args.mailbox
    else:
        if not args.url:
            raise CliFailure("params.device_url", "非 Kindle 设备需要 --url", EXIT_USAGE)
        body["device_url"] = args.url
    return client.json("POST", f"/api/book/{args.id}/send_to_device", json_body=body)


def cmd_books_send_mail(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", f"/api/book/{args.id}/mailto", json_body={"email": args.email})


# audiobook commands


def cmd_audios_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    query = {"keyword": args.keyword} if args.keyword else None
    return client.json("GET", "/api/audios", query=query)


def _published_audio(client: TalebookClient, book_id: int) -> dict[str, Any]:
    detail = client.json("GET", f"/api/book/{book_id}/audios")
    if detail.get("err") not in SUCCESS_ERRORS:
        return detail
    book = detail.get("book")
    editions = detail.get("editions")
    if not isinstance(book, dict) or not isinstance(editions, list):
        raise CliFailure("response.invalid", "Talebook 返回的有声书详情格式无效", EXIT_API)
    published = [item for item in editions if isinstance(item, dict) and item.get("status") == "published"]
    if not published:
        return {"err": "audio.not_found", "msg": "该书没有已发布的有声版本", "book_id": book_id}
    try:
        edition_id = int(published[0]["id"])
    except (KeyError, TypeError, ValueError):
        raise CliFailure("response.invalid", "Talebook 返回的有声版本 ID 无效", EXIT_API)
    response = client.json("GET", f"/api/audio/{edition_id}")
    if response.get("err") not in SUCCESS_ERRORS:
        return response
    manifest = response.get("manifest")
    if not isinstance(manifest, dict) or not isinstance(manifest.get("chapters"), list):
        raise CliFailure("response.invalid", "Talebook 返回的有声书清单格式无效", EXIT_API)
    try:
        chapters = sorted(manifest["chapters"], key=lambda item: int(item["number"]))
    except (KeyError, TypeError, ValueError):
        raise CliFailure("response.invalid", "Talebook 返回的有声书章节编号无效", EXIT_API)
    audio = dict(manifest)
    audio["chapters"] = chapters
    return {"err": "ok", "book": book, "audio": audio}


def cmd_audios_show(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return _published_audio(client, args.book_id)


_UNSAFE_AUDIO_FILENAME = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def audio_chapter_filename(number: int, title: Any, width: int) -> str:
    safe_title = _UNSAFE_AUDIO_FILENAME.sub("_", str(title or ""))
    safe_title = re.sub(r"\s+", " ", safe_title).strip(" .")
    while len(safe_title.encode("utf-8")) > 160:
        safe_title = safe_title[:-1]
    safe_title = safe_title or f"chapter-{number:0{width}d}"
    return f"{number:0{width}d}-{safe_title}.mp3"


def cmd_audios_download(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    output = Path(args.output).expanduser()
    if output.exists() or output.is_symlink():
        raise CliFailure("file.exists", f"目标目录已存在：{output}", EXIT_USAGE)
    resolved = _published_audio(client, args.book_id)
    if resolved.get("err") not in SUCCESS_ERRORS:
        return resolved
    audio = resolved["audio"]
    chapters = audio["chapters"]
    if not chapters:
        return {"err": "audio.empty", "msg": "已发布的有声版本没有可下载章节", "book_id": args.book_id}
    try:
        chapter_numbers = [int(chapter["number"]) for chapter in chapters]
        edition_id = int(audio["id"])
    except (KeyError, TypeError, ValueError):
        raise CliFailure("response.invalid", "Talebook 返回的有声书清单格式无效", EXIT_API)
    width = max(3, len(str(max(chapter_numbers))))
    filenames = [
        audio_chapter_filename(chapter_numbers[index], chapter.get("title"), width) for index, chapter in enumerate(chapters)
    ]
    if len(filenames) != len(set(filenames)):
        raise CliFailure("response.invalid", "Talebook 返回了重复的有声书章节", EXIT_API)

    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = Path(tempfile.mkdtemp(prefix=f".{output.name}.download-", dir=output.parent))
    downloaded: list[dict[str, Any]] = []
    moved = False
    try:
        for index, chapter in enumerate(chapters):
            number = chapter_numbers[index]
            filename = filenames[index]
            target = temporary / filename
            result = client.download(f"/media/audio/{edition_id}/chapter/{number}.mp3", target)
            if result.get("err") not in SUCCESS_ERRORS:
                return result
            downloaded.append(
                {
                    "number": number,
                    "title": chapter.get("title") or "",
                    "filename": filename,
                    "bytes": result["bytes"],
                }
            )
        temporary.rename(output)
        moved = True
    finally:
        if not moved:
            shutil.rmtree(temporary, ignore_errors=True)

    absolute_output = output.resolve()
    for chapter in downloaded:
        chapter["path"] = str(absolute_output / chapter.pop("filename"))
    return {
        "err": "ok",
        "book_id": args.book_id,
        "edition_id": edition_id,
        "path": str(absolute_output),
        "chapter_count": len(downloaded),
        "bytes": sum(chapter["bytes"] for chapter in downloaded),
        "chapters": downloaded,
    }


# remote commands


def cmd_remote_sources_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/network/sources")


def cmd_remote_search_start(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    query: dict[str, Any] = {"key": args.name, "page": args.page, "mode": args.mode}
    if args.sources:
        query["sources"] = args.sources
    return client.json("GET", "/api/network/search", query=query)


def cmd_remote_search_status(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/network/search/status", query={"task_id": args.task_id})


def cmd_remote_explore_categories(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/network/categories", query={"source_id": args.source_id})


def cmd_remote_explore_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "GET",
        "/api/network/explore",
        query={"source_id": args.source_id, "url": args.url, "page": args.page},
    )


def cmd_remote_book_query(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    paths = {"show": "/api/network/book", "toc": "/api/network/toc"}
    return client.json("GET", paths[args.remote_book_cmd], query={"source_id": args.source_id, "book_url": args.book_url})


def cmd_remote_book_content(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "GET",
        "/api/network/content",
        query={"source_id": args.source_id, "chapter_url": args.chapter_url},
    )


def cmd_remote_book_save(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json(
        "POST",
        "/api/network/save",
        json_body={"source_id": args.source_id, "book_url": args.book_url, "fmt": args.format, "clean": not args.no_clean},
    )


def cmd_remote_book_save_status(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    require_auth(client)
    return client.json(
        "GET",
        "/api/network/save/status",
        query={"source_id": args.source_id, "book_url": args.book_url},
    )


def cmd_remote_library_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    query = {"start": args.start}
    if args.status:
        query["status"] = args.status
    return client.json("GET", "/api/library/online", query=query)


# admin commands


def cmd_admin_users_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "GET",
        "/api/admin/users",
        query={"page": args.page, "num": args.num, "sort": args.sort, "desc": str(args.desc).lower()},
    )


def cmd_admin_users_create(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body = {
        "username": args.username,
        "password": args.new_password,
        "name": args.name,
        "email": args.email,
        "admin": args.admin,
        "active": not args.inactive,
        "permission": args.permission or "",
    }
    return client.json("POST", "/api/admin/users", json_body=body)


def cmd_admin_users_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body: dict[str, Any] = {"id": args.id}
    if args.active is not None:
        body["active"] = args.active == "true"
    if args.admin is not None:
        body["admin"] = args.admin == "true"
    if args.permission is not None:
        body["permission"] = args.permission
    if len(body) == 1:
        raise CliFailure("params.empty", "至少提供一个需要修改的用户字段", EXIT_USAGE)
    return client.json("POST", "/api/admin/users", json_body=body)


def cmd_admin_users_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/users", json_body={"id": args.id, "delete": args.username})


def cmd_admin_users_batch(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "POST",
        "/api/admin/users/batch",
        json_body={"ids": csv_ints(args.ids), "permission": args.permission},
    )


def cmd_admin_books_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "GET",
        "/api/admin/book/list",
        query={
            "page": args.page,
            "num": args.num,
            "sort": args.sort,
            "desc": str(args.desc).lower(),
            "search": args.search or "",
        },
    )


def cmd_admin_books_task(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    is_fill = args.admin_books_cmd == "fill"
    path = "/api/admin/book/fill" if is_fill else "/api/admin/book/kindleconvert"
    if args.task_cmd == "status":
        return client.json("GET", path)
    body: dict[str, Any] = {}
    if is_fill:
        body["idlist"] = "all" if args.ids == "all" else csv_ints(args.ids)
    elif args.ids:
        body["idlist"] = csv_ints(args.ids)
    return client.json("POST", path, json_body=body)


def cmd_admin_books_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/book/delete", json_body={"idlist": csv_ints(args.ids)})


def cmd_admin_imports_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "GET",
        "/api/admin/scan/list",
        query={
            "filter": args.filter,
            "page": args.page,
            "num": args.num,
            "sort": args.sort,
            "desc": str(args.desc).lower(),
        },
    )


def cmd_admin_imports_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    hashes: str | list[str] = "all" if args.hashes == "all" else csv_values(args.hashes)
    return client.json("POST", "/api/admin/scan/delete", json_body={"hashlist": hashes})


def cmd_admin_imports_scan(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    method = "POST" if args.scan_cmd == "start" else "GET"
    path = "/api/admin/scan/run" if args.scan_cmd == "start" else "/api/admin/scan/status"
    return client.json(method, path)


def cmd_admin_imports_run(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    if args.run_cmd == "status":
        return client.json("GET", "/api/admin/import/status")
    hashes: str | list[str] = "all" if args.hashes == "all" else csv_values(args.hashes)
    return client.json(
        "POST",
        "/api/admin/import/run",
        json_body={"hashlist": hashes, "delete_after": args.delete_after},
    )


def cmd_admin_booksources_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    query = {"page": args.page, "size": args.size, "enabled": args.enabled or "", "q": args.query or ""}
    return client.json("GET", "/api/admin/booksource/list", query=query)


def cmd_admin_booksources_show(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    size = 200
    for page in range(1, 1001):
        result = client.json("GET", "/api/admin/booksource/list", query={"page": page, "size": size})
        if result.get("err") not in SUCCESS_ERRORS:
            return result
        items = result.get("items")
        if not isinstance(items, list):
            raise CliFailure("response.invalid", "Talebook 返回的书源列表格式无效", EXIT_API)
        item = next((item for item in items if isinstance(item, dict) and item.get("id") == args.id), None)
        if item is not None:
            return {"err": "ok", "item": item}
        count = result.get("count")
        if isinstance(count, int):
            if page * size >= count:
                break
        elif len(items) < size:
            break
    else:
        raise CliFailure("response.invalid", "Talebook 书源分页数量异常", EXIT_API)
    return {"err": "params.not_found", "msg": "未找到该书源"}


def cmd_admin_booksources_create(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/booksource", json_body={"raw": json_file(args.file)})


def cmd_admin_booksources_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body: dict[str, Any] = {"id": args.id}
    if args.enabled is not None:
        body["enabled"] = args.enabled == "true"
    if args.weight is not None:
        body["weight"] = args.weight
    if args.group is not None:
        body["group"] = args.group
    if args.file:
        body["raw"] = json_file(args.file)
    if len(body) == 1:
        raise CliFailure("params.empty", "至少提供一个需要修改的书源字段", EXIT_USAGE)
    return client.json("PUT", "/api/admin/booksource", json_body=body)


def cmd_admin_booksources_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("DELETE", "/api/admin/booksource", query=[("ids", item) for item in csv_ints(args.ids)])


def cmd_admin_booksources_import(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body = {"url": args.url} if args.url else {"json": Path(args.file).read_text(encoding="utf-8")}
    return client.json("POST", "/api/admin/booksource/import", json_body=body)


def cmd_admin_booksources_seed(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/booksource/seed", json_body={})


def cmd_admin_booksources_toggle(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "POST",
        "/api/admin/booksource/toggle",
        json_body={"ids": csv_ints(args.ids), "enabled": args.state == "on"},
    )


def cmd_admin_booksources_test(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/booksource/test", json_body={"id": args.id, "key": args.key})


def cmd_admin_booksources_check(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    if args.check_cmd == "status":
        return client.json("GET", "/api/admin/booksource/check/status")
    path = "/api/admin/booksource/clean-invalid" if args.check_cmd == "clean-invalid" else "/api/admin/booksource/check"
    return client.json("POST", path, json_body={})


def cmd_admin_opds_browse(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST", "/api/admin/opds/browse", json_body={"url": args.url})


def cmd_admin_opds_sources_list(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/admin/opds/sources")


def cmd_admin_opds_sources_create(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "POST",
        "/api/admin/opds/sources",
        json_body={"name": args.name, "url": args.url, "description": args.description or ""},
    )


def cmd_admin_opds_sources_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body = {"id": args.id}
    for name in ("name", "url", "description"):
        value = getattr(args, name)
        if value is not None:
            body[name] = value
    if args.active is not None:
        body["active"] = args.active == "true"
    if len(body) == 1:
        raise CliFailure("params.empty", "至少提供一个需要修改的 OPDS 字段", EXIT_USAGE)
    return client.json("PUT", "/api/admin/opds/sources", json_body=body)


def cmd_admin_opds_sources_delete(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("DELETE", "/api/admin/opds/sources", json_body={"id": args.id})


def cmd_admin_opds_import(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    if args.import_cmd == "status":
        return client.json("GET", "/api/admin/opds/import/status")
    if args.import_cmd == "failed":
        return client.json("GET", "/api/admin/opds/import/failed")
    if args.import_cmd == "retry":
        body = {"id": args.id} if args.id else {"hash": args.hash}
        return client.json("POST", "/api/admin/opds/import/retry", json_body=body)
    books = json_file(args.books_file) if args.books_file else []
    if not isinstance(books, list):
        raise CliFailure("params.books", "--books-file 必须包含 JSON 数组", EXIT_USAGE)
    return client.json(
        "POST",
        "/api/admin/opds/import",
        json_body={"opds_url": args.url, "books": books, "delete_after": args.delete_after},
    )


def cmd_admin_settings_show(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    result = client.json("GET", "/api/admin/settings")
    if result.get("err") not in SUCCESS_ERRORS:
        return result
    sanitized = dict(result)
    if "settings" in sanitized:
        sanitized["settings"] = redact_sensitive_value(sanitized["settings"])
    return sanitized


def cmd_admin_settings_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    body = json_file(args.file) if args.file else key_values(args.set)
    if not isinstance(body, dict) or not body:
        raise CliFailure("params.empty", "请通过 --set 或 --file 提供设置", EXIT_USAGE)
    return client.json("POST", "/api/admin/settings", json_body=body)


def cmd_admin_settings_test_mail(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json(
        "POST",
        "/api/admin/testmail",
        form={
            "smtp_server": args.server,
            "smtp_username": args.username,
            "smtp_password": args.smtp_password,
            "smtp_encryption": args.encryption,
        },
    )


def cmd_admin_settings_database(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    path = "/api/admin/testdb" if args.settings_cmd == "test-db" else "/api/admin/migratedb"
    form = {"user_database": args.url}
    if getattr(args, "force", False):
        form["force"] = "1"
    return client.json("POST", path, form=form)


def cmd_admin_settings_check_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST" if args.refresh else "GET", "/api/admin/update")


def cmd_admin_trash(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("POST" if args.trash_cmd == "clear" else "GET", f"/api/admin/trash/{args.trash_cmd}")


def cmd_admin_ssl_update(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    certificate = Path(args.certificate)
    key = Path(args.key)
    if not certificate.is_file() or not key.is_file():
        raise CliFailure("file.not_found", "证书或私钥文件不存在", EXIT_USAGE)
    body, content_type = encode_two_files("ssl_crt", certificate, "ssl_key", key)
    content, _, _ = client._open("POST", "/api/admin/ssl", body=body, headers={"Content-Type": content_type})
    result = parse_json_bytes(content)
    if result is None:
        raise CliFailure("response.not_json", "Talebook 返回了非 JSON 响应", EXIT_API)
    return result


def encode_two_files(field1: str, path1: Path, field2: str, path2: Path) -> tuple[bytes, str]:
    boundary = "----talebook-cli-" + uuid.uuid4().hex
    chunks: list[bytes] = []
    for field, path in ((field1, path1), (field2, path2)):
        filename = parse.quote(path.name)
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        chunks.extend(
            [
                f"--{boundary}\r\n".encode(),
                f'Content-Disposition: form-data; name="{field}"; filename="{filename}"\r\n'.encode(),
                f"Content-Type: {content_type}\r\n\r\n".encode(),
                path.read_bytes(),
                b"\r\n",
            ]
        )
    chunks.append(f"--{boundary}--\r\n".encode())
    return b"".join(chunks), f"multipart/form-data; boundary={boundary}"


def cmd_admin_themes(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    if args.themes_cmd == "list":
        return client.json("GET", "/api/themes")
    if args.themes_cmd == "active":
        return client.json("GET", "/api/themes/active")
    return client.json("POST", "/api/themes/activate", json_body={"name": "" if args.default else args.name})


def cmd_admin_logs_show(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.json("GET", "/api/admin/log", query={"lines": args.lines})


def cmd_admin_logs_download(client: TalebookClient, args: argparse.Namespace) -> dict[str, Any]:
    return client.download("/api/admin/log/download", Path(args.output), overwrite=args.overwrite)


# parser


def subs(parser: argparse.ArgumentParser, dest: str) -> Any:
    return parser.add_subparsers(dest=dest, required=True)


def leaf(
    parent: Any,
    name: str,
    handler: Callable[[TalebookClient, argparse.Namespace], dict[str, Any]],
    *,
    help_text: str,
    path: str,
    auth: bool = False,
    admin: bool = False,
    risk: str = "read",
) -> argparse.ArgumentParser:
    parser = parent.add_parser(name, help=help_text)
    if risk in RISK_CONFIRMATION:
        parser.add_argument("--confirmed", action="store_true", help="确认已向用户展示目标与影响并获得授权")
    parser.set_defaults(handler=handler, command_path=path, requires_auth=auth, requires_admin=admin, risk=risk)
    return parser


def add_id(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--id", type=int, required=True, help="书籍或记录 ID")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="talebook-cli.py", description="通过明确命令操作 Talebook 实例")
    parser.add_argument("--site", help="Talebook 地址；无 scheme 时默认 HTTPS（环境变量 TALEBOOK_URL）")
    parser.add_argument("--user", help="Talebook 用户名（环境变量 TALEBOOK_USERNAME）")
    parser.add_argument("--password", help="Talebook 密码（环境变量 TALEBOOK_PASSWORD；环境变量更安全）")
    parser.add_argument("--timeout", type=float, default=30.0, help="HTTP 超时秒数，默认 30")
    services = subs(parser, "service")

    me = services.add_parser("me", help="当前身份与个人设置")
    me_cmds = subs(me, "me_cmd")
    leaf(me_cmds, "status", cmd_me_status, help_text="查看站点、身份与权限", path="me status")
    update = leaf(me_cmds, "update", cmd_me_update, help_text="修改个人资料", path="me update", auth=True, risk="write")
    update.add_argument("--nickname")
    update.add_argument("--kindle-email")
    update.add_argument("--current-password")
    update.add_argument("--new-password")
    devices = me_cmds.add_parser("devices", help="管理个人设备")
    device_cmds = subs(devices, "device_cmd")
    leaf(device_cmds, "list", cmd_me_devices_list, help_text="列出设备", path="me devices list", auth=True)
    add = leaf(
        device_cmds,
        "add",
        cmd_me_devices_add,
        help_text="添加或替换同名设备",
        path="me devices add",
        auth=True,
        risk="write",
    )
    add.add_argument("--name", required=True)
    add.add_argument(
        "--type", required=True, choices=["duokan", "ireader", "hanwang", "boox", "dangdang", "kindle", "purelibro"]
    )
    add.add_argument("--ip")
    add.add_argument("--port", type=int, default=12121)
    add.add_argument("--schema", choices=["http", "https"], default="http")
    add.add_argument("--mailbox")
    delete = leaf(
        device_cmds,
        "delete",
        cmd_me_devices_delete,
        help_text="按名称删除设备",
        path="me devices delete",
        auth=True,
        risk="destructive",
    )
    delete.add_argument("--name", required=True)

    books = services.add_parser("books", help="本地书库")
    book_cmds = subs(books, "books_cmd")
    listing = leaf(book_cmds, "list", cmd_books_list, help_text="列出书籍", path="books list")
    listing.add_argument("--view", choices=sorted(BOOK_VIEWS), default="library")
    listing.add_argument("--start", type=int, default=0)
    listing.add_argument("--sort")
    search = leaf(book_cmds, "search", cmd_books_search, help_text="搜索书籍", path="books search")
    search.add_argument("--name", required=True)
    search.add_argument("--start", type=int, default=0)
    show = leaf(book_cmds, "show", cmd_books_show, help_text="查看书籍详情", path="books show")
    add_id(show)
    upload = leaf(book_cmds, "upload", cmd_books_upload, help_text="上传电子书", path="books upload", risk="write")
    upload.add_argument("file")
    download = leaf(book_cmds, "download", cmd_books_download, help_text="下载电子书", path="books download")
    add_id(download)
    download.add_argument("--format", required=True)
    download.add_argument("--output")
    download.add_argument("--overwrite", action="store_true")
    edit = leaf(
        book_cmds, "edit", cmd_books_edit, help_text="修改书籍元数据或封面", path="books edit", auth=True, risk="write"
    )
    add_id(edit)
    edit.add_argument("--set", action="append", metavar="KEY=VALUE")
    edit.add_argument("--cover")
    delete = leaf(
        book_cmds, "delete", cmd_books_delete, help_text="删除书籍", path="books delete", auth=True, risk="destructive"
    )
    add_id(delete)

    favorite = book_cmds.add_parser("favorite", help="管理收藏")
    favorite_cmds = subs(favorite, "favorite_cmd")
    for name, value in (("set", True), ("unset", False)):
        item = leaf(
            favorite_cmds,
            name,
            cmd_books_favorite,
            help_text=f"{name} 收藏",
            path=f"books favorite {name}",
            auth=True,
            risk="write",
        )
        add_id(item)
        item.set_defaults(favorite=value)
    shelf = book_cmds.add_parser("shelf", help="管理书架")
    shelf_cmds = subs(shelf, "shelf_cmd")
    for name, value in (("add", True), ("remove", False)):
        item = leaf(
            shelf_cmds, name, cmd_books_shelf, help_text=f"{name} 书架", path=f"books shelf {name}", auth=True, risk="write"
        )
        add_id(item)
        item.set_defaults(shelf=value)
    reading = book_cmds.add_parser("reading", help="阅读状态与进度")
    reading_cmds = subs(reading, "reading_cmd")
    state = leaf(
        reading_cmds,
        "state",
        cmd_books_reading_state,
        help_text="读取或设置阅读状态",
        path="books reading state",
        auth=True,
        risk="write",
    )
    add_id(state)
    state.add_argument("--value", choices=["unread", "reading", "finished"])
    progress = leaf(
        reading_cmds,
        "progress",
        cmd_books_reading_progress,
        help_text="读取或设置阅读进度",
        path="books reading progress",
        auth=True,
        risk="write",
    )
    add_id(progress)
    progress_data = progress.add_mutually_exclusive_group()
    progress_data.add_argument("--value", help="JSON 对象")
    progress_data.add_argument("--file", help="JSON 文件")
    leaf(reading_cmds, "stats", cmd_books_reading_stats, help_text="查看阅读统计", path="books reading stats", auth=True)
    send = book_cmds.add_parser("send", help="发送书籍")
    send_cmds = subs(send, "send_cmd")
    device = leaf(
        send_cmds, "device", cmd_books_send_device, help_text="发送到阅读设备", path="books send device", risk="external"
    )
    add_id(device)
    device.add_argument(
        "--type", required=True, choices=["duokan", "ireader", "hanwang", "boox", "dangdang", "kindle", "purelibro"]
    )
    device.add_argument("--url")
    device.add_argument("--mailbox")
    mail = leaf(send_cmds, "mail", cmd_books_send_mail, help_text="发送到邮箱", path="books send mail", risk="external")
    add_id(mail)
    mail.add_argument("--email", required=True)

    audios = services.add_parser("audios", help="已发布有声书")
    audio_cmds = subs(audios, "audios_cmd")
    audio_list = leaf(audio_cmds, "list", cmd_audios_list, help_text="列出有声书", path="audios list")
    audio_list.add_argument("--keyword", help="按书名或作者过滤")
    audio_show = leaf(audio_cmds, "show", cmd_audios_show, help_text="查看有声书详情", path="audios show")
    audio_show.add_argument("--book-id", type=int, required=True)
    audio_download = leaf(
        audio_cmds,
        "download",
        cmd_audios_download,
        help_text="下载整本有声书",
        path="audios download",
    )
    audio_download.add_argument("--book-id", type=int, required=True)
    audio_download.add_argument("--output", required=True, help="不存在的本地输出目录")

    remote = services.add_parser("remote", help="远程书库与网络书源")
    remote_cmds = subs(remote, "remote_cmd")
    sources = remote_cmds.add_parser("sources", help="远程书源")
    leaf(
        subs(sources, "remote_sources_cmd"),
        "list",
        cmd_remote_sources_list,
        help_text="列出可用书源",
        path="remote sources list",
        auth=True,
    )
    remote_search = remote_cmds.add_parser("search", help="远程搜索")
    remote_search_cmds = subs(remote_search, "remote_search_cmd")
    start = leaf(
        remote_search_cmds,
        "start",
        cmd_remote_search_start,
        help_text="启动远程搜索",
        path="remote search start",
        auth=True,
    )
    start.add_argument("--name", required=True)
    start.add_argument("--page", type=int, default=1)
    start.add_argument("--mode", choices=["top", "all", "custom"], default="top")
    start.add_argument("--sources", help="逗号分隔的书源 ID")
    status = leaf(
        remote_search_cmds,
        "status",
        cmd_remote_search_status,
        help_text="查询搜索进度",
        path="remote search status",
        auth=True,
    )
    status.add_argument("--task-id", required=True)
    explore = remote_cmds.add_parser("explore", help="浏览书源分类")
    explore_cmds = subs(explore, "remote_explore_cmd")
    categories = leaf(
        explore_cmds,
        "categories",
        cmd_remote_explore_categories,
        help_text="列出分类",
        path="remote explore categories",
        auth=True,
    )
    categories.add_argument("--source-id", type=int, required=True)
    explore_list = leaf(
        explore_cmds,
        "list",
        cmd_remote_explore_list,
        help_text="浏览分类书籍",
        path="remote explore list",
        auth=True,
    )
    explore_list.add_argument("--source-id", type=int, required=True)
    explore_list.add_argument("--url", required=True)
    explore_list.add_argument("--page", type=int, default=1)
    remote_books = remote_cmds.add_parser("books", help="远程书籍")
    remote_book_cmds = subs(remote_books, "remote_book_cmd")
    for name in ("show", "toc"):
        item = leaf(
            remote_book_cmds,
            name,
            cmd_remote_book_query,
            help_text=f"远程书籍 {name}",
            path=f"remote books {name}",
            auth=True,
        )
        item.add_argument("--source-id", type=int, required=True)
        item.add_argument("--book-url", required=True)
    content = leaf(
        remote_book_cmds,
        "content",
        cmd_remote_book_content,
        help_text="读取章节内容",
        path="remote books content",
        auth=True,
    )
    content.add_argument("--source-id", type=int, required=True)
    content.add_argument("--chapter-url", required=True)
    save = leaf(
        remote_book_cmds,
        "save",
        cmd_remote_book_save,
        help_text="保存远程书籍",
        path="remote books save",
        auth=True,
        risk="write",
    )
    save.add_argument("--source-id", type=int, required=True)
    save.add_argument("--book-url", required=True)
    save.add_argument("--format", choices=["txt", "epub"], default="epub")
    save.add_argument("--no-clean", action="store_true")
    save_status = leaf(
        remote_book_cmds,
        "save-status",
        cmd_remote_book_save_status,
        help_text="查询保存进度",
        path="remote books save-status",
        auth=True,
    )
    save_status.add_argument("--source-id", type=int, required=True)
    save_status.add_argument("--book-url", required=True)
    remote_library = remote_cmds.add_parser("library", help="已保存的远程书籍")
    remote_library_list = leaf(
        subs(remote_library, "remote_library_cmd"),
        "list",
        cmd_remote_library_list,
        help_text="列出远程来源书籍",
        path="remote library list",
        auth=True,
    )
    remote_library_list.add_argument("--status", choices=["serial", "finished", "unknown"])
    remote_library_list.add_argument("--start", type=int, default=0)

    admin = services.add_parser("admin", help="管理员操作")
    admin_cmds = subs(admin, "admin_cmd")
    add_admin_users(admin_cmds)
    add_admin_books(admin_cmds)
    add_admin_imports(admin_cmds)
    add_admin_booksources(admin_cmds)
    add_admin_opds(admin_cmds)
    add_admin_settings(admin_cmds)
    add_admin_misc(admin_cmds)
    return parser


def admin_leaf(
    parent: Any, name: str, handler: Callable[..., dict[str, Any]], help_text: str, path: str, risk: str = "read"
) -> argparse.ArgumentParser:
    return leaf(parent, name, handler, help_text=help_text, path=path, admin=True, risk=risk)


def add_admin_users(admin_cmds: Any) -> None:
    users = admin_cmds.add_parser("users", help="用户管理")
    cmds = subs(users, "users_cmd")
    listing = admin_leaf(cmds, "list", cmd_admin_users_list, "列出用户", "admin users list")
    listing.add_argument("--page", type=int, default=1)
    listing.add_argument("--num", type=int, default=20)
    listing.add_argument("--sort", default="access_time")
    listing.add_argument("--desc", action=argparse.BooleanOptionalAction, default=True)
    create = admin_leaf(cmds, "create", cmd_admin_users_create, "创建用户", "admin users create", "admin-write")
    create.add_argument("--username", required=True)
    create.add_argument("--new-password", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--email", required=True)
    create.add_argument("--admin", action="store_true")
    create.add_argument("--inactive", action="store_true")
    create.add_argument("--permission")
    update = admin_leaf(cmds, "update", cmd_admin_users_update, "修改用户", "admin users update", "admin-write")
    add_id(update)
    update.add_argument("--active", choices=["true", "false"])
    update.add_argument("--admin", choices=["true", "false"])
    update.add_argument("--permission")
    delete = admin_leaf(cmds, "delete", cmd_admin_users_delete, "删除用户", "admin users delete", "destructive")
    add_id(delete)
    delete.add_argument("--username", required=True, help="再次提供用户名作为服务端删除确认")
    batch = admin_leaf(cmds, "batch", cmd_admin_users_batch, "批量修改权限", "admin users batch", "admin-write")
    batch.add_argument("--ids", required=True)
    batch.add_argument("--permission", required=True)


def add_admin_books(admin_cmds: Any) -> None:
    books = admin_cmds.add_parser("books", help="书库管理")
    cmds = subs(books, "admin_books_cmd")
    listing = admin_leaf(cmds, "list", cmd_admin_books_list, "列出书籍", "admin books list")
    listing.add_argument("--page", type=int, default=1)
    listing.add_argument("--num", type=int, default=20)
    listing.add_argument("--sort", default="id")
    listing.add_argument("--desc", action=argparse.BooleanOptionalAction, default=True)
    listing.add_argument("--search")
    for name in ("fill", "convert"):
        task = cmds.add_parser(name, help=f"{name} 后台任务")
        task_cmds = subs(task, "task_cmd")
        start = admin_leaf(
            task_cmds, "start", cmd_admin_books_task, f"启动 {name}", f"admin books {name} start", "admin-write"
        )
        if name == "fill":
            start.add_argument("--ids", default="all")
        else:
            start.add_argument("--ids")
        admin_leaf(task_cmds, "status", cmd_admin_books_task, f"查看 {name} 状态", f"admin books {name} status")
    delete = admin_leaf(cmds, "delete", cmd_admin_books_delete, "批量删除书籍", "admin books delete", "destructive")
    delete.add_argument("--ids", required=True)


def add_admin_imports(admin_cmds: Any) -> None:
    imports = admin_cmds.add_parser("imports", help="扫描与导入")
    cmds = subs(imports, "imports_cmd")
    listing = admin_leaf(cmds, "list", cmd_admin_imports_list, "列出扫描记录", "admin imports list")
    listing.add_argument("--filter", choices=["all", "todo", "done"], default="all")
    listing.add_argument("--page", type=int, default=1)
    listing.add_argument("--num", type=int, default=20)
    listing.add_argument("--sort", default="create_time")
    listing.add_argument("--desc", action=argparse.BooleanOptionalAction, default=True)
    delete = admin_leaf(cmds, "delete", cmd_admin_imports_delete, "删除扫描记录", "admin imports delete", "destructive")
    delete.add_argument("--hashes", required=True, help="all 或逗号分隔的 hash")
    scan = cmds.add_parser("scan", help="扫描导入目录")
    scan_cmds = subs(scan, "scan_cmd")
    admin_leaf(scan_cmds, "start", cmd_admin_imports_scan, "开始扫描", "admin imports scan start", "admin-write")
    admin_leaf(scan_cmds, "status", cmd_admin_imports_scan, "扫描状态", "admin imports scan status")
    run = cmds.add_parser("run", help="执行导入")
    run_cmds = subs(run, "run_cmd")
    start = admin_leaf(run_cmds, "start", cmd_admin_imports_run, "开始导入", "admin imports run start", "admin-write")
    start.add_argument("--hashes", default="all")
    start.add_argument("--delete-after", action="store_true")
    admin_leaf(run_cmds, "status", cmd_admin_imports_run, "导入状态", "admin imports run status")


def add_admin_booksources(admin_cmds: Any) -> None:
    sources = admin_cmds.add_parser("booksources", help="网络书源管理")
    cmds = subs(sources, "booksources_cmd")
    listing = admin_leaf(cmds, "list", cmd_admin_booksources_list, "列出书源", "admin booksources list")
    listing.add_argument("--page", type=int, default=1)
    listing.add_argument("--size", type=int, default=50)
    listing.add_argument("--enabled", choices=["true", "false"])
    listing.add_argument("--query")
    show = admin_leaf(cmds, "show", cmd_admin_booksources_show, "查看书源摘要", "admin booksources show")
    add_id(show)
    create = admin_leaf(cmds, "create", cmd_admin_booksources_create, "创建书源", "admin booksources create", "admin-write")
    create.add_argument("--file", required=True)
    update = admin_leaf(cmds, "update", cmd_admin_booksources_update, "修改书源", "admin booksources update", "admin-write")
    add_id(update)
    update.add_argument("--enabled", choices=["true", "false"])
    update.add_argument("--weight", type=int)
    update.add_argument("--group")
    update.add_argument("--file")
    delete = admin_leaf(cmds, "delete", cmd_admin_booksources_delete, "删除书源", "admin booksources delete", "destructive")
    delete.add_argument("--ids", required=True)
    imported = admin_leaf(cmds, "import", cmd_admin_booksources_import, "导入书源", "admin booksources import", "admin-write")
    source = imported.add_mutually_exclusive_group(required=True)
    source.add_argument("--url")
    source.add_argument("--file")
    admin_leaf(cmds, "seed", cmd_admin_booksources_seed, "导入内置书源", "admin booksources seed", "admin-write")
    toggle = admin_leaf(cmds, "toggle", cmd_admin_booksources_toggle, "启停书源", "admin booksources toggle", "admin-write")
    toggle.add_argument("--ids", required=True)
    toggle.add_argument("--state", choices=["on", "off"], required=True)
    test = admin_leaf(cmds, "test", cmd_admin_booksources_test, "测试书源", "admin booksources test", "admin-write")
    add_id(test)
    test.add_argument("--key", default="剑来")
    check = cmds.add_parser("check", help="书源有效性检查")
    check_cmds = subs(check, "check_cmd")
    admin_leaf(check_cmds, "start", cmd_admin_booksources_check, "开始检查", "admin booksources check start", "admin-write")
    admin_leaf(check_cmds, "status", cmd_admin_booksources_check, "检查状态", "admin booksources check status")
    admin_leaf(
        check_cmds,
        "clean-invalid",
        cmd_admin_booksources_check,
        "兼容旧接口的全量检查",
        "admin booksources check clean-invalid",
        "admin-write",
    )


def add_admin_opds(admin_cmds: Any) -> None:
    opds = admin_cmds.add_parser("opds", help="OPDS 管理")
    cmds = subs(opds, "opds_cmd")
    browse = admin_leaf(cmds, "browse", cmd_admin_opds_browse, "浏览 OPDS", "admin opds browse")
    browse.add_argument("--url", required=True)
    sources = cmds.add_parser("sources", help="OPDS 源配置")
    source_cmds = subs(sources, "opds_sources_cmd")
    admin_leaf(source_cmds, "list", cmd_admin_opds_sources_list, "列出 OPDS 源", "admin opds sources list")
    create = admin_leaf(
        source_cmds, "create", cmd_admin_opds_sources_create, "创建 OPDS 源", "admin opds sources create", "admin-write"
    )
    create.add_argument("--name", required=True)
    create.add_argument("--url", required=True)
    create.add_argument("--description")
    update = admin_leaf(
        source_cmds, "update", cmd_admin_opds_sources_update, "更新 OPDS 源", "admin opds sources update", "admin-write"
    )
    add_id(update)
    update.add_argument("--name")
    update.add_argument("--url")
    update.add_argument("--description")
    update.add_argument("--active", choices=["true", "false"])
    delete = admin_leaf(
        source_cmds, "delete", cmd_admin_opds_sources_delete, "删除 OPDS 源", "admin opds sources delete", "destructive"
    )
    add_id(delete)
    imported = cmds.add_parser("import", help="OPDS 导入")
    import_cmds = subs(imported, "import_cmd")
    start = admin_leaf(import_cmds, "start", cmd_admin_opds_import, "开始 OPDS 导入", "admin opds import start", "admin-write")
    start.add_argument("--url", required=True)
    start.add_argument("--books-file")
    start.add_argument("--delete-after", action="store_true")
    admin_leaf(import_cmds, "status", cmd_admin_opds_import, "OPDS 导入状态", "admin opds import status")
    admin_leaf(import_cmds, "failed", cmd_admin_opds_import, "OPDS 失败记录", "admin opds import failed")
    retry = admin_leaf(import_cmds, "retry", cmd_admin_opds_import, "重试 OPDS 导入", "admin opds import retry", "admin-write")
    target = retry.add_mutually_exclusive_group(required=True)
    target.add_argument("--id", type=int)
    target.add_argument("--hash")


def add_admin_settings(admin_cmds: Any) -> None:
    settings = admin_cmds.add_parser("settings", help="系统设置")
    cmds = subs(settings, "settings_cmd")
    admin_leaf(cmds, "show", cmd_admin_settings_show, "查看设置", "admin settings show")
    update = admin_leaf(cmds, "update", cmd_admin_settings_update, "修改设置", "admin settings update", "admin-write")
    source = update.add_mutually_exclusive_group(required=True)
    source.add_argument("--set", action="append", metavar="KEY=VALUE")
    source.add_argument("--file")
    mail = admin_leaf(cmds, "test-mail", cmd_admin_settings_test_mail, "测试邮件", "admin settings test-mail", "external")
    mail.add_argument("--server", required=True)
    mail.add_argument("--username", required=True)
    mail.add_argument("--smtp-password", required=True)
    mail.add_argument("--encryption", default="SSL")
    test_db = admin_leaf(cmds, "test-db", cmd_admin_settings_database, "测试数据库", "admin settings test-db", "admin-write")
    test_db.add_argument("--url", required=True)
    migrate = admin_leaf(
        cmds, "migrate-db", cmd_admin_settings_database, "迁移数据库", "admin settings migrate-db", "destructive"
    )
    migrate.add_argument("--url", required=True)
    migrate.add_argument("--force", action="store_true")
    update_check = admin_leaf(
        cmds, "check-update", cmd_admin_settings_check_update, "检查版本更新", "admin settings check-update"
    )
    update_check.add_argument("--refresh", action="store_true")


def add_admin_misc(admin_cmds: Any) -> None:
    trash = admin_cmds.add_parser("trash", help="回收站")
    trash_cmds = subs(trash, "trash_cmd")
    admin_leaf(trash_cmds, "size", cmd_admin_trash, "查看回收站大小", "admin trash size")
    admin_leaf(trash_cmds, "clear", cmd_admin_trash, "清空回收站", "admin trash clear", "destructive")
    ssl = admin_cmds.add_parser("ssl", help="SSL 证书")
    ssl_cmds = subs(ssl, "ssl_cmd")
    update = admin_leaf(ssl_cmds, "update", cmd_admin_ssl_update, "更新 SSL 证书", "admin ssl update", "admin-write")
    update.add_argument("--certificate", required=True)
    update.add_argument("--key", required=True)
    themes = admin_cmds.add_parser("themes", help="主题")
    theme_cmds = subs(themes, "themes_cmd")
    admin_leaf(theme_cmds, "list", cmd_admin_themes, "列出主题", "admin themes list")
    admin_leaf(theme_cmds, "active", cmd_admin_themes, "当前主题", "admin themes active")
    activate = admin_leaf(theme_cmds, "activate", cmd_admin_themes, "激活主题", "admin themes activate", "admin-write")
    choice = activate.add_mutually_exclusive_group(required=True)
    choice.add_argument("--name")
    choice.add_argument("--default", action="store_true")
    logs = admin_cmds.add_parser("logs", help="系统日志")
    log_cmds = subs(logs, "logs_cmd")
    show = admin_leaf(log_cmds, "show", cmd_admin_logs_show, "查看日志", "admin logs show")
    show.add_argument("--lines", type=int, default=500)
    download = admin_leaf(log_cmds, "download", cmd_admin_logs_download, "下载日志", "admin logs download")
    download.add_argument("--output", default="talebook.log")
    download.add_argument("--overwrite", action="store_true")


_SENSITIVE_NAME_PARTS = ("password", "passwd", "secret", "token", "api_key", "apikey", "invite_code")


def is_sensitive_name(name: str) -> bool:
    normalized = name.strip().lower()
    return normalized == "key" or normalized.endswith("_key") or any(part in normalized for part in _SENSITIVE_NAME_PARTS)


def redact_sensitive_value(value: Any, *, field_name: str = "") -> Any:
    if field_name and is_sensitive_name(field_name):
        return value if value is None or value == "" else "<redacted>"
    if isinstance(value, Mapping):
        return {str(key): redact_sensitive_value(item, field_name=str(key)) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [redact_sensitive_value(item) for item in value]
    if isinstance(value, str):
        return redact_url(value)
    return value


def sanitized_arguments(args: argparse.Namespace) -> dict[str, Any]:
    hidden = {"handler", "password", "current_password", "new_password", "smtp_password"}
    result: dict[str, Any] = {}
    for key, value in vars(args).items():
        if key in hidden or key.startswith("requires_") or key in {"confirmed", "risk"}:
            continue
        if value is None or value is False:
            continue
        if isinstance(value, list):
            result[key] = [redact_assignment(item) if isinstance(item, str) else item for item in value]
        elif key.lower().endswith("url") and isinstance(value, str):
            result[key] = redact_url(value)
        else:
            result[key] = value
    return result


def redact_assignment(value: str) -> str:
    key, separator, _ = value.partition("=")
    if separator and is_sensitive_name(key):
        return key + "=<redacted>"
    return value


def redact_url(value: str) -> str:
    try:
        parts = parse.urlsplit(value)
    except ValueError:
        return value
    query = parse.parse_qsl(parts.query, keep_blank_values=True)
    redacted_query = [(key, "<redacted>" if item and is_sensitive_name(key) else item) for key, item in query]
    query_changed = redacted_query != query
    if parts.username is None and parts.password is None and not query_changed:
        return value
    netloc = parts.netloc
    if parts.username is not None or parts.password is not None:
        hostname = parts.hostname or ""
        if ":" in hostname and not hostname.startswith("["):
            hostname = f"[{hostname}]"
        try:
            port = f":{parts.port}" if parts.port is not None else ""
        except ValueError:
            port = ""
        netloc = f"<redacted>@{hostname}{port}"
    rendered_query = parse.urlencode(redacted_query, doseq=True) if query_changed else parts.query
    return parse.urlunsplit((parts.scheme, netloc, parts.path, rendered_query, parts.fragment))


def emit(payload: Mapping[str, Any], stream: TextIO) -> None:
    stream.write(json.dumps(payload, ensure_ascii=False, indent=2, default=str) + "\n")


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    output = stdout or sys.stdout
    errors = stderr or sys.stderr
    env = environ if environ is not None else os.environ
    try:
        config = Config.from_sources(args, env)
        if args.risk in RISK_CONFIRMATION and not getattr(args, "confirmed", False):
            emit(
                {
                    "err": "confirmation.required",
                    "msg": "该操作需要先向用户展示目标与影响，并获得明确确认",
                    "risk": args.risk,
                    "command": args.command_path,
                    "arguments": sanitized_arguments(args),
                },
                output,
            )
            return EXIT_GUARD
        client = TalebookClient(config)
        if args.requires_admin:
            require_admin(client)
        elif args.requires_auth:
            require_auth(client)
        result = api_result(args.handler(client, args))
        result = attach_update_notice(client, result, command_path=args.command_path, environ=env)
        emit(result, output)
        return EXIT_OK if result.get("err") in SUCCESS_ERRORS else EXIT_API
    except CliFailure as exc:
        emit(exc.payload(), errors)
        return exc.exit_code
    except OSError as exc:
        emit({"err": "file.error", "msg": str(exc)}, errors)
        return EXIT_USAGE


if __name__ == "__main__":
    raise SystemExit(main())
