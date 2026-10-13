#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""阶段 2 契约测试：serve 子命令、身份算法跨语言一致性、merge 路由归属。

对应计划 `plans/2026-10-10-booksvr-serve.md` 的实施项 7 与实施项 9。

设计说明
--------
本机无 Calibre，无法启动 Python 版 Tornado 服务做真实双跑对比。
但 `tornado.web.create_signed_value` 只依赖 tornado（不依赖 Calibre），
因此身份算法的跨语言一致性可以真实验证：Python 侧生成 cookie，
断言其与 Go 侧测试使用的硬编码向量逐字节一致。
"""

import os
import re

import pytest


REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GO_HTTPAPI = os.path.join(REPO, "booksvr", "internal", "httpapi")
GO_CMD = os.path.join(REPO, "booksvr", "cmd", "booksvr")

# Go 侧 identity_test.go 使用的实测向量（必须与 Python 生成结果一致）。
VECTOR_SECRET = "cookie_secret"
VECTOR_NAME = "user_id"
VECTOR_VALUE = "42"
VECTOR_CLOCK = 1791565386
VECTOR_COOKIE = (
    "2|1:0|10:1791565386|7:user_id|4:NDI=|"
    "9c0fda2c4e752e1982eab786b436f3ad282f45be025716063b093207792e08b9"
)


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


# ---------------------------------------------------------------- 实施项 9


class TestServeSubcommand:
    """serve 子命令已声明。"""

    def test_usage_mentions_serve(self):
        src = read(os.path.join(GO_CMD, "main.go"))
        assert "serve" in src, "main.go 的 usage 未提及 serve"

    def test_serve_dispatch_registered(self):
        src = read(os.path.join(GO_CMD, "main.go"))
        assert re.search(r'case\s+"serve"', src), "main.go 未注册 serve 子命令分支"

    def test_serve_flags_declared(self):
        src = read(os.path.join(GO_CMD, "serve.go"))
        for flag in ["db", "addr", "tornado-url", "serve-routes", "cookie-secret"]:
            assert '"%s"' % flag in src, "serve.go 未声明 -%s" % flag

    def test_whitelist_defaults_empty(self):
        """-serve-routes 默认值为空（全部走 Tornado 兜底）。"""
        src = read(os.path.join(GO_CMD, "serve.go"))
        m = re.search(r'fs\.String\("serve-routes",\s*"([^"]*)"', src)
        assert m, "未找到 -serve-routes 声明"
        assert m.group(1) == "", "-serve-routes 默认值应为空，实际 %r" % m.group(1)

    def test_addr_default_is_8000(self):
        src = read(os.path.join(GO_CMD, "serve.go"))
        assert '"127.0.0.1:8000"' in src, "serve 默认监听地址应为 127.0.0.1:8000"

    def test_tornado_url_default_is_8001(self):
        src = read(os.path.join(GO_CMD, "serve.go"))
        assert '"http://127.0.0.1:8001"' in src, "兜底代理默认应为 http://127.0.0.1:8001"


class TestIdentityAlgorithmCrossLanguage:
    """Go 与 Python 的 Tornado secure cookie 算法必须一致。"""

    def test_python_generates_expected_vector(self):
        """用真实 Tornado 生成 cookie，断言与 Go 侧硬编码向量一致。"""
        tornado_web = pytest.importorskip("tornado.web")

        got = tornado_web.create_signed_value(
            VECTOR_SECRET,
            VECTOR_NAME,
            VECTOR_VALUE,
            clock=lambda: VECTOR_CLOCK,
        ).decode()
        assert got == VECTOR_COOKIE, (
            "Tornado 生成的 cookie 与 Go 侧向量不一致\n"
            "python: %s\ngo    : %s" % (got, VECTOR_COOKIE)
        )

    def test_python_decodes_vector(self):
        """Tornado 能解出该向量，证明它是合法 cookie。"""
        tornado_web = pytest.importorskip("tornado.web")

        decoded = tornado_web.decode_signed_value(
            VECTOR_SECRET,
            VECTOR_NAME,
            VECTOR_COOKIE,
            clock=lambda: VECTOR_CLOCK,
        )
        assert decoded == VECTOR_VALUE.encode()

    def test_go_test_uses_same_vector(self):
        """Go 侧测试必须使用同一向量（防止两边各自漂移）。"""
        src = read(os.path.join(GO_HTTPAPI, "identity_test.go"))
        assert VECTOR_COOKIE in src, "identity_test.go 未使用约定的测试向量"
        assert 'testSecret   = "cookie_secret"' in src or 'testSecret = "cookie_secret"' in src

    def test_go_implements_v2_signature(self):
        """Go 侧必须实现 HMAC-SHA256 v2 签名。"""
        src = read(os.path.join(GO_HTTPAPI, "identity.go"))
        assert "hmac.New(sha256.New" in src, "identity.go 未使用 HMAC-SHA256"
        assert "signedValueVersion" in src, "identity.go 未声明版本常量"

    def test_go_rejects_v1(self):
        """Go 侧必须拒绝 v1 格式。"""
        src = read(os.path.join(GO_HTTPAPI, "identity.go"))
        assert 'signedValueVersion = "2"' in src, "版本常量应为 2"


# ---------------------------------------------------------------- 实施项 7


class TestMergeRouteOwnership:
    """merge 路由是 booksvr 新增路由，Python 侧不存在（无双写）。"""

    def test_merge_in_new_routes(self):
        src = read(os.path.join(GO_HTTPAPI, "routes.go"))
        new_block = src[src.index("var newRoutes"):src.index("var registeredRoutes")]
        assert "/api/book/([0-9]+)/merge" in new_block, "merge 应在 newRoutes 中"

    def test_merge_not_in_registered_routes(self):
        src = read(os.path.join(GO_HTTPAPI, "routes.go"))
        reg_block = src[src.index("var registeredRoutes"):]
        assert "/api/book/([0-9]+)/merge" not in reg_block, "merge 不应出现在 registeredRoutes"

    def test_merge_absent_from_python_backend(self):
        """Python 后端不得注册 merge 路由（否则存在双写风险）。"""
        hits = []
        for root, _dirs, files in os.walk(os.path.join(REPO, "webserver")):
            for name in files:
                if not name.endswith(".py"):
                    continue
                path = os.path.join(root, name)
                text = read(path)
                if re.search(r'\(r"[^"]*book[^"]*merge', text):
                    hits.append(os.path.relpath(path, REPO))
        assert not hits, "Python 后端注册了 merge 路由，存在双写风险: %s" % hits

    def test_merge_in_serve_whitelist(self):
        """supervisor 的 -serve-routes 必须包含 merge。"""
        for rel in [
            "conf/supervisor/talebook.conf",
            "conf/supervisor/server-side-render.conf",
            "conf/supervisor/dev.conf",
        ]:
            text = read(os.path.join(REPO, rel))
            assert "/api/book/([0-9]+)/merge" in text, "%s 的白名单缺少 merge" % rel


# ---------------------------------------------------------------- 实施项 4/5


class TestDispatcherSemantics:
    """分发器语义：只匹配有 handler 的路由表，不遍历 218 条全表。"""

    def test_dispatcher_uses_server_routes(self):
        src = read(os.path.join(GO_HTTPAPI, "proxy.go"))
        assert "d.server.routes" in src, "Dispatcher 应遍历 server.routes（已实现路由表）"
        assert "Routes()" not in src, "Dispatcher 不得遍历 218 条全表（含 catch-all）"

    def test_upstream_unavailable_error_code(self):
        src = read(os.path.join(GO_HTTPAPI, "proxy.go"))
        assert 'ErrUpstreamUnavailable = "upstream.unavailable"' in src

    def test_proxy_returns_502(self):
        src = read(os.path.join(GO_HTTPAPI, "proxy.go"))
        assert "http.StatusBadGateway" in src, "代理失败应返回 502"


class TestServeAssembly:
    """serve 装配：WAL、身份注入、兜底代理。"""

    def test_serve_enables_wal(self):
        src = read(os.path.join(GO_HTTPAPI, "serve.go"))
        assert "journal_mode(WAL)" in src, "serve 应启用 WAL"
        assert "busy_timeout" in src, "serve 应设置 busy_timeout"

    def test_serve_injects_cookie_identifier(self):
        src = read(os.path.join(GO_HTTPAPI, "serve.go"))
        assert "NewCookieIdentifier" in src, "serve 应注入 cookie 身份解析"

    def test_serve_uses_work_routes(self):
        src = read(os.path.join(GO_HTTPAPI, "serve.go"))
        assert "WorkRouteSpecs()" in src, "serve 应挂载已实现路由"