#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging
import os
import tempfile
import threading
import time
import unittest
from unittest import mock

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver import handlers
from webserver.models import ScanFile
from webserver.services import AsyncService
from webserver.services.scan import ScanService


def setUpModule():
    init()
    handlers.scan.SCAN_DIR_PREFIX = "/"


class TestScan(TestWithUserLogin):
    NEW_ROW_ID = 69
    RECORDS_COUNT = 2

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

    def test_list(self):
        d = self.json("/api/admin/scan/list?num=10000")
        self.assertEqual(d["total"], self.RECORDS_COUNT)

    def test_scan(self):
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        self.assertEqual(row.status, ScanFile.READY)

        d = self.json("/api/admin/scan/list?num=10000")
        self.assertGreaterEqual(d["total"], self.RECORDS_COUNT)

        titles = set(["天行者", "我的一生", "book", "凡人修仙之仙界篇", "语言哲学"])
        scan_titles = set([book["title"] for book in d["items"]])

    def test_scan_background(self):
        self.async_service.return_value = True

        n = threading.active_count() + 1
        d = self.json("/api/admin/scan/run", method="POST", body="")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(n + 1, threading.active_count())

        # wait job done
        time.sleep(2)
        q = ScanService().get_queue("do_scan")
        n = q.qsize()
        while n:
            n = q.qsize()
            time.sleep(0.1)

        row = self.session.query(ScanFile).filter(ScanFile.id == self.NEW_ROW_ID).one()
        self.assertEqual(row.status, ScanFile.READY)
        # self.assertEqual(row.status, ScanFile.DROP)

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

    def test_scan(self):
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
    def test_import_one(self, m1):
        m1.return_value = 1008610086
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash]}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_import_all(self, m1):
        m1.return_value = 1008610086
        req = {"hashlist": "all"}
        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
        self.assertEqual(d["err"], "ok")


class TestScanPDFTitle(TestWithUserLogin):
    """PDF文件扫描时应使用文件名作为书名，而不是PDF元数据中的书名（issue #770）"""

    def setUp(self):
        self.session = self.get_app().settings["ScopedSession"]
        self.session.rollback()
        return super().setUp()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_scan_uses_filename_not_metadata_title(self, mock_get_metadata):
        """当PDF元数据书名为'副本'等无意义值时，扫描记录应使用文件名作为书名"""
        from calibre.ebooks.metadata.book.base import Metadata

        bad_mi = Metadata("副本", ["某作者"])
        bad_mi.tags = []
        bad_mi.publisher = None
        mock_get_metadata.return_value = bad_mi

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "my_real_book.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "应当创建ScanFile记录")
            self.assertEqual(row.title, "my_real_book", "PDF书名应使用文件名，不应是元数据中的'副本'")

            self.session.delete(row)
            self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_scan_uses_filename_when_metadata_fails(self, mock_get_metadata):
        """当PDF元数据解析失败时，扫描记录应使用文件名（不含扩展名）作为书名"""
        mock_get_metadata.side_effect = Exception("failed to parse PDF metadata")

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "my_book_file.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "应当创建ScanFile记录")
            self.assertEqual(row.title, "my_book_file", "PDF解析失败时书名应使用文件名（不含扩展名）")

            self.session.delete(row)
            self.session.commit()
