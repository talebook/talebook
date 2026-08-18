import json
from unittest import mock

from webserver import loader
from tests.test_main import TestWithAdminUser, get_db, setUpModule as init
from webserver.models import PluginInstallation


def setUpModule():
    init()


class TestPluginsApi(TestWithAdminUser):
    def test_catalog_bootstraps_builtin_capabilities_without_excluded_sources(self):
        data = self.json("/api/admin/plugins")

        self.assertEqual(data["err"], "ok")
        definitions = {item["plugin_key"]: item for item in data["definitions"]}
        self.assertIn("talebook.metadata.builtin", definitions)
        self.assertIn("talebook.book-source.opds", definitions)
        self.assertIn("talebook.book-source.legado", definitions)
        payload = json.dumps(data, ensure_ascii=False).lower()
        self.assertNotIn("calibre content server", payload)
        self.assertNotIn("calibre-web", payload)
        self.assertNotIn('"ai"', payload)
        self.assertIn("builtin_state", data)

    def test_installation_state_can_be_disabled_and_reenabled_without_deleting_connection(self):
        catalog = self.json("/api/admin/plugins")
        installation = next(
            item for item in catalog["installations"] if item["plugin_key"] == "talebook.book-source.opds"
        )
        connections_before = self.json("/api/admin/plugins/connections")["connections"]

        disabled = self.json(
            "/api/admin/plugins/installations/%d/state" % installation["id"],
            method="POST",
            body=json.dumps({"enabled": False}),
        )
        self.assertEqual(disabled["err"], "ok")
        self.assertFalse(disabled["installation"]["enabled"])
        self.assertEqual(len(self.json("/api/admin/plugins/connections")["connections"]), len(connections_before))

        enabled = self.json(
            "/api/admin/plugins/installations/%d/state" % installation["id"],
            method="POST",
            body=json.dumps({"enabled": True}),
        )
        self.assertEqual(enabled["err"], "ok")
        self.assertTrue(enabled["installation"]["enabled"])

    def test_opds_service_setting_is_managed_by_the_plugin_api_without_resetting_legacy_value(self):
        settings = loader.get_settings()
        original = settings.get("OPDS_ENABLED", True)
        self.addCleanup(settings.__setitem__, "OPDS_ENABLED", original)
        settings["OPDS_ENABLED"] = False

        catalog = self.json("/api/admin/plugins")
        state = catalog["builtin_state"]["talebook.book-source.opds"]
        self.assertFalse(state["service_enabled"])

        with mock.patch("webserver.handlers.admin.SettingsSaverLogic.save_extra_settings") as save:
            save.return_value = {"err": "ok"}
            result = self.json(
                "/api/admin/plugins/opds-service",
                method="POST",
                body=json.dumps({"enabled": True}),
            )

        self.assertEqual(result["err"], "ok")
        self.assertTrue(result["enabled"])
        self.assertTrue(save.call_args.args[0]["OPDS_ENABLED"])

    def test_opds_service_setting_rejects_non_boolean_values(self):
        result = self.json(
            "/api/admin/plugins/opds-service",
            method="POST",
            body=json.dumps({"enabled": "false"}),
        )

        self.assertEqual(result["err"], "plugin.request_invalid")

    def test_run_detail_returns_not_found_without_leaking_internal_data(self):
        data = self.json("/api/admin/plugins/runs/999999")
        self.assertEqual(data["err"], "plugin.run_missing")
        self.assertNotIn("traceback", json.dumps(data).lower())

    def tearDown(self):
        session = get_db()
        session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.book-source.opds").update(
            {PluginInstallation.enabled: True}
        )
        session.commit()
