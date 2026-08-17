import datetime
import json
import tempfile
import unittest
import zipfile
from copy import deepcopy
from types import SimpleNamespace
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.metadata_ai import (
    MetadataAIService,
    MetadataValidationError,
    apply_task,
    extract_epub_excerpt,
    metadata_version,
    selection_revision,
    undo_task,
    validate_metadata_output,
    validate_selection,
)


def setUpModule():
    test_main.setUpModule()


class MetadataValidationTest(unittest.TestCase):
    def setUp(self):
        self.book = {
            "book_id": 8,
            "version": "v1",
            "original": {
                "title": "旧书名",
                "authors": ["作者"],
                "publisher": "",
                "pubdate": "",
                "isbn": "",
                "language": "zh",
                "comments": "简介中的可靠信息",
            },
            "sources": [{"id": "library:comments", "kind": "library_metadata", "label": "简介", "value": "简介中的可靠信息"}],
        }

    def test_verifiable_high_confidence_is_selected_by_default(self):
        output = {
            "suggestions": [
                {
                    "field": "publisher",
                    "value": "可靠出版社",
                    "confidence": 0.91,
                    "reason": "简介明确给出",
                    "evidence": [{"source_id": "library:comments", "quote": "可靠信息"}],
                }
            ]
        }
        suggestion = validate_metadata_output(output, self.book)[0]
        self.assertTrue(suggestion["has_evidence"])
        self.assertTrue(suggestion["default_selected"])
        self.assertFalse(suggestion["conflict"])
        self.assertEqual(suggestion["evidence"][0]["source_label"], "简介")

    def test_inference_without_evidence_is_not_selected(self):
        output = {
            "suggestions": [
                {
                    "field": "title",
                    "value": "规范书名",
                    "confidence": 0.99,
                    "reason": "模型格式推断",
                    "evidence": [{"source_id": "model_inference", "quote": ""}],
                }
            ]
        }
        suggestion = validate_metadata_output(output, self.book)[0]
        self.assertFalse(suggestion["has_evidence"])
        self.assertFalse(suggestion["default_selected"])
        self.assertTrue(suggestion["conflict"])
        self.assertEqual(suggestion["evidence"][0]["source_label"], "模型推断")

    def test_unknown_or_mismatched_source_is_rejected(self):
        output = {
            "suggestions": [
                {
                    "field": "publisher",
                    "value": "出版社",
                    "confidence": 0.8,
                    "reason": "测试",
                    "evidence": [{"source_id": "web:unknown", "quote": "不存在"}],
                }
            ]
        }
        with self.assertRaisesRegex(MetadataValidationError, "来源不存在"):
            validate_metadata_output(output, self.book)

    def test_field_type_and_date_are_strict(self):
        output = {
            "suggestions": [
                {
                    "field": "pubdate",
                    "value": "某年春天",
                    "confidence": 0.8,
                    "reason": "测试",
                    "evidence": [],
                }
            ]
        }
        with self.assertRaisesRegex(MetadataValidationError, "出版日期"):
            validate_metadata_output(output, self.book)

    def test_empty_review_selection_is_rejected(self):
        record = SimpleNamespace(ai_draft={"items": [{"book_id": 8, "suggestions": [{"field": "title"}]}]})
        with self.assertRaisesRegex(MetadataValidationError, "至少选择"):
            validate_selection(record, [])

    def test_epub_excerpt_stops_at_first_thousand_visible_characters(self):
        with tempfile.NamedTemporaryFile(suffix=".epub") as target:
            with zipfile.ZipFile(target.name, "w") as archive:
                archive.writestr(
                    "META-INF/container.xml",
                    '<?xml version="1.0"?><container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>',
                )
                archive.writestr(
                    "OEBPS/content.opf",
                    '<package><manifest><item id="one" href="one.xhtml"/><item id="two" href="two.xhtml"/></manifest>'
                    '<spine><itemref idref="one"/><itemref idref="two"/></spine></package>',
                )
                archive.writestr("OEBPS/one.xhtml", f"<html><body><h1>开头</h1><p>{'甲' * 1200}</p></body></html>")
                archive.writestr("OEBPS/two.xhtml", "<html><body>不应读取的后续正文</body></html>")
            excerpt = extract_epub_excerpt(target.name)
        self.assertEqual(len(excerpt), 1000)
        self.assertTrue(excerpt.startswith("开头"))
        self.assertNotIn("不应读取", excerpt)


class _FakeMI:
    def __init__(self, values):
        self.values = values
        for key, value in values.items():
            setattr(self, key, deepcopy(value))

    def set(self, key, value):
        setattr(self, key, deepcopy(value))


class _FakeDB:
    def __init__(self, values):
        self.values = {1: deepcopy(values)}

    def get_metadata(self, book_id, index_is_id=True):
        if book_id not in self.values:
            return None
        return _FakeMI(self.values[book_id])

    def persist(self, book_id, mi):
        self.values[book_id] = {key: deepcopy(getattr(mi, key)) for key in self.values[book_id]}


