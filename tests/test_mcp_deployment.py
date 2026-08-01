#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_all_nginx_variants_proxy_exact_mcp_endpoint():
    for path in ("conf/nginx/talebook.conf", "conf/nginx/server-side-render.conf", "conf/nginx/dev.conf"):
        config = read(path)
        block = config.split("location = /mcp", 1)[1].split("}", 1)[0]
        assert "proxy_pass       http://tornado;" in block


def test_compose_variants_forward_mcp_token_from_host_environment():
    expected = "TALEBOOK_MCP_TOKEN=${TALEBOOK_MCP_TOKEN:-}"
    assert expected in read("docker-compose.yml")
    assert expected in read("docker-compose.dev.yml")
