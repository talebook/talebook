# -*- coding: utf-8 -*-
"""正文查找替换核心逻辑（不依赖 Talebook，可独立测试）。

对书籍的 TXT / EPUB 格式执行正文级字符串替换（支持普通文本与正则两种模式）：

- **TXT**：检测编码 → str 层替换 → 原编码写回（无法表示时降级 UTF-8）；
- **EPUB**：zipfile 遍历（container → OPF → xhtml 条目）逐文件 str 替换，
  未修改条目字节原样保留，mimetype 置首且 ZIP_STORED 规范重写。

对外接口：
- :func:`compile_rule` 编译替换规则（返回 apply 函数与错误信息）；
- :func:`scan_samples` 单趟扫描统计命中数并收集上下文样本；
- :func:`load_texts` 读取书籍文本（预览用）；
- :func:`replace_txt_file` / :func:`replace_epub_file` 执行替换并写出新文件。

@author: 黏菌, 2026
"""

import re
from typing import Callable, List, Tuple

from webserver.plugins.texttools.encoding_detect import decode_with_report
from webserver.plugins.texttools.epub_utils import (
    decode_entry,
    encode_entry,
    find_text_entries,
    read_text_entries,
    read_zip_entries,
    write_epub_zip,
)

# 预览上下文（前后各 N 字符）
SAMPLE_CTX = 50
# 预览样本条数上限
SAMPLE_MAX = 5
# 预览统计 / 采样的最大字符数（防病态正则 / 超大书卡死请求线程）
PREVIEW_LIMIT = 200000


def compile_rule(pattern: str, replacement: str, use_regex: bool):
    """编译替换规则。返回 (apply_fn, regex_error)。

    ``apply_fn(text) -> (new_text, count)``；编译失败时 apply_fn 为 None，
    错误信息写入第二个返回值。
    """
    if not pattern:
        return None, "查找内容不能为空"
    if use_regex:
        try:
            rx = re.compile(pattern)
        except re.error as err:
            return None, "正则表达式错误：%s" % err
        return (lambda text: rx.subn(replacement, text)), None
    return (lambda text: (text.replace(pattern, replacement), text.count(pattern))), None


def sample_from(text: str, idx: int, length: int) -> dict:
    """构造单条上下文样本（pre / match / post 三段，前端直接渲染高亮）。"""
    lo, hi = max(0, idx - SAMPLE_CTX), min(len(text), idx + length + SAMPLE_CTX)
    return {
        "index": idx,
        "pre": text[lo:idx],
        "match": text[idx : idx + length],
        "post": text[idx + length : hi],
    }


def scan_samples(text: str, pattern: str, use_regex: bool, cap: int = SAMPLE_MAX) -> Tuple[int, List[dict]]:
    """单次扫描统计命中数并收集上下文样本，避免预览时对全文重复扫描。

    普通模式按非重叠匹配（与 ``str.replace`` / ``str.count`` 一致）；
    正则模式单趟 ``finditer`` 同时计数与采样。

    :return: (count, samples)
    """
    samples = []
    if use_regex:
        rx = re.compile(pattern)
        count = 0
        for m in rx.finditer(text):
            count += 1
            if len(samples) < cap:
                samples.append(sample_from(text, m.start(), m.end() - m.start()))
        return count, samples
    if not pattern:
        return 0, samples
    count = 0
    start = 0
    while True:
        idx = text.find(pattern, start)
        if idx < 0:
            break
        count += 1
        if len(samples) < cap:
            samples.append(sample_from(text, idx, len(pattern)))
        start = idx + max(1, len(pattern))
    return count, samples


def load_texts(fmt: str, path: str) -> Tuple[str, List[str]]:
    """读取书籍 TXT / EPUB 正文并返回 (fmt, 文本列表)，供预览统计使用。

    TXT 返回单段解码文本；EPUB 按 manifest 正文条目逐段返回，
    与 :func:`replace_epub_file` 的逐条目替换一一对应（预览命中数与实跑一致）。
    """
    if fmt == "TXT":
        with open(path, "rb") as f:
            data = f.read()
        text, _ = decode_with_report(data)
        return "TXT", [text]
    if fmt == "EPUB":
        # 预览只读正文条目，避免图片/字体等全量读入内存
        entries = read_text_entries(path)
        texts = [decode_entry(entries[name])[0] for name in find_text_entries(entries)]
        return "EPUB", texts
    raise RuntimeError("该书籍没有 TXT 或 EPUB 格式，无法执行替换")


def preview(fmt: str, path: str, pattern: str, replacement: str, use_regex: bool) -> dict:
    """同步返回匹配数 + 上下文样本 + 正则错误。

    :return dict: ``format``（TXT / EPUB）/ ``matches`` / ``samples`` /
        ``regex_error`` / ``truncated``（是否因超过 PREVIEW_LIMIT 只统计了前缀）。
    """
    apply_fn, regex_error = compile_rule(pattern, replacement, use_regex)
    if apply_fn is None:
        return {"format": None, "matches": 0, "samples": [], "regex_error": regex_error, "truncated": False}

    _, texts = load_texts(fmt, path)
    total = 0
    samples: List[dict] = []
    truncated = False
    offset = 0
    for full_text in texts:
        if len(full_text) > PREVIEW_LIMIT:
            truncated = True
        text = full_text[:PREVIEW_LIMIT]
        count, entry_samples = scan_samples(text, pattern, use_regex, cap=SAMPLE_MAX - len(samples))
        total += count
        for s in entry_samples:
            s["index"] += offset
            samples.append(s)
        if len(samples) >= SAMPLE_MAX:
            break
        offset += len(full_text)
    return {"format": fmt, "matches": total, "samples": samples, "regex_error": None, "truncated": truncated}


def replace_txt_file(src_path: str, out_path: str, apply_fn: Callable) -> int:
    """TXT：检测编码 → str 替换 → 原编码写回。返回命中数。

    替换文本可能包含原编码（如 BIG5）无法表示的字符，此时降级为 UTF-8 写回。
    """
    with open(src_path, "rb") as f:
        data = f.read()
    text, report = decode_with_report(data)
    new_text, count = apply_fn(text)
    with open(out_path, "wb") as f:
        f.write(encode_entry(new_text, report["encoding"]))
    return count


def replace_epub_file(src_path: str, out_path: str, apply_fn: Callable) -> int:
    """EPUB：container → OPF → xhtml 条目逐文件替换，规范重写 zip。返回命中数。"""
    entries = read_zip_entries(src_path)
    total = 0
    for name in find_text_entries(entries):
        text, enc = decode_entry(entries[name])
        new_text, count = apply_fn(text)
        if count > 0:
            entries[name] = encode_entry(new_text, enc)
            total += count
    write_epub_zip(entries, out_path)
    return total
