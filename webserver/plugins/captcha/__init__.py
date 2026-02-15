#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证模块加载器
支持动态加载不同的验证提供商
"""

import logging
from typing import Dict, Any, Optional, Type

from .base import BaseCaptchaProvider
from .geetest import GeetestProvider

# 注册所有可用的验证提供商
_CAPTCHA_PROVIDERS = {
    'geetest': GeetestProvider,
}

# 全局缓存
_current_provider: Optional[BaseCaptchaProvider] = None
_current_provider_name: Optional[str] = None


def get_available_providers() -> Dict[str, str]:
    """
    获取所有可用的验证提供商列表
    :return: 提供商名称和显示名称的映射
    """
    return {
        'geetest': 'GeeTest (极验)',
    }


def get_captcha_provider(settings: Dict[str, Any]) -> Optional[BaseCaptchaProvider]:
    """
    获取当前配置的验证提供商实例
    :param settings: 系统配置
    :return: 验证提供商实例，如果未配置则返回 None
    """
    global _current_provider, _current_provider_name
    
    provider_name = settings.get('CAPTCHA_PROVIDER', '')
    
    # 如果未启用验证，返回 None
    if not provider_name:
        _current_provider = None
        _current_provider_name = None
        return None
    
    # 如果提供商未改变，返回缓存的实例
    if _current_provider_name == provider_name and _current_provider is not None:
        return _current_provider
    
    # 获取提供商类
    provider_class = _CAPTCHA_PROVIDERS.get(provider_name)
    if not provider_class:
        logging.error(f"Unknown captcha provider: {provider_name}")
        return None
    
    # 创建新实例
    try:
        _current_provider = provider_class(settings)
        _current_provider_name = provider_name
        return _current_provider
    except Exception as e:
        logging.error(f"Failed to initialize captcha provider {provider_name}: {e}")
        return None


def is_captcha_enabled(settings: Dict[str, Any], scene: str) -> bool:
    """
    检查某场景是否启用了人机验证
    :param settings: 系统配置
    :param scene: 场景名称 (register, login, welcome)
    :return: True 如果启用了验证
    """
    provider = get_captcha_provider(settings)
    if not provider:
        return False
    return provider.is_enabled_for(scene)


def verify_captcha(settings: Dict[str, Any], **kwargs) -> bool:
    """
    执行人机验证
    :param settings: 系统配置
    :param kwargs: 验证参数
    :return: True 验证通过
    """
    provider = get_captcha_provider(settings)
    if not provider:
        # 未配置验证提供商，默认通过
        return True
    
    return provider.verify(**kwargs)


def get_captcha_config(settings: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    获取前端需要的验证配置
    :param settings: 系统配置
    :return: 配置字典，如果未启用则返回 None
    """
    provider = get_captcha_provider(settings)
    if not provider:
        return None
    
    if not provider.is_configured():
        logging.warning(f"Captcha provider {provider.name} is not configured properly")
        return None
    
    config = provider.get_frontend_config()
    config['enabled'] = True
    return config
