import datetime
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
    reset_for_retry,
)


def _session_maker():
    engine = create_engine("sqlite:///:memory:")
    models.Base.metadata.create_all(engine)
    return sessionmaker(bind=engine)


def _scheduler(session_maker, storage):
    scheduler = object.__new__(AudiobookScheduler)
    scheduler.session_maker = session_maker
    scheduler.storage = storage
    scheduler.book_db = SimpleNamespace(
        new_api=SimpleNamespace(formats=lambda _book_id: ["EPUB"]),
        format_abspath=lambda _book_id, _format, index_is_id=True: __file__,
    )
    scheduler.worker_id = "test-worker"
    scheduler._last_maintenance = 0
    return scheduler


def _write_manifest(directory, chapters, *, status="completed", filename="manifest.v2.json"):
    directory.mkdir(parents=True, exist_ok=True)
    manifest = {
        "format": "voicebook-project",
        "version": 2,
        "engine": "edgetts",
        "status": status,
        "chapters": chapters,
        "chapter_count": len(chapters),
        "duration_ms": sum(int(item.get("duration_ms", 0)) for item in chapters),
    }
    path = directory / filename
    path.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    return path


def _write_chapter_files(directory, number, marker):
    audio = directory / "chapters" / f"{number:04d}.mp3"
    timeline = directory / "timelines" / f"{number:04d}.json"
    audio.parent.mkdir(parents=True, exist_ok=True)
    timeline.parent.mkdir(parents=True, exist_ok=True)
    audio.write_bytes(f"audio-{marker}".encode())
    timeline.write_text(json.dumps({"chapter_number": number, "marker": marker}), encoding="utf-8")
    return {
        "number": number,
        "source_key": f"chapter-{number}",
        "title": f"第 {number} 章-{marker}",
        "audio": f"chapters/{number:04d}.mp3",
        "timeline": f"timelines/{number:04d}.json",
        "duration_ms": number * 100,
        "size_bytes": audio.stat().st_size,
        "sha256": f"sha-{number}-{marker}",
    }


def _revision_fixture(session_maker, storage, *, chapter_number=1):
    session = session_maker()
    now = datetime.datetime.now()
    source = models.AudiobookEdition(
        book_id=1,
        status="published",
        engine="edgetts",
        config={"revision_number": 1},
        created_by=1,
        create_time=now,
        update_time=now,
    )
    session.add(source)
    session.flush()
    source_dir = storage.edition_dir(source.id)
    source_chapters = [_write_chapter_files(source_dir, number, "old") for number in (1, 2)]
    source_manifest = _write_manifest(source_dir, source_chapters)
    source.manifest_path = storage.relative(source_manifest)
    source.chapter_count = 2

    edition = models.AudiobookEdition(
        book_id=1,
        status="draft",
        engine="edgetts",
        config={"revision_number": 2, "revision_of_edition_id": source.id},
        created_by=1,
        create_time=now,
        update_time=now,
    )
    session.add(edition)
    session.flush()
    edition_dir = storage.edition_dir(edition.id)
    edition_chapters = [_write_chapter_files(edition_dir, number, "old") for number in (1, 2)]
    baseline_path = _write_manifest(edition_dir, edition_chapters)
    script = edition_dir / "book.script"
    script.write_text(
        """---
格式: voicebook-script
版本: 1
---

## 角色表
# 角色 | 定位 | 类型 | 性别 | 年龄段 | 地域 | 音色描述 | 语速 | 音色覆盖
旁白 | 旁白 | 人类 | 男 | 中年 | 中国 | 沉稳 | x1.0 |

## 章节 1 | 第一章

[旁白] 第一章。

## 章节 2 | 第二章

[旁白] 第二章。
""",
        encoding="utf-8",
    )
    edition.script_path = storage.relative(script)
    edition.manifest_path = storage.relative(baseline_path)
    job = models.AudiobookJob(
        book_id=1,
        edition_id=edition.id,
        creator_id=1,
        mode="advanced",
        status="generating",
        phase="GENERATING",
        config={},
        config_hash=f"revision-{edition.id}",
        chapter_selection=str(chapter_number),
        lease_owner="test-worker",
        lease_until=now + datetime.timedelta(minutes=1),
        data={
            "inspected": True,
            "revision": {
                "source_edition_id": source.id,
                "scope": "chapter",
                "chapter_number": chapter_number,
                "structural_changed": False,
            },
            "plan": create_audiobook_job_plan("advanced", now),
        },
        create_time=now,
        update_time=now,
    )
    session.add(job)
    session.commit()
    result = SimpleNamespace(
        source_id=source.id,
        edition_id=edition.id,
        job_id=job.id,
        baseline_path=baseline_path,
        baseline_bytes=baseline_path.read_bytes(),
    )
    session.close()
    return result


