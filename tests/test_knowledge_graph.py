import json
import threading
import unittest
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.agent_runtime import RuntimeResult
from webserver.services.knowledge_graph import (
    FEATURE_KEY,
    PROMPT_VERSION,
    SCHEMA_VERSION,
    KnowledgeGraphService,
    KnowledgeGraphValidationError,
    extract_epub_chapters,
    merge_segments,
    scope_fingerprint,
    validate_segment,
)


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


def valid_segment(chapter, confidence=0.9):
    start = next(index for index, value in enumerate(chapter["text"]) if not value.isspace())
    end = min(start + 18, len(chapter["text"]))
    citation = {
        "href": chapter["href"],
        "start": start,
        "end": end,
        "quote": chapter["text"][start:end],
    }
    return {
        "entities": [
            {
                "id": "person-1",
                "name": "张英才",
                "type": "person",
                "aliases": ["英才"],
                "description": "原文中的人物。",
                "confidence": confidence,
                "citations": [citation],
            },
            {
                "id": "place-1",
                "name": "大张家寨",
                "type": "place",
                "aliases": [],
                "description": "人物所在的地点。",
                "confidence": confidence,
                "citations": [citation],
            },
        ],
        "relations": [
            {
                "source_id": "person-1",
                "target_id": "place-1",
                "type": "来自",
                "description": "张英才来自大张家寨。",
                "direction": "forward",
                "confidence": confidence,
                "citations": [citation],
            }
        ],
    }


class KnowledgeGraphValidationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.chapters = extract_epub_chapters("tests/cases/old.epub")
        cls.chapter = cls.chapters[1]

    def test_extracts_spine_and_resolves_requested_reader_href(self):
        self.assertGreater(len(self.chapters), 20)
        requested = f"http://localhost/get/1/book/{self.chapter['href']}?v=1"
        selected = extract_epub_chapters("tests/cases/old.epub", [requested])
        self.assertEqual(selected[0]["href"], self.chapter["href"])
        self.assertGreater(len(selected[0]["text"]), 80)

    def test_validates_every_node_and_relation_citation(self):
        checked = validate_segment(valid_segment(self.chapter), self.chapter)
        self.assertEqual(len(checked["entities"]), 2)
        self.assertEqual(checked["relations"][0]["direction"], "forward")

        invalid = valid_segment(self.chapter)
        invalid["relations"][0]["citations"][0]["quote"] = "伪造引用"
        with self.assertRaisesRegex(KnowledgeGraphValidationError, "不匹配"):
            validate_segment(invalid, self.chapter)

        missing = valid_segment(self.chapter)
        missing["entities"][0]["citations"] = []
        with self.assertRaisesRegex(KnowledgeGraphValidationError, "必须包含"):
            validate_segment(missing, self.chapter)

    def test_preserves_literal_entity_text_for_safe_dom_rendering(self):
        payload = valid_segment(self.chapter)
        payload["entities"][0]["name"] = "张英才 <校长> & 教师"
        checked = validate_segment(payload, self.chapter)
        self.assertEqual(checked["entities"][0]["name"], "张英才 <校长> & 教师")

    def test_merges_exact_names_and_explicit_aliases_but_exposes_conflicts(self):
        first = validate_segment(valid_segment(self.chapter), self.chapter)
        second_payload = valid_segment(self.chapter)
        second_payload["entities"][0]["id"] = "person-2"
        second_payload["entities"][0]["name"] = "英才"
        second_payload["entities"][0]["aliases"] = ["张英才", "老师"]
        second_payload["relations"][0]["source_id"] = "person-2"
        second_payload["entities"][1]["type"] = "person"
        second_payload["entities"][1]["aliases"] = ["老师"]
        second = validate_segment(second_payload, self.chapter)
        merged = merge_segments([first, second])
        people = [node for node in merged["graph"]["nodes"] if node["name"] in {"张英才", "英才"}]
        self.assertEqual(len(people), 1)
        self.assertIn("英才", people[0]["aliases"])
        self.assertEqual(merged["review"]["alias_conflicts"][0]["alias"], "老师")
        self.assertEqual(merged["stats"]["node_citation_coverage"], 1.0)

    def test_does_not_merge_multiple_entities_claiming_the_same_exact_alias(self):
        segments = []
        for index, name in enumerate(["张英才", "李老师", "老师"]):
            payload = valid_segment(self.chapter)
            payload["entities"][0]["id"] = f"person-{index}"
            payload["entities"][0]["name"] = name
            payload["entities"][0]["aliases"] = ["老师"] if name != "老师" else []
            payload["relations"][0]["source_id"] = f"person-{index}"
            segments.append(validate_segment(payload, self.chapter))
        merged = merge_segments(segments)
        people = [node for node in merged["graph"]["nodes"] if node["type"] == "person"]
        self.assertEqual({node["name"] for node in people}, {"张英才", "李老师", "老师"})
        conflict = next(item for item in merged["review"]["alias_conflicts"] if item["alias"] == "老师")
        self.assertEqual(conflict["names"], ["张英才", "李老师", "老师"])

    def test_low_confidence_items_are_not_silently_promoted(self):
        checked = validate_segment(valid_segment(self.chapter, confidence=0.4), self.chapter)
        merged = merge_segments([checked])
        self.assertEqual(merged["graph"]["nodes"], [])
        self.assertGreaterEqual(len(merged["review"]["low_confidence"]), 3)


