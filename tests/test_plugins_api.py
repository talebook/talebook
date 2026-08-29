import json
from unittest import mock

from tests.test_main import BID_EPUB, TestWithAdminUser, TestWithUserLogin, get_db, temporary_book_scope
from tests.test_main import setUpModule as init
from webserver import loader
from webserver.models import PluginConnection, PluginEntityMatch, PluginInstallation, PluginRun, PluginSecret, Reader
from webserver.plugins.combo.weread import WereadProvider
from webserver.plugins.runtime import UpstreamAuthError, UpstreamRateLimitError


def setUpModule():
    init()


class OrdinaryUserMixin:
    """让普通用户 API 测试真的以非管理员身份执行。"""

    def setUp(self):
        super().setUp()
        session = get_db()
        user = session.get(Reader, 1)
        self._original_admin = bool(user.admin)
        user.admin = False
        session.commit()

    def tearDown(self):
        session = get_db()
        user = session.get(Reader, 1)
        user.admin = self._original_admin
        session.commit()
        super().tearDown()


class TestPluginsApi(TestWithAdminUser):
    def test_catalog_bootstraps_builtin_capabilities_without_excluded_sources(self):
        data = self.json("/api/admin/plugins")

        self.assertEqual(data["err"], "ok")
        definitions = {item["plugin_key"]: item for item in data["definitions"]}
        self.assertNotIn("talebook.meta.builtin", definitions)
        self.assertIn("talebook.source.opds", definitions)
        self.assertIn("talebook.source.legado", definitions)
        payload = json.dumps(data, ensure_ascii=False).lower()
        self.assertNotIn("calibre content server", payload)
        self.assertNotIn("calibre-web", payload)
        self.assertNotIn('"ai"', payload)
        self.assertIn("builtin_state", data)

    def test_installation_state_can_be_disabled_and_reenabled_without_deleting_connection(self):
        catalog = self.json("/api/admin/plugins")
        installation = next(item for item in catalog["installations"] if item["plugin_key"] == "talebook.source.opds")
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
        state = catalog["builtin_state"]["talebook.source.opds"]
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

    def test_input_data_must_be_an_object(self):
        catalog = self.json("/api/admin/plugins")
        installation = next(item for item in catalog["installations"] if item["plugin_key"] == "talebook.source.opds")
        connections = self.json("/api/admin/plugins/connections")["connections"]
        connection = next(item for item in connections if item["installation_id"] == installation["id"])

        for invalid in ("not-an-object", []):
            with self.subTest(invalid=invalid):
                data = self.json(
                    "/api/admin/plugins/connections/%d/test" % connection["id"],
                    method="POST",
                    body=json.dumps({"input_data": invalid}),
                )
                self.assertEqual(data["err"], "plugin.request_invalid")

    def tearDown(self):
        session = get_db()
        session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.source.opds").update(
            {PluginInstallation.enabled: True}
        )
        session.commit()


