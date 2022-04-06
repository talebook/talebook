#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from unittest import mock
from tests.test_main import TestWithUserLogin, setUpModule as init

def setUpModule():
    init()

class TestAdmin(TestWithUserLogin):
    def test_book_list(self):
        d = self.json("/api/admin/book/list?sort=id&num=10")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["items"]), 10)
