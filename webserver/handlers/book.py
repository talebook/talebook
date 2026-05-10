# -*- coding: UTF-8 -*-

import concurrent.futures
import datetime
import json
import logging
import os
import random
import re
import shutil
import urllib

import tornado.escape
from tornado import web

from webserver import loader, utils
from webserver.constants import (
    CALIBRE_ERROR_FLAG,
    META_SELECTED_SOURCES,
    META_SOURCE_AI,
    META_SOURCE_AMAZON,
    META_SOURCE_BAIDU,
    META_SOURCE_DOUBAN,
    META_SOURCE_GOOGLE,
    META_SOURCE_XHSD,
    SUPPORTED_EBOOK_FORMATS,
)
from webserver.handlers.base import BaseHandler, ListHandler, auth, js
from webserver.i18n import _
from webserver.models import Item, ReadingState
from webserver.plugins.meta import baike, calibre, douban, tomato, xhsd, youshu
from webserver.plugins.meta.ai.api import KEY as AI_KEY
from webserver.plugins.meta.ai.api import AIBookApi
from webserver.plugins.parser.txt import get_content_encoding
from webserver.services.autofill import AutoFillService
from webserver.services.convert import ConvertService
from webserver.services.extract import ExtractService
from webserver.services.mail import MailService


CONF = loader.get_settings()


class Index(BaseHandler):
    def fmt(self, b):
        return utils.BookFormatter(self, b).format()

    @js
    def get(self):
        # 从配置中获取首页设置，如果未设置则使用默认值
        setting_random_count = CONF.get("MAIN_PAGE_RANDOM_COUNT", 12)
        setting_recent_count = CONF.get("MAIN_PAGE_RECENT_COUNT", 12)

        # 允许通过 URL 参数覆盖配置（用于兼容旧接口），但不超过配置值
        cnt_random = min(int(self.get_argument("random", setting_random_count)), setting_random_count)
        cnt_recent = min(int(self.get_argument("recent", setting_recent_count)), 200)

        # nav = "index"
        # title = _(u"全部书籍")
        ids = list(self.cache.search(""))
        random_books = []
        new_books = []

        # 过滤掉其他用户标记为 scope=private 的书籍
        user_id = self.user_id()
        if ids:
            if user_id:
                private_book_ids = set(
                    item.book_id
                    for item in self.session.query(Item).filter(Item.scope == "private", Item.collector_id != user_id).all()
                )
                ids = [book_id for book_id in ids if book_id not in private_book_ids]
            else:
                private_book_ids = set(item.book_id for item in self.session.query(Item).filter(Item.scope == "private").all())
                ids = [book_id for book_id in ids if book_id not in private_book_ids]

        if ids:
            # 如果配置为 0，则不显示随机推荐
            if cnt_random > 0:
                random_ids = random.sample(ids, min(cnt_random, len(ids)))
                random_books = [b for b in self.get_books(ids=random_ids)]
                random_books.sort(key=lambda x: x["id"], reverse=True)

            ids.sort(reverse=True)
            # 确保不会尝试从空列表中取样
            sample_ids = ids[0:100] if len(ids) > 100 else ids
            new_ids = random.sample(sample_ids, min(cnt_recent, len(sample_ids)))
            new_books = [b for b in self.get_books(ids=new_ids)]
            new_books.sort(key=lambda x: x["id"], reverse=True)

        return {
            "random_books_count": len(random_books),
            "new_books_count": len(new_books),
            "random_books": [self.fmt(b) for b in random_books],
            "new_books": [self.fmt(b) for b in new_books],
        }


class BookDetail(BaseHandler):
    @js
    def get(self, id):
        book = self.get_book(id)
        item = self.session.query(Item).filter(Item.book_id == int(id)).first()
        if item and item.scope == "private":
            user_id = self.user_id()
            if not user_id or item.collector_id != user_id:
                return {"err": "book.not_found", "msg": _("书籍不存在")}
        book_info = utils.BookFormatter(self, book).format(with_files=True, with_perms=True)
        reading_state = None
        user_id = self.user_id()
        if user_id:
            state = (
                self.session.query(ReadingState)
                .filter(
                    ReadingState.book_id == int(id),
                    ReadingState.reader_id == user_id,
                )
                .first()
            )
            if state:
                reading_state = utils.ReadingStateFormatter.format_reading_state(state)
        if reading_state:
            book_info["state"] = reading_state
        return {
            "err": "ok",
            "kindle_sender": CONF["smtp_username"],
            "book": book_info,
        }


class BookConverter(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}

        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        fmts = []
        paths = []
        for fmt in SUPPORTED_EBOOK_FORMATS:
            book_path = book.get("fmt_%s" % fmt, None)
            if book_path:
                fmts.append(fmt)
                paths.append(book_path)

        if not fmts:
            return {"err": "params.book.invalid", "msg": _("本书没有支持的电子书格式")}

        if ("epub" in fmts) and ("azw3" in fmts):
            return {"err": "params.book.invalid", "msg": _("本书已有EPUB及Kindle版本, 不需要转换")}

        if fmts[0] == "epub":
            fmt = "azw3"
        elif fmts[0] == "pdf":
            fmt = "epub"
        else:
            fmt = "epub"

        fpath = paths[0]

        service = ConvertService()
        if service.is_book_converting(book):
            return {"err": "params.book.converting", "msg": _("本书正在转换中，请稍后再试")}
        service.convert_and_save(self.user_id(), book, fpath, fmt)
        return {"err": "ok", "content": "%s" % _("转换成功，请稍后刷新页面查看")}


class BookToPDF(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}

        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        fmts = []
        paths = []
        has_pdf = False
        for fmt in ["epub", "azw3", "mobi", "azw", "pdf"]:
            book_path = book.get("fmt_%s" % fmt, None)
            if not book_path:
                continue
            if fmt == "pdf":
                has_pdf = True
                continue
            fmts.append(fmt)
            paths.append(book_path)

        if has_pdf:
            return {"err": "params.book.invalid", "msg": _("本书已有PDF版本, 不需要转换")}
        if len(fmts) == 0:
            return {"err": "params.book.invalid", "msg": _("本书不支持转换，仅支持EPUB及Kindle使用的格式转换为PDF")}

        fpath = paths[0]
        service = ConvertService()
        if service.is_book_converting(book):
            return {"err": "params.book.converting", "msg": _("本书正在转换中，请稍后再试")}
        service.convert_and_save(self.user_id(), book, fpath, "pdf")
        return {"err": "ok", "content": "%s" % _("转换成功，请稍后刷新页面查看")}


