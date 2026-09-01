#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""网络小说保存到本地书库测试。"""

import json
import threading
import time
from unittest import mock

import pytest

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

    @staticmethod
    def _restore_connection_config(connection_id, config):
        session = get_db()
        connection = session.get(models.PluginConnection, connection_id)
        connection.config = config
        session.commit()

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

        source_key = "legado:%d" % self.sid
        self.json("/api/book-sources")
        session = get_db()
        connection = (
            session.query(models.PluginConnection)
            .join(models.PluginInstallation, models.PluginInstallation.id == models.PluginConnection.installation_id)
            .filter(models.PluginInstallation.plugin_key == "talebook.source.legado")
            .one()
        )
        original_config = dict(connection.config or {})
        connection.config = {**original_config, "save_concurrency": 3}
        session.commit()
        self.addCleanup(self._restore_connection_config, connection.id, original_config)

        from webserver.services.booksource.save_service import assemble_from_chapters

        body = json.dumps({"source_id": source_key, "book_url": "/book/1001", "fmt": "txt", "clean": True})
        with mock.patch(
            "webserver.services.booksource.save_service.assemble_from_chapters",
            wraps=assemble_from_chapters,
        ) as assemble:
            d = self.json("/api/book-sources/save", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["tag"], "online_save:%s:/book/1001" % source_key)
        self.assertEqual(assemble.call_args.kwargs["max_workers"], 3)

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


def test_chapter_assembly_fetches_concurrently_and_preserves_toc_order(tmp_path):
    from webserver.plugins.runtime.domains import SourceBookDetail, SourceChapter, SourceContent
    from webserver.services.booksource.save_service import assemble_from_chapters

    detail = SourceBookDetail(external_id="book", title="并发测试", authors=("作者",))
    chapters = [SourceChapter(external_id=str(index), title="第%d章" % index) for index in range(6)]
    lock = threading.Lock()
    active = 0
    peak = 0

    def get_chapter(chapter):
        nonlocal active, peak
        with lock:
            active += 1
            peak = max(peak, active)
        time.sleep(0.03)
        with lock:
            active -= 1
        return SourceContent(title=chapter.title, content="正文%s" % chapter.external_id)

    output = tmp_path / "concurrent.txt"
    assemble_from_chapters(detail, chapters, get_chapter, str(output), max_workers=3)

    assert peak == 3
    text = output.read_text(encoding="utf-8")
    positions = [text.index("正文%d" % index) for index in range(6)]
    assert positions == sorted(positions)


def test_chapter_assembly_requeues_exceptions_and_blank_content(tmp_path):
    from webserver.plugins.runtime.domains import SourceBookDetail, SourceChapter, SourceContent
    from webserver.services.booksource.save_service import assemble_from_chapters

    detail = SourceBookDetail(external_id="book", title="重试测试", authors=("作者",))
    chapters = [SourceChapter(external_id="exception", title="异常章"), SourceChapter(external_id="blank", title="空章")]
    attempts = {chapter.external_id: 0 for chapter in chapters}

    def get_chapter(chapter):
        attempts[chapter.external_id] += 1
        if attempts[chapter.external_id] == 1:
            if chapter.external_id == "exception":
                raise RuntimeError("上游暂时失败")
            return SourceContent(title=chapter.title, content="  ")
        return SourceContent(title=chapter.title, content="恢复正文-%s" % chapter.external_id)

    output = tmp_path / "retried.txt"
    assemble_from_chapters(detail, chapters, get_chapter, str(output), max_workers=2)

    assert attempts == {"exception": 2, "blank": 2}
    text = output.read_text(encoding="utf-8")
    assert "恢复正文-exception" in text
    assert "恢复正文-blank" in text


def test_chapter_assembly_rejects_an_entirely_failed_download(tmp_path):
    from webserver.plugins.runtime.domains import SourceBookDetail, SourceChapter
    from webserver.services.booksource.save_service import assemble_from_chapters

    detail = SourceBookDetail(external_id="book", title="失败测试", authors=("作者",))
    chapters = [SourceChapter(external_id="one", title="第一章"), SourceChapter(external_id="two", title="第二章")]
    attempts = 0

    def fail(_chapter):
        nonlocal attempts
        attempts += 1
        raise RuntimeError("上游不可用")

    with pytest.raises(RuntimeError, match="所有章节下载失败"):
        assemble_from_chapters(detail, chapters, fail, str(tmp_path / "failed.txt"), max_workers=2)

    assert attempts == 6


def test_chapter_assembly_keeps_partial_content_when_one_chapter_fails(tmp_path):
    from webserver.plugins.runtime.domains import SourceBookDetail, SourceChapter, SourceContent
    from webserver.services.booksource.save_service import assemble_from_chapters

    detail = SourceBookDetail(external_id="book", title="测试书", authors=("作者",))
    chapters = [SourceChapter(external_id="one", title="第一章"), SourceChapter(external_id="two", title="第二章")]

    def get_chapter(chapter):
        if chapter.external_id == "two":
            raise RuntimeError("上游暂时失败")
        return SourceContent(title=chapter.title, content="第一章正文")

    output = tmp_path / "assembled.txt"
    assemble_from_chapters(detail, chapters, get_chapter, str(output))

    text = output.read_text(encoding="utf-8")
    assert "第一章正文" in text
    assert "第二章" in text
