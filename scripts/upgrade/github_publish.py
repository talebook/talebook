"""Publish via authenticated gh CLI, verify remote bytes, then advance signed channels."""

import json
import os
import subprocess
import tempfile
from pathlib import Path

from mirror import sync


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


if __name__ == "__main__":
    sync(GitHub(), Path("output"), json.loads(os.environ["UPGRADE_TRUSTED_KEYS"]))
