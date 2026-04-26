#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
番茄小说元数据获取插件测试用例
"""

import json
import logging
import os
import sys
import unittest
from unittest import mock


testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

import webserver.main
from webserver.plugins.meta.tomato.api import KEY, TOMATO_ISBN, TomatoNovelApi
from webserver.plugins.meta.tomato.tomato.tomato import Page, Search
from webserver.plugins.meta.tomato.tomato.tomatoexception import PageError, VerifyError


webserver.main.init_calibre()

# 番茄小说测试数据
TOMATO_BOOK_INFO = {
    "title": "我不是戏神",
    "author": "三九音域",
    "abstract": "赤色流星划过天际，人类文明近乎停滞。无数扇门被打开，诡异与神秘降临世间。",
    "book_id": "7276384138653862966",
    "url": "https://fanqienovel.com/page/7276384138653862966",
    "tags": ["连载中", "都市", "异能"],
    "word_count": 3500000,
}

TOMATO_SEARCH_RESULT = {
    "data": {
        "ret_data": [
            {
                "title": "我不是戏神",
                "author": "三九音域",
                "book_id": "7276384138653862966",
                "abstract": "赤色流星划过天际，人类文明近乎停滞。",
            },
            {
                "title": "戏神",
                "author": "其他作者",
                "book_id": "7123456789012345678",
                "abstract": "另一个故事",
            },
        ]
    }
}


def get_mock_page():
    """创建模拟 Page 对象"""
    p = mock.Mock()
    p.get_id.return_value = TOMATO_BOOK_INFO["book_id"]
    p.get_tags.return_value = TOMATO_BOOK_INFO["tags"]
    p.get_info.return_value = TOMATO_BOOK_INFO
    p.get_image.return_value = "https://example.com/cover.jpg"
    p.get_summary.return_value = TOMATO_BOOK_INFO["abstract"]
    return p


TOMATO_PAGE = get_mock_page()


class TestTomatoNovelApi(unittest.TestCase):
    """番茄小说 API 测试类"""

    def test_constants(self):
        """测试常量定义"""
        self.assertEqual(KEY, "TomatoNovel")
        self.assertEqual(TOMATO_ISBN, "0000000000003")

    def test_api_init(self):
        """测试 API 初始化"""
        # 不带参数初始化（默认值 copy_image=True）
        api = TomatoNovelApi()
        self.assertTrue(api.copy_image)
        self.assertFalse(api.manual_select)
        self.assertIsNone(api.cookie)

        # 带参数初始化
        api = TomatoNovelApi(copy_image=False, manual_select=True, cookie="test_cookie")
        self.assertFalse(api.copy_image)
        self.assertTrue(api.manual_select)
        self.assertEqual(api.cookie, "test_cookie")

    @mock.patch.object(TomatoNovelApi, "_metadata")
    def test_get_book_by_id_direct(self, mk):
        """测试根据 ID 直接获取书籍"""
        api = TomatoNovelApi(copy_image=False)

        # 测试成功情况
        with mock.patch.object(api, "get_book_by_id") as mock_get:
            mock_get.return_value = TOMATO_PAGE
            mk.return_value = mock.Mock(title="我不是戏神")

            result = api.get_book_by_id_direct("7276384138653862966")
            self.assertIsNotNone(result)
            mock_get.assert_called_once()

        # 测试失败情况（Page 不存在）
        with mock.patch.object(api, "get_book_by_id") as mock_get:
            mock_get.return_value = None

            result = api.get_book_by_id_direct("invalid_id")
            self.assertIsNone(result)

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_search_book(self, mk):
        """测试搜索功能"""
        # 模拟 API 响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TOMATO_SEARCH_RESULT
        mk.return_value = mock_response

        api = TomatoNovelApi(copy_image=False)
        results = api.search_book("我不是戏神")

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["title"], "我不是戏神")
        self.assertEqual(results[0]["book_id"], "7276384138653862966")

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_get_book(self, mk):
        """测试根据书名获取书籍"""
        # 模拟搜索响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TOMATO_SEARCH_RESULT
        mk.return_value = mock_response

        api = TomatoNovelApi(copy_image=False)

        # 测试成功获取 - mock get_book_by_id 返回一个完整的 Mock Page 对象
        mock_page = mock.Mock()
        mock_page.get_info.return_value = TOMATO_BOOK_INFO
        mock_page.get_tags.return_value = TOMATO_BOOK_INFO["tags"]
        mock_page.get_summary.return_value = TOMATO_BOOK_INFO["abstract"]
        mock_page.get_image.return_value = "https://example.com/cover.jpg"
        mock_page.get_id.return_value = TOMATO_BOOK_INFO["book_id"]

        with mock.patch.object(api, "get_book_by_id") as mock_get:
            mock_get.return_value = mock_page

            result = api.get_book("我不是戏神", "三九音域")
            self.assertIsNotNone(result)

    def test_publisher_is_none(self):
        """测试出版社字段为 None"""
        api = TomatoNovelApi(copy_image=False)

        # 创建模拟 Metadata 对象
        mi = mock.Mock()
        mi.publisher = None

        # 验证 publisher 为 None
        self.assertIsNone(mi.publisher)

    @mock.patch.object(TomatoNovelApi, "_metadata")
    def test_metadata_fields(self, mk):
        """测试元数据字段"""
        api = TomatoNovelApi(copy_image=False)

        # 模拟 Metadata 对象
        mock_mi = mock.Mock()
        mock_mi.title = TOMATO_BOOK_INFO["title"]
        mock_mi.authors = [TOMATO_BOOK_INFO["author"]]
        mock_mi.author = TOMATO_BOOK_INFO["author"]
        mock_mi.publisher = None
        mock_mi.isbn = TOMATO_ISBN
        mock_mi.tags = TOMATO_BOOK_INFO["tags"][:8]
        mock_mi.comments = TOMATO_BOOK_INFO["abstract"]
        mock_mi.source = "番茄小说"
        mock_mi.provider_key = KEY
        mock_mi.provider_value = TOMATO_BOOK_INFO["book_id"]

        mk.return_value = mock_mi

        with mock.patch.object(api, "get_book_by_id") as mock_get:
            mock_get.return_value = TOMATO_PAGE

            result = api.get_book_by_id_direct(TOMATO_BOOK_INFO["book_id"])
            self.assertIsNotNone(result)
            self.assertEqual(result.publisher, None)
            self.assertEqual(result.isbn, TOMATO_ISBN)
            self.assertEqual(result.source, "番茄小说")


class TestTomatoPage(unittest.TestCase):
    """番茄小说 Page 类测试"""

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_page_init_with_api(self, mk):
        """测试 Page 初始化（使用网页访问）"""
        # 模拟网页响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>我不是戏神</title></head>
        <body>
        <h1>我不是戏神</h1>
        <div class="author-name"><span class="author-name-text">三九音域</span></div>
        <div class="page-abstract-content"><p>赤色流星划过天际，人类文明近乎停滞。</p></div>
        </body>
        </html>
        """
        mk.return_value = mock_response

        # 创建 Page 对象（应该使用网页解析）
        page = Page(TOMATO_BOOK_INFO["book_id"])

        self.assertEqual(page.book_id, TOMATO_BOOK_INFO["book_id"])
        self.assertIsNotNone(page.soup)
        self.assertIsNotNone(page.html)

        # 测试获取信息
        info = page.get_info()
        self.assertEqual(info["book_id"], TOMATO_BOOK_INFO["book_id"])

    def test_get_info(self):
        """测试获取书籍信息"""
        info = TOMATO_PAGE.get_info()

        self.assertEqual(info["title"], TOMATO_BOOK_INFO["title"])
        self.assertEqual(info["author"], TOMATO_BOOK_INFO["author"])
        self.assertEqual(info["book_id"], TOMATO_BOOK_INFO["book_id"])
        self.assertIn("url", info)

    def test_get_tags(self):
        """测试获取标签"""
        tags = TOMATO_PAGE.get_tags()

        self.assertEqual(tags, TOMATO_BOOK_INFO["tags"])
        self.assertIsInstance(tags, list)

    def test_get_summary(self):
        """测试获取简介"""
        summary = TOMATO_PAGE.get_summary()

        self.assertEqual(summary, TOMATO_BOOK_INFO["abstract"])

    def test_get_id(self):
        """测试获取书籍 ID"""
        book_id = TOMATO_PAGE.get_id()

        self.assertEqual(book_id, TOMATO_BOOK_INFO["book_id"])


