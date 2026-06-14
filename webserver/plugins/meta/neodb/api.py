#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
#
# NeoDB 元数据搜索 API
#
# 搜索：
#   GET https://neodb.social/search?q=<title|isbn>&c=book
#   响应页面中 class 为 item-card 的 article 元素代表一个结果，
#   包含评分、作者、出版社、出版年份、简介和封面路径。
#   仅取第一条结果，不发二次详情请求。
# @author: PoxenStudio, 2026-06

import datetime
import logging
import re
import urllib.parse
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

KEY = "neodb"

_BASE_URL = "https://neodb.social"
_UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
       "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36")

_HEADERS = {
    "User-Agent": _UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}


def _parse_item_card(article):
    result = {}

    cover_img = article.select_one("div.cover img")
    cover_path = cover_img["src"] if cover_img else ""
    result["cover_path"] = cover_path
    result["cover_url"] = _BASE_URL + cover_path if cover_path.startswith("/") else cover_path

    title_link = article.select_one("hgroup h5 a")
    if title_link:
        result["title"] = title_link.get_text(strip=True)
        href = title_link.get("href", "")
        result["url"] = _BASE_URL + href if href.startswith("/") else href
    else:
        result["title"] = ""
        result["url"] = ""

    # 评分格式如 "8.6 (236 个评分)"
    rating_span = article.select_one("div.multi-fields span.solo-hidden")
    result["rating"] = rating_span.get_text(separator=" ", strip=True) if rating_span else ""

    multi_fields = article.select_one("div.multi-fields")
    result["author"] = ""
    result["publisher"] = ""
    result["pub_year"] = ""

    if multi_fields:
        for span in multi_fields.find_all("span", recursive=False):
            if "solo-hidden" in span.get("class", []):
                continue
            text = span.get_text(separator=" ", strip=True)
            if "作者:" in text or "作者：" in text:
                inner = span.find("span") or span.find("a")
                result["author"] = inner.get_text(strip=True) if inner else text.split(":", 1)[-1].strip()
            elif "publishing house:" in text:
                inner = span.find("span")
                result["publisher"] = inner.get_text(strip=True) if inner else text.split(":", 1)[-1].strip()
            else:
                first_token = text.split()[0] if text else ""
                if first_token.isdigit() and len(first_token) == 4:
                    result["pub_year"] = first_token

    desc_div = article.select_one("div.full div")
    result["description"] = desc_div.get_text(separator=" ", strip=True) if desc_div else ""

    return result


def search(query, max_count=1):
    """搜索 NeoDB 图书，返回解析后的条目列表（最多 max_count 条）。"""
    encoded = urllib.parse.quote(str(query))
    url = f"{_BASE_URL}/search?q={encoded}&c=book"
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.RequestException as e:
        logging.error("[NeoDB]搜索请求失败: %s", e)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    articles = soup.select("article.item-card")[:max_count]
    results = []
    for article in articles:
        try:
            results.append(_parse_item_card(article))
        except Exception as e:
            logging.warning("[NeoDB]解析条目失败: %s", e)
    return results


def get_cover(cover_url):
    """下载封面图片，返回 (fmt, bytes) 或 None。"""
    if not cover_url:
        return None
    suffix = Path(urlparse(cover_url).path).suffix.lstrip(".")
    if not suffix:
        suffix = "jpg"
    try:
        resp = requests.get(cover_url, headers=_HEADERS, timeout=15)
        resp.raise_for_status()
        if "image" not in resp.headers.get("Content-Type", ""):
            logging.error("[NeoDB]封面下载失败，非图片响应: %s", resp.headers.get("Content-Type"))
            return None
        return (suffix, resp.content)
    except requests.exceptions.RequestException as e:
        logging.error("[NeoDB]封面下载失败: %s", e)
        return None


def _parse_rating(rating_str):
    """从 "8.6 (236 个评分)" 中提取浮点数评分。"""
    m = re.match(r"([\d.]+)", rating_str.strip())
    return float(m.group(1)) if m else None


def build_metadata(item, isbn=None, copy_image=False):
    from calibre.ebooks.metadata.book.base import Metadata
    from calibre.utils.date import utcnow

    title = item.get("title", "")
    author = item.get("author") or "佚名"
    mi = Metadata(title)
    mi.authors = [author]
    mi.author = author
    mi.author_sort = author
    mi.publisher = item.get("publisher", "")
    mi.timestamp = utcnow()
    mi.source = "NeoDB"
    mi.provider_key = KEY
    mi.provider_value = item.get("url", "")
    mi.website = item.get("url", "")

    if isbn:
        mi.isbn = isbn

    description = item.get("description", "")
    if description:
        mi.comments = description

    rating_str = item.get("rating", "")
    if rating_str:
        rating_val = _parse_rating(rating_str)
        if rating_val:
            mi.rating = round(rating_val)

    pub_year = item.get("pub_year", "")
    if pub_year and pub_year.isdigit():
        try:
            mi.pubdate = datetime.datetime(int(pub_year), 1, 1, tzinfo=datetime.timezone.utc)
        except ValueError:
            pass

    cover_url = item.get("cover_url", "")
    logging.info("[NeoDB]封面URL: %s", cover_url)
    if cover_url:
        if not copy_image:
            logging.info("[NeoDB]不复制封面，直接使用URL")
            mi.cover_url = cover_url
        else:
            logging.info("[NeoDB]复制封面数据")
            cover_data = get_cover(cover_url)
            if cover_data:
                mi.cover_data = cover_data
            mi.cover_url = cover_url

    return mi
