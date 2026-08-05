#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import json
import os
import tempfile
import urllib.parse
from unittest import mock

from tests.test_main import (
    BID_EPUB,
    TestWithAdminUser,
    TestWithUserLogin,
    get_db,
    temporary_book_scope,
    temporary_static_host,
)
from tests.test_main import setUpModule as init
from webserver import loader


def setUpModule():
    init()


class TestAdmin(TestWithUserLogin):
    def test_book_list(self):
        d = self.json("/api/admin/book/list?sort=id&num=10")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(len(d["items"]), 10)


class TestAdminPrivateBookResources(TestWithAdminUser):
    def test_private_book_cover_uses_authenticated_origin_when_static_host_is_set(self):
        with temporary_book_scope(BID_EPUB, "private", collector_id=2):
            with temporary_static_host("cdn.example"):
                d = self.json(
                    "/api/admin/book/list?search=A&num=0",
                    headers={"X-Forwarded-Host": "books.example"},
                )
            book = next(book for book in d["items"] if book["id"] == BID_EPUB)
            self.assertEqual(urllib.parse.urlsplit(book["img"]).netloc, "books.example")
            self.assertEqual(urllib.parse.urlsplit(book["thumb"]).netloc, "books.example")


class TestAdminSettingsSecurity(TestWithAdminUser):
    """AdminSettings 权限控制的安全测试"""

    def test_settings_get_allowed_for_admin(self):
        """管理员可以读取配置"""
        d = self.json("/api/admin/settings")
        self.assertEqual(d["err"], "ok")
        self.assertGreater(len(d["settings"]), 10)

    def test_settings_update_allowed_for_admin(self):
        """管理员可以修改配置"""
        conf = loader.get_settings()
        previous_show_network_library = conf.get("SHOW_NETWORK_LIBRARY", True)
        try:
            with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                req = json.dumps({"site_title": "TestTitle", "SHOW_NETWORK_LIBRARY": False})
                d = self.json("/api/admin/settings", method="POST", body=req)
                self.assertEqual(d["err"], "ok")
                self.assertFalse(d["rsp"]["SHOW_NETWORK_LIBRARY"])
        finally:
            conf["SHOW_NETWORK_LIBRARY"] = previous_show_network_library

    def test_settings_update_chunk_upload_settings(self):
        """管理员可以开关分片上传功能并自定义分片阈值/分片大小"""
        conf = loader.get_settings()
        prev_enabled = conf.get("UPLOAD_CHUNK_ENABLED", True)
        prev_threshold = conf.get("UPLOAD_CHUNK_THRESHOLD", "8MB")
        prev_size = conf.get("UPLOAD_CHUNK_SIZE", "4MB")
        try:
            with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                req = json.dumps(
                    {
                        "UPLOAD_CHUNK_ENABLED": False,
                        "UPLOAD_CHUNK_THRESHOLD": "16MB",
                        "UPLOAD_CHUNK_SIZE": "8MB",
                    }
                )
                d = self.json("/api/admin/settings", method="POST", body=req)
                self.assertEqual(d["err"], "ok")
                self.assertEqual(d["rsp"]["UPLOAD_CHUNK_ENABLED"], False)
                self.assertEqual(d["rsp"]["UPLOAD_CHUNK_THRESHOLD"], "16MB")
                self.assertEqual(d["rsp"]["UPLOAD_CHUNK_SIZE"], "8MB")
        finally:
            conf["UPLOAD_CHUNK_ENABLED"] = prev_enabled
            conf["UPLOAD_CHUNK_THRESHOLD"] = prev_threshold
            conf["UPLOAD_CHUNK_SIZE"] = prev_size

    def test_settings_update_rejects_invalid_chunk_size(self):
        """分片阈值/分片大小配置格式不合法时必须被拒绝，不能污染现有配置"""
        conf = loader.get_settings()
        prev_threshold = conf.get("UPLOAD_CHUNK_THRESHOLD", "8MB")
        try:
            with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                req = json.dumps({"UPLOAD_CHUNK_THRESHOLD": "4MiB"})
                d = self.json("/api/admin/settings", method="POST", body=req)
                self.assertEqual(d["err"], "params.upload_chunk_threshold")
                self.assertEqual(conf.get("UPLOAD_CHUNK_THRESHOLD", "8MB"), prev_threshold)
        finally:
            conf["UPLOAD_CHUNK_THRESHOLD"] = prev_threshold

    def test_settings_update_rejects_zero_chunk_size(self):
        """分片大小配置为0时必须被拒绝，避免前端把分片数计算为Infinity导致上传全部失败"""
        conf = loader.get_settings()
        prev_size = conf.get("UPLOAD_CHUNK_SIZE", "4MB")
        try:
            with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                req = json.dumps({"UPLOAD_CHUNK_SIZE": "0MB"})
                d = self.json("/api/admin/settings", method="POST", body=req)
                self.assertEqual(d["err"], "params.upload_chunk_size")
                self.assertEqual(conf.get("UPLOAD_CHUNK_SIZE", "4MB"), prev_size)
        finally:
            conf["UPLOAD_CHUNK_SIZE"] = prev_size

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
                                "user_database": "mysql+pymysql://root:pass@localhost:3306/testdb?charset=utf8mb4",
                            }
                        )
                        d = self.json("/api/admin/migratedb", method="POST", body=body)
                self.assertEqual(d["err"], "ok")
                self.assertTrue(d.get("need_restart"))
                self.assertEqual(main.CONF["user_database"], "mysql+pymysql://root:pass@localhost:3306/testdb?charset=utf8mb4")
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
                                "user_database": "mysql+pymysql://root:pass@localhost:3306/testdb?charset=utf8mb4",
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
                                "user_database": "mysql+pymysql://root:pass@localhost:3306/testdb?charset=utf8mb4",
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


