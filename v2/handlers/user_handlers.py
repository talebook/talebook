#!/usr/bin/python
#-*- coding: UTF-8 -*-

from tornado import web
from base_handlers import BaseHandler

class Done(BaseHandler):
    def get(self):
        self.redirect('/')

class Login(BaseHandler):
    def get(self):
        self.set_secure_cookie("user_id", "4")
        return self.html_page('login.html', vars())

class Logout(BaseHandler):
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.redirect('/')

class SettingView(BaseHandler):
    def get(self, **kwrags):
        user = self.current_user
        return self.html_page('setting/view.html', vars())

class SettingSave(BaseHandler):
    @web.authenticated
    def post(self, **kwargs):
        user = self.current_user
        modify = user.extra
        for key in ['kindle_email']:
            if key in kwargs:
                modify[key] = kwargs[key]
        if modify:
            user.extra.update(modify)
            user.update_time = datetime.datetime.now()
            user.save()
            self.add_msg("success", _("Settings saved."))
        else:
            self.add_msg("info", _("Nothing changed."))
        raise self.redirect('/setting', 302)

class UserView(BaseHandler):
    @web.authenticated
    def get(self):
        nav = "user"
        user = self.current_user
        return self.html_page('user/view.html', vars())

class AdminView(BaseHandler):
    @web.authenticated
    def get(self):
        if not self.is_admin():
            raise self.redirect('/', 302)
        users = self.request.db.query(Reader).order_by(Reader.access_time.desc()).all()
        return self.html_page('admin/view.html', vars())

class AdminSet(BaseHandler):
    @web.authenticated
    def post(self):
        user_id = self.get_argument("user_id", None)
        if user_id and self.is_admin():
            self.set_secure_cookie("admin_id", self.user_id())
            self.set_secure_cookie("user_id", user_id)
        raise self.redirect('/', 302)


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


