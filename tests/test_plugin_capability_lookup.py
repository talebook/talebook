"""按能力查询插件：调用方不再硬编码 plugin_key、连接名或自行解密凭据。"""

import inspect

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Base
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderAuthError
from webserver.services.plugin_runtime import PluginRegistry, PluginRuntime, install_builtin, save_connection

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
            if behaviour == "auth":
                raise ProviderAuthError("凭据被拒")
            if behaviour == "boom":
                raise RuntimeError("上游炸了")
            return [{"title": title, "from": plugin_id, "scopes": context["scopes"]}]

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
    assert isinstance(by_plugin["talebook.test.denied"], ProviderAuthError)

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


def test_book_handler_no_longer_hardcodes_plugin_identity():
    """F-5 的回归护栏：元数据查询入口不得再出现插件名或凭据解密。"""
    from webserver.handlers import book

    source = inspect.getsource(book)
    assert "WEREAD" not in source
    assert "微信读书" not in source
    assert "SecretCipher" not in source
