import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRUNE_SCRIPT = ROOT / "scripts" / "prune-readest.sh"


def prepare_readest_output(tmp_path: Path) -> Path:
    output = tmp_path / "readest"
    files = {
        "index.html": "Readest",
        "reader.html": "reader",
        "_next/static/chunks/app.js": "console.log('reader')",
        "_next/static/chunks/app.js.map": "debug symbols",
        "locales/en/translation.json": "{}",
        "locales/zh-CN/translation.json": "{}",
        "vendor/jieba/jieba_rs_wasm_bg.wasm": "jieba",
        "vendor/simplecc/simplecc_wasm_bg.wasm": "simplecc",
        "vendor/pdfjs/pdf.worker.min.mjs": "pdf worker",
        "LICENSE-AGPL-3.0.txt": "AGPL",
        "SOURCE.md": "source",
    }
    for relative_path, content in files.items():
        path = output / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    return output


def run_prune(output: Path, *, max_bytes: int | None = None) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    if max_bytes is not None:
        env["READEST_MAX_BYTES"] = str(max_bytes)
    return subprocess.run(
        ["sh", str(PRUNE_SCRIPT), str(output)],
        check=False,
        capture_output=True,
        text=True,
        env=env,
    )


def test_prune_readest_removes_debug_and_pdf_only_assets(tmp_path):
    output = prepare_readest_output(tmp_path)

    result = run_prune(output)

    assert result.returncode == 0, result.stderr
    assert "removed 1 sourcemaps" in result.stdout
    assert not (output / "_next/static/chunks/app.js.map").exists()
    assert not (output / "vendor/pdfjs").exists()
    assert (output / "_next/static/chunks/app.js").is_file()
    assert (output / "vendor/jieba/jieba_rs_wasm_bg.wasm").is_file()
    assert (output / "vendor/simplecc/simplecc_wasm_bg.wasm").is_file()

    second_result = run_prune(output)
    assert second_result.returncode == 0, second_result.stderr
    assert "removed 0 sourcemaps" in second_result.stdout


def test_prune_readest_validates_core_files_before_deleting(tmp_path):
    output = prepare_readest_output(tmp_path)
    (output / "reader.html").unlink()

    result = run_prune(output)

    assert result.returncode == 1
    assert "missing required path: reader.html" in result.stderr
    assert (output / "_next/static/chunks/app.js.map").is_file()
    assert (output / "vendor/pdfjs/pdf.worker.min.mjs").is_file()


def test_prune_readest_rejects_output_over_budget(tmp_path):
    output = prepare_readest_output(tmp_path)

    result = run_prune(output, max_bytes=1)

    assert result.returncode == 1
    assert "limit is 1 bytes" in result.stderr


def test_dockerfile_prunes_readest_after_adding_source_notices():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")

    copy_script = "COPY scripts/prune-readest.sh /usr/local/bin/prune-readest"
    add_notice = "cp /readest/LICENSE /readest/out/readest/LICENSE-AGPL-3.0.txt"
    run_prune_command = "sh /usr/local/bin/prune-readest /readest/out/readest"

    assert copy_script in dockerfile
    assert run_prune_command in dockerfile
    assert dockerfile.index(copy_script) < dockerfile.index(add_notice) < dockerfile.index(run_prune_command)
    assert dockerfile.index(run_prune_command) < dockerfile.index("COPY --from=readest-builder")
