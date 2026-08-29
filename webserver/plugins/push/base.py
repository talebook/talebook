"""设备推送插件共享的上传与 capability 适配实现。"""

import datetime
from pathlib import Path

import requests

from webserver.plugins.runtime.domains import CheckReport
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, UpstreamError


PUSH_CAPABILITY = "integrations.push"


class BaseUploader:
    def __init__(self, file_path, file_name=None, timeout=60):
        self.file_path = Path(file_path)
        self.filename = self.file_path.name if file_name is None else file_name
        self.file_extension = self.file_path.suffix.lower()
        self.content_type = self._get_content_type()
        self.timeout = timeout
        self._check_file()

    def _check_file(self):
        if not self.file_path.exists():
            raise FileNotFoundError(f"File not found: {self.file_path}")
        if self.file_extension not in [".epub", ".azw3", ".pdf", ".txt"]:
            raise ValueError(f"Unsupported file format: {self.file_extension}, only epub, azw3 and pdf are supported")

    def _get_content_type(self):
        if self.file_extension == ".epub":
            return "application/epub+zip"
        if self.file_extension == ".pdf":
            return "application/pdf"
        return "application/octet-stream"

    def handle_exception(self, exc, server_url=None):
        if hasattr(exc, "response") and exc.response is not None:
            return {
                "success": False,
                "error_type": "http",
                "status_code": exc.response.status_code,
                "message": f"HTTP error: {exc.response.status_code}",
                "response_text": exc.response.text,
            }
        if isinstance(exc, requests.exceptions.Timeout):
            return {
                "success": False,
                "error_type": "timeout",
                "status_code": None,
                "message": f"Upload timeout: {self.file_path}",
                "response_text": str(exc),
            }
        if isinstance(exc, requests.exceptions.ConnectionError):
            return {
                "success": False,
                "error_type": "connection",
                "status_code": None,
                "message": f"Connection failed: {server_url}",
                "response_text": str(exc),
            }
        return {
            "success": False,
            "error_type": "other",
            "status_code": None,
            "message": f"Upload failed: {str(exc)}",
            "response_text": str(exc),
        }

    def get_upload_url(self, base_url):
        return base_url

    def upload(self, server_url):
        raise NotImplementedError("Subclass must implement upload method")

    def default_port(self):
        return 12121


def _network_timeout(context):
    """让 requests 在 runtime 总 deadline 之前先结束。"""
    try:
        deadline = datetime.datetime.fromisoformat(str(context.get("deadline") or ""))
        remaining = (deadline - datetime.datetime.now(tz=deadline.tzinfo)).total_seconds()
    except (TypeError, ValueError):
        remaining = 30.0
    # 为 future 传递结果和 runtime 结算预留 100ms。
    if remaining <= 0.1:
        raise UpstreamError("Device upload deadline expired", error_type="timeout")
    return max(0.01, remaining - 0.1)


def _manifest(plugin_id, name, description, icon, homepage=""):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": ["integrations"],
        "capabilities": [PUSH_CAPABILITY],
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {
            "type": "object",
            # 设备地址由每个用户自己填写：局域网 IP 或主机名。
            "properties": {"device_url": {"type": "string"}},
        },
        "permissions": ["books.read", "network.write"],
        "data_policy": {"stores_full_text": False, "retention": "device_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        # 设备属于个人，不存在实例级共享连接。
        "connection_owners": ["user"],
        "homepage": homepage,
        "license": "GPL-3.0",
        "ui": {
            "icon": icon,
            "primary_action": "configure",
            # 既有 /send_to_device 的路由事实；handler 按声明交给
            # runtime 解析，不再持有 provider map。
            "device_type": plugin_id.rsplit(".", 1)[-1],
        },
    }


class DevicePushProvider:
    """把一个设备上传器适配为插件。"""

    def __init__(self, manifest, uploader_class):
        self.manifest = manifest
        self.uploader_class = uploader_class

    @property
    def default_port(self):
        # default_port 是实例方法，但不依赖实例状态——取未绑定函数即可，
        # 避免为读一个常量去构造上传器（构造会校验文件是否存在）。
        return self.uploader_class.default_port(None)

    def push(self, book_file, target, context):
        """把一个书籍文件推送到设备。sync 模式：写向外部，不可回滚。"""
        url = str(target or (context.get("config") or {}).get("device_url") or "").strip()
        if not url:
            raise UpstreamError("Device address is required")
        if not url.startswith(("http://", "https://")):
            url = "http://" + url

        uploader = self.uploader_class(
            book_file["path"],
            file_name=book_file.get("name"),
            timeout=_network_timeout(context),
        )
        result = uploader.upload(url)
        if not result.get("success"):
            raise UpstreamError(
                str(result.get("message") or "Device rejected the upload"),
                error_type=str(result.get("error_type") or "other"),
                status_code=result.get("status_code"),
            )
        return result

    def self_check(self, context):
        configured = bool(str((context.get("config") or {}).get("device_url") or "").strip())
        return CheckReport(healthy=configured, message="设备地址已配置" if configured else "设备地址未配置")
