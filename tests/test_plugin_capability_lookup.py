"""按能力查询插件：调用方不再硬编码 plugin_key、连接名或自行解密凭据。"""

import asyncio
import inspect
import threading
import time
from unittest import mock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Base, PluginRun
from webserver.plugins.runtime.domains import CheckReport, Page, Review
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, UpstreamAuthError, UpstreamRateLimitError
from webserver.plugins.runtime.push import PUSH_CAPABILITY
from webserver.services.plugin_runtime import (
    PluginRegistry,
    PluginRuntime,
    PluginRuntimeError,
    install_builtin,
    save_connection,
)


SETTINGS = {"PLUGIN_SECRET_KEY": "capability-lookup-test-key", "cookie_secret": "unused-cookie-secret"}


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _plugin(plugin_id, capability, behaviour=None):
    class Plugin:
        calls = 0
        manifest = {
            "protocol_version": PROTOCOL_VERSION,
            "id": plugin_id,
            "name": plugin_id,
            "version": "1.0.0",
            "categories": [capability.split(".", 1)[0]],
            "capabilities": [capability],
            "runtime_kind": "builtin",
            "actions": ["test"],
            "auth_schema": {"type": "object", "properties": {}},
            "config_schema": {"type": "object", "properties": {}},
            "connection_owners": ["instance", "user"],
            "permissions": ["books.read"],
            "data_policy": {},
            "compatibility": {},
            "homepage": "",
            "license": "GPL-3.0",
        }

        def execute(self, context):
            return None

        def search_books(self, title, context):
            self.calls += 1
            if behaviour == "retry" and self.calls == 1:
                raise UpstreamRateLimitError("稍后重试", retry_after=0)
            if behaviour == "auth":
                raise UpstreamAuthError("凭据被拒")
            if behaviour == "boom":
                raise RuntimeError("上游炸了")
            return [{"title": title, "from": plugin_id, "scopes": context["scopes"]}]

        def get_metadata(self, external_id, context):
            return {"provider_value": external_id}

        def get_reviews(self, query, context):
            if behaviour == "pages":
                page = int((context.get("cursor") or {}).get("page", 1))
                return Page(
                    items=[Review.from_dict({"page": page, "title": query["title"]})],
                    has_more=page < 2,
                    next_cursor={"page": page + 1},
                )

            return Page()

    return Plugin()


def _install(db_session, registry, plugin, owner_type="instance", owner_id=0):
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)
    return save_connection(db_session, SETTINGS, installation.id, owner_type, owner_id, {}, name="默认连接")


def test_connections_are_selected_by_capability_not_by_plugin_key(db_session):
    registry = PluginRegistry()
    wanted = _plugin("talebook.test.meta-a", "metadata.lookup")
    other = _plugin("talebook.test.reviews", "reviews.import")
    registry.register(wanted)
    registry.register(other)
    _install(db_session, registry, wanted)
    _install(db_session, registry, other)

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    found = runtime.connections_for("metadata.lookup")

    assert [runtime.plugin_key_of(item) for item in found] == ["talebook.test.meta-a"]


def test_typed_only_provider_tests_connection_without_legacy_execute(db_session):
    template = _plugin("talebook.test.template", "metadata.lookup")

    class TypedOnly:
        manifest = {**template.manifest, "id": "talebook.test.typed-self-check"}

        def search_books(self, title, context):
            return []

        def get_metadata(self, external_id, context):
            return None

        def self_check(self, context):
            return CheckReport(healthy=True, message="typed connection healthy")

    provider = TypedOnly()
    registry = PluginRegistry()
    registry.register(provider)
    connection = _install(db_session, registry, provider)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)

    run = runtime.prepare_run(connection.id, "test", requested_by=1)
    runtime.execute(run.id)
    db_session.refresh(run)

    assert run.status == "succeeded"
    assert not hasattr(provider, "execute")


def test_user_scope_sees_instance_and_own_connections_only(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.meta-b", "metadata.lookup")
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)
    save_connection(db_session, SETTINGS, installation.id, "instance", 0, {}, name="共享")
    save_connection(db_session, SETTINGS, installation.id, "user", 7, {}, name="我的")
    save_connection(db_session, SETTINGS, installation.id, "user", 8, {}, name="别人的")

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    mine = runtime.connections_for("metadata.lookup", user_id=7)

    assert sorted(item.name for item in mine) == ["共享", "我的"]
    assert "别人的" not in [item.name for item in mine]


