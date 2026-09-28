"""Download-only scanned documents retain their original bytes and metadata."""

import io
import os
import tempfile
import zipfile
from unittest import mock

import pytest

from tests.test_main import BID_EPUB, TestWithUserLogin, setUpModule as init
from webserver import loader
from webserver.models import Item, ScanFile
from webserver.services.import_metadata import filename_metadata, matching_import_books
from webserver.services.media_analysis import InvalidMediaError, analyze_media_file, online_readable_formats
from webserver.services.scan import ScanService


def setUpModule():
    init()


def document_bytes(fmt):
    if fmt == "djvu":
        return b"AT&TFORM\x00\x00\x00\x04DJVU"
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w") as archive:
        archive.writestr("0001.pdg", b"scanned page")
        archive.writestr("bookinfo.txt", "古籍影印本")
    return stream.getvalue()


@pytest.mark.parametrize("fmt", ["djvu", "uvz"])
def test_document_detection_and_readability(tmp_path, fmt):
    path = tmp_path / ("古籍.卷一." + fmt.upper())
    path.write_bytes(document_bytes(fmt))
    result = analyze_media_file(path, fmt.upper())
    assert result.reason == "download_only_document"
    assert result.media_type == "unknown"
    assert not online_readable_formats([fmt.upper()])
    assert online_readable_formats([fmt, "EPUB"])
    mi = filename_metadata(path)
    assert mi.title == "古籍.卷一"
    assert mi.authors == ["佚名"]


@pytest.mark.parametrize("fmt", ["djvu", "uvz"])
def test_disguised_document_is_rejected(tmp_path, fmt):
    path = tmp_path / ("fake." + fmt)
    path.write_bytes(b"MZ executable")
    with pytest.raises(InvalidMediaError):
        analyze_media_file(path, fmt)


def test_truncated_djvu_is_rejected(tmp_path):
    path = tmp_path / "truncated.djvu"
    path.write_bytes(b"AT&TFORM\x00\x00\x00\x10DJVM")
    with pytest.raises(InvalidMediaError):
        analyze_media_file(path, "djvu")


def test_uvz_unsafe_entries_are_rejected_without_extracting(tmp_path):
    path = tmp_path / "unsafe.uvz"
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("../page.pdg", b"page")
    with pytest.raises(InvalidMediaError, match="不安全路径"):
        analyze_media_file(path, "uvz")
    assert not (tmp_path.parent / "page.pdg").exists()


def test_only_unique_title_can_merge_without_author():
    mi = filename_metadata("古籍.djvu")
    books = [{"id": 1, "authors": ["作者甲"]}, {"id": 2, "authors": ["作者乙"]}]
    assert matching_import_books(mi, "djvu", books[:1]) == books[:1]
    assert matching_import_books(mi, "uvz", books) == []
    assert matching_import_books(mi, "pdf", books[:1]) == []


