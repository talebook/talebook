#!/usr/bin/env python3
"""Copy a verified Readest talebook-embed build into Talebook static assets."""

import argparse
import hashlib
import json
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dist", type=Path)
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("app/public/static/readest/talebook-embed"),
    )
    args = parser.parse_args()
    baseline_path = args.dist / "build-baseline.json"
    baseline = json.loads(baseline_path.read_text(encoding="utf-8"))
    if baseline.get("schema") != "readest.talebook-embed.baseline.v1":
        raise SystemExit("invalid Readest embed baseline")
    allowed = {item["file"]: item["sha256"] for item in baseline["files"]}
    manifest_name = ".vite/manifest.json"
    if manifest_name not in allowed:
        raise SystemExit("missing Vite build manifest")
    publish = {name: digest for name, digest in allowed.items() if name != manifest_name}
    for name, digest in publish.items():
        data = (args.dist / name).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest:
            raise SystemExit(f"hash mismatch: {name}")
    args.target.mkdir(parents=True, exist_ok=True)
    for child in args.target.iterdir():
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()
    for name in publish:
        destination = args.target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(args.dist / name, destination)
    shutil.copy2(args.dist / manifest_name, args.target / "manifest.json")
    shutil.copy2(baseline_path, args.target / baseline_path.name)
    print(f"copied {len(publish)} verified files and manifest to {args.target}")


if __name__ == "__main__":
    main()
