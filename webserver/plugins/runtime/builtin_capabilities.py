from .protocol import PROTOCOL_VERSION, ProviderResult


class BuiltinCapabilityProvider:
    """Expose a Talebook-owned capability through the plugin catalog.

    The provider owns no duplicate configuration. Its management action points
    to the capability's native UI while the shared plugin runtime supplies
    health checks and durable run history.
    """

    def __init__(self, manifest):
        self.manifest = manifest

    def execute(self, context):
        return ProviderResult(health_message=self.manifest["ui"]["healthy_message"])


def _manifest(plugin_id, name, description, categories, capabilities, permissions, ui):
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
        "config_schema": {"type": "object", "properties": {}},
        "permissions": permissions,
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
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
                "manage_kind": "metadata",
                "primary_action": "configure",
                "hidden": True,
                "healthy_message": "内置元数据来源可用",
            },
        )
    ),
    *(
        BuiltinCapabilityProvider(
            _manifest(
                "talebook.metadata.source.%s" % source.replace("_", "-"),
                name,
                description,
                ["metadata"],
                ["metadata.lookup"],
                ["books.read", "network.read"],
                {
                    "icon": icon,
                    "manage_kind": "metadata_source",
                    "metadata_source": source,
                    "primary_action": "test",
                    "healthy_message": "%s 元数据查询可用" % name,
                },
            )
        )
        for source, name, description, icon in (
            ("douban", "豆瓣", "从豆瓣查询图书简介、作者、出版社和封面。", "mdi-alpha-d-circle-outline"),
            ("douban_v2", "豆瓣 V2", "通过豆瓣新版接口查询图书元数据。", "mdi-alpha-d-box-outline"),
            ("baidu", "百度百科", "从百度百科匹配图书条目和简介。", "mdi-alpha-b-circle-outline"),
            ("google", "Google Books", "从 Google Books 查询图书元数据。", "mdi-google"),
            ("amazon", "Amazon", "通过 Calibre Amazon Provider 查询图书元数据。", "mdi-amazon"),
            ("xinhua", "新华书店", "从新华书店查询图书出版信息。", "mdi-storefront-outline"),
            ("tomato", "番茄小说", "从番茄小说查询网络文学元数据。", "mdi-fruit-cherries"),
            ("qimao", "七猫小说", "从七猫小说查询网络文学元数据。", "mdi-cat"),
            ("neodb", "NeoDB", "从 NeoDB 查询开放图书元数据。", "mdi-database-search-outline"),
            ("booksource", "在线书源", "从已启用的 Legado 在线书源查询图书元数据。", "mdi-book-search-outline"),
        )
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
                "manage_kind": "opds",
                "primary_action": "browse",
                "healthy_message": "Generic OPDS 适配器可用",
            },
        )
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
                "manage_kind": "legado",
                "primary_action": "manage",
                "healthy_message": "Legado 书源适配器可用",
            },
        )
    ),
)
