import subprocess
import sys
from pathlib import Path

import pytest


SCRIPT = Path(__file__).parents[1] / "scripts" / "check_design_docs.py"
TEMPLATE = Path(__file__).parents[1] / "design" / "TEMPLATE.html"


def write_design(repo_root, relative_path, body=None):
    path = repo_root / "design" / relative_path
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        body
        or """<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>有效方案</title></head>
  <body><main><h1>有效方案</h1></main></body>
</html>
""",
        encoding="utf-8",
    )
    return path


def run_check(repo_root):
    return subprocess.run(
        [sys.executable, str(SCRIPT), "--root", str(repo_root)],
        capture_output=True,
        text=True,
        check=False,
    )


def html_with(content):
    return f"""<!doctype html>
<html lang="zh-CN">
  <head><meta charset="utf-8"><title>方案</title></head>
  <body>{content}</body>
</html>
"""


def test_valid_active_design_passes(tmp_path):
    (tmp_path / "app").mkdir()
    write_design(tmp_path, "app/20260713-reading-theme.active.html")

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "1 design document(s) passed" in result.stdout


def test_valid_template_passes_without_status_gate(tmp_path):
    write_design(tmp_path, "TEMPLATE.html", html_with("<main><h1>WIP 方案模板</h1></main>"))

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
    assert "1 design document(s) passed" in result.stdout


def test_repository_template_contains_signals_visual_and_responsive_baselines():
    template = TEMPLATE.read_text(encoding="utf-8")

    assert all(
        requirement in template
        for requirement in (
            "原始诉求",
            "目标与边界",
            "产品功能矩阵",
            "方案",
            "测试计划与结果",
            "--accent: #df6d16",
            "@media (min-width: 1440px)",
            "@media (max-width: 720px)",
            "@media (prefers-reduced-motion: reduce)",
            "@media print",
            'class="skip-link"',
            'class="chips"',
            'class="card"',
            'class="toc-edge"',
            'class="toc-fab"',
            'class="rail-title"',
            'class="table-wrap"',
            'id="feature-matrix"',
            'class="feature-matrix"',
            'class="matrix-legend"',
            "matrix-conditional",
            "API / 协议",
            "width: min(1160px, calc(100vw - 32px))",
            "grid-template-columns: 20px minmax(0, 1fr)",
            "right: max(4px, calc((100vw - 1160px) / 2 - 136px))",
            "width: 124px",
            "document.querySelectorAll(\".toc-edge a[href^='#'], .toc-fab a[href^='#']\")",
            'link.setAttribute("aria-current", "location")',
            "meta tags 只是备选呈现组件",
            "同一个工作只维护这一份方案",
            "不创建或保留中间废弃文档",
            "SUPERSEDED 只用于已独立生效的旧 ACTIVE",
            'tabindex="0"',
        )
    )
    assert 'class="spine"' not in template
    assert 'class="side-rail"' not in template


@pytest.mark.parametrize(
    "relative_path",
    [
        "template.html",
        "templates/TEMPLATE.html",
        "unknown/20260713-feature.active.html",
        "app/nested/20260713-feature.active.html",
        "app/20260230-feature.active.html",
        "app/20260713-ReadingTheme.active.html",
        "app/20260713-reading-theme.html",
        "app/20260713-reading-theme.active.md",
    ],
)
def test_invalid_design_path_fails(tmp_path, relative_path):
    if relative_path.startswith("app/"):
        (tmp_path / "app").mkdir()
    write_design(tmp_path, relative_path)

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "invalid design document path" in result.stdout


def test_wip_design_blocks_merge_check(tmp_path):
    (tmp_path / "app").mkdir()
    write_design(tmp_path, "app/20260713-reading-theme.wip.html")

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "WIP design document cannot be merged" in result.stdout


@pytest.mark.parametrize(
    "body",
    [
        '<html lang="zh-CN"><head><meta charset="utf-8"><title>方案</title></head><body></body></html>',
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>方案</title></head><body></body></html>',
        '<!doctype html><html lang="zh-CN"><head><title>方案</title></head><body></body></html>',
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"></head><body></body></html>',
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>方案</title></head></html>',
    ],
)
def test_invalid_html_structure_fails(tmp_path, body):
    (tmp_path / "app").mkdir()
    write_design(tmp_path, "app/20260713-reading-theme.active.html", body)

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "invalid HTML structure" in result.stdout


def test_template_still_requires_valid_html_structure(tmp_path):
    write_design(tmp_path, "TEMPLATE.html", "<main>缺少完整 HTML 结构</main>")

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "invalid HTML structure: design/TEMPLATE.html" in result.stdout


@pytest.mark.parametrize(
    "resource",
    [
        '<script src="https://cdn.example.com/app.js"></script>',
        '<link rel="stylesheet" href="/assets/design.css">',
        '<img src="../images/diagram.png" alt="架构图">',
        '<iframe src="//example.com/embed"></iframe>',
        '<svg><image href="https://example.com/diagram.png"></image></svg>',
        '<svg><use href="https://example.com/icons.svg#check"></use></svg>',
        '<style>@import url("https://example.com/theme.css");</style>',
        '<style>.hero { background: url("./background.png"); }</style>',
    ],
)
def test_external_resource_fails(tmp_path, resource):
    (tmp_path / "app").mkdir()
    write_design(tmp_path, "app/20260713-reading-theme.active.html", html_with(resource))

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "external resource is not allowed" in result.stdout


def test_template_still_rejects_external_resources(tmp_path):
    write_design(tmp_path, "TEMPLATE.html", html_with('<link rel="stylesheet" href="./design.css">'))

    result = run_check(tmp_path)

    assert result.returncode == 1
    assert "external resource is not allowed: design/TEMPLATE.html" in result.stdout


def test_external_requirement_link_is_allowed(tmp_path):
    (tmp_path / "app").mkdir()
    write_design(
        tmp_path,
        "app/20260713-reading-theme.active.html",
        html_with('<a href="https://github.com/talebook/talebook/issues/1">需求来源</a>'),
    )

    result = run_check(tmp_path)

    assert result.returncode == 0, result.stdout + result.stderr
