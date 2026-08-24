import io
import json
import os
import tempfile
import zipfile
from unittest import mock

from webserver.plugins.texttools.chinese_epub import convert_txt_file, detect_encoding as zh_detect
from webserver.plugins.texttools.encoding_detect import decode_with_report, detect_encoding, fix_to_utf8
from webserver.plugins.texttools.epub_utils import decode_entry, encode_entry, find_text_entries, read_text_entries, set_xml_encoding
from webserver.plugins.texttools.opencc_engine import OpenCC
from webserver.plugins.texttools.text_replace import compile_rule, preview, replace_epub_file, replace_txt_file, scan_samples
from webserver.plugins.texttools.txt_fixer import analyze_bytes, fix_bytes
from webserver.plugins.runtime.builtin_capabilities import BUILTIN_CAPABILITY_PROVIDERS
from webserver.handlers.base import BaseHandler

from tests.test_main import BID_EPUB, BID_TXT, TestApp, temporary_book_scope
from tests.test_main import setUpModule as init_main


def setUpModule():
    init_main()


def _tmp_epub(text_map):
    # minimal container + opf + 2 xhtml entries
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".epub")
    tmp.close()
    try:
        with zipfile.ZipFile(tmp.name, "w") as z:
            z.writestr("mimetype", b"application/epub+zip", compress_type=zipfile.ZIP_STORED)
            z.writestr(
                "META-INF/container.xml",
                b'<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
            )
            # build opf manifest for given text_map keys
            items = ""
            for name in text_map:
                items += '<item id="%s" href="%s" media-type="application/xhtml+xml" />' % (name.replace("/", "_"), name)
            opf = ('<?xml version="1.0" encoding="utf-8"?><package xmlns="http://www.idpf.org/2007/opf"><manifest>%s</manifest><spine /></package>' % items).encode()
            z.writestr("content.opf", opf)
            for name, body in text_map.items():
                z.writestr(name, body.encode("utf-8"))
        return tmp.name
    except Exception:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass
        raise


def test_compile_rule_plain_and_regex():
    fn, err = compile_rule("a", "b", False)
    assert err is None
    assert fn("aaa") == ("bbb", 3)
    fn2, err2 = compile_rule(r"\d+", "X", True)
    assert err2 is None
    assert fn2("a1b22c")[0] == "aXbXc"
    _, err3 = compile_rule("", "x", False)
    assert err3
    _, err4 = compile_rule("[", "x", True)
    assert "正则" in err4 or "error" in err4.lower()


def test_scan_samples():
    cnt, samples = scan_samples("abc abc abc", "abc", False)
    assert cnt == 3
    assert len(samples) == 3
    assert samples[0]["match"] == "abc"
    cnt2, _ = scan_samples("a1a2a3", r"a\d", True)
    assert cnt2 == 3


def test_encoding_detect_utf8_bom_and_gb18030():
    utf8_bom = b"\xef\xbb\xbfhello"
    rep = detect_encoding(utf8_bom)
    assert "utf-8" in rep["encoding"]
    gb = "你好世界".encode("gb18030")
    rep2 = detect_encoding(gb)
    assert rep2["encoding"] in ("gb18030", "utf-8")
    text, _ = decode_with_report(gb)
    assert "你好" in text


def test_fix_to_utf8_roundtrip():
    src = "繁體測試".encode("big5")
    out, rep = fix_to_utf8(src)
    assert isinstance(out, bytes)
    assert out.decode("utf-8")


def test_epub_utils_decode_encode_xml():
    data = b'<?xml version="1.0" encoding="utf-8"?><root>hello</root>'
    text, enc = decode_entry(data)
    assert enc == "utf-8"
    # unknown encoding fallback
    enc2 = set_xml_encoding('<?xml version="1.0" encoding="gb18030"?><r/>', "utf-8")
    assert 'utf-8' in enc2


