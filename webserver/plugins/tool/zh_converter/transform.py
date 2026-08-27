# -*- coding: utf-8 -*-
"""繁简转换 EPUB / TXT 无损转换核心（不依赖 Talebook，可独立测试）。

转换策略
--------
EPUB 本质是 ZIP 容器，这里采用「条目级」处理保证无损：
- 仅对 ``.html/.xhtml/.htm`` 做 HTML 解析，转换所有文本节点
  （跳过 ``script/style/noscript`` 子树，避免破坏脚本与样式；
  CDATA 段整体原样保留——其内容属原始字节数据，不参与繁简转换）；
- 对 OPF（``.opf``）与 NCX（``.ncx``）做 XML 解析，转换其中的标题类文本
  （``dc:title``、``navLabel`` 等）；
- CSS、图片、字体等其余条目字节原样保留；
- 重新打包时 ``mimetype`` 置首且 ``ZIP_STORED``（EPUB 规范要求），
  其余条目沿用原压缩方式（``ZIP_DEFLATED``）。

TXT 为纯文本：自动探测编码（UTF-8 → GB18030），转换后统一以 UTF-8 输出。

转换逻辑通过 ``converter`` 可调用对象注入（``text -> text``），
方便在测试中用简单替换函数验证，也便于解耦引擎。

@author: 黏菌, 2026
"""

import os
import re
import zipfile

from bs4 import BeautifulSoup

from webserver.plugins.tool.epub import set_xml_encoding

# 参与正文转换的 HTML 扩展名
HTML_EXTS = (".html", ".xhtml", ".htm")
# 解析为 XML 并转换标题类文本的扩展名
XML_EXTS = (".opf", ".ncx")
# 正文解析时跳过的子树（脚本 / 样式 / 注释区）
SKIP_TAGS = {"script", "style", "noscript"}

# CDATA 段匹配（XML 规范：以 ]]> 结束，内容中不可能再出现 ]]>）
_CDATA_RE = re.compile(r"<!\[CDATA\[(.*?)\]\]>", re.DOTALL)
# 提取 CDATA 时使用的占位符（正文中几乎不可能出现）
_CDATA_TOKEN = "@@TALEBOOK_CDATA_%d@@"


def _extract_cdata(text):
    """用占位符替换所有 CDATA 段，返回 (处理后的文本, CDATA 内容列表)。

    html.parser 不支持 CDATA：直接解析会把其内容当作普通文本并在序列化时
    转义，丢失 ``<![CDATA[...]]>`` 标记。先摘出、后还原可保证原样保留。
    """
    parts = []

    def _repl(m):
        parts.append(m.group(1))
        return _CDATA_TOKEN % (len(parts) - 1)

    return _CDATA_RE.sub(_repl, text), parts


def _restore_cdata(html, parts):
    """把占位符还原为原始 CDATA 段（内容不经转换、字节级保留）。"""
    for i, part in enumerate(parts):
        html = html.replace(_CDATA_TOKEN % i, "<![CDATA[" + part + "]]>")
    return html


def convert_epub(epub_path, out_path, converter, convert_metadata=True, progress_cb=None):
    """转换 EPUB 并写出新文件。

    :param epub_path:        源 EPUB 路径
    :param out_path:         输出 EPUB 路径
    :param converter:        ``(str) -> str`` 文本转换函数
    :param convert_metadata: 是否转换 OPF/NCX 中的标题类文本（默认 True）
    :param progress_cb:      可选进度回调 ``(percent: int, stage: str) -> None``
    """
    if not os.path.isfile(epub_path):
        raise IOError("EPUB 文件不存在: %s" % epub_path)

    with zipfile.ZipFile(epub_path, "r") as zin:
        infos = zin.infolist()
        entries = {info.filename: zin.read(info.filename) for info in infos}
        # mimetype 必须保持原始字节（EPUB 规范：第一项、不压缩）
        mimetype_data = entries.get("mimetype", b"application/epub+zip")

    total_docs = sum(1 for name in entries if name.lower().endswith(HTML_EXTS) or name.lower().endswith(XML_EXTS))
    done_docs = 0

    for name, data in entries.items():
        lower = name.lower()
        if lower.endswith(HTML_EXTS):
            new_data = _convert_html_doc(data, converter)
        elif convert_metadata and lower.endswith(XML_EXTS):
            new_data = _convert_xml_doc(data, converter)
        else:
            continue
        entries[name] = new_data
        done_docs += 1
        if progress_cb and total_docs:
            progress_cb(int(done_docs * 100 / total_docs), "converting")

    _write_epub(out_path, entries, mimetype_data)
    if progress_cb:
        progress_cb(100, "packing")


def _decode_entry(data):
    """解码文档条目：UTF-8 优先，失败时用 :func:`detect_encoding` 兜底。

    :return: (text, encoding)，encoding 供写回时保持原编码。
    """
    try:
        return data.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        enc = detect_encoding(data)
        return data.decode(enc, errors="replace"), enc


