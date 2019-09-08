#!/usr/bin/python
#-*- coding: UTF-8 -*-

import time, datetime, logging, re, hashlib, json
from tornado import web
from models import Reader
from base_handlers import BaseHandler, json_response

COOKIE_REDIRECT = "login_redirect"

class Done(BaseHandler):
    def update_userinfo(self):
        if int(self.settings.get('auto_login', 0)): return

        user_id = self.get_secure_cookie('user_id')
        user = self.session.query(Reader).get(int(user_id)) if user_id else None
        if not user: return
        socials = user.social_auth.all()
        if not socials: return

        si = socials[0]
        info = dict(si.extra_data)
        logging.info("LOGIN: %d - %s - %s" % ( user.id, user.username, info))

        if not user.extra:
            logging.info("init new user %s, info=%s" % (user.username, si))
            user.init(si)

        user.check_and_update(si)
        self.access_time = datetime.datetime.now()
        user.extra['login_ip'] = self.request.remote_ip
        user.save()

    def get(self):
        login_time = int(time.time())
        self.set_secure_cookie("lt", str(login_time))
        self.update_userinfo()
        url = self.get_secure_cookie(COOKIE_REDIRECT)
        self.clear_cookie(COOKIE_REDIRECT)
        if not url: url = "/"
        self.redirect( url )

class Login(BaseHandler):
    def auto_login(self):
        auto = int(self.settings.get('auto_login', 0))
        if not auto: return False

        logging.info("Auto login as user %s" % auto)
        self.set_secure_cookie("user_id", str(auto))
        user = self.session.query(Reader).get(auto)
        if not user:
            logging.info("Init default auto login user")
            user = Reader(id=auto)
            user.init_default_user()
            user.save()
        login_time = int(time.time())
        self.set_secure_cookie("lt", str(login_time))
        self.add_msg("success", _("自动登录成功。"))
        return True

    def get(self):
        url = self.get_save_referer()
        self.clear_cookie("next")
        self.set_secure_cookie(COOKIE_REDIRECT, url)
        if self.auto_login():
            return self.redirect( url )
        return self.html_page('login.html', vars())

class Logout(BaseHandler):
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.set_secure_cookie("admin_id", "")
        url = self.get_save_referer()
        self.redirect(url)

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
    #@web.authenticated
    @json_response
    def get(self):
        #if not self.is_admin():
        #    return {'err': 'permission.not_admin', 'msg': _(u'Not Admin')}

        num = max(10, int(self.get_argument("num", 20)))
        page = max(0, int(self.get_argument("page", 0)))
        sort = self.get_argument("sort", "access_time")
        desc = self.get_argument("desc", "desc")
        logging.debug("num=%d, page=%d, sort=%s, desc=%s" % (num, page, sort, desc))

        f = {
                "id": Reader.id,
                "access_time": Reader.access_time,
                "create_time": Reader.create_time,
                "update_time": Reader.update_time,
                "username": Reader.username,
                }.get(sort, Reader.id)
        if desc == "false":
            f = f.asc()
        else:
            f = f.desc()

        query = self.session.query(Reader).order_by(f)
        total = query.count()
        start = page * num
        items = []
        for user in query.limit(num).offset(start).all():
            d = {
                    'id': user.id,
                    'username': user.username,
                    'name': user.name,
                    'email': user.email,
                    'avatar': user.avatar,
                    'is_active': user.is_active(),
                    'is_admin': user.is_admin(),
                    'extra': dict(user.extra),
                    'provider': user.social_auth[0].provider if user.social_auth.count() else "register",
                    'create_time': user.create_time.strftime("%Y-%m-%d %H:%M:%S") if user.create_time else 'N/A',
                    'update_time': user.update_time.strftime("%Y-%m-%d %H:%M:%S") if user.update_time else 'N/A',
                    'access_time': user.access_time.strftime("%Y-%m-%d %H:%M:%S") if user.access_time else 'N/A',
                    }
            items.append( d )
        return {"err": 'ok', "users": {"items": items, "total": total}}

class AdminSet(BaseHandler):
    @web.authenticated
    def get(self):
        user_id = self.get_argument("user_id", None)
        if user_id and self.is_admin():
            self.set_secure_cookie("admin_id", self.user_id())
            self.set_secure_cookie("user_id", user_id)
        self.redirect('/', 302)

