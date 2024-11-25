#!/usr/bin/env python3
# -*- coding: UTF-8 -*-


import base64
import datetime
import logging
import time
from collections import defaultdict
from gettext import gettext as _

from jinja2 import Environment, FileSystemLoader
from sqlalchemy import func as sql_func
from tornado import web

from webserver import loader, utils

# import social_tornado.handlers
from webserver.models import Item, Message, Reader

messages = defaultdict(list)
CONF = loader.get_settings()


def day_format(value, format="%Y-%m-%d"):
    try:
        return value.strftime(format)
    except:
        return "1990-01-01"


def website_format(value):
    links = []
    for link in value.split(";"):
        if link.startswith("douban://"):
            douban_id = link.split("//")[-1]
            links.append(u"<a target='_blank' href='https://book.douban.com/subject/%s/'>豆瓣</a> " % douban_id)
        elif link.startswith("isbn://"):
            douban_id = link.split("//")[-1]
            links.append(u"<a target='_blank' href='https://book.douban.com/isbn/%s/'>豆瓣</a> " % douban_id)
        elif link.startswith("http://"):
            links.append(u"<a target='_blank' href='%s'>参考链接</a> " % link)
    return ";".join(links)


def js(func):
    def do(self, *args, **kwargs):
        try:
            rsp = func(self, *args, **kwargs)
            rsp["msg"] = rsp.get("msg", "")
        except Exception as e:
            import traceback

            logging.error(traceback.format_exc())
            msg = (
                'Exception:<br><pre style="white-space:pre-wrap;word-break:keep-all">%s</pre>' % traceback.format_exc()
            )
            rsp = {"err": "exception", "msg": msg}
            if isinstance(e, web.Finish):
                rsp = ""
        origin = self.request.headers.get("origin", "*")
        self.set_header("Access-Control-Allow-Origin", origin)
        self.set_header("Access-Control-Allow-Credentials", "true")
        self.set_header("Cache-Control", "max-age=0")
        self.write(rsp)
        self.finish()
        return

    return do


def auth(func):
    def do(self, *args, **kwargs):
        if not self.current_user:
            return {"err": "user.need_login", "msg": _(u"请先登录")}
        return func(self, *args, **kwargs)

    return do


def is_admin(func):
    def do(self, *args, **kwargs):
        if not self.current_user:
            return {"err": "user.need_login", "msg": _(u"请先登录")}
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _(u"当前用户非管理员")}
        return func(self, *args, **kwargs)

    return do


