import json
import stat
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.agent_runtime import RuntimeEventType, RuntimeRequest
from webserver.services.ai_top5 import (
    FEATURE_KEY,
    PROMPT_VERSION,
    TOP5_OUTPUT_SCHEMA,
    AITop5Service,
    Top5ValidationError,
    build_prompt,
    clean_markdown,
    validate_chapter_input,
    validate_top5,
)
from webserver.services.codex_app_server import CodexAppServerRuntime


def setUpModule():
    if test_main._app is None:
        test_main.setup_server()
        test_main.setup_mock_user()
        test_main.setup_mock_sendmail()
        test_main.setup_mock_service()


CHAPTER = "第一段说明事实甲。第二段说明事实乙。第三段补充背景。" * 10
HREF = "Text/chapter-1.xhtml"


def valid_payload(text=CHAPTER, href=HREF):
    items = []
    for index in range(5):
        start = index * 11
        end = start + 8
        items.append(
            {
                "question": f"**问题 {index + 1}** 是什么？",
                "answer": f"答案 {index + 1} 强调 __事实__。",
                "citations": [{"href": href, "start": start, "end": end, "quote": text[start:end]}],
            }
        )
    return {"items": items}


class Top5ValidationTest(unittest.TestCase):
    def test_accepts_exactly_five_grounded_items(self):
        checked = validate_top5(valid_payload(), CHAPTER, HREF)
        self.assertEqual(len(checked["items"]), 5)
        self.assertIn("**问题", checked["items"][0]["question"])

    def test_rejects_out_of_bounds_or_mismatched_citation(self):
        payload = valid_payload()
        payload["items"][0]["citations"][0]["end"] = len(CHAPTER) + 1
        with self.assertRaisesRegex(Top5ValidationError, "越界"):
            validate_top5(payload, CHAPTER, HREF)

        payload = valid_payload()
        payload["items"][0]["citations"][0]["quote"] = "伪造引用"
        with self.assertRaisesRegex(Top5ValidationError, "不匹配"):
            validate_top5(payload, CHAPTER, HREF)

    def test_rejects_wrong_count_and_cross_chapter_href(self):
        with self.assertRaisesRegex(Top5ValidationError, "恰好"):
            validate_top5({"items": valid_payload()["items"][:4]}, CHAPTER, HREF)
        payload = valid_payload()
        payload["items"][2]["citations"][0]["href"] = "other.xhtml"
        with self.assertRaisesRegex(Top5ValidationError, "当前章节"):
            validate_top5(payload, CHAPTER, HREF)

    def test_markdown_cleaning_escapes_html_idempotently(self):
        once = clean_markdown("**重点** <script>alert(1)</script>", 100)
        twice = clean_markdown(once, 100)
        self.assertEqual(once, twice)
        self.assertNotIn("<script>", once)
        self.assertIn("**重点**", once)

    def test_chapter_is_minimized_and_capped(self):
        chapter = validate_chapter_input("正文事实。" * 6000, HREF, "标题")
        self.assertLessEqual(len(chapter["text"]), 20_000)
        with self.assertRaisesRegex(Top5ValidationError, "过短"):
            validate_chapter_input("太短", HREF)

    def test_prompt_reconstructs_the_chapter_instead_of_producing_five_generic_summaries(self):
        prompt = json.loads(build_prompt({"text": CHAPTER, "href": HREF, "title": "第一章"}))
        self.assertEqual(prompt["prompt_version"], PROMPT_VERSION)
        self.assertEqual(prompt["chapter"]["length"], len(CHAPTER))
        self.assertIn("中心判断", "".join(prompt["selection_framework"]))
        self.assertIn("关键机制", "".join(prompt["selection_framework"]))
        self.assertIn("决定性证据", "".join(prompt["selection_framework"]))
        self.assertIn("边界与张力", "".join(prompt["selection_framework"]))
        self.assertIn("后续含义", "".join(prompt["selection_framework"]))
        self.assertIn("不得臆测", "".join(prompt["source_boundary"]))
        self.assertIn("逐字等于", "".join(prompt["citation_rules"]))
        self.assertNotIn("http://", json.dumps(prompt, ensure_ascii=False))
        self.assertNotIn("https://", json.dumps(prompt, ensure_ascii=False))


