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


# --------------------------------------------------------------------------
# Legado 兼容性移植（2026-06-11）：索引语法 / ### / $N / text. / textNodes
# --------------------------------------------------------------------------
LIST_HTML = """
<div>
  <ul>
    <li><a href="/c/0">最新章节甲</a></li>
    <li><a href="/c/1">最新章节乙</a></li>
    <li><a href="/c/2">第1章</a></li>
    <li><a href="/c/3">第2章</a></li>
    <li><a href="/c/4">第3章</a></li>
    <li><a href="/c/5">第4章</a></li>
  </ul>
  <p>简介开头<span>跳过我</span>简介结尾</p>
  <div class="page"><a>上一页</a><a href="/toc_2">下一页</a></div>
</div>
"""


class TestLegadoIndexSyntax(unittest.TestCase):
    def setUp(self):
        self.ar = AnalyzeRule(BeautifulSoup(LIST_HTML, "html.parser"), base_url="http://x.com")

    def test_exclude_legacy(self):
        # 排除前两个 li（页首"最新章节"块）
        els = self.ar.get_elements("li!0:1@a")
        self.assertEqual([e.get_text() for e in els], ["第1章", "第2章", "第3章", "第4章"])

    def test_multi_index_legacy(self):
        els = self.ar.get_elements("tag.li.0:2")
        self.assertEqual([e.get_text() for e in els], ["最新章节甲", "第1章"])

    def test_negative_index_legacy(self):
        els = self.ar.get_elements("tag.li.-1")
        self.assertEqual([e.get_text() for e in els], ["第4章"])

    def test_bracket_range(self):
        els = self.ar.get_elements("tag.li[2:4]")
        self.assertEqual([e.get_text() for e in els], ["第1章", "第2章", "第3章"])

    def test_bracket_exclude(self):
        els = self.ar.get_elements("tag.li[!0,1]")
        self.assertEqual(len(els), 4)
        self.assertEqual(els[0].get_text(), "第1章")

    def test_bracket_reverse(self):
        els = self.ar.get_elements("tag.li[-1:0]")
        self.assertEqual(els[0].get_text(), "第4章")
        self.assertEqual(els[-1].get_text(), "最新章节甲")

    def test_bracket_not_confused_with_css_attr(self):
        # [href] 是 CSS 属性选择器，不是索引
        els = self.ar.get_elements("@css:.page a[href]")
        self.assertEqual(len(els), 1)

    def test_text_step_contains_own_text(self):
        # Legado text.XXX：按自有文本筛选元素
        self.assertEqual(self.ar.get_string("text.下一页@href"), "/toc_2")

    def test_textnodes_only_direct(self):
        # textNodes 仅取直接子文本节点，不含 <span> 内文本
        out = self.ar.get_string("tag.p@textNodes")
        self.assertEqual(out, "简介开头\n简介结尾")

    def test_replace_first_tail_regex(self):
        ar = AnalyzeRule(BeautifulSoup("<p>第12章 惊蛰(修)</p>", "html.parser"))
        # ###：取首个匹配段再替换，未匹配部分丢弃
        self.assertEqual(ar.get_string("tag.p@text##第(\\d+)章##第$1回###"), "第12回")

    def test_java_style_group_reference(self):
        ar = AnalyzeRule(BeautifulSoup("<p>卷一 第3章</p>", "html.parser"))
        self.assertEqual(ar.get_string("tag.p@text##卷一 第(\\d+)章##chapter-$1"), "chapter-3")

    def test_get_string_list_multivalue(self):
        urls = self.ar.get_string_list("tag.li@a@href")
        self.assertEqual(len(urls), 6)
        self.assertEqual(urls[0], "/c/0")


class TestAnalyzeUrlPageSegments(unittest.TestCase):
    def test_page_segment_picks_by_page(self):
        au1 = AnalyzeUrl("/s?q={{key}}<,&page={{page}}>", base_url="http://x.com", variables={"key": "k", "page": 1})
        self.assertEqual(au1.url, "http://x.com/s?q=k")
        au2 = AnalyzeUrl("/s?q={{key}}<,&page={{page}}>", base_url="http://x.com", variables={"key": "k", "page": 3})
        self.assertEqual(au2.url, "http://x.com/s?q=k&page=3")

    def test_page_segment_overflow_uses_last(self):
        au = AnalyzeUrl("/list<one.html,two_{{page}}.html>", base_url="http://x.com", variables={"page": 9})
        self.assertEqual(au.url, "http://x.com/listtwo_9.html")

    def test_no_page_variable_keeps_url(self):
        au = AnalyzeUrl("/book/1/", base_url="http://x.com", variables={})
        self.assertEqual(au.url, "http://x.com/book/1/")


