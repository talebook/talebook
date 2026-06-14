#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
#
# 豆瓣(V2) 元数据搜索 API
#
# 使用 subject_search 接口，仅依赖搜索结果中的字段，不发二次详情请求。
# 可选：get_book_detail(url) 额外抓取书籍页面，提取作者、ISBN 和 div.intro 简介。
# 搜索结果 abstract 格式：作者 / 出版社 / 出版日期 / 定价（" / " 分隔）。
# @author: PoxenStudio, 2026-06

import datetime
import json
import logging
import re
import urllib.parse
from pathlib import Path
from urllib.parse import urlparse

import requests
from html.parser import HTMLParser

KEY = "douban_v2"

_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36")

_SEARCH_HEADERS = {
    "User-Agent": _UA,
    "Referer": "https://book.douban.com/",
    "Accept": ("text/html,application/xhtml+xml,application/xml;q=0.9,"
               "image/avif,image/webp,image/apng,*/*;q=0.8,"
               "application/signed-exchange;v=b3;q=0.7"),
    "Accept-Language": "zh-CN,zh;q=0.9",
}

_COVER_HEADERS = {"User-Agent": _UA}

_SEARCH_BASE = "https://search.douban.com/book/subject_search"


def _parse_js_challenge_cookies(html):
    cookies = {}
    m_wt = re.search(r'WTKkN\s*:\s*(\d+)', html)
    m_bo = re.search(r'bOYDu\s*:\s*(\d+)', html)
    m_wy = re.search(r'wyeCN\s*:\s*(\d+)', html)
    if m_wt and m_bo and m_wy:
        cookies["__tst_status"] = str(int(m_wt.group(1)) + int(m_bo.group(1)) + int(m_wy.group(1)))
    m_eo = re.search(r'iTyzs\s*\([^,]+,\s*(\d+)\)', html)
    if m_eo:
        cookies["EO_Bot_Ssid"] = m_eo.group(1)
    return cookies


