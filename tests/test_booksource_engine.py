#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""书源规则引擎单元测试（不依赖 Tornado / Calibre）。"""

import json
import os
import unittest

from bs4 import BeautifulSoup

from webserver.services.booksource import cleaner
from webserver.services.booksource.analyze_rule import AnalyzeRule
from webserver.services.booksource.analyze_url import AnalyzeUrl
from webserver.services.booksource.book_source import BookSource
from webserver.services.booksource.engine import BookDetail, BookSourceEngine, Chapter
from webserver.services.booksource.exceptions import JsRuleUnsupported


CASES = os.path.join(os.path.dirname(__file__), "cases", "booksource")


def load(name):
    with open(os.path.join(CASES, name), "rb") as f:
        return f.read()


def text(name, encoding="utf-8"):
    return load(name).decode(encoding)


class FakeResponse:
    def __init__(self, content, url, encoding="utf-8"):
        self.content = content if isinstance(content, bytes) else content.encode(encoding)
        self.url = url
        self.encoding = encoding
        self.headers = {}

    @property
    def text(self):
        return self.content.decode(self.encoding or "utf-8", errors="replace")


class FakeSession:
    """按 URL 返回预置响应，记录调用。"""

    def __init__(self, mapping):
        self.mapping = mapping
        self.calls = []
        self.headers = {}

    def get(self, url, headers=None, timeout=None):
        self.calls.append(("GET", url))
        return self._respond(url)

    def post(self, url, data=None, headers=None, timeout=None):
        self.calls.append(("POST", url, data))
        return self._respond(url)

    def _respond(self, url):
        for key, resp in self.mapping.items():
            if key in url:
                if isinstance(resp, tuple):
                    content, enc = resp
                    return FakeResponse(content, url, enc)
                return FakeResponse(resp, url)
        return FakeResponse("", url)


# --------------------------------------------------------------------------
# 规则后端
# --------------------------------------------------------------------------
class TestAnalyzeRuleHtml(unittest.TestCase):
    def setUp(self):
        self.soup = BeautifulSoup(text("search.html"), "html.parser")
        self.ar = AnalyzeRule(self.soup, base_url="http://x.com")

    def test_css_list_and_fields(self):
        els = self.ar.get_elements("@css:li.book-item")
        self.assertEqual(len(els), 2)
        c = self.ar.child(els[0])
        self.assertEqual(c.get_string("@css:.book-name a@text"), "剑来")
        self.assertEqual(c.get_string("@css:.book-name a@href"), "/book/1001")
        self.assertEqual(c.get_string("@css:.author@text"), "烽火戏诸侯")

    def test_legado_jsoup_syntax(self):
        els = self.ar.get_elements("class.book-item")
        self.assertEqual(len(els), 2)
        c = self.ar.child(els[1])
        self.assertEqual(c.get_string("class.book-name@tag.a@text"), "三体")
        self.assertEqual(c.get_string("class.book-name@tag.a@href"), "/book/1002")

    def test_bare_attr_on_self(self):
        a = self.ar.get_elements("@css:.book-name a")
        c = self.ar.child(a[0])
        self.assertEqual(c.get_string("text"), "剑来")
        self.assertEqual(c.get_string("href"), "/book/1001")

    def test_xpath(self):
        ar = AnalyzeRule(text("search.html"))
        self.assertEqual(ar.get_string("@xpath:(//h4[@class='book-name']/a/text())[1]"), "剑来")

    def test_alternative_fallback(self):
        # 第一个备选无结果，回退到第二个（在单个 book-item 作用域内取单值）
        c = self.ar.child(self.ar.get_elements("@css:li.book-item")[0])
        self.assertEqual(c.get_string("@css:.nope@text || @css:.author@text"), "烽火戏诸侯")

    def test_concat_joins_matches(self):
        joined = self.ar.get_string("@css:li.book-item .book-name a@text")
        self.assertIn("剑来", joined)
        self.assertIn("三体", joined)

    def test_regex_clean(self):
        ar = AnalyzeRule(BeautifulSoup("<p>第12章 惊蛰</p>", "html.parser"))
        self.assertEqual(ar.get_string("@css:p@text##第\\d+章\\s*##"), "惊蛰")

    def test_template(self):
        out = self.ar.get_string("书名：{{@css:li.book-item .book-name a@text}}")
        self.assertTrue(out.startswith("书名："))
        self.assertIn("剑来", out)

    def test_put_get(self):
        ar = AnalyzeRule(self.soup)
        self.assertEqual(ar.get_string("@put:{first:@css:.book-name a@text}"), "")
        self.assertIn("剑来", ar.get_string("@get:{first}"))

    def test_js_rule_raises(self):
        with self.assertRaises(JsRuleUnsupported):
            self.ar.get_string("@js:java.ajax('x')")
        with self.assertRaises(JsRuleUnsupported):
            self.ar.get_elements("<js>foo()</js>")

    def test_inline_js_postprocess(self):
        import json

        ar = AnalyzeRule(json.loads('{"category_name":"悬疑灵异","status":50,"update_time":"2023-07-27 11:38:13"}'))
        out = ar.get_string(
            "{{$.category_name}},{{$.status}},{{$.update_time}}@js:"
            'result.replace(/30/,"连载").replace(/50/,"完结").replace(/\\s..:.*/,"")'
        )
        self.assertEqual(out, "悬疑灵异,完结,2023-07-27")

    def test_inline_js_can_build_url_from_result_and_base_url(self):
        ar = AnalyzeRule(BeautifulSoup("<a data-bid='123'></a>", "html.parser"), base_url="https://m.qidian.com/book/1/")
        self.assertEqual(
            ar.get_string("a@data-bid@js:'https://m.qidian.com/book/'+result+'/'"), "https://m.qidian.com/book/123/"
        )
        self.assertEqual(ar.get_string("@js:baseUrl.replace('/book/','/chapters/')"), "https://m.qidian.com/chapters/1/")

    def test_inline_js_java_put_get(self):
        ar = AnalyzeRule(BeautifulSoup("<p>123</p>", "html.parser"))
        self.assertEqual(ar.get_string("p@text@js:java.put('id', result); result"), "123")
        self.assertEqual(ar.get_string("@get:{id}"), "123")


