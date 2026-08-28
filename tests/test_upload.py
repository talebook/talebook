#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import unittest
import urllib.parse
import warnings
from unittest import mock
from tests.test_main import TestApp, TestWithUserLogin, setUpModule as init, testdir, get_db


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
        chinese = "DeepSeek打开财富密码.pdf"
        self.assertEqual(self.decode(chinese), chinese)

    def test_chinese_misinterpreted_as_latin1(self):
        # Tornado decodes multipart filename headers as latin-1;
        # decode_filename recovers the original UTF-8 string.
        chinese = "索恩·德国史.epub"
        latin1_mangled = chinese.encode("utf-8").decode("latin-1")
        self.assertEqual(self.decode(latin1_mangled), chinese)


class TestFilenameDecodeFlow(unittest.TestCase):
    """模拟前端 encodeURIComponent → 后端 decode_filename + unquote 的完整流程"""

    def _decode(self, filename):
        import urllib.parse
        from webserver.handlers.book import decode_filename
        return urllib.parse.unquote(decode_filename(filename))

    def test_percent_encoded_chinese(self):
        # 前端 encodeURIComponent("DeepSeek打开财富密码.pdf") 的结果
        encoded = "DeepSeek%E6%89%93%E5%BC%80%E8%B4%A2%E5%AF%8C%E5%AF%86%E7%A0%81.pdf"
        self.assertEqual(self._decode(encoded), "DeepSeek打开财富密码.pdf")

    def test_percent_encoded_chinese_only(self):
        # 纯中文文件名
        encoded = "%E7%B4%A2%E6%81%A9%C2%B7%E5%BE%B7%E5%9B%BD%E5%8F%B2.epub"
        self.assertEqual(self._decode(encoded), "索恩·德国史.epub")

    def test_plain_ascii_filename(self):
        # ASCII 文件名不受影响
        self.assertEqual(self._decode("book.epub"), "book.epub")

class TestUpload(TestWithUserLogin):
    def test_upload_without_ebook_field_returns_json_error(self):
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertEqual(d["err"], "params.ebook")

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
    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_upload_valid_epub_passes_magic(self, mock_import, mock_save, mock_msg, mock_hist, m):
        """合法 EPUB 文件（ZIP 魔数）通过魔数校验"""
        mock_import.return_value = 9999
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
        m.return_value = ("new.epub", data)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertNotEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.book.BookUpload.get_upload_file")
    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_upload_valid_pdf_passes_magic(self, mock_import, mock_save, mock_msg, mock_hist, m):
        """合法 PDF 文件（%PDF 魔数）通过魔数校验"""
        mock_import.return_value = 9999
        path = testdir + "/cases/title_has_0x00.pdf"
        with open(path, "rb") as f:
            data = f.read()
        m.return_value = ("test.pdf", data)
        d = self.json("/api/book/upload", method="POST", body="k=1")
        self.assertNotEqual(d["err"], "params.format")


