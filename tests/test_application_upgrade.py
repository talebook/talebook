"""Protocol and crash recovery tests independent of Calibre; no external service writes."""

import base64
import io
import json
import sqlite3
import sys
import tarfile
from pathlib import Path
from unittest.mock import Mock

import pytest
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/upgrade"))
import executor as ex
import mirror
import protocol as p


@pytest.fixture
def signed():
    key = Ed25519PrivateKey.generate()
    keys = {"test": base64.b64encode(key.public_key().public_bytes(Encoding.Raw, PublicFormat.Raw)).decode()}
    manifest = {
        "protocol": 1,
        "version": "v2",
        "sequence": 2,
        "commit": "a" * 40,
        "arch": "amd64",
        "mode": "spa",
        "runtime": "b" * 64,
        "database": "c" * 64,
        "migration": "none",
        "sha256": "d" * 64,
        "size": 123,
        "expanded_size": 1234,
        "notes": "Release notes",
    }

    def sign(value):
        return p.canonical(
            {"manifest": value, "key_id": "test", "signature": base64.b64encode(key.sign(p.canonical(value))).decode()}
        )

    return manifest, keys, sign


def test_signature_and_trust_anchor(signed):
    manifest, keys, sign = signed
    assert p.verify(sign(manifest), keys) == manifest
    changed = json.loads(sign(manifest))
    changed["manifest"]["version"] = "evil"
    with pytest.raises(p.UpgradeError, match="signature"):
        p.verify(p.canonical(changed), keys)
    with pytest.raises(p.UpgradeError, match="signature"):
        p.verify(sign(manifest), {})


@pytest.mark.parametrize(
    "field,value",
    [
        ("size", 2**40),
        ("size", True),
        ("sequence", -1),
        ("commit", "../evil"),
        ("migration", "automatic"),
        ("arch", "riscv"),
        ("mode", "ssr"),
    ],
)
def test_invalid_signed_metadata(signed, field, value):
    manifest, keys, sign = signed
    manifest[field] = value
    with pytest.raises(p.UpgradeError):
        p.verify(sign(manifest), keys)


@pytest.mark.parametrize("field", ["runtime", "arch", "mode", "database"])
def test_incompatible_image(signed, field):
    manifest, _, _ = signed
    image = dict(manifest, **{field: "different"})
    with pytest.raises(p.UpgradeError):
        p.compatible(manifest, image)


@pytest.mark.parametrize(
    "url",
    [
        "http://example.org",
        "https://user:pw@example.org",
        "https://example.org:8000",
        "https://example.org?a=b",
        "https://example.org/#fragment",
        "https://example.org/\\foo",
    ],
)
def test_source_configuration(url):
    with pytest.raises(p.UpgradeError):
        p.validate_source(url)


@pytest.mark.parametrize("address", ["127.0.0.1", "10.0.0.1", "169.254.169.254", "::1", "::ffff:127.0.0.1"])
def test_private_dns_rejected(monkeypatch, address):
    monkeypatch.setattr(p.socket, "getaddrinfo", lambda *a, **kw: [(2, 1, 6, "", (address, 443))])
    with pytest.raises(p.UpgradeError, match="source_address"):
        p.PinnedHTTPS("example.org").connect()


def make_archive(path, entries):
    with tarfile.open(path, "w:gz") as tar:
        for name, kind, content in entries:
            info = tarfile.TarInfo(name)
            info.type = kind
            info.size = len(content)
            info.linkname = "/etc/passwd" if kind in (tarfile.SYMTYPE, tarfile.LNKTYPE) else ""
            tar.addfile(info, io.BytesIO(content))


@pytest.mark.parametrize(
    "name,kind",
    [
        ("../escape", tarfile.REGTYPE),
        ("/etc/passwd", tarfile.REGTYPE),
        ("webserver/x", tarfile.SYMTYPE),
        ("webserver/x", tarfile.LNKTYPE),
        ("webserver/x", tarfile.FIFOTYPE),
        ("docker/start.sh", tarfile.REGTYPE),
        ("webserver/../evil", tarfile.REGTYPE),
        ("webserver//x", tarfile.REGTYPE),
    ],
)
def test_hostile_archive(tmp_path, name, kind):
    archive = tmp_path / "archive.tgz"
    make_archive(archive, [(name, kind, b"")])
    with pytest.raises(p.UpgradeError, match="archive"):
        p.extract(archive, tmp_path / "result", 100)


