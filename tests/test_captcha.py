#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证模块单元测试
"""

import unittest
from unittest.mock import Mock, patch, MagicMock

# 直接测试验证码模块，不依赖 webserver 其他组件
import sys
import os

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from webserver.plugins.captcha.base import BaseCaptchaProvider
from webserver.plugins.captcha.geetest import GeetestProvider
from webserver.plugins import captcha as captcha_module


class MockCaptchaProvider(BaseCaptchaProvider):
    """模拟验证码提供商，用于测试"""

    name = "mock"
    sdk_url = "https://mock.com/captcha.js"

    def __init__(self, settings):
        super().__init__(settings)
        self._configured = settings.get("MOCK_CONFIGURED", True)
        self._verify_result = settings.get("MOCK_VERIFY_RESULT", True)

    def is_configured(self) -> bool:
        return self._configured

    def get_frontend_config(self) -> dict:
        return {
            "provider": self.name,
            "captchaId": "mock-id",
            "sdkUrl": self.sdk_url,
        }

    def verify(self, **kwargs) -> bool:
        return self._verify_result


class TestBaseCaptchaProvider(unittest.TestCase):
    """测试基础验证码提供商"""

    def setUp(self):
        """测试前准备"""
        # 重置模块状态
        captcha_module._current_provider = None
        captcha_module._current_provider_name = None

    def test_is_enabled_for_register(self):
        """测试注册场景启用检查"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": True,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": False,
        }
        provider = MockCaptchaProvider(settings)

        self.assertTrue(provider.is_enabled_for("register"))
        self.assertFalse(provider.is_enabled_for("login"))
        self.assertFalse(provider.is_enabled_for("welcome"))

    def test_is_enabled_for_login(self):
        """测试登录场景启用检查"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": False,
            "CAPTCHA_ENABLE_FOR_LOGIN": True,
            "CAPTCHA_ENABLE_FOR_WELCOME": False,
        }
        provider = MockCaptchaProvider(settings)

        self.assertFalse(provider.is_enabled_for("register"))
        self.assertTrue(provider.is_enabled_for("login"))
        self.assertFalse(provider.is_enabled_for("welcome"))

    def test_is_enabled_for_welcome(self):
        """测试欢迎场景启用检查"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": False,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": True,
        }
        provider = MockCaptchaProvider(settings)

        self.assertFalse(provider.is_enabled_for("register"))
        self.assertFalse(provider.is_enabled_for("login"))
        self.assertTrue(provider.is_enabled_for("welcome"))

    def test_is_enabled_for_reset(self):
        """测试重置密码场景启用检查"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": False,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": False,
            "CAPTCHA_ENABLE_FOR_RESET": True,
        }
        provider = MockCaptchaProvider(settings)

        self.assertFalse(provider.is_enabled_for("register"))
        self.assertFalse(provider.is_enabled_for("login"))
        self.assertFalse(provider.is_enabled_for("welcome"))
        self.assertTrue(provider.is_enabled_for("reset"))

    def test_is_enabled_for_all_scenes(self):
        """测试所有场景都启用"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": True,
            "CAPTCHA_ENABLE_FOR_LOGIN": True,
            "CAPTCHA_ENABLE_FOR_WELCOME": True,
            "CAPTCHA_ENABLE_FOR_RESET": True,
        }
        provider = MockCaptchaProvider(settings)

        self.assertTrue(provider.is_enabled_for("register"))
        self.assertTrue(provider.is_enabled_for("login"))
        self.assertTrue(provider.is_enabled_for("welcome"))
        self.assertTrue(provider.is_enabled_for("reset"))

    def test_is_enabled_for_no_scenes(self):
        """测试所有场景都禁用"""
        settings = {
            "CAPTCHA_ENABLE_FOR_REGISTER": False,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": False,
            "CAPTCHA_ENABLE_FOR_RESET": False,
        }
        provider = MockCaptchaProvider(settings)

        self.assertFalse(provider.is_enabled_for("register"))
        self.assertFalse(provider.is_enabled_for("login"))
        self.assertFalse(provider.is_enabled_for("welcome"))
        self.assertFalse(provider.is_enabled_for("reset"))