class TestUploadChunk(TestWithUserLogin):
    """分片上传（/api/book/upload/chunk + /api/book/upload/complete）测试"""

    def _upload_chunk(self, upload_id, chunk_index, total_chunks, data):
        boundary = "----TalebookChunkBoundary"
        body = (
            "--%s\r\n"
            'Content-Disposition: form-data; name="chunk"; filename="chunk.bin"\r\n'
            "Content-Type: application/octet-stream\r\n\r\n" % boundary
        ).encode() + data + ("\r\n--%s--\r\n" % boundary).encode()
        headers = {"Content-Type": "multipart/form-data; boundary=%s" % boundary}
        url = "/api/book/upload/chunk?upload_id=%s&chunk_index=%s&total_chunks=%s" % (
            urllib.parse.quote(str(upload_id), safe=""),
            chunk_index,
            total_chunks,
        )
        rsp = self.fetch(url, method="POST", body=body, headers=headers)
        self.assertEqual(rsp.code, 200)
        return json.loads(rsp.body)

    def _complete_upload(self, upload_id, filename, total_chunks):
        body = urllib.parse.urlencode({"upload_id": upload_id, "filename": filename, "total_chunks": total_chunks})
        return self.json("/api/book/upload/complete", method="POST", body=body)

    def test_chunk_invalid_upload_id_rejected(self):
        d = self._upload_chunk("../../evil", 0, 1, b"data")
        self.assertEqual(d["err"], "params.upload_id")

    def test_chunk_bad_index_params_rejected(self):
        d = self._upload_chunk("valid-id-1", "abc", 1, b"data")
        self.assertEqual(d["err"], "params.chunk")

    def test_chunk_index_out_of_range_rejected(self):
        d = self._upload_chunk("valid-id-2", 5, 2, b"data")
        self.assertEqual(d["err"], "params.chunk")

    def test_chunk_missing_file_rejected(self):
        headers = {"Content-Type": "multipart/form-data; boundary=empty"}
        rsp = self.fetch(
            "/api/book/upload/chunk?upload_id=valid-id-3&chunk_index=0&total_chunks=1",
            method="POST",
            body=b"--empty--\r\n",
            headers=headers,
        )
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "params.chunk")

    def test_complete_missing_upload_rejected(self):
        d = self._complete_upload("no-such-upload", "book.epub", 2)
        self.assertEqual(d["err"], "params.upload_id")

    def test_complete_unsupported_format_rejected(self):
        d = self._complete_upload("some-id", "malware.exe", 1)
        self.assertEqual(d["err"], "params.format")

    def test_complete_missing_chunk_after_partial_upload(self):
        upload_id = "partialflow"
        d = self._upload_chunk(upload_id, 0, 2, b"AAAA")
        self.assertEqual(d["err"], "ok")
        d = self._complete_upload(upload_id, "partial.epub", 2)
        self.assertEqual(d["err"], "params.chunk")

    def test_complete_magic_mismatch_rejected(self):
        upload_id = "magicmismatch"
        d = self._upload_chunk(upload_id, 0, 1, b"NOT-A-REAL-PDF")
        self.assertEqual(d["err"], "ok")
        d = self._complete_upload(upload_id, "fake.pdf", 1)
        self.assertEqual(d["err"], "params.format")

    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_chunk_upload_full_flow(self, m_import, m_save, m_msg, m_hist):
        warnings.simplefilter("ignore", ResourceWarning)
        m_import.return_value = 1008610087
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
        mid = len(data) // 2
        chunks = [data[:mid], data[mid:]]
        upload_id = "flowtest1"
        for i, chunk in enumerate(chunks):
            d = self._upload_chunk(upload_id, i, len(chunks), chunk)
            self.assertEqual(d["err"], "ok")

        d = self._complete_upload(upload_id, "flow_new.epub", len(chunks))
        self.assertEqual(d["err"], "ok")

    def test_complete_total_chunks_exceeds_max_rejected(self):
        """total_chunks 超出 MAX_CHUNK_COUNT 时必须在拼接分片路径前被拒绝"""
        d = self._complete_upload("too-many-parts", "book.epub", 999999)
        self.assertEqual(d["err"], "params.chunk")

    def test_chunk_honors_configured_chunk_size(self):
        """单分片大小上限直接采用管理员配置的 UPLOAD_CHUNK_SIZE，放行该值以内的分片"""
        from webserver.handlers.book import CONF
        with mock.patch.dict(CONF, {"UPLOAD_CHUNK_SIZE": "2MB"}):
            data = b"x" * int(1.5 * 1024 * 1024)
            d = self._upload_chunk("size-honor-ok", 0, 1, data)
            self.assertEqual(d["err"], "ok")

    def test_chunk_rejects_oversized_chunk(self):
        """超出 UPLOAD_CHUNK_SIZE 的分片应被拒绝"""
        from webserver.handlers.book import CONF
        with mock.patch.dict(CONF, {"UPLOAD_CHUNK_SIZE": "2MB"}):
            data = b"x" * int(2.5 * 1024 * 1024)
            d = self._upload_chunk("size-honor-reject", 0, 1, data)
            self.assertEqual(d["err"], "params.chunk")

    def test_chunk_retry_existing_index_not_double_counted(self):
        """客户端重试已写入的分片索引时，总大小校验应减去旧分片大小，
        避免接近上限时重试被重复计入而误删整个分片目录"""
        from webserver.handlers.book import CONF

        # 限制设为单个分片大小的两倍少一点：刚好容纳一次写入，
        # 但容纳不下“旧分片 + 新分片”被重复计入的情形
        chunk_len = 1024
        max_total = int(chunk_len * 1.5)
        upload_id = "retry-index"
        with mock.patch.dict(CONF, {"MAX_UPLOAD_SIZE": "%dB" % max_total}):
            d = self._upload_chunk(upload_id, 0, 2, b"A" * chunk_len)
            self.assertEqual(d["err"], "ok")
            # 重试同一个 chunk_index（响应丢失后重发），应被减去旧分片大小后仍通过
            d = self._upload_chunk(upload_id, 0, 2, b"B" * chunk_len)
            self.assertEqual(d["err"], "ok")

    def test_chunk_retry_different_index_still_enforces_limit(self):
        """重试不同分片索引仍受总大小限制约束，不因修复逻辑而绕过校验"""
        from webserver.handlers.book import CONF

        chunk_len = 1024
        max_total = int(chunk_len * 1.5)
        upload_id = "retry-limit"
        with mock.patch.dict(CONF, {"MAX_UPLOAD_SIZE": "%dB" % max_total}):
            d = self._upload_chunk(upload_id, 0, 2, b"A" * chunk_len)
            self.assertEqual(d["err"], "ok")
            # 写入另一个不同索引的分片，新旧两份累计超过上限，应被拒绝
            d = self._upload_chunk(upload_id, 1, 2, b"B" * chunk_len)
            self.assertEqual(d["err"], "params.chunk")

    def test_max_chunk_count_accepts_string_config_without_crashing(self):
        """MAX_CHUNK_COUNT 经面板保存后可能是字符串（如 "10"），
        book.py 读取时用 int() 转换，避免 total_chunks > max_chunks 比较抛 TypeError；
        声明的总片数超过上限时，每一片都应在落盘前被拒绝（而非 500 异常）"""
        from webserver.handlers.book import CONF

        # 限制为最多 2 片（以字符串形式模拟面板保存结果）
        with mock.patch.dict(CONF, {"MAX_CHUNK_COUNT": "2"}):
            upload_id = "count-limit"
            # total_chunks=3 超过上限 2，所有分片都应在首片即被拒绝，且不抛 TypeError
            d = self._upload_chunk(upload_id, 0, 3, b"A" * 1024)
            self.assertEqual(d["err"], "params.chunk")
            d = self._upload_chunk(upload_id, 1, 3, b"B" * 1024)
            self.assertEqual(d["err"], "params.chunk")
            d = self._upload_chunk(upload_id, 2, 3, b"C" * 1024)
            self.assertEqual(d["err"], "params.chunk")

    def test_max_chunk_count_allows_within_limit(self):
        """声明的总片数未超过上限时，分片应正常接收（验证字符串配置下未误伤合法上传）"""
        from webserver.handlers.book import CONF

        with mock.patch.dict(CONF, {"MAX_CHUNK_COUNT": "5"}):
            upload_id = "count-ok"
            d = self._upload_chunk(upload_id, 0, 3, b"A" * 1024)
            self.assertEqual(d["err"], "ok")
            d = self._upload_chunk(upload_id, 1, 3, b"B" * 1024)
            self.assertEqual(d["err"], "ok")
            d = self._upload_chunk(upload_id, 2, 3, b"C" * 1024)
            self.assertEqual(d["err"], "ok")

    def test_complete_rechecks_total_size_bypassing_per_chunk_check(self):
        """并发上传绕过单次/chunk请求的总大小校验后，/complete合并前必须重新校验实际总大小"""
        from webserver.handlers.book import CONF

        upload_id = "resum-bypass"
        with mock.patch.dict(CONF, {"MAX_UPLOAD_SIZE": "1024MB"}):
            d = self._upload_chunk(upload_id, 0, 2, b"A" * 1024)
            self.assertEqual(d["err"], "ok")
            d = self._upload_chunk(upload_id, 1, 2, b"B" * 1024)
            self.assertEqual(d["err"], "ok")

        # 分片落盘时总大小限制是1024MB，此时都能通过；管理员随后把限制调小，
        # /complete 应基于磁盘上分片的实际大小重新求和校验，而不是信任之前的请求
        with mock.patch.dict(CONF, {"MAX_UPLOAD_SIZE": "1KB"}):
            d = self._complete_upload(upload_id, "resum.epub", 2)
            self.assertEqual(d["err"], "params.chunk")

    @mock.patch("webserver.handlers.base.BaseHandler.user_history")
    @mock.patch("webserver.handlers.base.BaseHandler.add_msg")
    @mock.patch("webserver.models.Item.save")
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book")
    def test_complete_preserves_chunks_on_unexpected_merge_error(self, m_import, m_save, m_msg, m_hist):
        """合并分片时出现非预期异常（如磁盘写满）时应保留分片目录，以便用户重试"""
        import os
        from webserver.handlers.book import CONF

        upload_id = "merge-io-error"
        path = testdir + "/cases/new.epub"
        with open(path, "rb") as f:
            data = f.read()
        mid = len(data) // 2
        d = self._upload_chunk(upload_id, 0, 2, data[:mid])
        self.assertEqual(d["err"], "ok")
        d = self._upload_chunk(upload_id, 1, 2, data[mid:])
        self.assertEqual(d["err"], "ok")

        chunk_dir = os.path.join(CONF["upload_path"], "chunks", "1", upload_id)
        self.assertTrue(os.path.isdir(chunk_dir))

        real_open = open

        def fake_open(file, mode="r", *args, **kwargs):
            # 仅让合并目标文件的写入失败，分片文件的读取与其它文件操作不受影响
            if "wb" in mode and "chunks" not in str(file):
                raise OSError("disk full")
            return real_open(file, mode, *args, **kwargs)

        body = urllib.parse.urlencode({"upload_id": upload_id, "filename": "merge_io.epub", "total_chunks": 2})
        with mock.patch("builtins.open", side_effect=fake_open):
            rsp = self.fetch("/api/book/upload/complete", method="POST", body=body)
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "exception")
        self.assertTrue(os.path.isdir(chunk_dir))

    def test_stale_chunk_dir_cleaned_up(self):
        """超过TTL未完成的分片目录，应在后续分片请求时被自动清理"""
        import os
        import time
        from webserver.handlers.book import CONF

        d = self._upload_chunk("stale-upload", 0, 2, b"AAAA")
        self.assertEqual(d["err"], "ok")
        stale_dir = os.path.join(CONF["upload_path"], "chunks", "1", "stale-upload")
        self.assertTrue(os.path.isdir(stale_dir))

        old_time = time.time() - 3600
        os.utime(stale_dir, (old_time, old_time))

        with mock.patch.dict(CONF, {"UPLOAD_CHUNK_TTL_SECONDS": 1}):
            d = self._upload_chunk("another-upload", 0, 1, b"BBBB")
            self.assertEqual(d["err"], "ok")

        self.assertFalse(os.path.exists(stale_dir))


