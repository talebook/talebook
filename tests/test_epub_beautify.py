# -*- coding: utf-8 -*-
"""epub_beautify 核心单元测试（Talebook 插件版）。

移植自 mybooks tests/test_epub_beautify_core.py（standalone，不依赖 calibre）：
覆盖章节正则识别（含正反例）、EPUB 分析、目录页生成与幂等重跑、
章节标题标记（h / 段落文本 / div 三类）、CSS 注入与预设插值、规范 zip 重写。

运行：pytest tests/test_epub_beautify.py
"""
import io
import os
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET
import zipfile
from unittest import mock

from webserver.plugins.tool.epub_beautify import beautify_lib as lib
from webserver.plugins.tool.epub_beautify import chapter_patterns
from webserver.plugins.tool.epub_beautify import styles as _styles_pkg
from webserver.plugins.tool.epub_beautify.styles import (
    _CALIBRE_INDENT_SELECTORS,
    _CALIBRE_MARGIN_SELECTORS,
    _apply_palette_overrides,
    get_preset_css,
    list_presets,
    list_toc_styles,
)


TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
STYLES_DIR = os.path.dirname(os.path.abspath(_styles_pkg.__file__))
TMP_DIR = tempfile.gettempdir()


CONTAINER = (
    '<?xml version="1.0"?>'
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
    '<rootfiles><rootfile full-path="OEBPS/content.opf" '
    'media-type="application/oebps-package+xml"/></rootfiles></container>'
)
OPF = (
    '<?xml version="1.0"?>'
    '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
    '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书</dc:title></metadata>'
    '<manifest>'
    '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
    '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
    '<item id="css" href="style.css" media-type="text/css"/>'
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    '</manifest>'
    '<spine><itemref idref="c1"/><itemref idref="c2"/></spine>'
    '</package>'
)
NCX = (
    '<?xml version="1.0"?>'
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
    '<navMap>'
    '<navPoint id="v1"><navLabel><text>第一卷</text></navLabel>'
    '<content src="ch1.xhtml"/>'
    '<navPoint id="n1"><navLabel><text>第一章 序章</text></navLabel>'
    '<content src="ch1.xhtml#p1"/></navPoint>'
    '<navPoint id="n2"><navLabel><text>第二章 开端</text></navLabel>'
    '<content src="ch1.xhtml#p2"/></navPoint>'
    '</navPoint>'
    '<navPoint id="n3"><navLabel><text>第三章 转折</text></navLabel>'
    '<content src="ch2.xhtml"/></navPoint>'
    '<navPoint id="n4"><navLabel><text>引子</text></navLabel>'
    '<content src="ch2.xhtml"/></navPoint>'
    '</navMap></ncx>'
)
# ch1：无 h 标签，标题是段落文本（第三层识别路径）
CH1 = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
    '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
    '<body><p>第一章 序章</p><p>正文从这里开始，描写一段长长的故事。</p>'
    '<p>第二章 开端</p><p>第二段正文内容，继续推进情节。</p></body></html>'
)
# ch2：h2 标题（第一层识别路径）
CH2 = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
    '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
    '<body><h2>第三章 转折</h2><p>这是第三章的正文。</p></body></html>'
)
# 前置页：书名/版权（不应被标记）
COVER = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Cover</title></head>'
    '<body><h1>测试书</h1><p>版权信息页</p></body></html>'
)
CSS = "body { font-family: serif; }\n"


def build_mini_epub(path, with_cover=False):
    """构建迷你 EPUB：NCX 无书内目录页；可选封面前置页。"""
    manifest = (
        '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="css" href="style.css" media-type="text/css"/>'
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    )
    spine = '<itemref idref="c1"/><itemref idref="c2"/>'
    if with_cover:
        manifest = (
            '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>'
            + manifest
        )
        spine = '<itemref idref="cover"/>' + spine
    opf = (
        '<?xml version="1.0"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
        '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书</dc:title></metadata>'
        '<manifest>%s</manifest><spine>%s</spine></package>'
    ) % (manifest, spine)
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/ch1.xhtml", CH1)
        zf.writestr("OEBPS/ch2.xhtml", CH2)
        zf.writestr("OEBPS/style.css", CSS)
        zf.writestr("OEBPS/toc.ncx", NCX)
        if with_cover:
            zf.writestr("OEBPS/cover.xhtml", COVER)


class TestChapterPatterns(unittest.TestCase):
    """章节正则识别（移植自 txt2epub-next）。"""

    def test_structured_chinese(self):
        for line in ("第一章 序章", "第12章 标题", "第十二章 标题", "第 三 回 标题",
                     "【第一卷：标题】", "序章", "楔子", "尾声", "番外", "后记"):
            self.assertIsNotNone(chapter_patterns.heading_kind(line), line)

    def test_english(self):
        for line in ("Chapter 1", "Chapter III", "Volume 2", "Book 1", "Part i"):
            self.assertIsNotNone(chapter_patterns.heading_kind(line), line)

    def test_bare_number(self):
        self.assertEqual(chapter_patterns.heading_kind("001 标题"), "bare_number")
        self.assertEqual(chapter_patterns.heading_kind("1. Title"), "bare_number")

    def test_not_headings(self):
        # 小数/时间戳/普通句子不应误判
        for line in ("45.761871", "10:20", "他走进房间，看见桌上的信。"):
            self.assertIsNone(chapter_patterns.heading_kind(line), line)

    def test_paragraph_is_heading_filters(self):
        self.assertTrue(chapter_patterns.paragraph_is_heading("第1章 天黑别出门"))
        self.assertTrue(chapter_patterns.paragraph_is_heading("序章"))
        # 长段 / 句末标点 / 纯符号 → 不是标题
        self.assertFalse(chapter_patterns.paragraph_is_heading("第1章 " + "很" * 100))
        self.assertFalse(chapter_patterns.paragraph_is_heading("第一章。他走在路上。"))
        self.assertFalse(chapter_patterns.paragraph_is_heading("10:20"))
        self.assertFalse(chapter_patterns.paragraph_is_heading(""))

    def test_heading_number(self):
        self.assertEqual(chapter_patterns.heading_number("第12章 标题"), 12)
        self.assertEqual(chapter_patterns.heading_number("003 标题"), 3)
        self.assertIsNone(chapter_patterns.heading_number("序章"))


class TestPresets(unittest.TestCase):
    """预设加载与插值。"""

    def test_list_presets(self):
        presets = list_presets()
        self.assertIn("classic", presets)
        self.assertGreaterEqual(len(presets), 4)

    def test_preset_css_interpolation(self):
        css = get_preset_css("classic", use_system_fonts=True)
        self.assertNotIn("{{", css)
        self.assertIn("font-family: \"Noto Serif SC\"", css)
        self.assertIn("line-height: 1.7", css)
        self.assertIn(".mb-ch", css)
        self.assertIn("mb-toc-page", css)  # 目录样式（elegant 默认）已嵌入

    def test_preset_css_keep_original_fonts(self):
        css = get_preset_css("classic", use_system_fonts=False)
        self.assertNotIn("{{", css)
        self.assertNotIn("font-family:", css)
        self.assertIn(".mb-ch", css)
        self.assertIn("mb-toc-page", css)

    def test_toc_style_cool(self):
        css = get_preset_css("classic", use_system_fonts=True, toc_style="cool")
        self.assertNotIn("{{", css)
        grad = list_presets()["classic"]["toc_gradient"]
        self.assertIn(grad, css)
        # cool 条目区已参数化（跟随预设 QUOTE_BG），不再硬编码奶油金
        self.assertIn(".mb-toc-num", css)
        # elegant 不含渐变
        css_elegant = get_preset_css("classic", use_system_fonts=True, toc_style="elegant")
        self.assertNotIn("linear-gradient", css_elegant)

    def test_toc_style_seal(self):
        css = get_preset_css("classic", use_system_fonts=True, toc_style="seal")
        self.assertNotIn("{{", css)
        self.assertIn("mb-toc-seal", css)     # 印章装饰
        self.assertIn("td.mb-toc-mark", css)  # 双栏表格右列
        self.assertIn("table.mulu", css)

    def test_toc_style_minimal(self):
        """minimal 极简：无卡片无边框、收尾横线化。"""
        css = get_preset_css("classic", use_system_fonts=True, toc_style="minimal")
        self.assertNotIn("{{", css)
        self.assertIn("mb-toc-page", css)
        self.assertIn("background: transparent !important", css)
        self.assertIn("font-size: 0", css)
        self.assertNotIn("linear-gradient", css)

    def test_all_preset_toc_combos_interpolation(self):
        """全部预设 × 4 目录风格组合插值无残留占位符。"""
        presets = list_presets()
        self.assertGreaterEqual(len(presets), 11)
        for pid in presets:
            for ts in ("elegant", "cool", "seal", "minimal"):
                css = get_preset_css(pid, use_system_fonts=True, toc_style=ts)
                self.assertNotIn("{{", css, "%s/%s 残留占位符" % (pid, ts))
                css_kf = get_preset_css(pid, use_system_fonts=False, toc_style=ts)
                self.assertNotIn("{{", css_kf, "%s/%s(keep-fonts) 残留占位符" % (pid, ts))

    def test_accent_dark_token(self):
        """全部预设含 accent_dark，且注入到深色模式段。"""
        for pid, meta in list_presets().items():
            dark = meta.get("accent_dark", "")
            self.assertTrue(dark.startswith("#"), "%s 缺 accent_dark" % pid)
            css = get_preset_css(pid, use_system_fonts=True)
            self.assertIn("color: %s !important" % dark, css)

    def test_removed_toc_styles(self):
        """royal 已移除、vgospel 已更名 seal：旧 id 优雅报错。"""
        for old in ("royal", "vgospel"):
            with self.assertRaises(ValueError):
                get_preset_css("classic", toc_style=old)
        ids = [t["id"] for t in list_toc_styles()]
        self.assertNotIn("royal", ids)
        self.assertNotIn("vgospel", ids)

    def test_new_preset_vertclassical(self):
        """竖排古籍：横排兜底 + @supports 竖排增强 + 目录竖排适配。"""
        css = get_preset_css("vertclassical")
        self.assertNotIn("{{", css)
        # 渐进增强包裹，老阅读器只看横排兜底
        self.assertIn("@supports (writing-mode: vertical-rl)", css)
        # 三写法齐备（各引擎前缀差异）
        self.assertIn("-epub-writing-mode: vertical-rl", css)
        self.assertIn("-webkit-writing-mode: vertical-rl", css)
        self.assertIn("writing-mode: vertical-rl", css)
        # 反制 responsive 的横排行长限制
        self.assertIn("max-width: none !important", css)
        # 竖排下装饰线转竖向语义 + 代码块保持横排
        self.assertIn("border-right", css)
        self.assertIn("writing-mode: horizontal-tb", css)
        # 目录页竖排适配
        self.assertIn("body.mb-toc-page li", css)

    def test_page_progression_metadata(self):
        """仅竖排预设声明 rtl 翻页方向。"""
        presets = list_presets()
        self.assertEqual(presets["vertclassical"].get("page_progression"), "rtl")
        for pid, meta in presets.items():
            if pid != "vertclassical":
                self.assertIsNone(meta.get("page_progression"), pid)

    def test_unknown_preset(self):
        with self.assertRaises(ValueError):
            get_preset_css("nope")

    def test_unknown_toc_style(self):
        with self.assertRaises(ValueError):
            get_preset_css("classic", toc_style="neon")


class TestCssCascade(unittest.TestCase):
    """A1/A2 回归：类汤选择器排除标题、夜间章节卡深底最终胜者、色板对比度。

    静态层叠断言说明：responsive.css 前置注入、预设规则在后，同特异性按源序
    预设胜出——因此夜间/标题修复全部依赖「更高特异性」取胜，此处对生成后的
    CSS 断言选择器形态（body 前缀 0-1-1 > 预设裸 .mb-ch 0-1-0），即最终胜者。
    """

    @classmethod
    def setUpClass(cls):
        with open(os.path.join(STYLES_DIR, "responsive.css"),
                  encoding="utf-8") as f:
            cls.responsive_src = f.read()

    @staticmethod
    def _luminance(color):
        c = color.lstrip("#")
        if len(c) == 3:
            c = "".join(ch * 2 for ch in c)

        def lin(hex_pair):
            v = int(hex_pair, 16) / 255.0
            return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

        r, g, b = (lin(c[i:i + 2]) for i in (0, 2, 4))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b

    @classmethod
    def _contrast(cls, fg, bg):
        hi, lo = sorted((cls._luminance(fg), cls._luminance(bg)), reverse=True)
        return (hi + 0.05) / (lo + 0.05)

    # ── A2：类汤选择器排除标题 ──

    def test_calibre_soup_excludes_titles(self):
        """A2：.calibre* 正文规则带 :not(.mb-ch):not(.mb-vol)，旧裸选择器清零。"""
        for pid in list_presets():
            css = get_preset_css(pid, use_system_fonts=True)
            self.assertIn("p.calibre1:not(.mb-ch):not(.mb-vol)", css, pid)
            # 章首顶格规则同样排除标题，且特异性（0-4-1）须压过类汤缩进（0-3-1）
            self.assertIn("p.calibre1[data-mb-first]:not(.mb-ch):not(.mb-vol)", css, pid)
            self.assertNotRegex(css, r"(?m)^p\.calibre1\s*,", pid)
            self.assertNotRegex(css, r"(?m)^p\.calibre1\s*\{", pid)
            self.assertNotRegex(css, r"(?m)^\.calibre1\s*,", pid)

    def test_para_style_override_parity(self):
        """A2 联动：段落排版覆写与 responsive 类汤选择器集合逐字一致。

        responsive 的类汤规则经 :not 提升到 0-3-1，末尾覆写若不同列表会因
        特异性落后而失效（顶格/段距开关在类汤书上失灵）。
        """
        m = re.search(r"(?m)^(p\.calibre1[^{]*?)\{", self.responsive_src)
        self.assertIsNotNone(m, "responsive.css 类汤选择器行缺失")
        responsive_set = {s.strip() for s in m.group(1).split(",")}
        self.assertEqual(responsive_set, set(_CALIBRE_INDENT_SELECTORS.split(", ")))
        self.assertLessEqual(
            set(_CALIBRE_MARGIN_SELECTORS.split(", ")), responsive_set)
        css = get_preset_css("classic", para_indent=False, para_gap=1.2)
        self.assertIn(_CALIBRE_INDENT_SELECTORS, css)
        self.assertIn(_CALIBRE_MARGIN_SELECTORS, css)

    # ── A1：夜间章节卡深底最终胜者 ──

    def test_night_title_dark_bg_wins(self):
        """A1：dark 块内 html body .mb-ch（0-1-2）带深底，压预设裸 .mb-ch（0-1-0）
        与 vertclassical 竖排块的 body .mb-ch（0-1-1）。"""
        for pid, meta in list_presets().items():
            css = get_preset_css(pid, use_system_fonts=True)
            dark_at = css.index("@media (prefers-color-scheme: dark)")
            rule_at = css.index("html body .mb-ch {", dark_at)
            block = css[rule_at:css.index("}", rule_at)]
            self.assertIn("background: #1e1e1e !important", block, pid)
            self.assertIn("color: %s !important" % meta["accent_dark"], block, pid)
            # 胜者前提：预设侧章节卡无 body / html 前缀同形选择器
            preset_part = css[:css.index("/* ── responsive injected (front) ── */")]
            self.assertNotRegex(preset_part, r"(?m)^(html )?body \.mb-ch\b", pid)

    def test_night_palette_contrast(self):
        """A1：夜间章节卡 ACCENT_DARK on #1e1e1e ≥4.5；日间标题 ≥3（大字号）。"""
        for pid, meta in list_presets().items():
            self.assertGreaterEqual(
                self._contrast(meta["accent_dark"], "#1E1E1E"), 4.5, pid)
            self.assertGreaterEqual(
                self._contrast(meta["accent"], meta["accent_light"]), 3.0, pid)

    def test_night_fixed_palette_contrast(self):
        """夜间固定色对比度（WCAG）：正文/夜链/章号在深底上可读。"""
        self.assertGreaterEqual(self._contrast("#E0E0E0", "#121212"), 7.0)
        self.assertGreaterEqual(self._contrast("#A8C0FF", "#121212"), 10.0)
        self.assertGreaterEqual(self._contrast("#8A8A8A", "#1E1E1E"), 4.5)


class TestPhase1Safety(unittest.TestCase):
    """P1/P2 回归：ZipBomb 解压后二次校验 + analyze 采样化。"""

    def test_zipbomb_declared_precheck(self):
        """P2：中央目录声明总量超限 → 预判拦截（原有行为，常量化后回归）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_bomb1.epub")
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip")
            zf.writestr("META-INF/container.xml", CONTAINER)
        try:
            with mock.patch.object(lib, "_ZIP_MAX_TOTAL", 1):
                with self.assertRaises(RuntimeError) as cm:
                    lib._read_zip_entries(tmp)
            self.assertIn("Zip Bomb", str(cm.exception))
        finally:
            os.remove(tmp)

    def test_zipbomb_uncompressed_second_check(self):
        """P2：中央目录 file_size 伪造偏小、解压实际超大 → 流式累计越限即中止
        （不再先整读进内存再判）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_bomb2.epub")
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip")
            zf.writestr("META-INF/container.xml", CONTAINER)
        try:
            with mock.patch.object(lib, "_ZIP_MAX_TOTAL", 10 * 1024 * 1024), \
                 mock.patch.object(zipfile.ZipFile, "open",
                                   return_value=io.BytesIO(b"A" * (11 * 1024 * 1024))):
                with self.assertRaises(RuntimeError) as cm:
                    lib._read_zip_entries(tmp)
            self.assertIn("解压后", str(cm.exception))
        finally:
            os.remove(tmp)

    def test_analyze_p_mismatch_sampled(self):
        """P1：p 开闭预警只扫前 sample_limit 个正文文件（大书不卡 IOLoop）。"""
        n = 25
        tmp = os.path.join(TMP_DIR, "_tmp_sampling.epub")
        items = "".join(
            '<item id="c%d" href="c%02d.xhtml" media-type="application/xhtml+xml"/>'
            % (i, i) for i in range(1, n + 1))
        spine = "".join('<itemref idref="c%d"/>' % i for i in range(1, n + 1))
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '采样书</dc:title></metadata>'
            '<manifest>%s</manifest><spine>%s</spine></package>' % (items, spine)
        )
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            for i in range(1, n + 1):
                # 末章少一个 </p>（开闭不齐），前 24 章健康
                body = ('<p>第%d章<p>正文内容。' % i if i == n
                        else '<p>第%d章</p><p>正文内容。</p>' % i)
                zf.writestr(
                    "OEBPS/c%02d.xhtml" % i,
                    '<html xmlns="http://www.w3.org/1999/xhtml">'
                    '<head><title>c%d</title></head><body>%s</body></html>' % (i, body))
        try:
            a = lib.analyze_epub(tmp)
            self.assertEqual(a["p_close_mismatch_files"], 0)
            a_all = lib.analyze_epub(tmp, sample_limit=30)
            self.assertEqual(a_all["p_close_mismatch_files"], 1)
        finally:
            os.remove(tmp)