def test_disabled_installation_or_connection_is_excluded(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.meta-c", "metadata.lookup")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    assert runtime.connections_for("metadata.lookup")

    connection.enabled = False
    db_session.commit()
    assert runtime.connections_for("metadata.lookup") == []


def test_read_many_runs_concurrently_and_records_health(db_session):
    registry = PluginRegistry()
    ok = _plugin("talebook.test.ok", "metadata.lookup")
    bad = _plugin("talebook.test.bad", "metadata.lookup", behaviour="boom")
    denied = _plugin("talebook.test.denied", "metadata.lookup", behaviour="auth")
    for plugin in (ok, bad, denied):
        registry.register(plugin)
        _install(db_session, registry, plugin)

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    connections = runtime.connections_for("metadata.lookup")
    results = runtime.read_many(connections, "search_books", "三体")

    # 结果以 connection.id 为键：同一插件可能有多条连接，用 plugin_key 会互相覆盖。
    by_plugin = {runtime.plugin_key_of(item): results[item.id] for item in connections}
    assert by_plugin["talebook.test.ok"][0]["title"] == "三体"
    assert isinstance(by_plugin["talebook.test.bad"], Exception)
    assert isinstance(by_plugin["talebook.test.denied"], UpstreamAuthError)

    health = {runtime.plugin_key_of(item): item.health for item in connections}
    assert health["talebook.test.ok"] == "healthy"
    assert health["talebook.test.bad"] == "degraded"
    assert health["talebook.test.denied"] == "unauthorized"


def test_one_failing_plugin_does_not_break_the_batch(db_session):
    registry = PluginRegistry()
    ok = _plugin("talebook.test.survivor", "metadata.lookup")
    bad = _plugin("talebook.test.casualty", "metadata.lookup", behaviour="boom")
    for plugin in (ok, bad):
        registry.register(plugin)
        _install(db_session, registry, plugin)

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    connections = runtime.connections_for("metadata.lookup")
    results = runtime.read_many(connections, "search_books", "书名")

    by_plugin = {runtime.plugin_key_of(item): results[item.id] for item in connections}
    assert by_plugin["talebook.test.survivor"][0]["from"] == "talebook.test.survivor"


def test_read_many_retry_backoff_does_not_false_timeout_another_completed_connection(db_session):
    registry = PluginRegistry()
    rate_limited = _plugin("talebook.test.slow-backoff", "metadata.lookup")
    healthy = _plugin("talebook.test.short-deadline", "metadata.lookup")

    retry_calls = {"count": 0}

    def retry_after_backoff(title, context):
        retry_calls["count"] += 1
        if retry_calls["count"] == 1:
            raise UpstreamRateLimitError("retry later", retry_after=0.08)
        return [{"title": title, "from": rate_limited.manifest["id"]}]

    def delayed_success(title, context):
        time.sleep(0.02)
        return [{"title": title, "from": healthy.manifest["id"]}]

    rate_limited.search_books = retry_after_backoff
    healthy.search_books = delayed_success
    for plugin in (rate_limited, healthy):
        registry.register(plugin)
    slow_connection = _install(db_session, registry, rate_limited)
    fast_connection = _install(db_session, registry, healthy)
    slow_connection.config = {"timeout_seconds": 0.2, "max_retries": 1, "backoff_seconds": 0.08}
    fast_connection.config = {"timeout_seconds": 0.05}
    db_session.commit()

    def coordinator_must_not_sleep(_delay):
        raise AssertionError("read_many retry scheduling must not block the coordinator")

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, sleeper=coordinator_must_not_sleep)
    results = runtime.read_many([slow_connection, fast_connection], "search_books", "三体", timeout=0.3)

    assert not isinstance(results[fast_connection.id], Exception)
    assert results[fast_connection.id][0]["from"] == healthy.manifest["id"]
    assert not isinstance(results[slow_connection.id], Exception)