class TestManagedDocumentApi(TestWithUserLogin):
    def test_upload_download_and_duplicate_formats(self):
        legacy = self.get_app().settings["legacy"]
        with tempfile.TemporaryDirectory() as tmpdir, mock.patch.dict(loader.get_settings(), {"upload_path": tmpdir}):
            book_id = None
            try:
                with (
                    mock.patch("webserver.services.autofill.AutoFillService.auto_fill") as fill,
                    mock.patch("calibre.ebooks.metadata.meta.get_metadata", side_effect=AssertionError("must use filename")),
                ):
                    for fmt in ("djvu", "uvz"):
                        data = document_bytes(fmt)
                        with mock.patch(
                            "webserver.handlers.book.BookUpload.get_upload_file",
                            return_value=("古籍.影印." + fmt.upper(), data),
                        ):
                            result = self.json("/api/book/upload", method="POST", body="")
                            assert result["err"] == "ok"
                            if book_id is not None:
                                assert result["book_id"] == book_id
                            book_id = result["book_id"]
                            duplicate = self.json("/api/book/upload", method="POST", body="")
                            assert duplicate["err"] == "samebook"
                            assert "同作者" not in duplicate["msg"]
                        download = self.fetch(f"/api/book/{book_id}.{fmt}")
                        assert download.code == 200
                        assert download.body == data
                        assert download.headers["Content-Type"] == "application/octet-stream"
                        assert download.headers["Content-Disposition"].startswith("attachment;")
                    assert fill.call_count == 2
                book = self.json(f"/api/book/{book_id}")["book"]
                assert book["title"] == "古籍.影印"
                assert book["online_readable"] is False
                assert {f["format"].lower() for f in book["files"]} == {"djvu", "uvz"}
                assert all(f["online_readable"] is False for f in book["files"])
                with mock.patch("webserver.services.convert.ConvertService.convert_and_save") as convert:
                    assert self.fetch(f"/read/{book_id}").code == 415
                    convert.assert_not_called()
            finally:
                if book_id:
                    legacy.delete_book(book_id)
                    session = self.get_app().settings["ScopedSession"]
                    session.query(Item).filter(Item.book_id == book_id).delete()
                    session.commit()

    def test_unique_title_merges_with_known_author_but_requires_ownership(self):
        legacy = self.get_app().settings["legacy"]
        candidates = [{"id": BID_EPUB, "authors": ["作者甲"], "available_formats": ["EPUB"]}]
        with tempfile.TemporaryDirectory() as tmpdir, mock.patch.dict(loader.get_settings(), {"upload_path": tmpdir}):
            with (
                mock.patch.object(legacy, "books_with_same_title", return_value={BID_EPUB}),
                mock.patch.object(legacy, "get_data_as_dict", return_value=candidates),
                mock.patch.object(legacy, "add_format") as add,
                mock.patch.object(legacy, "import_book", return_value=9999) as create,
                mock.patch("webserver.handlers.book.BookUploadBase._save_media_type"),
                mock.patch("webserver.models.Item.save"),
                mock.patch("webserver.services.autofill.AutoFillService.auto_fill"),
                mock.patch("webserver.handlers.base.BaseHandler.user_history"),
                mock.patch("webserver.handlers.base.BaseHandler.is_admin", return_value=False),
                mock.patch("webserver.handlers.base.BaseHandler.is_book_owner", return_value=True) as owner,
                mock.patch(
                    "webserver.handlers.book.BookUpload.get_upload_file", return_value=("古籍.djvu", document_bytes("djvu"))
                ),
            ):
                result = self.json("/api/book/upload", method="POST", body="")
                assert result["err"] == "ok"
                assert result["book_id"] == BID_EPUB
                add.assert_called_once()
                create.assert_not_called()
                owner.return_value = False
                result = self.json("/api/book/upload", method="POST", body="")
                assert result["err"] == "ok"
                assert result["book_id"] == 9999
                assert add.call_count == 1
                create.assert_called_once()

    def test_scan_preview_and_import_merge_with_known_author(self):
        legacy = self.get_app().settings["legacy"]
        session = self.get_app().settings["ScopedSession"]
        service = ScanService()
        service.setup(legacy, self.get_app().settings["SessionMaker"])
        with tempfile.TemporaryDirectory() as tmpdir:
            path = os.path.join(tmpdir, "扫描测试.uvz")
            with open(path, "wb") as stream:
                stream.write(document_bytes("uvz"))
            try:
                with (
                    mock.patch.object(legacy, "books_with_same_title", return_value={BID_EPUB}),
                    mock.patch.object(
                        legacy,
                        "get_data_as_dict",
                        return_value=[{"id": BID_EPUB, "authors": ["作者甲"], "available_formats": ["EPUB"]}],
                    ),
                    mock.patch.object(legacy, "add_format") as add,
                    mock.patch.object(legacy, "import_book") as create,
                    mock.patch("webserver.services.autofill.AutoFillService.auto_fill_all") as fill,
                ):
                    service._do_scan(tmpdir)
                    session.rollback()
                    row = session.query(ScanFile).filter(ScanFile.path == path).one()
                    assert row.status == ScanFile.READY
                    assert row.title == "扫描测试"
                    service._do_import([row.hash], 1, import_mode="copy")
                    session.rollback()
                    row = session.query(ScanFile).filter(ScanFile.path == path).one()
                    assert row.book_id == BID_EPUB
                    add.assert_called_once()
                    create.assert_not_called()
                    fill.assert_called_once_with([BID_EPUB])
            finally:
                session.rollback()
                session.query(ScanFile).filter(ScanFile.path == path).delete()
                session.commit()
