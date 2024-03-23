#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import re
import time
from gettext import gettext as _

from webserver import loader
from webserver.plugins.meta import baike, douban
from webserver.services import AsyncService

CONF = loader.get_settings()


class AutoFillService(AsyncService):
    """自动从网上拉取书籍信息，填充到DB中"""

    @AsyncService.register_service
    def auto_fill_metadata(self, idlist: list, qpm=60):
        # 根据qpm，计算更新的间隔，避免刷爆豆瓣等服务
        sleep_seconds = 60.0/qpm

        for book_id in idlist:
            time.sleep(sleep_seconds)
            mi = self.db.get_metadata(book_id, index_is_id=True)
            if not self.should_update(mi): continue
            try:
                refer_mi = self.plugin_search_best_book_info(mi)
            except:
                logging.exception("plugin_search_best_book_info fail")
                continue

            if mi.cover_data is None:
                logging.info(_("忽略更新书籍 id=%d : 无法获取封面"))
                continue

            # 自动填充tag
            if len(refer_mi.tags) == 0 and len(mi.tags) == 0:
                mi.tags = self.guess_tags(refer_mi)
                # self.db.set_tags(book_id, mi.tags)
            mi.smart_update(refer_mi, replace_metadata=True)
            self.db.set_metadata(book_id, mi)
            logging.info(_("自动更新书籍 id=[%d] 的信息，title=%s", mi.title))

    def should_update(self, mi):
        if not mi.comments: return True
        # TODO: check cover is default
        return False


    def guess_tags(self, refer_mi, max_count=8):
        ts = []
        for tag in CONF["BOOK_NAV"].replace("=", "/").replace("\n", "/").split("/"):
            if tag in refer_mi.title or tag in refer_mi.comments:
                ts.append(tag)
            elif tag in refer_mi.authors:
                ts.append(tag)
            if len(ts) > max_count:
                break
        return ts
        if len(ts) > 0:
            mi.tags += ts[:8]
            logging.info("tags are %s" % ",".join(mi.tags))
            self.db.set_tags(book_id, mi.tags)

    def plugin_search_best_book_info(self, mi):
        title = re.sub("[(（].*", "", mi.title)
        api = douban.DoubanBookApi(
            CONF["douban_apikey"],
            CONF["douban_baseurl"],
            copy_image=True,
            manual_select=False,
            maxCount=CONF["douban_max_count"],
        )
        book = None
        books = []

        # 1. 查询 ISBN
        try:
            book = api.get_book_by_isbn(mi.isbn)
        except:
            logging.exception(_("douban 接口查询 %s 失败" % title))
        if book:
            return api._metadata(book)

        # 2. 查 title
        try:
            books = api.search_books(title)
        except:
            logging.exception(_("douban 接口查询 %s 失败" % title))

        if books:
            # 优先选择匹配度更高的书
            for b in books:
                if mi.title == b.get("title") and mi.publisher == b.get("publisher"):
                    return api._metadata(b)
            return api._metadata(books[0])

        # 3. 查 baidu
        api = baike.BaiduBaikeApi(copy_image=True)
        try:
            book = api.get_book(title)
            if book:
                return book
        except:
            logging.exception(_("baidu 接口查询 %s 失败" % title))

        return None