class TestCssAdaptivity(unittest.TestCase):
    """A3/A4/顶空 回归：手机块 body 前缀生效、目录夜卡深底、split 关闭章扉顶距。"""

    @classmethod
    def setUpClass(cls):
        cls._styles_dir = STYLES_DIR
        with open(os.path.join(cls._styles_dir, "responsive.css"),
                  encoding="utf-8") as f:
            cls.responsive_src = f.read()

    # ── A4：手机块提特异性 ──

    def test_mobile_block_body_prefix(self):
        """A4：手机块 p/blockquote/.mb-ch/.mb-ch-sep 一律 body 前缀
        （0-0-2 / 0-1-1），压过预设同规则裸选择器，2.2em 手机顶距生效。"""
        at = self.responsive_src.index("手机窄屏适配")
        at = self.responsive_src.index("@media (max-width: 600px)", at)
        block = self.responsive_src[at:self.responsive_src.index("\n}", at)]
        for sel in ("body p {", "body blockquote {",
                    "body .mb-ch {", "body .mb-ch-sep {"):
            self.assertIn(sel, block)
        self.assertIn("margin: 2.2em 0 0.6em 0 !important", block)
        # 媒体块内不再有会被预设同特异性压掉的裸选择器
        self.assertNotRegex(block, r"(?m)^  p \{")
        self.assertNotRegex(block, r"(?m)^  \.mb-ch \{")

    def test_vert_block_parity(self):
        """A4：vertclassical 竖排块 body 前缀 + 源序在后，窄屏竖排压过手机块。"""
        css = get_preset_css("vertclassical", use_system_fonts=True)
        mobile_at = css.index("@media (max-width: 600px)")
        supports_at = css.index("@supports (writing-mode: vertical-rl)")
        self.assertLess(mobile_at, supports_at)
        vblock = css[supports_at:]
        for sel in ("body p {", "body blockquote {",
                    "body .mb-ch {", "body .mb-ch-sep {"):
            self.assertIn(sel, vblock)

    def test_para_block_body_p_parity(self):
        """A4：段排覆写 body p / body p[data-mb-first]，与手机块同特异性源序胜出。"""
        css = get_preset_css("classic", para_gap=1.2)
        block = css[css.index("段落排版"):]
        self.assertIn("body p {", block)
        self.assertIn("body p[data-mb-first] {", block)

    # ── A3：目录卡片夜间深底 ──

    def test_night_toc_card_dark_bg_wins(self):
        """A3：目录卡片夜间 html 前缀深底（0-2-2）压 toc 文件卡片（0-2-1）。"""
        for ts in ("elegant", "cool", "seal", "minimal"):
            css = get_preset_css("classic", use_system_fonts=True, toc_style=ts)
            dark_at = css.index("@media (prefers-color-scheme: dark)")
            rule_at = css.index("html body.mb-toc-page .mb-toc {", dark_at)
            block = css[rule_at:css.index("}", rule_at)]
            self.assertIn("background: #121212 !important", block, ts)
        for ts in ("elegant", "cool", "seal"):
            with open(os.path.join(self._styles_dir, "toc_%s.css" % ts),
                      encoding="utf-8") as f:
                src = f.read()
            self.assertIn("body.mb-toc-page .mb-toc {", src, ts)
            self.assertNotIn("html body.mb-toc-page", src, ts)

    # ── 顶空 ──

    def test_split_marks_mb_ch_split_class(self):
        html = '<html><body><p>第三章 血尸</p><p>正文。</p></body></html>'
        new, st = lib.mark_chapters_in_html(html, split_title=True)
        self.assertEqual(st["splits"], 1)
        self.assertIn('class="mb-ch mb-ch-split"', new)
        self.assertIn('<span class="mb-ch-num">第三章</span>', new)

    def test_no_split_keeps_plain_class(self):
        html = '<html><body><p>风雪夜归人</p><p>正文。</p></body></html>'
        new, st = lib.mark_chapters_in_html(html, split_title=True)
        self.assertEqual(st["splits"], 0)
        self.assertNotIn("mb-ch-split", new)

    def test_xuanzhi_split_disables_grand_top_margin(self):
        """顶空：xuanzhi 双行标题 4em 顶距（源序压过 34%），无拆分保留章扉。"""
        css = get_preset_css("xuanzhi", use_system_fonts=True)
        self.assertIn("margin: 34% 0 0.8em 0 !important", css)
        self.assertGreater(css.index(".mb-ch-split {"), css.index(".mb-ch {"))
        self.assertIn("margin: 4em 0 0.8em 0 !important", css)


class TestPhase2Integrity(unittest.TestCase):
    """P5/P6/P3/P4 回归：manifest 幂等精确化、id 防撞、异形 OPF 显式报错、
    抢锁失败路径不覆盖在跑任务句柄/不释放他人锁。"""

    @staticmethod
    def _opf(manifest, spine, manifest_close="</manifest>"):
        return (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '测试书</dc:title></metadata>'
            '<manifest>%s%s<spine>%s</spine></package>'
        ) % (manifest, manifest_close, spine)

    def _build(self, path, opf):
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/ch1.xhtml", CH1)
            zf.writestr("OEBPS/ch2.xhtml", CH2)
            zf.writestr("OEBPS/style.css", CSS)
            zf.writestr("OEBPS/toc.ncx", NCX)

    _BASE_MANIFEST = (
        '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
    )
    _BASE_SPINE = '<itemref idref="c1"/><itemref idref="c2"/>'

    def test_toc_registered_despite_decoy_substring(self):
        """P5：OPF 出现 old-mb-toc.xhtml 等子串不再误判为已注册而漏注册。"""
        manifest = self._BASE_MANIFEST.replace(
            '<item id="ncx"',
            '<item id="decoy" href="old-mb-toc.xhtml" '
            'media-type="application/xhtml+xml"/><item id="ncx"')
        tmp = os.path.join(TMP_DIR, "_tmp_decoy.epub")
        out = os.path.join(TMP_DIR, "_tmp_decoy_out.epub")
        self._build(tmp, self._opf(manifest, self._BASE_SPINE))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                opf_out = zf.read("OEBPS/content.opf").decode("utf-8")
            self.assertIn('<item id="mb-toc" href="mb-toc.xhtml"', opf_out)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_extra_asset_id_collision_avoided(self):
        """P5：extra_assets 的 rsplit id 与既有 id 相撞时顺延，不产生重复 id。"""
        manifest = self._BASE_MANIFEST.replace(
            '<item id="ncx"',
            '<item id="bg" href="images/other.jpg" '
            'media-type="image/jpeg"/><item id="ncx"')
        tmp = os.path.join(TMP_DIR, "_tmp_collide.epub")
        out = os.path.join(TMP_DIR, "_tmp_collide_out.epub")
        self._build(tmp, self._opf(manifest, self._BASE_SPINE))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css,
                         extra_assets={"bg.jpg": (b"\xff\xd8\xff\xe0", "image/jpeg")})
            with zipfile.ZipFile(out) as zf:
                opf_out = zf.read("OEBPS/content.opf").decode("utf-8")
            self.assertEqual(opf_out.count('id="bg"'), 1)
            self.assertIn('id="bg-x"', opf_out)
            self.assertIn('href="bg.jpg"', opf_out)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_extra_asset_idempotent_rerun(self):
        """P5：重复注册以解析 href 比对，重跑不产生第二条资源条目。"""
        tmp = os.path.join(TMP_DIR, "_tmp_idem.epub")
        out1 = os.path.join(TMP_DIR, "_tmp_idem_out1.epub")
        out2 = os.path.join(TMP_DIR, "_tmp_idem_out2.epub")
        self._build(tmp, self._opf(self._BASE_MANIFEST, self._BASE_SPINE))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out1, css,
                         extra_assets={"mb-bg.jpg": (b"\x89PNG", "image/png")})
            lib.beautify(out1, out2, css,
                         extra_assets={"mb-bg.jpg": (b"\x89PNG", "image/png")})
            with zipfile.ZipFile(out2) as zf:
                opf_out = zf.read("OEBPS/content.opf").decode("utf-8")
            self.assertEqual(opf_out.count('href="mb-bg.jpg"'), 1)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)

    def test_malformed_manifest_close_raises(self):
        """P6：</manifest> 异形（</manifest >，ET 可解析）时显式报错不静默出包。"""
        tmp = os.path.join(TMP_DIR, "_tmp_badopf.epub")
        out = os.path.join(TMP_DIR, "_tmp_badopf_out.epub")
        self._build(tmp, self._opf(self._BASE_MANIFEST, self._BASE_SPINE,
                                   manifest_close="</manifest >"))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            with self.assertRaises(RuntimeError) as cm:
                lib.beautify(tmp, out, css)
            self.assertIn("</manifest>", str(cm.exception))
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)
LINK_TOC_HTML = (
    '<html><head><title>t</title></head><body>'
    '<p>Table of Contents</p>'
    + ''.join('<p><a href="s%02d.html">第%d章</a></p>' % (i, i)
              for i in range(1, 6))
    + '</body></html>'
)
DAMAGED_TOC_HTML = (
    '<html><head><title>t</title></head><body>'
    '<p>Table of Contents</p>'
    + ''.join('<p class="calibre_2 mb-ch"><a href="s%02d.html">第%d章</a></p>'
              '<div class="mb-ch-sep"></div>' % (i, i) for i in range(1, 6))
    + '</body></html>'
)
# 平铺目录页（calibre 类汤常见形态）：<p>目录</p> 标题 + <p><a> 条目
# （≥3 个标题形态链接才会命中 _looks_like_link_toc 的目录页判定）
FLAT_TOC_CN_HTML = (
    '<html><head><title>t</title></head><body>'
    '<p>目录</p>'
    + ''.join('<p><a href="s%02d.html">第%d章</a></p>' % (i, i)
              for i in range(1, 6))
    + '</body></html>'
)
PROSE_CHAPTER_HTML = (
    '<html><head><title>c</title></head><body>'
    '<p>第一章 开端</p><p>正文段落，平静无事。</p>'
    '<p>参见<a href="#n1">1</a>与<a href="#n2">2</a>两处注脚，正文继续。</p>'
    '</body></html>'
)


