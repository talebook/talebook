"""新书自动处理：默认手动，只有显式配成 auto 才执行，且必须留审计。"""

from unittest import mock

from webserver.handlers.base import BaseHandler
from webserver.plugins.runtime.interfaces import TRIGGER_AUTO, TRIGGER_MANUAL, trigger_of
from webserver.plugins.runtime.protocol import ManifestError, PluginManifest
from webserver.services.async_service import AsyncService
from webserver.services.plugin_runtime import REGISTRY

from tests.test_main import BID_TXT, TestWithAdminUser, get_db
from tests.test_main import setUpModule as init_main

TXT_FIXER = "talebook.tool.txt-fixer"
ZH_CONVERTER = "talebook.tool.zh-converter"


def setUpModule():
    init_main()


def test_trigger_defaults_to_manual():
    assert trigger_of(None) == TRIGGER_MANUAL
    assert trigger_of({}) == TRIGGER_MANUAL
    assert trigger_of({"trigger": TRIGGER_AUTO}) == TRIGGER_AUTO


def test_only_objectively_decidable_tools_may_auto_trigger():
    """编码错误是客观事实，可自动判定；查找替换与繁简转换依赖用户意图。"""
    fixer = REGISTRY.get(TXT_FIXER).manifest
    assert fixer["ui"]["supports_auto_trigger"] is True
    assert "trigger" in fixer["config_schema"]["properties"]

    for plugin_key in (ZH_CONVERTER, "talebook.tool.text-replace"):
        manifest = REGISTRY.get(plugin_key).manifest
        assert not manifest["ui"].get("supports_auto_trigger")
        assert "trigger" not in (manifest["config_schema"].get("properties") or {})


def test_auto_option_is_rejected_for_tools_that_do_not_support_it():
    """不支持自动触发的插件，其 config 不接受 trigger 键。"""
    from webserver.services.plugin_runtime import _validate_public_config

    manifest = REGISTRY.get(ZH_CONVERTER).manifest
    try:
        _validate_public_config({"trigger": "auto"}, config_schema=manifest["config_schema"])
    except Exception as exc:
        assert "unknown" in str(getattr(exc, "code", "")) or "unknown" in str(exc)
    else:
        raise AssertionError("不支持自动触发的插件不应接受 trigger 配置")


def test_txt_fixer_config_schema_rejects_invalid_trigger():
    manifest = PluginManifest.validate(REGISTRY.get(TXT_FIXER).manifest)
    from webserver.plugins.runtime.protocol import validate_against_schema

    validate_against_schema(manifest.raw["config_schema"], {"trigger": "auto"})
    validate_against_schema(manifest.raw["config_schema"], {"trigger": "manual"})
    try:
        validate_against_schema(manifest.raw["config_schema"], {"trigger": "always"})
    except ManifestError as exc:
        assert exc.code == "config.enum_invalid"
    else:
        raise AssertionError("trigger 只允许 manual / auto")


class TestUploadAutoTransform(TestWithAdminUser):
    def _set_trigger(self, value):
        from webserver.models import PluginConnection, PluginInstallation

        self.json("/api/admin/plugins")  # 确保内置连接已创建
        session = get_db()
        connection = (
            session.query(PluginConnection)
            .join(PluginInstallation, PluginInstallation.id == PluginConnection.installation_id)
            .filter(PluginInstallation.plugin_key == TXT_FIXER, PluginConnection.owner_type == "instance")
            .first()
        )
        connection.config = {"trigger": value} if value else {}
        session.commit()
        return connection

    @mock.patch("webserver.services.book_transform.auto_fix_encoding")
    def test_upload_does_not_auto_transform_by_default(self, m_auto):
        """安全默认：没有显式配置 auto 时，绝不自动改写用户刚上传的文件。"""
        self._set_trigger(None)
        from webserver.handlers.book import BookUpload

        BookUpload.run_auto_transforms(self._fake_handler(), BID_TXT, "txt")
        self.assertFalse(m_auto.called, "默认必须是手动，不得自动改书")

    def _fake_handler(self):
        from webserver.handlers.book import BookUpload

        handler = BookUpload.__new__(BookUpload)
        handler.session = get_db()
        handler.user_id = lambda: 1
        return handler

    @mock.patch("webserver.services.book_transform.auto_fix_encoding")
    def test_non_txt_upload_is_never_auto_transformed(self, m_auto):
        self._set_trigger(TRIGGER_AUTO)
        from webserver.handlers.book import BookUpload

        BookUpload.run_auto_transforms(self._fake_handler(), BID_TXT, "epub")
        self.assertFalse(m_auto.called)

    def test_trigger_can_be_switched_at_runtime(self):
        """动态配置：用户可随时切换，无需重启或重装插件。"""
        connection = self._set_trigger(TRIGGER_AUTO)
        self.assertEqual(trigger_of(connection.config), TRIGGER_AUTO)
        connection = self._set_trigger(TRIGGER_MANUAL)
        self.assertEqual(trigger_of(connection.config), TRIGGER_MANUAL)


class TestAutoFixEncodingService(TestWithAdminUser):
    def test_correct_encoding_is_skipped_without_writing(self):
        """先试算：编码本就正确时不写回，也不产生备份。"""
        from webserver.services.book_transform import fix_encoding_for_book

        self.json("/api/admin/plugins")
        with mock.patch("webserver.services.book_transform.overwrite_format") as m_write:
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1)

        self.assertIsNotNone(run)
        self.assertEqual(run.status, "succeeded")
        self.assertEqual(run.counts["skipped"], 1)
        self.assertEqual(run.counts["updated"], 0)
        self.assertFalse(m_write.called, "无需修复时不得改写文件")

    def test_failure_is_recorded_and_does_not_raise(self):
        from webserver.services.book_transform import fix_encoding_for_book

        self.json("/api/admin/plugins")
        with mock.patch("webserver.services.book_transform.resolve_book", side_effect=RuntimeError("书不见了")):
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1)

        self.assertEqual(run.status, "failed")
        self.assertIn("书不见了", run.error_message)