class BaseHandler(web.RequestHandler):
    _path_to_env = {}

    def _request_summary(self) -> str:
        userid = 0
        username = "-"
        if self.current_user:
            userid = self.current_user.id
            username = self.current_user.username

        return '%s %s (%s) "%d %s"' % (
            self.request.method,
            self.request.uri,
            self.request.remote_ip,
            userid,
            username,
        )

    def get_secure_cookie(self, key):
        if not self.cookies_cache.get(key, ""):
            self.cookies_cache[key] = super(BaseHandler, self).get_secure_cookie(key)
        return self.cookies_cache[key]

    def set_secure_cookie(self, key, val):
        self.cookies_cache[key] = val
        super(BaseHandler, self).set_secure_cookie(key, val)
        return None

    def head(self, *args, **kwargs):
        return self.get(*args, **kwargs)

    def mark_invited(self):
        self.set_secure_cookie("invited", str(int(time.time())))

    def need_invited(self):
        return CONF["INVITE_MODE"] is True

    def invited_code_is_ok(self):
        t = self.get_secure_cookie("invited")
        if t and int(float(t)) > int(time.time()) - 7 * 86400:
            return True
        return False

    def process_auth_header(self):
        auth_header = self.request.headers.get("Authorization", "")
        if not auth_header.startswith("Basic "):
            return False
        auth_decoded = base64.decodebytes(auth_header[6:].encode("ascii")).decode("UTF-8")
        username, password = auth_decoded.split(":", 2)
        user = self.session.query(Reader).filter(Reader.username == username).first()
        if not user:
            return False
        if user.get_secure_password(password) != str(user.password):
            return False
        self.mark_invited()
        self.login_user(user)
        return True

    def send_error_of_not_invited(self):
        self.write({"err": "not_invited"})
        self.set_status(200)
        raise web.Finish()

    def should_be_invited(self):
        if self.need_invited():
            if not self.invited_code_is_ok():
                return self.send_error_of_not_invited()

    def should_be_installed(self):
        if CONF.get("installed", None) is False:
            self.write({"err": "not_installed"})
            self.set_status(200)
            raise web.Finish()

    def set_hosts(self):
        # site_url为完整路径，用于发邮件等
        host = self.request.headers.get("X-Forwarded-Host", self.request.host)
        self.site_url = self.request.protocol + "://" + host

        # 默认情况下，访问站内资源全部采用相对路径
        self.api_url = ""  # API动态请求地址
        self.cdn_url = ""  # 可缓存的资源，图片，文件

        # 如果设置有static_host配置，则改为绝对路径
        if CONF["static_host"]:
            self.api_url = self.request.protocol + "://" + host
            self.cdn_url = self.request.protocol + "://" + CONF["static_host"]

    def prepare(self):
        self.set_hosts()
        self.set_i18n()
        self.process_auth_header()
        self.should_be_installed()
        self.should_be_invited()

    def set_i18n(self):
        return
        # TODO set correct language package
        # import gettext
        # accept = self.request.headers.get("Accept-Language", "")
        # langs = [v.strip().split(";")[0] for v in accept.split(",") if v.strip()]
        # logging.debug("choose lang: %s" % langs)
        # if not langs: langs = ["zh_CN"]
        # lang = gettext.translation('messages', localedir=CONF['i18n_path'], languages=langs, fallback=True)
        # lang.install(unicode=True)

    def initialize(self):
        ScopedSession = self.settings["ScopedSession"]
        self.session = ScopedSession()  # new sql session
        self.db = self.settings["legacy"]
        self.cache = self.db.new_api
        self.build_time = self.settings["build_time"]
        self.default_cover = self.settings["default_cover"]
        self.admin_user = None
        self.cookies_cache = {}

    def on_finish(self):
        ScopedSession = self.settings["ScopedSession"]
        self.session.close()
        ScopedSession.remove()

    def static_url(self, path, **kwargs):
        if path.endswith("/"):
            prefix = self.settings.get("static_url_prefix", "/static/")
            return self.cdn_url + prefix + path
        else:
            return self.cdn_url + super(BaseHandler, self).static_url(path, **kwargs)

    def user_id(self):
        login_time = self.get_secure_cookie("lt")
        if not login_time or int(login_time) < int(time.time()) - 7 * 86400:
            return None
        uid = self.get_secure_cookie("user_id")
        return int(uid) if uid and uid.isdigit() else None

    def get_current_user(self):
        user_id = self.user_id()
        if user_id:
            user_id = int(user_id)
        user = self.session.get(Reader, user_id) if user_id else None

        admin_id = self.get_secure_cookie("admin_id")
        if admin_id:
            self.admin_user = self.session.get(Reader, int(admin_id))
        elif user and user.is_admin():
            self.admin_user = user
        return user

    def is_admin(self):
        if self.admin_user:
            return True
        if not self.current_user:
            return False
        return self.current_user.is_admin()

    def login_user(self, user):
        logging.info("LOGIN: %s - %d - %s" % (self.request.remote_ip, user.id, user.username))
        self.set_secure_cookie("user_id", str(user.id))
        self.set_secure_cookie("lt", str(int(time.time())))
        user.access_time = datetime.datetime.now()
        user.extra["login_ip"] = self.request.remote_ip
        user.save()

    def add_msg(self, status, msg):
        m = Message(self.user_id(), status, msg)
        if m.reader_id:
            m.save()

    def pop_messages(self):
        if not self.current_user:
            return []
        messages = self.current_user.messages
        for m in messages:
            self.session.delete(m)
        self.session.commit()
        return messages

    def user_history(self, action, book):
        if not self.user_id():
            return
        extra = self.current_user.extra
        history = extra.get(action, [])
        for val in history[:12]:
            if val["id"] == book["id"]:
                return
        val = {
            "id": book["id"],
            "title": book["title"],
            "timestamp": int(time.time()),
        }
        history.insert(0, val)
        # an item is about 100Byte, sqlite's max length is 32KB
        # we have five type of history, so make a average limit of max history
        ITEM_COUNT_LIMIT = 60  # = 32KB/100B/5
        extra[action] = history[:ITEM_COUNT_LIMIT]
        user = self.current_user
        user.extra.update(extra)
        user.save()

    def last_modified(self, updated):
        """
        Generates a locale independent, english timestamp from a datetime
        object
        """
        lm = updated.strftime("day, %d month %Y %H:%M:%S GMT")
        day = {0: "Sun", 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat"}
        lm = lm.replace("day", day[int(updated.strftime("%w"))])
        month = {
            1: "Jan",
            2: "Feb",
            3: "Mar",
            4: "Apr",
            5: "May",
            6: "Jun",
            7: "Jul",
            8: "Aug",
            9: "Sep",
            10: "Oct",
            11: "Nov",
            12: "Dec",
        }
        return lm.replace("month", month[updated.month])

    def sort(self, items, field, order):
        from calibre.library.caches import SortKey, SortKeyGenerator

        class CSSortKeyGenerator(SortKeyGenerator):
            def __init__(self, fields, fm, db_prefs):
                SortKeyGenerator.__init__(self, fields, fm, None, db_prefs)

            def __call__(self, record):
                values = tuple(self.itervals(record))
                return SortKey(self.orders, values)

        field = self.db.data.sanitize_sort_field_name(field)
        if field not in self.db.field_metadata.sortable_field_keys():
            raise web.HTTPError(400, "%s is not a valid sort field" % field)

        keyg = CSSortKeyGenerator([(field, order)], self.db.field_metadata, self.db.prefs)
        items.sort(key=keyg)

    def get_template_path(self):
        """获取模板路径"""
        return CONF.get("resource_path", "templates")

    def create_template_loader(self, template_path):
        """根据template_path创建相对应的Jinja2 Environment"""
        temp_path = template_path
        if isinstance(template_path, (list, tuple)):
            temp_path = template_path[0]

        env = BaseHandler._path_to_env.get(temp_path)
        if not env:
            logging.debug("create template env for [%s]" % template_path)
            _loader = FileSystemLoader(template_path)
            env = Environment(loader=_loader)
            env.filters["day"] = day_format
            env.filters["website"] = website_format
            # env.globals['gettext'] = _
            BaseHandler._path_to_env[temp_path] = env
        return env

    def render_string(self, template_name, **kwargs):
        """使用Jinja2模板引擎"""
        env = self.create_template_loader(self.get_template_path())
        t = env.get_template(template_name)
        namespace = self.get_template_namespace()
        namespace.update(kwargs)
        return t.render(**namespace)

    def html_page(self, template, *args, **kwargs):
        self.set_header("Cache-Control", "max-age=0")
        request = self.request
        request.user = self.current_user
        request.user_extra = {}
        request.admin_user = self.admin_user
        if request.user:
            request.user_extra = self.current_user.extra
            if not request.user.avatar:
                request.user.avatar = "//tva1.sinaimg.cn/default/images/default_avatar_male_50.gif"
            else:
                request.user.avatar = request.user.avatar.replace("http://", "//")

        last_week = datetime.datetime.now() - datetime.timedelta(days=7)
        page_vars = {
            "db": self.db,
            "messages": self.pop_messages(),
            "count_all_users": self.session.query(sql_func.count(Reader.id)).scalar(),
            "count_hot_users": self.session.query(sql_func.count(Reader.id))
            .filter(Reader.access_time > last_week)
            .scalar(),
            "IMG": self.cdn_url,
            "SITE_TITLE": CONF["site_title"],
        }
        vals = dict(*args, **kwargs)
        vals.update(page_vars)
        vals.update(vars())
        del vals["self"]
        self.write(self.render_string(template, **vals))

    def get_book(self, book_id):
        books = self.get_books(ids=[int(book_id)])
        if not books:
            self.write({"err": "not_found", "msg": _(u"抱歉，这本书不存在")})
            self.set_status(200)
            raise web.Finish()
        return books[0]

    def is_book_owner(self, book_id, user_id):
        auto = int(CONF.get("auto_login", 0))
        if auto:
            return True

        query = self.session.query(Item)
        query = query.filter(Item.book_id == book_id)
        query = query.filter(Item.collector_id == user_id)
        return query.count() > 0

    def get_books(self, *args, **kwargs):
        _ts = time.time()
        books = self.db.get_data_as_dict(*args, **kwargs)
        logging.debug(
            "[%5d ms] select books from library  (count = %d)" % (int(1000 * (time.time() - _ts)), len(books))
        )

        item = Item()
        empty_item = item.to_dict()
        empty_item["collector"] = self.session.query(Reader).order_by(Reader.id).first()
        ids = [book["id"] for book in books]
        items = self.session.query(Item).filter(Item.book_id.in_(ids)).all() if ids else []
        maps = {}
        for b in items:
            d = b.to_dict()
            c = b.collector.to_dict() if b.collector else empty_item["collector"]
            d["collector"] = c
            maps[b.book_id] = d
        for book in books:
            book.update(maps.get(book["id"], empty_item))
        logging.debug(
            "[%5d ms] select books from database (count = %d)" % (int(1000 * (time.time() - _ts)), len(books))
        )
        return books

    def count_increase(self, book_id, **kwargs):
        try:
            item = self.session.query(Item).filter(Item.book_id == book_id).one()
        except:
            item = Item()
            item.book_id = book_id

        item.count_guest += kwargs.get("count_guest", 0)
        item.count_visit += kwargs.get("count_visit", 0)
        item.count_download += kwargs.get("count_download", 0)
        item.save()

    def search_for_books(self, query):
        self.search_restriction = ""
        return self.db.search_getting_ids(
            (query or "").strip(),
            self.search_restriction,
            sort_results=False,
            use_virtual_library=False,
        )

    def all_tags_with_count(self):
        sql = """SELECT tags.name, count(distinct book) as count
        FROM tags left join books_tags_link on tags.id = books_tags_link.tag
        group by tags.id"""
        tags = dict((i[0], i[1]) for i in self.cache.backend.conn.get(sql))
        return tags

    def get_category_with_count(self, field):
        table = field if field in ["series"] else field + "s"
        name_column = "A.rating as name" if field in ["rating"] else "A.name"
        args = {"table": table, "field": field, "name_column": name_column}
        sql = (
            """SELECT A.id, %(name_column)s, count(distinct book) as count
            FROM %(table)s as A left join books_%(table)s_link as B
            on A.id = B.%(field)s group by A.id"""
            % args
        )
        logging.debug(sql)
        rows = self.cache.backend.conn.get(sql)
        items = [{"id": a, "name": b, "count": c} for a, b, c in rows]
        return items

    def books_by_id(self):
        sql = "SELECT id FROM books order by id desc"
        ids = [v[0] for v in self.cache.backend.conn.get(sql)]
        return ids

    def get_argument_start(self):
        start = self.get_argument("start", 0)
        try:
            start = int(start)
        except:
            start = 0
        return max(0, start)


class ListHandler(BaseHandler):
    def get_item_books(self, category, name):
        books = []
        item_id = self.cache.get_item_id(category, name)
        if item_id:
            ids = self.db.get_books_for_category(category, item_id)
            books = self.db.get_data_as_dict(ids=ids)
        return books

    def do_sort(self, items, field, ascending):
        items.sort(key=lambda x: x[field], reverse=not ascending)

    def sort_books(self, items, field):
        fm = self.db.field_metadata
        keys = frozenset(fm.sortable_field_keys())
        if field in keys:
            ascending = fm[field]["datatype"] not in (
                "rating",
                "datetime",
                "series",
                "timestamp",
            )
            self.do_sort(items, field, ascending)
        else:
            self.do_sort(items, "id", False)
        return None

    @js
    def render_book_list(self, all_books, ids=None, title=None, sort_by_id=False):
        start = self.get_argument_start()
        try:
            size = int(self.get_argument("size"))
        except:
            size = 60
        delta = min(max(size, 60), 100)

        if ids:
            ids = list(ids)
            count = len(ids)
            books = self.get_books(ids=ids[start : start + delta])
            if sort_by_id:
                # 归一化，按照id从大到小排列。
                self.do_sort(books, "id", False)
        else:
            count = len(all_books)
            books = all_books[start : start + delta]
        return {
            "err": "ok",
            "title": title,
            "total": count,
            "books": [self.fmt(b) for b in books],
        }

    def fmt(self, b):
        return utils.BookFormatter(self, b).format()
