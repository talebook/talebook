"""Regression for #1043: typed plugin candidates must reach the refer UI."""

import copy
import datetime
import json
import tempfile
from io import BytesIO
from pathlib import Path
from types import MappingProxyType
from unittest import mock
from urllib.parse import urlencode

from calibre.ebooks.metadata.book.base import Metadata

from tests.test_main import BID_EPUB, TestWithUserLogin, enabled_builtin_plugin, temporary_book_scope
from tests.test_main import setUpModule as init
from webserver.handlers.book import BookRefer
from webserver.plugins.meta.baike.api import BaiduBaikeProvider
from webserver.plugins.meta.base import to_book_metadata
from webserver.plugins.runtime.domains import BookMetadata, MetadataQuery


def setUpModule():
    init()


def candidate():
    mi = Metadata("冰火魔厨", ["唐家三少"])
    mi.author = "唐家三少"
    mi.author_sort = "唐家三少"
    mi.source = "百度百科"
    mi.provider_key = "talebook.meta.baike"
    mi.provider_value = "https://baike.baidu.com/item/冰火魔厨/123"
    mi.website = mi.provider_value
    mi.cover_url = "https://example.com/cover.jpg"
    mi.cover_data = ("jpeg", b"candidate-cover")
    mi.comments = "冰与火的魔法故事"
    mi.pubdate = datetime.datetime(2004, 1, 1, tzinfo=datetime.timezone.utc)
    mi.tags = ["小说"]
    return mi


class TestReferCandidates(TestWithUserLogin):
    def test_formatter_accepts_typed_mapping_dict_and_legacy_metadata(self):
        mi = candidate()
        typed = to_book_metadata(mi)
        self.assertIsInstance(typed, BookMetadata)
        self.assertNotIsInstance(typed, dict)
        handler = BookRefer.__new__(BookRefer)
        expected = handler._fmt_refer_book(mi)
        for record in (typed, dict(typed), MappingProxyType(dict(typed))):
            with self.subTest(record_type=type(record).__name__):
                formatted = handler._fmt_refer_book(record)
                self.assertEqual(formatted, expected)
                self.assertEqual(formatted["pubyear"], "2004")
                self.assertNotIn("_calibre_mi", formatted)
                json.dumps(formatted)

    def test_invalid_candidates_still_filtered(self):
        handler = BookRefer.__new__(BookRefer)
        for record in (None, object(), {}, BookMetadata.from_dict({"title": ""})):
            with self.subTest(record=record):
                self.assertIsNone(handler._fmt_refer_book(record))

    def search_tasks(self):
        provider = BaiduBaikeProvider()

        # Keep the real provider conversion; isolate only the external lookup.
        def search():
            with mock.patch.object(provider, "_search", return_value=[candidate()]):
                return provider.search_books(MetadataQuery(title="冰火魔厨", authors=("佚名",)), {})

        return {"百度百科": search}

    def fetch_candidates(self, stream):
        with mock.patch.object(BookRefer, "_build_search_tasks", return_value=self.search_tasks()):
            response = self.fetch(f"/api/book/{BID_EPUB}/refer" + ("?stream=1" if stream else ""))
        self.assertEqual(response.code, 200)
        if stream:
            self.assertIn("application/x-ndjson", response.headers["Content-Type"])
            frames = [json.loads(line) for line in response.body.splitlines()]
            self.assertEqual(frames[0], {"err": "ok"})
            self.assertEqual(frames[-1], {"event": "summary", "failures": [], "total": 1, "completed": 1})
            books = [frame for frame in frames if "title" in frame]
        else:
            books = json.loads(response.body)["books"]
        self.assertEqual(len(books), 1)
        self.assertEqual(books[0]["title"], "冰火魔厨")
        self.assertEqual(books[0]["author"], "唐家三少")
        self.assertEqual(books[0]["source"], "百度百科")
        self.assertEqual(books[0]["comments"], "冰与火的魔法故事")
        self.assertNotIn("_calibre_mi", books[0])
        return books[0]

    def test_non_stream_returns_plugin_candidate(self):
        self.fetch_candidates(False)

    def test_stream_returns_plugin_candidate(self):
        self.fetch_candidates(True)

    def test_stream_candidate_can_be_applied_in_all_three_modes(self):
        book = self.fetch_candidates(True)
        db = self._app.settings["legacy"]
        original = db.get_metadata(BID_EPUB, index_is_id=True)
        for options in ({}, {"only_meta": "yes"}, {"only_cover": "yes"}):
            with self.subTest(options=options):
                mi = candidate()
                with mock.patch.object(BookRefer, "_plugin_metadata_detail", return_value=mi) as detail:
                    with mock.patch("webserver.handlers.book.set_metadata_preserving_external_paths") as save:
                        result = self.json(
                            f"/api/book/{BID_EPUB}/refer",
                            method="POST",
                            body=urlencode(
                                {"provider_key": book["provider_key"], "provider_value": book["provider_value"], **options}
                            ),
                        )
                self.assertEqual(result["err"], "ok")
                detail.assert_called_once_with(book["provider_key"], book["provider_value"])
                save.assert_called_once()
                saved = save.call_args.args[3]
                self.assertEqual(saved.title, original.title if "only_cover" in options else "冰火魔厨")
                self.assertEqual(saved.authors, original.authors if "only_cover" in options else ["唐家三少"])
                self.assertEqual(saved.cover_data, original.cover_data if "only_meta" in options else mi.cover_data)


