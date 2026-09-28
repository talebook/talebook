"""Build a signed application package from an exported production image. No publishing side effects."""

import argparse
import base64
import io
import json
import os
import re
import tarfile
from pathlib import Path

from cryptography.hazmat.primitives.serialization import load_pem_private_key
from fingerprint import database_fingerprint
from protocol import MAX_EXPANDED, MAX_PACKAGE, atomic_json, canonical, digest, stamp_frontend, verify


def build(root, image, output, key_id, private_key, notes):
    if not re.fullmatch(r"[0-9a-f]{40}", image["commit"]) or image["sequence"] <= 0:
        raise ValueError("A fixed commit and positive sequence are required")
    if database_fingerprint(root) != image["database"]:
        raise ValueError("Exported source does not match image schema")
    # Set the backend version explicitly, without executable release-controlled interpolation.
    (root / "webserver/version.py").write_text(f"VERSION = {image['version']!r}\nARCH = {image['arch']!r}\n")
    stamp_frontend(root / "app/dist", image["version"])
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"package-{image['arch']}.tar.gz"
    files = [root / "server.py"]
    for directory in (root / "webserver", root / "app/dist"):
        for path in directory.rglob("*"):
            relative = path.relative_to(root)
            if any(part.startswith(".") or part == "__pycache__" for part in relative.parts):
                continue
            if str(relative).startswith("app/dist/logo/") or str(relative) == "app/dist/logo":
                continue
            if path.is_symlink():
                raise ValueError(f"Unexpected source symlink: {relative}")
            if path.is_file() and path.suffix not in (".pyc", ".pyo"):
                files.append(path)
    expanded = 0
    with tarfile.open(archive, "w:gz", format=tarfile.USTAR_FORMAT) as tar:
        for path in sorted(files):
            content = path.read_bytes()
            expanded += len(content)
            if expanded > MAX_EXPANDED:
                raise ValueError("Expanded size limit exceeded")
            info = tarfile.TarInfo(str(path.relative_to(root)))
            info.size = len(content)
            info.mode = 0o644
            tar.addfile(info, io.BytesIO(content))
    if archive.stat().st_size > MAX_PACKAGE:
        raise ValueError("Package size limit exceeded")
    manifest = dict(
        image,
        protocol=1,
        size=archive.stat().st_size,
        expanded_size=expanded,
        sha256=digest(archive),
        migration="none",
        notes=notes,
    )
    key = load_pem_private_key(private_key, password=None)
    envelope = {"key_id": key_id, "manifest": manifest, "signature": base64.b64encode(key.sign(canonical(manifest))).decode()}
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    public = base64.b64encode(key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)).decode()
    verify(canonical(envelope), {key_id: public})
    atomic_json(output / f"stable-{image['arch']}.json", envelope)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--image", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--key-id", required=True)
    parser.add_argument("--notes", required=True, type=Path)
    args = parser.parse_args()
    build(
        args.root,
        json.loads(args.image.read_bytes()),
        args.output,
        args.key_id,
        os.environ["UPGRADE_SIGNING_KEY"].encode(),
        args.notes.read_text(),
    )


if __name__ == "__main__":
    main()
