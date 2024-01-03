#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from tests.test_main import TestWithUserLogin, setUpModule as init, testdir
from webserver.services.convert import ConvertService
from webserver.services.extract import ExtractService


def setUpModule():
    init()

class TestConvert(TestWithUserLogin):
    def test_convert(self):
        fin = testdir + "/cases/old.epub"
        fout = "/tmp/output.mobi"
        flog = "/tmp/output.log"
        ok = ConvertService().do_ebook_convert(fin, fout, flog)
        self.assertEqual(ok, True)

class TestExtract(TestWithUserLogin):
    def test_convert(self):
        bid = 666
        fpath = testdir + "/cases/book.txt"
        ok = ExtractService().parse_txt_content(bid, fpath)
        self.assertEqual(ok, True)

