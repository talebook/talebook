#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""
TTS 引擎抽象层
提供 BaseTTSEngine 基类和 TTSEngineRegistry 注册表
"""

from abc import ABC, abstractmethod
import logging
import os
from typing import Optional


class BaseTTSEngine(ABC):
    """TTS 引擎抽象接口"""

    KEY: str = None  # 引擎标识符，子类必须定义

    @abstractmethod
    def synthesize(self, text: str, output_path: str, **kwargs) -> bool:
        """将文本合成为音频文件

        Args:
            text: 要合成的文本
            output_path: 输出文件路径 (.mp3)
            **kwargs: 引擎特定参数 (voice, rate, pitch)

        Returns:
            bool: 合成是否成功
        """
        pass

    @abstractmethod
    def get_voices(self) -> list[dict]:
        """获取可用音色列表

        Returns:
            list[dict]: 音色列表，每项包含 id, lang, name 字段
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """检查引擎是否可用（依赖是否安装等）"""
        pass

    def validate_text(self, text: str) -> bool:
        """验证文本是否适合合成"""
        if not text or not text.strip():
            return False
        if len(text) > 50000:  # Piper 单次合成限制
            return False
        return True


class TTSEngineRegistry:
    """引擎注册表，单例模式"""

    _engines: dict = {}

    @classmethod
    def register(cls, engine_class):
        """注册 TTS 引擎"""
        if hasattr(engine_class, 'KEY') and engine_class.KEY:
            cls._engines[engine_class.KEY] = engine_class
            logging.info(f"TTS engine registered: {engine_class.KEY}")
        return engine_class

    @classmethod
    def get(cls, key: str) -> Optional[BaseTTSEngine]:
        """获取指定引擎实例"""
        engine_class = cls._engines.get(key)
        if engine_class:
            return engine_class()
        return None

    @classmethod
    def get_default(cls) -> Optional[BaseTTSEngine]:
        """返回默认引擎（按优先级：piper > coqui > azure）"""
        for key in ['piper', 'coqui', 'azure']:
            if key in cls._engines:
                return cls._engines[key]()
        return None

    @classmethod
    def list_engines(cls) -> list[str]:
        """列出所有已注册引擎"""
        return list(cls._engines.keys())

    @classmethod
    def load_plugins(cls):
        """加载所有 TTS 插件"""
        import importlib

        plugin_dir = os.path.join(
            os.path.dirname(__file__),
            '..', 'plugins', 'tts'
        )

        if not os.path.exists(plugin_dir):
            return

        for item in os.listdir(plugin_dir):
            plugin_path = os.path.join(plugin_dir, item)
            if item.startswith('_') or item.startswith('.'):
                continue
            if os.path.isdir(plugin_path):
                init_file = os.path.join(plugin_path, '__init__.py')
                if os.path.exists(init_file):
                    try:
                        module_name = f'webserver.plugins.tts.{item}'
                        importlib.import_module(module_name)
                    except Exception as e:
                        logging.warning(f"Failed to load TTS plugin {item}: {e}")