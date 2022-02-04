#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import re, logging, traceback
from .baidubaike.baidubaike import Page
import requests

BAIKE_ISBN = "0000000000001"
KEY = "BaiduBaike"

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
    + "Chrome/66.0.3359.139 Safari/537.36",
}


class BaiduBaikeApi:
    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image

    def get_book(self, title):
        baike = self._baike(title)
        if not baike:
            return None
        return self._metadata(baike)

    def _baike(self, title):
        try:
            return Page(title)
        except Exception:
            logging.error(traceback.print_exc())
            return None

    def _metadata(self, baike):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow, strptime

        info = baike.get_info()
        logging.debug("\n".join("%s:\t%s" % v for v in info.items()))

        mi = Metadata(info["title"])
        plat = "网络小说平台"
        plat = info.get(u"首发状态", plat)
        plat = info.get(u"首发网站", plat)
        plat = plat.replace(u"首发", "")
        mi.publisher = info.get(u"连载平台", plat)
        mi.authors = [info.get(u"作者", u"佚名")]
        mi.author_sort = mi.authors[0]
        mi.isbn = BAIKE_ISBN
        mi.tags = baike.get_tags()
        mi.pubdate = utcnow()
        mi.timestamp = utcnow()
        mi.cover_url = baike.get_image()
        mi.comments = re.sub(r"\[\d+\]$", "", baike.get_summary())
        mi.website = baike.http.url
        mi.source = u"百度百科"
        mi.provider_key = KEY
        mi.provider_value = baike.get_id()
        mi.cover_data = self.get_cover(mi.cover_url)

        if u"完结" in info.get(u"连载状态", ""):
            day = re.findall(r"\d*-\d*-\d*", info[u"连载状态"])
            try:
                mi.pubdate = strptime(day[0], "%Y-%m-%d")
            except:
                pass
        return mi

    def get_cover(self, cover_url):
        if not self.copy_image or not cover_url:
            return None
        img = requests.get(cover_url, headers=CHROME_HEADERS).content
        img_fmt = cover_url.split(".")[-1]
        return (img_fmt, img)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book(u"法神重生"))
    print(api.get_book(u"东周列国志"))