class TestGeetestProvider(unittest.TestCase):
    """测试极验验证码提供商"""

    def setUp(self):
        """测试前准备"""
        self.valid_settings = {
            "GEETEST_CAPTCHA_ID": "test-captcha-id",
            "GEETEST_CAPTCHA_KEY": "test-captcha-key",
        }
        self.invalid_settings = {
            "GEETEST_CAPTCHA_ID": "",
            "GEETEST_CAPTCHA_KEY": "",
        }
        # 重置模块状态
        captcha_module._current_provider = None
        captcha_module._current_provider_name = None

    def test_is_configured_with_valid_credentials(self):
        """测试已配置状态"""
        provider = GeetestProvider(self.valid_settings)
        self.assertTrue(provider.is_configured())

    def test_is_configured_with_empty_id(self):
        """测试空 ID 时未配置"""
        settings = {
            "GEETEST_CAPTCHA_ID": "",
            "GEETEST_CAPTCHA_KEY": "test-key",
        }
        provider = GeetestProvider(settings)
        self.assertFalse(provider.is_configured())

    def test_is_configured_with_empty_key(self):
        """测试空 Key 时未配置"""
        settings = {
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "",
        }
        provider = GeetestProvider(settings)
        self.assertFalse(provider.is_configured())

    def test_is_configured_with_missing_credentials(self):
        """测试缺少配置时未配置"""
        provider = GeetestProvider(self.invalid_settings)
        self.assertFalse(provider.is_configured())

    def test_get_frontend_config(self):
        """测试获取前端配置"""
        provider = GeetestProvider(self.valid_settings)
        config = provider.get_frontend_config()

        self.assertEqual(config["provider"], "geetest")
        self.assertEqual(config["captchaId"], "test-captcha-id")
        self.assertEqual(config["sdkUrl"], "https://static.geetest.com/v4/gt4.js")

    @patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_success(self, mock_post):
        """测试验证成功"""
        # 模拟成功响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "success"}
        mock_post.return_value = mock_response

        provider = GeetestProvider(self.valid_settings)
        result = provider.verify(
            lot_number="test-lot",
            captcha_output="test-output",
            pass_token="test-token",
            gen_time="1234567890",
        )

        self.assertTrue(result)
        mock_post.assert_called_once()

    @patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_failure(self, mock_post):
        """测试验证失败"""
        # 模拟失败响应
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "fail", "reason": "invalid"}
        mock_post.return_value = mock_response

        provider = GeetestProvider(self.valid_settings)
        result = provider.verify(
            lot_number="test-lot",
            captcha_output="test-output",
            pass_token="test-token",
            gen_time="1234567890",
        )

        self.assertFalse(result)

    @patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_api_error(self, mock_post):
        """测试 API 错误时默认通过"""
        # 模拟 API 错误
        mock_response = Mock()
        mock_response.status_code = 500
        mock_post.return_value = mock_response

        provider = GeetestProvider(self.valid_settings)
        result = provider.verify(
            lot_number="test-lot",
            captcha_output="test-output",
            pass_token="test-token",
            gen_time="1234567890",
        )

        # API 错误时默认通过，避免影响业务
        self.assertTrue(result)

    @patch("webserver.plugins.captcha.geetest.requests.post")
    def test_verify_network_error(self, mock_post):
        """测试网络错误时默认通过"""
        # 模拟网络错误
        import requests

        mock_post.side_effect = requests.RequestException("Network error")

        provider = GeetestProvider(self.valid_settings)
        result = provider.verify(
            lot_number="test-lot",
            captcha_output="test-output",
            pass_token="test-token",
            gen_time="1234567890",
        )

        # 网络错误时默认通过，避免影响业务
        self.assertTrue(result)

    def test_verify_missing_parameters(self):
        """测试缺少参数时验证失败"""
        provider = GeetestProvider(self.valid_settings)

        # 缺少 lot_number
        result = provider.verify(captcha_output="test-output", pass_token="test-token", gen_time="1234567890")
        self.assertFalse(result)

        # 缺少 captcha_output
        result = provider.verify(lot_number="test-lot", pass_token="test-token", gen_time="1234567890")
        self.assertFalse(result)

    def test_verify_not_configured(self):
        """测试未配置时验证失败"""
        provider = GeetestProvider(self.invalid_settings)
        result = provider.verify(
            lot_number="test-lot",
            captcha_output="test-output",
            pass_token="test-token",
            gen_time="1234567890",
        )
        self.assertFalse(result)


