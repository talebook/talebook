#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import unittest
import warnings
from unittest import mock
from tests.test_main import TestWithUserLogin, setUpModule as init, testdir, get_db


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
        warnings.simplefilter("ignore", ResourceWarning)
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


class TestUploadFormatSecurity(TestWithUserLogin):
    """上传格式白名单和路径穿越防护的安全测试"""

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_exe_rejected(self, m):
        """可执行文件扩展名必须被拒绝"""
        m.return_value = ("malware.exe", b"MZ\x90\x00" + b"\x00" * 100)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_sh_rejected(self, m):
        """Shell 脚本扩展名必须被拒绝"""
        m.return_value = ("exploit.sh", b"#!/bin/bash\nrm -rf /")
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_py_rejected(self, m):
        """Python 脚本扩展名必须被拒绝"""
        m.return_value = ("auto.py", b"settings = {'autoreload': True}")
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_path_traversal_blocked(self, m):
        """路径穿越文件名在 basename 后扩展名不合法，必须被拒绝"""
        # basename("../../settings/auto.py") == "auto.py", fmt=="py" 不在白名单
        m.return_value = ("../../settings/auto.py", b"settings = {}")
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_epub_wrong_magic_rejected(self, m):
        """扩展名 .epub 但文件头不是 ZIP 魔数，必须被拒绝"""
        m.return_value = ("fake.epub", b"MZ\x90\x00" + b"\x00" * 100)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    def test_upload_pdf_wrong_magic_rejected(self, m):
        """扩展名 .pdf 但文件头不是 %PDF，必须被拒绝"""
        m.return_value = ("fake.pdf", b"MZ\x90\x00" + b"\x00" * 100)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_upload_valid_epub_passes_magic(self, mock_import, mock_save, m):
        """合法 EPUB 文件（ZIP 魔数）通过魔数校验"""
        mock_import.return_value = 9999
        mock_save.return_value = True
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
        m.return_value = ("new.epub", data)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertNotEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_upload_valid_pdf_passes_magic(self, mock_import, mock_save, m):
        """合法 PDF 文件（%PDF 魔数）通过魔数校验"""
        mock_import.return_value = 9999
        mock_save.return_value = True
        path = testdir + "/cases/title_has_0x00.pdf"
        with open(path, "rb") as f:
            data = f.read()
        m.return_value = ("test.pdf", data)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertNotEqual(d["err"], "params.format")


class TestCoverUploadSecurity(TestWithUserLogin):
    """封面图上传魔数校验的安全测试"""

    def _upload_cover(self, filename, content_type, data, bid=1):
        boundary = "----TalebookTestBoundary"
        body = (
            f"------TalebookTestBoundary\r\n"
            f'Content-Disposition: form-data; name="cover"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode() + data + b"\r\n------TalebookTestBoundary--\r\n"
        headers = {
            "Content-Type": f"multipart/form-data; boundary=----TalebookTestBoundary"
        }
        rsp = self.fetch(
            f"/api/book/{bid}/edit", method="POST", body=body, headers=headers
        )
        self.assertEqual(rsp.code, 200)
        return json.loads(rsp.body)

    def test_cover_non_image_bytes_rejected(self):
        """伪装成 JPEG 但实际是 ZIP 的文件必须被拒绝"""
        d = self._upload_cover("evil.jpg", "image/jpeg", b"PK\x03\x04" + b"\x00" * 100)
        self.assertEqual(d["err"], "params.cover.type")

    def test_cover_spoofed_content_type_rejected(self):
        """即使 Content-Type 声称是图片，魔数不匹配也必须被拒绝"""
        d = self._upload_cover("evil.exe", "image/png", b"MZ\x90\x00" + b"\x00" * 100)
        self.assertEqual(d["err"], "params.cover.type")

    def test_cover_exe_bytes_rejected(self):
        """Windows PE 可执行文件头（MZ）必须被拒绝"""
        d = self._upload_cover("cover.png", "image/png", b"MZ\x90\x00" + b"\x00" * 500)
        self.assertEqual(d["err"], "params.cover.type")

    def test_cover_valid_jpeg_passes_magic(self):
        """合法 JPEG 魔数（\\xff\\xd8\\xff）通过魔数校验，不返回 params.cover.type"""
        jpeg_data = b"\xff\xd8\xff\xe0" + b"\x00" * 200
        d = self._upload_cover("cover.jpg", "image/jpeg", jpeg_data)
        self.assertNotEqual(d["err"], "params.cover.type")

    def test_cover_valid_png_passes_magic(self):
        """合法 PNG 魔数通过魔数校验，不返回 params.cover.type"""
        png_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 200
        d = self._upload_cover("cover.png", "image/png", png_data)
        self.assertNotEqual(d["err"], "params.cover.type")

    def test_cover_valid_gif_passes_magic(self):
        """合法 GIF 魔数（GIF89a）通过魔数校验，不返回 params.cover.type"""
        gif_data = b"GIF89a" + b"\x00" * 200
        d = self._upload_cover("cover.gif", "image/gif", gif_data)
        self.assertNotEqual(d["err"], "params.cover.type")


class TestProxyImageWhitelist(unittest.TestCase):
    """ProxyImageHandler.is_whitelist 修复验证（直接测试 files.py 中的实现）"""

    def setUp(self):
        from webserver.handlers.files import ProxyImageHandler
        self.handler = ProxyImageHandler.__new__(ProxyImageHandler)

    def test_exact_domain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("bcebos.com"))

    def test_subdomain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("img1.bcebos.com"))

    def test_deep_subdomain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("a.b.doubanio.com"))

    def test_suffix_bypass_blocked(self):
        """attackerbcebos.com 以 bcebos.com 结尾，但不是合法子域名，必须被拒绝"""
        self.assertFalse(self.handler.is_whitelist("attackerbcebos.com"))

    def test_suffix_bypass_blocked_douban(self):
        self.assertFalse(self.handler.is_whitelist("evildoubanio.com"))

    def test_unknown_domain_blocked(self):
        self.assertFalse(self.handler.is_whitelist("evil.com"))

    def test_empty_host_blocked(self):
        self.assertFalse(self.handler.is_whitelist(""))

