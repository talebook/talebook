#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
#
# 验证 NeoDB / 豆瓣V2 信息源 get_metadata_by_provider 的"应用选中条目"逻辑：
# 选择 refer 对话框中的结果后，应按 provider_value 重新匹配并构建完整元数据，
# 而不是直接返回本地原始 mi（否则 smart_update 等于用书自身覆盖自身）。

import json
from unittest import TestCase, mock

from webserver.plugins.meta.douban_v2.plugin import DoubanV2MetaPlugin, DoubanV2Provider
from webserver.plugins.meta.neodb.plugin import NeodbMetaPlugin


class FakeMi:
    def __init__(self, title=None, isbn=None, cover_url=None, provider_value=None):
        self.title = title
        self.isbn = isbn
        self.cover_url = cover_url
        self.provider_value = provider_value


class TestNeodbProvider(TestCase):
    @mock.patch("webserver.plugins.meta.neodb.plugin.api.build_metadata")
    @mock.patch("webserver.plugins.meta.neodb.plugin.api.search")
    def test_matches_provider_value(self, m_search, m_build):
        m_search.return_value = [
            {"url": "https://neodb.social/book/AAA", "title": "A"},
            {"url": "https://neodb.social/book/BBB", "title": "B"},
        ]
        m_build.return_value = "BUILT"
        mi = FakeMi(title="书名")
        result = NeodbMetaPlugin().get_metadata_by_provider("https://neodb.social/book/BBB", mi)
        self.assertEqual(result, "BUILT")
        m_search.assert_called_once_with("书名", max_count=10)
        # 用匹配到的第二个条目（而非首个）构建完整元数据
        self.assertEqual(m_build.call_args.args[0]["url"], "https://neodb.social/book/BBB")

    @mock.patch("webserver.plugins.meta.neodb.plugin.api.get_cover")
    @mock.patch("webserver.plugins.meta.neodb.plugin.api.build_metadata")
    @mock.patch("webserver.plugins.meta.neodb.plugin.api.search")
    def test_no_match_falls_back_to_cover(self, m_search, m_build, m_cover):
        m_search.return_value = [{"url": "https://neodb.social/book/AAA"}]
        m_cover.return_value = ("jpg", b"x")
        mi = FakeMi(title="书名", cover_url="http://c/cover.jpg")
        result = NeodbMetaPlugin().get_metadata_by_provider("https://neodb.social/book/ZZZ", mi)
        self.assertIs(result, mi)
        m_build.assert_not_called()
        self.assertEqual(mi.cover_data, ("jpg", b"x"))

    @mock.patch("webserver.plugins.meta.neodb.plugin.api.search")
    def test_prefers_isbn_query(self, m_search):
        m_search.return_value = []
        mi = FakeMi(title="书名", isbn="9787000000000")
        NeodbMetaPlugin().get_metadata_by_provider("x", mi)
        m_search.assert_called_once_with("9787000000000", max_count=10)


class TestDoubanV2Provider(TestCase):
    @mock.patch("webserver.plugins.meta.douban_v2.plugin.api.build_metadata")
    @mock.patch("webserver.plugins.meta.douban_v2.plugin.api.search")
    def test_matches_by_id_via_isbn_search(self, m_search, m_build):
        m_search.return_value = ([{"id": 111}, {"id": 222}], "http://search")
        m_build.return_value = "BUILT"
        mi = FakeMi(title="标题", isbn="9787000000000")
        result = DoubanV2MetaPlugin().get_metadata_by_provider("222", mi)
        self.assertEqual(result, "BUILT")
        # 初次可能用 ISBN 搜到的条目，应按 ISBN 重搜而非仅按标题
        m_search.assert_called_once_with("9787000000000", max_count=10)
        self.assertEqual(m_build.call_args.args[0]["id"], 222)

    @mock.patch("webserver.plugins.meta.douban_v2.plugin.api.get_cover")
    @mock.patch("webserver.plugins.meta.douban_v2.plugin.api.build_metadata")
    @mock.patch("webserver.plugins.meta.douban_v2.plugin.api.search")
    def test_no_match_falls_back_to_cover(self, m_search, m_build, m_cover):
        m_search.return_value = ([{"id": 111}], "http://search")
        m_cover.return_value = ("jpg", b"x")
        mi = FakeMi(title="标题", cover_url="http://c.jpg")
        result = DoubanV2MetaPlugin().get_metadata_by_provider("999", mi)
        self.assertIs(result, mi)
        m_build.assert_not_called()
        self.assertEqual(mi.cover_data, ("jpg", b"x"))


class TestDoubanV2ProviderReferences(TestCase):
    """验证通用插件详情路径（_search/_fetch）：_fetch 只收到 external_id，没有原书 mi。

    talebook#1060：详情请求在这条路径下一直把 mi 当 None 传给
    get_metadata_by_provider，重搜 query 变空，直接返回 None，书籍页报
    "未获取到所选记录，请重新搜索"。provider_value 现在编码 isbn/title，
    让 _fetch 能在没有 mi 的情况下还原查询词。
    """

    def setUp(self):
        self.provider = DoubanV2Provider()
        self.search = self.enterContext(mock.patch("webserver.plugins.meta.douban_v2.plugin.api.search"))
        self.build = self.enterContext(mock.patch("webserver.plugins.meta.douban_v2.plugin.api.build_metadata"))

    def test_search_reference_round_trips_through_fetch(self):
        self.search.return_value = ([{"id": 222}], "http://search")
        self.build.side_effect = [
            FakeMi(title="标题", isbn="9787000000000", provider_value="222"),
            FakeMi(title="标题", isbn="9787000000000", provider_value="222"),
        ]

        records = self.provider.search_books({"title": "标题", "isbn": "9787000000000"}, {})
        self.assertEqual(len(records), 1)
        value = records[0]["provider_value"]
        self.assertTrue(value.startswith("douban_v2:v1:"))
        self.assertEqual(
            json.loads(value[len("douban_v2:v1:") :]),
            {"id": "222", "isbn": "9787000000000", "title": "标题"},
        )

        detail = self.provider.get_metadata(value, {})
        self.assertIsNotNone(detail)
        self.assertEqual(detail["title"], "标题")
        # 用还原出的 isbn 重搜，而不是只按标题（会漏掉 ISBN 搜到的条目）
        self.assertEqual(self.search.call_args.args[0], "9787000000000")

    def test_legacy_and_malformed_references_require_a_new_search_without_http(self):
        for value in (
            "222",
            "douban_v2:v2:{}",
            "douban_v2:v1:[]",
            "douban_v2:v1:{",
            '{"id":"222","isbn":"","title":"标题"}',
            'douban_v2:v1:{"id":222,"isbn":"","title":"标题"}',
            'douban_v2:v1:{"id":"222","isbn":"","title":""}',
            'douban_v2:v1:{"id":"../222","isbn":"","title":"标题"}',
            "x" * 4097,
        ):
            with self.subTest(value=value[:80]):
                self.assertIsNone(self.provider.get_metadata(value, {}))
        self.search.assert_not_called()
        self.build.assert_not_called()
