"""Generate an image attestation from the actually installed runtime, never a version guess."""

import hashlib
import importlib.metadata
import json
import platform
import subprocess
import sys
from pathlib import Path

from protocol import atomic_json, digest, stamp_frontend


def database_fingerprint(root):
    return hashlib.sha256(
        b"".join(
            (root / p).read_bytes()
            for p in (
                "webserver/models.py",
                "webserver/migrate_db.py",
            )
        )
    ).hexdigest()


def main():
    root, output, arch, version, sequence, commit = sys.argv[1:]
    root = Path(root)
    runtime = {
        "protocol": 1,
        "python": sys.version,
        "machine": platform.machine(),
        "packages": sorted((d.metadata["Name"], d.version) for d in importlib.metadata.distributions()),
        "system": subprocess.check_output(["dpkg-query", "-W", "-f=${Package}=${Version}\\n"]).decode(),
        "calibre_bootstrap": digest("/usr/lib/calibre/sitecustomize.py"),
        "calibre": subprocess.check_output(["calibredb", "--version"]).decode(),
        "loader": {str(p.name): digest(p) for p in sorted(Path(__file__).parent.glob("*.py"))},
        "layout": {
            p: digest(root / p)
            for p in (
                "Dockerfile",
                "requirements.txt",
                "docker/start.sh",
                "conf/supervisor/talebook.conf",
                "conf/nginx/talebook.conf",
                "webserver/self_check.py",
            )
        },
    }
    atomic_json(
        output,
        {
            "runtime": hashlib.sha256(json.dumps(runtime, sort_keys=True).encode()).hexdigest(),
            "database": database_fingerprint(root),
            "arch": arch,
            "mode": "spa",
            "version": version,
            "sequence": int(sequence),
            "commit": commit,
        },
    )
    frontend = Path("/var/www/talebook/app/dist")
    if (frontend / "index.html").exists():
        stamp_frontend(frontend, version)


if __name__ == "__main__":
    main()
