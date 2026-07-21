#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import unittest
from types import SimpleNamespace

from webserver import demo_mode


class TestDemoModePolicy(unittest.TestCase):
    def test_policy_is_disabled_by_default(self):
        conf = {"DEMO_MODE": False, "DEMO_USERNAME": "issue886_demo"}
        self.assertTrue(demo_mode.request_is_allowed(conf, "POST", "/api/admin/settings"))
        self.assertTrue(demo_mode.can_login(conf, SimpleNamespace(username="another-user")))

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
        self.assertFalse(demo_mode.request_is_allowed(conf, "POST", "/api/admin/settings"))
        self.assertFalse(demo_mode.request_is_allowed(conf, "GET", "/api/user/active/send"))
        self.assertFalse(demo_mode.request_is_allowed(conf, "GET", "/api/active/user/code"))


if __name__ == "__main__":
    unittest.main()
