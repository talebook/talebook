#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import hashlib
import logging
import re
from gettext import gettext as _

import tornado.escape
from tornado import web
from webserver import loader
from webserver.services.mail import MailService
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import Message, Reader
from webserver.version import VERSION

CONF = loader.get_settings()
COOKIE_REDIRECT = "login_redirect"


class Done(BaseHandler):
    def update_userinfo(self):
        if int(CONF.get("auto_login", 0)):
            return

        user_id = self.get_secure_cookie("user_id")
        user = self.session.query(Reader).get(int(user_id)) if user_id else None
        if not user:
            return
        socials = user.social_auth.all()
        if not socials:
            return

        si = socials[0]
        if not user.extra:
            logging.info("init new user %s, info=%s" % (user.username, si))
            user.init(si)

        user.check_and_update(si)
        return user

    def get(self):
        user = self.update_userinfo()
        if not user.can_login():
            raise web.HTTPError(403, log_message=_(u"无权登录"))
        self.login_user(user)
        url = self.get_secure_cookie(COOKIE_REDIRECT)
        self.clear_cookie(COOKIE_REDIRECT)
        if not url:
            url = "/"
        self.redirect(url)


class UserUpdate(BaseHandler):
    @js
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        user = self.current_user
        nickname = data.get("nickname", "")
        if nickname:
            nickname = nickname.strip()
            if len(nickname) > 0:
                if len(nickname) < 3:
                    return {"err": "params.nickname.invald", "msg": _(u"昵称无效")}
                user.name = nickname

        p0 = data.get("password0", "").strip()
        p1 = data.get("password1", "").strip()
        p2 = data.get("password2", "").strip()
        if len(p0) > 0:
            if user.get_secure_password(p0) != user.password:
                return {"err": "params.password.error", "msg": _(u"密码错误")}
            if p1 != p2 or len(p1) < 8 or len(p1) > 20 or not re.match(Reader.RE_PASSWORD, p1):
                return {"err": "params.password.invalid", "msg": _(u"密码无效")}
            user.set_secure_password(p1)

        ke = data.get("kindle_email", "").strip()
        if len(ke) > 0:
            if not re.match(Reader.RE_EMAIL, ke):
                return {"err": "params.email.invalid", "msg": _(u"Kindle地址无效")}
            user.extra["kindle_email"] = ke

        try:
            user.save()
            self.add_msg("success", _("Settings saved."))
            return {"err": "ok"}
        except:
            return {"err": "db.error", "msg": _(u"数据库操作异常，请重试")}


class SignUp(BaseHandler):
    def check_active_code(self, username, code):
        user = self.session.query(Reader).filter(Reader.username == username).first()
        if not user or code != user.get_active_code():
            raise web.HTTPError(403, log_message=_(u"激活码无效"))
        user.active = True
        user.save()
        return self.redirect("/active/success")

    def send_active_email(self, user):
        code = user.get_active_code()
        link = "%s/api/active/%s/%s" % (self.site_url, user.username, code)
        args = {
            "site_title": CONF["site_title"],
            "username": user.username,
            "active_link": link,
        }
        mail_subject = CONF["SIGNUP_MAIL_TITLE"] % args
        mail_to = user.email
        mail_from = CONF["smtp_username"]
        mail_body = CONF["SIGNUP_MAIL_CONTENT"] % args
        MailService().send_mail(mail_from, mail_to, mail_subject, mail_body)

    @js
    def post(self):
        email = self.get_argument("email", "").strip()
        nickname = self.get_argument("nickname", "").strip()
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not nickname or not username or not password:
            return {"err": "params.invalid", "msg": _(u"用户名或密码无效")}

        if not re.match(Reader.RE_EMAIL, email):
            return {"err": "params.email.invalid", "msg": _(u"Email无效")}
        if len(username) < 5 or len(username) > 20 or not re.match(Reader.RE_USERNAME, username):
            return {"err": "params.username.invalid", "msg": _(u"用户名无效")}
        if len(password) < 8 or len(password) > 20 or not re.match(Reader.RE_PASSWORD, password):
            return {"err": "params.password.invalid", "msg": _(u"密码无效")}

        user = self.session.query(Reader).filter(Reader.username == username).first()
        if user:
            return {"err": "params.username.exist", "msg": _(u"用户名已被使用")}
        user = Reader()
        user.username = username
        user.name = nickname
        user.email = email
        user.avatar = CONF["avatar_service"] + "/avatar/" + hashlib.md5(email.encode("UTF-8")).hexdigest()
        user.create_time = datetime.datetime.now()
        user.update_time = datetime.datetime.now()
        user.access_time = datetime.datetime.now()
        user.active = False
        user.extra = {"kindle_email": ""}
        user.set_secure_password(password)
        try:
            user.save()
        except:
            import traceback

            logging.error(traceback.format_exc())
            return {"err": "db.error", "msg": _(u"系统异常，请重试或更换注册信息")}
        self.send_active_email(user)
        return {"err": "ok"}


