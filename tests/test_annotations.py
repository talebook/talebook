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


def setUpModule():
    init()


class TestAnnotationModelsAndMigration(unittest.TestCase):
    def test_missing_annotation_tables_are_migrated_with_constraints(self):
        engine = create_engine("sqlite://")
        models.Reader.__table__.create(engine)

        self.assertTrue(compare_and_migrate(engine))

        inspector = inspect(engine)
        self.assertIn("book_annotations", inspector.get_table_names())
        self.assertIn("chapter_comments", inspector.get_table_names())
        annotation_constraints = {item["name"] for item in inspector.get_unique_constraints("book_annotations")}
        self.assertIn("uq_annotation_client_id", annotation_constraints)
        self.assertIn("uq_annotation_source_external_id", annotation_constraints)

    def test_source_external_id_is_unique_per_owner_and_book(self):
        engine = create_engine("sqlite://")
        models.Base.metadata.create_all(engine)
        session = sessionmaker(bind=engine)()
        session.add(models.Reader(id=1, username="owner"))
        session.commit()
        session.add(
            models.BookAnnotation(
                reader_id=1,
                book_id=1,
                kind="highlight",
                source="weread",
                external_id="same",
                cfi=None,
            )
        )
        session.commit()
        session.add(
            models.BookAnnotation(
                reader_id=1,
                book_id=1,
                kind="note",
                source="weread",
                external_id="same",
                cfi=None,
            )
        )
        with self.assertRaises(IntegrityError):
            session.commit()
        session.rollback()


class TestAnnotationAuthentication(TestApp):
    def test_annotation_endpoints_require_login(self):
        d = self.json("/api/book/%d/annotations" % BID_EPUB)
        self.assertEqual(d["err"], "user.need_login")

        d = self.json("/api/book/%d/chapter-comments" % BID_EPUB)
        self.assertEqual(d["err"], "user.need_login")