def _encode_entry(text, enc):
    """按原编码写回；原编码无法表示转换结果（如繁→简后简体字 BIG5 编不了）
    时降级 UTF-8；无论哪种路径都同步改写 XML 声明（如有），避免阅读器按
    声明解码出错（BeautifulSoup 序列化会把声明改成 utf-8，原编码写回时
    必须改回）。"""
    if enc in ("utf-8", "utf-8-sig"):
        return text.encode("utf-8")
    try:
        text.encode(enc)
    except UnicodeEncodeError:
        return set_xml_encoding(text, "utf-8").encode("utf-8")
    return set_xml_encoding(text, enc).encode(enc)


def _convert_html_doc(data, converter):
    """转换单个 HTML/XHTML 文档的所有文本节点（CDATA 段原样保留）。"""
    if not data.strip():
        return data
    text, enc = _decode_entry(data)
    text, cdata_parts = _extract_cdata(text)
    soup = BeautifulSoup(text, "html.parser")
    _convert_text_nodes(soup, converter)
    html = soup.encode("utf-8").decode("utf-8")
    html = _restore_cdata(html, cdata_parts)
    return _encode_entry(html, enc)


def _convert_xml_doc(data, converter):
    """转换 OPF/NCX 中的标题类文本（仅文本节点，不动属性）。"""
    if not data.strip():
        return data
    text, enc = _decode_entry(data)
    soup = BeautifulSoup(text, "xml")
    if soup.find() is None:
        # 不是合法 XML，原样返回
        return data
    for node in soup.find_all(string=True):
        node.replace_with(converter(str(node)))
    return _encode_entry(soup.encode("utf-8").decode("utf-8"), enc)


def _convert_text_nodes(soup, converter):
    """遍历并转换文本节点；跳过 SKIP_TAGS 子树。"""
    for parent in soup.find_all():
        if parent.name in SKIP_TAGS:
            continue
        for child in parent.find_all(string=True, recursive=False):
            child.replace_with(converter(str(child)))


def _write_epub(out_path, entries, mimetype_data):
    """按 EPUB 规范写 zip：mimetype 首项且 STORED，其余 DEFLATED。

    保留原始条目顺序（部分阅读器依赖条目顺序），仅将 mimetype 提前到首位。
    """
    names = list(entries.keys())
    ordered = [n for n in names if n != "mimetype"]

    with zipfile.ZipFile(out_path, "w", zipfile.ZIP_DEFLATED) as zout:
        zinfo = zipfile.ZipInfo("mimetype")
        zinfo.compress_type = zipfile.ZIP_STORED
        zout.writestr(zinfo, mimetype_data)
        for name in ordered:
            zout.writestr(name, entries[name])


def convert_txt_file(src_path, out_path, converter):
    """转换 TXT 文件；编码自动探测（UTF-8 → GB18030 / BIG5），输出统一 UTF-8。

    :return: 检测到的源编码（如 'utf-8' / 'gb18030' / 'big5'）
    """
    with open(src_path, "rb") as f:
        data = f.read()
    encoding = detect_encoding(data)
    text = data.decode(encoding, errors="replace")
    converted = converter(text)
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        f.write(converted)
    return encoding


# 高频简体独有字形（BIG5 中不存在这些简体字形，用于区分 GBK 简体与 BIG5 繁体；
# 只收录确定无歧义的字，避免繁体文本误判，如"干"等共用字形不入列）
_SIMPLE_ONLY_CHARS = frozenset(
    "这为说时从们发头国门长经还样处对进级红绿简复书语话认识认真"
    "体纸间题问闻队际阳阴险"
    "辆马鱼鸟贝见亲观览兴举学党习乡归开闭"
    "几尔东乐"
)


def detect_encoding(data):
    """探测文本编码：UTF-8（含 BOM）→ GB18030 / BIG5 择一 → UTF-8 兜底。

    GB18030 与 BIG5 都能严格解码大部分 CJK 字节流，先用高频简体独有字形
    判断是否为简体文本（简体 GBK），否则按 BIG5 解读（繁体书）；仅当
    BIG5 也无法严格解码时才回落到 GB18030。
    """
    if data.startswith(b"\xef\xbb\xbf"):
        return "utf-8-sig"
    try:
        data.decode("utf-8")
        return "utf-8"
    except UnicodeDecodeError:
        pass
    try:
        text = data.decode("gb18030")
    except UnicodeDecodeError:
        # GB18030 都解不了：试 BIG5，仍失败则 UTF-8 兜底
        try:
            data.decode("big5")
            return "big5"
        except UnicodeDecodeError:
            return "utf-8"
    if any(ch in _SIMPLE_ONLY_CHARS for ch in text):
        return "gb18030"
    try:
        data.decode("big5")
        return "big5"
    except UnicodeDecodeError:
        return "gb18030"
