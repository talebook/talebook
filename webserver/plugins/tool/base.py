import os

from webserver.plugins.runtime.domains import CheckReport
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, UpstreamError


class BuiltinCapabilityProvider:
    """Expose a Talebook-owned capability through the plugin catalog.

    The provider owns no duplicate configuration. Its management action points
    to the capability's native UI while the shared plugin runtime supplies
    health checks and durable run history.
    """

    auto_install = True

    def __init__(self, manifest, enabled_setting=None, status_fn=None):
        self.manifest = manifest
        # 首次安装时是否启用：默认启用；给定设置名时跟随该设置。
        self.enabled_setting = enabled_setting
        # 自报配置状态（已配置多少来源、启用多少），供管理页展示。
        self.status_fn = status_fn

    def status(self, session, settings):
        return self.status_fn(session, settings) if self.status_fn else {}

    def initial_enabled(self, settings):
        if self.enabled_setting is None:
            return True
        return bool(settings.get(self.enabled_setting, False))

    def self_check(self, context):
        return CheckReport(healthy=True, message=self.manifest["ui"]["healthy_message"])


class TextTransformPlugin(BuiltinCapabilityProvider):
    """正文工具共享契约；具体子类必须实现真实 preview/apply。"""

    def __init__(self, manifest, supported_formats, supports_auto_trigger=False):
        super().__init__(manifest)
        self.supported_formats = frozenset(supported_formats)
        self.supports_auto_trigger = supports_auto_trigger

    def preview(self, src, context):
        raise NotImplementedError

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        raise NotImplementedError

    @staticmethod
    def _path(src, formats=None):
        path = str(src.get("path") or "")
        fmt = str(src.get("format") or "").upper()
        if not path or not os.path.isfile(path):
            raise UpstreamError("Transform input file is missing")
        if formats and fmt not in formats:
            raise UpstreamError("Transform input format is not supported")
        return path, fmt


def _manifest(plugin_id, name, description, categories, capabilities, permissions, ui, config_schema=None):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": categories,
        "capabilities": capabilities,
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": config_schema or {"type": "object", "properties": {}},
        "permissions": permissions,
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        # Talebook 自有能力由管理员在实例级配置，不存在每用户连接。
        "connection_owners": ["instance"],
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": ui,
    }
