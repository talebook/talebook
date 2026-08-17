import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
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


class ProtagonistAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
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
        preview.result_data = manifest_payload(1 if cutoff == CHAPTERS[0]["href"] else 2)
        session.commit()
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
        session = test_main.get_db()
        self.assertIsNone(session.get(models.ProtagonistAgent, agent["id"]))
        self.assertIsNone(session.get(models.ProtagonistConversation, conversation["id"]))
        self.assertIsNone(session.get(models.ProtagonistMessage, message_id))

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
