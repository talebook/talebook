"""Sync verified bytes to OSS/COS. Immutable resources first, stable pointer last."""

import argparse
import hashlib
import json
import os
from pathlib import Path

from protocol import digest, validate_source, verify


class OSS:
    def __init__(self):
        import oss2

        self.bucket = oss2.Bucket(
            oss2.Auth(os.environ["MIRROR_ACCESS_KEY_ID"], os.environ["MIRROR_ACCESS_KEY_SECRET"]),
            validate_source(os.environ["MIRROR_ENDPOINT"]),
            os.environ["MIRROR_BUCKET"],
        )

    def get(self, key):
        import oss2

        try:
            return self.bucket.get_object(key)
        except oss2.exceptions.NoSuchKey:
            return None

    def put(self, key, data, immutable):
        self.bucket.put_object(
            key, data, headers={"Cache-Control": "public,max-age=31536000,immutable" if immutable else "public,max-age=60"}
        )


class COS:
    def __init__(self):
        from qcloud_cos import CosConfig, CosS3Client

        self.client = CosS3Client(
            CosConfig(
                Region=os.environ["MIRROR_REGION"],
                SecretId=os.environ["MIRROR_ACCESS_KEY_ID"],
                SecretKey=os.environ["MIRROR_ACCESS_KEY_SECRET"],
                Scheme="https",
            )
        )
        self.bucket = os.environ["MIRROR_BUCKET"]

    def get(self, key):
        from qcloud_cos.cos_exception import CosServiceError

        try:
            return self.client.get_object(Bucket=self.bucket, Key=key)["Body"].get_raw_stream()
        except CosServiceError as exc:
            if exc.get_status_code() == 404:
                return None
            raise

    def put(self, key, data, immutable):
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=data,
            CacheControl="public,max-age=31536000,immutable" if immutable else "public,max-age=60",
        )


def stream_digest(stream):
    try:
        h = hashlib.sha256()
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
        return h.hexdigest()
    finally:
        stream.close()


def put_verified(store, key, path, immutable=True):
    expected = digest(path)
    existing = store.get(key)
    if existing is not None:
        old = stream_digest(existing)
        if old == expected:
            return
        if immutable:
            raise ValueError("Refusing to replace immutable object")
    with path.open("rb") as stream:
        store.put(key, stream, immutable)
    result = store.get(key)
    if result is None or stream_digest(result) != expected:
        raise ValueError("Remote verification failed")


def sync(store, directory, keys, prefix=""):
    manifests = sorted(directory.glob("stable-*.json"))
    if not manifests:
        raise ValueError("No manifests")
    checked = []
    for path in manifests:
        manifest = verify(path.read_bytes(), keys)
        archive = directory / f"package-{manifest['arch']}.tar.gz"
        if archive.stat().st_size != manifest["size"] or digest(archive) != manifest["sha256"]:
            raise ValueError("Local package mismatch")
        # No stale channel updates, including an accidental replay by a release operator.
        previous = store.get(f"{prefix}app-stable/{path.name}")
        if previous is not None:
            try:
                old = verify(previous.read(128 * 1024 + 1), keys)
            finally:
                previous.close()
            if old["sequence"] > manifest["sequence"] or (old["sequence"] == manifest["sequence"] and old != manifest):
                raise ValueError("Refusing channel downgrade/conflict")
        checked.append((path, archive, manifest))
    for path, archive, manifest in checked:
        release = f"{prefix}app-{manifest['commit']}"
        put_verified(store, f"{release}/{archive.name}", archive)
        put_verified(store, f"{release}/{path.name}", path)
    # Only advance any channels after ALL architectures and manifests were read back and hashed.
    for path, _, _ in checked:
        put_verified(store, f"{prefix}app-stable/{path.name}", path, immutable=False)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--provider", choices=("oss", "cos"), required=True)
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--keys", required=True, type=Path)
    args = parser.parse_args()
    store = OSS() if args.provider == "oss" else COS()
    sync(store, args.directory, json.loads(args.keys.read_bytes()))


if __name__ == "__main__":
    main()
