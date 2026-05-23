#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""规则后端：把单条简单规则作用到 HTML 节点 / JSON 对象上。

支持的规则类型（按前缀识别）：
  - CSS:      @css:selector@attr   或 Legado jsoup 风格 class./id./tag.
  - XPath:    @xpath:expr 或以 // 、/ 开头
  - JSONPath: @json:expr 或以 $. 、$[ 开头；doc 为 JSON 时默认走 JSONPath

不处理组合符（&& || %%）与正则（##），那些由 AnalyzeRule 负责。
"""

import logging
import re

import soupsieve
from bs4 import BeautifulSoup, NavigableString, Tag


_ATTR_TEXT = {"text", "textnodes", "owntext"}
_ATTR_HTML = {"html", "outerhtml", "innerhtml", "all"}
# 可识别为"取当前节点属性"的关键字
_KNOWN_ATTRS = _ATTR_TEXT | _ATTR_HTML | {
    "href",
    "src",
    "title",
    "alt",
    "value",
    "content",
    "data-src",
    "data-original",
}


def is_json_doc(doc):
    return isinstance(doc, (dict, list))


def to_soup(html):
    if isinstance(html, (Tag, BeautifulSoup)):
        return html
    return BeautifulSoup(html or "", "html.parser")


# --------------------------------------------------------------------------
# 属性提取
# --------------------------------------------------------------------------
def extract_attr(node, attr):
    if node is None:
        return ""
    if isinstance(node, NavigableString):
        return str(node)
    if not attr:
        # 默认取文本
        return node.get_text("\n", strip=True) if isinstance(node, Tag) else str(node)
    key = attr.lower()
    if key in _ATTR_TEXT:
        return node.get_text("\n", strip=True) if isinstance(node, Tag) else str(node)
    if key in _ATTR_HTML:
        return node.decode_contents() if isinstance(node, Tag) else str(node)
    if isinstance(node, Tag):
        val = node.get(attr)
        if val is None:
            return ""
        if isinstance(val, (list, tuple)):
            return " ".join(val)
        return str(val)
    return str(node)


# --------------------------------------------------------------------------
# CSS / Legado jsoup
# --------------------------------------------------------------------------
def _split_css_attr(rule):
    """把 `selector@attr` 拆成 (selector, attr)。CSS 选择器本身不含 @。"""
    if "@" in rule:
        idx = rule.rfind("@")
        return rule[:idx], rule[idx + 1 :]
    return rule, ""


def _legado_step_to_css(step):
    """把单个 Legado 步骤转换为 (css, index)。

    支持 class.NAME[.idx] / id.NAME / tag.NAME[.idx] / 纯标签名。
    """
    index = None
    m = re.match(r"^(class|id|tag|text|children)\.(.+)$", step)
    if m:
        kind, rest = m.group(1), m.group(2)
        parts = rest.rsplit(".", 1)
        if len(parts) == 2 and re.match(r"^-?\d+$", parts[1]):
            rest, index = parts[0], int(parts[1])
        if kind == "class":
            return "." + rest.strip(), index
        if kind == "id":
            return "#" + rest.strip(), index
        if kind == "tag":
            return rest.strip(), index
        if kind == "children":
            return "> *", index
        # text 当作标签处理
        return rest.strip(), index
    # 末尾可能是 .N 索引
    m = re.match(r"^(.*)\.(-?\d+)$", step)
    if m and m.group(1):
        return m.group(1).strip(), int(m.group(2))
    return step.strip(), None


def _is_attr_token(token):
    key = token.lower()
    if key in _KNOWN_ATTRS:
        return True
    return bool(re.match(r"^data-[\w-]+$", key))


def css_select(node, rule, include_self=False):
    """返回匹配的节点列表（不做属性提取）。

    include_self=True 时，若当前节点本身匹配选择器也会被纳入（用于字段提取，
    因为列表规则常常已经选中了目标节点本身）。
    """
    soup = to_soup(node)
    selector, _attr = _split_css_attr(rule)
    selector = selector.strip()
    if not selector:
        return [soup]
    try:
        matches = soup.select(selector)
    except Exception as err:
        logging.debug("booksource: css select failed (%s): %s", selector, err)
        return []
    if include_self and not matches and isinstance(soup, Tag):
        try:
            if soupsieve.match(selector, soup):
                return [soup]
        except Exception:
            pass
    return matches


def legado_select(node, rule):
    """Legado jsoup 风格的节点选择，返回 (节点列表, 属性名)。"""
    soup = to_soup(node)
    steps = [s for s in rule.split("@") if s != ""]
    if not steps:
        return [soup], ""

    attr = ""
    # 最后一步若是已知属性关键字（text/html/href/src...），视作属性提取
    last = steps[-1]
    if "." not in last and _is_attr_token(last):
        attr = last
        steps = steps[:-1]

    current = [soup]
    for step in steps:
        css, index = _legado_step_to_css(step)
        nxt = []
        for n in current:
            if not isinstance(n, Tag):
                continue
            try:
                found = n.select(css) if css else [n]
            except Exception:
                found = []
            if index is not None and found:
                try:
                    found = [found[index]]
                except IndexError:
                    found = []
            nxt.extend(found)
        current = nxt
        if not current:
            break
    return current, attr


# --------------------------------------------------------------------------
# XPath (lxml)
# --------------------------------------------------------------------------
def xpath_select(node, expr):
    """对节点执行 XPath，返回结果列表（lxml 元素或字符串）。"""
    from lxml import html as lxml_html

    if isinstance(node, (Tag, BeautifulSoup)):
        html_str = str(node)
    elif isinstance(node, str):
        html_str = node
    else:
        html_str = str(node)
    try:
        tree = lxml_html.fromstring(html_str)
    except Exception as err:
        logging.debug("booksource: lxml parse failed: %s", err)
        return []
    try:
        return tree.xpath(expr)
    except Exception as err:
        logging.debug("booksource: xpath failed (%s): %s", expr, err)
        return []


def xpath_to_strings(results):
    out = []
    from lxml import etree

    for r in results:
        if isinstance(r, str):
            out.append(r)
        elif isinstance(r, etree._Element):
            out.append(r.text_content() if hasattr(r, "text_content") else (r.text or ""))
        else:
            out.append(str(r))
    return out


# --------------------------------------------------------------------------
# JSONPath
# --------------------------------------------------------------------------
def jsonpath_select(obj, expr):
    from jsonpath_ng.ext import parse as jsonpath_parse

    expr = expr.strip()
    if not expr.startswith("$"):
        expr = "$." + expr
    try:
        matches = jsonpath_parse(expr).find(obj)
    except Exception as err:
        logging.debug("booksource: jsonpath failed (%s): %s", expr, err)
        return []
    return [m.value for m in matches]
