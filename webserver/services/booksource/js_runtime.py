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
        function __talebook_md5(value) {
            var text = unescape(encodeURIComponent(String(value)));
            var bytes = [];
            for (var bi = 0; bi < text.length; bi++) bytes.push(text.charCodeAt(bi));
            var bitLength = bytes.length * 8;
            bytes.push(128);
            while ((bytes.length % 64) !== 56) bytes.push(0);
            for (var li = 0; li < 8; li++) bytes.push(Math.floor(bitLength / Math.pow(256, li)) & 255);
            var shifts = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
                          5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
                          4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
                          6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
            var constants = [];
            for (var ci = 0; ci < 64; ci++) constants[ci] = (Math.floor(Math.abs(Math.sin(ci + 1)) * 4294967296) | 0);
            function add(x, y) { return (x + y) | 0; }
            function rotate(x, count) { return (x << count) | (x >>> (32 - count)); }
            var state = [1732584193, -271733879, -1732584194, 271733878];
            for (var offset = 0; offset < bytes.length; offset += 64) {
                var words = [];
                for (var wi = 0; wi < 16; wi++) {
                    var pos = offset + wi * 4;
                    words[wi] = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
                }
                var a = state[0], b = state[1], c = state[2], d = state[3];
                for (var i = 0; i < 64; i++) {
                    var f, g;
                    if (i < 16) { f = (b & c) | ((~b) & d); g = i; }
                    else if (i < 32) { f = (d & b) | ((~d) & c); g = (5 * i + 1) % 16; }
                    else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; }
                    else { f = c ^ (b | (~d)); g = (7 * i) % 16; }
                    var previousD = d;
                    d = c;
                    c = b;
                    b = add(b, rotate(add(add(a, f), add(constants[i], words[g])), shifts[i]));
                    a = previousD;
                }
                state[0] = add(state[0], a);
                state[1] = add(state[1], b);
                state[2] = add(state[2], c);
                state[3] = add(state[3], d);
            }
            var hex = "";
            for (var si = 0; si < 4; si++) {
                for (var sj = 0; sj < 4; sj++) hex += ((state[si] >>> (sj * 8)) & 255).toString(16).padStart(2, "0");
            }
            return hex;
        }
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
            encodeURI: function(value) { return encodeURIComponent(String(value)); },
            md5Encode: function(value) { return __talebook_md5(value); }
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
