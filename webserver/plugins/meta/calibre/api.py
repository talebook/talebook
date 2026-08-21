#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import threading
import traceback

import requests

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

        plugin_name = _SOURCE_TO_PLUGIN.get(source)
        if not plugin_name:
            raise CalibreMetadataSourceUnavailable({source}, "未知来源")

        title = str(title or "").strip()
        authors = [authors] if isinstance(authors, str) else list(authors or [])
        isbn = str(isbn or "").strip()
        isbn_digits = "".join(char for char in isbn.upper() if char.isdigit() or char == "X")
        isbn = isbn if len(isbn_digits) in {10, 13} and len(set(isbn_digits)) > 1 else ""
        limit = max(0, int(limit))
        if not limit or not title and not isbn:
            return []

        queries = []
        if source == META_SOURCE_GOOGLE and isbn:
            queries.append({"identifiers": {"isbn": isbn}})
        if title:
            query = {"title": title}
            if authors:
                query["authors"] = authors
            queries.append(query)
        elif isbn:
            queries.append({"identifiers": {"isbn": isbn}})

        per_query_timeout = max(1, int(timeout) // max(1, len(queries)))
        results = []
        for query in queries:
            results = cls._identify(source=plugin_name, timeout=per_query_timeout, **query) or []
            if results:
                break

        amazon_plugin = cls._get_amazon_plugin() if source == META_SOURCE_AMAZON else None
        normalized = []
        for result in results[:limit]:
            result.provider_key = KEY
            result.provider_value = source
            result.source = _SOURCE_LABELS[source]
            result.author_sort = result.authors[0] if result.authors else ""
            result.rating = int(result.rating) * 2 if result.rating is not None else 0
            if amazon_plugin and amazon_plugin.cached_cover_url_is_reliable:
                result.cover_url = amazon_plugin.get_cached_cover_url(result.identifiers)
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
