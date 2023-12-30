#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import threading
import time
from unittest import mock

from tests.test_main import TestWithUserLogin, setUpModule as init, testdir
from webserver import handlers
from webserver.models import ScanFile


def setUpModule():
    init()
    handlers.scan.SCAN_DIR_PREFIX = "/"


class TestScan(TestWithUserLogin):
    NEW_ROW_ID = 69

    def setUp(self):
        # 将这行记录设置为可导入的状态
        self.session = self.get_app().settings["ScopedSession"]
        self.session.rollback()

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        row.path = testdir + "/cases/new.epub"
        row.status = ScanFile.NEW
        row.book_id = 0
        row.import_id = 0
        row.save()
        self.session.commit()
        return super().setUp()

    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_scan(self, m1):
        m1.return_value = False
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")
        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        self.assertEqual(row.status, ScanFile.READY)

    def test_scan_background(self):
        n = threading.active_count() + 1
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(n+1, threading.active_count())
        while threading.active_count() > n:
            time.sleep(1)

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        self.assertEqual(row.status, ScanFile.READY)

    def test_scan_status(self):
        d = self.json("/api/admin/scan/status")
        self.assertEqual(d["err"], "ok")

    def test_import_status(self):
        d = self.json("/api/admin/import/status")
        self.assertEqual(d["err"], "ok")


class TestScanContinue(TestWithUserLogin):
    NEW_ROW_ID = 69

    def setUp(self):
        # 将这行记录设置为可导入的状态
        self.session = self.get_app().settings["ScopedSession"]
        self.session.rollback()

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        row.path = testdir + "/cases/new.epub"
        row.status = ScanFile.NEW
        row.book_id = 0
        row.import_id = 0
        row.save()
        self.session.commit()
        return super().setUp()

    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_scan(self, m1):
        m1.return_value = False
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        self.assertEqual(row.status, ScanFile.READY)


class TestImport(TestWithUserLogin):
    READY_ROW_ID = 69

    def setUp(self):
        # 将这行记录设置为可导入的状态
        session = self.get_app().settings["ScopedSession"]
        session.rollback()

        row = session.query(ScanFile).filter(ScanFile.id == self.READY_ROW_ID).one()
        row.path = testdir + "/cases/new.epub"
        row.status = ScanFile.READY
        row.book_id = 0
        row.import_id = 0
        row.save()
        session.commit()
        return super().setUp()

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_import_one(self, m2, m1):
        m1.return_value = 1008610086
        m2.return_value = False
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash]}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    @mock.patch("webserver.handlers.scan.Scanner.allow_backgrounds")
    def test_import_all(self, m2, m1):
        m1.return_value = 1008610086
        m2.return_value = False
        req = {"hashlist": "all"}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")
