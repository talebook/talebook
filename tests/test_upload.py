#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import unittest
from unittest import mock

import webserver
from tests.test_main import TestWithUserLogin
from tests.test_main import setUpModule

class TestUpload(TestWithUserLogin):
    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    def test_upload(self, m4, m3, m2, m1):
        name = "abc.epub"
        path = "tests/library/Hai Ming Wei/Lao Ren Yu Hai (7)/Lao Ren Yu Hai - Hai Ming Wei.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "samebook")

        path = "tests/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "ok")
