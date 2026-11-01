import json
from http.cookies import SimpleCookie
from unittest import mock

from tests.test_main import TestApp
from tests.test_main import setUpModule as init
from webserver import loader
from webserver.handlers.base import BaseHandler
from webserver.version import VERSION


def setUpModule():
    init()


class TestInviteCors(TestApp):
    origin = "http://127.0.0.1:3010"

    def setUp(self):
        super().setUp()
        self.conf = loader.get_settings()
        patch = mock.patch.dict(
            self.conf,
            {"INVITE_MODE": True, "INVITE_CODE": "int01-test-code", "DEMO_MODE": False, "OPDS_ENABLED": True},
        )
        patch.start()
        self.addCleanup(patch.stop)

    def assert_cors(self, response, origin=None):
        self.assertEqual(response.headers["Access-Control-Allow-Origin"], origin or self.origin)
        self.assertEqual(response.headers["Access-Control-Allow-Credentials"], "true")
        self.assertEqual(response.headers["Cache-Control"], "max-age=0")
        self.assertNotIn("Access-Control-Allow-Methods", response.headers)
        self.assertNotIn("Access-Control-Allow-Headers", response.headers)

    def assert_no_cors(self, response):
        self.assertNotIn("Access-Control-Allow-Origin", response.headers)
        self.assertNotIn("Access-Control-Allow-Credentials", response.headers)

    def test_uninvited_info_is_readable_but_contains_only_public_denial(self):
        response = self.fetch("/api/user/info", headers={"Origin": self.origin})
        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body), {"err": "not_invited"})
        self.assert_cors(response)
        self.assertNotIn("Set-Cookie", response.headers)

    def test_invite_denial_keeps_existing_origin_fallback_and_reflection(self):
        for origin in (None, self.origin, "https://client.example"):
            with self.subTest(origin=origin):
                headers = {"Origin": origin} if origin else {}
                response = self.fetch("/api/index", headers=headers)
                self.assertEqual(json.loads(response.body), {"err": "not_invited"})
                self.assert_cors(response, origin or "*")

    def test_uninvited_admin_read_and_save_do_not_reach_configuration(self):
        before = dict(self.conf)
        with mock.patch.object(loader.SettingsLoader, "dumpfile") as save:
            for path, method in (
                ("/api/admin/settings", "GET"),
                ("/api/admin/settings", "POST"),
                ("/api/admin/discovery", "GET"),
            ):
                with self.subTest(path=path, method=method):
                    options = {"body": '{"site_title":"unauthorized"}'} if method == "POST" else {}
                    response = self.fetch(path, method=method, headers={"Origin": self.origin}, **options)
                    self.assertEqual(json.loads(response.body), {"err": "not_invited"})
                    self.assert_cors(response)
                    self.assertNotIn("Set-Cookie", response.headers)
            save.assert_not_called()
        self.assertEqual(dict(self.conf), before)

    def test_welcome_and_wrong_code_keep_cors_without_granting_invitation(self):
        response = self.fetch("/api/welcome", headers={"Origin": self.origin})
        self.assertEqual(json.loads(response.body)["err"], "ok")
        self.assert_cors(response)
        response = self.fetch("/api/welcome", method="POST", body="invite_code=wrong", headers={"Origin": self.origin})
        self.assertEqual(json.loads(response.body)["err"], "params.invalid")
        self.assert_cors(response)
        self.assertNotIn("Set-Cookie", response.headers)
        self.assertEqual(self.json("/api/user/info"), {"err": "not_invited"})

    def test_valid_code_reaches_existing_info_and_login_permissions(self):
        response = self.fetch(
            "/api/welcome", method="POST", body="invite_code=int01-test-code", headers={"Origin": self.origin}
        )
        self.assertEqual(json.loads(response.body)["err"], "ok")
        self.assert_cors(response)
        cookies = SimpleCookie()
        for header in response.headers.get_list("Set-Cookie"):
            cookies.load(header)
        self.assertIn("invited", cookies)
        headers = {"Origin": self.origin, "Cookie": "invited=" + cookies["invited"].coded_value}
        response = self.fetch("/api/user/info", headers=headers)
        self.assertEqual(json.loads(response.body)["err"], "ok")
        self.assertFalse(json.loads(response.body)["user"]["is_login"])
        self.assert_cors(response)
        response = self.fetch("/api/admin/settings", headers=headers)
        self.assertEqual(json.loads(response.body)["err"], "user.need_login")
        self.assert_cors(response)

    def test_invited_regular_user_still_cannot_read_or_save_admin_settings(self):
        before = dict(self.conf)
        with (
            mock.patch.object(BaseHandler, "invited_code_is_ok", return_value=True),
            mock.patch.object(BaseHandler, "user_id", return_value=2),
            mock.patch.object(loader.SettingsLoader, "dumpfile") as save,
        ):
            for method in ("GET", "POST"):
                options = {"body": '{"site_title":"unauthorized"}'} if method == "POST" else {}
                response = self.fetch("/api/admin/settings", method=method, headers={"Origin": self.origin}, **options)
                self.assertEqual(json.loads(response.body)["err"], "permission")
                self.assertEqual(set(json.loads(response.body)), {"err", "msg"})
                self.assert_cors(response)
            save.assert_not_called()
        self.assertEqual(dict(self.conf), before)

    def test_invite_disabled_success_preserves_existing_cors(self):
        with mock.patch.dict(self.conf, {"INVITE_MODE": False}):
            response = self.fetch("/api/user/info", headers={"Origin": self.origin})
        self.assertEqual(json.loads(response.body)["err"], "ok")
        self.assert_cors(response)

    def test_raw_protocol_invite_denials_keep_401_without_cors(self):
        for path in ("/opds/", "/api/book/1.epub", "/get/cover/1.jpg"):
            with self.subTest(path=path):
                response = self.fetch(path, headers={"Origin": self.origin}, follow_redirects=False)
                self.assertEqual(response.code, 401)
                self.assertEqual(response.headers["WWW-Authenticate"], "Basic")
                self.assert_no_cors(response)

    def test_not_installed_early_denial_is_not_given_new_cors(self):
        with mock.patch.dict(self.conf, {"installed": False}):
            response = self.fetch("/api/index", headers={"Origin": self.origin})
        self.assertEqual(json.loads(response.body), {"err": "not_installed"})
        self.assert_no_cors(response)

    def test_maintenance_early_denial_is_not_given_new_cors(self):
        with mock.patch("webserver.services.application_upgrade.MAINTENANCE") as maintenance:
            maintenance.exists.return_value = True
            response = self.fetch("/api/user/info", headers={"Origin": self.origin})
        self.assertEqual(response.code, 503)
        self.assertEqual(json.loads(response.body), {"err": "maintenance"})
        self.assert_no_cors(response)

    def test_version_early_denial_is_not_given_new_cors(self):
        response = self.fetch("/api/user/info", headers={"Origin": self.origin, "X-Talebook-App-Version": VERSION + "-old"})
        self.assertEqual(response.code, 409)
        self.assertEqual(json.loads(response.body), {"err": "upgrade.reload"})
        self.assert_no_cors(response)

    def test_demo_early_denial_is_not_given_new_cors(self):
        with mock.patch.dict(self.conf, {"DEMO_MODE": True}):
            response = self.fetch("/api/user/sign_up", method="POST", body="", headers={"Origin": self.origin})
        self.assertEqual(json.loads(response.body)["err"], "demo.read_only")
        self.assert_no_cors(response)

    def test_invite_denial_does_not_enable_preflight_methods_or_headers(self):
        response = self.fetch(
            "/api/user/info",
            method="OPTIONS",
            headers={"Origin": self.origin, "Access-Control-Request-Method": "POST"},
        )
        self.assertEqual(json.loads(response.body), {"err": "not_invited"})
        self.assertNotIn("Access-Control-Allow-Methods", response.headers)
        self.assertNotIn("Access-Control-Allow-Headers", response.headers)
