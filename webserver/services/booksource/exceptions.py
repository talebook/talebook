#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源引擎异常定义。"""


class BookSourceError(Exception):
    """书源相关错误基类。"""


class JsRuleUnsupported(BookSourceError):
    """规则中包含暂不支持的 JS（@js: / <js>...</js> / {{java...}}）。"""

    def __init__(self, rule=""):
        super().__init__("JS rule is not supported: %s" % (rule or ""))
        self.rule = rule


class RuleParseError(BookSourceError):
    """规则解析失败。"""


class SourceHttpError(BookSourceError):
    """书源 HTTP 请求失败。"""