class TestAnnotations(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.user.return_value = 1
        self._clear()

    def tearDown(self):
        self.user.return_value = 1
        self._clear()
        super().tearDown()

    def _clear(self):
        session = get_db()
        session.query(models.BookAnnotation).filter(models.BookAnnotation.book_id == BID_EPUB).delete()
        session.query(models.ChapterComment).filter(models.ChapterComment.book_id == BID_EPUB).delete()
        session.commit()

    def _post_annotation(self, **overrides):
        data = {
            "kind": "highlight",
            "source": "weread",
            "external_id": "ann-1",
            "chapter": "第一章",
            "cfi": None,
            "refer_text": "引用",
            "text": "原始笔记",
            "source_position": "chapter:1#p2",
            "connection_id": "conn-1",
            "run_id": "run-1",
            "raw_hash": "hash-1",
            "remote_updated_at": "2026-08-14T10:00:00Z",
        }
        data.update(overrides)
        return self.json(
            "/api/book/%d/annotations" % BID_EPUB,
            method="POST",
            body=json.dumps(data),
        )

    def _post_comment(self, **overrides):
        data = {
            "source": "weread",
            "external_id": "comment-1",
            "chapter": "第一章",
            "cfi": None,
            "source_position": "chapter:1#comment:2",
            "text": "公开章评",
            "author_name": "读者甲",
            "connection_id": "conn-1",
            "run_id": "run-1",
            "raw_hash": "comment-hash-1",
            "remote_updated_at": "2026-08-14T10:00:00Z",
        }
        data.update(overrides)
        return self.json(
            "/api/book/%d/chapter-comments" % BID_EPUB,
            method="POST",
            body=json.dumps(data),
        )

    def test_source_upsert_is_idempotent_and_keeps_nullable_cfi(self):
        first = self._post_annotation()
        self.assertEqual(first["err"], "ok")
        self.assertTrue(first["created"])
        self.assertIsNone(first["annotation"]["cfi"])

        second = self._post_annotation(text="更新后的笔记", run_id="run-2", raw_hash="hash-2")
        self.assertEqual(second["err"], "ok")
        self.assertFalse(second["created"])
        self.assertEqual(second["annotation"]["id"], first["annotation"]["id"])

        d = self.json("/api/book/%d/annotations?source=weread&run_id=run-2&connection_id=conn-1" % BID_EPUB)
        self.assertEqual(len(d["annotations"]), 1)
        self.assertEqual(d["annotations"][0]["text"], "更新后的笔记")
        self.assertEqual(d["annotations"][0]["source_position"], "chapter:1#p2")

        d = self.json("/api/annotations/export?source=weread&run_id=run-2")
        self.assertEqual(d["export"]["schema"], "talebook.annotations.v1")
        self.assertEqual(len(d["export"]["annotations"]), 1)

    def test_client_id_upsert_is_idempotent(self):
        first = self._post_annotation(source="talebook", external_id=None, client_id="client-1")
        second = self._post_annotation(
            source="talebook",
            external_id=None,
            client_id="client-1",
            text="same client updated",
        )
        self.assertEqual(first["annotation"]["id"], second["annotation"]["id"])
        self.assertEqual(second["annotation"]["text"], "same client updated")
        self.assertEqual(get_db().query(models.BookAnnotation).count(), 1)

    def test_admin_identity_cannot_read_another_users_private_annotation(self):
        session = get_db()
        admin = session.get(models.Reader, 1)
        self.assertTrue(admin.is_admin())
        session.add(
            models.BookAnnotation(
                reader_id=2,
                book_id=BID_EPUB,
                kind="note",
                source="readwise",
                external_id="private-user-2",
                text="user two secret",
            )
        )
        session.commit()

        d = self.json("/api/annotations?source=readwise")
        self.assertEqual(d["annotations"], [])
        d = self.json("/api/book/%d/annotations" % BID_EPUB)
        self.assertNotIn("user two secret", json.dumps(d, ensure_ascii=False))

    def test_book_permission_is_checked_for_regular_user(self):
        self.user.return_value = 2
        with temporary_book_scope(BID_EPUB, "private", collector_id=1):
            d = self._post_annotation(external_id="denied")
            self.assertEqual(d["err"], "params.book.invalid")
            d = self.json("/api/book/%d/annotations" % BID_EPUB)
            self.assertEqual(d["err"], "params.book.invalid")

    def test_manual_update_is_protected_from_import_and_source_deletion(self):
        created = self._post_annotation()
        annotation_id = created["annotation"]["id"]
        d = self.json(
            "/api/book/%d/annotations/%d" % (BID_EPUB, annotation_id),
            method="PUT",
            body=json.dumps({"text": "我的手工修订"}),
        )
        self.assertIsNotNone(d["annotation"]["user_modified_at"])

        imported = self._post_annotation(
            text="远端覆盖内容",
            raw_hash="hash-new",
            run_id="run-new",
            remote_updated_at="2026-08-15T10:00:00Z",
        )
        self.assertTrue(imported["conflict_protected"])
        self.assertEqual(imported["annotation"]["text"], "我的手工修订")
        self.assertEqual(imported["annotation"]["run_id"], "run-new")

        d = self.json("/api/annotations?source=weread", method="DELETE")
        self.assertEqual(d["deleted"], 0)
        self.assertEqual(d["protected"], 1)
        self.assertEqual(get_db().query(models.BookAnnotation).count(), 1)

        d = self.json("/api/annotations?source=weread&include_modified=true", method="DELETE")
        self.assertEqual(d["deleted"], 1)
        self.assertEqual(get_db().query(models.BookAnnotation).count(), 0)

    def test_older_remote_event_is_ignored(self):
        self._post_annotation(text="new content")
        stale = self._post_annotation(
            text="old content",
            raw_hash="old-hash",
            remote_updated_at="2026-08-13T10:00:00Z",
        )
        self.assertTrue(stale["stale_ignored"])
        self.assertEqual(stale["annotation"]["text"], "new content")

    def test_source_delete_requires_a_source_scope(self):
        self._post_annotation()
        d = self.json("/api/annotations?book_id=%d" % BID_EPUB, method="DELETE")
        self.assertEqual(d["err"], "params.invalid")
        self.assertEqual(get_db().query(models.BookAnnotation).count(), 1)

    def test_chapter_comments_are_visible_but_writable_only_by_importer(self):
        created = self._post_comment()
        comment_id = created["chapter_comment"]["id"]

        self.user.return_value = 2
        d = self.json("/api/book/%d/chapter-comments" % BID_EPUB)
        self.assertEqual(len(d["chapter_comments"]), 1)
        self.assertEqual(d["chapter_comments"][0]["text"], "公开章评")
        d = self.json(
            "/api/book/%d/chapter-comments/%d" % (BID_EPUB, comment_id),
            method="PUT",
            body=json.dumps({"text": "越权修改"}),
        )
        self.assertEqual(d["err"], "chapter_comment.not_found")
        d = self.json(
            "/api/book/%d/chapter-comments/%d" % (BID_EPUB, comment_id),
            method="DELETE",
        )
        self.assertEqual(d["err"], "chapter_comment.not_found")

    def test_annotation_and_chapter_comment_deletion_are_isolated(self):
        self._post_annotation()
        self._post_comment()

        d = self.json("/api/chapter-comments/export?source=weread&run_id=run-1&connection_id=conn-1")
        self.assertEqual(d["export"]["schema"], "talebook.chapter-comments.v1")
        self.assertEqual(len(d["export"]["chapter_comments"]), 1)

        d = self.json("/api/annotations?connection_id=conn-1", method="DELETE")
        self.assertEqual(d["deleted"], 1)
        self.assertEqual(get_db().query(models.BookAnnotation).count(), 0)
        self.assertEqual(get_db().query(models.ChapterComment).count(), 1)

        d = self.json("/api/chapter-comments?run_id=run-1", method="DELETE")
        self.assertEqual(d["deleted"], 1)
        self.assertEqual(get_db().query(models.ChapterComment).count(), 0)


if __name__ == "__main__":
    unittest.main()
