#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""把已启用 Legado 书源作为可回填的书籍元数据来源。"""

import concurrent.futures
import copy
import json
import logging
import os
import re
import time
from dataclasses import dataclass, field
from urllib.parse import urlparse

import tornado.web

from webserver.models import BookSourceModel

from .engine import BookSourceEngine


KEY = "BookSource"
TOKEN_NAME = "booksource-metadata"
BUILTIN_PATH = os.path.join(os.path.dirname(__file__), "metadata_sources.json")


@dataclass(frozen=True)
class MetadataSource:
    key: str
    name: str
    raw: dict


@dataclass
class MetadataSearchResult:
    books: list = field(default_factory=list)
    failures: list = field(default_factory=list)


def load_builtin_sources():
    with open(BUILTIN_PATH, "r", encoding="utf-8") as stream:
        items = json.load(stream)
    return [
        MetadataSource(
            key="builtin:%s" % item["snapshotId"],
            name=item.get("bookSourceName") or item["snapshotId"],
            raw=item,
        )
        for item in items
    ]


def collect_metadata_sources(session, top_k=10):
    """先取用户启用的文本书源，再补充未重复的内置快照。"""
    models = (
        session.query(BookSourceModel)
        .filter(BookSourceModel.enabled.is_(True), BookSourceModel.source_type == 0)
        .order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc())
        .limit(max(0, int(top_k)))
        .all()
    )
    sources = [MetadataSource(key="db:%s" % model.id, name=model.name, raw=copy.deepcopy(model.raw)) for model in models]
    seen_urls = {source.raw.get("bookSourceUrl") for source in sources}
    for source in load_builtin_sources():
        if source.raw.get("bookSourceUrl") not in seen_urls:
            sources.append(source)
    return sources


def encode_provider_value(secret, source_key, book_url):
    payload = json.dumps(
        {"v": 1, "source": source_key, "book_url": book_url, "issued_at": int(time.time())},
        ensure_ascii=False,
        separators=(",", ":"),
    )
    value = tornado.web.create_signed_value(str(secret), TOKEN_NAME, payload)
    return value.decode("utf-8")


