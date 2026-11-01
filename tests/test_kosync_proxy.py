import json
from unittest import mock

from tests.test_main import TestWithUserLogin
from tests.test_main import setUpModule as init
from webserver.handlers.base import BaseHandler


def setUpModule():
    init()


class TestKOSyncProxy(TestWithUserLogin):
    def request_proxy(self, payload=None, headers=None):
        return self.json(
            "/api/kosync",
            method="POST",
            headers={"Content-Type": "application/json", "X-Talebook-KOSync": "1", **(headers or {})},
            body=json.dumps(
                payload
                if payload is not None
                else {
                    "serverUrl": "https://sync.example",
                    "method": "GET",
                    "endpoint": "/users/auth",
                    "headers": {"X-Auth-User": "alice", "X-Auth-Key": "secret"},
                }
            ),
        )

    @mock.patch("webserver.kosync.proxy_request", new_callable=mock.AsyncMock)
    def test_guest_cannot_use_proxy(self, upstream):
        with mock.patch.object(BaseHandler, "get_current_user", return_value=None):
            assert self.request_proxy()["err"] == "user.need_login"
        upstream.assert_not_called()

    @mock.patch("webserver.kosync.proxy_request", new_callable=mock.AsyncMock)
    def test_cross_origin_is_rejected_before_upstream(self, upstream):
        for headers in [
            {"Origin": "https://evil.example"},
            {"Sec-Fetch-Site": "cross-site"},
            {"X-Talebook-KOSync": ""},
            {"Content-Type": "text/plain"},
        ]:
            assert self.request_proxy(headers=headers)["err"] == "kosync.origin"
        upstream.assert_not_called()

    @mock.patch("webserver.kosync.proxy_request", new_callable=mock.AsyncMock)
    def test_malformed_and_oversized_payloads_are_rejected(self, upstream):
        for value in [[], "invalid", {"serverUrl": "file:///etc/passwd"}, {"data": "x" * 17000}]:
            assert self.request_proxy(value)["err"] == "kosync.params"
        upstream.assert_not_called()

    @mock.patch("webserver.kosync.proxy_request", new_callable=mock.AsyncMock)
    def test_preserves_upstream_status_and_disables_response_caching(self, upstream):
        upstream.return_value = {"err": "ok", "status": 401, "data": {"message": "Invalid credentials"}}
        response = self.fetch(
            "/api/kosync",
            method="POST",
            headers={"Content-Type": "application/json", "X-Talebook-KOSync": "1"},
            body=json.dumps({"serverUrl": "https://sync.example", "method": "GET", "endpoint": "/users/auth"}),
        )
        assert response.code == 200
        assert json.loads(response.body)["status"] == 401
        assert response.headers["Cache-Control"] == "private, no-store"
        assert "Set-Cookie" not in response.headers
        upstream.assert_awaited_once()
