import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from tests import test_main
from webserver import models
from webserver.services.quote_card import (
    FEATURE_KEY,
    MAX_CHAPTER_CHARACTERS,
    PROMPT_VERSION,
    QuoteCardService,
    QuoteCardValidationError,
    build_prompt,
    load_epub_chapter,
    validate_chapter_input,
    validate_locator_quote,
    validate_recommendations,
)


CHAPTER = "阅读不是被动接收，而是不断检验论证与证据的过程。真正重要的句子能够保留作者判断，也让读者回到上下文复核。" * 12
HREF = "Text/chapter-1.xhtml"
QUOTE = CHAPTER[0:24]
LOCATOR = {"href": HREF, "start": 0, "end": 24}


def recommendation(quote=QUOTE, locator=None):
    return {
        "quote": quote,
        "why_important": "这句话给出了本章的**中心判断**。",
        "topics": ["主动阅读", "论证"],
        "locator": locator or dict(LOCATOR),
    }


def create_payload(**changes):
    payload = {
        "book_id": test_main.BID_EPUB,
        "chapter_text": CHAPTER,
        "chapter_href": HREF,
        "chapter_title": "第一章",
        "verbatim_quote": QUOTE,
        "quote_text": QUOTE,
        "quote_type": "verbatim",
        "locator": dict(LOCATOR),
        "why_important": "帮助读者识别中心判断",
        "topics": ["阅读"],
        "note": "稍后复习",
        "source": "selection",
    }
    payload.update(changes)
    return payload


class QuoteCardValidationTest(unittest.TestCase):
    def test_validates_grounded_candidates_and_drops_invalid_ones(self):
        chapter = validate_chapter_input(CHAPTER, HREF, "第一章")
        invalid = recommendation("伪造原句", {"href": HREF, "start": 0, "end": 4})
        checked = validate_recommendations({"items": [invalid, recommendation()]}, chapter)
        self.assertEqual(len(checked["items"]), 1)
        self.assertEqual(checked["items"][0]["quote"], QUOTE)

    def test_rejects_all_invalid_out_of_bounds_or_cross_chapter_candidates(self):
        chapter = validate_chapter_input(CHAPTER, HREF)
        candidates = [
            recommendation(locator={"href": "other.xhtml", "start": 0, "end": 24}),
            recommendation(locator={"href": HREF, "start": 0, "end": len(CHAPTER) + 1}),
        ]
        with self.assertRaisesRegex(QuoteCardValidationError, "没有可核验"):
            validate_recommendations({"items": candidates}, chapter)

    def test_locator_requires_normalized_verbatim_match(self):
        chapter = validate_chapter_input(CHAPTER, HREF)
        checked = validate_locator_quote(chapter, QUOTE, LOCATOR)
        self.assertEqual(checked["locator"], LOCATOR)
        with self.assertRaisesRegex(QuoteCardValidationError, "不匹配"):
            validate_locator_quote(chapter, "被改写的原句", LOCATOR)

    def test_context_is_bounded_and_prompt_has_no_external_provider(self):
        chapter = validate_chapter_input("正文事实。" * 6_000, HREF)
        self.assertLessEqual(len(chapter["text"]), MAX_CHAPTER_CHARACTERS)
        prompt = json.loads(build_prompt(validate_chapter_input(CHAPTER, HREF, "第一章")))
        self.assertEqual(prompt["prompt_version"], PROMPT_VERSION)
        self.assertIn("不得使用外部知识", "".join(prompt["rules"]))
        self.assertIn("逐字", "".join(prompt["rules"]))
        self.assertNotIn("openai", json.dumps(prompt).lower())

    def test_server_extracts_authoritative_epub_text_and_rejects_ambiguous_locator(self):
        markup = f"<html><body><p>{CHAPTER}</p><script>forged()</script></body></html>"
        with tempfile.NamedTemporaryFile(suffix=".epub") as handle:
            with zipfile.ZipFile(handle.name, "w") as archive:
                archive.writestr("OEBPS/Text/chapter-1.xhtml", markup)
                archive.writestr("OEBPS/Text/other.xhtml", f"<html><body>{CHAPTER}</body></html>")
            chapter = load_epub_chapter(handle.name, "/books/1/OEBPS/Text/chapter-1.xhtml", "第一章")
            self.assertEqual(chapter["text"], CHAPTER)
            self.assertEqual(chapter["canonical_href"], "OEBPS/Text/chapter-1.xhtml")
            self.assertNotIn("forged", chapter["text"])
            with self.assertRaisesRegex(QuoteCardValidationError, "唯一定位"):
                load_epub_chapter(handle.name, "missing.xhtml")


