#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging
import os
import random
import re
import urllib
from gettext import gettext as _

import tornado.escape
from tornado import web

from webserver import loader, utils
from webserver.services.autofill import AutoFillService
from webserver.services.convert import ConvertService
from webserver.services.extract import ExtractService
from webserver.services.mail import MailService
from webserver.handlers.base import BaseHandler, ListHandler, auth, js
from webserver.models import Item
from webserver.plugins.meta import baike, douban
from webserver.plugins.parser.txt import get_content_encoding

CONF = loader.get_settings()


class Index(BaseHandler):
    def fmt(self, b):
        return utils.BookFormatter(self, b).format()

    @js
    def get(self):
        cnt_random = min(int(self.get_argument("random", 8)), 30)
        cnt_recent = min(int(self.get_argument("recent", 10)), 30)

        # nav = "index"
        # title = _(u"全部书籍")
        ids = list(self.cache.search(""))
        if not ids:
            raise web.HTTPError(404, reason=_(u"本书库暂无藏书"))
        random_ids = random.sample(ids, min(cnt_random, len(ids)))
        random_books = [b for b in self.get_books(ids=random_ids)]
        random_books.sort(key=lambda x: x["id"], reverse=True)

        ids.sort(reverse=True)
        new_ids = random.sample(ids[0:100], min(cnt_recent, len(ids)))
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
        return {
            "err": "ok",
            "kindle_sender": CONF["smtp_username"],
            "book": utils.BookFormatter(self, book).format(with_files=True, with_perms=True),
        }


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

    def plugin_search_books(self, mi):
        title = re.sub(u"[(（].*", "", mi.title)
        api = douban.DoubanBookApi(
            CONF["douban_apikey"],
            CONF["douban_baseurl"],
            copy_image=False,
            manual_select=False,
            maxCount=CONF["douban_max_count"],
        )
        # first, search title
        books = []
        try:
            books = api.search_books(title) or []
        except:
            logging.error(_(u"豆瓣接口查询 %s 失败" % title))

        if not self.has_proper_book(books, mi):
            # 若有ISBN号，但是却没搜索出来，则精准查询一次ISBN
            # 总是把最佳书籍放在第一位
            book = api.get_book_by_isbn(mi.isbn)
            if book:
                books = list(books)
                books.insert(0, book)
        books = [api._metadata(b) for b in books]

        # append baidu book
        api = baike.BaiduBaikeApi(copy_image=False)
        try:
            book = api.get_book(title)
        except:
            return {"err": "httprequest.baidubaike.failed", "msg": _(u"百度百科查询失败")}
        if book:
            books.append(book)
        return books

    def plugin_get_book_meta(self, provider_key, provider_value, mi):
        if provider_key == baike.KEY:
            title = re.sub(u"[(（].*", "", mi.title)
            api = baike.BaiduBaikeApi(copy_image=True)
            try:
                return api.get_book(title)
            except:
                raise RuntimeError({"err": "httprequest.baidubaike.failed", "msg": _(u"百度百科查询失败")})

        if provider_key == douban.KEY:
            mi.douban_id = provider_value
            api = douban.DoubanBookApi(
                CONF["douban_apikey"],
                CONF["douban_baseurl"],
                copy_image=True,
                maxCount=CONF["douban_max_count"],
            )
            try:
                return api.get_book(mi)
            except:
                raise RuntimeError({"err": "httprequest.douban.failed", "msg": _(u"豆瓣接口查询失败")})
        raise RuntimeError({"err": "params.provider_key.not_support", "msg": _(u"不支持该provider_key")})

    @js
    @auth
    def get(self, id):
        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        books = self.plugin_search_books(mi)
        keys = [
            "cover_url",
            "source",
            "website",
            "title",
            "author_sort",
            "publisher",
            "isbn",
            "comments",
            "provider_key",
            "provider_value",
        ]
        rsp = []
        for b in books:
            d = dict((k, b.get(k, "")) for k in keys)
            pubdate = b.get("pubdate")
            d["pubyear"] = pubdate.strftime("%Y") if pubdate else ""
            if not d["comments"]:
                d["comments"] = _(u"无详细介绍")
            rsp.append(d)
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
            return {"err": "params.provider_key.invalid", "msg": _(u"provider_key参数错误")}
        if not provider_value:
            return {"err": "params.provider_key.invalid", "msg": _(u"provider_value参数错误")}
        if only_meta == "yes" and only_cover == "yes":
            return {"err": "params.conflict", "msg": _(u"参数冲突")}

        mi = self.db.get_metadata(book_id, index_is_id=True)
        if not mi:
            return {"err": "params.book.invalid", "msg": _(u"书籍不存在")}
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _(u"无权限")}

        try:
            refer_mi = self.plugin_get_book_meta(provider_key, provider_value, mi)
        except RuntimeError as e:
            return e.args[0]

        if not refer_mi:
            return {"err": "plugin.fail", "msg": _(u"插件拉取信息异常，请重试")}

        if only_cover == "yes":
            # just set cover
            mi.cover_data = refer_mi.cover_data
        else:
            if only_meta == "yes":
                refer_mi.cover_data = None
            if len(refer_mi.tags) == 0 and len(mi.tags) == 0:
                ts = []
                for tag in CONF['BOOK_NAV'].replace("=", "/").replace("\n", "/").split("/"):
                    if tag in refer_mi.title or tag in refer_mi.comments:
                        ts.append(tag)
                    elif tag in refer_mi.authors:
                        ts.append(tag)
                if len(ts) > 0:
                    mi.tags += ts[:8]
                    logging.info("tags are %s" % ','.join(mi.tags))
                    self.db.set_tags(book_id, mi.tags)
            mi.smart_update(refer_mi, replace_metadata=True)

        self.db.set_metadata(book_id, mi)
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
            return {"err": "permission", "msg": _(u"无权操作")}

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
                mi.set(key, val)

        if data.get("pubdate", None):
            content = douban.str2date(data["pubdate"])
            if content is None:
                return {"err": "params.pudate.invalid", "msg": _(u"出版日期参数错误，格式应为 2019-05-10或2019-05或2019年或2019")}
            mi.set("pubdate", content)

        if "tags" in data and not data["tags"]:
            self.db.set_tags(bid, [])

        self.db.set_metadata(bid, mi)
        return {"err": "ok", "msg": _(u"更新成功")}


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
            return {"err": "permission", "msg": _(u"无权操作")}

        if not self.current_user.can_delete() or not (self.is_admin() or self.is_book_owner(bid, cid)):
            return {"err": "permission", "msg": _(u"无权操作")}

        self.db.delete_book(bid)
        self.add_msg("success", _(u"删除书籍《%s》") % book["title"])
        return {"err": "ok", "msg": _(u"删除成功")}


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
                    raise web.HTTPError(403, reason=_(u"无权操作，请先登录注册邮箱激活账号。"))
            else:
                raise web.HTTPError(403, reason=_(u"无权操作"))

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
            raise web.HTTPError(404, reason=_(u"%s格式无法下载" % fmt))

        path = book["fmt_%s" % fmt]
        book["fmt"] = fmt
        book["title"] = urllib.parse.quote_plus(book["title"])
        fname = "%(id)d-%(title)s.%(fmt)s" % book
        att = u"attachment; filename=\"%s\"; filename*=UTF-8''%s" % (fname, fname)
        if self.is_opds:
            att = u'attachment; filename="%(id)d.%(fmt)s"' % book

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
        for line in CONF['BOOK_NAV'].split("\n"):
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
    def get(self):
        title = _(u"新书推荐")
        ids = self.books_by_id()
        return self.render_book_list([], ids=ids, title=title, sort_by_id=True)


