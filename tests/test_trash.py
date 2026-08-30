#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import json
import os
import tempfile
from types import SimpleNamespace
from unittest import mock

from tests.test_main import BID_EPUB, TestWithAdminUser, get_db, temporary_book_scope
from tests.test_main import setUpModule as init
from webserver.base.trash_manager import TrashManager
from webserver.models import Reader


def setUpModule():
    init()


class FakeTrashCache:
    def __init__(self, trash_dir, entries=()):
        self.backend = SimpleNamespace(trash_dir=trash_dir)
        self.entries = list(entries)
        self.deleted = []
        self.moved = []
        self.existing = set()

    def list_trash_entries(self):
        return self.entries, []

    def all_book_ids(self):
        return self.existing

    def move_book_from_trash(self, book_id):
        self.moved.append(book_id)

    def delete_trash_entry(self, book_id, category):
        self.deleted.append((book_id, category))


class TestTrashManager:
    def test_list_books_returns_metadata_without_paths(self):
        with tempfile.TemporaryDirectory() as root:
            book_dir = os.path.join(root, "b", "7")
            os.makedirs(book_dir)
            with open(os.path.join(book_dir, "metadata.opf"), "wb") as stream:
                stream.write(b"metadata")
            with open(os.path.join(book_dir, "Example.epub"), "wb") as stream:
                stream.write(b"ebook")
            mtime = datetime.datetime(2026, 8, 30, tzinfo=datetime.timezone.utc).timestamp()
            entry = SimpleNamespace(book_id=7, title="Example", author="Author", mtime=mtime)
            cache = FakeTrashCache(root, [entry])

            items = TrashManager.list_books(cache)

        assert items == [
            {
                "id": 7,
                "title": "Example",
                "author": "Author",
                "deleted_at": "2026-08-30T00:00:00Z",
                "size": 13,
                "formats": ["EPUB"],
            }
        ]
        assert all("path" not in key for key in items[0])

    def test_restore_books_rebuilds_calibre_record_and_files(self):
        from calibre.db.legacy import LibraryDatabase
        from calibre.ebooks.metadata.book.base import Metadata

        fixture = os.path.join(os.path.dirname(__file__), "cases", "new.epub")
        with tempfile.TemporaryDirectory() as library:
            db = LibraryDatabase(library)
            book_id = db.import_book(Metadata("Restorable", ["Tester"]), [fixture])
            db.delete_book(book_id)

            restored, failures = TrashManager.restore_books(db, [book_id])

            books = db.get_data_as_dict(ids=[book_id])
            assert restored == [book_id]
            assert failures == []
            assert books[0]["title"] == "Restorable"
            assert os.path.isfile(books[0]["fmt_epub"])
            assert db.new_api.list_trash_entries()[0] == []

    def test_restore_books_reports_missing_and_conflicting_ids(self):
        entries = [SimpleNamespace(book_id=7), SimpleNamespace(book_id=8)]
        cache = FakeTrashCache("/safe/library/.caltrash", entries)
        cache.existing = {8}
        db = SimpleNamespace(
            new_api=cache,
            data=SimpleNamespace(books_added=mock.Mock()),
            notify=mock.Mock(),
        )

        restored, failures = TrashManager.restore_books(db, [7, 8, 9, 7])

        assert restored == [7]
        assert failures == [
            {"id": 8, "reason": "id_conflict"},
            {"id": 9, "reason": "not_found"},
        ]
        assert cache.moved == [7]
        db.data.books_added.assert_called_once_with((7,))
        db.notify.assert_called_once_with("add", [7])

    def test_delete_books_uses_whole_book_category_and_deduplicates(self):
        cache = FakeTrashCache(
            "/safe/library/.caltrash",
            [SimpleNamespace(book_id=3), SimpleNamespace(book_id=4)],
        )

        deleted, failures = TrashManager.delete_books(cache, [3, 3, 5])

        assert deleted == [3]
        assert failures == [{"id": 5, "reason": "not_found"}]
        assert cache.deleted == [(3, "b")]


