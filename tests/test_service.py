#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import tempfile
import zipfile
from pathlib import Path
from unittest import mock

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver.services.convert import ConvertService, get_txt2epub_converter
from webserver.services.extract import ExtractService
from txt2epub_next import Txt2Epub


def setUpModule():
    init()


class TestConvert(TestWithUserLogin):
    def test_conversion_options_reflect_book_formats(self):
        available = ConvertService.get_conversion_options({"fmt_txt": "/tmp/story.txt"})
        missing_source = ConvertService.get_conversion_options({})
        existing_target = ConvertService.get_conversion_options({"fmt_txt": "/tmp/story.txt", "fmt_epub": "/tmp/story.epub"})

        available_epub = next(option for option in available if option["target_format"] == "epub")
        missing_epub = next(option for option in missing_source if option["target_format"] == "epub")
        existing_epub = next(option for option in existing_target if option["target_format"] == "epub")

        self.assertEqual(available_epub["source_format"], "txt")
        self.assertEqual(available_epub["reason"], None)
        self.assertTrue(available_epub["available"])
        self.assertEqual(missing_epub["reason"], "source_missing")
        self.assertEqual(existing_epub["reason"], "target_exists")

    def test_conversion_options_restore_epub_outputs(self):
        options = ConvertService.get_conversion_options({"fmt_epub": "/tmp/story.epub"})
        available = {(option["source_format"], option["target_format"]) for option in options if option["available"]}

        self.assertEqual(available, {("epub", "azw3"), ("epub", "pdf")})

    def test_conversion_options_choose_one_source_for_each_target(self):
        options = ConvertService.get_conversion_options(
            {
                "fmt_epub": "/tmp/story.epub",
                "fmt_azw3": "/tmp/story.azw3",
                "fmt_mobi": "/tmp/story.mobi",
            }
        )
        pdf = next(option for option in options if option["target_format"] == "pdf")

        self.assertEqual(pdf["source_format"], "epub")

    def test_txt_to_epub_generates_epub(self):
        service = ConvertService()
        with tempfile.TemporaryDirectory() as directory:
            source = os.path.join(directory, "story.txt")
            output = os.path.join(directory, "story.epub")
            with open(source, "w", encoding="utf-8") as text:
                text.write("第一章 开始\n\n这是正文。")

            ok = service.do_txt_to_epub(source, output, {"title": "Talebook TXT", "authors": ["Alice"]})

            self.assertTrue(ok)
            self.assertTrue(os.path.isfile(output))
            with zipfile.ZipFile(output) as epub:
                self.assertIn("mimetype", epub.namelist())

    def test_txt2epub_loader_uses_published_package(self):
        self.assertIs(get_txt2epub_converter(), Txt2Epub)

    def test_txt_to_epub_uses_published_converter(self):
        service = ConvertService()
        book = {"title": "Talebook TXT", "authors": ["Alice", "Bob"]}
        with mock.patch("webserver.services.convert.get_txt2epub_converter") as get_converter:
            get_converter.return_value.create_epub.return_value = True

            ok = service.do_txt_to_epub("/tmp/story.txt", "/tmp/story.epub", book)

        self.assertTrue(ok)
        get_converter.return_value.create_epub.assert_called_once_with(
            input_file=Path("/tmp/story.txt"),
            output_file=Path("/tmp/story.epub"),
            book_title="Talebook TXT",
            book_author="Alice, Bob",
            overwrite=True,
        )

    def test_txt_to_epub_routes_away_from_calibre(self):
        service = ConvertService()
        with mock.patch.object(service, "do_txt_to_epub", return_value=True) as convert_txt:
            with tempfile.TemporaryDirectory() as directory:
                log_path = os.path.join(directory, "txt2epub.log")
                ok = service.do_ebook_convert("/tmp/story.txt", "/tmp/story.epub", log_path, {"title": "TXT"})

        self.assertTrue(ok)
        convert_txt.assert_called_once_with("/tmp/story.txt", "/tmp/story.epub", {"title": "TXT"})

    def test_convert(self):
        fin = testdir + "/cases/old.epub"
        fout = "/tmp/output.mobi"
        flog = "/tmp/output.log"
        ok = ConvertService().do_ebook_convert(fin, fout, flog)
        self.assertEqual(ok, True)


class TestExtract(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        import shutil

        shutil.rmtree("/tmp/666", ignore_errors=True)

    def tearDown(self):
        import shutil

        shutil.rmtree("/tmp/666", ignore_errors=True)
        super().tearDown()

    def test_convert(self):
        bid = 666
        fpath = testdir + "/cases/book.txt"
        ok = ExtractService().parse_txt_content(bid, fpath)
        self.assertEqual(ok, True)


class TestAsyncServiceSession(TestWithUserLogin):
    """session 重构后的回归：AsyncService.session 按线程隔离，任务结束后可关闭"""

    def test_session_is_thread_local(self):
        import threading

        from webserver.services import AsyncService

        service = AsyncService()
        main_session = service.session
        # 同一线程内重复访问，拿到同一个 session
        self.assertIs(service.session, main_session)

        result = {}

        def worker():
            result["session"] = service.session
            service.close_session()

        t = threading.Thread(target=worker)
        t.start()
        t.join()

        # 其它线程拿到的是不同的 session
        self.assertIsNot(result["session"], main_session)

        # close_session 后再次访问会创建新 session
        service.close_session()
        self.assertIsNot(service.session, main_session)
        service.close_session()

    def test_add_msg_commits_to_db(self):
        from tests.test_main import get_db
        from webserver import models
        from webserver.services import AsyncService

        service = AsyncService()
        service.add_msg(1, "success", "unittest-async-msg")
        service.close_session()

        session = get_db()
        msgs = session.query(models.Message).filter(models.Message.reader_id == 1).all()
        msg = next((m for m in msgs if m.data.get("message") == "unittest-async-msg"), None)
        self.assertIsNotNone(msg)
        session.delete(msg)
        session.commit()