def test_push_route_creates_personal_connection_and_uses_sync_runtime(db_session, tmp_path):
    runtime = PluginRuntime(db_session, SETTINGS)
    provider = runtime.provider_for(PUSH_CAPABILITY, {"device_type": "boox"})
    connection = runtime.user_connection_for(
        PUSH_CAPABILITY,
        7,
        selector={"device_type": "boox"},
        config_updates={"device_url": "192.168.1.7:8080"},
    )
    book = tmp_path / "book.epub"
    book.write_bytes(b"epub")

    with mock.patch.object(provider, "uploader_class") as uploader:
        uploader.return_value.upload.return_value = {"success": True}
        result = runtime.sync(
            connection,
            "push",
            {"path": str(book), "name": "book.epub"},
            "",
            required_scopes=("books.read", "network.write"),
            requested_by=7,
            audit_data={"book_id": 1, "device_type": "boox"},
        )
        assert 0 < uploader.call_args.kwargs["timeout"] < 30

    run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
    assert result["success"] is True
    assert run.action == "sync"
    assert run.status == "succeeded"
    assert run.input_data == {"book_id": 1, "device_type": "boox"}
    assert connection.config["device_url"] == "192.168.1.7:8080"
    db_session.refresh(connection)
    assert connection.lease_token == ""
    assert connection.lease_until is None


def test_read_batch_timeout_keeps_the_grace_lease(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.batch-timeout", "metadata.lookup")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    batch = runtime.begin_read_batch(connection, timeout=0.1, requested_by=1)

    runtime.finish_read_batch(
        batch,
        {"source:1": PluginRuntimeError("plugin.timeout", "source timed out", retryable=True)},
    )

    run = db_session.get(PluginRun, batch["run_id"])
    db_session.refresh(connection)
    assert run.status == "failed"
    assert run.error_code == "plugin.timeout"
    assert connection.lease_token == batch["lease_token"]
    assert connection.lease_until is not None


def test_prepare_read_returns_callables_that_never_touch_the_session(db_session):
    """并发约束：worker 只做网络 I/O，session 访问全部留在调用线程。"""
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.prepared", "metadata.lookup")
    registry.register(plugin)
    _install(db_session, registry, plugin)

    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    prepared, failures = runtime.prepare_read(runtime.connections_for("metadata.lookup"))

    assert failures == {}
    assert len(prepared) == 1
    unit = prepared[0]
    # 凭据已在调用线程内解密并放进 context
    assert "secrets" in unit and isinstance(unit["secrets"], dict)
    assert unit["call"]("search_books", "标题")[0]["title"] == "标题"


def test_external_pool_bridge_uses_lease_retry_and_durable_audit(db_session):
    """既有流式线程池桥接也必须继承 typed runtime 的租约、重试与审计。"""
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.external-pool", "metadata.lookup", behaviour="retry")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, sleeper=lambda _delay: None)

    prepared, failures = runtime.prepare_read(
        [connection],
        required_scopes=("books.read",),
        audit=True,
        requested_by=1,
    )
    assert failures == {}

    outcome = prepared[0]["call"]("search_books", "三体")
    runtime.finish_read(prepared, {connection.id: outcome})

    run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
    assert outcome[0]["title"] == "三体"
    assert run.status == "succeeded"
    assert run.attempt == 2
    db_session.refresh(connection)
    assert connection.lease_token == ""
    assert connection.lease_until is None


def test_read_rejects_missing_mode_scope_before_dispatch(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.scope-denied", "metadata.lookup")
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)
    connection = save_connection(
        db_session,
        SETTINGS,
        installation.id,
        "instance",
        0,
        {},
        scopes=[],
        name="无权限连接",
    )
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)

    with pytest.raises(PluginRuntimeError) as exc:
        runtime.read(connection, "search_books", "三体", required_scopes=("books.read",))

    assert exc.value.code == "plugin.scope_denied"
    assert connection.health == "degraded"