def decode_provider_value(secret, token, ttl_seconds=3600):
    raw = tornado.web.decode_signed_value(str(secret), TOKEN_NAME, token, max_age_days=365)
    if not raw:
        return None
    try:
        payload = json.loads(raw.decode("utf-8"))
        issued_at = int(payload["issued_at"])
    except (KeyError, TypeError, ValueError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if payload.get("v") != 1 or time.time() - issued_at > int(ttl_seconds) or issued_at > time.time() + 60:
        return None
    if not payload.get("source") or not _is_http_url(payload.get("book_url")):
        return None
    return payload


def _is_http_url(value):
    parsed = urlparse(str(value or "").split(",{")[0])
    return parsed.scheme in ("http", "https") and bool(parsed.netloc)


class BookSourceMetadataService:
    def __init__(self, sources, secret, config=None):
        self.sources = list(sources)
        self.secret = secret
        self.config = config or {}

    def search(self, title, author=None):
        if not self.sources:
            return MetadataSearchResult(failures=[self._failure("booksource", "no_source", "没有可用的在线书源")])
        workers = min(len(self.sources), max(1, int(self.config.get("BOOKSOURCE_METADATA_WORKERS", 6))))
        outcome = MetadataSearchResult()
        with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
            future_map = {executor.submit(self._search_source, source, title, author): source for source in self.sources}
            for future in concurrent.futures.as_completed(future_map):
                source = future_map[future]
                try:
                    books = future.result()
                    if books:
                        outcome.books.extend(books)
                    else:
                        outcome.failures.append(self._failure(source.name, "no_result", "未找到匹配图书"))
                except Exception as err:
                    logging.warning("在线书源元数据查询失败 source=%s error=%s", source.name, err)
                    outcome.failures.append(self._failure(source.name, "fetch_failed", "查询失败"))
        return outcome

    def _search_source(self, source, title, author=None):
        engine = BookSourceEngine(source.raw, config=self.config)
        summaries = engine.search(title)
        books = []
        for summary in summaries:
            if author and summary.author and not self._author_matches(author, summary.author):
                continue
            metadata = self._metadata_from_summary(summary, source)
            if metadata:
                books.append(metadata)
        return books

    @staticmethod
    def _author_matches(expected, actual):
        def normalize(value):
            return "".join(str(value or "").lower().split())

        expected, actual = normalize(expected), normalize(actual)
        return not expected or not actual or expected in actual or actual in expected

    def _metadata_from_summary(self, summary, source):
        if not summary.name or not _is_http_url(summary.book_url):
            return None
        from calibre.ebooks.metadata.book.base import Metadata

        mi = Metadata(summary.name)
        mi.authors = [summary.author or "佚名"]
        mi.author_sort = mi.authors[0]
        mi.publisher = ""
        mi.isbn = ""
        mi.tags = self._tags(summary.kind)
        mi.comments = summary.intro or ""
        mi.cover_url = summary.cover_url or ""
        mi.cover_data = None
        mi.website = summary.book_url.split(",{")[0]
        mi.source = source.name
        mi.provider_key = KEY
        mi.provider_value = encode_provider_value(self.secret, source.key, summary.book_url)
        return mi

    def apply(self, token, session, copy_image=True):
        payload = decode_provider_value(
            self.secret,
            token,
            ttl_seconds=self.config.get("BOOKSOURCE_METADATA_TOKEN_TTL", 3600),
        )
        if not payload:
            return None
        source = self._resolve_source(payload["source"], session)
        if not source:
            return None
        engine = BookSourceEngine(source.raw, config=self.config)
        detail = engine.book_info(payload["book_url"])
        if not detail.name:
            return None
        from calibre.ebooks.metadata.book.base import Metadata

        mi = Metadata(detail.name)
        mi.authors = [detail.author or "佚名"]
        mi.author_sort = mi.authors[0]
        mi.publisher = ""
        mi.isbn = ""
        mi.tags = self._tags(detail.kind)
        mi.comments = detail.intro or ""
        mi.cover_url = detail.cover_url or ""
        mi.website = payload["book_url"].split(",{")[0]
        mi.source = source.name
        mi.provider_key = KEY
        mi.provider_value = token
        mi.cover_data = self._download_cover(engine, mi.cover_url) if copy_image else None
        return mi

    def _resolve_source(self, source_key, session):
        if source_key.startswith("db:"):
            try:
                source_id = int(source_key.split(":", 1)[1])
            except ValueError:
                return None
            model = (
                session.query(BookSourceModel)
                .filter(BookSourceModel.id == source_id, BookSourceModel.enabled.is_(True), BookSourceModel.source_type == 0)
                .first()
            )
            if model:
                return MetadataSource(source_key, model.name, copy.deepcopy(model.raw))
            return None
        return next((source for source in load_builtin_sources() if source.key == source_key), None)

    @staticmethod
    def _download_cover(engine, url):
        if not _is_http_url(url):
            return None
        try:
            response = engine.session.get(url, timeout=10)
            if getattr(response, "status_code", 200) != 200 or not response.content:
                return None
            extension = urlparse(url).path.rsplit(".", 1)[-1].lower()
            if extension not in ("jpg", "jpeg", "png", "gif", "webp"):
                extension = "jpg"
            return (extension, response.content)
        except Exception as err:
            logging.warning("在线书源封面下载失败：%s", err)
            return None

    @staticmethod
    def _tags(value):
        if isinstance(value, list):
            return [str(item).strip() for item in value if str(item).strip()][:8]
        return [item.strip() for item in re.split(r"[,\uff0c\n]+", str(value or "")) if item.strip()][:8]

    @staticmethod
    def _failure(source, code, message):
        return {"source": source, "code": code, "message": message}


def metadata_to_evidence(book):
    return {
        "source": getattr(book, "source", ""),
        "title": getattr(book, "title", ""),
        "authors": getattr(book, "authors", []),
        "summary": getattr(book, "comments", ""),
        "tags": getattr(book, "tags", []),
        "website": getattr(book, "website", ""),
        "cover_url": getattr(book, "cover_url", ""),
    }
