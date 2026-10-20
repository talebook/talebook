"""Independent, deterministic transaction interleavings; no provider calls."""
import datetime
import json
import pathlib
import sys
import tempfile
import time
from unittest import mock

from sqlalchemy import create_engine, event as sql_event
from sqlalchemy.orm import sessionmaker
from tests.test_audiobook_reliability import _revision_fixture, _scheduler, _write_chapter_files, _write_manifest
from webserver import models
from webserver.services.audiobook import AudiobookStorage, request_cancel

def event(job, seq, completed):
    invocation = job.data['voicebook_invocation']
    stamp = datetime.datetime.now(datetime.timezone.utc).isoformat()
    return {
        'schema': 'voicebook-progress.v2', 'seq': seq, 'event': 'heartbeat', 'at': stamp,
        'task_id': invocation['task_id'], 'attempt_id': invocation['attempt_id'],
        'snapshot': {
            'schema': 'voicebook-progress.v2', 'unit': 'speech_segment',
            'status': 'running', 'stage': 'synthesizing', 'total': 4,
            'completed': completed, 'active': 0, 'retrying': 0, 'failed': 0,
            'cancelled': 0, 'pending': 4 - completed, 'queued': 0,
            'active_requests': 0, 'concurrency': 1, 'retries': 0, 'cache_hits': 0,
            'chapters_total': 1, 'chapters_completed': 0, 'requests_started': 0,
            'updated_at': stamp, 'waiting': None,
        },
    }

def fixture(root):
    maker = sessionmaker(bind=create_engine('sqlite:///' + str(root / 'jobs.sqlite3')))
    models.Base.metadata.create_all(maker.kw['bind'])
    storage = AudiobookStorage(root / 'audio')
    storage.ensure()
    f = _revision_fixture(maker, storage)
    scheduler = _scheduler(maker, storage)
    if hasattr(scheduler, '_begin_invocation'):
        scheduler._begin_invocation(f.job_id, 2, 'GENERATING')
    return maker, storage, f, scheduler

def lease_interleaving(root):
    maker, storage, f, scheduler = fixture(root)
    with maker() as s:
        job = s.get(models.AudiobookJob, f.job_id)
        job.lease_until = datetime.datetime.now() + datetime.timedelta(milliseconds=100)
        s.commit()
        old = event(job, 7, completed=2)
    intercepted = False
    new_attempt = None
    replacement = _scheduler(maker, storage)
    replacement.worker_id = 'replacement-worker'
    def takeover(session, _context, _instances):
        nonlocal intercepted, new_attempt
        if intercepted or not any(isinstance(j, models.AudiobookJob) and j.lease_owner == scheduler.worker_id for j in session.dirty):
            return
        intercepted = True
        time.sleep(0.12)  # Original read was valid; lease expires before its write.
        # Use the real recovery/claim and invocation/event code. Only the
        # provider process is replaced by an offline zero-count heartbeat.
        def process(job_id):
            nonlocal new_attempt
            replacement._begin_invocation(job_id, 2, 'GENERATING')
            with maker() as read:
                job = read.get(models.AudiobookJob, job_id)
                new_attempt = job.data['voicebook_invocation']['attempt_id']
                new_event = event(job, 1, completed=0)
            replacement._consume_event(job_id, new_event)
        replacement._process = process
        replacement._has_capacity = lambda: True
        assert replacement.run_once()
    sql_event.listen(maker, 'before_flush', takeover)
    try:
        scheduler._consume_event(f.job_id, old)
    finally:
        sql_event.remove(maker, 'before_flush', takeover)
    with maker() as s:
        job = s.get(models.AudiobookJob, f.job_id)
        result = {'lease_owner': job.lease_owner, 'attempt_id': job.data['voicebook_invocation']['attempt_id'], 'seq': job.last_event_seq, 'completed': job.data['generation']['completed'], 'old_attempt': old['attempt_id'], 'new_attempt_before_old_commit': new_attempt, 'interleaving_executed': intercepted}
    assert intercepted
    result['old_event_overwrote_new_attempt'] = result['attempt_id'] == old['attempt_id'] and result['lease_owner'] == 'replacement-worker'
    new_event = {**old, 'attempt_id': new_attempt, 'seq': 2}
    replacement._consume_event(f.job_id, new_event)
    with maker() as s:
        job = s.get(models.AudiobookJob, f.job_id)
        result['replacement_heartbeat_accepted'] = job.last_event_seq == 2 and job.data['voicebook_invocation']['attempt_id'] == new_attempt
    return result

def cancellation_interleaving(root):
    maker, storage, f, scheduler = fixture(root)
    with maker() as s:
        job = s.get(models.AudiobookJob, f.job_id)
        job.data = {**job.data, 'revision': {}}
        job.chapter_selection = ''
        job.status = 'finalizing'
        edition_id = job.edition_id
        s.query(models.AudiobookEdition).filter(models.AudiobookEdition.status == 'published').update({'status': 'historical'})
        s.commit()
    directory = storage.edition_dir(edition_id)
    manifest = _write_manifest(directory, [_write_chapter_files(directory, 1, 'valid-test-fixture')])
    original = pathlib.Path.read_text
    cancelled = False
    def cancel_during_read(path, *args, **kwargs):
        nonlocal cancelled
        text = original(path, *args, **kwargs)
        if path == manifest and not cancelled:
            cancelled = True
            with maker() as request:
                job = request.get(models.AudiobookJob, f.job_id)
                request_cancel(storage, job)
                request.commit()
        return text
    with mock.patch.object(pathlib.Path, 'read_text', cancel_during_read):
        scheduler._finalize(f.job_id)
    with maker() as s:
        job = s.get(models.AudiobookJob, f.job_id)
        edition = s.get(models.AudiobookEdition, edition_id)
        result = {'cancel_received_before_publication': cancelled, 'cancel_requested': job.cancel_requested, 'status': job.status, 'progress': job.progress, 'edition_status': edition.status}
    result['cancelled_request_still_published'] = result['cancel_requested'] and result['edition_status'] == 'published'
    return result

results = {}
probes = [('cancel_during_finalize', cancellation_interleaving)] if '--cancel-only' in sys.argv else [('lease_interleaving', lease_interleaving), ('cancel_during_finalize', cancellation_interleaving)]
for name, probe in probes:
    with tempfile.TemporaryDirectory() as temp:
        results[name] = probe(pathlib.Path(temp))
output = '/qa/baseline-cancel-boundary.json' if '--cancel-only' in sys.argv else '/qa/backend-boundary-results.json'
pathlib.Path(output).write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(json.dumps(results, ensure_ascii=False, indent=2))
