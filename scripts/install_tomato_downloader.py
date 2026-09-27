#!/usr/bin/env python3
"""Install an explicitly pinned upstream executable, without running it."""

import argparse
import hashlib
import os
import platform
import shutil
import tempfile
import urllib.request
from pathlib import Path


VERSION = "2.4.15"
ARTIFACTS = {
    "amd64": ("Linux_musl_amd64", "d9db872448e3cda78a18eaa3c7ee162ce631251ed51eb789f8e6676abe118722"),
    "arm64": ("Linux_musl_arm64", "3df139fd891ebcf88c6c8b476c755b45e61b3c31075e0b465fc9d14c46800201"),
}
RELEASE = "https://github.com/zhongbai2333/Tomato-Novel-Downloader/releases/download/v" + VERSION
MAX_BINARY_BYTES = 32 * 1024 * 1024


def install(destination, architecture):
    asset, expected = ARTIFACTS[architecture]
    url = "%s/TomatoNovelDownloader-%s-v%s" % (RELEASE, asset, VERSION)
    license_path = Path(__file__).resolve().parents[1] / "document/licenses/tomato-novel-downloader-MIT.txt"
    license_text = license_path.read_bytes()
    destination = Path(destination).resolve()
    destination.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".tomato-install-", dir=destination) as temporary:
        candidate = Path(temporary) / "downloader"
        digest = hashlib.sha256()
        total = 0
        with urllib.request.urlopen(url, timeout=30) as response, candidate.open("wb") as stream:
            while chunk := response.read(64 * 1024):
                total += len(chunk)
                if total > MAX_BINARY_BYTES:
                    raise ValueError("Upstream executable exceeds the size limit")
                digest.update(chunk)
                stream.write(chunk)
        if digest.hexdigest() != expected:
            raise ValueError("SHA-256 mismatch; existing installation was not changed")
        candidate.chmod(0o755)
        # Keep the complete upstream license next to every installed executable.
        (destination / "LICENSE").write_bytes(license_text)
        shutil.copyfile(license_path.with_name("tomato-novel-downloader-NOTICE.md"), destination / "NOTICE.md")
        os.replace(candidate, destination / "downloader")
    return destination / "downloader"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", type=Path, required=True, help="Installation directory, e.g. ./tomato-runtime")
    parser.add_argument("--arch", choices=ARTIFACTS, default={"x86_64": "amd64", "aarch64": "arm64"}.get(platform.machine()))
    args = parser.parse_args()
    if not args.arch:
        parser.error("Specify --arch amd64 or arm64 for the target Talebook Linux container")
    print(install(args.directory, args.arch))


if __name__ == "__main__":
    main()
