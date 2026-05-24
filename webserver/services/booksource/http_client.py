#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源 HTTP 客户端工具。"""

import json
import logging

import chardet
import requests


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

DEFAULT_HEADERS = {
    "User-Agent": DEFAULT_USER_AGENT,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9",
}


def parse_source_header(header):
    """把书源 header 字段解析成 dict。

    header 可能是 dict、JSON 字符串，或带 @js: 的字符串（后者忽略，只用默认头）。
    """
    if not header:
        return {}
    if isinstance(header, dict):
        return {str(k): str(v) for k, v in header.items()}
    if isinstance(header, str):
        text = header.strip()
        if text.startswith("@js:") or text.startswith("<js>"):
            # JS 头不支持，退回默认头
            return {}
        try:
            data = json.loads(text)
            if isinstance(data, dict):
                return {str(k): str(v) for k, v in data.items()}
        except (ValueError, TypeError):
            logging.debug("booksource: cannot parse header: %s", text[:80])
    return {}


def build_session(source=None):
    """根据书源创建一个带默认头的 requests.Session。"""
    session = requests.Session()
    headers = dict(DEFAULT_HEADERS)
    if source is not None:
        headers.update(parse_source_header(source.header))
        if source.book_source_url:
            headers.setdefault("Referer", source.book_source_url)
    session.headers.update(headers)
    return session


def detect_charset(content):
    """检测字节内容的编码，失败时回退 utf-8。"""
    if not content:
        return "utf-8"
    try:
        guess = chardet.detect(content)
        encoding = (guess or {}).get("encoding")
        confidence = (guess or {}).get("confidence") or 0
        # 阈值取低：真正的 UTF-8 会被高置信度识别，
        # 低置信度的非 UTF-8 猜测（常见于中文 GBK 页面）仍优于盲目 UTF-8。
        if encoding and confidence >= 0.3:
            return encoding
    except Exception as err:  # pragma: no cover - chardet 内部异常极少
        logging.debug("booksource: chardet failed: %s", err)
    return "utf-8"


def decode_response(resp, declared_charset=None):
    """按 声明编码 -> chardet -> utf-8 的顺序解码响应文本。"""
    if declared_charset:
        resp.encoding = declared_charset
        return resp.text
    resp.encoding = detect_charset(resp.content)
    return resp.text
