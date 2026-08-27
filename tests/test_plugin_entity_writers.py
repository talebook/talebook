"""实体写入器：通用运行时不得再把微信读书身份强加给其他 annotations 插件。"""

import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Annotation, AnnotationSource, Base, PluginEntityMatch
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult
from webserver.services.plugin_runtime import PluginRegistry, PluginRuntime, install_builtin, save_connection
from webserver.services.plugin_writers import ENTITY_WRITERS, source_name_for, writer_for


SETTINGS = {"PLUGIN_SECRET_KEY": "entity-writer-test-key", "cookie_secret": "unused-cookie-secret"}


@pytest.fixture()
def db_session():
    engine = create_engine("sqlite://")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


class FakeCalibre:
    """最小书库：一本书，标题与来源完全一致，保证能自动匹配上。"""

    class _Meta:
        title = "测试书籍"
        authors = ["测试作者"]
        isbn = "9780000000009"
        identifiers = {"isbn": "9780000000009"}

    def all_book_ids(self):
        return [7]

    def get_metadata(self, book_id, index_is_id=True):
        return self._Meta()


def _annotation_plugin(plugin_id):
    class Plugin:
        manifest = {
            "protocol_version": PROTOCOL_VERSION,
            "id": plugin_id,
            "name": "第三方笔记来源",
            "version": "1.0.0",
            "categories": ["annotations"],
            "capabilities": ["annotations.import"],
            "runtime_kind": "builtin",
            "actions": ["run", "rollback"],
            "auth_schema": {"type": "object", "properties": {}},
            "config_schema": {"type": "object", "properties": {}},
            "connection_owners": ["user"],
            "permissions": ["books.read", "annotations.write"],
            "data_policy": {},
            "compatibility": {},
            "homepage": "",
            "license": "GPL-3.0",
        }

        def execute(self, context):
            return ProviderResult(
                items=[
                    ProviderItem(
                        external_id="third-party-1",
                        entity_type="annotation",
                        data={
                            "source_book_id": "tp-book-1",
                            "book": {"title": "测试书籍", "author": "测试作者", "isbn": "9780000000009"},
                            "annotation_type": "highlight",
                            "chapter": "第一章",
                            "quote_text": "一段被划线的文字",
                            "content": "",
                            "color": "",
                            "user_modified_at": "2026-08-25T00:00:00Z",
                            "source_position": "chapter=1;range=0-8",
                        },
                        remote_updated_at="2026-08-25T00:00:00Z",
                    )
                ],
                next_cursor={},
                health_message="ok",
            )

        def list_annotations(self, context):
            from webserver.plugins.runtime.domains import Page

            return Page()

        def push_annotation(self, item, state, context):
            from webserver.plugins.runtime.domains import PushReceipt

            return PushReceipt(source_annotation_id="third-party-1")

    return Plugin()


def _run_import(db_session, plugin_id):
    plugin = _annotation_plugin(plugin_id)
    registry = PluginRegistry()
    registry.register(plugin)
    installation = install_builtin(db_session, plugin_id, installed_by=1, registry=registry)
    connection = save_connection(db_session, SETTINGS, installation.id, "user", 1, {}, name="默认连接")
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, calibre_db=FakeCalibre())
    run = runtime.prepare_run(connection.id, "run", requested_by=1)
    runtime.execute(run.id)
    db_session.refresh(run)
    return run, connection


def test_third_party_annotation_plugin_is_not_branded_as_weread(db_session):
    """F-1 的回归护栏：换一个 annotations 插件，落库身份必须跟着换。"""
    run, connection = _run_import(db_session, "talebook.annotation.thirdparty")

    assert run.status == "succeeded", run.error_message
    assert db_session.query(Annotation).count() == 1

    source = db_session.query(AnnotationSource).one()
    assert source.source_name == "talebook.annotation.thirdparty"
    assert source.source_name != "weread"

    match = db_session.query(PluginEntityMatch).one()
    assert match.source_type == "talebook.annotation.thirdparty_book"
    assert "weread" not in match.source_type

    annotation = db_session.query(Annotation).one()
    assert annotation.client_id.startswith("talebook.annotation.thirdparty:%s:" % connection.id)
    assert "weread" not in annotation.client_id


