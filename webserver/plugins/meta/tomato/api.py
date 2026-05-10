#!/usr/bin/python3
# -*- coding: UTF-8 -*-

"""
番茄小说元数据获取 API
基于 Tomato-Novel-Downloader 项目的解析逻辑
"""

import logging
import requests
from webserver.i18n import _
from .tomato.tomato import Page, Search
from .tomato.tomatoexception import VerifyError, PageError

TOMATO_ISBN = "0000000000003"  # 番茄小说专用 ISBN 占位符
KEY = "TomatoNovel"

CHROME_HEADERS = {
    "Accept-Language": "zh-CN,zh;q=0.8,zh-TW;q=0.6",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko)"
    + "Chrome/66.0.3359.139 Safari/537.36",
}


class TomatoNovelApi:
    """
    番茄小说元数据获取 API

    根据书名或书籍 ID 获取番茄小说的元数据信息
    出版社字段设置为空（番茄小说为网络小说平台，无传统出版社）
    """

    def __init__(self, copy_image=True, manual_select=False, cookie=None):
        """
        初始化 API

        :param copy_image: 是否下载封面图片
        :param manual_select: 是否手动选择（暂未实现）
        :param cookie: 可选的 Cookie 字符串，用于绕过反爬验证
        """
        self.copy_image = copy_image
        self.manual_select = manual_select
        self.cookie = cookie

    def get_book_by_id(self, book_id):
        """
        根据书籍 ID 获取书籍信息

        :param book_id: 番茄小说的书籍 ID（数字字符串）
        :return: Page 对象或 None
        """
        try:
            return Page(book_id, cookie=self.cookie)
        except VerifyError as err:
            logging.warning(_(f"番茄小说需要验证：{err}"))
            return None
        except PageError as err:
            logging.error(_(f"番茄小说页面不存在：{err}"))
            return None
        except Exception as err:
            logging.error(_(f"番茄小说接口异常：{err}"))
            return None

    def search_book(self, title, author=None):
        """
        搜索书籍

        :param title: 书名
        :param author: 作者（可选）
        :return: 搜索结果列表
        """
        try:
            # 组合搜索关键词
            keyword = f"{title} {author}" if author else title
            searcher = Search(keyword, max_results=10, cookie=self.cookie)
            return searcher.get_results()
        except Exception as err:
            logging.error(_(f"番茄小说搜索异常：{err}"))
            return []

    def get_book(self, title, author=None):
        """
        根据书名获取书籍信息（自动搜索并返回第一个匹配结果）

        :param title: 书名
        :param author: 作者（可选）
        :return: Metadata 对象或 None
        """
        # 先尝试搜索
        results = self.search_book(title, author)
        if not results:
            return None

        # 找到最匹配的结果
        for result in results:
            # 精确匹配书名
            if result["title"] == title:
                if not author or result["author"] == author:
                    # 找到精确匹配
                    page = self.get_book_by_id(result["book_id"])
                    if page:
                        return self._metadata(page)

        # 如果没有精确匹配，使用第一个结果
        if results:
            page = self.get_book_by_id(results[0]["book_id"])
            if page:
                return self._metadata(page)

        return None

    def get_book_by_id_direct(self, book_id):
        """
        直接根据书籍 ID 获取元数据

        :param book_id: 番茄小说的书籍 ID
        :return: Metadata 对象或 None
        """
        page = self.get_book_by_id(book_id)
        if not page:
            return None
        return self._metadata(page)

    def _metadata(self, page):
        """
        将 Page 对象转换为 Calibre Metadata 对象

        :param page: Page 对象
        :return: Metadata 对象或 None（如果是无效结果）
        """
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.utils.date import utcnow

        info = page.get_info()
        logging.debug("\n" + "\n".join("%s:\t%s" % v for v in info.items()))

        # 检查是否是无效的推广页面
        title = info.get("title", "")
        comments = page.get_summary()

        # 如果标题包含"番茄小说"且简介包含推广内容，说明是无效结果
        if title and ("番茄小说" in title or title.startswith("未知")):
            if comments and ("番茄小说是抖音旗下" in comments or "海量正版小说" in comments or "书荒广场" in comments):
                logging.info("检测到番茄小说无效推广页面，跳过：%s", title)
                return None

        # 创建 Metadata 对象
        mi = Metadata(info["title"])

        # 作者信息
        mi.authors = [info.get("author", "佚名")]
        mi.author = mi.authors[0]
        mi.author_sort = mi.authors[0]

        # 出版社：番茄小说为网络平台，设置为空
        # 使用 None 表示没有出版社信息（Calibre 会正确处理 None 值）
        mi.publisher = None

        # ISBN：使用占位符
        mi.isbn = TOMATO_ISBN

        # 标签
        mi.tags = page.get_tags()[:8]  # 限制最多 8 个标签

        # 简介
        mi.comments = page.get_summary()

        # 出版日期：网络小说通常没有明确出版日期，使用当前时间
        mi.pubdate = utcnow()
        mi.timestamp = mi.pubdate

        # 封面
        mi.cover_url = page.get_image()
        mi.cover_data = self.get_cover(mi.cover_url)

        # 网站和来源信息
        mi.website = info.get("url", "https://fanqienovel.com/")
        mi.source = "番茄小说"
        mi.provider_key = KEY
        mi.provider_value = page.get_id()

        # 系列信息（番茄小说一般没有系列信息）
        mi.series = None

        # 评分（番茄小说没有明确的评分信息）
        mi.rating = None

        logging.debug("=================\n番茄小说 metadata:\n%s" % mi)
        return mi

    def get_cover(self, cover_url):
        """
        获取封面图片数据

        :param cover_url: 封面图片 URL
        :return: (格式，二进制数据) 元组或 None
        """
        if not self.copy_image or not cover_url:
            return None

        try:
            rsp = requests.get(cover_url, timeout=10, headers=CHROME_HEADERS)
            if rsp.status_code != 200:
                logging.error(_(f"获取封面失败：status_code[{rsp.status_code}] != 200 OK"))
                return None

            img = rsp.content
            if not img or len(img) == 0:
                logging.error(_("获取封面失败：封面数据为空"))
                return None

            # 从 URL 提取图片格式
            img_fmt = cover_url.split(".")[-1].lower()
            if img_fmt not in ["jpg", "jpeg", "png", "gif", "webp"]:
                img_fmt = "jpg"  # 默认格式

            return (img_fmt, img)
        except Exception as e:
            logging.warning(_(f"获取封面失败：{e}"))
            return None


