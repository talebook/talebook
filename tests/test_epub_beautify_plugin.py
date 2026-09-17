# -*- coding: utf-8 -*-
"""epub_beautify provider 契约与端到端测试（standalone，不依赖 calibre）。

覆盖：manifest 校验、preview 分析、apply 生成新 EPUB、参数非法时的业务错误。
HTTP/权限/审计层在 tests/test_texttools.py（需要 calibre 环境）中覆盖。
"""

import os
import tempfile
import unittest
import zipfile

from tests.test_epub_beautify import build_mini_epub
from webserver.plugins.runtime import PluginManifest, ToolInput, contract_violations
from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.tool.epub_beautify.provider import PROVIDER


class TestManifest(unittest.TestCase):
    def test_manifest_valid_and_capability_contract(self):
        manifest = PluginManifest.validate(PROVIDER.manifest)
        self.assertEqual(manifest.raw["id"], "talebook.tool.epub-beautify")
        self.assertEqual(manifest.raw["capabilities"], ["integrations.tool"])
        self.assertEqual(contract_violations(PROVIDER, manifest), [])

    def test_supported_formats_is_epub_only(self):
        self.assertEqual(set(PROVIDER.supported_formats), {"EPUB"})

    def test_describe_exposes_presets_and_toc_styles(self):
        described = PROVIDER.describe()
        self.assertEqual(len(described["presets"]), 12)
        self.assertEqual(len(described["toc_styles"]), 4)
        self.assertEqual(len(described["textures"]), 6)
        self.assertTrue(all("accent" in item for item in described["presets"]))


class TestProviderRoundTrip(unittest.TestCase):
    def setUp(self):
        self._dir = tempfile.mkdtemp(prefix="talebook-epub-beautify-")
        self.src = os.path.join(self._dir, "src.epub")
        build_mini_epub(self.src)

    def _input(self, **extra):
        value = {"path": self.src, "format": "EPUB", "preset": "classic", "toc_style": "elegant"}
        value.update(extra)
        return ToolInput.from_dict(value)

    def test_preview_returns_analysis(self):
        report = PROVIDER.preview(self._input(), {})
        self.assertIn("analysis", report)
        self.assertEqual(len(report["presets"]), 12)
        self.assertEqual(len(report["toc_styles"]), 4)

    def test_apply_generates_new_epub(self):
        out_dir = os.path.join(self._dir, "out")
        os.makedirs(out_dir)
        output = PROVIDER.apply(self._input(), out_dir, {})
        self.assertEqual(output["format"], "EPUB")
        self.assertEqual(output["preset"], "classic")
        self.assertTrue(os.path.isfile(output["path"]))
        with zipfile.ZipFile(output["path"]) as zf:
            names = zf.namelist()
            self.assertIn("OEBPS/mb-beauty.css", names)
            self.assertIn("OEBPS/mb-toc.xhtml", names)
            self.assertIn("OEBPS/ch1.xhtml", names)
        # 原书零改动：源文件未被触碰
        with zipfile.ZipFile(self.src) as zf:
            self.assertNotIn("OEBPS/mb-beauty.css", zf.namelist())

    def test_apply_is_idempotent_on_reread(self):
        out_dir = os.path.join(self._dir, "out2")
        os.makedirs(out_dir)
        first = PROVIDER.apply(self._input(), out_dir, {})["path"]
        out_dir3 = os.path.join(self._dir, "out3")
        os.makedirs(out_dir3)
        second = PROVIDER.apply(
            ToolInput.from_dict({"path": first, "format": "EPUB", "preset": "classic", "toc_style": "elegant"}),
            out_dir3,
            {},
        )["path"]
        with zipfile.ZipFile(first) as zf:
            first_ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
        with zipfile.ZipFile(second) as zf:
            second_ch1 = zf.read("OEBPS/ch1.xhtml").decode("utf-8")
        # 重跑不累积标记：第二遍的正文与第一遍逐字一致
        self.assertEqual(first_ch1, second_ch1)
        self.assertEqual(second_ch1.count('class="mb-ch"'), first_ch1.count('class="mb-ch"'))

    def test_unknown_preset_raises(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(self._input(preset="does-not-exist"), self._dir, {})

    def test_apply_with_builtin_texture(self):
        out_dir = os.path.join(self._dir, "out-bg")
        os.makedirs(out_dir)
        output = PROVIDER.apply(self._input(bg_texture="xuanzhi"), out_dir, {})
        with zipfile.ZipFile(output["path"]) as zf:
            self.assertIn("OEBPS/mb-bg.jpg", zf.namelist())
            css = zf.read("OEBPS/mb-beauty.css").decode("utf-8")
        self.assertIn("mb-bg.jpg", css)

    def test_invalid_texture_raises(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(self._input(bg_texture="does-not-exist"), self._dir, {})

    def test_invalid_note_mark_raises(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(self._input(notes=True, note_mark="bogus"), self._dir, {})

    def test_unsupported_format_raises(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(ToolInput.from_dict({"path": self.src, "format": "TXT"}), self._dir, {})

    def test_missing_file_raises(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(
                ToolInput.from_dict({"path": os.path.join(self._dir, "nope.epub"), "format": "EPUB", "preset": "classic"}),
                self._dir,
                {},
            )

    def test_apply_requires_out_dir(self):
        with self.assertRaises(UpstreamError):
            PROVIDER.apply(self._input(), "", {})


if __name__ == "__main__":
    unittest.main()
