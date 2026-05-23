#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""AnalyzeUrl：把 Legado url 规则串解析为一次 HTTP 请求并执行。

url 规则形如：
    https://host/search?key={{key}}&page={{page}}
    https://host/search,{"method":"POST","body":"k={{key}}","charset":"gbk"}
    /relative?q={{key}}           # 相对路径，自动 urljoin(baseUrl)

支持变量：{{key}}/{{searchKey}}、{{page}}/{{searchPage}}、{{baseUrl}}、@get:{name}。
遇到 JS（@js: / <js> / {{js.* / {{java*）抛 JsRuleUnsupported。
"""

import json
import logging
import re
from urllib.parse import urljoin

from .exceptions import JsRuleUnsupported, SourceHttpError
from .http_client import build_session, decode_response


_JS_MARKERS = ("@js:", "<js>", "{{js.", "{{java")
_TEMPLATE_RE = re.compile(r"\{\{(.+?)\}\}")
_GET_RE = re.compile(r"@get:\{([^}]+)\}")

DEFAULT_TIMEOUT = 20


class AnalyzeResponse:
    def __init__(self, text, url, headers=None):
        self.text = text
        self.url = url
        self.headers = headers or {}


class AnalyzeUrl:
    def __init__(self, rule, base_url="", variables=None, source=None, session=None, timeout=DEFAULT_TIMEOUT):
        self.raw_rule = (rule or "").strip()
        self.base_url = base_url or (source.book_source_url if source else "")
        self.variables = dict(variables or {})
        self.source = source
        self.session = session or build_session(source)
        self.timeout = timeout

        if _has_js(self.raw_rule):
            raise JsRuleUnsupported(self.raw_rule)

        url_part, self.options = self._split_options(self.raw_rule)
        self.url = self._build_url(url_part)

    # ------------------------------------------------------------------
    def _split_options(self, rule):
        """拆分 `url,{...json...}`，返回 (url, options_dict)。"""
        idx = rule.find(",{")
        while idx != -1:
            candidate = rule[idx + 1 :].strip()
            try:
                opts = json.loads(candidate)
                if isinstance(opts, dict):
                    return rule[:idx].strip(), opts
            except ValueError:
                pass
            idx = rule.find(",{", idx + 1)
        return rule, {}

    def _substitute(self, text):
        def repl(m):
            expr = m.group(1).strip()
            if expr.lower().startswith(("js.", "java")):
                raise JsRuleUnsupported(expr)
            return str(self._lookup(expr))

        text = _TEMPLATE_RE.sub(repl, text)
        text = _GET_RE.sub(lambda m: str(self.variables.get(m.group(1).strip(), "")), text)
        return text

    def _lookup(self, name):
        aliases = {"searchKey": "key", "searchPage": "page"}
        name = aliases.get(name, name)
        if name == "baseUrl":
            return self.base_url
        return self.variables.get(name, "")

    def _build_url(self, url_part):
        url = self._substitute(url_part).strip()
        if self.base_url and not url.lower().startswith(("http://", "https://")):
            url = urljoin(self.base_url, url)
        return url

    # ------------------------------------------------------------------
    def fetch(self):
        method = str(self.options.get("method", "GET")).upper()
        charset = self.options.get("charset")
        headers = {}
        opt_headers = self.options.get("headers")
        if isinstance(opt_headers, dict):
            headers.update({str(k): str(v) for k, v in opt_headers.items()})

        try:
            if method == "POST":
                body = self._substitute(str(self.options.get("body", "")))
                data = body.encode(charset) if charset else body.encode("utf-8")
                resp = self.session.post(self.url, data=data, headers=headers, timeout=self.timeout)
            else:
                resp = self.session.get(self.url, headers=headers, timeout=self.timeout)
        except Exception as err:
            logging.info("booksource: http error for %s: %s", self.url, err)
            raise SourceHttpError(str(err))

        text = decode_response(resp, declared_charset=charset)
        return AnalyzeResponse(text=text, url=str(resp.url), headers=dict(resp.headers))


def _has_js(rule):
    low = rule.lower()
    return any(m in low for m in _JS_MARKERS)
