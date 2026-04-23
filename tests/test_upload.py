#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import unittest
import warnings
from unittest import mock
from tests.test_main import TestWithUserLogin, setUpModule as init, testdir

def setUpModule():
    init()


class TestDecodeFilename(unittest.TestCase):
    def setUp(self):
        from webserver.handlers.book import decode_filename
        self.decode = decode_filename

    def test_none_returns_none(self):
        self.assertIsNone(self.decode(None))

    def test_empty_string_returns_empty(self):
        self.assertEqual(self.decode(""), "")

    def test_ascii_filename_unchanged(self):
        self.assertEqual(self.decode("book.epub"), "book.epub")

    def test_chinese_already_utf8(self):
        # Form field values arrive already decoded as UTF-8
        chinese = "DeepSeek打开财富密码.pdf"
        self.assertEqual(self.decode(chinese), chinese)

    def test_chinese_misinterpreted_as_latin1(self):
        # Tornado decodes multipart filename headers as latin-1;
        # decode_filename re-interprets the bytes as UTF-8.
        chinese = "索恩·德国史.epub"
        latin1_mangled = chinese.encode("utf-8").decode("latin-1")
        self.assertEqual(self.decode(latin1_mangled), chinese)

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
