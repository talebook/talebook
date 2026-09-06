import datetime
import hashlib
import json
import os
import time
from types import SimpleNamespace
from unittest import mock

import pytest
import requests

from webserver.plugins.runtime.domains import SourceBookDetail
from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.source import tomato_downloader as tomato


IDENTITY = "7274791759849196579"
BOOK = SourceBookDetail(external_id=IDENTITY, title="西游记", downloadable=True)


@pytest.mark.parametrize("value", [IDENTITY, "https://fanqienovel.com/page/" + IDENTITY])
def test_book_id_accepts_only_canonical_identity(value):
    assert tomato.book_id(value) == IDENTITY


@pytest.mark.parametrize(
    "value", ["1;touch /tmp/x", "../secret", "https://localhost/page/" + IDENTITY, "１２３４５６７８９０"]
)
def test_book_id_rejects_untrusted_paths_and_commands(value):
    with pytest.raises(UpstreamError):
        tomato.book_id(value)


def test_search_detail_and_acquire_use_existing_typed_contract():
    provider = tomato.TomatoDownloaderProvider()
    with mock.patch.object(tomato, "DownloaderSession") as factory:
        session = factory.return_value.__enter__.return_value
        session.request.return_value = {"items": [{"book_id": IDENTITY, "title": "西游记", "author": "吴承恩"}]}
        page = provider.search("西游记", {}, {})
        assert page.items[0].external_id == IDENTITY
        assert page.items[0].access == "download"
        assert page.items[0].format == "txt"
        session.request.assert_called_once_with("GET", "/api/search", params={"q": "西游记"})
        session.request.return_value = {
            "book_id": IDENTITY,
            "book_name": "西游记",
            "author": "吴承恩",
            "tags": ["古典"],
            "description": "百回本",
            "cover_url": "/api/preview-cover/private",
        }
        detail = provider.get_book(IDENTITY, {})
        assert detail.title == "西游记"
        assert detail.downloadable and detail.format == "txt"
        assert not detail.cover_url  # Ephemeral authenticated URLs must not escape to the browser.
        assert provider.search(IDENTITY, {}, {}).items[0].title == "西游记"
        assert provider.download(detail, {}) is session.download.return_value
        session.download.assert_called_once_with(IDENTITY)
        assert provider.search("西游记", {"page": 2}, {}).items == []


@pytest.mark.parametrize("payload", [{}, {"items": None}])
def test_search_malformed_response_is_failure(payload):
    with mock.patch.object(tomato, "DownloaderSession") as factory:
        factory.return_value.__enter__.return_value.request.return_value = payload
        with pytest.raises(UpstreamError, match="无效结果"):
            tomato.TomatoDownloaderProvider().search("西游记", {}, {})


def download_session(tmp_path, state="done", failed=0):
    session = tomato.DownloaderSession({})
    session.output = tmp_path
    (tmp_path / "西游记.txt").write_text("西游记\n第一回\n测试正文", encoding="utf-8")
    session.request = mock.Mock(
        side_effect=[
            {"id": 1},
            {"items": [{"id": 1, "book_id": IDENTITY, "state": state}]},
            {
                "items": [
                    {"book_id": IDENTITY, "selected_chapters": 2, "success_chapters": 2 - failed, "failed_chapters": failed}
                ]
            },
        ]
    )
    return session


def test_download_complete_file(tmp_path):
    result = download_session(tmp_path).download(IDENTITY)
    assert result.filename == IDENTITY + ".txt"
    assert result.format == "txt"
    assert "测试正文" in result.content.decode("utf-8")


def test_incomplete_book_is_never_returned(tmp_path):
    with pytest.raises(UpstreamError, match="缺章"):
        download_session(tmp_path, failed=1).download(IDENTITY)


@pytest.mark.parametrize("state", ["failed", "canceled", "unknown"])
def test_failed_job_is_reported_without_leaking_upstream_diagnostics(tmp_path, state):
    with pytest.raises(UpstreamError, match="下载失败"):
        download_session(tmp_path, state=state).download(IDENTITY)


def test_multiple_outputs_and_large_files_are_rejected(tmp_path, monkeypatch):
    session = download_session(tmp_path)
    (tmp_path / "other.txt").write_text("other")
    with pytest.raises(UpstreamError, match="唯一"):
        session.download(IDENTITY)
    (tmp_path / "other.txt").unlink()
    session = download_session(tmp_path)
    monkeypatch.setattr(tomato, "MAX_BOOK_BYTES", 2)
    with pytest.raises(UpstreamError, match="超过"):
        session.download(IDENTITY)


def test_symlink_output_is_rejected(tmp_path):
    session = download_session(tmp_path)
    (tmp_path / "西游记.txt").unlink()
    (tmp_path / "outside").write_text("secret")
    (tmp_path / "西游记.txt").symlink_to(tmp_path / "outside")
    with pytest.raises(UpstreamError, match="唯一"):
        session.download(IDENTITY)


def test_runtime_deadline_is_respected():
    deadline = (datetime.datetime.now() - datetime.timedelta(seconds=1)).isoformat()
    session = tomato.DownloaderSession({"deadline": deadline, "config": {"timeout_seconds": 600}})
    with pytest.raises(UpstreamError, match="超时"):
        session.remaining()


