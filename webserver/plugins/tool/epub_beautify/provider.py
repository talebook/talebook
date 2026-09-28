import os

from webserver.plugins.runtime.domains import ToolOutput, ToolReport
from webserver.plugins.runtime.protocol import UpstreamError

from ..base import TextTransformPlugin, _manifest
from .beautify_lib import analyze_epub, beautify, validate_note_mark
from .styles import get_preset_css, get_texture_bytes, list_builtin_textures, list_presets, list_toc_styles

# 预设卡片可视化所需的色板字段（presets.json 元数据直通）。
_PRESET_PALETTE_KEYS = (
    "scene",
    "line_height",
    "title_size",
    "accent",
    "accent_light",
    "accent_dark",
    "muted",
    "border",
    "quote_bg",
    "code_bg",
    "toc_gradient",
    "page_progression",
)


class EpubBeautifyTransformPlugin(TextTransformPlugin):
    """对 EPUB 执行无损美化并生成新书（原书零改动）。"""

    def __init__(self):
        super().__init__(
            _manifest(
                "talebook.tool.epub-beautify",
                "EPUB 美化",
                "美化 EPUB 的目录、章节名与字体排版（12 套预设 × 4 种目录形式，含竖排右翻古籍），生成新书，原书零改动。",
                ["integrations"],
                ["integrations.tool"],
                ["books.read", "books.write"],
                {
                    "icon": "mdi-book-refresh-outline",
                    "manage_route": "/plugins/epub-beautify",
                    "primary_action": "open",
                    "healthy_message": "EPUB 美化工具可用",
                },
            ),
            {"EPUB"},
        )

    # ------------------------------------------------------------ 元数据

    @staticmethod
    def preset_items():
        """预设列表（含前端卡片所需色板字段）。"""
        items = []
        for preset_id, meta in list_presets().items():
            item = {
                "id": preset_id,
                "name": meta.get("name", preset_id),
                "name_en": meta.get("name_en", preset_id),
                "description": meta.get("description", ""),
            }
            for key in _PRESET_PALETTE_KEYS:
                if key in meta:
                    item[key] = meta[key]
            items.append(item)
        return items

    @staticmethod
    def describe():
        """无书籍依赖的选项元数据，供工具页初始化渲染。"""
        return {
            "presets": EpubBeautifyTransformPlugin.preset_items(),
            "toc_styles": list_toc_styles(),
            "textures": list_builtin_textures(),
        }

    # ------------------------------------------------------------ 参数归一

    @staticmethod
    def _normalize_font_overrides(use_system_fonts, font_overrides):
        """归一化字体子开关：兼容旧布尔与新细粒度 dict。"""
        if isinstance(font_overrides, dict):
            return {key: bool(font_overrides.get(key, use_system_fonts)) for key in ("body", "head", "kai", "code")}
        if use_system_fonts is None:
            return None
        value = bool(use_system_fonts)
        return {"body": value, "head": value, "kai": value, "code": value}

    def _plan(self, src):
        """校验并归一化 apply 参数，返回 (preset, preset_css, beautify_kwargs)。

        :raises UpstreamError: 参数非法（预设/目录形式/配色/段距/标注样式）。
        """
        para_mode = src.get("para_mode")
        if para_mode not in (None, "", "indent", "spacing"):
            raise UpstreamError("参数不合法：para_mode=%s" % para_mode)
        eff_indent = src.get("para_indent")
        if eff_indent is None and para_mode == "spacing":
            eff_indent = False
        raw_sys_fonts = src.get("use_system_fonts", True)
        use_system_fonts = True if raw_sys_fonts is None else bool(raw_sys_fonts)
        overrides = self._normalize_font_overrides(use_system_fonts, src.get("font_overrides"))
        preset = str(src.get("preset") or "")
        toc_style = str(src.get("toc_style") or "")
        raw_tint = src.get("page_tint")
        bg_texture = str(src.get("bg_texture") or "")
        bg_image = None
        extra_assets = None
        if bg_texture:
            try:
                data, media_type = get_texture_bytes(bg_texture)
            except ValueError as err:
                raise UpstreamError("背景纹理不合法：%s" % err)
            bg_image = {"url": "mb-bg.jpg"}
            extra_assets = {"mb-bg.jpg": (data, media_type)}
            # 背景图接管底色语义，避免与 page_tint 叠加出重复声明
            raw_tint = None
        try:
            preset_css = get_preset_css(
                preset,
                use_system_fonts,
                toc_style,
                overrides,
                palette_overrides=src.get("palette_overrides"),
                page_tint=raw_tint,
                bg_image=bg_image,
                para_indent=(True if eff_indent is None else bool(eff_indent)),
                para_gap=src.get("para_gap"),
                toc_columns=bool(src.get("toc_columns")),
            )
        except ValueError as err:
            raise UpstreamError("参数不合法（预设/目录形式/配色/段距）：%s" % err)
        notes = bool(src.get("notes"))
        note_mark = str(src.get("note_mark") or "orig")
        if notes:
            try:
                validate_note_mark(note_mark)
            except ValueError as err:
                raise UpstreamError("标注样式不合法：%s" % err)
        page_progression = (list_presets().get(preset) or {}).get("page_progression") or None
        kwargs = {
            "toc_style": toc_style,
            "page_progression": page_progression,
            "toc_depth": src.get("toc_depth"),
            "cleanup": src.get("cleanup"),
            "dialogue": bool(src.get("dialogue")),
            "split_title": bool(src.get("title_split")),
            "extra_assets": extra_assets,
            "notes": notes,
            "note_mark": note_mark,
        }
        return preset, preset_css, kwargs

    # ------------------------------------------------------------ 契约

    def preview(self, src, context):
        path, _fmt = self._path(src, self.supported_formats)
        analysis = analyze_epub(path)
        return ToolReport.from_dict(
            {
                "analysis": analysis,
                "presets": self.preset_items(),
                "toc_styles": list_toc_styles(),
            }
        )

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        path, fmt = self._path(src, self.supported_formats)
        preset, preset_css, kwargs = self._plan(src)
        out_path = os.path.join(out_dir, "beautified.epub")
        stats = beautify(path, out_path, preset_css, **kwargs)
        return ToolOutput.from_dict(
            {
                "path": out_path,
                "format": fmt,
                "preset": preset,
                "stats": stats,
            }
        )


PROVIDER = EpubBeautifyTransformPlugin()
