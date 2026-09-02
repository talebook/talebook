#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PERSISTENT_VOLUME = "${TALEBOOK_DATA_DIR:-./data}:/data"
COMPOSE_CONFIGS = {
    "docker-compose.yml": ("talebook", "ghcr.io/talebook/talebook"),
    "docker-compose.dev.yml": ("talebook-dev", "ghcr.io/talebook/talebook:dev"),
}


def read(relative_path):
    return (ROOT / relative_path).read_text(encoding="utf-8")


def test_production_compose_defaults_to_persistent_local_data_directory():
    compose = yaml.safe_load(read("docker-compose.yml"))
    volumes = compose["services"]["talebook"]["volumes"]

    assert PERSISTENT_VOLUME in volumes
    assert all(not volume.startswith("/tmp/") for volume in volumes)


def test_deployment_docs_explain_persistence_and_do_not_recommend_tmp_data():
    for relative_path in ("README.md", "README_EN.md", "CODE_WIKI.md"):
        content = read(relative_path)

        assert "TALEBOOK_DATA_DIR" in content
        assert PERSISTENT_VOLUME in content or "$PWD/data:/data" in content
        assert "-v /tmp/demo:/data" not in content


def test_compose_uses_ghcr_without_bundling_optional_douban_service():
    for relative_path, (service_name, expected_image) in COMPOSE_CONFIGS.items():
        compose = yaml.safe_load(read(relative_path))
        services = compose["services"]
        talebook = services[service_name]

        assert talebook["image"] == expected_image
        assert "douban-rs-api" not in services
        assert "depends_on" not in talebook


def test_douban_docs_require_an_explicit_external_service_address():
    content = read("document/README.zh_CN.md")

    assert "需自行部署" in content
    assert "docker-compose.yml` 不再内置该服务" in content
    assert "http://douban-rs-api:80/" not in content
