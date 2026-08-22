"""Search one user-visible metadata plugin without changing global source settings."""

import re

from webserver.plugins.meta import baike, calibre, douban, douban_v2, neodb, qimao, tomato, xhsd
from webserver.services.booksource.metadata import BookSourceMetadataService, collect_metadata_sources


METADATA_PLUGIN_SOURCES = frozenset(
    {"douban", "douban_v2", "baidu", "google", "amazon", "xinhua", "tomato", "qimao", "neodb", "booksource"}
)
RESULT_LIMIT = 5


def search_metadata_plugin(session, settings, source, keyword):
    """Return at most five normalized candidates from exactly one source."""
    source = str(source or "").strip()
    keyword = re.sub(r"\s+", " ", str(keyword or "")).strip()
    if source not in METADATA_PLUGIN_SOURCES:
        raise ValueError("unknown metadata source")
    if not keyword:
        raise ValueError("keyword is required")

    if source == "douban":
        api = douban.DoubanBookApi(
            settings.get("douban_apikey", ""),
            settings.get("douban_baseurl", ""),
            copy_image=False,
            manual_select=False,
            maxCount=min(RESULT_LIMIT, int(settings.get("douban_max_count", RESULT_LIMIT))),
        )
        books = [api._metadata(item) for item in (api.search_books(keyword) or [])]
    elif source == "douban_v2":
        books = douban_v2.DoubanV2MetaPlugin().search(title=keyword, isbn="", publisher="") or []
    elif source == "baidu":
        book = baike.BaiduBaikeApi(copy_image=False).get_book(keyword, None)
        books = [book] if book else []
    elif source in {"google", "amazon"}:
        books = calibre.CalibreMetadataApi.search(source, title=keyword, limit=RESULT_LIMIT)
    elif source == "xinhua":
        book = xhsd.XhsdBookApi(copy_image=False).get_book(keyword)
        books = [book] if book else []
    elif source == "tomato":
        book = tomato.TomatoNovelApi(copy_image=False).get_book(keyword, None)
        books = [book] if book else []
    elif source == "qimao":
        book = qimao.QimaoNovelApi(copy_image=False).get_book(keyword, None)
        books = [book] if book else []
    elif source == "neodb":
        books = neodb.NeodbMetaPlugin().search(title=keyword, isbn="", publisher="") or []
    else:
        sources = collect_metadata_sources(session, settings.get("BOOKSOURCE_METADATA_TOP_K", 10))
        result = BookSourceMetadataService(
            sources,
            settings.get("cookie_secret", "talebook"),
            config=settings,
        ).search(keyword)
        books = result.books

    return [item for item in (_normalize_book(book) for book in books[:RESULT_LIMIT]) if item]


def _normalize_book(book):
    if isinstance(book, dict):
        value = dict(book)
        authors = value.get("authors") or ([value.get("author")] if value.get("author") else [])
    elif hasattr(book, "title"):
        authors = list(getattr(book, "authors", None) or [])
        value = {
            "title": getattr(book, "title", ""),
            "author": getattr(book, "author", "") or (authors[0] if authors else ""),
            "publisher": getattr(book, "publisher", ""),
            "isbn": getattr(book, "isbn", ""),
            "comments": getattr(book, "comments", ""),
            "cover_url": getattr(book, "cover_url", ""),
            "source": getattr(book, "source", ""),
            "website": getattr(book, "website", ""),
        }
    else:
        return None
    if not value.get("title"):
        return None
    return {
        "title": value.get("title", ""),
        "author": value.get("author") or (authors[0] if authors else ""),
        "publisher": value.get("publisher", ""),
        "isbn": value.get("isbn", ""),
        "comments": value.get("comments", ""),
        "cover_url": value.get("cover_url", ""),
        "source": value.get("source", ""),
        "website": value.get("website", ""),
    }
