#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock

from tests.test_main import BID_EPUB, TestWithUserLogin, get_db, setUpModule as init


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


class TestBookWantToRead(TestWithUserLogin):
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

    def test_wants_post(self):
        self._clear_reading_state(BID_EPUB)
        try:
            body = json.dumps({"wants": True})
            d = self.json("/api/book/%d/wants" % BID_EPUB, method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            self._clear_reading_state(BID_EPUB)

    def test_wants_list(self):
        d = self.json("/api/wants")
        self.assertEqual(d["err"], "ok")
        self.assertIn("books", d)
        self.assertIn("total", d)

    def test_wants_nonexistent_book(self):
        body = json.dumps({"wants": True})
        d = self.json("/api/book/99999/wants", method="POST", body=body)
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
