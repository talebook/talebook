#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import os
import tempfile
import urllib.parse
from unittest import mock

from tests.test_main import TestWithAdminUser, TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver import loader


def setUpModule():
    init()


class TestAdmin(TestWithUserLogin):
    def test_book_list(self):
        d = self.json("/api/admin/book/list?sort=id&num=10")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["items"]), 10)


class TestAdminSettingsSecurity(TestWithAdminUser):
    """AdminSettings 权限控制的安全测试"""

    def test_settings_get_allowed_for_admin(self):
        """管理员可以读取配置"""
        d = self.json("/api/admin/settings")
        self.assertEqual(d["err"], "ok")
        self.assertGreater(len(d["settings"]), 10)

    def test_settings_update_allowed_for_admin(self):
        """管理员可以修改配置"""
        with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
            req = json.dumps({"site_title": "TestTitle"})
            d = self.json("/api/admin/settings", method="POST", body=req)
            self.assertEqual(d["err"], "ok")

    def test_settings_update_rejected_for_non_admin(self):
        """普通用户（非管理员）不能修改管理员配置，必须返回 permission 错误"""
        from webserver import models

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            req = json.dumps({"site_title": "hacked", "autoreload": True})
            d = self.json("/api/admin/settings", method="POST", body=req)
            self.assertEqual(d["err"], "permission")
        finally:
            user.admin = original_admin
            session.commit()

    def test_settings_dangerous_keys_ignored_for_non_whitelisted(self):
        """不在 KEYS 白名单中的字段不应出现在保存结果里"""
        with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
            req = json.dumps({"site_title": "ok", "not_in_whitelist": "injected"})
            d = self.json("/api/admin/settings", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertNotIn("not_in_whitelist", d["rsp"])

    def test_settings_rejects_malformed_social_auth_key(self):
        """SOCIAL_AUTH 动态字段必须是普通配置名，不能携带 Python 语法"""
        key = "SOCIAL_AUTH_BAD_KEY' : {}, }\nexec('raise RuntimeError')\nsettings = {'SOCIAL_AUTH_FINAL_KEY"
        with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
            req = json.dumps({"site_title": "ok", key: "injected"})
            d = self.json("/api/admin/settings", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertNotIn(key, d["rsp"])

    def test_settings_dumpfile_quotes_keys_safely(self):
        """配置写盘时 key 必须用 repr 转义，避免生成可执行注入代码"""
        key = "SOCIAL_AUTH_BAD_KEY' : {}, }\nexec('raise RuntimeError')\nsettings = {'SOCIAL_AUTH_FINAL_KEY"
        settings = loader.SettingsLoader()
        settings.clear()
        settings[key] = "value"

        with tempfile.TemporaryDirectory() as tmpdir:
            with mock.patch.object(settings, "set_store_path", return_value=tmpdir):
                settings.dumpfile()

            path = os.path.join(tmpdir, "auto.py")
            namespace = {}
            with open(path) as f:
                code = f.read()
            exec(compile(code, path, "exec"), namespace)

        self.assertEqual(namespace["settings"][key], "value")


class TestAdminTestDB(TestWithAdminUser):
    """AdminTestDB 接口测试"""

    def test_sqlite_always_ok(self):
        """SQLite 类型直接返回 ok"""
        body = urllib.parse.urlencode({"db_type": "sqlite"})
        d = self.json("/api/admin/testdb", method="POST", body=body)
        self.assertEqual(d["err"], "ok")

    def test_mysql_missing_params(self):
        """缺少必填参数时返回 params.invalid"""
        body = urllib.parse.urlencode({"db_type": "mysql", "db_host": "localhost"})
        d = self.json("/api/admin/testdb", method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_mysql_connect_failed(self):
        """MySQL 连接失败时返回 db.connect_failed"""
        body = urllib.parse.urlencode(
            {
                "db_type": "mysql",
                "db_host": "127.0.0.1",
                "db_port": "3306",
                "db_name": "nonexistent_db",
                "db_user": "bad_user",
                "db_pass": "bad_pass",
            }
        )
        d = self.json("/api/admin/testdb", method="POST", body=body)
        self.assertEqual(d["err"], "db.connect_failed")

    def test_invalid_port_rejected(self):
        """端口号超出范围时返回 params.invalid"""
        body = urllib.parse.urlencode(
            {
                "db_type": "mysql",
                "db_host": "localhost",
                "db_port": "0",
                "db_name": "testdb",
                "db_user": "root",
                "db_pass": "pass",
            }
        )
        d = self.json("/api/admin/testdb", method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_requires_admin_after_install(self):
        """安装后非管理员无法访问"""
        from webserver import models

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            body = urllib.parse.urlencode({"db_type": "sqlite"})
            d = self.json("/api/admin/testdb", method="POST", body=body)
            self.assertEqual(d["err"], "permission")
        finally:
            user.admin = original_admin
            session.commit()


class TestAdminMigrateDB(TestWithAdminUser):
    """AdminMigrateDB 接口测试"""

    def test_sqlite_target_rejected(self):
        """目标类型为 sqlite 时返回 params.invalid"""
        body = urllib.parse.urlencode({"db_type": "sqlite"})
        d = self.json("/api/admin/migratedb", method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_missing_params_rejected(self):
        """缺少必填参数时返回 params.invalid"""
        body = urllib.parse.urlencode({"db_type": "mysql", "db_host": "localhost"})
        d = self.json("/api/admin/migratedb", method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_bad_connection_returns_error(self):
        """无法连接的 MySQL 返回 db.migrate_failed 或 db.connect_failed 类错误"""
        body = urllib.parse.urlencode(
            {
                "db_type": "mysql",
                "db_host": "127.0.0.1",
                "db_port": "3306",
                "db_name": "nonexistent_db",
                "db_user": "bad_user",
                "db_pass": "bad_pass",
            }
        )
        d = self.json("/api/admin/migratedb", method="POST", body=body)
        self.assertIn(d["err"], ("db.migrate_failed",))

    def test_migrate_success_via_mock(self):
        """使用 mock 测试迁移逻辑: 迁移成功时返回 ok 并写入 user_database 配置"""
        import tempfile

        from webserver import loader, main

        original_db_url = main.CONF["user_database"]
        try:
            with tempfile.TemporaryDirectory() as tmpdir:

                def fake_migrate(source_url, target_url, force=False):
                    pass

                with mock.patch("webserver.migrate_db.migrate_data", side_effect=fake_migrate):
                    with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value=tmpdir):
                        body = urllib.parse.urlencode(
                            {
                                "db_type": "mysql",
                                "db_host": "localhost",
                                "db_port": "3306",
                                "db_name": "testdb",
                                "db_user": "root",
                                "db_pass": "pass",
                            }
                        )
                        d = self.json("/api/admin/migratedb", method="POST", body=body)
                self.assertEqual(d["err"], "ok")
                self.assertTrue(d.get("need_restart"))
        finally:
            # restore original db url in CONF
            main.CONF["user_database"] = original_db_url
            loader.get_settings()["user_database"] = original_db_url

    def test_invalid_port_rejected(self):
        """端口号超出范围时返回 params.invalid"""
        body = urllib.parse.urlencode(
            {
                "db_type": "mysql",
                "db_host": "localhost",
                "db_port": "99999",
                "db_name": "testdb",
                "db_user": "root",
                "db_pass": "pass",
            }
        )
        d = self.json("/api/admin/migratedb", method="POST", body=body)
        self.assertEqual(d["err"], "params.invalid")

    def test_target_has_data_warning(self):
        """目标库有数据且不带 force 时，返回 db.target_has_data 警告"""
        import tempfile

        from webserver import loader, main
        from webserver.migrate_db import TargetNotEmptyError

        original_db_url = main.CONF["user_database"]
        try:
            with tempfile.TemporaryDirectory() as tmpdir:

                def fake_migrate_nonempty(source_url, target_url, force=False):
                    raise TargetNotEmptyError(42)

                with mock.patch("webserver.migrate_db.migrate_data", side_effect=fake_migrate_nonempty):
                    with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value=tmpdir):
                        body = urllib.parse.urlencode(
                            {
                                "db_type": "mysql",
                                "db_host": "localhost",
                                "db_port": "3306",
                                "db_name": "testdb",
                                "db_user": "root",
                                "db_pass": "pass",
                            }
                        )
                        d = self.json("/api/admin/migratedb", method="POST", body=body)
                self.assertEqual(d["err"], "db.target_has_data")
                self.assertEqual(d["count"], 42)
        finally:
            main.CONF["user_database"] = original_db_url
            loader.get_settings()["user_database"] = original_db_url

    def test_target_has_data_force_succeeds(self):
        """目标库有数据且带 force=1 时，迁移正常完成"""
        import tempfile

        from webserver import loader, main

        original_db_url = main.CONF["user_database"]
        try:
            with tempfile.TemporaryDirectory() as tmpdir:

                def fake_migrate(source_url, target_url, force=False):
                    pass

                with mock.patch("webserver.migrate_db.migrate_data", side_effect=fake_migrate):
                    with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value=tmpdir):
                        body = urllib.parse.urlencode(
                            {
                                "db_type": "mysql",
                                "db_host": "localhost",
                                "db_port": "3306",
                                "db_name": "testdb",
                                "db_user": "root",
                                "db_pass": "pass",
                                "force": "1",
                            }
                        )
                        d = self.json("/api/admin/migratedb", method="POST", body=body)
                self.assertEqual(d["err"], "ok")
        finally:
            main.CONF["user_database"] = original_db_url
            loader.get_settings()["user_database"] = original_db_url

    def test_requires_admin(self):
        """非管理员无法访问"""
        from webserver import models

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            body = urllib.parse.urlencode({"db_type": "mysql"})
            d = self.json("/api/admin/migratedb", method="POST", body=body)
            self.assertEqual(d["err"], "permission")
        finally:
            user.admin = original_admin
            session.commit()


class TestAdminSystemLog(TestWithAdminUser):
    def test_log_returns_ok_when_file_missing(self):
        """日志文件不存在时，接口应返回 ok 且 lines 为空列表"""
        with mock.patch("webserver.handlers.admin._get_log_file", return_value="/nonexistent/talebook.log"):
            d = self.json("/api/admin/log")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["lines"], [])

    def test_log_returns_lines_from_file(self):
        """日志文件存在时，接口应返回对应行数"""
        log_content = "\n".join(["line %d" % i for i in range(10)])
        with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
            f.write(log_content)
            log_path = f.name
        try:
            with mock.patch("webserver.handlers.admin._get_log_file", return_value=log_path):
                d = self.json("/api/admin/log?lines=5")
            self.assertEqual(d["err"], "ok")
            self.assertEqual(len(d["lines"]), 5)
            self.assertEqual(d["total"], 10)
        finally:
            os.unlink(log_path)

    def test_log_download_returns_file(self):
        """下载接口应以附件形式返回日志文件内容"""
        log_content = "test log line\n"
        with tempfile.NamedTemporaryFile(mode="w", suffix=".log", delete=False) as f:
            f.write(log_content)
            log_path = f.name
        try:
            with mock.patch("webserver.handlers.admin._get_log_file", return_value=log_path):
                rsp = self.fetch("/api/admin/log/download")
            self.assertEqual(rsp.code, 200)
            self.assertIn(b"test log line", rsp.body)
            self.assertIn("attachment", rsp.headers.get("Content-Disposition", ""))
        finally:
            os.unlink(log_path)

    def test_log_permission_denied_for_non_admin(self):
        """普通用户不能访问系统日志"""
        from webserver import models

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            d = self.json("/api/admin/log")
            self.assertNotEqual(d["err"], "ok")
        finally:
            user.admin = original_admin
            session.commit()
