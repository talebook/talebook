#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""AnalyzeRule：把一条规则串作用到 HTML/JSON 文档上。

支持的非 JS 子集：
  - 后端：CSS(@css:)、Legado jsoup(class./id./tag.)、XPath(//、@xpath:)、JSONPath($. 、@json:)
  - 组合符：`||`(取首个非空)、`&&`(拼接)、`%%`(交错，主要用于列表)
  - 变量：`@put:{key:rule}`、`@get:{key}`
  - 模板：含 `{{子规则}}` 的字符串按模板拼接
  - 尾部正则：`rule##pattern##replacement`（replacement 可空表示删除）

遇到 JS 规则（@js: / <js>）抛 JsRuleUnsupported，由调用方决定跳过。
"""

import re

from . import rule_dispatch as rd
from .exceptions import JsRuleUnsupported


_JS_MARKERS = ("@js:", "<js>", "{{js.", "{{java")
_GET_RE = re.compile(r"@get:\{([^}]+)\}")
_PUT_RE = re.compile(r"@put:\{([^:]+):(.+)\}$")
_TEMPLATE_RE = re.compile(r"\{\{(.+?)\}\}")


def _has_js(rule):
    low = rule.lower()
    return any(m in low for m in _JS_MARKERS)


def _split_top(rule, sep):
    """按分隔符切分（简单实现，不处理括号嵌套）。"""
    return rule.split(sep)


class AnalyzeRule:
    def __init__(self, doc, variables=None, base_url=""):
        self.doc = doc
        self.variables = variables if variables is not None else {}
        self.base_url = base_url

    def child(self, node):
        return AnalyzeRule(node, self.variables, self.base_url)

    # ------------------------------------------------------------------
    # 字符串规则
    # ------------------------------------------------------------------
    def get_string(self, rule):
        if rule is None:
            return ""
        rule = str(rule).strip()
        if not rule:
            return ""
        if _has_js(rule):
            raise JsRuleUnsupported(rule)

        # @put / @get
        put = _PUT_RE.match(rule)
        if put:
            key, inner = put.group(1).strip(), put.group(2).strip()
            self.variables[key] = self.get_string(inner)
            return ""
        if rule.startswith("@get:"):
            m = _GET_RE.match(rule)
            if m:
                return str(self.variables.get(m.group(1).strip(), ""))

        # 模板：包含字面文本 + {{子规则}}
        if "{{" in rule and "}}" in rule:
            return self._eval_template(rule)

        # 尾部正则
        main, pattern, replacement = self._split_regex(rule)

        value = self._eval_string_alts(main)
        if pattern is not None:
            try:
                value = re.sub(pattern, replacement, value)
            except re.error:
                pass
        return value.strip()

    def _eval_template(self, rule):
        def repl(m):
            inner = m.group(1).strip()
            if inner in ("", "page", "baseUrl", "key", "searchKey", "searchPage"):
                return str(self.variables.get(inner, ""))
            return self.get_string(inner)

        # 先替换 {{}}，剩余字面文本保留
        return _TEMPLATE_RE.sub(repl, rule).strip()

    def _split_regex(self, rule):
        """拆出尾部 `##pattern##replacement`。"""
        if "##" not in rule:
            return rule, None, None
        main, _, spec = rule.partition("##")
        pattern, _, replacement = spec.partition("##")
        return main, pattern, replacement

    def _eval_string_alts(self, rule):
        for alt in _split_top(rule, "||"):
            alt = alt.strip()
            if not alt:
                continue
            parts = [self._eval_simple_string(p.strip()) for p in _split_top(alt, "&&") if p.strip()]
            joined = "\n".join(p for p in parts if p)
            if joined:
                return joined
        return ""

    def _eval_simple_string(self, rule):
        if not rule:
            return ""
        if _has_js(rule):
            raise JsRuleUnsupported(rule)
        if rule.startswith("@get:"):
            m = _GET_RE.match(rule)
            if m:
                return str(self.variables.get(m.group(1).strip(), ""))

        if rd.is_json_doc(self.doc) and not rule.startswith(("@css:", "@xpath:", "//")):
            expr = rule[len("@json:") :] if rule.startswith("@json:") else rule
            values = rd.jsonpath_select(self.doc, expr)
            return _stringify(values)

        if rule.startswith("@json:") or rule.startswith("$"):
            expr = rule[len("@json:") :] if rule.startswith("@json:") else rule
            return _stringify(rd.jsonpath_select(self.doc, expr))

        if rule.startswith("@xpath:") or rule.startswith("//") or rule.startswith("/"):
            expr = rule[len("@xpath:") :] if rule.startswith("@xpath:") else rule
            results = rd.xpath_select(self.doc, expr)
            return "\n".join(s for s in rd.xpath_to_strings(results) if s).strip()

        if rule.startswith("@css:"):
            sel, attr = rd._split_css_attr(rule[len("@css:") :])
            nodes = rd.css_select(self.doc, sel, include_self=True)
            return "\n".join(rd.extract_attr(n, attr) for n in nodes if n is not None).strip()

        # Legado jsoup 默认
        nodes, attr = rd.legado_select(self.doc, rule)
        return "\n".join(rd.extract_attr(n, attr) for n in nodes if n is not None).strip()

    # ------------------------------------------------------------------
    # 列表规则（bookList / chapterList）
    # ------------------------------------------------------------------
    def get_elements(self, rule):
        if not rule:
            return []
        rule = str(rule).strip()
        if _has_js(rule):
            raise JsRuleUnsupported(rule)

        # || 取首个非空；%% 交错；&& 拼接
        for alt in _split_top(rule, "||"):
            alt = alt.strip()
            if not alt:
                continue
            if "%%" in alt:
                groups = [self._elements_concat(p.strip()) for p in _split_top(alt, "%%")]
                result = _interleave(groups)
            else:
                result = self._elements_concat(alt)
            if result:
                return result
        return []

    def _elements_concat(self, rule):
        out = []
        for part in _split_top(rule, "&&"):
            part = part.strip()
            if part:
                out.extend(self._eval_simple_elements(part))
        return out

    def _eval_simple_elements(self, rule):
        if rd.is_json_doc(self.doc) or rule.startswith("@json:") or rule.startswith("$"):
            expr = rule[len("@json:") :] if rule.startswith("@json:") else rule
            values = rd.jsonpath_select(self.doc, expr)
            flat = []
            for v in values:
                if isinstance(v, list):
                    flat.extend(v)
                else:
                    flat.append(v)
            return flat

        if rule.startswith("@xpath:") or rule.startswith("//") or rule.startswith("/"):
            expr = rule[len("@xpath:") :] if rule.startswith("@xpath:") else rule
            return rd.xpath_select(self.doc, expr)

        if rule.startswith("@css:"):
            sel, _attr = rd._split_css_attr(rule[len("@css:") :])
            return rd.css_select(self.doc, sel)

        nodes, _attr = rd.legado_select(self.doc, rule)
        return nodes


def _stringify(values):
    out = []
    for v in values:
        if v is None:
            continue
        if isinstance(v, (list, tuple)):
            out.append(" ".join(str(x) for x in v))
        else:
            out.append(str(v))
    return "\n".join(s for s in out if s).strip()


def _interleave(groups):
    out = []
    if not groups:
        return out
    for items in zip(*groups, strict=False):
        out.extend(items)
    return out
