import tempfile
from pathlib import Path
from unittest import mock

from tornado import testing, web

from tests.test_main import BID_EPUB, TestWithUserLogin
from tests.test_main import setUpModule as init
from webserver.handlers import files
from webserver.handlers.base import BaseHandler


def setUpModule():
    init()


class TestTornadoBookFiles(TestWithUserLogin):
    def test_download_head_and_opds_preserve_file_headers(self):
        url = f"/api/book/{BID_EPUB}.epub"
        full = self.fetch(url)
        head = self.fetch(url, method="HEAD")
        opds = self.fetch(url + "?from=opds", headers={"Range": "bytes=0-3"})

        self.assertEqual(full.code, 200)
        self.assertEqual(head.code, 200)
        self.assertEqual(head.body, b"")
        self.assertEqual(head.headers["Content-Length"], str(len(full.body)))
        self.assertEqual(head.headers["ETag"], full.headers["ETag"])
        self.assertEqual(opds.code, 206)
        self.assertEqual(opds.body, full.body[:4])
        self.assertEqual(opds.headers["Content-Disposition"], f'attachment; filename="{BID_EPUB}.epub"')

    def test_reader_resource_head_and_conditional_request(self):
        url = f"/read/resource/{BID_EPUB}.epub"
        full = self.fetch(url)
        self.assertEqual(full.code, 200)

        head = self.fetch(url, method="HEAD")
        cached = self.fetch(url, headers={"If-None-Match": full.headers["ETag"]})
        self.assertEqual(head.code, 200)
        self.assertEqual(head.body, b"")
        self.assertEqual(head.headers["Content-Length"], str(len(full.body)))
        self.assertEqual(head.headers["Content-Type"], "application/epub+zip")
        self.assertEqual(head.headers["Cache-Control"], "private, no-store")
        self.assertEqual(cached.code, 304)
        self.assertEqual(cached.body, b"")


class TestTornadoHTTPError(TestWithUserLogin):
    def test_localized_error_reason_is_preserved_in_body(self):
        reason = "当前漫画格式暂不支持在线阅读"
        with mock.patch.object(BaseHandler, "get_book_or_404", side_effect=web.HTTPError(415, reason=reason)):
            response = self.fetch(f"/read/{BID_EPUB}")
        self.assertEqual(response.code, 415)
        self.assertIn(reason, response.body.decode("utf-8"))

    def test_error_reason_is_escaped_without_injecting_headers(self):
        reason = '<script>alert("error")</script>\r\nX-Injected: value'
        with mock.patch.object(BaseHandler, "get_book_or_404", side_effect=web.HTTPError(415, reason=reason)):
            response = self.fetch(f"/read/{BID_EPUB}")
        self.assertEqual(response.code, 415)
        self.assertNotIn(b"<script>", response.body)
        self.assertIn(b"&lt;script&gt;", response.body)
        self.assertNotIn("X-Injected", response.headers)

    def test_unhandled_exception_keeps_generic_error_body(self):
        with mock.patch.object(BaseHandler, "get_book_or_404", side_effect=RuntimeError("internal-error-detail")):
            response = self.fetch(f"/read/{BID_EPUB}")
        self.assertEqual(response.code, 500)
        self.assertNotIn(b"internal-error-detail", response.body)

    def test_debug_traceback_still_uses_tornado_error_handler(self):
        with mock.patch.dict(self._app.settings, {"serve_traceback": True}):
            with mock.patch.object(BaseHandler, "get_book_or_404", side_effect=web.HTTPError(415, reason="调试错误")):
                response = self.fetch(f"/read/{BID_EPUB}")
        self.assertEqual(response.code, 415)
        self.assertTrue(response.headers["Content-Type"].startswith("text/plain"))
        self.assertIn(b"Traceback (most recent call last)", response.body)


class TestTornadoStaticRoutes(testing.AsyncHTTPTestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        root = Path(self.temp_dir.name)
        self.static_root = root / "dist"
        self.static_root.mkdir()
        self.logo_root = root / "logo"
        self.logo_root.mkdir()
        (self.logo_root / "logo.png").write_bytes(b"custom-logo")
        (self.static_root / "logo").symlink_to(self.logo_root, target_is_directory=True)
        (self.static_root / "index.html").write_bytes(b"static-index")
        secret = root / "secret.txt"
        secret.write_bytes(b"outside-static-roots")
        (self.static_root / "escape.txt").symlink_to(secret)
        (self.logo_root / "escape.txt").symlink_to(secret)
        self.settings = mock.patch.dict(files.CONF, {"html_path": str(self.static_root)})
        self.settings.start()
        self.addCleanup(self.settings.stop)
        super().setUp()

    def get_app(self):
        return web.Application(files.routes())

    def test_custom_logo_symlink_supports_get_head_and_range(self):
        full = self.fetch("/logo/logo.png")
        head = self.fetch("/logo/logo.png", method="HEAD")
        ranged = self.fetch("/logo/logo.png", headers={"Range": "bytes=0-5"})
        self.assertEqual(full.code, 200)
        self.assertEqual(full.body, b"custom-logo")
        self.assertEqual(full.headers["Content-Type"], "image/png")
        self.assertEqual(head.code, 200)
        self.assertEqual(head.body, b"")
        self.assertEqual(head.headers["Content-Length"], str(len(full.body)))
        self.assertEqual(ranged.code, 206)
        self.assertEqual(ranged.body, b"custom")

    def test_ordinary_static_file_is_served(self):
        response = self.fetch("/index.html")
        self.assertEqual(response.code, 200)
        self.assertEqual(response.body, b"static-index")

    def test_logo_path_traversal_is_rejected(self):
        response = self.fetch("/logo/%2e%2e/index.html")
        self.assertEqual(response.code, 403)

    def test_logo_symlink_cannot_escape_its_root(self):
        response = self.fetch("/logo/escape.txt")
        self.assertEqual(response.code, 403)

    def test_static_symlink_cannot_escape_its_root(self):
        response = self.fetch("/escape.txt")
        self.assertEqual(response.code, 403)

    def test_missing_logo_returns_404(self):
        self.assertEqual(self.fetch("/logo/missing.png").code, 404)
