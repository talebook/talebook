#!/usr/bin/python
#-*- coding: UTF-8 -*-

import time, datetime, logging, re, hashlib, json, os
import tornado.escape
from tornado import web
from models import Reader, Message
from base import BaseHandler, js, auth
from calibre.utils.smtp import sendmail, create_mail
from version import VERSION

import loader
CONF = loader.get_settings()

COOKIE_REDIRECT = "login_redirect"
RE_EMAIL = r'[^@]+@[^@]+\.[^@]+'
RE_USERNAME = r'[a-z][a-z0-9_]*'
RE_PASSWORD = r'[a-zA-Z0-9!@#$%^&*()_+\-=[\]{};\':",./<>?\|]*'



class Done(BaseHandler):
    def update_userinfo(self):
        if int(CONF.get('auto_login', 0)): return

        user_id = self.get_secure_cookie('user_id')
        user = self.session.query(Reader).get(int(user_id)) if user_id else None
        if not user: return
        socials = user.social_auth.all()
        if not socials: return

        si = socials[0]
        info = dict(si.extra_data)

        if not user.extra:
            logging.info("init new user %s, info=%s" % (user.username, si))
            user.init(si)

        user.check_and_update(si)
        return user

    def get(self):
        user = self.update_userinfo()
        self.login_user(user)
        url = self.get_secure_cookie(COOKIE_REDIRECT)
        self.clear_cookie(COOKIE_REDIRECT)
        if not url: url = "/"
        self.redirect( url )

