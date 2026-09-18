"""Release publication contract: real signatures, in-memory storage, no remote writes."""

import base64
import io
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest
import yaml
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts/upgrade"))
import github_publish as publisher
import protocol


COMMIT = "a" * 40
VERSION = "v26.09.11"


class Store:
    def __init__(self):
        self.data = {}
        self.writes = []
        self.info = {"draft": False, "prerelease": False}
        self.sha = COMMIT

    def release(self, tag):
        return self.info

    def commit(self, tag):
        return self.sha

    def get(self, key):
        return io.BytesIO(self.data[key]) if key in self.data else None

    def put(self, key, stream, immutable):
        self.data[key] = stream.read()
        self.writes.append(key)


@pytest.fixture
def artifacts(tmp_path):
    key = Ed25519PrivateKey.generate()
    keys = {"test": base64.b64encode(key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)).decode()}

    def write(file_arch, **changes):
        archive = tmp_path / f"package-{file_arch}.tar.gz"
        archive.write_bytes(b"package")
        manifest = dict(
            protocol=1,
            version=VERSION,
            sequence=2,
            commit=COMMIT,
            arch=file_arch,
            mode="spa",
            runtime="b" * 64,
            database="c" * 64,
            migration="none",
            sha256=protocol.digest(archive),
            size=7,
            expanded_size=7,
            notes="Release notes",
        )
        manifest.update(changes)
        signed = dict(
            key_id="test", manifest=manifest, signature=base64.b64encode(key.sign(protocol.canonical(manifest))).decode()
        )
        (tmp_path / f"stable-{file_arch}.json").write_bytes(protocol.canonical(signed))

    for arch in publisher.ARCHITECTURES:
        write(arch)
    return tmp_path, keys, write


def test_version_release_and_client_urls_publish_identical_bytes_then_channels(artifacts):
    directory, keys, _ = artifacts
    store = Store()
    publisher.publish(store, directory, keys, COMMIT, VERSION, VERSION)
    assert len(store.writes) == 15
    assert all(key.startswith(VERSION + "/") for key in store.writes[:6])
    assert all(key.startswith("app-stable/") for key in store.writes[-3:])
    for arch in publisher.ARCHITECTURES:
        for name in (f"package-{arch}.tar.gz", f"stable-{arch}.json"):
            assert store.data[f"{VERSION}/{name}"] == store.data[f"app-{COMMIT}/{name}"]
    publisher.publish(store, directory, keys, COMMIT, VERSION, VERSION)
    assert len(store.writes) == 15  # Retry identical artifacts without overwriting them.


@pytest.mark.parametrize(
    "failure", ["missing", "commit", "version", "arch", "signature", "hash", "draft", "prerelease", "moved_tag"]
)
def test_invalid_matrix_or_release_is_rejected_before_any_write(artifacts, failure):
    directory, keys, write = artifacts
    store = Store()
    path = directory / "stable-armv7.json"
    if failure == "missing":
        path.unlink()
    elif failure in {"commit", "version", "arch"}:
        write("armv7", **{failure: {"commit": "d" * 40, "version": "v0", "arch": "amd64"}[failure]})
    elif failure == "signature":
        path.write_bytes(path.read_bytes().replace(b"Release notes", b"Changed notes"))
    elif failure == "hash":
        (directory / "package-armv7.tar.gz").write_bytes(b"invalid")
    elif failure == "moved_tag":
        store.sha = "d" * 40
    else:
        store.info[failure] = True
    with pytest.raises((ValueError, protocol.UpgradeError)):
        publisher.publish(store, directory, keys, COMMIT, VERSION, VERSION)
    assert store.writes == []


def test_release_asset_conflict_does_not_advance_channel(artifacts):
    directory, keys, _ = artifacts
    store = Store()
    store.data[f"{VERSION}/package-amd64.tar.gz"] = b"existing different asset"
    with pytest.raises(ValueError, match="immutable"):
        publisher.publish(store, directory, keys, COMMIT, VERSION, VERSION)
    assert store.writes == []


def test_failed_release_readback_does_not_publish_client_resources(artifacts):
    directory, keys, _ = artifacts

    class CorruptStore(Store):
        def put(self, key, stream, immutable):
            super().put(key, stream, immutable)
            self.data[key] = b"corrupted upload"

    store = CorruptStore()
    with pytest.raises(ValueError, match="Remote verification"):
        publisher.publish(store, directory, keys, COMMIT, VERSION, VERSION)
    assert all(key.startswith(VERSION + "/") for key in store.writes)


def test_manual_publish_without_version_release_keeps_client_layout(artifacts):
    directory, keys, _ = artifacts
    store = Store()
    publisher.publish(store, directory, keys, COMMIT, VERSION)
    assert len(store.writes) == 9
    assert all(key.startswith("app-") for key in store.writes)


@pytest.mark.parametrize(
    "event_name,invalid",
    [
        ("release", ""),
        ("workflow_dispatch", ""),
        ("release", "prerelease"),
        ("workflow_dispatch", "tag_commit"),
        ("workflow_dispatch", "unsafe_version"),
        ("workflow_dispatch", "outside_master"),
    ],
)
def test_workflow_resolves_annotated_tag_and_validates_manual_commit(tmp_path, event_name, invalid):
    workflow = yaml.safe_load((ROOT / ".github/workflows/application-upgrade.yml").read_text())
    step = next(x for x in workflow["jobs"]["prepare"]["steps"] if x.get("id") == "release")

    def git(*args):
        return subprocess.check_output(["git", *args], cwd=tmp_path, text=True).strip()

    git("init", "-q")
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "test")
    commit = git("rev-parse", "HEAD")
    git("update-ref", "refs/remotes/origin/master", commit)
    git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "tag", "-a", VERSION, "-m", "release")
    if invalid in {"tag_commit", "outside_master"}:
        git("-c", "user.name=Test", "-c", "user.email=test@example.invalid", "commit", "--allow-empty", "-qm", "unreviewed")
        commit = git("rev-parse", "HEAD")
    event = tmp_path / "event.json"
    event.write_text(json.dumps({"release": {"tag_name": VERSION, "draft": False, "prerelease": invalid == "prerelease"}}))
    output = tmp_path / "output"
    result = subprocess.run(
        ["bash", "-e", "-c", step["run"]],
        cwd=tmp_path,
        capture_output=True,
        env={
            **os.environ,
            "GITHUB_EVENT_PATH": str(event),
            "GITHUB_EVENT_NAME": event_name,
            "GITHUB_OUTPUT": str(output),
            "INPUT_COMMIT": commit,
            "INPUT_VERSION": "v1\ncommit=evil" if invalid == "unsafe_version" else VERSION,
            "INPUT_RELEASE_TAG": "" if invalid == "outside_master" else VERSION,
        },
    )
    if invalid:
        assert result.returncode != 0 and not output.exists()
    else:
        assert result.returncode == 0
        assert f"commit={commit}\n" in output.read_text()
        assert f"release_tag={VERSION}\n" in output.read_text()
