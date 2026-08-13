import json
from unittest import mock

from webserver.handlers.base import BaseHandler
from webserver.handlers.book import CONF

from tests.test_main import (
    BID_EPUB,
    TestWithUserLogin,
    mock_permission,
    setUpModule as init,
    temporary_book_scope,
)


def setUpModule():
    init()


class TestReadestEmbed(TestWithUserLogin):
    def test_readest_entry_keeps_book_read_permission_gate(self):
        response = self.fetch("/read/%d?reader=readest" % BID_EPUB, follow_redirects=False)
        self.assertEqual(response.code, 302)
        self.assertEqual(response.headers["Location"], "/static/readest/talebook-embed/index.html?book=%d" % BID_EPUB)

    def test_candle_fallback_keeps_existing_reader(self):
        response = self.fetch("/read/%d?reader=candle" % BID_EPUB)
        self.assertEqual(response.code, 200)
        self.assertIn(b"candle-reader", response.body)

    def test_bootstrap_and_resource_support_epub_range_and_cache_revocation(self):
        bootstrap = self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB)
        self.assertEqual(bootstrap.code, 200)
        body = json.loads(bootstrap.body)
        self.assertEqual(body["schema"], "talebook.reader.bootstrap.v1")
        self.assertEqual(body["book"]["format"], "epub")
        self.assertEqual(body["resource"]["mime"], "application/epub+zip")
        self.assertTrue(body["resource"]["range"])
        self.assertEqual(body["navigation"]["fallback"], "/read/%d?reader=candle" % BID_EPUB)
        self.assertEqual(
            [key for key, enabled in body["capabilities"].items() if enabled],
            ["readerCore", "localSettings"],
        )

        full = self.fetch(body["resource"]["url"])
        ranged = self.fetch(body["resource"]["url"], headers={"Range": "bytes=0-3"})
        self.assertEqual(full.code, 200)
        self.assertEqual(full.headers["Content-Type"], "application/epub+zip")
        self.assertEqual(full.headers["Cache-Control"], "private, no-store")
        self.assertEqual(ranged.code, 206)
        self.assertEqual(ranged.body, full.body[:4])
        self.assertTrue(full.headers.get("ETag"))

    def test_read_permission_is_not_download_permission(self):
        with mock_permission() as user:
            user.set_permission("S")
            resource = self.fetch("/read/resource/%d.epub" % BID_EPUB)
            download = self.fetch("/api/book/%d.epub" % BID_EPUB)
            self.assertEqual(resource.code, 200)
            self.assertEqual(download.code, 403)

    def test_inactive_and_read_denied_users_get_403(self):
        with mock_permission() as user:
            user.set_permission("R")
            self.assertEqual(self.fetch("/read/resource/%d.epub" % BID_EPUB).code, 403)

        with mock_permission() as user:
            original_active = user.active
            user._user.active = False
            user._session.commit()
            try:
                self.assertEqual(self.fetch("/read/resource/%d.epub" % BID_EPUB).code, 403)
            finally:
                user._user.active = original_active
                user._session.commit()

    def test_guest_setting_applies_to_bootstrap_and_resource(self):
        with mock.patch.dict(CONF, {"ALLOW_GUEST_READ": False}):
            with mock.patch.object(BaseHandler, "get_current_user", return_value=None):
                bootstrap = self.fetch(
                    "/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB,
                    follow_redirects=False,
                )
                resource = self.fetch("/read/resource/%d.epub" % BID_EPUB, follow_redirects=False)
        self.assertEqual(bootstrap.code, 302)
        self.assertEqual(resource.code, 302)
        self.assertEqual(bootstrap.headers["Location"], "/login")

    def test_private_book_owner_admin_and_other_user(self):
        with temporary_book_scope(BID_EPUB, "private", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=1):
                self.assertEqual(self.fetch("/read/resource/%d.epub" % BID_EPUB).code, 200)
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                self.assertEqual(self.fetch("/read/resource/%d.epub" % BID_EPUB).code, 404)
        with temporary_book_scope(BID_EPUB, "private", collector_id=2):
            with mock.patch.object(BaseHandler, "user_id", return_value=1):
                self.assertEqual(self.fetch("/read/resource/%d.epub" % BID_EPUB).code, 200)

    def test_permission_revocation_invalidates_conditional_cache_use(self):
        initial = self.fetch("/read/resource/%d.epub" % BID_EPUB)
        etag = initial.headers["ETag"]
        with mock_permission() as user:
            user.set_permission("R")
            revoked = self.fetch(
                "/read/resource/%d.epub" % BID_EPUB,
                headers={"If-None-Match": etag},
            )
        self.assertEqual(revoked.code, 403)

    def test_resource_change_updates_bootstrap_revision(self):
        initial = json.loads(self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB).body)
        changed_stat = mock.Mock(st_mtime_ns=9999999999000000000, st_size=initial["book"]["id"] + 123)
        with mock.patch("webserver.handlers.book.os.stat", return_value=changed_stat):
            changed = json.loads(self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB).body)
        self.assertNotEqual(initial["book"]["revision"], changed["book"]["revision"])

    def test_missing_book_and_unsupported_engine(self):
        self.assertEqual(self.fetch("/read/resource/999999.epub").code, 404)
        response = self.fetch("/api/book/%d/reader-bootstrap?engine=other" % BID_EPUB)
        self.assertEqual(response.code, 400)
