#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from tests.test_main import TestApp, setUpModule as init, testdir
from webserver.services.convert import ConvertService


def setUpModule():
    init()

class TestConvert(TestApp):
    def test_convert(self):
        fin = testdir + "/cases/old.epub"
        fout = "/tmp/output.mobi"
        flog = "/tmp/output.log"
        ok = ConvertService().do_ebook_convert(fin, fout, flog)
        self.assertEqual(ok, True)