class TestAdminUsersBatch(TestWithAdminUser):
    """AdminUsersBatch 批量权限接口测试"""

    def _delete_test_users(self, usernames):
        from webserver import models

        session = get_db()
        session.query(models.Reader).filter(models.Reader.username.in_(usernames)).delete(synchronize_session=False)
        session.commit()

    def _create_test_users(self, count):
        """创建独立测试用户，避免永久改写共享 fixture 用户权限"""
        from webserver import models

        usernames = ["batchperm%d" % i for i in range(count)]
        self._delete_test_users(usernames)

        session = get_db()
        now = datetime.datetime.now()
        users = []
        for username in usernames:
            user = models.Reader()
            user.username = username
            user.name = username
            user.email = "%s@example.com" % username
            user.admin = False
            user.active = True
            user.create_time = now
            user.update_time = now
            user.access_time = now
            user.extra = {"kindle_email": ""}
            user.set_secure_password("Passw0rd!")
            users.append(user)
            session.add(user)
        session.commit()
        return usernames, [u.id for u in users]

    def test_batch_permission_update(self):
        """批量更新权限后，所有指定用户的权限应被正确设置，包含和不含的权限都验证"""
        from webserver import models

        usernames, ids = self._create_test_users(2)
        try:
            # lrsp 启用登录/阅读/收藏/推送，UED 显式禁用上传/编辑/删除
            req = json.dumps({"ids": ids, "permission": "lrspUED"})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["updated"], len(ids))

            session = get_db()
            for uid in ids:
                user = session.query(models.Reader).filter(models.Reader.id == uid).first()
                self.assertTrue(user.can_login())
                self.assertTrue(user.can_read())
                self.assertTrue(user.can_save())
                self.assertTrue(user.can_push())
                # 显式禁用的权限应为 False
                self.assertFalse(user.can_upload())
                self.assertFalse(user.can_edit())
                self.assertFalse(user.can_delete())
        finally:
            self._delete_test_users(usernames)

    def test_batch_permission_disable(self):
        """批量禁用权限后，指定用户的权限应被正确关闭"""
        from webserver import models

        usernames, ids = self._create_test_users(1)
        try:
            req = json.dumps({"ids": ids, "permission": "UED"})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["updated"], 1)

            session = get_db()
            user = session.query(models.Reader).filter(models.Reader.id == ids[0]).first()
            self.assertFalse(user.can_upload())
            self.assertFalse(user.can_edit())
            self.assertFalse(user.can_delete())
        finally:
            self._delete_test_users(usernames)

    def test_batch_rejects_current_user(self):
        """批量权限不能修改当前管理员自身，避免把自己锁出系统"""
        from webserver import models

        usernames, ids = self._create_test_users(1)
        try:
            req = json.dumps({"ids": [1] + ids, "permission": "L"})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "params.user.invalid")

            session = get_db()
            current_user = session.query(models.Reader).filter(models.Reader.id == 1).first()
            other_user = session.query(models.Reader).filter(models.Reader.id == ids[0]).first()
            self.assertTrue(current_user.can_login())
            self.assertTrue(other_user.can_login())
        finally:
            self._delete_test_users(usernames)

    def test_batch_rolls_back_on_failure(self):
        """批量更新中途失败时，不应留下部分已提交的权限变更"""
        from webserver import models

        usernames, ids = self._create_test_users(2)
        calls = []
        original_set_permission = models.Reader.set_permission

        def flaky_set_permission(user, permission):
            calls.append(user.id)
            if len(calls) == 2:
                raise RuntimeError("boom")
            return original_set_permission(user, permission)

        try:
            with mock.patch.object(models.Reader, "set_permission", flaky_set_permission):
                req = json.dumps({"ids": ids, "permission": "UED"})
                d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "exception")

            session = get_db()
            for uid in ids:
                user = session.query(models.Reader).filter(models.Reader.id == uid).first()
                self.assertTrue(user.can_upload())
                self.assertTrue(user.can_edit())
                self.assertTrue(user.can_delete())
        finally:
            self._delete_test_users(usernames)

    def test_batch_ignores_missing_user_ids(self):
        """不存在的 id 静默忽略，updated 只统计实际命中的用户"""
        from webserver import models

        usernames, ids = self._create_test_users(1)
        try:
            req = json.dumps({"ids": ids + [999999], "permission": "UED"})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["updated"], 1)

            session = get_db()
            user = session.query(models.Reader).filter(models.Reader.id == ids[0]).first()
            self.assertFalse(user.can_upload())
            self.assertFalse(user.can_edit())
            self.assertFalse(user.can_delete())
        finally:
            self._delete_test_users(usernames)

    def test_batch_missing_permission(self):
        """缺少 permission 参数时应返回错误"""
        usernames, ids = self._create_test_users(1)
        try:
            req = json.dumps({"ids": ids})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "params.permission.invalid")
        finally:
            self._delete_test_users(usernames)

    def test_batch_missing_ids(self):
        """缺少 ids 参数时应返回错误"""
        req = json.dumps({"permission": "lrsp"})
        d = self.json("/api/admin/users/batch", method="POST", body=req)
        self.assertEqual(d["err"], "params.ids.required")

    def test_batch_ids_too_many(self):
        """ids 列表超过 500 时应返回错误"""
        req = json.dumps({"ids": list(range(1, 502)), "permission": "lrsp"})
        d = self.json("/api/admin/users/batch", method="POST", body=req)
        self.assertEqual(d["err"], "params.ids.too_many")

    def test_batch_permission_denied_for_non_admin(self):
        """非管理员无法批量修改权限"""
        from webserver import models

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            req = json.dumps({"ids": [2], "permission": "lrsp"})
            d = self.json("/api/admin/users/batch", method="POST", body=req)
            self.assertEqual(d["err"], "permission.not_admin")
        finally:
            user.admin = original_admin
            session.commit()


