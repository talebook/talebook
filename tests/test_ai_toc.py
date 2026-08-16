import hashlib
import json
import os
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

from jinja2 import Template

from tests import test_main
from webserver import models
from webserver.handlers.ai import TocOrganizerFeature
from webserver.services.ai_toc import (
    FEATURE_KEY,
    TocOrganizerService,
    TocValidationError,
    TocWriteError,
    analyze_epub,
    apply_toc,
    file_version,
    undo_toc,
    validate_revision,
    validate_suggestion,
)


CONTAINER = b"""<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>"""

OPF = b"""<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Test</dc:title></metadata>
  <manifest>
    <item id="c1" href="chapter-1.xhtml" media-type="application/xhtml+xml"/>
    <item id="c2" href="chapter-2.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/><itemref idref="c2"/></spine>
</package>"""

CHAPTER_1 = """<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>One</title></head>
<body><h1 id="one">第一章</h1><p>正文一，必须在目录写入前后保持完全一致。</p></body></html>""".encode()
CHAPTER_2 = """<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Two</title></head>
<body><h1 id="two">第二章</h1><p>正文二，也不能被目录功能改写。</p></body></html>""".encode()


def write_epub(path, nav=None, ncx=None):
    opf = OPF
    if nav is not None:
        opf = OPF.replace(
            b"</manifest>",
            b'<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest>',
        )
    if ncx is not None:
        opf = opf.replace(
            b"</manifest>",
            b'<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/></manifest>',
        ).replace(b"<spine>", b'<spine toc="ncx">')
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", b"application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", CONTAINER)
        archive.writestr("OEBPS/content.opf", opf)
        archive.writestr("OEBPS/chapter-1.xhtml", CHAPTER_1)
        archive.writestr("OEBPS/chapter-2.xhtml", CHAPTER_2)
        if nav is not None:
            archive.writestr("OEBPS/nav.xhtml", nav)
        if ncx is not None:
            archive.writestr("OEBPS/toc.ncx", ncx)


def suggestion(analysis):
    return {
        "nodes": [
            {
                "id": "chapter-1",
                "parent_id": None,
                "order": 0,
                "label": "第一章",
                "href": "OEBPS/chapter-1.xhtml#one",
                "reason": "正文一级标题",
                "evidence": ["heading h1: 第一章"],
                "confidence": 0.99,
                "risk": "low",
            },
            {
                "id": "chapter-2",
                "parent_id": None,
                "order": 1,
                "label": "第二章",
                "href": "OEBPS/chapter-2.xhtml#two",
                "reason": "正文一级标题",
                "evidence": ["heading h1: 第二章"],
                "confidence": 0.99,
                "risk": "low",
            },
        ],
        "changes": [
            {
                "id": "add-1",
                "operation": "add",
                "node_id": "chapter-1",
                "before": None,
                "after": "第一章",
                "reason": "补充缺失目录",
                "evidence": ["toc.missing"],
                "confidence": 0.99,
                "risk": "low",
            }
        ],
    }