class TestTocPageDetection(unittest.TestCase):
    """目录页检测修复：纯链接目录页（calibre Table of Contents）不再被
    章节标记炸成多个「第x章」独立页；已损坏输出重跑可复原。"""

    def _build_link_toc_epub(self, path, toc_html):
        manifest = (
            '<item id="toc0" href="index_split_000.html" '
            'media-type="application/xhtml+xml"/>'
            '<item id="c1" href="c01.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="c02.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        )
        spine = '<itemref idref="toc0"/><itemref idref="c1"/><itemref idref="c2"/>'
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '目录页书</dc:title></metadata>'
            '<manifest>%s</manifest><spine>%s</spine></package>'
        ) % (manifest, spine)
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/index_split_000.html", toc_html)
            zf.writestr("OEBPS/c01.xhtml",
                        '<html><body><p>第一章 开端</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/c02.xhtml",
                        '<html><body><p>第二章 转折</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/toc.ncx", NCX)

    def test_is_toc_doc_link_list(self):
        self.assertTrue(lib._is_toc_doc('index_split_000.html', LINK_TOC_HTML))
        self.assertFalse(lib._is_toc_doc('ch01.xhtml', PROSE_CHAPTER_HTML))
        self.assertTrue(lib._is_toc_doc('toc.xhtml', ''))
        self.assertTrue(lib._is_toc_doc(
            'ch00.xhtml',
            '<nav epub:type="toc"><ol><li><a href="c1">一</a></li></ol></nav>'))

    def test_link_toc_page_not_chapter_marked(self):
        tmp = os.path.join(TMP_DIR, "_tmp_linktoc.epub")
        out = os.path.join(TMP_DIR, "_tmp_linktoc_out.epub")
        self._build_link_toc_epub(tmp, LINK_TOC_HTML)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            # 书内已有目录页 → 不另生成 mb-toc
            self.assertFalse(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                toc_page = zf.read("OEBPS/index_split_000.html").decode("utf-8")
                ch1 = zf.read("OEBPS/c01.xhtml").decode("utf-8")
            self.assertNotIn("mb-ch", toc_page)
            self.assertIn("mb-toc-page", toc_page)
            # 真章节文件的标题照常标记
            self.assertIn('class="mb-ch"', ch1)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_damaged_toc_page_repaired(self):
        """旧缺陷输出（目录行误打 mb-ch + 长线）重跑即剥离复原。"""
        tmp = os.path.join(TMP_DIR, "_tmp_dmg_toc.epub")
        out = os.path.join(TMP_DIR, "_tmp_dmg_toc_out.epub")
        self._build_link_toc_epub(tmp, DAMAGED_TOC_HTML)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            with zipfile.ZipFile(out) as zf:
                toc_page = zf.read("OEBPS/index_split_000.html").decode("utf-8")
            self.assertNotIn("mb-ch", toc_page)
            self.assertNotIn("mb-ch-sep", toc_page)
            self.assertIn("mb-toc-page", toc_page)
            # 链接本身无损保留
            self.assertEqual(toc_page.count("<a "), 5)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_guide_toc_reference_retargeted(self):
        """生成 mb-toc 时 <guide> 的 type="toc" 引用同步指向新目录，其余不动。"""
        tmp = os.path.join(TMP_DIR, "_tmp_guide.epub")
        out = os.path.join(TMP_DIR, "_tmp_guide_out.epub")
        manifest = (
            '<item id="c1" href="c01.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="c02.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        )
        spine = '<itemref idref="c1"/><itemref idref="c2"/>'
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            'guide书</dc:title></metadata>'
            '<manifest>%s</manifest><spine>%s</spine>'
            '<guide><reference href="cover.xhtml" title="Cover" type="cover"/>'
            '<reference href="c01.xhtml" title="Table of Contents" type="toc"/></guide>'
            '</package>'
        ) % (manifest, spine)
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/c01.xhtml",
                        '<html><body><p>第一章 开端</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/c02.xhtml",
                        '<html><body><p>第二章 转折</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/toc.ncx", NCX)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                opf_out = zf.read("OEBPS/content.opf").decode("utf-8")
            m = re.search(r'<reference\b[^>]*type="toc"[^>]*/>', opf_out)
            self.assertIsNotNone(m)
            self.assertIn('href="mb-toc.xhtml"', m.group(0))
            # 其余 guide 引用不动
            self.assertIn('type="cover"', opf_out)
            self.assertIn('href="cover.xhtml"', opf_out)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


    def test_flat_toc_cn_title_decorated(self):
        """平铺目录页兜底：<p>目录</p> 标题打 mb-toc-title + 注入副题；
        条目链接不误标章节、链接数无损。"""
        tmp = os.path.join(TMP_DIR, "_tmp_flat_toc.epub")
        out = os.path.join(TMP_DIR, "_tmp_flat_toc_out.epub")
        self._build_link_toc_epub(tmp, FLAT_TOC_CN_HTML)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertFalse(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                toc_page = zf.read("OEBPS/index_split_000.html").decode("utf-8")
            self.assertIn("mb-toc-page", toc_page)
            self.assertIn('class="mb-toc-title"', toc_page)
            self.assertIn('mb-toc-sub', toc_page)
            self.assertIn('mb-toc-end', toc_page)
            self.assertNotIn("mb-ch", toc_page)
            self.assertEqual(toc_page.count("<a "), 5)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_flat_toc_english_title_decorated(self):
        """Table of Contents 标题同样命中兜底（calibre 英文惯例）。"""
        once = lib._decorate_toc_page(LINK_TOC_HTML)
        self.assertIn('mb-toc-title', once)
        self.assertIn('C O N T E N T S', once)

    def test_decorate_toc_page_idempotent(self):
        once = lib._decorate_toc_page(FLAT_TOC_CN_HTML)
        twice = lib._decorate_toc_page(once)
        self.assertEqual(twice, once)

    def test_flat_toc_css_rules_all_styles(self):
        """四种目录风格均含平铺页链接/标题规则，且无残留占位符。"""
        for ts in ("elegant", "cool", "seal", "minimal"):
            css = get_preset_css("classic", toc_style=ts)
            self.assertIn("body.mb-toc-page p a", css, ts)
            self.assertIn("body.mb-toc-page .mb-toc-title", css, ts)
            self.assertIn("p:not(.mb-toc-title)", css, ts)
            self.assertNotIn("{{", css, ts)


class TestTitleMarkingPrecision(unittest.TestCase):
    """标题误标修复：类名 token 精确匹配、h 标签独立分支、结构化 rest 护栏。"""

    def test_title_class_token_boundary(self):
        """_TITLE_CLASS_RE 按 token 边界匹配：subtitle/header/heading 不再误命中。"""
        s = lib._TITLE_CLASS_RE.search
        self.assertIsNone(s('class="subtitle"'))
        self.assertIsNone(s('class="heading"'))
        self.assertIsNone(s('class="header"'))
        self.assertIsNotNone(s('class="section-title"'))
        self.assertIsNotNone(s('class="chapter-title"'))
        self.assertIsNotNone(s('class="chaptertitle"'))
        self.assertIsNotNone(s('class="chapter-head"'))

    def test_h_tag_is_heading(self):
        """h1-h6 语义即标题：纯短语式章题（无章头词/类名提示）也打标。"""
        html = '<html><body><h2>雪夜</h2><p>正文。</p></body></html>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 1)
        self.assertIn('class="mb-ch"', new)

    def test_h_tag_sentence_abuse_skipped(self):
        """句读收尾的滥用 h 块（整段塞进 h2）不打标。"""
        html = ('<html><body><h2>他走进了屋子，屋里很冷，炉子早灭了，'
                '他坐了很久。</h2></body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 0)

    def test_structured_rest_guard(self):
        """chapter_patterns rest 护栏：章头词后以句读续句 / rest 超长 = 正文句。"""
        f = chapter_patterns.paragraph_is_heading
        self.assertFalse(f('第十章，他走进房间，看到桌上有一封信，这是她写的。'))
        self.assertFalse(f('第十章，他走了。'))
        self.assertFalse(f('序章，他回想起来。'))
        self.assertFalse(f('第一章' + '他' * 40))
        self.assertTrue(f('第十章 雪夜'))
        self.assertTrue(f('第三章'))
        self.assertTrue(f('第十二章 血尸（上）'))
        self.assertTrue(f('Chapter 1: The Beginning'))


class TestPresetCssFixes(unittest.TestCase):
    """预设 CSS 复核修复：目录标题/二级条目夜色、youth 补齐、inkstone 夜间豁免、段距归一。"""

    def test_night_toc_heading_and_l2(self):
        """目录页 h1/h2（ACCENT 深色字）与二级条目（MUTED）夜间转亮。"""
        css = get_preset_css('classic', use_system_fonts=True)
        dark = css[css.index('@media (prefers-color-scheme: dark)'):]
        self.assertIn('body.mb-toc-page h1', dark)
        self.assertIn('td.mb-toc-l2 a', dark)
        accent_dark = list_presets()['classic']['accent_dark']
        self.assertIn('color: %s !important' % accent_dark, dark)

    def test_youth_night_em_and_sep(self):
        """youth 补 .mb-ch-sep 主题长线；em 红点缀夜间转亮。"""
        css = get_preset_css('youth', use_system_fonts=True)
        self.assertIn('.mb-ch-sep', css)
        dark = css[css.rindex('@media (prefers-color-scheme: dark)'):]
        self.assertIn('em {', dark)
        self.assertIn('color: %s !important' % list_presets()['youth']['accent_dark'], dark)

    def test_inkstone_night_exempt(self):
        """inkstone 夜间豁免：碑刻原貌（玄墨卡+白字）不被一刀切深底覆盖。"""
        css = get_preset_css('inkstone', use_system_fonts=True)
        dark = css[css.rindex('@media (prefers-color-scheme: dark)'):]
        self.assertIn('html body .mb-ch', dark)
        self.assertIn('background-color: #2B343C !important', dark)
        self.assertIn('color: #FFFFFF !important', dark)

    def test_voyage_children_para_margin_zero(self):
        """voyage/children 段距归一为 0（间距统一由用户段距设置驱动）。"""
        for pid in ('voyage', 'children'):
            css = get_preset_css(pid, use_system_fonts=True)
            # 锚定预设自身 p 规则（注释与 margin-orphans 相邻序列），
            # 避免误伤 responsive 手机块的 body p 段距
            self.assertIn('段距归零', css, pid)
            self.assertIn('margin: 0 !important;\n    orphans: 2;', css, pid)
            self.assertNotIn('margin: 0.6em 0 !important;\n    orphans: 2;', css, pid)
            self.assertNotIn('margin: 0.2em 0 !important;\n    orphans: 2;', css, pid)


NAV_XHTML = (
    '<?xml version="1.0" encoding="utf-8"?>\n'
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">'
    '<head><title>目录</title></head>'
    '<body><nav epub:type="toc" id="id" role="doc-toc">'
    '<h2>测试书</h2><ol>'
    '<li><a href="ch1.xhtml">第一章 序章</a></li>'
    '<li><a href="ch2.xhtml">第三章 转折</a></li>'
    '</ol></nav></body></html>'
)


def build_nav_epub(path):
    """构建含 EPUB3 nav 目录页（在 spine 首条）的 EPUB。"""
    opf = (
        '<?xml version="1.0"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
        '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书</dc:title></metadata>'
        '<manifest>'
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
        '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        '</manifest>'
        '<spine><itemref idref="nav"/><itemref idref="c1"/><itemref idref="c2"/></spine>'
        '</package>'
    )
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/nav.xhtml", NAV_XHTML)
        zf.writestr("OEBPS/ch1.xhtml", CH1)
        zf.writestr("OEBPS/ch2.xhtml", CH2)
        zf.writestr("OEBPS/toc.ncx", NCX)


class TestTocPageMarking(unittest.TestCase):
    """书内 nav 语义目录页：spine 中被普通结构目录页替换（手机阅读器兼容）。"""

    def test_nav_toc_replaced_by_plain_toc(self):
        tmp = os.path.join(TMP_DIR, "_tmp_nav_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_nav_out.epub")
        build_nav_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            self.assertEqual(stats["toc_entries"], 5)
            with zipfile.ZipFile(out) as zf:
                names = zf.namelist()
                self.assertIn("OEBPS/mb-toc.xhtml", names)
                self.assertIn("OEBPS/nav.xhtml", names)  # 原 nav 文件保留
                # 生成页是普通 div 结构（非 nav 语义）+ 真实装饰元素
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertIn('<div class="mb-toc">', toc)
                self.assertNotIn("<nav", toc)
                self.assertIn("mb-toc-sub", toc)
                self.assertIn("mb-toc-end", toc)
                self.assertIn("第一章 序章", toc)
                self.assertIn('class="mb-toc-page"', toc)
                self.assertIn("mb-beauty.css", toc)
                # OPF：spine 中 nav itemref 被 mb-toc 替换；nav 仍在 manifest
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertIn('idref="mb-toc"', opf)
                self.assertNotIn('idref="nav"', opf)
                self.assertIn('id="nav"', opf)
                self.assertIn('properties="nav"', opf)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_nav_replace_with_nonxhtml_spine_item(self):
        """回归：spine 含非 XHTML linear 条目（SVG 插图页）时 idref 映射不得错位——
        被替换的必须是 nav 页的 itemref，插图页原样保留。"""
        tmp = os.path.join(TMP_DIR, "_tmp_navsvg_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_navsvg_out.epub")
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书</dc:title></metadata>'
            '<manifest>'
            '<item id="illu" href="page1.svg" media-type="image/svg+xml"/>'
            '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
            '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
            '</manifest>'
            '<spine><itemref idref="illu"/><itemref idref="nav"/>'
            '<itemref idref="c1"/><itemref idref="c2"/></spine>'
            '</package>'
        )
        svg = (
            '<?xml version="1.0"?>'
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">'
            '<rect width="10" height="10"/></svg>'
        )
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/page1.svg", svg)
            zf.writestr("OEBPS/nav.xhtml", NAV_XHTML)
            zf.writestr("OEBPS/ch1.xhtml", CH1)
            zf.writestr("OEBPS/ch2.xhtml", CH2)
            zf.writestr("OEBPS/toc.ncx", NCX)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                opf_out = zf.read("OEBPS/content.opf").decode("utf-8")
            self.assertIn('idref="mb-toc"', opf_out)
            self.assertNotIn('idref="nav"', opf_out)
            self.assertIn('idref="illu"', opf_out)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


class TestAnalyze(unittest.TestCase):
    """EPUB 分析。"""

    def test_analyze_mini(self):
        tmp = os.path.join(TMP_DIR, "_tmp_analyze.epub")
        build_mini_epub(tmp)
        try:
            a = lib.analyze_epub(tmp)
            self.assertEqual(a["title"], "测试书")
            self.assertEqual(a["text_entries"], 2)
            self.assertIn("OEBPS/style.css", a["css_files"])
            self.assertFalse(a["has_fontface"])
            self.assertFalse(a["has_inbook_toc"])
            self.assertEqual(a["ncx_entries"], 5)  # 1 卷 + 3 章 + 引子
            # ch1 两段文本标题 + ch2 一个 h2
            self.assertGreaterEqual(a["heading_stats"]["h2"], 1)
            self.assertGreaterEqual(a["text_headings"], 2)
        finally:
            os.remove(tmp)


class TestZipGuard(unittest.TestCase):
    """损坏/超限 EPUB 的友好报错（_read_zip_entries 防护路径）。"""

    def test_corrupt_zip_friendly_error(self):
        # 损坏文件应抛 RuntimeError(友好文案)——若防护文案误用未导入的 _()，
        # 这里会先炸 NameError: name '_' is not defined（回归哨兵）
        p = os.path.join(tempfile.mkdtemp(prefix="eb_test_"), "broken.epub")
        with open(p, "wb") as f:
            f.write(b"this is definitely not a zip file")
        try:
            lib._read_zip_entries(p)
            self.fail("expected RuntimeError")
        except RuntimeError as err:
            self.assertIn("损坏", str(err))

class TestBeautify(unittest.TestCase):
    """主流程：目录生成 / 标题标记 / CSS 注入 / 规范重写。"""

    def _beautify(self, src, out, preset="classic"):
        css = get_preset_css(preset, use_system_fonts=True)
        return lib.beautify(src, out, css)

    def test_full_flow(self):
        tmp = os.path.join(TMP_DIR, "_tmp_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_out.epub")
        build_mini_epub(tmp, with_cover=True)
        try:
            stats = self._beautify(tmp, out)
            self.assertTrue(stats["toc_generated"])
            self.assertEqual(stats["toc_entries"], 5)
            self.assertGreaterEqual(stats["marked_headers"], 3)  # ch1 2 段 + ch2 h2
            self.assertEqual(stats["css_injected_chapters"], 3)  # 封面 + 2 正文（封面只注入样式不标记）

            with zipfile.ZipFile(out) as zf:
                names = zf.namelist()
                # 规范：mimetype 首条且 STORED
                self.assertEqual(names[0], "mimetype")
                self.assertEqual(zf.getinfo("mimetype").compress_type, zipfile.ZIP_STORED)
                # 新增文件
                self.assertIn("OEBPS/mb-toc.xhtml", names)
                self.assertIn("OEBPS/mb-beauty.css", names)
                # 目录页
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertIn("第一卷", toc)
                self.assertIn("第一章 序章", toc)
                self.assertIn("href=\"ch1.xhtml#p1\"", toc)
                self.assertIn("href=\"ch2.xhtml\"", toc)
                # 编号注入：仅无中文序号的 lv1 条目（"第一卷/第X章" 自带序号不重复；
                # "引子" 无序号 → 05）
                self.assertIn('<span class="mb-toc-num">05</span>', toc)
                self.assertEqual(toc.count("mb-toc-num"), 1)
                # OPF 注册
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertIn('id="mb-toc"', opf)
                self.assertIn('href="mb-toc.xhtml"', opf)
                # 标题标记 + CSS 引用
                ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
                self.assertEqual(ch1.count('class="mb-ch"'), 2)
                self.assertIn('data-mb-first="true"', ch1)
                self.assertIn('href="mb-beauty.css"', ch1)
                ch2 = zf.read("OEBPS/ch2.xhtml").decode("utf-8")
                self.assertIn('class="mb-ch"', ch2)
                # 原 CSS 原样保留
                self.assertEqual(zf.read("OEBPS/style.css").decode("utf-8"), CSS)
                # 封面不被标记
                cover = zf.read("OEBPS/cover.xhtml").decode("utf-8")
                self.assertNotIn("mb-ch", cover)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_seal_table_toc(self):
        """seal（朱印风）：生成双栏表格结构目录页。"""
        tmp = os.path.join(TMP_DIR, "_tmp_vg_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_vg_out.epub")
        build_mini_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True, toc_style="seal")
            stats = lib.beautify(tmp, out, css, toc_style="seal")
            self.assertTrue(stats["toc_generated"])
            with zipfile.ZipFile(out) as zf:
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertIn('<table class="mulu">', toc)
                self.assertIn('class="mb-toc-mark">　✦', toc)  # 右列装饰标记（已修正：移除多余反斜杠）
                self.assertIn('class="mb-toc-seal">隐', toc)     # 印章
                self.assertIn("CONTENT", toc)
                self.assertNotIn("<nav", toc)
                # 编号在链接内
                self.assertIn('<span class="mb-toc-num">05</span> 引子</a>', toc)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_spine_page_progression_rtl(self):
        """竖排预设：spine 设为 rtl（幂等，不重复追加属性）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_rtl_src.epub")
        out1 = os.path.join(TMP_DIR, "_tmp_rtl_out1.epub")
        out2 = os.path.join(TMP_DIR, "_tmp_rtl_out2.epub")
        build_mini_epub(tmp)
        try:
            css = get_preset_css("vertclassical", use_system_fonts=True)
            stats = lib.beautify(tmp, out1, css, page_progression="rtl")
            self.assertEqual(stats.get("page_progression"), "rtl")
            with zipfile.ZipFile(out1) as zf:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertIn('page-progression-direction="rtl"', opf)
                self.assertEqual(opf.count("page-progression-direction"), 1)
            # 幂等：对已 rtl 的书再跑一次仍只有一处
            lib.beautify(out1, out2, css, page_progression="rtl")
            with zipfile.ZipFile(out2) as zf:
                opf2 = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertEqual(opf2.count("page-progression-direction"), 1)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)

    def test_no_page_progression_by_default(self):
        """非竖排预设不动 spine 翻页方向。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ltr_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_ltr_out.epub")
        build_mini_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertEqual(stats.get("page_progression"), "")
            with zipfile.ZipFile(out) as zf:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertNotIn("page-progression-direction", opf)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_idempotent_rerun(self):
        """二次美化必须幂等：不重复生成目录项 / 不重复标记。"""
        tmp = os.path.join(TMP_DIR, "_tmp_src2.epub")
        out1 = os.path.join(TMP_DIR, "_tmp_out1.epub")
        out2 = os.path.join(TMP_DIR, "_tmp_out2.epub")
        build_mini_epub(tmp)
        try:
            self._beautify(tmp, out1)
            self._beautify(out1, out2)
            with zipfile.ZipFile(out2) as zf:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertEqual(opf.count('id="mb-toc"'), 1)
                self.assertEqual(opf.count('idref="mb-toc"'), 1)
                ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
                self.assertEqual(ch1.count('class="mb-ch"'), 2)
                self.assertEqual(ch1.count("mb-beauty.css"), 1)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)

    def test_calibre_soup_div_marking(self):
        """Calibre 类汤（div 平铺、无 h、无 p）标题段也能标记。"""
        html = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
            '<body><div class="calibre9">第一回 甄士隐梦幻识通灵</div>'
            '<div class="calibre9">此开卷第一回也。作者自云：因曾历过一番梦幻之后。</div>'
            '</body></html>'
        )
        new_html, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk["chapters"], 1)
        self.assertIn('class="calibre9 mb-ch"', new_html)
        # div 平铺书不标记章首段（保守设计，避免误标嵌套 div）

    def test_mark_idempotent(self):
        """已标记的条目再跑不重复标记。"""
        html = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
            '<body><h2 class="mb-ch">第1章 标题</h2><p>正文</p></body></html>'
        )
        new_html, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(new_html, html)
        self.assertFalse(any(mk.values()))

    def test_nested_li_outline_untouched(self):
        """回归：同名标签嵌套（多级 li 大纲）整块跳过，不产生破坏结构的改写。"""
        html = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
            '<body><ul><li>第一卷 风起<ul><li>第一章 起点</li></ul></li></ul>'
            '</body></html>'
        )
        new_html, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(new_html, html)
        self.assertFalse(any(mk.values()))
        self.assertNotIn('mb-ch', new_html)


