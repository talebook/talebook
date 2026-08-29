from webserver.plugins.runtime.protocol import ProviderItem, ProviderResult, UpstreamError

from .base import _manifest


def discover_calibre_providers():
    try:
        from calibre.customize.ui import metadata_plugins

        plugins = metadata_plugins({"identify"})
    except Exception as exc:
        raise UpstreamError("Calibre metadata provider registry is unavailable") from exc
    return [
        {
            "name": plugin.name,
            "version": ".".join(str(value) for value in (getattr(plugin, "version", ()) or ())),
            "author": str(getattr(plugin, "author", "") or ""),
            "capabilities": sorted(getattr(plugin, "capabilities", set()) or []),
        }
        for plugin in plugins
    ]


class CalibreProviderBridge:
    manifest = _manifest(
        "talebook.meta.calibre-provider-bridge",
        "Calibre Provider Bridge",
        "自动发现当前 Calibre 运行时已启用的 identify provider。",
        ["metadata"],
        ["metadata.discover"],
        {"type": "object", "properties": {}},
        {"type": "object", "properties": {}},
        ["books.read", "plugin_records.write"],
        "mdi-connection",
        "https://manual.calibre-ebook.com/plugins.html",
    )

    def __init__(self, discover=discover_calibre_providers):
        self.discover = discover

    def execute(self, context):
        providers = self.discover()
        if context["action"] == "test":
            return ProviderResult(health_message="Discovered %d Calibre metadata providers" % len(providers))
        target_ids = set(context.get("target_external_ids") or [])
        items = [
            ProviderItem(
                external_id="calibre-provider:%s" % provider["name"].lower().replace(" ", "-"),
                entity_type="metadata",
                data={"source": "calibre_provider_bridge", "provider": provider},
            )
            for provider in providers
            if not target_ids or "calibre-provider:%s" % provider["name"].lower().replace(" ", "-") in target_ids
        ]
        return ProviderResult(items=items, health_message="Calibre provider discovery complete")

    def execute_feature(self, action, params, context):
        if action != "discover":
            raise UpstreamError("Unsupported Calibre provider feature")
        return {"providers": self.discover()}


PROVIDER = CalibreProviderBridge()
