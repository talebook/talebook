import hashlib
import json
import subprocess
import sys
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "update_readest_embed.py"


def test_copy_requires_baseline_hashes(tmp_path):
    dist = tmp_path / "dist"
    target = tmp_path / "target"
    asset = dist / "assets" / "reader.js"
    manifest = dist / ".vite" / "manifest.json"
    asset.parent.mkdir(parents=True)
    manifest.parent.mkdir(parents=True)
    asset.write_bytes(b"verified")
    manifest.write_text("{}", encoding="utf-8")
    (dist / "build-baseline.json").write_text(
        json.dumps(
            {
                "schema": "readest.talebook-embed.baseline.v1",
                "files": [
                    {
                        "file": "assets/reader.js",
                        "sha256": hashlib.sha256(b"verified").hexdigest(),
                    },
                    {
                        "file": ".vite/manifest.json",
                        "sha256": hashlib.sha256(b"{}").hexdigest(),
                    },
                ],
            }
        ),
        encoding="utf-8",
    )

    subprocess.run([sys.executable, str(SCRIPT), str(dist), "--target", str(target)], check=True)
    assert (target / "assets" / "reader.js").read_bytes() == b"verified"

    asset.write_bytes(b"tampered")
    failed = subprocess.run(
        [sys.executable, str(SCRIPT), str(dist), "--target", str(target)],
        capture_output=True,
        text=True,
        check=False,
    )
    assert failed.returncode != 0
    assert "hash mismatch" in failed.stderr


def test_copy_requires_versioned_manifest_and_removes_stale_assets(tmp_path):
    dist = tmp_path / "dist"
    target = tmp_path / "target"
    asset = dist / "assets" / "reader-hash.js"
    manifest = dist / ".vite" / "manifest.json"
    asset.parent.mkdir(parents=True)
    manifest.parent.mkdir(parents=True)
    asset.write_bytes(b"versioned")
    manifest.write_text('{"index.html":{"file":"assets/reader-hash.js","isEntry":true}}', encoding="utf-8")
    files = []
    for relative in ("assets/reader-hash.js", ".vite/manifest.json"):
        data = (dist / relative).read_bytes()
        files.append({"file": relative, "sha256": hashlib.sha256(data).hexdigest()})
    (dist / "build-baseline.json").write_text(
        json.dumps({"schema": "readest.talebook-embed.baseline.v1", "files": files}), encoding="utf-8"
    )
    target.mkdir()
    (target / "stale.js").write_text("stale", encoding="utf-8")

    subprocess.run([sys.executable, str(SCRIPT), str(dist), "--target", str(target)], check=True)

    assert not (target / "stale.js").exists()
    assert (target / "manifest.json").is_file()