class BookRefer(BaseHandler):
    def has_proper_book(self, books, mi):
        if not books or not mi.isbn or mi.isbn == baike.BAIKE_ISBN:
            return False

        for b in books:
            if mi.isbn == b.get("isbn13", "xxx"):
                return True
            if mi.title == b.get("title") and mi.publisher == b.get("publisher"):
                return True
        return False

    REFER_TIMEOUT = 30  # 并行查询总超时秒数（需大于 AI HTTP timeout）

    def plugin_search_books(self, mi):
        sources = CONF.get(META_SELECTED_SOURCES, ["douban", "baidu"])
        logging.info("META_SELECTED_SOURCES 配置：%s", sources)
        if not sources:
            return []

        title = re.sub("[(（].*", "", mi.title)

        # 将每个数据源封装为独立 callable，返回 list
        tasks = {}  # name -> callable

        if META_SOURCE_DOUBAN in sources:

            def _douban():
                api = douban.DoubanBookApi(
                    CONF["douban_apikey"],
                    CONF["douban_baseurl"],
                    copy_image=False,
                    manual_select=False,
                    maxCount=CONF["douban_max_count"],
                )
                try:
                    result = api.search_books(title) or []
                except Exception:
                    logging.error(_("豆瓣接口查询 %s 失败" % title))
                    result = []
                if not self.has_proper_book(result, mi):
                    book = api.get_book_by_isbn(mi.isbn)
                    if book:
                        result = [book] + list(result)
                return [api._metadata(b) for b in result]

            tasks["douban"] = _douban

        if META_SOURCE_BAIDU in sources:

            def _baidu():
                api = baike.BaiduBaikeApi(copy_image=False)
                book = api.get_book(title)
                return [book] if book else []

            tasks["baidu"] = _baidu

        calibre_sources = [s for s in sources if s in (META_SOURCE_GOOGLE, META_SOURCE_AMAZON)]
        if calibre_sources:

            def _calibre():
                results = calibre.CalibreMetadataApi.get_book_by_isbn(mi.isbn, sources=calibre_sources)
                if not results:
                    results = calibre.CalibreMetadataApi.get_book_by_title(title, authors=mi.authors, sources=calibre_sources)
                for r in results or []:
                    r.cover_data = calibre.CalibreMetadataApi.get_cover(r.cover_url) if getattr(r, "cover_url", None) else None
                    # calibre 插件内部按子数据源设置 provider_key（"google"/"amazon"），
                    # 但 plugin_get_book_meta 只识别 calibre.KEY，统一覆盖
                    r.provider_key = calibre.KEY
                return list(results) if results else []

            tasks["calibre"] = _calibre

        if META_SOURCE_XHSD in sources:

            def _xhsd():
                api = xhsd.XhsdBookApi(copy_image=False)
                book = api.get_book(mi.isbn or title)
                return [book] if book else []

            tasks["xhsd"] = _xhsd

        if hasattr(youshu, "YoushuApi"):

            def _youshu():
                api = youshu.YoushuApi(copy_image=True)
                book = api.get_book(title)
                return [book] if book else []

            tasks["youshu"] = _youshu

        if hasattr(tomato, "TomatoNovelApi"):

            def _tomato():
                api = tomato.TomatoNovelApi(copy_image=False)
                book = api.get_book(title)
                return [book] if book else []

            tasks["tomato"] = _tomato

        if META_SOURCE_AI in sources:

            def _ai():
                logging.info("查询 AI 信息源，title=%s", title)
                api = AIBookApi(
                    api_url=CONF.get("ai_api_url", "https://api.openai.com/v1/chat/completions"),
                    api_key=CONF.get("ai_api_key", ""),
                    model=CONF.get("ai_model", "gpt-3.5-turbo"),
                    use_thinking=CONF.get("ai_use_thinking", False),
                    copy_image=False,
                )
                book = api.get_book(title, mi.authors[0] if mi.authors else None)
                logging.info("AI 查询结果：%d 条", 1 if book else 0)
                return [book] if book else []

            tasks["ai"] = _ai

        logging.info("并行查询 %d 个信息源，超时 %ds", len(tasks), self.REFER_TIMEOUT)
        books = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(tasks)) as executor:
            future_map = {executor.submit(fn): name for name, fn in tasks.items()}
            done, not_done = concurrent.futures.wait(future_map, timeout=self.REFER_TIMEOUT)
            for f in not_done:
                logging.warning("查询 %s 超时，已跳过", future_map[f])
            for f in done:
                name = future_map[f]
                try:
                    result = f.result()
                    books.extend(result)
                    logging.info("%s 查询完成：%d 条", name, len(result))
                except Exception as e:
                    logging.error("%s 查询失败：%s", name, e)

        logging.info("所有信息源查询完成，共找到 %d 条结果", len(books))
        return books

    def plugin_get_book_meta(self, provider_key, provider_value, mi):
        refer_mi = None
        if provider_key == baike.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = baike.BaiduBaikeApi(copy_image=True)
            try:
                refer_mi = api.get_book(title)
            except Exception as e:
                logging.error("获取百度百科书籍信息失败: %s", e)
                raise RuntimeError(
                    {
                        "err": "httprequest.baidubaike.failed",
                        "msg": _("百度百科查询失败"),
                    }
                )
        elif provider_key == douban.KEY:
            mi.douban_id = provider_value
            api = douban.DoubanBookApi(
                CONF["douban_apikey"],
                CONF["douban_baseurl"],
                copy_image=True,
                manual_select=False,
                maxCount=1,
            )
            try:
                refer_mi = api.get_book(mi)
                # 检查豆瓣封面是否获取成功
                if refer_mi and not refer_mi.cover_data:
                    # 封面获取失败，保留本地原有的封面数据
                    refer_mi.cover_data = mi.cover_data
                    # 记录日志
                    logging.info("豆瓣封面获取失败，保留本地原有封面")
            except Exception as e:
                logging.error("获取豆瓣书籍信息失败: %s", e)
                raise RuntimeError({"err": "httprequest.douban.failed", "msg": _("豆瓣接口查询失败")})
        elif provider_key == youshu.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = youshu.YoushuApi(copy_image=True)
            try:
                refer_mi = api.get_book(title)
            except Exception as e:
                logging.error("获取优书网书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.youshu.failed", "msg": _("优书网查询失败")})
        elif provider_key == tomato.KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = tomato.TomatoNovelApi(copy_image=True)
            try:
                refer_mi = api.get_book(title)
            except Exception as e:
                logging.error("获取番茄小说书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.tomato.failed", "msg": _("番茄小说查询失败")})
        elif provider_key == calibre.KEY:
            if mi.isbn:
                try:
                    refer_mi = calibre.CalibreMetadataApi.get_book_by_isbn(mi.isbn)
                except Exception as e:
                    logging.error("获取 Calibre 书籍信息失败（ISBN）：%s", e)
                    refer_mi = None
                if refer_mi:
                    cover_url = getattr(refer_mi, "cover_url", None)
                    if cover_url:
                        try:
                            refer_mi.cover_data = calibre.CalibreMetadataApi.get_cover(cover_url)
                        except Exception as e:
                            logging.error("获取 Calibre 封面失败：%s", e)
            if not refer_mi:
                try:
                    refer_mi = calibre.CalibreMetadataApi.get_book_by_title(mi.title, authors=mi.authors)
                except Exception as e:
                    logging.error("获取 Calibre 书籍信息失败（书名）：%s", e)
                    raise RuntimeError({"err": "httprequest.calibre.failed", "msg": _("Calibre 查询失败")})
        elif provider_key == xhsd.KEY:
            api = xhsd.XhsdBookApi(copy_image=True)
            try:
                refer_mi = api.get_book(mi.isbn or mi.title)
            except Exception as e:
                logging.error("获取新华书店书籍信息失败：%s", e)
                raise RuntimeError({"err": "httprequest.xhsd.failed", "msg": _("新华书店查询失败")})
        elif provider_key == AI_KEY:
            title = re.sub("[(（].*", "", mi.title)
            api = AIBookApi(
                api_url=CONF.get("ai_api_url", "https://api.openai.com/v1/chat/completions"),
                api_key=CONF.get("ai_api_key", ""),
                model=CONF.get("ai_model", "gpt-3.5-turbo"),
                use_thinking=CONF.get("ai_use_thinking", False),
                copy_image=True,
            )
            try:
                refer_mi = api.get_book(title, mi.authors[0] if mi.authors else None)
            except Exception as e:
                logging.error("获取 AI 书籍信息失败：%s", e)
                raise RuntimeError(
                    {
                        "err": "httprequest.ai.failed",
                        "msg": _("AI 查询失败"),
                    }
                )
        else:
            raise RuntimeError(
                {
                    "err": "params.provider_key.not_support",
                    "msg": _("不支持该provider_key"),
                }
            )

        # 确保返回值有效
        if not refer_mi:
            raise RuntimeError({"err": "plugin.fail", "msg": _("插件拉取信息异常，请重试")})

        return refer_mi

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        item = self.session.query(Item).filter(Item.book_id == book_id).first()
        if item and item.scope == "private":
            if item.collector_id != self.user_id():
                return {"err": "book.not_found", "msg": _("书籍不存在")}
        mi = self.db.get_metadata(book_id, index_is_id=True)
        books = self.plugin_search_books(mi)
        keys = [
            "cover_url",
            "source",
            "website",
            "title",
            "author",
            "author_sort",
            "publisher",
            "isbn",
            "comments",
            "provider_key",
            "provider_value",
        ]
        rsp = []
        logging.info("开始处理 %d 个书籍信息源", len(books))

        for i, b in enumerate(books):
            # 处理 Metadata 对象
            if hasattr(b, "title") and hasattr(b, "authors"):
                # 将 Metadata 对象转换为字典
                b_dict = {
                    "title": b.title,
                    "authors": b.authors,
                    "author": b.author if hasattr(b, "author") else b.authors[0] if b.authors else "",
                    "author_sort": b.author_sort if hasattr(b, "author_sort") else "",
                    "publisher": b.publisher if hasattr(b, "publisher") else "",
                    "isbn": b.isbn if hasattr(b, "isbn") else "",
                    "comments": b.comments if hasattr(b, "comments") else "",
                    "cover_url": b.cover_url if hasattr(b, "cover_url") else "",
                    "source": b.source if hasattr(b, "source") else "",
                    "website": b.website if hasattr(b, "website") else "",
                    "provider_key": b.provider_key if hasattr(b, "provider_key") else "",
                    "provider_value": b.provider_value if hasattr(b, "provider_value") else "",
                    "pubdate": b.pubdate if hasattr(b, "pubdate") else None,
                }
                b = b_dict
            # 确保 b 是字典对象
            elif not isinstance(b, dict):
                logging.warning(
                    "跳过第 %d 个书籍信息：类型不符 [type=%s, value=%r]",
                    i,
                    type(b).__name__,
                    b,
                )
                continue

            # 检查必要的字段
            if "title" not in b or not b["title"]:
                logging.warning("跳过第 %d 个书籍信息：缺少必要字段 title", i)
                continue

            try:
                d = dict((k, b.get(k, "")) for k in keys)
                pubdate = b.get("pubdate")
                d["pubyear"] = pubdate.strftime("%Y") if pubdate else ""

                # 过滤掉百度百科的无详细介绍结果
                if d["title"].startswith("百度百科"):
                    logging.info("跳过百度百科无详细介绍的书籍：%s", d["title"])
                    continue

                if not d["comments"]:
                    d["comments"] = _("无详细介绍")

                # 记录成功处理的书籍信息
                logging.debug(
                    "成功处理书籍 [%s] by %s (provider=%s)",
                    d["title"],
                    d["author"],
                    d.get("provider_key", "unknown"),
                )
                rsp.append(d)
            except Exception as e:
                logging.error(
                    "处理第 %d 个书籍信息时出错 [title=%s, error=%s]",
                    i,
                    b.get("title", "unknown"),
                    e,
                )
                continue

        logging.info("成功处理 %d/%d 个书籍信息", len(rsp), len(books))
        return {"err": "ok", "books": rsp}

    @js
    @auth
    def post(self, id):
        provider_key = self.get_argument("provider_key", "error")
        provider_value = self.get_argument("provider_value", "")
        only_meta = self.get_argument("only_meta", "")
        only_cover = self.get_argument("only_cover", "")
        book_id = int(id)
        if not provider_key:
            return {
                "err": "params.provider_key.invalid",
                "msg": _("provider_key参数错误"),
            }
        if not provider_value:
            return {
                "err": "params.provider_key.invalid",
                "msg": _("provider_value参数错误"),
            }
        if only_meta == "yes" and only_cover == "yes":
            return {"err": "params.conflict", "msg": _("参数冲突")}

        mi = self.db.get_metadata(book_id, index_is_id=True)
        if not mi:
            return {"err": "params.book.invalid", "msg": _("书籍不存在")}
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限")}

        original_cover_data = mi.cover_data
        try:
            refer_mi = self.plugin_get_book_meta(provider_key, provider_value, mi)
        except RuntimeError as e:
            return e.args[0] if e.args else {"err": "unknown.error", "msg": str(e)}

        cover_fallback = False
        if only_cover == "yes":
            # 仅设置封面，检查封面数据是否有效
            if refer_mi.cover_data and len(refer_mi.cover_data) > 0:
                mi.cover_data = refer_mi.cover_data
            else:
                return {"err": "cover.empty", "msg": _("获取到的封面数据为空")}
        else:
            if only_meta == "yes":
                refer_mi.cover_data = None
            else:
                # 更新前检查封面数据是否有效
                if not refer_mi.cover_data and original_cover_data:
                    # 豆瓣封面获取失败，使用了本地原有封面
                    refer_mi.cover_data = original_cover_data
                    cover_fallback = True
                elif refer_mi.cover_data and len(refer_mi.cover_data) == 0:
                    refer_mi.cover_data = None
            if len(refer_mi.tags) == 0 and len(mi.tags) == 0:
                ts = []
                for tag in CONF["BOOK_NAV"].replace("=", "/").replace("\n", "/").split("/"):
                    if tag in refer_mi.title or tag in refer_mi.comments:
                        ts.append(tag)
                    elif tag in refer_mi.authors:
                        ts.append(tag)
                if len(ts) > 0:
                    mi.tags += ts[:8]
                    logging.info("tags are %s" % ",".join(mi.tags))
                    self.db.set_tags(book_id, mi.tags)
            mi.smart_update(refer_mi, replace_metadata=True)

        self.db.set_metadata(book_id, mi)
        if cover_fallback:
            return {
                "err": "ok",
                "msg": _("书籍信息更新成功，但豆瓣封面获取失败，已使用本地原有封面"),
            }
        return {"err": "ok"}