class TestUploadChunkToggle(TestWithUserLogin):
    """分片上传功能开关（UPLOAD_CHUNK_ENABLED）测试"""

    def setUp(self):
        super().setUp()
        from webserver.handlers.book import CONF
        self.CONF = CONF
        self._prev_enabled = CONF.get("UPLOAD_CHUNK_ENABLED", True)

    def tearDown(self):
        self.CONF["UPLOAD_CHUNK_ENABLED"] = self._prev_enabled
        super().tearDown()

    def test_chunk_upload_rejected_when_disabled(self):
        self.CONF["UPLOAD_CHUNK_ENABLED"] = False
        headers = {"Content-Type": "multipart/form-data; boundary=empty"}
        rsp = self.fetch(
            "/api/book/upload/chunk?upload_id=toggle-id&chunk_index=0&total_chunks=1",
            method="POST",
            body=b"--empty--\r\n",
            headers=headers,
        )
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "params.chunk_disabled")

    def test_complete_rejected_when_disabled(self):
        self.CONF["UPLOAD_CHUNK_ENABLED"] = False
        body = urllib.parse.urlencode({"upload_id": "toggle-id", "filename": "book.epub", "total_chunks": 1})
        rsp = self.fetch("/api/book/upload/complete", method="POST", body=body)
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "params.chunk_disabled")