class TocDiagnosisTest(unittest.TestCase):
    def test_diagnoses_missing_toc_and_collects_only_valid_anchors(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            write_epub(path)
            analysis = analyze_epub(path)
        self.assertEqual(analysis["toc_kind"], "missing")
        self.assertEqual(analysis["diagnostics"][0]["code"], "toc.missing")
        self.assertIn("OEBPS/chapter-1.xhtml#one", analysis["anchor_catalog"])
        self.assertNotIn("正文一", json.dumps(analysis["anchor_catalog"], ensure_ascii=False))

    def test_diagnoses_duplicate_noise_empty_title_bad_anchor_and_order(self):
        nav = """<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body>
        <nav epub:type="toc"><ol>
          <li><a href="chapter-2.xhtml#two">广告推广</a></li>
          <li><a href="chapter-1.xhtml#one"></a></li>
          <li><a href="chapter-2.xhtml#two">广告推广</a></li>
          <li><a href="missing.xhtml#x">损坏</a></li>
        </ol></nav></body></html>""".encode()
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            write_epub(path, nav=nav)
            analysis = analyze_epub(path)
        codes = {finding["code"] for finding in analysis["diagnostics"]}
        self.assertTrue(
            {"toc.duplicate", "toc.suspected_noise", "toc.empty_title", "toc.invalid_anchor", "toc.order_anomaly"}
            <= codes
        )

    def test_validates_schema_anchors_and_parent_cycles(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            write_epub(path)
            analysis = analyze_epub(path)
        checked = validate_suggestion(suggestion(analysis), analysis)
        self.assertEqual([node["label"] for node in checked["nodes"]], ["第一章", "第二章"])

        invalid = suggestion(analysis)
        invalid["nodes"][0]["href"] = "OEBPS/missing.xhtml"
        with self.assertRaisesRegex(TocValidationError, "锚点"):
            validate_suggestion(invalid, analysis)

        cyclic = suggestion(analysis)
        cyclic["nodes"][0]["parent_id"] = "chapter-2"
        cyclic["nodes"][1]["parent_id"] = "chapter-1"
        with self.assertRaisesRegex(TocValidationError, "循环"):
            validate_suggestion(cyclic, analysis)


class TocAtomicWriteTest(unittest.TestCase):
    def test_apply_preserves_body_and_undo_restores_exact_original(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            snapshot = os.path.join(tmp, "snapshots", "task.epub")
            write_epub(path)
            original = Path(path).read_bytes()
            original_hash = hashlib.sha256(original).hexdigest()
            original_version = file_version(path)
            analysis = analyze_epub(path)
            nodes = validate_suggestion(suggestion(analysis), analysis)["nodes"]
            result = apply_toc(path, nodes, snapshot, original_version)

            self.assertNotEqual(hashlib.sha256(Path(path).read_bytes()).hexdigest(), original_hash)
            with zipfile.ZipFile(path) as archive:
                self.assertEqual(archive.read("OEBPS/chapter-1.xhtml"), CHAPTER_1)
                self.assertEqual(archive.read("OEBPS/chapter-2.xhtml"), CHAPTER_2)
                self.assertIn(b"talebook-toc.xhtml", archive.read("OEBPS/content.opf"))
                self.assertIn(b"chapter-1.xhtml#one", archive.read("OEBPS/talebook-toc.xhtml"))

            restored_version = undo_toc(
                path, snapshot, result["after_version"], result["snapshot_sha256"]
            )
            self.assertEqual(Path(path).read_bytes(), original)
            self.assertEqual(restored_version, file_version(path))
            self.assertEqual(restored_version, original_version)

    def test_existing_ncx_is_rewritten_with_valid_selected_nodes(self):
        ncx = b"""<?xml version="1.0" encoding="utf-8"?>
        <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
          <docTitle><text>Test</text></docTitle><navMap>
            <navPoint id="old" playOrder="1"><navLabel><text>Old</text></navLabel>
            <content src="missing.xhtml"/></navPoint>
          </navMap>
        </ncx>"""
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            snapshot = os.path.join(tmp, "snapshots", "task.epub")
            write_epub(path, ncx=ncx)
            analysis = analyze_epub(path)
            self.assertEqual(analysis["toc_kind"], "ncx")
            nodes = validate_suggestion(suggestion(analysis), analysis)["nodes"]
            apply_toc(path, nodes, snapshot, file_version(path))
            with zipfile.ZipFile(path) as archive:
                rewritten = archive.read("OEBPS/toc.ncx")
                self.assertIn(b"chapter-1.xhtml#one", rewritten)
                self.assertIn(b"chapter-2.xhtml#two", rewritten)
                self.assertEqual(archive.read("OEBPS/chapter-1.xhtml"), CHAPTER_1)

    def test_version_conflict_leaves_original_and_does_not_create_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            snapshot = os.path.join(tmp, "snapshots", "task.epub")
            write_epub(path)
            original = Path(path).read_bytes()
            analysis = analyze_epub(path)
            nodes = validate_suggestion(suggestion(analysis), analysis)["nodes"]
            with self.assertRaisesRegex(TocWriteError, "版本"):
                apply_toc(path, nodes, snapshot, "stale")
            self.assertEqual(Path(path).read_bytes(), original)
            self.assertFalse(os.path.exists(snapshot))

    def test_validation_failure_after_copy_never_replaces_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "book.epub")
            snapshot = os.path.join(tmp, "snapshots", "task.epub")
            write_epub(path)
            original = Path(path).read_bytes()
            analysis = analyze_epub(path)
            nodes = validate_suggestion(suggestion(analysis), analysis)["nodes"]
            with mock.patch("webserver.services.ai_toc._validate_written_epub", side_effect=TocWriteError("bad")):
                with self.assertRaisesRegex(TocWriteError, "bad"):
                    apply_toc(path, nodes, snapshot, file_version(path))
            self.assertEqual(Path(path).read_bytes(), original)
            self.assertFalse(os.path.exists(snapshot))
            self.assertFalse(any(name.startswith(".talebook-toc-") for name in os.listdir(tmp)))


class TocRevisionTest(unittest.TestCase):
    def test_revision_requires_selected_parent(self):
        record = models.AITask(
            id="revision-test",
            request_key="r" * 64,
            feature=FEATURE_KEY,
            creator_id=1,
            book_id=1,
            book_version="v",
            chapter_href="",
            chapter_text_hash="h",
            chapter_length=0,
        )
        draft = {
            "anchor_catalog": ["a.xhtml#one", "a.xhtml#two"],
            "nodes": [],
            "changes": [],
        }
        record.ai_draft = draft
        nodes = [
            {
                "id": "parent",
                "parent_id": None,
                "label": "父级",
                "href": "a.xhtml#one",
                "reason": "标题",
                "evidence": ["h1"],
                "confidence": 1,
                "risk": "low",
                "selected": False,
            },
            {
                "id": "child",
                "parent_id": "parent",
                "label": "子级",
                "href": "a.xhtml#two",
                "reason": "标题",
                "evidence": ["h2"],
                "confidence": 1,
                "risk": "low",
                "selected": True,
            },
        ]
        with self.assertRaisesRegex(TocValidationError, "父节点"):
            validate_revision({"nodes": nodes}, record)


class TocOrganizerAPITest(test_main.TestWithUserLogin):
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
        session.query(models.AITask).filter(models.AITask.feature == FEATURE_KEY).delete()
        session.commit()

    def tearDown(self):
        session = test_main.get_db()
        session.query(models.AITask).filter(models.AITask.feature == FEATURE_KEY).delete()
        session.commit()
        super().tearDown()

    def test_create_is_server_extracted_and_idempotent(self):
        fake_analysis = {
            "analysis_hash": "a" * 64,
            "toc_path": "toc.ncx",
            "context": "bounded",
            "diagnostics": [],
            "original_nodes": [],
            "heading_candidates": [],
            "anchor_catalog": ["chapter.xhtml#one"],
            "toc_kind": "missing",
            "spine": ["chapter.xhtml"],
            "writable": True,
        }
        with mock.patch("webserver.handlers.ai._can_manage_book", return_value=True), mock.patch(
            "webserver.handlers.ai.analyze_epub", return_value=fake_analysis
        ) as analyze, mock.patch.object(TocOrganizerService, "submit"):
            body = json.dumps({"book_id": test_main.BID_EPUB, "chapter_text": "untrusted"})
            first = self.json(f"/api/ai/{FEATURE_KEY}/tasks", method="POST", body=body)
            second = self.json(f"/api/ai/{FEATURE_KEY}/tasks", method="POST", body=body)
        self.assertEqual(first["err"], "ok")
        self.assertFalse(first["idempotent"])
        self.assertTrue(second["idempotent"])
        self.assertEqual(analyze.call_count, 2)
        self.assertNotIn("untrusted", first["task"])

    def test_create_requires_owner_or_editor(self):
        with mock.patch("webserver.handlers.ai._can_manage_book", return_value=False), mock.patch(
            "webserver.handlers.ai.analyze_epub"
        ) as analyze:
            response = self.json(
                f"/api/ai/{FEATURE_KEY}/tasks",
                method="POST",
                body=json.dumps({"book_id": test_main.BID_EPUB}),
            )
        self.assertEqual(response["err"], "permission")
        analyze.assert_not_called()

    def test_apply_requires_explicit_confirmation(self):
        epub_path = self._app.settings["legacy"].format_abspath(test_main.BID_EPUB, "EPUB", index_is_id=True)
        version = file_version(epub_path)
        record = models.AITask(
            id="01234567-89ab-cdef-0123-456789abcdef",
            request_key="q" * 64,
            feature=FEATURE_KEY,
            creator_id=1,
            book_id=test_main.BID_EPUB,
            book_version=version,
            chapter_href="toc.ncx",
            chapter_text_hash="h" * 64,
            chapter_length=1,
            status="succeeded",
            result_data={"nodes": [], "writable": True},
            ai_draft={"nodes": [], "writable": True},
            user_revision={"nodes": [], "writable": True},
        )
        session = test_main.get_db()
        session.add(record)
        session.commit()
        with mock.patch("webserver.handlers.ai._can_manage_book", return_value=True):
            response = self.json(
                f"/api/ai/{FEATURE_KEY}/tasks/{record.id}/apply",
                method="POST",
                body=json.dumps({"book_version": version}),
            )
        self.assertEqual(response["err"], "confirmation.required")

    def test_delete_cleans_snapshot(self):
        epub_path = self._app.settings["legacy"].format_abspath(test_main.BID_EPUB, "EPUB", index_is_id=True)
        record = models.AITask(
            id="11234567-89ab-cdef-0123-456789abcdef",
            request_key="d" * 64,
            feature=FEATURE_KEY,
            creator_id=1,
            book_id=test_main.BID_EPUB,
            book_version=file_version(epub_path),
            chapter_href="",
            chapter_text_hash="h" * 64,
            chapter_length=0,
            status="succeeded",
        )
        session = test_main.get_db()
        session.add(record)
        session.commit()
        with mock.patch("webserver.handlers.ai._can_manage_book", return_value=True), mock.patch.object(
            TocOrganizerFeature, "cleanup"
        ) as cleanup:
            response = self.json(f"/api/ai/{FEATURE_KEY}/tasks/{record.id}", method="DELETE")
        self.assertEqual(response["err"], "ok")
        cleanup.assert_called_once()


class TocOrganizerReaderContractTest(unittest.TestCase):
    def _render_reader(self, can_manage_ai_toc):
        source = Path("webserver/resources/book/creader.html").read_text(encoding="utf-8")
        return Template(source).render(
            RES="",
            book={"id": 1, "title": "测试书"},
            CANDLE_READER_SERVER="",
            epub_dir="/get/extract/1",
            is_ready=True,
            audiobook_edition_id=None,
            can_manage_ai_toc=can_manage_ai_toc,
        )

    def test_unauthorized_reader_does_not_receive_toc_organizer_assets(self):
        rendered = self._render_reader(False)
        self.assertNotIn("toc-organizer.css", rendered)
        self.assertNotIn("toc-organizer.js", rendered)
        self.assertNotIn("TalebookTocOrganizerInit", rendered)

    def test_authorized_reader_receives_toc_organizer_assets_after_reader_init(self):
        rendered = self._render_reader(True)
        self.assertIn("toc-organizer.css", rendered)
        self.assertIn("toc-organizer.js", rendered)
        self.assertLess(rendered.index("new Reader"), rendered.index("TalebookTocOrganizerInit"))


if __name__ == "__main__":
    unittest.main()
