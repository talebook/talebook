import re

from webserver.plugins.runtime.domains import BookMetadata, ItemFailure, MetadataQuery, Page, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult
from webserver.plugins.runtime.safe_http import SafeHttpClient


EMPTY_VALUES = (None, "", [], {})
USER_AGENT = "Talebook plugin connector/1.0 (+https://github.com/talebook/talebook)"
_CLIENT = SafeHttpClient()


def _http_json(method, url, headers=None, params=None, body=None, timeout=30, allowed_hosts=()):
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


def _first(value, default=None):
    if isinstance(value, list):
        return value[0] if value else default
    return value if value not in EMPTY_VALUES else default


def _names(values):
    return [str(item.get("name", "")).strip() for item in values or [] if str(item.get("name", "")).strip()]


def _field_decisions(current, candidate, locked_fields=()):
    current = dict(current or {})
    locked = {str(field) for field in locked_fields or []}
    decisions = []
    for field in sorted(candidate):
        proposed = candidate[field]
        if proposed in EMPTY_VALUES:
            continue
        existing = current.get(field)
        if field in locked:
            decision = "locked"
        elif existing in EMPTY_VALUES:
            decision = "fill_empty"
        elif existing == proposed:
            decision = "unchanged"
        else:
            decision = "candidate"
        decisions.append(
            {
                "field": field,
                "current": existing,
                "candidate": proposed,
                "decision": decision,
                "locked": field in locked,
                "will_apply": decision == "fill_empty",
            }
        )
    return decisions


class OpenLibraryProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.combo.open-library",
        "name": "Open Library",
        "description": "按 ISBN 获取 Open Library 元数据与可用评分，并生成逐字段安全候选。",
        "version": "1.0.0",
        "categories": ["metadata", "reviews"],
        "capabilities": ["metadata.lookup", "reviews.lookup"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {"queries": {"type": "array"}}},
        "permissions": ["books.read", "plugin_records.write", "network.read"],
        "data_policy": {"stores_full_text": False, "retention": "rating_summary_and_source_link"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://openlibrary.org/developers/api",
        "license": "GPL-3.0",
        "ui": {"icon": "mdi-library-outline", "primary_action": "configure"},
        "connection_owners": ["instance"],
    }

    def __init__(self, transport=_http_json):
        self.transport = transport

    def execute(self, context):
        endpoint = "https://openlibrary.org"
        queries = list((context.get("config") or {}).get("queries") or [])
        if context["action"] == "test" and not queries:
            self.transport("GET", endpoint + "/search.json", params={"q": "talebook", "limit": 1})
            return ProviderResult(health_message="Open Library connection healthy")
        items = []
        target_ids = set(context.get("target_external_ids") or [])
        for query in queries:
            isbn = re.sub(r"[^0-9Xx]", "", str(query.get("isbn") or ""))
            external_id = "openlibrary:%s" % isbn
            if not isbn:
                continue
            payload = self.transport(
                "GET",
                endpoint + "/api/books",
                params={"bibkeys": "ISBN:%s" % isbn, "format": "json", "jscmd": "data"},
            )
            book = payload.get("ISBN:%s" % isbn) or {}
            if not book:
                if not target_ids or external_id in target_ids:
                    items.append(
                        ProviderItem(
                            external_id=external_id,
                            entity_type="metadata",
                            data={"source": "open_library", "isbn": isbn},
                            error_code="open_library.not_found",
                            error_message="Open Library has no record for this ISBN",
                        )
                    )
                continue
            candidate = {
                "title": book.get("title"),
                "subtitle": book.get("subtitle"),
                "authors": _names(book.get("authors")),
                "publisher": _first(_names(book.get("publishers"))),
                "published": book.get("publish_date"),
                "tags": _names(book.get("subjects")),
                "cover_url": (book.get("cover") or {}).get("large") or (book.get("cover") or {}).get("medium"),
                "isbn": isbn,
            }
            data = {
                "source": "open_library",
                "book_id": query.get("book_id"),
                "isbn": isbn,
                "source_url": book.get("url") or "https://openlibrary.org/isbn/%s" % isbn,
                "fields": _field_decisions(query.get("current_metadata"), candidate, query.get("locked_fields")),
            }
            if not target_ids or external_id in target_ids:
                items.append(ProviderItem(external_id=external_id, entity_type="metadata", data=data))
            rating = book.get("ratings") or {}
            if not rating and book.get("key"):
                edition = self.transport("GET", endpoint + str(book["key"]) + ".json")
                work_key = ((edition.get("works") or [{}])[0]).get("key")
                if work_key:
                    rating = self.transport("GET", endpoint + str(work_key) + "/ratings.json").get("summary") or {}
            if rating.get("average") is not None and (not target_ids or external_id + ":rating" in target_ids):
                review = Review.from_rating(
                    "open_library",
                    external_id + ":rating",
                    rating.get("average"),
                    5,
                    sample_count=rating.get("count"),
                    source_url=data["source_url"],
                    source_time=rating.get("updated_at") or "",
                    book_id=query.get("book_id"),
                ).to_dict()
                items.append(ProviderItem(external_id=external_id + ":rating", entity_type="review", data=review))
        return ProviderResult(items=items, next_cursor={"completed": True}, health_message="Open Library query complete")

    def search_books(self, query, context):
        query = MetadataQuery.from_value(query)
        value = (query.isbn or query.title).strip()
        if not value:
            return []
        payload = self.transport("GET", "https://openlibrary.org/search.json", params={"q": value, "limit": 20})
        return [
            BookMetadata.from_dict(
                {
                    "title": item.get("title") or "",
                    "authors": item.get("author_name") or [],
                    "isbn": (item.get("isbn") or [""])[0],
                    "provider_key": self.manifest["id"],
                    "provider_value": item.get("key") or "",
                }
            )
            for item in payload.get("docs", [])
        ]

    def get_metadata(self, external_id, context):
        return BookMetadata.from_dict({"provider_key": self.manifest["id"], "provider_value": external_id})

    def get_cover(self, cover_url, context):
        return None

    def get_reviews(self, query, context):
        run_context = {
            **context,
            "action": "run",
            "config": {**dict(context.get("config") or {}), "queries": [dict(query or {})]},
        }
        result = self.execute(run_context)
        return Page(
            items=[
                Review.from_dict(item.data) for item in result.items if item.entity_type == "review" and not item.error_code
            ],
            failures=[
                ItemFailure(item.external_id, item.error_code, item.error_message)
                for item in result.items
                if item.entity_type == "review" and item.error_code
            ],
            next_cursor=dict(result.next_cursor or {}),
            health_message=result.health_message,
        )


PROVIDER = OpenLibraryProvider()
