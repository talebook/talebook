#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import re
import time
import traceback

from webserver import loader, utils
from webserver.constants import (
    META_SELECTED_SOURCES,
    META_SOURCE_AMAZON,
    META_SOURCE_BAIDU,
    META_SOURCE_DOUBAN,
    META_SOURCE_GOOGLE,
)
from webserver.i18n import _
from webserver.plugins.meta import baike, douban
from webserver.plugins.meta.calibre.api import CalibreMetadataApi
from webserver.services import AsyncService


CONF = loader.get_settings()


class AutoFillService(AsyncService):
    """自动从网上拉取书籍信息，填充到 DB 中"""

    def __init__(self):
        self.count_total = 0
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0
        self.is_running = False
        self.current_book_id = None
        self.start_time = None
        self.task_id = None
        AsyncService.__init__(self)

    def status(self):
        """获取运行状态及处理的进度信息"""
        return {
            "is_running": self.is_running,
            "current_book_id": self.current_book_id,
            "start_time": self.start_time,
            "count_total": self.count_total,
            "count_skip": self.count_skip,
            "count_done": self.count_done,
            "count_fail": self.count_fail,
            "task_id": self.task_id,
        }

    @AsyncService.register_service
    def auto_fill_all(self, idlist: list, qpm=60):
        # 检查是否启用了自动填充书籍信息
        if not CONF.get("auto_fill_meta", False):
            logging.info("自动填充书籍信息已关闭，跳过处理")
            return

        # 根据 qpm，计算更新的间隔，避免刷爆豆瓣等服务
        sleep_seconds = 60.0 / qpm

        self.count_total = len(idlist)
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0

        for book_id in idlist:
            mi = self.db.get_metadata(book_id, index_is_id=True)
            if not self.should_update(mi):
                logging.info(_("忽略更新书籍 id=%d : 无需更新"), book_id)
                self.count_skip += 1
                continue

            time.sleep(sleep_seconds)
            try:
                if self.do_fill_metadata(book_id, mi):
                    self.count_done += 1
                else:
                    self.count_fail += 1
            except Exception as err:
                self.count_fail += 1
                logging.error(_("执行异常：%s"), err)

    @AsyncService.register_function
    def auto_fill(self, book_id):
        if not CONF.get("auto_fill_meta", False):
            return
        mi = self.db.get_metadata(book_id, index_is_id=True)
        return self.do_fill_metadata(book_id, mi)

    def do_fill_metadata(self, book_id, mi):
        refer_mi = None

        try:
            refer_mi = self.plugin_search_best_book_info(mi)
        except Exception as e:
            logging.error(_("自动填充元数据时出错 id=%d: %s"), book_id, e)
            return False

        if not refer_mi:
            logging.info(_("忽略更新书籍 id=%d : 无法获取信息"), book_id)
            return False

        if refer_mi.cover_data is None:
            logging.info(_("忽略更新书籍 id=%d : 无法获取封面"), book_id)
            return False

        # 保留书名不修改（万一出 BUG，还能抢救一下）
        title = utils.remove_zlibrary_suffix(mi.title)
        refer_mi.title = title
        refer_mi.title_sort = utils.get_title_sort(refer_mi.title)

        mi.smart_update(refer_mi, replace_metadata=True)
        self.db.set_metadata(book_id, mi, ignore_errors=True)
        logging.info(_("自动更新书籍 id=[%d] 的信息，title=%s"), book_id, mi.title)
        return True

    def should_update(self, mi):
        if not mi.comments or not mi.has_cover or not mi.authors or mi.authors[0] in ("佚名", "未知", "Unknown"):
            return True
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

    def plugin_search_best_book_info(self, mi):
        sources = CONF.get(META_SELECTED_SOURCES, [])
        if not sources:
            return None

        title = re.sub("[(（].*", "", mi.title)
        book = None
        books = []

        # 1. 豆瓣查询 ISBN
        if META_SOURCE_DOUBAN in sources:
            try:
                api = douban.DoubanBookApi(
                    CONF["douban_apikey"],
                    CONF["douban_baseurl"],
                    copy_image=True,
                    manual_select=False,
                    maxCount=CONF["douban_max_count"],
                )
                book = api.get_book_by_isbn(mi.isbn)
                if book:
                    book_detail_mi = api.get_book_detail(book)
                    if book_detail_mi:
                        if not book_detail_mi.authors or book_detail_mi.authors[0] in ("佚名", ""):
                            book_detail_mi.authors = mi.authors
                            book_detail_mi.author_sort = mi.author_sort
                    return book_detail_mi

                # 2. 豆瓣查询 title
                books = api.search_books(title)
                if books:
                    book_detail_mi = None
                    for b in books:
                        if mi.title == b.get("title") and mi.publisher == b.get("publisher"):
                            book_detail_mi = api.get_book_detail(b)
                            break
                    if not book_detail_mi:
                        book_detail_mi = api.get_book_detail(books[0])
                    if book_detail_mi:
                        if not book_detail_mi.authors or book_detail_mi.authors[0] in ("佚名", ""):
                            book_detail_mi.authors = mi.authors
                            book_detail_mi.author_sort = mi.author_sort
                    return book_detail_mi
            except Exception:
                logging.error(_("douban 接口查询 %s 失败"), title)

        # 3 & 4. 使用 Google Books 和 Amazon.com 查询
        calibre_sources = [s for s in sources if s in (META_SOURCE_GOOGLE, META_SOURCE_AMAZON)]
        if calibre_sources:
            try:
                if META_SOURCE_AMAZON not in calibre_sources:
                    # 只有在没有 amazon 时才使用 google 查询
                    try:
                        results = CalibreMetadataApi.get_book_by_isbn(mi.isbn, sources=calibre_sources)
                        if results:
                            return results[0]
                    except Exception:
                        logging.error(_("calibre 插件 ISBN 查询 %s 失败"), title)

                results = CalibreMetadataApi.get_book_by_title(title, authors=mi.authors, sources=calibre_sources)
                if results:
                    result = results[0]
                    result.cover_data = CalibreMetadataApi.get_cover(result.cover_url) if result.cover_url else None
                    return result
            except Exception as e:
                logging.error(_("calibre 插件书名查询 %s 失败：%s"), title, e)
                logging.error(traceback.format_exc())

        # 5. 百度百科查询
        if META_SOURCE_BAIDU in sources:
            api = baike.BaiduBaikeApi(copy_image=True)
            try:
                book = api.get_book(title)
                if book:
                    return book
            except Exception:
                logging.error(_("baidu 接口查询 %s 失败"), title)

        return None
