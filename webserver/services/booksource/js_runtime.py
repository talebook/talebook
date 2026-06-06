#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""受限的书源 JS 运行时。

只用于字段后处理类规则（如 `result.replace(...)`）。不提供 java.ajax / 浏览器
等外部副作用能力，避免书源 JS 越权访问服务端环境。
"""

import json
from urllib.parse import urlparse

import quickjs

from .exceptions import JsRuleUnsupported


DEFAULT_TIME_LIMIT = 0.2
DEFAULT_MEMORY_LIMIT = 8 * 1024 * 1024
DEFAULT_STACK_SIZE = 512 * 1024


def run_js(code, result="", variables=None, base_url="", time_limit=DEFAULT_TIME_LIMIT):
    variables = variables if variables is not None else {}
    code = (code or "").strip()
    if not code:
        return result

    ctx = quickjs.Context()
    ctx.set_time_limit(time_limit)
    ctx.set_memory_limit(DEFAULT_MEMORY_LIMIT)
    ctx.set_max_stack_size(DEFAULT_STACK_SIZE)

    ctx.set("__talebook_vars_json", json.dumps(variables, ensure_ascii=False))
    ctx.set("result", result)
    ctx.set("baseUrl", base_url or "")
    ctx.set("key", variables.get("key", ""))
    ctx.set("page", variables.get("page", ""))
    ctx.set("searchKey", variables.get("key", ""))
    ctx.set("searchPage", variables.get("page", ""))

    origin = ""
    parsed = urlparse(base_url or "")
    if parsed.scheme and parsed.netloc:
        origin = "%s://%s" % (parsed.scheme, parsed.netloc)
    ctx.set("__talebook_origin", origin)
    ctx.eval(
        """
        var __talebook_vars = JSON.parse(__talebook_vars_json || "{}");
        var java = Object.freeze({
            get: function(key) { return __talebook_vars[String(key)] || ""; },
            put: function(key, value) { __talebook_vars[String(key)] = value == null ? "" : String(value); return value; },
            getString: function() { throw new Error("java.getString is not supported"); },
            ajax: function() { throw new Error("java.ajax is not supported"); },
            post: function() { throw new Error("java.post is not supported"); },
            startBrowserAwait: function() { throw new Error("java.startBrowserAwait is not supported"); },
            longToast: function() { return ""; },
            log: function() { return ""; },
            t2s: function(value) { return value == null ? "" : String(value); },
            s2t: function(value) { return value == null ? "" : String(value); },
            encodeURI: function(value) { return encodeURIComponent(String(value)); }
        });
        var book = Object.freeze({
            origin: __talebook_origin,
            name: "",
            author: ""
        });
        """
    )

    try:
        value = ctx.eval(code)
        if value is None:
            value = ctx.get("result")
        variables.update(json.loads(ctx.eval("JSON.stringify(__talebook_vars)")))
    except Exception as err:
        raise JsRuleUnsupported("%s (%s)" % (code[:120], err))
    return _stringify_js_value(value)


def _stringify_js_value(value):
    if value is None:
        return ""
    if isinstance(value, quickjs.Object):
        try:
            return value.json()
        except Exception:
            return str(value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return str(value)
