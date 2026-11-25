import json
import unittest
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.agent_runtime import AgentRuntime, AgentRuntimeError, RuntimeErrorCode, RuntimeProbe
from webserver.services.tag_organizer import (
    TagOrganizerService,
    TagOrganizerValidationError,
    changed_tags,
    deterministic_suggestions,
    normalize_tag,
    suggestion_id,
    tag_version,
    validate_runtime_suggestions,
)


class TagOrganizerRuleTest(unittest.TestCase):
    def test_normalizes_full_width_whitespace_and_case_equivalents(self):
        self.assertEqual(normalize_tag("  ＳＦ   小说  "), "SF 小说")
        items = deterministic_suggestions(
            [
                {"name": "Science Fiction", "count": 5},
                {"name": "science fiction", "count": 2},
                {"name": "  历史  小说 ", "count": 1},
            ]
        )
        by_source = {item["source"]: item for item in items}
        self.assertEqual(by_source["science fiction"]["action"], "merge")
        self.assertEqual(by_source["science fiction"]["target"], "Science Fiction")
        self.assertEqual(by_source["  历史  小说 "]["target"], "历史 小说")
        self.assertTrue(all(item["selected"] for item in items))

    def test_agent_output_is_closed_schema_and_low_confidence_starts_unselected(self):
        checked = validate_runtime_suggestions(
            {
                "suggestions": [
                    {
                        "source": "科幻",
                        "action": "merge",
                        "target": "科学幻想",
                        "reason": "两个标签在当前命名体系中为近义表达",
                        "confidence": 0.62,
                    }
                ]
            },
            ["科幻"],
        )
        self.assertFalse(checked[0]["selected"])
        with self.assertRaises(TagOrganizerValidationError):
            validate_runtime_suggestions(
                {
                    "suggestions": [
                        {
                            "source": "科幻",
                            "action": "merge",
                            "target": "ＫＥ幻",
                            "reason": "无效来源",
                            "confidence": 0.9,
                            "extra": True,
                        }
                    ]
                },
                ["科幻"],
            )

    def test_applies_exclusions_and_deduplicates_targets(self):
        suggestions = [
            {
                "source": "sci-fi",
                "target": "科幻",
                "action": "merge",
                "selected": True,
                "excluded_book_ids": [2],
            }
        ]
        self.assertEqual(changed_tags(["sci-fi", "科幻"], suggestions, 1), ["科幻"])
        self.assertEqual(changed_tags(["sci-fi"], suggestions, 2), ["sci-fi"])


class FailingRuntime(AgentRuntime):
    name = "failing-fixture"

    def probe(self):
        return RuntimeProbe(True, self.name)

    def generate(self, request, on_event):
        raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "协议未到达终态")

    def cancel(self, task_id):
        return False


