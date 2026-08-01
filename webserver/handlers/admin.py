#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import collections
import datetime
import hashlib
import logging
import os
import re
import traceback
import uuid

import tornado
from tornado.options import options as tornado_options

from webserver import demo_mode, loader, utils
from webserver.base.trash_manager import TrashManager
from webserver.handlers.admin_opds_sources import AdminOpdsSources
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.i18n import _
from webserver.models import Reader, ScanFile
from webserver.services.autofill import AutoFillService
from webserver.services.batch_convert import BatchConvertService
from webserver.services.mail import MailService
from webserver.services.opds_import import OPDSImportService
from webserver.services.ssl_certificate import (
    CertificateRollbackError,
    CertificateSaveError,
    CertificateValidationError,
    NginxConfigError,
    NginxReloadError,
    SSLCertificateManager,
)
from webserver.services.update_checker import UpdateChecker
from webserver.settings import settings as DEFAULT_SETTINGS


CONF = loader.get_settings()

# 元数据源配置
META_ALL_SOURCES = ["douban", "douban_v2", "baidu", "google", "amazon", "xinhua", "tomato", "qimao", "ai", "neodb", "biquge"]
DEFAULT_META_SOURCES = ["douban", "baidu", "xinhua"]
SOCIAL_AUTH_SETTING_RE = re.compile(r"^SOCIAL_AUTH_[A-Z0-9_]+_(KEY|SECRET)$")


class AdminUsers(BaseHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}

        num = int(self.get_argument("num", 20))
        # 当 num <= 0 时，表示显示全部
        if num <= 0:
            num = None
        page = max(0, int(self.get_argument("page", 1)) - 1)
        sort = self.get_argument("sort", "access_time")
        desc = self.get_argument("desc", "desc")
        logging.debug("num=%s, page=%d, sort=%s, desc=%s" % (num, page, sort, desc))

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
        # 当 num 为 None 时，显示全部数据，不分页
        if num is None:
            query_results = query.all()
        else:
            start = page * num
            query_results = query.limit(num).offset(start).all()
        items = []
        for user in query_results:
            d = {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar,
                "is_active": user.is_active(),
                "is_admin": user.is_admin(),
                "extra": dict(user.extra),
                "provider": user.social_auth[0].provider
                if hasattr(user, "social_auth") and user.social_auth.count()
                else "register",
                "create_time": user.create_time.strftime("%Y-%m-%d %H:%M:%S") if user.create_time else "N/A",
                "update_time": user.update_time.strftime("%Y-%m-%d %H:%M:%S") if user.update_time else "N/A",
                "access_time": user.access_time.strftime("%Y-%m-%d %H:%M:%S") if user.access_time else "N/A",
            }
            for attr in dir(user):
                if attr.startswith("can_"):
                    d[attr] = getattr(user, attr)()
            items.append(d)
        return {"err": "ok", "users": {"items": items, "total": total}}

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}
        data = tornado.escape.json_decode(self.request.body)
        uid = data.get("id", None)

        # 创建新用户逻辑
        if not uid:
            # 验证必填字段
            if not all(
                [
                    data.get("username"),
                    data.get("password"),
                    data.get("name"),
                    data.get("email"),
                ]
            ):
                return {
                    "err": "params.fields.required",
                    "msg": _("用户名、密码、昵称和邮箱为必填项"),
                }

            username = data["username"]
            password = data["password"]
            name = data["name"]
            email = data["email"]

            # 检查用户名是否已存在
            existing_user = self.session.query(Reader).filter(Reader.username == username).first()
            if existing_user:
                return {"err": "params.user.exist", "msg": _("用户名已存在")}

            # 创建新用户
            user = Reader()
            user.username = username
            user.name = name
            user.email = email
            user.admin = data.get("admin", False)
            user.active = data.get("active", True)
            user.create_time = datetime.datetime.now()
            user.update_time = datetime.datetime.now()
            user.access_time = datetime.datetime.now()
            user.extra = {"kindle_email": ""}
            user.set_secure_password(password)

            # 设置权限：若未显式指定，则应用系统默认权限
            p = data.get("permission", "")
            if not isinstance(p, str):
                p = ""
            if not p:
                p = CONF.get("DEFAULT_USER_PERMISSION", "")
            if p:
                user.set_permission(p)

            try:
                user.save()
                return {"err": "ok", "msg": _("用户创建成功")}
            except Exception as e:
                logging.error(traceback.format_exc())
                return {"err": "db.error", "msg": _("用户创建失败：{}".format(str(e)))}

        # 现有用户编辑逻辑
        del data["id"]
        if not data:
            return {"err": "params.fields.invalid", "msg": _("用户配置项参数错误")}
        user = self.session.query(Reader).filter(Reader.id == uid).first()
        if not user:
            return {"err": "params.user.not_exist", "msg": _("用户ID错误")}
        if "active" in data:
            user.active = data["active"]

        if "admin" in data:
            was_admin = user.admin
            user.admin = data["admin"]
            if was_admin is True and data["admin"] is False and self.user_id() == user.id:
                return {
                    "err": "params.user.invalid",
                    "msg": _("不允许取消自己的管理员权限"),
                }

        if data.get("delete", "") == user.username:
            if self.user_id() == user.id:
                return {"err": "params.user.invalid", "msg": _("不允许删除自己")}

            self.session.query(Reader).filter(Reader.id == user.id).delete()
            self.session.commit()
            return {"err": "ok", "msg": _("删除成功")}

        p = data.get("permission", "")
        if not isinstance(p, str):
            return {"err": "params.permission.invalid", "msg": _("权限参数不对")}
        if p:
            user.set_permission(p)
        user.save()
        return {"err": "ok"}


