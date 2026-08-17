import json
import time
import unittest
from unittest import mock

from tests import test_main
from webserver import models
from webserver.handlers import ai
from webserver.services.agent_runtime import RuntimeProbe
from webserver.services.ai_registry import AIFeatureRegistry
from webserver.services.summary_duck import FEATURE_KEY, SummaryDuckService


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


CHAPTER = "第一段给出事实，第二段补充证据，第三段说明边界。" * 20


class FeatureRegistryTest(unittest.TestCase):
    def test_capability_failures_are_isolated_and_ordered(self):
        class Feature:
            def __init__(self, key, broken=False):
                self.key = key
                self.broken = broken

            def capability(self, _handler):
                if self.broken:
                    raise RuntimeError("private diagnostic")
                return {"id": self.key, "name": self.key}

        registry = AIFeatureRegistry([Feature("working"), Feature("broken", broken=True)])
        items, errors = registry.capabilities(object())

        self.assertEqual([item["id"] for item in items], ["working", "broken"])
        self.assertTrue(items[0]["name"])
        self.assertFalse(items[1]["available"])
        self.assertEqual(items[1]["reason"], "capability_probe_failed")
        self.assertEqual(errors, [{"feature": "broken", "code": "capability_probe_failed"}])

    def test_duplicate_feature_keys_are_rejected(self):
        feature = mock.Mock(key="same")
        registry = AIFeatureRegistry([feature])
        with self.assertRaisesRegex(ValueError, "already registered"):
            registry.register(feature)


class AIHubAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()
        ai.SummaryDuckFeature._probe_cache = (
            time.monotonic(),
            RuntimeProbe(available=True, runtime="fixture", version="1.0.0"),
        )

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()
        ai.SummaryDuckFeature._probe_cache = None
        super().tearDown()

    def _create(self, number=1):
        with mock.patch.object(SummaryDuckService, "submit"):
            response = self.json(
                f"/api/ai/{FEATURE_KEY}/tasks",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps(
                    {
                        "book_id": test_main.BID_EPUB,
                        "chapter_text": CHAPTER + str(number),
                        "chapter_href": f"Text/chapter-{number}.xhtml",
                        "chapter_title": f"第 {number} 章",
                    }
                ),
            )
        self.assertEqual(response["err"], "ok")
        return response["task"]["id"]

    def test_capability_contract_reports_flags_scope_and_runtime_state(self):
        response = self.json("/api/ai/hub/capabilities")

        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["partial_errors"], [])
        capability = response["capabilities"][0]
        self.assertEqual(capability["id"], FEATURE_KEY)
        self.assertEqual(capability["scope"], "chapter")
        self.assertEqual(capability["feature_flag"], "AI_SUMMARY_DUCK_ENABLED")
        self.assertEqual(capability["permissions"], ["login", "book.read"])
        self.assertTrue(capability["available"])
        self.assertNotIn("runtime", capability)

    def test_disabled_capability_keeps_a_safe_reason(self):
        with mock.patch.dict(ai.CONF, {"AI_SUMMARY_DUCK_ENABLED": False}):
            response = self.json("/api/ai/hub/capabilities")

        capability = response["capabilities"][0]
        self.assertFalse(capability["available"])
        self.assertEqual(capability["reason"], "feature_disabled")

    def test_tasks_are_status_mapped_filtered_paginated_and_minimized(self):
        ids = [self._create(number) for number in range(1, 5)]
        session = test_main.get_db()
        statuses = ["queued", "running", "failed", "succeeded"]
        for task_id, status in zip(ids, statuses):
            record = session.get(models.AITask, task_id)
            record.status = status
            record.result_data = {"items": [{"answer": "must not leak"}]}
            if status == "failed":
                record.error_code = "runtime.internal"
                record.error_message = "private server detail"
        session.commit()

        response = self.json("/api/ai/hub/tasks?page=1&page_size=2")
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["pagination"], {"page": 1, "page_size": 2, "total": 4, "pages": 2})
        self.assertEqual(response["category_counts"], {"running": 2, "pending_confirmation": 0, "failed": 1, "completed": 1})
        self.assertEqual(len(response["tasks"]), 2)
        summary = response["tasks"][0]
        self.assertEqual(
            set(summary),
            {
                "id", "feature", "object", "category", "status", "progress", "progress_message",
                "created_at", "updated_at", "detail_url", "allowed_actions", "safe_error",
            },
        )
        serialized = json.dumps(response, ensure_ascii=False)
        self.assertNotIn("must not leak", serialized)
        self.assertNotIn("private server detail", serialized)
        self.assertNotIn("usage", serialized)

        failed = self.json("/api/ai/hub/tasks?category=failed&library=local")
        self.assertEqual(failed["pagination"]["total"], 1)
        self.assertEqual(failed["tasks"][0]["safe_error"], {"code": "runtime.internal"})
        self.assertFalse(failed["tasks"][0]["allowed_actions"]["retry"])

        invalid = self.json("/api/ai/hub/tasks?category=secret")
        self.assertEqual(invalid["err"], "params.invalid")

    def test_tasks_recheck_creator_and_book_acl(self):
        own_id = self._create()
        session = test_main.get_db()
        own = session.get(models.AITask, own_id)
        other = models.AITask(
            id="11111111-1111-1111-1111-111111111111",
            request_key="f" * 64,
            feature=FEATURE_KEY,
            creator_id=2,
            book_id=own.book_id,
            book_version=own.book_version,
            chapter_href="Text/private.xhtml",
            chapter_title="他人的章节",
            chapter_text_hash="e" * 64,
            chapter_length=100,
        )
        session.add(other)
        session.commit()

        response = self.json("/api/ai/hub/tasks")
        self.assertEqual(response["pagination"]["total"], 1)
        self.assertEqual(response["tasks"][0]["id"], own_id)

        with mock.patch.object(ai._AITaskBase, "can_view_book", return_value=False):
            hidden = self.json("/api/ai/hub/tasks")
        self.assertEqual(hidden["tasks"], [])

    def test_cancel_is_declared_then_revalidated_and_retry_is_rejected(self):
        task_id = self._create()
        with mock.patch.object(SummaryDuckService, "cancel", return_value=False):
            response = self.json(f"/api/ai/hub/tasks/{FEATURE_KEY}/{task_id}/cancel", method="POST", body="")
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["task"]["status"], "cancelled")

        repeated = self.json(f"/api/ai/hub/tasks/{FEATURE_KEY}/{task_id}/cancel", method="POST", body="")
        self.assertEqual(repeated["err"], "ai.action_not_allowed")
        retry = self.json(f"/api/ai/hub/tasks/{FEATURE_KEY}/{task_id}/retry", method="POST", body="")
        self.assertEqual(retry["err"], "ai.action_not_allowed")

        with mock.patch.object(ai._AITaskBase, "can_view_book", return_value=False):
            hidden = self.json(f"/api/ai/hub/tasks/{FEATURE_KEY}/{task_id}/cancel", method="POST", body="")
        self.assertEqual(hidden["err"], "ai.not_found")

    def test_unregistered_feature_is_a_local_error(self):
        task_id = self._create()
        session = test_main.get_db()
        record = session.get(models.AITask, task_id)
        record.feature = "future_feature"
        session.commit()

        response = self.json("/api/ai/hub/tasks")
        self.assertEqual(response["tasks"], [])
        self.assertEqual(response["partial_errors"], [{"feature": "future_feature", "code": "feature_unregistered"}])

    def test_events_accept_only_allowlisted_metadata_and_do_not_log_content(self):
        task_id = self._create()
        with mock.patch.object(ai.LOG, "info") as info:
            response = self.json(
                "/api/ai/hub/events",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps(
                    {
                        "event": "task_open",
                        "feature": FEATURE_KEY,
                        "task_id": task_id,
                        "chapter_text": "sensitive body",
                        "result": "sensitive output",
                    }
                ),
            )
        self.assertEqual(response["err"], "ok")
        self.assertNotIn("sensitive", repr(info.call_args))
        self.assertNotIn(task_id, repr(info.call_args))

        invalid = self.json(
            "/api/ai/hub/events",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"event": "prompt_submitted"}),
        )
        self.assertEqual(invalid["err"], "params.invalid")


if __name__ == "__main__":
    unittest.main()
