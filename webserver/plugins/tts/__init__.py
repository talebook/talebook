#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

"""TTS 引擎插件统一导出"""

from .piper import PiperTTSEngine, KEY as PIPER_KEY

# 导出所有可用引擎
__all__ = ['PiperTTSEngine', 'PIPER_KEY']