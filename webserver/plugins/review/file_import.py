import csv
import io
import json

from webserver.plugins.runtime.domains import Page, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult

EMPTY_VALUES = (None, "", [], {})
GOODREADS_ALIASES = {
    "external_id": ["Book Id", "book_id"],
    "title": ["Title", "title"],
    "author": ["Author", "author"],
    "rating": ["My Rating", "rating"],
    "source_time": ["Date Read", "date_read"],
    "summary": ["My Review", "review"],
    "source_url": ["URL", "url"],
    "isbn": ["ISBN13", "ISBN", "isbn"],
}
STORYGRAPH_ALIASES = {
    "external_id": ["Book Id", "book_id", "ISBN/UID"],
    "title": ["Title", "title"],
    "author": ["Authors", "author"],
    "rating": ["Star Rating", "rating"],
    "source_time": ["Date Read", "date_read"],
    "summary": ["Review", "review"],
    "source_url": ["URL", "url"],
    "isbn": ["ISBN/UID", "isbn"],
}


def _mapped_value(row, name, aliases, mapping):
    key = mapping.get(name)
    if key:
        return row.get(key)
    return next((row.get(alias) for alias in aliases.get(name, []) if row.get(alias) not in EMPTY_VALUES), None)


def parse_review_file(content, source, file_format="csv", mapping=None):
    mapping = dict(mapping or {})
    if file_format == "json":
        parsed = json.loads(content)
        rows = parsed if isinstance(parsed, list) else parsed.get("reviews") or parsed.get("items") or []
    else:
        rows = list(csv.DictReader(io.StringIO(content.lstrip("\ufeff"))))
    aliases = GOODREADS_ALIASES if source == "goodreads" else STORYGRAPH_ALIASES if source == "storygraph" else {}
    result = []
    for index, row in enumerate(rows, 1):
        external_id = (
            _mapped_value(row, "external_id", aliases, mapping) or _mapped_value(row, "isbn", aliases, mapping) or index
        )
        rating = _mapped_value(row, "rating", aliases, mapping)
        try:
            rating = float(rating) if rating not in EMPTY_VALUES else None
        except (TypeError, ValueError):
            result.append((str(external_id), None, "review_file.invalid_rating", "Rating is not numeric"))
            continue
        if rating is None:
            result.append((str(external_id), None, "review_file.rating_missing", "Rating is missing"))
            continue
        data = Review.from_rating(
            source,
            "%s:%s" % (source, external_id),
            rating,
            float(mapping.get("scale") or 5),
            source_url=_mapped_value(row, "source_url", aliases, mapping) or "",
            source_time=_mapped_value(row, "source_time", aliases, mapping) or "",
            summary=_mapped_value(row, "summary", aliases, mapping) or "",
            extra={
                "title": _mapped_value(row, "title", aliases, mapping) or "",
                "author": _mapped_value(row, "author", aliases, mapping) or "",
                "isbn": _mapped_value(row, "isbn", aliases, mapping) or "",
            },
        ).to_dict()
        result.append((str(external_id), data, "", ""))
    return result


class ReviewFileProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.review.file-import",
        "name": "评价文件导入",
        "description": "导入 Goodreads、StoryGraph 或显式字段映射的 CSV/JSON；文件正文加密保存且不进入 run log。",
        "version": "1.0.0",
        "categories": ["reviews"],
        "capabilities": ["reviews.import"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {
            "type": "object",
            "properties": {"content": {"type": "string", "writeOnly": True}},
            "required": ["content"],
        },
        "config_schema": {
            "type": "object",
            "properties": {
                "source": {"type": "string", "enum": ["goodreads", "storygraph", "generic"]},
                "format": {"type": "string", "enum": ["csv", "json"]},
                "mapping": {"type": "object"},
            },
        },
        "permissions": ["plugin_records.write"],
        "data_policy": {"stores_full_text": False, "retention": "rating_summary_and_source_link"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": {"icon": "mdi-file-delimited-outline", "primary_action": "configure"},
        "connection_owners": ["instance", "user"],
    }

    def execute(self, context):
        config = context.get("config") or {}
        source = config.get("source") or "generic"
        rows = parse_review_file(
            (context.get("secrets") or {}).get("content", ""),
            source,
            config.get("format") or "csv",
            config.get("mapping"),
        )
        if context["action"] == "test":
            return ProviderResult(health_message="Parsed %d review rows" % len(rows))
        targets = set(context.get("target_external_ids") or [])
        items = []
        for row_id, data, error_code, error_message in rows:
            external_id = "%s:%s" % (source, row_id)
            if targets and external_id not in targets:
                continue
            items.append(
                ProviderItem(
                    external_id=external_id,
                    entity_type="review",
                    data=data or {"source": source, "row_id": row_id},
                    remote_updated_at=(data or {}).get("source_time"),
                    error_code=error_code,
                    error_message=error_message,
                )
            )
        return ProviderResult(items=items, next_cursor={"completed": True}, health_message="Review file import complete")

    def get_reviews(self, query, context):
        result = self.execute({**context, "action": "run"})
        items = [Review.from_dict(item.data) for item in result.items if not item.error_code]
        return Page(items=items, health_message=result.health_message)


PROVIDER = ReviewFileProvider()
