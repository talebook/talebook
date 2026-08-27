from webserver.plugins.runtime.domains import CheckReport
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderResult

from .base import OPDSProvider


def _status(session, settings):
    from webserver.models import OpdsSource

    sources = session.query(OpdsSource).all()
    return {
        "configured": len(sources),
        "enabled": sum(1 for item in sources if item.active),
        "service_enabled": bool(settings.get("OPDS_ENABLED", True)),
    }


class GenericOPDSProvider(OPDSProvider):
    """把 OpdsSource 事实表绑定到标准 SourceProvider。"""

    def __init__(self):
        super().__init__(
            "talebook.source.opds",
            "Generic OPDS",
            "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
            "https://github.com/talebook/talebook",
        )
        self.manifest = {
            "protocol_version": PROTOCOL_VERSION,
            "id": "talebook.source.opds",
            "name": "Generic OPDS",
            "description": "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
            "version": "1.0.0",
            "categories": ["book_sources"],
            "capabilities": ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
            "runtime_kind": "builtin",
            "actions": ["test"],
            "auth_schema": {"type": "object", "properties": {}},
            "config_schema": {"type": "object", "properties": {}},
            "permissions": ["books.read", "books.write", "network.read"],
            "data_policy": {"stores_full_text": False, "retention": "source_owned"},
            "compatibility": {"talebook": ">=0.1.0"},
            "connection_owners": ["instance"],
            "download_mode": "single_book",
            "homepage": "https://github.com/talebook/talebook",
            "license": "GPL-3.0",
            "ui": {
                "icon": "mdi-rss-box",
                "service_toggle": "opds",
                "manage_dialog": "opds",
                "manage_label_key": "pluginManagement.browse",
                "primary_action": "browse",
                "healthy_message": "Generic OPDS 适配器可用",
            },
        }

    def status(self, session, settings):
        return _status(session, settings)

    @staticmethod
    def initial_enabled(settings):
        return True

    def execute(self, context):
        if not (context.get("config") or {}).get("endpoint"):
            return ProviderResult(health_message=self.manifest["ui"]["healthy_message"])
        return super().execute(context)

    def self_check(self, context):
        if not (context.get("config") or {}).get("endpoint"):
            return CheckReport(healthy=True, message=self.manifest["ui"]["healthy_message"])
        return super().self_check(context)


PROVIDER = GenericOPDSProvider()
