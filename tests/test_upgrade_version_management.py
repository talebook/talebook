"""Opt-in, isolated Docker acceptance. Supply only a disposable fixture, never production data.

Fixture uses smoke_container.py plus signed v2/v3/v4 packages and test book/account data.
All writable files are copied; the uniquely named container is removed even on failure.
"""

import json
import os
import shutil
import sqlite3
import subprocess
import time
import uuid
from pathlib import Path

import pytest
import requests

from tests.test_upgrade_recreation import docker, files_digest


FIXTURE = os.environ.get("TALEBOOK_VERSION_FIXTURE")
pytestmark = pytest.mark.skipif(not FIXTURE, reason="Requires disposable signed version-management fixture")


def test_versions_snapshots_retention_and_recreation(tmp_path):
    source = Path(FIXTURE).resolve()
    data, fixture = tmp_path / "data", tmp_path / "fixture"
    shutil.copytree(source / "data", data, symlinks=True)
    shutil.copytree(source / "fixture", fixture)
    (data / ".permission").unlink(missing_ok=True)
    name = "tb213-versions-" + uuid.uuid4().hex[:12]
    image = os.environ.get("TALEBOOK_VERSION_IMAGE", "talebook:tb213-smoke")
    credentials = json.loads((fixture / "credentials.json").read_text())
    client = requests.Session()
    client.trust_env = False
    base = ""

    def start():
        nonlocal base
        identifier = docker(
            "run",
            "-d",
            "--name",
            name,
            "--log-driver",
            "none",
            "-p",
            "127.0.0.1::80",
            "-e",
            "PUID=1000",
            "-e",
            "PGID=1000",
            "--mount",
            f"type=bind,src={data},dst=/data",
            "--mount",
            f"type=bind,src={fixture},dst=/fixture,readonly",
            "--mount",
            f"type=bind,src={fixture / 'config.json'},dst=/etc/talebook-upgrade.json,readonly",
            image,
        )
        base = "http://127.0.0.1:" + docker("port", name, "80/tcp").rsplit(":", 1)[1]
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            try:
                if client.post(base + "/api/user/sign_in", data=credentials, timeout=5).json().get("err") == "ok":
                    return identifier
            except (requests.RequestException, ValueError):
                pass
            time.sleep(1)
        pytest.fail("Disposable backend did not become ready")

    def status():
        response = client.get(base + "/api/admin/upgrade", timeout=10).json()
        assert response["err"] == "ok"
        return response["status"]

    def command(action, **values):
        response = client.post(
            base + "/api/admin/upgrade",
            json={"action": action, **values},
            headers={"X-Talebook-Upgrade": "1"},
            timeout=20,
        ).json()
        assert response["err"] == "ok", response.get("err")
        return response

    def wait_phase(expected):
        deadline = time.monotonic() + 90
        while time.monotonic() < deadline:
            try:
                result = status()
                if result["phase"] in expected:
                    return result
                assert result["phase"] not in ("failed", "rolled_back", "recovery_failed"), result.get("error")
            except (requests.RequestException, ValueError):
                pass
            time.sleep(1)
        pytest.fail("Upgrade operation did not complete")

    try:
        first_id = start()
        for number in (2, 3, 4):
            commit = f"{number:040x}"
            channel = fixture / "resources/app-stable"
            channel.mkdir(exist_ok=True)
            shutil.copy(fixture / f"resources/app-{commit}/stable-amd64.json", channel / "stable-amd64.json")
            command("check")
            wait_phase({"available"})
            command("install", release=commit)
            result = wait_phase({"succeeded"})
            assert result["current"]["version"] == f"v{number}"
        assert len(result["releases"]) == 4  # builtin + three installed packages
        assert len(result["backups"]) == 3
        assert result["backups"][0]["source"]["version"] == "v3"
        assert result["backups"][0]["target"]["version"] == "v4"
        if os.environ.get("TALEBOOK_VERSION_BROWSER") == "1":
            subprocess.run(
                ["npx", "playwright", "test", "--config", "test/upgrade.browser.config.ts"],
                cwd=Path(__file__).resolve().parents[1] / "app",
                check=True,
                timeout=180,
                env=dict(
                    os.environ,
                    TALEBOOK_UPGRADE_URL=base,
                    TALEBOOK_UPGRADE_CREDENTIALS=str(fixture / "credentials.json"),
                    TALEBOOK_UPGRADE_EXPECTED_VERSION="v4",
                ),
            )
        library = files_digest(data / "books/library")
        # A committed sentinel in a separate TEST database represents data added after v2.
        sentinel = data / "books/version-management-test.db"
        with sqlite3.connect(sentinel) as db:
            db.execute("CREATE TABLE sentinel (value TEXT)")
            db.execute("INSERT INTO sentinel VALUES ('written-at-v4')")
        for action in ("activate", "delete", "delete_backup", "retention"):
            assert (
                requests.post(base + "/api/admin/upgrade", json={"action": action}, timeout=10).json()["err"]
                == "user.need_login"
            )
        command("activate", release=f"{2:040x}")
        result = wait_phase({"succeeded"})
        assert result["current"]["version"] == "v2" and result["pinned"]
        newest = result["backups"][0]
        assert (newest["source"]["version"], newest["target"]["version"]) == ("v4", "v2")
        backup = data / "updates/backups" / newest["id"]
        for path in (sentinel, backup / sentinel.name):
            with sqlite3.connect(path) as db:
                assert db.execute("SELECT value FROM sentinel").fetchone() == ("written-at-v4",)
        assert json.loads((backup / "snapshot.json").read_text())["database"] == result["current"]["database"]
        assert any(row["path"] == sentinel.name for row in json.loads((backup / "inventory.json").read_text()))
        command("delete", release=f"{3:040x}")
        result = status()
        assert {row["version"] for row in result["releases"]} == {"v1", "v2", "v4"}
        removable = next(row for row in result["backups"] if not row["protected"])
        command("delete_backup", release=removable["id"])
        assert not (data / "updates/backups" / removable["id"]).exists()
        command("retention", keep=2)
        assert status()["keep"] == 2
        docker("stop", "-t", "20", name)
        docker("rm", name)
        second_id = start()
        assert first_id != second_id
        result = status()
        assert result["current"]["version"] == "v2" and result["pinned"] and result["keep"] == 2
        assert 'data-talebook-version="v2"' in client.get(base + "/", timeout=10).text
        assert client.get(base + "/api/index", timeout=10).json()["new_books"]
        assert library == files_digest(data / "books/library")
        with sqlite3.connect(sentinel) as db:
            assert db.execute("SELECT value FROM sentinel").fetchone() == ("written-at-v4",)
        print(
            "Signed v2→v3→v4; manual v4→v2; snapshot association, data preservation, deletion, N=2 and container recreation verified."
        )
    finally:
        client.close()
        docker("rm", "-f", name)
