#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""booksvr 契约测试：Go 版 HTTP 响应结构与 Python 版逐字段一致。

设计说明
--------
本机无 Calibre（`ModuleNotFoundError: No module named 'calibre'`），
因此无法启动 Python 版 Tornado 服务做真实双跑对比。本测试改为：

1. **静态契约提取**：从 Python 源码（`webserver/utils.py`、
   `webserver/handlers/base.py`）解析出字段集合与错误码常量；
2. **Go 侧结构断言**：断言 Go 的 `compat.go` / `server.go` 声明了
   同一组字段与错误码；
3. **路由表对比**：断言 Go 的 215 条既有路由 pattern 与 Python 源码一致。

这样在无 Calibre 环境下仍能给出「字段集合与错误码逐项一致」的硬证据；
真实双跑对比需在有 Calibre 的环境中补做（见计划实施项 11 的验证缺口）。
"""

import ast
import os
import re
import sys

import pytest


REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GO_HTTPAPI = os.path.join(REPO, "booksvr", "internal", "httpapi")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# ---------------------------------------------------------------- 字段契约


def python_simple_format_fields():
    """从 webserver/utils.py 的 SimpleBookFormatter.format() 提取字段名。"""
    src = read(os.path.join(REPO, "webserver", "utils.py"))
    start = src.index("class SimpleBookFormatter")
    end = src.index("class BookFormatter")
    block = src[start:end]
    return set(re.findall(r'^\s*"([a-z_]+)":', block, re.M))


def go_simple_format_fields():
    """从 compat.go 的 SimpleFormatFields 提取字段名。"""
    src = read(os.path.join(GO_HTTPAPI, "compat.go"))
    start = src.index("var SimpleFormatFields = []string{")
    end = src.index("}", start)
    block = src[start:end]
    return set(re.findall(r'"([a-z_]+)"', block))


def python_format_extra_fields():
    """从 BookFormatter.format() 提取额外字段（author_url/publisher_url/scope）。"""
    src = read(os.path.join(REPO, "webserver", "utils.py"))
    start = src.index("class BookFormatter")
    block = src[start:]
    fields = set(re.findall(r'"(author_url|publisher_url|scope)"', block))
    return fields


def go_format_extra_fields():
    src = read(os.path.join(GO_HTTPAPI, "compat.go"))
    start = src.index("var FormatExtraFields = []string{")
    end = src.index("}", start)
    return set(re.findall(r'"([a-z_]+)"', src[start:end]))


class TestFieldContract:
    def test_simple_format_field_sets_match(self):
        """SimpleFormat 的字段集合必须与 Python 版逐字段一致。"""
        py = python_simple_format_fields()
        go = go_simple_format_fields()
        assert py == go, f"仅 Python 有: {py - go}\n仅 Go 有: {go - py}"

    def test_simple_format_field_count(self):
        """字段数固定为 23，防止任一侧悄悄增删。"""
        assert len(python_simple_format_fields()) == 23
        assert len(go_simple_format_fields()) == 23

    def test_format_extra_fields_match(self):
        """Format() 追加的字段集合必须一致。"""
        py = python_format_extra_fields()
        go = go_format_extra_fields()
        assert py == go, f"仅 Python 有: {py - go}\n仅 Go 有: {go - py}"

    def test_files_item_fields(self):
        """files[] 每项必须含 format/size/href/online_readable。"""
        src = read(os.path.join(REPO, "webserver", "utils.py"))
        start = src.index("def get_files(self)")
        end = src.index("def get_permissions(self)")
        block = src[start:end]
        for field in ("format", "size", "href", "online_readable"):
            assert f'"{field}"' in block, f"Python 的 files[] 缺少 {field}"

        go = read(os.path.join(GO_HTTPAPI, "compat.go"))
        start = go.index("type File struct {")
        end = go.index("}", start)
        for field in ("format", "size", "href", "online_readable"):
            assert f'json:"{field}"' in go[start:end], f"Go 的 File 缺少 {field}"


# ---------------------------------------------------------------- 错误码


def python_error_codes():
    """从 Python 源码收集 err 信封里出现的错误码字面量。"""
    codes = set()
    for rel in (
        os.path.join("webserver", "handlers", "base.py"),
        os.path.join("webserver", "handlers", "book.py"),
        os.path.join("webserver", "handlers", "scan.py"),
    ):
        src = read(os.path.join(REPO, rel))
        codes |= set(re.findall(r'"err":\s*"([a-z_.]+)"', src))
    return codes


def go_error_codes():
    """从 server.go / work.go 收集错误码常量。"""
    codes = set()
    for name in ("server.go", "work.go"):
        src = read(os.path.join(GO_HTTPAPI, name))
        codes |= set(re.findall(r'Err\w+\s*=\s*"([a-z_.]+)"', src))
    return codes


class TestErrorCodes:
    def test_core_error_codes_present_in_both(self):
        """核心错误码必须在 Python 与 Go 两侧都存在。"""
        py = python_error_codes()
        go = go_error_codes()
        for code in ("user.need_login", "permission.not_admin", "exception"):
            assert code in py, f"Python 侧缺少错误码 {code}"
            assert code in go, f"Go 侧缺少错误码 {code}"

    def test_merge_conflict_code_matches_plan(self):
        """合并冲突错误码必须与计划 5.7 节一致。"""
        go = go_error_codes()
        assert "work.merge.conflict" in go

    def test_go_error_codes_are_snake_dot_form(self):
        """Go 侧错误码必须遵循 Python 的 a.b 命名风格。"""
        for code in go_error_codes():
            assert re.fullmatch(r"[a-z][a-z_.]*", code), f"错误码格式异常: {code}"


# ---------------------------------------------------------------- 路由表


def python_route_patterns():
    """用 AST 从 webserver 全部 routes() 提取 pattern。

    另外补上不在 routes() 里的两类：
      - main.py 的 theme_routes（1 条）；
      - social_routes.py 的 SOCIAL_AUTH_ROUTES（4 条）。
    """
    patterns = set()
    for root, _dirs, files in os.walk(os.path.join(REPO, "webserver")):
        for name in files:
            if not name.endswith(".py"):
                continue
            path = os.path.join(root, name)
            src = read(path)
            if not re.search(r"^def routes\(", src, re.M):
                continue
            tree = ast.parse(src)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name == "routes":
                    for sub in ast.walk(node):
                        if isinstance(sub, ast.Tuple) and sub.elts:
                            first = sub.elts[0]
                            if isinstance(first, ast.Constant) and isinstance(first.value, str):
                                if first.value.startswith("/"):
                                    patterns.add(first.value)

    # main.py 的 theme_routes
    main_src = read(os.path.join(REPO, "webserver", "main.py"))
    patterns |= set(re.findall(r'theme_routes = \[\(r"([^"]+)"', main_src))

    # social_routes.py 的 SOCIAL_AUTH_ROUTES：url(r"..." 可能跨行
    social_src = read(os.path.join(REPO, "webserver", "social_routes.py"))
    patterns |= set(re.findall(r'url\(\s*r"([^"]+)"', social_src))

    return patterns


def go_legacy_route_patterns():
    """从 routes.go 提取既有 215 条 pattern。"""
    src = read(os.path.join(GO_HTTPAPI, "routes.go"))
    start = src.index("var registeredRoutes = []Route{")
    end = src.index("\n}", start)
    block = src[start:end]
    out = set()
    for m in re.finditer(r'Pattern:\s*"((?:[^"\\]|\\.)*)"', block):
        # Go 字符串里的 \\ 对应 Python 源码里的 \
        out.add(m.group(1).replace("\\\\", "\\"))
    return out


class TestRouteTable:
    def test_legacy_route_count(self):
        """既有路由必须是 215 条。"""
        assert len(go_legacy_route_patterns()) == 215

    def test_every_python_route_present_in_go(self):
        """Python 的每条 routes() pattern 都必须出现在 Go 的既有路由表里。"""
        py = python_route_patterns()
        go = go_legacy_route_patterns()
        missing = py - go
        assert not missing, f"Go 侧缺少路由: {sorted(missing)}"

    def test_no_extra_go_routes(self):
        """Go 的既有路由表不得包含 Python 没有的 pattern。"""
        py = python_route_patterns()
        go = go_legacy_route_patterns()
        extra = go - py
        assert not extra, f"Go 侧多出路由: {sorted(extra)}"

    def test_new_routes_are_separate(self):
        """新增 3 条路由必须单独声明，不混入既有 215 条。"""
        src = read(os.path.join(GO_HTTPAPI, "routes.go"))
        start = src.index("var newRoutes = []Route{")
        end = src.index("\n}", start)
        block = src[start:end]
        patterns = set(re.findall(r'Pattern:\s*"([^"]+)"', block))
        assert patterns == {
            "/api/work/([0-9]+)",
            "/api/book/([0-9]+)/versions",
            "/api/book/([0-9]+)/merge",
        }

    def test_new_routes_do_not_collide(self):
        """新增路由不得与既有路由撞路径。"""
        legacy = go_legacy_route_patterns()
        src = read(os.path.join(GO_HTTPAPI, "routes.go"))
        start = src.index("var newRoutes = []Route{")
        end = src.index("\n}", start)
        new = set(re.findall(r'Pattern:\s*"([^"]+)"', src[start:end]))
        assert not (new & legacy)


# ---------------------------------------------------------------- 在线阅读格式


def python_online_read_formats():
    """从 media_analysis.py 推导 ONLINE_READ_FORMATS。"""
    src = read(os.path.join(REPO, "webserver", "services", "media_analysis.py"))

    def parse_set(name):
        m = re.search(rf"^{name} = frozenset\(\(([^)]*)\)\)", src, re.M)
        assert m, f"未找到 {name}"
        return {t.strip().strip("\"'") for t in m.group(1).split(",") if t.strip()}

    ebook = parse_set("EBOOK_MEDIA_FORMATS")
    zipf = parse_set("COMIC_ZIP_FORMATS")
    rarf = parse_set("COMIC_RAR_FORMATS")
    return ebook | zipf | rarf


def go_online_read_formats():
    src = read(os.path.join(GO_HTTPAPI, "compat.go"))
    start = src.index("var onlineReadableFormats = map[string]bool{")
    end = src.index("\n}", start)
    return set(re.findall(r'"([a-z0-9]+)":\s*true', src[start:end]))


class TestOnlineReadFormats:
    def test_format_sets_match(self):
        """在线阅读格式集合必须与 Python 版一致。"""
        py = python_online_read_formats()
        go = go_online_read_formats()
        assert py == go, f"仅 Python 有: {py - go}\n仅 Go 有: {go - py}"

    def test_expected_members(self):
        """集合内容固定为 10 种（含漫画容器格式）。"""
        expected = {"azw", "azw3", "epub", "mobi", "pdf", "txt", "cbz", "zip", "cbr", "rar"}
        assert python_online_read_formats() == expected


# ---------------------------------------------------------------- 新增接口契约


class TestNewAPIContract:
    def test_work_detail_response_fields(self):
        """GET /api/work/{id} 的响应字段必须与计划 5.5 节一致。"""
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        start = src.index("type WorkDetailResponse struct {")
        end = src.index("}", start)
        block = src[start:end]
        for field in ("err", "work", "versions"):
            assert f'json:"{field}"' in block, f"WorkDetailResponse 缺少 {field}"

    def test_work_summary_fields(self):
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        start = src.index("type WorkSummary struct {")
        end = src.index("}", start)
        block = src[start:end]
        for field in (
            "id", "title", "author", "title_norm", "author_norm",
            "version_count", "format_count",
        ):
            assert f'json:"{field}"' in block, f"WorkSummary 缺少 {field}"

    def test_version_summary_fields(self):
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        start = src.index("type VersionSummary struct {")
        end = src.index("}", start)
        block = src[start:end]
        for field in (
            "id", "title", "publisher", "pubdate", "edition_key",
            "suffixes", "img", "thumb", "files",
        ):
            assert f'json:"{field}"' in block, f"VersionSummary 缺少 {field}"

    def test_book_versions_response_fields(self):
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        start = src.index("type BookVersionsResponse struct {")
        end = src.index("}", start)
        block = src[start:end]
        for field in ("err", "work_id", "versions"):
            assert f'json:"{field}"' in block, f"BookVersionsResponse 缺少 {field}"

    def test_merge_response_fields(self):
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        start = src.index("type MergeResponse struct {")
        end = src.index("}", start)
        block = src[start:end]
        for field in ("err", "work_id", "merged", "msg"):
            assert f'json:"{field}"' in block, f"MergeResponse 缺少 {field}"

    def test_versions_id_is_book_id(self):
        """versions[].id 必须是 book_id（可直接用于 /book/{id}）。"""
        src = read(os.path.join(GO_HTTPAPI, "work.go"))
        assert "ID:         bookID," in src or "ID: bookID," in src, (
            "VersionSummary.ID 必须直接取 bookID"
        )

    def test_merge_requires_auth(self):
        """POST /merge 必须要求 @auth。"""
        src = read(os.path.join(GO_HTTPAPI, "workroutes.go"))
        start = src.index('Pattern: "/api/book/([0-9]+)/merge"')
        # RouteSpec 字面量跨多行，取足够长的窗口覆盖到 Auth 字段
        block = src[start : start + 400]
        assert re.search(r"Auth:\s*true", block), f"/merge 必须设置 Auth: true，实际:\n{block}"


# ---------------------------------------------------------------- 服务器语义


class TestServerSemantics:
    def test_js_envelope_adds_msg(self):
        """@js 等价语义：dict 响应自动补 msg。"""
        src = read(os.path.join(GO_HTTPAPI, "server.go"))
        assert 'resp["msg"] = ""' in src

    def test_auth_returns_need_login(self):
        """@auth 等价语义：未登录返回 user.need_login。"""
        src = read(os.path.join(GO_HTTPAPI, "server.go"))
        assert "ErrNeedLogin" in src
        assert "user.need_login" in src

    def test_exception_becomes_envelope(self):
        """@js 等价语义：异常转成 {"err": "exception"}，不抛 HTTP 异常。"""
        src = read(os.path.join(GO_HTTPAPI, "server.go"))
        assert "ErrException" in src
        assert '"exception"' in src

    def test_cors_headers_set(self):
        """CORS 头必须与 Python 版一致。"""
        src = read(os.path.join(GO_HTTPAPI, "server.go"))
        assert "Access-Control-Allow-Origin" in src
        assert "Access-Control-Allow-Credentials" in src

    def test_content_type_matches_python(self):
        """Content-Type 必须与 Tornado 的 JSON 输出一致。"""
        src = read(os.path.join(GO_HTTPAPI, "server.go"))
        assert "application/json; charset=UTF-8" in src


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-v"]))