class TestAdminDefaultUserPermission(TestWithAdminUser):
    """新用户默认权限配置测试"""

    def _delete_user(self, username):
        from webserver import models

        session = get_db()
        session.query(models.Reader).filter(models.Reader.username == username).delete(synchronize_session=False)
        session.commit()

    def test_default_permission_saved_and_returned(self):
        """保存默认权限后，GET settings 应能取回"""
        from webserver import main

        original = main.CONF.get("DEFAULT_USER_PERMISSION", "")
        try:
            with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
                req = json.dumps({"DEFAULT_USER_PERMISSION": "lrsp"})
                d = self.json("/api/admin/settings", method="POST", body=req)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["rsp"].get("DEFAULT_USER_PERMISSION"), "lrsp")
        finally:
            main.CONF["DEFAULT_USER_PERMISSION"] = original

    def test_default_permission_applied_on_user_create(self):
        """管理员创建用户时，若未指定权限则应用系统默认权限"""
        from webserver import main, models

        original = main.CONF.get("DEFAULT_USER_PERMISSION", "")
        username = "testdefperm"
        try:
            self._delete_user(username)
            main.CONF["DEFAULT_USER_PERMISSION"] = "lrspUED"
            req = json.dumps(
                {
                    "username": username,
                    "password": "Passw0rd!",
                    "name": "Test Default",
                    "email": "testdefperm@example.com",
                }
            )
            d = self.json("/api/admin/users", method="POST", body=req)
            self.assertEqual(d["err"], "ok")

            session = get_db()
            user = session.query(models.Reader).filter(models.Reader.username == "testdefperm").first()
            self.assertIsNotNone(user)
            self.assertTrue(user.can_login())
            self.assertTrue(user.can_read())
            self.assertTrue(user.can_save())
            self.assertTrue(user.can_push())
            self.assertFalse(user.can_upload())
            self.assertFalse(user.can_edit())
            self.assertFalse(user.can_delete())
        finally:
            self._delete_user(username)
            main.CONF["DEFAULT_USER_PERMISSION"] = original

    @mock.patch("webserver.services.mail.MailService.send_mail")
    def test_default_permission_applied_on_signup(self, mock_mail):
        """用户自行注册时，应应用系统默认权限 DEFAULT_USER_PERMISSION"""
        from webserver import main, models

        original = main.CONF.get("DEFAULT_USER_PERMISSION", "")
        username = "signuptest"
        try:
            self._delete_user(username)
            main.CONF["DEFAULT_USER_PERMISSION"] = "lrspUED"
            body = "email=signuptest@example.com&nickname=signuptest&username=%s&password=Passw0rd!" % username
            d = self.json("/api/user/sign_up", method="POST", body=body)
            self.assertEqual(d["err"], "ok")

            session = get_db()
            user = session.query(models.Reader).filter(models.Reader.username == username).first()
            self.assertIsNotNone(user)
            self.assertTrue(user.can_login())
            self.assertTrue(user.can_read())
            self.assertTrue(user.can_save())
            self.assertTrue(user.can_push())
            self.assertFalse(user.can_upload())
            self.assertFalse(user.can_edit())
            self.assertFalse(user.can_delete())
        finally:
            self._delete_user(username)
            main.CONF["DEFAULT_USER_PERMISSION"] = original


