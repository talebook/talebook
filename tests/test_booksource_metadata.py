#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import time
from unittest import TestCase, mock

from webserver.services.booksource.engine import BookDetail, BookSummary
from webserver.services.booksource.metadata import (
    BookSourceMetadataService,
    MetadataSource,
    collect_metadata_sources,
    decode_provider_value,
    encode_provider_value,
    load_builtin_sources,
)


class TestBookSourceProviderToken(TestCase):
    def test_round_trip(self):
        token = encode_provider_value("secret", "builtin:qimao-20250904", "https://example.com/book/1")

        payload = decode_provider_value("secret", token)

        self.assertEqual(payload["source"], "builtin:qimao-20250904")
        self.assertEqual(payload["book_url"], "https://example.com/book/1")

    def test_tampering_is_rejected(self):
        token = encode_provider_value("secret", "builtin:qimao-20250904", "https://example.com/book/1")
        changed = token[:-1] + ("a" if token[-1] != "a" else "b")

        self.assertIsNone(decode_provider_value("secret", changed))

    def test_expired_token_is_rejected(self):
        token = encode_provider_value("secret", "builtin:qimao-20250904", "https://example.com/book/1")

        with mock.patch("webserver.services.booksource.metadata.time.time", return_value=time.time() + 7200):
            self.assertIsNone(decode_provider_value("secret", token, ttl_seconds=3600))


class TestBookSourceMetadataSearch(TestCase):
    def test_collection_does_not_append_builtin_qimao_when_no_source_is_enabled(self):
        query = mock.Mock()
        query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        session = mock.Mock()
        session.query.return_value = query

        self.assertEqual(collect_metadata_sources(session), [])

    def test_builtin_snapshot_is_metadata_only(self):
        source = load_builtin_sources()[0]

        self.assertTrue(source.raw["searchUrl"].startswith("@js:"))
        self.assertIn("ruleBookInfo", source.raw)
        self.assertNotIn("ruleToc", source.raw)
        self.assertNotIn("ruleContent", source.raw)

    @mock.patch("webserver.services.booksource.metadata.BookSourceEngine")
    def test_source_failure_is_isolated(self, engine_cls):
        good = MetadataSource("builtin:good", "可用源", {"bookSourceUrl": "https://good.example"})
        bad = MetadataSource("builtin:bad", "故障源", {"bookSourceUrl": "https://bad.example"})

        def make_engine(raw, config=None):
            engine = mock.Mock()
            if raw["bookSourceUrl"] == "https://bad.example":
                engine.search.side_effect = RuntimeError("boom")
            else:
                engine.search.return_value = [
                    BookSummary(name="三体", author="刘慈欣", book_url="https://good.example/book/1")
                ]
            return engine

        engine_cls.side_effect = make_engine
        service = BookSourceMetadataService([good, bad], "secret")
        service._metadata_from_summary = mock.Mock(return_value="metadata")

        result = service.search("三体", "刘慈欣")

        self.assertEqual(result.books, ["metadata"])
        self.assertEqual(result.failures[0]["source"], "故障源")
        self.assertEqual(result.failures[0]["code"], "fetch_failed")

    @mock.patch("webserver.services.booksource.metadata.BookSourceEngine")
    def test_limits_results_from_each_metadata_source(self, engine_cls):
        source = MetadataSource("builtin:many", "多结果源", {"bookSourceUrl": "https://many.example"})
        engine_cls.return_value.search.return_value = [
            BookSummary(name="书%d" % index, author="作者", book_url="https://many.example/book/%d" % index)
            for index in range(4)
        ]
        service = BookSourceMetadataService([source], "secret", config={"BOOKSOURCE_SEARCH_RESULT_LIMIT": 2})
        service._metadata_from_summary = mock.Mock(side_effect=lambda summary, _source: summary.name)

        result = service.search("书")

        self.assertEqual(result.books, ["书0", "书1"])
        self.assertEqual(service._metadata_from_summary.call_count, 2)

    @mock.patch("webserver.services.booksource.metadata.BookSourceEngine")
    def test_applies_signed_builtin_result(self, engine_cls):
        engine_cls.return_value.book_info.return_value = BookDetail(
            name="三体",
            author="刘慈欣",
            kind="科幻\n中国，硬科幻",
            intro="地球文明向宇宙发出啼鸣。",
            cover_url="https://example.com/cover.jpg",
        )
        token = encode_provider_value(
            "secret",
            "builtin:qimao-20250904",
            "https://api-bc.wtzw.com/api/v4/book/detail?id=1",
        )
        service = BookSourceMetadataService(load_builtin_sources(), "secret")

        metadata = service.apply(token, session=mock.Mock(), copy_image=False)

        self.assertEqual(metadata.title, "三体")
        self.assertEqual(metadata.authors, ["刘慈欣"])
        self.assertEqual(metadata.tags, ["科幻", "中国", "硬科幻"])
        self.assertEqual(metadata.provider_value, token)

    @mock.patch("webserver.services.booksource.metadata.BookSourceEngine")
    def test_rejects_unsigned_apply_target(self, engine_cls):
        service = BookSourceMetadataService(load_builtin_sources(), "secret")

        self.assertIsNone(service.apply("https://internal.example/admin", session=mock.Mock()))
        engine_cls.assert_not_called()