class SearchBook(ListHandler):
    def get(self):
        name = self.get_argument("name", "")
        if not name.strip():
            return self.write({"err": "params.invalid", "msg": _(u"请输入搜索关键字")})

        title = _(u"搜索：%(name)s") % {"name": name}
        ids = self.cache.search(name)
        return self.render_book_list([], ids=ids, title=title)


class HotBook(ListHandler):
    def get(self):
        title = _(u"热度榜单")
        db_items = self.session.query(Item).filter(Item.count_visit > 1).order_by(Item.count_download.desc())
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


class BookUpload(BaseHandler):
    @classmethod
    def convert(cls, s):
        try:
            return s.group(0).encode("latin1").decode("utf8")
        except:
            return s.group(0)

    def get_upload_file(self):
        # for unittest mock
        p = self.request.files["ebook"][0]
        return (p["filename"], p["body"])

    @js
    @auth
    def post(self):
        from calibre.ebooks.metadata.meta import get_metadata

        if not self.current_user.can_upload():
            return {"err": "permission", "msg": _(u"无权操作")}
        name, data = self.get_upload_file()
        name = re.sub(r"[\x80-\xFF]+", BookUpload.convert, name)
        logging.error("upload book name = " + repr(name))
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return {"err": "params.filename", "msg": _(u"文件名不合法")}
        fmt = fmt.lower()

        # save file
        fpath = os.path.join(CONF["upload_path"], name)
        with open(fpath, "wb") as f:
            f.write(data)
        logging.debug("save upload file into [%s]", fpath)

        # read ebook meta
        with open(fpath, "rb") as stream:
            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
            mi.title = utils.super_strip(mi.title)
            mi.authors = [utils.super_strip(mi.author_sort)]

        # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
        if fmt in ["txt", "pdf"]:
            mi.title = name.replace("." + fmt, "")
            mi.authors = [_(u"佚名")]

        logging.info("upload mi.title = " + repr(mi.title))
        books = self.db.books_with_same_title(mi)
        if books:
            book_id = books.pop()
            return {
                "err": "samebook",
                "msg": _(u"已存在同名书籍《%s》") % mi.title,
                "book_id": book_id,
            }

        fpaths = [fpath]
        book_id = self.db.import_book(mi, fpaths)
        self.user_history("upload_history", {"id": book_id, "title": mi.title})
        self.add_msg("success", _(u"导入书籍成功！"))
        item = Item()
        item.book_id = book_id
        item.collector_id = self.user_id()
        item.save()

        AutoFillService().auto_fill(book_id)
        return {"err": "ok", "book_id": book_id}