class TestAdminOPDSBrowse(TestWithAdminUser):
    """AdminOPDSBrowse 接口测试"""

    @mock.patch("webserver.services.opds_import.OPDSImportService.fetch_opds_catalog")
    def test_browse_with_full_url(self, mock_fetch):
        """支持完整 url 字段直接浏览"""
        mock_fetch.return_value = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
</feed>"""
        body = json.dumps({"url": "http://example.com:8080/opds"})
        d = self.json("/api/admin/opds/browse", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        self.assertIn("items", d)
        mock_fetch.assert_called_once()
        args = mock_fetch.call_args[0]
        self.assertEqual(args[0], "http://example.com:8080/opds")

    @mock.patch("webserver.services.opds_import.OPDSImportService.fetch_opds_catalog")
    def test_browse_with_host_port_path(self, mock_fetch):
        """向后兼容：支持 host/port/path 三字段形式"""
        mock_fetch.return_value = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
</feed>"""
        body = json.dumps({"host": "http://example.com", "port": "8080", "path": "/opds"})
        d = self.json("/api/admin/opds/browse", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        mock_fetch.assert_called_once()
        args = mock_fetch.call_args[0]
        # 确认端口不重复拼接：结果应是 http://example.com:8080/opds
        self.assertIn("8080", args[0])
        self.assertNotIn("8080:8080", args[0])

    @mock.patch("webserver.services.opds_import.OPDSImportService.fetch_opds_catalog")
    def test_browse_host_with_port_not_duplicated(self, mock_fetch):
        """host 已含端口时，传入 port 字段不应重复拼接"""
        mock_fetch.return_value = b"""<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Test</title>
</feed>"""
        # host 已含 :8080，再传 port=8080 不应变成 :8080:8080
        body = json.dumps({"host": "http://example.com:8080", "port": "8080", "path": "/opds"})
        d = self.json("/api/admin/opds/browse", method="POST", body=body)
        self.assertEqual(d["err"], "ok")
        args = mock_fetch.call_args[0]
        self.assertNotIn("8080:8080", args[0])

    def test_browse_missing_params(self):
        """url 和 host 均为空时返回参数错误"""
        body = json.dumps({})
        d = self.json("/api/admin/opds/browse", method="POST", body=body)
        self.assertEqual(d["err"], "params.error")

    def test_browse_fetch_failure(self):
        """OPDS 目录获取失败时返回 error"""
        with mock.patch("webserver.services.opds_import.OPDSImportService.fetch_opds_catalog", return_value=None):
            body = json.dumps({"url": "http://nonexistent.example.com/opds"})
            d = self.json("/api/admin/opds/browse", method="POST", body=body)
            self.assertEqual(d["err"], "error")


class TestAdminOPDSImportStatus(TestWithAdminUser):
    """AdminOPDSImportStatus 接口测试"""

    def test_status_returns_counters(self):
        """状态接口返回计数器字段"""
        d = self.json("/api/admin/opds/import/status")
        self.assertEqual(d["err"], "ok")
        self.assertIn("status", d)
        self.assertIn("total", d["status"])
        self.assertIn("done", d["status"])
        self.assertIn("skip", d["status"])
        self.assertIn("fail", d["status"])
