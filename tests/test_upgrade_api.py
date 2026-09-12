import json
from unittest import mock

from tests.test_main import TestApp, TestWithAdminUser
from tests.test_main import setUpModule as init


def setUpModule():
    init()


class TestUpgradeGuest(TestApp):
    @mock.patch("webserver.handlers.upgrade.request_executor")
    def test_guest_cannot_check_or_install(self, executor):
        self.assertEqual(self.json("/api/admin/upgrade")["err"], "user.need_login")
        self.assertEqual(self.json("/api/admin/upgrade", method="POST", body="{}")["err"], "user.need_login")
        executor.assert_not_called()


class TestUpgradeAdmin(TestWithAdminUser):
    @mock.patch("webserver.handlers.upgrade.request_executor", return_value={"err": "ok", "status": {"phase": "checking"}})
    def test_admin_check(self, executor):
        response = self.json(
            "/api/admin/upgrade",
            method="POST",
            body=json.dumps({"action": "check"}),
            headers={"Content-Type": "application/json", "X-Talebook-Upgrade": "1"},
        )
        self.assertEqual(response["err"], "ok")
        executor.assert_called_once_with("check", None)

    @mock.patch("webserver.handlers.upgrade.request_executor")
    def test_cross_origin_and_simple_form_rejected(self, executor):
        response = self.json("/api/admin/upgrade", method="POST", body="action=install")
        self.assertEqual(response["err"], "origin")
        response = self.json(
            "/api/admin/upgrade",
            method="POST",
            body='{"action":"install"}',
            headers={
                "Origin": "https://evil.example",
                "Content-Type": "application/json",
                "X-Talebook-Upgrade": "1",
            },
        )
        self.assertEqual(response["err"], "origin")
        executor.assert_not_called()

    @mock.patch("webserver.handlers.base.BaseHandler.get_current_user")
    @mock.patch("webserver.handlers.upgrade.request_executor")
    def test_regular_user_rejected(self, executor, current_user):
        current_user.return_value = mock.Mock()
        response = self.json("/api/admin/upgrade")
        self.assertEqual(response["err"], "permission.not_admin")
        for action in ("activate", "delete", "delete_backup", "retention"):
            response = self.json(
                "/api/admin/upgrade",
                method="POST",
                body=json.dumps({"action": action}),
                headers={"Content-Type": "application/json", "X-Talebook-Upgrade": "1"},
            )
            self.assertEqual(response["err"], "permission.not_admin")
        executor.assert_not_called()

    @mock.patch("webserver.handlers.upgrade.request_executor", return_value={"err": "ok", "status": {"phase": "idle"}})
    def test_admin_version_management(self, executor):
        for action in ("activate", "delete", "delete_backup", "retention"):
            executor.reset_mock()
            response = self.json(
                "/api/admin/upgrade",
                method="POST",
                body=json.dumps({"action": action, "release": "a" * 40, "keep": 4}),
                headers={"Content-Type": "application/json", "X-Talebook-Upgrade": "1"},
            )
            self.assertEqual(response["err"], "ok")
            if action == "retention":
                executor.assert_called_once_with(action, None, 4)
            else:
                executor.assert_called_once_with(action, "a" * 40)

    def test_external_health_probe_hidden(self):
        self.assertEqual(self.fetch("/api/upgrade/health", headers={"X-Forwarded-For": "1.2.3.4"}).code, 404)


class TestOldFrontend(TestWithAdminUser):
    @mock.patch("webserver.handlers.upgrade.request_executor")
    def test_old_frontend_request_rejected_before_mutation(self, executor):
        response = self.fetch(
            "/api/admin/upgrade",
            method="POST",
            body='{"action":"install"}',
            headers={
                "X-Talebook-App-Version": "outdated-application",
                "Content-Type": "application/json",
                "X-Talebook-Upgrade": "1",
            },
        )
        self.assertEqual(response.code, 409)
        self.assertEqual(json.loads(response.body)["err"], "upgrade.reload")
        executor.assert_not_called()


class TestUnavailableUpgrade(TestApp):
    @mock.patch.dict("os.environ", {"TALEBOOK_UPGRADE_MODE": "ssr"})
    @mock.patch("webserver.services.application_upgrade.socket.socket", side_effect=OSError)
    def test_ssr_explains_unsupported_mode(self, socket):
        from webserver.services.application_upgrade import request_executor

        self.assertEqual(request_executor("status")["err"], "mode")
