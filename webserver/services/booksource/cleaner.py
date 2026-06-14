#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""正文去广告。

两层清理：
  1. 书源自带的 ruleContent.replaceRegex（Legado 换行分隔的 `pattern##replacement`）。
  2. 全局广告黑名单正则（来自配置 BOOKSOURCE_AD_PATTERNS）。
"""

import logging
import re


_ZERO_WIDTH = re.compile(r"[​‌‍﻿]")
_MULTI_BLANK_LINES = re.compile(r"\n{3,}")
_compiled_cache = {}


def _compile(pattern):
    if pattern not in _compiled_cache:
        try:
            _compiled_cache[pattern] = re.compile(pattern)
        except re.error as err:
            logging.debug("booksource: bad ad regex %r: %s", pattern, err)
            _compiled_cache[pattern] = None
    return _compiled_cache[pattern]


def parse_replace_regex(replace_regex):
    """解析书源 replaceRegex 字段为 [(pattern, replacement), ...]。

    Legado 语法：多条规则以换行分隔，每条 `pattern##replacement`（replacement 可空）。
    若整体以 ## 开头亦兼容。
    """
    rules = []
    if not replace_regex:
        return rules
    for line in str(replace_regex).splitlines():
        line = line.strip()
        if not line:
            continue
        if line.startswith("##"):
            line = line[2:]
        parts = line.split("##")
        pattern = parts[0]
        replacement = parts[1] if len(parts) > 1 else ""
        if pattern:
            rules.append((pattern, replacement))
    return rules


def apply_replace_regex(text, replace_regex):
    for pattern, replacement in parse_replace_regex(replace_regex):
        compiled = _compile(pattern)
        if compiled is None:
            continue
        try:
            text = compiled.sub(replacement, text)
        except re.error:
            continue
    return text


def apply_blacklist(text, patterns):
    """按行剔除命中全局黑名单的内容。"""
    if not patterns:
        return text
    compiled = [_compile(p) for p in patterns]
    compiled = [c for c in compiled if c is not None]
    if not compiled:
        return text
    kept = []
    for line in text.split("\n"):
        if any(c.search(line) for c in compiled):
            continue
        kept.append(line)
    return "\n".join(kept)


def normalize_whitespace(text):
    text = _ZERO_WIDTH.sub("", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = "\n".join(line.strip() for line in text.split("\n"))
    text = _MULTI_BLANK_LINES.sub("\n\n", text)
    return text.strip()


def clean(text, source_replace_regex="", blacklist=None, enabled=True):
    """清理正文文本。enabled=False 时只做基础空白规整。"""
    if not text:
        return ""
    if enabled:
        text = apply_replace_regex(text, source_replace_regex)
        text = apply_blacklist(text, blacklist or [])
    return normalize_whitespace(text)