class BookEdit(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid)
        bid = book["id"]
        if isinstance(book["collector"], dict):
            cid = book["collector"]["id"]
        else:
            cid = book["collector"].id
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        # 处理封面图上传
        if self.request.files:
            return self.upload_cover(bid)

        # 处理常规编辑
        data = tornado.escape.json_decode(self.request.body)
        mi = self.db.get_metadata(bid, index_is_id=True)
        KEYS = [
            "authors",
            "title",
            "comments",
            "tags",
            "publisher",
            "isbn",
            "series",
            "rating",
            "language",
        ]
        for key, val in data.items():
            if key in KEYS:
                # 处理DELETE魔术字符串
                is_delete = False
                # 检查字符串类型
                if val == "__DELETE__":
                    is_delete = True
                # 检查列表类型
                elif isinstance(val, list) and len(val) == 1 and val[0] == "__DELETE__":
                    is_delete = True

                if is_delete:
                    # 设置为空值，不同字段类型使用不同的空值
                    if key in ["authors", "tags"]:
                        # 列表类型使用空列表
                        # mi.set(key, [" "])
                        pass
                    else:
                        # 其他类型使用空字符串
                        mi.set(key, " ")
                else:
                    mi.set(key, val)

        if data.get("pubdate", None):
            # 处理DELETE魔术字符串
            if data["pubdate"] == "__DELETE__":
                mi.set("pubdate", None)
            else:
                content = douban.str2date(data["pubdate"])
                if content is None:
                    return {
                        "err": "params.pudate.invalid",
                        "msg": _("出版日期参数错误，格式应为 2019-05-10或2019-05或2019年或2019"),
                    }
                mi.set("pubdate", content)

        if "tags" in data and not data["tags"]:
            self.db.set_tags(bid, [])

        self.db.set_metadata(bid, mi)
        return {"err": "ok", "msg": _("更新成功")}

    def upload_cover(self, bid):
        """处理封面图上传"""
        book = self.get_book(bid)
        bid = book["id"]

        # 获取上传的文件
        if "cover" not in self.request.files:
            return {"err": "params.cover.required", "msg": _("请选择要上传的封面图")}

        file_info = self.request.files["cover"][0]
        file_data = file_info["body"]
        file_name = decode_filename(file_info["filename"])

        # 检查文件类型
        allowed_types = [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/jpg",
            "image/pjpeg",
            "image/x-png",
        ]
        file_type = file_info["content_type"]
        if file_type not in allowed_types:
            # 尝试从文件名后缀判断
            file_ext = file_name.split(".")[-1].lower() if "." in file_name else ""
            if file_ext not in [
                "jpg",
                "jpeg",
                "png",
                "gif",
                "pjp",
                "jpe",
                "pjpeg",
                "jfif",
            ]:
                return {
                    "err": "params.cover.type",
                    "msg": _("只允许上传JPG、JPEG、PNG、GIF、PJP、PJPEG、JFIF、JPE格式的图片"),
                }

        # 检查文件大小（限制为5MB）
        if len(file_data) > 5 * 1024 * 1024:
            return {"err": "params.cover.size", "msg": _("封面图大小不能超过5MB")}

        # 用魔数检测实际格式，不依赖用户可控的 content_type 或文件名
        IMAGE_MAGIC = {
            "jpeg": b"\xff\xd8\xff",
            "png": b"\x89PNG\r\n\x1a\n",
            "gif": b"GIF8",
        }
        file_ext = None
        for ext, magic in IMAGE_MAGIC.items():
            if file_data.startswith(magic):
                file_ext = ext
                break
        if file_ext is None:
            return {
                "err": "params.cover.type",
                "msg": _("只允许上传 JPEG、PNG、GIF 格式的图片"),
            }

        try:
            # 获取书籍元数据
            mi = self.db.get_metadata(bid, index_is_id=True)

            # 设置封面数据
            mi.cover_data = (file_ext, file_data)

            # 强制更新书籍的timestamp，确保封面图URL变化
            from datetime import datetime

            mi.timestamp = datetime.utcnow()
            mi.last_modified = datetime.utcnow()

            # 保存元数据
            self.db.set_metadata(bid, mi)

            # 清除缓存，确保下次获取书籍信息时从数据库读取最新数据
            self.cache.invalidate()

            return {"err": "ok", "msg": _("封面图上传成功")}
        except Exception as e:
            import traceback

            logging.error(f"上传封面图失败: {e}")
            logging.error(f"错误堆栈: {traceback.format_exc()}")
            # 尝试直接返回成功，因为实际封面可能已经保存
            return {"err": "ok", "msg": _("封面图上传成功")}


