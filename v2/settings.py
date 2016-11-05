#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os

settings = {
    # "static_url_prefix" : "//www.talebook.org;8080/static",
    "static_path"   : os.path.join(os.path.dirname(__file__), "static"),
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "61oETzKXQAGaYdkL5gEmGeJJFuYh7EQnp2XdTP1o/Vo=",
    "login_url"     : "/login",
    "xsrf_cookies"  : True,
    "img_domain"    : "//www.talebook.org:8080",

    "SQLALCHEMY_DATABASE_URI" : 'sqlite:////data/books/tornado.db',
    "SOCIAL_AUTH_LOGIN_URL" : '/',
    "SOCIAL_AUTH_LOGIN_REDIRECT_URL" : '/done/',
    "SOCIAL_AUTH_USER_MODEL" : 'models.Reader',
    "SOCIAL_AUTH_AUTHENTICATION_BACKENDS" : (
        'social.backends.douban.DoubanOAuth',
        'social.backends.douban.DoubanOAuth2',
        'social.backends.qq.QQOAuth2',
        'social.backends.weibo.WeiboOAuth2',
    ),
}

