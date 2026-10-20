"""Isolate real production Nginx rules for regression and actual-source verification."""

import contextlib
import re
import socket
import subprocess
import tempfile
import time
from pathlib import Path

from docker.configure_base_path import configure


ROOT = Path(__file__).resolve().parents[1]
SPA_FALLBACK = "VENERA_PROXY_SPA_FALLBACK"


def unused_port():
    with socket.socket() as reservation:
        reservation.bind(("127.0.0.1", 0))
        return reservation.getsockname()[1]


@contextlib.contextmanager
def production_proxy(backend_port, variant="talebook.conf", prefix=""):
    """Keep production locations intact; vary ports, TLS, logs and static probe root.

    The outer gateway models the documented subpath proxy that strips the prefix.
    The static marker is a routing control, not a replacement frontend experience.
    Nginx and its temporary files are always collected before returning.
    """
    with tempfile.TemporaryDirectory(prefix="venera-proxy-", dir="/tmp") as directory:
        root = Path(directory)
        root.chmod(0o755)
        (root / "index.html").write_text(SPA_FALLBACK)
        (root / "index.html").chmod(0o644)
        # Nuxt copies these public Reader assets unchanged into the SPA export.
        (root / "static").symlink_to(ROOT / "app/public/static", target_is_directory=True)
        inner_port = unused_port()
        site = configure((ROOT / "conf/nginx" / variant).read_text(), prefix)
        site = re.sub(r"listen\s+[^;]+;", "", site)
        site = re.sub(r"ssl_certificate(?:_key)?\s+[^;]+;", "", site)
        site = site.replace("server_name _;", f"listen 127.0.0.1:{inner_port};\n    server_name _;")
        site = re.sub(r"server 127\.0\.0\.1:\d+;", f"server 127.0.0.1:{backend_port};", site)
        site = re.sub(r"access_log\s+(?!off;)[^;]+;", "access_log off;", site)
        site = re.sub(r"error_log\s+[^;]+;", f"error_log {root}/error.log warn;", site)
        site = re.sub(r"(?m)^\s*root [^;]+;", f"    root {root};", site)
        public_port = inner_port
        if prefix:
            public_port = unused_port()
            site += f"""
server {{
    listen 127.0.0.1:{public_port};
    location {prefix}/ {{
        proxy_pass http://127.0.0.1:{inner_port}/;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
"""
        (root / "site.conf").write_text(site)
        config = (ROOT / "conf/nginx/nginx.conf").read_text()
        config = config.replace("worker_processes auto;", "worker_processes 1;").replace("worker_cpu_affinity auto;", "")
        config = config.replace("pid /run/talebook/nginx.pid;", f"pid {root}/nginx.pid;")
        config = config.replace("error_log /var/log/nginx/error.log;", f"error_log {root}/error.log warn;")
        config = config.replace("access_log /var/log/nginx/access.log;", "access_log off;")
        config = config.replace("include /etc/nginx/conf.d/*.conf;", f"include {root}/site.conf;")
        config = config.replace("include /etc/nginx/sites-enabled/*;", "")
        paths = "\n".join(f"{kind}_temp_path {root}/{kind};" for kind in ("client_body", "proxy", "fastcgi", "scgi", "uwsgi"))
        config = config.replace("http {", "http {\n" + paths)
        (root / "nginx.conf").write_text(config)
        command = ["nginx", "-c", str(root / "nginx.conf"), "-g", "daemon off;"]
        subprocess.run(command + ["-t"], capture_output=True, check=True)
        with (root / "stderr.log").open("w") as stderr:
            process = subprocess.Popen(command, stdout=stderr, stderr=stderr)
            try:
                deadline = time.monotonic() + 5
                while True:
                    try:
                        with socket.create_connection(("127.0.0.1", public_port), timeout=0.1):
                            break
                    except OSError:
                        if process.poll() is not None or time.monotonic() > deadline:
                            raise RuntimeError((root / "stderr.log").read_text())
                        time.sleep(0.02)
                yield f"http://127.0.0.1:{public_port}{prefix}"
            finally:
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
