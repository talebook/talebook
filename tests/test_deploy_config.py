#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""部署配置契约测试。

验证 booksvr 作为唯一对外后端接管 8000、Tornado 已下线的部署改动在三套配置中
一致，且启动时序（self_check 自检通过后拉起 booksvr）正确。

设计说明
--------
本机无 Calibre，无法启动真实服务；本测试做**静态配置断言**，
从配置文件文本中提取事实，与计划 `plans/2026-10-10-booksvr-serve.md`
实施项 8 的验收口径逐条对应。
"""

import os
import re

import pytest


REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

SUPERVISOR_CONFIGS = [
    "conf/supervisor/talebook.conf",
    "conf/supervisor/server-side-render.conf",
    "conf/supervisor/dev.conf",
]

NGINX_CONFIGS = [
    "conf/nginx/talebook.conf",
    "conf/nginx/server-side-render.conf",
    "conf/nginx/dev.conf",
]


def read(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as fh:
        return fh.read()


def program_block(text, name):
    """提取 [program:<name>] 段落文本。"""
    m = re.search(r"^\[program:%s\]\s*$(.*?)(?=^\[|\Z)" % re.escape(name), text, re.M | re.S)
    return m.group(1) if m else ""


# ---------------------------------------------------------------- supervisor


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_supervisor_has_booksvr_program(rel):
    """三套 supervisor 配置都必须有 [program:booksvr]。"""
    assert "[program:booksvr]" in read(rel), "%s 缺少 [program:booksvr]" % rel


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_supervisor_group_includes_booksvr(rel):
    """programs= 必须包含 booksvr。"""
    text = read(rel)
    m = re.search(r"^programs=(.*)$", text, re.M)
    assert m, "%s 缺少 programs=" % rel
    assert "booksvr" in m.group(1), "%s 的 programs= 未包含 booksvr" % rel


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_tornado_program_retired(rel):
    """Tornado 已下线：不应再有 [program:tornado]。"""
    text = read(rel)
    assert "[program:tornado]" not in text, "%s 仍保留 [program:tornado]" % rel
    m = re.search(r"^programs=(.*)$", text, re.M)
    assert m, "%s 缺少 programs=" % rel
    assert "tornado" not in m.group(1), "%s 的 programs= 仍包含 tornado" % rel


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_booksvr_listens_on_8000(rel):
    """booksvr 必须监听 8000，且不再代理到 Tornado。"""
    block = program_block(read(rel), "booksvr")
    assert "-addr=127.0.0.1:8000" in block, "%s 的 booksvr 未监听 8000" % rel
    assert "-tornado-url" not in block, "%s 的 booksvr 仍配置了 Tornado 兜底代理" % rel


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_booksvr_serve_routes_all(rel):
    """-serve-routes 必须为 all（全部路由本地服务）。"""
    block = program_block(read(rel), "booksvr")
    assert "-serve-routes=all" in block, "%s 的 booksvr 白名单不是 all" % rel


@pytest.mark.parametrize("rel", SUPERVISOR_CONFIGS)
def test_booksvr_secret_not_on_command_line(rel):
    """密钥不得写在命令行（避免 ps 泄露）。"""
    block = program_block(read(rel), "booksvr")
    assert "-cookie-secret" not in block, "%s 的 booksvr 把密钥写在了命令行" % rel


@pytest.mark.parametrize("rel", ["conf/supervisor/talebook.conf", "conf/supervisor/server-side-render.conf"])
def test_booksvr_autostart_false_in_bootstrap_env(rel):
    """生产环境 booksvr 必须 autostart=false，由 self_check 拉起。"""
    block = program_block(read(rel), "booksvr")
    assert re.search(r"^autostart=false\s*$", block, re.M), "%s 的 booksvr 应 autostart=false" % rel


# ---------------------------------------------------------------- nginx


@pytest.mark.parametrize("rel", NGINX_CONFIGS)
def test_nginx_upstream_points_to_8000(rel):
    """三套 nginx 的 upstream 保持 8000（现在是 booksvr）。"""
    text = read(rel)
    assert re.search(r"server\s+127\.0\.0\.1:8000;", text), "%s 的 upstream 未指向 8000" % rel


# ---------------------------------------------------------------- 启动时序


def test_self_check_starts_booksvr():
    """self_check.py 必须在自检通过后拉起 booksvr（Tornado 已下线）。"""
    text = read("webserver/self_check.py")
    assert "def start_booksvr(" in text, "self_check.py 缺少 start_booksvr"
    assert "def start_tornado(" not in text, "Tornado 已下线，不应再有 start_tornado"

    body = text[text.index("def run_bootstrap("):]
    assert "start_booksvr_fn()" in body, "run_bootstrap 必须拉起 booksvr"


def test_self_check_passes_cookie_secret():
    """self_check.py 必须从 settings 读出 cookie_secret 并转交 booksvr。"""
    text = read("webserver/self_check.py")
    assert "cookie_secret" in text, "self_check.py 未读取 cookie_secret"
    assert "BOOKSVR_COOKIE_SECRET" in text, "self_check.py 未通过环境变量转交密钥"


def test_self_check_starts_booksvr_program():
    """self_check.py 必须拉起 talebook:booksvr。"""
    text = read("webserver/self_check.py")
    assert "talebook:booksvr" in text, "self_check.py 未拉起 talebook:booksvr"