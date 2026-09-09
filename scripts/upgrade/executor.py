"""Trusted image-owned executor. Never import modules from an installed release."""

import errno
import fcntl
import hashlib
import io
import json
import logging
import os
import pwd
import re
import shutil
import socketserver
import sqlite3
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

from protocol import (
    GITHUB,
    MAX_MANIFEST,
    UpgradeError,
    atomic_json,
    canonical,
    compatible,
    digest,
    download,
    extract,
    fsync_dir,
    validate_source,
    verify,
)


ROOT = Path("/data/updates")
RUN = Path("/run/talebook-release")
BUILTIN = Path("/var/www/talebook")
IMAGE_FILE = Path("/opt/talebook-upgrade/image.json")
CONFIG_FILE = Path("/etc/talebook-upgrade.json")
TERMINAL = {"idle", "available", "current", "succeeded", "failed", "rolled_back", "recovery_failed"}


def failure_code(exc):
    if isinstance(exc, OSError) and exc.errno == errno.ENOSPC:
        return "disk"
    return str(exc) if isinstance(exc, UpgradeError) else "internal"


def read_json(path, default=None):
    return json.loads(path.read_bytes()) if path.exists() else default


def switch(target):
    temporary = RUN / "next"
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target, target_is_directory=True)
    os.replace(temporary, RUN / "current")
    fsync_dir(RUN)


def prepare():
    # A writable parent could rename/replace the entire root-owned release directory.
    # Disable upgrades gracefully on insecure bind mounts; keep the image application usable.
    RUN.mkdir(parents=True, exist_ok=True)
    if RUN.is_symlink() or RUN.stat().st_uid != 0 or RUN.stat().st_mode & 0o022:
        raise UpgradeError("storage")
    storage_secure = ROOT.parent.stat().st_uid == 0 and not ROOT.parent.stat().st_mode & 0o022
    if ROOT.exists() or ROOT.is_symlink():
        storage_secure = (
            storage_secure and not ROOT.is_symlink() and ROOT.stat().st_uid == 0 and not ROOT.stat().st_mode & 0o022
        )
    if not storage_secure:
        switch(BUILTIN)
        atomic_json(RUN / "disabled.json", {"reason": "storage"})
        return
    (RUN / "disabled.json").unlink(missing_ok=True)
    ROOT.mkdir(mode=0o755, exist_ok=True)
    (ROOT / "releases").mkdir(exist_ok=True)
    (ROOT / "backups").mkdir(mode=0o700, exist_ok=True)
    for staged in ROOT.glob("stage-*"):
        if staged.is_dir() and not staged.is_symlink():
            shutil.rmtree(staged)
    image = read_json(IMAGE_FILE)
    active = read_json(ROOT / "active.json")
    state = read_json(ROOT / "state.json", {})
    target = BUILTIN
    if state.get("phase") not in TERMINAL and state.get("phase") is not None:
        # Promotion not acknowledged: always recover the recorded previous release.
        if state.get("phase") in {"stopping", "backup", "switching", "starting", "recovering"}:
            active = state.get("previous")
            atomic_json(ROOT / "active.json", active)
        state.update(phase="rolled_back", error="interrupted")
        atomic_json(ROOT / "state.json", state)
    if active:
        try:
            compatible(active, image)
            candidate = ROOT / "releases" / active["commit"]
            if image["sequence"] > 0 and active["sequence"] > image["sequence"] and (candidate / "server.py").is_file():
                target = candidate
        except UpgradeError:
            atomic_json(ROOT / "selection.json", {"reason": "runtime", "selected": "image"})
    switch(target)
    if state.get("phase") == "recovery_failed":
        (RUN / "maintenance").touch()
    else:
        (RUN / "maintenance").unlink(missing_ok=True)


def health():
    # Fixed loopback URL, no proxies and no caller-selected network target.
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open("http://127.0.0.1:8000/api/upgrade/health", timeout=5) as response:
        return json.load(response)


def supervisor(action):
    result = subprocess.run(["supervisorctl", action, "talebook:tornado"], capture_output=True, timeout=100)
    if result.returncode:
        raise UpgradeError("process")


