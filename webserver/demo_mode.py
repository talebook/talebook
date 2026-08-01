#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import logging


DEMO_SESSION_PATHS = {
    "/api/captcha/verify",
    "/api/user/sign_in",
    "/api/welcome",
}

DEMO_BLOCKED_GET_PATHS = {
    "/api/admin/users/owner",
    "/api/user/active/send",
}

READ_ONLY_METHODS = {"GET", "HEAD", "OPTIONS", "PROPFIND"}

# demo 账号首次以配置的用户名登录时，若账号不存在则自动创建时使用的固定密码。
# 仅用于公开演示站的“伪管理员”体验，不代表真实部署的密码策略。
DEMO_DEFAULT_PASSWORD = "demodemo"

# 演示模式下允许“假保存”的管理接口：请求会通过校验并返回成功，但不会写入任何配置。
DEMO_FAKE_SAVE_PATHS = {
    "/api/admin/settings",
}


def is_demo_mode(conf):
    return conf.get("DEMO_MODE", False) is True


def demo_username(conf):
    return str(conf.get("DEMO_USERNAME", "") or "").strip().lower()


def is_demo_user(conf, user):
    if not user:
        return False
    username = str(getattr(user, "username", "") or "").strip().lower()
    return bool(username) and username == demo_username(conf)


def can_login(conf, user):
    return not is_demo_mode(conf) or is_demo_user(conf, user)


def request_is_allowed(conf, method, path):
    if not is_demo_mode(conf):
        return True

    method = str(method or "").upper()
    path = str(path or "").rstrip("/") or "/"
    if method == "GET" and (path in DEMO_BLOCKED_GET_PATHS or path.startswith("/api/active/")):
        return False
    if method in READ_ONLY_METHODS:
        return True
    if method == "POST" and path in DEMO_FAKE_SAVE_PATHS:
        return True
    return method == "POST" and path in DEMO_SESSION_PATHS


def ensure_demo_account(conf, session):
    """演示模式开启时确保配置的 demo 账号存在。

    部署者不再需要预先手动创建演示账号：首次有人以 DEMO_USERNAME 登录时，
    若账号不存在则以固定密码 DEMO_DEFAULT_PASSWORD 自动创建一个非管理员的
    普通账号。真正的“查看管理员面板”体验由 handler 层针对 demo 账号单独伪造，
    不依赖这里创建的账号被赋予真实 admin 权限。
    """
    if not is_demo_mode(conf):
        return None
    username = demo_username(conf)
    if not username:
        return None

    from webserver.models import Reader

    user = session.query(Reader).filter(Reader.username == username).first()
    if user:
        return user

    user = Reader()
    user.username = username
    user.name = username
    user.email = "%s@talebook.demo" % username
    user.avatar = ""
    user.create_time = datetime.datetime.now()
    user.update_time = datetime.datetime.now()
    user.access_time = datetime.datetime.now()
    user.active = True
    user.admin = False
    user.extra = {"kindle_email": ""}
    user.set_secure_password(DEMO_DEFAULT_PASSWORD)
    session.add(user)
    session.commit()
    logging.info("demo mode: auto-created demo account %r", username)
    return user
