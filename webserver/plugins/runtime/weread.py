import datetime
import hashlib
import json
import urllib.error
import urllib.request

from .protocol import (
    PROTOCOL_VERSION,
    ProviderAuthError,
    ProviderError,
    ProviderItem,
    ProviderRateLimitError,
    ProviderResult,
)


WEREAD_PLUGIN_KEY = "talebook.annotations.weread"
WEREAD_GATEWAY = "https://i.weread.qq.com/api/agent/gateway"
WEREAD_SKILL_VERSION = "1.0.4"


def _as_list(value):
    return value if isinstance(value, list) else []


def _first(*values):
    for value in values:
        if value not in (None, ""):
            return value
    return ""


def _timestamp(value):
    try:
        parsed = datetime.datetime.fromtimestamp(float(value), tz=datetime.timezone.utc)
    except (TypeError, ValueError, OSError):
        return None
    return parsed.isoformat().replace("+00:00", "Z")


def _stable_id(kind, book_id, raw):
    source_id = _first(raw.get("bookmarkId"), raw.get("reviewId"), raw.get("id"))
    if not source_id:
        fingerprint = json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        source_id = hashlib.sha256(fingerprint.encode("utf-8")).hexdigest()[:24]
    return "weread:%s:%s:%s" % (book_id or "unknown", kind, source_id)


def _book_payload(value):
    value = value if isinstance(value, dict) else {}
    identifiers = value.get("identifiers") if isinstance(value.get("identifiers"), dict) else {}
    book = {
        "provider_id": str(_first(value.get("bookId"), value.get("bookid"), value.get("id"))),
        "isbn": str(_first(value.get("isbn"), value.get("ISBN"), identifiers.get("isbn"))),
        "title": str(_first(value.get("title"), value.get("bookName"), value.get("name"))),
        "author": str(_first(value.get("author"), value.get("authorName"))),
    }
    if not book["provider_id"]:
        identity = "\0".join((book["isbn"], book["title"], book["author"]))
        book["provider_id"] = "meta:" + hashlib.sha256(identity.encode("utf-8")).hexdigest()[:24]
    return book


def _chapter_map(payload):
    chapters = []
    for key in ("chapters", "chapterInfos", "chapterList"):
        chapters.extend(_as_list(payload.get(key)))
    result = {}
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        uid = _first(chapter.get("chapterUid"), chapter.get("uid"), chapter.get("chapterIdx"))
        if uid != "":
            result[str(uid)] = str(_first(chapter.get("title"), chapter.get("chapterName")))
    return result


def _review_value(value):
    if not isinstance(value, dict):
        return {}
    nested = value.get("review")
    return nested if isinstance(nested, dict) else value


def parse_weread_export(payload):
    """Normalize official single-book or batch export payloads into provider items."""

    if isinstance(payload, list):
        books = payload
    elif not isinstance(payload, dict):
        raise ProviderError("WeRead export must be a JSON object or array")
    elif isinstance(payload.get("books"), list):
        books = payload["books"]
    elif isinstance(payload.get("data"), list):
        books = payload["data"]
    else:
        books = [payload]

    items = []
    for entry in books:
        if not isinstance(entry, dict):
            continue
        book = _book_payload(entry.get("book") or entry.get("bookInfo") or entry)
        book_id = book["provider_id"]
        chapters = _chapter_map(entry)
        bookmark_payload = entry.get("bookmarklist") if isinstance(entry.get("bookmarklist"), dict) else entry
        chapters.update(_chapter_map(bookmark_payload))
        bookmarks = _as_list(_first(entry.get("bookmarks"), entry.get("updated"), bookmark_payload.get("updated")))
        reviews = _as_list(entry.get("reviews"))
        if isinstance(entry.get("reviewList"), dict):
            reviews.extend(_as_list(entry["reviewList"].get("reviews")))

        for raw in bookmarks:
            if not isinstance(raw, dict) or raw.get("type") == 0 or not str(raw.get("markText") or "").strip():
                continue
            chapter_uid = _first(raw.get("chapterUid"), raw.get("chapterIdx"))
            external_id = _stable_id("bookmark", book_id, raw)
            updated_at = _timestamp(_first(raw.get("updateTime"), raw.get("createTime")))
            items.append(
                ProviderItem(
                    external_id=external_id,
                    entity_type="annotation",
                    remote_updated_at=updated_at,
                    data={
                        "source_book_id": book_id,
                        "book": book,
                        "annotation_type": "highlight",
                        "chapter": str(_first(raw.get("chapterName"), chapters.get(str(chapter_uid)))),
                        "quote_text": str(raw.get("markText") or ""),
                        "content": "",
                        "color": str(raw.get("colorStyle") or ""),
                        "user_modified_at": updated_at,
                        "source_position": "chapterUid=%s;range=%s" % (chapter_uid, str(raw.get("range") or "")),
                    },
                )
            )

        for wrapped in reviews:
            raw = _review_value(wrapped)
            if not raw:
                continue
            content = str(raw.get("content") or "").strip()
            quote = str(raw.get("abstract") or "").strip()
            if not content and not quote:
                continue
            chapter_uid = _first(raw.get("chapterUid"), raw.get("chapterIdx"))
            chapter = str(_first(raw.get("chapterName"), chapters.get(str(chapter_uid))))
            annotation_type = "note" if quote or not chapter else "chapter_comment"
            if not quote and not chapter:
                chapter = "整本书评"
            external_id = _stable_id("review", book_id, raw)
            updated_at = _timestamp(_first(raw.get("updateTime"), raw.get("createTime")))
            items.append(
                ProviderItem(
                    external_id=external_id,
                    entity_type="annotation",
                    remote_updated_at=updated_at,
                    data={
                        "source_book_id": book_id,
                        "book": book,
                        "annotation_type": annotation_type,
                        "chapter": chapter,
                        "quote_text": quote,
                        "content": content,
                        "color": "",
                        "rating": raw.get("star") if raw.get("star") not in (None, -1) else None,
                        "user_modified_at": updated_at,
                        "source_position": "chapterUid=%s;range=%s" % (chapter_uid, str(raw.get("range") or "")),
                    },
                )
            )
    return list({item.external_id: item for item in items}.values())


class WereadProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": WEREAD_PLUGIN_KEY,
        "name": "微信读书笔记",
        "version": "1.0.0",
        "categories": ["annotations", "reviews"],
        "capabilities": ["annotations.import", "reviews.import"],
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
        "permissions": ["books.read", "annotations.write"],
        "data_policy": {"stores_full_text": True, "retention": "user_controlled"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/Tencent/WeChatReading",
        "license": "GPL-3.0",
        "description": "从官方 API Key 或导出 JSON 导入个人划线、想法和书评。",
        "ui": {"manage_kind": "weread"},
    }

    def __init__(self, gateway=WEREAD_GATEWAY, opener=None):
        self.gateway = gateway
        self.opener = opener or urllib.request.urlopen

    def execute(self, context):
        input_data = context.get("input_data") or {}
        export_data = input_data.get("export")
        api_key = str((context.get("secrets") or {}).get("api_key") or "")
        if export_data is not None:
            items = parse_weread_export(export_data)
            health = "WeRead export parsed"
        else:
            if not api_key:
                raise ProviderAuthError("WeRead API key is required when no export JSON is supplied")
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

    def _fetch_all(self, api_key):
        notebooks = []
        last_sort = None
        seen_sorts = set()
        while True:
            params = {"count": 100}
            if last_sort is not None:
                params["lastSort"] = last_sort
            page = self._gateway(api_key, "/user/notebooks", **params)
            notebooks.extend(_as_list(page.get("books")))
            if not page.get("hasMore") or not notebooks:
                break
            last_sort = notebooks[-1].get("sort")
            if last_sort in seen_sorts or last_sort is None:
                break
            seen_sorts.add(last_sort)

        payloads = []
        for notebook in notebooks:
            if not isinstance(notebook, dict):
                continue
            book = notebook.get("book") if isinstance(notebook.get("book"), dict) else notebook
            book_id = str(_first(notebook.get("bookId"), book.get("bookId")))
            if not book_id:
                continue
            marks = self._gateway(api_key, "/book/bookmarklist", bookId=book_id)
            reviews = []
            synckey = 0
            seen_sync = set()
            while True:
                page = self._gateway(api_key, "/review/list/mine", bookid=book_id, synckey=synckey, count=100)
                reviews.extend(_as_list(page.get("reviews")))
                if not page.get("hasMore"):
                    break
                next_sync = page.get("synckey")
                if next_sync in seen_sync or next_sync is None:
                    break
                seen_sync.add(next_sync)
                synckey = next_sync
            payloads.append(
                {
                    "book": marks.get("book") or book,
                    "chapters": marks.get("chapters") or [],
                    "bookmarks": marks.get("updated") or [],
                    "reviews": reviews,
                }
            )
        return parse_weread_export(payloads)

    def _gateway(self, api_key, api_name, **params):
        body = {"api_name": api_name, "skill_version": WEREAD_SKILL_VERSION, **params}
        request = urllib.request.Request(
            self.gateway,
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"Authorization": "Bearer %s" % api_key, "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with self.opener(request, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code in {401, 403}:
                raise ProviderAuthError("WeRead credential rejected") from exc
            if exc.code == 429:
                retry_after = exc.headers.get("Retry-After") if exc.headers else None
                raise ProviderRateLimitError("WeRead rate limit exceeded", retry_after=retry_after) from exc
            raise ProviderError("WeRead gateway HTTP %s" % exc.code) from exc
        except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
            raise ProviderError("WeRead gateway request failed") from exc
        if not isinstance(data, dict):
            raise ProviderError("WeRead gateway returned an invalid response")
        if data.get("upgrade_info"):
            raise ProviderError(str(data["upgrade_info"].get("message") or "WeRead skill upgrade required"))
        if data.get("errcode") not in (None, 0, "0"):
            message = str(data.get("errmsg") or data.get("message") or "WeRead request rejected")
            if data.get("errcode") in {401, 403, -2010} or "认证" in message or "登录" in message:
                raise ProviderAuthError(message)
            if data.get("errcode") in {429, -2009} or "频率" in message:
                raise ProviderRateLimitError(message)
            raise ProviderError(message)
        return data
