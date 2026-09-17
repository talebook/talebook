# -*- coding: utf-8 -*-
"""EPUB 美化核心库。

对既有 EPUB 做无损美化（生成新书模式，原书零改动）：
1. **目录**：书内已有**可点击**目录页时仅样式化；无目录页、或仅有 nav 语义页
   / 无链接纯文本目录页（两者保留无意义）时，从 NCX/nav（EPUB3 nav）生成
   ``mb-toc.xhtml`` 目录页并注册进 OPF（manifest + spine，幂等），
   nav 语义页与无链接页在 spine 中的条目被替换（原文件保留在包内）；
2. **章节名**：正文条目三层识别章节标题（h1-h6 / 已知标题类 / 段落文本
   章节正则，后者移植自 hehetoshang/txt2epub-next，MIT）并标记 ``mb-ch``，
   章首段标记 ``data-mb-first``；
3. **字体与排版**：注入 ``mb-beauty.css``（styles/ 预设模板插值），覆盖层
   方式追加，不删除原书任何文件与规则。

EPUB 容器读写（container → OPF → manifest/spine、mimetype 置首 ZIP_STORED
规范重写、编码兜底）沿用「正文查找替换」工具已验证的实现模式。
"""

import logging
import os
import posixpath
import re
import zipfile
import xml.etree.ElementTree as ET
from urllib.parse import quote, unquote

from . import chapter_patterns

_NS_CONTAINER = "urn:oasis:names:tc:opendocument:xmlns:container"
_NS_OPF = "http://www.idpf.org/2007/opf"
_NS_XHTML = "http://www.w3.org/1999/xhtml"
_NS_DTBNCX = "http://www.daisy.org/z3986/2005/ncx/"

# 前置页文件名特征（跳过章节标题标记，避免把"书籍信息/作者简介"当章节名）
# 用 \b 避免 index 误伤 index_split_001.html 等分章文件
_FRONT_FILE_RE = re.compile(
    r"\b(?:cover|titlepage|title-page|title|banquan|copyright|colophon|imprint|"
    r"feiye|zuozhe|author|mulu|toc|nav|contents|index|description|introduction|"
    r"explanation|version|preface|foreword|afterword|half-title|halftitle|dedication)\b",
    re.IGNORECASE,
)
# body 上的 epub:type 前置标记（只匹配属性上下文，避免 id 名里的 toc 误伤）
_FRONT_TYPE_RE = re.compile(
    r'epub:type\s*=\s*["\'][^"\']*\b(cover|title-page|titlepage|copyright|colophon|frontmatter|toc|imprint)\b',
    re.IGNORECASE,
)
# 已知章节标题类名关键词（配合 h/p 块文本规则）。
# 前后断言限定 class token 边界：此前裸子串匹配会把 subtitle/header/heading
# 这类词也当成标题类（"title"/"head" 是其子串）
_TITLE_CLASS_RE = re.compile(
    r"(?<![A-Za-z0-9_])(chapter-title|chaptertitle|contenttitle|pretxttitle|"
    r"title-line|caption-title|head|title|chapter)(?![A-Za-z0-9_])",
    re.IGNORECASE,
)
# 块级元素扫描（h1-6 / p / blockquote / li；div 单独处理无嵌套形式）
_BLOCK_RE = re.compile(
    r"<(h[1-6]|p|blockquote|li)\b([^>]*)>(.*?)</\1>",
    re.DOTALL | re.IGNORECASE,
)
# 无嵌套 div（内含标签但不含 div 层级）——Calibre 类汤书的标题段常是 div
_SIMPLE_DIV_RE = re.compile(
    r"<div\b([^>]*)>((?:(?!</?div)[\s\S])*?)</div>",
    re.DOTALL | re.IGNORECASE,
)
# 标签/注释（提取文本段用）
_TAG_RE = re.compile(
    r'(<(?:[^>"\']*|"[^"]*"|\'[^\']*\')*>|<!--[\s\S]*?-->)',
    re.DOTALL,
)
# 从块文本里剥掉内联标签
_INLINE_RE = re.compile(r"<[^>]+>")

MB_CSS_NAME = "mb-beauty.css"
MB_TOC_NAME = "mb-toc.xhtml"
# 目录条目默认**不截断**（取消 500 条上限；如需限制可显式传 max_toc_entries）

# ── 内容清理（借鉴 Sigil CleanSource 思路，仅思路自研实现）──────────────────
# 段首空白：全角空格/半角空格/tab/换行 + nbsp 实体，出现在 <p> 开标签之后
_LEADING_WS_RE = re.compile(r"(<p\b[^>]*>)((?:&nbsp;|&#160;|[\s\u3000])+)", re.IGNORECASE)
# 空段落：只有空白/nbsp/br 的 p（默认不启用，精排书可能用空段造留白）
_EMPTY_P_RE = re.compile(r"<p\b[^>]*>(?:&nbsp;|&#160;|<br\s*/?>|[\s\u3000])*</p>", re.IGNORECASE)
# 连续 br 收敛：3 个及以上连续 <br/> 收敛为 2 个
_BR_RUN_RE = re.compile(r"(?:<br\s*/?>[\s\u3000]*){3,}", re.IGNORECASE)
# 冗余 meta charset（EPUB 规范要求 UTF-8，无需声明；部分制作工具会残留）
_META_CHARSET_RE = re.compile(r"[ \t]*<meta[^>]+charset[^>]*>[ \t]*\n?", re.IGNORECASE)
# 目录噪音排除（保守清单：只排无争议的制作信息，不动 前言/序/附录 这类正章）
_TOC_EXCLUDE_RE = re.compile(
    r"本书由|版权所有|侵权必究|监制|制作说明|出版说明$|^出品$|更多精彩|"
    r"未完待续|^完$|全书完|^正文完$|"
    r"www\.|https?://|[\w.-]+\.(com|net|cn|org)([/\s]|$)",
    re.IGNORECASE,
)


def _normalize_cleanup(cleanup):
    """归一化清理开关：{"leading":bool,"empty":bool,"meta":bool,"toc_blank":bool}。

    默认（混合策略）：段首空格归一开、空段清理关、meta 移除开、
    NCX/nav 空白条目净化开（只删零信息空条目）。
    """
    c = dict(cleanup) if isinstance(cleanup, dict) else {}
    return {
        "leading": bool(c.get("leading", True)),
        "empty": bool(c.get("empty", False)),
        "meta": bool(c.get("meta", True)),
        "toc_blank": bool(c.get("toc_blank", True)),
    }


def _clean_html_body(html_str: str, cleanup: dict) -> tuple:
    """对单个正文文件执行内容清理。

    :return: (new_html, cleaned_leading, removed_empty)
    """
    n_lead = n_empty = 0
    new = html_str
    if cleanup.get("leading"):
        new, n_lead = _LEADING_WS_RE.subn(r"\1", new)
    if cleanup.get("empty"):
        new, k1 = _EMPTY_P_RE.subn("", new)
        new, _ = _BR_RUN_RE.subn("<br/><br/>", new)
        n_empty = k1
    if cleanup.get("meta"):
        stripped = _META_CHARSET_RE.sub("", new, count=2)
        # DOCTYPE 头规整：声明后保证一个换行（幂等）
        stripped = re.sub(r"(<!DOCTYPE[^>]*>)(?![ \t]*\r?\n)", r"\1\n", stripped, count=1, flags=re.IGNORECASE)
        new = stripped
    return new, n_lead, n_empty


def _toc_entry_allowed(title: str) -> bool:
    """目录条目是否收录（排除制作信息类噪音标题）。"""
    return not _TOC_EXCLUDE_RE.search(title or "")


# ── EPUB 容器基础（沿用 text_replace 模式）────────────────────────────────────

# ZipBomb 阈值（500MB 总量 / 5000 文件；单文件与解压后实际总量同限）
_ZIP_MAX_TOTAL = 500 * 1024 * 1024
_ZIP_MAX_ENTRIES = 5000


def _opf_add_to_manifest(opf_str: str, item_xml: str, what: str) -> str:
    """把 ``<item/>`` 注册进 OPF manifest（P6：``</manifest>`` 缺失/异形时显式
    报错，不再静默 no-op 导致目录/样式注册丢失仍出包）。"""
    new, n = re.subn(r"(</manifest>)", "\n" + item_xml + r"\1", opf_str, count=1)
    if n == 0:
        raise RuntimeError("OPF 缺 </manifest>，无法注册%s" % what)
    return new


def _read_zip_entries(path: str) -> dict:
    """读取 zip 全部文件条目 {name: bytes}（跳过目录项，校验路径与大小）。

    双重校验（P2）：解压前按中央目录 info.file_size 预判，但头部可伪造；
    解压后按实际 len(data) 累计再拦一次，伪造小尺寸的超大解压流在此截停。
    """
    entries = {}
    try:
        with zipfile.ZipFile(path, "r") as zf:
            declared = 0
            actual = 0
            for info in zf.infolist():
                if info.is_dir():
                    continue
                # 路径穿越校验
                if info.filename.startswith("/") or ".." in info.filename.split("/"):
                    logging.warning("[epub_beautify] Skip traversal entry: %s", info.filename)
                    continue
                declared += info.file_size
                if declared > _ZIP_MAX_TOTAL or len(entries) > _ZIP_MAX_ENTRIES:
                    raise RuntimeError("EPUB 文件过大或条目过多，疑似 Zip Bomb")
                # 流式读取（P2）：分块累计、越限瞬间中止——此前 read 全量落内存
                # 后才判，伪造头部的大解压流先把 500MB 吃进内存
                buf = bytearray()
                with zf.open(info.filename) as fh:
                    while True:
                        chunk = fh.read(1 << 20)
                        if not chunk:
                            break
                        buf += chunk
                        if len(buf) > _ZIP_MAX_TOTAL:
                            raise RuntimeError("EPUB 解压后体积异常，疑似 Zip Bomb")
                data = bytes(buf)
                actual += len(data)
                if actual > _ZIP_MAX_TOTAL:
                    raise RuntimeError("EPUB 解压后体积异常，疑似 Zip Bomb")
                entries[info.filename] = data
    except zipfile.BadZipFile as e:
        raise RuntimeError("EPUB 解析失败，文件可能已损坏：%s" % e) from e
    except zipfile.LargeZipFile as e:
        raise RuntimeError("EPUB 文件过大：%s" % e) from e
    return entries


class _ZipEntryView:
    """analyze 轻量条目视图（P1）：键集合=中央目录名（穿越条目已剔除），
    取值按需解压并缓存；配 `head()` 做前缀局部读，preview 线程不再被
    大书全量解压阻塞（beautify 后台线程仍走 `_read_zip_entries` 全量读）。"""

    def __init__(self, zf, infos):
        self._zf = zf
        self._infos = infos
        self._cache = {}

    def __contains__(self, name):
        return name in self._infos

    def __iter__(self):
        return iter(self._infos)

    def keys(self):
        return self._infos.keys()

    def get(self, name, default=None):
        if name not in self._infos:
            return default
        return self[name]

    def __getitem__(self, name):
        if name in self._cache:
            return self._cache[name]
        if name not in self._infos:
            raise KeyError(name)
        data = self._zf.read(name)
        self._cache[name] = data
        return data

    def head(self, name, n):
        """条目前 n 字节（不解压全量；配 `_decode_head` / `_classify_toc_entry`）。"""
        with self._zf.open(name) as fh:
            return fh.read(n)


def _write_zip(entries: dict, out_path: str) -> None:
    """规范重写 zip：mimetype 置首且 ZIP_STORED，其余 DEFLATED（原子写）。"""
    order = [k for k in entries if k != "mimetype"]
    tmp = out_path + ".tmp"
    with zipfile.ZipFile(tmp, "w") as zout:
        zout.writestr(
            zipfile.ZipInfo("mimetype"),
            entries.get("mimetype", b"application/epub+zip"),
            compress_type=zipfile.ZIP_STORED,
        )
        for name in order:
            zout.writestr(name, entries[name], compress_type=zipfile.ZIP_DEFLATED)
    os.replace(tmp, out_path)


def _decode(data: bytes) -> str:
    """UTF-8 优先，失败用编码检测（支持 GBK/Big5/Shift_JIS 等），并重写 XML 声明为 utf-8。"""
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        # 复用 txt 编码修复的检测器，对 GBK/Big5 做可读性打分择优，避免 Big5 被 gb18030 静默错译
        try:
            from .encoding_detect import decode_with_report

            text, report = decode_with_report(data)
            if not report.get("garbage") and not report.get("unrecoverable"):
                if text.lstrip().startswith("<?xml"):
                    text = re.sub(
                        r"""(<\?xml[^>]*encoding\s*=\s*)["'][^"']*["']""", r'\1"utf-8"', text, count=1, flags=re.IGNORECASE
                    )
                return text
        except Exception:
            pass
        # 回退：依次尝试 GB18030 / Big5，择优或兜底
        for enc in ("gb18030", "big5"):
            try:
                text = data.decode(enc)
                if text.lstrip().startswith("<?xml"):
                    text = re.sub(
                        r"""(<\?xml[^>]*encoding\s*=\s*)["'][^"']*["']""", r'\1"utf-8"', text, count=1, flags=re.IGNORECASE
                    )
                return text
            except UnicodeDecodeError:
                continue
        text = data.decode("utf-8", errors="replace")
        if text.lstrip().startswith("<?xml"):
            text = re.sub(r"""(<\?xml[^>]*encoding\s*=\s*)["'][^"']*["']""", r'\1"utf-8"', text, count=1, flags=re.IGNORECASE)
        return text


