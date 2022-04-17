#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-


import unittest

from webserver.utils import compare_books_by_rating_or_id


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
