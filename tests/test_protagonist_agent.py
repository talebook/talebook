import json
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.handlers import ai as ai_handlers
from webserver.services.ai_artifacts import AIArtifactError, AIArtifactStore, workspace_id
from webserver.services.protagonist_agent import (
    CHAT_SCHEMA_VERSION,
    ProtagonistService,
    ProtagonistValidationError,
    bounded_evidence,
    epub_spine,
    resolve_cutoff,
    validate_chat_output,
    validate_manifest,
    validate_user_prompt,
)


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


CHAPTERS = [
    {
        "index": 0,
        "href": "OPS/chapter-1.xhtml",
        "title": "第一章",
        "text": "林舟在雨中选择留下，先保护同伴，再追问真相。" * 20,
    },
    {"index": 1, "href": "OPS/chapter-2.xhtml", "title": "第二章", "text": "林舟拒绝轻率承诺，并用行动承担选择的代价。" * 20},
    {"index": 2, "href": "OPS/chapter-3.xhtml", "title": "第三章", "text": "未读章节揭示了不应提前知道的关键事实。" * 20},
]


def manifest_payload(source_count=2):
    return {
        "display_name": "林舟",
        "introduction": "一个先保护关键关系、再拆解不确定性的思考伙伴。",
        "thinking_patterns": ["先观察约束", "重视长期承诺", "把风险拆成可验证假设"],
        "decision_principles": ["先保护不可逆价值", "证据不足时设计小步试验"],
        "problem_solving_steps": ["明确真正冲突", "列出不可逆代价", "选择最小可验证行动"],
        "blind_spots": ["可能为了承诺而低估退出成本"],
        "sources": [{"href": chapter["href"], "title": chapter["title"]} for chapter in CHAPTERS[:source_count]],
    }