class TestBaikeReferWrite(TestWithUserLogin):
    """Real provider/HTTP handlers/Calibre writes; only upstream transport is mocked."""

    def setUp(self):
        super().setUp()
        from calibre.db.legacy import LibraryDatabase
        from PIL import Image

        from tests.test_baike import BAIKE_API_DATA
        from webserver.services.plugin_runtime import PluginRuntime

        self.library = tempfile.TemporaryDirectory()
        self.addCleanup(self.library.cleanup)
        self.db = LibraryDatabase(self.library.name)
        self.addCleanup(lambda: self.db.close())
        self.original = Metadata("冰火魔厨（TXT）", ["佚名"])
        self.original.comments = "原始简介"
        self.original.tags = ["本地"]
        source = Path(self.library.name) / "input.txt"
        source.write_text("冰火魔厨隔离测试正文", encoding="utf-8")
        self.bid = self.db.import_book(self.original, [str(source)])
        self.cover_bytes = []
        for color in ("red", "blue"):
            buf = BytesIO()
            Image.new("RGB", (60, 90), color).save(buf, format="JPEG")
            self.cover_bytes.append(buf.getvalue())
        self.db.set_cover(self.bid, self.cover_bytes[0])
        self.original_cover = self.db.cover(self.bid, index_is_id=True)
        self.enterContext(mock.patch.dict(self._app.settings, {"legacy": self.db}))
        self.enterContext(temporary_book_scope(self.bid, "public", collector_id=1))
        self.enterContext(enabled_builtin_plugin(BaiduBaikeProvider.manifest["id"]))
        connections_for = PluginRuntime.connections_for

        def baike_connections(runtime, capability, user_id=None):
            return [
                c
                for c in connections_for(runtime, capability, user_id)
                if runtime.plugin_key_of(c) == BaiduBaikeProvider.manifest["id"]
            ]

        self.enterContext(mock.patch.object(PluginRuntime, "connections_for", baike_connections))
        self.entry = copy.deepcopy(BAIKE_API_DATA)
        self.entry.update(title="冰火魔厨", key="冰火魔厨", abstract="更新后的简介", tags=["小说"])
        self.entry["card"] = [
            {"name": "作品名称", "value": ["冰火魔厨"]},
            {"name": "作者", "value": ["唐家三少"]},
            {"name": "出版社", "value": ["测试出版社"]},
        ]

        def lookup(url, **kwargs):
            from webserver.plugins.meta.baike.api import BAIKE_ENDPOINT

            self.assertEqual(url, BAIKE_ENDPOINT)
            query = kwargs["params"]["bk_key"]
            data = self.entry if query in ("冰火魔厨", "冰火魔厨 唐家三少") else {}
            response = mock.Mock(status_code=200)
            response.json.return_value = copy.deepcopy(data)
            return response

        self.lookup = self.enterContext(mock.patch("webserver.plugins.meta.baike.api.requests.get", side_effect=lookup))
        self.download = self.enterContext(mock.patch("webserver.plugins.meta.baike.api.SafeHttpClient.get"))
        self.download.return_value.content = self.cover_bytes[1]

    def selected_candidate(self):
        response = self.fetch(f"/api/book/{self.bid}/refer?stream=1")
        self.assertEqual(response.code, 200)
        frames = [json.loads(line) for line in response.body.splitlines()]
        books = [frame for frame in frames if "title" in frame]
        self.assertEqual(len(books), 1)
        self.assertEqual(books[0]["source"], "百度百科")
        self.download.assert_not_called()  # Search does not download images.
        return books[0]

    def apply_candidate(self, book, options=None):
        return self.json(
            f"/api/book/{self.bid}/refer",
            method="POST",
            body=urlencode(
                {"provider_key": book["provider_key"], "provider_value": book["provider_value"], **(options or {})}
            ),
        )

    def assert_persisted(self, options=None):
        from calibre.db.legacy import LibraryDatabase
        from PIL import Image

        options = options or {}
        book = self.selected_candidate()
        result = self.apply_candidate(book, options)
        self.assertEqual(result["err"], "ok", result)
        self.download.assert_called_once()
        self.db.close()
        self.db = LibraryDatabase(self.library.name)
        saved = self.db.get_metadata(self.bid, index_is_id=True)
        only_cover = "only_cover" in options
        self.assertEqual(saved.title, self.original.title if only_cover else "冰火魔厨")
        self.assertEqual(saved.authors, self.original.authors if only_cover else ["唐家三少"])
        self.assertEqual(saved.comments, self.original.comments if only_cover else "更新后的简介")
        cover = self.db.cover(self.bid, index_is_id=True)
        if "only_meta" in options:
            self.assertEqual(cover, self.original_cover)
        else:
            self.assertNotEqual(cover, self.original_cover)
            pixel = Image.open(BytesIO(cover)).getpixel((30, 45))
            self.assertGreater(pixel[2], 200)
        self.assertEqual(self.db.format(self.bid, "TXT", index_is_id=True).decode(), "冰火魔厨隔离测试正文")
        self.assertTrue(all(call.kwargs["params"]["bk_key"] != "2653" for call in self.lookup.call_args_list))

    def test_info_and_cover_are_persisted(self):
        self.assert_persisted()

    def test_only_info_preserves_stored_cover(self):
        self.assert_persisted({"only_meta": "yes"})

    def test_only_cover_preserves_stored_metadata(self):
        self.assert_persisted({"only_cover": "yes"})

    def assert_original_unchanged(self):
        self.db.new_api.reload_from_db()
        saved = self.db.get_metadata(self.bid, index_is_id=True)
        self.assertEqual(saved.title, self.original.title)
        self.assertEqual(saved.authors, self.original.authors)
        self.assertEqual(saved.comments, self.original.comments)
        self.assertEqual(self.db.cover(self.bid, index_is_id=True), self.original_cover)

    def test_old_plugin_reference_requires_new_search_without_writing(self):
        for value in ("2653", "https://baike.baidu.com/item/2653", "baike:v2:{}"):
            with self.subTest(value=value):
                result = self.apply_candidate({"provider_key": "talebook.meta.baike", "provider_value": value})
                self.assertEqual(result["err"], "metadata.not_found")
                self.assertIn("重新搜索", result["msg"])
                self.assert_original_unchanged()
        self.lookup.assert_not_called()
        self.download.assert_not_called()

    def test_legacy_provider_key_still_accepts_numeric_lemma_id(self):
        result = self.apply_candidate({"provider_key": "BaiduBaike", "provider_value": "2653"})
        self.assertEqual(result["err"], "ok")
        self.db.new_api.reload_from_db()
        self.assertEqual(self.db.get_metadata(self.bid, index_is_id=True).authors, ["唐家三少"])
        self.assertEqual(self.lookup.call_args.kwargs["params"]["bk_key"], "冰火魔厨")

    def test_changed_lemma_does_not_write(self):
        book = self.selected_candidate()
        self.entry.update(id=999, newLemmaId=999)
        result = self.apply_candidate(book)
        self.assertEqual(result["err"], "metadata.not_found")
        self.assert_original_unchanged()
        self.download.assert_not_called()

    def test_missing_cover_does_not_write_in_cover_only_mode(self):
        book = self.selected_candidate()
        self.entry["image"] = ""
        result = self.apply_candidate(book, {"only_cover": "yes"})
        self.assertEqual(result["err"], "cover.empty")
        self.assert_original_unchanged()
        self.download.assert_not_called()

    def test_missing_connection_remains_distinct_from_empty_detail(self):
        from webserver.services.plugin_runtime import PluginRuntime

        with mock.patch.object(PluginRuntime, "connections_for", return_value=[]):
            result = self.apply_candidate({"provider_key": "talebook.meta.baike", "provider_value": "2653"})
        self.assertEqual(result["err"], "plugin.connection_missing")
        self.assert_original_unchanged()
