#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from tests.test_main import TestWithUserLogin, testdir
from tests.test_main import setUpModule as init
from webserver.services.convert import ConvertService
from webserver.services.extract import ExtractService


def setUpModule():
    init()


class TestConvert(TestWithUserLogin):
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
