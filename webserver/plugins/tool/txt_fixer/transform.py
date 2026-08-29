# -*- coding: utf-8 -*-
"""TXT 编码修复核心逻辑（不依赖 Talebook，可独立测试）。

检测 TXT 电子书的编码（BOM / 候选编码打分 / chardet 投票 / mojibake 反转链，
详见 :mod:`webserver.plugins.tool.common`），解码为正确的
UTF-8（无 BOM）文本。

@author: 黏菌, 2026
"""

from typing import Tuple

from ..common import decode_with_report

# analyze 报告中的修复预览长度
PREVIEW_CHARS = 500
# analyze 检测读取上限（编码检测取前缀即可，防大文件阻塞请求线程）
ANALYZE_LIMIT = 2 * 1024 * 1024


def analyze_bytes(data: bytes) -> dict:
    """检测字节流编码并返回报告 + 修复后预览。

    :return dict: ``encoding`` / ``confidence`` / ``mojibake`` / ``garbage`` /
        ``sample``（原始可读性样本）/ ``preview``（修复后预览）/
        ``reasons``（检测依据列表）。
    """
    text, report = decode_with_report(data)
    report["preview"] = text[:PREVIEW_CHARS]
    return report


def fix_bytes(data: bytes) -> Tuple[bytes, dict]:
    """修复入口：检测并转换为 UTF-8（无 BOM）文本。

    :return: (text, report)；调用方校验 ``report["unrecoverable"]`` /
        ``report["garbage"]`` 后自行写盘。
    """
    text, report = decode_with_report(data)
    return text, report
