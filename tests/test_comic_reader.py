#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import io
import json
import os
import tempfile
import zipfile
from unittest import mock

from PIL import Image

from tests.test_main import BID_EPUB, TestApp, TestWithUserLogin, get_db, mock_permission, testdir
from tests.test_main import setUpModule as init
from webserver.handlers.base import BaseHandler
from webserver.models import Item, Reader, ReadingState
from webserver.services.comic_archive import (
    ComicArchiveError,
    ComicArchiveService,
    natural_page_sort_key,
)


def setUpModule():
    init()


def image_bytes(image_format="PNG", size=(48, 64), color=(210, 80, 30)):
    output = io.BytesIO()
    Image.new("RGB", size, color).save(output, format=image_format)
    return output.getvalue()


def write_comic(path, names=("page10.png", "page2.png", "page1.png"), stored=False):
    compression = zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED
    with zipfile.ZipFile(path, "w", compression=compression) as archive:
        for index, name in enumerate(names):
            archive.writestr(name, image_bytes(color=(100 + index, 80, 30)))
        archive.writestr("ComicInfo.xml", "<ComicInfo/>")


def fake_comic(path, archive_format="cbz"):
    return {
        "id": BID_EPUB,
        "title": "安全漫画",
        "media_type": "comic",
        "available_formats": [archive_format.upper()],
        "fmt_%s" % archive_format: path,
    }


class TestComicArchiveService:
    def setup_method(self):
        self.service = ComicArchiveService()

    def test_natural_page_sort_is_unicode_aware(self):
        names = ["第１０页.png", "第2页.png", "第01页.png", "第1页.png"]
        assert sorted(names, key=natural_page_sort_key) == ["第1页.png", "第01页.png", "第2页.png", "第１０页.png"]

    def test_manifest_hides_entry_names_and_reads_only_indexed_page(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "comic.cbz")
            write_comic(path)

            manifest = self.service.get_manifest(path, "cbz")
            public_pages = [page.to_public_dict(BID_EPUB, manifest.revision) for page in manifest.pages]
            content = self.service.read_page(path, "cbz", 1, manifest.revision)

        assert [page.entry_name for page in manifest.pages] == ["page1.png", "page2.png", "page10.png"]
        assert [page.index for page in manifest.pages] == [0, 1, 2]
        assert all(page.width == 48 and page.height == 64 for page in manifest.pages)
        assert all(page.mime_type == "image/png" for page in manifest.pages)
        assert "page2.png" not in json.dumps(public_pages)
        assert public_pages[1]["url"].endswith("/1?revision=%s" % manifest.revision)
        assert content.page.index == 1
        assert content.data.startswith(b"\x89PNG\r\n\x1a\n")

    def test_rar4_manifest_and_page_use_the_same_contract(self):
        path = os.path.join(testdir, "cases", "comics", "images-rar4.rar")

        manifest = self.service.get_manifest(path, "cbr")
        content = self.service.read_page(path, "cbr", 0, manifest.revision)

        assert len(manifest.pages) == 3
        assert manifest.pages[0].width == 48
        assert manifest.pages[0].height == 48
        assert content.page.mime_type == "image/png"

    def test_stale_revision_and_out_of_range_never_select_an_entry(self):
        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "comic.cbz")
            write_comic(path)
            manifest = self.service.get_manifest(path, "cbz")

            for index, revision, code in ((0, "stale", "comic.stale_manifest"), (99, manifest.revision, "comic.page_not_found")):
                try:
                    self.service.read_page(path, "cbz", index, revision)
                except ComicArchiveError as error:
                    assert error.code == code
                    assert path not in error.message
                    assert "page" not in error.message.lower()
                else:
                    raise AssertionError("unsafe page request unexpectedly succeeded")

    def test_damaged_and_oversized_pages_fail_with_path_free_errors(self):
        with tempfile.TemporaryDirectory() as directory:
            damaged = os.path.join(directory, "damaged.cbz")
            with zipfile.ZipFile(damaged, "w") as archive:
                archive.writestr("secret-name.png", b"\x89PNG\r\n\x1a\ntruncated")

            try:
                self.service.get_manifest(damaged, "cbz")
            except ComicArchiveError as error:
                assert error.code in ("comic.page_dimensions", "comic.invalid_container")
                assert directory not in error.message
                assert "secret-name" not in error.message
            else:
                raise AssertionError("damaged page unexpectedly succeeded")

            oversized = os.path.join(directory, "oversized.cbz")
            write_comic(oversized, names=("one.png",), stored=True)
            with mock.patch("webserver.services.comic_archive.MAX_COMIC_PAGE_BYTES", 32):
                try:
                    ComicArchiveService().get_manifest(oversized, "cbz")
                except ComicArchiveError as error:
                    assert error.code == "comic.page_size"
                else:
                    raise AssertionError("oversized page unexpectedly succeeded")

    def test_traversal_and_encrypted_archives_are_rejected_before_indexing(self):
        with tempfile.TemporaryDirectory() as directory:
            traversal = os.path.join(directory, "traversal.cbz")
            with zipfile.ZipFile(traversal, "w") as archive:
                archive.writestr("../outside.png", image_bytes())

            try:
                self.service.get_manifest(traversal, "cbz")
            except ComicArchiveError as error:
                assert error.code == "comic.invalid_container"
                assert "outside" not in error.message
            else:
                raise AssertionError("traversal archive unexpectedly succeeded")

        encrypted = os.path.join(testdir, "cases", "comics", "encrypted.cbz")
        try:
            self.service.get_manifest(encrypted, "cbz")
        except ComicArchiveError as error:
            assert error.code == "comic.invalid_container"
            assert "page.png" not in error.message
        else:
            raise AssertionError("encrypted archive unexpectedly succeeded")