def test_text_replace_txt_and_epub_files():
    # TXT
    src = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    src.write("hello world hello".encode("utf-8"))
    src.close()
    out = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    out.close()
    try:
        fn, _ = compile_rule("hello", "hi", False)
        cnt = replace_txt_file(src.name, out.name, fn)
        assert cnt == 2
        assert open(out.name, encoding="utf-8").read() == "hi world hi"
    finally:
        for p in (src.name, out.name):
            try:
                os.unlink(p)
            except OSError:
                pass

    # EPUB: two chapters each with one match
    epub_path = _tmp_epub({"chap1.xhtml": "<html><body>hello world</body></html>", "chap2.xhtml": "<html><body>hello again</body></html>"})
    epub_out = tempfile.NamedTemporaryFile(delete=False, suffix=".epub")
    epub_out.close()
    try:
        fn, _ = compile_rule("hello", "hi", False)
        cnt2 = replace_epub_file(epub_path, epub_out.name, fn)
        assert cnt2 == 2
        # preview path
        res = preview("EPUB", epub_path, "hello", "hi", False)
        assert res["matches"] == 2
        assert not res["regex_error"]
    finally:
        for p in (epub_path, epub_out.name):
            try:
                os.unlink(p)
            except OSError:
                pass


def test_txt_fixer_analyze_and_fix():
    data = "这是一段中文文本，用于编码检测。".encode("gb18030")
    rep = analyze_bytes(data)
    assert "encoding" in rep and "preview" in rep
    txt, rep2 = fix_bytes(data)
    assert isinstance(txt, str)
    assert "encoding" in rep2


def test_opencc_and_chinese_epub_txt():
    # t2s: 繁体→简体，s2t: 简体→繁体；opencc engine isVendored and must be loadable
    eng = OpenCC("t2s")
    assert eng.convert("臺灣") in ("台湾", "臺灣")  # at least converts
    eng2 = OpenCC("s2t")
    assert eng2.convert("台湾")

    # convert_txt_file: gb18030 source → utf8 output
    inp = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    inp.write("台湾 test".encode("gb18030"))
    inp.close()
    out = tempfile.NamedTemporaryFile(delete=False, suffix=".txt")
    out.close()
    try:
        enc = convert_txt_file(inp.name, out.name, eng.convert)
        assert enc in ("gb18030", "utf-8", "utf-8-sig", "big5")
        got = open(out.name, encoding="utf-8").read()
        assert got
    finally:
        for p in (inp.name, out.name):
            try:
                os.unlink(p)
            except OSError:
                pass


def test_builtin_capability_providers_registered():
    keys = {p.manifest["id"] for p in BUILTIN_CAPABILITY_PROVIDERS}
    assert "talebook.tool.text-replace" in keys
    assert "talebook.tool.zh-converter" in keys
    assert "talebook.tool.txt-fixer" in keys
    # all three must be in integrations category
    for p in BUILTIN_CAPABILITY_PROVIDERS:
        if p.manifest["id"].startswith("talebook.tool."):
            assert "integrations" in p.manifest["categories"]


# ---------------------------------------------------------------------------
# HTTP 层测试：/api/plugins/tools/* 6 个端点
#
# 覆盖此前 review 发现的两个高危问题：
# - zh-converter run 因缺少 DIRECTION_LABELS 导入而 NameError；
# - preview/analyze 仅要求 @auth，未校验私有书籍归属，导致越权读取。
# 落盘的重操作（import_as_new_book / overwrite_format）用 mock 隔离，避免真实写入共享的
# 测试书库（见 webserver/CLAUDE.md 的测试规范）。


class TestBookToolsBooksList(TestApp):
    def test_books_list_ok(self):
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            d = self.json("/api/plugins/tools/books")
            self.assertEqual(d["err"], "ok")
            ids = [b["id"] for b in d["books"]]
            self.assertIn(BID_EPUB, ids)
            self.assertIn(BID_TXT, ids)


