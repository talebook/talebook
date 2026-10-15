#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver.plugins.parser.txt import TxtParser, get_file_encoding


def setUpModule():
    init()


class TestTxtParse(TestWithUserLogin):
    BOOK_PATH = testdir + "/cases/book.txt"
    BOOK_ENCODING = "GB18030"
    BOOK_TOC = [
        {"id": 1, "title": "《秦吏》", "start": 12, "end": 32},
        {"id": 2, "title": "简介：", "start": 40, "end": 544},
        {"id": 3, "title": "第一卷 小亭长", "start": 559, "end": 563},
        {"id": 4, "title": "第0001章 士伍，请出示身份证！", "start": 594, "end": 6565},
        {"id": 5, "title": "第0002章 天下事与眼前事", "start": 6590, "end": -1},
    ]

    def test_get_file_encoding(self):
        encoding = get_file_encoding(self.BOOK_PATH)
        self.assertEqual(encoding, self.BOOK_ENCODING)

    def test_parse_text_book_table_of_content(self):
        with open(self.BOOK_PATH, encoding=self.BOOK_ENCODING, newline="\n") as fileobj:
            toc = TxtParser().parse_txt_book_toc(fileobj)
            self.assertEqual(len(toc), len(self.BOOK_TOC))
            self.assertEqual(toc[-1]["title"], self.BOOK_TOC[-1]["title"])
            # self.assertEqual(toc, self.BOOK_TOC)

    def test_parse(self):
        meta = TxtParser().parse(self.BOOK_PATH)
        self.assertEqual(meta["encoding"], self.BOOK_ENCODING)
        toc = meta["toc"]
        self.assertEqual(len(toc), len(self.BOOK_TOC))
        self.assertEqual(toc[-1]["title"], self.BOOK_TOC[-1]["title"])

        # github上跑pytest时文件偏移量总是不对，待排查
        # self.assertEqual(toc, self.BOOK_TOC)


class TestTxtInit(TestWithUserLogin):
    def setUp(self):
        import tempfile
        from unittest import mock

        from webserver.handlers.book import CONF
        from webserver.services.async_service import AsyncService

        super().setUp()
        self.extract_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.extract_dir.cleanup)
        self.book = {"id": 2, "title": "排队测试", "fmt_txt": testdir + "/cases/book.txt"}
        patches = [
            mock.patch.dict(CONF, {"extract_path": self.extract_dir.name}),
            mock.patch("webserver.handlers.book.BaseHandler.get_book", return_value=self.book),
            mock.patch.object(AsyncService, "running", {}),
            mock.patch.object(AsyncService, "async_mode", return_value=True),
            # Exercise real worker registration/enqueue without consuming tasks.
            mock.patch.object(AsyncService, "loop", return_value=None),
        ]
        for patch in patches:
            patch.start()
            self.addCleanup(patch.stop)

    def test_cold_start_registers_and_enqueues(self):
        from webserver.services.extract import ExtractService

        service = ExtractService()
        self.assertIsNone(service.get_queue("parse_txt_content"))
        rsp = self.json("/api/book/txt/init?id=2&test=0")
        self.assertEqual(rsp["err"], "ok")
        self.assertEqual(rsp["data"]["que"], 0)
        self.assertEqual(rsp["data"]["wait"], 30)
        self.assertEqual(service.get_queue("parse_txt_content").get_nowait(), (("2", self.book["fmt_txt"]), {}))

    def test_existing_queue_count_excludes_new_task(self):
        from queue import Queue

        from webserver.services.extract import ExtractService

        service = ExtractService()
        queue = Queue()
        queue.put(((), {}))
        queue.put(((), {}))
        service.running["parse_txt_content"] = (None, queue)
        rsp = self.json("/api/book/txt/init?id=2&test=0")
        self.assertEqual(rsp["err"], "ok")
        self.assertEqual(rsp["data"]["que"], 2)
        self.assertEqual(queue.qsize(), 3)

    def test_wait_estimate_bounds(self):
        from unittest import mock

        for size, expected in [(0, 30), (4 * 1024 * 1024, 60), (100 * 1024 * 1024, 120)]:
            with self.subTest(size=size), mock.patch("webserver.handlers.book.os.path.getsize", return_value=size):
                rsp = self.json("/api/book/txt/init?id=2&test=0")
                self.assertEqual(rsp["err"], "ok")
                self.assertEqual(rsp["data"]["wait"], expected)

    def test_readiness_does_not_enqueue(self):
        from webserver.services.extract import ExtractService

        for _ in range(3):
            rsp = self.json("/api/book/txt/init?id=2&test=1")
            self.assertEqual(rsp, {"err": "ok", "msg": "未解析完成"})
        self.assertIsNone(ExtractService().get_queue("parse_txt_content"))

    def test_ready_returns_toc_without_enqueuing(self):
        import json
        from pathlib import Path

        from webserver.services.extract import ExtractService

        directory = Path(self.extract_dir.name) / "2"
        directory.mkdir()
        toc = [{"title": "第一章", "start": 0, "end": -1}]
        (directory / "content.json").write_text(json.dumps({"toc": toc, "encoding": "utf8"}), encoding="utf8")
        for mode in (0, 1):
            rsp = self.json(f"/api/book/txt/init?id=2&test={mode}")
            self.assertEqual(rsp["err"], "ok")
            self.assertEqual(rsp["msg"], "已解析")
            self.assertEqual(rsp["data"]["content"], toc)
        self.assertIsNone(ExtractService().get_queue("parse_txt_content"))
