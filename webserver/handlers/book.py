#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os, logging, time, datetime, subprocess, urllib, re
import queue, threading, functools, random
from gettext import gettext as _

import tornado.escape
from tornado import web
from calibre.ebooks.metadata import authors_to_string
from calibre.ebooks.metadata.meta import get_metadata
from calibre.utils.filenames import ascii_filename

import loader
import constants
from handlers.base import js, auth, BaseHandler, ListHandler
from plugins.meta import baike, douban
from models import Item


CONF = loader.get_settings()
_q = queue.Queue()


def background(func):
    @functools.wraps(func)
    def run(*args, **kwargs):
        def worker():
            try:
                func(*args, **kwargs)
            except:
                import traceback, logging

                logging.error("Failed to run background task:")
                logging.error(traceback.format_exc())

        t = threading.Thread(name="worker", target=worker)
        t.setDaemon(True)
        t.start()

    return run


def do_ebook_convert(old_path, new_path, log_path):
    """convert book, and block, and wait"""
    args = ["ebook-convert", old_path, new_path]
    if new_path.lower().endswith(".epub"):
        args += ["--flow-size", "0"]

    with open(log_path, "w") as log:
        cmd = " ".join("'%s'" % v for v in args)
        logging.info("CMD: %s" % cmd)
        p = subprocess.Popen(args, stdout=log, stderr=subprocess.PIPE)
        try:
            _, stde = p.communicate(timeout=100)
            logging.info("ebook-convert finish: %s, err: %s" % (new_path, bytes.decode(stde)))
        except subprocess.TimeoutExpired:
            p.kill()
            logging.info("ebook-convert timeout: %s" % new_path)
            log.write(u"\n服务器处理异常，请在QQ群里联系管理员。\n[FINISH]")
            return False
        return True


class Index(BaseHandler):
    def fmt(self, b):
        pub = b.get("publisher", None)
        if not pub:
            pub = _("Unknown")

        author_sort = b.get("author_sort", None)
        if not author_sort:
            author_sort = _("Unknown")

        comments = b.get("comments", None)
        if not comments:
            comments = _(u"点击浏览详情")

        cdn = self.cdn_url
        base = self.base_url
        return {
            "id": b["id"],
            "title": b["title"],
            "rating": b["rating"],
            "author": ", ".join(b["authors"]),
            "authors": b["authors"],
            "publisher": pub,
            "comments": comments,
            "img": cdn + "/get/cover/%(id)s.jpg?t=%(timestamp)s" % b,
            # "cover_large_url": cdn+"/get/thumb_600_840/%(id)s.jpg?t=%(timestamp)s" % b,
            # "cover_url":       cdn+"/get/thumb_155_220/%(id)s.jpg?t=%(timestamp)s" % b,
            "author_url": base + "/author/" + author_sort,
            "publisher_url": base + "/publisher/" + pub,
        }

    @js
    def get(self):
        max_random = 30
        max_recent = 30
        cnt_random = min(int(self.get_argument("random", 8)), max_random)
        cnt_recent = min(int(self.get_argument("recent", 10)), max_recent)

        # nav = "index"
        # title = _(u"全部书籍")
        ids = list(self.cache.search(""))
        if not ids:
            raise web.HTTPError(404, reason=_(u"本书库暂无藏书"))
        random_ids = random.sample(ids, min(max_random, len(ids)))
        random_books = [b for b in self.get_books(ids=random_ids) if b["cover"]]
        random_books = random_books[:cnt_random]
        ids.sort()
        new_ids = random.sample(ids[-300:], min(max_recent, len(ids)))
        new_books = [b for b in self.get_books(ids=new_ids) if b["cover"]]
        new_books = new_books[:cnt_recent]

        return {
            "random_books_count": len(random_books),
            "new_books_count": len(new_books),
            "random_books": [self.fmt(b) for b in random_books],
            "new_books": [self.fmt(b) for b in new_books],
        }


