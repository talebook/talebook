#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络小说保存到本地书库测试。"""

import json
from unittest import mock

from tests.test_booksource_admin import CSS_SOURCE
from tests.test_booksource_engine import FakeSession, text
from tests.test_main import TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver import models


def setUpModule():
    init()


FAKE_BOOK_ID = 909090


class TestNetworkSave(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = get_db()
        session.query(models.BookSourceModel).delete()
        session.query(models.OnlineBookMeta).filter(models.OnlineBookMeta.book_id == FAKE_BOOK_ID).delete()
        session.commit()
        source = models.BookSourceModel(CSS_SOURCE)
        source.save()
        self.sid = source.id

    def _fake_session(self):
        # 更具体的路径放前面：/book/1001/toc、/book/1001/c/1 不能被 /book/1001 抢先命中
        return FakeSession(
            {
                "/c/": text("content.html"),
                "/toc": text("toc.html"),
                "/book/1001": text("bookinfo.html"),
            }
        )

    @mock.patch("webserver.services.AsyncService.async_mode", return_value=False)
    @mock.patch("webserver.services.booksource.engine.build_session")
    @mock.patch("calibre.db.legacy.LibraryDatabase.set_cover")
    @mock.patch("calibre.db.legacy.LibraryDatabase.get_metadata")
    @mock.patch("calibre.db.legacy.LibraryDatabase.books_with_same_title", return_value=[])
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book", return_value=FAKE_BOOK_ID)
    def test_save_txt(self, m_import, m_same, m_meta, m_cover, m_session, m_async):
        m_session.return_value = self._fake_session()
        m_meta.return_value = mock.MagicMock(cover_data=None)

        body = json.dumps({"source_id": self.sid, "book_url": "/book/1001", "fmt": "txt", "clean": True})
        d = self.json("/api/network/save", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["tag"], "online_save:%d:/book/1001" % self.sid)

        m_import.assert_called()
        meta = get_db().query(models.OnlineBookMeta).filter(models.OnlineBookMeta.book_id == FAKE_BOOK_ID).first()
        self.assertIsNotNone(meta)
        # toc.html 末章为"第3章 大结局" -> 判定为已完本
        self.assertEqual(meta.serialize_status, "finished")

        item = get_db().query(models.Item).filter(models.Item.book_id == FAKE_BOOK_ID).first()
        self.assertIsNotNone(item)
        self.assertEqual(item.book_type, "online")

    @mock.patch("webserver.services.booksource.save_service.ConvertService")
    @mock.patch("webserver.services.AsyncService.async_mode", return_value=False)
    @mock.patch("webserver.services.booksource.engine.build_session")
    @mock.patch("calibre.db.legacy.LibraryDatabase.set_cover")
    @mock.patch("calibre.db.legacy.LibraryDatabase.get_metadata")
    @mock.patch("calibre.db.legacy.LibraryDatabase.books_with_same_title", return_value=[])
    @mock.patch("calibre.db.legacy.LibraryDatabase.import_book", return_value=FAKE_BOOK_ID)
    def test_save_epub_triggers_convert(self, m_import, m_same, m_meta, m_cover, m_session, m_async, m_convert):
        m_session.return_value = self._fake_session()
        m_meta.return_value = mock.MagicMock(cover_data=None)

        body = json.dumps({"source_id": self.sid, "book_url": "/book/1001", "fmt": "epub", "clean": True})
        d = self.json("/api/network/save", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        m_convert.return_value.convert_and_save.assert_called_once()

    def test_save_source_not_found(self):
        body = json.dumps({"source_id": 99999, "book_url": "/x", "fmt": "txt"})
        d = self.json("/api/network/save", method="POST", body=body)
        self.assertEqual(d["err"], "params.not_found")

    def test_save_bad_format(self):
        body = json.dumps({"source_id": self.sid, "book_url": "/book/1001", "fmt": "mobi"})
        d = self.json("/api/network/save", method="POST", body=body)
        self.assertEqual(d["err"], "params.error")

    def test_save_status_not_found(self):
        d = self.json("/api/network/save/status?source_id=%d&book_url=/none" % self.sid)
        self.assertEqual(d["err"], "ok")
        self.assertFalse(d["found"])

    def test_save_status_reports_progress(self):
        from webserver.services.background_service import BackgroundService, BackgroundTask
        from webserver.services.booksource.save_service import SaveOnlineBookService

        tag = SaveOnlineBookService.make_tag(self.sid, "/book/2002")
        task = BackgroundService().add_task(BackgroundTask.SERVICE_TYPE_ONLINE_SAVE, "[online]x", tag=tag)
        BackgroundService().update_progress(task.id, 40, {"total": 100, "done": 40})

        d = self.json("/api/network/save/status?source_id=%d&book_url=/book/2002" % self.sid)
        self.assertEqual(d["err"], "ok")
        self.assertTrue(d["found"])
        self.assertEqual(d["status"], "running")
        self.assertEqual(d["done"], 40)
        self.assertEqual(d["total"], 100)