def _decode_head(data: bytes, raw_n: int = 8192, out_n: int = 4000) -> str:
    """目录嗅探用头部解码：按字节切片可能恰劈开 UTF-8 多字节字符，
    先对切片 strict 解码；失败（劈开字符）则片尾逐字节前移找合法边界；
    仍失败（非 UTF-8 书）才回落全量 _decode（编码检测虽慢但对，
    CJK 链接文本不乱码，_looks_like_link_toc 判定才准）。"""
    raw = data[:raw_n]
    try:
        return raw.decode("utf-8")[:out_n]
    except UnicodeDecodeError:
        pass
    for cut in (1, 2, 3):
        try:
            return raw[:-cut].decode("utf-8")[:out_n]
        except UnicodeDecodeError:
            continue
    return _decode(data)[:out_n]


# ── OPF 解析 ──────────────────────────────────────────────────────────────────


def _q(tag, ns=_NS_OPF):
    return "{%s}%s" % (ns, tag)


class OpfContext:
    """解析后的 OPF 上下文。"""

    def __init__(self):
        self.opf_path = ""
        self.opf_dir = ""
        self.title = ""
        self.manifest = {}  # id -> {'href','mt','props'}
        self.spine = []  # [(idref, linear_bool)]
        self.ncx_path = ""  # zip 内 NCX 路径（可能为空）
        self.nav_path = ""  # zip 内 EPUB3 nav 文档路径（可能为空）
        self.nav_id = ""  # nav 文档的 manifest id


def _parse_opf(entries: dict) -> OpfContext:
    """从 container.xml 定位 OPF 并解析 manifest/spine/NCX/nav。"""
    ctx = OpfContext()
    container = entries.get("META-INF/container.xml")
    if not container:
        raise RuntimeError("缺少 META-INF/container.xml")
    root = ET.fromstring(_decode(container))
    full_path = ""
    for rf in root.iter(_q("rootfile", _NS_CONTAINER)):
        full_path = rf.get("full-path") or ""
        break
    if not full_path or full_path not in entries:
        raise RuntimeError("无法定位 OPF 文件")
    ctx.opf_path = full_path
    ctx.opf_dir = full_path.rsplit("/", 1)[0] + "/" if "/" in full_path else ""

    opf = ET.fromstring(_decode(entries[full_path]))
    # 标题（dc:title，Dublin Core 命名空间）
    for t in opf.iter(_q("title", "http://purl.org/dc/elements/1.1/")):
        ctx.title = (t.text or "").strip()
        break
    # manifest
    for item in opf.iter(_q("item")):
        iid = item.get("id") or ""
        href = item.get("href") or ""
        mt = (item.get("media-type") or "").lower()
        props = item.get("properties") or ""
        ctx.manifest[iid] = {"href": href, "mt": mt, "props": props}
        if mt == "application/x-dtbncx+xml":
            ctx.ncx_path = _snap_entry(entries, _resolve_zip(ctx.opf_dir, href))
        if "nav" in props.split():
            ctx.nav_path = _snap_entry(entries, _resolve_zip(ctx.opf_dir, href))
            ctx.nav_id = iid
    # spine
    spine = opf.find(_q("spine"))
    if spine is not None:
        for itemref in spine.iter(_q("itemref")):
            ctx.spine.append((itemref.get("idref") or "", itemref.get("linear", "yes").lower() != "no"))
    return ctx


def _resolve_zip(base_dir: str, href: str) -> str:
    """把 OPF 相对 href 解析为 zip 内绝对路径。"""
    href = href.split("#")[0].split("?")[0]
    if href.startswith("/"):
        path = href.lstrip("/")
    else:
        path = base_dir + href
    # OPF 在子目录而资源在包根的书（weread 导出等），manifest href 带 ../
    # 前缀；裸拼接的 OEBPS/../x 查不中 zip 条目，须归一化（zip 路径用
    # posixpath，os.path 在 Windows 会产出反斜杠）
    if ".." in path.split("/"):
        path = posixpath.normpath(path)
    return path


def _snap_entry(entries: dict, path: str) -> str:
    """把解析出的路径对齐到 zip 实际条目名。

    部分制作工具（如掌书系）OPF manifest 的 href 为百分号编码
    （``%2A_%2A%3A…``），而 zip 条目名是原始字符（``*_ *:_|…``），
    直接用解析路径查 entries 会 KeyError；此处先精确匹配，
    再回退到解码名，均未命中则原样返回（保持旧行为）。
    """
    if path in entries:
        return path
    try:
        decoded = unquote(path)
    except Exception:
        return path
    if decoded in entries:
        return decoded
    return path


def _quote_href(path: str) -> str:
    """把 zip 内路径转为可写入 XHTML href 的百分号编码形式（保留 / 与锚点）。"""
    if "#" in path:
        body, anchor = path.split("#", 1)
        return quote(body, safe="/") + "#" + anchor
    return quote(path, safe="/")


def _snap_with_anchor(entries: dict, ref: str) -> str:
    """_snap_entry 的带锚点版本：仅对路径主体对齐，锚点原样保留。"""
    if "#" in ref:
        body, anchor = ref.split("#", 1)
        return _snap_entry(entries, body) + "#" + anchor
    return _snap_entry(entries, ref)


def _relative_href(from_zip_path: str, to_zip_path: str) -> str:
    """计算 zip 内两文件间的相对 URL（复用 curie 思路）。"""
    from_parts = from_zip_path.split("/")
    to_parts = to_zip_path.split("/")
    from_dirs = from_parts[:-1]
    to_dirs = to_parts[:-1]
    common = 0
    for a, b in zip(from_dirs, to_dirs, strict=False):
        if a == b:
            common += 1
        else:
            break
    up = len(from_dirs) - common
    return "../" * up + "/".join(to_parts[common:])


def _text_entries(ctx: OpfContext, entries: dict = None) -> list:
    """按 spine 顺序返回正文（xhtml/html）条目 zip 路径列表（linear=yes）。

    entries 提供时对解析路径做条目名对齐（兼容百分号编码 href 的书）。
    """
    out = []
    for idref, linear in ctx.spine:
        if not linear:
            continue
        item = ctx.manifest.get(idref)
        if not item:
            continue
        if item["mt"] not in ("application/xhtml+xml", "text/html"):
            continue
        path = _resolve_zip(ctx.opf_dir, item["href"])
        if entries is not None:
            path = _snap_entry(entries, path)
        out.append(path)
    return out


def _is_front_file(zip_path: str) -> bool:
    """文件名是否疑似前置页（封面/版权/目录等）。"""
    base = zip_path.rsplit("/", 1)[-1]
    return bool(_FRONT_FILE_RE.search(base))


# ── NCX / nav 解析 ────────────────────────────────────────────────────────────


def _parse_ncx(data: bytes) -> list:
    """解析 NCX 为 [(level, title, src)] 扁平列表（navPoint 嵌套 = 层级）。"""
    items = []
    try:
        root = ET.fromstring(_decode(data))
    except ET.ParseError as e:
        logging.warning("[epub_beautify] NCX parse failed: %s", e)
        return []

    def walk(elem, level):
        for nav_point in elem:
            if nav_point.tag != _q("navPoint", _NS_DTBNCX):
                continue
            label = nav_point.find(_q("navLabel", _NS_DTBNCX))
            title = ""
            if label is not None:
                t = label.find(_q("text", _NS_DTBNCX))
                title = (t.text or "").strip() if t is not None else ""
            content = nav_point.find(_q("content", _NS_DTBNCX))
            src = content.get("src", "") if content is not None else ""
            items.append((level, title, src))
            walk(nav_point, level + 1)

    nav_map = root.find(_q("navMap", _NS_DTBNCX))
    if nav_map is not None:
        walk(nav_map, 0)
    return items


def _parse_nav_doc(data: bytes) -> list:
    """解析 EPUB3 nav 文档（epub:type=toc 的 nav）为 [(level, title, href)]。"""
    items = []
    try:
        root = ET.fromstring(_decode(data))
    except ET.ParseError as e:
        logging.warning("[epub_beautify] nav parse failed: %s", e)
        return []
    nav = None
    for n in root.iter(_q("nav", _NS_XHTML)):
        ntype = n.get("{%s}type" % "http://www.idpf.org/2007/ops") or ""
        if "toc" in ntype:
            nav = n
            break
    if nav is None:
        return items

    def walk(ul, level):
        for li in list(ul):
            if li.tag != _q("li", _NS_XHTML):
                continue
            a = li.find(_q("a", _NS_XHTML))
            title = ""
            href = ""
            if a is not None:
                title = "".join(a.itertext()).strip()
                href = a.get("href", "")
            items.append((level, title, href))
            child = li.find(_q("ol", _NS_XHTML))
            if child is None:
                child = li.find(_q("ul", _NS_XHTML))
            if child is not None:
                walk(child, level + 1)

    # Element 真值判断已弃用（空 <ol/> 为假会误回落到 ul），必须用 is not None
    first_ul = nav.find(_q("ol", _NS_XHTML))
    if first_ul is None:
        first_ul = nav.find(_q("ul", _NS_XHTML))
    if first_ul is not None:
        walk(first_ul, 0)
    return items


# ── 目录数据净化（cleanup.toc_blank）──────────────────────────────────
# 只删零信息的空条目：label 全空且无存活后代的 navPoint / 空 <li>；
# 不动任何有文字的条目，playOrder 顺序重排。


def _prune_ncx_bytes(data: bytes) -> tuple:
    """剔除 NCX 中空标签 navPoint（子级优先递归）。:return: (new_bytes, pruned)"""
    try:
        root = ET.fromstring(_decode(data))
    except ET.ParseError:
        return data, 0
    nav_map = root.find(_q("navMap", _NS_DTBNCX))
    if nav_map is None:
        return data, 0

    pruned = 0

    def _label(np):
        lab = np.find(_q("navLabel", _NS_DTBNCX))
        if lab is None:
            return ""
        t = lab.find(_q("text", _NS_DTBNCX))
        return (t.text or "").strip() if t is not None else ""

    def _clean(elem):
        nonlocal pruned
        for np in list(elem):
            if np.tag != _q("navPoint", _NS_DTBNCX):
                continue
            _clean(np)
            children = [c for c in np if c.tag == _q("navPoint", _NS_DTBNCX)]
            if not _label(np) and not children:
                elem.remove(np)
                pruned += 1

    _clean(nav_map)
    if not pruned:
        return data, 0
    order = 0
    for np in root.iter(_q("navPoint", _NS_DTBNCX)):
        order += 1
        np.set("playOrder", str(order))
    ET.register_namespace("", _NS_DTBNCX)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), pruned


def _prune_nav_bytes(data: bytes) -> tuple:
    """剔除 EPUB3 nav 文档 toc 列表中的空 <li>。:return: (new_bytes, pruned)"""
    try:
        root = ET.fromstring(_decode(data))
    except ET.ParseError:
        return data, 0
    pruned = 0

    def _li_text(li):
        # 兼容包裹型：<li><span><a> 等深层嵌套
        a = li.find(".//" + _q("a", _NS_XHTML))
        return "".join(a.itertext()).strip() if a is not None else ""

    def _clean_ol(ol):
        nonlocal pruned
        for li in list(ol):
            if li.tag != _q("li", _NS_XHTML):
                continue
            subs = [c for c in li if c.tag in (_q("ol", _NS_XHTML), _q("ul", _NS_XHTML))]
            for s in subs:
                _clean_ol(s)
            has_live_sub = any(len(c) for c in li if c.tag in (_q("ol", _NS_XHTML), _q("ul", _NS_XHTML)))
            if not _li_text(li) and not has_live_sub:
                ol.remove(li)
                pruned += 1

    for n in root.iter(_q("nav", _NS_XHTML)):
        ntype = n.get("{http://www.idpf.org/2007/ops}type") or ""
        if "toc" not in ntype:
            continue
        top = n.find(_q("ol", _NS_XHTML))
        if top is None:
            top = n.find(_q("ul", _NS_XHTML))
        if top is not None:
            _clean_ol(top)
    if not pruned:
        return data, 0
    ET.register_namespace("", _NS_XHTML)
    ET.register_namespace("epub", "http://www.idpf.org/2007/ops")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True), pruned


# ── 目录页生成 ────────────────────────────────────────────────────────────────

# 标题已自带中文序号（第X章）或数字前缀（01.）时不再注入编号
_NUM_PREFIX_RE = re.compile(
    r"^(?:第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[章节回篇卷部集]|\d{1,4}\s*[.、．]?)",
)