class BookDetail(BaseHandler):
    def set_book(self, book):
        self.book = book

    def val(self, k, default_value=_("Unknown")):
        v = self.book.get(k, None)
        if not v:
            v = default_value
        if isinstance(v, datetime.datetime):
            return v.strftime("%Y-%m-%d")
        return v

    @js
    def get(self, id):
        book = self.get_book(id)
        book_id = book["id"]
        book["is_owner"] = self.is_book_owner(book_id, self.user_id())
        book["is_public"] = True
        if self.is_admin():
            book["is_public"] = True
            book["is_owner"] = True
        self.user_history("visit_history", book)
        files = []
        for fmt in book.get("available_formats", ""):
            try:
                filesize = self.db.sizeof_format(book_id, fmt, index_is_id=True)
            except:
                continue
            files.append(
                {
                    "format": fmt,
                    "size": filesize,
                    "href": self.base_url + "/api/book/%s.%s" % (book_id, fmt),
                }
            )

        if self.user_id():
            self.count_increase(book_id, count_visit=1)
        else:
            self.count_increase(book_id, count_guest=1)

        collector = book.get("collector", None)
        if isinstance(collector, dict):
            collector = collector.get("username", None)
        elif collector:
            collector = collector.username

        b = book
        self.set_book(book)
        return {
            "err": "ok",
            "kindle_sender": CONF["smtp_username"],
            "book": {
                "id"             : b["id"],
                "title"          : b["title"],
                "rating"         : b["rating"],
                "count_visit"    : b["count_visit"],
                "count_download" : b["count_download"],
                "timestamp"      : self.val("timestamp"),
                "pubdate"        : self.val("pubdate"),
                "collector"      : collector,
                "authors"        : b["authors"],
                "author"         : ", ".join(b["authors"]),
                "tags"           : b["tags"],
                "author_sort"    : self.val("author_sort"),
                "publisher"      : self.val("publisher"),
                "comments"       : self.val("comments", _(u"暂无简介")),
                "series"         : self.val("series", None),
                "language"       : self.val("language", None),
                "isbn"           : self.val("isbn", None),
                "files"          : files,
                "is_public"      : b["is_public"],
                "is_owner"       : b["is_owner"],
                "img"            : self.cdn_url + "/get/cover/%(id)s.jpg?t=%(timestamp)s" % b,
            },
        }


