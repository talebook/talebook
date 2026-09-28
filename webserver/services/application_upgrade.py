"""Small unprivileged client for the trusted image-owned upgrade executor."""

import json
import os
import socket
from pathlib import Path


SOCKET = "/run/talebook-release/control.sock"
MAINTENANCE = Path("/run/talebook-release/maintenance")


def request_executor(action, release=None, keep=None):
    try:
        with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as client:
            client.settimeout(5)
            client.connect(SOCKET)
            client.sendall(json.dumps({"action": action, "release": release, "keep": keep}).encode() + b"\n")
            with client.makefile("rb") as stream:
                response = stream.readline(256 * 1024)
            return json.loads(response)
    except (OSError, ValueError):
        reason = "mode" if os.environ.get("TALEBOOK_UPGRADE_MODE") in ("ssr", "dev") else "loader"
        return {"err": reason, "status": {"disabled": reason, "phase": "idle"}}
