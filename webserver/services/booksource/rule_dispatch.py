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
_KNOWN_ATTRS = (
    _ATTR_TEXT
    | _ATTR_HTML
    | {
        "href",
        "src",
        "title",
        "alt",
        "value",
        "content",
        "data-src",
        "data-original",
    }
)


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
    if key == "textnodes" and isinstance(node, Tag):
        # Legado textNodes：仅直接子文本节点，逐条 trim 后用换行拼接
        parts = [str(c).strip() for c in node.children if isinstance(c, NavigableString)]
        return "\n".join(p for p in parts if p)
    if key == "owntext" and isinstance(node, Tag):
        # Legado ownText：仅直接子文本节点，空白规整为单空格
        parts = [str(c).strip() for c in node.children if isinstance(c, NavigableString)]
        return " ".join(p for p in parts if p)
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


# Legado 索引语法（ElementsSingle 移植）：
#   旧写法  tag.div.0 / tag.div.-1:10:2（`:` 分隔多个独立索引）/ tag.div!0:3（`!` 排除）
#   []写法  tag.div[1,3:5,-1]（区间 start:end:step，支持负数与反向 [-1:0]，[! 开头表示排除）
_INDEX_LEGACY_RE = re.compile(r"^(.+?)([.!])(-?\d+(?::-?\d+)*)$")
_INDEX_BRACKET_RE = re.compile(r"\[(!?)\s*([\d\s:,-]*)\]$")


def _split_index_spec(step):
    """剥离步骤尾部的索引说明，返回 (前置规则, 模式, 索引项列表)。

    模式：'' 无索引、'.' 选择、'!' 排除。索引项为 int 或 (start, end, step) 区间元组。
    """
    s = step.strip()
    m = _INDEX_BRACKET_RE.search(s)
    if m and re.search(r"\d", m.group(2)):
        items = _parse_bracket_items(m.group(2))
        if items is not None:
            return s[: m.start()].strip(), ("!" if m.group(1) else "."), items
    m = _INDEX_LEGACY_RE.match(s)
    if m:
        items = [int(x) for x in m.group(3).split(":")]
        return m.group(1).strip(), m.group(2), items
    return s, "", []


def _parse_bracket_items(content):
    """解析 [] 内的索引项；含非法片段时返回 None（视作 CSS 属性选择器）。"""
    items = []
    for part in content.split(","):
        part = part.strip()
        if not part:
            continue
        bits = part.split(":")
        try:
            if len(bits) == 1:
                items.append(int(bits[0]))
            elif len(bits) <= 3:
                start = int(bits[0]) if bits[0].strip() else None
                end = int(bits[1]) if bits[1].strip() else None
                step = int(bits[2]) if len(bits) == 3 and bits[2].strip() else 1
                items.append((start, end, step))
            else:
                return None
        except ValueError:
            return None
    return items or None


def _expand_indexes(items, length):
    """把索引项展开为去重保序的下标列表（越界裁剪、负数转正、区间可反向）。"""
    out = []
    seen = set()

    def add(i):
        if i not in seen:
            seen.add(i)
            out.append(i)

    for item in items:
        if isinstance(item, int):
            if 0 <= item < length:
                add(item)
            elif item < 0 and length >= -item:
                add(item + length)
            continue
        start, end, step = item
        start = 0 if start is None else (start + length if start < 0 else start)
        end = (length - 1) if end is None else (end + length if end < 0 else end)
        if (start < 0 and end < 0) or (start >= length and end >= length):
            continue
        start = min(max(start, 0), length - 1)
        end = min(max(end, 0), length - 1)
        if start == end or step >= length:
            add(start)
            continue
        step = step if step > 0 else (step + length if -step < length else 1)
        rng = range(start, end + 1, step) if end > start else range(start, end - 1, -step)
        for i in rng:
            add(i)
    return out


def _apply_index_filter(found, mode, items):
    if not items or mode not in (".", "!"):
        return found
    idxs = _expand_indexes(items, len(found))
    if mode == "!":
        excluded = set(idxs)
        return [el for i, el in enumerate(found) if i not in excluded]
    return [found[i] for i in idxs]


def _own_text(tag):
    return " ".join(s for s in (str(c).strip() for c in tag.children if isinstance(c, NavigableString)) if s)


def _resolve_step_nodes(node, before):
    """按 Legado 步骤前置规则取节点列表：children/class/id/tag/text 关键字，否则按 CSS。"""
    if not isinstance(node, Tag):
        return []
    if not before or before == "children":
        return [c for c in node.children if isinstance(c, Tag)]
    head, _, rest = before.partition(".")
    name = rest.split(".")[0].strip() if rest else ""
    if head == "class" and name:
        return node.find_all(class_=name)
    if head == "id" and name:
        return node.find_all(id=name)
    if head == "tag" and name:
        return node.find_all(name)
    if head == "text" and name:
        return [el for el in node.find_all(True) if name in _own_text(el)]
    try:
        return node.select(before)
    except Exception:
        return []


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
        before, mode, items = _split_index_spec(step)
        nxt = []
        for n in current:
            found = _resolve_step_nodes(n, before)
            nxt.extend(_apply_index_filter(found, mode, items))
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
