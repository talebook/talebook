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

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_scan_multiple_files_use_own_filename(self, mock_get_metadata):
        """多文件扫描时，每个PDF都应使用自己的文件名作为书名，而非最后一个文件的文件名"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.side_effect = lambda stream, stream_type, use_libprs_metadata: Metadata("副本", ["某作者"])

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_a = os.path.join(tmpdir, "book_a.pdf")
            pdf_b = os.path.join(tmpdir, "book_b.pdf")
            # Use different content so each file gets a distinct SHA256 hash;
            # identical content would trigger the duplicate-hash cleanup path in do_scan()
            # and cause the first file's ScanFile record to be deleted.
            with open(pdf_a, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf for book_a")
            with open(pdf_b, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf for book_b")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row_a = self.session.query(ScanFile).filter(ScanFile.path == pdf_a).first()
            row_b = self.session.query(ScanFile).filter(ScanFile.path == pdf_b).first()

            self.assertIsNotNone(row_a, "应当为 book_a.pdf 创建ScanFile记录")
            self.assertIsNotNone(row_b, "应当为 book_b.pdf 创建ScanFile记录")
            self.assertEqual(row_a.title, "book_a", "book_a.pdf 的书名应为 book_a，而非其他文件的文件名")
            self.assertEqual(row_b.title, "book_b", "book_b.pdf 的书名应为 book_b")

            for row in [row_a, row_b]:
                if row:
                    self.session.delete(row)
            self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_txt_scan_uses_filename_not_metadata_title(self, mock_get_metadata):
        """TXT 文件与 PDF 使用相同逻辑（scan.py 第189行），应同样用文件名而非元数据书名"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.return_value = Metadata("Untitled", ["Unknown"])

        with tempfile.TemporaryDirectory() as tmpdir:
            txt_path = os.path.join(tmpdir, "my_text_book.txt")
            with open(txt_path, "wb") as f:
                f.write(b"This is a text book content")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == txt_path).first()
            self.assertIsNotNone(row, "应当为 TXT 文件创建ScanFile记录")
            self.assertEqual(row.title, "my_text_book", "TXT 书名应使用文件名，不应是元数据中的'Untitled'")

            self.session.delete(row)
            self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_filename_with_multiple_dots(self, mock_get_metadata):
        """含多个点的文件名用 os.path.splitext 才能正确提取（只去掉最后的 .pdf）"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.return_value = Metadata("副本", ["某作者"])

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "my.book.chapter1.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row)
            self.assertEqual(row.title, "my.book.chapter1")

            if row:
                self.session.delete(row)
                self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_epub_scan_uses_metadata_title_not_filename(self, mock_get_metadata):
        """EPUB 不在 ['txt','pdf'] 范围内，应使用元数据书名而非文件名（回归验证）"""
        from calibre.ebooks.metadata.book.base import Metadata

        good_mi = Metadata("这是一本好书", ["著名作者"])
        good_mi.tags = ["小说"]
        good_mi.publisher = "某出版社"
        mock_get_metadata.return_value = good_mi

        with tempfile.TemporaryDirectory() as tmpdir:
            epub_path = os.path.join(tmpdir, "filename_is_irrelevant.epub")
            with open(epub_path, "wb") as f:
                f.write(b"PK\x03\x04")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == epub_path).first()
            if row:
                self.assertEqual(row.title, "这是一本好书", "EPUB 书名应来自元数据，不是文件名")
                self.session.delete(row)
                self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_in_subdirectory_uses_filename(self, mock_get_metadata):
        """do_scan 会递归扫描子目录（os.walk），子目录中的 PDF 也应使用文件名"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.return_value = Metadata("副本", ["某作者"])

        with tempfile.TemporaryDirectory() as tmpdir:
            subdir = os.path.join(tmpdir, "fiction", "sci-fi")
            os.makedirs(subdir)
            pdf_path = os.path.join(subdir, "deep_scan_book.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "子目录中的 PDF 应被递归扫描到")
            self.assertEqual(row.title, "deep_scan_book", "子目录中的 PDF 书名应使用文件名")

            self.session.delete(row)
            self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_chinese_filename(self, mock_get_metadata):
        """中文文件名的 PDF 应正确提取书名（os.path.splitext 对 Unicode 安全）"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.return_value = Metadata("副本", ["某作者"])

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "三体全集.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "中文文件名的 PDF 应被正确扫描")
            self.assertEqual(row.title, "三体全集")

            self.session.delete(row)
            self.session.commit()

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_scan_three_files_all_use_own_filename(self, mock_get_metadata):
        """3个PDF同时扫描，全部各用自己的文件名（fname 变量泄漏修复的更强验证）"""
        from calibre.ebooks.metadata.book.base import Metadata

        mock_get_metadata.side_effect = lambda s, stream_type, use_libprs_metadata: Metadata("副本", ["某作者"])

        with tempfile.TemporaryDirectory() as tmpdir:
            names = ["alpha", "beta", "gamma"]
            paths = {}
            for name in names:
                path = os.path.join(tmpdir, f"{name}.pdf")
                with open(path, "wb") as f:
                    f.write(f"%PDF-1.4 content for {name}".encode())
                paths[name] = path

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            for name, path in paths.items():
                row = self.session.query(ScanFile).filter(ScanFile.path == path).first()
                self.assertIsNotNone(row, f"应当为 {name}.pdf 创建ScanFile记录")
                self.assertEqual(row.title, name, f"{name}.pdf 的书名应为 {name}，不是其他文件的文件名")

            for path in paths.values():
                row = self.session.query(ScanFile).filter(ScanFile.path == path).first()
                if row:
                    self.session.delete(row)
            self.session.commit()


class TestScanMetadataParseFailure(TestWithUserLogin):
    """元数据解析失败时，do_scan()应与do_import()的兜底逻辑保持一致（PR #861 review反馈）

    do_import()解析失败时用文件名+“佚名”构造兜底metadata并照常查重；
    do_scan()此前解析失败会直接用"Unknown"作者跳过查重，导致已入库、
    但物理文件解析失败的书籍重扫时仍被判定为可导入。
    """

    def setUp(self):
        self.session = self.get_app().settings["ScopedSession"]
        self.session.rollback()
        return super().setUp()

    @mock.patch("calibre.db.legacy.LibraryDatabase.get_data_as_dict")
    @mock.patch("calibre.db.legacy.LibraryDatabase.books_with_same_title")
    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_parse_failure_scan_marks_existing_book_as_exist(self, mock_get_metadata, mock_same_title, mock_get_data):
        mock_get_metadata.side_effect = Exception("failed to parse PDF metadata")

        mock_same_title.return_value = {1}
        mock_get_data.return_value = [{"id": 1, "authors": ["佚名"], "available_formats": "PDF"}]

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "broken_but_imported.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "应当创建ScanFile记录")
            self.assertEqual(row.status, ScanFile.EXIST, "解析失败但已入库的文件重新扫描应标记为EXIST")
            self.assertEqual(row.book_id, 1)
            self.assertEqual(row.title, "broken_but_imported")
            self.assertEqual(row.author, "佚名")

            self.session.delete(row)
            self.session.commit()


class TestScanDuplicateDetection(TestWithUserLogin):
    """已入库的PDF/TXT再次扫描应被识别为重复（issue #855）

    do_import() 对PDF/TXT强制使用“佚名”作为作者写入书库，
    但do_scan()的查重逻辑此前使用文件元数据中的原始作者比对，
    两者不一致导致已入库文件永远无法被判定为EXIST，一直显示“可导入”。
    """

    def setUp(self):
        self.session = self.get_app().settings["ScopedSession"]
        self.session.rollback()
        return super().setUp()

    @mock.patch("calibre.db.legacy.LibraryDatabase.get_data_as_dict")
    @mock.patch("calibre.db.legacy.LibraryDatabase.books_with_same_title")
    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_pdf_scan_marks_existing_book_as_exist(self, mock_get_metadata, mock_same_title, mock_get_data):
        from calibre.ebooks.metadata.book.base import Metadata

        # PDF文件自身元数据里的作者与入库时强制使用的“佚名”不同
        mi = Metadata("副本", ["某个PDF元数据作者"])
        mi.tags = []
        mi.publisher = None
        mock_get_metadata.return_value = mi

        mock_same_title.return_value = {1}
        mock_get_data.return_value = [{"id": 1, "authors": ["佚名"], "available_formats": "PDF"}]

        with tempfile.TemporaryDirectory() as tmpdir:
            pdf_path = os.path.join(tmpdir, "already_imported.pdf")
            with open(pdf_path, "wb") as f:
                f.write(b"%PDF-1.4 minimal pdf")

            ScanService().do_scan(tmpdir)

            self.session.rollback()
            row = self.session.query(ScanFile).filter(ScanFile.path == pdf_path).first()
            self.assertIsNotNone(row, "应当创建ScanFile记录")
            self.assertEqual(row.status, ScanFile.EXIST, "已入库的PDF重新扫描应标记为EXIST，而不是可导入")
            self.assertEqual(row.book_id, 1)

            self.session.delete(row)
            self.session.commit()
