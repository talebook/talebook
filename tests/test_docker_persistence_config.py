#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-

from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
PERSISTENT_VOLUME = "${TALEBOOK_DATA_DIR:-./data}:/data"


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