class BookRefer(BaseHandler):
    @js
    @auth
    def get(self, id):
        book_id = int(id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        title = re.sub(u"[(（].*", "", mi.title)
        api = douban.DoubanBookApi(
            CONF["douban_apikey"],
            CONF["douban_baseurl"],
            copy_image=False,
            manual_select=False,
            maxCount=CONF["douban_max_count"],
        )
        # first, search title
        books = api.get_books_by_title(title) or []
        if books and mi.isbn and mi.isbn != baike.BAIKE_ISBN:
            got_that_book = False
            for b in books:
                got_that_book = (mi.isbn == b.get("isbn13", "xxx")) or (
                    mi.title == b.get("title") and mi.publisher == b.get("publisher")
                )
                if got_that_book:
                    break
            if not got_that_book:
                book = api.get_book_by_isbn(mi.isbn)
                # alwayse put ISBN book in TOP1
                if book:
                    books.insert(0, book)
        books = [api._metadata(b) for b in books]

        # append baidu book
        api = baike.BaiduBaikeApi(copy_image=False)
        book = api.get_book(title)
        if book:
            books.append(book)

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
                d["comments"] = u"无详细介绍"
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
            return {
                "err": "params.provider_key.invalid",
                "msg": _(u"provider_value参数错误"),
            }
        if only_meta == "yes" and only_cover == "yes":
            return {"err": "params.conflict", "msg": _(u"参数冲突")}
        mi = self.db.get_metadata(book_id, index_is_id=True)
        if not mi:
            return {"err": "params.book.invalid", "msg": _(u"书籍不存在")}
        if not self.is_admin() and not self.is_book_owner(book_id, self.user_id()):
            return {"err": "user.no_permission", "msg": _(u"无权限")}

        title = re.sub(u"[(（].*", "", mi.title)
        if provider_key == baike.KEY:
            api = baike.BaiduBaikeApi(copy_image=True)
            refer_mi = api.get_book(title)
        elif provider_key == douban.KEY:
            mi.isbn = provider_key
            mi.douban_id = provider_value
            api = douban.DoubanBookApi(
                CONF["douban_apikey"],
                CONF["douban_baseurl"],
                copy_image=True,
                maxCount=CONF["douban_max_count"],
            )
            refer_mi = api.get_book(mi)
        else:
            return {
                "err": "params.provider_key.invalid",
                "msg": _(u"尚不支持的provider_key: %s" % provider_key),
            }

        if only_cover == "yes":
            # just set cover
            mi.cover_data = refer_mi.cover_data
        else:
            if only_meta == "yes":
                refer_mi.cover_data = None
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
            try:
                content = datetime.datetime.strptime(data["pubdate"], "%Y-%m-%d")
            except:
                return {
                    "err": "params.pudate.invalid",
                    "msg": _(u"出版日期参数错误，格式应为 2019-05-10"),
                }
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
        return {"err": "ok"}


class BookDownload(BaseHandler):
    def send_error_of_not_invited(self):
        self.set_header("WWW-Authenticate", "Basic")
        self.set_status(401)
        raise web.Finish()

    def get(self, id, fmt):
        is_opds = self.get_argument("from", "") == "opds"
        if not CONF["ALLOW_GUEST_DOWNLOAD"] and not self.current_user:
            if is_opds:
                return self.send_error_of_not_invited()
            else:
                return self.redirect("/login")

        if self.current_user and not self.current_user.can_save():
            raise web.HTTPError(403, reason=_(u"无权操作"))

        fmt = fmt.lower()
        logging.debug("download %s.%s" % (id, fmt))
        book = self.get_book(id)
        book_id = book["id"]
        self.user_history("download_history", book)
        self.count_increase(book_id, count_download=1)
        if "fmt_%s" % fmt not in book:
            raise web.HTTPError(404, reason=_(u"%s格式无法下载" % fmt))
        path = book["fmt_%s" % fmt]
        book["fmt"] = fmt
        att = u'attachment; filename="%(id)d-%(title)s.%(fmt)s"' % book
        if is_opds:
            att = u'attachment; filename="%(id)d.%(fmt)s"' % book

        self.set_header("Content-Disposition", att.encode("UTF-8"))
        self.set_header("Content-Type", "application/octet-stream")
        with open(path, "rb") as f:
            self.write(f.read())


class BookNav(ListHandler):
    @js
    def get(self):
        tagmap = self.all_tags_with_count()
        navs = []
        for h1, tags in constants.BOOKNAV:
            new_tags = [{"name": v, "count": tagmap.get(v, 0)} for v in tags]
            navs.append({"legend": h1, "tags": new_tags})
        return {"err": "ok", "navs": navs}


class RecentBook(ListHandler):
    def get(self):
        title = _(u"新书推荐")
        ids = self.books_by_timestamp()
        return self.render_book_list([], ids=ids, title=title)


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
        delta = 30
        page_max = int(count / delta)
        page_now = int(start / delta)
        pages = []
        for p in range(page_now - 3, page_now + 3):
            if 0 <= p and p <= page_max:
                pages.append(p)
        items = db_items.limit(delta).offset(start).all()
        ids = [item.book_id for item in items]
        books = self.get_books(ids=ids)
        self.do_sort(books, "count_visit", False)
        return self.render_book_list(books, title=title)


class BookUpload(BaseHandler):
    @js
    @auth
    def post(self):
        def convert(s):
            try:
                return s.group(0).encode("latin1").decode("utf8")
            except:
                return s.group(0)

        if not self.current_user.can_upload():
            return {"err": "permission", "msg": _(u"无权操作")}

        import re

        postfile = self.request.files["ebook"][0]
        name = postfile["filename"]
        name = re.sub(r"[\x80-\xFF]+", convert, name)
        logging.error("upload book name = " + repr(name))
        fmt = os.path.splitext(name)[1]
        fmt = fmt[1:] if fmt else None
        if not fmt:
            return {"err": "params.filename", "msg": _(u"文件名不合法")}
        fmt = fmt.lower()

        # save file
        data = postfile["body"]
        fpath = os.path.join(CONF["upload_path"], name)
        with open(fpath, "wb") as f:
            f.write(data)
        logging.debug("save upload file into [%s]", fpath)

        # read ebook meta
        with open(fpath, "rb") as stream:
            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)

        if fmt.lower() == "txt":
            mi.title = name.replace(".txt", "")
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
        return {"err": "ok", "book_id": book_id}


