#!/usr/bin/env python3
# -*- coding: UTF-8 -*-


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
    return method == "POST" and path in DEMO_SESSION_PATHS
