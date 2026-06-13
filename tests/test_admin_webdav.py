#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock

from tests.test_main import TestWithAdminUser, TestWithUserLogin
from tests.test_main import setUpModule as init


def setUpModule():
    init()


class TestAdminWebDAVPermission(TestWithUserLogin):
    def test_get_requires_admin(self):
        """普通用户无法访问 WebDAV 管理接口"""
        from webserver import models

        from tests.test_main import get_db

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            d = self.json("/api/admin/webdav")
            self.assertEqual(d["err"], "permission")
        finally:
            user.admin = original_admin
            session.commit()

    def test_post_requires_admin(self):
        """普通用户无法操作 WebDAV 服务"""
        from webserver import models

        from tests.test_main import get_db

        session = get_db()
        user = session.query(models.Reader).filter(models.Reader.id == 1).first()
        original_admin = user.admin
        user.admin = False
        session.commit()
        try:
            d = self.json("/api/admin/webdav", method="POST", body=json.dumps({"action": "start"}))
            self.assertEqual(d["err"], "permission")
        finally:
            user.admin = original_admin
            session.commit()


class TestAdminWebDAV(TestWithAdminUser):
    def test_get_status(self):
        """管理员可以查询 WebDAV 服务状态"""
        d = self.json("/api/admin/webdav")
        self.assertEqual(d["err"], "ok")
        self.assertIn("running", d)
        self.assertIn("port", d)
        self.assertIsInstance(d["running"], bool)

    def test_post_invalid_action(self):
        """无效操作返回错误"""
        d = self.json("/api/admin/webdav", method="POST", body=json.dumps({"action": "invalid"}))
        self.assertEqual(d["err"], "params.invalid")

    @mock.patch("webserver.services.webdav_service.WebDAVService.start", return_value=True)
    def test_post_start(self, mock_start):
        """管理员可以启动 WebDAV 服务"""
        d = self.json("/api/admin/webdav", method="POST", body=json.dumps({"action": "start"}))
        self.assertEqual(d["err"], "ok")
        self.assertTrue(d["running"])

    @mock.patch("webserver.services.webdav_service.WebDAVService.start", return_value=False)
    def test_post_start_failure(self, mock_start):
        """启动失败时返回错误"""
        d = self.json("/api/admin/webdav", method="POST", body=json.dumps({"action": "start"}))
        self.assertEqual(d["err"], "start_failed")

    @mock.patch("webserver.services.webdav_service.WebDAVService.stop")
    def test_post_stop(self, mock_stop):
        """管理员可以停止 WebDAV 服务"""
        d = self.json("/api/admin/webdav", method="POST", body=json.dumps({"action": "stop"}))
        self.assertEqual(d["err"], "ok")
        self.assertFalse(d["running"])
        mock_stop.assert_called_once()

    def test_webdav_settings_saved(self):
        """WebDAV 相关配置可以通过 AdminSettings 保存"""
        with mock.patch("webserver.loader.SettingsLoader.set_store_path", return_value="/tmp/"):
            payload = {
                "WEBDAV_ENABLED": True,
                "WEBDAV_PORT": 8090,
                "WEBDAV_USERNAME": "testuser",
                "WEBDAV_PASSWORD": "testpass",
            }
            d = self.json("/api/admin/settings", method="POST", body=json.dumps(payload))
            self.assertEqual(d["err"], "ok")
            self.assertIn("WEBDAV_ENABLED", d["rsp"])
            self.assertIn("WEBDAV_PORT", d["rsp"])
            self.assertIn("WEBDAV_USERNAME", d["rsp"])
            self.assertIn("WEBDAV_PASSWORD", d["rsp"])
