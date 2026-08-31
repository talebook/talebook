#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import threading
import traceback

import requests

from webserver.constants import CHROME_HEADERS, META_SOURCE_AMAZON, META_SOURCE_EDELWEISS, META_SOURCE_GOOGLE
from webserver.i18n import _
from webserver.plugins.meta.base import MetaSourceMixin, meta_manifest

KEY = "Calibre"

# 用户选择的信息源 key → Calibre 插件名称
_SOURCE_TO_PLUGIN = {
    META_SOURCE_GOOGLE: "Google",
    META_SOURCE_AMAZON: "Amazon.com",
    META_SOURCE_EDELWEISS: "Edelweiss",
}
_BUNDLED_PLUGIN_NAMES = frozenset(
    {
        "Google",
        "Amazon.com",
        "Edelweiss",
        "Big Book Search",
        "Google Images",
        "Open Library",
    }
)
_PLUGIN_INIT_LOCK = threading.Lock()
_IDENTIFY_LOCK = threading.Lock()
IDENTIFY_WAIT_AFTER_FIRST_RESULT = 2


class CalibreMetadataSourceUnavailable(RuntimeError):
    """Raised when a configured Calibre metadata source is absent from the registry."""

    def __init__(self, sources, reason=None):
        self.sources = tuple(sorted(set(sources)))
        message = "Calibre 元数据插件不可用：%s" % ", ".join(self.sources)
        if reason:
            message = "%s（%s）" % (message, reason)
        super().__init__(message)


def _enabled_metadata_plugin_names(capabilities=None):
    from calibre.customize.ui import metadata_plugins

    return frozenset(plugin.name for plugin in metadata_plugins(capabilities or {"identify", "cover"}))