def verify_database(path):
    try:
        with sqlite3.connect(path) as connection:
            result = connection.execute("PRAGMA integrity_check").fetchall()
    except sqlite3.OperationalError as exc:
        if "no such tokenizer" not in str(exc) and "no such collation" not in str(exc):
            raise UpgradeError("backup") from exc
        # Isolate Calibre from application-writable preferences/plugins as well as release code.
        with tempfile.TemporaryDirectory(prefix="calibre-check-", dir=ROOT) as config:
            checker = subprocess.run(
                [
                    sys.executable,
                    "-I",
                    "-c",
                    "import sys, runpy; sys.path.insert(0, '/usr/lib/calibre'); runpy.run_path('/usr/lib/calibre/sitecustomize.py'); "
                    "from calibre.db.backend import Connection; "
                    "c=Connection(sys.argv[1]); rows=list(c.execute('PRAGMA integrity_check')); "
                    "c.close(); sys.exit(0 if rows == [('ok',)] else 1)",
                    str(path),
                ],
                env={
                    "PATH": os.defpath,
                    "LANG": "C.UTF-8",
                    "CALIBRE_CONFIG_DIRECTORY": config,
                    "LD_LIBRARY_PATH": "/usr/lib/talebook-calibre/lib",
                },
                capture_output=True,
                timeout=60,
            )
        if checker.returncode:
            raise UpgradeError("backup")
        result = [("ok",)]
    if result != [("ok",)]:
        raise UpgradeError("backup")


def backup_databases(destination, source=Path("/data/books")):
    """Application and children are stopped. SQLite backup includes any committed WAL content."""
    files = []
    for directory, dirs, names in os.walk(source, followlinks=False):
        dirs[:] = [d for d in dirs if not (Path(directory) / d).is_symlink()]
        for name in names:
            path = Path(directory) / name
            if path.is_symlink():
                if path.suffix in (".db", ".sqlite", ".sqlite3"):
                    raise UpgradeError("database_layout")
                continue
            # Header detection also covers databases without a conventional extension.
            with path.open("rb") as stream:
                is_sqlite = stream.read(16) == b"SQLite format 3\x00"
            if is_sqlite:
                files.append(path)
    if not files:
        raise UpgradeError("database_layout")
    if shutil.disk_usage(ROOT).free < sum(p.stat().st_size for p in files) * 2 + 256 * 1024**2:
        raise UpgradeError("disk")
    destination.mkdir(mode=0o700)
    inventory = []
    for path in files:
        relative = path.relative_to(source)
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=5) as src:
            with sqlite3.connect(target) as dst:
                src.backup(dst)
        verify_database(target)
        with target.open("rb") as stream:
            os.fsync(stream.fileno())
        inventory.append({"path": str(relative), "sha256": digest(target)})
    atomic_json(destination / "inventory.json", inventory)
    fsync_dir(destination)
    return len(files)


