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
    "static_path"   : os.path.join(os.path.dirname(__file__), "../app/dist/static/"),
    "resource_path" : os.path.join(os.path.dirname(__file__), "resources"),
    "settings_path" : "/data/books/settings/",
    "progress_path" : "/data/books/progress/",
    "convert_path"  : "/data/books/convert/",
    "upload_path"   : "/data/books/upload/",
    "scan_upload_path"   : "/data/books/imports/",
    "extract_path"  : "/data/books/extract/",
    "with_library"  : "/data/books/library/",
    "cookie_secret" : "cookie_secret",
    "cookie_expire" : 7*86400,
    "login_url"     : "/login",
    "user_database" : 'sqlite:////data/books/calibre-webserver.db',
    "site_title"    : u"奇异书屋",
    "ssl_crt_file"  : "/data/books/ssl/ssl.crt",
    "ssl_key_file"  : "/data/books/ssl/ssl.key",

    "push_title": u"%(site_title)s：推送给您一本书《%(title)s》",
    "push_content": u"为您奉上一本《%(title)s》, 欢迎常来访问%(site_title)s！%(site_url)s",

    "convert_timeout" : 300,

    # https://analytics.google.com/
    "google_analytics_id" : "G-LLF01B5ZZ8",

    "opds_will_display"        : ["*"],
    "opds_wont_display"        : [],
    "opds_max_tags_shown"      : 10240,
    "opds_max_items"           : 50,
    "opds_max_ungrouped_items" : 100,
    "opds_url_prefix"          : "",

    "db_engine_args": {
        "echo": False,
    },

    # 100MB, tornado default max_buffer_size value
    "MAX_UPLOAD_SIZE": "100MB",

    "PDF_VIEWER": "/static/pdfjs/web/viewer.html?file=%(pdf_url)s",

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
    'smtp_encryption'   : "TLS",
    'smtp_username'     : "sender@talebook.org",
    'smtp_password'     : "password",
    'douban_apikey'     : "0df993c66c0c636e29ecbb5344252a4a",
    'douban_baseurl'    : "https://api.douban.com",
    'douban_max_count'  : 2,
    'auto_fill_meta'    : False,

    'avatar_service'    : "https://cravatar.cn",

    'BOOK_NAMES_FORMAT': 'en',
    'BOOK_NAV'          : '''经管=经济学/管理/经济/金融/商业/投资/营销/理财/创业/广告/股票/企业史/策划
文学=小说/外国文学/文学/随笔/中国文学/经典/散文/日本文学/村上春树/童话/诗歌/王小波/杂文/张爱玲/儿童文学/余华/古典文学/名著/钱钟书/当代文学/鲁迅/外国名著/诗词/茨威格/杜拉斯/米兰·昆德拉/港台
流行=漫画/绘本/推理/青春/言情/科幻/韩寒/武侠/悬疑/耽美/亦舒/东野圭吾/日本漫画/奇幻/安妮宝贝/三毛/郭敬明/网络小说/穿越/金庸/几米/轻小说/推理小说/阿加莎·克里斯蒂/张小娴/幾米/魔幻/青春文学/高木直子/J.K.罗琳/沧月/落落/张悦然/古龙/科幻小说/蔡康永
文化=历史/心理学/哲学/传记/文化/社会学/设计/艺术/政治/社会/建筑/宗教/电影/数学/政治学/回忆录/思想/国学/中国历史/音乐/人文/戏剧/人物传记/绘画/艺术史/佛教/军事/西方哲学/二战/自由主义/近代史/考古/美术
生活=爱情/旅行/生活/励志/成长/摄影/心理/女性/职场/美食/游记/教育/灵修/情感/健康/手工/养生/两性/家居/人际关系/自助游
科技=科普/互联网/编程/科学/交互设计/用户体验/算法/web/科技/UE/UCD/通信/交互/神经网络/程序
''',

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
        { "text": u"追更神器", "href": "https://github.com/hectorqin/reader" },
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