class TestWereadIntegrationApi(OrdinaryUserMixin, TestWithUserLogin):
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
        installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.combo.weread").first()
        if installation is not None:
            installation.enabled = True
        session.commit()

    def setUp(self):
        super().setUp()
        self._clear_user_connection()

    def tearDown(self):
        self._clear_user_connection()
        super().tearDown()

    def test_generic_state_advertises_every_declared_workbench_feature(self):
        data = self.json("/api/plugins/talebook.combo.weread")

        self.assertEqual(data["err"], "ok")
        self.assertEqual(
            set(data["plugin"]["extra_features"]),
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
        self.assertEqual(data["connections"], [])
        self.assertEqual(data["runs"], [])

        self.assertIn("metadata", data["plugin"]["categories"])
        self.assertIn("metadata.lookup", data["plugin"]["capabilities"])

    @mock.patch(
        "webserver.handlers.plugins.loader.get_settings",
        return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key", "cookie_secret": "unused"},
    )
    @mock.patch.object(WereadProvider, "_gateway")
    def test_every_workbench_query_uses_the_generic_feature_route(self, gateway, _settings):
        gateway.return_value = {"results": []}

        data = self.json(
            "/api/plugins/talebook.combo.weread/features/search",
            method="POST",
            body=json.dumps(
                {
                    "credentials": {"api_key": self.api_key},
                    "params": {"keyword": "活着"},
                }
            ),
        )

        self.assertEqual(data["err"], "ok")
        self.assertEqual(data["data"], {"results": []})
        gateway.assert_called_once_with(self.api_key, "/store/search", keyword="活着")
        self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))

    def test_extra_feature_rejects_undeclared_action_and_unknown_params(self):
        unsupported = self.json(
            "/api/plugins/talebook.combo.weread/features/delete_account",
            method="POST",
            body=json.dumps({"credentials": {"api_key": self.api_key}, "params": {}}),
        )
        self.assertEqual(unsupported["err"], "plugin.feature_not_supported")

        invalid = self.json(
            "/api/plugins/talebook.combo.weread/features/statistics",
            method="POST",
            body=json.dumps({"credentials": {"api_key": self.api_key}, "params": {"surprise": True}}),
        )
        self.assertEqual(invalid["err"], "feature.unknown_field")

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch.object(WereadProvider, "_gateway")
    def test_feature_stores_key_for_owner_but_redacts_it_from_response(self, gateway, _settings):
        gateway.return_value = {
            "api_key": self.api_key,
            "nested": "upstream echoed %s" % self.api_key,
            "title": "活着",
        }

        data = self.json(
            "/api/plugins/talebook.combo.weread/features/search",
            method="POST",
            body=json.dumps({"credentials": {"api_key": self.api_key}, "params": {"keyword": "活着"}}),
        )

        self.assertEqual(data["err"], "ok")
        self.assertEqual(data["data"]["api_key"], "[REDACTED]")
        self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))
        gateway.assert_called_once_with(self.api_key, "/store/search", keyword="活着")
        self.assertEqual(data["connection"]["owner_type"], "user")
        self.assertEqual(data["connection"]["owner_id"], 1)
        self.assertTrue(data["connection"]["secret"]["configured"])

        state = self.json("/api/plugins/talebook.combo.weread")
        self.assertEqual(state["connections"][0]["owner_id"], 1)
        self.assertNotIn(self.api_key, json.dumps(state, ensure_ascii=False))

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch.object(WereadProvider, "_gateway")
    def test_feature_maps_auth_and_rate_limit_errors_without_returning_key(self, gateway, _settings):
        for error, code in (
            (UpstreamAuthError("credential rejected"), "provider_unauthorized"),
            (UpstreamRateLimitError("too many requests"), "provider_rate_limited"),
        ):
            gateway.side_effect = error
            data = self.json(
                "/api/plugins/talebook.combo.weread/features/notebooks",
                method="POST",
                body=json.dumps({"credentials": {"api_key": self.api_key}, "params": {"count": 1}}),
            )
            self.assertEqual(data["err"], code)
            self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))

    @mock.patch("webserver.services.AsyncService.async_mode", return_value=False)
    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    @mock.patch.object(WereadProvider, "_fetch_all", return_value=[])
    @mock.patch.object(WereadProvider, "_gateway", return_value={"results": []})
    def test_generic_import_preview_reuses_saved_connection_without_api_key(self, gateway, fetch_all, _settings, _async_mode):
        connected = self.json(
            "/api/plugins/talebook.combo.weread/features/search",
            method="POST",
            body=json.dumps({"credentials": {"api_key": self.api_key}, "params": {"keyword": "活着"}}),
        )
        self.assertEqual(connected["err"], "ok")

        preview = self.json(
            "/api/plugins/connections/%d/preview" % connected["connection"]["id"],
            method="POST",
            body=json.dumps({"input_data": {}}),
        )

        self.assertEqual(preview["err"], "ok")
        self.assertEqual(preview["run"]["status"], "succeeded")
        detail = self.json("/api/plugins/runs/%d" % preview["run"]["id"])
        self.assertEqual(detail["err"], "ok")
        self.assertEqual(detail["items"], [])
        fetch_all.assert_called_once_with(self.api_key)

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_user_connection_can_be_created_by_plugin_key_without_a_private_bootstrap_route(self, _settings):
        data = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {"api_key": self.api_key}}),
        )

        self.assertEqual(data["err"], "ok")
        self.assertEqual(data["connection"]["owner_type"], "user")
        self.assertEqual(data["connection"]["owner_id"], 1)
        self.assertTrue(data["connection"]["secret"]["configured"])
        self.assertNotIn(self.api_key, json.dumps(data, ensure_ascii=False))

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_generic_state_does_not_leak_another_users_connections_or_runs(self, _settings):
        own = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )["connection"]
        session = get_db()
        foreign = PluginConnection(
            installation_id=own["installation_id"],
            owner_type="user",
            owner_id=999,
            role="default",
            name="other user",
            scopes=[],
            enabled=True,
        )
        session.add(foreign)
        session.commit()
        own_run = PluginRun(connection_id=own["id"], action="test", status="succeeded", requested_by=1)
        foreign_run = PluginRun(connection_id=foreign.id, action="test", status="succeeded", requested_by=1)
        session.add_all([own_run, foreign_run])
        session.commit()
        foreign_id = foreign.id
        own_run_id = own_run.id
        foreign_run_id = foreign_run.id

        try:
            state = self.json("/api/plugins/talebook.combo.weread")
            self.assertEqual([item["id"] for item in state["connections"]], [own["id"]])
            self.assertIn(own_run.id, [item["id"] for item in state["runs"]])
            self.assertNotIn(foreign_run_id, [item["id"] for item in state["runs"]])
            self.assertEqual(self.json("/api/plugins/runs")["err"], "ok")
        finally:
            cleanup = get_db()
            cleanup.query(PluginRun).filter(PluginRun.id.in_([own_run_id, foreign_run_id])).delete(synchronize_session=False)
            cleanup.query(PluginConnection).filter(PluginConnection.id == foreign_id).delete()
            cleanup.commit()