class _FakeSession:
    def commit(self):
        return None


class _FakeUser:
    def can_edit(self):
        return True


def _record(original, suggestions, selection):
    token = selection_revision(selection)
    now = datetime.datetime.now()
    return SimpleNamespace(
        id="task-1",
        feature="metadata",
        status="succeeded",
        progress_message="完成",
        ai_draft={
            "items": [
                {
                    "book_id": 1,
                    "version": metadata_version(original),
                    "original": deepcopy(original),
                    "sources": [],
                    "status": "succeeded",
                    "suggestions": deepcopy(suggestions),
                    "error": None,
                }
            ]
        },
        user_revision={"items": deepcopy(selection), "selection_revision": token},
        result_data={},
        schema_version="metadata.v2",
        prompt_version="metadata.zh.v2",
        runtime_name="test",
        usage={},
        error_code="",
        error_message="",
        create_time=now,
        update_time=now,
    )


class MetadataApplyUndoTest(unittest.TestCase):
    def setUp(self):
        self.original = {
            "title": "旧书名",
            "authors": ["作者"],
            "publisher": "旧出版社",
            "pubdate": "2020-01-01",
            "isbn": "123456789X",
            "language": "zh",
            "comments": "旧简介",
        }
        suggestions = [
            {"field": "title", "value": "新书名"},
            {"field": "publisher", "value": "新出版社"},
        ]
        self.selection = [{"book_id": 1, "fields": ["publisher", "title"]}]
        self.record = _record(self.original, suggestions, self.selection)
        self.db = _FakeDB(self.original)
        self.handler = SimpleNamespace(
            db=self.db,
            session=_FakeSession(),
            current_user=_FakeUser(),
            is_admin=lambda: True,
            is_book_owner=lambda _book_id, _user_id: True,
            user_id=lambda: 1,
        )

    def _persist(self, _db, _session, book_id, mi):
        self.db.persist(book_id, mi)

    def test_apply_is_version_checked_and_idempotent(self):
        body = {
            "idempotency_key": "confirm-1",
            "selection_revision": self.record.user_revision["selection_revision"],
        }
        with mock.patch("webserver.services.metadata_ai.set_metadata_preserving_external_paths", self._persist):
            first = apply_task(self.handler, self.record, body)
            second = apply_task(self.handler, self.record, body)
        self.assertEqual(first["err"], "ok")
        self.assertFalse(first["idempotent"])
        self.assertTrue(second["idempotent"])
        self.assertTrue(second["task"]["editable"])
        self.assertEqual(self.db.values[1]["title"], "新书名")

    def test_undo_does_not_overwrite_later_manual_change(self):
        body = {
            "idempotency_key": "confirm-2",
            "selection_revision": self.record.user_revision["selection_revision"],
        }
        with mock.patch("webserver.services.metadata_ai.set_metadata_preserving_external_paths", self._persist):
            apply_task(self.handler, self.record, body)
            self.db.values[1]["title"] = "人工后改书名"
            response = undo_task(self.handler, self.record)
        self.assertEqual(response["err"], "ok")
        self.assertEqual(self.db.values[1]["title"], "人工后改书名")
        self.assertEqual(self.db.values[1]["publisher"], "旧出版社")
        undo_item = self.record.result_data["application"]["undo_items"][0]
        self.assertEqual(undo_item["conflicts"], ["title"])


class MetadataAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()
        super().tearDown()

    def test_create_is_idempotent_and_never_writes_book(self):
        with mock.patch.object(MetadataAIService, "submit") as submit:
            first = self.json(
                "/api/ai/metadata/tasks",
                method="POST",
                body=json.dumps({"book_ids": [test_main.BID_EPUB]}),
            )
            second = self.json(
                "/api/ai/metadata/tasks",
                method="POST",
                body=json.dumps({"book_ids": [test_main.BID_EPUB]}),
            )
        self.assertEqual(first["err"], "ok")
        self.assertFalse(first["idempotent"])
        self.assertTrue(second["idempotent"])
        submit.assert_called_once()

    def test_review_rejects_unknown_fields(self):
        with mock.patch.object(MetadataAIService, "submit"):
            created = self.json(
                "/api/ai/metadata/tasks",
                method="POST",
                body=json.dumps({"book_ids": [test_main.BID_EPUB]}),
            )["task"]
        session = test_main.get_db()
        record = session.get(models.AITask, created["id"])
        draft = deepcopy(record.ai_draft)
        draft["items"][0]["status"] = "succeeded"
        draft["items"][0]["suggestions"] = [{"field": "title", "value": "新标题"}]
        record.ai_draft = draft
        record.status = "succeeded"
        session.commit()
        response = self.json(
            f"/api/ai/metadata/tasks/{record.id}",
            method="PATCH",
            body=json.dumps({"items": [{"book_id": test_main.BID_EPUB, "fields": ["cover"]}]}),
        )
        self.assertEqual(response["err"], "params.invalid")
