#!/usr/bin/python
#-*- coding: UTF-8 -*-

import os

settings = {
        'installed' : False,
    "autoreload"    : True,
    "static_host"   : "beta.talebook.org",
    "static_path"   : os.path.join(os.path.dirname(__file__), "static"),
    "template_path" : os.path.join(os.path.dirname(__file__), "templates"),
    "progress_path" : "/data/books/progress/",
    "convert_path"  : "/data/books/convert/",
    "upload_path"   : "/data/books/upload/",
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "cookie_secret",
    "login_url"     : "/login",
    "xsrf_cookies"  : False,
    "user_database" : 'sqlite:////data/books/develop.db',
    "site_title"    : u"奇异书屋",

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

    # See: http://open.weibo.com/developers
    'SOCIAL_AUTH_WEIBO_KEY'            : '',
    'SOCIAL_AUTH_WEIBO_SECRET'         : '',

    # See: https://connect.qq.com/
    'SOCIAL_AUTH_QQ_KEY'               : '',
    'SOCIAL_AUTH_QQ_SECRET'            : '',

    # See: https://github.com/settings/applications/new
    'SOCIAL_AUTH_GITHUB_KEY'           : '',
    'SOCIAL_AUTH_GITHUB_SECRET'        : '',

    # See: http://service.mail.qq.com/cgi-bin/help?subtype=1&&no=1001256&&id=28
    'smtp_server'   : "smtp.talebook.org",
    'smtp_username' : "sender@talebook.org",
    'smtp_password' : "password",
    'douban_apikey' : "0df993c66c0c636e29ecbb5344252a4a",

    'INVITE_MODE'   : 'NEED_CODE', # 'FREE'
    'INVITE_CODES'  : [ 'beta', 'hi' ],
    'INVITE_MESSAGE': u'''本站为私人图书馆，需输入密码才可进行访问''',

    'FRIENDS': [
        { "text": u"奇异书屋", "href": "https://www.talebook.org" },
        { "text": u"芒果读书", "href": "http://diumx.com/" },
        { "text": u"陈芸书屋", "href": "https://book.killsad.top/" },
    ],
    'SOCIALS': [
        { "name": u"Amazon", "action": "amazon" },
        { "name": u"Github", "action": "github" },
        { "name": u"微信", "action": "wechat" },
    ],

    'SIGNUP_MAIL_TITLE': u'欢迎注册奇异书屋',
    'SIGNUP_MAIL_CONTENT': u'''
Hi, %(username)s！
欢迎注册%(site_title)s，这里虽然是个小小的图书馆，但是希望你找到所爱。

点击链接激活你的账号: %(active_link)s
''',

    'RESET_MAIL_TITLE': u'奇异书屋密码重置',
    'RESET_MAIL_CONTENT': u'''
Hi, %(username)s！

你刚刚在网站上提交了密码重置，请妥善保存你的新密码: %(password)s
''',

}