class TestUploadChunkGuestPermission(TestApp):
    """默认关闭访客上传时，分片上传接口也应拒绝匿名用户"""

    def test_chunk_upload_requires_login_by_default(self):
        headers = {"Content-Type": "multipart/form-data; boundary=empty"}
        rsp = self.fetch(
            "/api/book/upload/chunk?upload_id=guest-id&chunk_index=0&total_chunks=1",
            method="POST",
            body=b"--empty--\r\n",
            headers=headers,
        )
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "user.need_login")

    def test_complete_requires_login_by_default(self):
        body = urllib.parse.urlencode({"upload_id": "guest-id", "filename": "book.epub", "total_chunks": 1})
        rsp = self.fetch("/api/book/upload/complete", method="POST", body=body)
        self.assertEqual(rsp.code, 200)
        d = json.loads(rsp.body)
        self.assertEqual(d["err"], "user.need_login")


class TestCoverUploadSecurity(TestWithUserLogin):
    """封面图上传魔数校验的安全测试"""

    def setUp(self):
        super().setUp()
        self._patcher_get = mock.patch("calibre.db.legacy.LibraryDatabase.get_metadata")
        self._patcher_set = mock.patch("calibre.db.legacy.LibraryDatabase.set_metadata")
        self._patcher_get.start().return_value = mock.MagicMock()
        self._patcher_set.start()

    def tearDown(self):
        self._patcher_set.stop()
        self._patcher_get.stop()
        super().tearDown()

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


