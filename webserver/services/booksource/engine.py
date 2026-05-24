#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""BookSourceEngine：基于一份书源，提供搜索 / 发现 / 详情 / 目录 / 正文能力。"""

import json
import logging
from dataclasses import dataclass, field
from urllib.parse import urljoin

from bs4 import BeautifulSoup

from . import cleaner
from .analyze_rule import AnalyzeRule
from .analyze_url import AnalyzeUrl
from .book_source import BookSource
from .exceptions import JsRuleUnsupported
from .http_client import build_session


FINISHED_KEYWORDS = ("完本", "完结", "全本", "已完结", "番外", "尾声", "终章", "大结局")
SERIAL_KEYWORDS = ("连载", "連載", "更新中", "连载中")

DEFAULT_MAX_TOC_PAGES = 30
DEFAULT_MAX_CONTENT_PAGES = 20


@dataclass
class BookSummary:
    name: str = ""
    author: str = ""
    kind: str = ""
    word_count: str = ""
    last_chapter: str = ""
    intro: str = ""
    cover_url: str = ""
    book_url: str = ""

    def to_dict(self):
        return dict(self.__dict__)


@dataclass
class BookDetail:
    name: str = ""
    author: str = ""
    kind: str = ""
    last_chapter: str = ""
    intro: str = ""
    cover_url: str = ""
    word_count: str = ""
    book_url: str = ""
    toc_url: str = ""

    def to_dict(self):
        return dict(self.__dict__)


@dataclass
class Chapter:
    name: str = ""
    url: str = ""
    is_vip: bool = False
    update_time: str = ""

    def to_dict(self):
        return dict(self.__dict__)


@dataclass
class ChapterContent:
    title: str = ""
    content: str = ""
    extra: dict = field(default_factory=dict)

    def to_dict(self):
        return {"title": self.title, "content": self.content}


def make_doc(text, rule_hint=""):
    """根据规则提示把响应文本解析为 JSON 对象或 BeautifulSoup。"""
    hint = (rule_hint or "").strip()
    if hint.startswith("$") or hint.startswith("@json:"):
        try:
            return json.loads(text)
        except ValueError:
            pass
    stripped = text.lstrip()
    if stripped[:1] in ("{", "["):
        try:
            return json.loads(text)
        except ValueError:
            pass
    return BeautifulSoup(text or "", "html.parser")