class BookRead(BaseHandler):
    def get(self, id):
        if not CONF["ALLOW_GUEST_READ"] and not self.current_user:
            return self.redirect("/login")

        if self.current_user and not self.current_user.can_save():
            raise web.HTTPError(403, reason=_(u"无权操作"))

        book = self.get_book(id)
        book_id = book["id"]
        self.user_history("read_history", book)
        self.count_increase(book_id, count_download=1)

        # check format
        for fmt in ["epub", "mobi", "azw", "azw3", "txt"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if not fpath:
                continue
            # epub_dir is for javascript
            epub_dir = os.path.dirname(fpath).replace(CONF["with_library"], "/get/extract/")
            epub_dir = urllib.parse.quote(epub_dir)
            self.extract_book(book, fpath, fmt)
            return self.html_page("book/read.html", vars())

        if "fmt_pdf" in book:
            path = book["fmt_pdf"]
            self.set_header("Content-Type", "application/pdf")
            with open(path, "rb") as f:
                self.write(f.read())
            return

        raise web.HTTPError(404, reason=_(u"抱歉，在线阅读器暂不支持该格式的书籍"))

    @background
    def extract_book(self, book, fpath, fmt):
        fdir = os.path.dirname(fpath).replace(CONF["with_library"], CONF["extract_path"])
        subprocess.call(["mkdir", "-p", fdir])
        # fdir = os.path.dirname(fpath) + "/extract"
        if os.path.isfile(fdir + "/META-INF/container.xml"):
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            return

        progress_file = self.get_path_progress(book["id"])
        new_path = ""
        if fmt != "epub":
            new_fmt = "epub"
            new_path = os.path.join(
                CONF["convert_path"],
                "book-%s-%s.%s" % (book["id"], int(time.time()), new_fmt),
            )
            logging.info("convert book: %s => %s, progress: %s" % (fpath, new_path, progress_file))
            os.chdir("/tmp/")

            ok = do_ebook_convert(fpath, new_path, progress_file)
            if not ok:
                self.add_msg("danger", u"文件格式转换失败，请在QQ群里联系管理员.")
                return

            with open(new_path, "rb") as f:
                self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
                logging.info("add new book: %s", new_path)
            fpath = new_path

        # extract to dir
        logging.error("extract book: %s" % fpath)
        os.chdir(fdir)
        with open(progress_file, "a") as log:
            log.write(u"Dir: %s\n" % fdir)
            subprocess.call(["unzip", fpath, "-d", fdir], stdout=log)
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            if new_path:
                subprocess.call(["rm", new_path])
        return


class BookPush(BaseHandler):
    @js
    def post(self, id):
        if not CONF["ALLOW_GUEST_PUSH"]:
            if not self.current_user:
                return {"err": "user.need_login", "msg": _(u"请先登录")}
            elif not self.current_user.can_push():
                return {"err": "permission", "msg": _(u"无权操作")}

        mail_to = self.get_argument("mail_to", None)
        if not mail_to:
            return {"err": "params.error", "msg": _(u"参数错误")}

        book = self.get_book(id)
        book_id = book["id"]

        self.user_history("push_history", book)
        self.count_increase(book_id, count_download=1)

        # check format
        for fmt in ["mobi", "azw", "pdf"]:
            fpath = book.get("fmt_%s" % fmt, None)
            if fpath:
                self.bg_send_book(book, mail_to, fmt, fpath)
                return {"err": "ok", "msg": _(u"服务器正在推送……")}

        # we do no have formats for kindle
        if "fmt_epub" not in book and "fmt_azw3" not in book and "fmt_txt" not in book:
            return {
                "err": "book.no_format_for_kindle",
                "msg": _(u"抱歉，该书无可用于kindle阅读的格式"),
            }

        self.bg_convert_and_send(book, mail_to)
        self.add_msg(
            "success",
            _(u"服务器正在推送《%(title)s》到%(email)s") % {"title": book["title"], "email": mail_to},
        )
        return {"err": "ok", "msg": _(u"服务器正在转换格式并推送……")}

    @background
    def bg_send_book(self, book, mail_to, fmt, fpath):
        self.do_send_mail(book, mail_to, fmt, fpath)

    @background
    def bg_convert_and_send(self, book, mail_to):
        fmt = "mobi"  # best format for kindle
        fpath = self.convert_to_mobi_format(book, fmt)
        if fpath:
            self.do_send_mail(book, mail_to, fmt, fpath)

    def get_path_of_fmt(self, book, fmt):
        """for mock test"""
        return os.path.join(CONF["convert_path"], "%s.%s" % (ascii_filename(book["title"]), new_fmt))

    def convert_to_mobi_format(self, book, new_fmt):
        new_path = self.get_path_of_fmt(book, new_fmt)
        progress_file = self.get_path_progress(book["id"])

        old_path = None
        for f in ["txt", "azw3", "epub"]:
            old_path = book.get("fmt_%s" % f, old_path)

        logging.debug("convert book from [%s] to [%s]", old_path, new_path)
        ok = do_ebook_convert(old_path, new_path, progress_file)
        if not ok:
            self.add_msg("danger", u"文件格式转换失败，请在QQ群里联系管理员.")
            return None
        with open(new_path, "rb") as f:
            self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
        return new_path

    def do_send_mail(self, book, mail_to, fmt, fpath):
        # read meta info
        author = authors_to_string(book["authors"] if book["authors"] else [_(u"佚名")])
        title = book["title"] if book["title"] else _(u"无名书籍")
        fname = u"%s - %s.%s" % (title, author, fmt)
        with open(fpath, "rb") as f:
            fdata = f.read()

        mail_args = {
            "title": title,
            "site_url": self.base_url,
            "site_title": CONF["site_title"],
        }
        mail_from = self.settings["smtp_username"]
        mail_subject = _("%(site_title)s：推送给您一本书《%(title)s》") % mail_args
        mail_body = _(u"为您奉上一本《%(title)s》, 欢迎常来访问%(site_title)s！%(site_url)s") % mail_args
        status = msg = ""
        try:
            logging.info("send %(title)s to %(mail_to)s" % vars())
            self.mail(mail_from, mail_to, mail_subject, mail_body, fdata, fname)
            status = "success"
            msg = _("[%(title)s] 已成功发送至Kindle邮箱 [%(mail_to)s] !!") % vars()
            logging.info(msg)
        except:
            import traceback

            logging.error("Failed to send to kindle: %s" % mail_to)
            logging.error(traceback.format_exc())
            status = "danger"
            msg = traceback.format_exc()
        self.add_msg(status, msg)
        return


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
        (r"/api/book/([0-9]+)\.(.+)", BookDownload),
        (r"/api/book/([0-9]+)/push", BookPush),
        (r"/api/book/([0-9]+)/refer", BookRefer),
        (r"/read/([0-9]+)", BookRead),
    ]
