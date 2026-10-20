"""Real database interleavings at the write boundary; no provider calls."""

import datetime
import time
from contextlib import contextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

import pytest
from sqlalchemy import create_engine
from sqlalchemy import event as sql_event
from sqlalchemy.orm import sessionmaker

from tests.test_audiobook_progress_v2 import event
from tests.test_audiobook_reliability import _revision_fixture, _scheduler, _write_chapter_files, _write_manifest
from webserver import models
from webserver.handlers.audiobook import AudiobookWorkspace
from webserver.services.audiobook import (
    AudiobookLeaseLost,
    AudiobookStorage,
    VoicebookProcess,
    request_cancel,
    reset_for_retry,
)


@pytest.fixture
def database(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'jobs.sqlite3'}")
    maker = sessionmaker(bind=engine)
    models.Base.metadata.create_all(engine)
    storage = AudiobookStorage(tmp_path / "audio")
    storage.ensure()
    fixture = _revision_fixture(maker, storage)
    scheduler = _scheduler(maker, storage)
    scheduler._begin_invocation(fixture.job_id, 2, "GENERATING")
    yield SimpleNamespace(engine=engine, maker=maker, storage=storage, scheduler=scheduler, **vars(fixture))
    engine.dispose()


@contextmanager
def before_job_update(database, callback, *, after_updates=0):
    """Pause before the actual database UPDATE, including guarded bulk writes."""
    calls = []
    writes = 0

    def pause(_connection, _cursor, statement, _parameters, _context, _many):
        nonlocal writes
        if calls or not statement.startswith("UPDATE audiobook_jobs"):
            return
        writes += 1
        if writes <= after_updates:
            return
        calls.append(True)
        callback()

    sql_event.listen(database.engine, "before_cursor_execute", pause)
    try:
        yield calls
    finally:
        sql_event.remove(database.engine, "before_cursor_execute", pause)
    assert calls, "The competing transaction must run before the real write"


def read_event(database, seq, completed=2):
    with database.maker() as session:
        return event(session.get(models.AudiobookJob, database.job_id), seq, completed=completed)


def prepare_publication(database):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.status = "finalizing"
        job.phase = "FINALIZING"
        job.chapter_selection = ""
        job.data = {**job.data, "revision": {}}
        session.get(models.AudiobookEdition, database.source_id).status = "historical"
        session.commit()
    directory = database.storage.edition_dir(database.edition_id)
    return _write_manifest(directory, [_write_chapter_files(directory, 1, "valid")])


def assert_unpublished(database, status):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        edition = session.get(models.AudiobookEdition, database.edition_id)
        assert job.status == status
        assert job.progress == 0
        assert edition.status == "draft"
        assert edition.manifest_path == database.storage.relative(database.baseline_path)


def test_old_event_cannot_overwrite_real_recovery_and_new_heartbeat(database):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.lease_until = datetime.datetime.now() + datetime.timedelta(milliseconds=100)
        session.commit()
        old = event(job, 7, completed=2)
    replacement = _scheduler(database.maker, database.storage)
    replacement.worker_id = "replacement-worker"
    new_attempts = []

    def process(job_id, _identity=None):
        replacement._begin_invocation(job_id, 2, "GENERATING")
        new = read_event(database, 1, completed=0)
        new_attempts.append(new["attempt_id"])
        replacement._consume_event(job_id, new)

    def recover():
        time.sleep(0.12)
        with mock.patch.object(replacement, "_process", side_effect=process):
            with mock.patch.object(replacement, "_has_capacity", return_value=True):
                assert replacement.run_once()

    with before_job_update(database, recover):
        database.scheduler._consume_event(database.job_id, old)
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        assert job.lease_owner == "replacement-worker"
        assert job.data["voicebook_invocation"]["attempt_id"] == new_attempts[0] != old["attempt_id"]
        assert job.last_event_seq == 1
        assert job.data["generation"]["completed"] == 0
    replacement._consume_event(database.job_id, read_event(database, 2, completed=1))
    with database.maker() as session:
        assert session.get(models.AudiobookJob, database.job_id).last_event_seq == 2


@pytest.mark.parametrize("change", ["owner", "attempt", "sequence", "status"])
def test_event_guard_detects_each_competing_change(database, change):
    old = read_event(database, 7)

    def compete():
        if change == "attempt":
            # Same worker, status and reset sequence: identity must still fence the write.
            database.scheduler._begin_invocation(database.job_id, 2, "GENERATING")
        elif change == "sequence":
            database.scheduler._consume_event(database.job_id, read_event(database, 8, completed=3))
        else:
            with database.maker() as session:
                job = session.get(models.AudiobookJob, database.job_id)
                if change == "owner":
                    job.lease_owner = "replacement-worker"
                else:
                    job.status = "completed"
                    job.progress = 1
                session.commit()

    with before_job_update(database, compete):
        database.scheduler._consume_event(database.job_id, old)
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        assert job.last_event_seq == (8 if change == "sequence" else -1)
        if change == "sequence":
            assert job.data["generation"]["completed"] == 3
        else:
            assert "generation" not in job.data
        if change == "attempt":
            assert job.data["voicebook_invocation"]["attempt_id"] != old["attempt_id"]
        if change == "status":
            assert job.status == "completed" and job.progress == 1


