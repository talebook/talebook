#!/usr/bin/env python3
# -*- coding: UTF-8 -*-


import datetime
from gettext import gettext as _


class SimpleBookFormatter:
    """格式化calibre book的字段"""

    def __init__(self, calibre_book_item, cdn_url):
        self.cdn_url = cdn_url
        self.book = calibre_book_item

    def get_collector(self):
        collector = self.book.get("collector", None)
        if isinstance(collector, dict):
            collector = collector.get("username", None)
        elif collector:
            collector = collector.username
        return collector

    def val(self, k, default_value=_("Unknown")):
        v = self.book.get(k, None)
        if not v:
            v = default_value
        if isinstance(v, datetime.datetime):
            return f'{v.year:04}-{v.month:02}-{v.day:02}'
        return v

    def format(self):
        b = self.book
        b["ts"] = b["timestamp"].strftime("%s")
        return {
            "id": b["id"],
            "title": b["title"],
            "rating": b["rating"],
            "timestamp": self.val("timestamp"),
            "pubdate": self.val("pubdate"),
            "author": ", ".join(b["authors"]),
            "authors": b["authors"],
            "author_sort": self.val("author_sort"),
            "tag": " / ".join(b["tags"]),
            "tags": b["tags"],
            "publisher": self.val("publisher"),
            "comments": self.val("comments", _(u"暂无简介")),
            "series": self.val("series", None),
            "language": self.val("language", None),
            "isbn": self.val("isbn", None),
            "img": self.cdn_url + "/get/cover/%(id)s.jpg?t=%(ts)s" % b,
            "thumb": self.cdn_url + "/get/thumb_60x80/%(id)s.jpg?t=%(ts)s" % b,
            # 额外填充的字段
            "collector": self.get_collector(),
            "count_visit": self.val("count_visit", 0),
            "count_download": self.val("count_download", 0),
        }


class BookFormatter:
    def __init__(self, tornado_handler, calibre_book_item):
        self.db = tornado_handler.db
        self.book = calibre_book_item
        self.cdn_url = tornado_handler.cdn_url
        self.api_url = tornado_handler.api_url
        self.handler = tornado_handler

    def get_files(self):
        files = []
        book_id = self.book["id"]
        for fmt in self.book.get("available_formats", ""):
            try:
                filesize = self.db.sizeof_format(book_id, fmt, index_is_id=True)
            except:
                continue
            item = {
                "format": fmt,
                "size": filesize,
                "href": self.cdn_url + "/api/book/%s.%s" % (book_id, fmt),
            }
            files.append(item)
        return files

    def get_permissions(self):
        h = self.handler
        return {
            # 图书权限数据
            "is_public": True,
            "is_owner": h.is_admin() or h.is_book_owner(self.book["id"], h.user_id()),
        }

    def format(self, with_files=False, with_perms=False):
        f = SimpleBookFormatter(self.book, self.cdn_url)
        data = f.format()
        data.update(
            {
                "author_url": self.api_url + "/author/" + f.val("author_sort"),
                "publisher_url": self.api_url + "/publisher/" + f.val("publisher"),
            }
        )
        if with_files:
            data["files"] = self.get_files()
        if with_perms:
            data.update(self.get_permissions())
        return data


def compare_books_by_rating_or_id(x, y):
    a = x.get("rating", 0) or 0
    b = y.get("rating", 0) or 0

    if a > b:
        return 1
    elif a < b:
        return -1
    elif x["id"] > y["id"]:
        return 1
    else:
        return -1


def super_strip(s):
    # 删除掉所有不可见的字符
    # issue: https://github.com/talebook/talebook/issues/304
    return ''.join(c for c in s.strip() if c.isprintable())
