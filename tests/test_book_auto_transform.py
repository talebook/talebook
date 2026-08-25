"""新书自动处理：默认手动，只有显式配成 auto 才执行，且必须留审计。"""

import os
from unittest import mock

from tests.test_main import BID_TXT, TestWithAdminUser, get_db
from tests.test_main import setUpModule as init_main
from webserver.models import PluginRun
from webserver.plugins.runtime.protocol import ManifestError, PluginManifest
from webserver.plugins.runtime.triggers import TRIGGER_AUTO, TRIGGER_MANUAL, trigger_of
from webserver.services.async_service import AsyncService
from webserver.services.plugin_runtime import REGISTRY


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
    """注意：这些用例针对共享的 tests/library/ 真实书库运行。

    自动处理会改写书籍文件，一旦漏 mock 就会把夹具改坏并混进提交
    （已发生过一次：BID_TXT 被 GBK→UTF-8 重编码）。因此每个用例都必须
    mock 掉写回路径，并由 setUp/tearDown 的校验兜底。
    """

    def _fixture_digest(self):
        import hashlib

        from webserver.services.booktools import get_format_path

        path = get_format_path(AsyncService().db, BID_TXT, "TXT")
        with open(path, "rb") as handle:
            return hashlib.sha256(handle.read()).hexdigest()

    def _connection_id(self):
        from webserver.models import PluginConnection, PluginInstallation

        self.json("/api/admin/plugins")
        return (
            get_db()
            .query(PluginConnection)
            .join(PluginInstallation, PluginInstallation.id == PluginConnection.installation_id)
            .filter(PluginInstallation.plugin_key == TXT_FIXER, PluginConnection.owner_type == "instance")
            .one()
            .id
        )

    def setUp(self):
        super().setUp()
        self._digest_before = self._fixture_digest()

    def tearDown(self):
        self.assertEqual(
            self._fixture_digest(),
            self._digest_before,
            "测试改写了共享书库夹具：写回路径必须被 mock",
        )
        super().tearDown()

    def test_correct_encoding_is_skipped_without_writing(self):
        """先试算：编码本就正确时不写回，也不产生备份。

        用临时文件承载「已是 UTF-8」的场景，不依赖也不触碰共享夹具的真实编码。
        """
        import tempfile

        from webserver.services.book_transform import fix_encoding_for_book

        connection_id = self._connection_id()
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
            handle.write(("这本书本来就是 UTF-8 编码，正文内容完整可读，无需任何修复。" * 40).encode("utf-8"))
            utf8_path = handle.name
        self.addCleanup(os.unlink, utf8_path)

        with (
            mock.patch("webserver.services.book_transform.get_format_path", return_value=utf8_path),
            mock.patch("webserver.services.book_transform.overwrite_format") as m_write,
        ):
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1, connection_id)

        self.assertIsNotNone(run)
        self.assertEqual(run.status, "succeeded")
        self.assertEqual(run.counts["skipped"], 1)
        self.assertEqual(run.counts["updated"], 0)
        self.assertFalse(m_write.called, "无需修复时不得改写文件")

    def test_wrong_encoding_is_fixed_and_backed_up(self):
        """需要修复时才写回，且必须留下备份路径。"""
        import tempfile

        from webserver.services.book_transform import fix_encoding_for_book

        connection_id = self._connection_id()
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
            handle.write(("这是一段需要修复编码的中文正文，内容足够长以便编码检测稳定判定。" * 40).encode("gb18030"))
            gbk_path = handle.name
        self.addCleanup(os.unlink, gbk_path)

        with (
            mock.patch("webserver.services.book_transform.get_format_path", return_value=gbk_path),
            mock.patch(
                "webserver.services.book_transform.overwrite_format", return_value="/tmp/talebook-auto-backup.txt"
            ) as m_write,
        ):
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1, connection_id)

        self.assertEqual(run.status, "succeeded")
        self.assertEqual(run.counts["updated"], 1)
        self.assertTrue(m_write.called, "编码不正确时必须写回")
        self.assertEqual(run.cursor_after["backup_path"], "/tmp/talebook-auto-backup.txt")
        typed_run = (
            get_db()
            .query(PluginRun)
            .filter(PluginRun.connection_id == connection_id, PluginRun.action == "write")
            .order_by(PluginRun.id.desc())
            .first()
        )
        self.assertEqual(typed_run.status, "succeeded")
        self.assertEqual(typed_run.cursor_after["backup_path"], "/tmp/talebook-auto-backup.txt")

    def test_failure_is_recorded_and_does_not_raise(self):
        from webserver.services.book_transform import fix_encoding_for_book

        connection_id = self._connection_id()
        with mock.patch("webserver.services.book_transform.resolve_book", side_effect=RuntimeError("书不见了")):
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1, connection_id)

        self.assertEqual(run.status, "failed")
        self.assertIn("书不见了", run.error_message)

    def test_writeback_failure_rolls_back_inside_typed_write_run(self):
        import tempfile

        from webserver.services.book_transform import fix_encoding_for_book

        connection_id = self._connection_id()
        with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as handle:
            handle.write(("这是一段需要修复编码的中文正文，内容足够长以便编码检测稳定判定。" * 40).encode("gb18030"))
            gbk_path = handle.name
        self.addCleanup(os.unlink, gbk_path)

        def fail_after_backup(*_args, **kwargs):
            kwargs["backup_state"]["backup_path"] = "/tmp/talebook-auto-backup.txt"
            raise RuntimeError("写回失败")

        with (
            mock.patch("webserver.services.book_transform.get_format_path", return_value=gbk_path),
            mock.patch("webserver.services.book_transform.overwrite_format", side_effect=fail_after_backup),
            mock.patch("webserver.services.book_transform._restore_backup", return_value=True) as m_restore,
        ):
            run = fix_encoding_for_book(get_db(), AsyncService().db, BID_TXT, 1, connection_id)

        self.assertEqual(run.status, "failed")
        self.assertIn("写回失败", run.error_message)
        m_restore.assert_called_once()
        typed_run = (
            get_db()
            .query(PluginRun)
            .filter(PluginRun.connection_id == connection_id, PluginRun.action == "write")
            .order_by(PluginRun.id.desc())
            .first()
        )
        self.assertEqual(typed_run.status, "rolled_back")
        self.assertEqual(typed_run.cursor_after["backup_path"], "/tmp/talebook-auto-backup.txt")
