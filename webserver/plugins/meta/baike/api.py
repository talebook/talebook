#!/usr/bin/python3
# -*- coding: UTF-8 -*-
import logging
import re
import requests
from webserver.i18n import _

from webserver.plugins.meta.douban import str2date
from webserver.constants import CHROME_MOBILE_HEADERS
from .baidubaike.baidubaike import Page

BAIKE_ISBN = "0000000000001"
KEY = "BaiduBaike"


class BaiduBaikeApi:
    def __init__(self, copy_image=True):
        self.copy_image = copy_image

    def get_book(self, title):
        logging.debug(f"BaiduBaikeApi.get_book called with title: {repr(title)}")
        # Check if the title is start with *[0-9][_-] then remote the prefix
        if re.match(r"^\d*+[_-]", title):
            title = re.sub(r"^\d*+[_-]", "", title)
            logging.debug(f"Stripped title prefix, new title: {repr(title)}")
        baike = self._baike(title)
        if not baike:
            return None
        return self._metadata(baike)

    def _baike(self, title):
        try:
            return Page(title)
        except Exception as err:
            logging.error(_(f"百科接口异常：{err}"))
            return None

    def _metadata(self, baike):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        info = baike.get_info()
        logging.debug("\n" + "\n".join("%s:\t%s" % v for v in info.items()))

        # 使用 info.get() 获取字段，如果不存在则使用备选字段或默认值
        title = info.get(u"中文名", info.get("title", ""))
        if not title:
            logging.info("No title found in info, means not a valid Baidu Baike page")
            return None
        mi = Metadata(title)
        mi.publisher = info.get(u"出版社", "")
        mi.authors = [info.get(u"作者", u"佚名")]
        mi.author_sort = mi.authors[0]
        mi.isbn = info.get("ISBN", BAIKE_ISBN)
        mi.tags = []
        pd = str2date(info.get(u"出版时间"))
        if pd is None:
            pd = utcnow()
        mi.pubdate = pd
        mi.timestamp = mi.pubdate
        mi.cover_url = baike.get_image()
        mi.comments = baike.get_summary()
        mi.website = baike.http.url
        mi.source = u"百度百科"
        mi.provider_key = KEY
        mi.provider_value = baike.get_id()
        try:
            mi.cover_data = self.get_cover(mi.cover_url) if self.copy_image else None
        except Exception as e:
            logging.error(f"Failed to get cover data: {e}")
            mi.cover_data = None
        return mi

    @staticmethod
    def get_cover(cover_url):
        if not cover_url:
            return None
        # 检测 cover_url 的有效性，只支持 https 协议
        if not cover_url.lower().startswith("https://"):
            logging.error("Invalid cover url: %s", cover_url)
            return None
        img = requests.get(cover_url, timeout=10, headers=CHROME_MOBILE_HEADERS).content
        img_fmt = 'jpg' if cover_url.lower().endswith('.jpeg') else 'png'
        # Convert PNG to JPEG if necessary
        if img_fmt == 'png':
            from PIL import Image
            from io import BytesIO
            try:
                image = Image.open(BytesIO(img))
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                width, height = image.size
                if height / width < 1.2:
                    # crop the image to a square centered on the middle of the image
                    min_dim = min(width, height)
                    left = (width - min_dim) / 2
                    top = (height - min_dim) / 2
                    right = (width + min_dim) / 2
                    bottom = (height + min_dim) / 2
                    image = image.crop((left, top, right, bottom))
                output = BytesIO()
                image.save(output, format='JPEG')
                img = output.getvalue()
                img_fmt = 'jpg'
            except Exception as e:
                logging.error(f"Failed to convert PNG to JPEG: {e}")
                return None
        return (img_fmt, img)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book(u"法神重生"))
    print(api.get_book(u"东周列国志"))
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book("法神重生"))
    print(api.get_book("东周列国志"))
