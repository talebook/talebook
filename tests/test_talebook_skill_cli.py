import base64
import http.client
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

import pytest


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
            response = (
                500,
                {"Content-Type": "application/json; charset=utf-8"},
                {"err": "test.route_missing", "msg": f"unregistered route: {self.command} {parsed.path}"},
            )
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

    def test_fake_server_rejects_unregistered_routes(self):
        with fake_server() as (_, site):
            code, output, errors = run_cli(["--site", site, "books", "show", "--id", "404"])
        assert code == CLI.EXIT_API
        assert output is None
        assert errors == {
            "err": "test.route_missing",
            "msg": "unregistered route: GET /api/book/404",
            "status": 500,
        }

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
        assert output["arguments"]["url"] == "mysql+pymysql://<redacted>@db.example.com/books"

    def test_confirmation_preview_redacts_credentials_embedded_in_set_assignment(self):
        code, output, errors = run_cli(
            [
                "--site",
                "books.example.com",
                "admin",
                "settings",
                "update",
                "--set",
                "user_database=mysql+pymysql://alice:db-secret@db.example.com/books",
            ]
        )
        assert code == CLI.EXIT_GUARD
        assert errors is None
        assert output["arguments"]["set"] == ["user_database=mysql+pymysql://<redacted>@db.example.com/books"]
        assert "db-secret" not in json.dumps(output)

    def test_admin_settings_show_redacts_secrets_before_stdout(self):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {
            (
                "GET",
                "/api/admin/settings",
            ): {
                "err": "ok",
                "settings": {
                    "site_title": "My Library",
                    "smtp_password": "mail-secret",
                    "cookie_secret": "cookie-secret",
                    "SOCIAL_AUTH_GITHUB_KEY": "oauth-key",
                    "SOCIAL_AUTH_GITHUB_SECRET": "oauth-secret",
                    "ai_api_key": "ai-secret",
                    "INVITE_CODE": "invite-secret",
                    "user_database": "mysql+pymysql://alice:db-secret@db.example.com/books",
                    "nested": {"access_token": "nested-secret", "visible": "yes"},
                },
            }
        }
        with fake_server(status=status, routes=routes) as (_, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "admin", "--password", "secret", "admin", "settings", "show"],
                environ={"TALEBOOK_NO_UPDATE_NOTIFIER": "1"},
            )
        assert code == 0
        assert errors is None
        assert output["settings"] == {
            "site_title": "My Library",
            "smtp_password": "<redacted>",
            "cookie_secret": "<redacted>",
            "SOCIAL_AUTH_GITHUB_KEY": "<redacted>",
            "SOCIAL_AUTH_GITHUB_SECRET": "<redacted>",
            "ai_api_key": "<redacted>",
            "INVITE_CODE": "<redacted>",
            "user_database": "mysql+pymysql://<redacted>@db.example.com/books",
            "nested": {"access_token": "<redacted>", "visible": "yes"},
        }

    def test_auth_preflight_business_error_stops_before_protected_endpoint(self):
        status = {"err": "not_installed", "msg": "instance is not initialized"}
        routes = {("GET", "/api/network/sources"): {"err": "ok", "items": []}}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "reader", "--password", "secret", "remote", "sources", "list"]
            )
        assert code == CLI.EXIT_API
        assert output is None
        assert errors == {"err": "not_installed", "msg": "instance is not initialized"}
        assert [record["path"] for record in server.records] == ["/api/user/info"]

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

    def test_books_edit_validates_cover_before_mutating_metadata(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        routes = {("POST", "/api/book/42/edit"): {"err": "ok"}}
        with TemporaryDirectory() as directory:
            missing_cover = Path(directory) / "missing.jpg"
            with fake_server(status=status, routes=routes) as (server, site):
                code, output, errors = run_cli(
                    [
                        "--site",
                        site,
                        "--user",
                        "reader",
                        "--password",
                        "secret",
                        "books",
                        "edit",
                        "--id",
                        "42",
                        "--set",
                        "title=新标题",
                        "--cover",
                        str(missing_cover),
                    ]
                )
        assert code == CLI.EXIT_USAGE
        assert output is None
        assert errors["err"] == "file.not_found"
        assert [record["path"] for record in server.records] == ["/api/user/info"]

    def test_books_edit_propagates_each_business_error_without_false_success(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        responses = iter(
            [
                {"err": "metadata.rejected", "msg": "metadata rejected"},
                {"err": "ok"},
            ]
        )

        def edit_response(_record):
            return next(responses)

        routes = {("POST", "/api/book/42/edit"): edit_response}
        with TemporaryDirectory() as directory:
            cover = Path(directory) / "cover.jpg"
            cover.write_bytes(b"jpeg")
            with fake_server(status=status, routes=routes) as (server, site):
                code, output, errors = run_cli(
                    [
                        "--site",
                        site,
                        "--user",
                        "reader",
                        "--password",
                        "secret",
                        "books",
                        "edit",
                        "--id",
                        "42",
                        "--set",
                        "title=新标题",
                        "--cover",
                        str(cover),
                    ]
                )
        assert code == CLI.EXIT_API
        assert errors is None
        assert output == {"err": "metadata.rejected", "msg": "metadata rejected"}
        assert [record["path"] for record in server.records] == ["/api/user/info", "/api/book/42/edit"]

    def test_books_edit_reports_partial_success_when_cover_update_fails(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        responses = iter(
            [
                {"err": "ok"},
                {"err": "cover.rejected", "msg": "cover rejected", "retry_after": 30},
            ]
        )
        routes = {("POST", "/api/book/42/edit"): lambda _record: next(responses)}
        with TemporaryDirectory() as directory:
            cover = Path(directory) / "cover.jpg"
            cover.write_bytes(b"jpeg")
            with fake_server(status=status, routes=routes) as (server, site):
                code, output, errors = run_cli(
                    [
                        "--site",
                        site,
                        "--user",
                        "reader",
                        "--password",
                        "secret",
                        "books",
                        "edit",
                        "--id",
                        "42",
                        "--set",
                        "title=新标题",
                        "--cover",
                        str(cover),
                    ]
                )
        assert code == CLI.EXIT_API
        assert errors is None
        assert output == {
            "err": "cover.rejected",
            "msg": "cover rejected",
            "partial": True,
            "completed": ["metadata"],
            "failed": "cover",
            "retry_after": 30,
        }
        assert [record["path"] for record in server.records] == [
            "/api/user/info",
            "/api/book/42/edit",
            "/api/book/42/edit",
        ]

    def test_books_edit_reads_cover_before_mutating_metadata(self):
        status = guest_status(user={"is_login": True, "is_admin": False})
        with TemporaryDirectory() as directory:
            cover = Path(directory) / "cover.jpg"
            cover.write_bytes(b"jpeg")
            calls = 0

            def edit_response(_record):
                nonlocal calls
                calls += 1
                if calls == 1:
                    cover.unlink()
                return {"err": "ok"}

            routes = {("POST", "/api/book/42/edit"): edit_response}
            with fake_server(status=status, routes=routes) as (server, site):
                code, output, errors = run_cli(
                    [
                        "--site",
                        site,
                        "--user",
                        "reader",
                        "--password",
                        "secret",
                        "books",
                        "edit",
                        "--id",
                        "42",
                        "--set",
                        "title=新标题",
                        "--cover",
                        str(cover),
                    ]
                )
        assert code == 0
        assert errors is None
        assert output["err"] == "ok"
        assert [record["path"] for record in server.records] == [
            "/api/user/info",
            "/api/book/42/edit",
            "/api/book/42/edit",
        ]

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

    def test_download_streams_binary_response_without_unbounded_read(self):
        payload = b"audio" * 500_000

        class StreamingResponse:
            headers = {"Content-Type": "audio/mpeg"}

            def __init__(self):
                self.offset = 0
                self.read_sizes = []

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, size=-1):
                self.read_sizes.append(size)
                if size < 0:
                    raise AssertionError("binary downloads must not use an unbounded read")
                chunk = payload[self.offset : self.offset + size]
                self.offset += len(chunk)
                return chunk

            def geturl(self):
                return "https://books.example.com/media/audio/9/chapter/1.mp3"

        response = StreamingResponse()
        client = CLI.TalebookClient(CLI.Config("https://books.example.com", None, None, 30))
        client.opener = SimpleNamespace(open=lambda _request, timeout: response)
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "chapter.mp3"
            result = client.download("/media/audio/9/chapter/1.mp3", output_path)
            assert output_path.read_bytes() == payload
        assert result["err"] == "ok"
        assert result["bytes"] == len(payload)
        assert response.read_sizes
        assert all(size > 0 for size in response.read_sizes)

    def test_download_rejects_identity_response_shorter_than_content_length(self):
        payload = b"truncated"

        class TruncatedResponse:
            headers = {"Content-Type": "audio/mpeg", "Content-Length": str(len(payload) + 100)}

            def __init__(self):
                self.sent = False

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, _size=-1):
                if self.sent:
                    return b""
                self.sent = True
                return payload

            def geturl(self):
                return "https://books.example.com/media/audio/9/chapter/1.mp3"

        client = CLI.TalebookClient(CLI.Config("https://books.example.com", None, None, 30))
        client.opener = SimpleNamespace(open=lambda _request, timeout: TruncatedResponse())
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "chapter.mp3"
            with pytest.raises(CLI.CliFailure) as raised:
                client.download("/media/audio/9/chapter/1.mp3", output_path)
            assert not output_path.exists()
            assert list(Path(directory).iterdir()) == []
        assert raised.value.code == "download.incomplete"
        assert raised.value.exit_code == CLI.EXIT_TRANSPORT
        assert raised.value.details == {"expected_bytes": len(payload) + 100, "received_bytes": len(payload)}

    def test_chunked_incomplete_read_uses_structured_transport_error(self, monkeypatch):
        class IncompleteChunkedResponse:
            headers = {"Content-Type": "audio/mpeg", "Transfer-Encoding": "chunked"}

            def __init__(self):
                self.reads = 0

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, _size=-1):
                self.reads += 1
                if self.reads == 1:
                    return b"complete-chunk"
                raise http.client.IncompleteRead(b"partial", 100)

            def geturl(self):
                return "https://books.example.com/media/audio/9/chapter/1.mp3"

        client = CLI.TalebookClient(CLI.Config("https://books.example.com", None, None, 30))
        client._status = guest_status()
        client.opener = SimpleNamespace(open=lambda _request, timeout: IncompleteChunkedResponse())
        monkeypatch.setattr(CLI, "TalebookClient", lambda _config: client)
        with TemporaryDirectory() as directory:
            output_path = Path(directory) / "chapter.mp3"
            code, output, errors = run_cli(
                [
                    "--site",
                    "https://books.example.com",
                    "books",
                    "download",
                    "--id",
                    "7",
                    "--format",
                    "mp3",
                    "--output",
                    str(output_path),
                ]
            )
            assert not output_path.exists()
            assert list(Path(directory).iterdir()) == []
        assert code == CLI.EXIT_TRANSPORT
        assert output is None
        assert errors == {
            "err": "download.incomplete",
            "msg": "Talebook 下载连接提前结束",
            "received_bytes": len(b"complete-chunk") + len(b"partial"),
        }

    def test_audios_list_encodes_optional_keyword(self):
        routes = {("GET", "/api/audios"): {"err": "ok", "total": 0, "books": []}}
        with fake_server(routes=routes) as (server, site):
            code, output, errors = run_cli(["--site", site, "audios", "list", "--keyword", "三体"])
        assert code == 0
        assert errors is None
        assert output == {"err": "ok", "total": 0, "books": []}
        assert server.records[0]["query"] == {"keyword": ["三体"]}

    def test_audios_show_resolves_the_published_edition_and_sorts_chapters(self):
        routes = {
            (
                "GET",
                "/api/book/42/audios",
            ): {
                "err": "ok",
                "book": {"id": 42, "title": "三体", "author": "刘慈欣"},
                "editions": [
                    {"id": 11, "status": "candidate"},
                    {"id": 9, "status": "published"},
                ],
                "generation": {"can_generate": True},
            },
            (
                "GET",
                "/api/audio/9",
            ): {
                "err": "ok",
                "manifest": {
                    "id": 9,
                    "book_id": 42,
                    "status": "published",
                    "chapters": [
                        {"number": 2, "title": "宇宙闪烁", "size_bytes": 4},
                        {"number": 1, "title": "科学边界", "size_bytes": 3},
                    ],
                },
                "progress": {"position_ms": 800},
            },
        }
        with fake_server(routes=routes) as (server, site):
            code, output, errors = run_cli(["--site", site, "audios", "show", "--book-id", "42"])
        assert code == 0
        assert errors is None
        assert output["book"] == {"id": 42, "title": "三体", "author": "刘慈欣"}
        assert [chapter["number"] for chapter in output["audio"]["chapters"]] == [1, 2]
        assert "generation" not in output
        assert "progress" not in output
        assert [record["path"] for record in server.records] == ["/api/book/42/audios", "/api/audio/9"]

    def test_audios_download_writes_ordered_sanitized_chapter_files(self):
        routes = {
            (
                "GET",
                "/api/book/42/audios",
            ): {
                "err": "ok",
                "book": {"id": 42, "title": "三体"},
                "editions": [{"id": 9, "status": "published"}],
            },
            (
                "GET",
                "/api/audio/9",
            ): {
                "err": "ok",
                "manifest": {
                    "id": 9,
                    "book_id": 42,
                    "chapters": [
                        {"number": 2, "title": "  "},
                        {"number": 1, "title": "开篇/序: 星?"},
                    ],
                },
            },
            ("GET", "/media/audio/9/chapter/1.mp3"): (200, {"Content-Type": "audio/mpeg"}, b"one"),
            ("GET", "/media/audio/9/chapter/2.mp3"): (200, {"Content-Type": "audio/mpeg"}, b"two-two"),
        }
        with TemporaryDirectory() as directory:
            output_dir = Path(directory) / "三体有声书"
            with fake_server(routes=routes) as (server, site):
                code, output, errors = run_cli(
                    ["--site", site, "audios", "download", "--book-id", "42", "--output", str(output_dir)]
                )
            files = sorted(path.name for path in output_dir.iterdir())
            assert files == ["001-开篇_序_ 星_.mp3", "002-chapter-002.mp3"]
            assert (output_dir / files[0]).read_bytes() == b"one"
            assert (output_dir / files[1]).read_bytes() == b"two-two"
            assert output["path"] == str(output_dir.resolve())
            assert [Path(item["path"]).name for item in output["chapters"]] == files
        assert code == 0
        assert errors is None
        assert output["edition_id"] == 9
        assert output["chapter_count"] == 2
        assert output["bytes"] == 10
        assert [record["path"] for record in server.records] == [
            "/api/book/42/audios",
            "/api/audio/9",
            "/media/audio/9/chapter/1.mp3",
            "/media/audio/9/chapter/2.mp3",
        ]

    def test_audios_download_rejects_an_existing_output_without_connecting(self):
        with TemporaryDirectory() as directory:
            output_dir = Path(directory) / "existing"
            output_dir.mkdir()
            with fake_server() as (server, site):
                code, output, errors = run_cli(
                    ["--site", site, "audios", "download", "--book-id", "42", "--output", str(output_dir)]
                )
        assert code == CLI.EXIT_USAGE
        assert output is None
        assert errors["err"] == "file.exists"
        assert server.records == []

    def test_audios_show_preserves_server_permission_failure(self):
        routes = {("GET", "/api/book/42/audios"): {"err": "not_found", "msg": "书籍不存在或不可见"}}
        with fake_server(routes=routes) as (server, site):
            code, output, errors = run_cli(["--site", site, "audios", "show", "--book-id", "42"])
        assert code == CLI.EXIT_API
        assert errors is None
        assert output == {"err": "not_found", "msg": "书籍不存在或不可见"}
        assert [record["path"] for record in server.records] == ["/api/book/42/audios"]

    def test_audios_download_cleans_temporary_directory_after_chapter_failure(self):
        routes = {
            (
                "GET",
                "/api/book/42/audios",
            ): {
                "err": "ok",
                "book": {"id": 42, "title": "三体"},
                "editions": [{"id": 9, "status": "published"}],
            },
            (
                "GET",
                "/api/audio/9",
            ): {
                "err": "ok",
                "manifest": {
                    "id": 9,
                    "book_id": 42,
                    "chapters": [
                        {"number": 1, "title": "第一章"},
                        {"number": 2, "title": "第二章"},
                    ],
                },
            },
            ("GET", "/media/audio/9/chapter/1.mp3"): (200, {"Content-Type": "audio/mpeg"}, b"one"),
            (
                "GET",
                "/media/audio/9/chapter/2.mp3",
            ): (503, {"Content-Type": "application/json"}, {"err": "audio.unavailable", "msg": "暂不可用"}),
        }
        with TemporaryDirectory() as directory:
            output_dir = Path(directory) / "三体有声书"
            with fake_server(routes=routes) as (_, site):
                code, output, errors = run_cli(
                    ["--site", site, "audios", "download", "--book-id", "42", "--output", str(output_dir)]
                )
            assert not output_dir.exists()
            assert list(Path(directory).iterdir()) == []
        assert code == CLI.EXIT_API
        assert output is None
        assert errors["err"] == "audio.unavailable"

    def test_booksources_show_paginates_until_the_requested_id(self):
        status = guest_status(user={"is_login": True, "is_admin": True})

        def list_sources(record):
            page = int(record["query"]["page"][0])
            if page == 1:
                return {"err": "ok", "items": [{"id": item} for item in range(1, 201)], "count": 201}
            return {"err": "ok", "items": [{"id": 201, "name": "last source"}], "count": 201}

        routes = {("GET", "/api/admin/booksource/list"): list_sources}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                [
                    "--site",
                    site,
                    "--user",
                    "admin",
                    "--password",
                    "secret",
                    "admin",
                    "booksources",
                    "show",
                    "--id",
                    "201",
                ],
                environ={"TALEBOOK_NO_UPDATE_NOTIFIER": "1"},
            )
        assert code == 0
        assert errors is None
        assert output == {"err": "ok", "item": {"id": 201, "name": "last source"}}
        assert [record["query"]["page"] for record in server.records if record["path"].endswith("/list")] == [
            ["1"],
            ["2"],
        ]

    @pytest.mark.parametrize(
        ("argv", "method", "path", "expected_query", "expected_json"),
        [
            (
                ["books", "favorite", "set", "--id", "7"],
                "POST",
                "/api/book/7/favorite",
                {},
                {"favorite": True},
            ),
            (
                ["books", "reading", "state", "--id", "7", "--value", "finished"],
                "POST",
                "/api/book/7/readstate",
                {},
                {"read_state": 2},
            ),
            (
                ["remote", "search", "status", "--task-id", "task-1"],
                "GET",
                "/api/network/search/status",
                {"task_id": ["task-1"]},
                None,
            ),
            (
                ["admin", "users", "list"],
                "GET",
                "/api/admin/users",
                {"page": ["1"], "num": ["20"], "sort": ["access_time"], "desc": ["true"]},
                None,
            ),
            (
                ["admin", "imports", "scan", "status"],
                "GET",
                "/api/admin/scan/status",
                {},
                None,
            ),
            (
                ["admin", "themes", "active"],
                "GET",
                "/api/themes/active",
                {},
                None,
            ),
        ],
    )
    def test_command_contract_matrix(self, argv, method, path, expected_query, expected_json):
        status = guest_status(user={"is_login": True, "is_admin": True})
        routes = {(method, path): {"err": "ok"}}
        with fake_server(status=status, routes=routes) as (server, site):
            code, output, errors = run_cli(
                ["--site", site, "--user", "admin", "--password", "secret", *argv],
                environ={"TALEBOOK_NO_UPDATE_NOTIFIER": "1"},
            )
        assert code == 0
        assert errors is None
        assert output == {"err": "ok"}
        record = next(record for record in server.records if record["path"] == path)
        assert record["method"] == method
        assert record["query"] == expected_query
        body = json.loads(record["body"]) if record["body"] else None
        assert body == expected_json

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
        audio_args = parser.parse_args(
            ["--site", "books.example.com", "audios", "download", "--book-id", "42", "--output", "./audio"]
        )
        assert audio_args.command_path == "audios download"
        root_help = parser.format_help()
        assert "audios" in root_help
        assert "raw" not in root_help
        assert "deploy" not in root_help