class Executor:
    def __init__(self):
        self.image = read_json(IMAGE_FILE)
        if CONFIG_FILE.exists() and (CONFIG_FILE.stat().st_uid != 0 or CONFIG_FILE.stat().st_mode & 0o022):
            raise UpgradeError("source_config")
        self.config = read_json(CONFIG_FILE, {})
        self.keys = self.config.get("keys", {})
        self.sources = [validate_source(s) for s in self.config.get("sources", [GITHUB])]
        self.lock = threading.Lock()
        self.state_lock = threading.Lock()
        self.state = read_json(ROOT / "state.json", {"phase": "idle"})
        self.disabled = None
        if self.image.get("mode") != "spa" or os.environ.get("TALEBOOK_UPGRADE_MODE") != "spa":
            self.disabled = "mode"
        elif pwd.getpwnam("talebook").pw_uid == 0:
            self.disabled = "root_user"
        elif self.image.get("sequence", 0) <= 0 or not re.fullmatch("[0-9a-f]{40}", self.image.get("commit", "")):
            self.disabled = "image_metadata"
        elif not self.keys:
            self.disabled = "keys"
        elif not self.sources:
            self.disabled = "source_config"

    def save(self, **values):
        with self.state_lock:
            self.state.update(values, updated_at=int(time.time()))
            atomic_json(ROOT / "state.json", self.state)
            logging.info("upgrade phase=%s error=%s", self.state.get("phase"), self.state.get("error"))

    def status(self):
        with self.state_lock:
            return dict(
                self.state,
                disabled=self.disabled,
                image=self.image,
                current=self.current(),
                domestic_configured=any(s != GITHUB for s in self.sources),
            )

    def current(self):
        if (RUN / "current").resolve() == BUILTIN:
            return self.image
        return read_json(ROOT / "active.json") or self.image

    def command(self, request):
        action = request.get("action")
        if action == "status":
            return {"err": "ok", "status": self.status()}
        if action not in ("check", "install"):
            return {"err": "action"}
        if self.disabled:
            return {"err": self.disabled, "status": self.status()}
        if not self.lock.acquire(blocking=False):
            # Retrying the same install is idempotent, all other concurrent jobs are rejected.
            same = action == "install" and request.get("release") == self.state.get("job")
            return {"err": "ok" if same else "busy", "status": self.status()}
        try:
            if action == "install":
                candidate = self.state.get("candidate")
                if request.get("release") == self.current().get("commit"):
                    return {"err": "ok", "status": self.status()}
                if not candidate or request.get("release") != candidate["commit"]:
                    return {"err": "changed"}
                self.save(phase="downloading", job=candidate["commit"], error=None)
            else:
                self.save(phase="checking", error=None)
            thread = threading.Thread(target=self.run, args=(action,), daemon=False)
            thread.start()
        except Exception:
            raise
        else:
            return {"err": "ok", "status": self.status()}
        finally:
            # Early idempotent/invalid returns did not start a job.
            if "thread" not in locals():
                self.lock.release()

    def run(self, action):
        try:
            if action == "check":
                self.check()
            else:
                self.install()
        except Exception as exc:
            logging.exception("Upgrade operation failed")
            self.save(phase="failed", error=failure_code(exc))
        finally:
            self.lock.release()

    def check(self):
        candidates, diagnostics = [], []
        for index, source in enumerate(self.sources):
            try:
                out = io.BytesIO()
                download(f"{source}/app-stable/stable-{self.image['arch']}.json", out, MAX_MANIFEST, 30)
                raw = out.getvalue()
                manifest = verify(raw, self.keys)
                if manifest["arch"] != self.image["arch"]:
                    raise UpgradeError("runtime")
                candidates.append((manifest, raw))
                diagnostics.append({"source": index, "sequence": manifest["sequence"]})
            except Exception as exc:
                diagnostics.append({"source": index, "error": str(exc) if isinstance(exc, UpgradeError) else "network"})
        self.save(sources=diagnostics)
        if not candidates:
            raise UpgradeError("sources_unavailable")
        candidates.sort(key=lambda item: item[0]["sequence"], reverse=True)
        manifest, raw = candidates[0]
        if any(m["sequence"] == manifest["sequence"] and m != manifest for m, _ in candidates):
            raise UpgradeError("source_conflict")
        watermark = read_json(ROOT / "watermark.json", {"sequence": 0})
        if manifest["sequence"] < watermark["sequence"]:
            raise UpgradeError("stale")
        if (
            manifest["sequence"] == watermark["sequence"]
            and watermark.get("manifest_hash") != hashlib.sha256(canonical(manifest)).hexdigest()
        ):
            raise UpgradeError("source_conflict")
        atomic_json(
            ROOT / "watermark.json",
            {
                "sequence": manifest["sequence"],
                "commit": manifest["commit"],
                "manifest_hash": hashlib.sha256(canonical(manifest)).hexdigest(),
            },
        )
        atomic_json(ROOT / "candidate.json", json.loads(raw))
        reason = None
        try:
            compatible(manifest, self.image)
        except UpgradeError as exc:
            reason = str(exc)
        self.save(
            candidate=manifest,
            incompatible=reason,
            phase="available" if manifest["sequence"] > self.current()["sequence"] else "current",
        )

    def package(self, manifest, directory):
        archive = directory / "package.tar.gz"
        if shutil.disk_usage(ROOT).free < manifest["size"] + manifest["expanded_size"] + 256 * 1024**2:
            raise UpgradeError("disk")
        for source in self.sources:
            try:
                with archive.open("wb") as stream:
                    size = download(
                        f"{source}/app-{manifest['commit']}/package-{manifest['arch']}.tar.gz", stream, manifest["size"]
                    )
                    stream.flush()
                    os.fsync(stream.fileno())
                if size != manifest["size"] or digest(archive) != manifest["sha256"]:
                    raise UpgradeError("hash")
                return archive
            except Exception as exc:
                if failure_code(exc) == "disk":
                    raise UpgradeError("disk") from exc
                logging.warning("Package source failed (%s)", type(exc).__name__)
        raise UpgradeError("package_unavailable")

    def wait_health(self, expected=None, idle=False):
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            try:
                result = health()
                if result.get("err") == "ok":
                    if not result.get("supported"):
                        raise UpgradeError("database_layout")
                    if (not idle or not result["busy"]) and (expected is None or result["version"] == expected):
                        return
            except UpgradeError:
                raise
            except Exception:
                pass
            time.sleep(1)
        raise UpgradeError("busy" if idle else "health")

    def install(self):
        manifest = verify((ROOT / "candidate.json").read_bytes(), self.keys)
        compatible(manifest, self.image)
        watermark = read_json(ROOT / "watermark.json", {})
        if watermark.get("manifest_hash") != hashlib.sha256(canonical(manifest)).hexdigest():
            raise UpgradeError("changed")
        if manifest["sequence"] <= self.current()["sequence"]:
            raise UpgradeError("stale")
        self.wait_health(idle=True)
        previous = read_json(ROOT / "active.json") if (RUN / "current").resolve() != BUILTIN else None
        old_target = (RUN / "current").resolve()
        target = ROOT / "releases" / manifest["commit"]
        self.save(previous=previous)
        with tempfile.TemporaryDirectory(prefix="stage-", dir=ROOT) as temporary:
            stage = Path(temporary)
            archive = self.package(manifest, stage)
            self.save(phase="verifying")
            unpacked = stage / "app"
            unpacked.mkdir()
            extract(archive, unpacked, manifest["expanded_size"])
            # The only allowed symlink is created by the trusted loader, never taken from tar.
            logo = unpacked / "app/dist/logo"
            if logo.exists():
                shutil.rmtree(logo)
            logo.symlink_to("/data/books/logo", target_is_directory=True)
            # Environment file is persistent settings, not executable release code.
            (unpacked / "app/.env").symlink_to("/var/www/talebook/app/.env")
            if target.exists():
                # Failed, unselected release from an earlier attempt can be rebuilt safely.
                if target == old_target:
                    raise UpgradeError("stale")
                shutil.rmtree(target)
            os.replace(unpacked, target)
            fsync_dir(target.parent)
        self.save(phase="draining")
        (RUN / "maintenance").touch()
        stopped = False
        try:
            # Nginx and BaseHandler both close admission before inspecting write queues.
            self.wait_health(idle=True)
            self.save(phase="stopping")
            supervisor("stop")
            stopped = True
            self.save(phase="backup")
            backup = ROOT / "backups" / f"{manifest['commit']}-{time.time_ns()}"
            count = backup_databases(backup)
            self.save(phase="switching", backup=str(backup.relative_to(ROOT)), databases=count)
            switch(target)
            atomic_json(ROOT / "active.json", manifest)
            self.save(phase="starting")
            supervisor("start")
            self.wait_health(expected=manifest["version"])
            self.save(phase="succeeded", error=None)
            (RUN / "maintenance").unlink(missing_ok=True)
        except Exception as exc:
            logging.exception("Installation failed; restoring application selection")
            error = failure_code(exc)
            if stopped:
                self.save(phase="recovering", error=error)
                try:
                    # A failed supervisor start may already have left the process stopped.
                    subprocess.run(["supervisorctl", "stop", "talebook:tornado"], capture_output=True, timeout=100)
                    switch(old_target)
                    atomic_json(ROOT / "active.json", previous)
                    supervisor("start")
                    self.wait_health(expected=(previous or self.image)["version"])
                    self.save(phase="rolled_back", error=error)
                except Exception:
                    self.save(phase="recovery_failed", error="recovery")
                    return  # Keep maintenance gate shut. Never restore DB over new writes.
            else:
                self.save(phase="failed", error=error)
            (RUN / "maintenance").unlink(missing_ok=True)