def _build_toc_page(toc_items: list, ref_dir: str, truncated: bool = False, toc_style: str = "elegant") -> bytes:
    """生成 mb-toc.xhtml。toc_items = [(level, title, zip_href)]。

    zip_href 为条目目标文件在 zip 内的路径（可含 #锚点）。
    ref_dir 为 toc 页所在目录（opf_dir），条目 href 相对它计算。
    toc_style: elegant/cool/minimal 用 ol/li 结构；seal（朱印风）用双栏表格。

    注意：使用**普通 div 结构而非 <nav epub:type="toc">**——nav 文档会被
    手机阅读器（多看/KOReader/微信读书等）当作目录数据源特殊处理（跳过
    渲染或不应用书内 CSS），普通 div 目录页在所有阅读器都当普通页面渲染。
    装饰元素（副题/印章/收尾符）用真实元素生成，不依赖 ::before/::after 伪元素。
    """
    num = 0
    entries = []
    for level, title, zip_href in toc_items:
        if not title:
            continue
        if "#" in zip_href:
            zip_path, anchor = zip_href.split("#", 1)
            anchor = "#" + anchor
        else:
            zip_path, anchor = zip_href, ""
        # 锚点来自书内 NCX/nav，属性上下文需转义（防引号破坏 href 结构）
        rel = _quote_href(_relative_href(ref_dir + MB_TOC_NAME, zip_path)) + _esc(anchor)
        lv = "lv1" if level <= 1 else "lv2"
        num_span = ""
        if lv == "lv1":
            num += 1
            if not _NUM_PREFIX_RE.match(title):
                num_span = '<span class="mb-toc-num">%02d</span>' % num
        if toc_style == "seal":
            # 朱印式：双栏表格行（编号在链接内，右列装饰标记）
            td_cls = ' class="mb-toc-l2"' if lv == "lv2" else ""
            entries.append(
                '<tr><td%s><a href="%s">%s %s</a></td>'
                '<td class="mb-toc-mark">　✦</td></tr>' % (td_cls, rel, num_span, _esc(title))
            )
        else:
            entries.append('<li class="%s">%s<a href="%s">%s</a></li>' % (lv, num_span, rel, _esc(title)))
    trunc = ('<p class="mb-toc-truncated">……（目录过长，仅显示前 %d 条）</p>' % len(toc_items)) if truncated else ""

    if toc_style == "seal":
        head = '<h1>目 录<span class="mb-toc-seal">隐</span><span class="mb-toc-sub">CONTENT</span></h1>'
        body_rows = '<table class="mulu"><tbody>\n%s\n</tbody></table>' % "\n".join(entries)
    else:
        head = '<h1>目　录<span class="mb-toc-sub">C O N T E N T S</span></h1>'
        body_rows = "<ol>%s</ol>" % "\n".join(entries)

    xhtml = (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        "<!DOCTYPE html>\n"
        '<html xmlns="http://www.w3.org/1999/xhtml">\n'
        "<head><title>目录</title>"
        '<link rel="stylesheet" type="text/css" href="%s"/></head>\n'
        '<body class="mb-toc-page" id="mb-toc">\n'
        '<div class="mb-toc">\n'
        "%s\n"
        "%s\n"
        "%s\n"
        '<p class="mb-toc-end">◆</p>\n'
        "</div>\n"
        "</body>\n"
        "</html>"
    ) % (MB_CSS_NAME, head, body_rows, trunc)
    return xhtml.encode("utf-8")


