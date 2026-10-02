"""HTTP regression coverage for human verification on book access."""

import base64
import json
import time
import urllib.parse
from unittest import mock

from tests.test_main import BID_EPUB, BID_PDF, BID_TXT, TestWithUserLogin, mock_permission, temporary_book_scope
from tests.test_main import setUpModule as init
from webserver.handlers.base import BaseHandler
from webserver.handlers.captcha import CONF


def setUpModule():
    init()


class TestBookCaptcha(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.config = mock.patch.dict(
            CONF,
            {
                "CAPTCHA_PROVIDER": "turnstile",
                "TURNSTILE_SITE_KEY": "test-site",
                "TURNSTILE_SECRET_KEY": "test-secret",
                "CAPTCHA_ENABLE_FOR_READ": True,
                "CAPTCHA_ENABLE_FOR_DOWNLOAD": True,
            },
        )
        self.config.start()
        self.addCleanup(self.config.stop)

    def grant(self, scene="read", book_id=BID_EPUB, token="valid", cookie=""):
        body = urllib.parse.urlencode({"provider": "turnstile", "turnstile_token": token, "scene": scene, "book_id": book_id})
        with mock.patch("webserver.plugins.captcha.turnstile.requests.post") as post:
            post.return_value.status_code = 200
            post.return_value.json.return_value = {"success": token == "valid", "action": scene}
            response = self.fetch("/api/captcha/verify", method="POST", body=body, headers={"Cookie": cookie})
        return response

    @staticmethod
    def cookies(response):
        return "; ".join(value.split(";", 1)[0] for value in response.headers.get_list("Set-Cookie"))

    @staticmethod
    def redirect_target(location):
        target = urllib.parse.parse_qs(location.query)["next_b64"][0]
        return base64.urlsafe_b64decode(target + "=" * (-len(target) % 4)).decode()

    def test_read_and_download_entries_redirect_to_scoped_challenge(self):
        for path, scene in ((f"/read/{BID_EPUB}?reader=readest&cfi=test", "read"), (f"/api/book/{BID_EPUB}.epub", "download")):
            response = self.fetch(path, follow_redirects=False)
            self.assertEqual(response.code, 302)
            location = urllib.parse.urlsplit(response.headers["Location"])
            self.assertEqual(location.path, f"/book/{BID_EPUB}/verify")
            self.assertEqual(urllib.parse.parse_qs(location.query)["scene"], [scene])
            self.assertEqual(self.redirect_target(location), path)

    def test_read_resources_and_opds_cannot_bypass_challenge(self):
        for path in (
            f"/read/resource/{BID_EPUB}.epub",
            f"/get/extract/{BID_EPUB}/META-INF/container.xml",
            f"/api/book/{BID_EPUB}/reader-bootstrap?engine=readest",
            f"/api/book/txt/init?id={BID_TXT}",
            f"/api/read/txt?id={BID_TXT}",
            f"/api/book/{BID_PDF}.pdf?inline=1",
            f"/api/book/{BID_EPUB}.epub?from=opds",
        ):
            response = self.fetch(path, follow_redirects=False)
            self.assertEqual(response.code, 403, path)
            self.assertEqual(json.loads(response.body)["err"], "captcha.required", path)

    def test_deployment_prefix_preserves_reader_parameters_after_verification(self):
        path = f"/read/{BID_EPUB}?reader=readest&cfi=chapter"
        with mock.patch("webserver.base_path.BASE_PATH", "/shelf"):
            response = self.fetch(path, follow_redirects=False)
        location = urllib.parse.urlsplit(response.headers["Location"])
        self.assertEqual(location.path, f"/shelf/book/{BID_EPUB}/verify")
        self.assertEqual(self.redirect_target(location), "/shelf" + path)

    def test_grant_unlocks_only_this_book_and_scene(self):
        grant = self.grant()
        self.assertEqual(json.loads(grant.body)["err"], "ok")
        self.assertIn("HttpOnly", grant.headers["Set-Cookie"])
        self.assertIn("SameSite=Lax", grant.headers["Set-Cookie"])
        cookie = self.cookies(grant)
        headers = {"Cookie": cookie, "Range": "bytes=0-3"}
        self.assertEqual(self.fetch(f"/read/resource/{BID_EPUB}.epub", headers=headers).code, 206)
        self.assertEqual(self.fetch(f"/get/extract/{BID_EPUB}/META-INF/container.xml", headers=headers).code, 200)
        self.assertEqual(self.fetch(f"/read/resource/6.epub", headers=headers).code, 403)
        self.assertEqual(self.fetch(f"/api/book/{BID_EPUB}.epub", headers=headers, follow_redirects=False).code, 302)
        download = self.grant("download")
        self.assertEqual(self.fetch(f"/api/book/{BID_EPUB}.epub", headers={"Cookie": self.cookies(download)}).code, 200)

    def test_failure_provider_mismatch_and_missing_token_issue_no_grant(self):
        failed = self.grant(token="invalid")
        self.assertEqual(json.loads(failed.body)["err"], "captcha.invalid")
        self.assertNotIn("Set-Cookie", failed.headers)
        for body in (
            "provider=image&captcha_code=ABCD&scene=read&book_id=1",
            "provider=turnstile&scene=read&book_id=1",
            "provider=turnstile&scene=login&book_id=1",
        ):
            result = self.fetch("/api/captcha/verify", method="POST", body=body)
            self.assertNotEqual(json.loads(result.body)["err"], "ok")
            self.assertNotIn("Set-Cookie", result.headers)

    def test_versioned_downloads_cannot_cache_past_the_access_grant(self):
        cookie = self.cookies(self.grant("download"))
        path = f"/api/book/{BID_EPUB}.epub?v=long-lived"
        response = self.fetch(path, headers={"Cookie": cookie})
        self.assertEqual(response.code, 200)
        self.assertEqual(response.headers["Cache-Control"], "private, no-store")
        with mock.patch("webserver.handlers.captcha.time.time", return_value=time.time() + 1801):
            expired = self.fetch(
                path, headers={"Cookie": cookie, "If-None-Match": response.headers["Etag"]}, follow_redirects=False
            )
        self.assertEqual(expired.code, 302)

    def test_expired_tampered_and_changed_identity_or_keys_reject_grants(self):
        grant = self.grant()
        cookie = self.cookies(grant)
        path = f"/read/resource/{BID_EPUB}.epub"
        with mock.patch("webserver.handlers.captcha.time.time", return_value=time.time() + 1801):
            self.assertEqual(self.fetch(path, headers={"Cookie": cookie}).code, 403)
        self.assertEqual(self.fetch(path, headers={"Cookie": cookie + "tampered"}).code, 403)
        with mock.patch.dict(CONF, {"TURNSTILE_SECRET_KEY": "rotated"}):
            self.assertEqual(self.fetch(path, headers={"Cookie": cookie}).code, 403)
        with (
            mock.patch.object(BaseHandler, "get_current_user", return_value=None),
            mock.patch.object(BaseHandler, "user_id", return_value=None),
            mock.patch.dict(CONF, {"ALLOW_GUEST_READ": True}),
        ):
            self.assertEqual(self.fetch(path, headers={"Cookie": cookie}).code, 403)

    def test_guest_grant_does_not_unlock_private_books(self):
        with (
            mock.patch.object(BaseHandler, "get_current_user", return_value=None),
            mock.patch.object(BaseHandler, "user_id", return_value=None),
            mock.patch.dict(CONF, {"ALLOW_GUEST_READ": True}),
        ):
            grant = self.grant()
            self.assertEqual(json.loads(grant.body)["err"], "ok")
            self.assertEqual(self.fetch(f"/read/resource/{BID_EPUB}.epub", headers={"Cookie": self.cookies(grant)}).code, 200)
            with temporary_book_scope(BID_EPUB, "private", collector_id=1):
                self.assertNotEqual(json.loads(self.grant().body)["err"], "ok")
                self.assertEqual(
                    self.fetch(f"/read/resource/{BID_EPUB}.epub", headers={"Cookie": self.cookies(grant)}).code, 404
                )

    def test_existing_permissions_apply_after_verification(self):
        grant = self.grant()
        with mock_permission() as user:
            user.set_permission("R")
            self.assertEqual(self.fetch(f"/read/resource/{BID_EPUB}.epub", headers={"Cookie": self.cookies(grant)}).code, 403)

    def test_disabled_scenes_preserve_existing_access(self):
        with mock.patch.dict(CONF, {"CAPTCHA_ENABLE_FOR_READ": False, "CAPTCHA_ENABLE_FOR_DOWNLOAD": False}):
            self.assertEqual(self.fetch(f"/read/resource/{BID_EPUB}.epub").code, 200)
            self.assertEqual(self.fetch(f"/api/book/{BID_EPUB}.epub").code, 200)

    def test_misconfigured_turnstile_cannot_silently_disable_gate(self):
        with mock.patch.dict(CONF, {"TURNSTILE_SECRET_KEY": ""}):
            config = self.json("/api/captcha/config")
            self.assertIsNone(config["config"])
            self.assertTrue(config["scenes"]["read"])
            self.assertEqual(json.loads(self.grant().body)["err"], "captcha.invalid")
            self.assertEqual(self.fetch(f"/read/resource/{BID_EPUB}.epub").code, 403)

    def test_image_preview_and_book_submission_preserve_single_use(self):
        with mock.patch.dict(CONF, {"CAPTCHA_PROVIDER": "image"}):
            with mock.patch(
                "webserver.handlers.captcha.ImageCaptchaProvider.generate",
                return_value={"code": "ABCD", "captcha_id": "test-id", "image": "data:image/png;base64,test"},
            ):
                image = self.fetch("/api/captcha/image")
            cookies = {"Cookie": self.cookies(image)}
            preview = self.fetch(
                "/api/captcha/verify", method="POST", body="provider=image&captcha_code=ABCD", headers=cookies
            )
            self.assertEqual(json.loads(preview.body)["err"], "ok")
            submission = self.fetch(
                "/api/captcha/verify",
                method="POST",
                body="provider=image&captcha_code=ABCD&scene=read&book_id=1",
                headers=cookies,
            )
            self.assertEqual(json.loads(submission.body)["err"], "ok")
            self.assertIn('captcha_answer=""', self.cookies(submission))
            grant = "; ".join(
                value.split(";", 1)[0]
                for value in submission.headers.get_list("Set-Cookie")
                if value.startswith("captcha_read=")
            )
            self.assertEqual(self.fetch("/read/resource/1.epub", headers={"Cookie": grant}).code, 200)
            self.assertNotEqual(
                json.loads(
                    self.fetch(
                        "/api/captcha/verify",
                        method="POST",
                        body="provider=image&captcha_code=ABCD&scene=read&book_id=1",
                        headers={"Cookie": grant},
                    ).body
                )["err"],
                "ok",
            )

    def test_account_scenes_accept_turnstile_and_ignore_other_provider_parameters(self):
        from webserver.handlers.captcha import check_captcha

        for scene in ("register", "login", "welcome", "reset"):
            with mock.patch.dict(CONF, {"CAPTCHA_ENABLE_FOR_" + scene.upper(): True}):
                handler = mock.Mock()
                handler.get_argument.side_effect = lambda name, default="": {
                    "turnstile_token": "token",
                    "captcha_code": "ABCD",
                }.get(name, default)
                handler.request.remote_ip = "127.0.0.1"
                with mock.patch("webserver.plugins.captcha.turnstile.requests.post") as post:
                    post.return_value.status_code = 200
                    post.return_value.json.return_value = {"success": True, "action": scene}
                    self.assertTrue(check_captcha(handler, scene)[0])
                    post.return_value.json.return_value = {"success": False}
                    self.assertFalse(check_captcha(handler, scene)[0])
                handler.get_secure_cookie.assert_not_called()

    def test_verifying_another_book_preserves_existing_read_grants(self):
        first = self.grant()
        second = self.grant(book_id=6, cookie=self.cookies(first))
        headers = {"Cookie": self.cookies(second)}
        for book_id in (BID_EPUB, 6):
            self.assertEqual(self.fetch(f"/read/resource/{book_id}.epub", headers=headers).code, 200)

    def test_comic_entry_manifest_and_images_require_read_grant(self):
        import os
        import tempfile

        from tests.test_comic_reader import fake_comic, write_comic

        with tempfile.TemporaryDirectory() as directory:
            path = os.path.join(directory, "captcha.cbz")
            write_comic(path)
            with mock.patch.object(BaseHandler, "get_book", return_value=fake_comic(path)):
                entry = self.fetch("/read-comic/1", follow_redirects=False)
                self.assertEqual(entry.code, 302)
                for url in ("/api/book/1/comic/pages", "/api/book/1/comic/pages/0"):
                    response = self.fetch(url)
                    self.assertEqual(response.code, 403)
                    self.assertEqual(json.loads(response.body)["err"], "captcha.required")
                headers = {"Cookie": self.cookies(self.grant())}
                manifest = self.json("/api/book/1/comic/pages", headers=headers)
                self.assertEqual(manifest["err"], "ok")
                page = self.fetch(manifest["pages"][0]["url"], headers=headers)
                self.assertEqual(page.code, 200)
                self.assertEqual(page.headers["Cache-Control"], "private, no-store")
                self.assertTrue(page.body.startswith(b"\x89PNG"))