class UserSendActive(SignUp):
    @js
    @auth
    def get(self):
        self.send_active_email(self.current_user)
        return {"err": "ok"}

    def post(self):
        return self.get()


class UserActive(SignUp):
    def get(self, username, code):
        return self.check_active_code(username, code)

    def post(self, username, code):
        return self.check_active_code(username, code)


class SignIn(BaseHandler):
    @js
    def post(self):
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not username or not password:
            return {"err": "params.invalid", "msg": _(u"用户名或密码错误")}
        user = self.session.query(Reader).filter(Reader.username == username).first()
        if not user:
            return {"err": "params.no_user", "msg": _(u"无此用户")}
        if user.get_secure_password(password) != user.password:
            return {"err": "params.invalid", "msg": _(u"用户名或密码错误")}
        if not user.can_login():
            return {"err": "permission", "msg": _(u"无权登录")}
        logging.debug("PERM = %s", user.permission)

        self.login_user(user)
        return {"err": "ok", "msg": "ok"}


class UserReset(BaseHandler):
    @js
    def post(self):
        email = self.get_argument("email", "").strip().lower()
        username = self.get_argument("username", "").strip().lower()
        if not username or not email:
            return {"err": "params.invalid", "msg": _(u"用户名或邮箱错误")}
        user = self.session.query(Reader).filter(Reader.username == username, Reader.email == email).first()
        if not user:
            return {"err": "params.no_user", "msg": _(u"无此用户")}
        p = user.reset_password()

        # send notice email
        args = {
            "site_title": CONF["site_title"],
            "username": user.username,
            "password": p,
        }
        mail_subject = CONF["RESET_MAIL_TITLE"] % args
        mail_to = user.email
        mail_from = CONF["smtp_username"]
        mail_body = CONF["RESET_MAIL_CONTENT"] % args
        MailService().send_mail(mail_from, mail_to, mail_subject, mail_body)

        # do save into db
        try:
            user.save()
            self.add_msg("success", _("你刚刚重置了密码"))
            return {"err": "ok"}
        except:
            return {"err": "db.error", "msg": _(u"系统繁忙")}


class SignOut(BaseHandler):
    @js
    @auth
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.set_secure_cookie("admin_id", "")
        return {"err": "ok", "msg": _(u"你已成功退出登录。")}


class UserMessages(BaseHandler):
    @js
    def get(self):
        user = self.current_user
        rsp = {
            "err": "ok",
            "messages": [],
        }

        if user:
            for msg in user.messages:
                if not msg.unread:
                    continue
                m = {
                    "id": msg.id,
                    "title": msg.title,
                    "status": msg.status,
                    "create_time": msg.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                    "data": msg.data,
                }
                rsp["messages"].append(m)
        return rsp

    @js
    @auth
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        if "id" not in data:
            return {"err": "params.invalid", "msg": _(u"ID错误")}
        msg = self.session.query(Message).filter(Message.id == data["id"]).first()
        if not msg:
            return {"err": "params.not_found", "msg": _(u"查无此ID")}

        msg.unread = False
        msg.update_time = datetime.datetime.now()
        msg.save()
        return {"err": "ok"}


