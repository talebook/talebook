import json
import urllib.parse
from pathlib import Path
from unittest import mock

from tests.test_main import (
    BID_EPUB,
    BID_TXT,
    TestWithUserLogin,
    mock_permission,
    temporary_book_scope,
)
from tests.test_main import (
    setUpModule as init,
)
from webserver.handlers.base import BaseHandler
from webserver.handlers.book import CONF


def setUpModule():
    init()


class TestReadestEmbed(TestWithUserLogin):
    def test_readest_entry_keeps_book_read_permission_gate(self):
        response = self.fetch("/read/%d?reader=readest" % BID_EPUB, follow_redirects=False)
        self.assertEqual(response.code, 302)
        location = urllib.parse.urlsplit(response.headers["Location"])
        query = urllib.parse.parse_qs(location.query)
        self.assertEqual(location.path, "/readest/reader.html")
        self.assertEqual(query["moke"], ["1"])
        self.assertEqual(query["mokeBookId"], [str(BID_EPUB)])
        self.assertEqual(query["mokeReturnTo"], ["/book/%d" % BID_EPUB])
        self.assertTrue(query["file"][0].startswith("http://"))
        self.assertIn("/read/resource/%d.epub?revision=" % BID_EPUB, query["file"][0])

    def test_candle_fallback_keeps_existing_reader(self):
        response = self.fetch("/read/%d?reader=candle" % BID_EPUB)
        self.assertEqual(response.code, 200)
        self.assertIn(b"candle-reader", response.body)

    def test_readest_can_be_selected_as_default_reader(self):
        with mock.patch.dict(CONF, {"EPUB_VIEWER": "readest"}):
            response = self.fetch("/read/%d" % BID_EPUB, follow_redirects=False)
        self.assertEqual(response.code, 302)
        location = urllib.parse.urlsplit(response.headers["Location"])
        self.assertEqual(location.path, "/readest/reader.html")

    def test_explicit_candle_overrides_readest_default(self):
        with mock.patch.dict(CONF, {"EPUB_VIEWER": "readest"}):
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
        self.assertIn("revision=", body["resource"]["url"])
        self.assertEqual(
            [key for key, enabled in body["capabilities"].items() if enabled],
            [
                "readerCore",
                "navigation",
                "tableOfContents",
                "textSearch",
                "localPosition",
                "localSettings",
                "layoutSettings",
                "appearanceSettings",
                "languageSettings",
            ],
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

    def test_bootstrap_returns_structured_activation_and_permission_errors(self):
        with mock_permission() as user:
            user.set_permission("R")
            denied = self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB)
        self.assertEqual(denied.code, 403)
        self.assertEqual(json.loads(denied.body)["err"], "user.no_permission")

        with mock_permission() as user:
            original_active = user.active
            user._user.active = False
            user._session.commit()
            try:
                inactive = self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB)
            finally:
                user._user.active = original_active
                user._session.commit()
        self.assertEqual(inactive.code, 403)
        self.assertEqual(json.loads(inactive.body)["err"], "user.activation_required")

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

    def test_stale_resource_revision_is_rejected(self):
        bootstrap = json.loads(self.fetch("/api/book/%d/reader-bootstrap?engine=readest" % BID_EPUB).body)
        with mock.patch("webserver.handlers.book.reader_resource_revision", return_value="new-revision"):
            changed = self.fetch(bootstrap["resource"]["url"])
        self.assertEqual(changed.code, 409)

    def test_readest_entry_reports_conversion_pending(self):
        converting = {"id": 77, "title": "Converting", "fmt_mobi": "/tmp/book.mobi"}
        with mock.patch.object(BaseHandler, "get_book_or_404", return_value=converting):
            with mock.patch("webserver.handlers.book.ConvertService.is_book_converting", return_value=True):
                response = self.fetch("/read/77?reader=readest")
        self.assertEqual(response.code, 409)
        self.assertIn(b"reader.conversion_pending", response.body)
        self.assertIn(b"reader=candle", response.body)

    def test_readest_default_preserves_the_dedicated_txt_reader(self):
        with mock.patch.dict(CONF, {"EPUB_VIEWER": "readest"}):
            response = self.fetch("/read/%d" % BID_TXT, follow_redirects=False)
        self.assertEqual(response.code, 302)
        self.assertEqual(response.headers["Location"], "/book/%d/readtxt" % BID_TXT)

    def test_embed_static_deployment_contract_has_csp_and_cache_boundaries(self):
        root = Path(__file__).parents[1]
        nginx_configs = [
            (root / "conf" / "nginx" / name).read_text(encoding="utf-8")
            for name in ("talebook.conf", "server-side-render.conf")
        ]
        nuxt = (root / "app" / "nuxt.config.ts").read_text(encoding="utf-8")
        readest_root = root / "app" / "public" / "readest"
        reader = (readest_root / "reader.html").read_text(encoding="utf-8")
        not_found = (readest_root / "404.html").read_text(encoding="utf-8")
        cleanup_script = (readest_root / "legacy-worker-cleanup.js").read_text(encoding="utf-8")
        recovery_script = (readest_root / "stale-nuxt-recovery.js").read_text(encoding="utf-8")
        recovery_handler = (root / "app" / "server" / "error-handler.ts").read_text(encoding="utf-8")
        service_worker = readest_root / "sw.js"
        service_worker_text = service_worker.read_text(encoding="utf-8")
        for nginx in nginx_configs:
            self.assertIn("location = /readest/reader.html", nginx)
            self.assertIn("location = /readest/legacy-worker-cleanup.js", nginx)
            self.assertIn("location = /readest/stale-nuxt-recovery.js", nginx)
            self.assertIn("try_files $uri /readest/stale-nuxt-recovery.js", nginx)
            self.assertIn("Content-Security-Policy", nginx)
            self.assertIn("immutable", nginx)
            self.assertIn('add_header Service-Worker-Allowed "/" always', nginx)
        self.assertIn("/readest/**", nuxt)
        self.assertIn("'Service-Worker-Allowed': '/'", nuxt)
        self.assertIn("'/readest/legacy-worker-cleanup.js'", nuxt)
        self.assertIn("'/readest/stale-nuxt-recovery.js'", nuxt)
        self.assertIn("talebook-stale-nuxt-recovery", nuxt)
        self.assertIn("errorHandler: '~/server/error-handler.ts'", nuxt)
        self.assertNotIn("swe-worker", reader)
        self.assertIn("/readest/legacy-worker-cleanup.js", reader)
        self.assertIn("/readest/legacy-worker-cleanup.js", not_found)
        self.assertLess(reader.index("/readest/legacy-worker-cleanup.js"), reader.index("/readest/_next/"))
        self.assertIn("getRegistrations", cleanup_script)
        self.assertIn("registration.unregister", cleanup_script)
        self.assertIn("globalThis.location.reload", cleanup_script)
        self.assertIn("recoverStaleNuxtPage", cleanup_script)
        self.assertIn("recoverStaleNuxtPage", recovery_script)
        self.assertIn("RECOVERY_MODULE", recovery_handler)
        self.assertIn(r"\/_nuxt\/", recovery_handler)
        for cache_name in ("client-pages", "offline-cache", "fonts-cache"):
            self.assertIn(cache_name, cleanup_script)
            self.assertIn(cache_name, service_worker_text)
        self.assertIn("registration.unregister", service_worker_text)
        self.assertFalse(any(service_worker.parent.glob("swe-worker*")))
        main_bundles = list((service_worker.parent / "_next" / "static" / "chunks").glob("main-*.js"))
        self.assertTrue(main_bundles)
        self.assertTrue(all("serviceWorker.register" not in path.read_text(encoding="utf-8") for path in main_bundles))

    def test_missing_book_and_unsupported_engine(self):
        self.assertEqual(self.fetch("/read/resource/999999.epub").code, 404)
        response = self.fetch("/api/book/%d/reader-bootstrap?engine=other" % BID_EPUB)
        self.assertEqual(response.code, 400)