class TestGenericActionInputData(OrdinaryUserMixin, TestWithUserLogin):
    """通用动作端点透传 input_data：weread 不再需要私有端点，且服务端受控字段不可被伪造。"""

    def _weread_connection(self):
        session = get_db()
        installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == "talebook.combo.weread").first()
        return (
            session.query(PluginConnection)
            .filter(
                PluginConnection.installation_id == installation.id,
                PluginConnection.owner_type == "user",
                PluginConnection.owner_id == 1,
            )
            .first()
        )

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_weread_no_longer_rejected_by_generic_action_endpoint(self, mocked):
        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": []}):
            self.json(
                "/api/plugins/talebook.combo.weread/features/shelf",
                method="POST",
                body=json.dumps({"credentials": {"api_key": "unit-test-key"}, "params": {}}),
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

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_client_supplied_allowed_book_ids_is_discarded(self, mocked):
        with mock.patch.object(WereadProvider, "_gateway", return_value={"books": []}):
            self.json(
                "/api/plugins/talebook.combo.weread/features/shelf",
                method="POST",
                body=json.dumps({"credentials": {"api_key": "unit-test-key"}, "params": {}}),
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
        run = session.get(PluginRun, data["run"]["id"])
        self.assertEqual(run.input_data.get("keep"), "me", "非受控字段应原样透传")
        self.assertNotIn(999999, run.input_data.get("allowed_book_ids") or [], "客户端伪造的可见书籍白名单必须被丢弃")

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_annotation_matches_are_platform_owned_and_reject_invisible_books(self, _settings):
        created = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )
        self.assertEqual(created["err"], "ok")

        rejected = self.json(
            "/api/plugins/connections/%d/preview" % created["connection"]["id"],
            method="POST",
            body=json.dumps({"input_data": {"export": [], "matches": {"source-1": 999999}}}),
        )
        self.assertEqual(rejected["err"], "plugin.match_book_forbidden")
        self.assertEqual(
            get_db().query(PluginEntityMatch).filter(PluginEntityMatch.connection_id == created["connection"]["id"]).count(), 0
        )
        invalid = self.json(
            "/api/plugins/connections/%d/preview" % created["connection"]["id"],
            method="POST",
            body=json.dumps({"input_data": {"export": [], "matches": []}}),
        )
        self.assertEqual(invalid["err"], "plugin.request_invalid")

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_invalid_retry_does_not_persist_confirmed_matches(self, _settings):
        created = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )

        rejected = self.json(
            "/api/plugins/connections/%d/retry" % created["connection"]["id"],
            method="POST",
            body=json.dumps(
                {
                    "parent_run_id": 999999,
                    "input_data": {"export": [], "matches": {"source-visible": BID_EPUB}},
                }
            ),
        )

        self.assertEqual(rejected["err"], "plugin.parent_run_invalid")
        self.assertEqual(
            get_db().query(PluginEntityMatch).filter(PluginEntityMatch.connection_id == created["connection"]["id"]).count(),
            0,
        )

    @mock.patch("webserver.handlers.plugins.execute_plugin_run")
    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_retry_replaces_stale_parent_book_visibility_with_the_current_user_scope(self, _settings, _execute_plugin_run):
        created = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )
        session = get_db()
        parent = PluginRun(
            connection_id=created["connection"]["id"],
            action="preview",
            status="failed",
            requested_by=1,
            input_data={"export": [], "allowed_book_ids": [BID_EPUB]},
        )
        session.add(parent)
        session.commit()
        parent_id = parent.id

        with temporary_book_scope(BID_EPUB, "private", collector_id=2):
            response = self.json(
                "/api/plugins/connections/%d/retry" % created["connection"]["id"],
                method="POST",
                body=json.dumps({"parent_run_id": parent_id, "input_data": {}}),
            )

        self.assertEqual(response["err"], "ok")
        retry = get_db().get(PluginRun, response["run"]["id"])
        self.assertNotIn(BID_EPUB, retry.input_data["allowed_book_ids"])
        self.assertEqual(retry.input_data["export"], [])

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_match_batch_rolls_back_when_a_later_selection_is_forbidden(self, _settings):
        created = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )

        rejected = self.json(
            "/api/plugins/connections/%d/preview" % created["connection"]["id"],
            method="POST",
            body=json.dumps(
                {
                    "input_data": {
                        "export": [],
                        "matches": {"source-visible": BID_EPUB, "source-forbidden": 999999},
                    }
                }
            ),
        )

        self.assertEqual(rejected["err"], "plugin.match_book_forbidden")
        self.assertEqual(
            get_db().query(PluginEntityMatch).filter(PluginEntityMatch.connection_id == created["connection"]["id"]).count(),
            0,
        )

    @mock.patch("webserver.handlers.plugins.loader.get_settings", return_value={"PLUGIN_SECRET_KEY": "weread-api-test-key"})
    def test_annotation_matches_are_not_forwarded_to_the_provider(self, _settings):
        created = self.json(
            "/api/plugins/connections",
            method="POST",
            body=json.dumps({"plugin_key": "talebook.combo.weread", "credentials": {}}),
        )
        response = self.json(
            "/api/plugins/connections/%d/preview" % created["connection"]["id"],
            method="POST",
            body=json.dumps({"input_data": {"export": [], "matches": {}}}),
        )

        self.assertEqual(response["err"], "ok")
        run = get_db().get(PluginRun, response["run"]["id"])
        self.assertNotIn("matches", run.input_data)


class TestConnectionRoleAtRealEntrypoints(TestWithAdminUser):
    """连接创建入口必须传 role。

    save_connection 有 `role = role or name` 的兼容兜底，因此入口只要漏传 role，
    就会退回按展示名定位——正是 role 列要根除的失败。原先的测试只覆盖了显式
    传 role 的路径，恰好绕开了这两个真实入口。
    """

    def _opds_installation(self):
        catalog = self.json("/api/admin/plugins")
        return next(item for item in catalog["installations"] if item["plugin_key"] == "talebook.source.opds")

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