class DisabledExecutor:
    def __init__(self, reason):
        self.reason = reason

    def command(self, request):
        return {
            "err": "ok" if request.get("action") == "status" else self.reason,
            "status": {"disabled": self.reason, "phase": "idle", "current": read_json(IMAGE_FILE)},
        }


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        self.connection.settimeout(10)
        try:
            raw = self.rfile.readline(4097)
            if len(raw) > 4096:
                raise UpgradeError("size")
            reply = self.server.executor.command(json.loads(raw))
        except Exception:
            logging.exception("Control request failed")
            reply = {"err": "internal"}
        self.wfile.write(json.dumps(reply).encode() + b"\n")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "prepare":
        prepare()
        return
    disabled = read_json(RUN / "disabled.json")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    if disabled:
        executor = DisabledExecutor(disabled["reason"])
    else:
        lockfile = (ROOT / "executor.lock").open("w")
        fcntl.flock(lockfile, fcntl.LOCK_EX | fcntl.LOCK_NB)
        executor = Executor()
        # Supervisor can restart this process while an interrupted application switch is pending.
        if executor.state.get("phase") not in TERMINAL:
            (RUN / "maintenance").touch()
            supervisor("stop")
            prepare()
            (RUN / "maintenance").touch()
            supervisor("start")
            executor.state = read_json(ROOT / "state.json")
            executor.wait_health()
            (RUN / "maintenance").unlink(missing_ok=True)
    sock = RUN / "control.sock"
    sock.unlink(missing_ok=True)
    with socketserver.ThreadingUnixStreamServer(str(sock), Handler) as server:
        os.chown(sock, 0, pwd.getpwnam("talebook").pw_gid)
        sock.chmod(0o660)
        server.executor = executor
        server.serve_forever()


if __name__ == "__main__":
    main()
