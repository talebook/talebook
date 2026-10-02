import datetime
import json
import subprocess
import sys
import time
import wave
from types import SimpleNamespace
from unittest import mock

import pytest

from tests.test_audiobook_reliability import (
    _revision_fixture,
    _scheduler,
    _session_maker,
    _write_chapter_files,
    _write_manifest,
)
from webserver import models
from webserver.handlers.audiobook import _job_dict
from webserver.services.audiobook import (
    PROGRESS_SCHEMA,
    AudiobookStorage,
    VoicebookProcess,
    audiobook_job_generation,
    audiobook_job_plan,
    reset_for_retry,
)


@pytest.fixture
def running_job(tmp_path):
    maker = _session_maker()
    storage = AudiobookStorage(tmp_path)
    storage.ensure()
    fixture = _revision_fixture(maker, storage)
    scheduler = _scheduler(maker, storage)
    scheduler._begin_invocation(fixture.job_id, 2, "GENERATING")
    session = maker()
    job = session.get(models.AudiobookJob, fixture.job_id)
    yield SimpleNamespace(scheduler=scheduler, session=session, job=job, storage=storage)
    session.close()


def event(job, seq, *, completed=1, total=4, status="running", stage="synthesizing", **extra):
    invocation = job.data["voicebook_invocation"]
    timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    snapshot = {
        "schema": PROGRESS_SCHEMA,
        "status": status,
        "stage": stage,
        "unit": "speech_segment",
        "total": total,
        "completed": completed,
        "active": 0,
        "retrying": 0,
        "failed": 0,
        "cancelled": 0,
        "pending": total - completed,
        "queued": 0,
        "active_requests": 0,
        "concurrency": 3,
        "retries": 0,
        "cache_hits": 0,
        "chapters_total": 1,
        "chapters_completed": 0,
        "updated_at": timestamp,
        "waiting": None,
    }
    return {
        "schema": PROGRESS_SCHEMA,
        "task_id": invocation["task_id"],
        "attempt_id": invocation["attempt_id"],
        "seq": seq,
        "event": "heartbeat",
        "at": timestamp,
        "snapshot": snapshot,
        **extra,
    }


def refresh(fixture):
    fixture.session.expire_all()
    return fixture.session.get(models.AudiobookJob, fixture.job.id)


def test_absolute_counts_survive_duplicate_out_of_order_and_refresh(running_job):
    f = running_job
    f.scheduler._consume_event(f.job.id, event(f.job, 5, completed=2))
    f.scheduler._consume_event(f.job.id, event(f.job, 5, completed=3))
    f.scheduler._consume_event(f.job.id, event(f.job, 2, completed=1))
    f.scheduler._consume_event(f.job.id, event(f.job, 6, completed=2))
    job = refresh(f)
    public = _job_dict(job)
    assert public["generation"]["snapshot"]["completed"] == 2
    assert public["generation"]["seq"] == 6
    assert public["generation"]["connection"] == "live"
    assert public["plan"]["overall_percent"] is None
    assert job.progress == 0


@pytest.mark.parametrize(
    "field,value",
    [
        ("task_id", "other-book"),
        ("attempt_id", "old-attempt"),
        ("schema", "voicebook-progress.v9"),
        ("seq", True),
        ("seq", "1"),
        ("seq", 0),
    ],
)
def test_wrong_identity_version_and_sequence_cannot_overwrite(running_job, field, value):
    f = running_job
    f.scheduler._consume_event(f.job.id, {**event(f.job, 1), field: value})
    job = refresh(f)
    assert job.last_event_seq == -1
    assert not audiobook_job_generation(job)["available"]


def test_invalid_snapshot_does_not_replace_confirmed_state(running_job):
    f = running_job
    f.scheduler._consume_event(f.job.id, event(f.job, 1))
    bad = event(f.job, 2)
    bad["snapshot"]["completed"] = 100
    f.scheduler._consume_event(f.job.id, bad)
    assert refresh(f).data["generation"]["completed"] == 1
    assert f.job.last_event_seq == 1


