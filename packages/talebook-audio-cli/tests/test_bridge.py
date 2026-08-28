import io
import json
import urllib.error

import pytest
from talebook_audio_cli.bridge import BridgeClient, BridgeError, bridge_base_url, load_bridge_token


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return None

    def read(self, _limit=None):
        return self.payload


def test_bridge_base_url_rejects_insecure_remote_http(monkeypatch):
    monkeypatch.delenv("OPENXIAOAI_ALLOW_INSECURE_HTTP", raising=False)

    with pytest.raises(BridgeError, match="明文 HTTP"):
        bridge_base_url("http://speaker.example.com:9092")


def test_bridge_token_file_must_be_private(tmp_path, monkeypatch):
    token_file = tmp_path / "api-token"
    token_file.write_text("x" * 43)
    token_file.chmod(0o644)
    monkeypatch.delenv("OPENXIAOAI_API_TOKEN", raising=False)
    monkeypatch.setenv("OPENXIAOAI_API_TOKEN_FILE", str(token_file))

    with pytest.raises(BridgeError, match="权限过宽"):
        load_bridge_token()

    token_file.chmod(0o600)
    assert load_bridge_token() == "x" * 43


def test_bridge_client_sends_bearer_and_parses_status(monkeypatch):
    client = BridgeClient(token="x" * 43)
    requests = []

    def fake_open(request, timeout):
        requests.append((request, timeout))
        return FakeResponse({"success": True, "data": {"state": "playing", "position_ms": 1200, "duration_ms": 5000}})

    monkeypatch.setattr(client.opener, "open", fake_open)

    status = client.play("https://books.example.com/chapter.mp3")

    request, timeout = requests[0]
    assert request.full_url == "http://127.0.0.1:9092/api/stream/play"
    assert request.get_header("Authorization") == "Bearer " + "x" * 43
    assert json.loads(request.data) == {"url": "https://books.example.com/chapter.mp3"}
    assert timeout == 150.0
    assert status.playing is True
    assert status.position_ms == 1200


def test_bridge_http_error_redacts_secrets(monkeypatch):
    client = BridgeClient(token="x" * 43)
    secret = "abcdefghijklmnopabcdefghijklmnop"

    def fake_open(request, timeout):
        body = io.BytesIO(json.dumps({"error": f"Authorization: Bearer {secret}"}).encode())
        raise urllib.error.HTTPError(request.full_url, 400, "Bad Request", {}, body)

    monkeypatch.setattr(client.opener, "open", fake_open)

    with pytest.raises(BridgeError) as raised:
        client.status()

    assert secret not in str(raised.value)
    assert "<redacted>" in str(raised.value)
