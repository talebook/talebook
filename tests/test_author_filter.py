import json
import tempfile
from unittest import mock

from tests import test_main
from tests.test_main import Q, TestWithUserLogin
from tests.test_main import setUpModule as init


AUTHOR = "【法】安东尼·德·圣埃克苏佩里 著,丁克霞 译"


def setUpModule():
    init()


class TestAuthorFilter(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        from calibre.db.legacy import LibraryDatabase
        from calibre.ebooks.metadata.book.base import Metadata

        library = tempfile.TemporaryDirectory()
        self.addCleanup(library.cleanup)
        self.db = LibraryDatabase(library.name)
        self.addCleanup(self.db.close)
        legacy = mock.patch.dict(test_main._app.settings, {"legacy": self.db})
        legacy.start()
        self.addCleanup(legacy.stop)
        self.cache = self.db.new_api
        self.book_id = self.cache.create_book_entry(Metadata("小王子（作者筛选测试）", [AUTHOR]))
        self.db.data.refresh()

    def author_option(self):
        result = self.json("/api/author?page=1&page_size=100")
        self.assertEqual(result["err"], "ok")
        author_id = self.cache.get_item_id("authors", AUTHOR)
        return next(item for item in result["items"] if item["id"] == author_id)

    def test_author_option_uses_public_name_and_supports_search(self):
        author_id = self.cache.get_item_id("authors", AUTHOR)
        stored = self.cache.backend.conn.get("SELECT name FROM authors WHERE id=?", (author_id,))[0][0]
        self.assertEqual(stored, AUTHOR.replace(",", "|"))
        option = self.author_option()
        self.assertEqual(option["name"], AUTHOR)
        self.assertEqual(option["count"], 1)
        result = self.json("/api/author?page=1&page_size=100&q=" + Q(AUTHOR))
        self.assertEqual(result["items"], [option])

    def test_library_filter_from_author_option_matches_detail_link(self):
        option = self.author_option()
        library = self.json("/api/library?author=" + Q(option["name"]))
        detail = self.json("/api/author/" + Q(AUTHOR))
        self.assertEqual(library["err"], "ok")
        self.assertEqual(detail["err"], "ok")
        self.assertEqual(detail["total"], 1)
        self.assertEqual(library["total"], detail["total"])
        self.assertEqual([book["id"] for book in library["books"]], [self.book_id])

    def test_stream_library_filter_from_author_option(self):
        option = self.author_option()
        response = self.fetch("/api/library?stream=1&author=" + Q(option["name"]))
        self.assertEqual(response.code, 200)
        lines = [json.loads(line) for line in response.body.splitlines()]
        self.assertEqual(lines[0]["err"], "ok")
        self.assertEqual(lines[0]["total"], 1)
        self.assertEqual([book["id"] for book in lines[1:]], [self.book_id])

    def test_pipes_in_other_categories_are_preserved(self):
        for field, category in (("tags", "tag"), ("publisher", "publisher"), ("series", "series")):
            with self.subTest(field=field):
                original = self.cache.field_for(field, self.book_id)
                try:
                    value = ["分类|原值"] if field == "tags" else "分类|原值"
                    self.cache.set_field(field, {self.book_id: value})
                    result = self.json(f"/api/{category}?q=" + Q("分类|原值"))
                    self.assertEqual(result["err"], "ok")
                    self.assertEqual([item["name"] for item in result["items"]], ["分类|原值"])
                finally:
                    self.cache.set_field(field, {self.book_id: original})
