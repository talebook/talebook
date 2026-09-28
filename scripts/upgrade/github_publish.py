"""Publish via authenticated gh CLI, verify remote bytes, then advance signed channels."""

import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

from mirror import put_verified, sync
from protocol import digest, verify


ARCHITECTURES = {"amd64", "arm64", "armv7"}


def gh(*args, **kwargs):
    return subprocess.run(["gh", *args], check=True, **kwargs)


class GitHub:
    def __init__(self):
        self.repo = os.environ["GH_REPO"]

    def release(self, tag):
        response = subprocess.run(["gh", "api", f"repos/{self.repo}/releases/tags/{tag}"], capture_output=True)
        if response.returncode:
            if b"(HTTP 404)" in response.stderr:
                return None
            raise RuntimeError("GitHub release lookup failed")
        return json.loads(response.stdout)

    def commit(self, tag):
        result = gh("api", f"repos/{self.repo}/commits/{tag}", capture_output=True)
        return json.loads(result.stdout)["sha"]

    def get(self, key):
        tag, name = key.split("/", 1)
        release = self.release(tag)
        asset = next((a for a in (release or {}).get("assets", []) if a["name"] == name), None)
        if not asset:
            return None
        stream = tempfile.TemporaryFile()
        try:
            gh(
                "api",
                f"repos/{self.repo}/releases/assets/{asset['id']}",
                "-H",
                "Accept: application/octet-stream",
                stdout=stream,
            )
            stream.seek(0)
            return stream
        except Exception:
            stream.close()
            raise

    def put(self, key, data, immutable):
        tag, name = key.split("/", 1)
        if self.release(tag) is None:
            gh(
                "release",
                "create",
                tag,
                "--target",
                os.environ["RELEASE_COMMIT"],
                "--prerelease",
                "--title",
                tag,
                "--notes",
                "Signed application upgrade resources; runtime compatibility required.",
            )
        args = ["release", "upload", tag, str(data.name)]
        if not immutable:
            args.append("--clobber")
        gh(*args)


def publish(store, directory, keys, commit, version, release_tag=""):
    """Validate the entire matrix before writing any Release assets or channels."""
    if not re.fullmatch(r"[0-9a-f]{40}", commit) or not keys:
        raise ValueError("A full commit and trusted signing keys are required")
    expected = {f"stable-{arch}.json" for arch in ARCHITECTURES}
    if {path.name for path in directory.glob("stable-*.json")} != expected:
        raise ValueError("All three architecture manifests are required")
    assets = []
    for arch in sorted(ARCHITECTURES):
        path = directory / f"stable-{arch}.json"
        manifest = verify(path.read_bytes(), keys)
        if manifest["arch"] != arch or manifest["commit"] != commit or manifest["version"] != version:
            raise ValueError("Manifest does not match the release commit, version or architecture")
        archive = directory / f"package-{arch}.tar.gz"
        if archive.stat().st_size != manifest["size"] or digest(archive) != manifest["sha256"]:
            raise ValueError("Local package mismatch")
        assets.extend((archive, path))
    if release_tag:
        if not re.fullmatch(r"v[a-zA-Z0-9._-]{1,79}", release_tag) or release_tag != version:
            raise ValueError("Release tag must match the application version")
        release = store.release(release_tag)
        if not release or release["draft"] or release["prerelease"]:
            raise ValueError("An existing published stable Release is required")
        if store.commit(release_tag) != commit:
            raise ValueError("Release tag no longer points to the reviewed commit")
        for path in assets:
            put_verified(store, f"{release_tag}/{path.name}", path)
    # Keep the client's established URLs. Channels advance only after every asset verifies.
    sync(store, directory, keys)


if __name__ == "__main__":
    publish(
        GitHub(),
        Path("output"),
        json.loads(os.environ["UPGRADE_TRUSTED_KEYS"]),
        os.environ["RELEASE_COMMIT"],
        os.environ["RELEASE_VERSION"],
        os.environ.get("RELEASE_TAG", ""),
    )