class TestTextReplacePreview(TestApp):
    def test_preview_ok(self):
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
            d = self.json("/api/plugins/tools/text-replace/preview", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["book_id"], BID_TXT)

    def test_preview_rejects_other_users_private_book(self):
        with temporary_book_scope(BID_TXT, "private", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
                d = self.json("/api/plugins/tools/text-replace/preview", method="POST", body=body)
                self.assertEqual(d["err"], "booktools.failed")

    def test_preview_allows_owner_on_private_book(self):
        with temporary_book_scope(BID_TXT, "private", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=1):
                body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
                d = self.json("/api/plugins/tools/text-replace/preview", method="POST", body=body)
                self.assertEqual(d["err"], "ok")

    def test_preview_allows_admin_on_other_users_private_book(self):
        with temporary_book_scope(BID_TXT, "private", collector_id=2):
            with mock.patch.object(BaseHandler, "user_id", return_value=1):
                body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
                d = self.json("/api/plugins/tools/text-replace/preview", method="POST", body=body)
                self.assertEqual(d["err"], "ok")


class TestTxtFixerAnalyze(TestApp):
    def test_analyze_ok(self):
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            body = json.dumps({"book_id": BID_TXT})
            d = self.json("/api/plugins/tools/txt-fixer/analyze", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["book_id"], BID_TXT)

    def test_analyze_rejects_other_users_private_book(self):
        with temporary_book_scope(BID_TXT, "private", collector_id=1):
            with mock.patch.object(BaseHandler, "user_id", return_value=2):
                body = json.dumps({"book_id": BID_TXT})
                d = self.json("/api/plugins/tools/txt-fixer/analyze", method="POST", body=body)
                self.assertEqual(d["err"], "booktools.failed")


class TestTextReplaceRun(TestApp):
    def test_run_requires_admin(self):
        with mock.patch.object(BaseHandler, "user_id", return_value=2):
            body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
            d = self.json("/api/plugins/tools/text-replace/run", method="POST", body=body)
            self.assertEqual(d["err"], "permission.not_admin")

    @mock.patch("webserver.handlers.plugins.import_as_new_book")
    def test_run_new_mode_ok(self, m_import):
        m_import.return_value = 9001
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            body = json.dumps({"book_id": BID_TXT, "pattern": "a", "replacement": "b", "use_regex": False})
            d = self.json("/api/plugins/tools/text-replace/run", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["book_id"], 9001)
            self.assertTrue(m_import.called)


class TestTxtFixerRun(TestApp):
    @mock.patch("webserver.handlers.plugins.import_as_new_book")
    @mock.patch("webserver.handlers.plugins.fix_bytes")
    def test_run_new_mode_ok(self, m_fix, m_import):
        m_fix.return_value = ("fixed text", {"encoding": "utf-8", "mojibake": False, "garbage": False, "unrecoverable": False})
        m_import.return_value = 9002
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            body = json.dumps({"book_id": BID_TXT})
            d = self.json("/api/plugins/tools/txt-fixer/run", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["book_id"], 9002)
            self.assertTrue(m_import.called)


class TestZhConverterRun(TestApp):
    """回归测试：run 接口此前因缺少 DIRECTION_LABELS 导入而必然 NameError。"""

    def test_run_requires_admin(self):
        with mock.patch.object(BaseHandler, "user_id", return_value=2):
            body = json.dumps({"book_id": BID_TXT, "direction": "t2s"})
            d = self.json("/api/plugins/tools/zh-converter/run", method="POST", body=body)
            self.assertEqual(d["err"], "permission.not_admin")

    @mock.patch("webserver.handlers.plugins.import_as_new_book")
    @mock.patch("webserver.handlers.plugins.convert_txt_file")
    def test_run_new_mode_ok(self, m_convert, m_import):
        m_convert.return_value = "utf-8"
        m_import.return_value = 9003
        with mock.patch.object(BaseHandler, "user_id", return_value=1):
            body = json.dumps({"book_id": BID_TXT, "direction": "t2s", "output_mode": "new"})
            d = self.json("/api/plugins/tools/zh-converter/run", method="POST", body=body)
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["book_id"], 9003)
            self.assertEqual(d["direction_label"], "繁体→简体")
            self.assertTrue(m_import.called)
