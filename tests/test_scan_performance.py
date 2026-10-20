"""Regression tests for bounded scan queries and legacy database upgrades."""

import os
import tempfile
import unittest
from unittest import mock

from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import sessionmaker

from webserver.handlers.scan import Scanner
from webserver.migrate_db import compare_and_migrate, ensure_scanfile_indexes
from webserver.models import ScanFile
from webserver.services.scan import ScanService, iter_scan_files, iter_scan_rows, iter_scan_task_batches


class TestScanIndexes(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        self.addCleanup(self.engine.dispose)

    def legacy_table(self):
        with self.engine.begin() as connection:
            connection.execute(
                text(
                    "CREATE TABLE scanfiles (id INTEGER PRIMARY KEY, path VARCHAR(1024), "
                    "hash VARCHAR(512) UNIQUE, status VARCHAR(24), scan_id INTEGER, import_id INTEGER)"
                )
            )

    def test_fresh_and_legacy_tables_have_same_indexes(self):
        self.legacy_table()
        ensure_scanfile_indexes(self.engine)
        expected = {index.name for index in ScanFile.__table__.indexes}
        indexes = inspect(self.engine).get_indexes("scanfiles")
        self.assertEqual({index["name"] for index in indexes}, expected)
        ensure_scanfile_indexes(self.engine)
        self.assertEqual(inspect(self.engine).get_indexes("scanfiles"), indexes)
        with self.engine.connect() as connection:
            indexes_before = connection.execute(text('PRAGMA index_list("scanfiles")')).fetchall()
            self.assertEqual(sum(row[2] == 1 for row in indexes_before), 1)
            hash_index = next(row[1] for row in indexes_before if row[2] == 1)
            self.assertEqual(connection.execute(text('PRAGMA index_info("%s")' % hash_index)).fetchone()[2], "hash")
        ScanFile.__table__.drop(self.engine)
        ScanFile.__table__.create(self.engine)
        self.assertEqual({index["name"] for index in inspect(self.engine).get_indexes("scanfiles")}, expected)

    def test_full_migration_upgrades_existing_table_and_repeats(self):
        self.legacy_table()
        self.assertTrue(compare_and_migrate(self.engine))
        self.assertTrue(compare_and_migrate(self.engine))
        self.assertEqual(len(inspect(self.engine).get_indexes("scanfiles")), 4)
        self.assertIn("data", {column["name"] for column in inspect(self.engine).get_columns("scanfiles")})

    def test_existing_equivalent_index_is_reused(self):
        self.legacy_table()
        with self.engine.begin() as connection:
            connection.execute(text("CREATE INDEX existing_path ON scanfiles(path, id)"))
        ensure_scanfile_indexes(self.engine)
        names = {index["name"] for index in inspect(self.engine).get_indexes("scanfiles")}
        self.assertIn("existing_path", names)
        self.assertNotIn("ix_scanfiles_path", names)

    def test_partial_index_does_not_replace_full_path_index(self):
        self.legacy_table()
        with self.engine.begin() as connection:
            connection.execute(text("CREATE INDEX partial_path ON scanfiles(path) WHERE status = 'ready'"))
        ensure_scanfile_indexes(self.engine)
        self.assertIn("ix_scanfiles_path", {i["name"] for i in inspect(self.engine).get_indexes("scanfiles")})

    def test_failed_index_is_isolated_and_retried(self):
        self.legacy_table()
        with self.engine.begin() as connection:
            connection.execute(text("INSERT INTO scanfiles(id,path,hash) VALUES (1,'kept','kept')"))

        def fail_path(connection, cursor, statement, parameters, context, many):
            if statement.startswith("CREATE INDEX ix_scanfiles_path"):
                raise RuntimeError("simulated disk/lock failure")

        event.listen(self.engine, "before_cursor_execute", fail_path)
        try:
            ensure_scanfile_indexes(self.engine)
        finally:
            event.remove(self.engine, "before_cursor_execute", fail_path)
        self.assertEqual(len(inspect(self.engine).get_indexes("scanfiles")), 3)
        with self.engine.connect() as connection:
            self.assertEqual(connection.execute(text("SELECT hash FROM scanfiles")).scalar(), "kept")
        ensure_scanfile_indexes(self.engine)
        self.assertEqual(len(inspect(self.engine).get_indexes("scanfiles")), 4)

    def test_mysql_path_index_fits_utf8mb4_key_limit(self):
        from sqlalchemy.dialects.mysql import dialect
        from sqlalchemy.schema import CreateIndex

        index = next(index for index in ScanFile.__table__.indexes if index.name == "ix_scanfiles_path")
        sql = str(CreateIndex(index).compile(dialect=dialect()))
        self.assertIn("path(191)", sql)

    def test_hot_queries_use_indexes(self):
        self.legacy_table()
        ensure_scanfile_indexes(self.engine)
        queries = [
            ("SELECT id FROM scanfiles WHERE path = 'book.pdf'", "ix_scanfiles_path"),
            ("SELECT id FROM scanfiles WHERE hash = 'sha256:test'", "sqlite_autoindex_scanfiles"),
            ("SELECT status, COUNT(id) FROM scanfiles WHERE scan_id=1 GROUP BY status", "ix_scanfiles_scan_id_status"),
            ("SELECT status, COUNT(id) FROM scanfiles WHERE import_id=1 GROUP BY status", "ix_scanfiles_import_id_status"),
            ("SELECT id FROM scanfiles WHERE status='ready' AND id>10 ORDER BY id LIMIT 100", "ix_scanfiles_status_id"),
        ]
        with self.engine.connect() as connection:
            for sql, name in queries:
                plan = " ".join(str(row[-1]) for row in connection.execute(text("EXPLAIN QUERY PLAN " + sql)))
                self.assertIn("SEARCH", plan)
                self.assertIn(name, plan)


class TestScanBatchQueries(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        ScanFile.__table__.create(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.addCleanup(self.engine.dispose)
        self.addCleanup(self.session.close)

    def add_row(self, number, status=ScanFile.READY, scan_id=1, import_id=2):
        row = ScanFile("/imports/%s.pdf" % number, "sha256:%s" % number, scan_id)
        row.status = status
        row.import_id = import_id
        self.session.add(row)
        return row

    def test_history_queries_are_bounded_and_done_files_do_not_consume_limit(self):
        for number in range(1050):
            self.add_row(number, ScanFile.IMPORTED)
        self.session.commit()
        lookups = []
        candidates = ((str(n), "/imports/%s.pdf" % n, "pdf") for n in range(1200))

        def lookup(paths):
            lookups.append(len(paths))
            return ScanService()._load_done_paths(paths)

        with mock.patch.object(ScanService, "session", new_callable=mock.PropertyMock, return_value=self.session):
            with mock.patch("webserver.services.scan.iter_scan_files", return_value=candidates):
                batches = list(iter_scan_task_batches("/imports", 3, lookup))
        self.assertEqual([row[0] for batch in batches for row in batch], ["1050", "1051", "1052"])
        self.assertEqual(lookups, [500, 500, 200])

    def test_candidate_walk_keeps_hidden_and_symlink_exclusions(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ["book.PDF", ".hidden.pdf", "pdf", "note.doc"]:
                with open(os.path.join(directory, name), "wb") as stream:
                    stream.write(b"test")
            for name in [".private", "@__thumb"]:
                os.mkdir(os.path.join(directory, name))
                with open(os.path.join(directory, name, "hidden.pdf"), "wb") as stream:
                    stream.write(b"test")
            os.symlink(os.path.join(directory, "book.PDF"), os.path.join(directory, "linked.pdf"))
            os.symlink(os.path.join(directory, ".private"), os.path.join(directory, "linked-dir"))
            self.assertEqual(list(iter_scan_files(directory)), [("book.PDF", os.path.join(directory, "book.PDF"), "pdf")])

    def test_new_and_temporary_hash_records_are_not_skipped(self):
        self.add_row(1, ScanFile.NEW)
        self.add_row(2, ScanFile.READY).hash = "fstat:old"
        self.add_row(3, ScanFile.IMPORTED)
        self.add_row(4, ScanFile.INDEXED)
        self.session.commit()
        with mock.patch.object(ScanService, "session", new_callable=mock.PropertyMock, return_value=self.session):
            done = ScanService()._load_done_paths(["/imports/%d.pdf" % n for n in range(1, 5)])
        self.assertEqual(done, {"/imports/3.pdf", "/imports/4.pdf"})

    def test_unlimited_scan_yields_before_exhausting_candidates(self):
        consumed = []

        def candidates(_path_dir):
            for n in range(1200):
                consumed.append(n)
                yield str(n), "/imports/%d.pdf" % n, "pdf"

        with mock.patch("webserver.services.scan.iter_scan_files", side_effect=candidates):
            batches = iter_scan_task_batches("/imports", None, lambda paths: set())
            self.assertEqual(len(next(batches)), 500)
            self.assertEqual(len(consumed), 500)
            self.assertEqual([len(batch) for batch in batches], [500, 200])

    def test_all_candidates_are_registered_before_metadata_processing(self):
        # NEW must stay nonzero across registration batches: the UI uses it to poll completion.
        with tempfile.TemporaryDirectory() as directory:
            batches = []
            for number in range(3):
                path = os.path.join(directory, "%d.pdf" % number)
                with open(path, "wb") as stream:
                    stream.write(b"%PDF-1.4 test")
                batches.append([(os.path.basename(path), path, "pdf")])

            def metadata(rows):
                self.assertEqual(self.session.query(ScanFile).filter(ScanFile.status == ScanFile.NEW).count(), 3)
                self.assertEqual(len(list(rows)), 3)

            with mock.patch.object(ScanService, "session", new_callable=mock.PropertyMock, return_value=self.session):
                with mock.patch("webserver.services.scan.iter_scan_task_batches", return_value=iter(batches)):
                    with mock.patch.object(ScanService, "_scan_metadata", side_effect=metadata) as scan_metadata:
                        ScanService()._do_scan(directory)
            scan_metadata.assert_called_once()

    def test_import_pages_survive_status_changes_and_exclude_new_records(self):
        for number in range(257):
            self.add_row(number)
        self.session.commit()
        seen = []
        query = self.session.query(ScanFile).filter(ScanFile.status == ScanFile.READY)
        for row in iter_scan_rows(query):
            seen.append(row.path)
            row.status = ScanFile.IMPORTED
            if len(seen) == 1:
                self.add_row(1000)
            self.session.commit()
        self.assertEqual(seen, ["/imports/%d.pdf" % n for n in range(257)])
        self.assertEqual(query.count(), 1)
        self.assertEqual(query.one().path, "/imports/1000.pdf")

    def test_import_pages_keep_selection_and_tolerate_deleted_rows(self):
        rows = [self.add_row(n) for n in range(7)]
        self.session.commit()
        selected = [row.hash for row in rows[:6]]
        query = self.session.query(ScanFile).filter(ScanFile.hash.in_(selected))
        iterator = iter_scan_rows(query, batch_size=2)
        seen = [next(iterator).path]
        self.session.delete(rows[3])
        self.session.commit()
        seen.extend(row.path for row in iterator)
        self.assertEqual(seen, ["/imports/%d.pdf" % n for n in [0, 1, 2, 4, 5]])

    def test_summary_and_progress_are_aggregated_and_compatible(self):
        statuses = [
            ScanFile.NEW,
            ScanFile.READY,
            ScanFile.EXIST,
            ScanFile.IMPORTED,
            ScanFile.INDEXED,
            ScanFile.FAILED,
            ScanFile.DELETE_FAILED,
            ScanFile.DROP,
            "future",
        ]
        for n, status in enumerate(statuses):
            self.add_row(n, status)
        self.add_row(100, ScanFile.READY, scan_id=0, import_id=0)
        self.session.commit()
        statements = []

        def record(connection, cursor, statement, parameters, context, many):
            statements.append(statement)

        scanner = Scanner(None, self.session)
        event.listen(self.engine, "before_cursor_execute", record)
        try:
            summary = scanner.summary()
            self.assertEqual(summary, {"total": 10, "done": 3, "failed": 2, "todo": 5})
            self.assertEqual(len(statements), 1)
            self.assertIn("GROUP BY", statements[0])
            for status_fn in [scanner.scan_status, scanner.import_status]:
                statements.clear()
                batch_id, counts = status_fn()
                self.assertGreater(batch_id, 0)
                self.assertEqual(counts["total"], 9)
                self.assertEqual(counts["ready"], 1)
                self.assertEqual(counts["future"], 1)
                self.assertEqual(counts["importing"], 0)
                self.assertEqual(len(statements), 2)
                self.assertIn("GROUP BY", statements[-1])
        finally:
            event.remove(self.engine, "before_cursor_execute", record)

    def test_empty_summary_and_progress_keep_response_shape(self):
        scanner = Scanner(None, self.session)
        self.assertEqual(scanner.summary(), {"total": 0, "done": 0, "todo": 0, "failed": 0})
        self.assertEqual(scanner.import_status(), (0, {}))
        self.assertEqual(scanner.scan_status(), (0, {}))
