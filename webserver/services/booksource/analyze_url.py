#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""AnalyzeUrl：把 Legado url 规则串解析为一次 HTTP 请求并执行。

url 规则形如：
    https://host/search?key={{key}}&page={{page}}
    https://host/search,{"method":"POST","body":"k={{key}}","charset":"gbk"}
    /relative?q={{key}}           # 相对路径，自动 urljoin(baseUrl)

支持变量：{{key}}/{{searchKey}}、{{page}}/{{searchPage}}、{{baseUrl}}、@get:{name}。
支持受限 `@js:` URL 生成；遇到 `<js>`、`java.ajax` 等外部副作用规则抛 JsRuleUnsupported。
"""

import json
import logging
from urllib.parse import urljoin

from .exceptions import JsRuleUnsupported, SourceHttpError
from .http_client import build_session, decode_response
from .js_runtime import run_js


_JS_MARKERS = ("@js:", "<js>", "{{js.", "{{java")

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

        rule = self.raw_rule
        if rule.startswith("@js:"):
            rule = self._eval_url_js(rule[4:])
        elif _has_js(rule):
            raise JsRuleUnsupported(self.raw_rule)

        url_part, self.options = self._split_options(rule)
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
        """O(n) 手写线性扫描替换 `{{...}}` 与 `@get:{...}`。

        不使用 re.sub，避免攻击者构造的 `@get:{@get:{...|...` 这类输入触发
        CodeQL py/polynomial-redos 担心的多项式回溯。
        """
        if not text:
            return text
        out = []
        i = 0
        n = len(text)
        while i < n:
            ch = text[i]
            if ch == "{" and i + 1 < n and text[i + 1] == "{":
                end = text.find("}}", i + 2)
                if end != -1:
                    expr = text[i + 2 : end].strip()
                    if expr and "{" not in expr and "}" not in expr:
                        if expr.lower().startswith(("js.", "java")):
                            raise JsRuleUnsupported(expr)
                        out.append(str(self._lookup(expr)))
                        i = end + 2
                        continue
            elif ch == "@" and text.startswith("@get:{", i):
                end = text.find("}", i + 6)
                if end != -1:
                    name = text[i + 6 : end].strip()
                    out.append(str(self.variables.get(name, "")))
                    i = end + 1
                    continue
            out.append(ch)
            i += 1
        return "".join(out)

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

    def _eval_url_js(self, code):
        if _has_unsupported_js(code):
            raise JsRuleUnsupported(self.raw_rule)
        code = self._substitute(code)
        return run_js(code, variables=self.variables, base_url=self.base_url)

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


def _has_unsupported_js(rule):
    low = rule.lower()
    return "<js>" in low or "{{js." in low or "{{java" in low or "java.ajax" in low or "java.post" in low
