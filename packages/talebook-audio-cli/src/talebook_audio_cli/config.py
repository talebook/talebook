from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


class ConfigError(ValueError):
    """Raised when local configuration is absent or invalid."""


@dataclass(frozen=True, slots=True)
class AppPaths:
    directory: Path

    @classmethod
    def default(cls) -> "AppPaths":
        root = os.environ.get("XDG_CONFIG_HOME")
        base = Path(root).expanduser() if root else Path.home() / ".config"
        return cls(base / "talebook-audio")

    @property
    def config_file(self) -> Path:
        return self.directory / "config.json"

    @property
    def cookie_file(self) -> Path:
        return self.directory / "cookies.txt"


@dataclass(frozen=True, slots=True)
class Config:
    server: str
    username: str


def normalize_server_url(value: str) -> str:
    raw = value.strip()
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as exc:
        raise ConfigError("Talebook 服务地址无效") from exc
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ConfigError("Talebook 服务地址必须是有效的 http 或 https URL")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ConfigError("Talebook 服务地址不能包含凭据、查询参数或片段")
    hostname = parsed.hostname.lower()
    if ":" in hostname and not hostname.startswith("["):
        hostname = f"[{hostname}]"
    netloc = hostname + (f":{port}" if port is not None else "")
    path = parsed.path.rstrip("/")
    return urlunsplit((parsed.scheme.lower(), netloc, path, "", ""))


def _write_private(path: Path, content: str) -> None:
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    try:
        path.parent.chmod(0o700)
    except OSError:
        pass
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent, text=True)
    temporary_path = Path(temporary)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
        os.replace(temporary_path, path)
        path.chmod(0o600)
    finally:
        temporary_path.unlink(missing_ok=True)


def save_config(config: Config, paths: AppPaths | None = None) -> None:
    target = paths or AppPaths.default()
    payload = {"server": normalize_server_url(config.server), "username": config.username.strip()}
    if not payload["username"]:
        raise ConfigError("Talebook 用户名不能为空")
    _write_private(target.config_file, json.dumps(payload, ensure_ascii=False, indent=2) + "\n")


def load_config(paths: AppPaths | None = None) -> Config:
    target = paths or AppPaths.default()
    try:
        payload = json.loads(target.config_file.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ConfigError("未配置 Talebook；请先运行 talebook-audio configure") from exc
    except (OSError, ValueError, TypeError) as exc:
        raise ConfigError("Talebook 本地配置损坏；请重新运行 configure") from exc
    if not isinstance(payload, dict):
        raise ConfigError("Talebook 本地配置损坏；请重新运行 configure")
    username = str(payload.get("username", "")).strip()
    if not username:
        raise ConfigError("Talebook 本地配置缺少用户名；请重新运行 configure")
    return Config(server=normalize_server_url(str(payload.get("server", ""))), username=username)


def secure_cookie_file(paths: AppPaths | None = None) -> Path:
    target = paths or AppPaths.default()
    target.directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    if target.cookie_file.exists():
        target.cookie_file.chmod(0o600)
    return target.cookie_file