class AdminUsersBatch(BaseHandler):
    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}
        data = tornado.escape.json_decode(self.request.body)
        ids = data.get("ids", [])
        permission = data.get("permission", "")

        if not ids or not isinstance(ids, list):
            return {"err": "params.ids.required", "msg": _("用户ID列表不能为空")}
        if len(ids) > 500:
            return {"err": "params.ids.too_many", "msg": _("单次最多批量操作 500 个用户")}
        if not isinstance(permission, str) or not permission:
            return {"err": "params.permission.invalid", "msg": _("权限参数不对")}

        current_user_id = self.user_id()
        if current_user_id in ids:
            return {"err": "params.user.invalid", "msg": _("不允许批量修改自己的权限")}

        users = self.session.query(Reader).filter(Reader.id.in_(ids)).all()
        for user in users:
            user.set_permission(permission)
        self.session.commit()
        updated = len(users)

        return {"err": "ok", "updated": updated, "msg": _("已更新 %d 个用户的权限") % updated}


class AdminTestMail(BaseHandler):
    @js
    @auth
    def post(self):
        mail_enc = self.get_argument("smtp_encryption")
        mail_server = self.get_argument("smtp_server")
        mail_username = self.get_argument("smtp_username")
        mail_password = self.get_argument("smtp_password")

        mail_from = mail_username
        mail_to = mail_username
        mail_subject = _("Calibre功能验证邮件")
        mail_body = _("这是一封测试邮件，验证邮件参数是否配置正确。")

        try:
            MailService().do_send_mail(
                mail_from,
                mail_to,
                mail_subject,
                mail_body,
                relay=mail_server,
                username=mail_username,
                password=mail_password,
                encryption=mail_enc,
            )
            return {"err": "ok", "msg": _("发送成功")}
        except Exception as e:
            logging.error(traceback.format_exc())
            return {"err": "email.server_error", "msg": str(e)}


class AdminOwnerMode(BaseHandler):
    @auth
    def get(self):
        user_id = self.get_argument("user_id", None)
        if user_id and self.is_admin():
            self.set_secure_cookie("admin_id", self.user_id())
            self.set_secure_cookie("user_id", user_id)
        self.redirect("/", 302)


class SettingsSaverLogic:
    def update_nuxtjs_env(self):
        # update nuxtjs .env file
        nuxtjs_env = """
TITLE="%(site_title)s"
TITLE_TEMPLATE="%%s | %(site_title)s"
GOOGLE_ANALYTICS_ID=%(google_analytics_id)s

"""
        with open(CONF["nuxt_env_path"], "w") as f:
            f.write(nuxtjs_env % CONF)

    def save_extra_settings(self, args):
        if args != CONF:
            CONF.update(args)

        try:
            self.update_nuxtjs_env()
        except:
            logging.error(traceback.format_exc())
            return {
                "err": "file.permission",
                "msg": _("更新nuxtjs配置文件失败！请确保文件的权限为可写入！"),
            }

        # don't update running environment for now
        args["installed"] = True
        try:
            args.dumpfile()
        except:
            logging.error(traceback.format_exc())
            return {
                "err": "file.permission",
                "msg": _("更新磁盘配置文件失败！请确保配置文件的权限为可写入！"),
            }

        # ok, it's safe to update current environment
        CONF["installed"] = True
        return {"err": "ok", "rsp": args}


