"""Actual file, transaction and worker lifecycle regressions for scan scheduling."""

import os
import struct
import tempfile
import threading
import unittest
from pathlib import Path
from queue import Queue
from unittest import mock

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from webserver.models import ScanFile
from webserver.services.scan import ScanService, scan_operation
from webserver.services.scan_runtime import FolderEvents, MetadataCache, file_signature, full_hash, prepared_files


def setUpModule():
    from tests.test_main import setUpModule as init

    init()


class TestFilePreparation(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "book.pdf"
        self.path.write_bytes(b"%PDF-1.4 original")
        self.service = ScanService()
        self.service._cancel.clear()
        self.cache = MetadataCache()
        patch = mock.patch.object(self.service, "_metadata_cache", self.cache)
        patch.start()
        self.addCleanup(patch.stop)

    def test_reuses_metadata_and_cover_without_sharing_mutable_objects(self):
        from calibre.ebooks.metadata.book.base import Metadata

        mi = Metadata("Book", ["Author"])
        mi.cover_data = ("jpg", b"cover bytes")
        with mock.patch("calibre.ebooks.metadata.meta.get_metadata", return_value=mi) as parse:
            first = self.service._prepare_file(str(self.path))
            first["metadata"].tags.append("changed")
            second = self.service._prepare_file(str(self.path))
        self.assertEqual(parse.call_count, 1)
        self.assertEqual(second["metadata"].cover_data[1], b"cover bytes")
        self.assertNotIn("changed", second["metadata"].tags)

    def test_same_size_rewrite_invalidates_cache_even_if_mtime_restored(self):
        with mock.patch("calibre.ebooks.metadata.meta.get_metadata", return_value=None) as parse:
            first = self.service._prepare_file(str(self.path))
            st = self.path.stat()
            self.path.write_bytes(b"%PDF-1.4 modified")
            os.utime(self.path, ns=(st.st_atime_ns, st.st_mtime_ns))
            second = self.service._prepare_file(str(self.path))
        self.assertNotEqual(first["hash"], second["hash"])
        self.assertEqual(parse.call_count, 2)

    def test_persisted_hash_reused_only_for_same_file_signature(self):
        signature = file_signature(self.path)
        digest = full_hash(self.path)
        with mock.patch("webserver.services.scan.full_hash") as compute:
            with mock.patch("calibre.ebooks.metadata.meta.get_metadata", return_value=None):
                prepared = self.service._prepare_file(str(self.path), {"file_signature": signature, "content_hash": digest})
        compute.assert_not_called()
        self.assertEqual(prepared["hash"], digest)

    def test_file_changed_during_parsing_is_not_cached(self):
        def parse(*args, **kwargs):
            self.path.write_bytes(b"%PDF-1.4 replacement")

        with mock.patch("calibre.ebooks.metadata.meta.get_metadata", side_effect=parse):
            with self.assertRaises(OSError):
                self.service._prepare_file(str(self.path))
        self.assertFalse(self.cache.entries)

    def test_lru_and_byte_bounds(self):
        cache = MetadataCache(capacity=2, byte_limit=300)
        for number in range(3):
            cache.put(str(number), [number], {"hash": "small"})
        self.assertIsNone(cache.get("0", [0]))
        cache.put("big", [1], {"hash": "x" * 1000})
        self.assertNotIn("big", cache.entries)
        self.assertLessEqual(cache.size, 300)

    def test_pipeline_early_close_joins_worker_and_bounds_preparation(self):
        seen = []

        def prepare(path):
            seen.append(path)
            return path

        iterator = prepared_files(range(10000), prepare, lambda: False, capacity=2)
        next(iterator)
        iterator.close()
        self.assertLessEqual(len(seen), 4)
        self.assertFalse(any(t.name.startswith("scan-prepare") for t in threading.enumerate()))

    def test_pipeline_reports_per_file_failure_then_continues(self):
        def prepare(path):
            if path == 1:
                raise ValueError("bad file")
            return path

        result = list(prepared_files(range(3), prepare, lambda: False))
        self.assertIsInstance(result[1][1], ValueError)
        self.assertEqual(result[2], (2, 2))

    def test_full_hash_checks_cancellation(self):
        with self.assertRaises(InterruptedError):
            full_hash(self.path, lambda: True)

    def test_events_merge_paths_and_detect_overflow(self):
        monitor = FolderEvents(self.temp.name, ["pdf"], max_pending=2)
        self.addCleanup(monitor.close)
        monitor.watches = {1: self.temp.name}

        def packet(name, mask=8):
            data = name.encode() + b"\0"
            return struct.pack("iIII", 1, mask, 0, len(data)) + data

        monitor.feed(packet("a.pdf") + packet("a.pdf") + packet("ignored.txt"), 10)
        self.assertEqual(len(monitor.pending), 1)
        monitor.feed(packet("b.pdf") + packet("c.pdf"), 11)
        self.assertTrue(monitor.rescan)
        monitor.rescan = False
        monitor.feed(packet("", 0x4000), 12)
        self.assertTrue(monitor.rescan)

    def test_unavailable_event_backend_waits_for_periodic_reconciliation(self):
        monitor = FolderEvents(self.temp.name, ["pdf"])
        monitor.close()
        with mock.patch("webserver.services.scan_runtime.time.sleep") as sleep:
            self.assertEqual(monitor.wait(1), ([], False))
        sleep.assert_called_once_with(1)

    def test_real_inotify_receives_close_write(self):
        monitor = FolderEvents(self.temp.name, ["pdf"])
        self.addCleanup(monitor.close)
        if monitor.fd < 0:
            self.skipTest("inotify unavailable")
        path = Path(self.temp.name) / "new.pdf"
        path.write_bytes(b"new book")
        paths, _ = monitor.wait(0.2, debounce=0)
        self.assertIn(str(path), paths)


class TestScanTransactions(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        ScanFile.__table__.create(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.close)
        self.service = ScanService()
        self.service._cancel.clear()
        self.addCleanup(self.service._cancel.clear)
        patch = mock.patch.object(ScanService, "session", new_callable=mock.PropertyMock, return_value=self.session)
        patch.start()
        self.addCleanup(patch.stop)

    def rows(self, count):
        rows = [ScanFile("/book/%d.pdf" % n, "hash:%d" % n, 1) for n in range(count)]
        self.session.add_all(rows)
        self.session.commit()
        return rows

    def test_known_content_duplicate_does_not_parse_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "duplicate.pdf")
            path.write_bytes(b"%PDF-1.4 duplicate")
            old = ScanFile("/old.pdf", full_hash(path), 1)
            old.status, old.book_id = ScanFile.IMPORTED, 42
            row = ScanFile(str(path), "fstat:duplicate", 2)
            self.session.add_all([old, row])
            self.session.commit()
            database = mock.Mock()
            database.get_data_as_dict.return_value = [{"id": 42}]
            with mock.patch.object(self.service, "db", database):
                with mock.patch("calibre.ebooks.metadata.meta.get_metadata") as parse:
                    self.service._scan_metadata([row])
            parse.assert_not_called()
            self.assertEqual(row.status, ScanFile.DROP)

    def test_file_replacement_after_hashing_rolls_back_stale_hash(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "changed.pdf")
            path.write_bytes(b"%PDF-1.4 original")
            row = ScanFile(str(path), "fstat:original", 1)
            self.session.add(row)
            self.session.commit()
            prepare = self.service._prepare_file

            def replace_before_preparing(*args):
                path.write_bytes(b"%PDF-1.4 replacement")
                return prepare(*args)

            with mock.patch.object(self.service, "_prepare_file", side_effect=replace_before_preparing):
                with mock.patch("calibre.ebooks.metadata.meta.get_metadata", return_value=None):
                    self.service._scan_metadata([row])
            self.session.expire_all()
            self.assertEqual(row.status, ScanFile.FAILED)
            self.assertEqual(row.hash, "fstat:original")
            self.assertNotIn("content_hash", row.data)
            self.assertIn("file changed", row.data["processing_error"])

    def test_invalid_auto_file_does_not_consume_next_scan_limit(self):
        with tempfile.TemporaryDirectory() as directory:
            bad = Path(directory, "invalid.cbz")
            bad.write_bytes(b"not a zip archive")
            with mock.patch.object(self.service, "_do_import"):
                self.service._auto_cycle(directory, None, 1, "copy", 1)
            row = self.session.query(ScanFile).filter_by(path=str(bad)).one()
            self.assertEqual(row.status, ScanFile.FAILED)
            self.assertEqual(row.hash, full_hash(bad))
            good = Path(directory, "new.pdf")
            good.write_bytes(b"%PDF-1.4 new book")
            from webserver.services.scan import iter_scan_task_batches

            tasks = list(iter_scan_task_batches(directory, 1, self.service._load_done_paths))
            self.assertEqual([path for batch in tasks for _, path, _ in batch], [str(good)])

    def test_45_files_commit_in_three_batches(self):
        rows = self.rows(45)
        commits = []
        event.listen(self.engine, "commit", lambda connection: commits.append(1))

        def process(row):
            row.status = ScanFile.READY
            self.service.save_or_rollback(row)

        self.service._process_rows(rows, process)
        self.assertEqual(len(commits), 3)
        self.assertEqual(self.session.query(ScanFile).filter_by(status=ScanFile.READY).count(), 45)

    def test_bad_file_rolls_back_only_its_savepoint(self):
        rows = self.rows(3)

        def process(row):
            row.status = ScanFile.READY
            self.service.save_or_rollback(row)
            if row.path.endswith("1.pdf"):
                raise ValueError("parse failed")

        self.service._process_rows(rows, process)
        self.assertEqual([r.status for r in rows], [ScanFile.READY, ScanFile.FAILED, ScanFile.READY])
        self.session.expire_all()
        self.assertEqual(self.session.get(ScanFile, rows[0].id).status, ScanFile.READY)

    def test_cancel_stops_at_file_boundary_and_retry_resets_flag(self):
        rows = self.rows(3)

        @scan_operation("scan")
        def run(service):
            def process(row):
                row.status = ScanFile.READY
                service.save_or_rollback(row)
                service.cancel_task()

            service._process_rows(rows, process)

        run(self.service)
        self.assertEqual([r.status for r in rows], [ScanFile.READY, ScanFile.NEW, ScanFile.NEW])
        self.assertTrue(self.service.task_status()["cancelled"])

        @scan_operation("scan")
        def retry(service):
            self.assertFalse(service._cancel.is_set())

        retry(self.service)

    def test_queued_cancellation_remains_active_until_job_is_consumed(self):
        pending = Queue()
        pending.put(object())
        old_progress = self.service._progress
        self.service._progress = {"active": False, "kind": None, "cancelled": False, "processed": 0, "failed": 0}
        try:
            with mock.patch.object(self.service, "get_queue", return_value=pending):
                status = self.service.cancel_task()
                self.assertTrue(status["active"])
                self.assertTrue(status["cancelled"])

                @scan_operation("scan")
                def run(service):
                    self.fail("queued cancellation must skip the operation")

                run(self.service)
                pending.get()
                pending.task_done()
                self.assertFalse(self.service.task_status()["active"])
        finally:
            self.service._progress = old_progress
            self.service._cancel_queued = False
            self.service._cancel.clear()

    def test_move_cleanup_only_after_commit(self):
        row = self.rows(1)[0]
        commits = []
        event.listen(self.engine, "commit", lambda connection: commits.append(1))

        def cleanup(*args, **kwargs):
            self.assertTrue(commits)

        with mock.patch.object(self.service, "_delete_source_after_import", side_effect=cleanup) as remove:
            self.service._process_rows([row], lambda item: self.service._mark_imported(item, item.path, "pdf", "move"))
        remove.assert_called_once()

    def test_move_preserves_source_replaced_before_batch_commit(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory, "move.pdf")
            path.write_bytes(b"original source")
            row = ScanFile(str(path), "hash:move", 1)
            row.book_id = 42
            row.data = {"file_signature": file_signature(path)}
            self.session.add(row)
            self.session.commit()

            def process(item):
                self.service._mark_imported(item, item.path, "pdf", "move")
                path.write_bytes(b"replacement source")

            with mock.patch.object(self.service, "_library_format_exists", return_value=True):
                self.service._process_rows([row], process)
            self.assertEqual(path.read_bytes(), b"replacement source")
            self.assertEqual(row.status, ScanFile.DELETE_FAILED)
            self.assertIn("source file changed", row.data["delete_error"])

    def test_auto_pipeline_keeps_database_work_in_consumer_thread(self):
        main_thread = threading.get_ident()
        db_threads, parser_threads, imports = [], [], []
        event.listen(self.engine, "before_cursor_execute", lambda *args: db_threads.append(threading.get_ident()))
        with tempfile.TemporaryDirectory() as directory:
            for number in range(3):
                Path(directory, "%d.pdf" % number).write_bytes(b"%PDF-1.4 " + str(number).encode())
            database = mock.Mock()
            database.books_with_same_title.return_value = []

            def parse(*args, **kwargs):
                parser_threads.append(threading.get_ident())

            with mock.patch.object(self.service, "db", database):
                with mock.patch("calibre.ebooks.metadata.meta.get_metadata", side_effect=parse):
                    with (
                        mock.patch.object(self.service, "_do_import"),
                        mock.patch.object(
                            self.service, "_import_row", side_effect=lambda row, *args: imports.append(row.hash)
                        ),
                    ):
                        self.service._auto_cycle(directory, None, 1, "copy", 20)
        self.assertEqual(set(db_threads), {main_thread})
        self.assertEqual(len(parser_threads), 3)
        self.assertNotIn(main_thread, parser_threads)
        self.assertEqual(len([value for value in imports if value is not None]), 3)
        self.assertFalse(any(t.name.startswith("scan-prepare") for t in threading.enumerate()))

    def test_failed_file_does_not_delete_source(self):
        row = self.rows(1)[0]

        def process(item):
            self.service._mark_imported(item, item.path, "pdf", "move")
            raise ValueError("link write failed")

        with mock.patch.object(self.service, "_delete_source_after_import") as remove:
            self.service._process_rows([row], process)
        remove.assert_not_called()


from tests.test_main import TestWithAdminUser


class TestImportTaskAPI(TestWithAdminUser):
    def test_admin_can_query_and_request_stop(self):
        service = ScanService()
        old = service._progress
        try:
            service._progress = {"active": True, "kind": "scan", "cancelled": False, "processed": 4, "failed": 0}
            self.assertEqual(self.json("/api/admin/import/task")["task"]["processed"], 4)
            result = self.json("/api/admin/import/task", method="DELETE")
            self.assertEqual(result["err"], "ok")
            self.assertTrue(result["task"]["cancelled"])
        finally:
            service._progress = old
            service._cancel.clear()

    def test_guest_cannot_query_or_stop(self):
        with mock.patch("webserver.handlers.base.BaseHandler.get_current_user", return_value=None):
            for method in ["GET", "DELETE"]:
                self.assertEqual(self.json("/api/admin/import/task", method=method)["err"], "user.need_login")

    def test_non_admin_cannot_stop(self):
        with mock.patch("webserver.handlers.base.BaseHandler.get_current_user", return_value=object()):
            self.assertEqual(self.json("/api/admin/import/task", method="DELETE")["err"], "permission.not_admin")
