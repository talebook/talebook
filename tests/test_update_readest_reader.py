import subprocess
import sys
from pathlib import Path


SCRIPT = Path(__file__).parents[1] / "scripts" / "update_readest_reader.py"


def test_copy_requires_original_readest_reader_export(tmp_path):
    dist = tmp_path / "dist"
    target = tmp_path / "target"
    entrypoint = dist / "reader.html"
    chunk = dist / "_next" / "static" / "chunks" / "reader-deadbeef.js"
    entrypoint.parent.mkdir(parents=True)
    chunk.parent.mkdir(parents=True)
    entrypoint.write_text("<html>Readest</html>", encoding="utf-8")
    chunk.write_text("reader", encoding="utf-8")
    target.mkdir()
    (target / "stale.js").write_text("stale", encoding="utf-8")

    subprocess.run([sys.executable, str(SCRIPT), str(dist), "--target", str(target)], check=True)

    assert (target / "reader.html").read_text(encoding="utf-8") == "<html>Readest</html>"
    assert (target / "_next" / "static" / "chunks" / "reader-deadbeef.js").is_file()
    assert not (target / "stale.js").exists()


def test_copy_rejects_incomplete_export(tmp_path):
    failed = subprocess.run(
        [sys.executable, str(SCRIPT), str(tmp_path / "missing"), "--target", str(tmp_path / "target")],
        capture_output=True,
        text=True,
        check=False,
    )

    assert failed.returncode != 0
    assert "invalid Readest Reader export" in failed.stderr