class QuoteCardAPITest(test_main.TestWithUserLogin):
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
        session.query(models.QuoteCard).delete()
        session.query(models.AITask).filter(models.AITask.feature == FEATURE_KEY).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.QuoteCard).delete()
        session.query(models.AITask).filter(models.AITask.feature == FEATURE_KEY).delete()
        session.commit()
        super().tearDown()

    def _post(self, payload=None):
        with mock.patch(
            "webserver.handlers.quote_cards.load_epub_chapter",
            return_value=validate_chapter_input(CHAPTER, HREF, "第一章"),
        ):
            return self.json(
                "/api/quote-cards",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps(payload or create_payload()),
            )

    def test_manual_create_list_duplicate_merge_and_delete(self):
        created = self._post()
        self.assertEqual(created["err"], "ok")
        self.assertEqual(created["card"]["quote_type"], "verbatim")

        listed = self.json(f"/api/quote-cards?book_id={test_main.BID_EPUB}")
        self.assertEqual([card["id"] for card in listed["cards"]], [created["card"]["id"]])

        duplicate = self._post()
        self.assertEqual(duplicate["err"], "quote_card.duplicate")
        self.assertEqual(duplicate["card"]["id"], created["card"]["id"])

        merged = self._post(create_payload(topics=["复习"], note="合并后的笔记", duplicate_action="merge"))
        self.assertEqual(merged["err"], "ok")
        self.assertTrue(merged["merged"])
        self.assertEqual(set(merged["card"]["topics"]), {"阅读", "复习"})

        deleted = self.json(f"/api/quote-cards/{created['card']['id']}", method="DELETE")
        self.assertEqual(deleted["err"], "ok")
        self.assertIsNone(test_main.get_db().get(models.QuoteCard, created["card"]["id"]))

    def test_original_edit_requires_explicit_note_conversion(self):
        card = self._post()["card"]
        changed = {
            "quote_text": "这是读者自己的改写",
            "why_important": "个人解释",
            "topics": ["改写"],
            "note": "",
        }
        rejected = self.json(
            f"/api/quote-cards/{card['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps(changed),
        )
        self.assertEqual(rejected["err"], "params.invalid")

        changed["convert_to_note"] = True
        updated = self.json(
            f"/api/quote-cards/{card['id']}",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps(changed),
        )
        self.assertEqual(updated["card"]["quote_type"], "adapted_note")
        self.assertEqual(updated["card"]["verbatim_quote"], QUOTE)

    def test_forged_quote_is_rejected_against_server_owned_chapter(self):
        response = self._post(
            create_payload(
                chapter_text="伪造章节。" * 30,
                verbatim_quote="伪造章节。",
                quote_text="伪造章节。",
                locator={"href": HREF, "start": 0, "end": 5},
            )
        )
        self.assertEqual(response["err"], "params.invalid")
        self.assertIn("不匹配", response["msg"])

    def test_markdown_export_keeps_source_and_user_revision(self):
        card = self._post()["card"]
        export = self.fetch(f"/api/quote-cards/export?book_id={test_main.BID_EPUB}")
        body = export.body.decode("utf-8")
        self.assertEqual(export.code, 200)
        self.assertIn("text/markdown", export.headers["Content-Type"])
        self.assertIn("为什么重要", body)
        self.assertIn("Locator", body)
        self.assertIn(card["chapter_title"], body)

    def test_version_change_marks_source_invalid_without_exposing_other_creators(self):
        card = self._post()["card"]
        with mock.patch("webserver.handlers.quote_cards._book_version", return_value="changed"):
            response = self.json(f"/api/quote-cards/{card['id']}")
        self.assertEqual(response["err"], "ok")
        self.assertFalse(response["card"]["source_valid"])

        session = test_main.get_db()
        hidden = models.QuoteCard(
            id="11111111-1111-1111-1111-111111111111",
            creator_id=2,
            book_id=test_main.BID_EPUB,
            book_version="fixture",
            book_title="隐藏书籍",
            chapter_href=HREF,
            chapter_title="隐藏章节",
            quote_type="verbatim",
            verbatim_quote=QUOTE,
            quote_text=QUOTE,
            locator=LOCATOR,
            source_hash="f" * 64,
            source_valid=True,
            topics={"items": []},
        )
        session.add(hidden)
        session.commit()
        response = self.json(f"/api/quote-cards/{hidden.id}")
        self.assertEqual(response["err"], "quote_card.not_found")

    def test_chapter_recommendation_uses_generic_ai_task_surface(self):
        with mock.patch.object(QuoteCardService, "submit"), mock.patch(
            "webserver.handlers.ai.load_quote_card_chapter",
            return_value=validate_chapter_input(CHAPTER, HREF, "第一章"),
        ):
            response = self.json(
                f"/api/ai/{FEATURE_KEY}/tasks",
                method="POST",
                headers={"Content-Type": "application/json"},
                body=json.dumps(
                    {
                        "book_id": test_main.BID_EPUB,
                        "chapter_text": CHAPTER,
                        "chapter_href": HREF,
                        "chapter_title": "第一章",
                    }
                ),
            )
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["task"]["feature"], FEATURE_KEY)
        self.assertEqual(response["task"]["schema_version"], "quote_card.v1")


class QuoteCardStaticContractTest(unittest.TestCase):
    def test_reader_assets_are_safe_and_cover_png_fallback_and_locator_jump(self):
        template = Path("webserver/resources/book/creader.html").read_text(encoding="utf-8")
        script = Path("app/public/static/js/quote-cards.js").read_text(encoding="utf-8")
        style = Path("app/public/static/js/quote-cards.css").read_text(encoding="utf-8")
        self.assertIn("TalebookQuoteCardsInit", template)
        self.assertIn("/api/ai/quote_card/tasks", script)
        self.assertIn("/api/quote-cards", script)
        self.assertIn("canvas.toBlob", script)
        self.assertIn("talebook:quote-card-locator", script)
        self.assertIn("仍可选中原文", script)
        self.assertNotIn(".innerHTML", script)
        self.assertNotIn("insertAdjacentHTML", script)
        self.assertIn("prefers-color-scheme: dark", style)
        self.assertIn(":focus-visible", style)
        self.assertIn("min-height: 0", style)

    def test_delete_propagation_and_runtime_boundary(self):
        book_source = Path("webserver/handlers/book.py").read_text(encoding="utf-8")
        delete_block = book_source[book_source.index("class BookDelete") : book_source.index("class BookDownload")]
        service_source = Path("webserver/services/quote_card.py").read_text(encoding="utf-8")
        self.assertIn("QuoteCard", delete_block)
        self.assertIn("CodexAppServerRuntime", service_source)
        self.assertNotIn("openai", service_source.lower())
        self.assertNotIn("requests.post", service_source)


if __name__ == "__main__":
    unittest.main()