class TagOrganizerAPITest(test_main.TestWithUserLogin):
    @classmethod
    def setUpClass(cls):
        if test_main._app is None:
            test_main.setup_server()
            test_main.setup_mock_user()
            test_main.setup_mock_sendmail()
            test_main.setup_mock_service()
        super().setUpClass()

    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.TagOrganizationChange).delete()
        session.query(models.TagOrganizationTask).delete()
        session.commit()
        self.db = self._app.settings["legacy"]
        self.original_tags = list(self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags or [])

    def tearDown(self):
        self.db.set_tags(test_main.BID_EPUB, self.original_tags)
        session = test_main.get_db()
        session.query(models.TagOrganizationChange).delete()
        session.query(models.TagOrganizationTask).delete()
        session.commit()
        super().tearDown()

    def _create_ready(self):
        with mock.patch.object(TagOrganizerService, "submit"):
            response = self.json(
                "/api/ai/tag_organizer/tasks",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps({"scope": {"type": "books", "book_ids": [test_main.BID_EPUB]}}),
            )
        self.assertEqual(response["err"], "ok")
        session = test_main.get_db()
        record = session.get(models.TagOrganizationTask, response["task"]["id"])
        source = record.scope_data["books"][0]["tags"][0]
        target = "TB59 整理后标签"
        record.status = "ready"
        record.suggestions = {
            "items": [
                {
                    "id": suggestion_id(source, "rename", target),
                    "source": source,
                    "action": "rename",
                    "target": target,
                    "reason": "测试重命名",
                    "confidence": 0.99,
                    "selected": True,
                    "origin": "rule",
                }
            ]
        }
        session.commit()
        return record.id, source, target

    def _preview(self, task_id):
        session = test_main.get_db()
        record = session.get(models.TagOrganizationTask, task_id)
        suggestion = record.suggestions["items"][0]
        updated = self.json(
            f"/api/ai/tag_organizer/tasks/{task_id}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "adjustments": [
                        {
                            "id": suggestion["id"],
                            "selected": True,
                            "target": suggestion["target"],
                            "excluded_book_ids": [],
                        }
                    ]
                }
            ),
        )
        self.assertEqual(updated["err"], "ok")
        preview = self.json(f"/api/ai/tag_organizer/tasks/{task_id}/preview", method="POST", body=b"")
        self.assertEqual(preview["err"], "ok")
        self.assertEqual(preview["task"]["preview"]["summary"]["changed_books"], 1)
        return preview["task"]["preview"]["token"]

    def _execute(self, task_id, token):
        return self.json(
            f"/api/ai/tag_organizer/tasks/{task_id}/execute",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_token": token, "idempotency_key": "execute-fixture-key"}),
        )

    def test_preview_execute_idempotency_and_safe_undo(self):
        task_id, source, target = self._create_ready()
        token = self._preview(task_id)
        executed = self._execute(task_id, token)
        self.assertEqual(executed["err"], "ok")
        self.assertEqual(executed["task"]["result"]["succeeded"], 1)
        self.assertIn(target, self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags)
        self.assertNotIn(source, self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags)

        repeated = self._execute(task_id, token)
        self.assertTrue(repeated["idempotent"])

        undone = self.json(
            f"/api/ai/tag_organizer/tasks/{task_id}/undo",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"idempotency_key": "undo-fixture-key"}),
        )
        self.assertEqual(undone["err"], "ok")
        self.assertEqual(undone["task"]["result"]["undone"], 1)
        self.assertIn(source, self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags)

    def test_undo_does_not_overwrite_later_manual_tag_edits(self):
        task_id, _source, target = self._create_ready()
        token = self._preview(task_id)
        self._execute(task_id, token)
        manual_tags = list(self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags or []) + ["人工后续修改"]
        self.db.set_tags(test_main.BID_EPUB, manual_tags)

        undone = self.json(
            f"/api/ai/tag_organizer/tasks/{task_id}/undo",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"idempotency_key": "undo-conflict-key"}),
        )
        self.assertEqual(undone["task"]["result"]["undo_conflicts"], 1)
        current = self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags
        self.assertIn(target, current)
        self.assertIn("人工后续修改", current)

    def test_partial_retry_reports_task_wide_totals(self):
        task_id, _source, target = self._create_ready()
        token = self._preview(task_id)
        with mock.patch.object(self.db, "set_tags", side_effect=RuntimeError("temporary write failure")):
            failed = self._execute(task_id, token)
        self.assertEqual(failed["task"]["result"], {"succeeded": 0, "skipped": 0, "failed": 1, "undone": 0})

        retried = self.json(f"/api/ai/tag_organizer/tasks/{task_id}/retry", method="POST", body=b"")
        self.assertEqual(retried["err"], "ok")
        self.assertEqual(retried["task"]["result"], {"succeeded": 1, "skipped": 0, "failed": 0, "undone": 0})
        self.assertIn(target, self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags)

    def test_acl_change_between_analysis_and_preview_is_a_conflict(self):
        task_id, _source, _target = self._create_ready()
        session = test_main.get_db()
        record = session.get(models.TagOrganizationTask, task_id)
        suggestion = record.suggestions["items"][0]
        self.json(
            f"/api/ai/tag_organizer/tasks/{task_id}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "adjustments": [
                        {
                            "id": suggestion["id"],
                            "selected": True,
                            "target": suggestion["target"],
                            "excluded_book_ids": [],
                        }
                    ]
                }
            ),
        )
        with mock.patch("webserver.handlers.tag_organizer._can_edit_book", return_value=False):
            preview = self.json(f"/api/ai/tag_organizer/tasks/{task_id}/preview", method="POST", body=b"")
        self.assertEqual(preview["task"]["preview"]["summary"], {"changed_books": 0, "conflicts": 1})

    def test_runtime_protocol_failure_never_changes_calibre_tags(self):
        task_id, _source, _target = self._create_ready()
        session = test_main.get_db()
        record = session.get(models.TagOrganizationTask, task_id)
        record.status = "analyzing"
        record.suggestions = {}
        session.commit()
        before = tag_version(self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags or [])
        service = TagOrganizerService()
        service.setup(self._app.settings["SessionMaker"], {}, runtime=FailingRuntime())
        service._run(task_id)
        failed = test_main.get_db().get(models.TagOrganizationTask, task_id)
        self.assertEqual(failed.status, "failed")
        self.assertEqual(failed.suggestions, {})
        after = tag_version(self.db.get_metadata(test_main.BID_EPUB, index_is_id=True).tags or [])
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
