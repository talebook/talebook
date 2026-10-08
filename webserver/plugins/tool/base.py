import os

from webserver.plugins.runtime.domains import CheckReport
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, UpstreamError


class BuiltinCapabilityProvider:
    """Expose a Talebook-owned capability through the plugin catalog.

    The provider owns no duplicate configuration. Its management action points
    to the capability's native UI while the shared plugin runtime supplies
    health checks and durable run history.
    """

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
    """正文工具共享契约；具体子类必须实现真实 preview/apply。

    书籍工具统一经 ``/api/plugins/<plugin_key>/tool[/preview|/run]`` 暴露，HTTP 层不认识
    具体插件：取哪种格式、接受哪些参数、允许哪些写回方式、新书后缀与元数据同步都由
    插件在这里自述，新增工具不需要再改 handler 或注册路由。
    """

    # 写回方式：new 另存为新书；overwrite 覆盖原书对应格式（可回滚）。
    output_modes = ("new", "overwrite")
    new_book_suffix = ""
    preview_timeout = 30
    apply_timeout = None

    def __init__(self, manifest, supported_formats, supports_auto_trigger=False, input_formats=None):
        super().__init__(manifest)
        self.supported_formats = frozenset(supported_formats)
        self.supports_auto_trigger = supports_auto_trigger
        # 书籍同时有多种可处理格式时按此顺序挑选输入文件。
        self.input_formats = tuple(input_formats or sorted(self.supported_formats))

    def describe(self):
        """无书籍依赖的选项元数据（预设、方向等），供工具页初始化渲染。"""
        return {}

    def tool_input(self, params, book):
        """把客户端 params 收敛为 provider 输入；只取白名单字段，path/format 由平台注入。"""
        return {}

    def audit_fields(self, tool_input):
        """写入审计记录的业务参数摘要，不含文件路径。"""
        return {}

    def book_updates(self, output):
        """写回后需要同步到书库的元数据：title / authors / language，缺省不改。"""
        return {}

    def new_book_title_suffix(self, output):
        return self.new_book_suffix

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
