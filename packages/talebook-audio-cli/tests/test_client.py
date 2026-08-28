import stat

import pytest
from talebook_audio_cli.client import AuthenticationError, ResponseError, TalebookClient, parse_audiobook_list, parse_manifest
from talebook_audio_cli.config import AppPaths, Config


def test_parse_audiobook_list_reads_published_edition_shape():
    books = parse_audiobook_list(
        {
            "books": [
                {
                    "id": 42,
                    "title": "测试书",
                    "author": "作者",
                    "edition": {"id": 12, "chapter_count": 3, "duration_ms": 125000},
                }
            ]
        }
    )

    assert books[0].book_id == 42
    assert books[0].edition_id == 12
    assert books[0].chapter_count == 3


def test_parse_manifest_sorts_chapters_and_builds_absolute_urls():
    chapters = parse_manifest(
        {
            "manifest": {
                "chapters": [
                    {"id": 2, "number": 2, "title": "二", "duration_ms": 2000, "audio_url": "/media/two.mp3"},
                    {"id": 1, "number": 1, "title": "一", "duration_ms": 1000, "audio_url": "/media/one.mp3"},
                ]
            }
        },
        "https://books.example.com/base",
    )

    assert [chapter.number for chapter in chapters] == [1, 2]
    assert chapters[0].audio_url == "https://books.example.com/base/media/one.mp3"


def test_parse_manifest_rejects_missing_audio_url():
    with pytest.raises(ResponseError, match="音频地址"):
        parse_manifest({"manifest": {"chapters": [{"id": 1, "number": 1}]}}, "https://books.example.com")


def test_login_saves_session_but_never_password(tmp_path, monkeypatch):
    paths = AppPaths(tmp_path / "settings")
    client = TalebookClient(Config("https://books.example.com", "alice"), paths)
    captured = {}

    def response(path, **kwargs):
        captured.update(kwargs["form"])
        return {"err": "ok", "msg": "ok"}

    monkeypatch.setattr(client, "_request_json", response)
    client.login("super-secret")

    assert captured == {"username": "alice", "password": "super-secret"}
    assert paths.cookie_file.exists()
    assert "super-secret" not in paths.cookie_file.read_text()
    assert stat.S_IMODE(paths.cookie_file.stat().st_mode) == 0o600


def test_login_surfaces_server_error_without_echoing_password(tmp_path, monkeypatch):
    client = TalebookClient(Config("https://books.example.com", "alice"), AppPaths(tmp_path / "settings"))
    monkeypatch.setattr(client, "_request_json", lambda *args, **kwargs: {"err": "params.invalid", "msg": "用户名或密码错误"})

    with pytest.raises(AuthenticationError, match="用户名或密码错误") as error:
        client.login("do-not-echo")
    assert "do-not-echo" not in str(error.value)
