# -*- coding: utf-8 -*-
"""样式预设加载器：presets.json 元数据 + css 模板插值。

预设 CSS 模板占位符：{{FONT_BODY}} / {{FONT_HEAD}} / {{FONT_KAI}} / {{FONT_CODE}} /
{{LINE_HEIGHT}} / {{TITLE_SIZE}} / {{ACCENT}} / {{ACCENT_LIGHT}} / {{ACCENT_DARK}} /
{{MUTED}} / {{BORDER}} / {{QUOTE_BG}} / {{CODE_BG}} / {{TOC_GRADIENT}}；
目录样式独立为 toc_{style}.css（elegant 精致版 / cool 酷炫版 / seal 朱印版 / minimal 极简版），
通过 {{TOC_STYLE}} 嵌入主模板；响应式与特殊元素由 responsive.css 通过 {{RESPONSIVE}} 注入。
先对 toc/responsive 文件插值，再整体插值。

use_system_fonts=False 时 FONT_* 占位符替换为空（保留原书字体声明）。
font_overrides 可细粒度控制：{"body":bool,"head":bool,"kai":bool,"code":bool}，
None 时回落到 use_system_fonts。
"""

import json
import os
import re

_PRESETS_DIR = os.path.dirname(os.path.abspath(__file__))

_PLACEHOLDER_RE = re.compile(r"\{\{\s*([A-Z_]+)\s*\}\}")

# 模板占位符 -> presets.json 参数键
_PLACEHOLDER_MAP = {
    "FONT_BODY": "font_body",
    "FONT_HEAD": "font_head",
    "FONT_KAI": "font_kai",
    "FONT_CODE": "font_code",
    "LINE_HEIGHT": "line_height",
    "TITLE_SIZE": "title_size",
    "ACCENT": "accent",
    "ACCENT_LIGHT": "accent_light",
    "ACCENT_DARK": "accent_dark",
    "MUTED": "muted",
    "BORDER": "border",
    "QUOTE_BG": "quote_bg",
    "CODE_BG": "code_bg",
    "TOC_GRADIENT": "toc_gradient",
}

# 可选目录风格
TOC_STYLES = ("elegant", "cool", "seal", "minimal")
DEFAULT_TOC_STYLE = "elegant"


def list_presets() -> dict:
    """返回 {preset_id: 元数据 dict}（不含 css 内容）。"""
    with open(os.path.join(_PRESETS_DIR, "presets.json"), encoding="utf-8") as f:
        return json.load(f)


def list_toc_styles() -> list:
    """返回目录风格列表 [{id, name, name_en}]。"""
    return [
        {"id": "elegant", "name": "精致", "name_en": "Elegant"},
        {"id": "cool", "name": "酷炫", "name_en": "Cool"},
        {"id": "seal", "name": "朱印", "name_en": "Seal"},
        {"id": "minimal", "name": "极简", "name_en": "Minimal"},
    ]


def _interpolate(template: str, params: dict, use_system_fonts: bool, font_overrides: dict = None) -> str:
    """插值模板，支持细粒度字体开关。

    font_overrides: {"body":bool,"head":bool,"kai":bool,"code":bool}，True=用系统字体，False=保留原书。
    优先级高于 use_system_fonts。
    """
    overrides = font_overrides or {}

    def _should_use_font(key: str) -> bool:
        # key like FONT_BODY -> body
        suffix = key.split("_", 1)[1].lower() if "_" in key else key.lower()
        if suffix in overrides:
            return bool(overrides[suffix])
        return bool(use_system_fonts)

    def _replace(match):
        key = match.group(1)
        if key not in _PLACEHOLDER_MAP:
            return match.group(0)
        if key in ("TOC_STYLE", "RESPONSIVE"):
            return match.group(0)  # 已在调用处替换
        if key.startswith("FONT_") and not _should_use_font(key):
            return ""
        value = params.get(_PLACEHOLDER_MAP[key], "")
        return "font-family: %s;" % value if key.startswith("FONT_") else value

    return _PLACEHOLDER_RE.sub(_replace, template)