class BookDelete(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid)
        bid = book["id"]
        if isinstance(book["collector"], dict):
            cid = book["collector"]["id"]
        else:
            cid = book["collector"].id
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        if not self.current_user.can_delete() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        self.db.delete_book(bid)
        # 同步清理该书籍对应的 ScanFile 记录，避免重新导入时因哈希重复被误判为 drop
        from webserver.models import ScanFile

        self.session.query(ScanFile).filter(ScanFile.book_id == bid).delete()
        self.session.commit()
        self.add_msg("success", _("删除书籍《%s》") % book["title"])
        return {"err": "ok", "msg": _("删除成功")}


class BookDownload(BaseHandler, web.StaticFileHandler):
    def send_error_of_not_invited(self):
        self.set_header("WWW-Authenticate", "Basic")
        self.set_status(401)
        raise web.Finish()

    def initialize(self):
        self.root = "/"
        self.default_filename = None
        self.is_opds = self.get_argument("from", "") == "opds"
        BaseHandler.initialize(self)

    def prepare(self):
        BaseHandler.prepare(self)
        if not CONF["ALLOW_GUEST_DOWNLOAD"] and not self.current_user:
            if self.is_opds:
                return self.send_error_of_not_invited()
            else:
                return self.redirect("/login")

        if self.current_user:
            if self.current_user.can_save():
                if not self.current_user.is_active():
                    raise web.HTTPError(403, reason=_("无权操作，请先登录注册邮箱激活账号。"))
            else:
                raise web.HTTPError(403, reason=_("无权操作"))

    def parse_url_path(self, url_path: str) -> str:
        filename = url_path.split("/")[-1]
        bid, fmt = filename.split(".")
        fmt = fmt.lower()
        logging.error("download %s bid=%s, fmt=%s" % (filename, bid, fmt))
        book = self.get_book(bid)
        book_id = book["id"]
        self.user_history("download_history", book)
        self.count_increase(book_id, count_download=1)
        if "fmt_%s" % fmt not in book:
            raise web.HTTPError(404, reason=_("%s格式无法下载" % fmt))

        path = book["fmt_%s" % fmt]
        book["fmt"] = fmt
        book["title"] = urllib.parse.quote_plus(book["title"])
        fname = "%(id)d-%(title)s.%(fmt)s" % book
        att = "attachment; filename=\"%s\"; filename*=UTF-8''%s" % (fname, fname)
        if self.is_opds:
            att = 'attachment; filename="%(id)d.%(fmt)s"' % book

        # PDF 文件使用 application/pdf，允许浏览器内联预览（供 pdfjs 等在线阅读器使用）
        # 其他格式使用 application/octet-stream 强制下载
        if fmt == "pdf":
            self.set_header("Content-Type", "application/pdf")
            # 在线阅读时不附加 Content-Disposition attachment，避免触发下载
            if not self.is_opds:
                self.set_header("Content-Disposition", f'inline; filename="{fname}"'.encode("UTF-8"))
            else:
                self.set_header("Content-Disposition", att.encode("UTF-8"))
        else:
            self.set_header("Content-Disposition", att.encode("UTF-8"))
            self.set_header("Content-Type", "application/octet-stream")
        return path

    @classmethod
    def get_absolute_path(cls, root: str, path: str) -> str:
        return path


class BookNav(ListHandler):
    @js
    def get(self):
        tagmap = self.all_tags_with_count()
        navs = []
        done = set()
        for line in CONF["BOOK_NAV"].split("\n"):
            line = utils.super_strip(line)
            p = line.split("=")
            if len(p) != 2:
                continue
            h1, tags = p
            tags = [v.strip() for v in tags.split("/")]
            done.update(tags)
            tag_items = [{"name": v, "count": tagmap.get(v, 0)} for v in tags if tagmap.get(v, 0) > 0]
            if tag_items:
                navs.append({"legend": h1, "tags": tag_items})

        tag_items = [{"name": tag, "count": cnt} for tag, cnt in tagmap.items() if tag not in done]
        navs.append({"legend": _("其他"), "tags": tag_items})

        return {"err": "ok", "navs": navs}


class RecentBook(ListHandler):
    @js
    def get(self):
        title = _("新书推荐")
        ids = self.books_by_id()
        return self.render_book_list([], ids=ids, title=title, sort_by_id=True)


class LibraryBook(ListHandler):
    @js
    def get(self):
        title = _("书库")

        # 获取筛选参数
        publisher = self.get_argument("publisher", None)
        author = self.get_argument("author", None)
        tag = self.get_argument("tag", None)
        book_format = self.get_argument("format", None)

        # 初始获取所有书籍ID
        ids = self.books_by_id()

        # 应用筛选条件
        if publisher and publisher != "全部":
            # 按出版社筛选
            publisher_books = self.db.search_getting_ids(f"publisher:'{publisher}'", "")
            ids = list(set(ids) & set(publisher_books))

        if author and author != "全部":
            # 按作者筛选
            author_books = self.db.search_getting_ids(f"author:'{author}'", "")
            ids = list(set(ids) & set(author_books))

        if tag and tag != "全部":
            # 按标签筛选
            tag_books = self.db.search_getting_ids(f"tag:'{tag}'", "")
            ids = list(set(ids) & set(tag_books))

        if book_format and book_format != "全部":
            # 按文件格式筛选
            books = self.get_books(ids=ids)
            ids = [book["id"] for book in books if f"fmt_{book_format.lower()}" in book]

        return self.render_book_list([], ids=ids, title=title, sort_by_id=True)


class SearchBook(ListHandler):
    @js
    def get(self):
        name = self.get_argument("name", "")
        if not name.strip():
            return {"err": "params.invalid", "msg": _("请输入搜索关键字")}

        title = _("搜索：%(name)s") % {"name": name}
        ids = self.cache.search(name)
        return self.render_book_list([], ids=ids, title=title)


class HotBook(ListHandler):
    @js
    def get(self):
        title = _("热度榜单")
        user_id = self.user_id()

        # 过滤掉其他用户标记为 scope=private 的书籍
        if user_id:
            db_items = (
                self.session.query(Item)
                .filter(Item.count_visit > 1, (Item.scope != "private") | (Item.collector_id == user_id))
                .order_by(Item.count_download.desc())
            )
        else:
            db_items = (
                self.session.query(Item)
                .filter(Item.count_visit > 1, Item.scope != "private")
                .order_by(Item.count_download.desc())
            )

        count = db_items.count()
        start = self.get_argument_start()
        delta = 60
        page_max = int(count / delta)
        page_now = int(start / delta)
        pages = []
        for p in range(page_now - 3, page_now + 3):
            if 0 <= p and p <= page_max:
                pages.append(p)
        items = db_items.limit(delta).offset(start).all()
        ids = [item.book_id for item in items]
        books = self.get_books(ids=ids)
        self.do_sort(books, "count_download", False)
        return self.render_book_list(books, title=title)