class TestCaptchaModule(unittest.TestCase):
    """测试验证码模块加载器"""

    def setUp(self):
        """测试前准备"""
        # 重置模块状态
        captcha_module._current_provider = None
        captcha_module._current_provider_name = None

    def test_get_available_providers(self):
        """测试获取可用提供商列表"""
        providers = captcha_module.get_available_providers()

        self.assertIn("geetest", providers)
        self.assertEqual(providers["geetest"], "GeeTest (极验)")

    def test_get_captcha_provider_no_provider(self):
        """测试未配置提供商时返回 None"""
        settings = {"CAPTCHA_PROVIDER": ""}
        provider = captcha_module.get_captcha_provider(settings)

        self.assertIsNone(provider)

    def test_get_captcha_provider_geetest(self):
        """测试获取极验提供商"""
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "test-key",
        }
        provider = captcha_module.get_captcha_provider(settings)

        self.assertIsNotNone(provider)
        self.assertIsInstance(provider, GeetestProvider)

    def test_get_captcha_provider_unknown(self):
        """测试未知提供商时返回 None"""
        settings = {"CAPTCHA_PROVIDER": "unknown"}
        provider = captcha_module.get_captcha_provider(settings)

        self.assertIsNone(provider)

    def test_get_captcha_provider_caching(self):
        """测试提供商实例缓存"""
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "test-key",
        }

        # 第一次获取
        provider1 = captcha_module.get_captcha_provider(settings)
        # 第二次获取应该返回缓存的实例
        provider2 = captcha_module.get_captcha_provider(settings)

        self.assertIs(provider1, provider2)

    def test_is_captcha_enabled_no_provider(self):
        """测试未配置提供商时返回 False"""
        settings = {"CAPTCHA_PROVIDER": ""}

        self.assertFalse(captcha_module.is_captcha_enabled(settings, "register"))
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "login"))
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "welcome"))
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "reset"))

    def test_is_captcha_enabled_with_provider(self):
        """测试配置提供商后按场景返回"""
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "test-key",
            "CAPTCHA_ENABLE_FOR_REGISTER": True,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": True,
            "CAPTCHA_ENABLE_FOR_RESET": False,
        }

        self.assertTrue(captcha_module.is_captcha_enabled(settings, "register"))
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "login"))
        self.assertTrue(captcha_module.is_captcha_enabled(settings, "welcome"))
        self.assertFalse(captcha_module.is_captcha_enabled(settings, "reset"))

    def test_verify_captcha_no_provider(self):
        """测试未配置提供商时默认通过"""
        settings = {"CAPTCHA_PROVIDER": ""}
        result = captcha_module.verify_captcha(settings)

        self.assertTrue(result)

    @patch.object(GeetestProvider, "verify")
    def test_verify_captcha_with_provider(self, mock_verify):
        """测试配置提供商后执行验证"""
        mock_verify.return_value = True

        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "test-key",
        }

        # 重置缓存以确保使用新的 provider
        captcha_module._current_provider = None
        captcha_module._current_provider_name = None

        result = captcha_module.verify_captcha(
            settings,
            lot_number="test",
            captcha_output="test",
            pass_token="test",
            gen_time="123",
        )

        self.assertTrue(result)
        mock_verify.assert_called_once()

    def test_get_captcha_config_no_provider(self):
        """测试未配置提供商时返回 None"""
        settings = {"CAPTCHA_PROVIDER": ""}
        config = captcha_module.get_captcha_config(settings)

        self.assertIsNone(config)

    def test_get_captcha_config_not_configured(self):
        """测试提供商未正确配置时返回 None"""
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "",
            "GEETEST_CAPTCHA_KEY": "",
        }
        config = captcha_module.get_captcha_config(settings)

        self.assertIsNone(config)

    def test_get_captcha_config_success(self):
        """测试获取配置成功"""
        settings = {
            "CAPTCHA_PROVIDER": "geetest",
            "GEETEST_CAPTCHA_ID": "test-id",
            "GEETEST_CAPTCHA_KEY": "test-key",
            "CAPTCHA_ENABLE_FOR_REGISTER": True,
            "CAPTCHA_ENABLE_FOR_LOGIN": False,
            "CAPTCHA_ENABLE_FOR_WELCOME": True,
            "CAPTCHA_ENABLE_FOR_RESET": True,
        }

        # 重置缓存
        captcha_module._current_provider = None
        captcha_module._current_provider_name = None

        config = captcha_module.get_captcha_config(settings)

        self.assertIsNotNone(config)
        self.assertTrue(config["enabled"])
        self.assertEqual(config["provider"], "geetest")
        self.assertEqual(config["captchaId"], "test-id")
        self.assertIn("scenes", config)
        self.assertEqual(config["scenes"]["register"], True)
        self.assertEqual(config["scenes"]["login"], False)
        self.assertEqual(config["scenes"]["welcome"], True)
        self.assertEqual(config["scenes"]["reset"], True)


if __name__ == "__main__":
    # 运行测试
    unittest.main(verbosity=2)