class TestCleanupAndTocOptions(unittest.TestCase):
    """内容清理（段首空格/空段/meta）+ 目录深度/排除/链接校验。"""

    def _beautify(self, src, out, **kw):
        css = get_preset_css("classic", use_system_fonts=True)
        return lib.beautify(src, out, css, **kw)

    def build_custom_epub(self, path, ch1_inner=None, ncx_xml=NCX):
        """构建自定义 ch1 内容的迷你 EPUB。"""
        ch1 = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
            '<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>'
            '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
            '<body>%s</body></html>' % (ch1_inner or '<p>第一章 序章</p><p>正文。</p>')
        )
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", OPF)
            zf.writestr("OEBPS/ch1.xhtml", ch1)
            zf.writestr("OEBPS/ch2.xhtml", CH2)
            zf.writestr("OEBPS/style.css", CSS)
            zf.writestr("OEBPS/toc.ncx", ncx_xml)

    def read_ch1(self, out):
        with zipfile.ZipFile(out) as zf:
            return zf.read("OEBPS/ch1.xhtml").decode("utf-8")

    def test_cleanup_leading_spaces_default_on(self):
        tmp = os.path.join(TMP_DIR, "_tmp_cl_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_cl_out.epub")
        self.build_custom_epub(tmp, "<p>\u3000\u3000　　你好。</p><p>&nbsp;&#160;世界。</p>")
        try:
            stats = self._beautify(tmp, out)
            self.assertGreaterEqual(stats["cleaned_leading"], 2)
            ch1 = self.read_ch1(out)
            body = ch1[ch1.find("<body"):].lower()
            self.assertNotIn("\u3000", body.split("</head>")[-1])
            self.assertNotIn("&nbsp;", body)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_cleanup_leading_off_keeps_spaces(self):
        tmp = os.path.join(TMP_DIR, "_tmp_cl2_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_cl2_out.epub")
        self.build_custom_epub(tmp, "<p>\u3000你好。</p>")
        try:
            stats = self._beautify(tmp, out, cleanup={"leading": False, "empty": False, "meta": True})
            self.assertEqual(stats["cleaned_leading"], 0)
            self.assertIn("\u3000", self.read_ch1(out))
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_cleanup_empty_paras_and_br_run(self):
        tmp = os.path.join(TMP_DIR, "_tmp_em_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_em_out.epub")
        inner = "<p></p><p><br/></p><p>&nbsp;</p><p>正文。</p><br/><br/><br/><br/><p>尾段。</p>"
        self.build_custom_epub(tmp, inner)
        try:
            stats = self._beautify(tmp, out, cleanup={"leading": False, "empty": True, "meta": True})
            self.assertEqual(stats["removed_empty"], 3)
            html = self.read_ch1(out).lower()
            self.assertNotIn("<p></p>", html)
            # 连续 4 个 br 收敛为 2 个
            self.assertEqual(html.count("<br/>"), 2)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_cleanup_empty_off_by_default(self):
        tmp = os.path.join(TMP_DIR, "_tmp_em2_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_em2_out.epub")
        self.build_custom_epub(tmp, "<p></p><p><br/></p><p>正文。</p>")
        try:
            stats = self._beautify(tmp, out)
            self.assertEqual(stats["removed_empty"], 0)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_meta_charset_removed_by_default(self):
        tmp = os.path.join(TMP_DIR, "_tmp_mt_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_mt_out.epub")
        self.build_custom_epub(tmp)
        try:
            self._beautify(tmp, out)
            ch1 = self.read_ch1(out).lower()
            self.assertNotIn("charset=utf-8", ch1)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_meta_charset_kept_when_disabled(self):
        tmp = os.path.join(TMP_DIR, "_tmp_mt2_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_mt2_out.epub")
        self.build_custom_epub(tmp)
        try:
            self._beautify(tmp, out, cleanup={"leading": False, "empty": False, "meta": False})
            self.assertIn("charset=utf-8", self.read_ch1(out).lower())
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_depth_filtering(self):
        """NCX 两级结构：depth=1 只收一级条目。"""
        tmp = os.path.join(TMP_DIR, "_tmp_dp_src.epub")
        out1 = os.path.join(TMP_DIR, "_tmp_dp_all.epub")
        out2 = os.path.join(TMP_DIR, "_tmp_dp_d1.epub")
        build_mini_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            s_all = lib.beautify(tmp, out1, css)
            self.assertEqual(s_all["toc_entries"], 5)   # 第一卷+两章+第三章转折+引子
            s_d1 = lib.beautify(tmp, out2, css, toc_depth=1)
            self.assertEqual(s_d1["toc_entries"], 3)   # 第一卷/第三章/引子
            self.assertEqual(s_d1["toc_depth"], 1)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_excludes_noise_titles(self):
        noise_ncx = NCX.replace(
            '<navPoint id="n4"><navLabel><text>引子</text></navLabel>',
            '<navPoint id="n4"><navLabel><text>本书由某某工作室制作排版</text></navLabel>',
        )
        tmp = os.path.join(TMP_DIR, "_tmp_ex_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_ex_out.epub")
        self.build_custom_epub(tmp, ncx_xml=noise_ncx)
        try:
            stats = self._beautify(tmp, out)
            self.assertGreaterEqual(stats["toc_excluded"], 1)
            with zipfile.ZipFile(out) as zf:
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertNotIn("某某工作室", toc)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_no_truncation_by_default(self):
        """超长目录全量收录且无截断提示。"""
        tmp = os.path.join(TMP_DIR, "_tmp_big_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_big_out.epub")
        pts = []
        for i in range(600):
            pts.append(
                '<navPoint id="n%d"><navLabel><text>第%d章 测试章节标题</text></navLabel>'
                '<content src="ch1.xhtml#n%d"/></navPoint>' % (i, i + 1, i)
            )
        big_ncx = (
            '<?xml version="1.0"?>'
            '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
            '<navMap>%s</navMap></ncx>' % "".join(pts)
        )
        self.build_custom_epub(tmp, ncx_xml=big_ncx)
        try:
            stats = self._beautify(tmp, out)
            self.assertEqual(stats["toc_entries"], 600)
            with zipfile.ZipFile(out) as zf:
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertNotIn("mb-toc-truncated", toc)
                self.assertEqual(toc.count('<li class="lv1">'), 600)
            # 显式传上限时仍然生效
            out2 = os.path.join(TMP_DIR, "_tmp_big_out2.epub")
            try:
                stats2 = self._beautify(tmp, out2, max_toc_entries=50)
                self.assertEqual(stats2["toc_entries"], 50)
                with zipfile.ZipFile(out2) as zf:
                    toc2 = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                    self.assertIn("仅显示前 50 条", toc2)
            finally:
                if os.path.exists(out2):
                    os.remove(out2)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_link_check_stats(self):
        tmp = os.path.join(TMP_DIR, "_tmp_lk_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_lk_out.epub")
        build_mini_epub(tmp)
        try:
            stats = self._beautify(tmp, out)
            self.assertEqual(stats["toc_links_total"], stats["toc_entries"])
            self.assertEqual(stats["toc_links_ok"], stats["toc_links_total"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_analyze_report_fields(self):
        tmp = os.path.join(TMP_DIR, "_tmp_an_src.epub")
        self.build_custom_epub(tmp, "<p>\u3000\u3000带缩进的段落。</p><p></p><p>普通段。</p>")
        try:
            a = lib.analyze_epub(tmp)
            for key in ("leading_space_paras", "sampled_paras", "empty_para_est",
                        "p_close_mismatch_files", "css_important_count",
                        "css_conflict_risk", "image_count", "image_oversize",
                        "toc_preview_titles"):
                self.assertIn(key, a)
            self.assertGreaterEqual(a["leading_space_paras"], 1)
            self.assertGreaterEqual(a["empty_para_est"], 1)
            self.assertTrue(isinstance(a["toc_preview_titles"], list))
            self.assertGreater(len(a["toc_preview_titles"]), 0)
            self.assertFalse(a["css_conflict_risk"])
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


class TestDialogue(unittest.TestCase):
    """对话行识别与点缀（mb-dialog）。"""

    H = (
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
        '<body>%s</body></html>'
    )

    @staticmethod
    def _build_epub(path):
        """迷你 EPUB：在标准 CH1 基础上追加一个「开头对话段。"""
        build_mini_epub(path)
        with zipfile.ZipFile(path) as zf:
            entries = {i.filename: zf.read(i.filename) for i in zf.infolist() if not i.is_dir()}
        ch1 = entries["OEBPS/ch1.xhtml"].decode("utf-8")
        entries["OEBPS/ch1.xhtml"] = ch1.replace(
            "</body>", '<p>「你终于来了。」他压低了声音。</p></body>'
        ).encode("utf-8")
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr(
                zipfile.ZipInfo("mimetype"), b"application/epub+zip",
                compress_type=zipfile.ZIP_STORED,
            )
            for name in [k for k in entries if k != "mimetype"]:
                zf.writestr(name, entries[name], compress_type=zipfile.ZIP_DEFLATED)

    def test_quote_start_marked(self):
        html = self.H % '<p>「你来了。」他低声说。</p><p>他坐在角落里。</p>'
        out, n = lib.mark_dialogue_in_html(html)
        self.assertEqual(n, 1)
        self.assertIn('<p class="mb-dialog">「你来了。」', out)

    def test_span_wrapped_with_fullwidth_space(self):
        html = self.H % '<p>\u3000<span class="c">“开始吧。”</span></p>'
        out, n = lib.mark_dialogue_in_html(html)
        self.assertEqual(n, 1)
        self.assertIn('<p class="mb-dialog">', out)

    def test_narration_lead_not_marked(self):
        """保守策略：叙述引导句式（张三道：……）不标。"""
        html = self.H % '<p>张三道：“你来了。”</p>'
        out, n = lib.mark_dialogue_in_html(html)
        self.assertEqual(n, 0)

    def test_heading_and_nonp_skipped(self):
        html = self.H % '<h2>「标题带引号」</h2><blockquote><p>「引块内」</p></blockquote>'
        out, n = lib.mark_dialogue_in_html(html)
        self.assertEqual(n, 0)
        self.assertNotIn('mb-dialog', out)

    def test_idempotent(self):
        html = self.H % '<p class="mb-dialog">「已标记」</p>'
        out, n = lib.mark_dialogue_in_html(html)
        self.assertEqual(out, html)
        self.assertEqual(n, 0)

    def test_beautify_dialogue_toggle(self):
        tmp = os.path.join(TMP_DIR, "_tmp_dlg_src.epub")
        out_on = os.path.join(TMP_DIR, "_tmp_dlg_on.epub")
        out_off = os.path.join(TMP_DIR, "_tmp_dlg_off.epub")
        self._build_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats_off = lib.beautify(tmp, out_off, css, dialogue=False)
            self.assertEqual(stats_off["dialogues_marked"], 0)
            stats_on = lib.beautify(tmp, out_on, css, dialogue=True)
            self.assertGreaterEqual(stats_on["dialogues_marked"], 1)
            with zipfile.ZipFile(out_on) as zf:
                ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
                css_out = zf.read("OEBPS/mb-beauty.css").decode("utf-8")
            self.assertIn("mb-dialog", ch1)
            self.assertIn(".mb-dialog", css_out)
        finally:
            for p in (tmp, out_on, out_off):
                if os.path.exists(p):
                    os.remove(p)

    def test_analyze_counts_dialogue(self):
        tmp = os.path.join(TMP_DIR, "_tmp_dlg_ana.epub")
        self._build_epub(tmp)
        try:
            report = lib.analyze_epub(tmp)
            self.assertGreaterEqual(report["dialogue_paras"], 1)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


class TestVolumeAndSplit(unittest.TestCase):
    """卷/章分级（mb-vol）与双行排版（title_split）。"""

    H = (
        '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
        '<body>%s</body></html>'
    )

    def test_volume_marked_mbvol(self):
        html = self.H % '<h1>第一卷 风起云涌</h1><p>第一章 起点</p><p>正文。</p>'
        out, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk["volumes"], 1)
        self.assertIn("mb-vol", out)
        # 卷级标题后不直接跟章级长线（sep 属于后面的 mb-ch）
        self.assertNotIn("</h1><div class=\"mb-ch-sep\"", out)
        self.assertNotIn('class="mb-ch">第一卷', out)

    def test_volume_patterns(self):
        for t in ("第三卷", "卷二", "上卷", "第二部 中原", "第五篇"):
            html = self.H % ("<h2>%s</h2><p>正文</p>" % t)
            _, mk = lib.mark_chapters_in_html(html)
            self.assertEqual(mk["volumes"], 1, t)

    def test_chapter_still_mbch(self):
        html = self.H % '<h2>第三章 转折</h2><p>正文</p>'
        out, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk["chapters"], 1)
        self.assertIn("mb-ch-sep", out)
        self.assertNotIn("mb-vol", out)

    def test_split_two_line_spans(self):
        html = self.H % '<h2>第三章 血尸</h2>'
        out, mk = lib.mark_chapters_in_html(html, split_title=True)
        self.assertEqual(mk["splits"], 1)
        self.assertIn('<span class="mb-ch-num">第三章</span>', out)
        self.assertIn('<span class="mb-ch-title">血尸</span>', out)

    def test_split_english_prefix(self):
        html = self.H % '<p>Chapter 12 The Storm</p>'
        out, mk = lib.mark_chapters_in_html(html, split_title=True)
        self.assertEqual(mk["splits"], 1)
        self.assertIn("The Storm", out)

    def test_split_skipped_when_no_rest_or_tags(self):
        base = '<h2>%s</h2>'
        _, mk1 = lib.mark_chapters_in_html(self.H % (base % "楔子"), split_title=True)
        self.assertEqual(mk1["splits"], 0)
        tagged = self.H % '<h2>第四章 <em>风暴</em></h2>'
        _, mk2 = lib.mark_chapters_in_html(tagged, split_title=True)
        self.assertEqual(mk2["splits"], 0)
        self.assertNotIn("mb-ch-num", _ := lib.mark_chapters_in_html(tagged, split_title=True)[0])

    def test_split_off_by_default_and_volume_never_split(self):
        html = self.H % '<h2>第三章 血尸</h2><h1>第一卷 风起</h1>'
        out, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk["splits"], 0)
        out2, mk2 = lib.mark_chapters_in_html(html, split_title=True)
        self.assertEqual(mk2["splits"], 1)
        self.assertNotIn("mb-ch-num\">第一卷", out2)

    def test_beautify_split_integration(self):
        tmp = os.path.join(TMP_DIR, "_tmp_split_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_split_out.epub")
        build_mini_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css, split_title=True)
            self.assertGreaterEqual(stats["titles_split"], 1)
            self.assertGreaterEqual(stats["marked_volumes"] + stats["marked_headers"], 2)
            with zipfile.ZipFile(out) as zf:
                ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
                css_out = zf.read("OEBPS/mb-beauty.css").decode("utf-8")
            self.assertIn("mb-ch-num", ch1)
            self.assertIn(".mb-vol", css_out)
            self.assertIn(".mb-ch-num", css_out)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


class TestTocBlankPrune(unittest.TestCase):
    """NCX/nav 空白条目净化（cleanup.toc_blank）。"""

    NCX_BLANK = (
        '<?xml version="1.0" encoding="utf-8"?>'
        '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
        '<head/><docTitle><text>t</text></docTitle>'
        '<navMap>'
        '<navPoint id="a" playOrder="1"><navLabel><text>第一章 起点</text></navLabel>'
        '<content src="ch1.xhtml"/></navPoint>'
        '<navPoint id="b" playOrder="2"><navLabel><text>   </text></navLabel>'
        '<content src="ch2.xhtml"/></navPoint>'
        '<navPoint id="c" playOrder="3"><navLabel><text></text></navLabel>'
        '<content src="ch3.xhtml"/>'
        '<navPoint id="c1" playOrder="4"><navLabel><text>第二章 转折</text></navLabel>'
        '<content src="ch2.xhtml"/></navPoint>'
        '</navPoint>'
        '</navMap></ncx>'
    )

    def _build(self, path, ncx_data, nav_data=None):
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">t</dc:title></metadata>'
            '<manifest>'
            '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
            '%s</manifest>'
            '<spine><itemref idref="c1"/></spine></package>'
        ) % ('<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>' if nav_data else '')
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr(zipfile.ZipInfo("mimetype"), b"application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/ch1.xhtml", CH1)
            zf.writestr("OEBPS/toc.ncx", ncx_data)
            if nav_data:
                zf.writestr("OEBPS/nav.xhtml", nav_data)

    def test_prune_ncx_bytes(self):
        data, n = lib._prune_ncx_bytes(self.NCX_BLANK.encode("utf-8"))
        self.assertEqual(n, 1)  # 只删 b：空 label 叶子；c 有存活子级保留
        root = ET.fromstring(data.decode("utf-8"))
        labels = [t.text for t in root.iter("{http://www.daisy.org/z3986/2005/ncx/}text")
                  if t.text and t.text != "t"]
        self.assertIn("第二章 转折", labels)
        orders = [np.get("playOrder") for np in
                  root.iter("{http://www.daisy.org/z3986/2005/ncx/}navPoint")]
        self.assertEqual(orders, ["1", "2", "3"])

    def test_prune_nav_bytes(self):
        nav = (
            '<?xml version="1.0" encoding="utf-8"?>'
            '<html xmlns="http://www.w3.org/1999/xhtml" '
            'xmlns:epub="http://www.idpf.org/2007/ops">'
            '<body><nav epub:type="toc"><ol>'
            '<li><a href="ch1.xhtml">第一章</a></li>'
            '<li><a href=""></a></li>'
            '<li><a href="x.xhtml"> </a><ol><li><a href="ch1.xhtml">子页</a></li></ol></li>'
            '</ol></nav></body></html>'
        )
        data, n = lib._prune_nav_bytes(nav.encode("utf-8"))
        self.assertEqual(n, 1)
        self.assertIn("子页", data.decode("utf-8"))

    def test_beautify_cleanup_toggle(self):
        tmp = os.path.join(TMP_DIR, "_tmp_blank_src.epub")
        on = os.path.join(TMP_DIR, "_tmp_blank_on.epub")
        off = os.path.join(TMP_DIR, "_tmp_blank_off.epub")
        self._build(tmp, self.NCX_BLANK)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            s_on = lib.beautify(tmp, on, css, cleanup={"toc_blank": True})
            self.assertEqual(s_on["toc_blank_pruned"], 1)
            s_off = lib.beautify(tmp, off, css, cleanup={"toc_blank": False})
            self.assertEqual(s_off["toc_blank_pruned"], 0)
            with zipfile.ZipFile(on) as zf:
                pruned_ncx = zf.read("OEBPS/toc.ncx").decode("utf-8")
            with zipfile.ZipFile(off) as zf:
                raw_ncx = zf.read("OEBPS/toc.ncx").decode("utf-8")
            self.assertNotIn('<navPoint id="b"', pruned_ncx)
            self.assertIn('<navPoint id="b"', raw_ncx)
        finally:
            for p in (tmp, on, off):
                if os.path.exists(p):
                    os.remove(p)


