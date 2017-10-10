#!/usr/bin/python
#-*- coding: UTF-8 -*-

import datetime
import logging
from tornado import web
from models import Reader
from base_handlers import BaseHandler

class Done(BaseHandler):
    def get(self):
        user = self.get_current_user()
        user.save()
        if user and not user.extra:
            socials = user.social_auth.all()
            if socials:
                logging.debug("init new user %s" % user.username)
                user.init(socials[0])
                user.save()
        self.redirect('/')

class Login(BaseHandler):
    def get(self):
        url = self.get_argument("url", "")
        return self.html_page('login.html', vars())

class Logout(BaseHandler):
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.set_secure_cookie("admin_id", "")
        self.redirect('/')

class SettingView(BaseHandler):
    def get(self, **kwrags):
        user = self.current_user
        return self.html_page('setting/view.html', vars())

class SettingSave(BaseHandler):
    @web.authenticated
    def post(self):
        user = self.current_user
        modify = user.extra
        for key in ['kindle_email']:
            if key in self.request.arguments:
                modify[key] = self.get_argument(key)
                user.email = self.get_argument(key)
        if modify:
            logging.debug(modify)
            user.extra.update(modify)
            user.update_time = datetime.datetime.now()
            user.save()
            self.add_msg("success", _("Settings saved."))
        else:
            self.add_msg("info", _("Nothing changed."))
        self.redirect('/setting', 302)

class UserView(BaseHandler):
    @web.authenticated
    def get(self):
        nav = "user"
        user = self.current_user
        output = {}
        for key in ['read_history', 'visit_history']:
            ids = [ b['id'] for b in user.extra[key]][:24]
            books = self.db.get_data_as_dict(ids=ids)
            orders = dict( zip(ids, range(100)) )
            books.sort(lambda x,y: cmp(orders.get(x['id']), orders.get(y['id'])))
            output[key] = books[:12]

        return self.html_page('user/view.html', vars())

class AdminView(BaseHandler):
    @web.authenticated
    def get(self):
        if not self.is_admin():
            self.redirect('/', 302)
        users = self.session.query(Reader).order_by(Reader.access_time.desc()).all()
        return self.html_page('admin/view.html', vars())

class AdminSet(BaseHandler):
    @web.authenticated
    def get(self):
        user_id = self.get_argument("user_id", None)
        if user_id and self.is_admin():
            self.set_secure_cookie("admin_id", self.user_id())
            self.set_secure_cookie("user_id", user_id)
        self.redirect('/', 302)


def routes():
    return                     [
            (r'/done/',        Done),
            (r"/login",        Login),
            (r'/logout',       Logout),
            (r'/setting',      SettingView),
            (r'/setting/save', SettingSave),
            (r'/user',         UserView),
            (r'/admin',        AdminView),
            (r'/admin/set',    AdminSet),
    ]


