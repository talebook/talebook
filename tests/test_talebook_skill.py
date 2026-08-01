#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_talebook_skill_is_self_contained():
    skill = ROOT / "skills" / "talebook"

    assert (skill / "SKILL.md").is_file()
    assert (skill / "agents" / "openai.yaml").is_file()
    assert (skill / "scripts" / "talebook-cli.py").is_file()
    assert (skill / "references" / "api.md").is_file()
    assert (skill / "references" / "docker-compose.md").is_file()
    assert (skill / "references" / "workflows.md").is_file()


def test_skill_name_and_default_prompt_match_the_directory():
    skill = read("skills/talebook/SKILL.md")
    metadata = read("skills/talebook/agents/openai.yaml")

    assert "name: talebook\n" in skill
    assert "$talebook" in metadata
    assert "references/workflows.md" in skill


def test_mcp_runtime_and_skill_are_absent():
    assert not (ROOT / "skills" / "talebook-mcp").exists()
    assert not (ROOT / "webserver" / "handlers" / "mcp.py").exists()
    assert not (ROOT / "webserver" / "mcp").exists()
    assert not (ROOT / "document" / "mcp.md").exists()

    for path in ("docker-compose.yml", "docker-compose.dev.yml"):
        assert "TALEBOOK_MCP_TOKEN" not in read(path)
    for path in ("conf/nginx/talebook.conf", "conf/nginx/server-side-render.conf", "conf/nginx/dev.conf"):
        assert "location = /mcp" not in read(path)


def test_workflow_reference_preserves_mcp_lessons_without_protocol_dependency():
    workflows = read("skills/talebook/references/workflows.md")

    assert "books search" in workflows
    assert "books show" in workflows
    assert "不要根据列表顺序" in workflows
    assert "不要自动无限轮询" in workflows
    assert "写操作失败时不要自动重试" in workflows
    assert "预览与执行之间目标发生变化时" in workflows
    assert "JSON-RPC" not in workflows
