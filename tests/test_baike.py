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

from webserver.plugins.meta.baike.api import BAIKE_ATTEMPTS, BAIKE_ENDPOINT, BAIKE_ISBN, KEY, BaiduBaikeApi
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

BAIKE_API_DATA = {
    "id": 2653,
    "newLemmaId": 2653,
    "key": "东周列国志",
    "title": "东周列国志",
    "desc": "明代冯梦龙创作的长篇历史演义小说",
    "abstract": "《东周列国志》是明代冯梦龙创作、清代蔡元放改编的长篇历史演义小说。",
    "image": "https://bkimg.cdn.bcebos.com/pic/book-cover.jpg",
    "card": [
        {"key": "m27_nameC", "name": "作品名称", "value": ["东周列国志"]},
        {"key": "m27_author", "name": "作者", "value": ["冯梦龙、蔡元放"]},
        {"key": "publisher", "name": "出版社", "value": ["人民文学出版社"]},
        {"key": "isbn", "name": "ISBN", "value": ["9787020009435"]},
        {"key": "m27_genre", "name": "文学体裁", "value": ["长篇历史演义小说"]},
    ],
}


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

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_get_book_success(self, mk):
        """结构化接口返回图书词条时构造元数据。"""
        response = mock.Mock(status_code=200)
        response.json.return_value = BAIKE_API_DATA
        mk.return_value = response
        api = BaiduBaikeApi(copy_image=False)

        result = api.get_book("东周列国志", "冯梦龙")

        self.assertIsNotNone(result)
        self.assertEqual(result.title, "东周列国志")
        self.assertEqual(result.authors, ["冯梦龙、蔡元放"])
        self.assertEqual(result.provider_value, "2653")
        self.assertEqual(result.website, "https://baike.baidu.com/item/2653")
        request = mk.call_args
        self.assertEqual(request.args[0], BAIKE_ENDPOINT)
        self.assertEqual(request.kwargs["params"]["bk_key"], "东周列国志")
        self.assertNotIn("/search/word", request.args[0])

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_get_book_not_found(self, mk):
        """errno 非零且没有作者可重试时返回空。"""
        response = mock.Mock(status_code=200)
        response.json.return_value = {"errno": 2}
        mk.return_value = response
        api = BaiduBaikeApi(copy_image=False)

        result = api.get_book("不存在的书籍")

        self.assertIsNone(result)
        self.assertEqual(mk.call_count, BAIKE_ATTEMPTS)

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_get_book_with_exception(self, mk):
        """测试异常情况"""
        api = BaiduBaikeApi(copy_image=False)

        # 模拟网络请求异常
        mk.side_effect = Exception("网络错误")

        result = api.get_book("测试书籍")
        self.assertIsNone(result)
        self.assertEqual(mk.call_count, BAIKE_ATTEMPTS)

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_retries_once_with_author_after_wrong_entity(self, mk):
        """首个同名非图书词条应带作者重试一次。"""
        wrong = mock.Mock(status_code=200)
        wrong.json.return_value = {
            "id": 999,
            "key": "活着",
            "desc": "1994年张艺谋执导的电影",
            "card": [{"key": "导演", "value": "张艺谋"}],
        }
        correct = mock.Mock(status_code=200)
        correct.json.return_value = {
            **BAIKE_API_DATA,
            "key": "活着",
            "title": "活着",
            "id": 1000,
            "newLemmaId": 1000,
            "card": [
                {"key": "作品名称", "value": "活着"},
                {"key": "作者", "value": "余华"},
            ],
        }
        mk.side_effect = [wrong, correct]
        api = BaiduBaikeApi(copy_image=False)

        result = api.get_book("活着", "余华")

        self.assertIsNotNone(result)
        self.assertEqual(result.authors, ["余华"])
        self.assertEqual(mk.call_count, 2)
        self.assertEqual(mk.call_args_list[1].kwargs["params"]["bk_key"], "活着 余华")

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_rejects_mismatched_provider_id(self, mk):
        """应用旧搜索结果时不能接受已漂移到其他词条的响应。"""
        response = mock.Mock(status_code=200)
        response.json.return_value = BAIKE_API_DATA
        mk.return_value = response

        result = BaiduBaikeApi(copy_image=False).get_book("东周列国志", expected_id="999")

        self.assertIsNone(result)

    def test_card_info_strips_markup_without_losing_malformed_text(self):
        """百科卡片可能含标签或大量未闭合尖括号，解析必须保持线性且不丢正文。"""
        malformed = "<" * 4096 + "正文"
        info = BaiduBaikeApi._card_info(
            {
                "card": [
                    {"name": "作者", "value": "<b>冯梦龙</b> &amp; 蔡元放"},
                    {"name": "备注", "value": malformed},
                ]
            }
        )

        self.assertEqual(info["作者"], "冯梦龙 & 蔡元放")
        self.assertEqual(info["备注"], malformed)

    @mock.patch("webserver.plugins.meta.baike.api.requests.get")
    def test_cover_download_rejects_loopback_url_before_request(self, get):
        """远端元数据中的封面 URL 不得访问本机或内网地址。"""
        result = BaiduBaikeApi.get_cover("https://127.0.0.1/private-cover.jpg")

        self.assertIsNone(result)
        get.assert_not_called()


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