class TestProxyImageHandlerSSRF(TestApp):
    """ProxyImageHandler SSRF 防护集成测试"""

    @mock.patch("requests.get")
    def test_valid_url_proxied_with_safe_options(self, mock_get):
        """合法白名单 URL 应以 allow_redirects=False 和 timeout=10 调用 requests.get"""
        fake_response = mock.MagicMock()
        fake_response.headers = {"Content-Type": "image/jpeg"}
        fake_response.content = b"FAKEIMG"
        mock_get.return_value = fake_response

        rsp = self.fetch("/get/pcover?url=http://img1.bcebos.com/test.jpg")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"FAKEIMG")
        mock_get.assert_called_once()
        _, kwargs = mock_get.call_args
        self.assertFalse(kwargs.get("allow_redirects", True))
        self.assertEqual(kwargs.get("timeout"), 10)

    def test_file_scheme_rejected(self):
        """file:// scheme 必须被拒绝，返回 yoho"""
        rsp = self.fetch("/get/pcover?url=file:///etc/passwd")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"yoho")

    def test_ftp_scheme_rejected(self):
        """ftp:// scheme 必须被拒绝，返回 yoho"""
        rsp = self.fetch("/get/pcover?url=ftp://bcebos.com/file.jpg")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"yoho")

    def test_credentials_in_url_rejected(self):
        """包含用户名的 URL（user@host 混淆攻击）必须被拒绝，返回 yoho"""
        rsp = self.fetch("/get/pcover?url=http://evil.com@img1.bcebos.com/img.jpg")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"yoho")

    def test_non_standard_port_rejected(self):
        """非标准端口（不是 80/443）必须被拒绝，返回 yoho"""
        rsp = self.fetch("/get/pcover?url=http://img1.bcebos.com:8080/img.jpg")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"yoho")

    def test_non_whitelist_domain_rejected(self):
        """非白名单域名必须被拒绝，返回 yoho"""
        rsp = self.fetch("/get/pcover?url=http://evil.com/img.jpg")
        self.assertEqual(rsp.code, 200)
        self.assertEqual(rsp.body, b"yoho")

    @mock.patch("requests.get")
    def test_safe_url_rebuilt_without_fragment(self, mock_get):
        """传给 requests.get 的 URL 不应包含 fragment"""
        fake_response = mock.MagicMock()
        fake_response.headers = {}
        fake_response.content = b""
        mock_get.return_value = fake_response

        self.fetch("/get/pcover?url=http://img1.bcebos.com/img.jpg%23evil")
        mock_get.assert_called_once()
        called_url = mock_get.call_args[0][0]
        self.assertNotIn("#", called_url)


