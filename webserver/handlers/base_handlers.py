#!/usr/bin/python
#-*- coding: UTF-8 -*-


import re, os, logging, sys, time, datetime
from tornado import web, locale
from tornado.options import define, options
from jinja2 import Environment, FileSystemLoader
from functools import wraps
from collections import defaultdict
from gettext import gettext as _
import json

import social_tornado.handlers

from calibre.ebooks.metadata.meta import get_metadata
from calibre import fit_image, guess_type
from calibre.utils.date import fromtimestamp
from calibre.utils.smtp import sendmail, create_mail
from calibre.utils.logging import Log, FileStream
from calibre.utils.filenames import ascii_filename
from calibre.utils.magick.draw import (save_cover_data_to, Image,
        thumbnail as generate_thumbnail)
from calibre.customize.conversion import OptionRecommendation, DummyReporter

# import douban
from models import Reader, Message, Item

messages = defaultdict(list)


def day_format(value, format='%Y-%m-%d'):
    try: return value.strftime(format)
    except: return "1990-01-01"

def website_format(value):
    links = []
    for link in value.split(";"):
        if link.startswith("douban://"):
            douban_id = link.split("//")[-1]
            links.append( u"<a target='_blank' href='https://book.douban.com/subject/%s/'>豆瓣</a> " % douban_id )
        elif link.startswith("isbn://"):
            douban_id = link.split("//")[-1]
            links.append( u"<a target='_blank' href='https://book.douban.com/isbn/%s/'>豆瓣</a> " % douban_id )
        elif link.startswith("http://"):
            links.append( u"<a target='_blank' href='%s'>参考链接</a> " % link )
    return ";".join(links)


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
        ScopedSession = self.settings['ScopedSession']
        self.session = ScopedSession() # new sql session
        self.db = self.settings['legacy']
        self.cache = self.db.new_api
        self.build_time = self.settings['build_time']
        self.default_cover = self.settings['default_cover']
        self.admin_user = None
        self.static_host = self.settings.get("static_host", "")
        if self.static_host:
            self.static_host = self.request.protocol + "://" + self.static_host

    def on_finish(self):
        ScopedSession = self.settings['ScopedSession']
        ScopedSession.remove()

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

        logging.debug("Query User [%s %s ]" % (user_id, user))
        logging.debug("Query admin_user [%s %s ]" % (admin_id, self.admin_user) )
        return user

    def is_admin(self):
        if self.admin_user: return True
        if not self.current_user: return False
        return self.current_user.is_admin()

    def login_user(self, user):
        self.set_secure_cookie('user_id', str(user.id))

    def add_msg(self, status, msg):
        m = Message(self.user_id(), status, msg)
        if m.reader_id:
            m.save()

    def pop_messages(self):
        if not self.current_user: return []
        messages = self.current_user.messages
        for m in messages:
            self.session.delete(m)
        self.session.commit()
        return messages

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
        user.save()

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
            env.filters['website'] = website_format
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

    def json_page(self, template, vals):
        p = template.split(".html")[0].replace("/", ".")
        try:
            m = __import__("jsons."+p)
            for pp in p.split("."):
                m = getattr(m, pp)
            m = reload(m)
            self.write( m.json_output(self, vals) )
        except Exception as e:
            import traceback
            logging.error(traceback.format_exc())
            self.write( {"error": "json func error"} )

    def html_page(self, template, *args, **kwargs):
        db = self.db
        request = self.request
        request.user = self.current_user
        request.user_extra = {}
        request.admin_user = self.admin_user
        messages = self.pop_messages()
        if request.user:
            request.user_extra = self.current_user.extra
            if not request.user.avatar:
                request.user.avatar = "//tva1.sinaimg.cn/default/images/default_avatar_male_50.gif"
            else:
                request.user.avatar = request.user.avatar.replace("http://", "//")

        last_week = datetime.datetime.now() - datetime.timedelta(days=7)

        from sqlalchemy import func
        count_all_users = self.session.query(func.count(Reader.id)).scalar()
        count_hot_users = self.session.query(func.count(Reader.id)).filter(Reader.access_time > last_week).scalar()

        IMG = self.static_host
        vals = dict(*args, **kwargs)

        vals.update( vars() )
        del vals['self']
        if self.get_argument("fmt", 0) == "json":
            self.json_page(template, vals)
        else:
            self.write( self.render_string(template, **vals) )

    def get_book(self, book_id):
        books = self.get_books(ids=[int(book_id)])
        if not books:
            raise web.HTTPError(404, reason = _(u"抱歉，这本书不存在") )
        return books[0]

    def is_book_owner(self, book_id, user_id):
        auto = int(self.settings.get('auto_login', 0))
        if auto: return True

        query = self.session.query(Item)
        query = query.filter(Item.book_id == book_id)
        query = query.filter(Item.collector_id == user_id)
        return (query.count() > 0)

    def get_books(self, *args, **kwargs):
        _ts = time.time()
        books = self.db.get_data_as_dict(*args, **kwargs)
        logging.debug("[%5d ms] select books from library  (count = %d)"
                % ( int(1000*(time.time() - _ts)), len(books) ) )

        item = Item()
        empty_item = item.to_dict()
        empty_item['collector'] = self.session.query(Reader).order_by(Reader.id).first()
        ids = [ book['id'] for book in books ]
        items = self.session.query(Item).filter(Item.book_id.in_(ids)).all()
        maps = {}
        for b in items:
            d = b.to_dict()
            c = b.collector.to_dict() if b.collector else empty_item['collector']
            d['collector'] = c
            maps[b.book_id] = d
        for book in books:
            book.update( maps.get(book['id'], empty_item) )
        logging.debug("[%5d ms] select books from database (count = %d)"
                % ( int(1000*(time.time() - _ts)), len(books) ) )
        return books

    def count_increase(self, book_id, **kwargs):
        try:
            item = self.session.query(Item).filter(Item.book_id == book_id).one()
        except:
            item = Item()
            item.book_id = book_id

        item.count_guest += kwargs.get('count_guest', 0)
        item.count_visit += kwargs.get('count_visit', 0)
        item.count_download += kwargs.get('count_download', 0)
        item.save()

    def search_for_books(self, query):
        return self.db.search_getting_ids(
                (query or '').strip(), self.search_restriction,
                sort_results=False, use_virtual_library=False)

    def all_tags_with_count(self):
        sql = 'SELECT tags.name, count(distinct book) as count FROM tags left join books_tags_link on tags.id = books_tags_link.tag group by tags.id'
        tags = dict( (i[0], i[1]) for i in self.cache.backend.conn.get(sql) )
        return tags

    def books_by_timestamp(self):
        sql = 'SELECT id, timestamp FROM books order by timestamp desc';
        ids =  [ v[0] for v in self.cache.backend.conn.get(sql) ]
        return ids

    def get_argument_start(self):
        start = self.get_argument("start", 0)
        try: start = int(start)
        except: start = 0
        if start < 0: start = 0
        return start

    def get_path_progress(self, book_id):
        return os.path.join(self.settings['progress_path'], 'progress-%s.log' % book_id)

