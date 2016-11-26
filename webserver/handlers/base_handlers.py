#!/usr/bin/python
#-*- coding: UTF-8 -*-


import re, os, logging, sys, time
from tornado import web, locale
from tornado.options import define, options
from jinja2 import Environment, FileSystemLoader
from functools import wraps
from collections import defaultdict
from gettext import gettext as _
from cache import Cache

from calibre.utils.config import tweaks
import social.apps.tornado_app.handlers

from calibre.ebooks.metadata.meta import get_metadata
from calibre import fit_image, guess_type
from calibre.utils.config import tweaks
from calibre.utils.date import fromtimestamp
from calibre.utils.smtp import sendmail, create_mail
from calibre.utils.logging import Log
from calibre.utils.filenames import ascii_filename
from calibre.utils.magick.draw import (save_cover_data_to, Image,
        thumbnail as generate_thumbnail)
from calibre.customize.conversion import OptionRecommendation, DummyReporter

# import douban
from models import Reader

messages = defaultdict(list)

def day_format(value, format='%Y-%m-%d'):
    try: return value.strftime(format)
    except: return "1990-01-01"

def json_response(func):
    def do(self, *args, **kwargs):
        rsp = func(self, *args, **kwargs)
        self.write( rsp )
        return
    return do

class BaseHandler(web.RequestHandler):
    _path_to_env = {}

    def head(self, *args, **kwargs):
        return self.get(*args, **kwargs)

    def initialize(self):
        self.session = self.settings['session']
        self.cache = self.settings['cache']
        self.db = self.cache.db
        path = self.settings['static_path'] + '/img/default_cover.jpg'
        self.build_time = fromtimestamp(os.stat(path).st_mtime)
        self.default_cover = open(path, 'rb').read()
        self.admin_user = None
        self.static_host = self.settings.get("static_host", "")
        if self.static_host:
            self.static_host = self.request.protocol + "://" + self.static_host

    def static_url(self, path, **kwargs):
        url = super(BaseHandler, self).static_url(path, **kwargs)
        return self.static_host + url

    def user_id(self):
        return self.get_secure_cookie('user_id')

    def get_current_user(self):
        user = None
        user_id = self.user_id()
        if user_id:
            user = self.session.query(Reader).get(int(user_id))

        admin_id = self.get_secure_cookie("admin_id")
        if admin_id:
            self.admin_user = self.session.query(Reader).get(int(admin_id))
        elif user and user.is_admin():
            self.admin_user = user

        logging.debug("Query User [%s-%s]" % (user_id, user))
        logging.debug("Query admin_user [%s-%s]" % (admin_id, self.admin_user) )
        return user

    def is_admin(self):
        if self.admin_user: return True
        return self.current_user.is_admin()

    def login_user(self, user):
        self.set_secure_cookie('user_id', str(user.id))

    def add_msg(self, status, msg):
        global messages
        uid = self.user_id()
        messages[uid].append( {'status': status, 'msg': msg})

    def user_history(self, action, book):
        if not self.user_id(): return
        extra = self.current_user.extra
        history = extra.get(action, [])
        for val in history[:12]:
            if val['id'] == book['id']:
                return
        val = {
            'id': book['id'],
            'title': book['title'],
            'timestamp': int(time.time()),
        }
        history.insert(0, val)
        extra[action] = history[:200]
        user = self.current_user
        user.extra.update(extra)
        self.session.add(user)
        self.session.commit()

    def get_template_path(self):
        """ 获取模板路径 """
        return self.settings.get('template_path', 'templates')

    def create_template_loader(self, template_path):
        """ 根据template_path创建相对应的Jinja2 Environment """
        temp_path = template_path
        if isinstance(template_path, (list, tuple)):
            temp_path = template_path[0]

        env = BaseHandler._path_to_env.get(temp_path)
        if not env:
            logging.debug("create template env for [%s]" % template_path)
            _loader = FileSystemLoader(template_path)
            env = Environment(loader=_loader)
            env.filters['day'] = day_format
            #env.globals['gettext'] = _
            BaseHandler._path_to_env[temp_path] = env
        return env

    def render_string(self, template_name, **kwargs):
        """ 使用Jinja2模板引擎 """
        env = self.create_template_loader(self.get_template_path())
        t = env.get_template(template_name)
        namespace = self.get_template_namespace()
        namespace.update(kwargs)
        return t.render(**namespace)

    def html_page(self, template, *args, **kwargs):
        global messages
        db = self.db
        request = self.request
        request.user = self.current_user
        request.user_extra = {}
        request.admin_user = self.admin_user
        if self.user_id():
            request.user_extra = self.current_user.extra
        if request.user:
            if not request.user.avatar:
                request.user.avatar = "//tva1.sinaimg.cn/default/images/default_avatar_male_50.gif"
            else:
                request.user.avatar = request.user.avatar.replace("http://", "//")
        IMG = self.static_host
        vals = dict(*args, **kwargs)
        vals.update( vars() )
        del vals['self']
        self.write( self.render_string(template, **vals) )

class ListHandler(BaseHandler):
    def do_sort(self, items, field, order):
        items.sort(cmp=lambda x,y: cmp(x[field], y[field]), reverse=not order)

    def sort_books(self, items, field):
        self.do_sort(items, 'title', True)
        fm = self.db.field_metadata
        keys = frozenset(fm.sortable_field_keys())
        if field in keys:
            ascending = fm[field]['datatype'] not in ('rating', 'datetime', 'series', 'timestamp')
            self.do_sort(items, field, ascending)
        return None

    def render_book_list(self, all_books, vars_):
        start = self.get_argument("start", 0)
        sort = self.get_argument("sort", "timestamp")
        try: start = int(start)
        except: start = 0
        self.sort_books(all_books, sort)
        delta = 20
        page_max = len(all_books) / delta
        page_now = start / delta
        pages = []
        for p in range(page_now-4, page_now+4):
            if 0 <= p and p <= page_max:
                pages.append(p)
        books = all_books[start:start+delta]
        vars_.update(vars())
        return self.html_page('book/list.html', vars_)