def _esc(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


# ── 章节标题标记 ──────────────────────────────────────────────────────────────


def _block_text(inner_html: str) -> str:
    """块内纯文本（剥内联标签 + 压空白）。"""
    text = _INLINE_RE.sub("", inner_html)
    text = text.replace("&nbsp;", " ").replace("&#160;", " ")
    return " ".join(text.split())


def _looks_like_title(text: str) -> bool:
    """块文本是否像标题（配合类名关键词时用更宽松的长度）。"""
    if not text or len(text) > 80:
        return False
    if text.endswith(("。", "！", "？", "；", ".", "!", "?", ";")):
        return False
    return True


def _add_class(attrs: str, cls: str) -> str:
    """给开标签属性串追加 class（已含 class 则合并，兼容单/双引号）。"""
    m = re.search(r"""\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')""", attrs)
    if m:
        # 兼容双引号与单引号两种写法
        existing = m.group(1) if m.group(1) is not None else m.group(2)
        if cls in existing.split():
            return attrs
        # 统一回写为双引号，避免重复 class 属性
        new_val = (existing + " " + cls).strip()
        # 替换整个 class=... 为双引号形式
        return attrs[: m.start()] + ' class="%s"' % new_val + attrs[m.end() :]
    return attrs + ' class="%s"' % cls


def _inject_css_link(html_str: str, rel_href: str) -> str:
    """在 <head> 末尾注入 mb-beauty.css 引用（幂等）。"""
    if "mb-beauty.css" in html_str:
        return html_str
    link = '<link rel="stylesheet" type="text/css" href="%s"/>' % rel_href
    m = re.search(r"</head>", html_str, re.IGNORECASE)
    if m:
        return html_str[: m.start()] + link + html_str[m.start() :]
    # 无 head：在 <body> 前补一个
    m = re.search(r"<body\b", html_str, re.IGNORECASE)
    if m:
        return html_str[: m.start()] + "<head>" + link + "</head>" + html_str[m.start() :]
    return html_str


# 目录页文件名特征（书内目录文档）
_TOC_FILE_RE = re.compile(r"(mulu|toc|contents|nav)", re.IGNORECASE)
# nav 语义目录页标记（内容含 <nav epub:type="toc">）
_NAV_TOC_RE = re.compile(r'<nav\b[^>]*epub:type\s*=\s*["\']toc', re.IGNORECASE)
# 目录文档标记（body 上打 mb-toc-page 供 CSS 精确作用）
_TOC_BODY_CLASS = "mb-toc-page"


def _has_nav_toc_semantics(html_str: str) -> bool:
    """HTML 头部是否含 ``<nav epub:type="toc">`` 结构。"""
    return bool(_NAV_TOC_RE.search(html_str or ""))


# 内部链接（排除外链协议/协议相对地址）与块级元素计数——目录页结构信号用。
# 注意 \s* 必须放进前瞻内：放在前瞻外会被回溯击穿（href="  https://…" 逐格
# 回退后前瞻改看空白字符而通过，外链被误计为内部链接）
_INTERNAL_HREF_RE = re.compile(
    r'<a\b[^>]*href\s*=\s*["\'](?!\s*(?:https?|mailto|file|ftp|javascript):)'
    r'(?!\s*//)[^"\']*["\']',
    re.I,
)
_BLOCK_OPEN_RE = re.compile(r"<(?:p|div|li|blockquote|h[1-6])\b", re.I)
# 结构/语义信号的最低内部链接数门槛（防两块互链的小页误判）
_TOC_LINK_MIN = 5
# 实义文本剥离（数字/符号/下划线）——目录页回链占比检验用
_SYMBOL_TEXT_RE = re.compile(r"[\d\W_]+", re.UNICODE)
# 首个链接位置（<a\t/<a\n 变体也覆盖）
_FIRST_LINK_RE = re.compile(r"<a\b", re.I)


def _has_toc_title_text(html_str: str) -> bool:
    """首链接之前的块文本或 <title> 是否全等目录标题（复用 _TOC_TITLE_TEXT_RE）。

    p/div/li 等块与裸 div（_SIMPLE_DIV_RE，calibre 平铺形态）都扫，与
    _decorate_toc_page 的标题兜底口径对称。"""
    m = re.search(r"<title\b[^>]*>(.*?)</title>", html_str[:4096], re.I | re.S)
    if m and _TOC_TITLE_TEXT_RE.match(_block_text(m.group(1)).strip()):
        return True
    m = _FIRST_LINK_RE.search(html_str)
    scan = (html_str if m is None else html_str[: m.start()])[:4096]
    for bm in _BLOCK_RE.finditer(scan):
        if _TOC_TITLE_TEXT_RE.match(_block_text(bm.group(3)).strip()):
            return True
    for dm in _SIMPLE_DIV_RE.finditer(scan):
        if _TOC_TITLE_TEXT_RE.match(_block_text(dm.group(2)).strip()):
            return True
    return False


def _looks_like_link_toc(html_str: str) -> bool:
    """链接列表型目录页检测：calibre「Table of Contents」等无 nav 语义的
    纯链接目录（<p><a>第x章</a></p> 列表）。三层信号任一命中即判定：

    1. 形态比例（原有）：≥3 链接且多数条目呈章节标题形态；
    2. 链接密度（结构）：内部链接 ≥5 且占块级元素 ≥60%——目录页的本质是
       "几乎每块都指向书内链接"的容器，对「送葬」「贫穷的标准」这类无编号
       篇名（形态比例必然失效）免疫；跨文件链接（calibre 拆分书的
       ``part0002.xhtml#filepos…``）与同文件锚点同等计入，不能只看 ``#`` 前缀；
    3. 标题语义：首链接之前的块文本或 <title> 全等目录标题（目录/目次/Contents…）。

    真章节页的链接是脚注/引用（数量少、密度低、无目录标题），不会误判。
    误判后果轻微（该页不打章节标 + 获得目录页装饰），双门槛（≥5 链接 +
    60% 密度）压制概率。信号 2/3 仅在形态比例不通过时计算（性能：实测
    进复核路径的文件约 10%，逐文件额外 ~1ms 有界正则）。"""
    anchors = re.findall(r"<a\b[^>]*href=[^>]*>(.*?)</a>", html_str, re.I | re.S)
    if len(anchors) < 3:
        return False
    texts = [t for t in (_block_text(a) for a in anchors) if t]
    if len(texts) < 3:
        return False
    like = sum(1 for t in texts if len(t) <= 60 and chapter_patterns.paragraph_is_heading(t))
    if like >= 3 and like * 2 >= len(texts):
        return True
    if len(anchors) < _TOC_LINK_MIN:
        return False
    # 合并式尾注/脚注页一票否决：行行是回链的注释容器密度与目录页相同，
    # 但它是注释内容——误判会连带抑制目录生成并跳过该页的弹注美化
    if _FOOTNOTE_ASIDE_RE.search(html_str) or _NOTES_OL_BLOCK_RE.search(html_str):
        return False
    # 回链文本占比检验：尾注回链是纯数字/符号（1、↑、◎），目录条目是
    # 篇名文本；剥离数字与符号后的实义字符（字母/汉字）≥2 才算有意义——
    # 多位数页码回链（10、20）同样拦下
    meaningful = sum(1 for t in texts if len(_SYMBOL_TEXT_RE.sub("", t)) >= 2)
    if meaningful * 2 < len(texts):
        return False
    internal = len(_INTERNAL_HREF_RE.findall(html_str))
    if internal >= _TOC_LINK_MIN:
        blocks = len(_BLOCK_OPEN_RE.findall(html_str))
        if blocks and internal * 10 >= blocks * 6:
            return True
        if _has_toc_title_text(html_str):
            return True
    return False


# 无链接纯文本目录页（部分制作器产出 `<p>第X章 …</p>` 列表、整页无 <a>）：
# 文件名/nav 语义/链接密度三类信号全部失效，此前该形态直接落进章节标记，
# page-break 把一页目录炸成 N 个单页（安全阀判别式依赖被标块含链接，无链接
# 时恒不触发）。此处补形态信号：目录标题 + 章节行密度 + 无长正文块。
_PLAIN_TOC_MIN_ROWS = 5  # 至少 5 个章节形态短块
_PLAIN_TOC_LONG_BLOCK = 80  # 页内出现超长正文块即否决
_PLAIN_TOC_SCAN = 64 * 1024  # 扫描窗口（目录页总在页首，长目录也够用）


def _plain_toc_rows(html_str: str) -> tuple:
    """:return: (章节形态短块数, 短块总数, 长正文块数)。"""
    rows = shorts = longs = 0

    def _acc(text):
        nonlocal rows, shorts, longs
        if not text:
            return
        if len(text) > _PLAIN_TOC_LONG_BLOCK:
            longs += 1
            return
        shorts += 1
        if chapter_patterns.paragraph_is_heading(text):
            rows += 1

    for m in _BLOCK_RE.finditer(html_str):
        _acc(_block_text(m.group(3)))
    for m in _SIMPLE_DIV_RE.finditer(html_str):
        inner = m.group(2)
        # 容器型 div（内含块级标签）：文本已由内部块统计，跳过避免重复计数
        if re.search(r"<(?:p|div|ul|ol|li|h[1-6]|table)\b", inner, re.I):
            continue
        _acc(_block_text(inner))
    return rows, shorts, longs


def _looks_like_plain_toc(html_str: str) -> bool:
    """无链接纯文本目录页检测（链接密度信号的兜底，analyze/beautify 共用）。

    必要条件：页首块或 ``<title>`` 恰为「目录/目次/Contents」
    （``_has_toc_title_text``）——不满足直接返回，真章节页不会被误判，
    也让调用方在 8KB 头即可零成本短路。命中后要求页内以章节形态短块为主
    （≥5 行、占比 ≥60%）且无长正文块：散文页/文集页的长段落一票否决。
    """
    if not html_str or not _has_toc_title_text(html_str):
        return False
    rows, shorts, longs = _plain_toc_rows(html_str[:_PLAIN_TOC_SCAN])
    return rows >= _PLAIN_TOC_MIN_ROWS and not longs and rows * 10 >= shorts * 6


def _is_toc_doc(zip_path: str, html_str: str = "") -> bool:
    """判断条目是否为书内目录页：文件名（mulu/toc/nav/contents）、
    ``<nav epub:type="toc">`` 结构、链接列表形态或纯文本列表形态（P：链接
    目录页/无链接目录页此前检测不到，会落入章节标记，mb-ch 的
    page-break-before 把目录页炸成多个「第x章」独立页）。"""
    base = zip_path.rsplit("/", 1)[-1]
    if _TOC_FILE_RE.search(base):
        return True
    if html_str and _has_nav_toc_semantics(html_str):
        return True
    return bool(html_str) and (_looks_like_link_toc(html_str) or _looks_like_plain_toc(html_str))


# 链接目录形态复核窗口（P1：8KB 头不足判定时按 64KB 片段复核，不全量解码；
# analyze 与 beautify 主流程共用同一窗口，判定口径一致）
_TOC_RECHECK_BYTES = 64 * 1024


def _classify_toc_entry(zip_path: str, raw: bytes) -> tuple:
    """单条目目录页判定（analyze 与 beautify 主流程共用，口径一致）。

    文件名特征零解码；nav 语义看 8KB 头；无 nav 语义时按 8KB 头有无链接分流：
    有链接以 64KB 片段复核链接目录形态（``_looks_like_link_toc``），无链接则
    按目录标题门槛复核纯文本列表形态（``_looks_like_plain_toc``），不再全量
    解码——此前 beautify 主流程只看头 2000/4000 字、analyze 用全量复核，两端
    口径不一，长 ``<head>`` 的目录页会 preview 报「保留原书目录」而 run 误打
    章节标记。
    :param raw: 条目原始字节（可为局部读取片段，≥ `_TOC_RECHECK_BYTES` 最佳）。
    :return: (is_toc_doc, nav_semantic, linkless)
        linkless=True 表示仅由纯文本列表形态判定（条目不可点击，保留无意义）
        ——beautify 会像处理 nav 语义页一样用生成的链接目录页替换它。
    """
    head = _decode_head(raw)
    nav_semantic = bool(_has_nav_toc_semantics(head))
    is_toc = bool(_TOC_FILE_RE.search(zip_path.rsplit("/", 1)[-1])) or nav_semantic
    linkless = False
    if not nav_semantic:
        if len(re.findall(rb"<a\b", raw[:8192], re.IGNORECASE)) >= 2:
            if not is_toc:
                probe = _decode_head(raw, raw_n=_TOC_RECHECK_BYTES, out_n=_TOC_RECHECK_BYTES)
                if _looks_like_link_toc(probe):
                    is_toc = True
        elif _has_toc_title_text(head):
            # 无链接纯文本目录页（含文件名已命中的 mulu.xhtml 等）：标题门槛
            # 在 8KB 头即可判定（常见书零成本短路），命中才解码 64KB 复核行密度
            probe = _decode_head(raw, raw_n=_TOC_RECHECK_BYTES, out_n=_TOC_RECHECK_BYTES)
            if _looks_like_plain_toc(probe):
                is_toc = True
                linkless = True
    return is_toc, nav_semantic, linkless


# 误打在目录页上的章节标记清理（修复旧版缺陷输出，见 _is_toc_doc）
_MB_SEP_DIV_RE = re.compile(
    r"""<div\s+class\s*=\s*(?:"[^"]*mb-ch-sep[^"]*"|'[^']*mb-ch-sep[^']*')[^>]*>\s*</div>\s*""", re.IGNORECASE
)
_CH_MARK_TOKENS = ("mb-ch", "mb-vol", "mb-ch-split")


def _strip_chapter_marks(html_str: str) -> str:
    """移除误打在目录页上的章节标记（mb-ch/mb-vol/mb-ch-split 类 + 长线 div）。

    正常流程不给目录页打标，页面上的标记只能来自旧版检测缺陷，剥离即修复。
    幂等：无标记时逐字原样返回（class 的前导空白一并捕获后原样回写——此前
    回写固定带一个前导空格，每跑一次每个 class 属性就多一个空格）；
    类名剥空时整个 class 属性（连同前导空白）移除，不留 class=""。
    单双引号两种写法均处理（自家注入为双引号，手写单引号书亦兼容）。"""
    out = _MB_SEP_DIV_RE.sub("", html_str)

    def _fix_class(m):
        lead = m.group(1)
        val = m.group(2) if m.group(2) is not None else m.group(3)
        quote = '"' if '"' in m.group(0) else "'"
        tokens = [t for t in val.split() if t not in _CH_MARK_TOKENS]
        if not tokens:
            return ""
        return "%sclass=%s%s%s" % (lead, quote, " ".join(tokens), quote)

    return re.sub(r"""(\s*)class\s*=\s*(?:"([^"]*)"|'([^']*)')""", _fix_class, out)


def _mark_toc_page_body(html_str: str) -> str:
    """给目录页 <body> 打 mb-toc-page 类（幂等）。"""
    if _TOC_BODY_CLASS in html_str:
        return html_str
    m = re.search(r"<body\b([^>]*)>", html_str, re.IGNORECASE)
    if not m:
        return html_str
    new_attrs = _add_class(m.group(1), _TOC_BODY_CLASS)
    return html_str[: m.start()] + "<body%s>" % new_attrs + html_str[m.end() :]


# 平铺目录页标题文本（_decorate_toc_page 兜底用）：全等匹配，防类汤正文误标
_TOC_TITLE_TEXT_RE = re.compile(r"^(?:目\s*录|目\s*錄|目\s*次|(?:table\s*of\s*)?contents)$", re.IGNORECASE)


def _decorate_toc_page(html_str: str) -> str:
    """给书内普通目录页注入真实装饰元素（幂等）：标题英文副题 + 收尾 ◆。

    使用真实元素而非 ::before/::after content（移动阅读器兼容性差）。
    标题判定：h1/h2 优先；无 h1/h2 的平铺目录页（类汤书标题常是
    ``<p>目录</p>``）在前几个块里找文本恰为「目录/Contents」的 p/div，
    打 ``mb-toc-title`` 类（与 h1/h2 同组样式）后注入副题。
    """
    if "mb-toc-sub" in html_str and "mb-toc-end" in html_str:
        return html_str
    # 标题内注入英文副题 span（朱印式双行标题）
    m = re.search(r"(<h[12]\b[^>]*>)(.*?)(</h[12]>)", html_str, re.S | re.IGNORECASE)
    if m and "mb-toc-sub" not in m.group(2):
        sub = '<span class="mb-toc-sub">C O N T E N T S</span>'
        html_str = html_str[: m.end(2)] + sub + html_str[m.start(3) :]
    # 平铺目录页标题兜底：只在首个链接之前的块里找（标题必在条目前），
    # 文本全等关键词才命中，不做模糊猜测——类汤首块可能是任何内容
    if "mb-toc-sub" not in html_str:
        _m = _FIRST_LINK_RE.search(html_str)
        _scan = html_str if _m is None else html_str[: _m.start()]
        for m in _BLOCK_RE.finditer(_scan):
            if m.group(1).lower() != "p":
                continue
            if not _TOC_TITLE_TEXT_RE.match(_block_text(m.group(3)).strip()):
                continue
            html_str = (
                html_str[: m.start()]
                + "<p%s>" % _add_class(m.group(2), "mb-toc-title")
                + m.group(3)
                + '<span class="mb-toc-sub">C O N T E N T S</span></p>'
                + html_str[m.end() :]
            )
            break
        else:
            for m in _SIMPLE_DIV_RE.finditer(_scan):
                if not _TOC_TITLE_TEXT_RE.match(_block_text(m.group(2)).strip()):
                    continue
                html_str = (
                    html_str[: m.start()]
                    + "<div%s>" % _add_class(m.group(1), "mb-toc-title")
                    + m.group(2)
                    + '<span class="mb-toc-sub">C O N T E N T S</span></div>'
                    + html_str[m.end() :]
                )
                break
    # body 末尾注入收尾装饰符
    if "mb-toc-end" not in html_str:
        m2 = re.search(r"</body>", html_str, re.IGNORECASE)
        if m2:
            html_str = html_str[: m2.start()] + '<p class="mb-toc-end">◆</p>' + html_str[m2.start() :]
    return html_str


_MB_SEP = '<div class="mb-ch-sep"></div>'

# 章节号前缀拆分（双行排版）：第X章节回篇卷部集季 / Chapter N
_CH_PREFIX_RE = re.compile(
    r"^\s*(?P<num>第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[章节回篇卷部集季]"
    r"|(?:chapter|chap\.?)\s*\d+)"
    r"[\s、．.:：\-—·]*(?P<rest>.+)$",
    re.IGNORECASE,
)


def _split_chapter_title(text: str):
    """把「第三章 血尸」拆为 ('第三章', '血尸')；无剩余标题时返回 None。

    前缀压缩内部空白；仅用于双行排版（split_title），卷级标题不拆。
    """
    m = _CH_PREFIX_RE.match((text or "").strip())
    if not m:
        return None
    rest = m.group("rest").strip()
    if not rest:
        return None
    return re.sub(r"\s+", "", m.group("num")), rest


# 卷级标题（样式分级用）：仅 卷/部/篇 算卷级；「回」在章回体中是章节单元，
# 不沿用 chapter_patterns 的分组语义（那里 回 与 部篇 同级用于分组）
_MB_VOL_RE = re.compile(
    r"^\s*(?:[【\[]\s*)?(?:"
    r"第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[卷部篇]"
    r"|0*\d{1,4}\s*卷"
    r"|卷\s*[0-9零〇一二三四五六七八九十百千万兩两]+"
    r"|[上中下]\s*卷)"
)


def _is_volume_text(text: str) -> bool:
    return bool(_MB_VOL_RE.match((text or "").strip()))


# 防炸页安全阀门槛：单文件章节标记数达到该值且页内内部链接数 ≥ 标记数时
# 放弃全部标记（疑似漏判的链接目录页，见 mark_chapters_in_html 尾部）
_MARK_GUARD_MIN = 10


def mark_chapters_in_html(html_str: str, split_title: bool = False) -> tuple:
    """正文条目内标记章节标题（mb-ch / 卷级 mb-vol）与章首段（data-mb-first）。

    幂等：已含 mb-ch 的条目直接返回原样。
    :param split_title: True 时把纯文本章题拆为 mb-ch-num + mb-ch-title 两行
        span（双行排版，仅章级；块内含子标签则跳过不动）。拆分时标题元素追加
        mb-ch-split 类，供预设关闭章扉式大顶距（双 span 已增高，见 xuanzhi.css）。
    :return: (new_html, stats)，stats = {'chapters','volumes','splits'}；
        触发防炸页安全阀时 stats = {'chapters':0,'volumes':0,'splits':0,
        'toc_guard':1} 且原样返回
    """
    empty = {"chapters": 0, "volumes": 0, "splits": 0}
    if (re.search(r'class="[^"]*\bmb-ch\b', html_str) or re.search(r'class="[^"]*\bmb-vol\b', html_str)) or (
        "<html" not in html_str.lower() and "<body" not in html_str.lower()
    ):
        return html_str, dict(empty)
    if _FRONT_TYPE_RE.search(html_str[:4000]):
        return html_str, dict(empty)

    stats = dict(empty)
    first_done = False
    heading_seen = False
    # 被标块自身含链接的计数（安全阀判别式：目录行是 <p><a>第X章</a></p>，
    # 聚合正文的章题块无链接——见函数末尾安全阀）
    marked_with_links = 0
    # 文件首个含文本块标记：h2 语义打标仅限首块（见 _handle_block 内注释）
    first_text_block_seen = False
    # 性能护栏：开闭不齐的大文件跳过块级正则（避免 _BLOCK_RE O(n²) 退化）
    if len(html_str) > 80000:
        # 粗略统计 p 标签开闭数，不匹配且文件较大则跳过标记（与 analyze 的 p_close_mismatch 思路一致）
        try:
            _open = len(re.findall(r"<p\b", html_str, re.IGNORECASE))
            _close = len(re.findall(r"</p>", html_str, re.IGNORECASE))
            if _open != _close and max(_open, _close) > 50:
                return html_str, dict(empty)
        except Exception:
            pass

    def _handle_block(tag, attrs, inner, is_div=False):
        nonlocal heading_seen, first_done, marked_with_links, first_text_block_seen
        # 弹注条目豁免（mb-note-item 由 mark_notes_in_html 打标）：注释内容
        # 不是章节标题，且 ◎《…》/短条目可能撞上弱正则
        if "mb-note-item" in (attrs or ""):
            return None
        # 同名标签嵌套（多级 li 大纲 / 嵌套引用）：正则的惰性匹配会把内层
        # 闭合标签吞进 outer match，重建后结构破坏——直接跳过不修改
        if re.search(r"<%s\b" % tag, inner or "", re.IGNORECASE):
            return None
        cls_attr = attrs or ""
        text = _block_text(inner)
        if not text.strip():
            return None
        # 空白块不消耗"首块"资格，只有首个含文本块才算
        is_first_text_block = not first_text_block_seen
        first_text_block_seen = True
        is_heading = False
        tag_l = (tag or "").lower()
        if (
            tag_l in ("h1", "h2")
            and (tag_l == "h1" or is_first_text_block)
            and len(text) <= 100
            and not text.rstrip().endswith(("。", "！", "？", "；", ".", "!", "?", ";"))
        ):
            # h1 语义无条件打标；h2 打标仅限文件首个含文本的块（拆分书章题
            # 总在页首，纯短语式章题如「雪夜」此前漏标）——中部 h2 维持旧
            # 启发式：技术书/文集合编常用 h2 当小节头且全无链接，无条件打标
            # 会被 page-break 逐个顶成独页，且安全阀判别式（含链接占比）
            # 对其失效（review P3）；h3 以下同理维持旧启发式；句读收尾的
            # h 块按滥用排除
            is_heading = True
        elif _TITLE_CLASS_RE.search(cls_attr) and _looks_like_title(text):
            is_heading = True
        elif chapter_patterns.paragraph_is_heading(text):
            is_heading = True
        if is_heading:
            # 卷级（第N卷/卷N/上中下卷/第N部篇）单独样式：独页大字、无长线；
            # 章回体「第X回」视为章节，不升级
            is_volume = _is_volume_text(text)
            new_attrs = _add_class(cls_attr, "mb-vol" if is_volume else "mb-ch")
            if is_volume:
                stats["volumes"] += 1
            else:
                stats["chapters"] += 1
            if split_title and not is_volume and "<" not in inner:
                parts = _split_chapter_title(text)
                if parts:
                    inner = ('<span class="mb-ch-num">%s</span><span class="mb-ch-title">%s</span>') % (
                        _esc(parts[0]),
                        _esc(parts[1]),
                    )
                    stats["splits"] += 1
                    # 拆分标记类：预设据此关闭章扉式大顶距（双 span 已增高）
                    new_attrs = _add_class(new_attrs, "mb-ch-split")
            heading_seen = True
            # 判别式用"含内部 href 的链接"口径（与页级安全阀计数一致）：
            # <a name> 具名锚/<abbr> 等非链接标签不得计入，否则聚合正文的
            # 章题块（老转换器惯放具名锚）会被安全阀误杀
            if _INTERNAL_HREF_RE.search(inner or ""):
                marked_with_links += 1
            # 长线分隔符是块级 div：li 的父级是 ul/ol，插 div 会破坏 XHTML
            # 内容模型（EPUBCheck 报错），li 标记不打分隔符
            sep = "" if (is_volume or tag_l == "li") else _MB_SEP
            return "<%s%s>%s</%s>%s" % (tag, new_attrs, inner, tag, sep)
        if heading_seen and not first_done and not is_div:
            if "data-mb-first" in (cls_attr or ""):
                return None
            new_attrs = cls_attr + ' data-mb-first="true"'
            first_done = True
            return "<%s%s>%s</%s>" % (tag, new_attrs, inner, tag)
        return None

    # 第一遍：替换 h/p/blockquote/li 块
    def _replace_block(m):
        tag, attrs, inner = m.group(1), m.group(2), m.group(3)
        out = _handle_block(tag, attrs, inner)
        return out if out is not None else m.group(0)

    new_html = _BLOCK_RE.sub(_replace_block, html_str)
    if not first_done:
        # 第二遍：无嵌套 div（Calibre 类汤）
        def _replace_div(m):
            attrs, inner = m.group(1), m.group(2)
            out = _handle_block("div", attrs, inner, is_div=True)
            return out if out is not None else m.group(0)

        new_html = _SIMPLE_DIV_RE.sub(_replace_div, new_html)

    # 防炸页安全阀（与目录页判定解耦的最后防线）：单文件被打 ≥10 个章节标、
    # 多数被标块自身就是链接（目录行形态）且页内内部链接数 ≥ 标记数 → 几乎
    # 必然是漏判的链接目录页，放弃本页全部标记，宁可不标也不允许
    # page-break 把一页目录炸成几十个单页。聚合多章的正文文件章题块无链接，
    # 即使带每章上/下一章导航链接（标记数 < 链接数、标记块含链接占比低）
    # 也不会命中判别式
    total_marks = stats["chapters"] + stats["volumes"]
    if (
        total_marks >= _MARK_GUARD_MIN
        and marked_with_links * 2 >= total_marks
        and len(_INTERNAL_HREF_RE.findall(html_str)) >= total_marks
    ):
        logging.getLogger(__name__).info(
            "[epub_beautify] chapter-mark guard fired: %d marks (%d linked) "
            "with >=%d internal links, file kept unmarked (suspected TOC page)",
            total_marks,
            marked_with_links,
            total_marks,
        )
        stats = {"chapters": 0, "volumes": 0, "splits": 0, "toc_guard": 1}
        return html_str, stats
    return new_html, stats


# 编号型目录标题（第X章节回篇卷部集季）——NCX 驱动打标的准入门槛
_CH_NUM_RE = re.compile(r"第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[章节回篇卷部集季]")
# 卷级尾部（无锚定）：「资治通鉴第七十四卷」这类带书名前缀的卷名按 mb-vol 处理
# （_MB_VOL_RE 是 ^ 锚定的，前缀书名会漏判）
_VOL_TAIL_RE = re.compile(r"第\s*[0-9零〇一二三四五六七八九十百千万兩两]+\s*[卷部篇]")


def mark_toc_title_in_html(html_str: str, title: str) -> tuple:
    """目录条目标题驱动的卷名/章名打标（NCX 数据源兜底）。

    适用形态：正文页标题层级是 h3+（常规标记只打 h1/h2，防小节头炸页）
    或带书名前缀（「资治通鉴第七十四卷」不匹配 ^第X卷 章节正则），导致
    常规标记零命中，而目录条目恰好指向该页。由调用方保证只对零标记文件
    调用且标题已过编号门槛（_CH_NUM_RE）。

    匹配两段式（防书名块误标）：先全窗口找**全等**块（任意标签），无全等
    再做包含匹配且仅限 h1-h6 标题标签——避免「资治通鉴」书名段先于
    「第七十四卷」卷名块被包含命中。窗口为文件前 16K 字符内的全部块
    （标题页的标题总在页首，16K 字符对 CJK 约合 5K+ 汉字）。卷级判定用
    无锚定 _VOL_TAIL_RE（前缀容忍 → mb-vol 独页大字样式）。
    幂等：文件已含 mb-ch/mb-vol 时原样返回。
    :return: (new_html, marked)；marked ∈ {0, 1}
    """
    if re.search(r'class="[^"]*\b(?:mb-ch|mb-vol)\b', html_str):
        return html_str, 0
    norm_title = "".join(title.split())
    if len(norm_title) < 2:
        return html_str, 0
    contains_hit = None  # (match, tag, attrs, inner, is_volume)
    for bm in _BLOCK_RE.finditer(html_str[:16384]):
        tag, attrs, inner = bm.group(1), bm.group(2), bm.group(3)
        text = _block_text(inner)
        norm_block = "".join(text.split())
        if not norm_block:
            continue
        if norm_block == norm_title:
            return _mark_toc_title_block(html_str, bm, tag, attrs, inner, text)
        if contains_hit is None and tag.lower() in ("h1", "h2", "h3", "h4", "h5", "h6"):
            ok = (len(norm_block) >= 4 and norm_block in norm_title) or (len(norm_title) >= 4 and norm_title in norm_block)
            if ok:
                contains_hit = (bm, tag, attrs, inner, text)
    if contains_hit is not None:
        bm, tag, attrs, inner, text = contains_hit
        return _mark_toc_title_block(html_str, bm, tag, attrs, inner, text)
    return html_str, 0


def _mark_toc_title_block(html_str: str, bm, tag, attrs, inner, text) -> tuple:
    """给命中的块打 mb-vol/mb-ch（卷级无长线），返回 (new_html, 1)。"""
    is_volume = bool(_VOL_TAIL_RE.search(text))
    new_attrs = _add_class(attrs, "mb-vol" if is_volume else "mb-ch")
    new_html = (
        html_str[: bm.start()]
        + "<%s%s>%s</%s>%s" % (tag, new_attrs, inner, tag, "" if is_volume else _MB_SEP)
        + html_str[bm.end() :]
    )
    return new_html, 1


# ── 对话行点缀（mb-dialog）────────────────────────────────────────────

# 开引号字符集：直角引号（「『）、中文弯双引、全角直引号、ASCII 双引号；
# ASCII 单引号不参与（英文撇号/内嵌引用误判率高）
_DIALOG_OPEN_QUOTES = ("「", "『", "“", "＂", '"')


def _is_dialogue_text(text: str) -> bool:
    """段落纯文本是否为对话行：容忍前导空白，以开引号起始。

    保守策略——仅识别开引号起始；``张三道："…"` ` 等叙述引导句式不标
    （避免把整段叙述一起染色）。
    """
    t = (text or "").lstrip(" \u3000")
    return bool(t) and t.startswith(_DIALOG_OPEN_QUOTES)


def mark_dialogue_in_html(html_str: str) -> tuple:
    """为以开引号起始的普通段落打 ``mb-dialog`` 类（幂等，配合开关使用）。

    只处理 ``<p>``（li/blockquote 不动）；标题块（mb-ch）跳过；同名标签
    嵌套整块跳过。:return: (new_html, marked_count)
    """
    if "mb-dialog" in html_str or "<html" not in html_str.lower():
        return html_str, 0
    marked = 0

    def _replace_p(m):
        nonlocal marked
        tag, attrs, inner = m.group(1), m.group(2), m.group(3)
        if tag.lower() != "p" or "mb-ch" in (attrs or ""):
            return m.group(0)
        if re.search(r"<%s\b" % tag, inner or "", re.IGNORECASE):
            return m.group(0)
        if not _is_dialogue_text(_block_text(inner)):
            return m.group(0)
        marked += 1
        return "<%s%s>%s</%s>" % (tag, _add_class(attrs or "", "mb-dialog"), inner, tag)

    return _BLOCK_RE.sub(_replace_p, html_str), marked


# ── 弹注/标注（mb-notemark / mb-notes）───────────────────────────────────────

# 弹注类名词元：多看系 `duokan-footnote*` 与通用系 `footnote*`（多制作器同构惯例，
# 如 `a.footnote` + `ol.footnote-content` + `li.footnote-item`）。词元边界断言防误吞：
# `footnote-content/-item/-text` 不得命中裸 `footnote`，`duokan-footnote-link`（注释体
# 反向链接）不得命中 `duokan-footnote`——此前无边界时反链会被误计为标注符（地疤实书
# 36 refs 实为 18 真 + 18 反链），`my-footnote` 复合词同理不命中。
_MB_NOTE_PREFIX = r"(?<![\w-])(?:duokan-)?footnote"

# 文内标注符：<a class="duokan-footnote|footnote" ...>…</a>（A 型带 epub:type/id，B 型仅 class+href）
_NOTE_REF_RE = re.compile(
    r'<a\b([^>]*?class\s*=\s*["\'][^"\']*%s(?![\w-])[^"\']*["\'][^>]*?)>(.*?)</a>' % _MB_NOTE_PREFIX,
    re.I | re.S,
)
# 注释容器：aside[epub:type~=footnote]（A 型）或裸 ol.{duokan-}footnote-content（B 型）
_FOOTNOTE_ASIDE_RE = re.compile(r'<aside\b[^>]*epub:type\s*=\s*["\'][^"\']*footnote', re.I)
_NOTES_OL_BLOCK_RE = re.compile(r"<ol\b[^>]*%s-content(?![\w-])[^>]*>.*?</ol>" % _MB_NOTE_PREFIX, re.I | re.S)
_NOTE_ITEM_CNT_RE = re.compile(r'class\s*=\s*["\'][^"\']*%s-item(?![\w-])' % _MB_NOTE_PREFIX, re.I)

# 自绘 SVG 标注模板（viewBox 24×24，fill=currentColor 随预设主题染色；
# 全部为本插件原创 path，可随插件分发）
NOTE_MARK_SVGS = {
    "dot": (
        '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="2.6"/>'
    ),
    "fold": (
        '<path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2"/>'
        '<path d="M15 3v4h4" fill="none" stroke="currentColor" stroke-width="2"/>'
        '<circle cx="12" cy="14.5" r="2"/>'
    ),
    "inkdrop": ('<path d="M12 3.5c3.2 4.4 6 7.6 6 11a6 6 0 1 1-12 0c0-3.4 2.8-6.6 6-11z"/>'),
    "spark": ('<path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/>'),
    "sealdot": (
        '<rect x="5" y="5" width="14" height="14" rx="2" fill="none" '
        'stroke="currentColor" stroke-width="2"/>'
        '<rect x="10.4" y="10.4" width="3.2" height="3.2" rx="0.6"/>'
    ),
}

NOTE_MARK_MODES = ("orig", "sym", "num", "zhu")


def validate_note_mark(note_mark: str) -> None:
    """校验标注样式 id：orig/sym/num/zhu 或 svg:<模板id>；非法抛 ValueError。

    公开入口：HTTP 层必须复用本函数，不要再维护第二份白名单——历史上
    handler 白名单漏掉 zhu，前端选项直接 100% 报参数错误。
    """
    if note_mark in NOTE_MARK_MODES:
        return
    if isinstance(note_mark, str) and note_mark.startswith("svg:"):
        if note_mark[4:] in NOTE_MARK_SVGS:
            return
        raise ValueError("unknown svg note mark: %s" % note_mark)
    raise ValueError("unknown note_mark: %r" % (note_mark,))


def _make_mark_inner(note_mark: str, seq: int) -> str:
    """按样式生成标注符内部元素（替换原 <img>；外层 <a> 与属性不动）。"""
    if note_mark == "sym":
        return '<sup class="mb-marktxt">※</sup>'
    if note_mark == "num":
        return '<sup class="mb-marktxt">[%d]</sup>' % seq
    if note_mark == "zhu":
        # 「注」字圆章（中文 EPUB 标注符惯例的向量化）：圆形描边由
        # responsive.css 的 .mb-markzhu 规则绘制，currentColor 跟随预设主题色
        return '<span class="mb-markzhu">注</span>'
    if note_mark.startswith("svg:"):
        return '<svg class="mb-marksvg" viewBox="0 0 24 24" aria-hidden="true">%s</svg>' % NOTE_MARK_SVGS[note_mark[4:]]
    raise ValueError("note_mark %r does not replace inner element" % (note_mark,))


def _add_epub_type_noteref(attrs: str) -> str:
    """为缺语义的标注 <a> 补 epub:type="noteref"（已有则原样）。"""
    if re.search(r"epub:type\s*=", attrs or "", re.I):
        return attrs
    return attrs.rstrip() + ' epub:type="noteref"'


# epub 命名空间声明：注入 epub:type 的前置条件。EPUB2/calibre 导出常只声明
# 默认 XHTML 命名空间，直接写 epub:type 会让整份内容文档变成非良构 XML
# （未绑定前缀是致命解析错误），严格阅读器/EPUBCheck 会判整章不可读。
_EPUB_NS_ATTR = 'xmlns:epub="http://www.idpf.org/2007/ops"'
_HTML_TAG_RE = re.compile(r"<!--[\s\S]*?-->|<html\b[^>]*>", re.I)


def _ensure_epub_ns(html_str: str) -> str:
    """确保 <html> 根声明 epub 前缀（幂等；无 <html> 标签时原样返回）。

    已用别的前缀绑定同一命名空间（如 xmlns:ops）时仍补 epub: ——同一命名
    空间允许多前缀绑定，而注入用的就是 epub: 前缀。注释里的 ``<html…>``
    不是根元素，跳过继续向后找（否则声明会被写进注释而依然未绑定）。
    """
    pos = 0
    while True:
        m = _HTML_TAG_RE.search(html_str, pos)
        if not m:
            return html_str
        tag = m.group(0)
        if tag.startswith("<!--"):
            pos = m.end()
            continue
        if re.search(r"xmlns:epub\s*=", tag, re.I):
            return html_str
        if tag.rstrip().endswith("/>"):
            new_tag = tag.rstrip()[:-2].rstrip() + " %s/>" % _EPUB_NS_ATTR
        else:
            new_tag = tag[:-1].rstrip() + " %s>" % _EPUB_NS_ATTR
        return html_str[: m.start()] + new_tag + html_str[m.end() :]


def mark_notes_in_html(html_str: str, normalize: bool = True, note_mark: str = "orig") -> tuple:
    """美化书内弹注：标注符与注释容器打标，可选语义归一化/换标记元素。

    识别两类同构类名惯例：多看系 ``duokan-footnote*`` 与通用系 ``footnote*``
    （词元边界见 _MB_NOTE_PREFIX 注释，`duokan-footnote-link` 反链/`footnote-text`
    注文体等衍生词元不误命中）。

    - 所有 `a.duokan-footnote` / `a.footnote` 标注符追加 ``mb-notemark`` 类与
      ``data-mb-mark``；note_mark != 'orig' 时把内部 `<img>` 替换为文本/SVG 标记
      （序号按文件内顺序）；normalize 时为缺 `epub:type` 的 ref 补 `noteref`；
    - 容器：已有 `aside[epub:type~=footnote]` 打 ``mb-notes`` 类；
      裸 `ol.duokan-footnote-content` / `ol.footnote-content` 且无 aside 时包进
      `<aside epub:type="footnote" class="mb-notes">`（提升 EPUB3 引擎弹出兼容）；
    - 条目 li 追加 ``mb-note-item`` 豁免类——章末注释不会被章节标题扫描误标。

    安全红线：只增不改不删（除用户显式选择的 img 替换），href/id/class 原样保留。
    幂等：已含 mb-notemark 的文件不再打标（仅按需补 xmlns:epub 声明——旧版
    缺陷输出修复，见 _ensure_epub_ns）。
    :return: (new_html, stats)；stats = {refs, items, normalized, wrapped}
    """
    validate_note_mark(note_mark)
    empty = {"refs": 0, "items": 0, "normalized": 0, "wrapped": 0}
    if "mb-notemark" in html_str or "mb-notes" in html_str:
        # 旧版输出可能已注入 epub:type 却未声明前缀（非良构）：再美化时补上
        return (_ensure_epub_ns(html_str) if normalize else html_str), dict(empty)
    refs_found = _NOTE_REF_RE.findall(html_str)
    items_found = _NOTE_ITEM_CNT_RE.findall(html_str)
    if not refs_found and not items_found:
        return html_str, dict(empty)

    stats = {"refs": len(refs_found), "items": len(items_found), "normalized": 0, "wrapped": 0}
    if normalize:
        # 注入 epub:type 前先确保 <html> 声明 epub 前缀：否则 calibre 类
        # EPUB2 书（只声明默认 XHTML 命名空间）会整份文档非良构
        html_str = _ensure_epub_ns(html_str)
    seq = {"n": 0}

    def _ref_repl(m):
        attrs, inner = m.group(1), m.group(2)
        seq["n"] += 1
        new_attrs = _add_class(attrs, "mb-notemark")
        new_attrs += ' data-mb-mark="%s"' % note_mark
        if normalize and not re.search(r"epub:type\s*=", new_attrs, re.I):
            new_attrs = _add_epub_type_noteref(new_attrs)
            stats["normalized"] += 1
        if note_mark != "orig":
            inner = _make_mark_inner(note_mark, seq["n"])
        return "<a%s>%s</a>" % (new_attrs, inner)

    html_str = _NOTE_REF_RE.sub(_ref_repl, html_str)

    # 条目豁免类（防章节标题扫描误标）；词元级追加，兼容 duokan- 前缀两种写法
    def _item_repl(m):
        return re.sub(r"(?<![\w-])((?:duokan-)?footnote-item)(?![\w-])", r"\1 mb-note-item", m.group(0), count=1)

    html_str = re.sub(
        r'<li\b[^>]*class\s*=\s*["\'][^"\']*(?<![\w-])(?:duokan-)?footnote-item'
        r'(?![\w-])[^"\']*["\'][^>]*>',
        _item_repl,
        html_str,
        flags=re.I,
    )

    has_aside = bool(_FOOTNOTE_ASIDE_RE.search(html_str))
    if has_aside:
        # A 型：给 footnote aside 追加容器类
        def _aside_repl(m):
            tag = m.group(0)
            cls_m = re.search(r'\bclass\s*=\s*"([^"]*)"', tag)
            if cls_m:
                if "mb-notes" in cls_m.group(1):
                    return tag
                return tag.replace(cls_m.group(0), 'class="%s mb-notes"' % cls_m.group(1), 1)
            return tag[:-1] + ' class="mb-notes">'

        html_str = re.sub(r'<aside\b[^>]*epub:type\s*=\s*["\'][^"\']*footnote[^>]*>', _aside_repl, html_str, flags=re.I)
    elif normalize:
        # B 型归一化：裸 ol 包进 aside（EPUB3 引擎弹出信号）
        def _wrap_repl(m):
            stats["wrapped"] += 1
            return '<aside epub:type="footnote" class="mb-notes">\n%s\n</aside>' % m.group(0)

        html_str = _NOTES_OL_BLOCK_RE.sub(_wrap_repl, html_str)
    else:
        # 不归一化也要让 CSS 命中裸 ol：追加容器类
        def _ol_cls_repl(m):
            block = m.group(0)
            tag_end = block.index(">") + 1
            return _add_class(block[:tag_end], "mb-notes") + block[tag_end:]

        html_str = _NOTES_OL_BLOCK_RE.sub(_ol_cls_repl, html_str)

    return html_str, stats


# ── 分析（preview 用）─────────────────────────────────────────────────────────


def _sample_preview_chapter(html_str: str) -> dict:
    """从单个正文文件提取首章真实预览：首个标题块 + 至多 3 段后续正文。

    标题判定与 mark_chapters_in_html 同源（h1-h6 标签或段落文本章节正则）；
    遇到下一个标题块即停止收录；输出纯文本（剥内联标签、压空白、截断）。
    增强：兼顾纯 div 平铺文件（Calibre 类汤）、标题后无段落的短章。
    """
    blocks = list(_BLOCK_RE.finditer(html_str))
    # 纯 div 文件兜底：若未命中块，尝试 div 采样
    if not blocks:
        divs = list(_SIMPLE_DIV_RE.finditer(html_str))
        for i, m in enumerate(divs):
            text = _block_text(m.group(2))
            if not text:
                continue
            if chapter_patterns.paragraph_is_heading(text):
                title = text[:80]
                paras = []
                for dm in divs[i + 1 :]:
                    pt = _block_text(dm.group(2))
                    if not pt:
                        continue
                    if chapter_patterns.paragraph_is_heading(pt):
                        break
                    paras.append(pt[:120])
                    if len(paras) >= 3:
                        break
                # 短章允许仅标题
                return {"title": title, "paragraphs": paras}
        return None
    start = -1
    for i, m in enumerate(blocks):
        tag = m.group(1).lower()
        text = _block_text(m.group(3))
        if not text:
            continue
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6") or chapter_patterns.paragraph_is_heading(text):
            start = i
            break
    if start < 0:
        return None
    title = _block_text(blocks[start].group(3))[:80]
    paras = []
    for m in blocks[start + 1 :]:
        tag = m.group(1).lower()
        text = _block_text(m.group(3))
        if not text:
            continue
        if tag in ("h1", "h2", "h3", "h4", "h5", "h6") or chapter_patterns.paragraph_is_heading(text):
            break
        paras.append(text[:120])
        if len(paras) >= 3:
            break
    # 短章允许仅标题，前端 MOCKS 会补段落
    return {"title": title, "paragraphs": paras}


def analyze_epub(epub_path: str, sample_limit: int = 20) -> dict:
    """扫描 EPUB，返回美化方案分析（不写文件）。

    轻量读取（P1）：preview 在请求线程内同步执行，图片等大条目不再进入
    内存——只读中央目录元数据（名字 + file_size），container/OPF/NCX/CSS
    与采样的正文条目按需解压，目录嗅探以 8KB 头 + 64KB 复核切片完成；
    `beautify` 后台线程仍走 `_read_zip_entries` 全量读取。
    :param sample_limit: 标题统计与 p 开闭预警的采样正文文件数上限（防超大书卡死）。
    """
    try:
        zf = zipfile.ZipFile(epub_path, "r")
    except zipfile.BadZipFile as e:
        raise RuntimeError("EPUB 解析失败，文件可能已损坏：%s" % e) from e
    except zipfile.LargeZipFile as e:
        raise RuntimeError("EPUB 文件过大：%s" % e) from e
    try:
        with zf:
            infos = {}
            for info in zf.infolist():
                if info.is_dir():
                    continue
                if info.filename.startswith("/") or ".." in info.filename.split("/"):
                    logging.warning("[epub_beautify] Skip traversal entry: %s", info.filename)
                    continue
                infos[info.filename] = info
            if sum(i.file_size for i in infos.values()) > _ZIP_MAX_TOTAL or len(infos) > _ZIP_MAX_ENTRIES:
                raise RuntimeError("EPUB 文件过大或条目过多，疑似 Zip Bomb")
            entries = _ZipEntryView(zf, infos)

            ctx = _parse_opf(entries)
            text_entries = _text_entries(ctx, entries)
            css_names = [n for n in entries if n.lower().endswith(".css")]
            has_fontface = False
            calibre_soup = False
            css_important_count = 0
            for n in css_names:
                css = _decode(entries[n])
                if "@font-face" in css:
                    has_fontface = True
                css_important_count += css.count("!important")
            for n in css_names:
                if ".calibre" in _decode(entries[n]):
                    calibre_soup = True
                    break

            ncx_count = 0
            if ctx.ncx_path and ctx.ncx_path in entries:
                ncx_count = len(_parse_ncx(entries[ctx.ncx_path]))
            nav_count = 0
            if ctx.nav_path and ctx.nav_path in entries:
                nav_count = len(_parse_nav_doc(entries[ctx.nav_path]))

            # 与 beautify 同源判定（_classify_toc_entry）：文件名或 nav 结构
            # 均为目录页；nav 语义页运行时会被替换为普通结构目录页，
            # 不计为「书内已有」
            has_inbook_toc = False
            for t in text_entries:
                if t not in entries:
                    continue
                # 轻量嗅探（P1）：64KB 片段按需读，替代旧的全量解压复核。
                # 「书内已有目录」只认可点击的目录页：nav 语义页与无链接纯文本
                # 目录页都会被生成的链接目录页替换，不计入（与 run 侧同口径）
                is_toc, is_nav, is_linkless = _classify_toc_entry(t, entries.head(t, _TOC_RECHECK_BYTES))
                if is_toc and not is_nav and not is_linkless:
                    has_inbook_toc = True
                    break

            h_stats = {"h1": 0, "h2": 0, "h3": 0, "h4": 0, "h5": 0, "h6": 0}
            text_headings = 0
            sampled = 0
            # 首章真实内容（前端预览用）：{title, paragraphs:[≤3]}
            preview_chapter = None
            # 健康报告采样：段首空格占比 / 空段估计 / p 开闭不齐文件数 / 对话行估计
            leading_space_paras = 0
            total_paras = 0
            empty_para_est = 0
            dialogue_paras = 0
            # p 开闭不齐（烂书预警）：限采样计数（P1：全量两次正则扫描大书会卡死 IOLoop，
            # 与标题统计共用 sample_limit 上限，统计语义为「采样内不齐文件数」）
            p_close_mismatch_files = sum(
                1
                for t in text_entries[:sample_limit]
                if t in entries
                and len(re.findall(rb"<p\b", entries[t], re.IGNORECASE))
                != len(re.findall(rb"</p>", entries[t], re.IGNORECASE))
            )
            for t in text_entries:
                if t not in entries:
                    continue
                if _is_front_file(t):
                    continue
                if sampled >= sample_limit:
                    break
                sampled += 1
                html = _decode(entries[t])
                empty_para_est += len(_EMPTY_P_RE.findall(html))
                # 首章真实预览：取第一个可提取的正文文件（跳过目录页）
                if preview_chapter is None and not _is_toc_doc(t, html[:2000]):
                    preview_chapter = _sample_preview_chapter(html)
                for tag in ("h1", "h2", "h3", "h4", "h5", "h6"):
                    h_stats[tag] += len(re.findall(r"<%s\b" % tag, html, re.IGNORECASE))
                for m in _BLOCK_RE.finditer(html):
                    inner = m.group(3)
                    total_paras += 1
                    if m.group(1).lower() == "p" and (
                        re.match(r"^[\s\u3000]*(?:&nbsp;|&#160;)+", inner, re.IGNORECASE)
                        or re.match(r"^[\s\u3000]{2,}", inner)
                    ):
                        leading_space_paras += 1
                    if m.group(1).lower() == "p" and _is_dialogue_text(_block_text(inner)):
                        dialogue_paras += 1
                    # 段落文本识别数：排除 h1-h6 块（它们已计入 heading_stats，
                    # 否则同一标题被两个口径各计一次，前端相加后数字翻倍）
                    if m.group(1).lower() not in (
                        "h1",
                        "h2",
                        "h3",
                        "h4",
                        "h5",
                        "h6",
                    ) and chapter_patterns.paragraph_is_heading(_block_text(inner)):
                        text_headings += 1

            # 弹注统计（采样正文文件，防大书全量解码；健康报告与推荐徽章用，
            # 语义为「采样内计数」；同批文件命中视图缓存，不重复解压）
            notes_refs = 0
            notes_items = 0
            for t in text_entries[:sample_limit]:
                if t not in entries:
                    continue
                h = _decode(entries[t])
                notes_refs += len(_NOTE_REF_RE.findall(h))
                notes_items += len(_NOTE_ITEM_CNT_RE.findall(h))

            # 目录预览：应用排除规则后的前若干条标题（与生成逻辑同源）
            toc_preview_titles = []
            raw_toc = []
            if ctx.ncx_path and ctx.ncx_path in entries:
                raw_toc = [(lv, title, src) for lv, title, src in _parse_ncx(entries[ctx.ncx_path])]
            if not raw_toc and ctx.nav_path and ctx.nav_path in entries:
                raw_toc = [(lv, title, href) for lv, title, href in _parse_nav_doc(entries[ctx.nav_path])]
            for lv, title, _src in raw_toc:
                if title and _toc_entry_allowed(title):
                    toc_preview_titles.append(title)
                if len(toc_preview_titles) >= 12:
                    break

            # 图片体检：数量 + 超大图计数（只报不改）；体积走中央目录
            # file_size（即解压后大小），轻量路径不解压图片
            img_exts = (".jpg", ".jpeg", ".png", ".gif", ".webp")
            image_count = sum(1 for k in entries if k.lower().endswith(img_exts))
            image_oversize = sum(
                1 for k, info in infos.items() if k.lower().endswith(img_exts) and info.file_size > 2 * 1024 * 1024
            )

            return {
                "title": ctx.title,
                "text_entries": len(text_entries),
                "css_files": css_names,
                "has_fontface": has_fontface,
                "calibre_soup": calibre_soup,
                "has_inbook_toc": has_inbook_toc,
                "ncx_entries": ncx_count,
                "nav_entries": nav_count,
                "heading_stats": h_stats,
                "text_headings": text_headings,
                "preview_chapter": preview_chapter,
                "notes_refs": notes_refs,
                "notes_items": notes_items,
                # ── 健康报告 ──
                "leading_space_paras": leading_space_paras,
                "sampled_paras": total_paras,
                "empty_para_est": empty_para_est,
                "dialogue_paras": dialogue_paras,
                "p_close_mismatch_files": p_close_mismatch_files,
                "css_important_count": css_important_count,
                "css_conflict_risk": css_important_count > 30,
                "image_count": image_count,
                "image_oversize": image_oversize,
                "toc_preview_titles": toc_preview_titles,
            }
    except zipfile.BadZipFile as e:
        raise RuntimeError("EPUB 解析失败，文件可能已损坏：%s" % e) from e
    except zipfile.LargeZipFile as e:
        raise RuntimeError("EPUB 文件过大：%s" % e) from e


# ── 主流程 ────────────────────────────────────────────────────────────────────


def _set_page_progression(opf_str: str, direction: str) -> str:
    """幂等设置 spine 的 page-progression-direction（竖排书右翻的标准信号）。

    已有该属性则更新其值，没有则追加；找不到 spine 标签时原样返回。
    """
    m = re.search(r"<spine\b[^>]*>", opf_str)
    if not m:
        return opf_str
    tag = m.group(0)
    if re.search(r"page-progression-direction\s*=", tag):
        new_tag = re.sub(
            r'page-progression-direction\s*=\s*(["\'])[^"\']*\1',
            'page-progression-direction="%s"' % direction,
            tag,
            count=1,
        )
    else:
        # 插到闭合符前（兼容 <spine> 与 <spine toc="ncx"> 及自闭合 <spine/>）
        if tag.rstrip().endswith("/>"):
            new_tag = tag.rstrip()[:-2].rstrip() + ' page-progression-direction="%s"/>' % direction
        else:
            new_tag = tag[:-1].rstrip() + ' page-progression-direction="%s">' % direction
    if new_tag == tag:
        return opf_str
    return opf_str[: m.start()] + new_tag + opf_str[m.end() :]


# 封面/前置页文件名特征：生成目录页时据此把目录挂到封面之后。
# 刻意不含 title / index / author 等裸名——它们会误伤正文首章（如 index.html）
_COVER_FILE_RE = re.compile(
    r"\b(?:cover|titlepage|title-page|half-title|halftitle|feiye|banquan|"
    r"copyright|colophon|imprint)\b",
    re.IGNORECASE,
)


def _toc_anchor_after_cover(ctx: OpfContext, entries: dict, opf_str: str) -> str:
    """spine 开头连续「封面/前置页」中最后一个条目的 idref（无则 ''）。

    生成目录页时的挂载锚点：目录排在封面（含扉页/版权等前置页）之后，而不是
    顶到 spine 首位把封面挤到第二页。识别信号：EPUB2 ``guide`` 的
    ``<reference type="cover">`` 指向页、manifest 条目 id 含 cover、文件名
    命中 ``_COVER_FILE_RE``。只取**开头连续段**——正文首章一旦出现即停止，
    避免把目录页插到正文中间。
    """
    guide_path = ""
    m = re.search(r'<reference\b[^>]*type\s*=\s*["\']cover["\'][^>]*>', opf_str, re.I)
    if m:
        hm = re.search(r'href\s*=\s*["\']([^"\']+)["\']', m.group(0), re.I)
        if hm:
            guide_path = _snap_entry(entries, _resolve_zip(ctx.opf_dir, hm.group(1)))
    anchor = ""
    for idref, linear in ctx.spine:
        if not linear:
            continue
        item = ctx.manifest.get(idref)
        if not item:
            break
        path = _snap_entry(entries, _resolve_zip(ctx.opf_dir, item["href"]))
        base = path.rsplit("/", 1)[-1]
        coverish = (bool(guide_path) and path == guide_path) or bool(_COVER_FILE_RE.search(base)) or "cover" in idref.lower()
        if not coverish:
            break
        anchor = idref
    return anchor


def beautify(
    epub_path: str,
    out_path: str,
    preset_css: str,
    max_toc_entries: int = None,
    toc_style: str = "elegant",
    page_progression: str = None,
    toc_depth: int = None,
    cleanup: dict = None,
    dialogue: bool = False,
    split_title: bool = False,
    extra_assets: dict = None,
    notes: bool = False,
    note_mark: str = "orig",
) -> dict:
    """执行美化并写新 EPUB。

    :param preset_css: 已插值的 mb-beauty.css 内容（styles.get_preset_css）。
    :param page_progression: 'rtl' 时把 spine 设为从左向右翻页（竖排预设用），
        None 保持原书设置。
    :param max_toc_entries: 目录条目上限；**None = 不截断（默认）**，
        显式传数字时超出部分丢弃并附截断提示。深度/噪音过滤先于截断执行。
    :param toc_depth: 目录收录层级上限（None=全部；1/2/3=只收 level < N 的条目）。
    :param cleanup: 内容清理开关 {"leading":bool,"empty":bool,"meta":bool}，
        见 _normalize_cleanup；None 用默认（段首空格开/空段关/meta 开）。
    :param dialogue: 对话行点缀开关（True=为「『“起始段落打 mb-dialog，
        样式由 mb-beauty.css 的 .mb-dialog 规则提供）。
    :param split_title: 双行排版开关（True=纯文本章题拆为 mb-ch-num +
        mb-ch-title 两行 span，卷级不拆）。
    :param extra_assets: 附加资源 {zip内文件名: (bytes, media_type)}，
        如背景图片 {'mb-bg.jpg': (data, 'image/jpeg')}；写入包体并注册 manifest（幂等）。
    :param notes: 弹注/标注美化开关（标注符与注释容器打标 + B 型语义归一化）。
    :param note_mark: 标注样式 orig/sym/num/svg:<模板id>，见 mark_notes_in_html。
    :return: 统计 dict（marked_headers / marked_volumes / titles_split /
        toc_generated / toc_entries / injected_css / chapters / rtl /
        cleaned_leading / removed_empty / toc_excluded / toc_links_ok /
        toc_links_total / toc_replaced_linkless / dialogues_marked /
        notes_refs / notes_items / notes_normalized / notes_wrapped /
        toc_titles_marked / mark_guard_files）
    """
    if notes:
        validate_note_mark(note_mark)
    cleanup_n = _normalize_cleanup(cleanup)
    entries = _read_zip_entries(epub_path)
    ctx = _parse_opf(entries)
    text_entries = _text_entries(ctx, entries)

    # ── 0. 目录数据净化：剔除 NCX/nav 空白条目（阅读器侧边栏空行元凶）──
    toc_blank_pruned = 0
    if cleanup_n.get("toc_blank"):
        if ctx.ncx_path and ctx.ncx_path in entries:
            new_ncx, n = _prune_ncx_bytes(entries[ctx.ncx_path])
            if n:
                entries[ctx.ncx_path] = new_ncx
                toc_blank_pruned += n
        if ctx.nav_path and ctx.nav_path in entries:
            new_nav, n2 = _prune_nav_bytes(entries[ctx.nav_path])
            if n2:
                entries[ctx.nav_path] = new_nav
                toc_blank_pruned += n2
        if toc_blank_pruned:
            logging.getLogger(__name__).info("[epub_beautify] pruned %d blank TOC entries", toc_blank_pruned)

    # ── 1. 目录：生成普通结构目录页 / 替换 nav 语义目录页 / 保留普通目录页 ──
    # 手机阅读器（多看/KOReader/微信读书等）把 <nav epub:type="toc"> 文档当
    # 目录数据源特殊处理（跳过渲染或不应用书内 CSS），因此：
    #   - 无书内目录页 → 生成 mb-toc.xhtml（普通 div 结构）插入 spine 首条；
    #   - 书内目录页是 nav 语义且在 spine → 生成普通结构目录页**替换** spine
    #     中的 nav 条目（原 nav 文件保留在 manifest，properties="nav" 不动，
    #     阅读器侧边栏目录数据源不丢）；
    #   - 书内目录页是普通结构（mulu.xhtml 等）→ 保留原页，仅注入样式与装饰。
    toc_generated = False
    toc_entries = 0
    toc_items = []
    toc_excluded = 0
    toc_links_ok = 0
    toc_links_total = 0
    toc_replaced_linkless = 0

    def _abs_with_anchor(base_dir, ref):
        """把目录条目引用解析为 zip 绝对路径（保留 #锚点）。"""
        if "#" in ref:
            path, anchor = ref.split("#", 1)
            return _resolve_zip(base_dir, path) + "#" + anchor
        return _resolve_zip(base_dir, ref)

    def _collect_toc(items):
        """应用噪音排除 + 深度过滤，返回 (items, excluded_count)。"""
        kept = []
        excluded = 0
        for it in items:
            lv, title, src = it
            if not title or not _toc_entry_allowed(title):
                excluded += 1
                continue
            if toc_depth is not None and lv >= toc_depth:
                excluded += 1
                continue
            kept.append(it)
        return kept, excluded

    # 目录数据源：NCX 优先，其次 EPUB3 nav 文档
    if ctx.ncx_path and ctx.ncx_path in entries:
        ncx_dir = ctx.ncx_path.rsplit("/", 1)[0] + "/" if "/" in ctx.ncx_path else ""
        raw = [
            (lv, title, _snap_with_anchor(entries, _abs_with_anchor(ncx_dir, src)))
            for lv, title, src in _parse_ncx(entries[ctx.ncx_path])
        ]
        toc_items, toc_excluded = _collect_toc(raw)
    elif ctx.nav_path and ctx.nav_path in entries:
        nav_dir = ctx.nav_path.rsplit("/", 1)[0] + "/" if "/" in ctx.nav_path else ""
        raw = [
            (lv, title, _snap_with_anchor(entries, _abs_with_anchor(nav_dir, href)))
            for lv, title, href in _parse_nav_doc(entries[ctx.nav_path])
        ]
        toc_items, toc_excluded = _collect_toc(raw)

    # 书内目录页判定：与 analyze 共用 _classify_toc_entry（8KB 头 + 64KB
    # 链接复核，全量字节已在内存不二次解码），两端口径一致——此前 run 侧
    # 仅看头 2000/4000 字，长 <head> 的目录页会漏判而误打章节标记
    toc_page_flags = {}
    nav_semantic_flags = {}
    linkless_flags = {}
    for t in text_entries:
        if t not in entries:
            continue
        is_toc, is_nav, is_linkless = _classify_toc_entry(t, entries[t])
        toc_page_flags[t] = is_toc
        nav_semantic_flags[t] = is_nav
        linkless_flags[t] = is_linkless
    inbook_toc_paths = [t for t in text_entries if toc_page_flags.get(t)]
    # nav 语义目录页（内容含 <nav epub:type="toc">）：手机阅读器当目录数据源
    # 特殊处理，spine 中无论 manifest 是否标 properties 都需替换为普通结构。
    # 无链接纯文本目录页（linkless）条目不可点击，保留无意义——有 NCX/nav
    # 数据时同样替换为生成的链接目录页；无数据源（toc_items 为空）则退回
    # 仅样式化，至少不炸页。两类目标按 spine 顺序合并，替换后目录页占
    # 原首个目标页的位置。
    toc_target_paths = [t for t in text_entries if nav_semantic_flags.get(t) or linkless_flags.get(t)]
    replace_in_spine = bool(toc_target_paths)
    # spine 条目 zip 路径 → idref 映射（用于替换 itemref）。
    # 必须从 ctx.spine 逐项解析构建，不能 zip(text_entries, linear idrefs)——
    # spine 含非 XHTML 的 linear 条目（SVG 插图页 / 烂书直接塞图）或 manifest
    # 缺 idref 时两者长度与顺序均会错位，导致 nav 替换误伤其他条目。
    path_to_idref = {}
    for idref, linear in ctx.spine:
        if not linear:
            continue
        item = ctx.manifest.get(idref)
        if not item or item["mt"] not in ("application/xhtml+xml", "text/html"):
            continue
        p = _snap_entry(entries, _resolve_zip(ctx.opf_dir, item["href"]))
        path_to_idref.setdefault(p, idref)

    if (not inbook_toc_paths or replace_in_spine) and toc_items:
        # 截断仅在显式传入 max_toc_entries 时发生（默认 None = 全量收录）
        truncated = (max_toc_entries is not None) and len(toc_items) > max_toc_entries
        if truncated:
            toc_items = toc_items[:max_toc_entries]
        toc_path = ctx.opf_dir + MB_TOC_NAME

        # 链接完整性校验：所有条目目标必须真实存在于包内（生成前校验，零成本）
        toc_links_ok = sum(1 for _, _, src in toc_items if src.split("#", 1)[0] in entries)
        toc_links_total = len(toc_items)

        entries[toc_path] = _build_toc_page(toc_items, ctx.opf_dir, truncated, toc_style)
        toc_entries = len(toc_items)
        # OPF 注册（幂等）。P5：解析 manifest 精确比对 href，不做全文字串匹配——
        # 'mb-toc.xhtml' 子串会被 href="old-mb-toc.xhtml" 等误判成已注册而漏注册；
        # id 同步防撞（既有 id="mb-toc" 时顺延 -x）
        opf_str = _decode(entries[ctx.opf_path])
        if not any(it.get("href") == MB_TOC_NAME for it in ctx.manifest.values()):
            mb_id = "mb-toc"
            while mb_id in ctx.manifest:
                mb_id += "-x"
            opf_str = _opf_add_to_manifest(
                opf_str,
                '<item id="%s" href="%s" media-type="application/xhtml+xml"/>' % (mb_id, MB_TOC_NAME),
                "目录页",
            )
            # 找出 spine 中待替换的 idref：nav 语义页 / 无链接纯文本目录页，
            # 否则为无目录时的插入
            if replace_in_spine:
                replace_ids = [
                    path_to_idref[t] for t in toc_target_paths if path_to_idref.get(t) and path_to_idref[t] != mb_id
                ]
                toc_replaced_linkless = sum(1 for t in toc_target_paths if linkless_flags.get(t) and path_to_idref.get(t))
            else:
                replace_ids = []
            if replace_ids:
                # 替换第一个 nav 语义目录页条目；其余的直接移除。
                # idref 兼容单引号属性；首替换 miss 会静默丢 spine 条目，显式报错
                opf_str, n_ref = re.subn(
                    r'\s*<itemref\b[^>]*idref=["\']%s["\'][^>]*/?>' % re.escape(replace_ids[0]),
                    '\n<itemref idref="%s" linear="yes"/>' % mb_id,
                    opf_str,
                    count=1,
                )
                if n_ref == 0:
                    raise RuntimeError("OPF spine 缺 idref=%s 条目，无法挂载目录页" % replace_ids[0])
                for extra in replace_ids[1:]:
                    opf_str = re.sub(
                        r'\s*<itemref\b[^>]*idref=["\']%s["\'][^>]*/?>' % re.escape(extra),
                        "",
                        opf_str,
                        count=1,
                    )
            else:
                # 插入封面/前置页之后（识别不到封面时退回 spine 首位）
                spine_m = re.search(r"<spine[^>]*>", opf_str)
                if spine_m:
                    insert_at = spine_m.end()
                    anchor_id = _toc_anchor_after_cover(ctx, entries, opf_str)
                    if anchor_id:
                        am = re.search(r'<itemref\b[^>]*idref=["\']%s["\'][^>]*/?>' % re.escape(anchor_id), opf_str)
                        if am:
                            insert_at = am.end()
                    opf_str = opf_str[:insert_at] + '\n<itemref idref="%s" linear="yes"/>' % mb_id + opf_str[insert_at:]
            # EPUB2 <guide> 的 type="toc" 引用同步指向新目录（存在才改）：
            # 否则部分阅读器「目录」键跳回旧位置/失效（实测情书test 遗留过期引用）
            if re.search(r"<guide\b", opf_str, re.I):

                def _retarget_toc_ref(m):
                    tag = m.group(0)
                    if not re.search(r'type=["\']toc["\']', tag, re.I):
                        return tag
                    return re.sub(r'href=["\'][^"\']*["\']', 'href="%s"' % MB_TOC_NAME, tag, count=1)

                opf_str = re.sub(r"<reference\b[^>]*>", _retarget_toc_ref, opf_str, flags=re.I)
            entries[ctx.opf_path] = opf_str.encode("utf-8")
            toc_generated = True

    # ── 1.5 附加资源（如背景图片）：写入包体 + manifest 注册（幂等）──
    extra_count = 0
    if extra_assets:
        opf_now = _decode(entries[ctx.opf_path])
        # P5：href 用解析集合精确比对（替代 href="..." 子串匹配）；
        # id 由 rsplit 取名而来，会与既有 id / 彼此相撞（bg.jpg vs bg.png），
        # 顺延 -x 防撞；mb-toc / mb-beauty 为本流程保留 id
        manifest_hrefs = {it.get("href") for it in ctx.manifest.values()}
        used_ids = set(ctx.manifest) | {"mb-toc", "mb-beauty"}
        added = ""
        for name, (blob, mtype) in extra_assets.items():
            entries[ctx.opf_dir + name] = blob
            extra_count += 1
            if name in manifest_hrefs:
                continue
            item_id = name.rsplit(".", 1)[0]
            while item_id in used_ids:
                item_id += "-x"
            used_ids.add(item_id)
            added += '\n<item id="%s" href="%s" media-type="%s"/>' % (item_id, name, mtype)
        if added:
            opf_now = _opf_add_to_manifest(opf_now, added.lstrip("\n"), "附加资源")
            entries[ctx.opf_path] = opf_now.encode("utf-8")

    # ── 2. mb-beauty.css 注入 ──
    css_zip_path = ctx.opf_dir + MB_CSS_NAME
    entries[css_zip_path] = preset_css.encode("utf-8")
    # 注册到 OPF manifest（部分阅读器要求 CSS 在 manifest 中才生效）。
    # P5：解析比对 href；P6：缺 </manifest> 显式报错
    opf_raw = _decode(entries[ctx.opf_path])
    if not any(it.get("href") == MB_CSS_NAME for it in ctx.manifest.values()):
        mb_css_id = "mb-beauty"
        while mb_css_id in ctx.manifest:
            mb_css_id += "-x"
        opf_raw = _opf_add_to_manifest(
            opf_raw,
            '<item id="%s" href="%s" media-type="text/css"/>' % (mb_css_id, MB_CSS_NAME),
            "样式表",
        )
        entries[ctx.opf_path] = opf_raw.encode("utf-8")

    # ── 3. 逐正文条目：内容清理 + 目录页标记 + 章节名标记 + 对话行标记 + 注入 CSS ──
    marked_headers = 0
    marked_volumes = 0
    titles_split = 0
    injected = 0
    cleaned_leading = 0
    removed_empty = 0
    dialogues_marked = 0
    notes_refs = notes_items = notes_normalized = notes_wrapped = 0
    toc_titles_marked = 0
    mark_guard_files = 0
    # NCX 驱动打标目标：目录条目标题含编号形态（第X卷/章…）时，指向的文件
    # 若常规标记零命中（标题是 h3+ 层级或带书名前缀），由条目标题兜底打标。
    # 每文件只记首条标题：兜底仅在零标记文件触发，多章同文件且全为 h3 的书
    # 只兜底标到第一章（半改善可接受，不为边际收益扩回归面）
    toc_title_map = {}
    for _lv, _title, _src in toc_items:
        if _title and _CH_NUM_RE.search(_title):
            _path = _src.split("#", 1)[0]
            if _path and _path not in toc_title_map:
                toc_title_map[_path] = _title
    for t in text_entries:
        if t not in entries:
            continue
        html = _decode(entries[t])
        # 统一 XML 声明为 utf-8（GBK/Big5 原文件头修正，避免 utf-8 实体与声明不一致）
        if html.lstrip().startswith("<?xml"):
            html = re.sub(r"""(<\?xml[^>]*encoding\s*=\s*)["'][^"']*["']""", r'\1"utf-8"', html, count=1, flags=re.IGNORECASE)
        changed = False
        # 弹注/标注美化（先于章节标记执行，豁免类才能生效；目录/前置页不做；
        # 目录页判定用前置 pass 的 flags，不再对（可能已被修改的）html 重复全量正则）
        if notes and not toc_page_flags.get(t) and not _is_front_file(t):
            new_html, nstats = mark_notes_in_html(html, normalize=True, note_mark=note_mark)
            if nstats["refs"] or nstats["items"]:
                notes_refs += nstats["refs"]
                notes_items += nstats["items"]
                notes_normalized += nstats["normalized"]
                notes_wrapped += nstats["wrapped"]
            if new_html != html:
                # 零统计也可能有变更：旧版缺陷输出补 xmlns:epub 声明
                changed = True
                html = new_html
        # 内容清理（段首空格归一/空段/meta），目录页不做文本清理避免破坏布局
        if not toc_page_flags.get(t):
            new_html, n_lead, n_empty = _clean_html_body(html, cleanup_n)
            if n_lead or n_empty or new_html != html:
                cleaned_leading += n_lead
                removed_empty += n_empty
                if new_html != html:
                    changed = True
                    html = new_html
        # 目录页：body 打 mb-toc-page 标记 + 注入真实装饰元素，不做章节标记
        if toc_page_flags.get(t):
            # 修复旧版缺陷输出：目录行曾被误当章节标题打标，mb-ch 的
            # page-break-before 会把目录页炸成多个「第x章」独立页
            fixed = _strip_chapter_marks(html)
            if fixed != html:
                changed = True
                html = fixed
            new_html = _mark_toc_page_body(html)
            if new_html != html:
                changed = True
                html = new_html
            new_html = _decorate_toc_page(html)
            if new_html != html:
                changed = True
                html = new_html
        elif not _is_front_file(t):
            new_html, mk = mark_chapters_in_html(html, split_title=bool(split_title))
            if mk.get("toc_guard"):
                mark_guard_files += 1
            if mk["chapters"] or mk["volumes"] or mk["splits"]:
                marked_headers += mk["chapters"]
                marked_volumes += mk["volumes"]
                titles_split += mk["splits"]
                changed = True
                html = new_html
            elif not mk.get("toc_guard") and toc_title_map.get(t):
                # 常规标记零命中且未被安全阀拦下 → 目录条目标题兜底打标
                # （资治通鉴卷名页：h3 层级 + 书名前缀，常规路径打不中）
                new_html, n = mark_toc_title_in_html(html, toc_title_map[t])
                if n:
                    toc_titles_marked += n
                    changed = True
                    html = new_html
        # 对话行点缀（开关控制打标；目录/前置页不做）
        if dialogue and not toc_page_flags.get(t) and not _is_front_file(t):
            new_html, dcount = mark_dialogue_in_html(html)
            if dcount:
                dialogues_marked += dcount
                changed = True
                html = new_html
        new_html = _inject_css_link(html, _relative_href(t, css_zip_path))
        if new_html != html:
            changed = True
            html = new_html
        if changed:
            entries[t] = html.encode("utf-8")
            injected += 1

    # ── 4. 翻页方向：竖排预设把 spine 设为 rtl（从左向右翻）──
    rtl_set = False
    if page_progression:
        opf_now = _decode(entries[ctx.opf_path])
        opf_new = _set_page_progression(opf_now, page_progression)
        if opf_new != opf_now:
            entries[ctx.opf_path] = opf_new.encode("utf-8")
        rtl_set = 'page-progression-direction="%s"' % page_progression in opf_new

    _write_zip(entries, out_path)
    return {
        "marked_headers": marked_headers,
        "marked_volumes": marked_volumes,
        "titles_split": titles_split,
        "toc_generated": toc_generated,
        "toc_entries": toc_entries,
        "css_injected_chapters": injected,
        "chapters": len(text_entries),
        "page_progression": page_progression if rtl_set else "",
        "cleaned_leading": cleaned_leading,
        "removed_empty": removed_empty,
        "toc_excluded": toc_excluded,
        "toc_replaced_linkless": toc_replaced_linkless,
        "toc_depth": toc_depth or 0,
        "toc_links_ok": toc_links_ok if toc_generated else 0,
        "toc_links_total": toc_links_total if toc_generated else 0,
        "dialogues_marked": dialogues_marked,
        "notes_refs": notes_refs,
        "notes_items": notes_items,
        "notes_normalized": notes_normalized,
        "notes_wrapped": notes_wrapped,
        "note_mark": note_mark if notes else "",
        "toc_blank_pruned": toc_blank_pruned,
        "extra_assets": extra_count,
        "toc_titles_marked": toc_titles_marked,
        "mark_guard_files": mark_guard_files,
    }