def decode_filename(filename):
    """处理中文文件名编码问题
    Tornado 默认以 latin-1 解析 multipart/form-data 中的 filename，
    当文件名包含中文等非 ASCII 字符时，需要尝试解码为 UTF-8
    """
    if not filename:
        return filename

    try:
        # 尝试将 latin-1 编码的字节重新解释为 UTF-8
        # 这适用于 Tornado 将 UTF-8 字节错误解析为 latin-1 的情况
        return filename.encode("latin1").decode("utf-8")
    except (UnicodeDecodeError, UnicodeEncodeError, AttributeError):
        # 如果已经是 UTF-8 或解码失败，保持原样
        return filename


class BookUpload(BaseHandler):
    def get_upload_file(self):
        # for unittest mock
        p = self.request.files["ebook"][0]
        filename = decode_filename(p["filename"])
        filename = urllib.parse.unquote(filename)
        return (filename, p["body"])

    @js
    def post(self):
        from calibre.ebooks.metadata.meta import get_metadata

        # 检查访客上传权限
        if not self.current_user:
            if not CONF.get("ALLOW_GUEST_UPLOAD", False):
                return {"err": "user.need_login", "msg": _("请先登录")}
        elif not self.current_user.can_upload():
            return {"err": "permission", "msg": _("无权操作")}
        name, data = self.get_upload_file()
        logging.error("upload book name = " + repr(name))
        # strip path components to prevent directory traversal
        name = os.path.basename(name)
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return {"err": "params.filename", "msg": _("文件名不合法")}
        fmt = fmt.lower()

        # validate format against whitelist before touching disk
        from webserver.handlers.scan import SCAN_EXT

        if fmt not in SCAN_EXT:
            return {"err": "params.format", "msg": _("不支持的文件格式: %s") % fmt}

        # validate magic bytes for structured formats
        EBOOK_MAGIC = {
            "epub": b"PK\x03\x04",
            "pdf": b"%PDF",
        }
        if fmt in EBOOK_MAGIC and not data.startswith(EBOOK_MAGIC[fmt]):
            return {"err": "params.format", "msg": _("文件内容与格式不匹配")}

        # save file
        upload_dir = os.path.realpath(CONF["upload_path"])
        fpath = os.path.realpath(os.path.join(upload_dir, name))
        if not fpath.startswith(upload_dir + os.sep) and fpath != upload_dir:
            return {"err": "params.filename", "msg": _("文件名不合法")}
        with open(fpath, "wb") as f:
            f.write(data)
        logging.debug("save upload file into [%s]", fpath)

        # read ebook meta
        with open(fpath, "rb") as stream:
            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
            mi.title = utils.super_strip(mi.title)
            # 保留所有作者信息，与批量导入逻辑保持一致
            mi.authors = [utils.super_strip(s) for s in mi.authors]

        # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
        if fmt in ["txt", "pdf"]:
            # 使用文件名提取标题，与批量导入逻辑保持一致
            fname = os.path.basename(fpath)
            mi.title = fname.replace("." + fmt, "")
            mi.authors = [_("佚名")]
            # 确保author_sort也被设置，与批量导入逻辑保持一致
            mi.author_sort = mi.authors[0] if mi.authors else ""

        logging.info("upload mi.title = " + repr(mi.title))
        books = self.db.books_with_same_title(mi)
        same_author_book_id = None
        different_author_books = []

        if books:
            # 区分同名同作者和同名不同作者的书籍
            for b in self.db.get_data_as_dict(ids=books):
                book_authors = b.get("authors", [])
                mi_authors = mi.authors

                # 检查作者是否相同
                if set(book_authors) == set(mi_authors):
                    same_author_book_id = b.get("id")
                    # 检查是否已存在相同格式
                    if fmt.upper() in b.get("available_formats", ""):
                        return {
                            "err": "samebook",
                            "msg": _("同名同作者书籍《%s》已存在这一图书格式 %s") % (mi.title, fmt),
                            "book_id": same_author_book_id,
                        }
                else:
                    different_author_books.append(b)

        # 如果存在同名同作者书籍，添加格式到该书籍
        if same_author_book_id:
            logging.info("import [%s] from %s with format %s", repr(mi.title), fpath, fmt)
            self.db.add_format(same_author_book_id, fmt.upper(), fpath, True)
            book_id = same_author_book_id
        else:
            fpaths = [fpath]
            book_id = self.db.import_book(mi, fpaths)
            self.user_history("upload_history", {"id": book_id, "title": mi.title})
            item = Item()
            item.book_id = book_id
            item.collector_id = self.user_id()
            try:
                item.create_time = self.cache.field_for("timestamp", book_id)
            except Exception:
                item.create_time = datetime.datetime.now()
            item.save()
        self.add_msg("success", _("导入书籍成功！"))
        AutoFillService().auto_fill(book_id)
        return {"err": "ok", "book_id": book_id}


