#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock, skip
from tests.test_main import TestWithUserLogin, setUpModule as init, testdir
from webserver import main, models
from sqlalchemy import create_engine


def setUpModule():
    init()
    #engine = create_engine(main.CONF["user_database"], echo=True)
    #models.user_syncdb(engine)


class TestScan(TestWithUserLogin):
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_scan(self, m1):
        m1.return_value = False
        req = {"path": testdir + "/cases/"}
        d = self.json("/api/admin/scan/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_import(self, m1):
        m1.return_value = False
        req = {"hashlist": "all"}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    @mock.patch("webserver.handlers.book.is_allow_background")
    def test_scan_status(self, m1):
        m1.return_value = True
        d = self.json("/api/admin/scan/status")
        self.assertEqual(d["err"], "ok")

    @mock.patch("webserver.handlers.book.is_allow_background")
    def test_import_status(self, m1):
        m1.return_value = True
        d = self.json("/api/admin/import/status")
        self.assertEqual(d["err"], "ok")