class UserInfo(BaseHandler):
    def get_sys_info(self):
        from sqlalchemy import func

        db = self.db
        last_week = datetime.datetime.now() - datetime.timedelta(days=7)
        count_all_users = self.session.query(func.count(Reader.id)).scalar()
        count_hot_users = self.session.query(func.count(Reader.id)).filter(Reader.access_time > last_week).scalar()
        return {
            "books": db.count(),
            "tags": len(db.all_tags()),
            "authors": len(db.all_authors()),
            "publishers": len(db.all_publishers()),
            "series": len(db.all_series()),
            "mtime": db.last_modified().strftime("%Y-%m-%d"),
            "users": count_all_users,
            "active": count_hot_users,
            "version": VERSION,
            "title": CONF["site_title"],
            "socials": CONF["SOCIALS"],
            "friends": CONF["FRIENDS"],
            "footer": CONF["FOOTER"],
            "header": CONF["HEADER"],
            "allow": {
                "register": CONF["ALLOW_REGISTER"],
                "download": CONF["ALLOW_GUEST_DOWNLOAD"],
                "push": CONF["ALLOW_GUEST_PUSH"],
                "read": CONF["ALLOW_GUEST_READ"],
            },
        }

    def get_user_info(self, detail):
        user = self.current_user
        d = {
            "avatar": "https://tva1.sinaimg.cn/default/images/default_avatar_male_50.gif",
            "is_login": False,
            "is_admin": False,
            "nickname": "",
            "email": "",
            "kindle_email": "",
            "extra": {},
        }

        if not user:
            return d

        d.update(
            {
                "is_login": True,
                "is_admin": user.is_admin(),
                "is_active": user.is_active(),
                "nickname": user.name or "",
                "username": user.username,
                "email": user.email,
                "extra": {},
                "create_time": user.create_time.strftime("%Y-%m-%d %H:%M:%S"),
            }
        )
        if user.avatar:
            gravatar_url = "https://www.gravatar.com"
            d["avatar"] = user.avatar.replace("http://", "https://").replace(gravatar_url, CONF["avatar_service"])
        if user.extra:
            d["kindle_email"] = user.extra.get("kindle_email", "")
            if detail:
                for k, v in user.extra.items():
                    if k.endswith("_history"):
                        ids = [b["id"] for b in v][:24]
                        books = self.db.get_data_as_dict(ids=ids)
                        show = set([b["id"] for b in books])
                        n = []
                        for b in v:
                            if b["id"] not in show:
                                continue
                            b["img"] = self.cdn_url + "/get/cover/%(id)s.jpg?t=%(timestamp)s" % b
                            b["href"] = "/book/%(id)s" % b
                            n.append(b)
                        v = n[:12]

                    d["extra"][k] = v

        return d

    @js
    def get(self):
        if CONF.get("installed", None) is False:
            return {"err": "not_installed"}

        detail = self.get_argument("detail", "")
        rsp = {
            "err": "ok",
            "cdn": self.cdn_url,
            "sys": self.get_sys_info() if not detail else {},
            "user": self.get_user_info(detail),
        }
        return rsp


class Welcome(BaseHandler):
    def should_be_invited(self):
        pass

    @js
    def get(self):
        if not self.need_invited():
            return {"err": "free", "msg": _(u"无需访问码")}
        if self.invited_code_is_ok():
            return {"err": "free", "msg": _(u"已输入访问码")}
        return {"err": "ok", "msg": "", "welcome": CONF["INVITE_MESSAGE"]}

    @js
    def post(self):
        code = self.get_argument("invite_code", None)
        if not code or code != CONF["INVITE_CODE"]:
            return {"err": "params.invalid", "msg": _(u"访问码无效")}
        self.mark_invited()
        return {"err": "ok", "msg": ""}


def routes():
    return [
        (r"/api/welcome", Welcome),
        (r"/api/user/info", UserInfo),
        (r"/api/user/messages", UserMessages),
        (r"/api/user/sign_in", SignIn),
        (r"/api/user/sign_up", SignUp),
        (r"/api/user/sign_out", SignOut),
        (r"/api/user/update", UserUpdate),
        (r"/api/user/reset", UserReset),
        (r"/api/user/active/send", UserSendActive),
        (r"/api/active/(.*)/(.*)", UserActive),
        (r"/api/done/", Done),
    ]