class AdminUsers(BaseHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {'err': 'permission.not_admin', 'msg': _(u'当前用户非管理员')}

        num = max(10, int(self.get_argument("num", 20)))
        page = max(0, int(self.get_argument("page", 1)) - 1)
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

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {'err': 'permission.not_admin', 'msg': _(u'当前用户非管理员')}
        data = tornado.escape.json_decode(self.request.body)
        uid = data.get('id', None)
        if not uid:
            return {'err': 'params.invalid', 'msg': _(u'参数错误')}
        del data['id']
        if not data:
            return {'err': 'params.fields.invalid', 'msg': _(u'用户配置项参数错误')}
        user = self.session.query(Reader).filter(Reader.id==uid).first()
        if not user:
            return {'err': 'params.user.not_exist', 'msg': _(u'用户ID错误')}
        if 'active' in data: user.active = data['active']
        if 'admin' in data: user.admin = data['admin']

        p = data.get('permission', "")
        if not isinstance(p, (str, unicode)):
            return {'err': 'params.permission.invalid', 'msg': _(u'权限参数不对')}
        if p: user.set_permission(p)
        user.save()
        return {'err': 'ok'}

class AdminTestMail(BaseHandler):
    @js
    @auth
    def post(self):
        mail_server = self.get_argument('smtp_server')
        mail_username = self.get_argument('smtp_username')
        mail_password = self.get_argument('smtp_password')

        mail_from = mail_username
        mail_to = mail_username
        mail_subject = _(u'Calibre功能验证邮件')
        mail_body = _(u'这是一封测试邮件，验证邮件参数是否配置正确。')

        mail = self.create_mail(mail_from, mail_to, mail_subject, mail_body, None, None)
        try:
            sendmail(mail, from_=mail_from, to=[mail_to], timeout=10,
                port=465, encryption='SSL',
                relay=mail_server,
                username=mail_username,
                password=mail_password
                )
            return {'err': 'ok', 'msg': _(u'发送成功')}
        except Exception as e:
            import traceback
            logging.error(traceback.format_exc())
            return {'err': 'email.server_error', 'msg': str(e)}


class AdminOwnerMode(BaseHandler):
    @auth
    def get(self):
        user_id = self.get_argument("user_id", None)
        if user_id and self.is_admin():
            self.set_secure_cookie("admin_id", self.user_id())
            self.set_secure_cookie("user_id", user_id)
        self.redirect('/', 302)

class UserUpdate(BaseHandler):
    @js
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        user = self.current_user
        nickname = data.get('nickname', "").strip()
        if len(nickname) > 0:
            if len(nickname) < 3:
                return {'err': 'params.nickname.invald', 'msg': _(u'昵称无效')}
            user.name = nickname

        p0 = data.get('password0', "").strip()
        p1 = data.get('password1', "").strip()
        p2 = data.get('password2', "").strip()
        if len(p0) > 0:
            if user.get_secure_password(p0) != user.password:
                return {'err': 'params.password.error', 'msg': _(u'密码错误')}
            if p1 != p2 or len(p1) < 8 or len(p1) > 20 or not re.match(RE_PASSWORD, p1):
                return {'err': 'params.password.invalid', 'msg': _(u'密码无效')}
            user.set_secure_password(p1)

        ke = data.get('kindle_email', '').strip()
        if len(ke) > 0:
            if not re.match(RE_EMAIL, ke):
                return {'err': 'params.email.invalid', 'msg': _(u'Kindle地址无效')}
            user.extra['kindle_email'] = ke

        try:
            user.save()
            self.add_msg("success", _("Settings saved."))
            return {'err': 'ok'}
        except:
            return {'err': 'db.error', 'msg': _(u'数据库操作异常，请重试')}


class SignUp(BaseHandler):
    def check_active_code(self, username, code):
        user = self.session.query(Reader).filter(Reader.username==username).first()
        if not user or code != user.get_active_code():
            raise web.HTTPError(403, log_message = _(u'激活码无效'))
        user.active = True
        user.save()
        return self.redirect("/active/success")

    def send_active_email(self, user):
        site = self.request.protocol + "://" + self.request.host
        code = user.get_active_code()
        link = '%s/api/active/%s/%s' % (site, user.username, code)
        args = {
                'site_title': CONF['site_title'],
                'username': user.username,
                'active_link': link,
                }
        mail_subject = CONF['SIGNUP_MAIL_TITLE'] % args
        mail_to = user.email
        mail_from = CONF['smtp_username']
        mail_body = CONF['SIGNUP_MAIL_CONTENT'] % args
        mail = self.create_mail(mail_from, mail_to, mail_subject, mail_body, None, None)
        sendmail(mail, from_=mail_from, to=[mail_to], timeout=20,
                port=465, encryption='SSL',
                relay=CONF['smtp_server'],
                username=CONF['smtp_username'],
                password=CONF['smtp_password']
                )

    @js
    def post(self):
        email = self.get_argument("email", "").strip()
        nickname = self.get_argument("nickname", "").strip()
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not nickname or not username or not password:
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码无效')}

        if not re.match(RE_EMAIL, email):
            return {'err': 'params.email.invalid', 'msg': _(u'Email无效')}
        if len(username) < 5 or len(username) > 20 or not re.match(RE_USERNAME, username):
            return {'err': 'params.username.invalid', 'msg': _(u'用户名无效')}
        if len(password) < 8 or len(password) > 20 or not re.match(RE_PASSWORD, password):
            return {'err': 'params.password.invalid', 'msg': _(u'密码无效')}

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
        user.active = False
        user.extra = {"kindle_email": ""}
        user.set_secure_password(password)
        try:
            user.save()
        except:
            import traceback
            logging.error(traceback.format_exc())
            return {'err': 'db.error', 'msg': _(u'系统异常，请重试或更换注册信息')}
        self.send_active_email(user)
        return {'err': 'ok'}

class UserSendActive(SignUp):
    @js
    @auth
    def get(self):
        self.send_active_email(self.current_user)
        return {'err': 'ok'}

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
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码错误')}
        user = self.session.query(Reader).filter(Reader.username==username).first()
        if not user:
            return {'err': 'params.no_user', 'msg': _(u'无此用户')}
        if user.get_secure_password(password) != user.password:
            return {'err': 'params.invalid', 'msg': _(u'用户名或密码错误')}

        self.login_user(user)
        return {'err': 'ok', 'msg': 'ok'}

class UserReset(BaseHandler):
    @js
    def post(self):
        email = self.get_argument("email", "").strip().lower()
        username = self.get_argument("username", "").strip().lower()
        if not username or not email:
            return {'err': 'params.invalid', 'msg': _(u'用户名或邮箱错误')}
        user = self.session.query(Reader).filter(Reader.username==username, Reader.email == email).first()
        if not user:
            return {'err': 'params.no_user', 'msg': _(u'无此用户')}
        p = user.reset_password()

        # send notice email
        args = {
                'site_title': CONF['site_title'],
                'username': user.username,
                'password': p,
                }
        mail_subject = CONF['RESET_MAIL_TITLE'] % args
        mail_to = user.email
        mail_from = CONF['smtp_username']
        mail_body = CONF['RESET_MAIL_CONTENT'] % args
        mail = self.create_mail(mail_from, mail_to, mail_subject, mail_body, None, None)
        sendmail(mail, from_=mail_from, to=[mail_to], timeout=20,
                port=465, encryption='SSL',
                relay=CONF['smtp_server'],
                username=CONF['smtp_username'],
                password=CONF['smtp_password']
                )

        # do save into db
        try:
            user.save()
            self.add_msg("success", _("你刚刚重置了密码"))
            return {'err': 'ok'}
        except:
            return {'err': 'db.error', 'msg': _(u'系统繁忙')}


class SignOut(BaseHandler):
    @js
    @auth
    def get(self):
        self.set_secure_cookie("user_id", "")
        self.set_secure_cookie("admin_id", "")
        url = self.get_save_referer()
        return {'err': 'ok', 'msg': _(u'你已成功退出登录。')}

class UserMessages(BaseHandler):
    @js
    def get(self):
        db = self.db
        user = self.current_user
        rsp = {
                'err': 'ok',
                "messages": [],
            }

        if user:
            for msg in user.messages:
                if not msg.unread: continue
                m = {
                        'id': msg.id,
                        'title': msg.title,
                        'status': msg.status,
                        'create_time': msg.create_time.strftime("%Y-%m-%d %H:%M:%S"),
                        'data': msg.data,
                        }
                rsp['messages'].append(m)
        return rsp

    @js
    @auth
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        if 'id' not in data:
            return {'err': 'params.invalid', 'msg': _(u'ID错误')}
        msg = self.session.query(Message).filter(Message.id == data['id']).first()
        if not msg:
            return {'err': 'params.not_found', 'msg': _(u'查无此ID') }

        msg.unread = False
        msg.update_time = datetime.datetime.now()
        msg.save()
        return {'err': 'ok'}


class UserInfo(BaseHandler):
    def get_sys_info(self):
        from sqlalchemy import func

        db = self.db
        last_week = datetime.datetime.now() - datetime.timedelta(days=7)
        count_all_users = self.session.query(func.count(Reader.id)).scalar()
        count_hot_users = self.session.query(func.count(Reader.id)).filter(Reader.access_time > last_week).scalar()
        return {
                "books":      db.count(),
                "tags":       len( db.all_tags()       ),
                "authors":    len( db.all_authors()    ),
                "publishers": len( db.all_publishers() ),
                "series":     len( db.all_series()     ),
                "mtime":      db.last_modified().strftime("%Y-%m-%d"),
                "users":      count_all_users,
                "active":     count_hot_users,
                "version":    VERSION,
                "title":      CONF['site_title'],
                "socials":    CONF['SOCIALS'],
                "friends":    CONF['FRIENDS'],
                "footer":     CONF['FOOTER'],
                "allow": {
                    "register": CONF['ALLOW_REGISTER'],
                    "download": CONF['ALLOW_GUEST_DOWNLOAD'],
                    "push":     CONF['ALLOW_GUEST_PUSH'],
                    "read":     CONF['ALLOW_GUEST_READ'],
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

        if not user: return d

        d.update({
            'is_login': True,
            'is_admin': user.is_admin(),
            'is_active': user.is_active(),
            'nickname': user.name,
            'username': user.username,
            'email': user.email,
            'extra': {},
            'create_time': user.create_time.strftime("%Y-%m-%d %H:%M:%S")
            })
        if user.avatar:
            d["avatar"] = user.avatar.replace("http://", "https://")
        if user.extra:
            d['kindle_email'] = user.extra.get("kindle_email", "")
            if detail:
                for k,v in user.extra.items():
                    if k.endswith("_history"):
                        ids = [ b['id'] for b in v ][:24]
                        books = self.db.get_data_as_dict(ids=ids)
                        show = set([ b['id'] for b in books ])
                        n = []
                        for b in v:
                            if b['id'] not in show: continue
                            b['img'] = self.static_host+"/get/cover/%(id)s.jpg?t=%(timestamp)s" % b
                            b['href'] = '/book/%(id)s' % b
                            n.append( b )
                        v = n[:12]

                    d['extra'][k] = v

        return d

    @js
    def get(self):
        if CONF.get("installed", None) == False:
            return {'err': 'not_installed'}

        detail = self.get_argument("detail", "")
        rsp = {
                'err': 'ok',
                'cdn': self.static_host,
                'sys': self.get_sys_info() if not detail else {},
                'user': self.get_user_info(detail)
                }
        return rsp

class Welcome(BaseHandler):
    def should_be_invited(self):
        pass

    @js
    def get(self):
        if not self.need_invited():
            return {'err': 'free', 'msg': _(u'无需访问码')}
        if self.invited_code_is_ok():
            return {'err': 'free', 'msg': _(u'已输入访问码')}
        return {'err': 'ok', 'msg': CONF['INVITE_MESSAGE']}

    @js
    def post(self):
        code = self.get_argument("invite_code", None)
        if not code or code != CONF['INVITE_CODE']:
            return {'err': 'params.invalid', 'msg': _(u'访问码无效')}
        self.mark_invited()
        return {'err': 'ok', 'msg': 'ok'}

class SettingHandler(BaseHandler):
    def save_extra_settings(self, args):
        CONF.update( args )

        # update index.html
        html = self.render_string('index.html', **CONF)
        html.replace("Calibre Webserver", CONF['site_title'])
        page = os.path.join(CONF['html_path'], "index.html")
        try: open(page, "w").write(html.encode("UTF-8"))
        except:
            return {'err': 'file.permission',
                    'msg': _(u'更新index.html失败！请确保文件的权限为可写入！')}

        # don't update running environment for now
        args['installed'] = True
        try:
            args.dumpfile()
        except:
            import traceback
            logging.error(traceback.format_exc())
            return {'err': 'file.permission',
                    'msg': _(u'更新磁盘配置文件失败！请确保配置文件的权限为可写入！')}

        # ok, it's safe to update current environment
        CONF['installed'] = True
        return {'err': 'ok', 'rsp': args}

class AdminSettings(SettingHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {'err': 'permission', 'msg': _(u'无权访问此接口')}
        social = {
                'select': [],
                'items': [
                    {'value': 'qq',     'text': 'QQ'},
                    {'value': 'amazon', 'text': 'Amazon'},
                    {'value': 'github', 'text': 'Github'},
                    {'value': 'weibo',  'text': u'微博'},
                    {'value': 'wechat', 'text': u'微信'},
                    ],
                }
        return {'err': 'ok', 'settings': CONF, 'social': social}

    @js
    @auth
    def post(self):
        data = tornado.escape.json_decode(self.request.body)
        KEYS = [
                'ALLOW_GUEST_DOWNLOAD',
                'ALLOW_GUEST_PUSH',
                'ALLOW_GUEST_READ',
                'ALLOW_REGISTER',
                'BOOK_NAMES_FORMAT',
                'FRIENDS',
                'FOOTER',
                'INVITE_CODE',
                'INVITE_MESSAGE',
                'INVITE_MODE',
                'RESET_MAIL_CONTENT',
                'RESET_MAIL_TITLE',
                'SIGNUP_MAIL_CONTENT',
                'SIGNUP_MAIL_TITLE',
                'SOCIALS',
                'autoreload',
                'cookie_secret',
                'douban_apikey',
                'site_title',
                'smtp_password',
                'smtp_server',
                'smtp_username',
                'static_host',
                'xsrf_cookies',
                ]

        args = loader.SettingsLoader()
        args.clear()

        for key, val in data.items():
            if key.startswith("SOCIAL_AUTH"):
                if key.endswith("_KEY") or key.endswith("_SECRET"):
                    args[key] = val
            elif key in KEYS:
                args[key] = val

        return self.save_extra_settings(args)


class AdminInstall(SettingHandler):
    def should_be_invited(self):
        pass

    def should_be_installed(self):
        pass

    @js
    def get(self):
        err = 'not_installed' if CONF.get("installed", True) == False else 'intalled'
        return {'err': err}

    @js
    def post(self):
        if CONF.get("installed", True) != False:
            return {'err': 'installed', 'msg': _(u'不可重复执行安装操作')}

        code = self.get_argument("code", "").strip()
        email = self.get_argument("email", "").strip().lower()
        title = self.get_argument("title", "").strip()
        invite = self.get_argument("invite", "").strip()
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not username or not password or not email or not title:
            return {'err': 'params.invalid', 'msg': _(u'填写的内容有误')}
        if not re.match(RE_EMAIL, email):
            return {'err': 'params.email.invalid', 'msg': _(u'Email无效')}
        if len(username) < 5 or len(username) > 20 or not re.match(RE_USERNAME, username):
            return {'err': 'params.username.invalid', 'msg': _(u'用户名无效')}
        if len(password) < 8 or len(password) > 20 or not re.match(RE_PASSWORD, password):
            return {'err': 'params.password.invalid', 'msg': _(u'密码无效')}

        # 避免重复创建
        user = self.session.query(Reader).filter(Reader.username==username).first()
        if not user:
            user = Reader()
            user.username = username
            user.name = username
            user.email = email
            user.avatar = "https://www.gravatar.com/avatar/" + hashlib.md5(email).hexdigest()
            user.create_time = datetime.datetime.now()
            user.update_time = datetime.datetime.now()
            user.access_time = datetime.datetime.now()
            user.active = True
            user.admin = True
            user.extra = {"kindle_email": ""}
            user.set_secure_password(password)
            try:
                user.save()
            except:
                import traceback
                logging.error(traceback.format_exc())
                return {'err': 'db.error', 'msg': _(u'系统异常，请重试或更换注册信息')}

        args = loader.SettingsLoader()
        args.clear()

        import uuid
        # set a random secret
        args['cookie_secret'] = u"%s" % uuid.uuid1()
        args['site_title'] = title
        if invite == "true":
            args['INVITE_MODE'] = True
            args['INVITE_CODE'] = code
        else:
            args['INVITE_MODE'] = False
        return self.save_extra_settings(args)


def routes():
    return  [
            (r'/api/welcome',           Welcome),
            (r'/api/user/info',         UserInfo),
            (r'/api/user/messages',     UserMessages),

            (r"/api/user/sign_in",      SignIn),
            (r'/api/user/sign_up',      SignUp),
            (r'/api/user/sign_out',     SignOut),
            (r'/api/user/update',       UserUpdate),
            (r'/api/user/reset',        UserReset),
            (r'/api/user/active/send',  UserSendActive),

            (r'/api/active/(.*)/(.*)',  UserActive),
            (r'/api/done/',             Done),

            (r'/api/admin/install',     AdminInstall),
            (r'/api/admin/settings',    AdminSettings),
            (r'/api/admin/users',       AdminUsers),
            (r'/api/admin/testmail',    AdminTestMail),
    ]


