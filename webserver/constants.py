#!/usr/bin/python
# -*- coding: UTF-8 -*-


CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
    + "Chrome/66.0.3359.139 Safari/537.36",
}

CHROME_MOBILE_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)"
    + "Version/14.0 Mobile/15E148 Safari/604.1",
}

# 书籍来源
META_SOURCE_GOOGLE = "google"
META_SOURCE_AMAZON = "amazon"
META_SOURCE_XHSD = "xinhua"
META_SOURCE_DOUBAN = "douban"
META_SOURCE_BAIDU = "baidu"
META_SOURCE_AI = "ai"

# 配置键名
META_SELECTED_SOURCES = "META_SELECTED_SOURCES"
AUTO_FILL_META = "auto_fill_meta"