class AdminSettings(BaseHandler):
    def is_demo_fake_admin(self):
        # demo 账号在演示模式下允许“查看”管理员面板，但看到的是 settings.py 的默认
        # 参数而非真实运行配置，且不要求数据库中的 admin 标记，避免真正解锁其它
        # 管理接口（如用户管理、批量删除书籍）。
        return demo_mode.is_demo_mode(CONF) and demo_mode.is_demo_user(CONF, self.current_user)

    @js
    @auth
    def get(self):
        if not self.admin_user and not self.is_demo_fake_admin():
            return {"err": "permission", "msg": _("无权访问此接口")}

        sns = [
            {"value": "qq", "text": "QQ", "link": "https://connect.qq.com/"},
            {
                "value": "amazon",
                "text": "Amazon",
                "link": "https://developer.amazon.com/zh/docs/login-with-amazon/web-docs.html",
            },
            {
                "value": "github",
                "text": "Github",
                "link": "https://github.com/settings/applications/new",
            },
            {
                "value": "weibo",
                "text": "微博",
                "link": "http://open.weibo.com/developers",
            },
            {
                "value": "wechat",
                "text": "微信",
                "link": "https://developers.weixin.qq.com/doc/offiaccount/OA_Web_Apps/Wechat_webpage_authorization.html",
            },
        ]
        # 演示账号看到的是 settings.py 里的出厂默认值，不暴露真实部署配置（密钥、
        # 数据库地址等）；真实管理员仍看到当前生效的运行配置。
        settings_dict = dict(DEFAULT_SETTINGS) if self.is_demo_fake_admin() else dict(CONF)
        # 添加元数据源配置
        settings_dict["META_ALL_SOURCES"] = META_ALL_SOURCES
        if "META_SELECTED_SOURCES" not in settings_dict:
            settings_dict["META_SELECTED_SOURCES"] = DEFAULT_META_SOURCES

        return {"err": "ok", "settings": settings_dict, "sns": sns, "site_url": self.site_url}

    @js
    @auth
    def post(self):
        if self.is_demo_fake_admin():
            # 演示模式下的“保存”只做参数校验，不写入 CONF、不落盘，
            # 让访客可以感受保存流程但不会影响真实运行配置。
            data = tornado.escape.json_decode(self.request.body)
            return {
                "err": "ok",
                "rsp": data,
                "msg": _("演示模式下设置不会真正保存"),
            }
        if not self.admin_user:
            return {"err": "permission", "msg": _("无权访问此接口")}
        data = tornado.escape.json_decode(self.request.body)

        # 验证：如果启用了私人图书馆模式，访问码不能为空
        invite_mode = data.get("INVITE_MODE", False)
        invite_code = data.get("INVITE_CODE", "")
        if invite_mode and not invite_code:
            return {"err": "params.invite_code_required", "msg": _("访问码不能为空")}

        # 验证：上传相关的大小类配置必须是合法的大小字符串（如 4MB），
        # 否则会导致 /api/user/info 或 Tornado max_buffer_size 在解析时抛异常
        for size_key in ("MAX_UPLOAD_SIZE", "UPLOAD_CHUNK_THRESHOLD", "UPLOAD_CHUNK_SIZE"):
            if size_key in data:
                try:
                    if utils.parse_size(data[size_key]) <= 0:
                        raise ValueError("size must be positive: %r" % data[size_key])
                except (TypeError, ValueError):
                    return {"err": "params.%s" % size_key.lower(), "msg": _("上传大小配置格式不合法，例如 4MB")}
        # 最大分片数量必须是合法的正整数
        if "MAX_CHUNK_COUNT" in data:
            try:
                if int(data["MAX_CHUNK_COUNT"]) <= 0:
                    raise ValueError("chunk count must be positive")
            except (TypeError, ValueError):
                return {"err": "params.max_chunk_count", "msg": _("最大分片数量必须是正整数")}

        # 大小关系约束：总大小上限 ≥ 分片触发阈值 ≥ 单个分片大小，
        # 否则分片逻辑自相矛盾（如阈值小于单分片、或总大小小于阈值）
        size_keys = ("MAX_UPLOAD_SIZE", "UPLOAD_CHUNK_THRESHOLD", "UPLOAD_CHUNK_SIZE")
        if any(k in data for k in size_keys):

            def _size(key):
                raw = data.get(key, CONF.get(key, "0"))
                try:
                    return utils.parse_size(raw)
                except (TypeError, ValueError):
                    return 0

            total = _size("MAX_UPLOAD_SIZE")
            threshold = _size("UPLOAD_CHUNK_THRESHOLD")
            chunk = _size("UPLOAD_CHUNK_SIZE")
            if not (total >= threshold >= chunk):
                return {
                    "err": "params.upload_size_order",
                    "msg": _("最大上传大小需不小于分片触发阈值，分片触发阈值需不小于单个分片大小"),
                }

        KEYS = [
            "ALLOW_GUEST_DOWNLOAD",
            "ALLOW_GUEST_PUSH",
            "ALLOW_GUEST_READ",
            "ALLOW_GUEST_UPLOAD",
            "ALLOW_REGISTER",
            "DEFAULT_USER_PERMISSION",
            "ALLOW_FEEDBACK",
            "FEEDBACK_URL",
            "BOOK_NAMES_FORMAT",
            "BOOK_NAV",
            "EPUB_VIEWER",
            "FRIENDS",
            "FOOTER",
            "FOOTER_EXTRA_HTML",
            "SIDEBAR_EXTRA_HTML",
            "HEADER",
            "INVITE_CODE",
            "INVITE_MESSAGE",
            "INVITE_MODE",
            "MAX_UPLOAD_SIZE",
            "UPLOAD_CHUNK_ENABLED",
            "UPLOAD_CHUNK_THRESHOLD",
            "UPLOAD_CHUNK_SIZE",
            "MAX_CHUNK_COUNT",
            "RESET_MAIL_CONTENT",
            "RESET_MAIL_TITLE",
            "SIGNUP_MAIL_CONTENT",
            "SIGNUP_MAIL_TITLE",
            "SOCIALS",
            "SHOW_SIDEBAR_SYS",
            "OPDS_ENABLED",
            "ENABLE_WEBDAV_SERVICE",
            "WEBDAV_SYNC_FOLDER",
            "WEBDAV_SYNC_FOLDER_NAME",
            "autoreload",
            "cookie_secret",
            "scan_upload_path",
            "douban_apikey",
            "douban_baseurl",
            "douban_max_count",
            "auto_fill_meta",
            "auto_fill_keep_cover",
            "META_SELECTED_SOURCES",
            "ai_api_url",
            "ai_api_key",
            "ai_model",
            "ai_use_thinking",
            "push_title",
            "push_content",
            "site_title",
            "smtp_password",
            "smtp_server",
            "smtp_username",
            "smtp_encryption",
            "static_host",
            "xsrf_cookies",
            "settings_path",
            "avatar_service",
            "google_analytics_id",
            # 人机验证配置
            "CAPTCHA_PROVIDER",
            "CAPTCHA_ENABLE_FOR_REGISTER",
            "CAPTCHA_ENABLE_FOR_LOGIN",
            "CAPTCHA_ENABLE_FOR_WELCOME",
            "CAPTCHA_ENABLE_FOR_RESET",
            "GEETEST_CAPTCHA_ID",
            "GEETEST_CAPTCHA_KEY",
            "DEVICES",
            # 首页设置
            "MAIN_PAGE_RANDOM_COUNT",
            "MAIN_PAGE_RECENT_COUNT",
            "DEFAULT_PAGE_SIZE",
        ]

        args = loader.SettingsLoader()
        args.clear()

        for key, val in data.items():
            if SOCIAL_AUTH_SETTING_RE.match(key):
                args[key] = val
            elif key in KEYS:
                args[key] = val

        logic = SettingsSaverLogic()
        return logic.save_extra_settings(args)


