#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import warnings
from unittest import mock
from tests.test_main import TestWithUserLogin, setUpModule as init, testdir

def setUpModule():
    init()

class TestUpload(TestWithUserLogin):
    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_bad_filename(self, m1):
        name = "索恩·德国史"
        path = testdir + "/cases/old.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "params.filename")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_old_file_zh(self, m1):
        name = "索恩·德国史.epub"
        path = testdir + "/cases/old.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)

            d = self.json("/api/book/upload", method="POST", body="k=1")
            self.assertEqual(d["err"], "samebook")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_old_file(self, m1):
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
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_upload_new_file(self, m5, m4, m3, m2, m1):
        warnings.simplefilter('ignore', ResourceWarning)
        name = "new.epub"
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
            m1.return_value = (name, data)
            m2.return_value = True
            m3.return_value = True
            m4.return_value = True
            m5.return_value = 1008610086

            d = self.json("/api/book/upload", method="POST", body="k=1", request_timeout=30)
            self.assertEqual(d["err"], "ok")