class TestComicReaderNeedsLogin(TestApp):
    def test_backend_host_redirects_to_login(self):
        for path in ("/read-comic/1", "/api/read-comic/1"):
            response = self.fetch(path, follow_redirects=False)

            assert response.code == 302
            assert response.headers["Location"] == "/login"

    def test_manifest_and_progress_require_login(self):
        assert self.json("/api/book/1/comic/pages")["err"] == "user.need_login"
        assert self.json("/api/book/1/comic/progress")["err"] == "user.need_login"

        response = self.fetch("/api/book/1/comic/pages/0?revision=none")
        assert response.code == 401
        assert b"/" not in response.body


class TestComicReaderApi(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.directory = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.directory.name, "reader.cbz")
        write_comic(self.path)
        self.book = fake_comic(self.path)
        self.book_patch = mock.patch.object(BaseHandler, "get_book", return_value=self.book)
        self.book_patch.start()

        session = get_db()
        state = session.query(ReadingState).filter(ReadingState.book_id == BID_EPUB, ReadingState.reader_id == 1).first()
        self.previous_progress = dict(state.get_progress()) if state else None
        self.previous_online_read = state.online_read if state else None
        self.created_state = state is None

    def tearDown(self):
        self.book_patch.stop()
        session = get_db()
        state = session.query(ReadingState).filter(ReadingState.book_id == BID_EPUB, ReadingState.reader_id == 1).first()
        if state:
            if self.created_state:
                session.delete(state)
            else:
                state.set_progress(self.previous_progress)
                state.online_read = self.previous_online_read
            session.commit()
        self.directory.cleanup()
        super().tearDown()

    def manifest(self):
        response = self.json("/api/book/1/comic/pages")
        assert response["err"] == "ok"
        return response

    def test_backend_host_renders_static_reader_without_archive_details(self):
        for path in ("/read-comic/1", "/api/read-comic/1"):
            response = self.fetch(path)
            body = response.body.decode("utf-8")

            assert response.code == 200
            assert response.headers["X-Content-Type-Options"] == "nosniff"
            assert response.headers["Referrer-Policy"] == "same-origin"
            assert 'id="comic-reader-host"' in body
            assert 'data-book-id="1"' in body
            assert "/static/komga-reader/komga-reader.es.js" in body
            assert "/api/book/${bookId}/comic/pages" in body
            assert "/api/book/${bookId}/comic/progress" in body
            assert self.path not in body
            assert "page1.png" not in body

    def test_manifest_image_and_cache_headers(self):
        manifest = self.manifest()

        assert manifest["contract_version"] == 1
        assert manifest["pages_count"] == 3
        assert manifest["format"] == "CBZ"
        assert "page1.png" not in json.dumps(manifest)
        assert [page["index"] for page in manifest["pages"]] == [0, 1, 2]
        assert all("&token=" in page["url"] for page in manifest["pages"])

        image = self.fetch(manifest["pages"][0]["url"])
        assert image.code == 200
        assert image.headers["Content-Type"].startswith("image/png")
        assert image.headers["Cache-Control"] == "private, max-age=3600, immutable"
        assert image.headers["X-Content-Type-Options"] == "nosniff"
        assert image.body.startswith(b"\x89PNG")

    def test_page_token_allows_cookie_free_image_but_is_page_scoped(self):
        manifest = self.manifest()
        page_url = manifest["pages"][0]["url"]
        tampered_url = page_url.replace("/pages/0?", "/pages/1?")
        try:
            self.user.return_value = None
            image = self.fetch(page_url)
            tampered = self.fetch(tampered_url)
        finally:
            self.user.return_value = 1

        assert image.code == 200
        assert image.headers["Content-Type"].startswith("image/png")
        assert image.body.startswith(b"\x89PNG")
        assert tampered.code == 401
        assert self.path.encode() not in tampered.body

        with mock_permission() as user:
            user.set_permission("R")
            try:
                self.user.return_value = None
                revoked = self.fetch(page_url)
            finally:
                self.user.return_value = 1
        assert revoked.code == 403

    def test_image_rejects_stale_revision_and_page_bounds(self):
        manifest = self.manifest()
        stale = self.fetch("/api/book/1/comic/pages/0?revision=stale")
        missing = self.fetch("/api/book/1/comic/pages/99?revision=%s" % manifest["revision"])

        assert stale.code == 409
        assert missing.code == 404
        assert self.path.encode() not in stale.body + missing.body
        assert b"page1" not in stale.body + missing.body

    def test_progress_round_trip_is_normalized_and_marks_online_read(self):
        manifest = self.manifest()
        page = manifest["pages"][1]
        payload = {
            "progress": {
                "kind": "comic",
                "version": 1,
                "pageId": page["id"],
                "pageIndex": 1,
                "percent": 66.67,
                "completed": False,
            }
        }

        saved = self.json("/api/book/1/comic/progress", method="POST", body=json.dumps(payload))
        loaded = self.json("/api/book/1/comic/progress")

        assert saved["err"] == "ok"
        assert saved["progress"] == loaded["progress"]
        assert loaded["progress"]["percent"] == 66.67
        session = get_db()
        state = session.query(ReadingState).filter(ReadingState.book_id == BID_EPUB, ReadingState.reader_id == 1).one()
        assert state.online_read == 1

    def test_progress_rejects_stale_id_invalid_shape_and_oversized_payload(self):
        manifest = self.manifest()
        page = manifest["pages"][0]
        stale = {
            "progress": {
                "kind": "comic",
                "version": 1,
                "pageId": "old-revision:0",
                "pageIndex": 0,
                "percent": 1,
                "completed": False,
            }
        }
        assert self.json("/api/book/1/comic/progress", method="POST", body=json.dumps(stale))["err"] == "comic.progress_stale"
        assert self.json("/api/book/1/comic/progress", method="POST", body=json.dumps({"progress": "bad"}))["err"] == "comic.progress_invalid"
        assert self.json(
            "/api/book/1/comic/progress",
            method="POST",
            body=json.dumps({"progress": {"blob": "x" * 3000, "pageId": page["id"]}}),
        )["err"] == "comic.progress_invalid"

    def test_non_comic_and_read_permission_are_rejected(self):
        self.book["media_type"] = "ebook"
        assert self.json("/api/book/1/comic/pages")["err"] == "comic.media_type"
        self.book["media_type"] = "comic"

        with mock_permission() as user:
            user.set_permission("R")
            assert self.json("/api/book/1/comic/pages")["err"] == "comic.no_permission"

    def test_private_book_is_hidden_from_non_owner(self):
        manifest = self.manifest()
        page_url = manifest["pages"][0]["url"]
        session = get_db()
        item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
        previous_scope = item.scope
        previous_collector = item.collector_id
        try:
            item.scope = "private"
            item.collector_id = 2
            session.commit()
            with mock.patch.object(BaseHandler, "is_admin", return_value=False):
                assert self.json("/api/book/1/comic/pages")["err"] == "comic.book_not_found"
                response = self.fetch("/api/book/1/comic/pages/0?revision=none")
                assert response.code == 404
                try:
                    self.user.return_value = None
                    with mock.patch.object(Reader, "is_admin", return_value=False):
                        token_response = self.fetch(page_url)
                finally:
                    self.user.return_value = 1
                assert token_response.code == 404
        finally:
            session = get_db()
            item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
            item.scope = previous_scope
            item.collector_id = previous_collector
            session.commit()
