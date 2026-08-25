"""连接查询键：role 取代中文展示名，改文案不再丢连接。"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from webserver.migrate_db import backfill_plugin_connection_roles
from webserver.models import Base, PluginConnection
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION
from webserver.services.plugin_runtime import (
    BUILTIN_CONNECTION_ROLE,
    DEFAULT_CONNECTION_ROLE,
    PluginRegistry,
    install_builtin,
    save_connection,
)

SETTINGS = {"PLUGIN_SECRET_KEY": "connection-role-test-key", "cookie_secret": "unused-cookie-secret"}


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    session.info["engine"] = engine
    try:
        yield session
    finally:
        session.close()


def _plugin(plugin_id="talebook.test.role"):
    class Plugin:
        manifest = {
            "protocol_version": PROTOCOL_VERSION,
            "id": plugin_id,
            "name": plugin_id,
            "version": "1.0.0",
            "categories": ["metadata"],
            "capabilities": ["metadata.lookup"],
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

    return Plugin()


def test_renaming_a_connection_does_not_lose_it(db_session):
    """此前用中文 name 当查询键，改文案等于把用户的凭据变成孤儿。"""
    registry = PluginRegistry()
    plugin = _plugin()
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)

    first = save_connection(
        db_session, SETTINGS, installation.id, "user", 1, {}, name="微信读书", role=DEFAULT_CONNECTION_ROLE
    )
    renamed = save_connection(
        db_session, SETTINGS, installation.id, "user", 1, {}, name="微信读书导入", role=DEFAULT_CONNECTION_ROLE
    )

    assert renamed.id == first.id, "同一 role 应命中同一条连接，而不是新建"
    assert renamed.name == "微信读书导入"
    assert db_session.query(PluginConnection).count() == 1


def test_role_defaults_to_name_for_existing_callers(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.role-default")
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)

    connection = save_connection(db_session, SETTINGS, installation.id, "instance", 0, {}, name="默认")
    assert connection.role == "默认"


def test_distinct_roles_coexist_under_one_owner(db_session):
    registry = PluginRegistry()
    plugin = _plugin("talebook.test.role-multi")
    registry.register(plugin)
    installation = install_builtin(db_session, plugin.manifest["id"], installed_by=1, registry=registry)

    save_connection(db_session, SETTINGS, installation.id, "user", 5, {}, name="主力", role="primary")
    save_connection(db_session, SETTINGS, installation.id, "user", 5, {}, name="备用", role="backup")

    assert db_session.query(PluginConnection).count() == 2


def test_backfill_derives_role_from_legacy_names(db_session):
    """存量数据迁移：按旧的中文 name 推导 role，不丢连接。"""
    engine = db_session.info["engine"]
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO plugin_connections "
                "(id, installation_id, owner_type, owner_id, role, name, scopes, health, enabled, create_time, update_time) "
                "VALUES "
                "(1, 1, 'instance', 0, '', '内置连接', '[]', 'unknown', 1, '2026-01-01', '2026-01-01'),"
                "(2, 1, 'user', 7, '', '微信读书', '[]', 'unknown', 1, '2026-01-01', '2026-01-01'),"
                "(3, 2, 'user', 7, '', '其他来源', '[]', 'unknown', 1, '2026-01-01', '2026-01-01')"
            )
        )

    backfill_plugin_connection_roles(engine)

    with engine.begin() as conn:
        roles = dict(conn.execute(text("SELECT id, role FROM plugin_connections ORDER BY id")).fetchall())
    assert roles == {1: BUILTIN_CONNECTION_ROLE, 2: DEFAULT_CONNECTION_ROLE, 3: DEFAULT_CONNECTION_ROLE}


def test_backfill_disambiguates_colliding_roles():
    """同一 owner 下多条历史连接会推出同一个 role，必须避免撞唯一约束。

    这里按迁移前的真实表结构建表：唯一约束仍在 name 上，role 是
    ``ALTER TABLE ADD COLUMN`` 新增的无约束列（SQLite 无法在增列时加约束）。
    """
    engine = create_engine("sqlite://")
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE plugin_connections ("
                " id INTEGER PRIMARY KEY, installation_id INTEGER, owner_type VARCHAR(32),"
                " owner_id INTEGER, name VARCHAR(200), role VARCHAR(64) DEFAULT '',"
                " UNIQUE (installation_id, owner_type, owner_id, name))"
            )
        )
        conn.execute(
            text(
                "INSERT INTO plugin_connections (id, installation_id, owner_type, owner_id, name, role) VALUES "
                "(10, 3, 'user', 9, '来源甲', ''), (11, 3, 'user', 9, '来源乙', '')"
            )
        )

    backfill_plugin_connection_roles(engine)

    with engine.begin() as conn:
        roles = [row.role for row in conn.execute(text("SELECT role FROM plugin_connections ORDER BY id"))]
    assert roles[0] == DEFAULT_CONNECTION_ROLE
    assert roles[1] != roles[0], "冲突的 role 必须被区分开"
    assert len(set(roles)) == 2


def test_backfill_is_idempotent(db_session):
    engine = db_session.info["engine"]
    with engine.begin() as conn:
        conn.execute(
            text(
                "INSERT INTO plugin_connections "
                "(id, installation_id, owner_type, owner_id, role, name, scopes, health, enabled, create_time, update_time) "
                "VALUES (20, 4, 'instance', 0, '', '内置连接', '[]', 'unknown', 1, '2026-01-01', '2026-01-01')"
            )
        )

    backfill_plugin_connection_roles(engine)
    backfill_plugin_connection_roles(engine)

    with engine.begin() as conn:
        role = conn.execute(text("SELECT role FROM plugin_connections WHERE id = 20")).scalar()
    assert role == BUILTIN_CONNECTION_ROLE
