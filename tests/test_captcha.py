#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证功能测试
"""

import json
from unittest import mock

from tests.test_main import TestWithUserLogin, TestApp, setUpModule as init, main

def setUpModule():
    init()


class TestCaptchaConfig(TestApp):
    """测试验证码配置接口"""

    def test_captcha_config_disabled(self):
        """测试验证码未启用时的配置接口"""
        # 确保验证码未启用
        main.CONF["CAPTCHA_PROVIDER"] = ""
        
        d = self.json("/api/captcha/config")
        self.assertEqual(d["err"], "ok")
        self.assertIsNone(d["config"])

    def test_captcha_config_enabled(self):
        """测试验证码启用时的配置接口"""
        # 启用极验验证码
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_captcha_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_captcha_key"
        
        try:
            d = self.json("/api/captcha/config")
            self.assertEqual(d["err"], "ok")
            self.assertIsNotNone(d["config"])
            self.assertTrue(d["config"]["enabled"])
            self.assertEqual(d["config"]["provider"], "geetest")
            self.assertEqual(d["config"]["captchaId"], "test_captcha_id")
        finally:
            # 恢复配置
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["GEETEST_CAPTCHA_ID"] = ""
            main.CONF["GEETEST_CAPTCHA_KEY"] = ""

    def test_captcha_config_not_configured(self):
        """测试验证码提供商选择但未配置密钥时"""
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["GEETEST_CAPTCHA_ID"] = ""
        main.CONF["GEETEST_CAPTCHA_KEY"] = ""
        
        try:
            d = self.json("/api/captcha/config")
            self.assertEqual(d["err"], "ok")
            # 未正确配置时应该返回 None
            self.assertIsNone(d["config"])
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""


class TestCaptchaLogin(TestApp):
    """测试登录时的验证码验证"""

    def test_login_without_captcha(self):
        """测试未启用验证码时的正常登录"""
        main.CONF["CAPTCHA_PROVIDER"] = ""
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False
        
        d = self.json("/api/user/sign_in", method="POST", body="username=admin&password=admin123")
        self.assertEqual(d["err"], "ok")

    def test_login_with_captcha_missing(self):
        """测试启用验证码但未提供验证码时的登录"""
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            d = self.json("/api/user/sign_in", method="POST", body="username=admin&password=admin123")
            self.assertEqual(d["err"], "captcha.invalid")
            self.assertIn("验证", d["msg"])
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_login_with_captcha_success(self, mock_post):
        """测试启用验证码且验证成功时的登录"""
        # 模拟极验验证成功
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "success", "reason": "ok"}
        mock_post.return_value = mock_response
        
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            body = (
                "username=admin&password=admin123"
                "&lot_number=test_lot&captcha_output=test_output"
                "&pass_token=test_token&gen_time=1234567890"
            )
            d = self.json("/api/user/sign_in", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_login_with_captcha_fail(self, mock_post):
        """测试启用验证码但验证失败时的登录"""
        # 模拟极验验证失败
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "fail", "reason": "invalid"}
        mock_post.return_value = mock_response
        
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            body = (
                "username=admin&password=admin123"
                "&lot_number=test_lot&captcha_output=test_output"
                "&pass_token=test_token&gen_time=1234567890"
            )
            d = self.json("/api/user/sign_in", method="POST", body=body)
            self.assertEqual(d["err"], "captcha.invalid")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False


class TestCaptchaRegister(TestApp):
    """测试注册时的验证码验证"""

    def test_register_without_captcha(self):
        """测试未启用验证码时的注册"""
        main.CONF["CAPTCHA_PROVIDER"] = ""
        main.CONF["CAPTCHA_ENABLE_FOR_REGISTER"] = False
        main.CONF["ALLOW_REGISTER"] = True
        
        body = "email=test_captcha@test.com&nickname=testcaptcha&username=testcaptcha&password=testpass123"
        d = self.json("/api/user/sign_up", method="POST", body=body)
        # 可能成功或用户已存在
        self.assertIn(d["err"], ["ok", "params.username.exist"])

    def test_register_with_captcha_missing(self):
        """测试启用验证码但未提供验证码时的注册"""
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_REGISTER"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        main.CONF["ALLOW_REGISTER"] = True
        
        try:
            body = "email=test_captcha@test.com&nickname=testcaptcha&username=testcaptcha&password=testpass123"
            d = self.json("/api/user/sign_up", method="POST", body=body)
            self.assertEqual(d["err"], "captcha.invalid")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_REGISTER"] = False


class TestCaptchaWelcome(TestApp):
    """测试私人图书馆欢迎页面的验证码验证"""

    def setUp(self):
        main.CONF["INVITE_MODE"] = True
        main.CONF["INVITE_CODE"] = "test123"
        super().setUp()

    def tearDown(self):
        main.CONF["INVITE_MODE"] = False
        super().tearDown()

    def test_welcome_without_captcha(self):
        """测试未启用验证码时的欢迎页面访问"""
        main.CONF["CAPTCHA_PROVIDER"] = ""
        main.CONF["CAPTCHA_ENABLE_FOR_WELCOME"] = False
        
        d = self.json("/api/welcome", method="POST", body="invite_code=test123")
        self.assertEqual(d["err"], "ok")

    def test_welcome_with_captcha_missing(self):
        """测试启用验证码但未提供验证码时的访问"""
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_WELCOME"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            d = self.json("/api/welcome", method="POST", body="invite_code=test123")
            self.assertEqual(d["err"], "captcha.invalid")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_WELCOME"] = False

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_welcome_with_captcha_success(self, mock_post):
        """测试启用验证码且验证成功时的访问"""
        # 模拟极验验证成功
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "success", "reason": "ok"}
        mock_post.return_value = mock_response
        
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_WELCOME"] = True
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            body = (
                "invite_code=test123"
                "&lot_number=test_lot&captcha_output=test_output"
                "&pass_token=test_token&gen_time=1234567890"
            )
            d = self.json("/api/welcome", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""
            main.CONF["CAPTCHA_ENABLE_FOR_WELCOME"] = False


class TestCaptchaVerify(TestApp):
    """测试验证码验证接口"""

    def test_verify_without_provider(self):
        """测试未提供验证提供商时的验证"""
        d = self.json("/api/captcha/verify", method="POST", body="")
        self.assertEqual(d["err"], "params.invalid")

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_success(self, mock_post):
        """测试验证成功"""
        # 模拟极验验证成功
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "success", "reason": "ok"}
        mock_post.return_value = mock_response
        
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            body = (
                "provider=geetest&lot_number=test_lot&captcha_output=test_output"
                "&pass_token=test_token&gen_time=1234567890"
            )
            d = self.json("/api/captcha/verify", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["msg"], "验证通过")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_fail(self, mock_post):
        """测试验证失败"""
        # 模拟极验验证失败
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "fail", "reason": "invalid"}
        mock_post.return_value = mock_response
        
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["GEETEST_CAPTCHA_ID"] = "test_id"
        main.CONF["GEETEST_CAPTCHA_KEY"] = "test_key"
        
        try:
            body = (
                "provider=geetest&lot_number=test_lot&captcha_output=test_output"
                "&pass_token=test_token&gen_time=1234567890"
            )
            d = self.json("/api/captcha/verify", method="POST", body=body)
            self.assertEqual(d["err"], "captcha.invalid")
            self.assertEqual(d["msg"], "验证失败，请重试")
        finally:
            main.CONF["CAPTCHA_PROVIDER"] = ""


class TestCaptchaProvider(TestApp):
    """测试验证码提供商相关功能"""

    def test_get_available_providers(self):
        """测试获取可用的验证提供商列表"""
        from webserver.plugins import captcha as captcha_module
        
        providers = captcha_module.get_available_providers()
        self.assertIn("geetest", providers)
        self.assertEqual(providers["geetest"], "GeeTest (极验)")

    def test_is_captcha_enabled(self):
        """测试检查验证码是否启用"""
        from webserver.plugins import captcha as captcha_module
        
        # 未启用时
        main.CONF["CAPTCHA_PROVIDER"] = ""
        self.assertFalse(captcha_module.is_captcha_enabled(main.CONF, "login"))
        
        # 启用但未开启具体场景
        main.CONF["CAPTCHA_PROVIDER"] = "geetest"
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False
        self.assertFalse(captcha_module.is_captcha_enabled(main.CONF, "login"))
        
        # 启用且开启场景
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = True
        self.assertTrue(captcha_module.is_captcha_enabled(main.CONF, "login"))
        
        # 恢复
        main.CONF["CAPTCHA_PROVIDER"] = ""
        main.CONF["CAPTCHA_ENABLE_FOR_LOGIN"] = False


class TestGeetestProvider(TestApp):
    """测试极验验证提供商"""

    def test_is_configured(self):
        """测试检查极验是否已配置"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        # 未配置时
        settings = {
            "GEETEST_CAPTCHA_ID": "",
            "GEETEST_CAPTCHA_KEY": "",
        }
        provider = GeetestProvider(settings)
        self.assertFalse(provider.is_configured())
        
        # 只配置ID时
        settings["GEETEST_CAPTCHA_ID"] = "test_id"
        self.assertFalse(provider.is_configured())
        
        # 完全配置时
        settings["GEETEST_CAPTCHA_KEY"] = "test_key"
        self.assertTrue(provider.is_configured())

    def test_get_frontend_config(self):
        """测试获取前端配置"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_captcha_id",
            "GEETEST_CAPTCHA_KEY": "test_captcha_key",
        }
        provider = GeetestProvider(settings)
        config = provider.get_frontend_config()
        
        self.assertEqual(config["provider"], "geetest")
        self.assertEqual(config["captchaId"], "test_captcha_id")
        self.assertEqual(config["sdkUrl"], "https://static.geetest.com/v4/gt4.js")

    def test_is_enabled_for(self):
        """测试检查场景是否启用"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_id",
            "GEETEST_CAPTCHA_KEY": "test_key",
            "CAPTCHA_ENABLE_FOR_LOGIN": True,
            "CAPTCHA_ENABLE_FOR_REGISTER": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": True,
        }
        provider = GeetestProvider(settings)
        
        self.assertTrue(provider.is_enabled_for("login"))
        self.assertFalse(provider.is_enabled_for("register"))
        self.assertTrue(provider.is_enabled_for("welcome"))

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_success(self, mock_post):
        """测试极验验证成功"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        # 模拟极验验证成功
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "success", "reason": "ok"}
        mock_post.return_value = mock_response
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_id",
            "GEETEST_CAPTCHA_KEY": "test_key",
        }
        provider = GeetestProvider(settings)
        
        result = provider.verify(
            lot_number="test_lot",
            captcha_output="test_output",
            pass_token="test_token",
            gen_time="1234567890"
        )
        
        self.assertTrue(result)

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_fail(self, mock_post):
        """测试极验验证失败"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        # 模拟极验验证失败
        mock_response = mock.Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "fail", "reason": "invalid"}
        mock_post.return_value = mock_response
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_id",
            "GEETEST_CAPTCHA_KEY": "test_key",
        }
        provider = GeetestProvider(settings)
        
        result = provider.verify(
            lot_number="test_lot",
            captcha_output="test_output",
            pass_token="test_token",
            gen_time="1234567890"
        )
        
        self.assertFalse(result)

    def test_verify_missing_params(self):
        """测试缺少参数时的验证"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_id",
            "GEETEST_CAPTCHA_KEY": "test_key",
        }
        provider = GeetestProvider(settings)
        
        # 缺少参数
        result = provider.verify(lot_number="test_lot")
        self.assertFalse(result)

    @mock.patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_api_exception(self, mock_post):
        """测试极验API异常时的处理"""
        from webserver.plugins.captcha.geetest import GeetestProvider
        import requests
        
        # 模拟请求异常
        mock_post.side_effect = requests.RequestException("Connection error")
        
        settings = {
            "GEETEST_CAPTCHA_ID": "test_id",
            "GEETEST_CAPTCHA_KEY": "test_key",
        }
        provider = GeetestProvider(settings)
        
        result = provider.verify(
            lot_number="test_lot",
            captcha_output="test_output",
            pass_token="test_token",
            gen_time="1234567890"
        )
        
        # API异常时默认通过，保证业务连续性
        self.assertTrue(result)


if __name__ == "__main__":
    import unittest
    unittest.main()