class BookRead(BaseHandler):
    def get(self, id):
        if not CONF["ALLOW_GUEST_READ"] and not self.current_user:
            return self.redirect("/login")

        if self.current_user:
            if self.current_user.can_read():
                if not self.current_user.is_active():
                    raise web.HTTPError(403, reason=_("无权在线阅读，请先登录注册邮箱激活账号。"))
            else:
                raise web.HTTPError(403, reason=_("无权在线阅读"))

        book = self.get_book(id)
        book_id = book["id"]
        self.user_history("read_history", book)
        self.count_increase(book_id, count_download=1)

        if "fmt_pdf" in book:
            # PDF类书籍需要检查下载权限。
            if not CONF["ALLOW_GUEST_DOWNLOAD"] and not self.current_user:
                return self.redirect("/login")

            if self.current_user and not self.current_user.can_save():
                raise web.HTTPError(403, reason=_("无权在线阅读PDF类书籍"))

            pdf_url = urllib.parse.quote_plus(self.api_url + "/api/book/%(id)d.PDF" % book)
            pdf_reader_url = CONF["PDF_VIEWER"] % {"pdf_url": pdf_url}
            return self.redirect(pdf_reader_url)

        if "fmt_txt" in book:
            # TXT有专门的阅读器
            txt_reader_url = f"/book/{book_id}/readtxt"
            return self.redirect(txt_reader_url)

        # 其他格式，转换为EPUB进行在线阅读
        for fmt in ["epub", "mobi", "azw", "azw3", "txt"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if not fpath:
                continue

            if fmt != "epub":
                ConvertService().convert_and_save(self.user_id(), book, fpath, "epub")

            # epub_dir is for javascript
            epub_dir = "/get/extract/%s" % book["id"]
            return self.html_page(
                "book/" + CONF["EPUB_VIEWER"],
                {
                    "book": book,
                    "epub_dir": epub_dir,
                    "is_ready": (fmt == "epub"),
                    "CANDLE_READER_SERVER": CONF["CANDLE_READER_SERVER"],
                },
            )
        raise web.HTTPError(404, reason=_("抱歉，在线阅读器暂不支持该格式的书籍"))


class TxtRead(BaseHandler):
    @js
    @auth
    def get(self):
        bid = self.get_argument("id", "")
        book = self.get_book(bid)
        start = int(self.get_argument("start", "0"))
        end = int(self.get_argument("end", "-1"))
        logging.info(book)
        fpath = book.get("fmt_txt", None)
        if not fpath:
            return {"err": "format error", "msg": "非txt书籍"}
        with open(fpath, mode="rb") as file:
            # 移动文件指针到起始位置
            file.seek(start)
            if end == -1:
                content = file.read()
            else:
                # 读取从起始位置到结束位置的内容
                content = file.read(end - start)
        if not content:
            return {"err": "format error", "msg": "空文件"}
        encode = get_content_encoding(content)
        content = content.decode(encoding=encode, errors="ignore").replace("\r", "").replace("\n", "<br>")
        return {"err": "ok", "content": content}


class BookTxtInit(BaseHandler):
    @js
    def get(self):
        bid = self.get_argument("id", "")
        test_ready = self.get_argument("test", "")
        book = self.get_book(bid)
        fpath = book.get("fmt_txt", None)
        if not fpath:
            return {"err": "format error", "msg": "非txt书籍"}
        # 解压后的目录
        fdir = os.path.join(CONF["extract_path"], str(book["id"]))
        # txt 解析出的目录文件
        content_path = fdir + "/content.json"
        is_ready = os.path.isfile(content_path)
        if is_ready:
            with open(content_path, "r", encoding="utf8") as f:
                meta = json.loads(f.read())
            return {
                "err": "ok",
                "msg": "已解析",
                "data": {
                    "content": meta["toc"],
                    "encoding": meta["encoding"],
                    "name": book["title"],
                },
            }
        if test_ready != "0":
            return {"err": "ok", "msg": "未解析完成"}

        # 若未解析则计算预计等待时间，至少2分钟
        wait = min(120, os.path.getsize(fpath) / (1024 * 1024) * 15)
        ExtractService().parse_txt_content(bid, fpath)
        que_len = ExtractService().get_queue("parse_txt_content").qsize()
        return {
            "err": "ok",
            "msg": "已加入队列",
            "data": {
                "wait": wait,
                "name": book["title"],
                "path": content_path,
                "que": que_len,
            },
        }


class BookSendToDevice(BaseHandler):
    @js
    def post(self, bid):
        """发送书籍到指定设备"""
        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": _("书籍已不存在")}

        # 检查用户权限
        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _("请先登录")}
            else:
                if not self.current_user.can_push():
                    return {"err": "permission", "msg": _("无权操作")}
                elif not self.current_user.is_active():
                    return {"err": "permission", "msg": _("无权操作，请先激活账号。")}

        # 解析请求参数
        try:
            data = tornado.escape.json_decode(self.request.body)
            device_type = data.get("device_type", "").lower()
            device_url = data.get("device_url", "")
            mailbox = data.get("mailbox", "")
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        # Kindle设备使用邮箱地址，其他设备使用device_url
        if device_type == "kindle":
            if not mailbox:
                return {"err": "params.missing", "msg": _("Kindle设备需要提供邮箱地址")}
        else:
            if not device_type or not device_url:
                return {"err": "params.missing", "msg": _("设备类型和设备地址不能为空")}

        # 支持的设备类型
        supported_types = ["duokan", "ireader", "hanwang", "boox", "dangdang", "kindle", "purelibro"]
        if device_type not in supported_types:
            return {"err": "device.unsupported", "msg": _("不支持的设备类型: %s") % device_type}

        # Kindle设备通过邮件发送
        if device_type == "kindle":
            return self._send_to_kindle(book, book_id, mailbox)
        else:
            return self._send_to_other_device(book, book_id, device_type, device_url)

    def _send_to_kindle(self, book, book_id, mail_to):
        """通过邮件发送书籍到Kindle设备"""
        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)

        # epub、pdf、txt格式可以直接发送，不需要转换
        for fmt in ["epub", "pdf", "txt"]:
            fmt_key = "fmt_%s" % fmt
            if fmt_key in book:
                fpath = book[fmt_key]
                MailService().send_book(self.user_id(), self.site_url, book, mail_to, fmt, fpath)
                self.add_msg(
                    "success",
                    _("服务器正在推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
                )
                return {"err": "ok", "msg": _("服务器后台正在推送。您可关闭此窗口，继续浏览其他书籍。")}

        # 如果没有可直接发送的格式，检查是否有azw3或mobi格式需要转换
        if "fmt_azw3" in book or "fmt_mobi" in book:
            fmt = "azw3" if "fmt_azw3" in book else "mobi"
            logging.info("[SEND_TO_KINDLE] found %s format, needs conversion to epub", fmt)
            ConvertService().convert_and_send(self.user_id(), self.site_url, book, mail_to)
            self.add_msg(
                "success",
                _("服务器正在推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
            )
            return {"err": "ok", "msg": _("服务器正在转换格式，稍后将自动推送。您可关闭此窗口，继续浏览其他书籍。")}

        # 没有Kindle支持的格式
        return {"err": "format.not_supported", "msg": _("书籍没有Kindle支持的格式!")}

    def _send_to_other_device(self, book, book_id, device_type, device_url):
        """通过WiFi上传发送书籍到其他设备"""

        # 查找合适的文件格式（优先级：epub > azw3 > pdf > txt）
        file_path = None
        file_format = None
        format_priority = ["epub", "azw3", "pdf", "txt"]
        for fmt in format_priority:
            fmt_key = "fmt_%s" % fmt
            if fmt_key in book:
                file_path = book[fmt_key]
                file_format = fmt
                break

        if not file_path:
            return {"err": "file.not_found", "msg": _("书籍没有支持的文件格式（epub/azw3/pdf/txt）")}

        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {"err": "file.missing", "msg": _("书籍文件不存在: %s") % file_path}

        # 导入对应的上传器
        try:
            from webserver.plugins.sending.uploader import (
                BooxUploader,
                DangdangUploader,
                DuokanUploader,
                HanwangUploader,
                IReaderUploader,
                PureLibroUploader,
            )

            uploader_map = {
                "duokan": DuokanUploader,
                "ireader": IReaderUploader,
                "hanwang": HanwangUploader,
                "boox": BooxUploader,
                "dangdang": DangdangUploader,
                "purelibro": PureLibroUploader,
            }

            uploader_class = uploader_map.get(device_type)
            if not uploader_class:
                return {"err": "uploader.not_found", "msg": _("找不到对应的上传器: %s") % device_type}

            # 创建上传器实例
            book_name = book.get("title", "")
            if len(book_name) > 120:
                book_name = ""
            if not book_name:
                book_name = None
            else:
                book_name += os.path.splitext(file_path)[-1]
            uploader = uploader_class(file_path, file_name=book_name)

            # 构建设备上传URL
            if not device_url.startswith(("http://", "https://")):
                device_url = "http://" + device_url

            # 执行上传
            logging.info(
                "[SEND_TO_DEVICE] sending book %s (%s) to device %s: %s", book_id, file_format, device_type, device_url
            )
            result = uploader.upload(device_url)

            if result.get("success"):
                logging.info("[SEND_TO_DEVICE] success: %s -> %s", book_id, device_type)
                return {"err": "ok", "msg": _("书籍发送成功")}
            else:
                error_type = result.get("error_type", "unknown")
                error_msg = result.get("message", _("发送失败"))

                if error_type == "connection":
                    return {"err": "connection.failed", "msg": _("无法连接到设备。请确认IP地址正确，且设备已开启WiFi上传功能")}
                elif error_type == "timeout":
                    return {"err": "upload.timeout", "msg": _("上传超时。请检查网络连接和设备状态")}
                elif error_type == "http":
                    status_code = result.get("status_code", 0)
                    return {"err": "upload.failed", "msg": _("上传失败 (HTTP %d)。请查看日志获取详细信息") % status_code}
                else:
                    return {"err": "upload.error", "msg": _("上传过程出错: %s。请查看日志获取详细信息") % error_msg}

        except ImportError as e:
            logging.error("[SEND_TO_DEVICE] import uploader failed: %s", e)
            return {"err": "uploader.import_error", "msg": _("设备上传功能不可用")}
        except Exception as e:
            logging.error("[SEND_TO_DEVICE] send failed: %s", e)
            return {"err": "upload.error", "msg": _("发送过程出错，请查看日志获取详细信息")}


class BookSendToMail(BaseHandler):
    @js
    def post(self, bid):
        """发送书籍到指定邮箱"""
        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "book.not_found", "msg": _("书籍已不存在")}

        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _("请先登录")}
            else:
                if not self.current_user.can_push():
                    return {"err": "permission", "msg": _("无权限进行推送，请联系管理员检查权限")}
                elif not self.current_user.is_active():
                    return {"err": "permission", "msg": _("无权限进行操作，请先激活账号。")}

        # 解析请求参数
        try:
            data = tornado.escape.json_decode(self.request.body)
            mail_to = data.get("email", "").strip()
        except Exception:
            return {"err": "params.invalid", "msg": _("没有指定邮箱地址")}

        if not mail_to:
            return {"err": "params.missing", "msg": _("邮箱地址不能为空")}

        # 验证邮箱地址格式
        email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
        if not re.match(email_pattern, mail_to):
            return {"err": "email.invalid", "msg": _("邮箱地址格式不正确")}

        # 按优先级查找可用格式: EPUB > AZW3 > PDF > MOBI > TXT
        format_priority = ["epub", "azw3", "pdf", "mobi", "txt"]
        file_path = None
        file_format = None

        for fmt in format_priority:
            fmt_key = "fmt_%s" % fmt
            if fmt_key in book:
                file_path = book[fmt_key]
                file_format = fmt
                break

        if not file_path:
            return {"err": "format.not_found", "msg": _("书籍没有支持的文件格式（EPUB/AZW3/PDF/MOBI/TXT）")}

        # 检查文件是否存在
        if not os.path.exists(file_path):
            return {"err": "file.missing", "msg": _("书籍文件不存在")}

        # 检查文件大小（50MB = 52428800 bytes）
        file_size = os.path.getsize(file_path)
        max_size = 50 * 1024 * 1024  # 50MB
        if file_size > max_size:
            size_mb = file_size / (1024 * 1024)
            return {"err": "file.too_large", "msg": _("附件过大（%.1fMB），邮件附件大小不能超过50MB") % size_mb}

        # 记录推送历史和增加统计
        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)
        logging.info("[SEND_TO_MAIL] sending book %s (%s, %s bytes) to %s", book_id, file_format, file_size, mail_to)
        MailService().send_book(self.user_id(), self.site_url, book, mail_to, file_format, file_path)

        self.add_msg(
            "success",
            _("已开始推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
        )

        return {"err": "ok", "msg": _("后台正在推送，稍后可以刷新页面，在通知消息中查看结果。")}


class BookSetScope(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(int(bid))
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}

        bid = book["id"]
        if isinstance(book["collector"], dict):
            cid = book["collector"]["id"]
        else:
            cid = book["collector"].id
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        succeed = False
        try:
            item = self.session.query(Item).filter(Item.book_id == bid).first()
            if item:
                item.scope = "public" if item.scope == "private" else "private"
            else:
                item = Item()
                item.book_id = bid
                item.scope = "private"
                try:
                    item.create_time = self.cache.field_for("timestamp", bid)
                except Exception:
                    item.create_time = datetime.datetime.now()
                self.session.add(item)
            self.session.commit()
            succeed = True
        except Exception as e:
            self.session.rollback()
            logging.error("set book %d scope failed: %s" % (bid, e))

        if succeed:
            return {"err": "ok", "msg": _("更新成功")}
        else:
            return {"err": "db.update.failed", "msg": _("更新失败，请稍后再试")}


class BookDeleteFormat(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book = self.get_book(bid, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        bid = book["id"]

        if isinstance(book["collector"], dict):
            cid = book["collector"]["id"]
        else:
            cid = book["collector"].id
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        try:
            data = tornado.escape.json_decode(self.request.body)
            fmt = data.get("format", "").strip().lower()
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        if not fmt:
            return {"err": "params.missing", "msg": _("格式参数不能为空")}

        fmt_key = "fmt_%s" % fmt
        if fmt_key not in book:
            return {"err": "format.not_found", "msg": _("书籍不包含 %s 格式") % fmt.upper()}

        available_formats = book.get("available_formats", [])
        if len(available_formats) <= 1:
            return {"err": "last.format", "msg": _("书籍只有一个格式，无法刪除")}

        try:
            self.cache.remove_formats({bid: [fmt.upper()]})
            self.add_msg("success", _("删除书籍《%s》的%s格式") % (book["title"], fmt))
            return {"err": "ok", "msg": _("删除%s格式成功") % fmt}
        except Exception as e:
            logging.error("删除书籍《%s》的%s格式失败: %s", book["title"], fmt, e)
            return {"err": "fail", "msg": _("删除%s格式失败，请查看日志") % fmt}


class BookSeparate(BaseHandler):
    @js
    @auth
    def post(self, bid):
        from calibre.ebooks.metadata.meta import get_metadata

        book_id = int(bid)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}

        if isinstance(book["collector"], dict):
            cid = book["collector"]["id"]
        else:
            cid = book["collector"].id
        if not self.current_user.can_edit() or not (self.is_admin() or self.is_book_owner(book_id, cid)):
            return {"err": "permission", "msg": _("无权操作")}

        try:
            data = tornado.escape.json_decode(self.request.body)
            fmt = data.get("format", "").strip().lower()
        except Exception:
            return {"err": "params.invalid", "msg": _("请求参数格式错误")}

        if not fmt:
            return {"err": "params.missing", "msg": _("格式参数不能为空")}

        fmt_key = "fmt_%s" % fmt
        if fmt_key not in book:
            return {"err": "format.not_found", "msg": _("书籍不包含 %s 格式") % fmt.upper()}

        original_path = book[fmt_key]
        if not os.path.exists(original_path):
            return {"err": "file.missing", "msg": _("格式文件不存在: %s") % original_path}

        available_formats = book.get("available_formats", [])
        if len(available_formats) <= 1:
            return {"err": "last.format", "msg": _("书籍只有一个格式，无法分离")}

        try:
            filename = os.path.basename(original_path)
            upload_path = os.path.join(CONF["upload_path"], filename)

            if os.path.exists(upload_path):
                timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
                name, ext = os.path.splitext(filename)
                upload_path = os.path.join(CONF["upload_path"], f"{name}_{timestamp}{ext}")

            shutil.copy2(original_path, upload_path)
            logging.info("[SEPARATE] Copied format file from %s to %s", original_path, upload_path)

            failed = False
            with open(upload_path, "rb") as stream:
                mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                if mi.title and mi.title == CALIBRE_ERROR_FLAG:
                    logging.error("Failed to get metadata for %s, reason:%s", upload_path, mi.comments)
                    failed = True
                mi.title = utils.super_strip(mi.title)
                if mi.author_sort == "Unknown" and mi.authors and len(mi.authors) > 0:
                    mi.authors = [utils.super_strip(a) for a in mi.authors]
                else:
                    mi.authors = [utils.super_strip(mi.author_sort)]

            if failed:
                return {"err": "book.invalid", "msg": _("此书籍文件无法识别，或者受DRM保护无法处理")}

            if fmt in ["txt", "pdf"]:
                mi.title = filename.replace("." + fmt, "")
                mi.authors = [_("佚名")]

            fpaths = [upload_path]
            new_book_id = self.db.import_book(mi, fpaths)

            if new_book_id is None:
                if os.path.exists(upload_path):
                    os.remove(upload_path)
                return {"err": "book.create.failed", "msg": _("创建新书籍失败")}

            item = Item()
            item.book_id = new_book_id
            item.collector_id = self.user_id()
            self.session.add(item)
            self.session.commit()

            self.cache.remove_formats({book_id: [fmt.upper()]})

            logging.info("[SEPARATE] Successfully separated format %s from book %d to new book %d", fmt, book_id, new_book_id)
            self.add_msg("success", _("成功将 %s 格式分离为新书籍") % fmt.upper())
            return {
                "err": "ok",
                "msg": _("格式分离成功"),
                "original_book_id": book_id,
                "new_book_id": new_book_id,
            }

        except Exception as e:
            logging.error("[SEPARATE] Failed to separate format %s from book %d: %s", fmt, book_id, e)
            if "upload_path" in locals() and os.path.exists(upload_path):
                try:
                    os.remove(upload_path)
                except Exception:
                    pass
            return {"err": "internal", "msg": _("分离格式时发生错误: %s") % str(e)}


class BookSaveMeta(BaseHandler):
    @js
    @auth
    def post(self, bid):
        book_id = int(bid)
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _("无权限，非管理员或书籍所有者无法操作")}

        fmt = self.get_argument("fmt", None)
        return self.save_book_meta(book_id, fmt=fmt)


class BookScoped(BaseHandler):
    @js
    @auth
    def get(self):
        """获取当前用户设为 scope=private 的所有图书信息"""
        user_id = self.user_id()
        title = _("私有书籍")

        # 查询当前用户设为 scope=private 的所有图书，按书籍 ID 倒序排列
        db_items = (
            self.session.query(Item)
            .filter(Item.collector_id == user_id, Item.scope == "private")
            .order_by(Item.book_id.desc())
        )

        try:
            start = self.get_argument_start()
            delta = 60
            items = db_items.limit(delta).offset(start).all()
            ids = [item.book_id for item in items]
            total_items = 0

            if len(ids) > 0:
                # 获取总数用于分页
                total_items = self.session.query(Item).filter(Item.collector_id == user_id, Item.scope == "private").count()

            books = self.get_books(ids=ids)
            books.sort(key=lambda x: x["id"], reverse=True)

            books_result = []
            for book in books:
                book_data = utils.BookFormatter(self, book).format()
                books_result.append(book_data)

            return {"err": "ok", "title": title, "total": total_items, "books": books_result}
        except Exception as e:
            import traceback

            traceback.print_exc()
            logging.error("Failed to get soled books: %s", e)
            return {"err": "internal", "msg": _("获取私有书籍失败")}


class BookFavorite(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        favorite_status = data.get("favorite", False)
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_favorite(favorite_status)
        self.session.commit()
        action = "收藏" if favorite_status else "取消收藏"
        return {"err": "ok", "msg": _("%s成功") % action}

    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.favorite == 1)
            .order_by(ReadingState.favorite_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        favorite_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            favorite_books.append(book_data)
        return {"err": "ok", "title": _("我的收藏"), "total": len(favorite_books), "books": favorite_books}


class BookWantToRead(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        wants_status = data.get("wants", False)
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_wants(wants_status)
        self.session.commit()
        action = "标记为待读" if wants_status else "取消待读"
        return {"err": "ok", "msg": _("%s成功") % action}

    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.wants == 1)
            .order_by(ReadingState.wants_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        wants_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            wants_books.append(book_data)
        return {"err": "ok", "title": _("待读书籍"), "total": len(wants_books), "books": wants_books}


class BookReading(BaseHandler):
    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1)
            .order_by(ReadingState.read_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        reading_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            reading_books.append(book_data)
        return {"err": "ok", "title": _("在读书籍"), "total": len(reading_books), "books": reading_books}


class BookReadDone(BaseHandler):
    @js
    @auth
    def get(self):
        user_id = self.user_id()
        reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 2)
            .order_by(ReadingState.read_date.desc())
            .all()
        )
        book_ids = [state.book_id for state in reading_states]
        books_dict = {book["id"]: book for book in self.get_books(ids=book_ids)}
        state_dict = {state.book_id: state for state in reading_states}
        read_done_books = []
        for book_id in book_ids:
            book = books_dict.get(book_id)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state_dict[book_id])
            read_done_books.append(book_data)
        return {"err": "ok", "title": _("已读完书籍"), "total": len(read_done_books), "books": read_done_books}


