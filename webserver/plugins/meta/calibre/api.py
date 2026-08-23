#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import re
import threading
import traceback
from urllib.parse import quote_plus, urljoin

import requests
from lxml import etree, html

from webserver.constants import CHROME_HEADERS, META_SOURCE_GOOGLE, META_SOURCE_AMAZON
from webserver.i18n import _

KEY = "Calibre"

# 用户选择的信息源 key → Calibre 插件名称
_SOURCE_TO_PLUGIN = {
    "google": "Google",
    "amazon": "Amazon.com",
}
_SOURCE_LABELS = {
    "google": "Google Books",
    "amazon": "Amazon",
}
_PLUGIN_INIT_LOCK = threading.Lock()


class CalibreMetadataSourceUnavailable(RuntimeError):
    """Raised when a configured Calibre metadata source is absent from the registry."""

    def __init__(self, sources, reason=None):
        self.sources = tuple(sorted(set(sources)))
        message = "Calibre 元数据插件不可用：%s" % ", ".join(self.sources)
        if reason:
            message = "%s（%s）" % (message, reason)
        super().__init__(message)


def _enabled_metadata_plugin_names():
    from calibre.customize.ui import metadata_plugins

    return frozenset(plugin.name for plugin in metadata_plugins({"identify"}))


def ensure_calibre_metadata_plugins():
    """Register bundled Google/Amazon sources omitted by Calibre's slim standalone set."""

    expected = frozenset(_SOURCE_TO_PLUGIN.values())
    with _PLUGIN_INIT_LOCK:
        registered = _enabled_metadata_plugin_names()
        if expected <= registered:
            return registered

        missing = expected - registered
        try:
            from calibre.customize import ui
            from calibre.ebooks.metadata.sources.amazon import Amazon
            from calibre.ebooks.metadata.sources.google import GoogleBooks

            plugin_classes = (GoogleBooks, Amazon)
            builtin_names = {plugin.name for plugin in ui.builtin_plugins}
            ui.builtin_plugins.extend(plugin for plugin in plugin_classes if plugin.name not in builtin_names)
            ui.builtin_names = frozenset(plugin.name for plugin in ui.builtin_plugins)
            ui.initialize_plugins()
        except Exception as e:
            logging.error("Calibre 元数据插件注册失败，缺失来源=%s：%s", ", ".join(sorted(missing)), e)
            raise CalibreMetadataSourceUnavailable(missing, str(e)) from e

        registered = _enabled_metadata_plugin_names()
        missing = expected - registered
        if missing:
            logging.error("Calibre 元数据插件注册后仍不可用，缺失来源=%s", ", ".join(sorted(missing)))
            raise CalibreMetadataSourceUnavailable(missing)

        logging.info("Calibre 元数据插件已注册：%s", ", ".join(sorted(expected)))
        return registered