def test_typed_read_uses_lease_retry_and_durable_audit(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.audited-read", "metadata.lookup", behaviour="retry")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, sleeper=lambda _delay: None)

    result = runtime.read(connection, "search_books", "三体", required_scopes=("books.read",))

    assert result[0]["title"] == "三体"
    run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
    assert run.action == "read"
    assert run.status == "succeeded"
    assert run.attempt == 2
    db_session.refresh(connection)
    assert connection.lease_until is None


def test_typed_runtime_redacts_provider_errors_before_returning_them(db_session):
    secret_value = "instance-secret-must-not-leak"
    plugin = _plugin("talebook.test.secret-error", "metadata.lookup")
    plugin.manifest = {
        **plugin.manifest,
        "auth_schema": {
            "type": "object",
            "required": ["token"],
            "properties": {"token": {"type": "string", "writeOnly": True}},
        },
    }

    def leak_secret(_title, context):
        raise RuntimeError("upstream echoed token=%s" % context["secrets"]["token"])

    plugin.search_books = leak_secret
    registry = PluginRegistry()
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)
    connection = save_connection(
        db_session,
        SETTINGS,
        installation.id,
        "instance",
        0,
        {"token": secret_value},
    )
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)

    with pytest.raises(PluginRuntimeError) as exc:
        runtime.read(connection, "search_books", "三体")
    assert secret_value not in str(exc.value)
    assert "[REDACTED]" in str(exc.value)

    batch = runtime.read_many([connection], "search_books", "三体")
    assert isinstance(batch[connection.id], PluginRuntimeError)
    assert secret_value not in str(batch[connection.id])

    runs = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).all()
    assert len(runs) == 2
    assert all(secret_value not in run.error_message for run in runs)
    db_session.refresh(connection)
    assert secret_value not in connection.health_message


def test_typed_retry_uses_connection_timeout_as_one_wall_clock_budget(db_session):
    plugin = _plugin("talebook.test.retry-deadline", "metadata.lookup")
    calls = {"count": 0}

    def slow_retry(title, context):
        calls["count"] += 1
        if calls["count"] == 1:
            raise UpstreamRateLimitError("retry", retry_after=0.04)
        time.sleep(0.03)
        return [{"title": title}]

    plugin.search_books = slow_retry
    registry = PluginRegistry()
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    connection.config = {"timeout_seconds": 0.05, "max_retries": 1, "backoff_seconds": 0}
    db_session.commit()
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, sleeper=time.sleep)

    started = time.monotonic()
    with pytest.raises(PluginRuntimeError) as exc:
        runtime.read(connection, "search_books", "三体")
    elapsed = time.monotonic() - started

    assert exc.value.code == "plugin.timeout"
    assert elapsed < 0.2
    run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
    assert 1 <= run.attempt <= 2
    assert run.status == "failed"
    db_session.refresh(connection)
    assert connection.lease_token
    assert connection.lease_until is not None


def test_typed_call_rejects_an_active_connection_lease(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.typed-lease", "metadata.lookup")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    import datetime

    connection.lease_token = "other-worker"
    connection.lease_until = datetime.datetime.now() + datetime.timedelta(minutes=1)
    db_session.commit()

    with pytest.raises(PluginRuntimeError) as exc:
        PluginRuntime(db_session, SETTINGS, registry=registry).read(connection, "search_books", "三体")

    assert exc.value.code == "plugin.concurrent_run"
    run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
    assert run.status == "failed"
    assert run.error_code == "plugin.concurrent_run"


def test_read_pages_continues_from_page_cursor_without_overloading_sync_watermark(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.paged-reviews", "reviews.import", behaviour="pages")
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)

    page = runtime.read_pages(
        connection,
        "get_reviews",
        {"title": "活着"},
        cursor={"page": 1},
        required_scopes=("books.read",),
    )

    assert [item["page"] for item in page.items] == [1, 2]
    assert page.next_cursor == {"page": 3}
    assert page.has_more is False


def test_book_handler_no_longer_hardcodes_plugin_identity():
    """F-5 的回归护栏：元数据查询入口不得再出现插件名或凭据解密。"""
    from webserver.handlers import book

    source = inspect.getsource(book)
    assert "WEREAD" not in source
    assert "微信读书" not in source
    assert "SecretCipher" not in source


def test_metadata_handler_uses_a_process_bounded_executor():
    from webserver.handlers.book import _METADATA_EXECUTOR, BookRefer

    source = inspect.getsource(BookRefer)
    assert "ThreadPoolExecutor(" not in source
    assert ".shutdown(" not in source
    assert "_METADATA_EXECUTOR" in source
    assert _METADATA_EXECUTOR._max_workers == 16


def _blocking_metadata_handler(db_session, plugin_id):
    from webserver.handlers.book import BookRefer

    registry = PluginRegistry()
    plugin = _plugin(plugin_id, "metadata.lookup")
    started = threading.Event()
    release = threading.Event()

    def blocking_search(title, context):
        started.set()
        release.wait(2)
        return [{"title": title, "from": plugin_id}]

    plugin.search_books = blocking_search
    registry.register(plugin)
    connection = _install(db_session, registry, plugin)
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry)
    prepared, failures = runtime.prepare_read(
        [connection],
        timeout=1,
        audit=True,
        requested_by=1,
    )
    assert failures == {}

    handler = object.__new__(BookRefer)
    handler.REFER_TIMEOUT = 0.02
    handler._plugin_runtime = runtime
    handler._plugin_units = prepared
    handler._plugin_task_keys = {plugin_id: connection.id}

    def plugin_call():
        return prepared[0]["call"]("search_books", "三体")

    return handler, connection, plugin_call, started, release