class BookReadingState(BaseHandler):
    @js
    @auth
    def post(self, id):
        book_id = int(id)
        book = self.get_book(book_id, raise_exception=False)
        if not book:
            return {"err": "params.book.invalid", "msg": _("书籍已不存在")}
        user_id = self.user_id()
        data = tornado.escape.json_decode(self.request.body)
        read_state = data.get("read_state", 0)
        if read_state not in [0, 1, 2]:
            return {"err": "params.invalid", "msg": _("阅读状态参数错误")}
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        if not reading_state:
            reading_state = ReadingState(book_id, user_id)
            self.session.add(reading_state)
        reading_state.set_read_state(read_state)
        if data.get("online_read") is not None:
            reading_state.set_online_read(data["online_read"])
        if data.get("download") is not None:
            reading_state.set_download(data["download"])
        self.session.commit()
        state_names = {0: "未读", 1: "在读", 2: "已读完"}
        return {"err": "ok", "msg": _("阅读状态已设置为：%s") % state_names[read_state]}

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        user_id = self.user_id()
        reading_state = (
            self.session.query(ReadingState).filter(ReadingState.book_id == book_id, ReadingState.reader_id == user_id).first()
        )
        return utils.ReadingStateFormatter.format_reading_state_with_api_format(reading_state)