def test_archive_bomb_and_duplicate(tmp_path):
    archive = tmp_path / "archive.tgz"
    make_archive(archive, [("webserver/x", tarfile.REGTYPE, b"x" * 100)])
    with pytest.raises(p.UpgradeError, match="size"):
        p.extract(archive, tmp_path / "result", 10)
    make_archive(archive, [("webserver/x", tarfile.REGTYPE, b"")] * 2)
    with pytest.raises(p.UpgradeError, match="archive"):
        p.extract(archive, tmp_path / "result", 100)


def test_valid_extract(tmp_path):
    archive = tmp_path / "archive.tgz"
    names = ["server.py", "webserver/main.py", "app/dist/index.html"]
    make_archive(archive, [(n, tarfile.REGTYPE, b"ok") for n in names])
    p.extract(archive, tmp_path / "result", 6)
    assert all((tmp_path / "result" / n).read_bytes() == b"ok" for n in names)


@pytest.fixture
def engine(tmp_path, monkeypatch, signed):
    manifest, keys, sign = signed
    image = dict(manifest, sequence=1, version="v1", commit="e" * 40)
    root, run, builtin = tmp_path / "updates", tmp_path / "run", tmp_path / "builtin"
    root.mkdir()
    run.mkdir()
    builtin.mkdir()
    (root / "releases").mkdir()
    (root / "backups").mkdir()
    image_file, config_file = tmp_path / "image.json", tmp_path / "config.json"
    p.atomic_json(image_file, image)
    p.atomic_json(config_file, {"keys": keys, "sources": ["https://mirror.example", p.GITHUB]})
    for name, value in [
        ("ROOT", root),
        ("RUN", run),
        ("BUILTIN", builtin),
        ("IMAGE_FILE", image_file),
        ("CONFIG_FILE", config_file),
    ]:
        monkeypatch.setattr(ex, name, value)
    monkeypatch.setenv("TALEBOOK_UPGRADE_MODE", "spa")
    monkeypatch.setattr(ex.pwd, "getpwnam", lambda _: Mock(pw_uid=1000, pw_gid=1000))
    ex.switch(builtin)
    return ex.Executor()


def test_sources_highest_and_rollback_watermark(engine, monkeypatch, signed):
    manifest, _, sign = signed
    old = dict(manifest, sequence=1)

    def fetch(url, out, *args):
        out.write(sign(old if "mirror.example" in url else manifest))

    monkeypatch.setattr(ex, "download", fetch)
    engine.check()
    assert engine.state["candidate"] == manifest
    assert engine.state["phase"] == "available"
    monkeypatch.setattr(ex, "download", lambda url, out, *a: out.write(sign(old)))
    with pytest.raises(p.UpgradeError, match="stale"):
        engine.check()


def test_source_failure_fallback_and_conflict(engine, monkeypatch, signed):
    manifest, _, sign = signed

    def fetch(url, out, *args):
        if "mirror.example" in url:
            raise TimeoutError()
        out.write(sign(manifest))

    monkeypatch.setattr(ex, "download", fetch)
    engine.check()
    assert engine.state["sources"][0]["error"] == "network"

    def conflict(url, out, *args):
        out.write(sign(dict(manifest, notes="conflict") if "mirror.example" in url else manifest))

    monkeypatch.setattr(ex, "download", conflict)
    with pytest.raises(p.UpgradeError, match="source_conflict"):
        engine.check()


