#!/usr/bin/python3
# -*- coding: UTF-8 -*-
import logging
import re
from html import unescape

import requests

from webserver.constants import CHROME_MOBILE_HEADERS
from webserver.i18n import _
from webserver.plugins.meta.common import str2date

BAIKE_ISBN = "0000000000001"
from webserver.plugins.meta.base import MetaSourceMixin, meta_manifest

KEY = "BaiduBaike"
BAIKE_ENDPOINT = "https://baike.baidu.com/api/openapi/BaikeLemmaCardApi"
BAIKE_TIMEOUT = 15
BAIKE_ATTEMPTS = 3

_BOOK_CARD_FIELDS = {
    "ISBN",
    "中文名",
    "书名",
    "作品名称",
    "作者",
    "出版社",
    "出版时间",
    "首版时间",
    "文学体裁",
}


class BaiduBaikeApi:
    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image
        self.manual_select = manual_select

    def get_book(self, title, author=None, expected_id=None):
        logging.debug(f"BaiduBaikeApi.get_book called with title: {repr(title)}")
        # Check if the title is start with *[0-9][_-] then remote the prefix
        if re.match(r"^\d*[_-]", title):
            title = re.sub(r"^\d*[_-]", "", title)
            logging.debug(f"Stripped title prefix, new title: {repr(title)}")
        queries = [title]
        if author:
            queries.append(f"{title} {author}")
        for query in queries:
            entry = self._baike(query)
            if not entry or not self._is_book_entry(entry, title, author):
                continue
            entry_id = str(entry.get("newLemmaId") or entry.get("id") or "")
            if expected_id is not None and entry_id != str(expected_id):
                logging.warning("百度百科词条 ID 已变化：expected=%s actual=%s", expected_id, entry_id)
                return None
            return self._metadata(entry)
        return None

    def _baike(self, title):
        for _attempt in range(BAIKE_ATTEMPTS):
            try:
                response = requests.get(
                    BAIKE_ENDPOINT,
                    params={"scope": "103", "format": "json", "appid": "379020", "bk_key": title, "bk_length": "600"},
                    headers=CHROME_MOBILE_HEADERS,
                    timeout=BAIKE_TIMEOUT,
                )
                if response.status_code != 200:
                    logging.warning("百度百科结构化接口返回 HTTP %s", response.status_code)
                    continue
                data = response.json()
                if not isinstance(data, dict) or data.get("errno") not in (None, 0, "0"):
                    continue
                if data.get("newLemmaId") or data.get("id"):
                    return data
            except Exception as err:
                logging.warning(_(f"百科接口单次请求异常：{err}"))
        return None

    @staticmethod
    def _card_info(entry):
        info = {}
        for item in entry.get("card") or []:
            if not isinstance(item, dict):
                continue
            name = item.get("name") or item.get("key")
            value = item.get("value")
            if name and value not in (None, ""):
                values = value if isinstance(value, list) else [value]
                clean_values = []
                for raw_value in values:
                    text = unescape(re.sub(r"<[^>]+>", "", str(raw_value))).strip()
                    if text:
                        clean_values.append(text)
                if clean_values:
                    info[str(name).strip()] = "、".join(clean_values)
        return info

    @staticmethod
    def _normalize(value):
        return re.sub(r"[\W_]+", "", str(value or "")).lower()

    def _is_book_entry(self, entry, title, author=None):
        info = self._card_info(entry)
        lemma_title = entry.get("title") or entry.get("key") or info.get("作品名称") or info.get("中文名")
        expected = self._normalize(title)
        actual = self._normalize(lemma_title)
        if not expected or not actual or (expected not in actual and actual not in expected):
            return False
        if not (_BOOK_CARD_FIELDS.intersection(info) - {"中文名", "书名", "作品名称"}):
            return False
        if author and info.get("作者"):
            expected_author = self._normalize(author)
            actual_author = self._normalize(info["作者"])
            if expected_author and expected_author not in actual_author and actual_author not in expected_author:
                return False
        return True

    def _metadata(self, entry):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        info = self._card_info(entry)
        logging.debug("\n" + "\n".join("%s:\t%s" % v for v in info.items()))

        title = info.get("作品名称") or info.get("中文名") or info.get("书名") or entry.get("title") or entry.get("key") or ""
        if not title:
            logging.info("No title found in Baidu Baike entry")
            return None
        mi = Metadata(title)
        mi.publisher = info.get("出版社", "")
        mi.authors = [info.get("作者", "佚名")]
        mi.author_sort = mi.authors[0]
        mi.isbn = info.get("ISBN", BAIKE_ISBN)
        raw_tags = entry.get("tag") or entry.get("tags") or []
        if isinstance(raw_tags, str):
            raw_tags = re.split(r"[,，]", raw_tags)
        mi.tags = [str(tag).strip() for tag in raw_tags if str(tag).strip()][:8]
        pd = str2date(info.get("出版时间") or info.get("首版时间"))
        if pd is None:
            pd = utcnow()
        mi.pubdate = pd
        mi.timestamp = mi.pubdate
        image = entry.get("image") or ""
        if isinstance(image, dict):
            image = image.get("url") or image.get("imageUrl") or ""
        mi.cover_url = image
        mi.comments = entry.get("abstract") or entry.get("desc") or ""
        entry_id = str(entry.get("newLemmaId") or entry.get("id") or "")
        mi.website = f"https://baike.baidu.com/item/{entry_id}"
        mi.source = "百度百科"
        mi.provider_key = KEY
        mi.provider_value = entry_id
        try:
            mi.cover_data = self.get_cover(mi.cover_url) if self.copy_image else None
        except Exception as e:
            logging.error(f"Failed to get cover data: {e}")
            mi.cover_data = None
        return mi

    @staticmethod
    def get_cover(cover_url, normal_cover=True):
        if not cover_url:
            return None
        # 检测 cover_url 的有效性，只支持 https 协议
        if not cover_url.lower().startswith("https://"):
            logging.error("Invalid cover url: %s", cover_url)
            return None
        img = requests.get(cover_url, timeout=10, headers=CHROME_MOBILE_HEADERS).content
        img_fmt = "jpg" if cover_url.lower().endswith(".jpeg") else "png"
        # Convert PNG to JPEG if necessary
        if img_fmt == "png":
            from PIL import Image
            from io import BytesIO

            try:
                image = Image.open(BytesIO(img))
                if image.mode in ("RGBA", "P"):
                    image = image.convert("RGB")
                width, height = image.size
                if height / width < 1.2 and normal_cover:
                    # crop the image to a square centered on the middle of the image
                    min_dim = min(width, height)
                    left = (width - min_dim) / 2
                    top = (height - min_dim) / 2
                    right = (width + min_dim) / 2
                    bottom = (height + min_dim) / 2
                    image = image.crop((left, top, right, bottom))
                output = BytesIO()
                image.save(output, format="JPEG")
                img = output.getvalue()
                img_fmt = "jpg"
            except Exception as e:
                logging.error(f"Failed to convert PNG to JPEG: {e}")
                return None
        return (img_fmt, img)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book("法神重生"))
    print(api.get_book("东周列国志"))
    logging.basicConfig(level=logging.DEBUG)
    api = BaiduBaikeApi()
    print(api.get_book("法神重生"))
    print(api.get_book("东周列国志"))


class BaiduBaikeProvider(MetaSourceMixin, BaiduBaikeApi):
    proxy_image_hosts = ("bcebos.com", "bdstatic.com")
    manifest = meta_manifest(
        "talebook.meta.baike",
        "百度百科",
        "从百度百科词条提取书籍简介、作者与出版信息。",
        "mdi-book-information-variant",
        "https://baike.baidu.com/",
    )

    def __init__(self):
        super().__init__(copy_image=False)

    def _search(self, query, context):
        mi = self.get_book(query.title, query.authors[0] if query.authors else None)
        return [mi] if mi else []

    def _fetch(self, external_id, context):
        return self.get_book(external_id, expected_id=external_id)

    def get_cover(self, cover_url, context=None):
        return BaiduBaikeApi.get_cover(cover_url)


PROVIDER = BaiduBaikeProvider()