class ProtagonistEvidenceTest(unittest.TestCase):
    def test_epub_spine_is_ordered_and_cutoff_fails_closed(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "book.epub"
            with zipfile.ZipFile(path, "w") as archive:
                archive.writestr(
                    "META-INF/container.xml",
                    '<container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>',
                )
                archive.writestr(
                    "OPS/book.opf",
                    '<package><manifest><item id="c1" href="one.xhtml" media-type="application/xhtml+xml"/>'
                    '<item id="c2" href="two.xhtml" media-type="application/xhtml+xml"/></manifest>'
                    '<spine><itemref idref="c1"/><itemref idref="c2"/></spine></package>',
                )
                archive.writestr(
                    "OPS/one.xhtml", "<html><head><title>一</title></head><body><p>" + "甲" * 80 + "</p></body></html>"
                )
                archive.writestr(
                    "OPS/two.xhtml", "<html><head><title>二</title></head><body><p>" + "乙" * 80 + "</p></body></html>"
                )
            chapters = epub_spine(str(path))
        self.assertEqual([chapter["title"] for chapter in chapters], ["一", "二"])
        self.assertEqual(resolve_cutoff(chapters, "missing.xhtml")["index"], 0)
        self.assertEqual(resolve_cutoff(chapters, progress={"href": "OPS/two.xhtml#frag"})["index"], 1)

    def test_manifest_sources_stay_within_extraction_scope_and_chat_is_action_oriented(self):
        evidence = bounded_evidence(CHAPTERS, 1)
        checked = validate_manifest(manifest_payload(), evidence)
        self.assertTrue(checked["ai_derived"])
        with self.assertRaisesRegex(ProtagonistValidationError, "截止"):
            validate_manifest(manifest_payload(source_count=3), evidence)

        answer = validate_chat_output(
            {"content": "先写下两个选项中不可逆的代价，再设计一个今天能完成的小步试验。"},
        )
        self.assertIn("小步试验", answer["content"])

    def test_user_can_freely_choose_how_to_use_the_character_perspective(self):
        for prompt in ["用他的思路帮我解决团队冲突", "模仿他的语气给我一点勇气", "续写一下这个点子"]:
            self.assertEqual(validate_user_prompt(prompt), prompt)

    def test_plain_text_is_not_double_escaped(self):
        self.assertEqual(validate_user_prompt("A &amp; B 的选择"), "A & B 的选择")


class AIArtifactStoreTest(unittest.TestCase):
    def test_current_manifest_is_atomic_private_and_integrity_checked(self):
        with tempfile.TemporaryDirectory() as directory:
            store = AIArtifactStore(directory, "agents")
            first = store.replace_json(7, "agent-1", {"display_name": "林舟"})
            second = store.replace_json(7, "agent-1", {"display_name": "阿宁"})

            self.assertEqual(first.ref.relative_path, second.ref.relative_path)
            self.assertEqual(first.ref.relative_path, f"{workspace_id(7)}/agents/agent-1/manifest.json")
            self.assertNotIn("v1", first.ref.relative_path)
            self.assertEqual(store.read_json(7, second.ref.relative_path, second.ref.sha256)["display_name"], "阿宁")
            with self.assertRaises(AIArtifactError):
                store.read_json(8, second.ref.relative_path, second.ref.sha256)
            with self.assertRaises(AIArtifactError):
                store.read_json(7, "../agents/agent-1/manifest.json", second.ref.sha256)

            path = Path(directory, second.ref.relative_path)
            path.write_text('{"display_name":"tampered"}\n', encoding="utf-8")
            with self.assertRaisesRegex(AIArtifactError, "integrity"):
                store.read_json(7, second.ref.relative_path, second.ref.sha256)

    def test_restore_and_delete_keep_database_relative_paths_portable(self):
        with tempfile.TemporaryDirectory() as directory:
            store = AIArtifactStore(directory, "agents")
            first = store.replace_json(7, "agent-1", {"display_name": "林舟"})
            replacement = store.replace_json(7, "agent-1", {"display_name": "阿宁"})
            store.restore(7, replacement)
            self.assertEqual(store.read_json(7, first.ref.relative_path, first.ref.sha256)["display_name"], "林舟")
            with tempfile.TemporaryDirectory() as migrated_directory:
                shutil.copytree(directory, migrated_directory, dirs_exist_ok=True)
                migrated = AIArtifactStore(migrated_directory, "agents")
                self.assertEqual(
                    migrated.read_json(7, first.ref.relative_path, first.ref.sha256)["display_name"],
                    "林舟",
                )
            store.delete(7, first.ref.relative_path)
            self.assertFalse(Path(directory, first.ref.relative_path).exists())


class ProtagonistAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.artifact_directory = tempfile.TemporaryDirectory()
        self.artifact_config = mock.patch.dict(
            ai_handlers.CONF,
            {"AI_ARTIFACT_ROOT": self.artifact_directory.name},
        )
        self.artifact_config.start()
        self.workspace_secret = ai_handlers.CONF.get("cookie_secret") or "cookie_secret"
        self.artifacts = AIArtifactStore(
            self.artifact_directory.name,
            "agents",
            workspace_secret=self.workspace_secret,
        )
        session = test_main.get_db()
        session.query(models.ProtagonistMessage).delete()
        session.query(models.ProtagonistConversation).delete()
        session.query(models.ProtagonistAgent).delete()
        session.query(models.AITask).filter(models.AITask.feature == "protagonist_manifest").delete()
        session.commit()
        self.spine = mock.patch("webserver.handlers.ai.epub_spine", return_value=CHAPTERS)
        self.spine.start()

    def tearDown(self):
        self.spine.stop()
        session = test_main.get_db()
        session.query(models.ProtagonistMessage).delete()
        session.query(models.ProtagonistConversation).delete()
        session.query(models.ProtagonistAgent).delete()
        session.query(models.AITask).filter(models.AITask.feature == "protagonist_manifest").delete()
        session.commit()
        self.artifact_config.stop()
        self.artifact_directory.cleanup()
        super().tearDown()

    def _json_post(self, url, body):
        return self.json(url, method="POST", headers={"Content-Type": "application/json"}, body=json.dumps(body))

    def _create_preview(self, cutoff=CHAPTERS[1]["href"]):
        with mock.patch.object(ProtagonistService, "submit_preview"):
            response = self._json_post(
                "/api/ai/protagonist/previews",
                {"book_id": test_main.BID_EPUB, "name": "林舟", "cutoff_href": cutoff},
            )
        self.assertEqual(response["err"], "ok")
        session = test_main.get_db()
        preview = session.get(models.AITask, response["preview"]["id"])
        preview.status = "succeeded"
        manifest = manifest_payload(1 if cutoff == CHAPTERS[0]["href"] else 2)
        write = self.artifacts.replace_json(preview.creator_id, preview.id, manifest, preview=True)
        preview.result_data = write.ref.to_dict()
        session.commit()
        self.assertEqual(set(preview.result_data), {"artifact_path", "artifact_sha256", "artifact_status"})
        return preview.id

    def _create_agent(self, cutoff=CHAPTERS[1]["href"]):
        preview_id = self._create_preview(cutoff)
        response = self._json_post("/api/ai/protagonist/agents", {"preview_id": preview_id})
        self.assertEqual(response["err"], "ok")
        return response["agent"]

    def test_preview_supports_ai_recommendation_or_any_user_chosen_person(self):
        with mock.patch.object(ProtagonistService, "submit_preview"):
            recommended = self._json_post("/api/ai/protagonist/previews", {"book_id": test_main.BID_EPUB, "name": ""})
            chosen = self._json_post(
                "/api/ai/protagonist/previews",
                {"book_id": test_main.BID_EPUB, "name": "配角阿宁", "regenerate": True},
            )
        self.assertEqual(recommended["preview"]["cutoff"]["index"], len(CHAPTERS) - 1)
        session = test_main.get_db()
        chosen_record = session.get(models.AITask, chosen["preview"]["id"])
        self.assertEqual(chosen_record.ai_draft["requested_name"], "配角阿宁")

    def test_preview_confirm_conversation_message_feedback_and_delete(self):
        agent = self._create_agent()
        session = test_main.get_db()
        agent_record = session.get(models.ProtagonistAgent, agent["id"])
        artifact_path = agent_record.manifest_path
        persisted_manifest = self.artifacts.read_json(
            agent_record.creator_id,
            artifact_path,
            agent_record.manifest_sha256,
        )
        self.assertEqual(persisted_manifest["display_name"], agent["display_name"])
        self.assertNotIn("manifest", agent_record.__table__.columns)
        self.assertTrue(artifact_path.startswith(f"{workspace_id(agent_record.creator_id, self.workspace_secret)}/agents/"))
        conversation = self._json_post(f"/api/ai/protagonist/agents/{agent['id']}/conversations", {})["conversation"]
        with mock.patch.object(ProtagonistService, "submit_message"):
            response = self._json_post(
                f"/api/ai/protagonist/conversations/{conversation['id']}/messages",
                {"content": "在已读范围里，他会如何看待这个选择？"},
            )
        self.assertEqual(
            response["message"]["schema_version"] if "schema_version" in response["message"] else CHAT_SCHEMA_VERSION,
            CHAT_SCHEMA_VERSION,
        )
        message_id = response["message"]["id"]
        feedback = self.json(
            f"/api/ai/protagonist/messages/{message_id}/feedback",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"feedback": "not_like"}),
        )
        self.assertEqual(feedback["message"]["feedback"], "not_like")
        removed = self.json(f"/api/ai/protagonist/agents/{agent['id']}", method="DELETE")
        self.assertEqual(removed["err"], "ok")
        self.assertFalse(Path(self.artifact_directory.name, artifact_path).exists())
        session.expire_all()
        self.assertIsNone(session.get(models.ProtagonistAgent, agent["id"]))
        self.assertIsNone(session.get(models.ProtagonistConversation, conversation["id"]))
        self.assertIsNone(session.get(models.ProtagonistMessage, message_id))

    def test_corrupt_manifest_fails_closed_after_acl_checks(self):
        agent = self._create_agent()
        session = test_main.get_db()
        record = session.get(models.ProtagonistAgent, agent["id"])
        Path(self.artifact_directory.name, record.manifest_path).write_text("{}\n", encoding="utf-8")

        response = self.json(f"/api/ai/protagonist/agents/{agent['id']}")
        self.assertEqual(response["err"], "ai.artifact_unavailable")
        with mock.patch("webserver.handlers.ai._ProtagonistBase.can_view_book", return_value=False):
            hidden = self.json(f"/api/ai/protagonist/agents/{agent['id']}")
        self.assertEqual(hidden["err"], "book.not_found")

    def test_book_delete_cleans_agent_and_preview_artifacts(self):
        self._create_preview()
        agent = self._create_agent()
        session = test_main.get_db()
        artifact_paths = [
            row.result_data["artifact_path"]
            for row in session.query(models.AITask).filter(
                models.AITask.book_id == test_main.BID_EPUB,
                models.AITask.feature == "protagonist_manifest",
            )
            if (row.result_data or {}).get("artifact_path")
        ]
        agent_record = session.get(models.ProtagonistAgent, agent["id"])
        artifact_paths.append(agent_record.manifest_path)

        with mock.patch.object(self._app.settings["legacy"], "delete_book"):
            with test_main.mock_permission():
                response = self.json(f"/api/book/{test_main.BID_EPUB}/delete", method="POST", body="")

        self.assertEqual(response["err"], "ok")
        for relative_path in artifact_paths:
            self.assertFalse(Path(self.artifact_directory.name, relative_path).exists())

    def test_agent_model_can_be_regenerated_without_spoiler_confirmation(self):
        agent = self._create_agent(CHAPTERS[0]["href"])
        raised_preview = self._create_preview(CHAPTERS[1]["href"])
        accepted = self.json(
            f"/api/ai/protagonist/agents/{agent['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_id": raised_preview}),
        )
        self.assertEqual(accepted["agent"]["cutoff"]["index"], 1)

        lower_preview = self._create_preview(CHAPTERS[0]["href"])
        lowered = self.json(
            f"/api/ai/protagonist/agents/{agent['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_id": lower_preview}),
        )
        conversation = self._json_post(f"/api/ai/protagonist/agents/{agent['id']}/conversations", {})["conversation"]
        self.assertEqual(lowered["agent"]["cutoff"]["index"], 0)
        self.assertEqual(conversation["cutoff"]["index"], 0)

    def test_boundary_preview_cannot_change_agent_identity(self):
        agent = self._create_agent(CHAPTERS[0]["href"])
        preview_id = self._create_preview(CHAPTERS[1]["href"])
        session = test_main.get_db()
        preview = session.get(models.AITask, preview_id)
        preview.ai_draft = {**(preview.ai_draft or {}), "requested_name": "另一个角色"}
        session.commit()

        response = self.json(
            f"/api/ai/protagonist/agents/{agent['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_id": preview_id}),
        )
        self.assertEqual(response["err"], "ai.preview_required")

    def test_permissions_and_book_version_are_rechecked(self):
        agent = self._create_agent()
        with mock.patch("webserver.handlers.ai._ProtagonistBase.can_view_book", return_value=False):
            hidden = self.json(f"/api/ai/protagonist/agents/{agent['id']}")
        self.assertEqual(hidden["err"], "book.not_found")
        with mock.patch("webserver.handlers.ai._book_version", return_value="changed"):
            stale = self.json(f"/api/ai/protagonist/agents/{agent['id']}")
        self.assertEqual(stale["err"], "ai.book_version_changed")

    def test_problem_solving_request_reaches_runtime(self):
        agent = self._create_agent()
        conversation = self._json_post(f"/api/ai/protagonist/agents/{agent['id']}/conversations", {})["conversation"]
        with mock.patch.object(ProtagonistService, "submit_message") as submit:
            response = self._json_post(
                f"/api/ai/protagonist/conversations/{conversation['id']}/messages",
                {"content": "用林舟的思路帮我分析是否该接受这个工作机会"},
            )
        self.assertEqual(response["err"], "ok")
        submit.assert_called_once()