def test_concurrency_and_idempotence(engine):
    engine.lock.acquire()
    engine.state["job"] = "a" * 40
    assert engine.command({"action": "check"})["err"] == "busy"
    assert engine.command({"action": "install", "release": "a" * 40})["err"] == "ok"
    engine.lock.release()
    assert engine.command({"action": "install", "release": "unknown"})["err"] == "changed"
    assert not engine.lock.locked()
    assert engine.command({"action": "install", "release": engine.image["commit"]})["err"] == "ok"
    assert not engine.lock.locked()


def test_disk_refusal_before_download(engine, monkeypatch, signed, tmp_path):
    manifest, _, _ = signed
    monkeypatch.setattr(ex.shutil, "disk_usage", lambda _: Mock(free=1))
    with pytest.raises(p.UpgradeError, match="disk"):
        engine.package(manifest, tmp_path)


def test_database_backup_includes_wal_and_manual_restore(engine, tmp_path):
    books = tmp_path / "books"
    books.mkdir()
    db = books / "accounts.db"
    with sqlite3.connect(db) as conn:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("CREATE TABLE accounts (name TEXT)")
        conn.execute("INSERT INTO accounts VALUES ('reader')")
        conn.commit()
        assert ex.backup_databases(ex.ROOT / "backups" / "test", books) == 1
        conn.execute("INSERT INTO accounts VALUES ('new after recovery')")
        conn.commit()
        with sqlite3.connect(ex.ROOT / "backups/test/accounts.db") as saved:
            assert saved.execute("SELECT name FROM accounts").fetchall() == [("reader",)]
        assert conn.execute("SELECT count(*) FROM accounts").fetchone()[0] == 2
    # Manual restore is rehearsed into an isolated destination; live data is not overwritten.
    restored = tmp_path / "restored.db"
    with sqlite3.connect(ex.ROOT / "backups/test/accounts.db") as saved, sqlite3.connect(restored) as dst:
        saved.backup(dst)
        assert dst.execute("PRAGMA integrity_check").fetchone() == ("ok",)
        assert dst.execute("SELECT name FROM accounts").fetchone() == ("reader",)


@pytest.mark.parametrize("phase", ["downloading", "switching"])
def test_interrupted_upgrade_recovers_previous(engine, signed, phase):
    manifest, _, _ = signed
    target = ex.ROOT / "releases" / manifest["commit"]
    target.mkdir()
    (target / "server.py").write_text("pass")
    p.atomic_json(ex.ROOT / "active.json", manifest)
    p.atomic_json(ex.ROOT / "state.json", {"phase": phase, "previous": None})
    ex.prepare()
    expected = target if phase == "downloading" else ex.BUILTIN
    assert (ex.RUN / "current").resolve() == expected
    assert ex.read_json(ex.ROOT / "state.json")["error"] == "interrupted"


def test_newer_image_and_incompatible_rebuild_win(engine, signed):
    manifest, _, _ = signed
    target = ex.ROOT / "releases" / manifest["commit"]
    target.mkdir()
    (target / "server.py").write_text("pass")
    p.atomic_json(ex.ROOT / "active.json", manifest)
    ex.prepare()
    assert (ex.RUN / "current").resolve() == target
    p.atomic_json(ex.IMAGE_FILE, dict(engine.image, sequence=3))
    ex.prepare()
    assert (ex.RUN / "current").resolve() == ex.BUILTIN
    p.atomic_json(ex.IMAGE_FILE, dict(engine.image, runtime="f" * 64))
    ex.prepare()
    assert (ex.RUN / "current").resolve() == ex.BUILTIN


def test_response_timeout_and_size():
    response = Mock()
    response.getheader.return_value = None
    response.read1.side_effect = [b"1234", b""]
    with pytest.raises(p.UpgradeError, match="size"):
        p._copy_response(response, io.BytesIO(), 3, p.time.monotonic(), 30)
    with pytest.raises(p.UpgradeError, match="timeout"):
        p._copy_response(response, io.BytesIO(), 10, p.time.monotonic() - 100, 1)


class MemoryStore:
    def __init__(self):
        self.data = {}
        self.writes = []

    def get(self, key):
        return io.BytesIO(self.data[key]) if key in self.data else None

    def put(self, key, stream, immutable):
        self.data[key] = stream.read()
        self.writes.append(key)


