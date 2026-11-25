"""Exercise the real bounded HTTP transport without Calibre or external services."""

import json
import socket
from unittest import mock

import pytest
from tornado import web
from tornado.testing import AsyncHTTPTestCase, gen_test

from webserver.kosync import KOSyncError, PinnedResolver, proxy_request, server_url, validate_payload


def payload(server="https://sync.example", method="GET", endpoint="/users/auth", **kwargs):
    return {"serverUrl": server, "method": method, "endpoint": endpoint, **kwargs}


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "https://user:secret@sync.example",
        "https://sync.example?secret=x",
        "https://sync.example/#fragment",
        "https://sync.example/../admin",
        "https://sync.example/%2e%2e",
        "https://sync.example\\@127.0.0.1",
        "http://sync.example:0",
        "https://sync.example:invalid",
        "https://sync.example/\n",
        None,
    ],
)
def test_invalid_server_urls(url):
    with pytest.raises(KOSyncError):
        server_url(url)


def test_server_prefix_normalization():
    assert server_url("https://SYNC.EXAMPLE:443/kosync/") == "https://sync.example/kosync"
    assert server_url("http://[::1]:8080/sync/") == "http://[::1]:8080/sync"


@pytest.mark.parametrize(
    "method,endpoint",
    [
        ("DELETE", "/users/auth"),
        ("POST", "/users/auth"),
        ("GET", "//evil.example"),
        ("GET", "/users/auth?x=1"),
        ("PUT", "/syncs/progress/extra"),
        ("GET", "/syncs/progress/../../admin"),
        ([], []),
    ],
)
def test_only_kosync_operations(method, endpoint):
    with pytest.raises(KOSyncError):
        validate_payload(payload(method=method, endpoint=endpoint))


@pytest.mark.parametrize(
    "header",
    [
        "Cookie",
        "Host",
        "Connection",
        "Content-Length",
        "Proxy-Authorization",
        "X-Forwarded-For",
        "Sec-Fetch-Site",
        "Origin",
        "Content\nType",
    ],
)
def test_transport_headers_are_rejected(header):
    with pytest.raises(KOSyncError):
        validate_payload(payload(headers={header: "sensitive"}))


@pytest.mark.parametrize("value", ["secret\r\nHost: evil", None, "x" * 4097])
def test_header_values_are_validated(value):
    with pytest.raises(KOSyncError):
        validate_payload(payload(headers={"X-Custom-Token": value}))


class Upstream(web.RequestHandler):
    def prepare(self):
        self.application.seen.append(self.request)

    def get(self, endpoint):
        if self.application.mode == "redirect":
            self.redirect("http://127.0.0.1:1/private", status=307)
        elif self.application.mode in {"html", "empty"}:
            self.set_status(self.application.status)
            self.finish("<html>not a sync service</html>" if self.application.mode == "html" else "")
        elif self.application.mode == "large":
            self.finish({"data": "x" * 70000})
        else:
            self.set_status(self.application.status)
            self.set_cookie("upstream", "must-not-be-forwarded")
            self.finish({"authorized": "OK", "endpoint": endpoint})

    def post(self, endpoint):
        self.set_status(self.application.status)
        self.finish(json.loads(self.request.body))

    put = post


