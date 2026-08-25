"""设备推送插件：把书籍文件发送到用户的阅读设备。

这些能力此前完全在插件系统之外：6 个上传器由 handlers/book.py 用一张 dict
直接实例化，没有连接、没有 health、没有审计，异常处理各写各的。它们其实是
标准的插件形态——需要每用户配置（设备地址）、要发网络请求、会失败、需要留痕。

纯上传逻辑仍在 `webserver/plugins/push/devices.py`（原 `plugins/sending/uploader.py`）；
本模块只做 manifest 与契约适配，不重复实现协议。
"""

import datetime

from webserver.plugins.push.devices import (
    BooxUploader,
    DangdangUploader,
    DuokanUploader,
    HanwangUploader,
    IReaderUploader,
    PureLibroUploader,
)

from .domains import CheckReport
from .protocol import PROTOCOL_VERSION, UpstreamError


PUSH_CAPABILITY = "integrations.push"


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


PUSH_PROVIDERS = (
    DevicePushProvider(
        _manifest(
            "talebook.push.duokan",
            "多看阅读",
            "通过 WiFi 传书把书籍发送到多看阅读设备。",
            "mdi-tablet",
        ),
        DuokanUploader,
    ),
    DevicePushProvider(
        _manifest(
            "talebook.push.boox",
            "文石 BOOX",
            "把书籍发送到文石 BOOX 设备的推送库。",
            "mdi-tablet-android",
            "https://www.boox.com/",
        ),
        BooxUploader,
    ),
    DevicePushProvider(
        _manifest(
            "talebook.push.hanwang",
            "汉王电纸书",
            "通过 WiFi 传书把书籍发送到汉王电纸书。",
            "mdi-book-open-outline",
        ),
        HanwangUploader,
    ),
    DevicePushProvider(
        _manifest(
            "talebook.push.ireader",
            "掌阅 iReader",
            "把书籍发送到掌阅 iReader 设备。",
            "mdi-book-arrow-right-outline",
        ),
        IReaderUploader,
    ),
    DevicePushProvider(
        _manifest(
            "talebook.push.dangdang",
            "当当阅读器",
            "把书籍发送到当当阅读器。",
            "mdi-tablet-dashboard",
        ),
        DangdangUploader,
    ),
    DevicePushProvider(
        _manifest(
            "talebook.push.purelibro",
            "PureLibro",
            "把书籍发送到 PureLibro 阅读设备。",
            "mdi-book-play-outline",
        ),
        PureLibroUploader,
    ),
)

# 设备类型标识 → 插件的历史导出。业务 handler 已改为按 manifest
# 声明交给 PluginRuntime 解析；这张表仅保留给旧测试/嵌入调用兼容。
PUSH_PROVIDERS_BY_DEVICE = {provider.manifest["id"].rsplit(".", 1)[-1]: provider for provider in PUSH_PROVIDERS}
