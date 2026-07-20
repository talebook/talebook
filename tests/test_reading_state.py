#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock

from tests.test_main import BID_EPUB, TestWithUserLogin, get_db, setUpModule as init, temporary_book_scope


def setUpModule():
    init()


class TestBookReadingState(TestWithUserLogin):
    def _clear_reading_state(self, book_id, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if state:
            session.delete(state)
            session.commit()

    def test_readstate_get_no_state(self):
        self._clear_reading_state(BID_EPUB)
        d = self.json("/api/book/%d/readstate" % BID_EPUB)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["read_state"], 0)
        self.assertFalse(d["favorite"])
        self.assertFalse(d["wants"])

    def test_readstate_post_set_reading(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"read_state": 1})
            d = self.json("/api/book/%d/readstate" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")

            d = self.json("/api/book/%d/readstate" % BID_EPUB)
            self.assertEqual(d["read_state"], 1)
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_readstate_post_set_read_done(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"read_state": 2})
            d = self.json("/api/book/%d/readstate" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_readstate_post_invalid_state(self):
        body = json.dumps({"read_state": 99})
        d = self.json("/api/book/%d/readstate" % BID_EPUB, method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_readstate_post_nonexistent_book(self):
        body = json.dumps({"read_state": 1})
        d = self.json("/api/book/99999/readstate", method="POST", body=body)
        self.assertEqual(d["err"], "params.book.invalid")


class TestBookFavorite(TestWithUserLogin):
    def _clear_reading_state(self, book_id, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if state:
            session.delete(state)
            session.commit()

    def test_favorite_post(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"favorite": True})
            d = self.json("/api/book/%d/favorite" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_favorite_unfavorite(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"favorite": True})
            self.json("/api/book/%d/favorite" % BID_EPUB, method="POST", body=body)
            body = json.dumps({"favorite": False})
            d = self.json("/api/book/%d/favorite" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_favorites_list(self):
        d = self.json("/api/favorites")
        self.assertEqual(d["err"], "ok")
        self.assertIn("books", d)
        self.assertIn("total", d)

    def test_favorite_nonexistent_book(self):
        body = json.dumps({"favorite": True})
        d = self.json("/api/book/99999/favorite", method="POST", body=body)
        self.assertEqual(d["err"], "params.book.invalid")


class TestBookShelf(TestWithUserLogin):
    def _clear_reading_state(self, book_id, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if state:
            session.delete(state)
            session.commit()

    def test_shelf_post(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"shelf": True})
            d = self.json("/api/book/%d/shelf" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_shelf_list(self):
        d = self.json("/api/shelf")
        self.assertEqual(d["err"], "ok")
        self.assertIn("books", d)
        self.assertIn("total", d)

    def test_shelf_post_and_list(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"shelf": True})
            d = self.json("/api/book/%d/shelf" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["msg"], "加入书架成功")

            d = self.json("/api/shelf")
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["title"], "我的书架")
            self.assertIn("books", d)
            self.assertIn("total", d)
            self.assertTrue(any(book["id"] == BID_EPUB for book in d["books"]))

            body = json.dumps({"shelf": False})
            d = self.json("/api/book/%d/shelf" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["msg"], "移除书架成功")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_shelf_nonexistent_book(self):
        body = json.dumps({"shelf": True})
        d = self.json("/api/book/99999/shelf", method="POST", body=body)
        self.assertEqual(d["err"], "params.book.invalid")


class TestBookReadingProgress(TestWithUserLogin):
    def _clear_reading_state(self, book_id, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if state:
            session.delete(state)
            session.commit()

    def test_progress_get_no_state(self):
        self._clear_reading_state(BID_EPUB)
        d = self.json("/api/book/%d/progress" % BID_EPUB)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["progress"], {})
        self.assertIsNone(d["update_time"])

    def test_progress_post_and_get(self):
        self._clear_reading_state(BID_EPUB)
        try:
            progress = {"cfi": "epubcfi(/6/4!/4/2/2)", "percentage": 12.5, "device": "iPhone"}
            body = json.dumps({"progress": progress})
            d = self.json("/api/book/%d/progress" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["progress"], progress)

            d = self.json("/api/book/%d/progress" % BID_EPUB)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["progress"], progress)
            self.assertIsNotNone(d["update_time"])
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_progress_post_overwrites_previous(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"progress": {"percentage": 10}})
            self.json("/api/book/%d/progress" % BID_EPUB, method="POST", body=body)

            body = json.dumps({"progress": {"percentage": 50}})
            d = self.json("/api/book/%d/progress" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")

            d = self.json("/api/book/%d/progress" % BID_EPUB)
            self.assertEqual(d["progress"]["percentage"], 50)
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_progress_post_invalid_payload(self):
        body = json.dumps({"progress": "not-a-dict"})
        d = self.json("/api/book/%d/progress" % BID_EPUB, method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_progress_post_too_large(self):
        body = json.dumps({"progress": {"blob": "x" * 9000}})
        d = self.json("/api/book/%d/progress" % BID_EPUB, method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_progress_post_nonexistent_book(self):
        body = json.dumps({"progress": {"percentage": 1}})
        d = self.json("/api/book/99999/progress", method="POST", body=body)
        self.assertEqual(d["err"], "params.book.invalid")


class TestReadingLists(TestWithUserLogin):
    def test_reading_list(self):
        d = self.json("/api/reading")
        self.assertEqual(d["err"], "ok")
        self.assertIn("books", d)

    def test_read_done_list(self):
        d = self.json("/api/read-done")
        self.assertEqual(d["err"], "ok")
        self.assertIn("books", d)

    def test_reading_stats(self):
        d = self.json("/api/reading/stats")
        self.assertEqual(d["err"], "ok")
        self.assertIn("stats", d)
        stats = d["stats"]
        self.assertIn("total_reading", stats)
        self.assertIn("total_read_done", stats)
        self.assertIn("month_reading", stats)
        self.assertIn("month_read_done", stats)


class TestBookListReadState(TestWithUserLogin):
    def _set_read_state(self, book_id, read_state, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if not state:
            state = ReadingState(book_id, reader_id)
            session.add(state)
        state.set_read_state(read_state)
        session.commit()

    def _clear_reading_state(self, book_id, reader_id=1):
        from webserver.models import ReadingState

        session = get_db()
        state = (
            session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == reader_id)
            .first()
        )
        if state:
            session.delete(state)
            session.commit()

    def test_index_marks_read_done_book(self):
        self._set_read_state(BID_EPUB, 2)
        try:
            d = self.json("/api/index?random=1&recent=30")
            books = d["new_books"] + d["random_books"]
            book = next((b for b in books if b["id"] == BID_EPUB), None)
            self.assertIsNotNone(book)
            self.assertIn("state", book)
            self.assertEqual(book["state"]["read_state"], 2)
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_scopedbooks_stream_marks_read_done_book(self):
        self._set_read_state(BID_EPUB, 2)
        try:
            with temporary_book_scope(BID_EPUB, "private", collector_id=1):
                rsp = self.fetch("/api/scopedbooks?stream=1")
                self.assertEqual(rsp.code, 200)
                lines = [json.loads(line) for line in rsp.body.decode("utf-8").splitlines()]
                self.assertEqual(lines[0]["err"], "ok")
                book = next((line for line in lines[1:] if line["id"] == BID_EPUB), None)
                self.assertIsNotNone(book)
                self.assertEqual(book["state"]["read_state"], 2)
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_recent_marks_read_done_book(self):
        self._set_read_state(BID_EPUB, 2)
        try:
            d = self.json("/api/recent")
            book = next(b for b in d["books"] if b["id"] == BID_EPUB)
            self.assertIn("state", book)
            self.assertEqual(book["state"]["read_state"], 2)
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_recent_defaults_to_unread(self):
        self._clear_reading_state(BID_EPUB)
        d = self.json("/api/recent")
        book = next(b for b in d["books"] if b["id"] == BID_EPUB)
        self.assertIn("state", book)
        self.assertEqual(book["state"]["read_state"], 0)


class TestBookDetailWithReadingState(TestWithUserLogin):
    def test_book_detail_no_state(self):
        from webserver.models import ReadingState

        session = get_db()
        state = session.query(ReadingState).filter(ReadingState.book_id == BID_EPUB, ReadingState.reader_id == 1).first()
        if state:
            session.delete(state)
            session.commit()
        d = self.json("/api/book/%d" % BID_EPUB)
        self.assertEqual(d["err"], "ok")
        self.assertNotIn("state", d["book"])

    def test_book_detail_with_state(self):
        from webserver.models import ReadingState

        session = get_db()
        state = ReadingState(BID_EPUB, 1)
        state.set_favorite(True)
        session.add(state)
        session.commit()
        try:
            d = self.json("/api/book/%d" % BID_EPUB)
            self.assertEqual(d["err"], "ok")
            self.assertIn("state", d["book"])
            self.assertEqual(d["book"]["state"]["favorite"], 1)
        finally:
            session.delete(state)
            session.commit()
