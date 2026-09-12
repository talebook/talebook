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


def release_path(commit):
    if not isinstance(commit, str) or not re.fullmatch("[0-9a-f]{40}", commit):
        raise UpgradeError("release_missing")
    path = ROOT / "releases" / commit
    if path.is_symlink() or not path.is_dir():
        raise UpgradeError("release_missing")
    return path


def pin_matches(pin, image, commit):
    return bool(
        pin
        and pin.get("commit") == commit
        and pin.get("image") == {key: image.get(key) for key in ("commit", "runtime", "database")}
    )


def read_record(path):
    try:
        if path.is_symlink():
            return {}
        value = read_json(path, {})
        return value if isinstance(value, dict) else {}
    except (ValueError, OSError):
        return {}


def summary(manifest):
    return {key: manifest[key] for key in ("version", "sequence", "commit", "database") if key in manifest}


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
            atomic_json(ROOT / "pin.json", state.get("previous_pin"))
        state.update(phase="rolled_back", error="interrupted")
        atomic_json(ROOT / "state.json", state)
    if active:
        try:
            compatible(active, image)
            candidate = release_path(active["commit"])
            pinned = pin_matches(read_json(ROOT / "pin.json"), image, active["commit"])
            if (
                image["sequence"] > 0
                and (pinned or active["sequence"] > image["sequence"])
                and (candidate / "server.py").is_file()
            ):
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
        # Preserve metadata available from the older executor before a new job replaces state.
        for manifest in (read_json(ROOT / "active.json"), self.state.get("previous"), self.state.get("candidate")):
            if manifest:
                try:
                    path = release_path(manifest["commit"]) / "release.json"
                    if not path.exists():
                        atomic_json(path, {"manifest": manifest, "installed_at": int(path.parent.stat().st_mtime)})
                except (UpgradeError, KeyError):
                    pass
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
                releases=self.releases(),
                backups=self.backups(),
                keep=self.keep(),
                pinned=pin_matches(read_json(ROOT / "pin.json"), self.image, self.current()["commit"]),
            )

    def keep(self):
        value = read_json(ROOT / "preferences.json", {}).get("keep", 3)
        return value if type(value) is int and 2 <= value <= 20 else 3

    def protected_releases(self):
        return {m.get("commit") for m in (self.current(), read_json(ROOT / "active.json"), self.state.get("previous")) if m}

    def releases(self):
        current = self.current()["commit"]
        rows = [
            dict(
                self.image,
                id="image",
                current=current == self.image["commit"] and (RUN / "current").resolve() == BUILTIN,
                protected=True,
                can_delete=False,
                can_activate=(RUN / "current").resolve() != BUILTIN,
                builtin=True,
            )
        ]
        for path in sorted((ROOT / "releases").iterdir()):
            if not re.fullmatch("[0-9a-f]{40}", path.name) or path.is_symlink() or not path.is_dir():
                continue
            metadata = read_record(path / "release.json")
            manifest = metadata.get("manifest")
            if not isinstance(manifest, dict):
                manifest = None
            # Older data volumes only retained these manifests; never invent missing schema metadata.
            if not manifest:
                manifest = next(
                    (
                        m
                        for m in (read_json(ROOT / "active.json"), self.state.get("previous"))
                        if m and m.get("commit") == path.name
                    ),
                    None,
                )
            reason = None
            try:
                if not manifest or manifest.get("commit") != path.name or not (path / "server.py").is_file():
                    raise UpgradeError("release_metadata")
                compatible(manifest, self.image)
                compatible(manifest, self.current())
            except (UpgradeError, KeyError) as exc:
                reason = str(exc) if isinstance(exc, UpgradeError) else "release_metadata"
            protected = path.name in self.protected_releases()
            rows.append(
                dict(
                    summary(manifest or {}),
                    id=path.name,
                    current=path.name == current and not rows[0]["current"],
                    protected=protected,
                    can_delete=not protected,
                    can_activate=not reason and path.name != current,
                    incompatible=reason,
                    installed_at=metadata.get("installed_at"),
                    size=(manifest or {}).get("expanded_size"),
                )
            )
        return rows[:1] + sorted(rows[1:], key=lambda row: row.get("sequence", 0), reverse=True)

    def backups(self):
        rows = []
        for path in sorted((ROOT / "backups").iterdir(), reverse=True):
            if path.is_symlink() or not path.is_dir() or not re.fullmatch("[0-9a-f]{40}-[0-9]+", path.name):
                continue
            metadata = read_record(path / "snapshot.json")
            if metadata and (not isinstance(metadata.get("source"), dict) or not isinstance(metadata.get("target"), dict)):
                metadata = {}
            if metadata:
                metadata = dict(metadata, source=summary(metadata["source"]), target=summary(metadata["target"]))
            rows.append(
                dict(
                    metadata,
                    id=path.name,
                    legacy=not metadata,
                    created_at=metadata.get("created_at", int(path.stat().st_mtime)),
                    protected=False,
                )
            )
        rows.sort(key=lambda row: row["created_at"], reverse=True)
        protected = {self.state.get("backup", "").removeprefix("backups/")}
        for commit in self.protected_releases():
            snapshot = next((row for row in rows if row.get("source", {}).get("commit") == commit), None)
            if snapshot:
                protected.add(snapshot["id"])
        for row in rows:
            row["protected"] = row["id"] in protected
        return rows

    def prune(self):
        versions = self.releases()[1:]
        retained = {row["id"] for row in versions if row["protected"]}
        for row in versions:
            if len(retained) < self.keep():
                retained.add(row["id"])
        for row in versions:
            if row["id"] not in retained:
                shutil.rmtree(release_path(row["id"]))
        snapshots = [row for row in self.backups() if not row["legacy"]]
        retained = {row["id"] for row in snapshots if row["protected"]}
        for row in snapshots:
            if len(retained) < self.keep():
                retained.add(row["id"])
        for row in snapshots:
            if row["id"] not in retained:
                shutil.rmtree(ROOT / "backups" / row["id"])
        fsync_dir(ROOT / "releases")
        fsync_dir(ROOT / "backups")

    def manage(self, request):
        action = request["action"]
        if action == "retention":
            value = request.get("keep")
            if type(value) is not int or not 2 <= value <= 20:
                raise UpgradeError("retention")
            atomic_json(ROOT / "preferences.json", {"keep": value})
            self.prune()
        elif action == "delete":
            commit = request.get("release")
            if not isinstance(commit, str):
                raise UpgradeError("release_missing")
            if commit == "image" or commit in self.protected_releases():
                raise UpgradeError("protected")
            shutil.rmtree(release_path(commit))
            fsync_dir(ROOT / "releases")
        else:
            snapshot = next((row for row in self.backups() if row["id"] == request.get("release")), None)
            if not snapshot:
                raise UpgradeError("release_missing")
            if snapshot["protected"]:
                raise UpgradeError("protected")
            shutil.rmtree(ROOT / "backups" / snapshot["id"])
            fsync_dir(ROOT / "backups")

    def current(self):
        if (RUN / "current").resolve() == BUILTIN:
            return self.image
        return read_json(ROOT / "active.json") or self.image

    def command(self, request):
        action = request.get("action")
        if action == "status":
            return {"err": "ok", "status": self.status()}
        if action not in ("check", "install", "activate", "delete", "delete_backup", "retention"):
            return {"err": "action"}
        if self.disabled:
            return {"err": self.disabled, "status": self.status()}
        if not self.lock.acquire(blocking=False):
            # Retrying the same install is idempotent, all other concurrent jobs are rejected.
            same = action == "install" and request.get("release") == self.state.get("job")
            return {"err": "ok" if same else "busy", "status": self.status()}
        try:
            if action in ("delete", "delete_backup", "retention"):
                self.manage(request)
                self.save(error=None, cleanup_error=None)
                return {"err": "ok", "status": self.status()}
            if action == "activate":
                row = next((row for row in self.releases() if row["id"] == request.get("release")), None)
                if not row:
                    raise UpgradeError("release_missing")
                if row["current"]:
                    return {"err": "ok", "status": self.status()}
                if not row["can_activate"]:
                    raise UpgradeError(row["incompatible"] or "runtime")
                self.save(phase="draining", job=row["id"], error=None)
            elif action == "install":
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
        except UpgradeError as exc:
            return {"err": str(exc), "status": self.status()}
        except OSError as exc:
            logging.exception("Version management failed")
            code = failure_code(exc)
            self.save(error=code, **({"cleanup_error": code} if action == "retention" else {}))
            return {"err": code, "status": self.status()}
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
            elif action == "activate":
                self.activate(self.state["job"])
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
        old_target = (RUN / "current").resolve()
        target = ROOT / "releases" / manifest["commit"]
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
            atomic_json(unpacked / "release.json", {"manifest": manifest, "installed_at": int(time.time())})
            if target.exists():
                # Failed, unselected release from an earlier attempt can be rebuilt safely.
                if target == old_target:
                    raise UpgradeError("stale")
                shutil.rmtree(target)
            os.replace(unpacked, target)
            fsync_dir(target.parent)
        self.switch_release(manifest, target, manual=False)

    def activate(self, identifier):
        if identifier == "image":
            manifest, target = dict(self.image, migration="none"), BUILTIN
        else:
            target = release_path(identifier)
            manifest = read_record(target / "release.json").get("manifest")
            if not isinstance(manifest, dict) or manifest.get("commit") != identifier:
                raise UpgradeError("release_metadata")
        compatible(manifest, self.image)
        compatible(manifest, self.current())
        self.switch_release(manifest, target, manual=True)

    def switch_release(self, manifest, target, manual):
        self.wait_health(idle=True)
        old_target = (RUN / "current").resolve()
        previous = read_json(ROOT / "active.json") if old_target != BUILTIN else None
        previous_pin = read_json(ROOT / "pin.json")
        self.save(previous=previous, previous_pin=previous_pin)
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
            atomic_json(
                backup / "snapshot.json",
                {
                    "source": previous or self.image,
                    "target": manifest,
                    "database": (previous or self.image)["database"],
                    "created_at": int(time.time()),
                    "databases": count,
                },
            )
            self.save(phase="switching", backup=str(backup.relative_to(ROOT)), databases=count)
            switch(target)
            atomic_json(ROOT / "active.json", None if target == BUILTIN else manifest)
            atomic_json(
                ROOT / "pin.json",
                {
                    "commit": manifest["commit"],
                    "image": {key: self.image.get(key) for key in ("commit", "runtime", "database")},
                }
                if manual
                else None,
            )
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
                    atomic_json(ROOT / "pin.json", previous_pin)
                    supervisor("start")
                    self.wait_health(expected=(previous or self.image)["version"])
                    self.save(phase="rolled_back", error=error)
                except Exception:
                    self.save(phase="recovery_failed", error="recovery")
                    return  # Keep maintenance gate shut. Never restore DB over new writes.
            else:
                self.save(phase="failed", error=error)
            (RUN / "maintenance").unlink(missing_ok=True)
        if self.state["phase"] == "succeeded":
            try:
                self.prune()
                self.save(cleanup_error=None)
            except Exception as exc:
                logging.exception("Release retention cleanup failed")
                self.save(cleanup_error=failure_code(exc))


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