class TestProxyImageWhitelist(unittest.TestCase):
    """ProxyImageHandler.is_whitelist 修复验证（直接测试 files.py 中的实现）"""

    PROVIDER_HOSTS = {
        "talebook.meta.baike": {"bcebos.com", "bdstatic.com"},
        "talebook.meta.douban-v2": {"doubanio.com"},
        "talebook.meta.tomato": {"byteimg.com", "fanqienovel.com"},
        "talebook.meta.qimao": {"wtzw.com"},
        "talebook.combo.weread": {"weread.qq.com"},
    }

    def setUp(self):
        from webserver.handlers.files import ProxyImageHandler
        self.handler = ProxyImageHandler.__new__(ProxyImageHandler)

    def test_exact_domain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("bcebos.com"))

    def test_subdomain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("img1.bcebos.com"))

    def test_deep_subdomain_allowed(self):
        self.assertTrue(self.handler.is_whitelist("a.b.doubanio.com"))

    def test_builtin_qimao_cover_cdn_allowed(self):
        self.assertTrue(self.handler.is_whitelist("cdn.wtzw.com"))

    def test_weread_cover_cdn_allowed(self):
        self.assertTrue(self.handler.is_whitelist("cdn.weread.qq.com"))

    def test_suffix_bypass_blocked(self):
        """attackerbcebos.com 以 bcebos.com 结尾，但不是合法子域名，必须被拒绝"""
        self.assertFalse(self.handler.is_whitelist("attackerbcebos.com"))

    def test_suffix_bypass_blocked_douban(self):
        self.assertFalse(self.handler.is_whitelist("evildoubanio.com"))

    def test_suffix_bypass_blocked_weread(self):
        self.assertFalse(self.handler.is_whitelist("evilweread.qq.com"))

    def test_unknown_domain_blocked(self):
        self.assertFalse(self.handler.is_whitelist("evil.com"))

    def test_empty_host_blocked(self):
        self.assertFalse(self.handler.is_whitelist(""))

    def test_each_plugin_owns_its_proxy_image_hosts(self):
        from webserver.services.plugin_runtime import REGISTRY

        for plugin_key, expected_hosts in self.PROVIDER_HOSTS.items():
            provider = REGISTRY.get(plugin_key)
            self.assertEqual(set(provider.proxy_image_hosts), expected_hosts, plugin_key)

    def test_registry_matches_provider_hosts_safely(self):
        from webserver.services.plugin_runtime import REGISTRY

        for hosts in self.PROVIDER_HOSTS.values():
            for host in hosts:
                self.assertTrue(REGISTRY.allows_image_proxy_host(host))
                self.assertTrue(REGISTRY.allows_image_proxy_host("cdn." + host))
                self.assertTrue(REGISTRY.allows_image_proxy_host(("CDN." + host + ".").upper()))
                self.assertFalse(REGISTRY.allows_image_proxy_host("evil" + host))
        self.assertFalse(REGISTRY.allows_image_proxy_host("evil.example"))
        self.assertFalse(REGISTRY.allows_image_proxy_host(""))

    def test_handler_does_not_hardcode_plugin_hosts(self):
        import inspect

        from webserver.handlers.files import ProxyImageHandler

        source = inspect.getsource(ProxyImageHandler)
        self.assertIn("REGISTRY.allows_image_proxy_host(host)", source)
        for hosts in self.PROVIDER_HOSTS.values():
            for host in hosts:
                self.assertNotIn(host, source)
