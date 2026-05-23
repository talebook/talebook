#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""Legado 书源 JSON 的包装与类型化访问。

只关心文本类书源（bookSourceType == 0）。规则字段统一以原始字符串/字典返回，
由 AnalyzeRule / AnalyzeUrl 负责解释。
"""


def _get(d, *keys, default=None):
    """从 dict 中按多个候选键取第一个非空值。"""
    if not isinstance(d, dict):
        return default
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return d[k]
    return default


class RuleGroup:
    """一组字段规则（如 ruleSearch / ruleBookInfo / ruleToc / ruleContent）。"""

    def __init__(self, data):
        self._data = data if isinstance(data, dict) else {}

    def get(self, *keys, default=""):
        return _get(self._data, *keys, default=default)

    def __bool__(self):
        return bool(self._data)


class BookSource:
    """包装一份已解析的 Legado 书源 JSON。"""

    def __init__(self, raw):
        if not isinstance(raw, dict):
            raise ValueError("book source raw must be a dict")
        self.raw = raw

    # ---- 顶层字段 ----
    @property
    def book_source_url(self):
        return _get(self.raw, "bookSourceUrl", default="") or ""

    @property
    def book_source_name(self):
        return _get(self.raw, "bookSourceName", default="") or ""

    @property
    def book_source_group(self):
        return _get(self.raw, "bookSourceGroup", default="") or ""

    @property
    def book_source_type(self):
        try:
            return int(_get(self.raw, "bookSourceType", default=0) or 0)
        except (ValueError, TypeError):
            return 0

    @property
    def enabled(self):
        return bool(_get(self.raw, "enabled", default=True))

    @property
    def enabled_explore(self):
        return bool(_get(self.raw, "enabledExplore", default=True))

    @property
    def weight(self):
        try:
            return int(_get(self.raw, "weight", default=0) or 0)
        except (ValueError, TypeError):
            return 0

    @property
    def header(self):
        return _get(self.raw, "header", default=None)

    @property
    def search_url(self):
        return _get(self.raw, "searchUrl", default="") or ""

    @property
    def explore_url(self):
        return _get(self.raw, "exploreUrl", default="") or ""

    # ---- 规则组 ----
    @property
    def rule_search(self):
        return RuleGroup(_get(self.raw, "ruleSearch", default={}))

    @property
    def rule_book_info(self):
        return RuleGroup(_get(self.raw, "ruleBookInfo", default={}))

    @property
    def rule_toc(self):
        return RuleGroup(_get(self.raw, "ruleToc", default={}))

    @property
    def rule_content(self):
        return RuleGroup(_get(self.raw, "ruleContent", default={}))

    def is_text_source(self):
        return self.book_source_type == 0

    def summary(self):
        return {
            "name": self.book_source_name,
            "url": self.book_source_url,
            "group": self.book_source_group,
            "type": self.book_source_type,
        }
