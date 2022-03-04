#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
# fmt: off
# flake8: noqa

import os

settings = {
    'installed'     : False,
    "autoreload"    : True,
    "xsrf_cookies"  : False,
    "static_host"   : "",
    "nuxt_env_path" : os.path.join(os.path.dirname(__file__), "../app/.env"),
    "html_path"     : os.path.join(os.path.dirname(__file__), "../app/dist"),
    "i18n_path"     : os.path.join(os.path.dirname(__file__), "i18n"),
    "static_path"   : os.path.join(os.path.dirname(__file__), "resources"),
    "resource_path" : os.path.join(os.path.dirname(__file__), "resources"),
    "settings_path" : "/data/books/settings/",
    "progress_path" : "/data/books/progress/",
    "convert_path"  : "/data/books/convert/",
    "upload_path"   : "/data/books/upload/",
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "cookie_secret",
    "cookie_expire" : 7*86400,
    "login_url"     : "/login",
    "user_database" : 'sqlite:////data/books/calibre-webserver.db',
    "site_title"    : u"奇异书屋",
    "ssl_crt_file"  : "/data/books/ssl/ssl.crt",
    "ssl_key_file"  : "/data/books/ssl/ssl.key",

    # https://analytics.google.com/
    "google_analytics_id" : "G-LLF01B5ZZ8",

    "opds_will_display"        : ["*"],
    "opds_wont_display"        : [],
    "opds_max_tags_shown"      : 10240,
    "opds_max_items"           : 50,
    "opds_max_ungrouped_items" : 100,
    "opds_url_prefix"          : "",

    # 100MB, tornado default max_buffer_size value
    "MAX_UPLOAD_SIZE": "100MB",

    "SOCIAL_AUTH_LOGIN_URL"          : '/',
    "SOCIAL_AUTH_LOGIN_REDIRECT_URL" : '/api/done/',
    "SOCIAL_AUTH_USER_MODEL"         : 'webserver.models.Reader',
    "SOCIAL_AUTH_AUTHENTICATION_BACKENDS" : (
        'social_core.backends.qq.QQOAuth2',
        'social_core.backends.weibo.WeiboOAuth2',
        'social_core.backends.amazon.AmazonOAuth2',
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
    'smtp_server'       : "smtp.talebook.org",
    'smtp_username'     : "sender@talebook.org",
    'smtp_password'     : "password",
    'douban_apikey'     : "0df993c66c0c636e29ecbb5344252a4a",
    'douban_baseurl'    : "https://api.douban.com",
    'douban_max_count'  : 2,

    'avatar_service'    : "https://cravatar.cn",

    'BOOK_NAMES_FORMAT': 'en',

    'INVITE_MODE'   : False,
    'INVITE_CODE'   : 'love',
    'INVITE_MESSAGE': u'''本站为私人图书馆，需输入密码才可进行访问''',

    'ALLOW_GUEST_READ' : True,
    'ALLOW_GUEST_PUSH' : True,
    'ALLOW_GUEST_DOWNLOAD' : True,
    'ALLOW_REGISTER' : False,
    'FOOTER': '本站基于Calibre构建，感谢开源界的力量。所有资源搜集于互联网，如有侵权请邮件联系。',

    'FRIENDS': [
        { "text": u"芒果读书", "href": "http://diumx.com/" },
        { "text": u"鸠摩搜索", "href": "https://www.jiumodiary.com/" },
        { "text": u"文渊阁",   "href": "https://wenyuange.org/" },
        { "text": u"阅读链",   "href": "https://www.yuedu.pro/" },
        { "text": u"苦瓜书盘", "href": "https://www.kgbook.com" },
        { "text": u"三秋书屋", "href": "https://www.sanqiu.cc/" },        
    ],
    'SOCIALS': [
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