def test_hash_failure_never_executes_binary(tmp_path):
    binary = tmp_path / "downloader"
    binary.write_bytes(b"untrusted")
    with (
        mock.patch.object(tomato.platform, "system", return_value="Linux"),
        mock.patch.object(tomato.platform, "machine", return_value="x86_64"),
        mock.patch.object(tomato.subprocess, "Popen") as popen,
    ):
        with pytest.raises(UpstreamError, match="SHA-256"):
            with tomato.DownloaderSession({"config": {"binary_path": str(binary)}}):
                pass
        popen.assert_not_called()


def test_process_is_reaped_and_temp_files_removed_on_timeout(tmp_path, monkeypatch):
    binary = tmp_path / "downloader"
    binary.write_bytes(b"test-fixture")
    monkeypatch.setitem(tomato.RELEASE_HASHES, tomato.platform.machine(), hashlib.sha256(binary.read_bytes()).hexdigest())
    monkeypatch.setattr(tomato.platform, "system", lambda: "Linux")
    proc = mock.Mock()
    proc.poll.return_value = None
    with (
        mock.patch.object(tomato.subprocess, "Popen", return_value=proc) as popen,
        mock.patch.object(tomato.DownloaderSession, "request", return_value={"version": tomato.VERSION}),
    ):
        with pytest.raises(UpstreamError, match="超时"):
            with tomato.DownloaderSession({"config": {"binary_path": str(binary)}}) as session:
                directory = session.root
                config = json.loads((directory / "config.yml").read_text())
                assert config["api_endpoints"] == [] and config["use_official_api"]
                session.deadline = time.monotonic() - 1
                session.remaining()
    proc.kill.assert_called_once()
    proc.wait.assert_called_once()
    assert not directory.exists()
    assert popen.call_args.args[0][1:3] == ["--server", "--data-dir"]
    assert popen.call_args.kwargs["env"]["CARGO"] == "talebook-pinned-release"
    assert "shell" not in popen.call_args.kwargs


def test_start_failure_cleans_temp_directory(tmp_path, monkeypatch):
    binary = tmp_path / "downloader"
    binary.write_bytes(b"fixture")
    monkeypatch.setitem(tomato.RELEASE_HASHES, tomato.platform.machine(), hashlib.sha256(binary.read_bytes()).hexdigest())
    monkeypatch.setattr(tomato.platform, "system", lambda: "Linux")
    session = tomato.DownloaderSession({"config": {"binary_path": str(binary)}})
    with mock.patch.object(tomato.subprocess, "Popen", side_effect=PermissionError):
        with pytest.raises(UpstreamError, match="无法启动"):
            with session:
                pass
    assert not session.root.exists()


def test_upstream_errors_do_not_reveal_remote_tokens():
    session = tomato.DownloaderSession({})
    session.http = mock.Mock()
    session.endpoint = "http://127.0.0.1:1234"
    session.headers = {}
    session.http.json.return_value = {"error": "https://private.invalid/?token=secret"}
    with pytest.raises(UpstreamError) as failure:
        session.request("GET", "/api/search")
    assert "secret" not in str(failure.value)
    session.http.json.side_effect = requests.Timeout()
    with pytest.raises(UpstreamError, match="请求超时"):
        session.request("GET", "/api/search")


def test_catalog_download_uses_connection_budget_but_search_remains_bounded():
    from webserver.services.source_catalog import SourceCatalogService

    catalog = object.__new__(SourceCatalogService)
    catalog.settings = {"BOOKSOURCE_HTTP_TIMEOUT": 20}
    catalog.runtime = mock.Mock()
    binding = SimpleNamespace(context_overrides={}, connection=SimpleNamespace(config={"timeout_seconds": 600}))
    catalog.read(binding, "download", BOOK)
    assert catalog.runtime.read.call_args.kwargs["timeout"] == 600
    catalog.read(binding, "get_book", IDENTITY)
    assert catalog.runtime.read.call_args.kwargs["timeout"] == 20
    catalog.read(binding, "download", BOOK, timeout=10)
    assert catalog.runtime.read.call_args.kwargs["timeout"] == 10


@pytest.mark.skipif(not os.environ.get("TOMATO_TEST_BINARY"), reason="requires a verified release and live upstream")
def test_live_release_search_detail_and_complete_download(tmp_path, monkeypatch):
    provider = tomato.TomatoDownloaderProvider()
    context = {"config": {"binary_path": os.environ["TOMATO_TEST_BINARY"], "timeout_seconds": 180}}
    page = provider.search("西游记", {}, context)
    assert any(item.external_id == IDENTITY for item in page.items)
    detail = provider.get_book(IDENTITY, context)
    assert detail.title == "西游记"
    result = provider.download(detail, context)
    assert "西游记" in result.content.decode("utf-8")

    from webserver import main

    main.init_calibre()
    from calibre.db.legacy import LibraryDatabase

    from webserver.services.booksource import save_service

    monkeypatch.setitem(save_service.CONF, "upload_path", str(tmp_path / "uploads"))
    db = LibraryDatabase(str(tmp_path / "library"))
    service = object.__new__(save_service.SaveOnlineBookService)
    service.db = db
    try:
        imported = service._import_file(detail, result)
        assert db.get_metadata(imported, index_is_id=True).title == "西游记"
        assert db.format(imported, "TXT", index_is_id=True) == result.content
        assert list((tmp_path / "uploads").iterdir()) == []
    finally:
        db.close()
