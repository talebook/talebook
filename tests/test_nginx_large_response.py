"""Real proxy regression; run in a Talebook image with Python and Nginx.

    python3 -m unittest tests.test_nginx_large_response -v

Uses synthetic metadata, not a real Calibre library. No host ports or data needed.
"""

import contextlib
import http.client
import http.server
import json
import os
import re
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
SMALL = b'{"err": "ok"}'
LARGE = json.dumps(
    {
        "meta": "tag",
        "items": [{"id": i, "name": "中文标签完整性验证" * 4 + str(i), "count": 4} for i in range(40000)],
        "total": 40000,
    }
).encode()


class Upstream(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        payload = SMALL if self.path == "/api/welcome" else LARGE
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        try:
            self.wfile.write(payload)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Expected when the negative control closes its upstream early.

    def log_message(self, *args):
        pass


@unittest.skipUnless(shutil.which("nginx") and os.geteuid() == 0, "requires Nginx and root in an isolated test container")
class TestNginxLargeResponse(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.upstream = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
        cls.thread = threading.Thread(target=cls.upstream.serve_forever)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.upstream.shutdown()
        cls.upstream.server_close()
        cls.thread.join()

    @contextlib.contextmanager
    def proxy(self, variant, uid, *, original=False, writable=False):
        # Calibre sets tempfile.tempdir to a private (0700) directory. Both the
        # non-root master and root master's unprivileged worker need to traverse
        # this path. Never chmod that shared parent; create our own under /tmp.
        with tempfile.TemporaryDirectory(prefix="talebook-nginx-", dir="/tmp") as directory:
            root = Path(directory)
            os.chown(root, uid, uid)
            root.chmod(0o755)
            with socket.socket() as reservation:
                reservation.bind(("127.0.0.1", 0))
                port = reservation.getsockname()[1]

            # Keep the production proxy locations/directives; isolate only ports,
            # filesystem paths, optional TLS and unrelated frontend upstreams.
            site = (ROOT / "conf/nginx" / variant).read_text()
            site = re.sub(r"listen\s+[^;]+;", "", site)
            site = re.sub(r"ssl_certificate(?:_key)?\s+[^;]+;", "", site)
            site = site.replace("server_name _;", f"listen 127.0.0.1:{port};\n    server_name _;")
            site = re.sub(r"server 127\.0\.0\.1:\d+;", f"server 127.0.0.1:{self.upstream.server_port};", site)
            site = re.sub(r"access_log\s+(?!off;)[^;]+;", "access_log off;", site)
            site = re.sub(r"error_log\s+[^;]+;", f"error_log {root}/error.log warn;", site)
            (root / "site.conf").write_text(site)

            config = (ROOT / "conf/nginx/nginx.conf").read_text()
            if original:
                config = re.sub(r"^\s*proxy_max_temp_file_size\s+0;", "", config, flags=re.M)
            config = config.replace("worker_processes auto;", "worker_processes 1;")
            config = config.replace("worker_cpu_affinity auto;", "")
            config = config.replace("pid /run/talebook/nginx.pid;", f"pid {root}/nginx.pid;")
            config = config.replace("error_log /var/log/nginx/error.log;", f"error_log {root}/error.log warn;")
            config = config.replace("access_log /var/log/nginx/access.log;", "access_log off;")
            config = config.replace("include /etc/nginx/conf.d/*.conf;", f"include {root}/site.conf;")
            config = config.replace("include /etc/nginx/sites-enabled/*;", "")
            paths = "\n".join(
                f"{kind}_temp_path {root}/{kind};" for kind in ("client_body", "proxy", "fastcgi", "scgi", "uwsgi")
            )
            config = config.replace("http {", "http {\n" + paths)
            (root / "nginx.conf").write_text(config)
            command = ["nginx", "-c", str(root / "nginx.conf"), "-g", "daemon off;"]
            checked = subprocess.run(command + ["-t"], capture_output=True, text=True, user=uid, group=uid)
            self.assertEqual(checked.returncode, 0, checked.stderr)
            with (root / "stderr.log").open("w") as stderr:
                process = subprocess.Popen(command, stdout=stderr, stderr=stderr, user=uid, group=uid)
                try:
                    deadline = time.monotonic() + 5
                    while True:
                        try:
                            with socket.create_connection(("127.0.0.1", port), timeout=0.1):
                                break
                        except OSError:
                            if process.poll() is not None or time.monotonic() > deadline:
                                self.fail((root / "stderr.log").read_text())
                            time.sleep(0.02)
                    # Model unavailable disk buffering after successful startup.
                    # Read/traverse remain possible, but the worker cannot create files.
                    (root / "proxy").chmod(0o700 if writable else 0o500)
                    yield port, root / "error.log"
                finally:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()

    def request(self, port, path, *, slow=False):
        with socket.socket() as connection:
            if slow:
                connection.setsockopt(socket.SOL_SOCKET, socket.SO_RCVBUF, 4096)
            connection.settimeout(15)
            connection.connect(("127.0.0.1", port))
            connection.sendall(f"GET {path} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n".encode())
            if slow:
                time.sleep(0.2)  # Let the upstream outpace the downstream and fill proxy buffers.
            response = http.client.HTTPResponse(connection)
            response.begin()
            self.assertEqual(response.status, 200)
            expected_length = int(response.getheader("Content-Length"))
            try:
                body = response.read()
            except http.client.IncompleteRead as error:
                body = error.partial
            return expected_length, body

    def test_original_config_truncates_large_json_when_proxy_temp_is_unwritable(self):
        with self.proxy("talebook.conf", 0, original=True) as (port, log):
            self.assertEqual(self.request(port, "/api/welcome")[1], SMALL)
            length, body = self.request(port, "/api/tag", slow=True)
            self.assertEqual(length, len(LARGE))
            self.assertLess(len(body), length)
            with self.assertRaises(json.JSONDecodeError):
                json.loads(body)
            self.assertIn("Permission denied", log.read_text())
            self.assertIn("/proxy/", log.read_text())
            print(f"negative control: expected={length}, received={len(body)}, proxy temp Permission denied")

    def test_original_config_transmits_identical_json_with_writable_proxy_temp(self):
        with self.proxy("talebook.conf", 0, original=True, writable=True) as (port, log):
            length, body = self.request(port, "/api/tag", slow=True)
            self.assertEqual(length, len(body))
            self.assertEqual(body, LARGE)
            self.assertIn("buffered to a temporary file", log.read_text())
            self.assertNotIn("Permission denied", log.read_text())

    def test_large_json_survives_without_writable_proxy_temp_in_all_variants(self):
        for variant in ("talebook.conf", "server-side-render.conf", "dev.conf"):
            for uid in (0, 911):
                for writable in (False, True):
                    with self.subTest(variant=variant, uid=uid, writable=writable):
                        with self.proxy(variant, uid, writable=writable) as (port, log):
                            self.assertEqual(self.request(port, "/api/welcome")[1], SMALL)
                            length, body = self.request(port, "/api/tag?show=all", slow=True)
                            self.assertEqual(length, len(body))
                            self.assertEqual(body, LARGE)
                            parsed = json.loads(body)
                            self.assertEqual(len(parsed["items"]), 40000)
                            self.assertEqual(parsed["items"][-1]["id"], 39999)
                            self.assertNotIn("/proxy/", log.read_text())
                            self.assertNotIn("Permission denied", log.read_text())


class TestNginxLargeResponseWithRestrictedTmpdir(TestNginxLargeResponse):
    """Run the same controls and matrix with Calibre's private temp parent."""

    def setUp(self):
        super().setUp()
        stack = contextlib.ExitStack()
        self.addCleanup(stack.close)
        directory = stack.enter_context(tempfile.TemporaryDirectory(prefix="talebook-private-tmp-", dir="/tmp"))
        self.private_tmp = Path(directory)
        self.private_tmp.chmod(0o700)
        self.private_stat = self.private_tmp.stat()
        stack.enter_context(mock.patch.dict(os.environ, {"TMPDIR": directory}))
        # Calibre also caches this path in tempfile, regardless of the environment.
        stack.enter_context(mock.patch.object(tempfile, "tempdir", directory))

    def tearDown(self):
        current = self.private_tmp.stat()
        self.assertEqual(current.st_mode, self.private_stat.st_mode)
        self.assertEqual(current.st_uid, self.private_stat.st_uid)
        self.assertEqual(current.st_gid, self.private_stat.st_gid)
        super().tearDown()


if __name__ == "__main__":
    unittest.main()
