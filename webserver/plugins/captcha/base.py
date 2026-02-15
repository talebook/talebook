#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""
人机验证基础模块
定义验证提供商的抽象基类
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseCaptchaProvider(ABC):
    """人机验证提供商抽象基类"""

    # 提供商名称标识
    name = ""

    # 前端SDK URL
    sdk_url = ""

    def __init__(self, settings: Dict[str, Any]):
        """
        初始化验证提供商
        :param settings: 系统配置字典
        """
        self.settings = settings

    @abstractmethod
    def is_configured(self) -> bool:
        """
        检查是否已配置
        :return: True 如果已配置，False 否则
        """
        pass

    @abstractmethod
    def get_frontend_config(self) -> Dict[str, Any]:
        """
        获取前端配置
        :return: 前端初始化需要的配置字典
        """
        pass

    @abstractmethod
    def verify(self, **kwargs) -> bool:
        """
        执行二次验证
        :param kwargs: 验证参数（不同提供商参数不同）
        :return: True 验证通过，False 验证失败
        """
        pass

    def is_enabled_for(self, scene: str) -> bool:
        """
        检查某场景是否启用了验证
        :param scene: 场景名称，可选值: 'register', 'login', 'welcome'
        :return: True 如果该场景启用了验证
        """
        scene_key = f"CAPTCHA_ENABLE_FOR_{scene.upper()}"
        return self.settings.get(scene_key, False)
