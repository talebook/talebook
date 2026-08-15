#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import unittest

from sqlalchemy import create_engine, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from tests.test_main import BID_EPUB, TestApp, TestWithUserLogin, get_db, temporary_book_scope
from tests.test_main import setUpModule as init
from webserver import models
from webserver.migrate_db import compare_and_migrate
from webserver.services.annotation_sync import AnnotationSyncService


def setUpModule():
    init()


class TestAnnotationModelsAndMigration(unittest.TestCase):
    def test_missing_annotation_tables_are_migrated_with_constraints(self):
        engine = create_engine("sqlite://")
        models.Reader.__table__.create(engine)

        self.assertTrue(compare_and_migrate(engine))

        inspector = inspect(engine)
        self.assertIn("annotations", inspector.get_table_names())
        self.assertIn("annotation_sources", inspector.get_table_names())
        self.assertNotIn("book_annotations", inspector.get_table_names())
        self.assertNotIn("chapter_comments", inspector.get_table_names())
        annotation_constraints = {item["name"] for item in inspector.get_unique_constraints("annotations")}
        source_constraints = {item["name"] for item in inspector.get_unique_constraints("annotation_sources")}
        self.assertIn("uq_annotation_client_id", annotation_constraints)
        self.assertIn("uq_annotation_source_connection", source_constraints)
        self.assertIn("uq_annotation_source_identity", source_constraints)

    def test_source_identity_is_unique_across_authoritative_annotations(self):
        engine = create_engine("sqlite://")
        models.Base.metadata.create_all(engine)
        session = sessionmaker(bind=engine)()
        session.add(models.Reader(id=1, username="owner"))
        first = models.Annotation(reader_id=1, book_id=1, annotation_type="highlight", client_id="first")
        second = models.Annotation(reader_id=1, book_id=1, annotation_type="note", client_id="second")
        session.add_all([first, second])
        session.flush()
        session.add(
            models.AnnotationSource(
                annotation_id=first.id,
                source_name="weread",
                source_connection_id="conn-1",
                source_annotation_id="same",
            )
        )
        session.commit()
        session.add(
            models.AnnotationSource(
                annotation_id=second.id,
                source_name="weread",
                source_connection_id="conn-1",
                source_annotation_id="same",
            )
        )
        with self.assertRaises(IntegrityError):
            session.commit()
        session.rollback()


class TestAnnotationAuthentication(TestApp):
    def test_annotation_endpoints_require_login(self):
        d = self.json("/api/book/%d/annotations" % BID_EPUB)
        self.assertEqual(d["err"], "user.need_login")


