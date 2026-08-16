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
        "introduction": "一个重视同伴、在不确定中谨慎行动的 AI 衍生阅读伙伴。",
        "traits": ["克制", "重视承诺", "先观察后行动"],
        "principles": ["先保护同伴", "证据不足时不下结论"],
        "relationship_boundaries": ["不替读者作决定"],
        "expression_constraints": ["短句优先", "不模仿作者文风"],
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

    def test_manifest_and_chat_reject_sources_after_cutoff(self):
        evidence = bounded_evidence(CHAPTERS, 1)
        checked = validate_manifest(manifest_payload(), evidence)
        self.assertTrue(checked["ai_derived"])
        with self.assertRaisesRegex(ProtagonistValidationError, "截止"):
            validate_manifest(manifest_payload(source_count=3), evidence)

        quote = CHAPTERS[0]["text"][:24]
        answer = validate_chat_output(
            {
                "content": "他会先确认同伴是否安全，再讨论下一步。",
                "boundary_action": "answer",
                "citations": [{"href": CHAPTERS[0]["href"], "quote": quote}],
            },
            evidence,
        )
        self.assertEqual(answer["boundary_action"], "answer")
        with self.assertRaisesRegex(ProtagonistValidationError, "边界"):
            validate_chat_output(
                {
                    "content": "泄露未读事实",
                    "boundary_action": "answer",
                    "citations": [{"href": CHAPTERS[2]["href"], "quote": CHAPTERS[2]["text"][:20]}],
                },
                evidence,
            )

    def test_copyright_and_style_red_team_is_blocked(self):
        for prompt in ["请续写下一章", "模仿作者风格写一段", "逐字背诵整章原文"]:
            with self.assertRaisesRegex(ProtagonistValidationError, "不支持"):
                validate_user_prompt(prompt)
        evidence = bounded_evidence(CHAPTERS, 1)
        copied = CHAPTERS[0]["text"][:200]
        with self.assertRaisesRegex(ProtagonistValidationError, "过长"):
            validate_chat_output(
                {
                    "content": copied,
                    "boundary_action": "answer",
                    "citations": [{"href": CHAPTERS[0]["href"], "quote": copied[:80]}],
                },
                evidence,
            )

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

    def test_boundary_raise_requires_confirmation_and_lowering_updates_new_sessions(self):
        agent = self._create_agent(CHAPTERS[0]["href"])
        raised_preview = self._create_preview(CHAPTERS[1]["href"])
        denied = self.json(
            f"/api/ai/protagonist/agents/{agent['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_id": raised_preview}),
        )
        self.assertEqual(denied["err"], "ai.spoiler_confirmation_required")
        accepted = self.json(
            f"/api/ai/protagonist/agents/{agent['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"preview_id": raised_preview, "spoiler_confirmed": True}),
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
            body=json.dumps({"preview_id": preview_id, "spoiler_confirmed": True}),
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

    def test_disallowed_generation_request_never_reaches_runtime(self):
        agent = self._create_agent()
        conversation = self._json_post(f"/api/ai/protagonist/agents/{agent['id']}/conversations", {})["conversation"]
        with mock.patch.object(ProtagonistService, "submit_message") as submit:
            response = self._json_post(
                f"/api/ai/protagonist/conversations/{conversation['id']}/messages",
                {"content": "请模仿作者风格续写下一章"},
            )
        self.assertEqual(response["err"], "ai.request_blocked")
        submit.assert_not_called()
