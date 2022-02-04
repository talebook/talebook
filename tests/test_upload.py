#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from unittest import mock
from tests.test_main import TestWithUserLogin, setUpModule as init, testdir

def setUpModule():
    init()

class TestUpload(TestWithUserLogin):
    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    def test_upload_old_file(self, m4, m3, m2, m1):
        name = "abc.epub"
        path = testdir + "/cases/old.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "samebook")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    def test_upload_new_file(self, m4, m3, m2, m1):
        name = "new.epub"
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "ok")
