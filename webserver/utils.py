#!/usr/bin/env python3
# -*- coding: UTF-8 -*-


import datetime
import logging
import re

from webserver.constants import MEDIA_TYPE_UNKNOWN
from webserver.i18n import _
from webserver.services.media_analysis import online_readable_formats


# 匹配包含z-library的括号内容，例如 (z-library.sk, 1lib.sk, z-lib.sk)
ZLIBRARY_PATTERN = re.compile(r"\([^)]*?(?:z-?lib(?:rary)?|1lib)[^)]*?\)", re.IGNORECASE)


def remove_zlibrary_suffix(text):
    """移除文件名中包含z-library的括号内容"""
    if not text:
        return text
    return ZLIBRARY_PATTERN.sub("", text).strip()


_SIZE_UNITS = {"": 1, "b": 1, "k": 1024, "kb": 1024, "m": 1024**2, "mb": 1024**2, "g": 1024**3, "gb": 1024**3}
_SIZE_RE = re.compile(r"^\s*([\d.]+)\s*([a-z]*)\s*$")


def parse_size(size):
    """解析形如 "100MB"/"1024" 的大小配置，返回字节数"""
    if isinstance(size, (int, float)):
        return int(size)
    m = _SIZE_RE.match(str(size).lower())
    if not m or m.group(2) not in _SIZE_UNITS:
        raise ValueError("invalid size string: %r" % size)
    return int(float(m.group(1)) * _SIZE_UNITS[m.group(2)])


def parse_size_safe(size, default):
    """与parse_size相同，但配置值不合法时返回default而不是抛异常"""
    try:
        return parse_size(size)
    except (TypeError, ValueError):
        logging.warning("invalid size config %r, fallback to %r", size, default)
        return parse_size(default)


def get_title_sort(title):
    """获取标题的排序字符串"""
    if not title:
        return title
    try:
        from calibre.utils.filenames import ascii_text

        return ascii_text(title).lower()
    except Exception as e:
        logging.error(f"Error converting title to ASCII for sorting: {e}")
        return title


def _book_resource_url(book, cdn_url, api_url):
    """私藏资源需要携带应用域名的认证 Cookie，公开资源可继续使用 CDN。"""
    return api_url if book.get("scope") == "private" else cdn_url


class SimpleBookFormatter:
    """格式化calibre book的字段"""

    def __init__(self, calibre_book_item, cdn_url, api_url):
        self.book = calibre_book_item
        self.resource_url = _book_resource_url(calibre_book_item, cdn_url, api_url)

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
            return f"{v.year:04}-{v.month:02}-{v.day:02}"
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
            "comments": self.val("comments", _("暂无简介")),
            "series": self.val("series", None),
            "language": self.val("language", None),
            "isbn": self.val("isbn", None),
            "img": self.resource_url + "/get/cover/%(id)s.jpg?t=%(ts)s" % b,
            "thumb": self.resource_url + "/get/thumb_60x80/%(id)s.jpg?t=%(ts)s" % b,
            # 额外填充的字段
            "collector": self.get_collector(),
            "count_visit": self.val("count_visit", 0),
            "count_download": self.val("count_download", 0),
            "media_type": self.val("media_type", MEDIA_TYPE_UNKNOWN),
            "media_type_locked": bool(b.get("media_type_locked", False)),
            "online_readable": online_readable_formats(b.get("available_formats", [])),
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
        resource_url = _book_resource_url(self.book, self.cdn_url, self.api_url)
        for fmt in self.book.get("available_formats", []):
            try:
                filesize = self.db.sizeof_format(book_id, fmt, index_is_id=True)
            except:
                continue
            item = {
                "format": fmt,
                "size": filesize,
                "href": resource_url + "/api/book/%s.%s" % (book_id, fmt),
                "online_readable": online_readable_formats([fmt]),
            }
            files.append(item)
        return files

    def get_permissions(self):
        h = self.handler
        user_id = h.user_id()
        return {
            # 图书权限数据
            "is_public": True,
            "is_owner": user_id and (h.is_admin() or h.is_book_owner(self.book["id"], user_id)),
        }

    def format(self, with_files=False, with_perms=False):
        f = SimpleBookFormatter(self.book, self.cdn_url, self.api_url)
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

        # 添加 scope 字段
        try:
            from webserver.models import Item

            item = self.handler.session.query(Item).filter(Item.book_id == self.book["id"]).first()
            data["scope"] = item.scope if item else "public"
        except:
            data["scope"] = "public"

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
    return "".join(c for c in s.strip() if c.isprintable())


class ReadingStateFormatter:
    @staticmethod
    def format_reading_state(reading_state):
        if not reading_state:
            return {
                "favorite": 0,
                "favorite_date": None,
                "wants": 0,
                "wants_date": None,
                "read_state": 0,
                "read_date": None,
                "online_read": 0,
                "download": 0,
            }
        return {
            "favorite": reading_state.favorite,
            "favorite_date": reading_state.favorite_date.isoformat() if reading_state.favorite_date else None,
            "wants": reading_state.wants,
            "wants_date": reading_state.wants_date.isoformat() if reading_state.wants_date else None,
            "read_state": reading_state.read_state,
            "read_date": reading_state.read_date.isoformat() if reading_state.read_date else None,
            "online_read": reading_state.online_read or 0,
            "download": reading_state.download or 0,
        }

    @staticmethod
    def format_reading_state_with_api_format(reading_state):
        if reading_state:
            return {
                "err": "ok",
                "read_state": reading_state.get_read_state(),
                "favorite": reading_state.is_favorite(),
                "wants": reading_state.is_wants(),
                "online_read": reading_state.online_read or 0,
                "download": reading_state.download or 0,
                "read_date": reading_state.read_date.isoformat() if reading_state.read_date else None,
                "favorite_date": reading_state.favorite_date.isoformat() if reading_state.favorite_date else None,
                "wants_date": reading_state.wants_date.isoformat() if reading_state.wants_date else None,
            }
        else:
            return {
                "err": "ok",
                "read_state": 0,
                "favorite": False,
                "wants": False,
                "online_read": 0,
                "download": 0,
                "read_date": None,
                "favorite_date": None,
                "wants_date": None,
            }
