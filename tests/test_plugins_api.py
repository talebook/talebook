import json
from unittest import mock

from webserver import loader
from tests.test_main import TestWithAdminUser, get_db, setUpModule as init
from webserver.models import PluginConnection, PluginInstallation, PluginSecret
from webserver.plugins.runtime import ProviderAuthError, ProviderRateLimitError, WereadProvider


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

    @mock.patch("webserver.handlers.plugin_weread.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch("webserver.handlers.plugin_weread.WereadProvider")
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

    @mock.patch("webserver.handlers.plugin_weread.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch("webserver.handlers.plugin_weread.WereadProvider")
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

    @mock.patch("webserver.handlers.plugin_weread.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch.object(WereadProvider, "_fetch_all", return_value=[])
    @mock.patch("webserver.handlers.plugin_weread.WereadProvider")
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


class TestGenericActionInputData(TestWithAdminUser):
    """通用动作端点透传 input_data：weread 不再需要私有端点，且服务端受控字段不可被伪造。"""

    def _weread_connection(self):
        session = get_db()
        installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.weread").first()
        return (
            session.query(PluginConnection)
            .filter(
                PluginConnection.installation_id == installation.id,
                PluginConnection.owner_type == "user",
                PluginConnection.owner_id == 1,
            )
            .first()
        )

    @mock.patch("webserver.handlers.plugin_weread.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_weread_no_longer_rejected_by_generic_action_endpoint(self, mocked):
        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": []}):
            self.json(
                "/api/plugins/weread/query",
                method="POST",
                body=json.dumps({"api_key": "unit-test-key", "operation": "shelf", "params": {}}),
            )
        connection = self._weread_connection()
        self.assertIsNotNone(connection, "微信读书连接应已建立")

        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": [], "hasMore": False}):
            data = self.json(
                "/api/plugins/connections/%d/preview" % connection.id,
                method="POST",
                body=json.dumps({"input_data": {}}),
            )

        self.assertNotEqual(data.get("err"), "plugin.action_requires_import_endpoint")
        self.assertEqual(data["err"], "ok")
        self.assertEqual(data["run"]["action"], "preview")

    @mock.patch("webserver.handlers.plugin_weread.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_client_supplied_allowed_book_ids_is_discarded(self, mocked):
        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": []}):
            self.json(
                "/api/plugins/weread/query",
                method="POST",
                body=json.dumps({"api_key": "unit-test-key", "operation": "shelf", "params": {}}),
            )
        connection = self._weread_connection()

        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": [], "hasMore": False}):
            data = self.json(
                "/api/plugins/connections/%d/preview" % connection.id,
                method="POST",
                body=json.dumps({"input_data": {"allowed_book_ids": [999999], "keep": "me"}}),
            )
        self.assertEqual(data["err"], "ok")

        session = get_db()
        from webserver.models import PluginRun

        run = session.get(PluginRun, data["run"]["id"])
        self.assertEqual(run.input_data.get("keep"), "me", "非受控字段应原样透传")
        self.assertNotIn(999999, run.input_data.get("allowed_book_ids") or [], "客户端伪造的可见书籍白名单必须被丢弃")

    def test_input_data_must_be_an_object(self):
        catalog = self.json("/api/admin/plugins")
        installation = next(item for item in catalog["installations"] if item["plugin_key"] == "talebook.book-source.opds")
        connections = self.json("/api/admin/plugins/connections")["connections"]
        connection = next(item for item in connections if item["installation_id"] == installation["id"])

        data = self.json(
            "/api/admin/plugins/connections/%d/test" % connection["id"],
            method="POST",
            body=json.dumps({"input_data": "not-an-object"}),
        )
        self.assertEqual(data["err"], "plugin.request_invalid")


class TestConnectionRoleAtRealEntrypoints(TestWithAdminUser):
    """连接创建入口必须传 role。

    save_connection 有 `role = role or name` 的兼容兜底，因此入口只要漏传 role，
    就会退回按展示名定位——正是 role 列要根除的失败。原先的测试只覆盖了显式
    传 role 的路径，恰好绕开了这两个真实入口。
    """

    def _opds_installation(self):
        catalog = self.json("/api/admin/plugins")
        return next(item for item in catalog["installations"] if item["plugin_key"] == "talebook.book-source.opds")

    def test_admin_created_connection_is_keyed_by_role_not_name(self):
        installation = self._opds_installation()
        created = self.json(
            "/api/admin/plugins/connections",
            method="POST",
            body=json.dumps({"installation_id": installation["id"], "name": "我的 OPDS", "credentials": {}}),
        )
        self.assertEqual(created["err"], "ok")
        self.assertEqual(created["connection"]["role"], "default", "入口必须传 role，不能退回按名字定位")

        renamed = self.json(
            "/api/admin/plugins/connections",
            method="POST",
            body=json.dumps({"installation_id": installation["id"], "name": "改了个名", "credentials": {}}),
        )
        self.assertEqual(renamed["err"], "ok")
        self.assertEqual(renamed["connection"]["id"], created["connection"]["id"], "改名不得产生第二条连接")
        self.assertEqual(renamed["connection"]["name"], "改了个名")

    def test_explicit_role_still_allows_multiple_connections(self):
        installation = self._opds_installation()
        primary = self.json(
            "/api/admin/plugins/connections",
            method="POST",
            body=json.dumps({"installation_id": installation["id"], "name": "主力", "role": "primary", "credentials": {}}),
        )
        backup = self.json(
            "/api/admin/plugins/connections",
            method="POST",
            body=json.dumps({"installation_id": installation["id"], "name": "备用", "role": "backup", "credentials": {}}),
        )
        self.assertEqual(primary["err"], "ok")
        self.assertEqual(backup["err"], "ok")
        self.assertNotEqual(primary["connection"]["id"], backup["connection"]["id"])