class _FakeGraphRuntime:
    name = "fake_graph_runtime"

    def generate(self, request, on_event):
        chapter = json.loads(request.prompt)["chapter"]
        return RuntimeResult(valid_segment(chapter), {"input_tokens": 10, "output_tokens": 20}, "fake-session")

    def cancel(self, task_id):
        return False


class KnowledgeGraphServiceTest(unittest.TestCase):
    def setUp(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()

    def test_pipeline_checkpoints_structured_segments_then_publishes_graph(self):
        chapter = extract_epub_chapters("tests/cases/old.epub")[1]
        scope = {
            "kind": "chapter",
            "label": chapter["title"],
            "chapter_hrefs": [chapter["href"]],
            "chapter_count": 1,
            "character_count": len(chapter["text"]),
        }
        record = models.AITask(
            id="22222222-2222-2222-2222-222222222222",
            request_key="2" * 64,
            feature=FEATURE_KEY,
            creator_id=1,
            book_id=test_main.BID_EPUB,
            book_version="fixture",
            chapter_href="graph:fixture",
            chapter_title=chapter["title"],
            chapter_text_hash=scope_fingerprint([chapter]),
            chapter_length=len(chapter["text"]),
            status="queued",
            ai_draft={"scope": scope, "segments": {}},
            schema_version=SCHEMA_VERSION,
            prompt_version=PROMPT_VERSION,
        )
        session = test_main.get_db()
        session.add(record)
        session.commit()

        service = object.__new__(KnowledgeGraphService)
        service._configured = False
        service._threads = {}
        service._threads_lock = threading.Lock()
        service.setup(test_main._app.settings["SessionMaker"], {}, runtime=_FakeGraphRuntime())
        service._run(record.id, "tests/cases/old.epub", [chapter["href"]])

        finished = test_main.get_db().get(models.AITask, record.id)
        self.assertEqual(finished.status, "succeeded")
        self.assertIn(chapter["href"], finished.ai_draft["segments"])
        self.assertEqual(len(finished.result_data["graph"]["nodes"]), 2)
        self.assertEqual(len(finished.result_data["graph"]["relations"]), 1)
        self.assertEqual(finished.usage["input_tokens"], 10)


class KnowledgeGraphAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()
        book = test_main._app.settings["legacy"].get_data_as_dict(ids=[test_main.BID_EPUB])[0]
        self.chapter_href = extract_epub_chapters(book["fmt_epub"])[0]["href"]

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.commit()
        super().tearDown()

    def _post(self, body):
        return self.json(
            f"/api/ai/{FEATURE_KEY}/tasks",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"book_id": test_main.BID_EPUB, **body}),
        )

    def test_previews_processing_volume_without_creating_a_task(self):
        response = self._post({"scope": "chapter", "chapter_href": self.chapter_href, "preview_only": True})
        self.assertEqual(response["err"], "ok", response)
        self.assertEqual(response["estimate"]["chapter_count"], 1)
        self.assertGreater(response["estimate"]["character_count"], 80)
        self.assertEqual(test_main.get_db().query(models.AITask).count(), 0)

    def test_create_is_idempotent_creator_scoped_and_feature_serialized(self):
        body = {"scope": "chapter", "chapter_href": self.chapter_href}
        with mock.patch.object(KnowledgeGraphService, "submit"):
            first = self._post(body)
            second = self._post(body)
            detail = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{first['task']['id']}")
        self.assertEqual(first["err"], "ok", first)
        self.assertEqual(first["task"]["feature"], FEATURE_KEY)
        self.assertEqual(first["task"]["scope"]["chapter_count"], 1)
        self.assertEqual(first["task"]["id"], second["task"]["id"])
        self.assertTrue(second["idempotent"])

        self.assertEqual(detail["task"]["graph"]["nodes"], [])
        listed = self.json(f"/api/ai/{FEATURE_KEY}/tasks?book_id={test_main.BID_EPUB}")
        self.assertEqual(listed["tasks"][0]["id"], first["task"]["id"])

    def test_acl_and_book_version_are_rechecked_on_every_result_read(self):
        with mock.patch.object(KnowledgeGraphService, "submit"):
            task = self._post({"scope": "chapter", "chapter_href": self.chapter_href})["task"]
        with mock.patch("webserver.handlers.ai._AITaskBase.can_view_book", return_value=False):
            hidden = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{task['id']}")
        self.assertEqual(hidden["err"], "ai.not_found")
        with mock.patch("webserver.handlers.ai._book_version", return_value="changed"):
            stale = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{task['id']}")
        self.assertEqual(stale["err"], "ai.book_version_changed")

    def test_invalid_range_and_non_epub_fail_closed(self):
        invalid = self._post({"scope": "chapter", "chapter_href": "missing.xhtml", "preview_only": True})
        self.assertEqual(invalid["err"], "params.invalid")
        with mock.patch("webserver.handlers.ai._AITaskBase.get_book", return_value={"id": 1, "fmt_epub": None}):
            unsupported = self._post({"scope": "book", "preview_only": True})
        self.assertEqual(unsupported["err"], "book.not_found")

    def test_running_task_is_resumed_from_persisted_scope_after_a_process_restart(self):
        with mock.patch.object(KnowledgeGraphService, "submit"):
            task = self._post({"scope": "chapter", "chapter_href": self.chapter_href})["task"]
        session = test_main.get_db()
        record = session.get(models.AITask, task["id"])
        record.status = "running"
        session.commit()
        with mock.patch.object(KnowledgeGraphService, "submit") as submit:
            response = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{task['id']}")
        self.assertEqual(response["err"], "ok")
        submit.assert_called_once()
        self.assertEqual(submit.call_args.args[2], [self.chapter_href])


class KnowledgeGraphStaticContractTest(unittest.TestCase):
    def test_contract_uses_runtime_and_never_openai_sdk(self):
        source = Path("webserver/services/knowledge_graph.py").read_text(encoding="utf-8")
        self.assertIn("RuntimeRequest", source)
        self.assertIn("CodexAppServerRuntime", source)
        self.assertNotIn("import openai", source.lower())
        self.assertNotIn("from openai", source.lower())


if __name__ == "__main__":
    unittest.main()