class CodexProtocolContractTest(unittest.TestCase):
    def test_stdio_fixture_requires_completed_terminal_and_returns_structured_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            identity = root / "identity"
            identity.mkdir()
            (identity / "auth.json").write_text("{}", encoding="utf-8")
            executable = root / "fake-codex"
            payload = json.dumps(valid_payload(), ensure_ascii=False)
            executable.write_text(
                "#!" + sys.executable + "\n"
                "import json,sys\n"
                f"PAYLOAD={payload!r}\n"
                "if '--version' in sys.argv: print('codex-cli 0.147.0'); raise SystemExit\n"
                "if len(sys.argv)>2 and sys.argv[1:3]==['login','status']: raise SystemExit(0)\n"
                "for line in sys.stdin:\n"
                " m=json.loads(line); method=m.get('method'); rid=m.get('id')\n"
                " if method=='initialize': print(json.dumps({'id':rid,'result':{'userAgent':'fixture'}}),flush=True)\n"
                " elif method=='thread/start': print(json.dumps({'id':rid,'result':{'thread':{'id':'thr_fixture'}}}),flush=True)\n"
                " elif method=='turn/start':\n"
                "  print(json.dumps({'id':rid,'result':{'turn':{'id':'turn_fixture','status':'inProgress'}}}),flush=True)\n"
                "  print(json.dumps({'method':'turn/started','params':{'turn':{'id':'turn_fixture','status':'inProgress'}}}),flush=True)\n"
                "  print(json.dumps({'method':'item/completed','params':{'item':{'type':'agentMessage','text':PAYLOAD}}}),flush=True)\n"
                "  print(json.dumps({'method':'thread/tokenUsage/updated','params':{'tokenUsage':{'inputTokens':12,'outputTokens':34}}}),flush=True)\n"
                "  print(json.dumps({'method':'turn/completed','params':{'turn':{'id':'turn_fixture','status':'completed'}}}),flush=True)\n"
                " elif method=='thread/delete': print(json.dumps({'id':rid,'result':{}}),flush=True)\n",
                encoding="utf-8",
            )
            executable.chmod(executable.stat().st_mode | stat.S_IXUSR)
            runtime = CodexAppServerRuntime(
                {
                    "AI_CODEX_COMMAND": str(executable),
                    "AI_CODEX_IDENTITY_PATH": str(identity),
                    "AI_TASK_ROOT": str(root),
                    "AI_HANDSHAKE_TIMEOUT_SECONDS": 2,
                    "AI_FIRST_PROGRESS_TIMEOUT_SECONDS": 2,
                    "AI_SILENCE_TIMEOUT_SECONDS": 2,
                    "AI_TOTAL_TIMEOUT_SECONDS": 5,
                }
            )
            events = []
            result = runtime.generate(RuntimeRequest("fixture-task", "minimal prompt", TOP5_OUTPUT_SCHEMA), events.append)
            self.assertEqual(result.session_id, "thr_fixture")
            self.assertEqual(result.usage["outputTokens"], 34)
            self.assertEqual(events[-1].type, RuntimeEventType.COMPLETED)
            self.assertEqual(
                sum(
                    event.type in {RuntimeEventType.COMPLETED, RuntimeEventType.FAILED, RuntimeEventType.CANCELLED}
                    for event in events
                ),
                1,
            )

    def test_capability_stubs_remain_runtime_neutral(self):
        source = Path("webserver/services/agent_runtime.py").read_text(encoding="utf-8")
        self.assertIn("CLAUDE_CODE_STUB", source)
        self.assertIn("TRAE_ACP_STUB", source)
        self.assertNotIn("thread/start", source)

    def test_saved_protocol_fixture_has_one_authoritative_terminal(self):
        fixture = Path("tests/fixtures/codex_app_server_top5.jsonl")
        messages = [json.loads(line) for line in fixture.read_text(encoding="utf-8").splitlines()]
        methods = [message.get("method") for message in messages]
        self.assertIn("item/completed", methods)
        self.assertEqual(methods.count("turn/completed"), 1)
        self.assertEqual(messages[-2]["params"]["turn"]["status"], "completed")


