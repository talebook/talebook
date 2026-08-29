#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import io
import json
import os
import tempfile
import threading
import time
import urllib.parse
import zipfile
from unittest import mock

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver import handlers, loader, main
from webserver.models import Item, ScanFile
from webserver.services.external_index import delete_external_index_book_record
from webserver.services.scan import SCAN_EXT, ScanService


def setUpModule():
    init()
    handlers.scan.SCAN_DIR_PREFIX = "/"


def write_supported_media(path, extension):
    if extension == "epub":
        with open(testdir + "/cases/new.epub", "rb") as source, open(path, "wb") as target:
            target.write(source.read())
    elif extension == "pdf":
        with open(path, "wb") as stream:
            stream.write(b"%PDF-1.4 indexed test")
    elif extension in ("cbz", "zip"):
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("001.png", b"\x89PNG\r\n\x1a\n" + b"page")
    elif extension in ("cbr", "rar"):
        with open(testdir + "/cases/comics/images-rar4.rar", "rb") as source, open(path, "wb") as target:
            target.write(source.read())
    else:
        with open(path, "wb") as stream:
            stream.write(("indexed %s" % extension).encode("utf-8"))


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

    def test_scan_classifies_image_cbz_and_rejects_damaged_container(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            comic_path = os.path.join(tmpdir, "scan-comic.cbz")
            body = io.BytesIO()
            with zipfile.ZipFile(body, "w") as archive:
                archive.writestr("001.png", b"\x89PNG\r\n\x1a\n" + b"page")
            with open(comic_path, "wb") as stream:
                stream.write(body.getvalue())

            damaged_path = os.path.join(tmpdir, "damaged.cbz")
            with open(damaged_path, "wb") as stream:
                stream.write(b"PK\x03\x04broken")

            ScanService()._do_scan(tmpdir)
            self.session.rollback()
            comic = self.session.query(ScanFile).filter(ScanFile.path == comic_path).one()
            damaged = self.session.query(ScanFile).filter(ScanFile.path == damaged_path).one()

            self.assertEqual(comic.status, ScanFile.READY)
            self.assertEqual(comic.data["media_type"], "comic")
            self.assertEqual(damaged.status, ScanFile.FAILED)
            self.assertIn("analysis_error", damaged.data)

            self.session.delete(comic)
            self.session.delete(damaged)
            self.session.commit()


class TestImportSettings(TestWithUserLogin):
    def _with_import_roots(self, root):
        previous = {
            "import_allowed_roots": main.CONF.get("import_allowed_roots"),
            "scan_upload_path": main.CONF.get("scan_upload_path"),
        }
        main.CONF["import_allowed_roots"] = [root]
        main.CONF["scan_upload_path"] = root
        return previous

    def _restore_import_roots(self, previous):
        for key, value in previous.items():
            main.CONF[key] = value

    def test_directory_check_counts_supported_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            epub_path = os.path.join(tmpdir, "book.epub")
            with open(epub_path, "wb") as f:
                f.write(b"epub")
            with open(os.path.join(tmpdir, "note.doc"), "wb") as f:
                f.write(b"doc")

            previous_roots = main.CONF.get("import_allowed_roots")
            previous_scan_path = main.CONF.get("scan_upload_path")
            try:
                main.CONF["import_allowed_roots"] = [tmpdir]
                main.CONF["scan_upload_path"] = tmpdir
                d = self.json(
                    "/api/admin/import/directory/check",
                    method="POST",
                    body=json.dumps({"path": tmpdir}),
                )
            finally:
                main.CONF["import_allowed_roots"] = previous_roots
                main.CONF["scan_upload_path"] = previous_scan_path

        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["directory"]["status"], "ok")
        self.assertEqual(d["directory"]["supported_file_count"], 1)

    def test_directory_list_accepts_allowed_child_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            child = os.path.join(tmpdir, "child")
            grandchild = os.path.join(child, "grandchild")
            os.makedirs(grandchild)

            previous = self._with_import_roots(tmpdir)
            try:
                d = self.json(
                    "/api/admin/import/directory/list?" + urllib.parse.urlencode({"path": child}),
                    method="GET",
                )
            finally:
                self._restore_import_roots(previous)

        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["path"], os.path.realpath(child))
        self.assertIn("grandchild", [item["name"] for item in d["items"]])

    def test_directory_list_rejects_path_escape(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = os.path.join(tmpdir, "root")
            outside = os.path.join(tmpdir, "outside")
            os.makedirs(os.path.join(root, "allowed"))
            os.makedirs(os.path.join(outside, "secret"))

            previous = self._with_import_roots(root)
            try:
                escaped = os.path.join(root, "..", "outside")
                d = self.json(
                    "/api/admin/import/directory/list?" + urllib.parse.urlencode({"path": escaped}),
                    method="GET",
                )
            finally:
                self._restore_import_roots(previous)

        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["path"], os.path.realpath(root))
        self.assertIn("allowed", [item["name"] for item in d["items"]])
        self.assertNotIn("secret", [item["name"] for item in d["items"]])

    def test_save_import_settings_persists_mode_and_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            previous = {
                "scan_upload_path": main.CONF.get("scan_upload_path"),
                "import_mode": main.CONF.get("import_mode"),
                "import_auto_watch_enabled": main.CONF.get("import_auto_watch_enabled"),
                "import_allowed_roots": main.CONF.get("import_allowed_roots"),
                "nuxt_env_path": main.CONF.get("nuxt_env_path"),
            }
            try:
                main.CONF["import_allowed_roots"] = [tmpdir]
                main.CONF["nuxt_env_path"] = os.path.join(tmpdir, ".env")
                with mock.patch.object(loader.SettingsLoader, "set_store_path", return_value=tmpdir):
                    d = self.json(
                        "/api/admin/import/settings",
                        method="POST",
                        body=json.dumps(
                            {
                                "scan_upload_path": tmpdir,
                                "import_mode": "index",
                                "auto_watch_enabled": False,
                            }
                        ),
                    )
                self.assertEqual(d["err"], "ok")
                self.assertEqual(d["settings"]["scan_upload_path"], tmpdir)
                self.assertEqual(d["settings"]["import_mode"], "index")
                self.assertEqual(main.CONF["scan_upload_path"], tmpdir)
                self.assertEqual(main.CONF["import_mode"], "index")
            finally:
                for key, value in previous.items():
                    main.CONF[key] = value


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

    def _cleanup_external_books(self, book_ids):
        legacy = self.get_app().settings["legacy"]
        session = self.get_app().settings["ScopedSession"]
        session.rollback()
        for book_id in set(book_id for book_id in book_ids if book_id):
            try:
                delete_external_index_book_record(legacy, book_id)
            except Exception:
                pass
            session.query(Item).filter(Item.book_id == book_id).delete()
        session.commit()

    def setUp(self):
        # 将这行记录设置为可导入的状态
        session = self.get_app().settings["ScopedSession"]
        session.rollback()

        row = session.query(ScanFile).filter(ScanFile.id == self.READY_ROW_ID).first()
        if not row:
            row = ScanFile(
                testdir + "/cases/new.epub",
                "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13",
                0,
            )
            row.id = self.READY_ROW_ID
            session.add(row)
        row.path = testdir + "/cases/new.epub"
        row.status = ScanFile.READY
        row.book_id = 0
        row.import_id = 0
        row.hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
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

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_import_index_mode_records_original_path_in_calibre(self, m1):
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash], "import_mode": "index"}
        book_id = None
        session = self.get_app().settings["ScopedSession"]
        try:
            d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
            self.assertEqual(d["err"], "ok")
            m1.assert_not_called()

            session.rollback()
            row = session.query(ScanFile).filter(ScanFile.id == self.READY_ROW_ID).one()
            book_id = row.book_id
            source_path = os.path.realpath(testdir + "/cases/new.epub")
            self.assertEqual(row.status, ScanFile.INDEXED)
            self.assertGreater(book_id, 0)
            self.assertEqual(row.data["import_mode"], "index")
            self.assertEqual(row.data["source_path"], source_path)
            self.assertTrue(row.data["external_path"])

            legacy = self.get_app().settings["legacy"]
            self.assertEqual(legacy.format_abspath(book_id, "EPUB", index_is_id=True), source_path)
            item = session.query(Item).filter(Item.book_id == book_id).one()
            self.assertEqual(item.src_path, source_path)
        finally:
            self._cleanup_external_books([book_id])

    @mock.patch("calibre.ebooks.metadata.meta.get_metadata")
    def test_import_index_mode_supports_all_supported_formats(self, get_metadata):
        from calibre.ebooks.metadata.book.base import Metadata

        def metadata_for_file(stream, stream_type, use_libprs_metadata):
            name = os.path.basename(stream.name)
            return Metadata("Indexed %s" % name, ["Author %s" % stream_type.upper()])

        get_metadata.side_effect = metadata_for_file
        session = self.get_app().settings["ScopedSession"]
        legacy = self.get_app().settings["legacy"]
        book_ids = []
        hashes = []
        rows = []

        with tempfile.TemporaryDirectory() as tmpdir:
            try:
                for index, ext in enumerate(SCAN_EXT):
                    source_path = os.path.join(tmpdir, "indexed_%s.%s" % (index, ext))
                    write_supported_media(source_path, ext)
                    hash_value = "sha256:index-mode-%s" % ext
                    row = ScanFile(source_path, hash_value, 10000 + index)
                    row.status = ScanFile.READY
                    session.add(row)
                    rows.append((row, source_path, ext.upper()))
                    hashes.append(hash_value)
                session.commit()

                req = {"hashlist": hashes, "import_mode": "index"}
                d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
                self.assertEqual(d["err"], "ok")

                session.rollback()
                for row, source_path, fmt in rows:
                    imported_row = session.query(ScanFile).filter(ScanFile.hash == row.hash).one()
                    book_ids.append(imported_row.book_id)
                    self.assertEqual(imported_row.status, ScanFile.INDEXED)
                    self.assertEqual(imported_row.data["format"], fmt)
                    self.assertEqual(
                        legacy.format_abspath(imported_row.book_id, fmt, index_is_id=True),
                        os.path.realpath(source_path),
                    )
            finally:
                self._cleanup_external_books(book_ids)
                session.rollback()
                session.query(ScanFile).filter(ScanFile.hash.in_(hashes)).delete(synchronize_session=False)
                session.commit()

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_delete_indexed_book_keeps_original_file(self, m1):
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash], "import_mode": "index"}
        session = self.get_app().settings["ScopedSession"]
        legacy = self.get_app().settings["legacy"]
        book_id = None
        source_path = os.path.realpath(testdir + "/cases/new.epub")
        try:
            d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
            self.assertEqual(d["err"], "ok")
            m1.assert_not_called()

            session.rollback()
            row = session.query(ScanFile).filter(ScanFile.id == self.READY_ROW_ID).one()
            book_id = row.book_id
            self.assertTrue(os.path.exists(source_path))

            d = self.json("/api/book/%d/delete" % book_id, method="POST", body="")
            self.assertEqual(d["err"], "ok")
            self.assertTrue(os.path.exists(source_path))
            self.assertEqual(legacy.get_data_as_dict(ids=[book_id]), [])
            session.rollback()
            self.assertIsNone(session.query(Item).filter(Item.book_id == book_id).first())
            self.assertEqual(session.query(ScanFile).filter(ScanFile.book_id == book_id).count(), 0)
            book_id = None
        finally:
            self._cleanup_external_books([book_id])

    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_edit_indexed_book_preserves_original_path(self, m1):
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash], "import_mode": "index"}
        session = self.get_app().settings["ScopedSession"]
        legacy = self.get_app().settings["legacy"]
        book_id = None
        source_path = os.path.realpath(testdir + "/cases/new.epub")
        try:
            d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))
            self.assertEqual(d["err"], "ok")
            m1.assert_not_called()

            session.rollback()
            row = session.query(ScanFile).filter(ScanFile.id == self.READY_ROW_ID).one()
            book_id = row.book_id
            body = {"title": "索引模式标题更新", "authors": ["索引模式作者"]}
            d = self.json("/api/book/%d/edit" % book_id, method="POST", body=json.dumps(body))
            self.assertEqual(d["err"], "ok")
            self.assertEqual(legacy.format_abspath(book_id, "EPUB", index_is_id=True), source_path)
        finally:
            self._cleanup_external_books([book_id])

    @mock.patch("calibre.db.legacy.LibraryDatabase.format_abspath")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    @mock.patch("webserver.services.scan.os.remove")
    def test_import_move_mode_deletes_source_after_successful_import(self, remove, import_book, format_abspath):
        import_book.return_value = 1008610086
        format_abspath.return_value = testdir + "/cases/new.epub"
        hash = "sha256:3cfd51afe17f3051e24921825c05e1df0bce03d22837a916a4d4ddcbf0301a13"
        req = {"hashlist": [hash], "import_mode": "move"}

        d = self.json("/api/admin/import/run", method="POST", body=json.dumps(req))

        self.assertEqual(d["err"], "ok")
        remove.assert_called_once_with(testdir + "/cases/new.epub")


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
            with open(testdir + "/cases/new.epub", "rb") as source, open(epub_path, "wb") as target:
                target.write(source.read())

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
