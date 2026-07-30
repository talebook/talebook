#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""Security regression tests for book write endpoint ownership checks."""

import contextlib
import json
from unittest import mock

from tests.test_main import BID_EPUB, TestWithUserLogin, get_db, setUpModule as init, temporary_book_scope
from webserver.handlers.base import BaseHandler
from webserver.models import Item


def setUpModule():
    init()


@contextlib.contextmanager
def temporary_book_without_item(book_id):
    """Remove an Item for one request, then restore its complete row."""
    session = get_db()
    item = session.get(Item, book_id)
    snapshot = None
    if item:
        snapshot = {column.name: getattr(item, column.name) for column in Item.__table__.columns}
        session.delete(item)
        session.commit()

    try:
        yield
    finally:
        session = get_db()
        current = session.get(Item, book_id)
        if current:
            session.delete(current)
            session.commit()
        if snapshot:
            restored = Item()
            for key, value in snapshot.items():
                setattr(restored, key, value)
            session.add(restored)
            session.commit()


class TestBookWritePermissions(TestWithUserLogin):
    """A user with write capabilities still cannot mutate another user's book."""

    def test_non_owner_cannot_edit_book(self):
        legacy = self._app.settings["legacy"]
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                with mock.patch.object(legacy, "set_metadata") as set_metadata:
                    d = self.json(
                        f"/api/book/{BID_EPUB}/edit",
                        method="POST",
                        body=json.dumps({"title": "unauthorized"}),
                    )

        self.assertEqual(d["err"], "permission")
        set_metadata.assert_not_called()

    def test_non_owner_cannot_delete_book(self):
        legacy = self._app.settings["legacy"]
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                with mock.patch.object(legacy, "delete_book") as delete_book:
                    d = self.json(f"/api/book/{BID_EPUB}/delete", method="POST", body="")

        self.assertEqual(d["err"], "permission")
        delete_book.assert_not_called()

    def test_non_owner_cannot_set_book_scope(self):
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                d = self.json(f"/api/book/{BID_EPUB}/setscope", method="POST", body="")

            item = get_db().get(Item, BID_EPUB)
            self.assertEqual(item.scope, "public")
            self.assertEqual(item.collector_id, 1)

        self.assertEqual(d["err"], "permission")

    def test_non_owner_cannot_delete_book_format(self):
        cache = self._app.settings["legacy"].new_api
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                with mock.patch.object(cache, "remove_formats") as remove_formats:
                    d = self.json(
                        f"/api/book/{BID_EPUB}/delete_format",
                        method="POST",
                        body=json.dumps({"format": "epub"}),
                    )

        self.assertEqual(d["err"], "permission")
        remove_formats.assert_not_called()

    def test_non_owner_cannot_separate_book_format(self):
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                with mock.patch("webserver.handlers.book.shutil.copy2") as copy_format:
                    d = self.json(
                        f"/api/book/{BID_EPUB}/separate",
                        method="POST",
                        body=json.dumps({"format": "epub"}),
                    )

        self.assertEqual(d["err"], "permission")
        copy_format.assert_not_called()

    def test_set_scope_new_item_uses_current_admin_as_collector(self):
        with temporary_book_without_item(BID_EPUB):
            with mock.patch.object(BaseHandler, "user_id", return_value=30):
                d = self.json(f"/api/book/{BID_EPUB}/setscope", method="POST", body="")

            item = get_db().get(Item, BID_EPUB)
            self.assertEqual(item.scope, "private")
            self.assertEqual(item.collector_id, 30)

        self.assertEqual(d["err"], "ok")