def test_weread_identity_uses_the_same_full_plugin_key_rule(db_session):
    run, connection = _run_import(db_session, "talebook.combo.weread")

    assert run.status == "succeeded", run.error_message
    assert db_session.query(AnnotationSource).one().source_name == "talebook.combo.weread"
    assert db_session.query(PluginEntityMatch).one().source_type == "talebook.combo.weread_book"
    assert db_session.query(Annotation).one().client_id.startswith("talebook.combo.weread:%s:" % connection.id)


def test_source_name_is_derived_from_the_plugin_key(db_session):
    _, connection = _run_import(db_session, "talebook.annotation.brs")
    assert source_name_for(db_session, connection) == "talebook.annotation.brs"


def test_annotation_source_identity_respects_database_column_widths(db_session):
    plugin_id = "vendor.%s.annotations" % ("verylongsegment" * 9)
    run, connection = _run_import(db_session, plugin_id)

    assert run.status == "succeeded", run.error_message
    source = db_session.query(AnnotationSource).one()
    match = db_session.query(PluginEntityMatch).one()
    annotation = db_session.query(Annotation).one()
    assert len(source.source_name) <= 64
    assert len(match.source_type) <= 64
    assert len(annotation.client_id) <= 64
    assert source.source_name == source_name_for(db_session, connection)


def test_same_plugin_external_id_is_namespaced_by_connection(db_session):
    plugin_id = "talebook.annotation.multi-account"
    plugin = _annotation_plugin(plugin_id)
    registry = PluginRegistry()
    registry.register(plugin)
    installation = install_builtin(db_session, plugin_id, installed_by=1, registry=registry)
    first = save_connection(db_session, SETTINGS, installation.id, "user", 1, {}, name="账户一", role="account-1")
    second = save_connection(db_session, SETTINGS, installation.id, "user", 1, {}, name="账户二", role="account-2")
    runtime = PluginRuntime(db_session, SETTINGS, registry=registry, calibre_db=FakeCalibre())

    for connection in (first, second):
        run = runtime.prepare_run(connection.id, "run", requested_by=1)
        runtime.execute(run.id)
        db_session.refresh(run)
        assert run.status == "succeeded", run.error_message

    annotations = db_session.query(Annotation).order_by(Annotation.id).all()
    assert len(annotations) == 2
    assert annotations[0].client_id != annotations[1].client_id
    assert str(first.id) in annotations[0].client_id
    assert str(second.id) in annotations[1].client_id


def test_runtime_dispatches_by_entity_type_not_by_plugin_name():
    assert set(ENTITY_WRITERS) == {"annotation"}
    assert writer_for("annotation") is not None
    # 未注册写入器的实体走平台通用路径，不应报错
    assert writer_for("book_source") is None
    assert writer_for("metadata") is None


def test_rollback_goes_through_the_writer(db_session):
    run, connection = _run_import(db_session, "talebook.annotation.thirdparty")
    assert db_session.query(Annotation).count() == 1

    runtime = PluginRuntime(db_session, SETTINGS, calibre_db=FakeCalibre())
    rollback = runtime.prepare_run(connection.id, "rollback", requested_by=1, parent_run_id=run.id)
    runtime.execute(rollback.id)
    db_session.refresh(rollback)

    assert rollback.status == "rolled_back", rollback.error_message
    assert db_session.query(AnnotationSource).count() == 0


def test_plugin_runtime_module_contains_no_plugin_names():
    """通用运行时不得出现任何具体插件的名称或模块。"""
    import inspect

    from webserver.services import plugin_runtime

    source = inspect.getsource(plugin_runtime)
    assert "weread" not in source.lower()
    assert "talebook." not in source


def test_platform_writer_policy_contains_no_concrete_plugin_names():
    import inspect

    from webserver.services import annotation_writer
    from webserver.services import plugin_writers

    source = inspect.getsource(plugin_writers)
    assert "weread" not in source.lower()
    assert "talebook." not in source
    assert not hasattr(annotation_writer, "SOURCE_NAME")


def test_prepare_run_defaults_do_not_require_a_writer(db_session):
    """没有注册写入器的实体类型仍按通用路径落来源记录。"""
    assert writer_for("review") is None
    assert datetime.datetime.now() is not None