# ── 自定义配色与全书底色────────────────────────────────────────────
_HEX_RE = re.compile(r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$")
_PALETTE_KEYS = ("accent", "accent_light", "accent_dark", "muted", "border", "quote_bg", "code_bg", "toc_gradient")


def _blend_hex(color: str, target_rgb: tuple, ratio: float) -> str:
    """颜色向目标 RGB 按比例混合，返回 6 位大写 hex。"""
    c = color.lstrip("#")
    if len(c) == 3:
        c = "".join(ch * 2 for ch in c)
    r, g, b = (int(c[i : i + 2], 16) for i in (0, 2, 4))
    mixed = [int(round(v * (1 - ratio) + t * ratio)) for v, t in ((r, target_rgb[0]), (g, target_rgb[1]), (b, target_rgb[2]))]
    return "#%02X%02X%02X" % tuple(mixed)


def _apply_palette_overrides(params: dict, overrides: dict) -> dict:
    """校验并合并自定义色板；覆盖 accent 时自动派生联动色。

    - 键限定 _PALETTE_KEYS，值须为 #RGB / #RRGGBB；
    - 派生规则：accent_dark 向白混合 55%，toc_gradient 用 accent→加深 35% 双停渐变；
      显式给出对应键时不派生。
    非法键 / 非法色值 → ValueError。
    """
    out = dict(params)
    given = {}
    for key, val in (overrides or {}).items():
        if key not in _PALETTE_KEYS:
            raise ValueError("unknown palette key: %s" % key)
        if not isinstance(val, str) or not _HEX_RE.match(val.strip()):
            raise ValueError("invalid hex color for %s: %r" % (key, val))
        given[key] = val.strip().upper()
    out.update(given)
    if "accent" in given:
        acc = given["accent"]
        if "accent_dark" not in given:
            out["accent_dark"] = _blend_hex(acc, (255, 255, 255), 0.55)
        if "toc_gradient" not in given:
            out["toc_gradient"] = "linear-gradient(135deg, %s, %s)" % (acc, _blend_hex(acc, (0, 0, 0), 0.35))
    return out


def _apply_page_tint(css: str, page_tint, params: dict) -> str:
    """三态全书主题底色后处理。

    - None：跟随预设（xuanzhi/vertclassical 自带纸底，其余白底），原样返回；
    - True：日间铺 accent_light 纸色底、夜间保持深色（自带媒体查询重申，
      避免追加规则因层叠位置覆盖 responsive 的夜间底色）；
    - False：清空预设底色回到阅读器默认（日间白/夜间深）。
    """
    if page_tint is True:
        block = (
            "\n\n/* ── 全书主题底色（page_tint=on）── */\n"
            "@media (prefers-color-scheme: light), (prefers-color-scheme: no-preference) {\n"
            "  body { background-color: %s !important; }\n"
            "}\n"
            "@media (prefers-color-scheme: dark) {\n"
            "  body { background-color: #121212 !important; }\n"
            "}\n" % params.get("accent_light", "#FFFFFF")
        )
    elif page_tint is False:
        block = "\n\n/* ── 全书主题底色关闭（page_tint=off）── */\nbody { background-color: transparent !important; }\n"
    else:
        return css
    return css.rstrip() + block


# ── 段落排版自定义（首行缩进开关 + 段间距数值）────────────────────────────────
# 默认跟随预设：缩进制（text-indent 2em、段间 0）；两者均默认时不追加任何规则。

_PARA_BLOCK_HEAD = "\n\n/* ── 段落排版（用户自定义：缩进/段距）── */\n"

# responsive.css 对 Calibre 类汤书用 .calibre* 选择器（:not(.mb-ch):not(.mb-vol)
# 排除标题后实际特异性 0-3-1，带 !important）强制 text-indent/margin，通用 `p`
# 规则（0-0-1）会被压制——responsive 已前置注入，末尾以同选择器列表覆写即可
# （同特异性按源序取胜；列表须与 responsive.css 逐字一致，TestCssCascade 校验，
# 漂移会让顶格/段距开关在类汤书上失效）。:not 同时把标题排除在覆写外，
# 用户段距/顶格不再覆盖预设 .mb-ch 的大顶距。段距覆写仅限段落级选择器：
# 裸 .calibre / .calibre1 常是 body/容器元素，参与段距会造成整页漂移。
_CALIBRE_INDENT_SELECTORS = (
    "p.calibre1:not(.mb-ch):not(.mb-vol), p.calibre:not(.mb-ch):not(.mb-vol), "
    "p.calibre2:not(.mb-ch):not(.mb-vol), div.calibre1:not(.mb-ch):not(.mb-vol), "
    ".calibre1:not(.mb-ch):not(.mb-vol), .calibre:not(.mb-ch):not(.mb-vol)"
)
_CALIBRE_MARGIN_SELECTORS = (
    "p.calibre1:not(.mb-ch):not(.mb-vol), p.calibre:not(.mb-ch):not(.mb-vol), "
    "p.calibre2:not(.mb-ch):not(.mb-vol), div.calibre1:not(.mb-ch):not(.mb-vol)"
)


def _clamp_gap(value) -> float:
    """段间距归一为 [0, 3] 的浮点 em 值；None/非法输入回落 0。"""
    if value is None:
        return 0.0
    try:
        gap = round(float(value), 3)
    except (TypeError, ValueError):
        raise ValueError("invalid para_gap: %r" % (value,))
    if gap < 0:
        gap = 0.0
    elif gap > 3:
        gap = 3.0
    return gap


def _apply_para_style(css: str, para_indent: bool = True, para_gap=None) -> str:
    """段落排版后处理（层叠序在后必胜）：

    - para_indent=False → 全部段落顶格（含 Calibre 类汤书：responsive 的
      ``.calibre*`` 高特异性强制缩进由同选择器末尾覆写归零）；
    - para_gap>0 → 段落下边距取该值（em），并恢复引文内紧凑无段距
      （类汤书的 ``p.calibre*`` 段落同步覆写 margin）。
    通用 p 规则一律 body 前缀（0-0-2）：responsive 手机块同为 body p（A4），
    同特异性靠本块在末尾的源序取胜，用户设置不被手机默认值覆盖。
    均为默认时原样返回，保证存量输出零变化。
    """
    gap = _clamp_gap(para_gap)
    indent_off = para_indent is False
    if not indent_off and gap == 0:
        return css

    p_rules = []
    if indent_off:
        p_rules += [
            "    text-indent: 0 !important;",
            "    duokan-text-indent: 0;",
        ]
    if gap > 0:
        p_rules.append("    margin: 0 0 %sem 0 !important;" % ("%g" % gap))
    block = _PARA_BLOCK_HEAD + "body p {\n" + "\n".join(p_rules) + "\n}"

    # Calibre 类汤书兜底：responsive.css 的 .calibre* 规则（0-1-1）会压制上文
    # 通用 p 规则（0-0-1），导致顶格/段距开关在该类书上失效——同选择器覆写
    if indent_off:
        block += "\n%s {\n    text-indent: 0 !important;\n    duokan-text-indent: 0 !important;\n}" % _CALIBRE_INDENT_SELECTORS
    if gap > 0:
        block += "\n%s {\n    margin: 0 0 %sem 0 !important;\n}" % (_CALIBRE_MARGIN_SELECTORS, "%g" % gap)

    # 缩进仍开启且调整了段距时，章首段顶格需重申（否则被上面的通用规则覆盖）
    if not indent_off:
        block += "\nbody p[data-mb-first] {\n    text-indent: 0 !important;\n    duokan-text-indent: 0;\n}"
    if gap > 0:
        block += (
            "\nblockquote p {\n    text-indent: 2em !important;\n    duokan-text-indent: 2em;\n    margin: 0 !important;\n}"
        )
    return css.rstrip() + block


# ── 目录双栏（宽屏渐进增强）──────────────────────────────────────────────────
_TOC_COLUMNS_CSS_BLOCK = (
    "\n\n/* ── 目录双栏（仅生成的 mb-toc 页；窄屏回落单栏）── */\n"
    "@media (min-width: 32em) {\n"
    "  body.mb-toc-page div.mb-toc ol {\n"
    "    columns: 2;\n"
    "    -webkit-columns: 2;\n"
    "    column-gap: 2.5em;\n"
    "  }\n"
    "  body.mb-toc-page div.mb-toc ol li {\n"
    "    break-inside: avoid;\n"
    "    -webkit-column-break-inside: avoid;\n"
    "  }\n"
    "}\n"
)


def _apply_toc_columns(css: str, on) -> str:
    """目录双栏后处理：只作用于生成目录页的 ol/li 结构（seal 表格天然不受影响）。"""
    if not on:
        return css
    return css.rstrip() + _TOC_COLUMNS_CSS_BLOCK


def get_preset_css(
    preset_id: str,
    use_system_fonts: bool = True,
    toc_style: str = DEFAULT_TOC_STYLE,
    font_overrides: dict = None,
    palette_overrides: dict = None,
    page_tint=None,
    bg_image: dict = None,
    para_indent: bool = True,
    para_gap=None,
    toc_columns: bool = False,
) -> str:
    """加载指定预设模板并插值；preset_id / toc_style / 色板非法时抛 ValueError。

    font_overrides:     细粒度字体开关，见 _interpolate。
    palette_overrides:  自定义配色 {token: hex}，见 _apply_palette_overrides。
    page_tint:          全书主题底色三态，见 _apply_page_tint。
    bg_image:           全书背景图片 {'url': 'mb-bg.jpg', 'night_dim': float}，
                        见 _apply_bg_image；激活时日间取代纸色铺满。
    para_indent:        首行缩进开关（False=全部段落顶格），见 _apply_para_style。
    para_gap:           段间距数值（em，0=跟随预设，范围 [0,3]），
                        见 _apply_para_style。
    toc_columns:        True 时目录页双栏排布，见 _apply_toc_columns。
    """
    presets = list_presets()
    if preset_id not in presets:
        raise ValueError("unknown preset: %s" % preset_id)
    if toc_style not in TOC_STYLES:
        raise ValueError("unknown toc_style: %s" % toc_style)
    params = presets[preset_id]
    if palette_overrides:
        params = _apply_palette_overrides(params, palette_overrides)

    css_path = os.path.join(_PRESETS_DIR, "%s.css" % preset_id)
    if not os.path.exists(css_path):
        raise ValueError("preset css missing: %s" % css_path)
    with open(css_path, encoding="utf-8") as f:
        template = f.read()

    # 目录样式：先对 toc 文件插值（含 FONT/ACCENT/GRADIENT），再嵌入主模板
    toc_path = os.path.join(_PRESETS_DIR, "toc_%s.css" % toc_style)
    if not os.path.exists(toc_path):
        raise ValueError("toc css missing: %s" % toc_path)
    with open(toc_path, encoding="utf-8") as f:
        toc_css = _interpolate(f.read(), params, use_system_fonts, font_overrides)
    template = template.replace("{{TOC_STYLE}}", toc_css)

    # 响应式与特殊元素补齐：注入点统一前置（避免末尾注入的 responsive 覆盖各预设主题色长线；vertclassical 已前置验证正确）
    responsive_path = os.path.join(_PRESETS_DIR, "responsive.css")
    if os.path.exists(responsive_path):
        with open(responsive_path, encoding="utf-8") as f:
            responsive_css = _interpolate(f.read(), params, use_system_fonts, font_overrides)
        if "{{RESPONSIVE}}" in template:
            # 移除原占位符，统一前置到 @page 之后或文件头部，保证预设自身规则层叠胜出
            template = template.replace("{{RESPONSIVE}}", "")
            # 插到 @page 块之后（若有），否则直接前置
            _m = re.search(r"@page\s*\{[^}]*\}", template)
            if _m:
                insert_at = _m.end()
                template = (
                    template[:insert_at]
                    + "\n\n/* ── responsive injected (front) ── */\n"
                    + responsive_css
                    + template[insert_at:]
                )
            else:
                template = "/* ── responsive injected (front) ── */\n" + responsive_css + "\n" + template
        else:
            template = template.rstrip() + "\n\n/* ── responsive injected ── */\n" + responsive_css

    css = _interpolate(template, params, use_system_fonts, font_overrides)
    css = _apply_para_style(css, para_indent, para_gap)
    css = _apply_toc_columns(css, toc_columns)
    css = _apply_page_tint(css, page_tint, params)
    if bg_image:
        css = _apply_bg_image(css, bg_image)
    return css


# ── 背景图片（内置纹理 + 用户上传）────────────────────────────────────────────
# 纹理来源：实书纸样扫描件（JPEG 重编码，最长边 ≤1080，q85）
_TEXTURES_DIR = os.path.join(_PRESETS_DIR, "textures")
BUILTIN_TEXTURES = {
    "xuanzhi": {"name": "宣纸纹", "name_en": "Rice Fiber", "file": "tex_xuanzhi.jpg"},
    "yunwen": {"name": "云纹纸", "name_en": "Mottled Paper", "file": "tex_yunwen.jpg"},
    "gaobai": {"name": "高白宣", "name_en": "Bright Xuan", "file": "tex_gaobai.jpg"},
    "daolin": {"name": "道林纸", "name_en": "Book Paper", "file": "tex_daolin.jpg"},
    "yangpi": {"name": "羊皮纸", "name_en": "Parchment", "file": "tex_yangpi.jpg"},
    "caojing": {"name": "草纤纸", "name_en": "Straw Fiber", "file": "tex_caojing.jpg"},
}


def list_builtin_textures() -> list:
    """内置纹理列表 [{id,name,name_en}]。"""
    return [{"id": k, "name": v["name"], "name_en": v["name_en"]} for k, v in BUILTIN_TEXTURES.items()]


def get_texture_bytes(tex_id: str) -> tuple:
    """读取内置纹理字节。:return: (data, media_type)。非法 id 抛 ValueError。"""
    meta = BUILTIN_TEXTURES.get(tex_id)
    if not meta:
        raise ValueError("unknown texture: %s" % tex_id)
    path = os.path.join(_TEXTURES_DIR, meta["file"])
    if not os.path.exists(path):
        raise ValueError("texture missing: %s" % path)
    with open(path, "rb") as f:
        return f.read(), "image/jpeg"


def _apply_bg_image(css: str, bg: dict) -> str:
    """全书背景图片（尽力而为增强）：日间原图 cover，夜间叠加深色渐变遮罩。

    遮罩用双层背景（linear-gradient 叠加原图）实现，不依赖伪元素；
    不支持多背景的老引擎回退为单图/纯色，不破版。
    bg: {'url': 'mb-bg.jpg', 'night_dim': 0.0~1.0}
    """
    url = bg.get("url") or "mb-bg.jpg"
    dim = max(0.0, min(1.0, float(bg.get("night_dim", 0.72))))
    dim_c = "rgba(18,18,18,%s)" % ("%.2f" % dim)
    block = (
        "\n\n/* ── 全书背景图片 ── */\n"
        "body {\n"
        "  background-image: url('%(u)s') !important;\n"
        "  background-size: cover !important;\n"
        "  background-position: center !important;\n"
        "  background-repeat: no-repeat !important;\n"
        "  background-attachment: fixed !important;\n"
        "}\n"
        "@media (prefers-color-scheme: dark) {\n"
        "  body {\n"
        "    background-image: linear-gradient(%(d)s, %(d)s), url('%(u)s') !important;\n"
        "    background-size: cover !important;\n"
        "    background-position: center !important;\n"
        "    background-repeat: no-repeat !important;\n"
        "    background-attachment: fixed !important;\n"
        "  }\n"
        "}\n"
    ) % {"u": url, "d": dim_c}
    return css.rstrip() + block
