#!/usr/bin/env python3
# vim:fileencoding=UTF-8:ts=4:sw=4:sta:et:sts=4:ai

__license__ = "GPL v3"
__copyright__ = "2014, Rex<talebook@foxmail.com>"
__docformat__ = "restructuredtext en"

import datetime
import json
import logging
import re
import sys
from gettext import gettext as _

import requests

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
    + "Chrome/66.0.3359.139 Safari/537.36",
}

KEY = "douban"
REMOVES = [
    re.compile(r"^\([^)]*\)\s*"),
    re.compile(r"^\[[^\]]*\]\s*"),
    re.compile(r"^【[^】]*】\s*"),
    re.compile(r"^（[^）]*）\s*"),
]


def str2date(s):
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", _("%Y年"), _("%Y年%m月"), _("%Y年%m月%d日"), "%Y"):
        try:
            return datetime.datetime.strptime(s, fmt).replace(tzinfo=datetime.timezone.utc)
        except:
            continue
    return None


class DoubanBookApi(object):
    def __init__(self, apikey, baseUrl, copy_image=True, manual_select=False, maxCount=2):
        self.apikey = apikey
        self.baseUrl = baseUrl
        self.maxCount = maxCount
        self.copy_image = copy_image
        self.manual_select = manual_select

    def author(self, book):
        author = book["author"]
        if not author:
            return None
        if isinstance(author, list):
            return author[0]
        return author

    def request(self, url, params={}):
        if self.apikey:
            params["apikey"] = self.apikey

        try:
            rsp = requests.get(url, timeout=10, headers=CHROME_HEADERS, params=params)
        except Exception as e:
            logging.error("豆瓣接口异常: request fail, err=%s", str(e))
            return None

        if rsp.status_code != 200:
            logging.error("豆瓣接口异常: status_code[%s] != 200 OK", rsp.status_code)
            return None

        try:
            data = rsp.json()
        except json.JSONDecodeError:
            logging.error("豆瓣接口异常: json decode fail, content:\n%s", rsp.content)
            return None

        if "code" in data and data["code"] != 0:
            logging.error("豆瓣接口异常: code=%d, msg=%s", rsp["code"], rsp["msg"])
            return None
        return data

    def get_book_by_isbn(self, isbn):
        if not isbn:
            return None
        url = "%s/v2/book/isbn/%s" % (self.baseUrl, isbn)
        return self.request(url)

    def get_book_by_id(self, id):
        url = "%s/v2/book/id/%s" % (self.baseUrl, id)
        return self.request(url)

    def search_books(self, title, author=None):
        url = "%s/v2/book/search" % self.baseUrl
        q = (title + " " + author) if author else title
        args = {"q": q.encode("UTF-8"), "count": self.maxCount}
        r = self.request(url, params=args)
        return r["books"] if r else None

    def get_book_by_title(self, title, author=None):
        books = self.search_books(title, author)
        if not books:
            return None
        for b in books:
            if not b["author"]:
                b["author"] = b["translator"]
            if b["title"] != title and b["title"] + ":" + b["subtitle"] != title:
                continue
            if not author or self.author(b) == author:
                return b
        return None

    def get_book(self, md):
        return self.get_metadata(md)

    def get_book_detail(self, md):
        # 字典结构体，转化格式
        douban_id = md['id'] if isinstance(md, dict) else md.douban_id
        info = self.get_book_by_id(douban_id)
        return self._metadata(info)

    def get_metadata(self, md):
        book = None
        if md.douban_id:
            book = self.get_book_by_id(md.douban_id)
        elif md.isbn:
            book = self.get_book_by_isbn(md.isbn)
        if not book:
            book = self.get_book_by_title(md.title, md.author_sort)
        if not book:
            return None
        return self._metadata(book)

    def get_cover(self, cover_url):
        if not self.copy_image:
            return None
        img = requests.get(cover_url, headers=CHROME_HEADERS).content
        img_fmt = cover_url.split(".")[-1]
        return (img_fmt, img)

    def _metadata(self, book):
        authors = []
        if book["author"]:
            for author in book["author"]:
                for r in REMOVES:
                    author = r.sub("", author)
                authors.append(author)
        if not authors:
            authors = [u"佚名"]

        logging.debug("=================\nsource metadata:\n%s" % book)

        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        mi = Metadata(book["title"])
        mi.authors = authors
        mi.author = mi.authors[0]
        mi.author_sort = mi.authors[0]
        mi.publisher = book["publisher"]
        mi.comments = book["summary"]
        mi.isbn = book.get("isbn13", None)
        mi.series = book.get("serials", None)
        mi.tags = [t["name"] for t in book["tags"]][:8]
        mi.rating = int(float(book["rating"]["average"]))
        mi.pubdate = str2date(book["pubdate"])
        mi.timestamp = utcnow()
        mi.douban_author_intro = book["author_intro"]
        mi.douban_subtitle = book.get("subtitle", None)
        mi.website = "https://book.douban.com/subject/%s/" % book["id"]
        mi.source = u"豆瓣"
        mi.provider_key = KEY
        mi.provider_value = book["id"]

        mi.cover_url = book["images"]["large"]
        mi.cover_data = self.get_cover(mi.cover_url)

        logging.debug("=================\ndouban metadata:\n%s" % mi)
        return mi


def get_douban_metadata(mi):
    api = DoubanBookApi()
    try:
        return api.get_metadata(mi, False)
    except Exception as err:
        logging.error(f"豆瓣接口异常: {err}")
        return None


def select_douban_metadata(mi):
    api = DoubanBookApi()
    try:
        return api.get_metadata(mi, True)
    except Exception as err:
        logging.error(f"豆瓣接口异常: {err}")
        return None


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("%s BOOK-TITLE BASE-URL" % sys.argv[0])
        exit(0)

    from pprint import pprint

    logging.basicConfig(level=logging.DEBUG)
    api = DoubanBookApi("fake-api-key", sys.argv[2])
    books = api.get_books_by_title(sys.argv[1])
    pprint(books)
    metas = [str2date(b["pubdate"]) for b in books]
    pprint(metas)