def test_mirror_verifies_before_channel_and_refuses_downgrade(tmp_path, signed):
    manifest, keys, sign = signed
    archive = tmp_path / "package-amd64.tar.gz"
    archive.write_bytes(b"package")
    manifest.update(size=7, sha256=p.digest(archive))
    path = tmp_path / "stable-amd64.json"
    path.write_bytes(sign(manifest))
    store = MemoryStore()
    mirror.sync(store, tmp_path, keys)
    assert store.writes[-1] == "app-stable/stable-amd64.json"
    assert store.data[store.writes[-1]] == path.read_bytes()
    path.write_bytes(sign(dict(manifest, sequence=1)))
    with pytest.raises(ValueError, match="downgrade"):
        mirror.sync(store, tmp_path, keys)
    assert len(store.writes) == 3


def test_recovery_failure_keeps_admission_closed(engine):
    p.atomic_json(ex.ROOT / "state.json", {"phase": "recovery_failed", "error": "recovery"})
    ex.prepare()
    assert (ex.RUN / "maintenance").exists()


def test_interrupted_staging_is_reclaimed(engine):
    orphan = ex.ROOT / "stage-abandoned"
    orphan.mkdir()
    (orphan / "partial").write_bytes(b"incomplete")
    ex.prepare()
    assert not orphan.exists()


@pytest.mark.parametrize("bad_health", [False, True])
def test_real_files_install_and_failed_start_restore_application_only(engine, signed, monkeypatch, tmp_path, bad_health):
    manifest, _, sign = signed
    archive = tmp_path / "app.tgz"
    make_archive(
        archive, [(name, tarfile.REGTYPE, b"app") for name in ["server.py", "webserver/main.py", "app/dist/index.html"]]
    )
    manifest.update(expanded_size=9, size=archive.stat().st_size, sha256=p.digest(archive))
    p.atomic_json(ex.ROOT / "candidate.json", json.loads(sign(manifest)))
    import hashlib

    p.atomic_json(ex.ROOT / "watermark.json", {"manifest_hash": hashlib.sha256(p.canonical(manifest)).hexdigest()})
    monkeypatch.setattr(engine, "package", lambda *a: archive)
    calls = []
    monkeypatch.setattr(ex, "supervisor", lambda action: calls.append(action))
    monkeypatch.setattr(ex.subprocess, "run", lambda *a, **kw: Mock(returncode=0))
    backups = []
    monkeypatch.setattr(ex, "backup_databases", lambda dest: backups.append(dest) or 2)

    def check(expected=None, idle=False):
        if bad_health and expected == "v2":
            raise p.UpgradeError("health")

    monkeypatch.setattr(engine, "wait_health", check)
    engine.install()
    assert len(backups) == 1
    assert calls[0] == "stop"
    assert engine.state["phase"] == ("rolled_back" if bad_health else "succeeded")
    expected = ex.BUILTIN if bad_health else ex.ROOT / "releases" / manifest["commit"]
    assert (ex.RUN / "current").resolve() == expected
    assert not (ex.RUN / "maintenance").exists()


def test_insecure_parent_disables_upgrade_without_losing_builtin(engine):
    ex.ROOT.parent.chmod(0o777)
    ex.prepare()
    assert ex.read_json(ex.RUN / "disabled.json")["reason"] == "storage"
    assert (ex.RUN / "current").resolve() == ex.BUILTIN
    assert ex.DisabledExecutor("storage").command({"action": "install"})["err"] == "storage"
    ex.ROOT.parent.chmod(0o700)


def test_frontend_version_marker_is_replaced_and_escaped(tmp_path):
    index = tmp_path / "index.html"
    index.write_text('<!doctype html><html lang="zh-CN"><body>app</body></html>')
    p.stamp_frontend(tmp_path, "v2")
    p.stamp_frontend(tmp_path, "v3")
    assert index.read_text().count("data-talebook-version=") == 1
    assert 'data-talebook-version="v3"' in index.read_text()