def _write_generated_chapter(arguments, chapter_number=1):
    output = Path(arguments[arguments.index("-o") + 1])
    chapter = _write_chapter_files(output, chapter_number, "new")
    _write_manifest(output, [chapter])
    return output


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


def test_inspect_completion_keeps_only_bounded_voicebook_quality_counters():
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
            status="inspecting",
            phase="INSPECTING",
            config={},
            config_hash="inspect-report",
            data={"plan": create_audiobook_job_plan("advanced", now)},
            create_time=now,
            update_time=now,
        )
        session.add(job)
        session.commit()

        scheduler._consume_event(
            job.id,
            {
                "seq": 1,
                "event": "completed",
                "normalization": {
                    "version": 1,
                    "chapters_before": 24,
                    "chapters_after": 23,
                    "segments_before": "not-an-integer",
                    "segments_after": 1_000_000_001,
                    "removed_chapter_count": 1,
                    "renamed_chapter_count": 20,
                    "removed_noncontent_block_count": 8,
                    "locator_unmapped_count": -2,
                    "details": ["must-not-be-persisted"],
                },
            },
        )

        session.expire_all()
        updated = session.get(models.AudiobookJob, job.id)
        assert updated.data["normalization"] == {
            "version": 1,
            "chapters_before": 24,
            "chapters_after": 23,
            "segments_after": 1_000_000_000,
            "removed_chapter_count": 1,
            "renamed_chapter_count": 20,
            "removed_noncontent_block_count": 8,
            "locator_unmapped_count": 0,
        }
        assert "normalization" not in updated.data["last_event"]

        scheduler._consume_event(job.id, {"seq": 2, "event": "completed"})
        session.expire_all()
        assert "normalization" not in session.get(models.AudiobookJob, job.id).data
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


def test_cancelled_revision_keeps_edition_manifest_and_retry_commits_complete_version():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        fixture = _revision_fixture(session_maker, storage)
        calls = []

        def run_revision(_process, _job, arguments, _on_event, _on_control):
            calls.append(list(arguments))
            if len(calls) == 1:
                _write_generated_chapter(arguments)
                return 3
            return 0

        with mock.patch.object(VoicebookProcess, "run", autospec=True, side_effect=run_revision):
            scheduler._process(fixture.job_id)

            session = session_maker()
            cancelled = session.get(models.AudiobookJob, fixture.job_id)
            assert cancelled.status == "cancelled"
            assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
            staged = storage.job_dir(fixture.job_id) / "revision-output" / "manifest.v2.json"
            assert [item["number"] for item in json.loads(staged.read_text())["chapters"]] == [1]
            reset_for_retry(storage, cancelled)
            session.commit()
            session.close()

            scheduler._process(fixture.job_id)

        session = session_maker()
        completed = session.get(models.AudiobookJob, fixture.job_id)
        edition = session.get(models.AudiobookEdition, fixture.edition_id)
        assert completed.status == "completed"
        assert "--resume" in calls[1]
        assert Path(calls[0][calls[0].index("-o") + 1]) == storage.job_dir(fixture.job_id) / "revision-output"
        assert edition.manifest_path.endswith(f"manifests/job-{fixture.job_id}.v2.json")
        committed = json.loads(storage.resolve(edition.manifest_path, must_exist=True).read_text())
        assert [item["number"] for item in committed["chapters"]] == [1, 2]
        assert committed["chapters"][0]["title"] == "第 1 章-new"
        assert committed["chapters"][1]["title"] == "第 2 章-old"
        assert committed["chapters"][0]["audio"].startswith(f"versions/job-{fixture.job_id}/")
        assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
        assert session.query(models.AudiobookChapter).filter_by(edition_id=fixture.edition_id).count() == 2
        assert not (storage.job_dir(fixture.job_id) / "revision-output").exists()
        session.close()


