#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""实施项 11.6：``_sanitize_allowed_roots`` 的单元测试。

该函数是 POST /api/admin/import/settings 接受 ``import_allowed_roots``
时的唯一校验入口，因此单独测试它，不依赖 Calibre。

集成测试（走 HTTP 端点）在 ``tests/test_scan.py::TestImportAllowedRoots``，
需要 Calibre 环境。
"""

import os
import sys

import pytest


# 直接加载模块，绕过 webserver.handlers 包的 __init__（它会 import calibre）。
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


SCAN_PY = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "webserver",
    "handlers",
    "scan.py",
)


def _load_sanitize():
    """从 scan.py 源码里抽出 _sanitize_allowed_roots 与 _normalize_path。

    不 import 整个模块，因为 webserver.handlers 的 __init__ 会拉入 Calibre。
    """
    import ast
    import textwrap

    with open(SCAN_PY, encoding="utf-8") as fh:
        src = fh.read()
    tree = ast.parse(src)

    wanted = {"_normalize_path", "_is_within", "_sanitize_allowed_roots"}
    chunks = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef) and node.name in wanted:
            chunks.append(ast.get_source_segment(src, node))

    # 常量与 _() 的替身
    prelude = textwrap.dedent(
        """
        import os

        SCAN_DIR_PREFIX = "/data/"

        def _(msg):
            return msg
        """
    )
    ns = {}
    exec(prelude + "\n\n" + "\n\n".join(chunks), ns)  # noqa: S102
    return ns["_sanitize_allowed_roots"], ns["_normalize_path"], ns["_is_within"]


sanitize, normalize, is_within = _load_sanitize()


class TestSanitizeAllowedRoots:
    def test_none_returns_none_without_error(self):
        """不传该字段时返回 (None, None)，表示保持原值。"""
        roots, err = sanitize(None)
        assert roots is None
        assert err is None

    def test_single_root_is_accepted(self):
        roots, err = sanitize(["/data/books/imports"])
        assert err is None
        assert roots == [normalize("/data/books/imports")]

    def test_multiple_roots_preserve_order(self):
        roots, err = sanitize(["/data/a", "/data/b", "/data/c"])
        assert err is None
        assert roots == [normalize("/data/a"), normalize("/data/b"), normalize("/data/c")]

    def test_duplicates_are_removed(self):
        roots, err = sanitize(["/data/a", "/data/a", "/data/b", "/data/a"])
        assert err is None
        assert roots == [normalize("/data/a"), normalize("/data/b")]

    def test_empty_list_is_rejected(self):
        roots, err = sanitize([])
        assert roots is None
        assert err is not None
        assert err["err"] == "params.allowed_roots"

    def test_all_blank_entries_are_rejected(self):
        roots, err = sanitize(["", "   "])
        assert roots is None
        assert err is not None
        assert err["err"] == "params.allowed_roots"

    def test_blank_entries_are_skipped(self):
        roots, err = sanitize(["/data/a", "", "  ", "/data/b"])
        assert err is None
        assert roots == [normalize("/data/a"), normalize("/data/b")]

    def test_root_outside_data_prefix_is_rejected(self):
        for bad in ("/etc", "/root", "/tmp", "/"):
            roots, err = sanitize([bad])
            assert roots is None, f"{bad} 不应被接受"
            assert err["err"] == "params.allowed_roots"

    def test_path_escape_is_rejected(self):
        """用 .. 逃出 /data/ 必须被拒绝。"""
        roots, err = sanitize(["/data/../etc"])
        assert roots is None
        assert err["err"] == "params.allowed_roots"

    def test_data_prefix_itself_is_accepted(self):
        roots, err = sanitize(["/data"])
        assert err is None
        assert roots == [normalize("/data")]

    def test_sibling_prefix_is_rejected(self):
        """/database 不是 /data 的子目录，必须被拒绝。

        这条用例固定 `_is_within` 用 commonpath 而非字符串前缀：
        字符串前缀会把 "/database".startswith("/data") 误判为真。
        """
        roots, err = sanitize(["/database"])
        assert roots is None
        assert err["err"] == "params.allowed_roots"

    def test_is_within_uses_path_semantics(self):
        """_is_within 必须按路径层级判断，而非字符串前缀。"""
        prefix = normalize("/data")
        assert is_within(normalize("/data"), prefix) is True
        assert is_within(normalize("/data/books"), prefix) is True
        assert is_within(normalize("/database"), prefix) is False
        assert is_within(normalize("/etc"), prefix) is False

    def test_is_within_rejects_different_drive(self):
        """不同盘符（Windows）必须返回 False，而不是抛异常。"""
        if os.name != "nt":
            pytest.skip("仅 Windows 有盘符概念")
        assert is_within("Z:\\data", normalize("/data")) is False

    def test_non_list_is_rejected(self):
        for bad in (12345, {"a": 1}, True):
            roots, err = sanitize(bad)
            assert roots is None, f"{bad!r} 不应被接受"
            assert err["err"] == "params.allowed_roots"

    def test_comma_separated_string_is_accepted(self):
        """兼容逗号分隔字符串（与 _configured_allowed_roots 一致）。"""
        roots, err = sanitize("/data/a, /data/b")
        assert err is None
        assert roots == [normalize("/data/a"), normalize("/data/b")]

    def test_one_bad_root_rejects_whole_request(self):
        """列表中只要有一个非法根目录，整个请求被拒绝（不静默丢弃）。"""
        roots, err = sanitize(["/data/a", "/etc", "/data/b"])
        assert roots is None
        assert err["err"] == "params.allowed_roots"

    def test_relative_path_is_resolved_against_cwd(self):
        """相对路径会被 realpath 解析；解析后不在 /data/ 下则拒绝。"""
        roots, err = sanitize(["relative/dir"])
        # 当前工作目录几乎不可能在 /data/ 下，因此应被拒绝
        if roots is None:
            assert err["err"] == "params.allowed_roots"
        else:
            prefix = normalize("/data")
            assert all(os.path.commonpath([r, prefix]) == prefix for r in roots)

    def test_trailing_slash_is_normalized(self):
        a, _ = sanitize(["/data/books/"])
        b, _ = sanitize(["/data/books"])
        assert a == b

    def test_error_message_mentions_prefix(self):
        _, err = sanitize(["/etc"])
        assert "/data/" in err["msg"]
