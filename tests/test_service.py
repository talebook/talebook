#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import tempfile
import zipfile
from pathlib import Path
from unittest import mock

from txt2epub_next import Txt2Epub

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver.services.convert import ConvertService, get_txt2epub_converter
from webserver.services.extract import ExtractService


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

    def test_convert_and_save_rejects_unsafe_output_components(self):
        service = ConvertService()
        unsafe_inputs = (
            ({"id": "../1", "title": "Unsafe"}, "epub"),
            ({"id": 1, "title": "Unsafe"}, "../epub"),
            ({"id": 1, "title": "Unsafe"}, "mobi"),
        )

        with mock.patch.object(service, "do_ebook_convert") as convert:
            for book, output_format in unsafe_inputs:
                with self.subTest(book=book, output_format=output_format):
                    with self.assertRaises(ValueError):
                        service.convert_and_save(1, book, "/tmp/source.epub", output_format)

        convert.assert_not_called()

    def test_convert_and_save_rejects_filesystem_root(self):
        service = ConvertService()
        settings = {"convert_path": os.path.sep, "progress_path": "/tmp"}

        with mock.patch.dict("webserver.services.convert.CONF", settings):
            with mock.patch.object(service, "do_ebook_convert") as convert:
                with self.assertRaises(ValueError):
                    service.convert_and_save(1, {"id": 1, "title": "Unsafe"}, "/tmp/source.epub", "epub")

        convert.assert_not_called()

    def test_convert_and_save_accepts_safe_output_path(self):
        service = ConvertService()

        def create_output(_source, output, _log, book=None):
            Path(output).write_bytes(b"converted")
            return True

        with tempfile.TemporaryDirectory() as directory:
            settings = {"convert_path": directory, "progress_path": directory}
            with mock.patch.dict("webserver.services.convert.CONF", settings):
                with mock.patch.object(service, "setup"):
                    with mock.patch.object(service, "db") as database:
                        with mock.patch.object(service, "do_ebook_convert", side_effect=create_output) as convert:
                            with mock.patch.object(service, "add_msg"):
                                with mock.patch("webserver.services.convert.BackgroundService") as background:
                                    background.return_value.add_task.return_value = None
                                    service.convert_and_save(
                                        1,
                                        {"id": 1, "title": "Safe"},
                                        "/tmp/source.epub",
                                        "EPUB",
                                    )

            output_path = convert.call_args.args[1]
            self.assertEqual(database.add_format.call_args.args[:2], (1, "epub"))
            self.assertEqual(os.path.commonpath([directory, output_path]), directory)
            self.assertFalse(os.path.exists(output_path))


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

    def test_rejects_unsafe_book_id(self):
        with mock.patch("webserver.services.extract.TxtParser") as parser:
            with self.assertRaises(ValueError):
                ExtractService().parse_txt_content("../666", testdir + "/cases/book.txt")

        parser.assert_not_called()

    def test_rejects_filesystem_root_as_extract_root(self):
        with mock.patch.dict("webserver.services.extract.CONF", {"extract_path": os.path.sep}):
            with mock.patch("webserver.services.extract.TxtParser") as parser:
                with self.assertRaises(ValueError):
                    ExtractService().parse_txt_content(666, testdir + "/cases/book.txt")

        parser.assert_not_called()

    def test_rejects_content_symlink_outside_extract_root(self):
        with tempfile.TemporaryDirectory() as directory:
            extract_root = os.path.join(directory, "extract")
            book_dir = os.path.join(extract_root, "666")
            outside_path = os.path.join(directory, "outside.json")
            os.makedirs(book_dir)
            os.symlink(outside_path, os.path.join(book_dir, "content.json"))

            with mock.patch.dict("webserver.services.extract.CONF", {"extract_path": extract_root}):
                with mock.patch("webserver.services.extract.TxtParser") as parser:
                    with self.assertRaises(ValueError):
                        ExtractService().parse_txt_content(666, testdir + "/cases/book.txt")

        parser.assert_not_called()
        self.assertFalse(os.path.exists(outside_path))


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
