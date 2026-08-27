"""Legado 规则引擎的 SourceProvider 适配器。"""

import re

from webserver.services.booksource import BookSource, BookSourceEngine
from webserver.services.booksource import engine as booksource_engine

from webserver.plugins.runtime.domains import (
    Category,
    CheckReport,
    Page,
    SourceBook,
    SourceBookDetail,
    SourceChapter,
    SourceContent,
)
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderResult, UpstreamError
from webserver.plugins.runtime.safe_http import SafeHttpClient


def _status(session, settings):
    from webserver.models import BookSourceModel

    sources = session.query(BookSourceModel).all()
    return {"configured": len(sources), "enabled": sum(1 for item in sources if item.enabled)}


class LegadoSourcePlugin:
    download_mode = "by_chapters"

    def __init__(self, manifest, status_fn):
        self.manifest = manifest
        self.status_fn = status_fn

    def status(self, session, settings):
        return self.status_fn(session, settings)

    @staticmethod
    def initial_enabled(settings):
        return True

    def execute(self, context):
        source_raw = (context.get("config") or {}).get("source_raw")
        if not source_raw:
            return ProviderResult(health_message=self.manifest["ui"]["healthy_message"])
        report = self.self_check(context)
        if not report.healthy:
            raise UpstreamError(report.message)
        return ProviderResult(health_message=report.message)

    @staticmethod
    def _source(context):
        raw = (context.get("config") or {}).get("source_raw")
        if not isinstance(raw, dict):
            raise UpstreamError("Legado source binding is missing")
        return BookSource(raw)

    def _engine(self, context):
        config = context.get("config") or {}
        engine_config = dict(config.get("engine_config") or {})
        source = self._source(context)
        transport = SafeHttpClient(
            session=booksource_engine.build_session(source),
            allowed_hosts=engine_config.get("BOOKSOURCE_ALLOWED_HOSTS") or (),
            max_bytes=int(engine_config.get("BOOKSOURCE_MAX_RESPONSE_BYTES") or 8 * 1024 * 1024),
        )
        return BookSourceEngine(source, session=transport, config=engine_config)

    @staticmethod
    def _summary(item, source_name):
        return SourceBook(
            external_id=item.book_url,
            title=item.name,
            authors=tuple([item.author] if item.author else []),
            source=source_name,
            source_url=item.book_url,
            access="external_link",
            description=item.intro,
            cover_url=item.cover_url,
            categories=tuple(value for value in re.split(r"[\s,，、/|]+", item.kind or "") if value),
            extra={
                "name": item.name,
                "author": item.author,
                "kind": item.kind,
                "word_count": item.word_count,
                "last_chapter": item.last_chapter,
                "intro": item.intro,
                "book_url": item.book_url,
            },
        )

    def search(self, query, cursor, context):
        page = max(1, int((cursor or {}).get("page", 1)))
        engine = self._engine(context)
        items = [self._summary(item, engine.source.book_source_name) for item in engine.search(query, page)]
        return Page(items=items, next_cursor={"page": page + 1}, health_message="搜索到 %d 本书" % len(items))

    def browse(self, category_id, cursor, context):
        if not category_id:
            return Page(items=[], health_message="请选择发现分类")
        page = max(1, int((cursor or {}).get("page", 1)))
        engine = self._engine(context)
        items = [self._summary(item, engine.source.book_source_name) for item in engine.explore(category_id, page)]
        return Page(items=items, next_cursor={"page": page + 1}, health_message="发现 %d 本书" % len(items))

    def get_categories(self, context):
        return [Category(id=item["url"], name=item["name"]) for item in self._source(context).explore_categories()]

    def get_book(self, external_id, context):
        engine = self._engine(context)
        detail = engine.book_info(external_id)
        return SourceBookDetail(
            external_id=detail.book_url or external_id,
            title=detail.name,
            authors=tuple([detail.author] if detail.author else []),
            description=detail.intro,
            cover_url=detail.cover_url,
            categories=tuple(value for value in re.split(r"[\s,，、/|]+", detail.kind or "") if value),
            source_url=detail.book_url or external_id,
            downloadable=True,
            toc_ref=detail.toc_url,
            last_chapter=detail.last_chapter,
            word_count=detail.word_count,
            source=engine.source.book_source_name,
            extra={
                "name": detail.name,
                "author": detail.author,
                "kind": detail.kind,
                "intro": detail.intro,
                "book_url": detail.book_url or external_id,
                "toc_url": detail.toc_url,
                "serialize_status": engine.detect_serialization(detail),
            },
        )

    def download(self, book, context):
        raise UpstreamError("Legado sources are assembled from chapters")

    def get_toc(self, book, context):
        if not book.toc_ref:
            raise UpstreamError("Legado book detail has no table-of-contents URL")
        return [
            SourceChapter(
                external_id=item.url,
                title=item.name,
                is_vip=item.is_vip,
                updated_at=item.update_time,
                extra={"name": item.name, "url": item.url, "update_time": item.update_time},
            )
            for item in self._engine(context).toc(book.toc_ref)
        ]

    def get_chapter(self, chapter, context):
        clean = bool((context.get("config") or {}).get("clean", True))
        content = self._engine(context).content(chapter.external_id, clean=clean)
        if hasattr(content, "content"):
            return SourceContent(title=getattr(content, "title", chapter.title), content=content.content)
        return SourceContent(title=chapter.title, content=str(content or ""))

    def self_check(self, context):
        source = self._source(context)
        healthy = bool(source.book_source_url and source.book_source_name and source.search_url)
        return CheckReport(
            healthy=healthy,
            message="%s 连接可用" % source.book_source_name if healthy else "Legado 书源缺少名称、地址或搜索规则",
        )


class LegadoProvider(LegadoSourcePlugin):
    def __init__(self):
        super().__init__(
            {
                "protocol_version": PROTOCOL_VERSION,
                "id": "talebook.source.legado",
                "name": "Legado 在线书源",
                "description": "管理、导入、搜索、阅读与体检兼容 Legado 的在线书源。",
                "version": "1.0.0",
                "categories": ["book_sources"],
                "capabilities": ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
                "runtime_kind": "builtin",
                "actions": ["test"],
                "auth_schema": {"type": "object", "properties": {}},
                "config_schema": {"type": "object", "properties": {}},
                "permissions": ["books.read", "books.write", "network.read"],
                "data_policy": {"stores_full_text": False, "retention": "source_owned"},
                "compatibility": {"talebook": ">=0.1.0"},
                "connection_owners": ["instance"],
                "download_mode": "by_chapters",
                "homepage": "https://github.com/talebook/talebook",
                "license": "GPL-3.0",
                "ui": {
                    "icon": "mdi-book-cog-outline",
                    "manage_dialog": "legado",
                    "manage_label_key": "pluginManagement.manage",
                    "primary_action": "manage",
                    "healthy_message": "Legado 书源适配器可用",
                },
            },
            _status,
        )


PROVIDER = LegadoProvider()
