"""Immutable update protocol. Imported by the image executor and release tooling only."""

import base64
import hashlib
import html
import http.client
import ipaddress
import json
import os
import re
import socket
import ssl
import tarfile
import time
from pathlib import Path, PurePosixPath
from urllib.parse import urljoin, urlsplit

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


MAX_PACKAGE = 512 * 1024 * 1024
MAX_EXPANDED = 2 * 1024 * 1024 * 1024
MAX_MANIFEST = 128 * 1024
GITHUB = "https://github.com/talebook/talebook/releases/download"


class UpgradeError(Exception):
    pass


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode()


def stamp_frontend(directory, version):
    index = Path(directory) / "index.html"
    text = index.read_text()
    text = re.sub(r' data-talebook-version="[^"]*"', "", text)
    text, count = re.subn(r"<html\b", '<html data-talebook-version="' + html.escape(version, quote=True) + '"', text, count=1)
    if count != 1:
        raise UpgradeError("archive")
    index.write_text(text)


def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def atomic_json(path, value):
    path = Path(path)
    tmp = path.with_suffix(".tmp")
    with tmp.open("wb") as stream:
        stream.write(canonical(value))
        stream.flush()
        os.fsync(stream.fileno())
    os.replace(tmp, path)
    fsync_dir(path.parent)


def fsync_dir(path):
    fd = os.open(path, os.O_DIRECTORY)
    try:
        os.fsync(fd)
    finally:
        os.close(fd)


def verify(raw, keys):
    try:
        envelope = json.loads(raw)
        manifest = envelope["manifest"]
        key = Ed25519PublicKey.from_public_bytes(base64.b64decode(keys[envelope["key_id"]], validate=True))
        key.verify(base64.b64decode(envelope["signature"], validate=True), canonical(manifest))
    except Exception as exc:
        raise UpgradeError("signature") from exc
    if not isinstance(manifest, dict) or manifest.get("protocol") != 1:
        raise UpgradeError("manifest")
    for field in ("commit", "runtime", "database", "sha256"):
        length = 40 if field == "commit" else 64
        if not re.fullmatch(r"[0-9a-f]{%d}" % length, str(manifest.get(field, ""))):
            raise UpgradeError("manifest")
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}", str(manifest.get("version", ""))):
        raise UpgradeError("manifest")
    if manifest.get("arch") not in ("amd64", "arm64", "armv7") or manifest.get("mode") != "spa":
        raise UpgradeError("runtime")
    for field, maximum in (("sequence", 2**53 - 1), ("size", MAX_PACKAGE), ("expanded_size", MAX_EXPANDED)):
        if type(manifest.get(field)) is not int or not 0 < manifest[field] <= maximum:
            raise UpgradeError("manifest")
    if not isinstance(manifest.get("notes"), str) or len(manifest["notes"]) > 16000:
        raise UpgradeError("manifest")
    if manifest.get("migration") != "none":
        raise UpgradeError("database")
    return manifest


def compatible(manifest, image):
    if any(manifest.get(k) != image.get(k) for k in ("runtime", "arch", "mode")):
        raise UpgradeError("runtime")
    if manifest["database"] != image["database"] or manifest["migration"] != "none":
        raise UpgradeError("database")


class PinnedHTTPS(http.client.HTTPSConnection):
    """Resolve once, connect to that public IP, verify TLS against the original host."""

    def connect(self):
        addresses = socket.getaddrinfo(self.host, self.port, type=socket.SOCK_STREAM)
        if not addresses or any(not ipaddress.ip_address(item[4][0]).is_global for item in addresses):
            raise UpgradeError("source_address")
        last = None
        for family, kind, protocol, _, address in addresses:
            stream = socket.socket(family, kind, protocol)
            try:
                stream.settimeout(self.timeout)
                stream.connect(address)
                self.sock = self._context.wrap_socket(stream, server_hostname=self.host)
                return
            except OSError as exc:
                last = exc
                stream.close()
        raise UpgradeError("network") from last


