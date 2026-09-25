# -*- coding: utf-8 -*-
"""章节标题识别模式库。

移植自 hehetoshang/txt2epub-next (https://github.com/hehetoshang/txt2epub-next,
MIT License, converter.py) 的章节标题正则与判定逻辑，适配 EPUB 正文段落场景。

用途：当 EPUB 章节 XHTML 内没有 h1-h6 标题标签（如 Calibre 批量转换的
div+span 平铺书）时，用这些模式在段落文本上识别"第X章 / 序章 / 001 / Chapter N"
等标题段落，为章节名美化与目录页生成提供可靠数据。

注意：txt2epub-next 的正则按"整行"匹配（^ 锚定）；EPUB 段落可能很长，
因此额外提供 :func:`paragraph_is_heading` 增加长度与句末标点过滤。
"""

import re

__all__ = [
    "heading_kind",
    "heading_number",
    "is_volume_heading",
    "is_numeric_section_heading",
    "is_weak_bare_number_heading",
    "paragraph_is_heading",
]

# ── 正则（移植自 txt2epub-next converter.py，MIT）──────────────────────────────

# 中文章节标题：第X章/第X节/第X回/第X篇/第X卷/第X部/第X集/第X季（支持中文数字、全角空格、【】包裹）
CHINESE_HEADING_PATTERN = re.compile(
    r"^\s*(?:[【\[]\s*)?第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[章节回篇卷部集季]"
    r"(?=\s|[、】【\]，,:：.。!！?？\-—（(]|$).*$"
)
# 卷标题：第N卷 / 0*N卷 / 卷N / 上中下卷
VOLUME_HEADING_PATTERN = re.compile(
    r"^\s*(?:[【\[]\s*)?(?:"
    r"第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*卷"
    r"|0*\d{1,4}\s*卷"
    r"|卷\s*[0-9零〇一二三四五六七八九十百千万兩两]+"
    r"|[上中下]\s*卷"
    r").{0,100}$"
)
# 数字部/篇/回标题（用于分组章节的上级结构）
NUMERIC_SECTION_HEADING_PATTERN = re.compile(
    r"^\s*(?:[【\[]\s*)?第\s*(?:\d+|[零〇一二三四五六七八九十百千万兩两]+)\s*[部篇回]"
    r"(?=\s|[、】【\]，,:：.。!！?？\-—（(]|$).*$"
)
# 裸数字标题：001 标题 / 1. Title（小数点或冒号后须跟非数字，排除小数与时间戳）
BARE_NUMBER_HEADING_PATTERN = re.compile(
    r"^\s*0*(\d{1,4})(?:"
    r"\s*[章节回篇卷部集季](?=\s|[、，,:：.。!！?？\-—【（(]|$).*"
    r"|(?:[.．、，,:：\-—])(?=\s|[^\d]).+"
    r"|[\t ]+\S+.*"
    r")$"
)
# 特殊章节：序章/楔子/引子/前言/终章/尾声/结语/后记/跋/附录/番外
SPECIAL_HEADING_PATTERN = re.compile(
    r"^\s*(?:序章|楔子|引子|前言|终章|尾声|结语|后记|跋|附录|番外(?:[篇卷集]|[0-9零〇一二三四五六七八九十百千万兩两]+)?)"
    r"(?=\s|[、，,:：.。!！?？\-—【（(]|$).*$",
    re.IGNORECASE,
)
# 英文标题：Chapter 1 / chap.3 / Volume II / Book 2 / Part i
ENGLISH_HEADING_PATTERN = re.compile(
    r"^\s*(?:(?:chapter|chap\.?)\s*(?:\d+|[ivxlcdm]+)"
    r"|(?:volume|book|part)\s*(?:\d+|[ivxlcdm]+))\b.*$",
    re.IGNORECASE,
)


# ── 判定函数（移植自 txt2epub-next，MIT）───────────────────────────────────────


def heading_kind(line: str):
    """返回标题类别：'structured'（显式章节）/ 'bare_number'（裸数字）/ None。

    显式结构（第X章/卷/序章/Chapter N）可信度高于裸数字。
    """
    if CHINESE_HEADING_PATTERN.match(line):
        return "structured"
    if VOLUME_HEADING_PATTERN.match(line):
        return "structured"
    if SPECIAL_HEADING_PATTERN.match(line):
        return "structured"
    if ENGLISH_HEADING_PATTERN.match(line):
        return "structured"
    if BARE_NUMBER_HEADING_PATTERN.match(line):
        return "bare_number"
    return None


def heading_number(line: str):
    """提取阿拉伯数字章节号（无法明确读取时返回 None）。"""
    chinese_match = re.match(r"^\s*(?:[【\[]\s*)?第\s*(\d+)\s*[章节回篇卷部集季]", line)
    if chinese_match:
        return int(chinese_match.group(1))
    volume_match = re.match(r"^\s*(?:[【\[]\s*)?(?:0*(\d+)\s*卷|卷\s*(\d+))", line)
    if volume_match:
        return int(volume_match.group(1) or volume_match.group(2))
    bare_number_match = BARE_NUMBER_HEADING_PATTERN.match(line)
    if bare_number_match:
        return int(bare_number_match.group(1))
    return None