class TestKOSyncTransport(AsyncHTTPTestCase):
    def get_app(self):
        app = web.Application([(r"/(.*)", Upstream)])
        app.mode, app.status, app.seen = "normal", 200, []
        return app

    async def call(self, method="GET", endpoint="/users/auth", **kwargs):
        base = self.get_url("/prefix").rstrip("/")
        return await proxy_request(payload(base, method, endpoint, **kwargs))

    @gen_test
    async def test_authentication_forwards_only_explicit_credentials(self):
        result = await self.call(headers={"X-Auth-User": "alice", "X-Auth-Key": "hash", "CF-Access-Client-Id": "id"})
        assert result == {"err": "ok", "status": 200, "data": {"authorized": "OK", "endpoint": "prefix/users/auth"}}
        request = self._app.seen[0]
        assert request.headers["X-Auth-User"] == "alice"
        assert request.headers["CF-Access-Client-Id"] == "id"
        assert request.headers["Accept"] == "application/vnd.koreader.v1+json"
        assert "Cookie" not in request.headers

    @gen_test
    async def test_preserves_auth_errors_registration_and_progress(self):
        for status in [400, 401, 402, 403, 404, 429, 500]:
            self._app.status = status
            assert (await self.call())["status"] == status
        self._app.status = 200
        registration = {"username": "alice", "password": "hash"}
        assert (await self.call("POST", "/users/create", body=registration))["data"] == registration
        progress = {"document": "a" * 32, "progress": "/body/DocFragment[1]", "percentage": 0.25}
        assert (await self.call("PUT", "/syncs/progress", body=progress))["data"] == progress
        await self.call(endpoint="/syncs/progress/" + "a" * 32, headers={"Authorization": "Basic YTpi"})
        assert self._app.seen[-1].headers["Authorization"] == "Basic YTpi"

    @gen_test
    async def test_non_json_auth_errors_preserve_retry_status_without_forwarding_html(self):
        for mode in ["html", "empty"]:
            self._app.mode = mode
            for status in [400, 401]:
                self._app.status = status
                result = await self.call()
                assert result == {
                    "err": "ok", "status": status,
                    "data": {"message": "KOSync authentication failed"},
                }
        self._app.mode, self._app.status = "html", 500
        with pytest.raises(KOSyncError, match="invalid JSON"):
            await self.call()

    @gen_test
    async def test_private_server_works_without_admin_configuration(self):
        base = self.get_url("/prefix").rstrip("/")
        result = await proxy_request(payload(base))
        assert result["status"] == 200
        assert result["data"]["authorized"] == "OK"

    @gen_test
    async def test_redirect_is_not_followed(self):
        self._app.mode = "redirect"
        with pytest.raises(KOSyncError, match="redirect"):
            await self.call()
        assert len(self._app.seen) == 1

    @gen_test
    async def test_invalid_and_oversized_responses(self):
        self._app.mode = "html"
        with pytest.raises(KOSyncError, match="invalid JSON"):
            await self.call()
        self._app.mode = "large"
        with pytest.raises(KOSyncError):
            await self.call()

    @gen_test
    async def test_mixed_public_private_dns_can_connect_to_private_service(self):
        port = self.get_http_port()
        addresses = [(socket.AF_INET, ("127.0.0.1", port)), (socket.AF_INET, ("1.1.1.1", port))]
        with mock.patch("webserver.kosync.DefaultLoopResolver.resolve", new=mock.AsyncMock(return_value=addresses)):
            result = await proxy_request(payload(f"http://sync.example:{port}/prefix"))
        assert result["status"] == 200
        assert result["data"]["authorized"] == "OK"
        assert len(self._app.seen) == 1

    @gen_test
    async def test_empty_dns_response_is_a_resolution_error(self):
        with mock.patch("webserver.kosync.DefaultLoopResolver.resolve", new=mock.AsyncMock(return_value=[])):
            with pytest.raises(KOSyncError, match="could not be resolved"):
                await proxy_request(payload())

    @gen_test
    async def test_pinned_resolver_never_reresolves_or_changes_target(self):
        addresses = [(socket.AF_INET, ("1.1.1.1", 443))]
        pinned = PinnedResolver(hostname="sync.example", port=443, addresses=addresses)
        assert await pinned.resolve("sync.example", 443) == addresses
        with pytest.raises(KOSyncError):
            await pinned.resolve("other.example", 443)
        with pytest.raises(KOSyncError):
            await pinned.resolve("sync.example", 80)

    @gen_test
    async def test_dns_failure_does_not_expose_credentials(self):
        with mock.patch("webserver.kosync.DefaultLoopResolver.resolve", new=mock.AsyncMock(side_effect=OSError("secret"))):
            with pytest.raises(KOSyncError, match="could not be resolved") as exc:
                await proxy_request(payload(headers={"X-Auth-Key": "secret"}))
        assert "secret" not in str(exc.value)


@pytest.mark.parametrize(
    "extra",
    [
        {"Origin": "https://evil.example"},
        {"Sec-Fetch-Site": "cross-site"},
        {"Content-Type": "text/plain"},
        {"X-Talebook-KOSync": ""},
        {"Origin": "http://[invalid"},
    ],
)
def test_cross_origin_and_simple_requests_are_blocked(extra):
    from tornado.httputil import HTTPHeaders, HTTPServerRequest
    from webserver.kosync import KOSyncOriginError, parse_proxy_request

    request = HTTPServerRequest(
        method="POST",
        uri="/api/kosync",
        host="books.example",
        headers=HTTPHeaders(
            {
                "Content-Type": "application/json",
                "X-Talebook-KOSync": "1",
                **extra,
            }
        ),
        body=json.dumps(payload()).encode(),
    )
    with pytest.raises(KOSyncOriginError):
        parse_proxy_request(request)


def test_same_origin_and_bounded_json_request():
    from tornado.httputil import HTTPHeaders, HTTPServerRequest
    from webserver.kosync import parse_proxy_request

    request = HTTPServerRequest(
        method="POST",
        uri="/api/kosync",
        host="books.example",
        headers=HTTPHeaders(
            {
                "Origin": "https://books.example",
                "Content-Type": "application/json; charset=utf-8",
                "X-Talebook-KOSync": "1",
            }
        ),
        body=json.dumps(payload()).encode(),
    )
    assert parse_proxy_request(request) == payload()
    for body in [b"{invalid", b"[]", b"x" * 17000]:
        request.body = body
        with pytest.raises(KOSyncError):
            parse_proxy_request(request)
