#!/usr/bin/calibre-debug
#-*- coding: UTF-8 -*-

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import os, re, json, logging, datetime, io
from urllib.request import urlopen
from .baidubaike.baidubaike import Page

BAIKE_ISBN = '0000000000001'
KEY = 'BaiduBaike'

class BaiduBaikeApi:

    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image

    def get_book(self, title):
        baike = self._baike(title)
        if not baike: return None
        return self._metadata(baike)

    def _baike(self, title):
        try:
            return Page(title)
        except Exception as e:
            import traceback
            logging.error(traceback.print_exc())
            return None

    def _metadata(self, baike):
        from calibre.ebooks.metadata.book.base import Metadata

        info = baike.get_info()
        logging.debug("\n".join( "%s:\t%s" % v for v in info.items()))

        mi = Metadata(info['title'])
        plat = "网络小说平台"
        plat = info.get(u'首发状态', plat)
        plat = info.get(u'首发网站', plat)
        plat = plat.replace(u'首发', '')
        mi.publisher = info.get(u'连载平台', plat)
        mi.authors   = [ info.get(u'作者', u'佚名') ]
        mi.author_sort = mi.authors[0]
        mi.isbn      = BAIKE_ISBN
        mi.tags      = baike.get_tags()
        mi.pubdate   = datetime.datetime.now()
        mi.timestamp = datetime.datetime.now()
        mi.cover_url = baike.get_image()
        mi.comments  = re.sub(r'\[\d+\]$', "", baike.get_summary() )
        mi.website   = baike.http.url
        mi.source    = u'百度百科'
        mi.provider_key = KEY
        mi.provider_value = baike.get_id()

        if self.copy_image and mi.cover_url:
            logging.debug("fetching cover: %s", mi.cover_url)
            img = io.BytesIO(urlopen(mi.cover_url).read())
            img_fmt = mi.cover_url.split(".")[-1]
            mi.cover_data = (img_fmt, img)

        if u'完结' in info.get(u'连载状态', ""):
            day = re.findall('\d*-\d*-\d*', info[u'连载状态'])
            try: mi.pubdate = datetime.datetime.strptime(day[0], '%Y-%m-%d')
            except: pass
        return mi


if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book(u'法神重生'))
    print(api.get_book(u'东周列国志'))


