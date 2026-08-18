import json
import tempfile
import threading
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.agent_runtime import RuntimeResult
from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStorage, ensure_workspace_id
from webserver.services.knowledge_graph import (
    ARTIFACT_FEATURE_SLUG,
    FEATURE_KEY,
    PROMPT_VERSION,
    SCHEMA_VERSION,
    KnowledgeGraphService,
    KnowledgeGraphValidationError,
    extract_epub_chapters,
    load_graph_artifact,
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


class AIArtifactStorageTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.storage = AIArtifactStorage({"AI_ARTIFACT_ROOT": self.temporary.name})
        self.workspace = "a" * 32
        self.task_id = "11111111-1111-1111-1111-111111111111"

    def test_atomic_json_replace_and_sha_verified_read(self):
        first = self.storage.write_json(
            self.workspace,
            ARTIFACT_FEATURE_SLUG,
            self.task_id,
            "graph.json",
            {"value": 1},
        )
        second = self.storage.write_json(
            self.workspace,
            ARTIFACT_FEATURE_SLUG,
            self.task_id,
            "graph.json",
            {"value": 2},
        )
        self.assertNotEqual(first["sha256"], second["sha256"])
        self.assertEqual(
            self.storage.read_json(
                second,
                self.workspace,
                ARTIFACT_FEATURE_SLUG,
                self.task_id,
                {"graph.json"},
            ),
            {"value": 2},
        )
        directory = Path(self.temporary.name, self.workspace, ARTIFACT_FEATURE_SLUG, self.task_id)
        self.assertEqual([path.name for path in directory.iterdir()], ["graph.json"])

    def test_workspace_id_is_opaque_stable_and_persisted_in_user_record(self):
        session = test_main.get_db()
        reader = session.get(models.Reader, 1)
        original = dict(reader.extra or {})
        try:
            reader.extra = {key: value for key, value in original.items() if key != "ai_workspace_id"}
            first = ensure_workspace_id(session, reader.id)
            session.commit()
            second = ensure_workspace_id(session, reader.id)
            reader.extra = {key: value for key, value in original.items() if key != "ai_workspace_id"}
            independently_generated = ensure_workspace_id(session, reader.id)
            self.assertRegex(first, r"^[0-9a-f]{32}$")
            self.assertEqual(first, second)
            self.assertEqual(first, independently_generated)
            self.assertNotEqual(first, str(reader.id))
            self.assertNotIn(str(reader.username), first)
        finally:
            reader.extra = original
            session.commit()

    def test_rejects_cross_workspace_path_and_digest_tampering(self):
        metadata = self.storage.write_json(
            self.workspace,
            ARTIFACT_FEATURE_SLUG,
            self.task_id,
            "graph.json",
            {"private": True},
        )
        crossed = dict(metadata)
        crossed["relative_path"] = crossed["relative_path"].replace(self.workspace, "b" * 32, 1)
        with self.assertRaises(AIArtifactError):
            self.storage.read_json(
                crossed,
                self.workspace,
                ARTIFACT_FEATURE_SLUG,
                self.task_id,
                {"graph.json"},
            )
        path = Path(self.temporary.name, metadata["relative_path"])
        path.write_text('{"private":false}', encoding="utf-8")
        with self.assertRaisesRegex(AIArtifactError, "摘要"):
            self.storage.read_json(
                metadata,
                self.workspace,
                ARTIFACT_FEATURE_SLUG,
                self.task_id,
                {"graph.json"},
            )

    def test_deletes_only_the_exact_task_directory(self):
        metadata = self.storage.write_json(
            self.workspace,
            ARTIFACT_FEATURE_SLUG,
            self.task_id,
            "graph.json",
            {"value": 1},
        )
        task_dir = Path(self.temporary.name, metadata["relative_path"]).parent
        self.storage.delete_task(self.workspace, ARTIFACT_FEATURE_SLUG, self.task_id)
        self.assertFalse(task_dir.exists())
        self.assertTrue(Path(self.temporary.name).exists())
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

    def test_nested_package_uses_opf_relative_reader_href(self):
        container = """<?xml version="1.0"?>
        <container><rootfiles><rootfile full-path="OPS/package.opf"/></rootfiles></container>"""
        package = """<?xml version="1.0"?>
        <package><manifest><item id="chapter" href="text/chapter%202.html"
        media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>"""
        chapter = "<html><body><p>" + ("reader-facing chapter text " * 8) + "</p></body></html>"
        with tempfile.NamedTemporaryFile(suffix=".epub") as epub:
            with zipfile.ZipFile(epub.name, "w") as archive:
                archive.writestr("META-INF/container.xml", container)
                archive.writestr("OPS/package.opf", package)
                archive.writestr("OPS/text/chapter 2.html", chapter)
            chapters = extract_epub_chapters(epub.name)
            selected = extract_epub_chapters(epub.name, ["text/chapter%202.html"])
        self.assertEqual(chapters[0]["href"], "text/chapter 2.html")
        self.assertEqual(selected[0]["href"], "text/chapter 2.html")

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

    def test_citation_coverage_uses_high_confidence_candidates_as_denominator(self):
        checked = validate_segment(valid_segment(self.chapter), self.chapter)
        checked["entities"][0]["citations"] = []
        checked["relations"][0]["citations"] = []
        merged = merge_segments([checked])
        self.assertEqual(merged["stats"]["node_citation_coverage"], 0.5)
        self.assertEqual(merged["stats"]["relation_citation_coverage"], 0.0)


class _FakeGraphRuntime:
    name = "fake_graph_runtime"

    def generate(self, request, on_event):
        chapter = json.loads(request.prompt)["chapter"]
        return RuntimeResult(valid_segment(chapter), {"input_tokens": 10, "output_tokens": 20}, "fake-session")

    def cancel(self, task_id):
        return False


class KnowledgeGraphServiceTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        session = test_main.get_db()
        self.reader_extra = dict(session.get(models.Reader, 1).extra or {})
        session.query(models.AITask).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.get(models.Reader, 1).extra = self.reader_extra
        session.commit()
        self.temporary.cleanup()

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
            ai_draft={"scope": scope, "completed_segments": 0},
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
        service.setup(
            test_main._app.settings["SessionMaker"],
            {"AI_ARTIFACT_ROOT": self.temporary.name},
            runtime=_FakeGraphRuntime(),
        )
        service._run(record.id, "tests/cases/old.epub", [chapter["href"]])

        finished = test_main.get_db().get(models.AITask, record.id)
        self.assertEqual(finished.status, "succeeded")
        self.assertNotIn("segments", finished.ai_draft)
        self.assertNotIn("graph", finished.result_data)
        payload = load_graph_artifact(finished, AIArtifactStorage({"AI_ARTIFACT_ROOT": self.temporary.name}))
        self.assertEqual(len(payload["graph"]["nodes"]), 2)
        self.assertEqual(len(payload["graph"]["relations"]), 1)
        artifact_path = Path(self.temporary.name, finished.result_data["artifact"]["relative_path"])
        self.assertTrue(artifact_path.is_file())
        self.assertFalse((artifact_path.parent / "checkpoint.json").exists())
        self.assertEqual(finished.usage["input_tokens"], 10)


class KnowledgeGraphAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.config_patch = mock.patch.dict(
            "webserver.handlers.ai.CONF", {"AI_ARTIFACT_ROOT": self.temporary.name}, clear=False
        )
        self.config_patch.start()
        super().setUp()
        session = test_main.get_db()
        self.reader_extra = dict(session.get(models.Reader, 1).extra or {})
        session.query(models.AITask).delete()
        session.commit()
        book = test_main._app.settings["legacy"].get_data_as_dict(ids=[test_main.BID_EPUB])[0]
        self.epub_path = book["fmt_epub"]
        self.chapter_href = extract_epub_chapters(book["fmt_epub"])[0]["href"]

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).delete()
        session.get(models.Reader, 1).extra = self.reader_extra
        session.commit()
        super().tearDown()
        self.config_patch.stop()
        self.temporary.cleanup()

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

    def test_legacy_inline_result_is_migrated_then_read_exported_and_deleted_from_files(self):
        with mock.patch.object(KnowledgeGraphService, "submit"):
            task = self._post({"scope": "chapter", "chapter_href": self.chapter_href})["task"]
        chapter = extract_epub_chapters(self.epub_path, [self.chapter_href])[0]
        segment = validate_segment(valid_segment(chapter), chapter)
        result = merge_segments([segment])
        session = test_main.get_db()
        record = session.get(models.AITask, task["id"])
        scope = dict(record.ai_draft["scope"])
        result["scope"] = scope
        record.status = "succeeded"
        record.result_data = result
        record.ai_draft = {"scope": scope, "segments": {chapter["href"]: segment}}
        session.commit()

        detail = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}")
        self.assertEqual(detail["err"], "ok", detail)
        self.assertEqual(len(detail["task"]["graph"]["nodes"]), 2)

        migrated = test_main.get_db().get(models.AITask, record.id)
        self.assertNotIn("graph", migrated.result_data)
        self.assertNotIn("segments", migrated.ai_draft)
        artifact_path = Path(self.temporary.name, migrated.result_data["artifact"]["relative_path"])
        self.assertTrue(artifact_path.is_file())

        exported = self.fetch(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}/export")
        self.assertEqual(exported.code, 200)
        self.assertEqual(len(json.loads(exported.body)["graph"]["nodes"]), 2)

        deleted = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}", method="DELETE")
        self.assertEqual(deleted["err"], "ok")
        self.assertFalse(artifact_path.parent.exists())

    def test_acl_fails_before_a_corrupt_artifact_is_read(self):
        with mock.patch.object(KnowledgeGraphService, "submit"):
            task = self._post({"scope": "chapter", "chapter_href": self.chapter_href})["task"]
        chapter = extract_epub_chapters(self.epub_path, [self.chapter_href])[0]
        result = merge_segments([validate_segment(valid_segment(chapter), chapter)])
        session = test_main.get_db()
        record = session.get(models.AITask, task["id"])
        result["scope"] = dict(record.ai_draft["scope"])
        record.status = "succeeded"
        record.result_data = result
        session.commit()
        self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}")

        migrated = test_main.get_db().get(models.AITask, record.id)
        artifact_path = Path(self.temporary.name, migrated.result_data["artifact"]["relative_path"])
        artifact_path.write_text("{}", encoding="utf-8")
        with mock.patch("webserver.handlers.ai._AITaskBase.can_view_book", return_value=False):
            hidden = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}")
        self.assertEqual(hidden["err"], "ai.not_found")

        unavailable = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}")
        self.assertEqual(unavailable["err"], "ok")
        self.assertEqual(unavailable["task"]["error"]["code"], "artifact.unavailable")


class KnowledgeGraphStaticContractTest(unittest.TestCase):
    def test_contract_uses_runtime_and_never_openai_sdk(self):
        source = Path("webserver/services/knowledge_graph.py").read_text(encoding="utf-8")
        self.assertIn("RuntimeRequest", source)
        self.assertIn("CodexAppServerRuntime", source)
        self.assertNotIn("import openai", source.lower())
        self.assertNotIn("from openai", source.lower())


if __name__ == "__main__":
    unittest.main()
