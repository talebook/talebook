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
    asset.parent.mkdir(parents=True)
    asset.write_bytes(b"verified")
    (dist / "build-baseline.json").write_text(
        json.dumps(
            {
                "schema": "readest.talebook-embed.baseline.v1",
                "files": [
                    {
                        "file": "assets/reader.js",
                        "sha256": hashlib.sha256(b"verified").hexdigest(),
                    }
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