class TestExploreCategories(unittest.TestCase):
    def test_newline_format(self):
        src = BookSource(
            {
                "bookSourceUrl": "http://x.com",
                "bookSourceName": "T",
                "exploreUrl": "玄幻::/cat/1\n都市::/cat/2\n# 注释行\n@js:notSupported::/x",
            }
        )
        cats = src.explore_categories()
        self.assertEqual(cats, [{"name": "玄幻", "url": "/cat/1"}, {"name": "都市", "url": "/cat/2"}])

    def test_json_format(self):
        src = BookSource(
            {
                "bookSourceUrl": "http://x.com",
                "bookSourceName": "T",
                "exploreUrl": '[{"title":"科幻","url":"/sci"},{"name":"奇幻","url":"/fan"}]',
            }
        )
        cats = src.explore_categories()
        self.assertEqual(cats, [{"name": "科幻", "url": "/sci"}, {"name": "奇幻", "url": "/fan"}])

    def test_empty(self):
        src = BookSource({"bookSourceUrl": "http://x.com", "bookSourceName": "T"})
        self.assertEqual(src.explore_categories(), [])


class TestAnalyzeRuleJson(unittest.TestCase):
    def setUp(self):
        import json

        self.data = json.loads(text("search.json"))
        self.ar = AnalyzeRule(self.data)

    def test_jsonpath_list_and_fields(self):
        els = self.ar.get_elements("$.data.books[*]")
        self.assertEqual(len(els), 2)
        c = self.ar.child(els[0])
        self.assertEqual(c.get_string("$.title"), "诡秘之主")
        self.assertEqual(c.get_string("$.author"), "爱潜水的乌贼")

    def test_json_default_without_prefix(self):
        c = self.ar.child(self.ar.get_elements("$.data.books[*]")[1])
        self.assertEqual(c.get_string("title"), "雪中悍刀行")


