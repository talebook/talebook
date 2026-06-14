#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
# @author: PoxenStudio, 2026-06

import logging

from webserver.i18n import _
from webserver.constants import META_SOURCE_DOUBAN_V2

from . import api
from .api import KEY


class DoubanV2MetaPlugin:
    """豆瓣(V2)信息源插件 —— 仅使用 subject_search 接口，不发二次详情请求。"""

    PROVIDER_KEY = KEY

    def search(self, title=None, isbn=None, publisher=None):
        query = isbn or title
        if not query:
            return []
        items, search_url = api.search(query, max_count=1)
        results = []
        for item in items:
            try:
                mi = api.build_metadata(item, search_url, isbn=isbn, copy_image=False)
                results.append(mi)
            except Exception as e:
                logging.warning("豆瓣V2构建元数据失败: %s", e)
        return results

    def search_best(self, mi):
        query = mi.isbn or mi.title
        if not query:
            return None
        items, search_url = api.search(query)
        if not items:
            return None
        # 优先取标题完全匹配的，否则取首个结果
        best = next((i for i in items if i.get("title") == mi.title), items[0])
        try:
            return api.build_metadata(best, search_url, isbn=getattr(mi, "isbn", None), copy_image=True)
        except Exception:
            logging.error(_("豆瓣V2查询 %s 失败"), query)
            return None

    def get_metadata_by_provider(self, provider_value, mi=None):
        # 按标题重新搜索，找到 provider_value 匹配的条目后下载封面
        title = mi.title if mi else None
        if not title:
            return mi
        items, search_url = api.search(title)
        for item in items:
            if str(item.get("id")) == str(provider_value):
                try:
                    return api.build_metadata(
                        item, search_url,
                        isbn=getattr(mi, "isbn", None),
                        copy_image=True,
                    )
                except Exception:
                    logging.error("豆瓣V2获取详情失败，provider_value=%s", provider_value)
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

    def search_physical_by_isbn(self, isbn):
        """按 ISBN 精确查询实体书信息（用于 BookSearch.find_physical_book_by_isbn 兜底链）"""
        if not isbn:
            return None
        items, search_url = api.search(isbn, max_count=1)
        if not items:
            return None
        try:
            return api.build_metadata(items[0], search_url, isbn=isbn, copy_image=True)
        except Exception:
            logging.error("豆瓣V2 ISBN查询 %s 失败", isbn)
            return None
