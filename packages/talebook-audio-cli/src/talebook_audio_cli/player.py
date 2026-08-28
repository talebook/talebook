from __future__ import annotations

import json
import os
import select
import shutil
import socket
import subprocess
import sys
import tempfile
import termios
import time
import tty
import unicodedata
from pathlib import Path
from typing import Any

from .models import Chapter


class PlayerError(RuntimeError):
    pass


def format_time(seconds: float) -> str:
    seconds = max(0, int(seconds or 0))
    return f"{seconds // 60}:{seconds % 60:02d}"


def display_width(value: str) -> int:
    width = 0
    for character in value:
        if character in {"\r", "\n"} or unicodedata.combining(character):
            continue
        width += 2 if unicodedata.east_asian_width(character) in {"W", "F"} else 1
    return width


def fit_terminal(value: str, width: int) -> str:
    width = max(1, width)
    prefix = "\r" if value.startswith("\r") else ""
    content = value[len(prefix) :]
    if display_width(content) <= width:
        return prefix + content + " " * (width - display_width(content))
    target = max(0, width - 1)
    result: list[str] = []
    used = 0
    for character in content:
        character_width = display_width(character)
        if used + character_width > target:
            break
        result.append(character)
        used += character_width
    return prefix + "".join(result) + "…" + " " * max(0, target - used)