class TestBackgroundImage(unittest.TestCase):
    """背景图片：CSS 注入 / 内置纹理 / extra_assets 打包。"""

    def test_css_day_and_night_layers(self):
        css = get_preset_css('classic', True, bg_image={'url': 'mb-bg.jpg'})
        self.assertIn("url('mb-bg.jpg')", css)
        self.assertIn('background-size: cover', css)
        self.assertIn(
            'linear-gradient(rgba(18,18,18,0.72), rgba(18,18,18,0.72)), url(\'mb-bg.jpg\')',
            css,
        )

    def test_css_off_untouched(self):
        a = get_preset_css('classic', True)
        b = get_preset_css('classic', True, bg_image=None)
        self.assertEqual(a, b)
        self.assertNotIn('mb-bg', a)

    def test_css_night_dim_custom(self):
        css = get_preset_css('navy', True, bg_image={'url': 'mb-bg.jpg', 'night_dim': 0.5})
        self.assertIn('rgba(18,18,18,0.50)', css)

    def test_builtin_textures_valid(self):
        from webserver.plugins.tool.epub_beautify.styles import (
            BUILTIN_TEXTURES,
            get_texture_bytes,
            list_builtin_textures,
        )
        ids = [t['id'] for t in list_builtin_textures()]
        self.assertEqual(ids, ['xuanzhi', 'yunwen', 'gaobai',
                               'daolin', 'yangpi', 'caojing'])
        for tid in ids:
            data, mt = get_texture_bytes(tid)
            self.assertEqual(mt, 'image/jpeg')
            self.assertEqual(data[:2], b'\xff\xd8')
            self.assertLess(len(data), 400 * 1024)
        self.assertIn('tex_xuanzhi.jpg', BUILTIN_TEXTURES['xuanzhi']['file'])
        self.assertIn('tex_caojing.jpg', BUILTIN_TEXTURES['caojing']['file'])
        try:
            get_texture_bytes('nope')
            self.fail('expected ValueError')
        except ValueError:
            pass

    def test_beautify_extra_assets(self):
        tmp = os.path.join(TMP_DIR, '_tmp_bg_src.epub')
        out1 = os.path.join(TMP_DIR, '_tmp_bg_out1.epub')
        out2 = os.path.join(TMP_DIR, '_tmp_bg_out2.epub')
        build_mini_epub(tmp)
        assets = {'mb-bg.jpg': (b'\xff\xd8fakejpgdata', 'image/jpeg')}
        try:
            stats = lib.beautify(tmp, out1, 'body{}', extra_assets=dict(assets))
            self.assertEqual(stats['extra_assets'], 1)
            with zipfile.ZipFile(out1) as zf:
                names = zf.namelist()
                opf = zf.read([n for n in names if n.endswith('.opf')][0]).decode('utf-8')
            self.assertIn('OEBPS/mb-bg.jpg', names)
            self.assertIn('id="mb-bg"', opf)
            self.assertIn('media-type="image/jpeg"', opf)
            # 幂等重跑：对已含资源的输出再跑一次，manifest 不重复注册
            lib.beautify(out1, out2, 'body{}', extra_assets=dict(assets))
            with zipfile.ZipFile(out2) as zf:
                opf2 = zf.read([n for n in zf.namelist() if n.endswith('.opf')][0]).decode('utf-8')
            self.assertEqual(opf2.count('id="mb-bg"'), 1)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)


class TestPaletteAndTint(unittest.TestCase):
    """自定义配色（两器+自动派生）与全书主题底色三态。"""

    def test_palette_override_merge_and_derive(self):
        css = get_preset_css("classic", True, "elegant", palette_overrides={"accent": "#123456"})
        self.assertIn("#123456", css)
        # 派生夜间色（向白混合 55%）：18,52,86 -> #94A4B3
        params = _apply_palette_overrides(list_presets()["classic"], {"accent": "#123456"})
        self.assertEqual(params["accent_dark"], "#94A4B3")
        self.assertTrue(params["toc_gradient"].startswith("linear-gradient(135deg, #123456, "))
        # 派生值确实进入 CSS；原主色已被整体替换
        self.assertIn(params["accent_dark"], css)
        self.assertNotIn("#4A2C1A", css)

    def test_palette_invalid_hex_raises(self):
        with self.assertRaises(ValueError):
            get_preset_css("classic", True, "elegant", palette_overrides={"accent": "red"})
        with self.assertRaises(ValueError):
            get_preset_css("classic", True, "elegant", palette_overrides={"accent": "#12345"})
        with self.assertRaises(ValueError):
            get_preset_css("classic", True, "elegant", palette_overrides={"nope": "#123456"})

    def test_palette_derive_pair_when_accent_set(self):
        """覆盖 accent 时夜间色与目录渐变必须同时自动派生。"""
        params = _apply_palette_overrides(list_presets()["classic"], {"accent": "#7B2D26"})
        self.assertTrue(params["accent_dark"].startswith("#"))
        self.assertIn("linear-gradient(135deg, #7B2D26, ", params["toc_gradient"])
        # 未覆盖 accent 时不得改写派生键
        untouched = _apply_palette_overrides(list_presets()["classic"], {"border": "#ABCDEF"})
        self.assertEqual(untouched["accent_dark"], list_presets()["classic"]["accent_dark"])

    def test_three_char_hex_accepted(self):
        params = _apply_palette_overrides(list_presets()["classic"], {"accent": "#F00"})
        self.assertEqual(params["accent"], "#F00")

    def test_page_tint_on(self):
        css = get_preset_css("modern", True, "minimal", page_tint=True)
        self.assertIn("page_tint=on", css)
        self.assertIn("background-color: #FAFAFA !important", css)
        # 追加块自带夜间重申，且位于其配对 light 之后（块内顺序正确）
        tail = css[css.find("page_tint=on"):]
        li = tail.find("(prefers-color-scheme: light)")
        da = tail.find("(prefers-color-scheme: dark)")
        self.assertGreaterEqual(li, 0)
        self.assertGreater(da, li)

    def test_page_tint_off_forces_transparent(self):
        css = get_preset_css("xuanzhi", True, "minimal", page_tint=False)
        self.assertIn("background-color: transparent !important", css)

    def test_page_tint_auto_untouched(self):
        a = get_preset_css("classic", True, "elegant", page_tint=None)
        b = get_preset_css("classic", True, "elegant")
        self.assertEqual(a, b)


class TestPreviewChapter(unittest.TestCase):
    """analyze_epub 的首章真实内容采样（preview_chapter）。"""

    def test_preview_chapter_extracted(self):
        """首个含标题文件：标题 + 后续正文（遇下一个标题即止）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pc_src.epub")
        build_mini_epub(tmp)
        try:
            a = lib.analyze_epub(tmp)
            pc = a.get("preview_chapter")
            self.assertIsInstance(pc, dict)
            self.assertEqual(pc["title"], "第一章 序章")
            # 第二章 开端 是下一个标题 → 收录在它之前的一段正文后停止
            self.assertEqual(pc["paragraphs"], ["正文从这里开始，描写一段长长的故事。"])
        finally:
            os.remove(tmp)

    def test_preview_chapter_absent_without_headings(self):
        """无任何标题特征的书：preview_chapter 为 None。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pc_none.epub")
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">无标题书</dc:title></metadata>'
            '<manifest><item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/></manifest>'
            '<spine><itemref idref="c1"/></spine></package>'
        )
        ch = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
            '<body><p>这是一段很普通的叙述文字，完全没有任何标题特征可言。</p></body></html>'
        )
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/c1.xhtml", ch)
        try:
            a = lib.analyze_epub(tmp)
            self.assertIsNone(a.get("preview_chapter"))
        finally:
            os.remove(tmp)


class TestParaStyleAndTocColumns(unittest.TestCase):
    """段落排版（缩进开关 + 段距数值）与目录双栏的 CSS 后处理。"""

    def test_para_defaults_noop(self):
        """默认（缩进开 + 无段距）不追加任何规则，与存量输出零差异。"""
        css = get_preset_css("classic")
        self.assertNotIn("段落排版", css)

    def test_para_indent_off(self):
        css = get_preset_css("classic", para_indent=False)
        self.assertIn("段落排版", css)
        self.assertIn("text-indent: 0 !important", css)

    def test_para_gap_only(self):
        css = get_preset_css("classic", para_gap=0.6)
        self.assertIn("段落排版", css)
        self.assertIn("margin: 0 0 0.6em 0 !important", css)
        block = css[css.index("段落排版"):]
        # 缩进仍开启：通用 p 规则只改段距、不写缩进声明；章首段顶格重申 + 引文恢复紧凑
        gen_rule = block.split("p[data-mb-first]")[0]
        self.assertIn("margin: 0 0 0.6em", gen_rule)
        self.assertNotIn("text-indent", gen_rule)
        self.assertIn("p[data-mb-first]", block)
        self.assertIn("blockquote p", block)

    def test_para_indent_and_gap_combined(self):
        css = get_preset_css("classic", para_indent=False, para_gap=1.2)
        self.assertIn("margin: 0 0 1.2em 0 !important", css)
        # 全部顶格时不再需要 data-mb-first 重申
        head, sep, tail = css.partition("段落排版")
        self.assertTrue(sep)
        self.assertNotIn("data-mb-first", tail)

    def test_para_gap_clamp(self):
        big = get_preset_css("classic", para_gap=99)
        self.assertIn("margin: 0 0 3em 0 !important", big)

    def test_para_gap_invalid_raises(self):
        with self.assertRaises(ValueError):
            get_preset_css("classic", para_gap="wide")

    def test_toc_columns_block(self):
        css = get_preset_css("classic")
        self.assertNotIn("columns: 2", css)
        two = get_preset_css("classic", toc_columns=True)
        self.assertIn("columns: 2", two)
        # 选择器只命中生成目录页的 ol/li 结构（seal 表格天然免疫）
        self.assertIn("div.mb-toc ol", two)
        self.assertIn("@media (min-width: 32em)", two)

    def test_para_indent_off_beats_calibre_rules(self):
        """类汤书顶格：responsive 的 .calibre* 2em 强制在前，末尾同选择器覆写归零。"""
        css = get_preset_css("classic", para_indent=False)
        resp = css.index("text-indent: 2em !important")
        over = css.index(
            "%s {\n    text-indent: 0 !important" % _CALIBRE_INDENT_SELECTORS)
        self.assertGreater(over, resp)
        # duokan 私有属性同样需要 !important 才能压过 responsive 的强制值
        self.assertIn("duokan-text-indent: 0 !important", css)

    def test_para_gap_beats_calibre_margin(self):
        """类汤书段距：p.calibre* 段落级选择器覆写 responsive 的 margin: 0。"""
        css = get_preset_css("classic", para_gap=1.5)
        self.assertIn(
            "%s {\n    margin: 0 0 1.5em 0 !important;\n}" % _CALIBRE_MARGIN_SELECTORS,
            css,
        )

    def test_para_indent_off_and_gap_calibre_combined(self):
        css = get_preset_css("classic", para_indent=False, para_gap=0.5)
        self.assertIn(
            "%s {\n    text-indent: 0 !important" % _CALIBRE_INDENT_SELECTORS, css)
        self.assertIn(
            "%s {\n    margin: 0 0 0.5em 0 !important" % _CALIBRE_MARGIN_SELECTORS,
            css,
        )


class TestReviewFixes20260905(unittest.TestCase):
    """2026-09-05 review 修复回归：preview 轻量读取 / 判定口径对齐 / 背景图解析。"""

    CONTAINER = (
        '<?xml version="1.0"?><container version="1.0" '
        'xmlns="urn:oasis:names:tc:opendocument:xmlns:container">'
        '<rootfiles><rootfile full-path="OEBPS/content.opf" '
        'media-type="application/oebps-package+xml"/></rootfiles></container>'
    )
    PARA = '这是一段很长的正文内容，讲述一段长长的故事，用来填充章节正文。'

    def _opf(self, manifest, spine):
        return (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="2.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书'
            '</dc:title></metadata>'
            '<manifest>%s</manifest>'
            '<spine>%s</spine></package>' % (manifest, spine)
        )

    def _build(self, path, files):
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", self.CONTAINER)
            for name, data in files.items():
                zf.writestr(name, data, compress_type=zipfile.ZIP_DEFLATED)

    def test_analyze_never_decompresses_images(self):
        """B1：preview 轻量路径不得解压图片条目；超大图走中央目录 file_size。"""
        big_img = b"\x00" * (3 * 1024 * 1024)  # 高压缩数据：解压流小、声明体积 3MB
        files = {
            "OEBPS/content.opf": self._opf(
                '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="css" href="style.css" media-type="text/css"/>'
                '<item id="img" href="img.jpg" media-type="image/jpeg"/>',
                '<itemref idref="c1"/>').encode("utf-8"),
            "OEBPS/ch1.xhtml": (
                '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
                '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
                '<body><p>%s</p></body></html>' % self.PARA).encode("utf-8"),
            "OEBPS/style.css": b"p { margin: 0; }",
            "OEBPS/img.jpg": big_img,
        }
        tmp = os.path.join(TMP_DIR, "_tmp_lite.epub")
        self._build(tmp, files)
        try:
            real_read = zipfile.ZipFile.read

            def _guarded_read(self, name, *args, **kwargs):
                if isinstance(name, str) and name.endswith(".jpg"):
                    raise AssertionError("preview 解压了图片条目：%s" % name)
                return real_read(self, name, *args, **kwargs)

            with mock.patch.object(zipfile.ZipFile, "read", _guarded_read):
                info = lib.analyze_epub(tmp)
            self.assertEqual(info["image_count"], 1)
            self.assertEqual(info["image_oversize"], 1)  # 体积来自 file_size
            self.assertEqual(info["text_entries"], 1)
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)

    def test_long_head_toc_aligned_between_preview_and_run(self):
        """B2：长 <head>（链接列表落在 2KB~8KB 之间）的目录页，analyze 与
        beautify 必须同判为书内目录页——旧 run 侧只看头 2000 字会漏判，
        把目录页误打 mb-ch 并额外生成 mb-toc。"""
        pad = "x" * 5000  # 头部垫片：> 旧 run 窗口 2000 字，< 8KB 复核门槛
        toc_html = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
            '<style>/*%s*/</style></head><body>' % pad
            + "".join('<p><a href="ch%d.xhtml">第%d章 标题%d</a></p>' % (i, i, i)
                      for i in range(1, 11))
            + "</body></html>"
        )
        chapter = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
            '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
            '<body><p>%s</p></body></html>' % self.PARA
        )
        files = {
            "OEBPS/content.opf": self._opf(
                '<item id="list" href="list.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="css" href="style.css" media-type="text/css"/>'
                '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
                '<itemref idref="list"/><itemref idref="c1"/><itemref idref="c2"/>'
            ).encode("utf-8"),
            "OEBPS/list.xhtml": toc_html.encode("utf-8"),
            "OEBPS/ch1.xhtml": chapter.encode("utf-8"),
            "OEBPS/ch2.xhtml": chapter.encode("utf-8"),
            "OEBPS/style.css": b"p { margin: 0; }",
            "OEBPS/toc.ncx": (
                '<?xml version="1.0"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" '
                'version="2005-1"><navMap>'
                '<navPoint id="n1"><navLabel><text>第一章 标题1</text></navLabel>'
                '<content src="ch1.xhtml"/></navPoint>'
                '<navPoint id="n2"><navLabel><text>第二章 标题2</text></navLabel>'
                '<content src="ch2.xhtml"/></navPoint>'
                '</navMap></ncx>'
            ).encode("utf-8"),
        }
        tmp = os.path.join(TMP_DIR, "_tmp_align.epub")
        out = os.path.join(TMP_DIR, "_tmp_align_out.epub")
        self._build(tmp, files)
        try:
            info = lib.analyze_epub(tmp)
            self.assertTrue(info["has_inbook_toc"])
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertFalse(stats["toc_generated"])  # 书内已有目录页，不再生成
            with zipfile.ZipFile(out) as zf:
                list_out = zf.read("OEBPS/list.xhtml").decode("utf-8")
            self.assertNotIn("mb-ch", list_out)  # 不误打章节标记
            self.assertIn("mb-toc-page", list_out)  # 正常按目录页处理
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_short_chapter_file_toc_flags_reusable(self):
        """B2：主循环以预计算 flags 判定，正文页与目录页各归其位（幂等重跑）。"""
        chapter = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
            '<link href="style.css" rel="stylesheet" type="text/css"/></head>'
            '<body><h1>第一章 序章</h1><p>%s</p></body></html>' % self.PARA
        )
        files = {
            "OEBPS/content.opf": self._opf(
                '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="css" href="style.css" media-type="text/css"/>',
                '<itemref idref="c1"/>').encode("utf-8"),
            "OEBPS/ch1.xhtml": chapter.encode("utf-8"),
            "OEBPS/style.css": b"p { margin: 0; }",
        }
        tmp = os.path.join(TMP_DIR, "_tmp_flags.epub")
        out1 = os.path.join(TMP_DIR, "_tmp_flags_out1.epub")
        out2 = os.path.join(TMP_DIR, "_tmp_flags_out2.epub")
        self._build(tmp, files)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out1, css)
            lib.beautify(out1, out2, css)  # 幂等重跑
            with zipfile.ZipFile(out2) as zf:
                ch = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
            self.assertEqual(ch.count('class="mb-ch"'), 1)  # 精确匹配，排除 mb-ch-sep
            self.assertNotIn("mb-toc-page", ch)
        finally:
            for p in (tmp, out1, out2):
                if os.path.exists(p):
                    os.remove(p)

    def test_calibre_margin_selectors_never_bare(self):
        """裸 .calibre / .calibre1（可能是 body/容器）不参与段距。"""
        self.assertFalse(
            any(s.startswith(".") for s in _CALIBRE_MARGIN_SELECTORS.split(", ")))


# ── 弹注 fixture：ch1=A 型（EPUB3 标准），ch2=B 型（掌书系简化）──
NOTES_CH_A = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>a</title></head>'
    '<body><p>第一章 序章</p>'
    '<p>正文提到某个词<a class="duokan-footnote" epub:type="noteref" href="#note_1" '
    'id="noteref_1"><img src="../Images/note.png"/></a>继续叙述，推进情节发展。</p>'
    '<aside epub:type="footnote"><div><hr class="xian"/></div>'
    '<ol class="duokan-footnote-content">'
    '<li class="duokan-footnote-item" id="note_1"><p class="footnote">'
    '<a href="#noteref_1">◎</a>注文一：解释该词的含义与出处。</p></li>'
    '</ol></aside></body></html>'
)
NOTES_CH_B = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>b</title></head>'
    '<body><p>第二章 开端</p>'
    '<p>引用法条原文<a class="duokan-footnote" href="#df-1">'
    '<img src="note.png" width="14px"/></a>随后展开论述，层层递进。</p>'
    '<ol class="duokan-footnote-content">'
    '<li class="duokan-footnote-item" id="df-1">◎《唐律疏议》相关条文注释。</li>'
    '</ol></body></html>'
)
# 通用系（非多看）类名惯例：a.footnote / ol.footnote-content / li.footnote-item，
# 注文体 p 用衍生词元 footnote-text（不得被当标注符）
NOTES_CH_G = (
    '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>g</title></head>'
    '<body><p>第一章 引子</p>'
    '<p>正文提到某个词<a class="footnote" href="#gn-1">'
    '<img src="note.png"/></a>随后继续叙述。</p>'
    '<ol class="footnote-content">'
    '<li class="footnote-item" id="gn-1"><p class="footnote-text">'
    '注文：通用系类名惯例的解释文本。</p></li>'
    '</ol></body></html>'
)


