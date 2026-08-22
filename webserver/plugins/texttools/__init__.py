# -*- coding: utf-8 -*-
"""Talebook 内置书籍文本工具（正文查找替换 / 繁简转换 / TXT 编码修复）。

本包提供三个内置插件的纯处理核心，均不依赖 Calibre / 数据库：
- :mod:`webserver.plugins.texttools.text_replace` —— 正文查找替换；
- :mod:`webserver.plugins.texttools.chinese_epub` + ``opencc_engine`` —— 繁简转换；
- :mod:`webserver.plugins.texttools.txt_fixer` + ``encoding_detect`` —— TXT 编码修复。

插件目录注册（manifest）见 ``webserver/plugins/runtime/builtin_capabilities.py``，
API 编排（书籍读取 / 写回 / 入库）见 ``webserver/handlers/plugins.py``。

引擎与字典来源：
- opencc-python 引擎移植自 Hopkins1/TradSimpChinese（Apache License 2.0）；
- 字典数据来自 OpenCC（https://github.com/BYVoid/OpenCC，Apache License 2.0）；
- 增强词表 a5_phrases.txt 来自 a5566123s/Calibre-BIG5toGBK 个人修正版。

@author: 黏菌, 2026
"""

from .chinese_epub import convert_epub, convert_txt_file
from .encoding_detect import decode_with_report, detect_encoding
from .epub_utils import find_text_entries, read_text_entries
from .opencc_engine import DIRECTION_LABELS, OpenCC
from .text_replace import compile_rule
from .text_replace import load_texts, replace_epub_file, replace_txt_file
from .text_replace import preview as replace_preview
from .txt_fixer import ANALYZE_LIMIT, analyze_bytes, fix_bytes

__all__ = [
    "ANALYZE_LIMIT",
    "DIRECTION_LABELS",
    "OpenCC",
    "analyze_bytes",
    "compile_rule",
    "convert_epub",
    "convert_txt_file",
    "decode_with_report",
    "detect_encoding",
    "find_text_entries",
    "fix_bytes",
    "load_texts",
    "read_text_entries",
    "replace_epub_file",
    "replace_preview",
    "replace_txt_file",
]
