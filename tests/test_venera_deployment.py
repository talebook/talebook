"""Exercise actual Nginx route selection, including the public subpath gateway."""

import http.server
import json
import os
import shutil
import threading

import pytest
import requests

from scripts.venera_proxy import SPA_FALLBACK, production_proxy


class Upstream(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith("/read-online-comic?"):
            body = json.dumps(
                {"path": self.path, "cookie": self.headers.get("Cookie"), "scheme": self.headers.get("X-Scheme")}
            )
        else:
            body = SPA_FALLBACK
        self.send_response(200)
        self.send_header("Cache-Control", "private, no-store")
        self.end_headers()
        self.wfile.write(body.encode())

    def log_message(self, *args):
        pass


@pytest.mark.skipif(not shutil.which("nginx") or os.geteuid() != 0, reason="requires isolated root Nginx container")
@pytest.mark.parametrize("variant", ["talebook.conf", "server-side-render.conf", "dev.conf"])
@pytest.mark.parametrize("prefix", ["", "/team/books"])
def test_exact_reader_proxy_forwards_query_cookie_and_preserves_no_store(variant, prefix):
    upstream = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
    thread = threading.Thread(target=upstream.serve_forever)
    thread.start()
    try:
        with production_proxy(upstream.server_port, variant, prefix) as base_url, requests.Session() as session:
            session.trust_env = False
            path = "/read-online-comic?source_id=plugin%3A1&chapter_url=a%2Fb%3D&book_url=x%26y"
            response = session.get(base_url + path, headers={"Cookie": "user_id=test-only"}, timeout=5)
            assert response.status_code == 200
            assert response.json() == {"path": path, "cookie": "user_id=test-only", "scheme": "http"}
            assert response.headers["Cache-Control"] == "private, no-store"
            assert "Expires" not in response.headers
            for other in ("/read-online-comic/", "/read-online-comic-other"):
                control = session.get(base_url + other, timeout=5)
                assert control.status_code == 200
                assert SPA_FALLBACK in control.text
    finally:
        upstream.shutdown()
        upstream.server_close()
        thread.join()
