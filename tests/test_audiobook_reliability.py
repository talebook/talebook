import datetime
import hashlib
import json
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver import models
from webserver.services.audiobook import (
    AudiobookScheduler,
    AudiobookStorage,
    VoicebookProcess,
    audiobook_job_plan,
    create_audiobook_job_plan,
    merge_revision_manifest,
    normalize_voicebook_script,
    read_script_workspace,
    split_script_text,
)


def _session_maker():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _scheduler(session_maker, storage):
    scheduler = object.__new__(AudiobookScheduler)
    scheduler.session_maker = session_maker
    scheduler.storage = storage
    scheduler.worker_id = "test-worker"
    scheduler._last_maintenance = 0
    return scheduler


def test_silent_voicebook_process_keeps_calling_control_callback():
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        process = VoicebookProcess(storage)
        controls = []
        command = [sys.executable, "-u", "-c", "import time; time.sleep(0.25)"]
        with (
            mock.patch.object(VoicebookProcess, "command", new_callable=mock.PropertyMock, return_value=command),
            mock.patch.dict(
                "webserver.services.audiobook.CONF",
                {"AUDIOBOOK_HEARTBEAT_SECONDS": 0.05},
            ),
        ):
            status = process.run(
                SimpleNamespace(id=1),
                ["ignored"],
                lambda _event: None,
                lambda: controls.append(True) or {"lease_owned": True, "cancel_requested": False},
            )
        assert status == 0
        assert len(controls) >= 3


def test_chatty_voicebook_process_throttles_control_callback_to_heartbeat():
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        process = VoicebookProcess(storage)
        controls = []
        command = [
            sys.executable,
            "-u",
            "-c",
            "import time\nfor _ in range(200): print('{}')\ntime.sleep(0.12)",
        ]
        with (
            mock.patch.object(VoicebookProcess, "command", new_callable=mock.PropertyMock, return_value=command),
            mock.patch.dict(
                "webserver.services.audiobook.CONF",
                {"AUDIOBOOK_HEARTBEAT_SECONDS": 0.05},
            ),
        ):
            status = process.run(
                SimpleNamespace(id=1),
                ["ignored"],
                lambda _event: None,
                lambda: controls.append(True) or {"lease_owned": True, "cancel_requested": False},
            )

        assert status == 0
        assert 2 <= len(controls) < 20


def test_cancel_escalates_to_term_and_returns_cancelled_status():
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        process = VoicebookProcess(storage)
        command = [sys.executable, "-u", "-c", "import time; time.sleep(30)"]
        with (
            mock.patch.object(VoicebookProcess, "command", new_callable=mock.PropertyMock, return_value=command),
            mock.patch.dict(
                "webserver.services.audiobook.CONF",
                {
                    "AUDIOBOOK_HEARTBEAT_SECONDS": 0.02,
                    "AUDIOBOOK_CANCEL_TERM_SECONDS": 0,
                    "AUDIOBOOK_CANCEL_KILL_SECONDS": 0.05,
                },
            ),
        ):
            status = process.run(
                SimpleNamespace(id=2),
                ["ignored"],
                lambda _event: None,
                lambda: {"lease_owned": True, "cancel_requested": True},
            )
        assert status == 3


def test_event_sequence_is_idempotent_and_renews_lease():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        scheduler = _scheduler(session_maker, AudiobookStorage(directory))
        session = session_maker()
        now = datetime.datetime.now()
        edition = models.AudiobookEdition(
            book_id=1,
            status="draft",
            engine="edgetts",
            created_by=1,
            create_time=now,
            update_time=now,
        )
        session.add(edition)
        session.flush()
        job = models.AudiobookJob(
            book_id=1,
            edition_id=edition.id,
            creator_id=1,
            status="generating",
            phase="GENERATING",
            config={},
            config_hash="seq-test",
            lease_owner="test-worker",
            lease_until=now,
            data={"plan": create_audiobook_job_plan("quick", now)},
            create_time=now,
            update_time=now,
        )
        session.add(job)
        session.commit()

        scheduler._consume_event(
            job.id,
            {
                "seq": 10,
                "event": "chapter_started",
                "chapter_number": 1,
                "title": "第一章",
                "total_segments": 2,
            },
        )
        scheduler._consume_event(
            job.id,
            {
                "seq": 11,
                "event": "segment_completed",
                "chapter_number": 1,
                "segment_index": 0,
                "cache_hit": True,
                "fingerprint": "must-not-be-public",
            },
        )
        scheduler._consume_event(job.id, {"seq": 11, "event": "segment_completed", "chapter_number": 1})
        scheduler._consume_event(job.id, {"seq": 9, "event": "segment_completed", "chapter_number": 1})

        session.expire_all()
        updated = session.get(models.AudiobookJob, job.id)
        assert updated.last_event_seq == 11
        assert updated.data["completed_segments"] == 1
        assert updated.data["plan"]["chapters"][0]["completed_segments"] == 1
        assert updated.data["plan"]["chapters"][0]["cache_hits"] == 1
        assert "fingerprint" not in updated.data["last_event"]
        assert updated.progress == 0.575
        assert audiobook_job_plan(updated)["overall_percent"] == 58
        assert updated.lease_until > now
        session.close()


def test_generation_defaults_are_written_to_voicebook_role_table():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        script = Path(directory) / "book.script"
        script.write_text(
            """---
格式: voicebook-script
版本: 1
---

## 角色表
# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖
旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | 自动 |
韩立 | 主角 | 人类 | 男 | 青年 | 中国 | 克制 | 自动 |

## 章节 1 | 第一章

[旁白] 开始。
[韩立] 出发。
""",
            encoding="utf-8",
        )
        job = SimpleNamespace(
            config={
                "speed": "x1.25",
                "protagonist_voices": {"male": "zh-CN-YunxiNeural"},
            }
        )
        edition = SimpleNamespace(engine="edgetts")
        scheduler._apply_generation_defaults(script, job, edition)
        contents = script.read_text(encoding="utf-8")
        assert "旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | x1.25 |" in contents
        assert "韩立 | 主角 | 人类 | 男 | 青年 | 中国 | 克制 | x1.25 | edgetts=zh-CN-YunxiNeural" in contents