def validate_source(source):
    parsed = urlsplit(source)
    if (
        parsed.scheme != "https"
        or not parsed.hostname
        or parsed.username
        or parsed.password
        or parsed.port not in (None, 443)
        or parsed.query
        or parsed.fragment
        or "\\" in source
        or any(ord(c) < 33 for c in source)
    ):
        raise UpgradeError("source_config")
    return source.rstrip("/")


def download(url, output, limit, timeout=180):
    """No environment proxies, credentials or arbitrary redirects. Bound bytes and wall time."""
    start = time.monotonic()
    original = urlsplit(validate_source(url)).hostname
    for _ in range(4):
        parsed = urlsplit(validate_source(url))
        host = parsed.hostname
        if host != original and not (original == "github.com" and host == "release-assets.githubusercontent.com"):
            raise UpgradeError("source_redirect")
        # DNS is bounded by the OS resolver; connect/read have independent timeouts.
        conn = PinnedHTTPS(host, timeout=min(10, timeout), context=ssl.create_default_context())
        try:
            conn.request("GET", parsed.path or "/", headers={"User-Agent": "Talebook-Upgrader/1"})
            response = conn.getresponse()
            if response.status in (301, 302, 303, 307, 308):
                # GitHub's signed asset URL legitimately has query credentials. They are never logged.
                target = urljoin(url, response.getheader("Location", ""))
                target_parts = urlsplit(target)
                if original == "github.com" and target_parts.hostname == "release-assets.githubusercontent.com":
                    return _github_asset(target, output, limit, start, timeout)
                url = target
                continue
            if response.status != 200:
                raise UpgradeError("network")
            return _copy_response(response, output, limit, start, timeout)
        finally:
            conn.close()
    raise UpgradeError("source_redirect")


def _github_asset(url, output, limit, start, timeout):
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.port not in (None, 443) or parsed.username or parsed.password or parsed.fragment:
        raise UpgradeError("source_redirect")
    conn = PinnedHTTPS(parsed.hostname, timeout=10, context=ssl.create_default_context())
    try:
        conn.request("GET", parsed.path + "?" + parsed.query, headers={"User-Agent": "Talebook-Upgrader/1"})
        response = conn.getresponse()
        if response.status != 200:
            raise UpgradeError("network")
        return _copy_response(response, output, limit, start, timeout)
    finally:
        conn.close()


def _copy_response(response, output, limit, start, timeout):
    if response.getheader("Content-Length") and int(response.getheader("Content-Length")) > limit:
        raise UpgradeError("size")
    total = 0
    while True:
        if time.monotonic() - start > timeout:
            raise UpgradeError("timeout")
        block = response.read1(min(65536, limit - total + 1))
        if not block:
            break
        total += len(block)
        if total > limit:
            raise UpgradeError("size")
        output.write(block)
    return total


def extract(archive, target, expanded_size):
    """Accept only regular application files, with no tar metadata-driven extraction."""
    total, seen = 0, set()
    with tarfile.open(archive, "r:gz") as tar:
        for entry in tar:
            name = entry.name
            path = PurePosixPath(name)
            if (
                path.is_absolute()
                or ".." in path.parts
                or "\\" in name
                or name != str(path)
                or len(name) > 240
                or any(ord(c) < 32 for c in name)
                or name in seen
                or not entry.isfile()
                or entry.size < 0
                or len(seen) >= 50000
            ):
                raise UpgradeError("archive")
            if not (name == "server.py" or name.startswith("webserver/") or name.startswith("app/dist/")):
                raise UpgradeError("archive")
            if any(p.startswith(".") or p == "__pycache__" for p in path.parts):
                raise UpgradeError("archive")
            total += entry.size
            if total > min(MAX_EXPANDED, expanded_size):
                raise UpgradeError("size")
            seen.add(name)
            destination = target / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            source = tar.extractfile(entry)
            with destination.open("xb") as out:
                while block := source.read(65536):
                    out.write(block)
                out.flush()
                os.fsync(out.fileno())
            destination.chmod(0o755 if name == "server.py" else 0o644)
    if total != expanded_size or not {"server.py", "webserver/main.py", "app/dist/index.html"}.issubset(seen):
        raise UpgradeError("archive")
    for directory, _, _ in os.walk(target, topdown=False):
        fsync_dir(directory)
