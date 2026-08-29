from webserver.plugins.runtime.domains import ItemFailure, Page, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult, UpstreamError
from webserver.plugins.runtime.safe_http import SafeHttpClient


_CLIENT = SafeHttpClient()


def _http_json(method, url, headers=None, params=None, timeout=30, allowed_hosts=()):
    return _CLIENT.json(
        method,
        url,
        headers={"Accept": "application/json", **dict(headers or {})},
        params=params,
        timeout=timeout,
        allowed_hosts=allowed_hosts,
    )


def _chapter_review(row, endpoint, external_id, mapped_book, chapter, segment):
    return {
        "source": "talebook_brs",
        "review_kind": "chapter_comment",
        "external_id": external_id,
        "book_id": mapped_book,
        "domain_id": "",
        "series_id": "",
        "rating": {"value": row.get("rating"), "scale": row.get("rating_scale") or 5, "sample_count": None},
        "source_time": row.get("updated_at") or row.get("created_at") or "",
        "source_url": row.get("url") or "%s/comments/%s" % (endpoint, row.get("id")),
        "summary": " ".join(str(row.get("summary") or row.get("content") or "").split())[:500],
        "domain": "chapter_reviews",
        "chapter": chapter,
        "segment": segment,
        "remote_book_id": str(row.get("book_id") or ""),
        "remote_chapter_id": str(row.get("chapter_id") or ""),
        "remote_segment_id": str(row.get("segment_id") or ""),
    }


class BRSProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.annotation.brs",
        "name": "talebook-brs 章评",
        "description": "连接一个 talebook-brs 实例，按 book/chapter/segment 映射导入公开章评摘要。",
        "version": "1.0.0",
        "categories": ["annotations"],
        "capabilities": ["annotations.chapter_reviews"],
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
                "endpoint": {"type": "string"},
                "allowed_hosts": {"type": "array", "items": {"type": "string"}, "title": "私网主机白名单"},
                "book_map": {"type": "object"},
                "chapter_map": {"type": "object"},
                "segment_map": {"type": "object"},
            },
        },
        "permissions": ["books.read", "plugin_records.write", "network.read"],
        "data_policy": {"stores_full_text": False, "retention": "rating_summary_and_source_link"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": {"icon": "mdi-comment-text-multiple-outline", "primary_action": "configure"},
        "connection_owners": ["instance"],
    }

    def __init__(self, transport=_http_json):
        self.transport = transport

    def execute(self, context):
        config = context.get("config") or {}
        endpoint = str(config.get("endpoint") or "").rstrip("/")
        if not endpoint:
            raise UpstreamError("BRS endpoint is required")
        token = (context.get("secrets") or {}).get("token", "")
        cursor = (context.get("cursor") or {}).get("cursor", "")
        payload = self.transport(
            "GET",
            endpoint + "/api/v1/comments",
            headers={"Authorization": "Bearer %s" % token},
            params={"cursor": cursor},
            allowed_hosts=config.get("allowed_hosts") or (),
        )
        if context["action"] == "test":
            return ProviderResult(health_message="BRS connection healthy")
        items = []
        targets = set(context.get("target_external_ids") or [])
        book_map = {str(key): value for key, value in (config.get("book_map") or {}).items()}
        chapter_map = {str(key): value for key, value in (config.get("chapter_map") or {}).items()}
        segment_map = {str(key): value for key, value in (config.get("segment_map") or {}).items()}
        for row in payload.get("comments") or payload.get("items") or []:
            external_id = "brs:%s" % row.get("id")
            if targets and external_id not in targets:
                continue
            remote_book = str(row.get("book_id") or "")
            remote_chapter = str(row.get("chapter_id") or "")
            remote_segment = str(row.get("segment_id") or "")
            mapped_book = book_map.get(remote_book)
            if mapped_book is None:
                items.append(
                    ProviderItem(
                        external_id=external_id,
                        entity_type="review",
                        data={"source": "talebook_brs", "remote_book_id": remote_book},
                        error_code="brs.book_unmapped",
                        error_message="BRS book has no Talebook mapping",
                    )
                )
                continue
            data = _chapter_review(
                row,
                endpoint,
                external_id,
                mapped_book,
                chapter_map.get(remote_chapter, remote_chapter),
                segment_map.get(remote_segment, remote_segment),
            )
            items.append(
                ProviderItem(external_id=external_id, entity_type="review", data=data, remote_updated_at=data["source_time"])
            )
        next_cursor = payload.get("next_cursor")
        return ProviderResult(
            items=items,
            next_cursor={"cursor": next_cursor} if next_cursor else dict(context.get("cursor") or {}),
            health_message="BRS sync complete",
        )

    def get_reviews(self, query, context):
        result = self.execute({**context, "action": "run"})
        return Page(
            items=[Review.from_dict(item.data) for item in result.items if not item.error_code],
            failures=[
                ItemFailure(item.external_id, item.error_code, item.error_message) for item in result.items if item.error_code
            ],
            has_more=bool((result.next_cursor or {}).get("cursor")),
            next_cursor=dict(result.next_cursor or {}),
            health_message=result.health_message,
        )


PROVIDER = BRSProvider()