# --------------------------------------------------------------------------
# AnalyzeUrl
# --------------------------------------------------------------------------
class TestAnalyzeUrl(unittest.TestCase):
    def _source(self, **kw):
        raw = {"bookSourceUrl": "http://x.com", "bookSourceName": "T"}
        raw.update(kw)
        return BookSource(raw)

    def test_variable_substitution_and_relative(self):
        sess = FakeSession({"/search": "<html>ok</html>"})
        au = AnalyzeUrl(
            "/search?key={{key}}&page={{page}}",
            base_url="http://x.com",
            variables={"key": "剑来", "page": 2},
            source=self._source(),
            session=sess,
        )
        self.assertTrue(au.url.startswith("http://x.com/search?key="))
        self.assertIn("page=2", au.url)
        au.fetch()
        self.assertEqual(sess.calls[0][0], "GET")

    def test_options_post_and_charset(self):
        sess = FakeSession({"/s": "<html>ok</html>"})
        au = AnalyzeUrl(
            'http://x.com/s,{"method":"POST","body":"k={{key}}","charset":"utf-8"}',
            base_url="http://x.com",
            variables={"key": "三体"},
            source=self._source(),
            session=sess,
        )
        self.assertEqual(au.options.get("method"), "POST")
        au.fetch()
        self.assertEqual(sess.calls[0][0], "POST")
        self.assertIn(b"k=", sess.calls[0][2])

    def test_js_url_raises(self):
        with self.assertRaises(JsRuleUnsupported):
            AnalyzeUrl("http://x.com/s,{<js>1</js>}", source=self._source(), session=FakeSession({}))

    def test_js_url_runtime(self):
        au = AnalyzeUrl(
            "@js:baseUrl + '/search?key=' + encodeURIComponent(key) + '&page=' + page",
            base_url="http://x.com",
            variables={"key": "剑来", "page": 2},
            source=self._source(),
            session=FakeSession({}),
        )
        self.assertEqual(au.url, "http://x.com/search?key=%E5%89%91%E6%9D%A5&page=2")


# --------------------------------------------------------------------------
# Cleaner
# --------------------------------------------------------------------------
class TestCleaner(unittest.TestCase):
    def test_blacklist_removes_lines(self):
        out = cleaner.clean("第一段\n请记住本站域名 example.com\n第二段", blacklist=["记住本站", "请记住域名"])
        self.assertNotIn("记住本站", out)
        self.assertIn("第一段", out)
        self.assertIn("第二段", out)

    def test_source_replace_regex(self):
        out = cleaner.clean("广告广告正文", source_replace_regex="广告##")
        self.assertEqual(out, "正文")

    def test_normalize_collapses_blank_lines(self):
        out = cleaner.clean("a\n\n\n\nb", blacklist=[])
        self.assertEqual(out, "a\n\nb")

    def test_disabled_only_normalizes(self):
        out = cleaner.clean("广告\n正文", blacklist=["广告"], enabled=False)
        self.assertIn("广告", out)


# --------------------------------------------------------------------------
# Engine（mock requests）
# --------------------------------------------------------------------------
CSS_SOURCE = {
    "bookSourceUrl": "http://x.com",
    "bookSourceName": "测试源",
    "bookSourceType": 0,
    "searchUrl": "/search?key={{key}}",
    "ruleSearch": {
        "bookList": "@css:li.book-item",
        "name": "@css:.book-name a@text",
        "author": "@css:.author@text",
        "kind": "@css:.kind@text",
        "lastChapter": "@css:.last@text",
        "intro": "@css:.intro@text",
        "coverUrl": "@css:img@src",
        "bookUrl": "@css:.book-name a@href",
    },
    "ruleBookInfo": {
        "name": "@css:.name@text",
        "author": "@css:.author@text",
        "kind": "@css:.kind@text",
        "lastChapter": "@css:.last-chapter@text",
        "intro": "@css:.intro@text",
        "coverUrl": "@css:.cover@src",
        "tocUrl": "@css:.toc-link@href",
    },
    "ruleToc": {
        "chapterList": "@css:a.chapter",
        "chapterName": "text",
        "chapterUrl": "href",
    },
    "ruleContent": {
        "content": "@css:#content@text",
        "replaceRegex": "本站最快更新.*",
    },
}

KUWO_SOURCE = {
    "bookSourceUrl": "http://appi.kuwo.cn",
    "bookSourceName": "酷我小说",
    "bookSourceType": 0,
    "ruleBookInfo": {
        "init": "$.data",
        "name": "$.title",
        "author": "$.author_name",
        "intro": "$.intro",
        "lastChapter": "$.new_chapter_name",
        "tocUrl": "/novels/api/book/{{$.book_id}}/chapters?paging=0",
    },
    "ruleToc": {
        "chapterList": "$.data",
        "chapterName": "$.chapter_title",
        "chapterUrl": "/novels/api/book/{{$.book_id}}/chapters/{{$.chapter_id}}",
        "updateTime": "{{$.volume_name}}•{{$.original_words}}字",
    },
    "ruleContent": {
        "content": "$.data.content",
    },
}