def ensure_calibre_metadata_plugins():
    """Register Calibre's bundled identify and cover sources in the slim runtime."""

    expected = _BUNDLED_PLUGIN_NAMES
    with _PLUGIN_INIT_LOCK:
        registered = _enabled_metadata_plugin_names()
        if expected <= registered:
            return registered

        missing = expected - registered
        try:
            from calibre.customize import ui
            from calibre.ebooks.metadata.sources.amazon import Amazon
            from calibre.ebooks.metadata.sources.big_book_search import BigBookSearch
            from calibre.ebooks.metadata.sources.edelweiss import Edelweiss
            from calibre.ebooks.metadata.sources.google import GoogleBooks
            from calibre.ebooks.metadata.sources.google_images import GoogleImages
            from calibre.ebooks.metadata.sources.openlibrary import OpenLibrary

            plugin_classes = (GoogleBooks, Amazon, Edelweiss, BigBookSearch, GoogleImages, OpenLibrary)
            builtin_names = {plugin.name for plugin in ui.builtin_plugins}
            ui.builtin_plugins.extend(plugin for plugin in plugin_classes if plugin.name not in builtin_names)
            ui.builtin_names = frozenset(plugin.name for plugin in ui.builtin_plugins)
            ui.initialize_plugins()
            # Calibre 默认停用了 Edelweiss、Big Book Search 和 Google Images。
            # Talebook 不暴露第二套子来源开关；管理员启用 Calibre 元数据插件时，
            # 其内置来源应使用同一个生命周期，因此在这里显式启用这些来源。
            for plugin_name in expected.intersection(ui.default_disabled_plugins):
                ui.enable_plugin(plugin_name)
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
    """使用 Calibre 内置的 Google、Amazon.com 和 Edelweiss 查询书籍元数据。"""

    ALLOWED_PLUGINS = frozenset(_SOURCE_TO_PLUGIN.values())
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
    def _queries(cls, sources):
        return [(plugin_name, source_name) for source_name, plugin_name in _SOURCE_TO_PLUGIN.items() if source_name in sources]

    @classmethod
    def _normalize_results(cls, results, source_name, provider_value, amazon_plugin=None):
        normalized = []
        for result in results:
            result.provider_key = result.source = source_name
            result.provider_value = result.isbn if result.isbn else provider_value
            result.author_sort = result.authors[0] if result.authors else ""
            # Calibre identify 插件的评分是 0-5，转换为 Talebook 使用的 0-10。
            result.rating = int(result.rating) * 2 if result.rating is not None else 0
            if source_name == META_SOURCE_AMAZON and amazon_plugin and amazon_plugin.cached_cover_url_is_reliable:
                result.cover_url = amazon_plugin.get_cached_cover_url(result.identifiers)
            normalized.append(result)
        return normalized

    @staticmethod
    def _dedupe_results(results):
        deduped = []
        seen = set()
        for result in results:
            key = (result.title, tuple(result.authors or ()), result.isbn or "")
            if key in seen:
                continue
            seen.add(key)
            deduped.append(result)
        return deduped[:5]

    @classmethod
    def _identify(cls, timeout=30, source=None, **kwargs):
        from calibre.ebooks.metadata.sources.identify import identify
        from calibre.ebooks.metadata.sources.prefs import msprefs

        registered = cls._ensure_patched()
        if source not in registered:
            error = CalibreMetadataSourceUnavailable({source})
            logging.error("%s", error)
            raise error
        log, abort = cls._make_log_abort()
        # Calibre 默认在首条结果后继续等待 30 秒；Talebook 的外层元数据任务也
        # 只有 30 秒，因此明明已经取得 Google 结果，仍会被外层判为超时。
        # 这里做进程内、加锁且不落盘的临时覆盖，结束后恢复用户原值。
        with _IDENTIFY_LOCK:
            previous_wait = msprefs["wait_after_first_identify_result"]
            previous_no_commit = msprefs.no_commit
            msprefs.no_commit = True
            msprefs["wait_after_first_identify_result"] = min(
                float(previous_wait),
                IDENTIFY_WAIT_AFTER_FIRST_RESULT,
            )
            try:
                return identify(log, abort, allowed_plugins={source}, timeout=timeout, **kwargs)
            finally:
                msprefs["wait_after_first_identify_result"] = previous_wait
                msprefs.no_commit = previous_no_commit

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
    def get_book_by_isbn(cls, isbn, sources=None, timeout=30):
        """按 ISBN 查询所有已启用的 Calibre identify 来源。"""
        if not sources:
            return None

        if not isbn:
            return None
        output = []
        amazon_plugin = cls._get_amazon_plugin()
        queries = cls._queries(sources)
        source_timeout = max(2, float(timeout) / len(queries)) if queries else timeout
        for plugin_name, source_name in queries:
            try:
                results = (
                    cls._identify(
                        identifiers={"isbn": isbn},
                        timeout=source_timeout,
                        source=plugin_name,
                    )
                    or []
                )
            except CalibreMetadataSourceUnavailable:
                raise
            except Exception as e:
                logging.error(_("CalibreMetadataApi ISBN 查询失败 source=%s isbn=%s: %s"), source_name, isbn, e)
                logging.error(traceback.format_exc())
                continue
            output.extend(cls._normalize_results(results, source_name, isbn, amazon_plugin))
        return cls._dedupe_results(output)

    @classmethod
    def get_book_by_title(cls, title, authors=None, sources=None, timeout=30):
        """按书名（及可选作者）查询书籍信息，成功时返回含封面的 Metadata 对象，否则返回 None"""
        if not sources:
            return None

        if not title:
            return None
        kwargs = {"title": title}
        if authors:
            kwargs["authors"] = authors if isinstance(authors, list) else [authors]
        output = []
        amazon_plugin = cls._get_amazon_plugin()
        queries = cls._queries(sources)
        source_timeout = max(2, float(timeout) / len(queries)) if queries else timeout
        for plugin_name, source_name in queries:
            try:
                results = cls._identify(timeout=source_timeout, source=plugin_name, **kwargs) or []
            except CalibreMetadataSourceUnavailable:
                raise
            except Exception as e:
                logging.error(_("CalibreMetadataApi 书名查询失败 source=%s title=%s: %s"), source_name, title, e)
                continue
            output.extend(cls._normalize_results(results, source_name, title, amazon_plugin))

        return cls._dedupe_results(output)


class CalibreProvider(MetaSourceMixin):
    """启用插件即默认查询 Calibre 内置的三个书籍信息来源。"""

    legacy_sources = (META_SOURCE_GOOGLE, META_SOURCE_AMAZON)

    manifest = meta_manifest(
        "talebook.meta.calibre",
        "Calibre 元数据",
        "书籍信息检索默认启用 Google Books（Google）、Amazon.com 与 Edelweiss；"
        "Calibre 运行时同时启用 Big Book Search、Google Images 与 Open Library 封面来源。",
        "mdi-google",
        "https://calibre-ebook.com/",
        brand_icon="/images/plugin-icons/calibre.svg",
    )

    def _sources(self, context):
        return [META_SOURCE_GOOGLE, META_SOURCE_AMAZON, META_SOURCE_EDELWEISS]

    def _search(self, query, context):
        sources = self._sources(context)
        if not sources:
            return []
        results = []
        if query.isbn:
            results = CalibreMetadataApi.get_book_by_isbn(query.isbn, sources=sources) or []
        if not results and query.title:
            results = CalibreMetadataApi.get_book_by_title(query.title, authors=list(query.authors), sources=sources) or []
        return list(results)

    def _fetch(self, external_id, context):
        sources = self._sources(context)
        records = CalibreMetadataApi.get_book_by_isbn(external_id, sources=sources) or []
        if not records:
            records = CalibreMetadataApi.get_book_by_title(external_id, sources=sources) or []
        return records[0] if records else None

    def get_cover(self, cover_url, context=None):
        return CalibreMetadataApi.get_cover(cover_url)


PROVIDER = CalibreProvider()