@pytest.mark.parametrize("boundary", ["manifest", "write"])
def test_cancel_committed_before_publication_guard_wins(database, boundary):
    manifest = prepare_publication(database)

    def cancel():
        with database.maker() as session:
            assert request_cancel(database.storage, session.get(models.AudiobookJob, database.job_id))
            session.commit()

    if boundary == "write":
        with before_job_update(database, cancel):
            assert database.scheduler._finalize(database.job_id) is False
    else:
        original = Path.read_text
        cancelled = []

        def read(path, *args, **kwargs):
            text = original(path, *args, **kwargs)
            if path == manifest and not cancelled:
                cancelled.append(True)
                cancel()
            return text

        with mock.patch.object(Path, "read_text", read):
            assert database.scheduler._finalize(database.job_id) is False
        assert cancelled
    assert_unpublished(database, "cancelled")


@pytest.mark.parametrize("change", ["owner", "attempt", "expired"])
def test_publication_losing_ownership_or_identity_leaves_edition_untouched(database, change):
    prepare_publication(database)

    def compete():
        with database.maker() as session:
            job = session.get(models.AudiobookJob, database.job_id)
            if change == "owner":
                job.lease_owner = "replacement-worker"
            elif change == "expired":
                job.lease_until = datetime.datetime.now() - datetime.timedelta(seconds=1)
            else:
                job.data = {**job.data, "voicebook_invocation": {**job.data["voicebook_invocation"], "attempt_id": "new"}}
            session.commit()

    with before_job_update(database, compete):
        assert database.scheduler._finalize(database.job_id) is False
    assert_unpublished(database, "finalizing")


def test_publication_wins_over_cancel_request_with_stale_read(database):
    prepare_publication(database)
    with database.maker() as cancellation:
        stale = cancellation.get(models.AudiobookJob, database.job_id)
        assert stale.status == "finalizing"
        assert database.scheduler._finalize(database.job_id) is True
        assert request_cancel(database.storage, stale) is False
        cancellation.commit()
    assert not (database.storage.job_dir(database.job_id) / "cancel").exists()
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        assert job.status == "completed" and job.progress == 1 and not job.cancel_requested
        assert session.get(models.AudiobookEdition, database.edition_id).status == "published"
    # A late cancellation finisher must not change the publication either.
    database.scheduler._finish_cancelled(database.job_id)
    assert database.scheduler._finalize(database.job_id) is False
    with database.maker() as session:
        assert session.get(models.AudiobookJob, database.job_id).status == "completed"


def test_publication_transaction_rolls_back_job_edition_and_chapters_together(database):
    prepare_publication(database)
    with database.maker() as session:
        originals = [(row.number, row.content_hash) for row in session.query(models.AudiobookChapter).all()]

    def reject_insert(_connection, _cursor, statement, _parameters, _context, _many):
        if statement.startswith("INSERT INTO audiobook_chapters"):
            raise RuntimeError("interrupted chapter write")

    sql_event.listen(database.engine, "before_cursor_execute", reject_insert)
    try:
        with pytest.raises(RuntimeError, match="interrupted chapter write"):
            database.scheduler._finalize(database.job_id)
    finally:
        sql_event.remove(database.engine, "before_cursor_execute", reject_insert)
    assert_unpublished(database, "finalizing")
    with database.maker() as session:
        assert [(row.number, row.content_hash) for row in session.query(models.AudiobookChapter).all()] == originals


def test_old_cancellation_finisher_cannot_modify_replacement_worker(database):
    def takeover():
        with database.maker() as session:
            session.get(models.AudiobookJob, database.job_id).lease_owner = "replacement-worker"
            session.commit()

    with before_job_update(database, takeover):
        database.scheduler._finish_cancelled(database.job_id)
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        assert job.lease_owner == "replacement-worker" and job.status == "generating"


def replacement_attempt(database, *, same_owner=False):
    replacement = _scheduler(database.maker, database.storage)
    replacement.worker_id = database.scheduler.worker_id if same_owner else "replacement-worker"
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.lease_owner = replacement.worker_id
        job.attempts += 1
        job.status = "generating"
        job.lease_until = datetime.datetime.now() + datetime.timedelta(minutes=1)
        session.commit()
    replacement._begin_invocation(database.job_id, 2, "GENERATING")
    replacement._consume_event(database.job_id, read_event(database, 1, completed=0))
    return replacement