class ListHandler(BaseHandler):
    def get_item_books(self, category, name):
        ids = books = []
        item_id = self.cache.get_item_id(category, name)
        if item_id:
            ids = self.db.get_books_for_category(category, item_id)
            books = self.db.get_data_as_dict(ids=ids)
        return books

    def do_sort(self, items, field, ascending):
        items.sort(cmp=lambda x,y: cmp(x[field], y[field]), reverse=not ascending)

    def sort_books(self, items, field):
        self.do_sort(items, 'title', True)
        fm = self.db.field_metadata
        keys = frozenset(fm.sortable_field_keys())
        if field in keys:
            ascending = fm[field]['datatype'] not in ('rating', 'datetime', 'series', 'timestamp')
            self.do_sort(items, field, ascending)
        return None

    def render_book_list(self, all_books, vars_, ids=None):
        start = self.get_argument_start()
        sort = self.get_argument("sort", "timestamp")

        if ids: all_books = ids
        delta = 20
        count = len(all_books)
        page_max = (count-1) / delta
        page_now = start / delta
        pages = []
        for p in range(page_now-4, page_now+4):
            if 0 <= p and p <= page_max:
                pages.append(p)

        if ids:
            books = self.get_books(ids=ids[start:start+delta])
        else:
            self.sort_books(all_books, sort)
            books = all_books[start:start+delta]
        vars_.update(vars())
        if self.get_argument("fmt", 0) == "json":
            self.write( {
                "total": count,
                "books": [
                    {k:v for k,v in b.items() if k in ["id", "title", "author", "comments"]} for b in books
                ],
            })
            return
        return self.html_page('book/list.html', vars_)


