#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock
from tests.test_main import TestWithUserLogin, TestWithAdminUser, setUpModule as init, get_db


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
