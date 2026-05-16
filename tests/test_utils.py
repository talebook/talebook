#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-


import datetime
import unittest

from webserver.utils import ReadingStateFormatter, compare_books_by_rating_or_id, remove_zlibrary_suffix


class TestUtils(unittest.TestCase):
    def test_compare_by_rating_or_id(self):
        cases = [
            [1, {"id": 2}, {"id": 1}],
            [1, {"rating": 2}, {"rating": None}],
            [1, {"rating": 2}, {"rating": 0}],
            [1, {"rating": 2}, {}],
            [1, {"rating": 2}, {"id": 2}],
            [1, {"rating": 2, "id": 2}, {"rating": 2, "id": 1}],
            [1, {"rating": 0, "id": 2}, {"rating": 0, "id": 1}],
            [1, {"rating": 0, "id": 2}, {"rating": None, "id": 1}],
            [1, {"rating": 0, "id": 2}, {"id": 1}],
        ]
        for val, a, b in cases:
            self.assertEqual(val, compare_books_by_rating_or_id(a, b), "compare %s > %s" % (a, b))
            self.assertEqual(-1 * val, compare_books_by_rating_or_id(b, a), "compare %s > %s" % (b, a))


class TestRemoveZlibrarySuffix(unittest.TestCase):
    def test_removes_zlibrary_suffix(self):
        self.assertEqual(remove_zlibrary_suffix("Book Title (z-library.sk)"), "Book Title")

    def test_removes_zlib_suffix(self):
        self.assertEqual(remove_zlibrary_suffix("Book Title (z-lib.sk)"), "Book Title")

    def test_removes_1lib_suffix(self):
        self.assertEqual(remove_zlibrary_suffix("Book Title (1lib.sk)"), "Book Title")

    def test_removes_library_suffix_case_insensitive(self):
        self.assertEqual(remove_zlibrary_suffix("Book Title (Z-Library.sk)"), "Book Title")

    def test_no_change_for_normal_title(self):
        self.assertEqual(remove_zlibrary_suffix("Book Title (Publisher)"), "Book Title (Publisher)")

    def test_none_returns_none(self):
        self.assertIsNone(remove_zlibrary_suffix(None))

    def test_empty_string_returns_empty(self):
        self.assertEqual(remove_zlibrary_suffix(""), "")

    def test_removes_suffix_with_extra_info(self):
        self.assertEqual(remove_zlibrary_suffix("Title (z-library.sk, 1lib.sk)"), "Title")


class TestReadingStateFormatter(unittest.TestCase):
    def _make_mock_state(self, **kwargs):
        class MockState:
            favorite = kwargs.get("favorite", 0)
            wants = kwargs.get("wants", 0)
            read_state = kwargs.get("read_state", 0)
            online_read = kwargs.get("online_read", 0)
            download = kwargs.get("download", 0)
            favorite_date = kwargs.get("favorite_date", None)
            wants_date = kwargs.get("wants_date", None)
            read_date = kwargs.get("read_date", None)

            def is_favorite(self):
                return self.favorite == 1

            def is_wants(self):
                return self.wants == 1

            def get_read_state(self):
                return self.read_state

        return MockState()

    def test_format_none_returns_defaults(self):
        result = ReadingStateFormatter.format_reading_state(None)
        self.assertEqual(result["favorite"], 0)
        self.assertEqual(result["wants"], 0)
        self.assertEqual(result["read_state"], 0)
        self.assertIsNone(result["read_date"])

    def test_format_state_with_values(self):
        now = datetime.datetime(2024, 1, 1, 12, 0, 0)
        state = self._make_mock_state(favorite=1, wants=0, read_state=2, read_date=now)
        result = ReadingStateFormatter.format_reading_state(state)
        self.assertEqual(result["favorite"], 1)
        self.assertEqual(result["read_state"], 2)
        self.assertEqual(result["read_date"], now.isoformat())

    def test_format_with_api_format_no_state(self):
        result = ReadingStateFormatter.format_reading_state_with_api_format(None)
        self.assertEqual(result["err"], "ok")
        self.assertEqual(result["read_state"], 0)
        self.assertFalse(result["favorite"])
        self.assertFalse(result["wants"])

    def test_format_with_api_format_has_state(self):
        now = datetime.datetime(2024, 6, 1, 0, 0, 0)
        state = self._make_mock_state(favorite=1, wants=0, read_state=1, read_date=now)
        result = ReadingStateFormatter.format_reading_state_with_api_format(state)
        self.assertEqual(result["err"], "ok")
        self.assertTrue(result["favorite"])
        self.assertFalse(result["wants"])
        self.assertEqual(result["read_state"], 1)
        self.assertEqual(result["read_date"], now.isoformat())
