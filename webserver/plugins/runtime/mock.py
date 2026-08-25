import time

from .domains import BookMetadata, Page, Review
from .protocol import PROTOCOL_VERSION, UpstreamAuthError, ProviderItem, UpstreamRateLimitError, ProviderResult


class MockMultiTabProvider:
    """Deterministic provider used to prove shared installation/runtime behavior."""

    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.mock.multi-tab",
        "name": "Talebook Mock Multi-tab Provider",
        "version": "1.0.0",
        "categories": ["metadata", "reviews"],
        "capabilities": ["metadata.lookup", "reviews.import"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {
            "type": "object",
            "properties": {"token": {"type": "string", "writeOnly": True}},
            "required": ["token"],
        },
        "config_schema": {
            "type": "object",
            "properties": {
                "fail_external_ids": {"type": "array", "items": {"type": "string"}},
                "rate_limit_attempts": {"type": "integer", "minimum": 0},
                "delay_seconds": {"type": "number", "minimum": 0},
            },
        },
        "permissions": ["books.read", "plugin_records.write"],
        "data_policy": {"stores_full_text": False, "retention": "source_record"},
        "compatibility": {"talebook": ">=0.1.0"},
        # 用于验证同一 installation 下实例级与用户级连接可以共存。
        "connection_owners": ["instance", "user"],
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": {"hidden": True},
    }

    def execute(self, context):
        token = context["secrets"].get("token", "")
        if not token or token == "bad-token":
            raise UpstreamAuthError("Mock credential rejected")
        config = context.get("config", {})
        delay = float(config.get("delay_seconds", 0) or 0)
        if delay:
            time.sleep(delay)
        limited_attempts = int(config.get("rate_limit_attempts", 0) or 0)
        if context["attempt"] <= limited_attempts:
            raise UpstreamRateLimitError("Mock rate limit for token=%s" % token, retry_after=0)
        if context["action"] == "test":
            return ProviderResult(health_message="mock connection healthy")

        all_items = [
            ProviderItem(
                external_id="mock-book-1",
                entity_type="metadata",
                data={"title": "The Mock Book", "isbn": "9780000000001", "source_token": token},
                remote_updated_at="2026-08-14T00:00:00Z",
            ),
            ProviderItem(
                external_id="mock-review-1",
                entity_type="review",
                data={"book_external_id": "mock-book-1", "rating": 4.5, "scale": 5, "source_token": token},
                remote_updated_at="2026-08-14T00:00:00Z",
            ),
        ]
        target_ids = set(context.get("target_external_ids") or [])
        if target_ids:
            all_items = [item for item in all_items if item.external_id in target_ids]
        failed_ids = set(config.get("fail_external_ids") or [])
        retry_succeeds = config.get("retry_succeeds", True)
        items = []
        for item in all_items:
            if item.external_id in failed_ids and not (context["action"] == "retry" and retry_succeeds):
                item = ProviderItem(
                    external_id=item.external_id,
                    entity_type=item.entity_type,
                    data=item.data,
                    remote_updated_at=item.remote_updated_at,
                    error_code="mock_item_failed",
                    error_message="Mock failed item with token=%s" % token,
                )
            items.append(item)
        offset = int((context.get("cursor") or {}).get("offset", 0))
        return ProviderResult(items=items, next_cursor={"offset": offset + 1}, health_message="mock request complete")

    def search_books(self, query, context):
        return [BookMetadata.from_dict({"title": query or "The Mock Book", "provider_key": self.manifest["id"]})]

    def get_metadata(self, external_id, context):
        return BookMetadata.from_dict({"title": "The Mock Book", "provider_value": external_id})

    def get_reviews(self, query, context):
        return Page(items=[Review.from_dict({"book_external_id": str(query), "rating": 4.5, "scale": 5})])