def _build_mysql_url(db_host, db_port, db_name, db_user, db_pass):
    """Construct a MySQL+pymysql connection URL from individual parameters."""
    import urllib.parse

    safe_pass = urllib.parse.quote(db_pass, safe="")
    safe_user = urllib.parse.quote(db_user, safe="")
    return f"mysql+pymysql://{safe_user}:{safe_pass}@{db_host}:{db_port}/{db_name}?charset=utf8mb4"


def _get_database_url(handler, allow_sqlite=True):
    """Read and validate the user_database SQLAlchemy URL submitted by the UI.

    The persisted configuration remains the existing single user_database field;
    the Vue form may expose host/port/user inputs but must submit the composed URL.
    Legacy split parameters are accepted as a compatibility fallback only.
    """
    from sqlalchemy.engine import make_url

    db_url = handler.get_argument("user_database", "").strip() or handler.get_argument("db_url", "").strip()
    if not db_url:
        db_type = handler.get_argument("db_type", "sqlite" if allow_sqlite else "").strip()
        if allow_sqlite and db_type == "sqlite":
            return (
                CONF["user_database"]
                if CONF["user_database"].startswith("sqlite")
                else "sqlite:////data/books/calibre-webserver.db"
            )
        if db_type in ("mysql", "mariadb"):
            db_host = handler.get_argument("db_host", "localhost").strip()
            db_port = handler.get_argument("db_port", "3306").strip()
            db_name = handler.get_argument("db_name", "").strip()
            db_user = handler.get_argument("db_user", "").strip()
            db_pass = handler.get_argument("db_pass", "").strip()
            if not db_name or not db_user:
                raise ValueError(_("数据库连接参数不完整"))
            db_url = _build_mysql_url(db_host, db_port, db_name, db_user, db_pass)
        else:
            raise ValueError(_("请选择有效的目标数据库类型"))

    try:
        parsed = make_url(db_url)
    except Exception as e:
        raise ValueError(_("数据库连接地址无效: %s") % str(e))

    driver = parsed.drivername.split("+")[0]
    if driver == "sqlite":
        if allow_sqlite:
            return db_url
        raise ValueError(_("请选择有效的目标数据库类型"))
    if driver not in ("mysql", "mariadb"):
        raise ValueError(_("仅支持 SQLite 或 MySQL/MariaDB 数据库"))
    if not parsed.database or not parsed.username:
        raise ValueError(_("数据库连接参数不完整"))
    if parsed.port is not None and not (1 <= parsed.port <= 65535):
        raise ValueError(_("端口号范围无效，应在 1-65535 之间"))
    return db_url


class AdminTestDB(BaseHandler):
    """Test whether a database connection is reachable.

    Accessible before install (for the install wizard) and by admins after install.
    """

    def should_be_installed(self):
        pass

    @js
    def post(self):
        # Before install: allow without auth (install wizard use case)
        # After install: require admin
        if CONF.get("installed", True):
            if not self.current_user:
                return {"err": "user.need_login", "msg": _("请先登录")}
            if not self.admin_user:
                return {"err": "permission", "msg": _("无权访问此接口")}

        try:
            db_url = _get_database_url(self)
        except ValueError as e:
            return {"err": "params.invalid", "msg": str(e)}
        if db_url.startswith("sqlite"):
            return {"err": "ok", "msg": _("SQLite 无需测试连接")}
        try:
            from sqlalchemy import create_engine, text

            engine = create_engine(db_url, pool_pre_ping=True, pool_size=1, max_overflow=0)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            engine.dispose()
            return {"err": "ok", "msg": _("数据库连接成功")}
        except Exception as e:
            logging.error(traceback.format_exc())
            return {"err": "db.connect_failed", "msg": str(e)}


class AdminMigrateDB(BaseHandler):
    """Migrate all Talebook user-data tables from the current database to a new one."""

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {"err": "permission", "msg": _("无权访问此接口")}

        try:
            new_db_url = _get_database_url(self, allow_sqlite=False)
        except ValueError as e:
            return {"err": "params.invalid", "msg": str(e)}

        force = self.get_argument("force", "0").strip() == "1"
        source_url = CONF["user_database"]

        if new_db_url == source_url:
            return {"err": "params.invalid", "msg": _("目标数据库与当前数据库相同")}

        try:
            from webserver.migrate_db import TargetNotEmptyError, migrate_data

            migrate_data(source_url, new_db_url, force=force)
        except TargetNotEmptyError as e:
            return {
                "err": "db.target_has_data",
                "count": e.count,
                "msg": _("目标数据库已有 %d 条记录，继续迁移将清空这些数据。如需强制迁移，请再次确认。") % e.count,
            }
        except Exception as e:
            logging.error(traceback.format_exc())
            return {"err": "db.migrate_failed", "msg": _("数据迁移失败: %s") % str(e)}

        # Persist new user_database — load ALL current settings so other keys aren't lost
        try:
            args = loader.SettingsLoader()
            args["user_database"] = new_db_url
            args["installed"] = True
            args.dumpfile()
        except Exception as e:
            logging.error(traceback.format_exc())
            return {"err": "file.permission", "msg": _("保存配置失败: %s") % str(e)}

        CONF["user_database"] = new_db_url
        return {"err": "ok", "msg": _("数据迁移成功，请重启服务器以生效"), "need_restart": True}


