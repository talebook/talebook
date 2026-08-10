#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_talebook_skill_is_distributed_from_its_own_repository():
    readme = read("README.md")
    migration_notice = read("skills/README.md")

    assert not (ROOT / "skills" / "talebook").exists()
    for document in (readme, migration_notice):
        assert "https://github.com/talebook/skills" in document
        assert "npx skills add talebook/skills -g" in document


def test_mcp_runtime_and_skill_are_absent():
    assert not (ROOT / "skills" / "talebook-mcp").exists()
    assert not (ROOT / "webserver" / "handlers" / "mcp.py").exists()
    assert not (ROOT / "webserver" / "mcp").exists()
    assert not (ROOT / "document" / "mcp.md").exists()

    for path in ("docker-compose.yml", "docker-compose.dev.yml"):
        assert "TALEBOOK_MCP_TOKEN" not in read(path)
    for path in ("conf/nginx/talebook.conf", "conf/nginx/server-side-render.conf", "conf/nginx/dev.conf"):
        assert "location = /mcp" not in read(path)
