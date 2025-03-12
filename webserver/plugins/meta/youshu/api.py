#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
Youshu.me metadata plugin for Talebook
"""

import logging
import re
import requests
from gettext import gettext as _
from bs4 import BeautifulSoup

YOUSHU_ISBN = "0000000000002"
KEY = "Youshu"

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
                  + "Chrome/66.0.3359.139 Safari/537.36",
}


class YoushuPage:
    """
    parse youshu.me book page
    """
    def __init__(self, url):
        self.url = url
        self.http = self._request(url)
        self.soup = BeautifulSoup(self.http.text, 'html.parser')
        
    def _request(self, url):
        try:
            return requests.get(url, timeout=10, headers=CHROME_HEADERS)
        except Exception as err:
            logging.error(_(f"优书网请求异常: {err}"))
            raise
    
    def get_info(self):
        """
        extract book title and author from page
        """
        info = {"title": "", "author": ""}
        
        # 提取书名和作者
        title = self.soup.find('span', style="font-size:20px;font-weight:bold;color:#f27622;").text
        author = self.soup.select_one('a:not([class])[href*="authorarticle.php"]').text
        info["title"] = title
        info["author"] = author
        return info
    
    def get_summary(self):
        """
        extract book summary
        """
        summary_div = self.soup.find('div', style="padding:3px;border:0;height:100%;width:100%;overflow-y:scroll;")
        if summary_div:
            return summary_div.text.strip()
        return ""
    
    def get_image(self):
        """
        extract book cover image
        """
        img = self.soup.select_one('a.book-detail-img')
        if img and img.has_attr('href'):
            href = img['href']
            url = re.sub(r'/300$', '/600', href)
            return url
        return None
    
    def get_id(self):
        """
        extract book id
        """
        match = re.search(r'/book/(\d+)', self.url)
        if match:
            return match.group(1)
        return "0000"

    def get_tags(self):
        """
        extract book tags
        """
        tags = []
        for tag in self.soup.select('a[href*="tagarticle"]'):
            tags.append(tag.get_text(strip=True))

        return tags
    
    def get_plat(self):
        """
        extract book source site
        """
        td = self.soup.find('td', string=lambda text: text and '首发网站' in text)
        if td:
            source_site = td.text.split('：')[-1].strip()
            return source_site

        return ""

    def get_rating(self):
        """
        extract book rating
        """
        rt = self.soup.find('span', class_='ratenum')
        if rt:
            return int(float(rt.text))

        return 0

class YoushuSearch:
    """
    search books on youshu.me
    """
    def __init__(self):
        self.search_url = "https://www.youshu.me/modules/article/search.php"
    
    def search(self, keyword):
        payload = {
            "searchtype": "all",
            "searchkey": keyword,
            "t_btnsearch": ""
        }
        
        try:
            response = requests.post(self.search_url, data=payload, headers=CHROME_HEADERS, timeout=10)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # check if multiple results
            if "搜索关键词" in response.text:
                # multiple results, redirect to first result
                first_result = soup.select_one('span.c_subject a')
                if first_result and first_result.has_attr('href'):
                    book_url = "https://www.youshu.me" + first_result['href']
                    return YoushuPage(book_url)
                return None
            else:
                # directly get the page of the unique match
                return YoushuPage(response.url)
        except Exception as err:
            logging.error(_(f"优书网搜索异常: {err}"))
            return None


class YoushuApi:
    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image
        self.searcher = YoushuSearch()

    def get_book(self, title):
        page = self._youshu(title)
        if not page:
            return None

        return self._metadata(page)

    def _youshu(self, title):
        try:
            return self.searcher.search(title)
        except Exception as err:
            logging.error(_(f"优书网接口异常: {err}"))
            return None

    def _metadata(self, page):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        info = page.get_info()

        mi = Metadata(info["title"])
        mi.authors = [info.get("author", "佚名")]
        mi.author_sort = mi.authors[0]
        mi.isbn = YOUSHU_ISBN
        mi.tags = page.get_tags()
        mi.publisher = page.get_plat()
        mi.pubdate = utcnow()
        mi.timestamp = mi.pubdate
        mi.cover_url = page.get_image()
        mi.comments = page.get_summary()
        mi.website = page.url
        mi.source = "优书网"
        mi.provider_key = KEY
        mi.provider_value = page.get_id()
        mi.cover_data = self.get_cover(mi.cover_url)
        mi.rating = page.get_rating()

        return mi

    def get_cover(self, cover_url):
        if not self.copy_image or not cover_url:
            return None
        try:
            img = requests.get(cover_url, timeout=10, headers=CHROME_HEADERS).content
            img_fmt = cover_url.split(".")[-1]
            return (img_fmt, img)
        except Exception as err:
            logging.error(_(f"获取封面图片异常: {err}"))
            return None
        

if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    api = YoushuApi()
    print(api.get_book(u"黜龙"))
    print(api.get_book(u"一世之尊"))