#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

"""
七猫小说元数据获取插件测试用例
"""

import logging
import os
import sys
import unittest
from unittest import mock

testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

import webserver.main
from webserver.plugins.meta.qimao.api import (
    KEY,
    QIMAO_ISBN,
    QimaoNovelApi,
    _make_headers,
    _sign_params,
    get_qimao_metadata,
)

webserver.main.init_calibre()

# 七猫小说测试数据
QIMAO_BOOK_ID = "12345678"

QIMAO_DETAIL_RESPONSE = {
    "code": 0,
    "data": {
        "book_id": QIMAO_BOOK_ID,
        "book_name": "斗破苍穹",
        "author_name": "天蚕土豆",
        "abstract": "这里是属于斗气的世界，没有花俏艳丽的魔法，有的，仅仅是繁衍到巅峰的斗气！",
        "thumb_url": "https://example.com/cover.jpg",
        "category_name": "玄幻,热血",
    },
}

QIMAO_SEARCH_RESPONSE = {
    "code": 0,
    "data": {
        "book_list": [
            {
                "book_id": QIMAO_BOOK_ID,
                "book_name": "斗破苍穹",
                "author_name": "天蚕土豆",
                "abstract": "这里是属于斗气的世界。",
                "thumb_url": "https://example.com/cover.jpg",
            },
            {
                "book_id": "99999999",
                "book_name": "斗破苍穹外传",
                "author_name": "其他作者",
                "abstract": "外传故事。",
                "thumb_url": "https://example.com/cover2.jpg",
            },
        ]
    },
}


class TestSignUtils(unittest.TestCase):
    """签名工具函数测试"""

    def test_sign_params(self):
        """测试参数签名生成"""
        params = {"id": "12345"}
        result = _sign_params(params)
        self.assertIn("sign", result)
        self.assertEqual(len(result["sign"]), 32)  # MD5 hexdigest 长度

    def test_sign_params_deterministic(self):
        """相同输入产生相同签名"""
        params1 = {"id": "12345", "page": "1"}
        params2 = {"id": "12345", "page": "1"}
        _sign_params(params1)
        _sign_params(params2)
        self.assertEqual(params1["sign"], params2["sign"])

    def test_make_headers(self):
        """测试请求头生成"""
        headers = _make_headers("12345678")
        self.assertIn("sign", headers)
        self.assertIn("app-version", headers)
        self.assertIn("platform", headers)
        self.assertEqual(headers["platform"], "android")
        self.assertEqual(len(headers["sign"]), 32)

    def test_make_headers_deterministic(self):
        """相同 book_id 产生相同请求头（随机种子固定）"""
        h1 = _make_headers("12345678")
        h2 = _make_headers("12345678")
        self.assertEqual(h1["sign"], h2["sign"])
        self.assertEqual(h1["app-version"], h2["app-version"])