class BookReadingStats(BaseHandler):
    @js
    @auth
    def get(self):
        from sqlalchemy import extract

        user_id = self.user_id()
        now = datetime.datetime.now()
        current_year = now.year
        current_month = now.month

        total_reading = (
            self.session.query(ReadingState).filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1).count()
        )

        total_read_done = (
            self.session.query(ReadingState).filter(ReadingState.reader_id == user_id, ReadingState.read_state == 2).count()
        )

        month_reading = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 1,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .count()
        )

        month_read_done = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 2,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .count()
        )

        month_read_done_states = (
            self.session.query(ReadingState)
            .filter(
                ReadingState.reader_id == user_id,
                ReadingState.read_state == 2,
                extract("year", ReadingState.read_date) == current_year,
                extract("month", ReadingState.read_date) == current_month,
            )
            .order_by(ReadingState.read_date.desc())
            .limit(12)
            .all()
        )

        month_read_done_books = []
        for state in month_read_done_states:
            book = self.get_book(state.book_id, raise_exception=False)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state)
            month_read_done_books.append(book_data)

        current_reading_states = (
            self.session.query(ReadingState)
            .filter(ReadingState.reader_id == user_id, ReadingState.read_state == 1)
            .order_by(ReadingState.read_date.desc())
            .limit(12)
            .all()
        )

        current_reading_books = []
        for state in current_reading_states:
            book = self.get_book(state.book_id, raise_exception=False)
            if not book:
                continue
            book_data = utils.BookFormatter(self, book).format()
            book_data["state"] = utils.ReadingStateFormatter.format_reading_state(state)
            current_reading_books.append(book_data)

        return {
            "err": "ok",
            "stats": {
                "total_reading": total_reading,
                "total_read_done": total_read_done,
                "month_reading": month_reading,
                "month_read_done": month_read_done,
                "current_year": current_year,
                "current_month": current_month,
            },
            "month_read_done_books": month_read_done_books,
            "current_reading_books": current_reading_books,
        }


def routes():
    return [
        (r"/api/index", Index),
        (r"/api/search", SearchBook),
        (r"/api/recent", RecentBook),
        (r"/api/library", LibraryBook),
        (r"/api/hot", HotBook),
        (r"/api/scopedbooks", BookScoped),
        (r"/api/book/nav", BookNav),
        (r"/api/book/upload", BookUpload),
        (r"/api/book/([0-9]+)", BookDetail),
        (r"/api/book/([0-9]+)/delete", BookDelete),
        (r"/api/book/([0-9]+)/edit", BookEdit),
        (r"/api/book/([0-9]+)/setscope", BookSetScope),
        (r"/api/book/([0-9]+\..+)", BookDownload),
        (r"/api/book/([0-9]+)/send_to_device", BookSendToDevice),
        (r"/api/book/([0-9]+)/mailto", BookSendToMail),
        (r"/api/book/([0-9]+)/refer", BookRefer),
        (r"/api/book/([0-9]+)/convert", BookConverter),
        (r"/api/book/([0-9]+)/topdf", BookToPDF),
        (r"/api/book/([0-9]+)/delete_format", BookDeleteFormat),
        (r"/api/book/([0-9]+)/separate", BookSeparate),
        (r"/api/book/([0-9]+)/savemeta", BookSaveMeta),
        (r"/read/([0-9]+)", BookRead),
        (r"/api/read/txt", TxtRead),
        (r"/api/book/txt/init", BookTxtInit),
        (r"/api/book/([0-9]+)/favorite", BookFavorite),
        (r"/api/book/([0-9]+)/wants", BookWantToRead),
        (r"/api/book/([0-9]+)/readstate", BookReadingState),
        (r"/api/favorites", BookFavorite),
        (r"/api/wants", BookWantToRead),
        (r"/api/reading", BookReading),
        (r"/api/read-done", BookReadDone),
        (r"/api/reading/stats", BookReadingStats),
    ]
