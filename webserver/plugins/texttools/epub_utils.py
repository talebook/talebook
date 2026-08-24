# -*- coding: utf-8 -*-
"""EPUB 读写共享助手（正文查找替换 / 繁简转换 共用，不依赖 Talebook 其他模块）。

EPUB 本质是 ZIP 容器，这里统一采用「条目级」处理保证无损：
- 正文条目按 container.xml → OPF manifest 定位（仅 application/xhtml+xml / text/html）；
- 文本解码 UTF-8 优先、检测器兜底；写回保持原编码，无法表示时降级 UTF-8
  并同步改写 XML 声明；
- 重打包时 mimetype 置首且 ZIP_STORED（EPUB 规范），其余 DEFLATED。
"""

import re
import zipfile

from webserver.plugins.texttools.encoding_detect import decode_with_report

# EPUB 文本条目（正文）的 media-type
TEXT_MEDIA_TYPES = ("application/xhtml+xml", "text/html")
_ITEM_RE = re.compile(r"<item\b[^>]*?>", re.IGNORECASE)
_ITEM_HREF_RE = re.compile(r'href\s*=\s*"([^"]+)"', re.IGNORECASE)
_ITEM_MT_RE = re.compile(r'media-type\s*=\s*"([^"]+)"', re.IGNORECASE)


def read_zip_entries(path):
    """读取 zip 全部条目（跳过目录项），返回 {name: bytes}。仅在需要重写全部条目时使用。"""
    entries = {}
    with zipfile.ZipFile(path, "r") as zf:
        for info in zf.infolist():
            if info.is_dir():
                continue
            entries[info.filename] = zf.read(info.filename)
    return entries


def read_text_entries(path):
    """仅读取正文相关条目（container / OPF / xhtml 文本条目），
    避免将图片、字体等非文本条目全量读入内存（预览场景）。"""
    entries = {}
    with zipfile.ZipFile(path, "r") as zf:
        all_names = [i.filename for i in zf.infolist() if not i.is_dir()]
        container_name = "META-INF/container.xml"
        if container_name in all_names:
            entries[container_name] = zf.read(container_name)
        opf_path = opf_path_from_container(entries.get(container_name, b"").decode("utf-8", errors="replace"))
        if opf_path and opf_path in all_names:
            entries[opf_path] = zf.read(opf_path)
            # 正文条目尚未读入，用"名字视图"（空字节占位）让 manifest 定位可命中；
            # 已读入的 container/opf 保留真实内容
            view = dict(entries)
            view.update({n: b"" for n in all_names if n not in entries})
            for name in find_text_entries(view):
                if name in all_names:
                    entries[name] = zf.read(name)
    return entries


def decode_entry(data):
    """解码 EPUB 文本条目：UTF-8 优先，失败则用检测器兜底。

    :return: (text, encoding)，encoding 供原编码写回使用。
    """
    try:
        return data.decode("utf-8"), "utf-8"
    except UnicodeDecodeError:
        text, report = decode_with_report(data)
        return text, report["encoding"]


def encode_entry(text, enc):
    """按原编码写回；原编码无法表示文本（如 BIG5 遇简体/生僻字）时降级 UTF-8，
    并同步改写 XML 声明（如有），避免阅读器按声明解码出错。"""
    if enc in ("utf-8", "utf-8-sig"):
        return text.encode(enc)
    try:
        return text.encode(enc)
    except (UnicodeEncodeError, LookupError):
        return set_xml_encoding(text, "utf-8").encode("utf-8")


def set_xml_encoding(text, enc):
    """改写 XML 声明的 encoding（仅在声明存在时生效）。"""
    return re.sub(
        r'(<\?xml[^>]*encoding\s*=\s*")[^"]+(")',
        r"\g<1>%s\2" % enc,
        text,
        count=1,
        flags=re.IGNORECASE,
    )


def find_text_entries(entries):
    """按 container.xml → OPF 的 manifest 定位正文（xhtml/html）条目名。"""
    container = entries.get("META-INF/container.xml")
    if not container:
        return []
    opf_path = opf_path_from_container(container.decode("utf-8", errors="replace"))
    if not opf_path or opf_path not in entries:
        return []
    opf_text = decode_entry(entries[opf_path])[0]
    # 大小写不敏感查找（zip 条目名大小写与 manifest 引用可能不一致）
    lower_map = {k.lower(): k for k in entries}
    names = []
    base_dir = opf_path.rsplit("/", 1)[0] if "/" in opf_path else ""
    for tag in _ITEM_RE.findall(opf_text):
        mt = _ITEM_MT_RE.search(tag)
        href = _ITEM_HREF_RE.search(tag)
        if not mt or not href:
            continue
        if mt.group(1).lower() not in TEXT_MEDIA_TYPES:
            continue
        # 去掉 fragment / query（如 ch1.xhtml#p1）
        href = href.group(1).split("#", 1)[0].split("?", 1)[0]
        if href.startswith("/"):
            href = href.lstrip("/")
        elif base_dir:
            href = "%s/%s" % (base_dir, href)
        name = normalize_zip_path(href)
        real = lower_map.get(name.lower())
        if real:
            names.append(real)
    return names


def opf_path_from_container(container_text):
    """从 container.xml 提取 OPF 路径（rootfile full-path）。"""
    m = re.search(r'full-path\s*=\s*"([^"]+)"', container_text, re.IGNORECASE)
    return m.group(1) if m else None


def normalize_zip_path(href):
    """归一化 zip 内路径：去 ./ 与 ../、统一分隔符。"""
    parts = []
    for seg in href.replace("\\\\", "/").split("/"):
        if seg in ("", "."):
            continue
        if seg == "..":
            if parts:
                parts.pop()
            continue
        parts.append(seg)
    return "/".join(parts)


def write_epub_zip(entries, out_path):
    """规范重写 zip：mimetype 置首且 ZIP_STORED，其余 DEFLATED。"""
    order = [k for k in entries if k != "mimetype"]
    with zipfile.ZipFile(out_path, "w") as zout:
        zout.writestr(
            zipfile.ZipInfo("mimetype"),
            entries.get("mimetype", b"application/epub+zip"),
            compress_type=zipfile.ZIP_STORED,
        )
        for name in order:
            zout.writestr(name, entries[name], compress_type=zipfile.ZIP_DEFLATED)
