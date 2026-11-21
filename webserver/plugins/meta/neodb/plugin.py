#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging


from . import api
from webserver.plugins.meta.base import MetaSourceMixin, meta_manifest
from webserver.plugins.runtime.domains import MetadataQuery

from .api import KEY


class NeodbMetaPlugin:
    """NeoDB 信息源插件 —— 通过 NeoDB 聚合搜索接口查询图书元数据。"""

    PROVIDER_KEY = KEY

    def search(self, title=None, isbn=None, publisher=None):
        query = isbn or title
        if not query:
            return []
        items = api.search(query, max_count=1)
        results = []
        for item in items:
            try:
                mi = api.build_metadata(item, isbn=isbn, copy_image=False)
                results.append(mi)
            except Exception as e:
                logging.warning("NeoDB构建元数据失败: %s", e)
        return results

    def search_best(self, mi):
        query = mi.isbn or mi.title
        if not query:
            return None
        items = api.search(query, max_count=1)
        if not items:
            return None
        try:
            return api.build_metadata(items[0], isbn=getattr(mi, "isbn", None), copy_image=True)
        except Exception:
            logging.error("NeoDB查询 %s 失败", query)
            return None

    def get_metadata_by_provider(self, provider_value, mi=None):
        # 用与搜索时相同的 query（优先 isbn）重新搜索，匹配 provider_value（NeoDB 条目 URL）
        # 对应的条目，构建包含标题/作者/出版社/简介/封面的完整元数据。
        query = (mi.isbn or mi.title) if mi else None
        if query:
            items = api.search(query, max_count=10)
            for item in items:
                if item.get("url") == provider_value:
                    try:
                        return api.build_metadata(item, isbn=getattr(mi, "isbn", None), copy_image=True)
                    except Exception:
                        logging.error("NeoDB获取详情失败，provider_value=%s", provider_value)
                        break
        # 兜底：对已有 cover_url 直接下载封面
        cover_url = getattr(mi, "cover_url", None)
        if mi and cover_url:
            cover_data = api.get_cover(cover_url)
            if cover_data:
                mi.cover_data = cover_data
        return mi

    def get_cover(self, cover_url):
        return api.get_cover(cover_url)


class NeodbProvider(MetaSourceMixin, NeodbMetaPlugin):
    REFERENCE_PREFIX = "neodb:v1:"
    default_enabled = False
    legacy_sources = ("neodb",)
    manifest = meta_manifest(
        "talebook.meta.neodb",
        "NeoDB",
        "从 NeoDB 联邦书目检索书名、作者、出版与评分。",
        "mdi-database-search",
        "https://neodb.social/",
        brand_icon="/images/plugin-icons/neodb.svg",
    )

    def _search(self, query, context):
        records = self.search(title=query.title, isbn=query.isbn, publisher=query.publisher)
        for record in records:
            if record.provider_value:
                reference = [query.isbn, query.title, record.provider_value]
                record.provider_value = self.REFERENCE_PREFIX + json.dumps(reference, ensure_ascii=False)
        return records

    def _fetch(self, external_id, context):
        if not external_id.startswith(self.REFERENCE_PREFIX) or len(external_id) > 8192:
            return None
        try:
            reference = json.loads(external_id.removeprefix(self.REFERENCE_PREFIX))
        except (ValueError, RecursionError):
            return None
        if not isinstance(reference, list) or len(reference) != 3 or not all(isinstance(value, str) for value in reference):
            return None
        isbn, title, url = reference
        query = MetadataQuery(isbn=isbn, title=title)
        if query.is_empty() or not url:
            return None
        record = self.get_metadata_by_provider(url, query)
        if record is not query and record is not None:
            record.provider_value = external_id
            return record
        return None

    def get_cover(self, cover_url, context=None):
        return NeodbMetaPlugin.get_cover(self, cover_url)


PROVIDER = NeodbProvider()