class TestQimaoNovelApi(unittest.TestCase):
    """七猫小说 API 测试类"""

    def test_constants(self):
        """测试常量定义"""
        self.assertEqual(KEY, "QimaoNovel")
        self.assertEqual(QIMAO_ISBN, "0000000000004")

    def test_api_init(self):
        """测试 API 初始化"""
        api = QimaoNovelApi()
        self.assertTrue(api.copy_image)
        self.assertFalse(api.manual_select)

        api = QimaoNovelApi(copy_image=False, manual_select=True)
        self.assertFalse(api.copy_image)
        self.assertTrue(api.manual_select)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_search_books(self, mk):
        """测试搜索功能"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = QIMAO_SEARCH_RESPONSE
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        results = api.search_books("斗破苍穹")

        self.assertEqual(len(results), 2)
        self.assertEqual(results[0]["book_name"], "斗破苍穹")
        self.assertEqual(results[0]["book_id"], QIMAO_BOOK_ID)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_search_books_empty(self, mk):
        """测试搜索无结果"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"code": 0, "data": {"book_list": []}}
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        results = api.search_books("不存在的书名xyz")
        self.assertEqual(results, [])

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_search_books_exception(self, mk):
        """测试搜索网络异常"""
        mk.side_effect = Exception("网络错误")

        api = QimaoNovelApi(copy_image=False)
        results = api.search_books("斗破苍穹")
        self.assertEqual(results, [])

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_detail(self, mk):
        """测试获取书籍详情"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = QIMAO_DETAIL_RESPONSE
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        detail = api.get_book_detail(QIMAO_BOOK_ID)

        self.assertEqual(detail["book_name"], "斗破苍穹")
        self.assertEqual(detail["author_name"], "天蚕土豆")

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_detail_exception(self, mk):
        """测试获取详情网络异常"""
        mk.side_effect = Exception("网络错误")

        api = QimaoNovelApi(copy_image=False)
        detail = api.get_book_detail(QIMAO_BOOK_ID)
        self.assertEqual(detail, {})

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_by_id(self, mk):
        """测试根据 ID 获取书籍元数据"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = QIMAO_DETAIL_RESPONSE
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        mi = api.get_book_by_id(QIMAO_BOOK_ID)

        self.assertIsNotNone(mi)
        self.assertEqual(mi.title, "斗破苍穹")
        self.assertEqual(mi.authors, ["天蚕土豆"])
        self.assertEqual(mi.isbn, QIMAO_ISBN)
        self.assertEqual(mi.source, "七猫小说")
        self.assertEqual(mi.provider_key, KEY)
        self.assertEqual(mi.provider_value, QIMAO_BOOK_ID)
        self.assertIsNone(mi.publisher)
        self.assertIsNone(mi.rating)
        self.assertIn("玄幻", mi.tags)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_by_id_not_found(self, mk):
        """测试 ID 不存在时返回 None"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"code": 0, "data": {}}
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        mi = api.get_book_by_id("invalid_id")
        self.assertIsNone(mi)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_exact_match(self, mk):
        """测试书名精确匹配逻辑"""
        # 第一次调用：搜索；第二次调用：详情
        search_resp = mock.Mock()
        search_resp.status_code = 200
        search_resp.json.return_value = QIMAO_SEARCH_RESPONSE

        detail_resp = mock.Mock()
        detail_resp.status_code = 200
        detail_resp.json.return_value = QIMAO_DETAIL_RESPONSE

        mk.side_effect = [search_resp, detail_resp]

        api = QimaoNovelApi(copy_image=False)
        mi = api.get_book("斗破苍穹", "天蚕土豆")

        self.assertIsNotNone(mi)
        self.assertEqual(mi.title, "斗破苍穹")

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_book_no_results(self, mk):
        """测试搜索无结果时返回 None"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"code": 0, "data": {"book_list": []}}
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        mi = api.get_book("不存在的书名xyz")
        self.assertIsNone(mi)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_cover(self, mk):
        """测试封面下载"""
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.content = b"fake_image_data"
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=True)
        result = api.get_cover("https://example.com/cover.jpg")

        self.assertIsNotNone(result)
        self.assertEqual(result[0], "jpg")
        self.assertEqual(result[1], b"fake_image_data")

    def test_get_cover_disabled(self):
        """测试 copy_image=False 时不下载封面"""
        api = QimaoNovelApi(copy_image=False)
        result = api.get_cover("https://example.com/cover.jpg")
        self.assertIsNone(result)

    def test_get_cover_no_url(self):
        """测试 URL 为空时不下载封面"""
        api = QimaoNovelApi(copy_image=True)
        self.assertIsNone(api.get_cover(""))
        self.assertIsNone(api.get_cover(None))

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_get_cover_http_error(self, mk):
        """测试封面下载 HTTP 错误"""
        mock_response = mock.Mock()
        mock_response.status_code = 404
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=True)
        result = api.get_cover("https://example.com/cover.jpg")
        self.assertIsNone(result)

    @mock.patch("webserver.plugins.meta.qimao.api.requests.get")
    def test_metadata_tags_string(self, mk):
        """测试标签字段为字符串时的解析"""
        detail_with_string_tag = {
            "code": 0,
            "data": {
                "book_id": QIMAO_BOOK_ID,
                "book_name": "测试书",
                "author_name": "作者",
                "abstract": "简介",
                "thumb_url": "",
                "category_name": "玄幻,热血,修仙",
            },
        }
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = detail_with_string_tag
        mk.return_value = mock_response

        api = QimaoNovelApi(copy_image=False)
        mi = api.get_book_by_id(QIMAO_BOOK_ID)

        self.assertIsNotNone(mi)
        self.assertIn("玄幻", mi.tags)
        self.assertIn("热血", mi.tags)
        self.assertIn("修仙", mi.tags)

    @mock.patch("webserver.plugins.meta.qimao.api.QimaoNovelApi.get_book")
    def test_get_qimao_metadata(self, mk):
        """测试便捷函数 get_qimao_metadata"""
        mock_mi_result = mock.Mock()
        mock_mi_result.title = "斗破苍穹"
        mk.return_value = mock_mi_result

        input_mi = mock.Mock()
        input_mi.title = "斗破苍穹"
        input_mi.author_sort = "天蚕土豆"
        del input_mi.qimao_id

        result = get_qimao_metadata(input_mi)
        self.assertIsNotNone(result)
        mk.assert_called_once()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
