from webserver.constants import AUTO_FILL_META, META_SELECTED_SOURCES, META_SOURCE_AI

from .interfaces import TRIGGER_SCHEMA
from .protocol import PROTOCOL_VERSION, ProviderResult


def _metadata_status(session, settings):
    configured = [value for value in settings.get(META_SELECTED_SOURCES, []) if value != META_SOURCE_AI]
    return {"configured": len(configured), "enabled": len(configured), "sources": configured}


def _opds_status(session, settings):
    from webserver.models import OpdsSource

    sources = session.query(OpdsSource).all()
    return {
        "configured": len(sources),
        "enabled": sum(1 for item in sources if item.active),
        "service_enabled": bool(settings.get("OPDS_ENABLED", True)),
    }


def _legado_status(session, settings):
    from webserver.models import BookSourceModel

    sources = session.query(BookSourceModel).all()
    return {"configured": len(sources), "enabled": sum(1 for item in sources if item.enabled)}


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

    def execute(self, context):
        return ProviderResult(health_message=self.manifest["ui"]["healthy_message"])


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


BUILTIN_CAPABILITY_PROVIDERS = (
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.metadata.builtin",
            "Talebook 元数据",
            "复用现有非 AI 元数据来源与自动补全流程。",
            ["metadata"],
            ["metadata.lookup"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-book-search-outline",
                "manage_route": "/admin/settings#metadata",
                "manage_label_key": "pluginManagement.configure",
                "primary_action": "configure",
                "healthy_message": "内置元数据来源可用",
            },
        ),
        enabled_setting=AUTO_FILL_META,
        status_fn=_metadata_status,
    ),
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.book-source.opds",
            "Generic OPDS",
            "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
            ["book_sources"],
            ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
            ["books.read", "books.write", "network.read"],
            {
                "icon": "mdi-rss-box",
                "manage_dialog": "opds",
                "manage_label_key": "pluginManagement.browse",
                "primary_action": "browse",
                "healthy_message": "Generic OPDS 适配器可用",
            },
        ),
        status_fn=_opds_status,
    ),
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.book-source.legado",
            "Legado 在线书源",
            "管理、导入、搜索、阅读与体检兼容 Legado 的在线书源。",
            ["book_sources"],
            ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
            ["books.read", "books.write", "network.read"],
            {
                "icon": "mdi-book-cog-outline",
                "manage_dialog": "legado",
                "manage_label_key": "pluginManagement.manage",
                "primary_action": "manage",
                "healthy_message": "Legado 书源适配器可用",
            },
        ),
        status_fn=_legado_status,
    ),
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.tool.text-replace",
            "正文查找替换",
            "对书籍的 EPUB / TXT 正文执行查找替换（支持正则），可写回原书或另存为新书。",
            ["integrations"],
            ["integrations.content_edit"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-find-replace",
                "manage_route": "/plugins/text-replace",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "正文查找替换工具可用",
            },
        )
    ),
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.tool.zh-converter",
            "繁简转换",
            "对书库书籍执行简体↔繁体中文转换（EPUB/TXT，8 种方向，可选增强词表）。",
            ["integrations"],
            ["integrations.content_convert"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-translate",
                "manage_route": "/plugins/zh-converter",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "繁简转换工具可用",
            },
        )
    ),
    BuiltinCapabilityProvider(
        _manifest(
            "talebook.tool.txt-fixer",
            "TXT编码修复",
            "检测 TXT 电子书编码（含乱码反转恢复），修复为 UTF-8 后写回或另存为新书。",
            ["integrations"],
            ["integrations.encoding_fix"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-file-restore-outline",
                "manage_route": "/plugins/txt-fixer",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "TXT 编码修复工具可用",
                "supports_auto_trigger": True,
            },
            # 编码错误是客观事实、可自动判定，因此允许配置为新书入库后自动处理。
            # 查找替换与繁简转换依赖用户意图，不提供该选项。
            config_schema={"type": "object", "properties": {"trigger": dict(TRIGGER_SCHEMA)}},
        )
    ),
)