def test_lost_lease_rejects_previous_workers_events(running_job):
    f = running_job
    f.job.lease_owner = "new-worker"
    f.session.commit()
    f.scheduler._consume_event(f.job.id, event(f.job, 1))
    assert not audiobook_job_generation(refresh(f))["available"]


def test_retry_clears_old_percentage_errors_counts_and_attempt(running_job):
    f = running_job
    old = event(f.job, 100, completed=3)
    f.scheduler._consume_event(f.job.id, old)
    job = refresh(f)
    job.status = "failed"
    job.progress = 0.95
    job.error_message = "old failure"
    f.session.commit()
    reset_for_retry(f.storage, job)
    f.session.commit()
    assert not audiobook_job_generation(job)["available"]
    assert job.progress == 0
    assert not job.error_message
    job.status = "generating"
    job.lease_owner = "test-worker"
    f.session.commit()
    f.scheduler._begin_invocation(job.id, 2, "GENERATING")
    job = refresh(f)
    assert job.data["voicebook_invocation"]["attempt_id"] != old["attempt_id"]
    f.scheduler._consume_event(job.id, old)
    f.scheduler._consume_event(job.id, event(job, 1, completed=0))
    assert refresh(f).data["generation"]["completed"] == 0
    assert f.job.last_event_seq == 1


@pytest.mark.parametrize(
    "status,reason",
    [
        ("rate_queued", "request_interval"),
        ("rate_limit_retry", "rate_limited"),
        ("retrying", "network_error"),
        ("cooling_down", "shared_cooldown"),
    ],
)
def test_waiting_keeps_real_counts_and_next_request_plan(running_job, status, reason):
    f = running_job
    waiting = event(f.job, 1, completed=2, status=status)
    waiting["snapshot"]["waiting"] = {
        "reason": reason,
        "retry_count": 2,
        "next_request_at": "2030-01-01T00:00:00Z",
        "unit_id": "must-not-retain-extra-data",
        "text": "must-not-retain-text",
    }
    f.scheduler._consume_event(f.job.id, waiting)
    snapshot = _job_dict(refresh(f))["generation"]["snapshot"]
    assert snapshot["completed"] == 2
    assert snapshot["status"] == status
    assert snapshot["waiting"] == {
        "reason": reason,
        "retry_count": 2,
        "next_request_at": "2030-01-01T00:00:00Z",
    }


def test_scheduler_heartbeat_does_not_hide_stalled_progress(running_job):
    f = running_job
    f.scheduler._consume_event(f.job.id, event(f.job, 1))
    job = refresh(f)
    invocation = {**job.data["voicebook_invocation"], "last_received_at": "2020-01-01T00:00:00+00:00"}
    job.data = {**job.data, "voicebook_invocation": invocation}
    f.session.commit()
    assert f.scheduler._control(job.id)["lease_owned"]
    assert audiobook_job_generation(refresh(f))["connection"] == "stale"
    assert job.data["generation"]["completed"] == 1


def test_generator_completed_does_not_complete_host_and_failed_event_keeps_reason(running_job):
    f = running_job
    f.scheduler._consume_event(
        f.job.id, event(f.job, 1, completed=4, status="completed", stage="completed", event="completed")
    )
    job = refresh(f)
    assert job.status == "generating"
    assert audiobook_job_plan(job)["overall_percent"] is None
    f.scheduler._consume_event(
        job.id,
        event(job, 2, event="failed", status="failed", code="WaitBudgetExceeded", message="累计等待已耗尽", retryable=True),
    )
    assert refresh(f).error_code == "WaitBudgetExceeded"
    assert f.job.error_message == "累计等待已耗尽"


