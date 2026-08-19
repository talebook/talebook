import json
from unittest import mock

from tests.test_main import TestWithAdminUser, get_db
from tests.test_main import setUpModule as init
from webserver import loader
from webserver.models import PluginConnection, PluginInstallation, PluginRun, PluginRunItem, PluginSecret
from webserver.plugins.runtime import ProviderAuthError, ProviderRateLimitError, WereadProvider


def setUpModule():
    init()


class TestPluginsApi(TestWithAdminUser):
    def _delete_private_run(self, connection_id, run_id):
        session = get_db()
        session.query(PluginRunItem).filter(PluginRunItem.run_id == run_id).delete()
        session.query(PluginRun).filter(PluginRun.id == run_id).delete()
        session.query(PluginConnection).filter(PluginConnection.id == connection_id).delete()
        session.commit()

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

    def test_admin_cannot_execute_list_or_read_user_owned_plugin_runs(self):
        self.json("/api/admin/plugins")
        session = get_db()
        installation = session.query(PluginInstallation).filter_by(plugin_key="talebook.book-source.opds").one()
        connection = PluginConnection(
            installation_id=installation.id,
            owner_type="user",
            owner_id=2,
            name="qa-private-run",
            config={},
            scopes=[],
            cursor={},
        )
        session.add(connection)
        session.flush()
        run = PluginRun(
            connection_id=connection.id,
            action="run",
            status="succeeded",
            requested_by=2,
            counts={},
            cursor_before={},
            cursor_after={},
            input_data={},
        )
        session.add(run)
        session.flush()
        session.add(
            PluginRunItem(
                run_id=run.id,
                external_id="private-note",
                entity_type="annotation",
                status="succeeded",
                data={"content": "user two private highlight"},
            )
        )
        session.commit()
        self.addCleanup(self._delete_private_run, connection.id, run.id)

        action = self.json(
            "/api/admin/plugins/connections/%d/run" % connection.id,
            method="POST",
            body="{}",
        )
        listed = self.json("/api/admin/plugins/runs?include_items=true")
        detail = self.json("/api/admin/plugins/runs/%d" % run.id)

        self.assertEqual(action["err"], "plugin.connection_forbidden")
        self.assertNotIn(run.id, [item["id"] for item in listed["runs"]])
        self.assertNotIn("user two private highlight", json.dumps(listed, ensure_ascii=False))
        self.assertEqual(detail["err"], "plugin.run_missing")
        self.assertNotIn("user two private highlight", json.dumps(detail, ensure_ascii=False))

    def tearDown(self):
        session = get_db()
        session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.book-source.opds").update(
            {PluginInstallation.enabled: True}
        )
        session.commit()


class TestWereadIntegrationApi(TestWithAdminUser):
    api_key = "wrk-unit-test-only"

    def _clear_user_connection(self):
        session = get_db()
        connections = (
            session.query(PluginConnection)
            .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == 1, PluginConnection.name == "微信读书")
            .all()
        )
        secret_ids = [item.secret_id for item in connections if item.secret_id]
        for connection in connections:
            session.delete(connection)
        session.commit()
        if secret_ids:
            session.query(PluginSecret).filter(PluginSecret.id.in_(secret_ids)).delete(synchronize_session=False)
        installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.weread").first()
        if installation is not None:
            installation.enabled = True
        session.commit()

    def setUp(self):
        super().setUp()
        self._clear_user_connection()

    def tearDown(self):
        self._clear_user_connection()
        super().tearDown()

    def test_state_advertises_every_read_only_skill_operation(self):
        data = self.json("/api/plugins/weread")

        self.assertEqual(data["err"], "ok")
        self.assertTrue(data["read_only"])
        self.assertEqual(data["skill_version"], "1.0.4")
        self.assertEqual(
            set(data["operations"]),
            {
                "search",
                "book_info",
                "chapters",
                "progress",
                "shelf",
                "statistics",
                "notebooks",
                "highlights",
                "my_reviews",
                "popular_highlights",
                "underline_stats",
                "highlight_reviews",
                "review_detail",
                "public_reviews",
                "recommendations",
                "similar",
                "friends_reading",
            },
        )

        catalog = self.json("/api/admin/plugins")
        definition = next(item for item in catalog["definitions"] if item["plugin_key"] == "talebook.weread")
        self.assertIn("metadata", definition["categories"])
        self.assertIn("metadata.lookup", definition["capabilities"])

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch("webserver.handlers.plugins.WereadProvider")
    def test_query_stores_key_for_owner_but_redacts_it_from_response(self, provider_class, _settings):
        provider_class.return_value.query.return_value = {
            "api_key": self.api_key,
            "nested": "upstream echoed %s" % self.api_key,
            "title": "活着",
        }

        data = self.json(
            "/api/plugins/weread/query",
            method="POST",
            body=json.dumps({"api_key": self.api_key, "operation": "search", "params": {"keyword": "活着"}}),
        )

        self.assertEqual(data["err"], "ok")
        self.assertEqual(data["data"]["api_key"], "[REDACTED]")
        self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))
        provider_class.return_value.query.assert_called_once_with(self.api_key, "search", {"keyword": "活着"})
        self.assertEqual(data["connection"]["owner_type"], "user")
        self.assertEqual(data["connection"]["owner_id"], 1)
        self.assertTrue(data["connection"]["secret"]["configured"])

        state = self.json("/api/plugins/weread")
        self.assertEqual(state["connection"]["owner_id"], 1)
        self.assertNotIn(self.api_key, json.dumps(state, ensure_ascii=False))

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch("webserver.handlers.plugins.WereadProvider")
    def test_query_maps_auth_and_rate_limit_errors_without_returning_key(self, provider_class, _settings):
        for error, code in (
            (ProviderAuthError("credential rejected"), "provider_unauthorized"),
            (ProviderRateLimitError("too many requests"), "provider_rate_limited"),
        ):
            provider_class.return_value.query.side_effect = error
            data = self.json(
                "/api/plugins/weread/query",
                method="POST",
                body=json.dumps({"api_key": self.api_key, "operation": "notebooks", "params": {"count": 1}}),
            )
            self.assertEqual(data["err"], code)
            self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch.object(WereadProvider, "_fetch_all", return_value=[])
    @mock.patch("webserver.handlers.plugins.WereadProvider")
    def test_import_preview_reuses_saved_connection_without_api_key(self, query_provider, fetch_all, _settings):
        query_provider.return_value.query.return_value = {"results": []}
        connected = self.json(
            "/api/plugins/weread/query",
            method="POST",
            body=json.dumps({"api_key": self.api_key, "operation": "search", "params": {"keyword": "活着"}}),
        )
        self.assertEqual(connected["err"], "ok")

        preview = self.json(
            "/api/plugins/weread/import",
            method="POST",
            body=json.dumps({"action": "preview"}),
        )

        self.assertEqual(preview["err"], "ok")
        self.assertEqual(preview["run"]["status"], "succeeded")
        fetch_all.assert_called_once_with(self.api_key)