class TestTomatoSearch(unittest.TestCase):
    """番茄小说 Search 类测试"""

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_search_init(self, mk):
        """测试搜索初始化"""
        # 模拟 API 响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TOMATO_SEARCH_RESULT
        mk.return_value = mock_response

        searcher = Search("我不是戏神", max_results=5)

        self.assertEqual(searcher.keyword, "我不是戏神")
        self.assertEqual(searcher.max_results, 5)
        self.assertEqual(len(searcher.data), 2)

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_get_results(self, mk):
        """测试获取搜索结果"""
        # 模拟 API 响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TOMATO_SEARCH_RESULT
        mk.return_value = mock_response

        searcher = Search("我不是戏神", max_results=5)
        results = searcher.get_results()

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["title"], "我不是戏神")
        self.assertEqual(results[0]["author"], "三九音域")
        self.assertEqual(results[0]["book_id"], "7276384138653862966")
        self.assertIn("fanqienovel.com", results[0]["url"])

    @mock.patch("webserver.plugins.meta.tomato.tomato.tomato.requests.get")
    def test_search_with_cookie(self, mk):
        """测试带 Cookie 的搜索"""
        # 模拟 API 响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = TOMATO_SEARCH_RESULT
        mk.return_value = mock_response

        searcher = Search("我不是戏神", max_results=5, cookie="test_install_id")
        results = searcher.get_results()

        self.assertEqual(len(results), 2)
        # 验证请求时使用了 Cookie
        mk.assert_called_once()
        call_args = mk.call_args
        self.assertIn("headers", call_args[1])
        self.assertIn("Cookie", call_args[1]["headers"])


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