@pytest.mark.parametrize("problem", ["incomplete", "empty_audio", "invalid_timeline"])
def test_unusable_output_never_completes_host(running_job, problem):
    f = running_job
    job = f.job
    job.data = {**job.data, "revision": {}}
    job.status = "finalizing"
    f.session.commit()
    directory = f.storage.edition_dir(job.edition_id)
    chapter = _write_chapter_files(directory, 1, "new")
    _write_manifest(directory, [chapter], status="running" if problem == "incomplete" else "completed")
    if problem == "empty_audio":
        (directory / chapter["audio"]).write_bytes(b"")
    elif problem == "invalid_timeline":
        (directory / chapter["timeline"]).write_text("invalid", encoding="utf-8")
    with pytest.raises(ValueError):
        f.scheduler._finalize(job.id)
    assert refresh(f).status != "completed"
    assert f.job.progress == 0


def test_valid_output_finishes_host_only_after_database_commit(running_job):
    f = running_job
    f.job.data = {**f.job.data, "revision": {}}
    f.job.chapter_selection = ""
    f.job.status = "finalizing"
    f.session.commit()
    directory = f.storage.edition_dir(f.job.edition_id)
    _write_manifest(directory, [_write_chapter_files(directory, 1, "new")])
    f.scheduler._finalize(f.job.id)
    assert refresh(f).status == "completed"
    assert f.job.progress == 1
    assert audiobook_job_plan(f.job)["overall_percent"] == 100


def test_cancel_at_publication_boundary_does_not_complete(running_job):
    f = running_job
    f.job.cancel_requested = True
    f.session.commit()
    f.scheduler._finalize(f.job.id)
    assert refresh(f).status == "cancelled"
    assert f.job.progress == 0


def test_all_workers_books_engines_use_same_budget_and_configuration(tmp_path):
    config = {"VOICEBOOK_EDGE_BUDGET_PATH": "", "VOICEBOOK_EDGE_INTERVAL": 7, "VOICEBOOK_EDGE_MAX_CONCURRENCY": 2}
    with mock.patch.dict("webserver.services.audiobook.CONF", config):
        options = [
            VoicebookProcess(AudiobookStorage(tmp_path)).generation_options(engine)
            for engine in ("edgetts", "edgetts", "qwen3tts")
        ]
    for args in options:
        assert args[args.index("--edge-budget-path") + 1] == str(tmp_path / "rate-limits/edge-budget.sqlite3")
        assert args[args.index("--edge-interval") + 1] == "7"
        assert args[args.index("--edge-max-concurrency") + 1] == "2"
    assert options[0][options[0].index("--concurrency") + 1] == "1"
    assert options[2][options[2].index("--concurrency") + 1] == "2"


def test_relative_custom_budget_is_rejected(tmp_path):
    with mock.patch.dict("webserver.services.audiobook.CONF", {"VOICEBOOK_EDGE_BUDGET_PATH": "job/budget.sqlite3"}):
        with pytest.raises(ValueError, match="绝对路径"):
            VoicebookProcess(AudiobookStorage(tmp_path)).generation_options("edgetts")


@pytest.mark.parametrize("version,expected", [("voicebook-tool 0.7.1", 1), ("voicebook-tool 0.8.0", 2), ("unknown", 1)])
def test_legacy_cli_detection(version, expected, tmp_path):
    with mock.patch.object(VoicebookProcess, "health", return_value={"ok": True, "version": version}):
        assert VoicebookProcess(AudiobookStorage(tmp_path)).progress_version() == expected


