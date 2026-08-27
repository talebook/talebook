import json

from webserver.plugins.runtime.domains import Annotation, MetadataQuery, Page
from webserver.plugins.runtime.protocol import (
    PROTOCOL_VERSION,
    UpstreamAuthError,
    UpstreamError,
    UpstreamRateLimitError,
    ProviderResult,
)
from webserver.plugins.runtime.safe_http import SafeHttpClient

from .export import _as_list, _first, parse_weread_export


WEREAD_PLUGIN_KEY = "talebook.combo.weread"
WEREAD_GATEWAY = "https://i.weread.qq.com/api/agent/gateway"
WEREAD_SKILL_VERSION = "1.0.4"

WEREAD_QUERY_OPERATIONS = {
    "search": {
        "api_name": "/store/search",
        "required": {"keyword"},
        "params": {"keyword": "text", "scope": "scope", "maxIdx": "index", "count": "count"},
    },
    "book_info": {"api_name": "/book/info", "required": {"bookId"}, "params": {"bookId": "id"}},
    "chapters": {"api_name": "/book/chapterinfo", "required": {"bookId"}, "params": {"bookId": "id"}},
    "progress": {"api_name": "/book/getprogress", "required": {"bookId"}, "params": {"bookId": "id"}},
    "shelf": {"api_name": "/shelf/sync", "required": set(), "params": {}},
    "statistics": {
        "api_name": "/readdata/detail",
        "required": set(),
        "params": {"mode": "mode", "baseTime": "timestamp"},
    },
    "notebooks": {
        "api_name": "/user/notebooks",
        "required": set(),
        "params": {"count": "count", "lastSort": "timestamp"},
    },
    "highlights": {"api_name": "/book/bookmarklist", "required": {"bookId"}, "params": {"bookId": "id"}},
    "my_reviews": {
        "api_name": "/review/list/mine",
        "required": {"bookid"},
        "params": {"bookid": "id", "synckey": "index", "count": "count"},
    },
    "popular_highlights": {
        "api_name": "/book/bestbookmarks",
        "required": {"bookId"},
        "params": {"bookId": "id", "chapterUid": "index", "synckey": "index"},
    },
    "underline_stats": {
        "api_name": "/book/underlines",
        "required": {"bookId", "chapterUid"},
        "params": {"bookId": "id", "chapterUid": "index", "synckey": "index"},
    },
    "highlight_reviews": {
        "api_name": "/book/readreviews",
        "required": {"bookId", "chapterUid", "reviews"},
        "params": {"bookId": "id", "chapterUid": "index", "reviews": "reviews"},
    },
    "review_detail": {
        "api_name": "/review/single",
        "required": {"reviewId"},
        "params": {
            "reviewId": "id",
            "commentsCount": "small_count",
            "commentsDirection": "direction",
            "likesCount": "small_count",
            "likesDirection": "direction",
            "synckey": "index",
        },
    },
    "public_reviews": {
        "api_name": "/review/list",
        "required": {"bookId"},
        "params": {
            "bookId": "id",
            "reviewListType": "review_type",
            "count": "count",
            "maxIdx": "index",
            "synckey": "index",
        },
    },
    "recommendations": {
        "api_name": "/book/recommend",
        "required": set(),
        "params": {"count": "count", "maxIdx": "index"},
    },
    "similar": {
        "api_name": "/book/similar",
        "required": {"bookId"},
        "params": {"bookId": "id", "count": "count", "maxIdx": "index", "sessionId": "id"},
    },
    "friends_reading": {
        "api_name": "/discover/interact/type3",
        "required": set(),
        "params": {"count": "count", "maxIdx": "index", "synckey": "index"},
    },
}


def _feature_field_schema(kind):
    if kind in {"text", "id"}:
        return {"type": "string"}
    if kind == "reviews":
        return {"type": "array", "items": {"type": "object"}}
    if kind == "mode":
        return {"type": "string", "enum": ["weekly", "monthly", "annually", "overall"]}
    schema = {"type": "integer", "minimum": 0}
    if kind == "scope":
        schema["enum"] = [0, 2, 4, 6, 10, 12, 13, 14, 16]
    elif kind == "direction":
        schema["enum"] = [0, 1]
    elif kind == "review_type":
        schema["enum"] = [0, 1, 2, 3, 4]
    elif kind == "small_count":
        schema["maximum"] = 20
    elif kind == "count":
        schema["maximum"] = 100
    return schema