def get_tomato_metadata(mi):
    """
    获取番茄小说元数据的便捷函数

    :param mi: 包含书名等信息的 Metadata 对象
    :return: Metadata 对象或 None
    """
    api = TomatoNovelApi()
    try:
        # 优先尝试使用 douban_id 或 isbn
        if hasattr(mi, "tomato_id") and mi.tomato_id:
            return api.get_book_by_id_direct(mi.tomato_id)

        # 否则使用书名搜索
        author = getattr(mi, "author_sort", None) or getattr(mi, "author", None)
        return api.get_book(mi.title, author)
    except Exception as err:
        logging.error(f"番茄小说接口异常：{err}")
        return None


def select_tomato_metadata(mi):
    """
    手动选择番茄小说元数据（预留接口）

    :param mi: Metadata 对象
    :return: Metadata 对象或 None
    """
    # 目前实现与 get_tomato_metadata 相同
    # 后续可添加用户界面让用户从搜索结果中选择
    return get_tomato_metadata(mi)


if __name__ == "__main__":
    logging.basicConfig(level=logging.DEBUG)
    api = TomatoNovelApi()

    # 测试示例
    print("测试 1：根据 ID 获取")
    page = api.get_book_by_id("7141319866317819927")
    if page:
        print(api._metadata(page))

    print("\n测试 2：根据书名搜索")
    book = api.get_book("吞噬星空")
    if book:
        print(book)

    print("\n测试 3：搜索")
    results = api.search_book("吞噬星空", "我吃西红柿")
    for r in results:
        print(r)
