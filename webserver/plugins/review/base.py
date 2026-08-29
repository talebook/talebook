from dataclasses import dataclass

from webserver.plugins.runtime.domains import ItemFailure, Page, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult
from webserver.plugins.runtime.safe_http import SafeHttpClient


USER_AGENT = "Talebook plugin connector/1.0 (+https://github.com/talebook/talebook)"
_CLIENT = SafeHttpClient()


def http_json(method, url, headers=None, params=None, body=None, timeout=30, allowed_hosts=()):
    headers = {"Accept": "application/json", "User-Agent": USER_AGENT, **dict(headers or {})}
    return _CLIENT.json(
        method,
        url,
        headers=headers,
        params=params,
        json=body,
        timeout=timeout,
        allowed_hosts=allowed_hosts,
    )


@dataclass(frozen=True)
class ReviewSourceSpec:
    plugin_id: str
    key: str
    name: str
    homepage: str
    icon: str
    scale: float
    brand_icon: str = ""
    requires_token: bool = False


def review_manifest(spec):
    auth = {"type": "object", "properties": {}}
    if spec.requires_token:
        auth = {
            "type": "object",
            "properties": {"token": {"type": "string", "writeOnly": True}},
            "required": ["token"],
        }
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": spec.plugin_id,
        "name": spec.name,
        "description": "保留 %s 原始评分尺度、样本数、时间和来源链接。" % spec.name,
        "version": "1.0.0",
        "categories": ["reviews"],
        "capabilities": ["reviews.lookup"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": auth,
        "config_schema": {"type": "object", "properties": {"queries": {"type": "array"}}},
        "permissions": ["books.read", "plugin_records.write", "network.read"],
        "data_policy": {"stores_full_text": False, "retention": "rating_summary_and_source_link"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": spec.homepage,
        "license": "GPL-3.0",
        "ui": {
            "icon": spec.icon,
            "brand_icon": spec.brand_icon,
            "primary_action": "configure",
        },
        "connection_owners": ["instance"],
    }


class CatalogReviewProvider:
    def __init__(self, spec, transport=http_json):
        self.spec = spec
        self.transport = transport
        self.manifest = review_manifest(spec)

    def execute(self, context):
        queries = list((context.get("config") or {}).get("queries") or [])
        if context["action"] == "test" and not queries:
            return ProviderResult(health_message="%s configuration valid" % self.spec.name)
        items = []
        targets = set(context.get("target_external_ids") or [])
        for query in queries:
            external_id, payload = self._fetch(context, query)
            if targets and external_id not in targets:
                continue
            try:
                data = self._parse(query, external_id, payload)
                items.append(
                    ProviderItem(
                        external_id=external_id,
                        entity_type="review",
                        data=data,
                        remote_updated_at=data["source_time"],
                    )
                )
            except (KeyError, TypeError, ValueError) as exc:
                items.append(
                    ProviderItem(
                        external_id=external_id,
                        entity_type="review",
                        data={"source": self.spec.key},
                        error_code="%s.invalid_response" % self.spec.key,
                        error_message="Provider response has no usable rating: %s" % exc,
                    )
                )
        return ProviderResult(
            items=items,
            next_cursor={"completed": True},
            health_message="%s query complete" % self.spec.name,
        )

    def _fetch(self, context, query):
        raise NotImplementedError

    def _parse(self, query, external_id, payload):
        raise NotImplementedError

    def get_reviews(self, query, context):
        query = dict(query or {})
        try:
            external_id, payload = self._fetch(context, query)
            data = self._parse(query, external_id, payload)
            return Page(items=[Review.from_dict(data)])
        except (KeyError, TypeError, ValueError) as exc:
            external_id = locals().get("external_id", "%s:unknown" % self.spec.key)
            return Page(
                failures=[
                    ItemFailure(
                        external_id,
                        "%s.invalid_response" % self.spec.key,
                        "Provider response has no usable rating: %s" % exc,
                    )
                ]
            )