class MpvPlayer:
    def __init__(self, chapters: list[Chapter], cookie_file: Path):
        if not chapters:
            raise PlayerError("这本有声书没有可播放章节")
        executable = shutil.which("mpv")
        if not executable:
            raise PlayerError("找不到 mpv；请安装 mpv 并确认它位于 PATH 中")
        self.executable = executable
        self.chapters = chapters
        self.cookie_file = cookie_file
        self.current_index = 0
        self.process: subprocess.Popen[bytes] | None = None
        self._temporary: tempfile.TemporaryDirectory[str] | None = None
        self.socket_path: Path | None = None
        self._request_id = 0

    def start(self, start_index: int = 0) -> None:
        if start_index < 0 or start_index >= len(self.chapters):
            raise PlayerError("起始章节超出范围")
        self.current_index = start_index
        self._temporary = tempfile.TemporaryDirectory(prefix="talebook-audio-")
        self.socket_path = Path(self._temporary.name) / "mpv.sock"
        chapter = self.chapters[self.current_index]
        args = [
            self.executable,
            "--no-video",
            "--idle=yes",
            "--keep-open=yes",
            f"--input-ipc-server={self.socket_path}",
            "--cookies=yes",
            f"--cookies-file={self.cookie_file}",
            f"--force-media-title={chapter.title}",
            chapter.audio_url,
        ]
        try:
            self.process = subprocess.Popen(
                args, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
        except OSError as exc:
            self.close()
            raise PlayerError(f"无法启动 mpv（{exc.strerror or exc.__class__.__name__}）") from exc
        deadline = time.monotonic() + 4.0
        while time.monotonic() < deadline:
            if self.process.poll() is not None:
                self.close()
                raise PlayerError("mpv 启动后立即退出；请检查音频地址和 mpv 安装")
            if self.socket_path.exists():
                try:
                    self.command(["get_property", "pid"])
                    self._wait_until_active()
                    return
                except PlayerError:
                    pass
            time.sleep(0.05)
        self.close()
        raise PlayerError("mpv 已启动，但 IPC 控制接口不可用")

    def command(self, command: list[Any]) -> Any:
        if self.socket_path is None:
            raise PlayerError("播放器尚未启动")
        self._request_id += 1
        request_id = self._request_id
        payload = (json.dumps({"command": command, "request_id": request_id}) + "\n").encode("utf-8")
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
                connection.settimeout(2.0)
                connection.connect(str(self.socket_path))
                connection.sendall(payload)
                buffer = b""
                while b"\n" not in buffer:
                    chunk = connection.recv(65536)
                    if not chunk:
                        break
                    buffer += chunk
        except (OSError, TimeoutError) as exc:
            raise PlayerError("无法连接 mpv 控制接口") from exc
        for line in buffer.splitlines():
            try:
                response = json.loads(line)
            except json.JSONDecodeError:
                continue
            if response.get("request_id") != request_id:
                continue
            if response.get("error") != "success":
                raise PlayerError(f"mpv 控制失败：{response.get('error', 'unknown error')}")
            return response.get("data")
        raise PlayerError("mpv 未返回有效控制响应")

    def load(self, index: int) -> None:
        if index < 0 or index >= len(self.chapters):
            raise PlayerError("已经到达播放列表边界")
        self.current_index = index
        chapter = self.chapters[index]
        self.command(["set_property", "force-media-title", chapter.title])
        self.command(["loadfile", chapter.audio_url, "replace"])
        self._wait_until_active()

    def _wait_until_active(self) -> None:
        deadline = time.monotonic() + 4.0
        while time.monotonic() < deadline:
            if self.process is None or self.process.poll() is not None:
                raise PlayerError("mpv 意外退出；音频可能失效")
            try:
                if not bool(self.command(["get_property", "idle-active"])):
                    return
            except PlayerError:
                pass
            time.sleep(0.05)
        raise PlayerError("音频无法开始播放；登录态或音频地址可能已失效")

    def toggle_pause(self) -> bool:
        self.command(["cycle", "pause"])
        return bool(self.command(["get_property", "pause"]))

    def status(self) -> tuple[float, float, bool, bool]:
        idle = bool(self.command(["get_property", "idle-active"]))
        if idle:
            return 0, 0, False, True
        try:
            position = float(self.command(["get_property", "time-pos"]) or 0)
        except PlayerError:
            position = 0
        try:
            duration = float(self.command(["get_property", "duration"]) or 0)
        except PlayerError:
            duration = 0
        try:
            paused = bool(self.command(["get_property", "pause"]))
        except PlayerError:
            paused = False
        return position, duration, paused, idle

    def run(self, start_index: int = 0) -> None:
        if not sys.stdin.isatty() or not sys.stdout.isatty():
            raise PlayerError("交互播放需要终端；请在 TTY 中运行 talebook-audio play")
        self.start(start_index)
        descriptor = sys.stdin.fileno()
        original = termios.tcgetattr(descriptor)
        last_render = 0.0
        try:
            tty.setcbreak(descriptor)
            print("控制：空格或 p 暂停/继续，n 下一章，b 上一章，s 刷新状态，q 退出")
            while True:
                if self.process is None or self.process.poll() is not None:
                    raise PlayerError("mpv 意外退出；音频可能失效")
                position, duration, paused, idle = self.status()
                if idle:
                    if self.current_index + 1 >= len(self.chapters):
                        print("\n播放完成")
                        return
                    self.load(self.current_index + 1)
                    continue
                now = time.monotonic()
                if now - last_render >= 0.5:
                    chapter = self.chapters[self.current_index]
                    icon = "⏸" if paused else "▶"
                    line = f"\r{icon} [{self.current_index + 1}/{len(self.chapters)}] {chapter.title}  {format_time(position)}/{format_time(duration)}"
                    print(fit_terminal(line, shutil.get_terminal_size().columns - 1), end="", flush=True)
                    last_render = now
                ready, _, _ = select.select([sys.stdin], [], [], 0.2)
                if not ready:
                    continue
                key = os.read(descriptor, 1).decode("utf-8", errors="ignore")
                if key in {"q", "Q"}:
                    print()
                    return
                if key in {" ", "p", "P"}:
                    self.toggle_pause()
                elif key in {"n", "N"} and self.current_index + 1 < len(self.chapters):
                    self.load(self.current_index + 1)
                elif key in {"b", "B"} and self.current_index > 0:
                    self.load(self.current_index - 1)
                elif key in {"s", "S"}:
                    last_render = 0
        finally:
            termios.tcsetattr(descriptor, termios.TCSADRAIN, original)
            self.close()

    def close(self) -> None:
        process = self.process
        if process is not None and process.poll() is None:
            try:
                self.command(["quit"])
            except PlayerError:
                pass
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                process.terminate()
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait(timeout=2)
        self.process = None
        if self._temporary is not None:
            self._temporary.cleanup()
            self._temporary = None
        self.socket_path = None
