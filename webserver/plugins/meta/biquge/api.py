#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
笔趣阁 (Biquge) 元数据获取 API

针对 xbiqugu.la 镜像站，通过书名搜索获取网络小说元数据。
"""

import logging
import re

import requests
from bs4 import BeautifulSoup

from webserver.i18n import _

BIQUGE_ISBN = "0000000000004"
KEY = "Biquge"
BASE_URL = "http://www.xbiqugu.la"

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
}
TIMEOUT = 15


def _clean_text(text):
    return re.sub(r"\s+", " ", text).strip()


class BiqugePage:
    """解析笔趣阁书籍详情页"""

    def __init__(self, url, html=None):
        self.url = url
        if html is None:
            resp = requests.get(url, headers=CHROME_HEADERS, timeout=TIMEOUT)
            resp.raise_for_status()
            resp.encoding = "utf-8"
            html = resp.text
        self.soup = BeautifulSoup(html, "html.parser")

    def get_info(self):
        info = {"title": "", "author": "", "category": "", "latest_chapter": ""}

        h1 = self.soup.find("h1")
        info["title"] = _clean_text(h1.get_text()) if h1 else ""

        div_info = self.soup.find("div", id="info")
        if div_info:
            p_tags = [_clean_text(p.get_text()) for p in div_info.find_all("p") if p.get_text(strip=True)]
            for line in p_tags:
                if "作" in line and "者" in line:
                    info["author"] = re.sub(r"作\s*者[：:]", "", line).strip()
                elif "最新章节" in line:
                    raw = re.sub(r"最新章节[：:]", "", line).strip()
                    m = re.search(r"《(.+?)》", raw)
                    info["latest_chapter"] = m.group(1) if m else raw

        con_top = self.soup.find("div", class_="con_top")
        if con_top:
            links = con_top.find_all("a")
            if len(links) >= 3:
                info["category"] = links[2].get_text(strip=True)

        return info

    def get_summary(self):
        intro = self.soup.find("div", id="intro")
        return _clean_text(intro.get_text()) if intro else ""

    def get_image(self):
        fmimg = self.soup.find("div", id="fmimg")
        if fmimg:
            img_tag = fmimg.find("img")
            if img_tag:
                src = img_tag.get("src", "")
                if src.startswith("//"):
                    return "http:" + src
                if src and not src.startswith("http"):
                    return BASE_URL.rstrip("/") + "/" + src.lstrip("/")
                return src or None
        return None

    def get_id(self):
        m = re.search(r"/(\d+/\d+)/?$", self.url)
        return m.group(1) if m else self.url

    def get_tags(self):
        info = self.get_info()
        return [info["category"]] if info.get("category") else []


class BiqugeSearch:
    """搜索笔趣阁书籍"""

    def __init__(self):
        self.search_url = BASE_URL + "/modules/article/search.php"

    def search(self, keyword):
        payload = {"searchtype": "title", "searchkey": keyword}
        try:
            resp = requests.post(self.search_url, data=payload, headers=CHROME_HEADERS, timeout=TIMEOUT)
            resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")

            # 搜索直接跳转到书籍详情页（唯一结果）
            if soup.find("div", id="info"):
                return BiqugePage(resp.url, html=resp.text)

            # 多结果列表，取第一条
            first = soup.select_one(".s2 a")
            if first:
                book_url = first.get("href", "")
                if not book_url.startswith("http"):
                    book_url = BASE_URL.rstrip("/") + "/" + book_url.lstrip("/")
                return BiqugePage(book_url)

            return None
        except Exception as err:
            logging.error(_(f"笔趣阁搜索异常：{err}"))
            return None


class BiqugeApi:
    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image
        self.searcher = BiqugeSearch()

    def get_book(self, title):
        try:
            page = self.searcher.search(title)
            if not page:
                return None
            return self._metadata(page)
        except Exception as err:
            logging.error(_(f"笔趣阁接口异常：{err}"))
            return None

    def _metadata(self, page):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        info = page.get_info()

        mi = Metadata(info["title"])
        mi.authors = [info.get("author", "佚名")]
        mi.author_sort = mi.authors[0]
        mi.isbn = BIQUGE_ISBN
        mi.tags = page.get_tags()[:8]
        mi.publisher = None
        mi.pubdate = utcnow()
        mi.timestamp = mi.pubdate
        mi.cover_url = page.get_image()
        mi.comments = page.get_summary()
        mi.website = page.url
        mi.source = "笔趣阁"
        mi.provider_key = KEY
        mi.provider_value = page.get_id()
        mi.cover_data = self.get_cover(mi.cover_url)
        mi.rating = None

        logging.debug("笔趣阁 metadata: %s", mi)
        return mi

    def get_cover(self, cover_url):
        if not self.copy_image or not cover_url:
            return None
        try:
            rsp = requests.get(cover_url, timeout=10, headers=CHROME_HEADERS)
            if rsp.status_code != 200:
                logging.error(_(f"获取笔趣阁封面失败：status_code[{rsp.status_code}]"))
                return None
            img = rsp.content
            if not img:
                return None
            img_fmt = cover_url.split(".")[-1].lower()
            if img_fmt not in ("jpg", "jpeg", "png", "gif", "webp"):
                img_fmt = "jpg"
            return (img_fmt, img)
        except Exception as err:
            logging.error(_(f"获取笔趣阁封面异常：{err}"))
            return None