class TestAdminTrash(TestWithAdminUser):
    def test_list_uses_admin_only_trash_api(self):
        item = {
            "id": 7,
            "title": "Example",
            "author": "Author",
            "deleted_at": "2026-08-30T00:00:00Z",
            "size": 12,
            "formats": ["EPUB"],
        }
        with mock.patch.object(TrashManager, "list_books", return_value=[item]):
            response = self.json("/api/admin/trash")

        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["items"], [item])
        self.assertEqual(response["total_size"], 12)
        self.assertNotIn("trash_path", response)

    def test_restore_accepts_integer_batch_and_returns_failures(self):
        result = ([7], [{"id": 8, "reason": "id_conflict"}])
        with mock.patch.object(TrashManager, "restore_books", return_value=result) as restore:
            response = self.json(
                "/api/admin/trash",
                method="PATCH",
                body=json.dumps({"idlist": [7, 8]}),
            )

        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["restored"], [7])
        self.assertEqual(response["failures"], result[1])
        restore.assert_called_once_with(self._app.settings["legacy"], [7, 8])

    def test_permanent_delete_requires_confirmation(self):
        with mock.patch.object(TrashManager, "delete_books") as delete:
            response = self.json(
                "/api/admin/trash",
                method="DELETE",
                body=json.dumps({"idlist": [7]}),
                allow_nonstandard_methods=True,
            )

        self.assertEqual(response["err"], "params.confirm")
        delete.assert_not_called()

    def test_permanent_delete_rejects_non_integer_ids(self):
        with mock.patch.object(TrashManager, "delete_books") as delete:
            response = self.json(
                "/api/admin/trash",
                method="DELETE",
                body=json.dumps({"idlist": [True], "confirm": True}),
                allow_nonstandard_methods=True,
            )

        self.assertEqual(response["err"], "params.error.idlist")
        delete.assert_not_called()

    def test_permanent_delete_processes_confirmed_batch(self):
        with mock.patch.object(TrashManager, "delete_books", return_value=([7], [])) as delete:
            response = self.json(
                "/api/admin/trash",
                method="DELETE",
                body=json.dumps({"idlist": [7], "confirm": True}),
                allow_nonstandard_methods=True,
            )

        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["deleted"], [7])
        delete.assert_called_once_with(self._app.settings["legacy"].new_api, [7])

    def test_non_admin_cannot_list_or_operate_trash(self):
        session = get_db()
        user = session.get(Reader, 1)
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            listed = self.json("/api/admin/trash")
            restored = self.json(
                "/api/admin/trash",
                method="PATCH",
                body=json.dumps({"idlist": [7]}),
            )
            deleted = self.json(
                "/api/admin/trash",
                method="DELETE",
                body=json.dumps({"idlist": [7], "confirm": True}),
                allow_nonstandard_methods=True,
            )
        finally:
            session = get_db()
            user = session.get(Reader, 1)
            user.admin = original_admin
            session.commit()

        self.assertEqual(listed["err"], "permission.not_admin")
        self.assertEqual(restored["err"], "permission.not_admin")
        self.assertEqual(deleted["err"], "permission.not_admin")

    def test_private_book_delete_is_permanent(self):
        legacy = self._app.settings["legacy"]
        with temporary_book_scope(BID_EPUB, "private", collector_id=1):
            with mock.patch.object(legacy, "delete_book") as delete_book:
                response = self.json(f"/api/book/{BID_EPUB}/delete", method="POST", body="")

        self.assertEqual(response["err"], "ok")
        delete_book.assert_called_once_with(BID_EPUB, permanent=True)

    def test_public_book_delete_uses_calibre_trash(self):
        legacy = self._app.settings["legacy"]
        with temporary_book_scope(BID_EPUB, "public", collector_id=1):
            with mock.patch.object(legacy, "delete_book") as delete_book:
                response = self.json(f"/api/book/{BID_EPUB}/delete", method="POST", body="")

        self.assertEqual(response["err"], "ok")
        delete_book.assert_called_once_with(BID_EPUB, permanent=False)

    def test_admin_batch_delete_is_permanent_for_private_books(self):
        legacy = self._app.settings["legacy"]
        with temporary_book_scope(BID_EPUB, "private", collector_id=1):
            with mock.patch.object(legacy, "delete_book") as delete_book:
                response = self.json(
                    "/api/admin/book/delete",
                    method="POST",
                    body=json.dumps({"idlist": [BID_EPUB]}),
                )

        self.assertEqual(response["err"], "ok")
        delete_book.assert_called_once_with(BID_EPUB, permanent=True)
