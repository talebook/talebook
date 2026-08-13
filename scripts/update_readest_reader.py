#!/usr/bin/env python3
"""Copy the original Readest Reader export into Talebook static assets."""

import argparse
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("dist", type=Path)
    parser.add_argument(
        "--target",
        type=Path,
        default=Path("app/public/static/reader"),
    )
    args = parser.parse_args()

    entrypoint = args.dist / "reader.html"
    chunks = args.dist / "_next" / "static"
    if not entrypoint.is_file() or not chunks.is_dir():
        raise SystemExit("invalid Readest Reader export")

    if args.target.exists():
        shutil.rmtree(args.target)
    shutil.copytree(args.dist, args.target)
    print(f"copied Readest Reader to {args.target}")


if __name__ == "__main__":
    main()
