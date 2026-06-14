#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
笔趣阁元数据获取插件测试用例
"""

import logging
import os
import sys
import unittest
from unittest import mock

testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

import webserver.main

from webserver.plugins.meta.biquge.api import BIQUGE_ISBN, KEY, BiqugeApi, BiqugePage, BiqugeSearch

webserver.main.init_calibre()

MOCK_BOOK_HTML = """
<html>
<head><title>雪鹰领主_笔趣阁</title></head>
<body>
<div class="con_top">
<a href="/">首页</a> &gt; <a href="/">小说</a> &gt; <a href="/xuanhuan/">玄幻小说</a> &gt; 雪鹰领主
</div>
<div id="info">
<h1>雪鹰领主</h1>
<p>作&nbsp;&nbsp;&nbsp;&nbsp;者：我吃西红柿</p>
<p>最后更新：2024-01-01</p>
<p>最新章节：《第1447章 大结局》</p>
</div>
<div id="intro">
<p>东伯雪鹰，一个天资平平的少年，因家族变故，踏上了艰难的修炼之路。</p>
</div>
<div id="fmimg">
<img src="http://www.xbiqugu.la/files/article/image/3/3459/3459s.jpg" />
</div>
<div id="list">
<dl>
<dd><a href="/3/3459/1.html">第一章 少年</a></dd>
<dd><a href="/3/3459/2.html">第二章 修炼</a></dd>
</dl>
</div>
</body>
</html>
"""

MOCK_SEARCH_HTML = """
<html>
<body>
<div class="result-list">
<div class="result-item">
<div class="s2"><a href="/3/3459/">雪鹰领主</a></div>
<div class="s3">我吃西红柿</div>
</div>
</div>
</body>
</html>
"""


class TestBiqugeConstants(unittest.TestCase):
    def test_constants(self):
        self.assertEqual(KEY, "Biquge")
        self.assertEqual(BIQUGE_ISBN, "0000000000004")


class TestBiqugePage(unittest.TestCase):
    def _make_page(self, html=MOCK_BOOK_HTML, url="http://www.xbiqugu.la/3/3459/"):
        return BiqugePage(url, html=html)

    def test_get_info(self):
        page = self._make_page()
        info = page.get_info()
        self.assertEqual(info["title"], "雪鹰领主")
        self.assertEqual(info["author"], "我吃西红柿")
        self.assertEqual(info["category"], "玄幻小说")

    def test_get_summary(self):
        page = self._make_page()
        summary = page.get_summary()
        self.assertIn("东伯雪鹰", summary)

    def test_get_image(self):
        page = self._make_page()
        img = page.get_image()
        self.assertIsNotNone(img)
        self.assertIn("xbiqugu.la", img)

    def test_get_image_protocol_relative(self):
        html = MOCK_BOOK_HTML.replace(
            'src="http://www.xbiqugu.la/files/article/image/3/3459/3459s.jpg"',
            'src="//www.xbiqugu.la/files/article/image/3/3459/3459s.jpg"',
        )
        page = self._make_page(html=html)
        img = page.get_image()
        self.assertTrue(img.startswith("http://"))

    def test_get_image_relative_path(self):
        html = MOCK_BOOK_HTML.replace(
            'src="http://www.xbiqugu.la/files/article/image/3/3459/3459s.jpg"',
            'src="/files/article/image/3/3459/3459s.jpg"',
        )
        page = self._make_page(html=html)
        img = page.get_image()
        self.assertTrue(img.startswith("http://www.xbiqugu.la"))

    def test_get_image_none_when_missing(self):
        html = "<html><body></body></html>"
        page = self._make_page(html=html)
        self.assertIsNone(page.get_image())

    def test_get_id(self):
        page = self._make_page()
        self.assertEqual(page.get_id(), "3/3459")

    def test_get_tags(self):
        page = self._make_page()
        tags = page.get_tags()
        self.assertIn("玄幻小说", tags)

    def test_get_tags_empty_when_no_category(self):
        html = "<html><body><div id='info'><h1>书名</h1></div></body></html>"
        page = self._make_page(html=html)
        self.assertEqual(page.get_tags(), [])


class TestBiqugeSearch(unittest.TestCase):
    @mock.patch("requests.post")
    def test_search_multiple_results(self, mock_post):
        mock_post.return_value = mock.Mock(
            status_code=200,
            text=MOCK_SEARCH_HTML,
            url="http://www.xbiqugu.la/modules/article/search.php",
            encoding=None,
        )
        with mock.patch("webserver.plugins.meta.biquge.api.BiqugePage") as MockPage:
            MockPage.return_value = mock.Mock()
            searcher = BiqugeSearch()
            result = searcher.search("雪鹰领主")
            self.assertIsNotNone(result)
            MockPage.assert_called_once()

    @mock.patch("requests.post")
    def test_search_direct_book_page(self, mock_post):
        mock_post.return_value = mock.Mock(
            status_code=200,
            text=MOCK_BOOK_HTML,
            url="http://www.xbiqugu.la/3/3459/",
            encoding=None,
        )
        searcher = BiqugeSearch()
        result = searcher.search("雪鹰领主")
        self.assertIsNotNone(result)
        self.assertIsInstance(result, BiqugePage)

    @mock.patch("requests.post")
    def test_search_no_results(self, mock_post):
        mock_post.return_value = mock.Mock(
            status_code=200,
            text="<html><body><p>没有找到相关小说</p></body></html>",
            url="http://www.xbiqugu.la/modules/article/search.php",
            encoding=None,
        )
        searcher = BiqugeSearch()
        result = searcher.search("不存在的书名xyz")
        self.assertIsNone(result)

    @mock.patch("requests.post", side_effect=Exception("网络错误"))
    def test_search_exception(self, mock_post):
        searcher = BiqugeSearch()
        result = searcher.search("雪鹰领主")
        self.assertIsNone(result)


class TestBiqugeApi(unittest.TestCase):
    def test_api_init_defaults(self):
        api = BiqugeApi()
        self.assertTrue(api.copy_image)

    def test_api_init_no_copy(self):
        api = BiqugeApi(copy_image=False)
        self.assertFalse(api.copy_image)

    @mock.patch("requests.get")
    def test_get_cover_success(self, mock_get):
        mock_get.return_value = mock.Mock(status_code=200, content=b"image-bytes")
        api = BiqugeApi()
        result = api.get_cover("http://example.com/cover.jpg")
        self.assertEqual(result, ("jpg", b"image-bytes"))

    @mock.patch("requests.get")
    def test_get_cover_png_format(self, mock_get):
        mock_get.return_value = mock.Mock(status_code=200, content=b"image-bytes")
        api = BiqugeApi()
        result = api.get_cover("http://example.com/cover.png")
        self.assertEqual(result[0], "png")

    @mock.patch("requests.get")
    def test_get_cover_unknown_format_defaults_jpg(self, mock_get):
        mock_get.return_value = mock.Mock(status_code=200, content=b"image-bytes")
        api = BiqugeApi()
        result = api.get_cover("http://example.com/cover")
        self.assertEqual(result[0], "jpg")

    @mock.patch("requests.get")
    def test_get_cover_http_error(self, mock_get):
        mock_get.return_value = mock.Mock(status_code=404, content=b"")
        api = BiqugeApi()
        result = api.get_cover("http://example.com/cover.jpg")
        self.assertIsNone(result)

    def test_get_cover_no_url(self):
        api = BiqugeApi()
        self.assertIsNone(api.get_cover(None))

    def test_get_cover_copy_image_false(self):
        api = BiqugeApi(copy_image=False)
        self.assertIsNone(api.get_cover("http://example.com/cover.jpg"))

    def test_metadata_fields(self):
        api = BiqugeApi(copy_image=False)
        page = BiqugePage("http://www.xbiqugu.la/3/3459/", html=MOCK_BOOK_HTML)
        mi = api._metadata(page)

        self.assertEqual(mi.title, "雪鹰领主")
        self.assertEqual(mi.authors, ["我吃西红柿"])
        self.assertEqual(mi.author_sort, "我吃西红柿")
        self.assertEqual(mi.isbn, BIQUGE_ISBN)
        self.assertIn("玄幻小说", mi.tags)
        self.assertIsNone(mi.publisher)
        self.assertIn("东伯雪鹰", mi.comments)
        self.assertEqual(mi.source, "笔趣阁")
        self.assertEqual(mi.provider_key, KEY)
        self.assertEqual(mi.provider_value, "3/3459")
        self.assertIsNone(mi.cover_data)  # copy_image=False
        self.assertIsNone(mi.rating)

    @mock.patch.object(BiqugeSearch, "search")
    def test_get_book_success(self, mock_search):
        mock_search.return_value = BiqugePage("http://www.xbiqugu.la/3/3459/", html=MOCK_BOOK_HTML)
        api = BiqugeApi(copy_image=False)
        mi = api.get_book("雪鹰领主")
        self.assertIsNotNone(mi)
        self.assertEqual(mi.title, "雪鹰领主")

    @mock.patch.object(BiqugeSearch, "search", return_value=None)
    def test_get_book_not_found(self, mock_search):
        api = BiqugeApi(copy_image=False)
        result = api.get_book("不存在的书")
        self.assertIsNone(result)

    @mock.patch.object(BiqugeSearch, "search", side_effect=Exception("连接失败"))
    def test_get_book_exception(self, mock_search):
        api = BiqugeApi(copy_image=False)
        result = api.get_book("雪鹰领主")
        self.assertIsNone(result)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