# --------------------------------------------------------------------------
# 目录翻页语义（m.jhsssd.com 回归：option 下拉一次给出全部分页）
# --------------------------------------------------------------------------
SELECT_PAGED_SOURCE = {
    "bookSourceUrl": "http://x.com",
    "bookSourceName": "select分页源",
    "bookSourceType": 0,
    "ruleToc": {
        "chapterList": ".chapter li a",
        "chapterName": "text",
        "chapterUrl": "href",
        "nextTocUrl": "option@value",
    },
    "ruleContent": {"content": "@css:#content@text", "nextContentUrl": "text.下一页@href"},
}


def _toc_page(chapters, options=True):
    lis = "".join('<li><a href="/c/%d">第%d章</a></li>' % (i, i) for i in chapters)
    opts = (
        '<select><option value="http://x.com/toc/p1">1</option>'
        '<option value="http://x.com/toc/p2">2</option>'
        '<option value="http://x.com/toc/p3">3</option></select>'
        if options
        else ""
    )
    return '<div class="chapter"><ul>%s</ul></div>%s' % (lis, opts)


class TestTocPagination(unittest.TestCase):
    def _engine(self, mapping):
        return BookSourceEngine(BookSource(SELECT_PAGED_SOURCE), session=FakeSession(mapping))

    def test_multi_url_next_toc_fetches_all_pages(self):
        eng = self._engine(
            {
                "/toc/p1": _toc_page(range(1, 4)),
                "/toc/p2": _toc_page(range(4, 7)),
                "/toc/p3": _toc_page(range(7, 10)),
            }
        )
        chapters = eng.toc("/toc/p1")
        self.assertEqual(len(chapters), 9)
        self.assertEqual(chapters[0].name, "第1章")
        self.assertEqual(chapters[-1].name, "第9章")

    def test_single_next_url_still_loops(self):
        source = dict(SELECT_PAGED_SOURCE)
        source["ruleToc"] = dict(source["ruleToc"], nextTocUrl="text.下一页@href")
        page1 = '<div class="chapter"><ul><li><a href="/c/1">第1章</a></li></ul></div><a href="/toc/p2">下一页</a>'
        page2 = '<div class="chapter"><ul><li><a href="/c/2">第2章</a></li></ul></div>'
        eng = BookSourceEngine(BookSource(source), session=FakeSession({"/toc/p1": page1, "/toc/p2": page2}))
        chapters = eng.toc("/toc/p1")
        self.assertEqual([c.name for c in chapters], ["第1章", "第2章"])

    def test_dedupe_keeps_later_occurrence(self):
        # 页首"最新章节"块与正文列表重复，去重后保留正文列表中的位置
        html = (
            '<div class="chapter"><ul>'
            '<li><a href="/c/3">第3章</a></li>'
            '<li><a href="/c/1">第1章</a></li>'
            '<li><a href="/c/2">第2章</a></li>'
            '<li><a href="/c/3">第3章</a></li>'
            "</ul></div>"
        )
        eng = self._engine({"/toc/p1": html})
        chapters = eng.toc("/toc/p1")
        self.assertEqual([c.name for c in chapters], ["第1章", "第2章", "第3章"])

    def test_reverse_prefix_flips_order(self):
        source = dict(SELECT_PAGED_SOURCE)
        source["ruleToc"] = dict(source["ruleToc"], chapterList="-.chapter li a", nextTocUrl="")
        html = (
            '<div class="chapter"><ul>'
            '<li><a href="/c/2">第2章</a></li>'
            '<li><a href="/c/1">第1章</a></li>'
            "</ul></div>"
        )
        eng = BookSourceEngine(BookSource(source), session=FakeSession({"/toc/p1": html}))
        chapters = eng.toc("/toc/p1")
        self.assertEqual([c.name for c in chapters], ["第1章", "第2章"])

    def test_toc_page_limit_respected(self):
        eng = BookSourceEngine(
            BookSource(SELECT_PAGED_SOURCE),
            session=FakeSession(
                {
                    "/toc/p1": _toc_page([1]),
                    "/toc/p2": _toc_page([2]),
                    "/toc/p3": _toc_page([3]),
                }
            ),
            config={"BOOKSOURCE_MAX_TOC_PAGES": 2},
        )
        chapters = eng.toc("/toc/p1")
        self.assertEqual(len(chapters), 2)

    def test_content_multi_page_next_url(self):
        page1 = '<div id="content">上半段</div><a href="/c/1_2">下一页</a>'
        page2 = '<div id="content">下半段</div>'
        eng = self._engine({"/c/1_2": page2, "/c/1": page1})
        body = eng.content("/c/1", clean=False)
        self.assertIn("上半段", body)
        self.assertIn("下半段", body)


if __name__ == "__main__":
    unittest.main()
