#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""Tests for book format management endpoints."""

import json
import os
from unittest import mock

from tests.test_main import (
    BID_AZW3,
    BID_EPUB,
    BID_MOBI,
    BID_PDF,
    BID_TXT,
    TestWithAdminUser,
    TestWithUserLogin,
    get_db,
    setUpModule as init,
    testdir,
)

from webserver.handlers.base import BaseHandler
from webserver.models import Reader


def setUpModule():
    init()


class TestBookDeleteFormat(TestWithUserLogin):
    """POST /api/book/:id/delete_format"""

    def test_missing_format_param(self):
        d = self.json(f"/api/book/{BID_EPUB}/delete_format", method="POST", body=json.dumps({}))
        self.assertEqual(d["err"], "params.missing")

    def test_invalid_json_body(self):
        d = self.json(f"/api/book/{BID_EPUB}/delete_format", method="POST", body="not json")
        self.assertEqual(d["err"], "params.invalid")

    def test_format_not_found(self):
        d = self.json(
            f"/api/book/{BID_EPUB}/delete_format",
            method="POST",
            body=json.dumps({"format": "pdf"}),
        )
        self.assertEqual(d["err"], "format.not_found")

    def test_cannot_delete_last_format(self):
        d = self.json(
            f"/api/book/{BID_EPUB}/delete_format",
            method="POST",
            body=json.dumps({"format": "epub"}),
        )
        self.assertEqual(d["err"], "last.format")

    def test_delete_format_success(self):
        cache = self._app.settings["legacy"].new_api
        with mock.patch.object(cache, "remove_formats", return_value=None) as mock_remove:
            mock_book = {
                "id": BID_EPUB,
                "title": "Test Book",
                "collector": {"id": 1},
                "fmt_epub": "/tmp/test.epub",
                "fmt_azw3": "/tmp/test.azw3",
                "available_formats": ["EPUB", "AZW3"],
            }
            with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
                d = self.json(
                    f"/api/book/{BID_EPUB}/delete_format",
                    method="POST",
                    body=json.dumps({"format": "azw3"}),
                )
                self.assertEqual(d["err"], "ok")
                mock_remove.assert_called_once_with({BID_EPUB: ["AZW3"]})


class TestBookSeparate(TestWithUserLogin):
    """POST /api/book/:id/separate"""

    def test_missing_format_param(self):
        d = self.json(f"/api/book/{BID_EPUB}/separate", method="POST", body=json.dumps({}))
        self.assertEqual(d["err"], "params.missing")

    def test_invalid_json_body(self):
        d = self.json(f"/api/book/{BID_EPUB}/separate", method="POST", body="not json")
        self.assertEqual(d["err"], "params.invalid")

    def test_format_not_found(self):
        d = self.json(
            f"/api/book/{BID_EPUB}/separate",
            method="POST",
            body=json.dumps({"format": "pdf"}),
        )
        self.assertEqual(d["err"], "format.not_found")

    def test_cannot_separate_last_format(self):
        d = self.json(
            f"/api/book/{BID_EPUB}/separate",
            method="POST",
            body=json.dumps({"format": "epub"}),
        )
        self.assertEqual(d["err"], "last.format")

    def test_separate_success(self):
        cache = self._app.settings["legacy"].new_api
        with mock.patch.object(cache, "remove_formats", return_value=None) as mock_remove:
            with mock.patch(
                "calibre.ebooks.metadata.meta.get_metadata"
            ) as mock_get_meta, mock.patch(
                "shutil.copy2"
            ), mock.patch(
                "os.path.exists", return_value=True
            ), mock.patch(
                "builtins.open", mock.mock_open(read_data=b"fake")
            ):
                mock_get_meta.return_value = mock.MagicMock()
                mock_get_meta.return_value.title = "Separated Book"
                mock_get_meta.return_value.authors = ["Author"]
                mock_get_meta.return_value.author_sort = "Author"

                mock_book = {
                    "id": BID_EPUB,
                    "title": "Test Book",
                    "collector": {"id": 1},
                    "fmt_epub": "/tmp/test.epub",
                    "fmt_azw3": "/tmp/test.azw3",
                    "available_formats": ["EPUB", "AZW3"],
                }
                with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
                    with mock.patch.object(
                        self._app.settings["legacy"], "import_book", return_value=999
                    ):
                        d = self.json(
                            f"/api/book/{BID_EPUB}/separate",
                            method="POST",
                            body=json.dumps({"format": "azw3"}),
                        )
                        self.assertEqual(d["err"], "ok")
                        self.assertEqual(d["original_book_id"], BID_EPUB)
                        self.assertEqual(d["new_book_id"], 999)
                        mock_remove.assert_called_once_with({BID_EPUB: ["AZW3"]})


