"""Opt-in Docker regression using a COPY of an already upgraded, disposable fixture.

TALEBOOK_RECREATE_FIXTURE contains data/, fixture/config.json and fixture/credentials.json.
Never supply production data. The original fixture is not mounted writable or modified.
"""

import hashlib
import json
import os
import shutil
import subprocess
import time
import uuid
from pathlib import Path

import pytest
import requests


FIXTURE = os.environ.get("TALEBOOK_RECREATE_FIXTURE")
pytestmark = pytest.mark.skipif(not FIXTURE, reason="Requires an upgraded disposable Docker fixture")


def docker(*args):
    return subprocess.run(["docker", *args], check=True, capture_output=True, text=True, timeout=90).stdout.strip()


def files_digest(directory):
    return {
        str(path.relative_to(directory)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in directory.rglob("*")
        if path.is_file() and not path.is_symlink() and "__pycache__" not in path.parts
    }


def snapshot(name, credentials, version):
    __tracebackhide__ = True
    port = docker("port", name, "80/tcp").rsplit(":", 1)[1]
    with requests.Session() as client:
        client.trust_env = False
        base = f"http://127.0.0.1:{int(port)}"
        deadline = time.monotonic() + 60
        while True:
            try:
                response = client.post(base + "/api/user/sign_in", data=credentials, timeout=5)
                if response.status_code == 200 and response.json().get("err") == "ok":
                    break
            except (requests.RequestException, ValueError):
                pass
            if time.monotonic() >= deadline:
                pytest.fail("Disposable backend did not become ready for login")
            time.sleep(1)
        payload = client.get(base + "/api/admin/upgrade", timeout=10).json()
        assert payload["err"] == "ok"
        status = payload["status"]
        assert status["current"]["version"] == version
        assert status["current"]["sequence"] > status["image"]["sequence"]
        books = client.get(base + "/api/index", timeout=10).json()["new_books"]
        assert books
        book_ids = sorted(book["id"] for book in books)
        reader = client.get(base + f"/read/{book_ids[0]}", timeout=10)
        assert reader.status_code == 200
        assert "text/html" in reader.headers["Content-Type"]
        front = client.get(base + "/", timeout=10)
        assert front.status_code == 200
        assert f'data-talebook-version="{version}"' in front.text
        return status["current"], book_ids


@pytest.mark.parametrize("replacement", ["same", "compatible"])
def test_upgraded_data_survives_container_deletion(tmp_path, replacement):
    source = Path(FIXTURE).resolve()
    data = tmp_path / "data"
    shutil.copytree(source / "data", data, symlinks=True)
    # copytree preserves mode but not ownership; let bootstrap initialize this COPY.
    (data / ".permission").unlink(missing_ok=True)
    credentials = json.loads((source / "fixture/credentials.json").read_text())
    active = json.loads((data / "updates/active.json").read_text())
    release = data / "updates/releases" / active["commit"]
    # Include real configuration, plugins, metadata and book files; login may update the user DB.
    watched = [release, data / "books/settings", data / "books/library", data / "books/plugins"]
    before_files = [files_digest(path) for path in watched]
    image = os.environ.get("TALEBOOK_RECREATE_IMAGE", "talebook:tb213-smoke")
    next_image = (
        image if replacement == "same" else os.environ.get("TALEBOOK_RECREATE_COMPATIBLE_IMAGE", "talebook:tb213-compatible")
    )
    name = "tb213-recreate-" + uuid.uuid4().hex[:12]

    def start(selected):
        extra_mounts = []
        if os.environ.get("TALEBOOK_RECREATE_COPY_APP") == "1":
            # Low-disk hosts can place tmp_path on tmpfs. Copy the selected image anew
            # on EVERY start: no application files from the deleted container survive.
            application = tmp_path / ("image-" + uuid.uuid4().hex)
            docker("create", "--name", name, selected)
            try:
                docker("cp", f"{name}:/var/www/talebook", str(application))
            finally:
                docker("rm", "-v", name)
            extra_mounts = ["--mount", f"type=bind,src={application},dst=/var/www/talebook"]
        return docker(
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
            f"type=bind,src={source / 'fixture'},dst=/fixture,readonly",
            "--mount",
            f"type=bind,src={source / 'fixture/config.json'},dst=/etc/talebook-upgrade.json,readonly",
            *extra_mounts,
            selected,
        )

    try:
        first_id = start(image)
        first = snapshot(name, credentials, active["version"])
        docker("stop", "-t", "20", name)
        docker("rm", name)
        second_id = start(next_image)
        assert second_id != first_id
        assert snapshot(name, credentials, active["version"]) == first
        docker("stop", "-t", "20", name)
        assert json.loads((data / "updates/active.json").read_text()) == active
        assert [files_digest(path) for path in watched] == before_files
        print(f"{replacement}: deleted {first_id[:12]}, recreated {second_id[:12]}, retained {active['version']}")
    finally:
        # Only the uniquely named container created above; never shared services or volumes.
        docker("rm", "-f", name)
