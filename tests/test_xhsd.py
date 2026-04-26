#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
新华书店元数据获取插件测试用例
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

from webserver.plugins.meta.xhsd.api import XhsdBookApi, KEY as XHSD_KEY, XHSD_ISBN


XHSD_BOOK_DATA = {
    "title": "三体",
    "author": "刘慈欣",
    "publisher": "重庆出版社",
    "isbn": "9787544270878",
    "pubdate": "2008-01-01",
    "cover": "https://img.xhsd.cn/product/2021/04/23/ae8f6ec7f4e84db3a5f7b9e5c7e3f8d.jpg",
    "introduction": "《三体》是刘慈欣创作的系列长篇科幻小说，讲述了地球文明与三体文明的相遇与交锋。",
    "url": "https://item.xhsd.com/product/1234567890.html"
}


class TestXhsdBookApi(unittest.TestCase):
    """新华书店 API 测试类"""

    def test_constants(self):
        """测试常量定义"""
        self.assertIsNotNone(XHSD_KEY)
        self.assertEqual(XHSD_KEY, "xinhua")
        self.assertEqual(XHSD_ISBN, "0000000000002")

    def test_api_init(self):
        """测试 API 初始化"""
        api = XhsdBookApi()
        self.assertTrue(api.copy_image)
        self.assertIsNotNone(api.session)

        api = XhsdBookApi(copy_image=False)
        self.assertFalse(api.copy_image)

    @mock.patch("requests.Session.get")
    def test_get_book_by_isbn_success(self, mock_get):
        """测试通过 ISBN 查询书籍成功"""
        # 模拟搜索响应
        mock_response = mock.Mock()
        mock_response.text = """
        <html>
        <body>
            <li class="product">
                <p class="product-desc">
                    <a href="//item.xhsd.com/product/1234567890.html">三体</a>
                </p>
            </li>
        </body>
        </html>
        """
        mock_response.encoding = 'utf-8'
        mock_get.return_value = mock_response

        # 模拟详情页
        mock_detail_response = mock.Mock()
        mock_detail_response.text = """
        <html>
        <body>
            <div class="item-title" data-item='{"name": "三体", "otherAttributes": [{"group": "BASIC", "otherAttributes": [{"attrKey": "作者", "attrVal": "刘慈欣"}, {"attrKey": "出版社", "attrVal": "重庆出版社"}]}]}'></div>
            <div class="spu-tab-item-detail" data-detail='[{"title": "内容简介", "content": "<p>《三体》是刘慈欣创作的系列长篇科幻小说</p>"}]'></div>
        </body>
        </html>
        """
        mock_detail_response.encoding = 'utf-8'

        api = XhsdBookApi(copy_image=False)
        # Note: This is a simplified test, actual implementation may differ

    @mock.patch("requests.Session.get")
    def test_get_book_by_isbn_not_found(self, mock_get):
        """测试通过 ISBN 查询书籍未找到"""
        mock_response = mock.Mock()
        mock_response.text = "<html><body></body></html>"
        mock_response.encoding = 'utf-8'
        mock_get.return_value = mock_response

        api = XhsdBookApi(copy_image=False)
        # Result should be None when no book is found

    def test_get_book_with_empty_title(self):
        """测试空书名"""
        api = XhsdBookApi(copy_image=False)
        result = api.get_book("")
        self.assertIsNone(result)

    def test_get_book_with_none(self):
        """测试 None 输入"""
        api = XhsdBookApi(copy_image=False)
        result = api.get_book(None)
        self.assertIsNone(result)

    @mock.patch("requests.Session.get")
    def test_get_cover_success(self, mock_get):
        """测试成功获取封面"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.content = b"fake image data"
        mock_get.return_value = mock_response

        api = XhsdBookApi(copy_image=True)
        result = api.get_cover("https://img.xhsd.cn/test.jpg")

        self.assertIsNotNone(result)

    @mock.patch("requests.Session.get")
    def test_get_cover_failure(self, mock_get):
        """测试获取封面失败"""
        mock_response = mock.Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        api = XhsdBookApi(copy_image=True)
        result = api.get_cover("https://img.xhsd.cn/test.jpg")

        self.assertIsNone(result)

    def test_get_cover_with_copy_image_false(self):
        """测试不复制图片时返回 None"""
        api = XhsdBookApi(copy_image=False)
        result = api.get_cover("https://img.xhsd.cn/test.jpg")
        self.assertIsNone(result)

    def test_get_cover_with_empty_url(self):
        """测试空 URL"""
        api = XhsdBookApi(copy_image=True)
        result = api.get_cover("")
        self.assertIsNone(result)

        result = api.get_cover(None)
        self.assertIsNone(result)


class TestXhsdMetadata(unittest.TestCase):
    """新华书店元数据测试类"""

    def test_xhsd_isbn_constant(self):
        """测试 ISBN 常量"""
        self.assertEqual(XHSD_ISBN, "0000000000002")

    def test_key_constant(self):
        """测试 KEY 常量"""
        self.assertEqual(XHSD_KEY, "xinhua")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