def job_state(database):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        return {column.key: getattr(job, column.key) for column in models.AudiobookJob.__table__.columns}


def test_attempt_registration_cannot_overwrite_real_recovery(database):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.lease_until = datetime.datetime.now() + datetime.timedelta(milliseconds=100)
        session.commit()
    replacement = _scheduler(database.maker, database.storage)
    replacement.worker_id = "replacement-worker"
    attempts = []

    def process(job_id, identity=None):
        replacement._begin_invocation(job_id, 2, "GENERATING", identity)
        current = read_event(database, 1, completed=0)
        attempts.append(current["attempt_id"])
        replacement._consume_event(job_id, current)

    def recover():
        time.sleep(0.12)
        with mock.patch.object(replacement, "_process", side_effect=process):
            with mock.patch.object(replacement, "_has_capacity", return_value=True):
                assert replacement.run_once()

    with before_job_update(database, recover):
        with pytest.raises(AudiobookLeaseLost):
            database.scheduler._begin_invocation(database.job_id, 2, "GENERATING")
    current = job_state(database)
    assert current["lease_owner"] == replacement.worker_id
    assert current["data"]["voicebook_invocation"]["attempt_id"] == attempts[0]
    assert current["last_event_seq"] == 1 and current["data"]["generation"]["completed"] == 0
    replacement._consume_event(database.job_id, read_event(database, 2, completed=1))
    assert job_state(database)["last_event_seq"] == 2


@pytest.mark.parametrize("operation", ["begin", "control", "failed", "cancelled"])
@pytest.mark.parametrize("change", ["owner", "attempt", "claim", "sequence", "expired", "status", "cancel"])
def test_worker_writes_preserve_competing_transaction(database, operation, change):
    before = job_state(database)
    identity = (
        before["lease_owner"],
        before["attempts"],
        before["data"]["voicebook_invocation"]["attempt_id"],
    )
    expected = []

    def compete():
        with database.maker() as session:
            job = session.get(models.AudiobookJob, database.job_id)
            if change == "owner":
                job.lease_owner = "replacement-worker"
            elif change == "attempt":
                job.data = {**job.data, "voicebook_invocation": {**job.data["voicebook_invocation"], "attempt_id": "new"}}
            elif change == "claim":
                job.attempts += 1
            elif change == "sequence":
                job.last_event_seq = 9
            elif change == "expired":
                job.lease_until = datetime.datetime.now() - datetime.timedelta(seconds=1)
            elif change == "status":
                job.status = "completed"
                job.progress = 1
            else:
                assert request_cancel(database.storage, job)
            session.commit()
        expected.append(job_state(database))

    with before_job_update(database, compete):
        if operation == "begin":
            with pytest.raises(AudiobookLeaseLost):
                database.scheduler._begin_invocation(database.job_id, 2, "GENERATING", identity)
        elif operation == "control":
            control = database.scheduler._control(database.job_id, identity)
            assert control["lease_owned"] is (change in {"sequence", "cancel"})
            if change == "cancel":
                assert control["cancel_requested"]
        elif operation == "failed":
            database.scheduler._finish_failed(database.job_id, identity, RuntimeError("old failure"))
        else:
            database.scheduler._finish_cancelled(database.job_id, identity)
    assert job_state(database) == expected[0]


def test_lease_expiring_during_sql_pause_cannot_be_resurrected(database):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.lease_until = datetime.datetime.now() + datetime.timedelta(milliseconds=100)
        session.commit()
    before = job_state(database)
    with before_job_update(database, lambda: time.sleep(0.12)):
        with pytest.raises(AudiobookLeaseLost):
            database.scheduler._begin_invocation(database.job_id, 2, "GENERATING")
    assert job_state(database) == before
    assert not database.scheduler._control(database.job_id)["lease_owned"]


def test_old_control_and_failure_cannot_adopt_same_owner_new_attempt(database):
    before = job_state(database)
    identity = (before["lease_owner"], before["attempts"], before["data"]["voicebook_invocation"]["attempt_id"])
    replacement_attempt(database, same_owner=True)
    current = job_state(database)
    assert not database.scheduler._control(database.job_id, identity)["lease_owned"]
    database.scheduler._finish_failed(database.job_id, identity, RuntimeError("old failure"))
    database.scheduler._finish_cancelled(database.job_id, identity)
    assert job_state(database) == current


