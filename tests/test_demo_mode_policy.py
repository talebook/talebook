#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import unittest
from types import SimpleNamespace
from unittest import mock

from webserver import demo_mode


class TestDemoModePolicy(unittest.TestCase):
    def test_policy_is_disabled_by_default(self):
        conf = {"DEMO_MODE": False, "DEMO_USERNAME": "issue886_demo"}
        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/admin/settings"))
        self.assertTrue(demo_mode.can_login(conf, SimpleNamespace(username="another-user")))

    def test_can_login_allows_real_admin_account(self):
        conf = {"DEMO_MODE": True, "DEMO_USERNAME": "issue886_demo"}
        admin = SimpleNamespace(username="issue886_admin", is_admin=lambda: True)
        other = SimpleNamespace(username="issue886_other", is_admin=lambda: False)
        self.assertTrue(demo_mode.can_login(conf, admin))
        self.assertFalse(demo_mode.can_login(conf, other))

    def test_is_demo_restricted_exempts_only_real_admin(self):
        conf_off = {"DEMO_MODE": False, "DEMO_USERNAME": "issue886_demo"}
        conf_on = {"DEMO_MODE": True, "DEMO_USERNAME": "issue886_demo"}
        admin = SimpleNamespace(username="issue886_admin", is_admin=lambda: True)
        demo_user = SimpleNamespace(username="issue886_demo", is_admin=lambda: False)
        other = SimpleNamespace(username="issue886_other", is_admin=lambda: False)

        self.assertFalse(demo_mode.is_demo_restricted(conf_off, other))
        self.assertFalse(demo_mode.is_demo_restricted(conf_on, admin))
        self.assertTrue(demo_mode.is_demo_restricted(conf_on, demo_user))
        self.assertTrue(demo_mode.is_demo_restricted(conf_on, other))
        self.assertTrue(demo_mode.is_demo_restricted(conf_on, None))

    def test_request_is_allowed_bypasses_read_only_for_real_admin(self):
        conf = {"DEMO_MODE": True, "DEMO_USERNAME": "issue886_demo"}
        admin = SimpleNamespace(username="issue886_admin", is_admin=lambda: True)
        other = SimpleNamespace(username="issue886_other", is_admin=lambda: False)

        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/admin/users", admin))
        self.assertTrue(demo_mode.request_is_allowed(conf, "DELETE", "/api/book/1", admin))
        # 非管理员仍然只放行既有的只读方法与白名单路径
        self.assertFalse(demo_mode.request_is_allowed(conf, "POST", "/api/admin/users", other))
        self.assertFalse(demo_mode.request_is_allowed(conf, "POST", "/api/admin/users"))

    def test_configured_username_is_normalized(self):
        conf = {"DEMO_MODE": True, "DEMO_USERNAME": " Issue886_Demo "}
        self.assertTrue(demo_mode.is_demo_user(conf, SimpleNamespace(username="issue886_demo")))
        self.assertFalse(demo_mode.is_demo_user(conf, SimpleNamespace(username="another-user")))
        self.assertFalse(demo_mode.is_demo_user({"DEMO_MODE": True, "DEMO_USERNAME": ""}, None))

    def test_policy_allows_only_read_and_session_establishment(self):
        conf = {"DEMO_MODE": True, "DEMO_USERNAME": "issue886_demo"}
        self.assertTrue(demo_mode.request_is_allowed(conf, "GET", "/api/index"))
        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/user/sign_in"))
        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/captcha/verify/"))
        # 管理员设置页面的“假保存”被单独放行，由 handler 层保证不真正落盘。
        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/admin/settings"))
        self.assertFalse(demo_mode.request_is_allowed(conf, "POST", "/api/admin/users"))
        self.assertFalse(demo_mode.request_is_allowed(conf, "GET", "/api/user/active/send"))
        self.assertFalse(demo_mode.request_is_allowed(conf, "GET", "/api/active/user/code"))

    def test_ensure_demo_account_creates_missing_account_once(self):
        conf = {"DEMO_MODE": True, "DEMO_USERNAME": "issue886_autocreate"}
        created = []

        class FakeReader:
            username = None
            admin = None

            def __init__(self):
                self.saved_password = None

            def set_secure_password(self, raw_password):
                self.saved_password = raw_password

        class FakeQuery:
            def __init__(self, existing):
                self._existing = existing

            def filter(self, *args, **kwargs):
                return self

            def first(self):
                return self._existing

        class FakeSession:
            def __init__(self):
                self.existing = None

            def query(self, model):
                return FakeQuery(self.existing)

            def add(self, obj):
                created.append(obj)
                self.existing = obj

            def commit(self):
                pass

        import webserver.models as models_module

        original_reader = models_module.Reader
        models_module.Reader = FakeReader
        try:
            session = FakeSession()
            user = demo_mode.ensure_demo_account(conf, session)
            self.assertIsNotNone(user)
            self.assertEqual(user.username, "issue886_autocreate")
            self.assertFalse(user.admin)
            self.assertEqual(user.saved_password, demo_mode.DEMO_DEFAULT_PASSWORD)
            self.assertEqual(len(created), 1)

            # 第二次调用应复用已存在的账号，不重复创建。
            user_again = demo_mode.ensure_demo_account(conf, session)
            self.assertIs(user_again, user)
            self.assertEqual(len(created), 1)
        finally:
            models_module.Reader = original_reader

    def test_ensure_demo_account_noop_when_disabled_or_unconfigured(self):
        session = mock.Mock()
        self.assertIsNone(demo_mode.ensure_demo_account({"DEMO_MODE": False}, session))
        self.assertIsNone(demo_mode.ensure_demo_account({"DEMO_MODE": True, "DEMO_USERNAME": ""}, session))
        session.query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