class AdminInstall(BaseHandler):
    def should_be_invited(self):
        pass

    def should_be_installed(self):
        pass

    @js
    def get(self):
        err = "installed" if CONF.get("installed", True) else "not_intalled"
        return {"err": err}

    @js
    def post(self):
        if CONF.get("installed", True):
            return {"err": "installed", "msg": _("不可重复执行安装操作")}

        code = self.get_argument("code", "").strip()
        email = self.get_argument("email", "").strip().lower()
        title = self.get_argument("title", "").strip()
        invite = self.get_argument("invite", "").strip()
        username = self.get_argument("username", "").strip().lower()
        password = self.get_argument("password", "").strip()
        if not username or not password or not email or not title:
            return {"err": "params.invalid", "msg": _("填写的内容有误")}
        if not re.match(Reader.RE_EMAIL, email):
            return {"err": "params.email.invalid", "msg": _("Email无效")}
        if len(username) < 2 or len(username) > 20 or not re.match(Reader.RE_USERNAME, username):
            return {"err": "params.username.invalid", "msg": _("用户名无效")}
        if len(password) < 8 or len(password) > 20 or not re.match(Reader.RE_PASSWORD, password):
            return {"err": "params.password.invalid", "msg": _("密码无效")}

        # Optional database configuration. Persist only the existing user_database setting;
        # the UI may collect separate fields but submits the composed SQLAlchemy URL.
        target_session = self.session
        try:
            target_db_url = _get_database_url(self)
        except ValueError as e:
            return {"err": "params.invalid", "msg": str(e)}

        if not target_db_url.startswith("sqlite"):
            try:
                from sqlalchemy import create_engine
                from sqlalchemy.orm import sessionmaker

                from webserver import models

                new_engine = create_engine(target_db_url, pool_pre_ping=True, pool_size=1, max_overflow=0)
                models.user_syncdb(new_engine)
                NewSession = sessionmaker(bind=new_engine, autoflush=True, autocommit=False)
                target_session = NewSession()
            except Exception as e:
                logging.error(traceback.format_exc())
                return {"err": "db.connect_failed", "msg": _("数据库连接失败: %s") % str(e)}

        # 避免重复创建
        user = target_session.query(Reader).filter(Reader.username == username).first()
        if not user:
            user = Reader()
            user.username = username
            user.name = username
            user.create_time = datetime.datetime.now()

        # 设置admin user的信息
        user.email = email
        user.avatar = CONF["avatar_service"] + "/avatar/" + hashlib.md5(email.encode("UTF-8")).hexdigest()
        user.update_time = datetime.datetime.now()
        user.access_time = datetime.datetime.now()
        user.active = True
        user.admin = True
        user.extra = {"kindle_email": ""}
        user.set_secure_password(password)
        try:
            if target_session is self.session:
                user.save()
            else:
                target_session.add(user)
                target_session.commit()
                target_session.close()
        except Exception:
            logging.error(traceback.format_exc())
            return {"err": "db.error", "msg": _("系统异常，请重试或更换注册信息")}

        args = loader.SettingsLoader()
        args.clear()

        # inherit the basic path from system's config
        args["settings_path"] = CONF["settings_path"]

        # set options for China user
        # TODO: maybe it should be provided as an install options
        args["avatar_service"] = "https://cravatar.cn"
        args["BOOK_NAMES_FORMAT"] = "utf8"

        # set a random secret
        args["cookie_secret"] = "%s" % uuid.uuid1()
        args["site_title"] = title
        if invite == "true" and code:
            args["INVITE_MODE"] = True
            args["INVITE_CODE"] = code
        else:
            args["INVITE_MODE"] = False

        if target_db_url and target_db_url != CONF["user_database"]:
            args["user_database"] = target_db_url

        logic = SettingsSaverLogic()
        return logic.save_extra_settings(args)


class SSLHandlerLogic:
    def __init__(self, manager=None):
        self.manager = manager or SSLCertificateManager(CONF["ssl_crt_file"], CONF["ssl_key_file"])

    def run(self, ssl_crt, ssl_key):
        try:
            self.manager.install(ssl_crt, ssl_key)
        except CertificateValidationError as err:
            return {"err": "params.ssl_error", "msg": _("证书或密钥校验失败: %s" % err)}
        except CertificateSaveError as err:
            logging.exception("failed to save SSL certificate")
            return {
                "err": "internal.ssl_save_error",
                "msg": _("证书存储失败: %s" % err),
            }
        except NginxConfigError as err:
            logging.exception("nginx rejected uploaded SSL certificate")
            return {
                "err": "internal.nginx_test_error",
                "msg": _("NGINX配置异常: %s") % err,
            }
        except NginxReloadError as err:
            logging.exception("nginx failed to reload uploaded SSL certificate")
            return {
                "err": "internal.nginx_reload_error",
                "msg": _("NGINX重新加载配置异常: %s") % err,
            }
        except CertificateRollbackError as err:
            logging.exception("failed to rollback uploaded SSL certificate")
            return {
                "err": "internal.ssl_rollback_error",
                "msg": _("证书更新失败且无法恢复旧证书: %s") % err,
            }

        return {"err": "ok"}