@pytest.mark.parametrize("boundary", [0, 1, 2, 3])
def test_process_stops_at_losing_stage_write_and_preserves_new_worker(database, boundary):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.data = {**job.data, "inspected": False, "revision": {}}
        job.status = "inspecting"
        job.mode = "quick"
        session.get(models.AudiobookEdition, database.edition_id).script_path = ""
        session.commit()
    replacements = []

    def run(_process, _job, arguments, _on_event, _on_control):
        if arguments[0] == "generate":
            output = Path(arguments[arguments.index("-o") + 1])
            _write_manifest(output, [_write_chapter_files(output, 1, "new")])
        return 0

    with (
        mock.patch.object(VoicebookProcess, "progress_version", return_value=2),
        mock.patch.object(VoicebookProcess, "run", autospec=True, side_effect=run) as producer,
        before_job_update(database, lambda: replacements.append(replacement_attempt(database)), after_updates=boundary),
    ):
        database.scheduler._process(database.job_id)
    assert producer.call_count == [0, 1, 1, 2][boundary]
    current = job_state(database)
    assert current["status"] == "generating" and current["lease_owner"] == "replacement-worker"
    assert current["last_event_seq"] == 1 and current["data"]["generation"]["completed"] == 0
    assert not current["error_message"]
    if boundary < 2:
        with database.maker() as session:
            assert session.get(models.AudiobookEdition, database.edition_id).script_path == ""
    replacements[0]._consume_event(database.job_id, read_event(database, 2, completed=1))
    assert job_state(database)["last_event_seq"] == 2


def test_recovery_cannot_reset_a_terminal_job_at_sql_boundary(database):
    with database.maker() as session:
        session.get(models.AudiobookJob, database.job_id).lease_until = datetime.datetime.now() - datetime.timedelta(seconds=1)
        session.commit()

    def complete():
        with database.maker() as session:
            job = session.get(models.AudiobookJob, database.job_id)
            job.status = "completed"
            job.progress = 1
            session.commit()

    with before_job_update(database, complete), mock.patch.object(database.scheduler, "_process") as producer:
        assert database.scheduler.run_once() is False
        producer.assert_not_called()
    assert job_state(database)["status"] == "completed"


def test_old_claim_cannot_start_a_same_owner_replacement_call(database):
    before = job_state(database)
    identity = (before["lease_owner"], before["attempts"], before["data"]["voicebook_invocation"]["attempt_id"])
    replacement_attempt(database, same_owner=True)
    current = job_state(database)
    with mock.patch.object(VoicebookProcess, "run") as producer:
        database.scheduler._process(database.job_id, identity)
        producer.assert_not_called()
    assert job_state(database) == current


@pytest.mark.parametrize("version", [1, 2])
def test_old_process_event_cannot_cross_same_owner_new_claim(database, version):
    expected = []

    def run(_process, _job, _arguments, on_event, _on_control):
        # A replacement thread in this scheduler has committed its claim but
        # has not yet registered the new invocation. Its inherited attempt ID
        # therefore still matches the old v2 envelope; v1 has no envelope ID.
        with database.maker() as session:
            job = session.get(models.AudiobookJob, database.job_id)
            old_event = (
                event(job, 7, completed=2)
                if version == 2
                else {
                    "event": "chapter_started",
                    "seq": 7,
                    "chapter_number": 9,
                    "total_segments": 2,
                }
            )
            job.attempts += 1
            session.commit()
        expected.append(job_state(database))
        on_event(old_event)
        return 0

    with (
        mock.patch.object(VoicebookProcess, "progress_version", return_value=version),
        mock.patch.object(VoicebookProcess, "run", autospec=True, side_effect=run),
    ):
        database.scheduler._process(database.job_id)
    assert job_state(database) == expected[0]
    identity = database.scheduler._begin_invocation(database.job_id, 2, "GENERATING")
    database.scheduler._consume_event(database.job_id, read_event(database, 1, completed=0), identity)
    database.scheduler._consume_event(database.job_id, read_event(database, 2, completed=1), identity)
    assert job_state(database)["last_event_seq"] == 2


@pytest.mark.parametrize("operation", ["retry", "review"])
def test_stale_request_cannot_reset_or_confirm_replacement_worker(database, operation):
    with database.maker() as session:
        job = session.get(models.AudiobookJob, database.job_id)
        job.status = "failed" if operation == "retry" else "awaiting_review"
        job.lease_owner = ""
        job.lease_until = None
        session.commit()
    cancel = database.storage.job_dir(database.job_id) / "cancel"
    cancel.parent.mkdir(parents=True, exist_ok=True)
    expected = []

    def compete():
        replacement_attempt(database)
        cancel.write_text("replacement cancellation")
        expected.append(job_state(database))

    with database.maker() as session, before_job_update(database, compete):
        job = session.get(models.AudiobookJob, database.job_id)
        if operation == "retry":
            assert reset_for_retry(database.storage, job) is False
        else:
            assert AudiobookWorkspace._reserve_review(SimpleNamespace(session=session), job) is False
    assert job_state(database) == expected[0]
    assert cancel.read_text() == "replacement cancellation"
