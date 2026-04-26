#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import re
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin


KEY = "xinhua"
XHSD_ISBN = "0000000000002"


class XhsdBookApi:
    def __init__(self, copy_image=True):
        self.copy_image = copy_image
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
            'Referer': 'https://search.xhsd.com/'
        })
        self.base_search_url = 'https://search.xhsd.com/search'
        self.base_detail_url = 'https://item.xhsd.com'

    def get_book(self, title):
        # Only support ISBN query as requested
        # Check if title looks like an ISBN
        clean_title = title.replace('-', '').strip()
        if re.match(r'^\d{13}$', clean_title):
            return self.get_book_by_isbn(clean_title)

        logging.debug(f"XHSD only supports ISBN query, skipping title: {title}")
        return None

    def get_book_by_isbn(self, isbn):
        if not isbn:
            return None

        logging.info(f"Searching XHSD for ISBN: {isbn}")
        detail_url = self._get_detail_url_by_isbn(isbn)
        if not detail_url:
            logging.warning(f"XHSD: No book found for ISBN {isbn}")
            return None

        book_info = self._parse_detail_page(detail_url, isbn)
        if not book_info:
            return None

        return self._metadata(book_info)

    def _get_detail_url_by_isbn(self, isbn):
        """Search ISBN and get detail page URL"""
        try:
            params = {'keyword': isbn}
            resp = self.session.get(self.base_search_url, params=params, timeout=10)
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')

            for item in soup.find_all('li', class_='product'):
                desc_p = item.find('p', class_='product-desc')
                if not desc_p:
                    continue
                a_tag = desc_p.find('a')
                if not a_tag or not a_tag.get('href'):
                    continue

                relative_url = a_tag['href']
                detail_url = 'https:' + relative_url if relative_url.startswith('//') else urljoin(self.base_detail_url, relative_url)

                if self._isbn_exists_in_page(detail_url, isbn):
                    logging.debug(f"XHSD found match: {detail_url}")
                    return detail_url
            return None
        except Exception as e:
            logging.error(f"XHSD search error: {e}")
            return None

    def _isbn_exists_in_page(self, detail_url, target_isbn):
        """Check if target ISBN exists in the detail page HTML"""
        try:
            resp = self.session.get(detail_url, timeout=10)
            resp.encoding = 'utf-8'
            clean_isbn = target_isbn.replace('-', '')
            if re.search(clean_isbn, resp.text):
                return True
            return False
        except:
            return False

    def _parse_detail_page(self, detail_url, isbn):
        """Parse detail page for book information"""
        try:
            resp = self.session.get(detail_url, timeout=15)
            resp.encoding = 'utf-8'
            soup = BeautifulSoup(resp.text, 'html.parser')

            # 1. Basic Info
            item_title_div = soup.find('div', class_='item-title')
            if not item_title_div:
                logging.warning("XHSD: item-title div not found")
                return None

            data_item_str = item_title_div.get('data-item')
            if not data_item_str:
                return None

            data = json.loads(data_item_str)
            title = data.get('name')

            cover = data.get('mainImage')
            if cover and cover.startswith('//'):
                cover = 'https:' + cover

            author = None
            publisher = None

            attr_groups = data.get('otherAttributes') or data.get('otherAttrs') or []
            for group in attr_groups:
                if group.get('group') == 'BASIC':
                    for attr in group.get('otherAttributes', []):
                        key = attr.get('attrKey')
                        val = attr.get('attrVal')
                        if key == '作者':
                            author = val
                        elif key == '出版社':
                            publisher = val

            if not author or not publisher:
                extra = data.get('extra', {})
                if not author:
                    author = extra.get('author')

            # 2. Introduction
            introduction = ""
            spu_detail_div = soup.find('div', class_='spu-tab-item-detail')
            if spu_detail_div:
                data_detail_str = spu_detail_div.get('data-detail')
                if data_detail_str:
                    details = json.loads(data_detail_str)
                    for item in details:
                        if '内容' in item.get('title', ''):
                            html_content = item.get('content', '')
                            intro_soup = BeautifulSoup(html_content, 'html.parser')
                            introduction = intro_soup.get_text(separator='\n', strip=True)
                            introduction = re.sub(r'[\u200b\u200c\u200d\ufeff]', '', introduction)
                            introduction = introduction.strip().strip('"').strip()
                            introduction = re.sub(r'^【内容简介】[：:]\s*', '', introduction)
                            introduction = introduction.strip()
                            break

            return {
                'cover': cover,
                'title': title,
                'publisher': publisher,
                'author': author,
                'introduction': introduction,
                'isbn': isbn,
                'url': detail_url
            }

        except Exception as e:
            logging.error(f"XHSD detail parse error: {e}")
            return None

    def _metadata(self, info):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        title = info.get("title", "")
        if not title:
            return None

        mi = Metadata(title)
        mi.publisher = info.get("publisher", "")
        author = info.get("author", u"佚名")
        mi.authors = [author] if author else [u"佚名"]
        mi.author_sort = mi.authors[0]
        mi.isbn = info.get("isbn", XHSD_ISBN)
        mi.tags = []
        mi.pubdate = utcnow()
        mi.timestamp = mi.pubdate
        mi.comments = info.get("introduction", "")
        mi.website = info.get("url", "")
        mi.source = u"新华书店"
        mi.provider_key = KEY
        mi.provider_value = info.get("isbn")  # Use ISBN as provider value since we don't have a unique ID easily accessible or it's the same

        cover_url = info.get("cover")
        if not self.copy_image:
            mi.cover_url = cover_url
        elif cover_url:
            mi.cover_url = cover_url
            try:
                mi.cover_data = self.get_cover(cover_url)
            except Exception as e:
                logging.error(f"Failed to get cover data: {e}")
                mi.cover_data = None

        return mi

    def get_cover(self, cover_url):
        if not self.copy_image or not cover_url:
            return None
        try:
            img = self.session.get(cover_url, timeout=10).content
            img_fmt = 'jpg' if cover_url.lower().endswith('.jpeg') else 'png'
            if img_fmt == 'png' or cover_url.lower().endswith('.png'):
                # Simple check, real implementation might need PIL to convert if strictly needed
                # Baike implementation converted PNG to JPEG. Let's assume we might need it too if we want to be safe,
                # but for now let's just return what we get unless it's strictly required by Calibre to be JPG.
                # Baike implementation logic:
                try:
                    from PIL import Image
                    from io import BytesIO
                    image = Image.open(BytesIO(img))
                    if image.mode in ("RGBA", "P"):
                        image = image.convert("RGB")
                    output = BytesIO()
                    image.save(output, format='JPEG')
                    img = output.getvalue()
                    img_fmt = 'jpg'
                except ImportError:
                    logging.warning("PIL not found, skipping PNG to JPEG conversion")
            return (img_fmt, img)
        except Exception as e:
            logging.error(f"Get cover error: {e}")
            return None
