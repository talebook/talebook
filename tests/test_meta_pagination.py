from unittest import mock
from urllib.parse import urlencode

from tests import test_main
from webserver.handlers.base import BaseHandler


def setUpModule():
    test_main.setUpModule()


def categories(count):
    return [{"id": i, "name": f"分类{i:05d}", "count": 1} for i in range(count)]


class TestMetaPagination(test_main.TestApp):
    def request_items(self, items, meta="tag", **query):
        with mock.patch.object(BaseHandler, "get_category_with_count", return_value=list(items)):
            return self.json(f"/api/{meta}?{urlencode(query)}")

    def test_thresholds_and_show_all_cannot_bypass_pagination(self):
        for meta in ("tag", "author", "publisher", "series"):
            for count in (999, 1000, 1001):
                for query in ({}, {"show": "all"}):
                    with self.subTest(meta=meta, count=count, query=query):
                        result = self.request_items(categories(count), meta, **query)
                        self.assertEqual(result["err"], "ok")
                        self.assertEqual(result["total"], count)
                        self.assertEqual(result["paginated"], count >= 1000)
                        self.assertEqual(len(result["items"]), count if count < 1000 else 100)
                        self.assertEqual(result["pages"], 1 if count < 1000 else (count + 99) // 100)

    def test_empty_last_and_out_of_range_pages(self):
        result = self.request_items([], page=1, page_size=1000)
        self.assertEqual((result["total"], result["pages"], result["items"]), (0, 1, []))
        result = self.request_items(categories(1001), page=2, page_size=1000)
        self.assertEqual([item["id"] for item in result["items"]], [1000])
        self.assertEqual((result["page"], result["pages"]), (2, 2))
        self.assertEqual(self.request_items(categories(1001), page=3, page_size=1000)["items"], [])

    def test_invalid_parameters_fail_before_category_work(self):
        for query in (
            {"page": "bad"},
            {"page": 0},
            {"page": -1},
            {"page": "1.5"},
            {"page_size": ""},
            {"page_size": 0},
            {"page_size": -1},
            {"page_size": 1001},
            {"page_size": "all"},
        ):
            with self.subTest(query=query), mock.patch.object(BaseHandler, "get_category_with_count") as lookup:
                result = self.json("/api/tag?" + urlencode(query))
                self.assertEqual(result["err"], "params.pagination.invalid")
                lookup.assert_not_called()

    def test_forty_thousand_tied_items_are_complete_across_pages(self):
        items = categories(40000)
        seen = []
        for page in range(1, 41):
            # Database row order must not control page boundaries.
            result = self.request_items(items if page % 2 else reversed(items), page=page, page_size=1000, show="all")
            self.assertEqual((result["total"], result["pages"]), (40000, 40))
            self.assertEqual(len(result["items"]), 1000)
            seen.extend(item["id"] for item in result["items"])
        self.assertEqual(seen, list(range(40000)))

    def test_search_happens_before_count_and_pagination(self):
        items = categories(40000)
        result = self.request_items(items, q="  分类39  ", page=10, page_size=100)
        self.assertEqual((result["total"], result["unfiltered_total"], result["pages"]), (1000, 40000, 10))
        self.assertEqual([item["id"] for item in result["items"]], list(range(39900, 40000)))
        self.assertEqual(self.request_items(items, q="not present")["items"], [])
        mixed = [{"id": 1, "name": "Straße", "count": 2}, {"id": 2, "name": "Else", "count": 9}]
        self.assertEqual(self.request_items(mixed, q="STRASSE")["items"], mixed[:1])

    def test_sort_uses_counts_then_names_and_rating_is_numeric(self):
        items = [{"id": 1, "name": "B", "count": 1}, {"id": 2, "name": "A", "count": 1}, {"id": 3, "name": "C", "count": 5}]
        result = self.request_items(items, page_size=1)
        self.assertEqual(result["items"][0]["name"], "C")
        result = self.request_items(reversed(items), page=2, page_size=1)
        self.assertEqual(result["items"][0]["name"], "A")
        ratings = [{"id": value, "name": value, "count": 1} for value in (2, 10, 4)]
        self.assertEqual(self.request_items(ratings, "rating", page_size=1)["items"][0]["name"], 10)

    def test_author_aliases_are_grouped_before_pagination(self):
        items = [{"id": 1, "name": "Alias", "count": 1}, {"id": 2, "name": "Canonical", "count": 1}]
        with (
            mock.patch("webserver.handlers.meta.AliasService.author_mapping", return_value={"alias": "Canonical"}),
            mock.patch("webserver.handlers.meta.get_author_book_ids", return_value={1}),
        ):
            result = self.request_items(items, "author", page_size=1)
        self.assertEqual((result["total"], result["pages"]), (1, 1))
        self.assertEqual(result["items"][0]["name"], "Canonical")
        self.assertEqual(result["items"][0]["count"], 1)

    def test_format_endpoint_uses_the_same_page_cap(self):
        cache = test_main._app.settings["legacy"].new_api
        with (
            mock.patch.object(cache, "all_book_ids", return_value=[1]),
            mock.patch.object(cache, "formats", return_value=[f"FORMAT{i:04d}" for i in range(1001)]),
        ):
            result = self.json("/api/format?show=all&page=2&page_size=1000")
        self.assertEqual(result["total"], 1001)
        self.assertEqual(len(result["items"]), 1)
        self.assertEqual(result["items"][0]["name"], "FORMAT1000")
