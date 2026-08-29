from __future__ import annotations

import ipaddress
import json
import os
import re
import ssl
import stat
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping
from urllib.parse import urlsplit, urlunsplit


class BridgeError(RuntimeError):
    """A user-safe OpenXiaoAI Bridge error."""


@dataclass(frozen=True, slots=True)
class BridgeStatus:
    state: str
    position_ms: int
    duration_ms: int

    @property
    def paused(self) -> bool:
        return self.state == "paused"

    @property
    def playing(self) -> bool:
        return self.state in {"playing", "paused"}


def _enabled(name: str) -> bool:
    return os.environ.get(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _is_loopback(hostname: str) -> bool:
    if hostname.lower() == "localhost":
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def bridge_base_url(value: str | None = None) -> str:
    raw = (value or os.environ.get("OPENXIAOAI_BASE_URL") or "http://127.0.0.1:9092").strip()
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as exc:
        raise BridgeError("OPENXIAOAI_BASE_URL 不是有效的 URL") from exc
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise BridgeError("OPENXIAOAI_BASE_URL 必须是有效的 http 或 https URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise BridgeError("OPENXIAOAI_BASE_URL 不能包含凭据、查询参数或片段")
    if parsed.path.rstrip("/"):
        raise BridgeError("OPENXIAOAI_BASE_URL 不能包含路径")
    if parsed.scheme == "http" and not _is_loopback(parsed.hostname) and not _enabled("OPENXIAOAI_ALLOW_INSECURE_HTTP"):
        raise BridgeError("拒绝通过明文 HTTP 连接非本机 Bridge；请配置 HTTPS")
    hostname = parsed.hostname.lower()
    if ":" in hostname and not hostname.startswith("["):
        hostname = f"[{hostname}]"
    netloc = hostname + (f":{port}" if port is not None else "")
    return urlunsplit((parsed.scheme.lower(), netloc, "", "", ""))


def bridge_token_file() -> Path:
    configured = os.environ.get("OPENXIAOAI_API_TOKEN_FILE")
    if configured:
        return Path(configured).expanduser()
    config_home = os.environ.get("XDG_CONFIG_HOME")
    root = Path(config_home).expanduser() if config_home else Path.home() / ".config"
    return root / "open-xiaoai-bridge" / "api-token"


def load_bridge_token() -> str:
    explicit = os.environ.get("OPENXIAOAI_API_TOKEN", "").strip()
    if explicit:
        if len(explicit) < 32:
            raise BridgeError("OPENXIAOAI_API_TOKEN 至少需要 32 个字符")
        return explicit
    path = bridge_token_file()
    try:
        metadata = path.stat()
        if os.name != "nt" and stat.S_IMODE(metadata.st_mode) & 0o077:
            raise BridgeError(f"Bridge token 文件权限过宽；请执行 chmod 600 {path}")
        token = path.read_text(encoding="utf-8").strip()
    except BridgeError:
        raise
    except OSError as exc:
        raise BridgeError("找不到 Bridge API token；请启动 OpenXiaoAI Bridge，或设置 OPENXIAOAI_API_TOKEN_FILE") from exc
    if len(token) < 32:
        raise BridgeError("Bridge API token 文件为空或长度不足")
    return token


def _ssl_context() -> ssl.SSLContext:
    ca_file = os.environ.get("OPENXIAOAI_TLS_CA") or None
    cert_file = os.environ.get("OPENXIAOAI_TLS_CLIENT_CERT") or None
    key_file = os.environ.get("OPENXIAOAI_TLS_CLIENT_KEY") or None
    if bool(cert_file) != bool(key_file):
        raise BridgeError("OPENXIAOAI_TLS_CLIENT_CERT 和 OPENXIAOAI_TLS_CLIENT_KEY 必须同时设置")
    try:
        context = ssl.create_default_context(cafile=ca_file)
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        if cert_file and key_file:
            context.load_cert_chain(cert_file, key_file)
    except (OSError, ssl.SSLError) as exc:
        raise BridgeError("无法加载 Bridge TLS 配置") from exc
    return context


def _sanitize(value: object) -> str:
    text = str(value or "未知错误")
    text = re.sub(r"(?i)bearer\s+[a-z0-9._~+/-]+", "Bearer <redacted>", text)
    text = re.sub(
        r"(?i)(api[_ -]?key|authorization|token)(\s*[:=]\s*)\S+",
        r"\1\2<redacted>",
        text,
    )
    return " ".join(text.split())[:300]


class BridgeClient:
    def __init__(
        self,
        *,
        base_url: str | None = None,
        token: str | None = None,
        timeout: float = 150.0,
    ):
        self.base_url = bridge_base_url(base_url)
        self.token = token or load_bridge_token()
        if len(self.token) < 32:
            raise BridgeError("Bridge API token 至少需要 32 个字符")
        self.timeout = timeout
        self.opener = urllib.request.build_opener(urllib.request.HTTPSHandler(context=_ssl_context()))

    def _request(
        self,
        path: str,
        *,
        method: str = "GET",
        payload: Mapping[str, Any] | None = None,
    ) -> Mapping[str, Any]:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = urllib.request.Request(
            self.base_url + path,
            data=body,
            method=method,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "talebook-audio-cli/0.1",
            },
        )
        try:
            with self.opener.open(request, timeout=self.timeout) as response:
                raw = response.read(2 * 1024 * 1024 + 1)
                if len(raw) > 2 * 1024 * 1024:
                    raise BridgeError("Bridge 响应过大")
        except urllib.error.HTTPError as exc:
            try:
                response_data = json.loads(exc.read(64 * 1024).decode("utf-8"))
                reason = response_data.get("error") if isinstance(response_data, dict) else None
            except (OSError, UnicodeDecodeError, json.JSONDecodeError):
                reason = None
            raise BridgeError(f"Bridge {method} {path} 失败（HTTP {exc.code}）：{_sanitize(reason or exc.reason)}") from exc
        except BridgeError:
            raise
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            reason = getattr(exc, "reason", None) or exc.__class__.__name__
            raise BridgeError(f"无法连接 OpenXiaoAI Bridge（{_sanitize(reason)}）") from exc
        try:
            result = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise BridgeError("Bridge 返回了无法解析的响应") from exc
        if not isinstance(result, dict):
            raise BridgeError("Bridge 返回的数据格式无效")
        if result.get("success") is not True:
            raise BridgeError(f"Bridge 操作失败：{_sanitize(result.get('error'))}")
        return result

    @staticmethod
    def _status(result: Mapping[str, Any]) -> BridgeStatus:
        data = result.get("data")
        if not isinstance(data, dict):
            raise BridgeError("Bridge 播放状态格式无效")
        state = str(data.get("state") or "idle")
        if state not in {"idle", "playing", "paused"}:
            raise BridgeError("Bridge 返回了未知播放状态")
        try:
            position_ms = max(0, int(data.get("position_ms") or 0))
            duration_ms = max(0, int(data.get("duration_ms") or 0))
        except (TypeError, ValueError) as exc:
            raise BridgeError("Bridge 播放进度格式无效") from exc
        return BridgeStatus(state, position_ms, duration_ms)

    def play(self, url: str) -> BridgeStatus:
        return self._status(self._request("/api/stream/play", method="POST", payload={"url": url}))

    def status(self) -> BridgeStatus:
        return self._status(self._request("/api/stream/status"))

    def pause(self) -> BridgeStatus:
        return self._status(self._request("/api/stream/pause", method="POST", payload={}))

    def resume(self) -> BridgeStatus:
        return self._status(self._request("/api/stream/resume", method="POST", payload={}))

    def stop(self) -> BridgeStatus:
        return self._status(self._request("/api/stream/stop", method="POST", payload={}))