class BookRead(BaseHandler):
    def get(self, id):
        if not CONF["ALLOW_GUEST_READ"] and not self.current_user:
            return self.redirect("/login")

        if self.current_user:
            if self.current_user.can_read():
                if not self.current_user.is_active():
                    raise web.HTTPError(403, reason=_(u"无权在线阅读，请先登录注册邮箱激活账号。"))
            else:
                raise web.HTTPError(403, reason=_(u"无权在线阅读"))

        book = self.get_book(id)
        book_id = book["id"]
        self.user_history("read_history", book)
        self.count_increase(book_id, count_download=1)

        if "fmt_pdf" in book:
            # PDF类书籍需要检查下载权限。
            if not CONF["ALLOW_GUEST_DOWNLOAD"] and not self.current_user:
                return self.redirect("/login")

            if self.current_user and not self.current_user.can_save():
                raise web.HTTPError(403, reason=_(u"无权在线阅读PDF类书籍"))

            pdf_url = urllib.parse.quote_plus(self.api_url + "/api/book/%(id)d.PDF" % book)
            pdf_reader_url = CONF["PDF_VIEWER"] % {"pdf_url": pdf_url}
            return self.redirect(pdf_reader_url)

        if 'fmt_txt' in book:
            # TXT有专门的阅读器
            txt_reader_url = f'/book/{book_id}/readtxt'
            return self.redirect(txt_reader_url)

        # 其他格式，转换为EPUB进行在线阅读
        for fmt in ["epub", "mobi", "azw", "azw3", "txt"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if not fpath:
                continue

            if fmt != 'epub':
                ConvertService().convert_and_save(self.user_id(), book, fpath, "epub")

            # epub_dir is for javascript
            epub_dir = "/get/extract/%s" % book["id"]
            return self.html_page("book/" + CONF["EPUB_VIEWER"], {
                "book": book,
                "epub_dir": epub_dir,
                "is_ready": (fmt == 'epub'),
            })
        raise web.HTTPError(404, reason=_(u"抱歉，在线阅读器暂不支持该格式的书籍"))


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
        with open(fpath, mode='rb') as file:
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
        content = content.decode(encoding=encode, errors='ignore').replace("\r", "").replace("\n", "<br>")
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
            with open(content_path, 'r', encoding='utf8') as f:
                meta = json.loads(f.read())
            return {"err": "ok", "msg": "已解析", "data": {
                "content": meta['toc'],
                "encoding": meta['encoding'],
                "name": book["title"]
            }}
        if test_ready != "0":
            return {"err": "ok", "msg": "未解析完成"}

        # 若未解析则计算预计等待时间，至少2分钟
        wait = min(120, os.path.getsize(fpath) / (1024 * 1024) * 15)
        ExtractService().parse_txt_content(bid, fpath)
        que_len = ExtractService().get_queue('parse_txt_content').qsize()
        return {"err": "ok", "msg": "已加入队列", "data": {
            "wait": wait,
            "name": book["title"],
            "path": content_path,
            "que": que_len
        }}


class BookPush(BaseHandler):
    @js
    def post(self, id):
        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _(u"请先登录")}
            else:
                if not self.current_user.can_push():
                    return {"err": "permission", "msg": _(u"无权操作")}
                elif not self.current_user.is_active():
                    return {"err": "permission", "msg": _(u"无权操作，请先激活账号。")}

        mail_to = self.get_argument("mail_to", None)
        if not mail_to:
            return {"err": "params.error", "msg": _(u"参数错误")}

        book = self.get_book(id)
        book_id = book["id"]

        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)

        # https://www.amazon.cn/gp/help/customer/display.html?ref_=hp_left_v4_sib&nodeId=G5WYD9SAF7PGXRNA
        for fmt in ["epub", "pdf"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                MailService().send_book(self.user_id(), self.site_url, book, mail_to, fmt, fpath)
                return {"err": "ok", "msg": _(u"服务器后台正在推送了。您可关闭此窗口，继续浏览其他书籍。")}

        # we do no have formats for kindle
        if "fmt_azw3" not in book and "fmt_txt" not in book:
            return {
                "err": "book.no_format_for_kindle",
                "msg": _(u"抱歉，该书无可用于kindle阅读的格式"),
            }

        ConvertService().convert_and_send(self.user_id(), self.site_url, book, mail_to)
        self.add_msg(
            "success",
            _(u"服务器正在推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
        )
        return {"err": "ok", "msg": _(u"服务器正在转换格式，稍后将自动推送。您可关闭此窗口，继续浏览其他书籍。")}


def routes():
    return [
        (r"/api/index", Index),
        (r"/api/search", SearchBook),
        (r"/api/recent", RecentBook),
        (r"/api/hot", HotBook),
        (r"/api/book/nav", BookNav),
        (r"/api/book/upload", BookUpload),
        (r"/api/book/([0-9]+)", BookDetail),
        (r"/api/book/([0-9]+)/delete", BookDelete),
        (r"/api/book/([0-9]+)/edit", BookEdit),
        (r"/api/book/([0-9]+\..+)", BookDownload),
        (r"/api/book/([0-9]+)/push", BookPush),
        (r"/api/book/([0-9]+)/refer", BookRefer),
        (r"/read/([0-9]+)", BookRead),
        (r"/api/read/txt", TxtRead),
        (r"/api/book/txt/init", BookTxtInit),
    ]