class AdminSSL(BaseHandler):
    def get_upload_file(self):
        # for unittest mock
        ssl_crt = self.request.files["ssl_crt"][0]
        ssl_key = self.request.files["ssl_key"][0]
        return (ssl_crt["body"], ssl_key["body"])

    # TODO:
    #   - add GET interface to show the hostname/outdate of certifacates

    @js
    @auth
    def post(self):
        logic = SSLHandlerLogic()

        logging.error("got request")
        if not self.is_admin():
            return {"err": "permission", "msg": _("无权操作")}

        ssl_crt, ssl_key = self.get_upload_file()
        return logic.run(ssl_crt, ssl_key)


class AdminBookList(BaseHandler):
    @js
    @is_admin
    def get(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}

        num = int(self.get_argument("num", 20))
        # 当 num <= 0 时，表示显示全部
        if num <= 0:
            num = None
        page = max(0, int(self.get_argument("page", 1)) - 1)
        sort = self.get_argument("sort", "id")
        desc = self.get_argument("desc", "desc") == "true"
        search = self.get_argument("search", "")
        logging.debug("num=%s, page=%d, sort=%s, desc=%s" % (num, page, sort, desc))

        self.db.sort(field=sort, ascending=(not desc))
        all_ids = list(self.cache.search(search))
        total = len(all_ids)

        # sort by id
        if sort == "id":
            all_ids.sort(reverse=desc)

        books = []
        # 当 num 为 None 时，显示全部数据，不分页
        if num is None:
            page_ids = all_ids
        else:
            start = page * num
            end = start + num
            page_ids = all_ids[start:end]
        if page_ids:
            books = [utils.SimpleBookFormatter(b, self.cdn_url, self.api_url).format() for b in self.get_books(ids=page_ids)]

        return {"err": "ok", "items": books, "total": total}


class AdminBookFill(BaseHandler):
    @js
    @is_admin
    def get(self):
        s = AutoFillService()
        status = {
            "total": s.count_total,
            "skip": s.count_skip,
            "done": s.count_done,
            "fail": s.count_fail,
        }
        return {"err": "ok", "msg": "ok", "status": status}

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        idlist = req["idlist"]
        if not idlist:
            return {"err": "params.error", "msg": _("参数错误")}

        if idlist == "all":
            idlist = list(self.cache.search(""))
        elif isinstance(idlist, list):
            for bid in idlist:
                if not isinstance(bid, int):
                    return {"err": "params.error.idlist", "msg": _("idlist参数错误")}
        else:
            return {"err": "params.error.idlist", "msg": _("idlist参数错误")}

        AutoFillService().auto_fill_all(idlist)
        return {"err": "ok", "msg": _("任务启动成功！请耐心等待，稍后再来刷新页面")}


class AdminBookDelete(BaseHandler):
    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        idlist = req["idlist"]
        if not idlist or not isinstance(idlist, list):
            return {"err": "params.error", "msg": _("参数错误，idlist必须是数组")}

        for bid in idlist:
            if not isinstance(bid, int):
                return {
                    "err": "params.error.idlist",
                    "msg": _("idlist参数错误，必须是整数数组"),
                }

        # 执行批量删除
        deleted_count = 0
        for bid in idlist:
            try:
                # 删除图书
                self.db.delete_book(bid)
                deleted_count += 1
            except Exception as e:
                logging.error(f"Failed to delete book {bid}: {e}")
                continue

        # Cache对象会自动更新，不需要手动clean
        return {"err": "ok", "msg": _("成功删除 {0} 本书籍".format(deleted_count))}