class SignUp(BaseHandler):
    @json_response
    def post(self):
        email = self.get_argument("email", "").strip()
        nickname = self.get_argument("nickname", "").strip()
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not nickname or not username or not password:
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码无效')}

        RE_EMAIL = r'[^@]+@[^@]+\.[^@]+'
        RE_USERNAME = r'[a-z][a-z0-9_]*'
        RE_PASSWORD = r'[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};\':",./<>?\|]*'
        if not re.match(RE_EMAIL, email):
            return {'err': 'params.email.invalid', 'msg': _(u'Email无效')}
        if len(username) < 6 or len(username) > 20 or not re.match(RE_USERNAME, username):
            return {'err': 'params.username.invalid', 'msg': _(u'用户名无效')}
        if len(password) < 8 or len(password) > 20 or not re.match(RE_PASSWORD, password):
            return {'err': 'params.password.invalid', 'msg': _(u'用户名无效')}

        user = self.session.query(Reader).filter(Reader.username==username).first()
        if user:
            return {'err': 'params.username.exist', 'msg': _(u'用户名已被使用')}
        user = Reader()
        user.username = username
        user.name = nickname
        user.email = email
        user.avatar = "https://www.gravatar.com/avatar/" + hashlib.md5(email).hexdigest()
        user.create_time = datetime.datetime.now()
        user.update_time = datetime.datetime.now()
        user.access_time = datetime.datetime.now()
        user.extra = {"kindle_email": ""}
        user.set_secure_password(password)
        try:
            user.save()
        except:
            import traceback
            logging.error(traceback.format_exc())
            return {'err': 'db.error', 'msg': _(u'系统异常，请重试或更换注册信息')}
        return {'err': 'ok'}

class SignIn(BaseHandler):
    @json_response
    def post(self):
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not username or not password:
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码错误')}
        user = self.session.query(Reader).filter(Reader.username==username).first()
        if not user:
            return {'err': 'params.no_user', 'msg': _(u'无此用户')}
        if user.get_secure_password(password) != user.password:
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码错误')}

        self.set_secure_cookie('user_id', str(user.id))
        self.set_secure_cookie("lt", str(int(time.time())))
        return {'err': 'ok', 'msg': 'ok'}

class SignOut(BaseHandler):
    @json_response
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.set_secure_cookie("admin_id", "")
        url = self.get_save_referer()
        return {'err': 'ok', 'msg': _(u'你已成功退出登录。')}

class UserMessages(BaseHandler):
    @json_response
    def get(self):
        db = self.db
        user = self.current_user
        rsp = {
                'err': 'ok',
                "messages": [],
            }

        if user:
            for msg in user.messages:
                msg['data'] = json.loads(msg['data'])
                rsp['messages'].append(msg)
        return rsp

class UserInfo(BaseHandler):
    @json_response
    def get(self):
        db = self.db

        from sqlalchemy import func
        last_week = datetime.datetime.now() - datetime.timedelta(days=7)
        count_all_users = self.session.query(func.count(Reader.id)).scalar()
        count_hot_users = self.session.query(func.count(Reader.id)).filter(Reader.access_time > last_week).scalar()

        user = self.current_user

        rsp = {
                'err': 'ok',
                "sys": {
                    "books":      db.count(),
                    "tags":       len( db.all_tags()       ),
                    "authors":    len( db.all_authors()    ),
                    "publishers": len( db.all_publishers() ),
                    "mtime":      db.last_modified().strftime("%Y-%m-%d"),
                    "users":      count_all_users,
                    "active":     count_hot_users,
                    "version":    "1.4.13",
                    "title":      self.settings['site_title'],
                    "friends": [
                        { "text": u"奇异书屋", "href": "https://www.talebook.org" },
                        { "text": u"芒果读书", "href": "http://diumx.com/" },
                        { "text": u"陈芸书屋", "href": "https://book.killsad.top/" },
                    ],
                },
                "user": {
                    "avatar": "https://tva1.sinaimg.cn/default/images/default_avatar_male_50.gif",
                    "is_login": (user != None),
                    "is_admin": (self.admin_user != None),
                    "nickname": user.username if user else "",
                    "kindle_email": "",
                },
            }

        if user:
            if user.extra:
                rsp['user']['kindle_email'] = user.extra.get("kindle_email", "")
            if user.avatar:
                rsp['user']['avatar'] = user.avatar.replace("http://", "https://")
        return rsp

class Welcome(BaseHandler):
    def should_be_invited(self):
        pass

    @json_response
    def post(self):
        code = self.get_argument("invite_code", None)
        if not code or code != self.settings['INVITE_CODE']:
            return {'err': 'params.invalid', 'msg': _(u'邀请码无效')}
        self.mark_invited()
        return {'err': 'ok', 'msg': 'ok'}


def routes():
    return  [
            (r'/api/welcome',           Welcome),
            (r'/api/user/info',         UserInfo),
            (r'/api/user/messages',     UserMessages),

            (r'/api/user/index',        UserView),
            (r"/api/user/sign_in",      SignIn),
            (r'/api/user/sign_up',      SignUp),
            (r'/api/user/sign_out',     SignOut),
            (r'/api/user/setting',      SettingView),
            (r'/api/user/setting/save', SettingSave),
            (r'/api/done/',             Done),

            (r'/api/sys/index',         AdminView),
            (r'/api/sys/settings',      AdminSet),
            (r'/api/sys/users',         AdminView),
            (r'/api/sys/messages',      AdminSet),
    ]


