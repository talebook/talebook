#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
Calibre 元数据获取插件测试用例
包括 Google Books 和 Amazon.com 查询功能
"""

import json
import logging
import os
import sys
import unittest
from unittest import mock


testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

try:
    import webserver.main
    webserver.main.init_calibre()
    CALIBRE_AVAILABLE = True
except ImportError:
    CALIBRE_AVAILABLE = False
    logging.warning("Calibre 未安装，部分测试可能无法运行")

from webserver.plugins.meta.calibre.api import CalibreMetadataApi, KEY as CALIBRE_KEY


CALIBRE_BOOK_DATA = {
    "title": "The Pragmatic Programmer",
    "authors": ["David Thomas", "Andrew Hunt"],
    "publisher": "Addison-Wesley",
    "isbn": "9780135957059",
    "pubdate": "2019-09-13",
    "rating": 4.5,
    "cover_url": "https://books.google.com/books/content?id=aEFyDwAAQBAJ&printsec=frontcover&img=1&zoom=1&edge=curl&source=gbs_api",
    "description": "The Pragmatic Programmer is a classic book on software development...",
}


class TestCalibreMetadataApi(unittest.TestCase):
    """Calibre API 测试类"""

    def test_constants(self):
        """测试常量定义"""
        self.assertIsNotNone(CALIBRE_KEY)
        self.assertEqual(CALIBRE_KEY, "Calibre")

    def test_api_init(self):
        """测试 API 初始化"""
        api = CalibreMetadataApi()
        self.assertFalse(api._patched)

    @mock.patch("webserver.plugins.meta.calibre.api.CalibreMetadataApi._identify")
    def test_get_book_by_isbn_success(self, mock_identify):
        """测试通过 ISBN 查询书籍成功"""
        # 模拟 Calibre 返回的 Metadata 对象
        mock_result = mock.Mock()
        mock_result.title = CALIBRE_BOOK_DATA["title"]
        mock_result.authors = CALIBRE_BOOK_DATA["authors"]
        mock_result.publisher = CALIBRE_BOOK_DATA["publisher"]
        mock_result.isbn = CALIBRE_BOOK_DATA["isbn"]
        mock_result.rating = 4
        mock_result.source = "google"
        mock_result.cover_url = CALIBRE_BOOK_DATA["cover_url"]

        mock_identify.return_value = [mock_result]

        results = CalibreMetadataApi.get_book_by_isbn(
            CALIBRE_BOOK_DATA["isbn"],
            sources=["google"]
        )

        self.assertIsNotNone(results)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].title, CALIBRE_BOOK_DATA["title"])

    @mock.patch("webserver.plugins.meta.calibre.api.CalibreMetadataApi._identify")
    def test_get_book_by_isbn_not_found(self, mock_identify):
        """测试通过 ISBN 查询书籍未找到"""
        mock_identify.return_value = []

        results = CalibreMetadataApi.get_book_by_isbn(
            "1234567890123",
            sources=["google"]
        )

        self.assertIsNone(results)

    @mock.patch("webserver.plugins.meta.calibre.api.CalibreMetadataApi._identify")
    def test_get_book_by_title_success(self, mock_identify):
        """测试通过书名查询书籍成功"""
        mock_result = mock.Mock()
        mock_result.title = CALIBRE_BOOK_DATA["title"]
        mock_result.authors = CALIBRE_BOOK_DATA["authors"]
        mock_result.publisher = CALIBRE_BOOK_DATA["publisher"]
        mock_result.isbn = CALIBRE_BOOK_DATA["isbn"]
        mock_result.rating = 4
        mock_result.source = "amazon"
        mock_result.cover_url = None

        mock_identify.return_value = [mock_result]

        results = CalibreMetadataApi.get_book_by_title(
            CALIBRE_BOOK_DATA["title"],
            authors=CALIBRE_BOOK_DATA["authors"],
            sources=["amazon"]
        )

        self.assertIsNotNone(results)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].source, "amazon")

    @mock.patch("webserver.plugins.meta.calibre.api.CalibreMetadataApi._identify")
    def test_get_book_by_title_not_found(self, mock_identify):
        """测试通过书名查询书籍未找到"""
        mock_identify.return_value = []

        results = CalibreMetadataApi.get_book_by_title(
            "Not Existing Book Title XYZ",
            authors=["Unknown Author"],
            sources=["amazon"]
        )

        self.assertIsNone(results)

    @mock.patch("webserver.plugins.meta.calibre.api.CalibreMetadataApi._identify")
    def test_get_book_with_exception(self, mock_identify):
        """测试异常情况"""
        mock_identify.side_effect = Exception("Network error")

        results = CalibreMetadataApi.get_book_by_isbn(
            CALIBRE_BOOK_DATA["isbn"],
            sources=["google"]
        )

        self.assertIsNone(results)

    @mock.patch("requests.get")
    def test_get_cover_success(self, mock_get):
        """测试成功获取封面"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.content = b"fake image data"
        mock_get.return_value = mock_response

        result = CalibreMetadataApi.get_cover(CALIBRE_BOOK_DATA["cover_url"])

        self.assertIsNotNone(result)
        self.assertEqual(result[0], "jpg")

    @mock.patch("requests.get")
    def test_get_cover_failure(self, mock_get):
        """测试获取封面失败"""
        mock_response = mock.Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        result = CalibreMetadataApi.get_cover(CALIBRE_BOOK_DATA["cover_url"])

        self.assertIsNone(result)

    def test_get_cover_invalid_url(self):
        """测试无效的封面 URL"""
        result = CalibreMetadataApi.get_cover("http://example.com/image.jpg")
        self.assertIsNone(result)

        result = CalibreMetadataApi.get_cover(None)
        self.assertIsNone(result)

        result = CalibreMetadataApi.get_cover("")
        self.assertIsNone(result)

    def test_ensure_patched(self):
        """测试 patch_plugins 调用"""
        CalibreMetadataApi._patched = False

        with mock.patch("webserver.plugins.meta.calibre.api.patch_plugins") as mock_patch:
            CalibreMetadataApi._ensure_patched()
            mock_patch.assert_called_once()

        self.assertTrue(CalibreMetadataApi._patched)


class TestCalibreSources(unittest.TestCase):
    """Calibre 信息源测试类"""

    def test_source_to_plugin_mapping(self):
        """测试信息源到插件的映射"""
        from webserver.plugins.meta.calibre.api import _SOURCE_TO_PLUGIN

        self.assertEqual(_SOURCE_TO_PLUGIN["google"], "Google")
        self.assertEqual(_SOURCE_TO_PLUGIN["amazon"], "Amazon.com")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
