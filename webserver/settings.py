#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os

settings = {
    # "img_domain"    : "//www.talebook.org",
    # "static_url_prefix" : "//www.talebook.org;8080/static",
    "static_path"   : os.path.join(os.path.dirname(__file__), "static"),
    "template_path" : os.path.join(os.path.dirname(__file__), "templates"),
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "cookie_secret",
    "login_url"     : "/login",
    "xsrf_cookies"  : False,
    "user_database" : 'sqlite:////data/books/tornado.db',

    "SOCIAL_AUTH_LOGIN_URL"          : '/',
    "SOCIAL_AUTH_LOGIN_REDIRECT_URL" : '/done/',
    "SOCIAL_AUTH_USER_MODEL"         : 'models.Reader',
    "SOCIAL_AUTH_AUTHENTICATION_BACKENDS" : (
        'social.backends.douban.DoubanOAuth',
        'social.backends.douban.DoubanOAuth2',
        'social.backends.qq.QQOAuth2',
        'social.backends.weibo.WeiboOAuth2',
    ),

    # See: http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28
    'smtp_server'                      : "smtp.talebook.org",
    'smtp_username'                    : "talebook@foxmail.com",
    'smtp_password'                    : "password",

    # See: https://developers.douban.com/apikey/
    'SOCIAL_AUTH_DOUBAN_OAUTH2_KEY'    : '',
    'SOCIAL_AUTH_DOUBAN_OAUTH2_SECRET' : '',

    # See: http://open.weibo.com/developers
    'SOCIAL_AUTH_WEIBO_KEY'            : '',
    'SOCIAL_AUTH_WEIBO_SECRET'         : '',

    # See: https://connect.qq.com/
    'SOCIAL_AUTH_QQ_KEY'               : '',
    'SOCIAL_AUTH_QQ_SECRET'            : '',
}

