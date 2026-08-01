import base64
import importlib.util
import io
import json
import sys
import threading
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory
from types import SimpleNamespace
from urllib import parse


ROOT = Path(__file__).resolve().parents[1]
CLI_PATH = ROOT / "skills" / "talebook" / "scripts" / "talebook-cli.py"
SPEC = importlib.util.spec_from_file_location("talebook_skill_cli", CLI_PATH)
CLI = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = CLI
SPEC.loader.exec_module(CLI)


def guest_status(**overrides):
    result = {
        "err": "ok",
        "sys": {
            "title": "Test TaleBook",
            "version": "test",
            "allow": {"download": True, "read": True, "push": False},
            "upload": {"chunk_enabled": True, "chunk_threshold": 1024, "chunk_size": 512},
        },
        "user": {"is_login": False, "is_admin": False},
    }
    result["sys"].update(overrides.pop("sys", {}))
    result["user"].update(overrides.pop("user", {}))
    result.update(overrides)
    return result


class RecordingHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.handle_request()

    def do_POST(self):
        self.handle_request()

    def do_PUT(self):
        self.handle_request()

    def do_DELETE(self):
        self.handle_request()

    def handle_request(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        parsed = parse.urlsplit(self.path)
        record = {
            "method": self.command,
            "path": parsed.path,
            "query": parse.parse_qs(parsed.query),
            "headers": dict(self.headers),
            "body": body,
        }
        self.server.records.append(record)
        responder = self.server.routes.get((self.command, parsed.path))
        if responder is None and parsed.path == "/api/user/info":
            response = self.server.status_response
        elif callable(responder):
            response = responder(record)
        elif responder is not None:
            response = responder
        else:
            response = {"err": "ok"}
        status = 200
        headers = {"Content-Type": "application/json; charset=utf-8"}
        if isinstance(response, tuple):
            status, headers, response = response
        content = response if isinstance(response, bytes) else json.dumps(response, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        for key, value in headers.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        return


@contextmanager
def fake_server(*, status=None, routes=None):
    server = ThreadingHTTPServer(("127.0.0.1", 0), RecordingHandler)
    server.records = []
    server.status_response = status or guest_status()
    server.routes = routes or {}
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server, f"http://127.0.0.1:{server.server_port}"
    finally:
        server.shutdown()
        thread.join(timeout=5)
        server.server_close()


def run_cli(argv, environ=None):
    stdout = io.StringIO()
    stderr = io.StringIO()
    code = CLI.main(argv, environ=environ or {}, stdout=stdout, stderr=stderr)
    output = json.loads(stdout.getvalue()) if stdout.getvalue() else None
    errors = json.loads(stderr.getvalue()) if stderr.getvalue() else None
    return code, output, errors


class TestTalebookSkillCli:
    def test_normalize_site_defaults_to_https(self):
        assert CLI.normalize_site("books.example.com/") == "https://books.example.com"
        assert CLI.normalize_site("books.example.com:8443") == "https://books.example.com:8443"
        assert CLI.normalize_site("http://127.0.0.1:8080/") == "http://127.0.0.1:8080"

    def test_rejects_unsupported_scheme_and_partial_credentials(self):
        try:
            CLI.normalize_site("ftp://books.example.com")
        except CLI.CliFailure as exc:
            assert exc.code == "config.site.scheme"
        else:
            raise AssertionError("unsupported scheme was accepted")

        args = SimpleNamespace(site="books.example.com", user="alice", password=None, timeout=30)
        try:
            CLI.Config.from_sources(args, {})
        except CLI.CliFailure as exc:
            assert exc.code == "config.auth.pair"
        else:
            raise AssertionError("partial credentials were accepted")

        try:
            CLI.normalize_site("books.example.com:not-a-port")
        except CLI.CliFailure as exc:
            assert exc.code == "config.site.invalid"
        else:
            raise AssertionError("invalid port was accepted")

    def test_cli_options_override_environment(self):
        args = SimpleNamespace(site="cli.example.com", user=None, password=None, timeout=15)
        config = CLI.Config.from_sources(
            args,
            {"TALEBOOK_URL": "env.example.com", "TALEBOOK_USERNAME": "env-user", "TALEBOOK_PASSWORD": "env-pass"},
        )
        assert config.site == "https://cli.example.com"
        assert config.user == "env-user"
        assert config.timeout == 15

    def test_me_update_requires_password_pair(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        with fake_server(status=status) as (server, site):
            code, output, errors = run_cli(
                [
                    "--site",
                    site,
                    "--user",
                    "reader",
                    "--password",
                    "secret",
                    "me",
                    "update",
                    "--new-password",
                    "new-secret",
                ]
            )
        assert code == CLI.EXIT_USAGE
        assert output is None
        assert errors["err"] == "params.password.pair"
        assert [record["path"] for record in server.records] == ["/api/user/info"]

    def test_me_status_uses_guest_when_credentials_are_absent(self):
        with fake_server() as (server, site):
            code, output, errors = run_cli(["--site", site, "me", "status"])
        assert code == 0
        assert errors is None
        assert output["user"]["is_login"] is False
        assert server.records[0]["path"] == "/api/user/info"
        assert "Authorization" not in server.records[0]["headers"]

    def test_basic_auth_header_is_sent_when_credentials_are_present(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        with fake_server(status=status) as (server, site):
            code, output, _ = run_cli(["--site", site, "--user", "alice", "--password", "secret", "me", "status"])
        assert code == 0
        token = base64.b64encode(b"alice:secret").decode("ascii")
        assert server.records[0]["headers"]["Authorization"] == "Basic " + token
        assert "_notice" not in output
        assert [record["path"] for record in server.records] == ["/api/user/info"]

    def test_search_encodes_query(self):
        routes = {("GET", "/api/search"): {"err": "ok", "books": []}}
        with fake_server(routes=routes) as (server, site):
            code, output, _ = run_cli(["--site", site, "books", "search", "--name", "三体", "--start", "30"])
        assert code == 0
        assert output["err"] == "ok"
        assert server.records[0]["query"] == {"name": ["三体"], "start": ["30"]}

    def test_destructive_command_previews_without_connecting_and_redacts_password(self):
        code, output, errors = run_cli(
            [
                "--site",
                "books.example.com",
                "--user",
                "alice",
                "--password",
                "top-secret",
                "books",
                "delete",
                "--id",
                "42",
            ]
        )
        assert code == CLI.EXIT_GUARD
        assert errors is None
        assert output["err"] == "confirmation.required"
        assert output["command"] == "books delete"
        assert "top-secret" not in json.dumps(output)

    def test_confirmation_preview_redacts_credentials_embedded_in_url(self):
        code, output, errors = run_cli(
            [
                "--site",
                "books.example.com",
                "admin",
                "settings",
                "migrate-db",
                "--url",
                "mysql+pymysql://alice:db-secret@db.example.com/books",
            ]
        )
        assert code == CLI.EXIT_GUARD
        assert errors is None
        rendered = json.dumps(output)
        assert "db-secret" not in rendered
        assert "db.example.com" in rendered

    def test_admin_command_preflights_role(self):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {("GET", "/api/admin/users"): {"err": "ok", "users": {"items": [], "total": 0}}}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, _ = run_cli(["--site", site, "--user", "admin", "--password", "secret", "admin", "users", "list"])
        assert code == 0
        assert output["users"]["total"] == 0
        assert [record["path"] for record in server.records] == [
            "/api/user/info",
            "/api/admin/users",
            "/api/admin/update",
        ]

    def test_admin_receives_update_notice_after_successful_command(self):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {
            ("GET", "/api/search"): {"err": "ok", "books": []},
            (
                "GET",
                "/api/admin/update",
            ): {
                "err": "ok",
                "status": {
                    "has_update": True,
                    "current_version": "v26.07.13",
                    "latest_version": "v26.08.1",
                    "latest_release_url": "https://example.com/releases/v26.08.1",
                },
            },
        }
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "admin", "--password", "secret", "books", "search", "--name", "三体"]
            )
        assert code == 0
        assert errors is None
        assert output["books"] == []
        assert output["_notice"]["update"] == {
            "message": "Talebook 有新版本 v26.08.1（当前 v26.07.13）",
            "current_version": "v26.07.13",
            "latest_version": "v26.08.1",
            "release_url": "https://example.com/releases/v26.08.1",
        }
        assert [record["path"] for record in server.records] == [
            "/api/search",
            "/api/user/info",
            "/api/admin/update",
        ]

    def test_update_notice_can_be_disabled_for_stable_json(self):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {("GET", "/api/search"): {"err": "ok", "books": []}}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "admin", "--password", "secret", "books", "search", "--name", "三体"],
                environ={"TALEBOOK_NO_UPDATE_NOTIFIER": "1"},
            )
        assert code == 0
        assert errors is None
        assert "_notice" not in output
        assert [record["path"] for record in server.records] == ["/api/search"]

    def test_update_check_failure_does_not_change_command_result(self):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {
            ("GET", "/api/search"): {"err": "ok", "books": []},
            ("GET", "/api/admin/update"): (
                503,
                {"Content-Type": "application/json; charset=utf-8"},
                {"err": "update.unavailable", "msg": "temporary failure"},
            ),
        }
        with fake_server(status=status, routes=routes) as (_, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "admin", "--password", "secret", "books", "search", "--name", "三体"]
            )
        assert code == 0
        assert errors is None
        assert output == {"err": "ok", "books": []}

    def test_guest_does_not_check_for_updates(self):
        routes = {("GET", "/api/search"): {"err": "ok", "books": []}}
        with fake_server(routes=routes) as (server, site):
            code, output, errors = run_cli(["--site", site, "books", "search", "--name", "三体"])
        assert code == 0
        assert errors is None
        assert "_notice" not in output
        assert [record["path"] for record in server.records] == ["/api/search"]

    def test_admin_command_stops_for_non_admin(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        with fake_server(status=status) as (server, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "reader", "--password", "secret", "admin", "users", "list"]
            )
        assert code == CLI.EXIT_GUARD
        assert output is None
        assert errors["err"] == "permission.not_admin"
        assert [record["path"] for record in server.records] == ["/api/user/info"]

    def test_remote_commands_require_login_before_calling_remote_endpoint(self):
        with fake_server() as (server, site):
            code, output, errors = run_cli(["--site", site, "remote", "sources", "list"])
        assert code == CLI.EXIT_GUARD
        assert output is None
        assert errors["err"] == "auth.required"
        assert [record["path"] for record in server.records] == ["/api/user/info"]

    def test_remote_library_uses_online_library_endpoint_and_status_filter(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        routes = {("GET", "/api/library/online"): {"err": "ok", "books": []}}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                [
                    "--site",
                    site,
                    "--user",
                    "reader",
                    "--password",
                    "secret",
                    "remote",
                    "library",
                    "list",
                    "--status",
                    "serial",
                    "--start",
                    "20",
                ]
            )
        assert code == 0
        assert errors is None
        assert output["err"] == "ok"
        assert server.records[-1]["path"] == "/api/library/online"
        assert server.records[-1]["query"] == {"status": ["serial"], "start": ["20"]}

    def test_small_upload_uses_multipart_endpoint(self):
        routes = {("POST", "/api/book/upload"): {"err": "ok", "book_id": 88}}
        with TemporaryDirectory() as directory:
            book = Path(directory) / "三体.epub"
            book.write_bytes(b"PK\x03\x04ebook")
            with fake_server(routes=routes) as (server, site):
                code, output, _ = run_cli(["--site", site, "books", "upload", str(book)])
        assert code == 0
        assert output["book_id"] == 88
        upload = server.records[1]
        assert upload["path"] == "/api/book/upload"
        assert "multipart/form-data" in upload["headers"]["Content-Type"]
        assert b'name="ebook"' in upload["body"]

    def test_large_upload_uses_server_chunk_settings(self):
        status = guest_status(sys={"upload": {"chunk_enabled": True, "chunk_threshold": 2, "chunk_size": 2}})
        routes = {
            ("POST", "/api/book/upload/chunk"): {"err": "ok"},
            ("POST", "/api/book/upload/complete"): {"err": "ok", "book_id": 99},
        }
        with TemporaryDirectory() as directory:
            book = Path(directory) / "chunked.txt"
            book.write_bytes(b"abcde")
            with fake_server(status=status, routes=routes) as (server, site):
                code, output, _ = run_cli(["--site", site, "books", "upload", str(book)])
        assert code == 0
        assert output["book_id"] == 99
        paths = [record["path"] for record in server.records]
        assert paths.count("/api/book/upload/chunk") == 3
        assert paths[-1] == "/api/book/upload/complete"

    def test_download_writes_binary_file(self):
        routes = {("GET", "/api/book/7.epub"): (200, {"Content-Type": "application/octet-stream"}, b"ebook-content")}
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "book.epub"
            with fake_server(routes=routes) as (_, site):
                code, output, errors = run_cli(
                    ["--site", site, "books", "download", "--id", "7", "--format", "epub", "--output", str(output_path)]
                )
            assert output_path.read_bytes() == b"ebook-content"
        assert code == 0
        assert errors is None
        assert output["bytes"] == len(b"ebook-content")

    def test_api_error_uses_nonzero_exit_code(self):
        routes = {("GET", "/api/search"): {"err": "params.invalid", "msg": "bad search"}}
        with fake_server(routes=routes) as (_, site):
            code, output, errors = run_cli(["--site", site, "books", "search", "--name", "x"])
        assert code == CLI.EXIT_API
        assert errors is None
        assert output == {"err": "params.invalid", "msg": "bad search"}

    def test_command_tree_has_admin_nesting_and_no_raw_or_deploy(self):
        parser = CLI.build_parser()
        args = parser.parse_args(["--site", "books.example.com", "admin", "opds", "sources", "list"])
        assert args.command_path == "admin opds sources list"
        root_help = parser.format_help()
        assert "raw" not in root_help
        assert "deploy" not in root_help