class TestBookSaveMeta(TestWithUserLogin):
    """POST /api/book/:id/savemeta"""

    def test_save_meta_no_permission(self):
        with mock.patch.object(BaseHandler, "is_admin", return_value=False):
            with mock.patch.object(BaseHandler, "is_book_owner", return_value=False):
                d = self.json(
                    f"/api/book/{BID_EPUB}/savemeta",
                    method="POST",
                    body="",
                )
                self.assertEqual(d["err"], "user.no_permission")

    def test_save_meta_success(self):
        mock_mi = mock.MagicMock()
        mock_mi.title = "Test Title"
        mock_mi.authors = ["Test Author"]
        mock_mi.comments = "Test comments"

        mock_book = {
            "id": BID_EPUB,
            "title": "Test Book",
            "fmt_epub": os.path.join(testdir, "cases", "old.epub"),
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            with mock.patch.object(
                self._app.settings["legacy"], "get_metadata", return_value=mock_mi
            ):
                with mock.patch.object(
                    self._app.settings["legacy"], "cover", return_value=b"fake-cover"
                ):
                    with mock.patch(
                        "calibre.ebooks.metadata.meta.set_metadata"
                    ) as mock_set_meta:
                        with mock.patch(
                            "webserver.handlers.base.os.path.exists", return_value=True
                        ):
                            d = self.json(
                                f"/api/book/{BID_EPUB}/savemeta",
                                method="POST",
                                body="fmt=epub",
                            )
                            self.assertEqual(d["err"], "ok")
                            mock_set_meta.assert_called_once()


class TestBookConvert(TestWithUserLogin):
    """POST /api/book/:id/convert"""

    def test_convert_book_not_found(self):
        d = self.json("/api/book/99999/convert", method="POST", body="")
        self.assertEqual(d["err"], "params.book.invalid")

    def test_convert_no_permission(self):
        with mock.patch.object(BaseHandler, "is_admin", return_value=False):
            with mock.patch.object(BaseHandler, "is_book_owner", return_value=False):
                d = self.json(f"/api/book/{BID_EPUB}/convert", method="POST", body="")
                self.assertEqual(d["err"], "user.no_permission")

    def test_convert_no_supported_formats(self):
        """Book with no supported ebook formats should be rejected."""
        mock_book = {
            "id": BID_EPUB,
            "title": "Test",
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            d = self.json(f"/api/book/{BID_EPUB}/convert", method="POST", body="")
            self.assertEqual(d["err"], "params.book.invalid")

    def test_convert_already_has_epub_and_azw3(self):
        """Book with both EPUB and AZW3 should be rejected."""
        mock_book = {
            "id": BID_EPUB,
            "title": "Test",
            "fmt_epub": "/tmp/test.epub",
            "fmt_azw3": "/tmp/test.azw3",
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            d = self.json(f"/api/book/{BID_EPUB}/convert", method="POST", body="")
            self.assertEqual(d["err"], "params.book.invalid")

    def test_convert_success(self):
        """Book with only TXT format should be convertible."""
        mock_book = {
            "id": BID_TXT,
            "title": "Test",
            "fmt_txt": "/tmp/test.txt",
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            with mock.patch(
                "webserver.services.convert.ConvertService.is_book_converting",
                return_value=False,
            ):
                with mock.patch(
                    "webserver.services.convert.ConvertService.convert_and_save",
                    return_value=None,
                ) as mock_convert:
                    d = self.json(f"/api/book/{BID_TXT}/convert", method="POST", body="")
                    self.assertEqual(d["err"], "ok")
                    mock_convert.assert_called_once()


class TestBookToPDF(TestWithUserLogin):
    """POST /api/book/:id/topdf"""

    def test_topdf_book_not_found(self):
        d = self.json("/api/book/99999/topdf", method="POST", body="")
        self.assertEqual(d["err"], "params.book.invalid")

    def test_topdf_no_permission(self):
        with mock.patch.object(BaseHandler, "is_admin", return_value=False):
            with mock.patch.object(BaseHandler, "is_book_owner", return_value=False):
                d = self.json(f"/api/book/{BID_EPUB}/topdf", method="POST", body="")
                self.assertEqual(d["err"], "user.no_permission")

    def test_topdf_already_has_pdf(self):
        """Book with PDF format should be rejected."""
        mock_book = {
            "id": BID_PDF,
            "title": "Test",
            "fmt_pdf": "/tmp/test.pdf",
            "fmt_epub": "/tmp/test.epub",
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            d = self.json(f"/api/book/{BID_PDF}/topdf", method="POST", body="")
            self.assertEqual(d["err"], "params.book.invalid")

    def test_topdf_success(self):
        """Book with EPUB format should be convertible to PDF."""
        mock_book = {
            "id": BID_EPUB,
            "title": "Test",
            "fmt_epub": "/tmp/test.epub",
        }
        with mock.patch.object(BaseHandler, "get_book", return_value=mock_book):
            with mock.patch(
                "webserver.services.convert.ConvertService.is_book_converting",
                return_value=False,
            ):
                with mock.patch(
                    "webserver.services.convert.ConvertService.convert_and_save",
                    return_value=None,
                ) as mock_convert:
                    d = self.json(f"/api/book/{BID_EPUB}/topdf", method="POST", body="")
                    self.assertEqual(d["err"], "ok")
                    mock_convert.assert_called_once()


class TestAdminKindleConvert(TestWithUserLogin):
    """POST /api/admin/book/kindleconvert"""

    def test_kindleconvert_not_admin(self):
        """Regular user should not be able to start batch conversion."""
        session = get_db()
        user = session.query(Reader).filter(Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            d = self.json(
                "/api/admin/book/kindleconvert",
                method="POST",
                body=json.dumps({"idlist": [BID_AZW3, BID_MOBI]}),
            )
            self.assertEqual(d["err"], "permission.not_admin")
        finally:
            user.admin = original_admin
            session.commit()

    def test_kindleconvert_task_already_running(self):
        """Should reject if a conversion task is already running."""
        session = get_db()
        user = session.query(Reader).filter(Reader.id == 1).first()
        original_admin = user.admin
        user.admin = True
        session.commit()
        try:
            with mock.patch(
                "webserver.services.batch_convert.BatchConvertService.status",
                return_value={"is_running": True},
            ):
                d = self.json(
                    "/api/admin/book/kindleconvert",
                    method="POST",
                    body=json.dumps({"idlist": [BID_AZW3]}),
                )
                self.assertEqual(d["err"], "task.running")
        finally:
            user.admin = original_admin
            session.commit()

    def test_kindleconvert_invalid_idlist_not_a_list(self):
        """idlist must be a list."""
        session = get_db()
        user = session.query(Reader).filter(Reader.id == 1).first()
        original_admin = user.admin
        user.admin = True
        session.commit()
        try:
            with mock.patch(
                "webserver.services.batch_convert.BatchConvertService.status",
                return_value={"is_running": False},
            ):
                d = self.json(
                    "/api/admin/book/kindleconvert",
                    method="POST",
                    body=json.dumps({"idlist": "not_a_list"}),
                )
                self.assertEqual(d["err"], "params.error.idlist")
        finally:
            user.admin = original_admin
            session.commit()

    def test_kindleconvert_invalid_idlist_non_int(self):
        """idlist must contain only integers."""
        session = get_db()
        user = session.query(Reader).filter(Reader.id == 1).first()
        original_admin = user.admin
        user.admin = True
        session.commit()
        try:
            with mock.patch(
                "webserver.services.batch_convert.BatchConvertService.status",
                return_value={"is_running": False},
            ):
                d = self.json(
                    "/api/admin/book/kindleconvert",
                    method="POST",
                    body=json.dumps({"idlist": [1, "bad"]}),
                )
                self.assertEqual(d["err"], "params.error.idlist")
        finally:
            user.admin = original_admin
            session.commit()

    def test_kindleconvert_success(self):
        """Batch conversion should start successfully for admin."""
        session = get_db()
        user = session.query(Reader).filter(Reader.id == 1).first()
        original_admin = user.admin
        user.admin = True
        session.commit()
        try:
            with mock.patch(
                "webserver.services.batch_convert.BatchConvertService.status",
                return_value={"is_running": False},
            ):
                with mock.patch(
                    "webserver.services.batch_convert.BatchConvertService.convert_all",
                    return_value=None,
                ) as mock_convert:
                    d = self.json(
                        "/api/admin/book/kindleconvert",
                        method="POST",
                        body=json.dumps({"idlist": [BID_AZW3, BID_MOBI]}),
                    )
                    self.assertEqual(d["err"], "ok")
                    mock_convert.assert_called_once()
                    call_args = mock_convert.call_args[0]
                    self.assertEqual(call_args[1], [BID_AZW3, BID_MOBI])
        finally:
            user.admin = original_admin
            session.commit()