class Top5APITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.AIGeneration).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AIGeneration).delete()
        session.commit()
        super().tearDown()

    def _create(self):
        with mock.patch.object(AITop5Service, "submit"):
            return self.json(
                "/api/ai/generations",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps(
                    {
                        "feature": FEATURE_KEY,
                        "book_id": test_main.BID_EPUB,
                        "chapter_text": CHAPTER,
                        "chapter_href": HREF,
                        "chapter_title": "第一章",
                    }
                ),
            )

    def test_generic_generation_api_routes_by_feature(self):
        unknown = self.json(
            "/api/ai/generations",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"feature": "unknown"}),
        )
        self.assertEqual(unknown["err"], "ai.feature_not_found")

        source = Path("webserver/handlers/ai.py").read_text(encoding="utf-8")
        self.assertIn('r"/api/ai/generations"', source)
        self.assertNotIn('r"/api/ai/top5"', source)

    def test_create_is_idempotent_and_creator_scoped(self):
        first = self._create()
        second = self._create()
        self.assertEqual(first["err"], "ok")
        self.assertEqual(first["artifact"]["feature"], FEATURE_KEY)
        self.assertEqual(first["artifact"]["id"], second["artifact"]["id"])
        self.assertTrue(second["idempotent"])

        listed = self.json(f"/api/ai/generations?feature={FEATURE_KEY}&book_id={test_main.BID_EPUB}")
        self.assertEqual(listed["err"], "ok")
        self.assertEqual(listed["items"][0]["id"], first["artifact"]["id"])

        session = test_main.get_db()
        other = models.AIGeneration(
            id="11111111-1111-1111-1111-111111111111",
            request_key="f" * 64,
            feature=FEATURE_KEY,
            creator_id=2,
            book_id=test_main.BID_EPUB,
            book_version="other",
            chapter_href=HREF,
            chapter_text_hash="a" * 64,
            chapter_length=len(CHAPTER),
        )
        session.add(other)
        session.commit()
        hidden = self.json(f"/api/ai/generations/{other.id}")
        self.assertEqual(hidden["err"], "ai.not_found")

    def test_successful_artifact_can_be_edited_cancelled_exported_and_deleted(self):
        created = self._create()["artifact"]
        session = test_main.get_db()
        record = session.get(models.AIGeneration, created["id"])
        record.status = "succeeded"
        record.ai_draft = valid_payload()
        record.result_data = valid_payload()
        record.user_revision = valid_payload()
        session.commit()

        edited = valid_payload()["items"]
        edited[0]["answer"] = "用户修订的 **答案**"
        response = self.json(
            f"/api/ai/generations/{record.id}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"items": edited}),
        )
        self.assertEqual(response["err"], "ok")
        self.assertIn("用户修订", response["artifact"]["items"][0]["answer"])

        export = self.fetch(f"/api/ai/generations/{record.id}/export")
        self.assertEqual(export.code, 200)
        self.assertIn("text/markdown", export.headers["Content-Type"])
        self.assertIn("用户修订", export.body.decode("utf-8"))

        response = self.json(f"/api/ai/generations/{record.id}", method="DELETE")
        self.assertEqual(response["err"], "ok")
        self.assertIsNone(test_main.get_db().get(models.AIGeneration, created["id"]))

    def test_book_version_change_fails_closed(self):
        artifact = self._create()["artifact"]
        with mock.patch("webserver.handlers.ai._book_version", return_value="changed"):
            response = self.json(f"/api/ai/generations/{artifact['id']}")
        self.assertEqual(response["err"], "ai.book_version_changed")

    def test_private_book_permissions_are_rechecked(self):
        artifact = self._create()["artifact"]
        with mock.patch("webserver.handlers.ai._AIGenerationBase.can_view_book", return_value=False):
            response = self.json(f"/api/ai/generations/{artifact['id']}")
        self.assertEqual(response["err"], "ai.not_found")


class StaticReaderContractTest(unittest.TestCase):
    def test_reader_wires_safe_summary_duck_assets(self):
        template = Path("webserver/resources/book/creader.html").read_text(encoding="utf-8")
        script = Path("app/public/static/js/ai-top5.js").read_text(encoding="utf-8")
        style = Path("app/public/static/js/ai-top5.css").read_text(encoding="utf-8")
        self.assertIn("TalebookSummaryDuckInit", template)
        self.assertIn("talebook:ai-citation", script)
        self.assertNotIn(".innerHTML", script)
        self.assertNotIn("insertAdjacentHTML", script)
        self.assertIn("--duck-accent", style)
        self.assertIn("prefers-color-scheme: dark", style)
        self.assertIn("summary-duck__number", style)
        self.assertIn("summary-duck__question", style)
        self.assertIn("summary-duck__answer", style)
        self.assertIn("summary-duck__citation", style)

    def test_book_delete_propagates_to_ai_artifacts(self):
        source = Path("webserver/handlers/book.py").read_text(encoding="utf-8")
        delete_block = source[source.index("class BookDelete") : source.index("class BookDownload")]
        self.assertIn("AIGeneration", delete_block)
        self.assertIn("AIGeneration.book_id == bid", delete_block)


if __name__ == "__main__":
    unittest.main()
