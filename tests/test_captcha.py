#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证功能测试 - 不依赖Web应用的纯模块测试
"""

import unittest
from unittest import mock
import sys
import os

testdir = os.path.dirname(os.path.realpath(__file__))
projdir = os.path.realpath(testdir + "/../../")
sys.path.insert(0, projdir)


class TestCaptchaProvider(unittest.TestCase):
    """测试验证码提供商相关功能"""

    def test_get_available_providers(self):
        """测试获取可用的验证提供商列表"""
        from webserver.plugins import captcha as captcha_module
        
        providers = captcha_module.get_available_providers()
        self.assertIn("geetest", providers)
        self.assertEqual(providers["geetest"], "GeeTest (极验)")


class TestGeetestProvider(unittest.TestCase):
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


class TestCaptchaPluginFunctions(unittest.TestCase):
    """测试验证码插件模块的核心函数"""

    def test_is_captcha_enabled(self):
        """测试检查验证码是否启用"""
        from webserver.plugins import captcha as captcha_module
        
        # 模拟配置
        settings = {
            "CAPTCHA_PROVIDER": "",
            "CAPTCHA_ENABLE_FOR_LOGIN": True,
        }
        # 未启用时
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "login"))
        
        # 启用但未开启具体场景
        settings["CAPTCHA_PROVIDER"] = "geetest"
        settings["CAPTCHA_ENABLE_FOR_LOGIN"] = False
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "login"))
        
        # 启用且开启场景
        settings["CAPTCHA_ENABLE_FOR_LOGIN"] = True
        self.assertTrue(captcha_module.is_captcha_enabled(settings, "login"))

    def test_get_captcha_config_disabled(self):
        """测试未启用验证码时的配置获取"""
        from webserver.plugins import captcha as captcha_module
        
        settings = {
            "CAPTCHA_PROVIDER": "",
        }
        config = captcha_module.get_captcha_config(settings)
        self.assertIsNone(config)

    def test_get_captcha_config_not_configured(self):
        """测试选择了提供商但未配置密钥"""
        from webserver.plugins import captcha as captcha_module
        
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "",
            "GEETEST_CAPTCHA_KEY": "",
        }
        config = captcha_module.get_captcha_config(settings)
        self.assertIsNone(config)


if __name__ == "__main__":
    unittest.main()