class BookSourceEngine:
    def __init__(self, source, session=None, config=None):
        if isinstance(source, BookSource):
            self.source = source
        else:
            self.source = BookSource(source)
        self.session = session or build_session(self.source)
        self.config = config or {}
        self.timeout = self.config.get("BOOKSOURCE_HTTP_TIMEOUT", 20)
        self.max_toc_pages = self.config.get("BOOKSOURCE_MAX_TOC_PAGES", DEFAULT_MAX_TOC_PAGES)
        self.max_content_pages = self.config.get("BOOKSOURCE_MAX_CONTENT_PAGES", DEFAULT_MAX_CONTENT_PAGES)
        self.ad_patterns = self.config.get("BOOKSOURCE_AD_PATTERNS", [])
        self.clean_enabled = self.config.get("BOOKSOURCE_CLEAN_ENABLED", True)

    @property
    def base_url(self):
        return self.source.book_source_url

    def _resolve(self, url, base=None):
        if not url:
            return ""
        if url.lower().startswith(("http://", "https://")):
            return url
        return urljoin(base or self.base_url, url)

    def _safe(self, rule_ctx, rule):
        """安全求值字段：JS 规则跳过返回空串。"""
        try:
            return rule_ctx.get_string(rule)
        except JsRuleUnsupported:
            logging.info("booksource[%s]: skip js rule: %s", self.source.book_source_name, rule)
            return ""

    # ------------------------------------------------------------------
    def search(self, key, page=1):
        variables = {"key": key, "page": page}
        au = AnalyzeUrl(
            self.source.search_url,
            base_url=self.base_url,
            variables=variables,
            source=self.source,
            session=self.session,
            timeout=self.timeout,
        )
        resp = au.fetch()
        return self._parse_book_list(resp.text, resp.url, self.source.rule_search)

    def explore(self, url, page=1):
        variables = {"page": page}
        au = AnalyzeUrl(
            url,
            base_url=self.base_url,
            variables=variables,
            source=self.source,
            session=self.session,
            timeout=self.timeout,
        )
        resp = au.fetch()
        rule = self.source.rule_search
        rule_explore = self.source.raw.get("ruleExplore")
        from .book_source import RuleGroup

        if rule_explore:
            rule = RuleGroup(rule_explore)
        return self._parse_book_list(resp.text, resp.url, rule)

    def _parse_book_list(self, text, page_url, rule):
        book_list_rule = rule.get("bookList")
        doc = make_doc(text, book_list_rule)
        ctx = AnalyzeRule(doc, base_url=page_url)
        results = []
        try:
            elements = ctx.get_elements(book_list_rule) if book_list_rule else []
        except JsRuleUnsupported:
            logging.info("booksource[%s]: bookList rule uses js", self.source.book_source_name)
            return results
        for node in elements:
            c = ctx.child(node)
            book = BookSummary(
                name=self._safe(c, rule.get("name")),
                author=self._safe(c, rule.get("author")),
                kind=self._safe(c, rule.get("kind")),
                word_count=self._safe(c, rule.get("wordCount")),
                last_chapter=self._safe(c, rule.get("lastChapter")),
                intro=self._safe(c, rule.get("intro")),
                cover_url=self._resolve(self._safe(c, rule.get("coverUrl")), page_url),
                book_url=self._resolve(self._safe(c, rule.get("bookUrl")), page_url),
            )
            if book.name or book.book_url:
                results.append(book)
        return results

    # ------------------------------------------------------------------
    def book_info(self, book_url):
        url = self._resolve(book_url)
        au = AnalyzeUrl(url, base_url=self.base_url, source=self.source, session=self.session, timeout=self.timeout)
        resp = au.fetch()
        rule = self.source.rule_book_info
        name_rule = rule.get("name")
        doc = make_doc(resp.text, name_rule)
        ctx = AnalyzeRule(doc, base_url=resp.url)
        detail = BookDetail(
            name=self._safe(ctx, rule.get("name")),
            author=self._safe(ctx, rule.get("author")),
            kind=self._safe(ctx, rule.get("kind")),
            last_chapter=self._safe(ctx, rule.get("lastChapter")),
            intro=self._safe(ctx, rule.get("intro")),
            cover_url=self._resolve(self._safe(ctx, rule.get("coverUrl")), resp.url),
            word_count=self._safe(ctx, rule.get("wordCount")),
            book_url=url,
        )
        toc_url = self._safe(ctx, rule.get("tocUrl"))
        detail.toc_url = self._resolve(toc_url, resp.url) if toc_url else url
        return detail

    # ------------------------------------------------------------------
    def toc(self, toc_url):
        rule = self.source.rule_toc
        chapter_list_rule = rule.get("chapterList")
        next_rule = rule.get("nextTocUrl")
        chapters = []
        seen = set()
        url = self._resolve(toc_url)
        pages = 0
        while url and pages < self.max_toc_pages and url not in seen:
            seen.add(url)
            pages += 1
            au = AnalyzeUrl(url, base_url=self.base_url, source=self.source, session=self.session, timeout=self.timeout)
            resp = au.fetch()
            doc = make_doc(resp.text, chapter_list_rule)
            ctx = AnalyzeRule(doc, base_url=resp.url)
            try:
                elements = ctx.get_elements(chapter_list_rule) if chapter_list_rule else []
            except JsRuleUnsupported:
                logging.info("booksource[%s]: chapterList rule uses js", self.source.book_source_name)
                break
            for node in elements:
                c = ctx.child(node)
                ch = Chapter(
                    name=self._safe(c, rule.get("chapterName")),
                    url=self._resolve(self._safe(c, rule.get("chapterUrl")), resp.url),
                    is_vip=bool(self._safe(c, rule.get("isVip"))),
                    update_time=self._safe(c, rule.get("updateTime")),
                )
                if ch.name or ch.url:
                    chapters.append(ch)
            # 翻页
            next_url = ""
            if next_rule:
                next_url = self._safe(ctx, next_rule)
            url = self._resolve(next_url, resp.url) if next_url else ""
        return chapters

    # ------------------------------------------------------------------
    def content(self, chapter_url, clean=True):
        rule = self.source.rule_content
        content_rule = rule.get("content")
        next_rule = rule.get("nextContentUrl")
        replace_regex = rule.get("replaceRegex")
        parts = []
        seen = set()
        url = self._resolve(chapter_url)
        pages = 0
        while url and pages < self.max_content_pages and url not in seen:
            seen.add(url)
            pages += 1
            au = AnalyzeUrl(url, base_url=self.base_url, source=self.source, session=self.session, timeout=self.timeout)
            resp = au.fetch()
            doc = make_doc(resp.text, content_rule)
            ctx = AnalyzeRule(doc, base_url=resp.url)
            try:
                parts.append(ctx.get_string(content_rule))
            except JsRuleUnsupported:
                logging.info("booksource[%s]: content rule uses js", self.source.book_source_name)
                break
            next_url = self._safe(ctx, next_rule) if next_rule else ""
            url = self._resolve(next_url, resp.url) if next_url else ""
        text = "\n".join(p for p in parts if p)
        if clean:
            text = cleaner.clean(
                text,
                source_replace_regex=replace_regex,
                blacklist=self.ad_patterns,
                enabled=self.clean_enabled,
            )
        else:
            text = cleaner.normalize_whitespace(text)
        return text

    # ------------------------------------------------------------------
    def detect_serialization(self, detail, chapters=None):
        """根据书源元数据 + 目录判断连载状态：serial / finished / unknown。"""
        haystack = " ".join(str(x) for x in [getattr(detail, "kind", ""), getattr(detail, "last_chapter", "")] if x)
        if chapters:
            last = chapters[-1].name if hasattr(chapters[-1], "name") else ""
            haystack += " " + (last or "")
        for kw in FINISHED_KEYWORDS:
            if kw in haystack:
                return "finished"
        for kw in SERIAL_KEYWORDS:
            if kw in haystack:
                return "serial"
        return "unknown"