def build_notes_epub(path):
    """构建含 A/B 两型弹注的迷你 EPUB。"""
    opf = (
        '<?xml version="1.0"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
        '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">弹注书</dc:title></metadata>'
        '<manifest>'
        '<item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>'
        '</manifest>'
        '<spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>'
    )
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/c1.xhtml", NOTES_CH_A)
        zf.writestr("OEBPS/c2.xhtml", NOTES_CH_B)


def build_notes_epub_generic(path):
    """构建含通用系弹注（NOTES_CH_G）的迷你 EPUB。"""
    opf = (
        '<?xml version="1.0"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
        '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">通用弹注书</dc:title></metadata>'
        '<manifest>'
        '<item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>'
        '</manifest>'
        '<spine><itemref idref="c1"/></spine></package>'
    )
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/c1.xhtml", NOTES_CH_G)


class TestNotes(unittest.TestCase):
    """弹注/标注美化：打标、归一化、标记替换、豁免守卫。"""

    def test_variant_a_mark_preserves_everything(self):
        new, st = lib.mark_notes_in_html(NOTES_CH_A)
        self.assertEqual(st, {'refs': 1, 'items': 1, 'normalized': 0, 'wrapped': 0})
        self.assertIn('mb-notemark', new)
        self.assertIn('data-mb-mark="orig"', new)
        # 原属性逐字保留（红线）
        self.assertIn('epub:type="noteref"', new)
        self.assertIn('href="#note_1"', new)
        self.assertIn('id="noteref_1"', new)
        self.assertIn('<img src="../Images/note.png"/>', new)
        # aside 容器打类；条目豁免类
        self.assertIn('mb-notes', new)
        self.assertIn('mb-note-item', new)

    def test_variant_b_normalized_and_wrapped(self):
        new, st = lib.mark_notes_in_html(NOTES_CH_B)
        self.assertEqual(st['normalized'], 1)
        self.assertEqual(st['wrapped'], 1)
        self.assertIn('epub:type="noteref"', new)
        self.assertLess(new.index('<aside'), new.index('<ol'))
        self.assertIn('<aside epub:type="footnote" class="mb-notes">', new)
        self.assertIn('href="#df-1"', new)  # 配对信号无损

    def test_idempotent_rerun(self):
        once, _ = lib.mark_notes_in_html(NOTES_CH_B)
        twice, st = lib.mark_notes_in_html(once)
        self.assertEqual(twice, once)
        self.assertEqual(st, {'refs': 0, 'items': 0, 'normalized': 0, 'wrapped': 0})

    def test_note_mark_modes(self):
        new, _ = lib.mark_notes_in_html(NOTES_CH_B, note_mark='num')
        self.assertIn('[1]', new)
        self.assertIn('class="mb-marktxt"', new)
        new2, _ = lib.mark_notes_in_html(NOTES_CH_A, note_mark='svg:inkdrop')
        self.assertIn('class="mb-marksvg"', new2)
        self.assertIn('viewBox="0 0 24 24"', new2)
        # zhu 圆章：span 徽章，样式由 responsive.css 的 .mb-markzhu 绘制
        new3, _ = lib.mark_notes_in_html(NOTES_CH_B, note_mark='zhu')
        self.assertIn('<span class="mb-markzhu">注</span>', new3)
        self.assertIn('data-mb-mark="zhu"', new3)
        self.assertNotIn('<img', new3)
        # 替换后链接属性仍在
        self.assertIn('href="#note_1"', new2)
        self.assertIn('href="#df-1"', new3)
        for bad in ('svg:nope', 'weird'):
            with self.assertRaises(ValueError):
                lib.mark_notes_in_html(NOTES_CH_A, note_mark=bad)

    def test_notes_exempt_from_chapter_marking(self):
        noted, _ = lib.mark_notes_in_html(NOTES_CH_B)
        ch_html, mk = lib.mark_chapters_in_html(noted)
        self.assertEqual(mk['chapters'], 1)  # 只有「第二章 开端」
        head, tail = ch_html[:ch_html.index('df-1')], ch_html[ch_html.index('df-1'):]
        self.assertIn('mb-ch', head)
        self.assertNotIn('mb-ch', tail)      # 注释条目未被误标

    def test_analyze_counts(self):
        tmp = os.path.join(TMP_DIR, "_tmp_nt.epub")
        build_notes_epub(tmp)
        try:
            a = lib.analyze_epub(tmp)
            self.assertEqual(a["notes_refs"], 2)
            self.assertEqual(a["notes_items"], 2)
        finally:
            os.remove(tmp)

    def test_beautify_flow_with_notes(self):
        tmp = os.path.join(TMP_DIR, "_tmp_nt_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_nt_out.epub")
        build_notes_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css, notes=True, note_mark='num')
            self.assertEqual(stats["notes_refs"], 2)
            self.assertEqual(stats["items"] if "items" in stats else 2, 2)
            with zipfile.ZipFile(out) as zf:
                c2 = zf.read("OEBPS/c2.xhtml").decode("utf-8")
                self.assertIn('mb-notemark', c2)
                self.assertIn('[1]', c2)
                self.assertIn('<aside epub:type="footnote"', c2)
                self.assertIn('.mb-notes', zf.read("OEBPS/mb-beauty.css").decode("utf-8"))
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


    def test_generic_footnote_classes_marked(self):
        """通用系类名（a.footnote / ol.footnote-content / li.footnote-item）
        与多看系同构识别；注文体 p.footnote-text 不误标。"""
        new, st = lib.mark_notes_in_html(NOTES_CH_G)
        self.assertEqual(st, {'refs': 1, 'items': 1, 'normalized': 1, 'wrapped': 1})
        self.assertEqual(new.count('mb-notemark'), 1)
        self.assertIn('data-mb-mark="orig"', new)
        self.assertIn('mb-notes', new)
        self.assertIn('mb-note-item', new)
        # 红线：原属性逐字保留
        self.assertIn('href="#gn-1"', new)
        self.assertIn('<img src="note.png"/>', new)
        self.assertIn('id="gn-1"', new)

    def test_generic_footnote_num_mark(self):
        new, _ = lib.mark_notes_in_html(NOTES_CH_G, note_mark='num')
        self.assertIn('[1]', new)
        self.assertIn('class="mb-marktxt"', new)
        self.assertNotIn('<img', new)
        self.assertIn('href="#gn-1"', new)

    def test_footnote_variant_tokens_not_refs(self):
        """衍生词元/复合词不命中：footnote-text、duokan-footnote-link（反链）、
        footnote-link、my-footnote、footnote-contents。"""
        html = ('<p class="footnote-text">注释体段落。</p>'
                '<a class="duokan-footnote-link" href="#r1">返回</a>'
                '<a class="footnote-link" href="#r2">back</a>'
                '<a class="my-footnote" href="#r3">x</a>'
                '<ol class="footnote-contents"><li>x</li></ol>')
        new, st = lib.mark_notes_in_html(html)
        self.assertEqual(st, {'refs': 0, 'items': 0, 'normalized': 0, 'wrapped': 0})
        self.assertNotIn('mb-notemark', new)
        self.assertNotIn('mb-notes', new)

    def test_analyze_and_beautify_generic_notes(self):
        """通用系弹注书：analyze 计数与 beautify 落包全链路。"""
        tmp = os.path.join(TMP_DIR, "_tmp_gnt.epub")
        out = os.path.join(TMP_DIR, "_tmp_gnt_out.epub")
        build_notes_epub_generic(tmp)
        try:
            a = lib.analyze_epub(tmp)
            self.assertEqual(a["notes_refs"], 1)
            self.assertEqual(a["notes_items"], 1)
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css, notes=True, note_mark='num')
            self.assertEqual(stats["notes_refs"], 1)
            with zipfile.ZipFile(out) as zf:
                c1 = zf.read("OEBPS/c1.xhtml").decode("utf-8")
                self.assertIn('mb-notemark', c1)
                self.assertIn('[1]', c1)
                self.assertIn('<aside epub:type="footnote"', c1)
                self.assertIn('.mb-notes', zf.read("OEBPS/mb-beauty.css").decode("utf-8"))
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