def test_metadata_sync_outer_timeout_keeps_lease_for_uncancellable_provider(db_session):
    plugin_id = "talebook.test.metadata-sync-timeout"
    handler, connection, plugin_call, started, release = _blocking_metadata_handler(db_session, plugin_id)
    handler._build_search_tasks = lambda _metadata: {plugin_id: plugin_call}

    try:
        assert handler.plugin_search_books(object()) == []
        assert started.is_set()
        run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
        db_session.refresh(connection)
        assert run.error_code == "plugin.timeout"
        assert connection.lease_token
        assert connection.lease_until is not None
    finally:
        release.set()


def test_metadata_stream_close_keeps_lease_for_uncancellable_provider(db_session):
    plugin_id = "talebook.test.metadata-stream-timeout"
    handler, connection, plugin_call, started, release = _blocking_metadata_handler(db_session, plugin_id)

    def fast_call():
        assert started.wait(1)
        return [{"title": "先返回的结果"}]

    handler._build_search_tasks = lambda _metadata: {"fast": fast_call, plugin_id: plugin_call}

    async def read_one_then_close():
        stream = handler.plugin_search_books_stream(object())
        assert await stream.__anext__() == {"title": "先返回的结果"}
        await stream.aclose()

    try:
        asyncio.run(read_one_then_close())
        run = db_session.query(PluginRun).filter(PluginRun.connection_id == connection.id).one()
        db_session.refresh(connection)
        assert run.error_code == "plugin.timeout"
        assert connection.lease_token
        assert connection.lease_until is not None
    finally:
        release.set()


def test_weread_handler_keeps_credentials_and_provider_construction_inside_runtime():
    """S6：兼容 handler 可以保留，但不能自行定位具体插件、解密或构造 provider。"""
    from webserver.handlers import plugin_weread

    source = inspect.getsource(plugin_weread)
    assert "WEREAD_PLUGIN_KEY" not in source
    assert "SecretCipher" not in source
    assert "WereadProvider" not in source


def test_auto_transform_service_only_dispatches_the_typed_transform_interface():
    """D-11：自动处理编排不认识 TXT fixer 或其纯处理函数。"""
    from webserver.services import book_transform

    source = inspect.getsource(book_transform)
    assert "fix_bytes" not in source
    assert "txt-fixer" not in source

    from webserver.handlers import plugin_booktools

    handler_source = inspect.getsource(plugin_booktools)
    for implementation in ("fix_bytes", "replace_txt_file", "replace_epub_file", "convert_txt_file", "convert_epub"):
        assert implementation not in handler_source
    assert "talebook.tool." not in handler_source
    assert "runtime.write(" in handler_source


def test_extra_feature_dispatch_uses_declared_mode():
    from webserver.handlers import plugins

    source = inspect.getsource(plugins.UserPluginFeature)
    assert 'feature["mode"]' in source
    assert "runtime.read(" not in source
