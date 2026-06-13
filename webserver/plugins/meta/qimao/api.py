#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
七猫小说书籍信息获取接口
仅用于获取书籍信息（详情、目录、搜索），不含下载功能。
基于 https://github.com/shing-yu/7mao-novel-downloader 的签名逻辑。
"""

import hashlib
import logging
import random

import requests

from webserver.i18n import _

QIMAO_ISBN = "0000000000004"  # 七猫小说专用 ISBN 占位符
KEY = "QimaoNovel"

# ============================================================
# 签名配置（与 SLQimao 核心一致）
# ============================================================

SIGN_KEY = "d3dGiJc651gSQ8w1"

VERSION_LIST = [
    "73720",
    "73700",
    "73620",
    "73600",
    "73500",
    "73420",
    "73400",
    "73328",
    "73325",
    "73320",
    "73300",
    "73220",
    "73200",
    "73100",
    "73000",
    "72900",
    "72820",
    "72800",
    "70720",
    "62010",
    "62112",
]

API_TIMEOUT = 15

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
    + "Chrome/66.0.3359.139 Safari/537.36",
}


# ============================================================
# 签名工具函数
# ============================================================


def _sign_params(params: dict) -> dict:
    """对参数字典进行 MD5 签名（params key 排序后拼接 + key）"""
    keys = sorted(params.keys())
    sign_str = "".join(k + "=" + str(params[k]) for k in keys) + SIGN_KEY
    params["sign"] = hashlib.md5(sign_str.encode()).hexdigest()
    return params


def _make_headers(book_id: str) -> dict:
    """生成带签名的请求头（使用 book_id 作为随机种子选择 app-version）"""
    random.seed(book_id)
    version = random.choice(VERSION_LIST)
    headers = {
        "AUTHORIZATION": "",
        "app-version": version,
        "application-id": "com.****.reader",
        "channel": "unknown",
        "net-env": "1",
        "platform": "android",
        "qm-params": "",
        "reg": "0",
    }
    keys = sorted(headers.keys())
    sign_str = "".join(k + "=" + str(headers[k]) for k in keys) + SIGN_KEY
    headers["sign"] = hashlib.md5(sign_str.encode()).hexdigest()
    return headers


# ============================================================
# API 封装
# ============================================================


class QimaoNovelApi:
    """七猫小说元数据获取 API"""

    def __init__(self, copy_image=True, manual_select=False):
        self.copy_image = copy_image
        self.manual_select = manual_select

    def search_books(self, keyword: str, page: int = 1) -> list:
        """搜索书籍，返回结果列表"""
        params = _sign_params(
            {
                "extend": "",
                "tab": "0",
                "gender": "0",
                "refresh_state": "8",
                "page": str(page),
                "wd": keyword,
                "is_short_story_user": "0",
            }
        )
        headers = _make_headers("00000000")
        try:
            resp = requests.get(
                "https://api-bc.wtzw.com/search/v1/words",
                params=params,
                headers=headers,
                timeout=API_TIMEOUT,
            )
            data = resp.json()
            book_list = data.get("data", {}).get("book_list", [])
            if not book_list:
                # 兼容另一种字段名
                book_list = data.get("data", {}).get("ret_data", [])
            return book_list or []
        except Exception as e:
            logging.error(_("七猫小说搜索异常：%s") % e)
            return []

    def get_book_detail(self, book_id: str) -> dict:
        """获取书籍详情，返回 data 字段的内容"""
        params = _sign_params({"id": book_id})
        headers = _make_headers(book_id)
        try:
            resp = requests.get(
                "https://api-bc.wtzw.com/api/v1/reader/detail",
                params=params,
                headers=headers,
                timeout=API_TIMEOUT,
            )
            data = resp.json()
            return data.get("data", {}) or {}
        except Exception as e:
            logging.error(_("七猫小说获取详情异常：%s") % e)
            return {}

    def get_book_by_id(self, book_id: str):
        """根据书籍 ID 获取元数据，返回 Metadata 对象或 None"""
        detail = self.get_book_detail(book_id)
        if not detail:
            return None
        return self._metadata(book_id, detail)

    def get_book(self, title, author=None):
        """根据书名搜索并返回最佳匹配的 Metadata 对象"""
        keyword = f"{title} {author}" if author else title
        results = self.search_books(keyword)
        if not results:
            return None

        # 优先精确匹配书名
        for item in results:
            item_title = item.get("book_name") or item.get("title", "")
            item_author = item.get("author_name") or item.get("author", "")
            if item_title == title:
                if not author or item_author == author:
                    book_id = str(item.get("book_id", ""))
                    if book_id:
                        return self.get_book_by_id(book_id)

        # 没有精确匹配则用第一条结果
        first = results[0]
        book_id = str(first.get("book_id", ""))
        if book_id:
            return self.get_book_by_id(book_id)
        return None

    def _metadata(self, book_id: str, detail: dict):
        """将 API 返回的书籍详情转换为 Calibre Metadata 对象"""
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        title = detail.get("book_name") or detail.get("title", "")
        if not title:
            return None

        mi = Metadata(title)

        author = detail.get("author_name") or detail.get("author", "佚名")
        mi.authors = [author]
        mi.author = author
        mi.author_sort = author

        mi.publisher = None
        mi.isbn = QIMAO_ISBN

        # 标签：可能是字符串（逗号分隔）或列表
        raw_tags = detail.get("category_name") or detail.get("tags", "")
        if isinstance(raw_tags, list):
            mi.tags = raw_tags[:8]
        elif isinstance(raw_tags, str) and raw_tags:
            mi.tags = [t.strip() for t in raw_tags.replace("，", ",").split(",") if t.strip()][:8]
        else:
            mi.tags = []

        mi.comments = detail.get("abstract") or detail.get("summary", "")
        mi.pubdate = utcnow()
        mi.timestamp = mi.pubdate

        cover_url = detail.get("thumb_url") or detail.get("cover", "")
        mi.cover_url = cover_url
        mi.cover_data = self.get_cover(cover_url)

        mi.website = f"https://www.qimao.com/shuku/{book_id}/"
        mi.source = "七猫小说"
        mi.provider_key = KEY
        mi.provider_value = str(book_id)
        mi.series = None
        mi.rating = None

        logging.debug("七猫小说 metadata:\n%s" % mi)
        return mi

    def get_cover(self, cover_url):
        """下载封面图片，返回 (格式, 二进制数据) 或 None"""
        if not self.copy_image or not cover_url:
            return None
        try:
            rsp = requests.get(cover_url, timeout=10, headers=CHROME_HEADERS)
            if rsp.status_code != 200:
                logging.error(_("七猫小说获取封面失败：status_code[%d] != 200") % rsp.status_code)
                return None
            img = rsp.content
            if not img:
                return None
            img_fmt = cover_url.split(".")[-1].lower().split("?")[0]
            if img_fmt not in ["jpg", "jpeg", "png", "gif", "webp"]:
                img_fmt = "jpg"
            return (img_fmt, img)
        except Exception as e:
            logging.warning(_("七猫小说获取封面失败：%s") % e)
            return None


def get_qimao_metadata(mi):
    """获取七猫小说元数据的便捷函数"""
    api = QimaoNovelApi()
    try:
        if hasattr(mi, "qimao_id") and mi.qimao_id:
            return api.get_book_by_id(mi.qimao_id)
        author = getattr(mi, "author_sort", None) or getattr(mi, "author", None)
        return api.get_book(mi.title, author)
    except Exception as e:
        logging.error("七猫小说接口异常：%s" % e)
        return None