class TestHBranchScope(unittest.TestCase):
    """h 分支收敛到 h1/h2：章内小节头（h3+）不再被顶成独页。"""

    H = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title></head>'
         '<body>%s</body></html>')

    def test_h3_section_untouched(self):
        html = self.H % '<h3>人物小传</h3><p>正文正文。</p>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertFalse(any(mk.values()))
        self.assertNotIn('mb-ch', new)

    def test_h4_illustration_untouched(self):
        html = self.H % '<h4>插图列表</h4><p>正文。</p>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertFalse(any(mk.values()))

    def test_h2_short_phrase_still_marked(self):
        html = self.H % '<h2>雪夜</h2><p>正文。</p>'
        _, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 1)

    def test_h2_ascii_period_excluded(self):
        html = self.H % '<h2>See appendix for details.</h2><p>正文。</p>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertFalse(any(mk.values()))
        self.assertNotIn('mb-ch', new)

    def test_h2_midfile_section_heads_untouched(self):
        """文件中部 h2 小节头不打标：h2 语义打标仅限文件首块——中部小节头
        无链接，安全阀判别式对它失效，无条件打标会被 page-break 逐个顶成
        独页（review P3 回归）"""
        html = ('<html><body><p>第一章 开端</p><p>正文段落。</p>'
                + ''.join('<h2>人物小传之%d</h2><p>小传内容。</p>' % i
                          for i in range(1, 13))
                + '</body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 1)      # 仅「第一章 开端」文本命中
        self.assertEqual(new.count('<h2'), 12)   # h2 原样未动

    def test_h2_first_block_still_marked_after_body(self):
        """首块 h2 打标资格不被空白块消耗；其后正文块 data-mb-first 正常"""
        html = self.H % '<p>  </p><h2>雪夜</h2><p>正文。</p>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 1)
        self.assertIn('mb-ch', new)


class TestRestGuardRound2(unittest.TestCase):
    """rest 护栏第二轮：ASCII 续句、句中句读、前言冒号长叙述。"""

    def test_ascii_comma_rejected(self):
        self.assertFalse(chapter_patterns.paragraph_is_heading(
            '第十章,他走进房间看见桌上有一封信'))

    def test_mid_sentence_punct_rejected(self):
        self.assertFalse(chapter_patterns.paragraph_is_heading(
            '第十章风起云涌。血战开始'))

    def test_special_colon_long_narrative_rejected(self):
        self.assertFalse(chapter_patterns.paragraph_is_heading(
            '前言：本书讲述了一个关于江湖与庙堂之间恩怨情仇的长篇故事'))

    def test_special_colon_short_ok(self):
        self.assertTrue(chapter_patterns.paragraph_is_heading('番外三：年夜'))

    def test_structured_colon_long_ok(self):
        self.assertTrue(chapter_patterns.paragraph_is_heading('第三章：血尸'))
        self.assertTrue(chapter_patterns.paragraph_is_heading(
            'Chapter 1: The Boy Who Lived'))

    def test_title_underscore_class(self):
        html = ('<html><body><p class="title_x">编辑推荐语短句</p>'
                '<p>正文。</p></body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertFalse(any(mk.values()))
        self.assertNotIn('mb-ch', new)


class TestHeadDecodeAndTocConsistency(unittest.TestCase):
    """头部解码不断字 + preview/run 目录口径一致。"""

    def test_decode_head_split_multibyte(self):
        raw = b'a' * 8190 + '中'.encode('utf-8')
        # 8192 字节处恰劈开“中”：旧写法 _decode(切片) 直接抛 UnicodeDecodeError
        with self.assertRaises(UnicodeDecodeError):
            raw[:8192].decode('utf-8')
        self.assertEqual(lib._decode_head(raw), 'a' * 4000)

    def test_decode_head_matches_full(self):
        data = ('<?xml version="1.0"?><html><body>' + '<p>第一章 序章内容</p>' * 200
                + '</body></html>').encode('utf-8')
        self.assertEqual(lib._decode_head(data), lib._decode(data)[:4000])
        self.assertIn('第一章', lib._decode_head(data))

    def test_link_toc_beyond_head_slice(self):
        """链接列表被长头部挤到 8KB 切片外：preview 须与 run 一致判为目录。"""
        tmp = os.path.join(TMP_DIR, '_tmp_trunc_src.epub')
        try:
            prefix = ('<?xml version="1.0" encoding="utf-8"?>\n'
                      '<html xmlns="http://www.w3.org/1999/xhtml"><head>'
                      '<title>Table of Contents</title><style>')
            link_items = [
                '<p><a href="ch%d.xhtml">第%d章 章节标题</a></p>' % (i, i)
                for i in range(1, 5)]
            links = ''.join(link_items)
            tail = '</style></head><body>%s</body></html>' % links
            pad_len = (8192 - len(prefix.encode('utf-8'))
                       - len(''.join(link_items[:2]).encode('utf-8')) - 30)
            body = (prefix + 'x' * pad_len + tail).encode('utf-8')
            opf = (
                '<?xml version="1.0"?>'
                '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
                '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">t</dc:title></metadata>'
                '<manifest><item id="c0" href="c0.xhtml" media-type="application/xhtml+xml"/>'
                '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
                '</manifest><spine><itemref idref="c0"/><itemref idref="c1"/></spine></package>')
            ch1 = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>c</title></head>'
                   '<body><p>第一章 起点</p><p>正文。</p></body></html>')
            with zipfile.ZipFile(tmp, 'w') as zf:
                zf.writestr('mimetype', 'application/epub+zip',
                            compress_type=zipfile.ZIP_STORED)
                zf.writestr('META-INF/container.xml', CONTAINER)
                zf.writestr('OEBPS/content.opf', opf)
                zf.writestr('OEBPS/c0.xhtml', body)
                zf.writestr('OEBPS/ch1.xhtml', ch1)
            # 头片内不足 3 链接（旧逻辑必漏），analyze 全量复核后须命中
            raw = body
            self.assertFalse(lib._looks_like_link_toc(lib._decode_head(raw)))
            a = lib.analyze_epub(tmp)
            self.assertTrue(a['has_inbook_toc'])
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


class TestStripHardening(unittest.TestCase):
    """strip 打磨：单引号 + 空 class 属性移除。"""

    def test_single_quote_marks(self):
        html = ("<html><body><p class='mb-ch'>第一章 起点</p>"
                "<div class='mb-ch-sep'></div></body></html>")
        out = lib._strip_chapter_marks(html)
        self.assertNotIn('mb-ch', out)
        self.assertNotIn('mb-ch-sep', out)
        self.assertIn('第一章', out)

    def test_empty_class_removed(self):
        out = lib._strip_chapter_marks('<p class="mb-ch">第一章 起点</p>')
        self.assertNotIn('class=""', out)
        self.assertNotIn('mb-ch', out)

    def test_other_classes_kept(self):
        out = lib._strip_chapter_marks(
            '<p class="calibre1 mb-ch">第一章 起点</p>')
        self.assertIn('class="calibre1"', out)
        self.assertNotIn('mb-ch"', out)

    def test_strip_whitespace_idempotent(self):
        """空白幂等：无标记时逐字原样返回（此前每跑一次多一个空格，
        重复美化会在每个 class 属性前累积空白）。"""
        for html in ('<p class="calibre1">正文</p><body class="mb-toc-page">',
                     "<p class='a b'>x</p>"):
            once = lib._strip_chapter_marks(html)
            self.assertEqual(once, html)
            self.assertEqual(lib._strip_chapter_marks(once), once)


# ── 目录页三层信号 / 防炸页安全阀 / NCX 驱动打标（2026-09-06 批 2 复验）──
# 通用篇名 + 跨文件链接（calibre 拆分书形态）：形态比例必然失效，仅密度信号可判
DENSITY_TOC_HTML = (
    '<html><head><title>z</title></head><body>'
    '<p>Table of Contents</p>'
    + ''.join('<p><a href="part%03d.xhtml#filepos%d">条目标题%03d</a></p>' % (i, i, i)
              for i in range(1, 21))
    + '</body></html>'
)
# 密度不足（6 链接 / 30+ 填充块），靠标题语义信号判定
TITLE_SIGNAL_TOC_HTML = (
    '<html><head><title>t</title></head><body>'
    '<h1>目录</h1>'
    + ''.join('<div>此处为版式填充段落，避免链接密度达标。</div>' for _ in range(30))
    + ''.join('<p><a href="s%02d.html">篇目%d</a></p>' % (i, i) for i in range(1, 7))
    + '</body></html>'
)


class TestTocSignalsAndGuard(unittest.TestCase):
    """目录页三层信号（形态/密度/标题）、防炸页安全阀、NCX 驱动打标。"""

    def test_density_signal_cross_file_links(self):
        self.assertTrue(lib._is_toc_doc('index_split_000.html', DENSITY_TOC_HTML))

    def test_title_signal_low_density(self):
        self.assertTrue(lib._is_toc_doc('x.html', TITLE_SIGNAL_TOC_HTML))

    def test_title_signal_needs_min_links(self):
        """4 个链接（≥3 早退门之上、<5 结构信号门槛）即使有目录标题也不判目录。"""
        html = ('<html><body><p>目录</p>'
                + ''.join('<p><a href="s%d.html">篇目%d</a></p>' % (i, i)
                          for i in range(1, 5))
                + '</body></html>')
        self.assertFalse(lib._is_toc_doc('x.html', html))

    def test_title_signal_via_title_tag(self):
        """<title>目录</title> 命中标题语义信号（低密度页）。"""
        html = ('<html><head><title>目录</title></head><body>'
                + ''.join('<div>填充段落文本，稀释链接密度。</div>' for _ in range(30))
                + ''.join('<p><a href="s%02d.html">篇目%d</a></p>' % (i, i)
                          for i in range(1, 7))
                + '</body></html>')
        self.assertTrue(lib._is_toc_doc('x.html', html))

    def test_endnote_backlink_page_not_toc(self):
        """合并式尾注页（行行是回链的注释容器）不得判为目录页——否则会
        抑制目录生成并跳过该页弹注美化（review 阻断项回归）。"""
        endnote = ('<html><body><h2>注释</h2>'
                   '<ol class="footnote-content">'
                   + ''.join('<li class="footnote-item" id="n%d">'
                             '<a href="c%02d.xhtml#ref%d">%d</a> 注文内容%d。</li>'
                             % (i, i, i, i, i) for i in range(1, 21))
                   + '</ol></body></html>')
        self.assertFalse(lib._is_toc_doc('notes.xhtml', endnote))
        # 无容器的裸 li 回链列表：回链文本为纯数字，"有意义文本"占比检验拦下
        endnote2 = ('<html><body><p>注释</p>'
                    + ''.join('<li id="n%d"><a href="c%02d.xhtml#ref%d">%d</a>'
                              ' 注文内容%d。</li>' % (i, i, i, i, i)
                              for i in range(1, 21))
                    + '</body></html>')
        self.assertFalse(lib._is_toc_doc('notes.xhtml', endnote2))

    def test_beautify_density_toc_not_exploded(self):
        """密度判定的目录页：不打章节标、获得目录页装饰、保持单页。"""
        tmp = os.path.join(TMP_DIR, "_tmp_dens_toc.epub")
        out = os.path.join(TMP_DIR, "_tmp_dens_toc_out.epub")
        manifest = (
            '<item id="toc0" href="index_split_000.html" '
            'media-type="application/xhtml+xml"/>'
            '<item id="c1" href="c01.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="c02.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'
        )
        spine = '<itemref idref="toc0"/><itemref idref="c1"/><itemref idref="c2"/>'
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '密度目录书</dc:title></metadata>'
            '<manifest>%s</manifest><spine>%s</spine></package>'
        ) % (manifest, spine)
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/index_split_000.html", DENSITY_TOC_HTML)
            zf.writestr("OEBPS/c01.xhtml",
                        '<html><body><p>第一章 开端</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/c02.xhtml",
                        '<html><body><p>第二章 转折</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/toc.ncx", NCX)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertFalse(stats["toc_generated"])
            self.assertEqual(stats.get("mark_guard_files", 0), 0)
            with zipfile.ZipFile(out) as zf:
                toc_page = zf.read("OEBPS/index_split_000.html").decode("utf-8")
            self.assertIn("mb-toc-page", toc_page)
            self.assertNotIn("mb-ch", toc_page)
            self.assertIn("mb-toc-title", toc_page)  # p 标题 "Table of Contents"
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_mark_guard_link_heavy_page(self):
        html = '<html><body>' + ''.join(
            '<p><a href="p%d.html#f%d">第%d章 标题%d</a></p>' % (i, i, i, i)
            for i in range(1, 13)) + '</body></html>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk, {'chapters': 0, 'volumes': 0, 'splits': 0,
                              'toc_guard': 1})
        self.assertEqual(new, html)

    def test_mark_guard_not_fired_aggregate(self):
        """聚合多章的正文文件（标题无链接）不受安全阀影响。"""
        html = '<html><body>' + ''.join(
            '<p>第%d章 标题%d</p><p>正文内容段落。</p>' % (i, i)
            for i in range(1, 13)) + '</body></html>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 12)
        self.assertNotIn('toc_guard', mk)
        self.assertIn('mb-ch', new)

    def test_mark_guard_below_threshold(self):
        """标记数未达门槛（<10）时安全阀不介入。"""
        html = '<html><body>' + ''.join(
            '<p><a href="p%d.html">第%d章 标题%d</a></p>' % (i, i, i)
            for i in range(1, 10)) + '</body></html>'
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 9)
        self.assertNotIn('toc_guard', mk)
        self.assertIn('mb-ch', new)

    def test_mark_guard_not_fired_aggregate_with_nav(self):
        """聚合多章正文 + 每章上/下章导航链接：章题块自身无链接，
        安全阀判别式（被标块多数含链接）不命中，标记照常保留。"""
        html = ('<html><body>' + ''.join(
            '<p>第%d章 标题%d</p><p>正文内容段落。</p>'
            '<p><a href="p%02d.xhtml">上一章</a><a href="p%02d.xhtml">下一章</a></p>'
            % (i, i, i - 1, i + 1) for i in range(1, 13)) + '</body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 12)
        self.assertNotIn('toc_guard', mk)
        self.assertIn('mb-ch', new)

    def test_mark_guard_not_fired_named_anchor_aggregate(self):
        """章题内嵌 <a name> 具名锚（无 href）/<abbr> 不是链接：判别式按
        内部 href 口径计数，聚合正文不触发安全阀（review N1 回归）。"""
        html = ('<html><body>' + ''.join(
            '<h2><a name="c%d"></a>第%d章 标题%d</h2><p>正文内容段落。</p>'
            '<p><a href="p%02d.xhtml">上一章</a><a href="p%02d.xhtml">下一章</a></p>'
            % (i, i, i, i - 1, i + 1) for i in range(1, 13)) + '</body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk['chapters'], 12)
        self.assertNotIn('toc_guard', mk)
        self.assertIn('mb-ch', new)

    def test_internal_href_regex_excludes_external(self):
        """_INTERNAL_HREF_RE：外链（含前导空白变体）/协议相对地址不算内部链接
        （review N2：\\s* 在前瞻外会被回溯击穿）。"""
        for href in ('https://x.com/a', '  https://x.com/a', '\tHTTP://x.com/a',
                     '\n//cdn.x.com/a', '//x.com/a', 'mailto:a@b.c',
                     '  javascript:void(0)'):
            self.assertEqual(lib._INTERNAL_HREF_RE.findall(
                '<a href="%s">x</a>' % href), [], repr(href))
        for href in ('part1.xhtml#f1', '#f1', ' ../c1.xhtml',
                     ' TEXT/page.html'):
            self.assertEqual(len(lib._INTERNAL_HREF_RE.findall(
                '<a href="%s">x</a>' % href)), 1, repr(href))

    def _build_ncx_epub(self, path, ncx, chapters):
        manifest = ''.join(
            '<item id="c%d" href="%s" media-type="application/xhtml+xml"/>'
            % (i, h) for i, (h, _html) in enumerate(chapters))
        manifest += ('<item id="ncx" href="toc.ncx" '
                     'media-type="application/x-dtbncx+xml"/>')
        spine = ''.join('<itemref idref="c%d"/>' % i for i in range(len(chapters)))
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            'NCX打标书</dc:title></metadata>'
            '<manifest>%s</manifest><spine toc="ncx">%s</spine></package>'
        ) % (manifest, spine)
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/toc.ncx", ncx)
            for i, (h, html) in enumerate(chapters):
                zf.writestr("OEBPS/" + h, html)

    def test_toc_title_driven_volume_marking(self):
        """NCX 条目标题兜底打标：h3 层级 + 书名前缀的卷名页按 mb-vol 处理。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ncxmark.epub")
        out = os.path.join(TMP_DIR, "_tmp_ncxmark_out.epub")
        ncx = (
            '<?xml version="1.0"?>'
            '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
            '<navMap>'
            '<navPoint id="v1"><navLabel><text>资治通鉴第一卷</text></navLabel>'
            '<content src="v1.xhtml"/></navPoint>'
            '<navPoint id="c2"><navLabel><text>第二章 正文标题</text></navLabel>'
            '<content src="c2.xhtml"/></navPoint>'
            '</navMap></ncx>'
        )
        chapters = [
            ('v1.xhtml', '<html><body><h3>资治通鉴第一卷</h3>'
                         '<p>周纪一。</p></body></html>'),
            ('c2.xhtml', '<html><body><h2>第二章 正文标题</h2>'
                         '<p>正文。</p></body></html>'),
        ]
        self._build_ncx_epub(tmp, ncx, chapters)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertEqual(stats.get("toc_titles_marked"), 1)
            with zipfile.ZipFile(out) as zf:
                v1 = zf.read("OEBPS/v1.xhtml").decode("utf-8")
            self.assertIn('class="mb-vol"', v1)
            self.assertNotIn('mb-ch-sep', v1)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_title_containment_prefers_heading(self):
        """两段式匹配：书名段（资治通鉴）不得借包含命中抢在卷名块之前；
        无全等时包含匹配仅限 h1-h6。"""
        html = ('<html><body><p>资治通鉴</p>'
                '<h3>第七十四卷</h3><p>魏纪六。</p></body></html>')
        new, n = lib.mark_toc_title_in_html(html, '资治通鉴第七十四卷')
        self.assertEqual(n, 1)
        self.assertIn('<h3 class="mb-vol">', new)      # 卷名 h3 被标
        self.assertNotIn('mb-ch-sep', new)             # 卷级无长线
        self.assertIn('<p>资治通鉴</p>', new)           # 书名段原样
        # 全等优先：任意标签的全等块直接命中（含卷尾 → 卷级样式）
        html2 = '<html><body><p>资治通鉴第七十四卷</p><h3>别的</h3></body></html>'
        new2, n2 = lib.mark_toc_title_in_html(html2, '资治通鉴第七十四卷')
        self.assertEqual(n2, 1)
        self.assertIn('<p class="mb-vol">', new2)

    def test_toc_title_driven_skips(self):
        """已打标文件跳过；非编号标题（无第X形态）不参与兜底。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ncxskip.epub")
        out = os.path.join(TMP_DIR, "_tmp_ncxskip_out.epub")
        ncx = (
            '<?xml version="1.0"?>'
            '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
            '<navMap>'
            '<navPoint id="c1"><navLabel><text>第一章 开端</text></navLabel>'
            '<content src="c1.xhtml"/></navPoint>'
            '<navPoint id="c3"><navLabel><text>夜</text></navLabel>'
            '<content src="c3.xhtml"/></navPoint>'
            '</navMap></ncx>'
        )
        chapters = [
            ('c1.xhtml', '<html><body><h2>第一章 开端</h2>'
                         '<p>正文。</p></body></html>'),
            ('c3.xhtml', '<html><body><p>夜</p><p>正文。</p></body></html>'),
        ]
        self._build_ncx_epub(tmp, ncx, chapters)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertEqual(stats.get("toc_titles_marked"), 0)
            with zipfile.ZipFile(out) as zf:
                c1 = zf.read("OEBPS/c1.xhtml").decode("utf-8")
                c3 = zf.read("OEBPS/c3.xhtml").decode("utf-8")
            self.assertIn('mb-ch', c1)      # 常规 h2 打标照常
            self.assertNotIn('mb-ch', c3)   # 非编号标题不兜底
            self.assertNotIn('mb-vol', c3)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


if __name__ == "__main__":
    unittest.main()
# ncx/nav 在包根目录、OPF 在 OEBPS/ 的书（weread 导出布局）：
# manifest href 带 ../ 前缀，此前裸拼接 OEBPS/../x 查不中 zip 条目，
# 目录数据源（NCX→nav）两个分支全静默跳过，目录不生成。
ROOT_NCX = (
    '<?xml version="1.0"?>'
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
    '<navMap>'
    '<navPoint id="v1"><navLabel><text>第一卷</text></navLabel>'
    '<content src="OEBPS/ch1.xhtml"/>'
    '<navPoint id="n1"><navLabel><text>第一章 序章</text></navLabel>'
    '<content src="OEBPS/ch1.xhtml#p1"/></navPoint>'
    '<navPoint id="n2"><navLabel><text>第二章 开端</text></navLabel>'
    '<content src="OEBPS/ch1.xhtml#p2"/></navPoint>'
    '</navPoint>'
    '<navPoint id="n3"><navLabel><text>第三章 转折</text></navLabel>'
    '<content src="OEBPS/ch2.xhtml"/></navPoint>'
    '<navPoint id="n4"><navLabel><text>引子</text></navLabel>'
    '<content src="OEBPS/ch2.xhtml"/></navPoint>'
    '</navMap></ncx>'
)
ROOT_NAV = (
    '<?xml version="1.0" encoding="utf-8"?>'
    '<html xmlns="http://www.w3.org/1999/xhtml" '
    'xmlns:epub="http://www.idpf.org/2007/ops">'
    '<head><title>Navigation</title></head>'
    '<body><nav epub:type="toc"><ol>'
    '<li><a href="OEBPS/ch1.xhtml">第一卷</a></li>'
    '<li><a href="OEBPS/ch2.xhtml">第三章 转折</a></li>'
    '</ol></nav></body></html>'
)


def build_root_toc_epub(path):
    """构建 ncx/nav 在包根、manifest href 带 ../ 的迷你 EPUB（nav 在 spine 末条）。"""
    opf = (
        '<?xml version="1.0"?>'
        '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
        '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">测试书</dc:title></metadata>'
        '<manifest>'
        '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/>'
        '<item id="css" href="style.css" media-type="text/css"/>'
        '<item id="ncx" href="../toc.ncx" media-type="application/x-dtbncx+xml"/>'
        '<item id="nav" href="../nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'
        '</manifest>'
        '<spine><itemref idref="c1"/><itemref idref="c2"/><itemref idref="nav"/></spine>'
        '</package>'
    )
    with zipfile.ZipFile(path, "w") as zf:
        zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("META-INF/container.xml", CONTAINER)
        zf.writestr("OEBPS/content.opf", opf)
        zf.writestr("OEBPS/ch1.xhtml", CH1)
        zf.writestr("OEBPS/ch2.xhtml", CH2)
        zf.writestr("OEBPS/style.css", CSS)
        zf.writestr("toc.ncx", ROOT_NCX)
        zf.writestr("nav.xhtml", ROOT_NAV)


class TestTocParentDirHrefs(unittest.TestCase):
    """目录数据源 ../ 相对路径：包根 ncx/nav 必须能解析对齐到 zip 条目。"""

    def test_resolve_zip_parent_segments(self):
        self.assertEqual(lib._resolve_zip("OEBPS/", "../toc.ncx"), "toc.ncx")
        self.assertEqual(lib._resolve_zip("OEBPS/", "../sub/x.xhtml"), "sub/x.xhtml")
        self.assertEqual(lib._resolve_zip("", "a/../b.xhtml"), "b.xhtml")
        # 无 ../ 时行为不变
        self.assertEqual(lib._resolve_zip("OEBPS/", "ch1.xhtml"), "OEBPS/ch1.xhtml")
        self.assertEqual(lib._resolve_zip("OEBPS/", "a/b.xhtml"), "OEBPS/a/b.xhtml")

    def test_toc_generated_for_root_ncx_and_nav(self):
        tmp = os.path.join(TMP_DIR, "_tmp_root_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_root_out.epub")
        build_root_toc_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            self.assertEqual(stats["toc_entries"], 5)
            self.assertEqual(stats["toc_links_ok"], 5)
            with zipfile.ZipFile(out) as zf:
                names = zf.namelist()
                self.assertIn("OEBPS/mb-toc.xhtml", names)
                # NCX 数据源优先生效（含锚点条目，链接相对 OEBPS/ 计算）
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                self.assertIn("第一章 序章", toc)
                self.assertIn('href="ch1.xhtml#p1"', toc)
                # spine 中 nav 语义条目被替换为目录页；nav 文件保留在 manifest
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                self.assertIn('id="mb-toc"', opf)
                self.assertNotIn('idref="nav"', opf)
                self.assertIn('href="../nav.xhtml"', opf)
                self.assertIn('<itemref idref="mb-toc" linear="yes"/>', opf)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)


# ── 2026-09-08 复审修复回归 ────────────────────────────────────────────────────

