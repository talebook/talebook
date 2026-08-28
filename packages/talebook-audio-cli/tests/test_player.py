import shutil
import subprocess

import pytest
from talebook_audio_cli.models import Chapter
from talebook_audio_cli.player import MpvPlayer, PlayerError, display_width, fit_terminal, format_time


def test_format_time():
    assert format_time(0) == "0:00"
    assert format_time(125.9) == "2:05"


def test_fit_terminal_accounts_for_wide_chinese_characters():
    fitted = fit_terminal("\r▶ 第一章很长  2:05/5:00", 16)

    assert fitted.startswith("\r")
    assert display_width(fitted) == 16
    assert "…" in fitted


def test_player_reports_missing_dependency(tmp_path, monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda name: None)
    chapters = [Chapter(1, 1, "第一章", 1000, "https://books.example.com/one.mp3")]

    with pytest.raises(PlayerError, match="mpv"):
        MpvPlayer(chapters, tmp_path / "cookies.txt")


def test_player_rejects_empty_queue(tmp_path, monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/mpv")

    with pytest.raises(PlayerError, match="没有可播放章节"):
        MpvPlayer([], tmp_path / "cookies.txt")


def test_close_escalates_and_cleans_temporary_directory(tmp_path, monkeypatch):
    monkeypatch.setattr(shutil, "which", lambda name: "/usr/bin/mpv")
    chapter = Chapter(1, 1, "第一章", 1000, "https://books.example.com/one.mp3")
    player = MpvPlayer([chapter], tmp_path / "cookies.txt")

    class FakeProcess:
        def __init__(self):
            self.running = True
            self.terminated = False
            self.killed = False

        def poll(self):
            return None if self.running else 0

        def wait(self, timeout):
            if not self.killed:
                raise subprocess.TimeoutExpired("mpv", timeout)
            self.running = False
            return 0

        def terminate(self):
            self.terminated = True

        def kill(self):
            self.killed = True

    process = FakeProcess()
    temporary = tmp_path / "ipc"
    temporary.mkdir()
    player.process = process
    player._temporary = type("Temporary", (), {"cleanup": lambda self: shutil.rmtree(temporary)})()
    player.socket_path = temporary / "mpv.sock"
    monkeypatch.setattr(player, "command", lambda command: None)

    player.close()

    assert process.terminated is True
    assert process.killed is True
    assert not temporary.exists()
