"""Offline contract for the Edge SDK used by the audiobook producer."""

import io
import json
import subprocess
from importlib.metadata import version

import aiohttp
import edge_tts
from book2audio.edge_budget import EdgeBudget
from book2audio.machine import ProgressEmitter
from book2audio.tool_pipeline import generate_audio
from edge_tts.drm import DRM


def test_installed_edge_sdk_matches_reviewed_voicebook_pin():
    assert version("edge-tts") == "7.3.1"


def test_edge_sdk_retries_via_shared_budget_and_produces_chapter_audio(tmp_path, monkeypatch):
    script = tmp_path / "book.script"
    script.write_text(
        """---
格式: voicebook-script
版本: 1
---

## 角色表
# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖
旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | x1.0 |

## 章节 1 | 第一章

[旁白] 离线回归。
""",
        encoding="utf-8",
    )
    fixture_mp3 = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=0.15", "-f", "mp3", "pipe:1"],
        capture_output=True,
        check=True,
        timeout=10,
    ).stdout
    budget_path = tmp_path / "rate-limits" / "edge-budget.sqlite3"
    observer = EdgeBudget(budget_path, interval=0)
    admissions = []
    adjustments = []

    def unexpected_websocket(*args, **kwargs):
        raise AssertionError("offline regression must not open a WebSocket")

    async def stream(_communicator):
        admissions.append(observer.stats()["requests"])
        if len(admissions) == 1:
            raise aiohttp.ClientResponseError(
                request_info=None,
                history=(),
                status=403,
                headers={"Date": "Sat, 21 Nov 2026 12:00:00 GMT"},
            )
        yield {"type": "audio", "data": fixture_mp3}

    def adjust_clock(error):
        adjustments.append(error.status)

    # Replace only the remote stream and its global clock side effect. Keep the
    # installed SDK's Communicate/save, Voicebook's real Edge adapter and budget.
    monkeypatch.setattr(aiohttp.ClientSession, "ws_connect", unexpected_websocket)
    monkeypatch.setattr(edge_tts.Communicate, "_Communicate__stream", stream)
    monkeypatch.setattr(DRM, "handle_client_response_error", adjust_clock)
    events = io.StringIO()
    output = tmp_path / "output"
    files = generate_audio(
        script,
        output,
        engine="edgetts",
        progress=ProgressEmitter(events, version=2, task_id="edge-offline", attempt_id="attempt-1"),
        edge_budget_path=budget_path,
        edge_interval=0,
        max_retries=1,
        retry_backoff=0.05,
        max_wait_seconds=10,
    )

    # The title and body each require a request; the synthetic 403 adds exactly
    # one retry. Observing the counter at stream entry detects hidden SDK retries.
    assert admissions == [1, 2, 3]
    assert adjustments == [403]
    assert observer.stats()["requests"] == 3
    assert observer.stats()["retries"] == 1
    assert len(files) == 1 and files[0].stat().st_size > 0
    manifest = json.loads((output / "manifest.v2.json").read_text(encoding="utf-8"))
    assert manifest["status"] == "completed" and manifest["duration_ms"] > 0
    rows = [json.loads(line) for line in events.getvalue().splitlines()]
    assert all(row["task_id"] == "edge-offline" and row["attempt_id"] == "attempt-1" for row in rows)
    assert any((row.get("snapshot", {}).get("waiting") or {}).get("reason") == "clock_skew_adjustment" for row in rows)
    assert rows[-1]["snapshot"]["completed"] == rows[-1]["snapshot"]["total"] == 2
