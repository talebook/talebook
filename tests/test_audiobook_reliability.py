import datetime
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver import models
from webserver.services.audiobook import AudiobookScheduler, AudiobookStorage, VoicebookProcess


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
            data={},
            create_time=now,
            update_time=now,
        )
        session.add(job)
        session.commit()

        scheduler._consume_event(job.id, {"seq": 10, "event": "segment_completed", "progress": 0.4})
        scheduler._consume_event(job.id, {"seq": 10, "event": "segment_completed", "progress": 0.4})
        scheduler._consume_event(job.id, {"seq": 9, "event": "segment_completed", "progress": 0.3})

        session.expire_all()
        updated = session.get(models.AudiobookJob, job.id)
        assert updated.last_event_seq == 10
        assert updated.data["completed_segments"] == 1
        assert updated.progress == 0.4
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