def test_revision_merge_failure_keeps_baseline_and_retry_reuses_staging():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        fixture = _revision_fixture(session_maker, storage)
        calls = []
        real_merge = merge_revision_manifest
        merge_calls = 0

        def run_revision(_process, _job, arguments, _on_event, _on_control):
            calls.append(list(arguments))
            if len(calls) == 1:
                _write_generated_chapter(arguments)
            return 0

        def flaky_merge(baseline, generated):
            nonlocal merge_calls
            merge_calls += 1
            if merge_calls == 1:
                raise RuntimeError("simulated manifest merge failure")
            return real_merge(baseline, generated)

        with (
            mock.patch.object(VoicebookProcess, "run", autospec=True, side_effect=run_revision),
            mock.patch("webserver.services.audiobook.merge_revision_manifest", side_effect=flaky_merge),
        ):
            scheduler._process(fixture.job_id)
            session = session_maker()
            failed = session.get(models.AudiobookJob, fixture.job_id)
            assert failed.status == "failed"
            assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
            assert (storage.job_dir(fixture.job_id) / "revision-output" / "manifest.v2.json").is_file()
            reset_for_retry(storage, failed)
            session.commit()
            session.close()

            scheduler._process(fixture.job_id)

        session = session_maker()
        completed = session.get(models.AudiobookJob, fixture.job_id)
        edition = session.get(models.AudiobookEdition, fixture.edition_id)
        assert completed.status == "completed"
        assert "--resume" in calls[1]
        assert [item["number"] for item in json.loads(storage.resolve(edition.manifest_path).read_text())["chapters"]] == [
            1,
            2,
        ]
        assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
        session.close()


def test_revision_finalize_rejects_manifest_with_fewer_chapters_than_baseline():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        fixture = _revision_fixture(session_maker, storage)
        invalid_dir = storage.edition_dir(fixture.edition_id) / "manifests"
        invalid_chapter = _write_chapter_files(storage.edition_dir(fixture.edition_id), 1, "invalid")
        _write_manifest(
            invalid_dir,
            [invalid_chapter],
            filename=f"job-{fixture.job_id}.v2.json",
        )

        try:
            scheduler._finalize(fixture.job_id)
        except ValueError as exc:
            assert "章节集合" in str(exc)
        else:
            raise AssertionError("残缺修订 manifest 不应通过 finalize")

        session = session_maker()
        edition = session.get(models.AudiobookEdition, fixture.edition_id)
        assert edition.manifest_path == storage.relative(fixture.baseline_path)
        assert session.query(models.AudiobookChapter).filter_by(edition_id=fixture.edition_id).count() == 0
        session.close()


def test_full_revision_rejects_partial_staged_manifest_before_committing_assets():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        fixture = _revision_fixture(session_maker, storage)
        session = session_maker()
        job = session.get(models.AudiobookJob, fixture.job_id)
        job.data = {**job.data, "revision": {**job.data["revision"], "scope": "book"}}
        job.chapter_selection = ""
        session.commit()
        output = storage.job_dir(job.id) / "revision-output"
        chapter = _write_chapter_files(output, 1, "new")
        _write_manifest(output, [chapter])
        edition = session.get(models.AudiobookEdition, fixture.edition_id)

        try:
            scheduler._commit_revision_output(job, edition, output)
        except ValueError as exc:
            assert "章节集合" in str(exc)
        else:
            raise AssertionError("整本修订不应接受缺章的暂存 manifest")

        assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
        assert not (storage.edition_dir(fixture.edition_id) / f"versions/job-{job.id}").exists()
        assert not (storage.edition_dir(fixture.edition_id) / f"manifests/job-{job.id}.v2.json").exists()
        session.close()


def test_revision_rejects_manifest_asset_path_outside_staging_directory():
    session_maker = _session_maker()
    with tempfile.TemporaryDirectory() as directory:
        storage = AudiobookStorage(directory)
        storage.ensure()
        scheduler = _scheduler(session_maker, storage)
        fixture = _revision_fixture(session_maker, storage)
        session = session_maker()
        job = session.get(models.AudiobookJob, fixture.job_id)
        edition = session.get(models.AudiobookEdition, fixture.edition_id)
        output = storage.job_dir(job.id) / "revision-output"
        chapter = _write_chapter_files(output, 1, "new")
        chapter["audio"] = "../../outside.mp3"
        _write_manifest(output, [chapter])

        try:
            scheduler._commit_revision_output(job, edition, output)
        except ValueError as exc:
            assert "路径" in str(exc)
        else:
            raise AssertionError("修订 manifest 不应允许暂存目录外的资产路径")

        assert fixture.baseline_path.read_bytes() == fixture.baseline_bytes
        assert not (storage.edition_dir(fixture.edition_id) / f"versions/job-{job.id}").exists()
        job.status = "failed"
        job.error_code = "ValueError"
        job.attempts = 2
        session.commit()
        reset_for_retry(storage, job)
        session.commit()
        assert not (output / "manifest.v2.json").exists()
        assert (output / "manifest.invalid-attempt-2.json").is_file()
        session.close()


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
