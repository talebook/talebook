#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os

settings = {
    # "static_host"   : "js.talebook.org",
    "static_path"   : os.path.join(os.path.dirname(__file__), "static"),
    "template_path" : os.path.join(os.path.dirname(__file__), "templates"),
    "progress_path"  : "/data/books/progress/",
    "convert_path"  : "/data/books/convert/",
    "upload_path"   : "/data/books/upload/",
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "cookie_secret",
    "login_url"     : "/login",
    "xsrf_cookies"  : False,
    "user_database" : 'sqlite:////data/books/develop.db',

    # Set this if you don't need any user management
    #"auto_login"    : 1,

    "SOCIAL_AUTH_LOGIN_URL"          : '/',
    "SOCIAL_AUTH_LOGIN_REDIRECT_URL" : '/done/',
    "SOCIAL_AUTH_USER_MODEL"         : 'models.Reader',
    "SOCIAL_AUTH_AUTHENTICATION_BACKENDS" : (
        'social_core.backends.qq.QQOAuth2',
        'social_core.backends.weibo.WeiboOAuth2',
        'social_core.backends.github.GithubOAuth2',
    ),

    # See: http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28
    'smtp_server'                      : "smtp.talebook.org",
    'smtp_username'                    : "sender@talebook.org",
    'smtp_password'                    : "password",

    # See: http://open.weibo.com/developers
    'SOCIAL_AUTH_WEIBO_KEY'            : '',
    'SOCIAL_AUTH_WEIBO_SECRET'         : '',

    # See: https://connect.qq.com/
    'SOCIAL_AUTH_QQ_KEY'               : '',
    'SOCIAL_AUTH_QQ_SECRET'            : '',

    # See: https://github.com/settings/applications/new
    'SOCIAL_AUTH_GITHUB_KEY'           : '',
    'SOCIAL_AUTH_GITHUB_SECRET'        : '',
}