class CalibreMetadataApi:
    """使用 Calibre 内置的 Google Books 和 Amazon.com 插件查询书籍元数据"""

    ALLOWED_PLUGINS = frozenset({"Google", "Amazon.com"})
    _patched = False

    @classmethod
    def _ensure_patched(cls):
        registered = ensure_calibre_metadata_plugins()
        if not cls._patched:
            try:
                from calibre.ebooks.metadata.sources.update import patch_plugins

                patch_plugins()
                cls._patched = True
            except Exception as e:
                logging.warning("calibre patch_plugins 失败：%s", e)
        return registered

    @staticmethod
    def _make_log_abort():
        from io import BytesIO
        from threading import Event
        from calibre.ebooks.metadata.sources.base import create_log

        return create_log(BytesIO()), Event()

    @classmethod
    def _get_amazon_plugin(cls):
        from calibre.customize.ui import metadata_plugins

        amazon_plugin = None
        for plugin in metadata_plugins({"identify"}):
            if plugin.name == "Amazon.com":
                amazon_plugin = plugin
                break
        return amazon_plugin

    @classmethod
    def _identify(cls, timeout=30, source=None, **kwargs):
        from calibre.ebooks.metadata.sources.identify import identify

        registered = cls._ensure_patched()
        if source not in registered:
            error = CalibreMetadataSourceUnavailable({source})
            logging.error("%s", error)
            raise error
        log, abort = cls._make_log_abort()
        return identify(log, abort, allowed_plugins={source}, timeout=timeout, **kwargs)

    @staticmethod
    def _amazon_authors(row, fallback):
        byline = " ".join(
            value.strip()
            for value in row.xpath('.//*[@data-cy="title-recipe"]//div[contains(@class,"a-color-secondary")]//text()')
            if value.strip()
        )
        parts = [part.strip() for part in byline.split("|") if part.strip()]
        for part in parts:
            part = re.sub(r"^(?:by|作者)\s*", "", part, flags=re.IGNORECASE).strip()
            if part and not re.search(r"(?:版本|出版|edition|paperback|hardcover|kindle)", part, re.IGNORECASE):
                return [part]
        return list(fallback or [])

    @classmethod
    def _search_amazon_catalog(cls, title, authors, timeout, limit):
        """Search Amazon's public books catalog without Calibre's obsolete scraper shim."""

        from calibre.ebooks.metadata.book.base import Metadata

        query = " ".join([title] + list(authors or [])[:1]).strip()
        if not query:
            return []
        headers = dict(CHROME_HEADERS)
        headers["Accept-Language"] = "zh-CN,zh;q=0.9,en;q=0.8"
        response = requests.get(
            "https://www.amazon.com/s?k=%s&i=stripbooks" % quote_plus(query),
            headers=headers,
            timeout=timeout,
        )
        response.raise_for_status()
        raw = response.content
        if isinstance(raw, bytes):
            raw = raw.decode(response.encoding or "utf-8", "replace")
        root = html.fromstring(raw)
        results = []
        for row in root.xpath('//*[@data-component-type="s-search-result"]'):
            asin = str(row.get("data-asin") or "").strip()
            result_title = " ".join(row.xpath('.//*[@data-cy="title-recipe"]//h2//text()')).strip()
            if not asin or not result_title:
                continue
            result = Metadata(result_title, cls._amazon_authors(row, authors))
            result.set_identifier("amazon", asin)
            cover_urls = row.xpath('.//*[@data-component-type="s-product-image"]//img/@src')
            result.cover_url = cover_urls[0] if cover_urls else ""
            links = row.xpath('.//*[@data-cy="title-recipe"]//a[.//h2]/@href')
            result.website = urljoin("https://www.amazon.com", links[0]) if links else ""
            results.append(result)
            if len(results) >= limit:
                break
        return results

    @classmethod
    def _search_google_books(cls, title, authors, isbn, timeout, limit):
        """Search the public Google Books API with an ISBN-to-title fallback."""

        from calibre.ebooks.metadata.book.base import Metadata

        queries = []
        if isbn:
            queries.append("isbn:%s" % isbn)
        if title:
            terms = ['intitle:"%s"' % title]
            if authors:
                terms.append('inauthor:"%s"' % authors[0])
            queries.append(" ".join(terms))
        results = []
        per_query_timeout = max(1, int(timeout) // max(1, len(queries)))
        api_unavailable = False
        for query in queries:
            try:
                response = requests.get(
                    "https://www.googleapis.com/books/v1/volumes",
                    params={"q": query, "maxResults": min(limit, 40), "printType": "books"},
                    headers=CHROME_HEADERS,
                    timeout=per_query_timeout,
                )
                response.raise_for_status()
                payload = response.json()
            except requests.RequestException as exc:
                logging.warning("Google Books JSON API 不可用，尝试兼容接口：%s", exc)
                api_unavailable = True
                break
            for item in payload.get("items") or []:
                info = item.get("volumeInfo") or {}
                result_title = str(info.get("title") or "").strip()
                if not result_title:
                    continue
                result = Metadata(result_title, list(info.get("authors") or authors or []))
                google_id = str(item.get("id") or "").strip()
                if google_id:
                    result.set_identifier("google", google_id)
                identifiers = {
                    value.get("type"): value.get("identifier")
                    for value in info.get("industryIdentifiers") or []
                    if value.get("type") and value.get("identifier")
                }
                result.isbn = identifiers.get("ISBN_13") or identifiers.get("ISBN_10") or ""
                result.publisher = str(info.get("publisher") or "")
                result.comments = str(info.get("description") or "")
                image_links = info.get("imageLinks") or {}
                result.cover_url = str(image_links.get("thumbnail") or image_links.get("smallThumbnail") or "").replace(
                    "http://", "https://", 1
                )
                result.website = str(info.get("infoLink") or "")
                results.append(result)
                if len(results) >= limit:
                    break
            if results:
                break
        if results or not api_unavailable:
            return results
        return cls._search_google_feed(queries, authors, timeout, limit)

    @classmethod
    def _search_google_feed(cls, queries, authors, timeout, limit):
        from calibre.ebooks.metadata.book.base import Metadata

        atom = "http://www.w3.org/2005/Atom"
        dc = "http://purl.org/dc/terms"
        namespaces = {"atom": atom, "dc": dc}
        per_query_timeout = max(1, int(timeout) // max(1, len(queries)))
        for query in queries:
            response = None
            for _attempt in range(2):
                response = requests.get(
                    "https://books.google.com/books/feeds/volumes",
                    params={
                        "q": query.replace(" ", "+").replace('"', ""),
                        "max-results": limit,
                        "start-index": 1,
                        "min-viewability": "none",
                    },
                    headers=CHROME_HEADERS,
                    timeout=per_query_timeout,
                )
                if response.status_code < 500:
                    break
            response.raise_for_status()
            root = etree.fromstring(response.content)
            results = []
            for entry in root.xpath("atom:entry", namespaces=namespaces):
                result_title = str(entry.xpath("string(atom:title)", namespaces=namespaces) or "").strip()
                if not result_title:
                    continue
                creators = [value.strip() for value in entry.xpath("dc:creator/text()", namespaces=namespaces) if value.strip()]
                result = Metadata(result_title, creators or list(authors or []))
                entry_id = str(entry.xpath("string(atom:id)", namespaces=namespaces) or "").rstrip("/").rsplit("/", 1)[-1]
                if entry_id:
                    result.set_identifier("google", entry_id)
                identifiers = [
                    str(value).partition(":")[2]
                    for value in entry.xpath("dc:identifier/text()", namespaces=namespaces)
                    if str(value).startswith("ISBN:")
                ]
                result.isbn = next((value for value in identifiers if len(value) == 13), identifiers[0] if identifiers else "")
                result.publisher = str(entry.xpath("string(dc:publisher)", namespaces=namespaces) or "")
                result.comments = str(entry.xpath("string(dc:description)", namespaces=namespaces) or "")
                links = entry.xpath('atom:link[@rel="alternate"]/@href', namespaces=namespaces)
                result.website = str(links[0]).replace("http://", "https://", 1) if links else ""
                results.append(result)
                if len(results) >= limit:
                    break
            if results:
                return results
        return []

    @classmethod
    def get_cover(cls, cover_url):
        if not cover_url:
            return None
        if not cover_url.lower().startswith("https://"):
            logging.error("Invalid cover url: %s", cover_url)
            return None
        headers = dict(CHROME_HEADERS)
        headers["Referer"] = cover_url
        response = requests.get(cover_url, headers=headers, verify=False, timeout=20)
        if response.status_code != 200:
            logging.error("Get cover fail, status_code[%s] != 200 OK", response.status_code)
            return None
        img = response.content
        return ("jpg", img)

    @classmethod
    def search(cls, source, title="", authors=None, isbn="", timeout=25, limit=5):
        """Query one configured Calibre source and return at most ``limit`` candidates."""

        if source not in _SOURCE_TO_PLUGIN:
            raise CalibreMetadataSourceUnavailable({source}, "未知来源")

        title = str(title or "").strip()
        authors = [authors] if isinstance(authors, str) else list(authors or [])
        isbn = str(isbn or "").strip()
        if isbn:
            from calibre.ebooks.metadata import check_isbn

            isbn = check_isbn(isbn) or ""
        limit = max(0, int(limit))
        if not limit or not title and not isbn:
            return []

        if source == META_SOURCE_AMAZON:
            results = cls._search_amazon_catalog(title, authors, timeout, limit)
        else:
            results = cls._search_google_books(title, authors, isbn, timeout, limit)

        amazon_plugin = cls._get_amazon_plugin() if source == META_SOURCE_AMAZON else None
        normalized = []
        for result in results[:limit]:
            result.provider_key = KEY
            result.provider_value = source
            result.source = _SOURCE_LABELS[source]
            result.author_sort = result.authors[0] if result.authors else ""
            result.rating = int(result.rating) * 2 if result.rating is not None else 0
            if amazon_plugin and amazon_plugin.cached_cover_url_is_reliable:
                cached_cover_url = amazon_plugin.get_cached_cover_url(result.identifiers)
                if cached_cover_url:
                    result.cover_url = cached_cover_url
            normalized.append(result)
        return normalized

    @classmethod
    def get_book_by_isbn(cls, isbn, sources=None, timeout=30):
        """按 ISBN 查询书籍信息，成功时返回含封面的 Metadata 对象，否则返回 None"""
        if not sources or META_SOURCE_GOOGLE not in sources:
            return None
        try:
            return cls.search(META_SOURCE_GOOGLE, isbn=isbn, timeout=timeout, limit=1) or None
        except CalibreMetadataSourceUnavailable:
            raise
        except Exception as e:
            logging.error(_("CalibreMetadataApi ISBN 查询失败 isbn=%s: %s"), isbn, e)
            logging.error(traceback.format_exc())
            return None

    @classmethod
    def get_book_by_title(cls, title, authors=None, sources=None, timeout=30):
        """按书名（及可选作者）查询书籍信息，成功时返回含封面的 Metadata 对象，否则返回 None"""
        enabled = [source for source in (sources or []) if source in _SOURCE_TO_PLUGIN]
        if not enabled:
            return None
        try:
            results = []
            per_source_timeout = max(1, int(timeout) // len(enabled))
            for source in enabled:
                results.extend(
                    cls.search(
                        source,
                        title=title,
                        authors=authors,
                        timeout=per_source_timeout,
                        limit=5,
                    )
                )
            return results or None
        except CalibreMetadataSourceUnavailable:
            raise
        except Exception as e:
            logging.error(_("CalibreMetadataApi 书名查询失败 title=%s: %s"), title, e)
            return None