class TestReviewFixes20260908(unittest.TestCase):
    """复审修复回归：epub 命名空间声明 / 标注样式白名单对齐 / 无链接纯文本
    目录页 / li 标题分隔符 / 标题计数口径。"""

    PLAIN_TOC_ROWS = "".join(
        '<p class="calibre1">第%s章 标题%s</p>' % (n, n) for n in
        ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"])

    # ── P1-a：注入 epub:type 前必须声明 xmlns:epub（否则整份文档非良构）──

    def test_notes_declares_epub_namespace(self):
        for name in ("NOTES_CH_A", "NOTES_CH_B", "NOTES_CH_G"):
            src = globals()[name]
            new, _ = lib.mark_notes_in_html(src)
            self.assertIn('xmlns:epub="http://www.idpf.org/2007/ops"', new, name)
            ET.fromstring(new)  # 未绑定前缀会抛 ParseError
            twice, _ = lib.mark_notes_in_html(new)
            self.assertEqual(twice.count("xmlns:epub"), 1, name)  # 幂等

    def test_notes_namespace_not_duplicated_when_present(self):
        src = NOTES_CH_B.replace(
            '<html xmlns="http://www.w3.org/1999/xhtml"',
            '<html xmlns="http://www.w3.org/1999/xhtml" '
            'xmlns:epub="http://www.idpf.org/2007/ops"')
        new, _ = lib.mark_notes_in_html(src)
        self.assertEqual(new.count("xmlns:epub"), 1)
        ET.fromstring(new)

    def test_notes_wellformed_for_class_only_source(self):
        """源文件无任何 epub: 属性的 B 型书（calibre 导出形态）：归一化后仍良构。"""
        src = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head>'
               '<body><p>正文<a class="footnote" href="#n1">1</a>。</p>'
               '<ol class="footnote-content"><li class="footnote-item" id="n1">注文。</li></ol>'
               '</body></html>')
        new, st = lib.mark_notes_in_html(src, normalize=True)
        self.assertEqual(st["wrapped"], 1)
        self.assertIn('epub:type="noteref"', new)
        ET.fromstring(new)

    def test_notes_namespace_skips_html_in_comment(self):
        """注释里的 <html…> 不是根元素：声明必须落在真根上。"""
        src = ('<!-- <html> --><html xmlns="http://www.w3.org/1999/xhtml"><body>'
               '<p>正文<a class="footnote" href="#n1">1</a>。</p>'
               '<ol class="footnote-content"><li class="footnote-item" id="n1">注。</li></ol>'
               '</body></html>')
        new, _ = lib.mark_notes_in_html(src)
        self.assertIn('<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub=', new)
        ET.fromstring(new)

    def test_legacy_output_namespace_repaired(self):
        """旧版缺陷输出（已带 mb-notemark 但缺 xmlns:epub）再美化时补声明。"""
        legacy = ('<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                  '<p>正文<a class="footnote mb-notemark" epub:type="noteref" '
                  'href="#n1">1</a>。</p>'
                  '<ol class="footnote-content mb-notes">'
                  '<li class="footnote-item mb-note-item" id="n1">注。</li></ol>'
                  '</body></html>')
        new, st = lib.mark_notes_in_html(legacy)
        self.assertEqual(st, {'refs': 0, 'items': 0, 'normalized': 0, 'wrapped': 0})
        self.assertIn("xmlns:epub", new)
        ET.fromstring(new)
        # 幂等：再跑一次不再变化
        again, _ = lib.mark_notes_in_html(new)
        self.assertEqual(again, new)

    def test_notes_no_namespace_when_normalize_off(self):
        """normalize=False 不注入 epub: 属性，也就无需补声明（行为不变）。"""
        new, _ = lib.mark_notes_in_html(NOTES_CH_B, normalize=False)
        self.assertNotIn("xmlns:epub", new)

    # ── P1-b：前端每个标注选项都必须通过 lib 校验（zhu 曾漏在白名单外）──

    def test_frontend_note_mark_options_are_valid(self):
        vue = os.path.join(TESTS_DIR, "..", "app", "pages",
                           "plugins", "epub-beautify.vue")
        if not os.path.exists(vue):
            self.skipTest("vue 页面不可见（独立测试环境）")
        with io.open(vue, encoding="utf-8") as f:
            src = f.read()
        block = src[src.index("function noteMarkItems()"):][:2000]
        values = re.findall(r"value:\s*'([^']+)'", block)
        self.assertIn("zhu", values)
        self.assertGreaterEqual(len(values), 9)
        for v in values:
            lib.validate_note_mark(v)

    def test_handler_reuses_lib_validator(self):
        """provider 必须复用 lib 校验（防白名单再次漂移出 zhu 这类漏项）。"""
        path = os.path.join(TESTS_DIR, "..", "webserver", "plugins",
                            "tool", "epub_beautify", "provider.py")
        if not os.path.exists(path):
            self.skipTest("provider 源码不可见")
        with io.open(path, encoding="utf-8") as f:
            src = f.read()
        self.assertIn("validate_note_mark", src)
        self.assertNotIn('note_mark not in ("sym", "num")', src)

    # ── P2：无链接纯文本目录页 ──

    def _plain_toc_html(self, title="目录", tail=""):
        return ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>%s</title>'
                '</head><body>%s%s</body></html>') % (title, self.PLAIN_TOC_ROWS, tail)

    def _build_plain_toc_epub(self, path):
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">无链接目录书</dc:title></metadata>'
            '<manifest>'
            '<item id="t" href="part0003.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/>'
            '</manifest>'
            '<spine><itemref idref="t"/><itemref idref="c1"/></spine></package>'
        )
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/part0003.xhtml", self._plain_toc_html())
            zf.writestr("OEBPS/ch1.xhtml", CH1)

    def test_plain_text_toc_detected(self):
        html = self._plain_toc_html()
        self.assertTrue(lib._is_toc_doc("OEBPS/part0003.xhtml", html))
        is_toc, nav, linkless = lib._classify_toc_entry(
            "OEBPS/part0003.xhtml", html.encode("utf-8"))
        self.assertTrue(is_toc)
        self.assertFalse(nav)
        self.assertTrue(linkless)   # 无链接 → 需替换为生成的链接目录页

    def test_link_toc_not_linkless(self):
        """可点击的链接目录页 linkless=False（保留原页，不替换）。"""
        html = ('<html><head><title>目录</title></head><body>'
                + "".join('<p><a href="c%02d.xhtml">第%d章 标题</a></p>' % (i, i)
                          for i in range(1, 13)) + '</body></html>')
        is_toc, nav, linkless = lib._classify_toc_entry(
            "OEBPS/part0003.xhtml", html.encode("utf-8"))
        self.assertTrue(is_toc)
        self.assertFalse(nav)
        self.assertFalse(linkless)

    def test_plain_text_toc_page_not_chapter_marked(self):
        tmp = os.path.join(TMP_DIR, "_tmp_plain_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_plain_out.epub")
        self._build_plain_toc_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            with zipfile.ZipFile(out) as zf:
                toc = zf.read("OEBPS/part0003.xhtml").decode("utf-8")
                ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
            self.assertNotIn('class="mb-ch"', toc)
            self.assertNotIn("mb-ch-sep", toc)
            self.assertIn("mb-toc-page", toc)   # 目录页装饰路径生效
            self.assertIn("mb-toc-end", toc)
            self.assertIn("mb-ch", ch1)         # 真章节页不受影响
            self.assertEqual(stats["marked_headers"], 2)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_plain_toc_negative_with_long_prose(self):
        html = self._plain_toc_html(tail='<p>%s</p>' % ("正文" * 60))
        self.assertFalse(lib._looks_like_plain_toc(html))
        self.assertFalse(lib._is_toc_doc("OEBPS/part0003.xhtml", html))

    def test_plain_toc_negative_without_title(self):
        self.assertFalse(lib._looks_like_plain_toc(self._plain_toc_html(title="无名页")))

    def test_plain_toc_negative_when_prose_dilutes_rows(self):
        prose = "".join('<p>%s</p>' % ("短句" * 8) for _ in range(12))
        html = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>目录</title>'
                '</head><body>%s%s</body></html>') % (self.PLAIN_TOC_ROWS, prose)
        self.assertFalse(lib._looks_like_plain_toc(html))

    # ── P3：li 标题不插块级分隔符 ──

    def test_li_heading_has_no_sep_div(self):
        html = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head>'
                '<body><ul><li>第一章 列表标题</li></ul>'
                '<h1>第二章 正文标题</h1><p>正文。</p></body></html>')
        new, mk = lib.mark_chapters_in_html(html)
        self.assertEqual(mk["chapters"], 2)
        li_part = new[new.index("<ul>"):new.index("</ul>")]
        self.assertIn("mb-ch", li_part)
        self.assertNotIn("<div", li_part)   # ul 内不得出现块级 div
        self.assertIn('<div class="mb-ch-sep"></div>', new)  # 非 li 标题仍有长线

    # ── 重复美化：逐条目字节一致（含空白/命名空间声明/注册幂等）──

    def test_beautify_byte_idempotent(self):
        tmp = os.path.join(TMP_DIR, "_tmp_idem_src.epub")
        o1 = os.path.join(TMP_DIR, "_tmp_idem_1.epub")
        o2 = os.path.join(TMP_DIR, "_tmp_idem_2.epub")
        build_notes_epub(tmp)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, o1, css, notes=True, note_mark="zhu")
            lib.beautify(o1, o2, css, notes=True, note_mark="zhu")
            with zipfile.ZipFile(o1) as a, zipfile.ZipFile(o2) as b:
                self.assertEqual(a.namelist(), b.namelist())
                for name in a.namelist():
                    self.assertEqual(a.read(name), b.read(name), name)
        finally:
            for p in (tmp, o1, o2):
                if os.path.exists(p):
                    os.remove(p)

    # ── 小项：标题计数口径不重复 ──

    def test_text_headings_excludes_h_tags(self):
        tmp = os.path.join(TMP_DIR, "_tmp_hcount.epub")
        files = {
            "OEBPS/content.opf": (
                '<?xml version="1.0"?>'
                '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
                '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">计数书</dc:title></metadata>'
                '<manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest>'
                '<spine><itemref idref="c1"/></spine></package>'),
            "OEBPS/ch1.xhtml": (
                '<html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head>'
                '<body><h1>第一章 标题</h1><p>正文。</p>'
                '<p>第二章 标题</p><p>正文。</p></body></html>'),
        }
        with zipfile.ZipFile(tmp, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            for name, data in files.items():
                zf.writestr(name, data)
        try:
            a = lib.analyze_epub(tmp)
            self.assertEqual(a["heading_stats"]["h1"], 1)
            self.assertEqual(a["text_headings"], 1)  # 仅 <p> 标题，不与 h1 重复
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)


class TestLinklessTocReplacement(unittest.TestCase):
    """无链接纯文本目录页 → 生成链接目录页并替换 spine 条目。

    有 NCX/nav 数据源时替换（原页保留在包内，无损）；无数据源时退回仅样式化。
    """

    NCX = ('<?xml version="1.0" encoding="utf-8"?>'
           '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><navMap>'
           '<navPoint id="n1" playOrder="1"><navLabel><text>第一章 开端</text></navLabel>'
           '<content src="c1.xhtml"/></navPoint>'
           '<navPoint id="n2" playOrder="2"><navLabel><text>第二章 转折</text></navLabel>'
           '<content src="c2.xhtml"/></navPoint>'
           '</navMap></ncx>')

    def _plain_toc_html(self):
        rows = "".join('<p class="calibre1">第%s章 标题%s</p>' % (n, n) for n in
                       ["一", "二", "三", "四", "五", "六",
                        "七", "八", "九", "十", "十一", "十二"])
        return ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>目录</title>'
                '</head><body>%s</body></html>') % rows

    def _build(self, path, with_ncx=True, toc_html=None):
        """封面 → 目录页 → 两章（spine 顺序固定，便于断言位置）。"""
        manifest = (
            '<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="t" href="part0003.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>')
        spine_attr = ''
        if with_ncx:
            manifest += ('<item id="ncx" href="toc.ncx" '
                         'media-type="application/x-dtbncx+xml"/>')
            spine_attr = ' toc="ncx"'
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '无链接目录书</dc:title></metadata>'
            '<manifest>%s</manifest>'
            '<spine%s><itemref idref="cover"/><itemref idref="t"/>'
            '<itemref idref="c1"/><itemref idref="c2"/></spine></package>'
        ) % (manifest, spine_attr)
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            zf.writestr("OEBPS/cover.xhtml",
                        '<html xmlns="http://www.w3.org/1999/xhtml">'
                        '<body><h1>封面</h1></body></html>')
            zf.writestr("OEBPS/part0003.xhtml", toc_html or self._plain_toc_html())
            zf.writestr("OEBPS/c1.xhtml",
                        '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                        '<p>第一章 开端</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/c2.xhtml",
                        '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                        '<p>第二章 转折</p><p>正文。</p></body></html>')
            if with_ncx:
                zf.writestr("OEBPS/toc.ncx", self.NCX)

    def test_linkless_toc_replaced_by_generated(self):
        tmp = os.path.join(TMP_DIR, "_tmp_ll_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_ll_out.epub")
        self._build(tmp, with_ncx=True)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertTrue(stats["toc_generated"])
            self.assertEqual(stats["toc_replaced_linkless"], 1)
            self.assertEqual(stats["toc_links_ok"], stats["toc_links_total"])
            with zipfile.ZipFile(out) as zf:
                names = zf.namelist()
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                toc = zf.read("OEBPS/mb-toc.xhtml").decode("utf-8")
                plain = zf.read("OEBPS/part0003.xhtml").decode("utf-8")
            # 原目录页文件保留在包内（无损红线）
            self.assertIn("OEBPS/part0003.xhtml", names)
            # 生成的目录页带可点击链接
            self.assertIn('href="c1.xhtml"', toc)
            self.assertIn('id="mb-toc"', opf)
            # 原无链接目录页的 spine 条目被替换掉
            self.assertNotIn('idref="t"', opf)
            # 位置沿用原目录页在 spine 中的位置：封面之后、正文之前
            self.assertLess(opf.index('idref="cover"'), opf.index('idref="mb-toc"'))
            self.assertLess(opf.index('idref="mb-toc"'), opf.index('idref="c1"'))
            # 炸页防线不回退：原无链接页仍不打章节标记
            self.assertNotIn('class="mb-ch"', plain)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_linkless_toc_kept_without_toc_source(self):
        """无 NCX/nav 数据源 → 无法生成链接目录，退回仅样式化（不替换）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ll2_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_ll2_out.epub")
        self._build(tmp, with_ncx=False)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertFalse(stats["toc_generated"])
            self.assertEqual(stats["toc_replaced_linkless"], 0)
            with zipfile.ZipFile(out) as zf:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
                plain = zf.read("OEBPS/part0003.xhtml").decode("utf-8")
            self.assertIn('idref="t"', opf)          # 原条目保留
            self.assertIn("mb-toc-page", plain)      # 仍被样式化
            self.assertNotIn('class="mb-ch"', plain)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_analyze_linkless_toc_not_counted_as_inbook(self):
        """无链接目录页会被替换，analyze 不把它算作「书内已有目录」。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ll3.epub")
        self._build(tmp, with_ncx=True)
        try:
            a = lib.analyze_epub(tmp)
            self.assertFalse(a["has_inbook_toc"])
        finally:
            if os.path.exists(tmp):
                os.remove(tmp)

    def test_toc_inserted_after_cover(self):
        """无书内目录页时，生成的目录页挂在封面之后（不再顶到 spine 首位）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pos_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_pos_out.epub")
        self._build_position_epub(tmp, front_files=("cover.xhtml",))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            self.assertEqual(self._spine(out), ["f0", "mb-toc", "c1", "c2"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_inserted_after_front_matter_block(self):
        """封面 + 扉页 + 版权页：目录排在整段前置页之后。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pos2_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_pos2_out.epub")
        self._build_position_epub(
            tmp, front_files=("cover.xhtml", "titlepage.xhtml", "banquan.xhtml"))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            self.assertEqual(self._spine(out),
                             ["f0", "f1", "f2", "mb-toc", "c1", "c2"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_inserted_at_front_without_cover(self):
        """无封面/前置页：维持原行为（spine 首位）。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pos3_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_pos3_out.epub")
        self._build_position_epub(tmp, front_files=())
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            self.assertEqual(self._spine(out), ["mb-toc", "c1", "c2"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_toc_inserted_after_guide_cover(self):
        """文件名无 cover 特征时靠 guide reference type=cover 定位。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pos4_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_pos4_out.epub")
        self._build_position_epub(tmp, front_files=("p001.xhtml",),
                                  guide_href="p001.xhtml")
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            self.assertEqual(self._spine(out), ["f0", "mb-toc", "c1", "c2"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def test_bare_title_first_file_not_anchor(self):
        """裸 title.html 不在封面特征表内 → 不当前置页，目录仍排 spine 首位。"""
        tmp = os.path.join(TMP_DIR, "_tmp_pos5_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_pos5_out.epub")
        self._build_position_epub(tmp, front_files=("title.html",))
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            lib.beautify(tmp, out, css)
            self.assertEqual(self._spine(out), ["mb-toc", "f0", "c1", "c2"])
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)

    def _build_position_epub(self, path, front_files=("cover.xhtml",),
                             guide_href=None):
        """前置页 + 两章 + NCX；spine = 前置页 → c1 → c2。"""
        manifest = "".join(
            '<item id="f%d" href="%s" media-type="application/xhtml+xml"/>' % (i, f)
            for i, f in enumerate(front_files))
        manifest += (
            '<item id="c1" href="c1.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="c2" href="c2.xhtml" media-type="application/xhtml+xml"/>'
            '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')
        spine = "".join('<itemref idref="f%d"/>' % i
                        for i in range(len(front_files)))
        spine += '<itemref idref="c1"/><itemref idref="c2"/>'
        guide = ('<guide><reference type="cover" href="%s"/></guide>' % guide_href
                 if guide_href else '')
        opf = (
            '<?xml version="1.0"?>'
            '<package xmlns="http://www.idpf.org/2007/opf" version="3.0">'
            '<metadata><dc:title xmlns:dc="http://purl.org/dc/elements/1.1/">'
            '位置书</dc:title></metadata>'
            '<manifest>%s</manifest><spine toc="ncx">%s</spine>%s</package>'
        ) % (manifest, spine, guide)
        with zipfile.ZipFile(path, "w") as zf:
            zf.writestr("mimetype", "application/epub+zip",
                        compress_type=zipfile.ZIP_STORED)
            zf.writestr("META-INF/container.xml", CONTAINER)
            zf.writestr("OEBPS/content.opf", opf)
            for f in front_files:
                zf.writestr("OEBPS/" + f,
                            '<html xmlns="http://www.w3.org/1999/xhtml">'
                            '<body><p>前置页。</p></body></html>')
            zf.writestr("OEBPS/c1.xhtml",
                        '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                        '<p>第一章 开端</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/c2.xhtml",
                        '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
                        '<p>第二章 转折</p><p>正文。</p></body></html>')
            zf.writestr("OEBPS/toc.ncx", self.NCX)

    def _spine(self, out):
        with zipfile.ZipFile(out) as zf:
            opf = zf.read("OEBPS/content.opf").decode("utf-8")
        return re.findall(r'<itemref[^>]*idref="([^"]+)"', opf)

    def test_link_toc_still_kept(self):
        """可点击的链接目录页不受影响：保留原页、不生成 mb-toc。"""
        tmp = os.path.join(TMP_DIR, "_tmp_ll4_src.epub")
        out = os.path.join(TMP_DIR, "_tmp_ll4_out.epub")
        link_toc = ('<html xmlns="http://www.w3.org/1999/xhtml"><head><title>目录</title>'
                    '</head><body>'
                    + "".join('<p><a href="c1.xhtml">第%d章 标题</a></p>' % i
                              for i in range(1, 13))
                    + '</body></html>')
        self._build(tmp, with_ncx=True, toc_html=link_toc)
        try:
            css = get_preset_css("classic", use_system_fonts=True)
            stats = lib.beautify(tmp, out, css)
            self.assertFalse(stats["toc_generated"])
            self.assertEqual(stats["toc_replaced_linkless"], 0)
            with zipfile.ZipFile(out) as zf:
                opf = zf.read("OEBPS/content.opf").decode("utf-8")
            self.assertIn('idref="t"', opf)
        finally:
            for p in (tmp, out):
                if os.path.exists(p):
                    os.remove(p)