def test_subprocess_receives_registered_identity_and_shared_options(running_job):
    f = running_job
    command = [sys.executable, "-u", "-c", "import json,sys; print(json.dumps({'args':sys.argv[1:]}))"]
    records = []
    with mock.patch.object(VoicebookProcess, "command", new_callable=mock.PropertyMock, return_value=command):
        assert VoicebookProcess(f.storage).run(f.job, ["generate", "book.script", "--engine", "edgetts"], records.append) == 0
    args = records[0]["args"]
    assert args[args.index("--progress-version") + 1] == "2"
    assert args[args.index("--attempt-id") + 1] == f.job.data["voicebook_invocation"]["attempt_id"]
    assert args[args.index("--task-id") + 1] == f"talebook-job-{f.job.id}"
    assert args[args.index("--edge-budget-path") + 1] == str(f.storage.root / "rate-limits/edge-budget.sqlite3")
    assert not json.loads((f.storage.job_dir(f.job.id) / "events.jsonl").read_text()).get("snapshot")


def test_pinned_voicebook_generates_real_audio_and_host_publishes(running_job):
    """Exercise the pinned producer, real JSONL snapshots, persistence and publication offline."""
    from book2audio.machine import ProgressEmitter
    from book2audio.tool_pipeline import generate_audio

    f = running_job
    directory = f.storage.edition_dir(f.job.edition_id)
    script = directory / "book.script"
    script.write_text(
        script.read_text().replace("[旁白] 第一章。", "\n".join(f"[旁白] 测试片段{i}。" for i in range(4))), encoding="utf-8"
    )
    records = []

    class Stream:
        def write(self, text):
            row = json.loads(text)
            records.append(row)
            f.scheduler._consume_event(f.job.id, row)

        def flush(self):
            pass

    class Synthesizer:
        def synthesize(self, text, voice, engine, output):
            time.sleep(0.025 if "片段0" in text else 0.01)
            with wave.open(str(output), "wb") as audio:
                audio.setnchannels(1)
                audio.setsampwidth(2)
                audio.setframerate(24000)
                audio.writeframes(b"\x10\x00" * 1200)

    invocation = f.job.data["voicebook_invocation"]
    generate_audio(
        script,
        directory,
        engine="qwen3tts",
        synthesizer=Synthesizer(),
        concurrency=3,
        progress=ProgressEmitter(Stream(), version=2, task_id=invocation["task_id"], attempt_id=invocation["attempt_id"]),
    )
    job = refresh(f)
    assert job.data["generation"]["completed"] == job.data["generation"]["total"] == 7
    assert job.data["generation"]["status"] == "completed"
    assert max(row.get("snapshot", {}).get("active_requests", 0) for row in records) in {2, 3}
    assert job.status == "generating" and job.progress == 0
    assert json.loads((directory / ".voicebook/progress.v2.json").read_text())["attempt_id"] == invocation["attempt_id"]
    job.data = {**job.data, "revision": {}}
    job.status = "finalizing"
    f.session.commit()
    f.scheduler._finalize(job.id)
    assert refresh(f).status == "completed"
    assert f.session.query(models.AudiobookChapter).filter_by(edition_id=job.edition_id).count() == 2


def test_two_processes_share_the_host_budget_and_reject_conflicting_config(tmp_path):
    from book2audio.edge_budget import EdgeBudget

    process = VoicebookProcess(AudiobookStorage(tmp_path))
    options = process.generation_options("edgetts")
    path = options[options.index("--edge-budget-path") + 1]
    first = EdgeBudget(path)
    assert first.poll("first-worker").admitted
    first.start("first-worker")
    code = """import json,sys
from book2audio.edge_budget import EdgeBudget
budget=EdgeBudget(sys.argv[1])
admission=budget.poll('second-worker')
print(json.dumps({'admitted':admission.admitted,'reason':admission.reason}))
try:
    EdgeBudget(sys.argv[1], concurrency=2)
except ValueError:
    print('configuration-rejected')
else:
    raise AssertionError('worker config must not silently diverge')
"""
    result = subprocess.run([sys.executable, "-c", code, path], capture_output=True, text=True, timeout=10, check=True)
    admission = json.loads(result.stdout.splitlines()[0])
    assert not admission["admitted"]
    assert admission["reason"] in {"request_interval", "global_concurrency"}
    assert "configuration-rejected" in result.stdout
