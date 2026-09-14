"""Regression for #1043: typed plugin candidates must reach the refer UI."""

import datetime
import json
from types import MappingProxyType
from unittest import mock
from urllib.parse import urlencode

from calibre.ebooks.metadata.book.base import Metadata

from tests.test_main import BID_EPUB, TestWithUserLogin
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