class TestAnnotations(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.user.return_value = 1
        AnnotationSyncService.reset_writers()
        self._clear()

    def tearDown(self):
        self.user.return_value = 1
        AnnotationSyncService.reset_writers()
        self._clear()
        super().tearDown()

    def _clear(self):
        session = get_db()
        annotation_ids = [
            annotation_id
            for (annotation_id,) in session.query(models.Annotation.id).filter(models.Annotation.book_id == BID_EPUB).all()
        ]
        if annotation_ids:
            session.query(models.AnnotationSource).filter(models.AnnotationSource.annotation_id.in_(annotation_ids)).delete(
                synchronize_session=False
            )
        session.query(models.Annotation).filter(models.Annotation.book_id == BID_EPUB).delete()
        session.commit()

    def _post_local(self, **overrides):
        data = {
            "annotation_type": "note",
            "client_id": "client-1",
            "is_private": True,
            "chapter": "第一章",
            "cfi": None,
            "quote_text": "引用",
            "content": "本地笔记",
            "color": "yellow",
        }
        data.update(overrides)
        return self.json(
            "/api/book/%d/annotations" % BID_EPUB,
            method="POST",
            body=json.dumps(data),
        )

    def _post_source(self, **overrides):
        data = {
            "annotation_type": "highlight",
            "source_name": "weread",
            "source_connection_id": "conn-1",
            "source_annotation_id": "ann-1",
            "source_run_id": "run-1",
            "source_position": "chapter:1#p2",
            "source_raw_hash": "hash-1",
            "source_updated_at": "2026-08-14T10:00:00Z",
            "chapter": "第一章",
            "cfi": None,
            "quote_text": "引用",
            "content": "来源笔记",
            "is_private": True,
        }
        data.update(overrides)
        return self.json(
            "/api/book/%d/annotations" % BID_EPUB,
            method="POST",
            body=json.dumps(data),
        )

    def test_source_upsert_is_idempotent_and_uses_prefixed_source_fields(self):
        first = self._post_source()
        self.assertEqual(first["err"], "ok")
        self.assertTrue(first["created"])
        self.assertIsNone(first["annotation"]["cfi"])

        second = self._post_source(
            content="更新后的笔记",
            source_run_id="run-2",
            source_raw_hash="hash-2",
        )
        self.assertEqual(second["err"], "ok")
        self.assertFalse(second["created"])
        self.assertEqual(second["annotation"]["id"], first["annotation"]["id"])

        d = self.json("/api/book/%d/annotations?source_name=weread&source_run_id=run-2&source_connection_id=conn-1" % BID_EPUB)
        self.assertEqual(len(d["annotations"]), 1)
        self.assertEqual(d["annotations"][0]["content"], "更新后的笔记")
        self.assertEqual(d["annotations"][0]["sources"][0]["source_position"], "chapter:1#p2")

        d = self.json("/api/annotations/export?source_name=weread&source_run_id=run-2")
        self.assertEqual(d["export"]["schema"], "talebook.annotations.v2")
        self.assertEqual(len(d["export"]["annotations"]), 1)

    def test_legacy_unprefixed_source_fields_are_rejected(self):
        d = self._post_local(source="weread", external_id="legacy-id")
        self.assertEqual(d["err"], "params.invalid")
        self.assertEqual(get_db().query(models.Annotation).count(), 0)

    def test_local_client_id_upsert_is_authoritative(self):
        first = self._post_local()
        second = self._post_local(content="same client updated")
        self.assertEqual(first["annotation"]["id"], second["annotation"]["id"])
        self.assertEqual(second["annotation"]["content"], "same client updated")
        self.assertIsNotNone(second["annotation"]["user_modified_at"])
        self.assertEqual(get_db().query(models.Annotation).count(), 1)

    def test_admin_identity_cannot_read_another_users_private_annotation(self):
        session = get_db()
        admin = session.get(models.Reader, 1)
        self.assertTrue(admin.is_admin())
        session.add(
            models.Annotation(
                reader_id=2,
                book_id=BID_EPUB,
                annotation_type="note",
                client_id="private-user-2",
                content="user two secret",
                is_private=True,
            )
        )
        session.commit()

        d = self.json("/api/annotations")
        self.assertEqual(d["annotations"], [])
        d = self.json("/api/book/%d/annotations" % BID_EPUB)
        self.assertNotIn("user two secret", json.dumps(d, ensure_ascii=False))

    def test_public_chapter_comment_uses_annotations_table_and_owner_write_rule(self):
        created = self._post_source(
            annotation_type="chapter_comment",
            source_annotation_id="comment-1",
            content="公开章评",
            author_name="读者甲",
            is_private=False,
        )
        annotation_id = created["annotation"]["id"]
        self.assertEqual(get_db().query(models.Annotation).filter_by(annotation_type="chapter_comment").count(), 1)

        self.user.return_value = 2
        d = self.json("/api/book/%d/annotations" % BID_EPUB)
        self.assertEqual(len(d["annotations"]), 1)
        self.assertEqual(d["annotations"][0]["content"], "公开章评")
        d = self.json(
            "/api/book/%d/annotations/%d" % (BID_EPUB, annotation_id),
            method="PUT",
            body=json.dumps({"content": "越权修改"}),
        )
        self.assertEqual(d["err"], "annotation.not_found")
        d = self.json(
            "/api/book/%d/annotations/%d" % (BID_EPUB, annotation_id),
            method="DELETE",
        )
        self.assertEqual(d["err"], "annotation.not_found")

    def test_book_permission_is_checked_for_regular_user(self):
        self.user.return_value = 2
        with temporary_book_scope(BID_EPUB, "private", collector_id=1):
            d = self._post_local(client_id="denied")
            self.assertEqual(d["err"], "params.book.invalid")
            d = self.json("/api/book/%d/annotations" % BID_EPUB)
            self.assertEqual(d["err"], "params.book.invalid")

    def test_manual_update_is_protected_from_later_source_import(self):
        created = self._post_source()
        annotation_id = created["annotation"]["id"]
        d = self.json(
            "/api/book/%d/annotations/%d" % (BID_EPUB, annotation_id),
            method="PUT",
            body=json.dumps({"content": "我的手工修订"}),
        )
        self.assertIsNotNone(d["annotation"]["user_modified_at"])

        imported = self._post_source(
            content="远端覆盖内容",
            source_raw_hash="hash-new",
            source_run_id="run-new",
            source_updated_at="2026-08-15T10:00:00Z",
        )
        self.assertTrue(imported["conflict_protected"])
        self.assertEqual(imported["annotation"]["content"], "我的手工修订")
        self.assertEqual(imported["annotation"]["sources"][0]["source_run_id"], "run-new")

    def test_older_source_event_is_ignored(self):
        self._post_source(content="new content")
        stale = self._post_source(
            content="old content",
            source_raw_hash="old-hash",
            source_updated_at="2026-08-13T10:00:00Z",
        )
        self.assertTrue(stale["stale_ignored"])
        self.assertEqual(stale["annotation"]["content"], "new content")

    def test_source_cleanup_unlinks_replica_but_keeps_authoritative_content(self):
        self._post_source()
        d = self.json("/api/annotations?book_id=%d" % BID_EPUB, method="DELETE")
        self.assertEqual(d["err"], "params.invalid")

        d = self.json("/api/annotations?source_name=weread&source_connection_id=conn-1", method="DELETE")
        self.assertEqual(d["sources_deleted"], 1)
        self.assertEqual(d["annotations_deleted"], 0)
        self.assertEqual(get_db().query(models.Annotation).count(), 1)
        self.assertEqual(get_db().query(models.AnnotationSource).count(), 0)

    def test_public_annotation_fans_out_to_all_writers_and_private_does_not(self):
        calls = []

        def calibre_writer(annotation, source):
            calls.append(("calibre", annotation["id"], source["source_sync_status"]))
            return {
                "source_annotation_id": "calibre-1",
                "source_raw_hash": "calibre-hash",
                "source_updated_at": "2026-08-15T12:00:00Z",
            }

        def weread_writer(annotation, source):
            calls.append(("weread", annotation["id"], source["source_sync_status"]))
            raise RuntimeError("remote unavailable")

        AnnotationSyncService.register_writer("calibre", calibre_writer)
        AnnotationSyncService.register_writer("weread", weread_writer, "conn-1")

        private = self._post_local(client_id="private")
        self.assertFalse(private["sync_enqueued"])
        self.assertEqual(calls, [])

        public = self._post_local(client_id="public", is_private=False)
        self.assertTrue(public["sync_enqueued"])
        self.assertEqual([call[0] for call in calls], ["calibre", "weread"])
        sources = {
            source.source_name: source
            for source in get_db().query(models.AnnotationSource).filter_by(annotation_id=public["annotation"]["id"])
        }
        self.assertEqual(sources["calibre"].source_sync_status, "synced")
        self.assertEqual(sources["calibre"].source_annotation_id, "calibre-1")
        self.assertEqual(sources["weread"].source_sync_status, "failed")
        self.assertIn("remote unavailable", sources["weread"].source_sync_error)


if __name__ == "__main__":
    unittest.main()
