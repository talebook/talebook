#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock, skip

from tests.test_main import TestWithUserLogin, setUpModule as init, testdir
from webserver import handlers


def setUpModule():
    init()
    handlers.scan.SCAN_DIR_PREFIX = "/"

    #engine = create_engine(main.CONF["user_database"], echo=True)
    #models.user_syncdb(engine)


class TestScan(TestWithUserLogin):
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_scan(self, m1):
        m1.return_value = False
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")

    def test_scan_background(self):
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")

    @skip("重复导入会失败；需要reset掉整个环境")
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_import_one(self, m1):
        m1.return_value = False
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash]}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    @skip("重复导入会失败；需要reset掉整个环境")
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_import_all(self, m1):
        m1.return_value = False
        req = {"hashlist": "all"}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    def test_scan_status(self):
        d = self.json("/api/admin/scan/status")
        self.assertEqual(d["err"], "ok")

    def test_import_status(self):
        d = self.json("/api/admin/import/status")
        self.assertEqual(d["err"], "ok")
