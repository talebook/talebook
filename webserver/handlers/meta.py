#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import math
import sys
from functools import cmp_to_key
from gettext import gettext as _

from webserver import utils
from webserver.handlers.base import ListHandler, js


class AuthorBooksUpdate(ListHandler):
    def post(self, name):
        category = "authors"
        author_id = self.cache.get_item_id(category, name)
        ids = self.db.get_books_for_category(category, author_id)
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect("/author/%s" % name, 302)


class PubBooksUpdate(ListHandler):
    def post(self, name):
        category = "publisher"
        publisher_id = self.cache.get_item_id(category, name)
        if publisher_id:
            ids = self.db.get_books_for_category(category, publisher_id)
        else:
            ids = self.cache.search_for_books("")
            books = self.db.get_data_as_dict(ids=ids)
            ids = [b["id"] for b in books if not b["publisher"]]
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect("/publisher/%s" % name, 302)


class MetaList(ListHandler):
    @js
    def get(self, meta):
        SHOW_NUMBER = 300
        if self.get_argument("show", "") == "all":
            SHOW_NUMBER = sys.maxsize
        titles = {
            "tag": _("全部标签"),
            "author": _("全部作者"),
            "series": _("丛书列表"),
            "rating": _("全部评分"),
            "publisher": _("全部出版社"),
            "format": _("全部格式"),
        }
        title = titles.get(meta, _("未知")) % vars()
        if meta == "format":
            # 使用Calibre API获取所有格式及其对应的书籍数量
            from collections import defaultdict

            format_count = defaultdict(int)
            all_book_ids = self.db.new_api.all_book_ids()
            for book_id in all_book_ids:
                book_formats = self.db.new_api.formats(book_id)
                for fmt in book_formats:
                    format_count[fmt] += 1
            items = [{"id": fmt, "name": fmt, "count": count} for fmt, count in format_count.items()]
        else:
            items = self.get_category_with_count(meta)
        count = len(items)
        if items:
            if meta == "rating":
                items.sort(key=lambda x: x["name"], reverse=True)
            else:
                hotline = int(math.log10(count)) if count > SHOW_NUMBER else 0
                items = [v for v in items if v["count"] >= hotline]
                items.sort(key=lambda x: x["count"], reverse=True)
        return {"meta": meta, "title": title, "items": items, "total": count}


class MetaBooks(ListHandler):
    @js
    def get(self, meta, name):
        titles = {
            "tag": _('含有"%(name)s"标签的书籍'),
            "author": _('"%(name)s"编著的书籍'),
            "series": _('"%(name)s"丛书包含的书籍'),
            "rating": _("评分为%(name)s星的书籍"),
            "publisher": _('"%(name)s"出版的书籍'),
            "format": _('格式为"%(name)s"的书籍'),
        }
        title = titles.get(meta, _("未知")) % vars()  # noqa: F841

        if meta == "format":
            # 使用Calibre API获取指定格式的书籍
            all_book_ids = self.db.new_api.all_book_ids()
            matching_ids = []
            for book_id in all_book_ids:
                book_formats = self.db.new_api.formats(book_id)
                if name in book_formats:
                    matching_ids.append(book_id)
            books = self.db.get_data_as_dict(ids=matching_ids)
        else:
            category = meta + "s" if meta in ["tag", "author"] else meta
            if meta in ["rating"]:
                name = int(name)
            books = self.get_item_books(category, name)

        books.sort(key=cmp_to_key(utils.compare_books_by_rating_or_id), reverse=True)
        return self.render_book_list(books, title=title)


def routes():
    return [
        (r"/api/(author|publisher|tag|rating|series|format)", MetaList),
        (r"/api/(author|publisher|tag|rating|series|format)/(.*)", MetaBooks),
        (r"/api/author/(.*)/update", AuthorBooksUpdate),
        (r"/api/publisher/(.*)/update", PubBooksUpdate),
    ]