class TestEngineWithMock(unittest.TestCase):
    def _engine(self, mapping):
        return BookSourceEngine(BookSource(CSS_SOURCE), session=FakeSession(mapping))

    def test_search(self):
        eng = self._engine({"/search": text("search.html")})
        books = eng.search("剑来")
        self.assertEqual(len(books), 2)
        self.assertEqual(books[0].name, "剑来")
        self.assertEqual(books[0].book_url, "http://x.com/book/1001")
        self.assertEqual(books[0].cover_url, "http://x.com/img/1001.jpg")

    def test_book_info(self):
        eng = self._engine({"/book/1001": text("bookinfo.html")})
        detail = eng.book_info("/book/1001")
        self.assertEqual(detail.name, "剑来")
        self.assertEqual(detail.toc_url, "http://x.com/book/1001/toc")

    def test_toc(self):
        eng = self._engine({"/toc": text("toc.html")})
        chapters = eng.toc("/toc")
        self.assertEqual(len(chapters), 3)
        self.assertEqual(chapters[0].name, "第1章 惊蛰")
        self.assertEqual(chapters[0].url, "http://x.com/book/1001/c/1")

    def test_content_with_ad_removal(self):
        eng = self._engine({"/c/1": text("content.html")})
        body = eng.content("/c/1")
        self.assertIn("正文第一段", body)
        self.assertNotIn("本站最快更新", body)

    def test_content_charset_gbk(self):
        # 足够长的中文内容，便于 chardet 识别 GBK
        para = "这是一段足够长的中文正文用来测试编码自动识别功能。" * 20
        gbk = ("<div id=content><p>%s</p></div>" % para).encode("gbk")
        eng = self._engine({"/c/2": (gbk, "gbk")})
        body = eng.content("/c/2", clean=False)
        self.assertIn("编码自动识别", body)

    def test_book_info_json_init(self):
        detail_json = json.dumps(
            {
                "code": 200,
                "data": {
                    "book_id": "19634101901880004",
                    "title": "神秘复苏：我为阎王",
                    "author_name": "酒乱神",
                    "intro": "诡异复苏，罪孽横行。",
                    "new_chapter_name": "第23章：陈氏……",
                },
            }
        )
        eng = BookSourceEngine(BookSource(KUWO_SOURCE), session=FakeSession({"/novels/api/book/196": detail_json}))
        detail = eng.book_info("/novels/api/book/19634101901880004")
        self.assertEqual(detail.name, "神秘复苏：我为阎王")
        self.assertEqual(detail.author, "酒乱神")
        self.assertEqual(
            detail.toc_url,
            "http://appi.kuwo.cn/novels/api/book/19634101901880004/chapters?paging=0",
        )

    def test_toc_json_template_urls(self):
        toc_json = json.dumps(
            {
                "code": 200,
                "data": [
                    {
                        "book_id": "19634101901880004",
                        "chapter_id": "52707058868795030",
                        "chapter_title": "第1章：神符系统！",
                        "volume_name": "现在世界",
                        "original_words": 2028,
                    }
                ],
            }
        )
        eng = BookSourceEngine(BookSource(KUWO_SOURCE), session=FakeSession({"/chapters?paging=0": toc_json}))
        chapters = eng.toc("/novels/api/book/19634101901880004/chapters?paging=0")
        self.assertEqual(len(chapters), 1)
        self.assertEqual(chapters[0].name, "第1章：神符系统！")
        self.assertEqual(
            chapters[0].url,
            "http://appi.kuwo.cn/novels/api/book/19634101901880004/chapters/52707058868795030",
        )
        self.assertEqual(chapters[0].update_time, "现在世界•2028字")


class TestDetectSerialization(unittest.TestCase):
    def test_finished_by_kind(self):
        d = BookDetail(kind="玄幻 已完结")
        self.assertEqual(BookSourceEngine(BookSource(CSS_SOURCE)).detect_serialization(d), "finished")

    def test_serial_by_keyword(self):
        d = BookDetail(kind="科幻", last_chapter="连载中")
        self.assertEqual(BookSourceEngine(BookSource(CSS_SOURCE)).detect_serialization(d), "serial")

    def test_finished_by_last_chapter(self):
        d = BookDetail(last_chapter="第500章 大结局")
        self.assertEqual(BookSourceEngine(BookSource(CSS_SOURCE)).detect_serialization(d), "finished")

    def test_unknown(self):
        d = BookDetail(kind="玄幻", last_chapter="第3章")
        self.assertEqual(BookSourceEngine(BookSource(CSS_SOURCE)).detect_serialization(d), "unknown")

    def test_finished_via_chapters(self):
        d = BookDetail(kind="玄幻")
        chapters = [Chapter(name="第1章"), Chapter(name="第3章 大结局")]
        self.assertEqual(BookSourceEngine(BookSource(CSS_SOURCE)).detect_serialization(d, chapters), "finished")


if __name__ == "__main__":
    unittest.main()