def test_sentence_aware_script_splitting_targets_fifty_and_caps_eighty_characters():
    text = "风停了。" + "甲" * 55 + "，" + "乙" * 45 + "。天边亮起微光，我们沿着长路继续向前。"
    chunks = split_script_text(text)

    assert "".join(chunk for chunk, _, _ in chunks) == text
    assert all(0 < len(chunk) <= 80 for chunk, _, _ in chunks)
    assert len(chunks) >= 2
    assert any(28 <= len(chunk) <= 60 for chunk, _, _ in chunks)


def test_script_normalization_drops_css_recovers_title_and_rewrites_locators():
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        script = root / "book.script"
        locators = root / "book.script.locators.json"
        long_text = "第 十 八 章 " + "雨停了。村民推开窗户，看见河面升起薄雾。" * 5
        css_prose = "本章介绍 CSS 的排版用途，body { color: red; } 只是书中引用的示例，不应作为样式残留删除。"
        script.write_text(
            f"""---
格式: voicebook-script
版本: 1
章节来源:
  '1': Text/titlepage.xhtml
  '2': Text/index_split_000.xhtml
定位文件: book.script.locators.json
---

## 角色表
# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖
旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | x1.0 |

## 章节 0001 | titlepage

[旁白] @page {{padding: 0pt; margin:0pt}}
[旁白] body {{ text-align: center; padding:0pt; margin: 0pt; }}

## 章节 0002 | index_split_000

[旁白] {long_text}
[旁白] {css_prose}
""",
            encoding="utf-8",
        )
        segment_hash = hashlib.sha256(f"旁白\0{long_text}".encode()).hexdigest()
        locators.write_text(
            json.dumps(
                {
                    "format": "voicebook-locators",
                    "version": 1,
                    "segments": [
                        {
                            "chapter_number": 2,
                            "segment_sha256": segment_hash,
                            "occurrence": 0,
                            "locator": {
                                "type": "epub-dom-text",
                                "href": "Text/index_split_000.xhtml",
                                "dom_path": "html[1]/body[1]/p[1]",
                                "start_char": 0,
                                "end_char": len(long_text),
                            },
                        }
                    ],
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        report = normalize_voicebook_script(script)
        workspace = read_script_workspace(script)
        locator_payload = json.loads(locators.read_text(encoding="utf-8"))
        normalized_script = script.read_bytes()
        normalized_locators = locators.read_bytes()
        second_report = normalize_voicebook_script(script)

        assert report["removed_style_lines"] == 2
        assert report["removed_chapters"] == [{"number": 1, "title": "titlepage"}]
        assert report["renamed_chapters"] == [{"number": 2, "from": "index_split_000", "to": "第十八章"}]
        assert report["structural_changed"]
        assert [(chapter["number"], chapter["title"]) for chapter in workspace["chapters"]] == [(1, "第十八章")]
        assert all(len(line.split("] ", 1)[1]) <= 80 for line in workspace["chapters"][0]["lines"])
        assert any("本章介绍 CSS" in line for line in workspace["chapters"][0]["lines"])
        assert "## 章节 0001 | index_split_000" not in script.read_text(encoding="utf-8")
        assert all(item["chapter_number"] == 1 for item in locator_payload["segments"])
        assert locator_payload["segments"][0]["locator"]["start_char"] > 0
        assert second_report["removed_style_lines"] == 0
        assert not second_report["structural_changed"]
        assert script.read_bytes() == normalized_script
        assert locators.read_bytes() == normalized_locators


def test_single_chapter_revision_manifest_preserves_unselected_chapters():
    baseline = {
        "format": "voicebook-project",
        "version": 2,
        "duration_ms": 300,
        "chapters": [
            {"number": 1, "title": "旧一", "duration_ms": 100, "size_bytes": 10},
            {"number": 2, "title": "旧二", "duration_ms": 200, "size_bytes": 20},
        ],
    }
    generated = {
        "format": "voicebook-project",
        "version": 2,
        "duration_ms": 150,
        "chapters": [{"number": 1, "title": "新一", "duration_ms": 150, "size_bytes": 15}],
    }

    merged = merge_revision_manifest(baseline, generated)

    assert [item["title"] for item in merged["chapters"]] == ["新一", "旧二"]
    assert merged["duration_ms"] == 350


def test_scheduler_capacity_gate_uses_configured_free_space_floor():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        scheduler = _scheduler(session_maker, AudiobookStorage(directory))
        scheduler.storage.ensure()
        usage = SimpleNamespace(total=20 * 1024**3, used=19 * 1024**3, free=1 * 1024**3)
        with (
            mock.patch("webserver.services.audiobook.shutil.disk_usage", return_value=usage),
            mock.patch.dict("webserver.services.audiobook.CONF", {"AUDIOBOOK_MIN_FREE_GB": 5}),
        ):
            assert not scheduler._has_capacity()


def test_all_nginx_variants_proxy_podcast_without_raw_access_log():
    for filename in (
        "conf/nginx/talebook.conf",
        "conf/nginx/dev.conf",
        "conf/nginx/server-side-render.conf",
    ):
        contents = Path(filename).read_text(encoding="utf-8")
        start = contents.index("location ^~ /podcast/v1/")
        block = contents[start : contents.index("}", start)]
        assert "access_log off;" in block
        assert "proxy_pass       http://tornado;" in block