def search(query, max_count=1):
    """搜索豆瓣图书，返回 (items, search_url)。items 为过滤后的 search_subject 列表。"""
    encoded = urllib.parse.quote(str(query))
    url = f"{_SEARCH_BASE}?search_text={encoded}&cat=1001"
    try:
        resp = requests.get(url, headers=_SEARCH_HEADERS, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logging.error("豆瓣V2搜索请求失败: %s", e)
        return [], ""

    pattern = r"window\.__DATA__\s*=\s*({.*?});"
    match = re.search(pattern, resp.text, re.DOTALL)
    if not match:
        logging.warning("豆瓣V2未能匹配 window.__DATA__，可能触发反爬")
        return [], url

    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        logging.error("豆瓣V2 JSON 解析失败")
        return [], url

    items = [i for i in data.get("items", []) if i.get("tpl_name") == "search_subject"]
    return items[:max_count], url


class _BookDetailParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self._in_all_span = False
        self._in_intro = False
        self._div_depth = 0
        self._chunks = []
        self._fallback_in_intro = False
        self._fallback_div_depth = 0
        self._fallback_chunks = []
        self.authors = []
        self.isbn = None

    def handle_starttag(self, tag, attrs):
        attrs_d = dict(attrs)
        if tag == "meta":
            prop = attrs_d.get("property", "")
            content = attrs_d.get("content", "")
            if prop == "book:author" and content:
                self.authors.append(content)
            elif prop == "book:isbn" and content:
                self.isbn = content
            return
        classes = attrs_d.get("class", "").split()
        if tag == "span" and "all" in classes:
            self._in_all_span = True
            return
        if self._in_all_span and not self._in_intro and tag == "div" and "intro" in classes:
            self._in_intro = True
            self._div_depth = 1
            return
        if self._in_intro:
            if tag == "div":
                self._div_depth += 1
            attrs_str = "".join(f' {k}="{v}"' if v is not None else f" {k}" for k, v in attrs)
            self._chunks.append(f"<{tag}{attrs_str}>")
            return
        # 兜底：span.all 之外的任意 div.intro
        if not self._in_all_span and not self._fallback_in_intro and tag == "div" and "intro" in classes:
            self._fallback_in_intro = True
            self._fallback_div_depth = 1
            return
        if self._fallback_in_intro:
            if tag == "div":
                self._fallback_div_depth += 1
            attrs_str = "".join(f' {k}="{v}"' if v is not None else f" {k}" for k, v in attrs)
            self._fallback_chunks.append(f"<{tag}{attrs_str}>")

    def handle_endtag(self, tag):
        if self._in_intro:
            if tag == "div":
                self._div_depth -= 1
                if self._div_depth == 0:
                    self._in_intro = False
                    return
            self._chunks.append(f"</{tag}>")
        elif self._fallback_in_intro:
            if tag == "div":
                self._fallback_div_depth -= 1
                if self._fallback_div_depth == 0:
                    self._fallback_in_intro = False
                    return
            self._fallback_chunks.append(f"</{tag}>")
        elif tag == "span" and self._in_all_span:
            self._in_all_span = False

    def handle_data(self, data):
        if self._in_intro:
            self._chunks.append(data)
        elif self._fallback_in_intro:
            self._fallback_chunks.append(data)

    def get_intro(self):
        primary = "".join(self._chunks).strip()
        return primary if primary else "".join(self._fallback_chunks).strip()


def get_book_detail(book_url, search_url):
    logging.info("[D2]get book detail: %s", book_url)
    if not book_url:
        return None
    headers = {**_SEARCH_HEADERS, "Referer": search_url}
    try:
        resp = requests.get(book_url, headers=headers, timeout=10)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logging.error("豆瓣V2获取书籍页面失败 %s: %s", book_url, e)
        return None

    if resp.status_code != 200:
        logging.error("豆瓣V2获取书籍页面失败，状态码 %s != 200", resp.status_code)
        return None

    parser = _BookDetailParser()
    parser.feed(resp.text)
    logging.info("[D2]parsed book detail: authors=%s, isbn=%s, intro_len=%d", parser.authors, parser.isbn, len(parser.get_intro() or ""))
    return {
        "intro": parser.get_intro() or None,
        "authors": parser.authors,
        "isbn": parser.isbn,
    }


def get_cover(cover_url, referer="https://book.douban.com/"):
    """下载封面图片，返回 (fmt, bytes) 或 None。"""
    if not cover_url:
        return None
    cover_url = cover_url.replace("/m/", "/l/").replace("/s/", "/l/")
    suffix = Path(urlparse(cover_url).path).suffix.lstrip(".")
    if not suffix:
        return None

    headers = {**_COVER_HEADERS, "Referer": referer}
    try:
        session = requests.Session()
        resp = session.get(cover_url, headers=headers, timeout=10)
        resp.raise_for_status()
        if "text/html" in resp.headers.get("Content-Type", ""):
            cookies = _parse_js_challenge_cookies(resp.text)
            if cookies:
                resp = session.get(cover_url, headers=headers, cookies=cookies, timeout=10)
                resp.raise_for_status()
        if "image" not in resp.headers.get("Content-Type", ""):
            logging.error("豆瓣V2封面下载失败，非图片响应: %s", resp.headers.get("Content-Type"))
            return None
        return (suffix, resp.content)
    except requests.exceptions.RequestException as e:
        logging.error("豆瓣V2封面下载失败: %s", e)
        return None


def _parse_abstract(abstract):
    """将 "作者 / 出版社 / 出版日期 / 定价" 拆分为字典。"""
    parts = [p.strip() for p in abstract.split(" / ")]
    return {
        "author": parts[0] if len(parts) > 0 else "",
        "publisher": parts[1] if len(parts) > 1 else "",
        "pub_date": parts[2] if len(parts) > 2 else "",
    }


def _parse_date(s):
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%Y年%m月%d日", "%Y年%m月", "%Y年", "%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).replace(tzinfo=datetime.timezone.utc)
        except ValueError:
            continue
    return None


def build_metadata(item, search_url, isbn=None, copy_image=False):
    from calibre.ebooks.metadata.book.base import Metadata
    from calibre.utils.date import utcnow

    title = item.get("title", "")
    parsed = _parse_abstract(item.get("abstract", ""))
    book_url = item.get("url", "")

    # 从书籍详情页获取精确作者、ISBN 和简介（失败时回退到 abstract 解析值）
    detail = get_book_detail(book_url, search_url) if book_url else None

    if detail and detail["authors"]:
        authors = detail["authors"]
    else:
        authors = [parsed["author"] or "佚名"]

    mi = Metadata(title)
    mi.authors = authors
    mi.author = authors[0]
    mi.author_sort = authors[0]
    mi.publisher = parsed["publisher"]
    mi.timestamp = utcnow()
    mi.source = "豆瓣(V2)"
    mi.provider_key = KEY
    mi.provider_value = str(item.get("id", ""))
    mi.website = book_url

    if isbn:
        mi.isbn = isbn
    elif detail and detail["isbn"]:
        mi.isbn = detail["isbn"]

    if detail and detail["intro"]:
        mi.comments = detail["intro"]

    rating_val = item.get("rating", {}).get("value", 0)
    if rating_val:
        mi.rating = round(float(rating_val))

    pub_date_str = parsed["pub_date"]
    if pub_date_str:
        mi.pubdate = _parse_date(pub_date_str)

    cover_url = item.get("cover_url", "")
    if cover_url:
        cover_url = cover_url.replace("/m/", "/l/").replace("/s/", "/l/")
        if not copy_image:
            mi.cover_url = cover_url
        else:
            cover_data = get_cover(cover_url, referer=search_url or "https://book.douban.com/")
            if cover_data:
                mi.cover_url = cover_url
                mi.cover_data = cover_data
            else:
                mi.cover_url = cover_url

    return mi
