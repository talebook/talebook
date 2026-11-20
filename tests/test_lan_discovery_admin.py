import json
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from tests.test_main import TestWithAdminUser
from tests.test_main import setUpModule as init
from webserver import loader
from webserver.handlers.admin import AdminSettings


def setUpModule():
    init()


class DiscoveryAdminTest(TestWithAdminUser):
    def setUp(self):
        super().setUp()
        self.directory = tempfile.TemporaryDirectory()
        self.conf_patch = mock.patch.dict(
            loader.get_settings(),
            {
                "LAN_DISCOVERY_ENABLED": False,
                "LAN_DISCOVERY_ENDPOINTS": [],
                "site_title": "Test library",
                "settings_path": self.directory.name,
                "nuxt_env_path": str(Path(self.directory.name) / ".env"),
            },
        )
        self.conf_patch.start()
        self.manager = self._app.settings["discovery_manager"]
        self._app.settings["discovery_manager"] = mock.Mock()
        self.endpoint = {"url": "http://192.168.50.10:8080", "addresses": ["192.168.50.10"], "interfaces": ["eth0"]}

    def tearDown(self):
        self._app.settings["discovery_manager"] = self.manager
        self.conf_patch.stop()
        self.directory.cleanup()
        super().tearDown()

    def save(self, **patch):
        return self.json("/api/admin/settings", method="POST", body=json.dumps(patch))

    def test_persist_then_reconcile_and_immutable_identity(self):
        response = self.save(
            LAN_DISCOVERY_ENABLED=True, LAN_DISCOVERY_ENDPOINTS=[self.endpoint], LAN_DISCOVERY_INSTANCE_ID="forged"
        )
        self.assertEqual(response["err"], "ok")
        self._app.settings["discovery_manager"].request.assert_called_once()
        saved = (Path(self.directory.name) / "auto.py").read_text()
        self.assertIn("LAN_DISCOVERY_ENABLED", saved)
        self.assertNotIn("forged", saved)
        self.assertTrue(loader.get_settings()["LAN_DISCOVERY_ENABLED"])

    def test_failed_persistence_does_not_apply_or_reconcile(self):
        with mock.patch.object(loader.SettingsLoader, "dumpfile", side_effect=PermissionError()):
            response = self.save(LAN_DISCOVERY_ENABLED=True, LAN_DISCOVERY_ENDPOINTS=[self.endpoint])
        self.assertEqual(response["err"], "file.permission")
        self.assertFalse(loader.get_settings()["LAN_DISCOVERY_ENABLED"])
        self._app.settings["discovery_manager"].request.assert_not_called()

    def test_invalid_configuration_rejected_without_write(self):
        for endpoint in (
            [],
            [dict(self.endpoint, url="http://user:pass@192.168.50.10:8080")],
            [dict(self.endpoint, addresses=["127.0.0.1"])],
        ):
            response = self.save(LAN_DISCOVERY_ENABLED=True, LAN_DISCOVERY_ENDPOINTS=endpoint)
            self.assertEqual(response["err"], "params.lan_discovery")
        self.assertFalse((Path(self.directory.name) / "auto.py").exists())

    def test_manual_override_is_effective_after_save_and_get(self):
        with mock.patch.dict("sys.modules", manual=SimpleNamespace(settings={"LAN_DISCOVERY_ENABLED": False})):
            response = self.save(LAN_DISCOVERY_ENABLED=True, LAN_DISCOVERY_ENDPOINTS=[self.endpoint])
            self.assertEqual(response["err"], "ok")
            self.assertFalse(loader.get_settings()["LAN_DISCOVERY_ENABLED"])
            response = self.json("/api/admin/settings")
            self.assertFalse(response["settings"]["LAN_DISCOVERY_ENABLED"])

    def test_non_admin_cannot_read_or_write_discovery(self):
        previous = self.user.return_value
        self.user.return_value = 2
        try:
            self.assertEqual(self.json("/api/admin/discovery")["err"], "permission")
            self.assertEqual(self.save(LAN_DISCOVERY_ENABLED=True)["err"], "permission")
        finally:
            self.user.return_value = previous
        self._app.settings["discovery_manager"].request.assert_not_called()

    def test_demo_save_and_status_are_isolated(self):
        loader.get_settings()["LAN_DISCOVERY_ENABLED"] = True
        loader.get_settings()["LAN_DISCOVERY_ENDPOINTS"] = [self.endpoint]
        with mock.patch.object(AdminSettings, "is_demo_fake_admin", return_value=True):
            self.assertEqual(self.save(LAN_DISCOVERY_ENABLED=False)["err"], "ok")
            response = self.json("/api/admin/discovery")
        self.assertFalse(response["enabled"])
        self.assertEqual(response["endpoints"], [])
        self.assertEqual(response["interfaces"], {})
        self.assertIsNone(response["status"]["instance_id"])
        self.assertTrue(loader.get_settings()["LAN_DISCOVERY_ENABLED"])
        self._app.settings["discovery_manager"].request.assert_not_called()
