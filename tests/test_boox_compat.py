from unittest.mock import Mock, patch

import pytest
import requests

from webserver.plugins.push.boox import BooxUploader


def reply(status, payload=None):
    response = Mock(status_code=status)
    response.json.return_value = payload
    if status >= 400:
        response.raise_for_status.side_effect = requests.HTTPError(response=response)
    response.text = "device response"
    return response


@pytest.mark.parametrize("status", [403, 404, 405, 410, 501])
def test_boox_storage_fallback(tmp_path, status):
    book = tmp_path / "book.txt"
    book.write_text("book content")
    responses = [reply(status), reply(200, {"code": 0})]
    with (
        patch("webserver.plugins.push.boox.requests.post", side_effect=responses) as post,
        patch("webserver.plugins.push.boox.time.monotonic", side_effect=[100.0, 101.0]),
    ):
        result = BooxUploader(book).upload("http://device:8088/")
    assert result["success"]
    assert post.call_count == 2
    assert post.call_args_list[0].args[0] == "http://device:8088/api/library/upload"
    assert post.call_args.args[0] == "http://device:8088/api/storage/upload"
    assert post.call_args.kwargs["data"] == {"path": "/Download"}
    assert post.call_args.kwargs["timeout"] < post.call_args_list[0].kwargs["timeout"]


@pytest.mark.parametrize("status", [401, 429, 500, 503])
def test_boox_no_http_retry(tmp_path, status):
    book = tmp_path / "book.txt"
    book.write_text("book content")
    with patch("webserver.plugins.push.boox.requests.post", return_value=reply(status)) as post:
        result = BooxUploader(book).upload("http://device:8088")
    assert not result["success"]
    assert result["status_code"] == status
    assert post.call_count == 1


@pytest.mark.parametrize("exc", [requests.Timeout("timeout"), requests.ConnectionError("disconnected")])
def test_boox_no_transport_retry(tmp_path, exc):
    book = tmp_path / "book.txt"
    book.write_text("book content")
    with patch("webserver.plugins.push.boox.requests.post", side_effect=exc) as post:
        result = BooxUploader(book).upload("http://device:8088")
    assert not result["success"]
    assert post.call_count == 1


@pytest.mark.parametrize(
    "payload",
    [
        {"code": 300001},
        {"code": 0, "successful": False},
        {},
        None,
        {"code": 0, "isSuccessful": False},
        {"code": 0, "isSuccessful": True, "isTokenInvalid": True},
        {"code": 0, "successful": False, "isSuccessful": True},
    ],
)
def test_boox_storage_requires_explicit_success(tmp_path, payload):
    book = tmp_path / "book.txt"
    book.write_text("book content")
    with patch("webserver.plugins.push.boox.requests.post", side_effect=[reply(403), reply(200, payload)]):
        result = BooxUploader(book).upload("http://device:8088")
    assert not result["success"]
    assert "旧接口返回 HTTP 403" in result["message"]


def test_boox_legacy_success(tmp_path):
    book = tmp_path / "book.txt"
    book.write_text("book content")
    with patch("webserver.plugins.push.boox.requests.post", return_value=reply(200, {"code": 0, "successful": True})) as post:
        assert BooxUploader(book).upload("http://device:8088")["success"]
    assert post.call_count == 1


@pytest.mark.parametrize("storage", [False, True])
def test_boox_new_success_flags(storage):
    BooxUploader._check_result({"code": 0, "isSuccessful": True, "isTokenInvalid": False}, storage=storage)