def is_volume_heading(line: str) -> bool:
    """是否为卷级标题（可把后续章节分组）。"""
    return bool(VOLUME_HEADING_PATTERN.match(line))


def is_numeric_section_heading(line: str) -> bool:
    """是否为数字部/篇/回标题（可把后续章节分组）。"""
    return bool(NUMERIC_SECTION_HEADING_PATTERN.match(line))


def is_weak_bare_number_heading(line: str) -> bool:
    """裸数字标题是否为"弱"形态（如 ``2 note`` 常是脚注）。"""
    if not BARE_NUMBER_HEADING_PATTERN.match(line):
        return False
    return bool(re.match(r"^\s*0*\d{1,4}[\t ]+(?![章节回篇卷部集季\[【(（])\S+", line))


# ── EPUB 段落适配 ──────────────────────────────────────────────────────────────

# 段落可被视为章节标题的最大长度（标题行通常很短；超长多半是正文段落）
_HEADING_MAX_LEN = 60
# 以句末标点结尾的段落不可能是标题
_SENTENCE_END = ("。", "！", "？", "；", ".", "!", "?", ";")
# 纯数字/符号行（时间戳、页码、公式）不可能是标题
_BARE_SYMBOL_RE = re.compile(r"[0-9.:：'\- /]+")
# 结构化前缀（章头词）匹配——用于「剩余文本」护栏。分隔集刻意不含
# 全角逗号/句读：章头词后以 ，。 等续句是正文句（「第十章，他走进…」），
# 而结构化正则的 separator 前瞻把 ，当合法分隔符，会整行放行
_STRUCT_PREFIX_RE = re.compile(
    r"^\s*(?:[【\[]\s*)?(?:"
    r"第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[章节回篇卷部集季]"
    r"|0*\d{1,4}\s*卷|卷\s*[0-9零〇一二三四五六七八九十百千万兩两]+|[上中下]\s*卷"
    r"|(?:chapter|chap\.?|volume|book|part)\s*(?:\d+|[ivxlcdm]+)"
    r"|序章|楔子|引子|前言|终章|尾声|结语|后记|跋|附录|番外"
    r")[ \t、【\]：.\-—·~～]*",
    re.IGNORECASE,
)
# 章头词之后的剩余标题文本上限（以章头词开头的正文句往往更长）
_STRUCT_REST_MAX = 30
# 特殊章头词（序章/前言/…）冒号后的剩余文本上限：冒号引出的真标题都很短
# （“前言”“番外三”），“前言：<二十余字叙述>”多为简介句；第X章/Chapter 系
# 冒号双段标题可放行到 _STRUCT_REST_MAX
_SPECIAL_COLON_REST_MAX = 15


def paragraph_is_heading(text: str) -> bool:
    """判断一个段落文本是否为章节标题。

    txt2epub-next 的正则按整行匹配；EPUB 段落可能包含多行/长正文，
    故在原文基础上附加：长度上限、不以句末标点结尾、非纯数字符号。
    段落开头（含全角空格、【】包裹）命中任一标题模式即视为标题。
    对裸数字分支额外收紧：弱形态（如 “2023 年”、“3 天后”）及纯年份/时间不视为标题。
    结构化前缀护栏：剩余文本须短且不以句读续句（此前「第十章，他走进…」
    这类 34 字正文句会被判为标题）。
    """
    t = (text or "").strip()
    if not t or len(t) > _HEADING_MAX_LEN:
        return False
    if _BARE_SYMBOL_RE.fullmatch(t):
        return False
    if t.endswith(_SENTENCE_END):
        return False
    m = _STRUCT_PREFIX_RE.match(t)
    if m and m.end() < len(t):
        rest = t[m.end() :].strip()
        # ASCII 冒号不在此列：“Chapter 1: The Boy Who Lived”是真标题，
        # 冒号由下面的 SPECIAL 分支按 15 字收紧（ENGLISH 系不受限）
        if rest[:1] in ("，", "。", "！", "？", "；", "…", ",", ".", "!", "?", ";"):
            return False
        # 剩余文本含句读（标题内不应断句）→ 正文句
        if any(p in rest for p in ("。", "！", "？", "；", "…")):
            return False
        limit = _STRUCT_REST_MAX
        if SPECIAL_HEADING_PATTERN.match(t):
            tail = m.group(0).rstrip()[-1:]
            if tail in ("：", ":") or rest[:1] in ("：", ":"):
                limit = _SPECIAL_COLON_REST_MAX
        if len(rest) > limit:
            return False
    kind = heading_kind(t)
    if kind is None:
        return False
    if kind == "bare_number":
        # 弱裸数字（数字+空格+非章节字）极易误伤年份、时间、数量句
        if is_weak_bare_number_heading(t):
            return False
        # 额外护栏：数字+年/月/日/天/小时/分钟 等时间量词不视为标题
        if re.match(r"^\s*0*\d{1,4}\s*(?:年|月|日|天|小时|分钟|秒|号|元|块|个|人|次)\b", t):
            return False
        # 4位年+年/月/日 且后无章节语义，拒绝
        if re.match(r"^\s*\d{4}\s*年", t):
            return False
    return True