class AdminOPDSBrowse(BaseHandler):
    """OPDS目录浏览接口"""

    @js
    @is_admin
    def post(self):
        try:
            req = tornado.escape.json_decode(self.request.body)
            # 优先接受完整 url 字段，兼容旧的 host/port/path 三字段形式
            url = req.get("url", "")
            host = req.get("host", "")
            port = req.get("port", "")
            path = req.get("path", "")

            if not url and not host:
                return {"err": "params.error", "msg": _("参数错误，必须提供 url 或 host")}

            logging.info(f"OPDS浏览请求: url={url}, host={host}, port={port}, path={path}")

            opds_service = OPDSImportService()
            result = opds_service.browse_opds_catalog(url=url, host=host, port=port, path=path)

            if result.get("success"):
                return {
                    "err": "ok",
                    "items": result["items"],
                    "current_path": result["current_path"],
                }
            else:
                return {"err": "error", "msg": result.get("error", _("浏览目录失败"))}

        except Exception as e:
            logging.error(f"OPDS目录浏览失败: {e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("浏览目录失败: {}").format(str(e))}


class AdminOPDSImportStatus(BaseHandler):
    """OPDS导入状态查询接口"""

    @js
    @is_admin
    def get(self):
        # 返回全局导入状态（单例模式）
        from webserver.services.opds_import import OPDSImportService

        opds_service = OPDSImportService()
        status = {
            "total": opds_service.count_total,
            "done": opds_service.count_done,
            "skip": opds_service.count_skip,
            "fail": opds_service.count_fail,
        }
        return {"err": "ok", "msg": "ok", "status": status}


class AdminOPDSImportFailedList(BaseHandler):
    """获取OPDS导入失败的记录列表"""

    @js
    @is_admin
    def get(self):
        try:
            # 查询所有失败的记录
            failed_items = (
                self.session.query(ScanFile)
                .filter(ScanFile.status == ScanFile.FAILED)
                .order_by(ScanFile.update_time.desc())
                .all()
            )

            items = []
            for sf in failed_items:
                items.append(
                    {
                        "id": sf.id,
                        "title": sf.title,
                        "author": sf.author,
                        "path": sf.path,  # 原始下载链接
                        "hash": sf.hash,
                        "status": sf.status,
                        "error": sf.data.get("error") if sf.data else None,
                        "update_time": sf.update_time.isoformat() if sf.update_time else None,
                    }
                )

            return {"err": "ok", "items": items, "count": len(items)}

        except Exception as e:
            logging.error(f"获取失败记录列表失败: {e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("获取失败记录列表失败: {}").format(str(e))}


class AdminOPDSImportRetry(BaseHandler):
    """重试失败的OPDS导入"""

    @js
    @is_admin
    def post(self):
        try:
            req = tornado.escape.json_decode(self.request.body)
            item_id = req.get("id")
            item_hash = req.get("hash")

            if not item_id and not item_hash:
                return {
                    "err": "params.error",
                    "msg": _("参数错误，需要提供记录ID或hash"),
                }

            # 查询失败的记录
            query = self.session.query(ScanFile).filter(ScanFile.status == ScanFile.FAILED)
            if item_id:
                query = query.filter(ScanFile.id == item_id)
            else:
                query = query.filter(ScanFile.hash == item_hash)

            sf = query.first()
            if not sf:
                return {"err": "not.found", "msg": _("未找到失败的导入记录")}

            # 获取原始下载链接
            href = sf.path
            if sf.data and sf.data.get("acquisition_link"):
                href = sf.data.get("acquisition_link")

            if not href:
                return {"err": "no.link", "msg": _("未找到下载链接")}

            # 重置状态为 downloading
            sf.status = ScanFile.DOWNLOADING
            sf.update_time = datetime.datetime.now()
            sf.data = sf.data or {}
            sf.data["retry_count"] = sf.data.get("retry_count", 0) + 1
            sf.data.pop("error", None)  # 清除错误信息
            self.session.commit()

            # 启动异步重试任务
            import threading

            def retry_task():
                from webserver.services.opds_import import OPDSImportService

                opds_service = OPDSImportService()
                book_data = {
                    "title": sf.title,
                    "author": sf.author,
                    "href": href,
                    "acquisition_link": href,
                }
                opds_service.import_book_to_scan(book_data, self.user_id())

            thread = threading.Thread(target=retry_task, daemon=True)
            thread.start()

            return {
                "err": "ok",
                "msg": _("已开始重试导入: {}").format(sf.title),
                "async": True,
            }

        except Exception as e:
            logging.error(f"重试导入失败: {e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("重试导入失败: {}").format(str(e))}


class AdminOPDSImport(BaseHandler):
    """OPDS导入接口"""

    @js
    @is_admin
    def post(self):
        try:
            req = tornado.escape.json_decode(self.request.body)
            opds_url = req.get("opds_url", "")
            books = req.get("books", [])
            delete_after = req.get("delete_after", False)

            if not opds_url:
                return {"err": "params.error", "msg": _("参数错误，OPDS URL不能为空")}

            logging.info(f"OPDS导入请求: url={opds_url}, books={len(books)}本, delete_after={delete_after}")

            # 在开始异步下载前，将选中书籍插入到待处理列表并标记为downloading
            try:
                if books:
                    for b in books:
                        href = b.get("href") or b.get("acquisition_link") or ""
                        title = b.get("title", "")
                        author = b.get("author", "")
                        # 使用href生成唯一hash值
                        if href:
                            h = hashlib.sha256(href.encode("utf-8")).hexdigest()
                        else:
                            h = hashlib.sha256((title + author + str(uuid.uuid4())).encode("utf-8")).hexdigest()
                        # 创建ScanFile记录，path暂存为href，status为downloading
                        # ScanFile __init__ 接受 (path, hash_value, scan_id)
                        sf = ScanFile(href, h[:64], 0)
                        sf.title = title
                        sf.author = author
                        sf.status = ScanFile.DOWNLOADING
                        sf.create_time = datetime.datetime.now()
                        sf.update_time = datetime.datetime.now()
                        # 将原始链接存入data，便于后台任务使用
                        sf.data = {"acquisition_link": href}
                        self.session.add(sf)
                    self.session.commit()
            except Exception:
                logging.error(traceback.format_exc())

            # 启动异步导入任务
            import threading

            def import_task():
                from webserver.services.opds_import import OPDSImportService

                opds_service = OPDSImportService()
                opds_service.reset_counters()
                if books:
                    opds_service.import_selected_books(opds_url, self.user_id(), delete_after, books)
                else:
                    opds_service.import_from_opds(opds_url, self.user_id(), delete_after)

            thread = threading.Thread(target=import_task, daemon=True)
            thread.start()

            # 立即返回，避免阻塞HTTP请求
            if books:
                msg = _("已开始异步导入选中的 {} 本书籍，请稍后查看进度").format(len(books))
            else:
                msg = _("已开始异步导入所有书籍，请稍后查看进度")

            return {"err": "ok", "msg": msg, "async": True}

        except Exception as e:
            logging.error(f"OPDS 导入失败：{e}")
            logging.error(traceback.format_exc())
            return {"err": "error", "msg": _("OPDS 导入失败：{}").format(str(e))}


class AdminTrashSize(BaseHandler):
    """获取回收站和上传目录大小"""

    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {"err": "ok", "sizes": {}, "msg": _("非管理员用户")}
        sizes = TrashManager.get_trash_sizes()
        # 返回实际路径用于调试
        return {
            "err": "ok",
            "sizes": sizes,
            "trash_path": TrashManager.TRASH_PATH,
            "upload_path": TrashManager.UPLOAD_TRASH_PATH,
        }


class AdminTrashClear(BaseHandler):
    """清理回收站和上传目录"""

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {
                "err": "permission.not_admin",
                "msg": _("当前用户非管理员，无权操作"),
            }
        errors = TrashManager.clear_trashs()
        if errors:
            return {"err": "error", "msg": _("清理失败：%s") % "; ".join(errors)}
        return {"err": "ok", "msg": _("已清理 Calibre 回收站及上传目录")}


class AdminBookConvert(BaseHandler):
    """Admin API: 批量转换Kindle格式为EPUB"""

    @js
    @is_admin
    def get(self):
        status = BatchConvertService().status()
        return {
            "err": "ok",
            "status": {
                "total": status["count_total"],
                "skip": status["count_skip"],
                "done": status["count_done"],
                "fail": status["count_fail"],
                "running": status["is_running"],
            },
        }

    @js
    @is_admin
    def post(self):
        req = tornado.escape.json_decode(self.request.body)
        idlist = req.get("idlist", [])
        convert_status = BatchConvertService().status()
        if convert_status["is_running"]:
            return {"err": "task.running", "msg": _("有转换任务正在运行中，请稍后再试")}

        if idlist:
            if not isinstance(idlist, list):
                return {
                    "err": "params.error.idlist",
                    "msg": _("参数错误, 未指定正确的id列表"),
                }
            for bid in idlist:
                if not isinstance(bid, int):
                    return {
                        "err": "params.error.idlist",
                        "msg": _("参数错误, id列表中包含无效的id"),
                    }

        if not idlist:
            idlist = list(self.cache.all_book_ids())

        BatchConvertService().convert_all(self.current_user.id, idlist)
        return {"err": "ok", "msg": _("Kindle转EPUB任务已启动，右上角可以查看进度")}


class AdminUpdateCheck(BaseHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}
        checker = UpdateChecker()
        status = checker.get_status()
        return {"err": "ok", "status": status}

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {"err": "permission.not_admin", "msg": _("当前用户非管理员")}
        checker = UpdateChecker()
        checker.check_for_updates()
        status = checker.get_status()
        return {"err": "ok", "status": status}


MAX_LOG_LINES = 2000
DEFAULT_LOG_LINES = 500


def _get_log_file():
    return getattr(tornado_options, "log_file_prefix", None) or "/data/log/talebook.log"


class AdminSystemLog(BaseHandler):
    @js
    @is_admin
    def get(self):
        log_file = _get_log_file()
        try:
            lines_count = int(self.get_argument("lines", DEFAULT_LOG_LINES))
        except (ValueError, TypeError):
            lines_count = DEFAULT_LOG_LINES
        lines_count = max(1, min(lines_count, MAX_LOG_LINES))

        if not os.path.exists(log_file):
            return {"err": "ok", "lines": [], "total": 0, "file": log_file}

        total = 0
        tail_deque = collections.deque(maxlen=lines_count)
        with open(log_file, "r", encoding="utf-8", errors="replace") as f:
            for line in f:
                total += 1
                tail_deque.append(line)

        tail = [line.rstrip("\n") for line in tail_deque]
        return {"err": "ok", "lines": tail, "total": total, "file": log_file}


class AdminSystemLogDownload(BaseHandler):
    async def get(self):
        if not self.current_user:
            self.set_status(403)
            self.finish({"err": "user.need_login", "msg": _("请先登录")})
            return
        if not self.admin_user:
            self.set_status(403)
            self.finish({"err": "permission.not_admin", "msg": _("当前用户非管理员")})
            return

        log_file = _get_log_file()

        if not os.path.exists(log_file):
            self.set_status(404)
            self.finish()
            return

        file_size = os.path.getsize(log_file)
        self.set_header("Content-Type", "text/plain; charset=utf-8")
        self.set_header("Content-Disposition", 'attachment; filename="talebook.log"')
        self.set_header("Content-Length", str(file_size))
        chunk_size = 64 * 1024
        with open(log_file, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                self.write(chunk)
                await self.flush()
        self.finish()


def routes():
    return [
        (r"/api/admin/ssl", AdminSSL),
        (r"/api/admin/users", AdminUsers),
        (r"/api/admin/users/batch", AdminUsersBatch),
        (r"/api/admin/install", AdminInstall),
        (r"/api/admin/settings", AdminSettings),
        (r"/api/admin/testmail", AdminTestMail),
        (r"/api/admin/testdb", AdminTestDB),
        (r"/api/admin/migratedb", AdminMigrateDB),
        (r"/api/admin/update", AdminUpdateCheck),
        (r"/api/admin/book/list", AdminBookList),
        (r"/api/admin/book/fill", AdminBookFill),
        (r"/api/admin/book/delete", AdminBookDelete),
        (r"/api/admin/book/kindleconvert", AdminBookConvert),
        (r"/api/admin/opds/browse", AdminOPDSBrowse),
        (r"/api/admin/opds/import", AdminOPDSImport),
        (r"/api/admin/opds/import/status", AdminOPDSImportStatus),
        (r"/api/admin/opds/import/failed", AdminOPDSImportFailedList),
        (r"/api/admin/opds/import/retry", AdminOPDSImportRetry),
        (r"/api/admin/opds/sources", AdminOpdsSources),
        (r"/api/admin/trash/size", AdminTrashSize),
        (r"/api/admin/trash/clear", AdminTrashClear),
        (r"/api/admin/log", AdminSystemLog),
        (r"/api/admin/log/download", AdminSystemLogDownload),
    ]
