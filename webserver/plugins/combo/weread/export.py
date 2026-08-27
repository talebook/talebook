import datetime
import hashlib
import json

from webserver.plugins.runtime.protocol import ProviderItem, UpstreamError


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
        raise UpstreamError("WeRead export must be a JSON object or array")
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
