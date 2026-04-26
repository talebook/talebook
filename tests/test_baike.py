#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
百度百科元数据获取插件测试用例
"""

import json
import logging
import os
import sys
import unittest
from unittest import mock


testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

# 注意：需要 calibre 环境才能运行完整测试
# 如果只需要单元测试，可以注释掉 init_calibre()
try:
    import webserver.main

    webserver.main.init_calibre()
    CALIBRE_AVAILABLE = True
except ImportError:
    CALIBRE_AVAILABLE = False
    import logging

    logging.warning("Calibre 未安装，部分测试可能无法运行")

from webserver.plugins.meta.baike.api import BAIKE_ISBN, KEY, BaiduBaikeApi
from webserver.plugins.meta.baike.baidubaike.baidubaike import Page, Search


# 百度百科测试数据
BAIKE_BOOK_INFO = {
    "title": "东周列国志（冯梦龙著、清代蔡元放改编的长篇历史小说）",
    "author": "冯梦龙、蔡元放",
    "creation_period": "明代、清代",
    "literary_form": "长篇历史演义小说",
    "word_count": "800000",
    "url": "https://baike.baidu.com/item/%E4%B8%9C%E5%91%A8%E5%88%97%E5%9B%BD%E5%BF%97/2653",
}

BAIKE_PAGE_DATA = {
    "info": BAIKE_BOOK_INFO,
    "tags": ["明代", "长篇小说", "历史"],
    "summary": "《东周列国志》是明末小说家冯梦龙著、清代蔡元放改编的长篇历史演义小说，成书于清代乾隆年间。",
    "id": "2653",
    "image": "https://bkimg.cdn.bcebos.com/pic/bd3eb13533fa828b9d95cebbf21f4134970a5a37?x-bce-process=image/resize,m_lfit,w_536,limit_1/format,f_jpg",
}


def get_mock_page():
    """创建模拟 Page 对象"""
    p = mock.Mock()
    p.get_id.return_value = BAIKE_PAGE_DATA["id"]
    p.get_tags.return_value = BAIKE_PAGE_DATA["tags"]
    p.get_info.return_value = BAIKE_PAGE_DATA["info"]
    p.get_image.return_value = BAIKE_PAGE_DATA["image"]
    p.get_summary.return_value = BAIKE_PAGE_DATA["summary"]
    p.http.url = BAIKE_PAGE_DATA["info"]["url"]
    return p


BAIKE_PAGE = get_mock_page()


class TestBaiduBaikeApi(unittest.TestCase):
    """百度百科 API 测试类"""

    def test_constants(self):
        """测试常量定义"""
        self.assertEqual(KEY, "BaiduBaike")
        self.assertEqual(BAIKE_ISBN, "0000000000001")

    def test_api_init(self):
        """测试 API 初始化"""
        # 不带参数初始化（默认值 copy_image=True）
        api = BaiduBaikeApi()
        self.assertTrue(api.copy_image)
        self.assertFalse(api.manual_select)

        # 带参数初始化
        api = BaiduBaikeApi(copy_image=False, manual_select=True)
        self.assertFalse(api.copy_image)
        self.assertTrue(api.manual_select)

    @mock.patch.object(BaiduBaikeApi, "_metadata")
    def test_get_book_success(self, mk):
        """测试成功获取书籍"""
        api = BaiduBaikeApi(copy_image=False)

        # 模拟 _baike 返回 Page 对象
        with mock.patch.object(api, "_baike") as mock_baike:
            mock_baike.return_value = BAIKE_PAGE
            mk.return_value = mock.Mock(title="东周列国志")

            result = api.get_book("东周列国志")
            self.assertIsNotNone(result)
            mock_baike.assert_called_once()

    def test_get_book_not_found(self):
        """测试书籍未找到"""
        api = BaiduBaikeApi(copy_image=False)

        # 模拟 _baike 返回 None（词条不存在）
        with mock.patch.object(api, "_baike") as mock_baike:
            mock_baike.return_value = None

            result = api.get_book("不存在的书籍")
            self.assertIsNone(result)

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_get_book_with_exception(self, mk):
        """测试异常情况"""
        api = BaiduBaikeApi(copy_image=False)

        # 模拟网络请求异常
        mk.side_effect = Exception("网络错误")

        # _baike 应该捕获异常并返回 None
        result = api._baike("测试书籍")
        self.assertIsNone(result)

    @mock.patch.object(BaiduBaikeApi, "_metadata")
    def test_metadata_fields(self, mk):
        """测试元数据字段"""
        api = BaiduBaikeApi(copy_image=False)

        # 模拟 Metadata 对象
        mock_mi = mock.Mock()
        mock_mi.title = BAIKE_PAGE_DATA["info"]["title"]
        mock_mi.authors = [BAIKE_PAGE_DATA["info"]["author"]]
        mock_mi.author_sort = BAIKE_PAGE_DATA["info"]["author"]
        mock_mi.isbn = BAIKE_ISBN
        mock_mi.tags = BAIKE_PAGE_DATA["tags"]
        mock_mi.comments = BAIKE_PAGE_DATA["summary"]
        mock_mi.source = "百度百科"
        mock_mi.provider_key = KEY
        mock_mi.provider_value = BAIKE_PAGE_DATA["id"]
        mock_mi.cover_url = BAIKE_PAGE_DATA["image"]
        mock_mi.cover_data = None

        mk.return_value = mock_mi

        with mock.patch.object(api, "_baike") as mock_baike:
            mock_baike.return_value = BAIKE_PAGE

            result = api.get_book("东周列国志")
            self.assertIsNotNone(result)
            self.assertEqual(result.source, "百度百科")
            self.assertEqual(result.provider_key, KEY)


class TestBaikePage(unittest.TestCase):
    """百度百科 Page 类测试"""

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_page_init_with_url(self, mk):
        """测试 Page 初始化（使用 URL）"""
        # 模拟网页响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>东周列国志_百度百科</title></head>
        <body>
        <div class="basicInfo_SwAZS">
            <div class="name">作品名称</div>
            <div class="value">东周列国志</div>
        </div>
        </body>
        </html>
        """
        mock_response.url = "https://baike.baidu.com/item/%E4%B8%9C%E5%91%A8%E5%88%97%E5%9B%BD%E5%BF%97/2653"
        mk.return_value = mock_response

        # 使用 URL 创建 Page 对象
        url = "https://baike.baidu.com/item/%E4%B8%9C%E5%91%A8%E5%88%97%E5%9B%BD%E5%BF%97/2653"
        page = Page(url)

        self.assertEqual(page.http.url, url)
        self.assertIsNotNone(page.soup)
        self.assertIsNotNone(page.html)

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_page_init_with_title(self, mk):
        """测试 Page 初始化（使用书名）"""
        # 模拟搜索重定向到词条
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>东周列国志_百度百科</title></head>
        <body>
        <div class="basicInfo_SwAZS">
            <div class="name">作品名称</div>
            <div class="value">东周列国志</div>
        </div>
        </body>
        </html>
        """
        mk.return_value = mock_response

        # 使用书名创建 Page 对象
        page = Page("东周列国志")

        self.assertIsNotNone(page.soup)
        self.assertIsNotNone(page.html)

    def test_get_info(self):
        """测试获取书籍信息"""
        info = BAIKE_PAGE.get_info()

        self.assertEqual(info["title"], BAIKE_PAGE_DATA["info"]["title"])
        self.assertIn("url", info)

    def test_get_tags(self):
        """测试获取标签"""
        tags = BAIKE_PAGE.get_tags()

        self.assertEqual(tags, BAIKE_PAGE_DATA["tags"])
        self.assertIsInstance(tags, list)

    def test_get_summary(self):
        """测试获取摘要"""
        summary = BAIKE_PAGE.get_summary()

        self.assertEqual(summary, BAIKE_PAGE_DATA["summary"])

    def test_get_image(self):
        """测试获取封面图片"""
        image = BAIKE_PAGE.get_image()

        self.assertEqual(image, BAIKE_PAGE_DATA["image"])
        self.assertIsInstance(image, str)
        self.assertTrue(image.startswith("http"))

    def test_get_id(self):
        """测试获取词条 ID"""
        page_id = BAIKE_PAGE.get_id()

        self.assertEqual(page_id, BAIKE_PAGE_DATA["id"])


class TestBaikeSearch(unittest.TestCase):
    """百度百科 Search 类测试"""

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_search_init(self, mk):
        """测试搜索初始化"""
        # 模拟搜索响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        html_content = '<html><body><div class="f"><a href="/item/Test">Test</a><div class="abstract">Test abstract</div></div></body></html>'
        mock_response.content = html_content.encode("utf-8")
        mk.return_value = mock_response

        searcher = Search("test", results_n=10, page_n=1)

        self.assertEqual(searcher.html, mock_response.content)
        self.assertIsNotNone(searcher.soup)

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_get_results(self, mk):
        """测试获取搜索结果"""
        # 模拟搜索响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        html_content = '<html><body><div class="f"><a href="/item/DongZhou">DongZhou</a><div class="abstract">Historical novel</div></div><div class="f"><a href="/item/Test">Test</a><div class="abstract">Test content</div></div></body></html>'
        mock_response.content = html_content.encode("utf-8")
        mk.return_value = mock_response

        searcher = Search("DongZhou", results_n=10)
        results = searcher.get_results()

        # 注意：标题会被截断最后一个字符（因为要去掉"_百度百科"）
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["title"], "DongZho")  # 最后一个字符被截断
        self.assertIn("/item/", results[0]["url"])

    @mock.patch("webserver.plugins.meta.baike.baidubaike.baidubaike.requests.get")
    def test_get_results_empty(self, mk):
        """测试空搜索结果"""
        # 模拟空响应
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.content = b"<html><body></body></html>"
        mk.return_value = mock_response

        searcher = Search("notexist", results_n=10)
        results = searcher.get_results()

        self.assertEqual(len(results), 0)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
