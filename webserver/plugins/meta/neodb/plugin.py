#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging

from webserver.constants import META_SOURCE_NEODB

from . import api
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
        cover_url = getattr(mi, "cover_url", None)
        if mi and cover_url:
            cover_data = api.get_cover(cover_url)
            if cover_data:
                mi.cover_data = cover_data
        return mi

    def get_cover(self, cover_url):
        return api.get_cover(cover_url)
