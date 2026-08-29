import io

import pytest
from talebook_audio_cli.cli import _print_books, _select, main
from talebook_audio_cli.client import TalebookError
from talebook_audio_cli.config import AppPaths
from talebook_audio_cli.models import Audiobook


def test_configure_command_does_not_accept_or_store_password(tmp_path, capsys):
    paths = AppPaths(tmp_path / "settings")

    result = main(["configure", "--server", "https://books.example.com/", "--username", "alice"], paths=paths)

    assert result == 0
    assert "alice" in capsys.readouterr().out
    content = paths.config_file.read_text()
    assert "password" not in content
    assert "secret" not in content


def test_books_requires_configuration(tmp_path, capsys):
    result = main(["books"], paths=AppPaths(tmp_path / "settings"))

    assert result == 2
    assert "configure" in capsys.readouterr().err


def test_book_list_uses_consistent_chinese_labels(capsys):
    _print_books([Audiobook(42, 12, "测试书", "作者", 3, 125000)])

    output = capsys.readouterr().out
    assert "书籍 ID：42" in output
    assert "有声版本 ID：12" in output
    assert "BOOK" not in output


def test_empty_book_list_points_to_next_action(capsys):
    _print_books([])

    assert "生成并发布" in capsys.readouterr().out


def test_non_tty_selection_exits_with_actionable_error(monkeypatch):
    stream = io.StringIO("")
    monkeypatch.setattr("sys.stdin", stream)

    with pytest.raises(TalebookError, match="--book-id"):
        _select("选择：", 2)