WEREAD_EXTRA_FEATURES = {
    operation: {
        "mode": "read",
        "required_scopes": ["profile.read"],
        "schema": {
            "type": "object",
            "properties": {name: _feature_field_schema(kind) for name, kind in spec["params"].items()},
            "required": sorted(spec["required"]),
        },
    }
    for operation, spec in WEREAD_QUERY_OPERATIONS.items()
}


def _validate_query_value(name, value, kind):
    if kind in {"text", "id"}:
        if not isinstance(value, str) or not value.strip():
            raise UpstreamError("WeRead query parameter %s must be a non-empty string" % name)
        limit = 200 if kind == "text" else 128
        if len(value) > limit:
            raise UpstreamError("WeRead query parameter %s is too long" % name)
        return value.strip()
    if kind == "reviews":
        if not isinstance(value, list) or not 1 <= len(value) <= 20:
            raise UpstreamError("WeRead reviews must contain between 1 and 20 ranges")
        result = []
        for item in value:
            if not isinstance(item, dict) or not isinstance(item.get("range"), str) or not item["range"].strip():
                raise UpstreamError("Each WeRead review range must be a non-empty string")
            unknown = set(item) - {"range", "maxIdx", "count", "synckey"}
            if unknown:
                raise UpstreamError("Unknown WeRead review range parameters: %s" % ", ".join(sorted(unknown)))
            if len(item["range"]) > 100:
                raise UpstreamError("WeRead review range is too long")
            safe = {"range": item["range"].strip()}
            for key in ("maxIdx", "count", "synckey"):
                if key in item:
                    safe[key] = _validate_query_value(key, item[key], "small_count" if key == "count" else "index")
            result.append(safe)
        return result
    if isinstance(value, bool) or not isinstance(value, int):
        raise UpstreamError("WeRead query parameter %s must be an integer" % name)
    if kind == "scope" and value not in {0, 2, 4, 6, 10, 12, 13, 14, 16}:
        raise UpstreamError("Unsupported WeRead search scope")
    if kind == "mode":
        raise UpstreamError("WeRead statistics mode must be a string")
    if kind == "direction" and value not in {0, 1}:
        raise UpstreamError("Unsupported WeRead sort direction")
    if kind == "review_type" and value not in {0, 1, 2, 3, 4}:
        raise UpstreamError("Unsupported WeRead review type")
    maximum = 20 if kind == "small_count" else 100 if kind == "count" else 2**63 - 1
    if value < 0 or value > maximum:
        raise UpstreamError("WeRead query parameter %s is outside the allowed range" % name)
    return value


def validate_weread_query(operation, params):
    spec = WEREAD_QUERY_OPERATIONS.get(operation)
    if spec is None:
        raise UpstreamError("Unsupported WeRead read operation")
    if not isinstance(params, dict):
        raise UpstreamError("WeRead query parameters must be an object")
    unknown = set(params) - set(spec["params"])
    missing = spec["required"] - set(params)
    if unknown:
        raise UpstreamError("Unknown WeRead query parameters: %s" % ", ".join(sorted(unknown)))
    if missing:
        raise UpstreamError("Missing WeRead query parameters: %s" % ", ".join(sorted(missing)))
    safe = {}
    for name, value in params.items():
        kind = spec["params"][name]
        if kind == "mode":
            if value not in {"weekly", "monthly", "annually", "overall"}:
                raise UpstreamError("Unsupported WeRead statistics mode")
            safe[name] = value
        else:
            safe[name] = _validate_query_value(name, value, kind)
    return spec["api_name"], safe


class WereadProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": WEREAD_PLUGIN_KEY,
        "name": "微信读书",
        "version": "1.2.0",
        "categories": ["integrations", "metadata", "annotations"],
        "capabilities": [
            "integrations.search",
            "integrations.books",
            "integrations.shelf",
            "integrations.statistics",
            "integrations.community",
            "integrations.recommendations",
            "metadata.lookup",
            "annotations.import",
        ],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {
            "type": "object",
            "properties": {"api_key": {"type": "string", "writeOnly": True}},
        },
        "config_schema": {
            "type": "object",
            "properties": {
                "max_retries": {"type": "integer", "minimum": 0, "maximum": 5},
                "backoff_seconds": {"type": "number", "minimum": 0},
            },
        },
        "permissions": ["books.read", "books.write", "profile.read", "annotations.write"],
        "data_policy": {"stores_full_text": True, "retention": "user_controlled"},
        "compatibility": {"talebook": ">=0.1.0"},
        # 每个用户使用自己的 API Key，不存在实例级共享连接。
        "connection_owners": ["user"],
        "homepage": "https://github.com/Tencent/WeChatReading",
        "license": "GPL-3.0",
        "description": "搜索微信读书内容，浏览书架、阅读统计、笔记、社区与推荐，并可将个人笔记导入 Talebook。",
        "extra_features": WEREAD_EXTRA_FEATURES,
        "ui": {
            "icon": "mdi-book-open-page-variant",
            "manage_route": "/plugins/weread",
            "manage_label_key": "pluginManagement.openWorkbench",
        },
    }

    def __init__(self, gateway=WEREAD_GATEWAY, http=None):
        self.gateway = gateway
        self.http = http or SafeHttpClient()

    def execute(self, context):
        input_data = context.get("input_data") or {}
        export_data = input_data.get("export")
        api_key = str((context.get("secrets") or {}).get("api_key") or "")
        if export_data is not None:
            items = parse_weread_export(export_data)
            health = "WeRead export parsed"
        else:
            if not api_key:
                raise UpstreamAuthError("WeRead API key is required when no export JSON is supplied")
            if context["action"] == "test":
                self._gateway(api_key, "/user/notebooks", count=1)
                return ProviderResult(health_message="WeRead API connection healthy")
            items = self._fetch_all(api_key)
            health = "WeRead API import fetched"

        target_ids = set(context.get("target_external_ids") or [])
        if target_ids:
            items = [item for item in items if item.external_id in target_ids]
        timestamps = [item.remote_updated_at for item in items if item.remote_updated_at]
        cursor = {"last_sync_at": max(timestamps)} if timestamps else dict(context.get("cursor") or {})
        return ProviderResult(items=items, next_cursor=cursor, health_message=health)

    # ---- MetadataProvider（read 模式）----
    # 由 runtime.read_many 并发调用；context 内含已解密凭据，插件不接触 session。

    def _metadata_api(self, context):
        from .metadata import WereadMetadataApi

        api_key = str((context.get("secrets") or {}).get("api_key") or "")
        if not api_key:
            raise UpstreamAuthError("WeRead API key is required")
        return WereadMetadataApi(api_key, provider=self)

    def _tag(self, metadata):
        """插件来源的 provider_key 统一为 plugin_key，供详情查询按能力路由回来。"""
        if metadata is not None:
            metadata.provider_key = WEREAD_PLUGIN_KEY
        return metadata

    def search_books(self, query, context):
        query = MetadataQuery.from_value(query)
        return [self._tag(item) for item in self._metadata_api(context).search(query.title or query.isbn)]

    def get_metadata(self, provider_value, context):
        return self._tag(self._metadata_api(context).get_metadata_by_provider(provider_value))

    def get_cover(self, cover_url, context):
        return self._metadata_api(context).get_cover(cover_url)

    def list_annotations(self, context):
        api_key = str((context.get("secrets") or {}).get("api_key") or "")
        if not api_key:
            raise UpstreamAuthError("WeRead API key is required")
        provider_items, next_cursor, has_more = self._fetch_page(api_key, context.get("cursor") or {})
        items = [
            Annotation.from_dict(item.data)
            for item in provider_items
            if item.entity_type == "annotation" and not item.error_code
        ]
        return Page(
            items=items,
            has_more=has_more,
            next_cursor=next_cursor,
            health_message="WeRead annotations fetched",
        )

    def push_annotation(self, item, state, context):
        raise UpstreamError("WeRead does not support writing annotations")

    def execute_feature(self, action, params, context):
        if action not in self.manifest["extra_features"]:
            raise UpstreamError("Unsupported WeRead extra feature")
        api_key = str((context.get("secrets") or {}).get("api_key") or "")
        return self.query(api_key, action, params)

    def query(self, api_key, operation, params=None):
        if not api_key:
            raise UpstreamAuthError("WeRead API key is required")
        api_name, safe_params = validate_weread_query(operation, {} if params is None else params)
        return self._gateway(api_key, api_name, **safe_params)

    def _fetch_all(self, api_key):
        cursor = {}
        items = []
        seen = set()
        while True:
            page_items, next_cursor, has_more = self._fetch_page(api_key, cursor)
            items.extend(page_items)
            if not has_more:
                return items
            marker = json.dumps(next_cursor, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            if not next_cursor or marker in seen:
                raise UpstreamError("WeRead pagination cursor did not advance")
            seen.add(marker)
            cursor = next_cursor

    def _fetch_page(self, api_key, cursor):
        """每次只拉一个 notebook 的一页 review，游标同时覆盖两层分页。"""
        last_sort = cursor.get("last_sort")
        notebook_index = max(0, int(cursor.get("notebook_index", 0)))
        review_synckey = max(0, int(cursor.get("review_synckey", 0)))
        params = {"count": 100}
        if last_sort is not None:
            params["lastSort"] = last_sort
        notebook_page = self._gateway(api_key, "/user/notebooks", **params)
        notebooks = [item for item in _as_list(notebook_page.get("books")) if isinstance(item, dict)]
        while notebook_index < len(notebooks):
            notebook = notebooks[notebook_index]
            book = notebook.get("book") if isinstance(notebook.get("book"), dict) else notebook
            book_id = str(_first(notebook.get("bookId"), book.get("bookId")))
            if book_id:
                break
            notebook_index += 1
            review_synckey = 0
        if notebook_index >= len(notebooks):
            return [], {}, False

        marks = self._gateway(api_key, "/book/bookmarklist", bookId=book_id)
        review_page = self._gateway(
            api_key,
            "/review/list/mine",
            bookid=book_id,
            synckey=review_synckey,
            count=100,
        )
        payload = {
            "book": marks.get("book") or book,
            "chapters": marks.get("chapters") or [],
            # 恢复同一本书的后续 review 页时不重复发出划线。
            "bookmarks": (marks.get("updated") or []) if review_synckey == 0 else [],
            "reviews": _as_list(review_page.get("reviews")),
        }
        items = parse_weread_export([payload])

        next_sync = review_page.get("synckey")
        if review_page.get("hasMore") and next_sync is not None and next_sync != review_synckey:
            return (
                items,
                {
                    "last_sort": last_sort,
                    "notebook_index": notebook_index,
                    "review_synckey": next_sync,
                },
                True,
            )

        if notebook_index + 1 < len(notebooks):
            return (
                items,
                {
                    "last_sort": last_sort,
                    "notebook_index": notebook_index + 1,
                    "review_synckey": 0,
                },
                True,
            )

        next_sort = notebooks[-1].get("sort")
        if notebook_page.get("hasMore") and next_sort is not None and next_sort != last_sort:
            return items, {"last_sort": next_sort, "notebook_index": 0, "review_synckey": 0}, True
        return items, {}, False

    def _gateway(self, api_key, api_name, **params):
        body = {"api_name": api_name, "skill_version": WEREAD_SKILL_VERSION, **params}
        try:
            data = self.http.json(
                "POST",
                self.gateway,
                headers={"Authorization": "Bearer %s" % api_key, "Content-Type": "application/json"},
                json=body,
                timeout=30,
            )
        except OSError as exc:
            # requests 的连接与超时异常继承自 OSError；UpstreamError 系列直接向上传递。
            raise UpstreamError("WeRead gateway request failed") from exc
        if not isinstance(data, dict):
            raise UpstreamError("WeRead gateway returned an invalid response")
        if data.get("upgrade_info"):
            raise UpstreamError(str(data["upgrade_info"].get("message") or "WeRead skill upgrade required"))
        if data.get("errcode") not in (None, 0, "0"):
            message = str(data.get("errmsg") or data.get("message") or "WeRead request rejected")
            if data.get("errcode") in {401, 403, -2010} or "认证" in message or "登录" in message:
                raise UpstreamAuthError(message)
            if data.get("errcode") in {429, -2009} or "频率" in message:
                raise UpstreamRateLimitError(message)
            raise UpstreamError(message)
        return data


PROVIDER = WereadProvider()
