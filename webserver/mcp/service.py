#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""Talebook-native tools exposed through MCP."""

import json

from webserver import loader, utils
from webserver.models import BookSourceModel, OnlineBookMeta, ReadingState
from webserver.plugins.meta import douban
from webserver.services.autofill import AutoFillService
from webserver.services.booksource import BookSource, BookSourceEngine, JsRuleUnsupported
from webserver.services.booksource_search import SearchTaskService


CONF = loader.get_settings()


class ToolFailure(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code
        self.message = message


def _object(properties=None, required=None):
    schema = {"type": "object", "properties": properties or {}, "additionalProperties": False}
    if required:
        schema["required"] = required
    return schema


def _tool(name, title, description, schema, read_only=True, destructive=False):
    return {
        "name": name,
        "title": title,
        "description": description,
        "inputSchema": schema,
        "annotations": {
            "readOnlyHint": read_only,
            "destructiveHint": destructive,
            "idempotentHint": read_only,
            "openWorldHint": name.startswith(("search_network", "get_network", "read_network", "save_network")),
        },
    }


class MCPToolService:
    """Execute a fixed allowlist of book and network-library operations."""

    def __init__(self, handler):
        self.handler = handler
        self.user = handler.current_user
        self.user_id = self.user.id
        self._methods = {
            name[5:]: getattr(self, name) for name in dir(self) if name.startswith("tool_") and callable(getattr(self, name))
        }

    def list_tools(self):
        page = {
            "page": {"type": "integer", "minimum": 1, "default": 1},
            "page_size": {
                "type": "integer",
                "minimum": 1,
                "maximum": int(CONF.get("MCP_MAX_BOOKS", 20)),
                "default": 20,
            },
        }
        book_id = {"book_id": {"type": "integer", "minimum": 1}}
        source_id = {"source_id": {"type": "integer", "minimum": 1}}
        return [
            _tool("library_overview", "书库概览", "统计 Talebook 本地书库、元数据和当前用户阅读情况。", _object()),
            _tool(
                "search_books",
                "搜索本地书库",
                "使用 Calibre 搜索语法查找当前用户可见书籍，普通关键词可匹配书名和作者。",
                _object({"query": {"type": "string", "minLength": 1}, **page}, ["query"]),
            ),
            _tool(
                "get_book", "获取书籍详情", "按 Talebook book ID 获取元数据、格式和阅读状态。", _object(book_id, ["book_id"])
            ),
            _tool(
                "list_authors",
                "作者统计",
                "列出书库作者及其在库书籍数量。",
                _object({"limit": {"type": "integer", "minimum": 1, "maximum": 200, "default": 50}}),
            ),
            _tool("list_categories", "分类导航", "读取 Talebook 的 BOOK_NAV 分类导航配置。", _object()),
            _tool("reading_overview", "阅读概览", "统计当前用户的在读、已读、收藏和想读数量。", _object()),
            _tool(
                "list_bookshelf",
                "查看个人书单",
                "列出收藏、想读、在读或已读书籍。",
                _object(
                    {
                        "shelf": {"type": "string", "enum": ["favorite", "wants", "reading", "finished"]},
                        **page,
                    },
                    ["shelf"],
                ),
            ),
            _tool(
                "update_reading_state",
                "更新阅读状态",
                "更新一本书的收藏、想读或阅读状态；只传需要修改的字段。",
                _object(
                    {
                        **book_id,
                        "favorite": {"type": "boolean"},
                        "wants": {"type": "boolean"},
                        "read_state": {"type": "integer", "enum": [0, 1, 2]},
                    },
                    ["book_id"],
                ),
                read_only=False,
            ),
            _tool(
                "get_reading_progress",
                "读取阅读进度",
                "读取一本书的跨设备阅读进度。",
                _object(book_id, ["book_id"]),
            ),
            _tool(
                "update_reading_progress",
                "保存阅读进度",
                "保存一本书的客户端自定义阅读进度对象，最大 8 KiB。",
                _object({**book_id, "progress": {"type": "object"}}, ["book_id", "progress"]),
                read_only=False,
            ),
            _tool(
                "update_book_metadata",
                "编辑书籍元数据",
                "更新书名、作者、标签、出版社、ISBN、丛书、评分、语言、出版日期或简介。",
                _object(
                    {
                        **book_id,
                        "title": {"type": "string"},
                        "authors": {"type": "array", "items": {"type": "string"}},
                        "tags": {"type": "array", "items": {"type": "string"}},
                        "publisher": {"type": "string"},
                        "isbn": {"type": "string"},
                        "series": {"type": "string"},
                        "rating": {"type": "number", "minimum": 0, "maximum": 10},
                        "language": {"type": "string"},
                        "pubdate": {"type": "string"},
                        "comments": {"type": "string"},
                    },
                    ["book_id"],
                ),
                read_only=False,
            ),
            _tool(
                "auto_fill_metadata",
                "自动补全元数据",
                "从 Talebook 已配置的数据源异步补全指定书籍；不会修改书名。",
                _object(
                    {
                        "book_ids": {
                            "type": "array",
                            "items": {"type": "integer", "minimum": 1},
                            "minItems": 1,
                            "maxItems": int(CONF.get("MCP_MAX_AUTOFILL_BOOKS", 10)),
                        }
                    },
                    ["book_ids"],
                ),
                read_only=False,
            ),
            _tool(
                "save_metadata_to_file",
                "写回文件元数据",
                "把 Talebook 元数据写回 EPUB、AZW3 或 PDF 文件。",
                _object(
                    {**book_id, "format": {"type": "string", "enum": ["epub", "azw3", "pdf"]}},
                    ["book_id"],
                ),
                read_only=False,
            ),
            _tool("list_network_sources", "网络书源", "列出已启用的 Talebook 网络书源。", _object()),
            _tool(
                "search_network_books",
                "搜索网络书库",
                "创建异步网络书库搜索任务，返回 task_id；随后调用 get_network_search。",
                _object(
                    {
                        "query": {"type": "string", "minLength": 1},
                        "page": {"type": "integer", "minimum": 1, "default": 1},
                        "source_ids": {"type": "array", "items": {"type": "integer", "minimum": 1}},
                        "group": {"type": "string"},
                        "all_sources": {"type": "boolean", "default": False},
                    },
                    ["query"],
                ),
            ),
            _tool(
                "get_network_search",
                "网络搜索进度",
                "轮询网络书库搜索任务，返回已完成结果、失败书源和待完成书源。",
                _object({"task_id": {"type": "string", "minLength": 1}}, ["task_id"]),
            ),
            _tool(
                "get_network_book",
                "网络书详情",
                "从指定书源读取网络书详情。",
                _object({**source_id, "book_url": {"type": "string", "minLength": 1}}, ["source_id", "book_url"]),
            ),
            _tool(
                "get_network_toc",
                "网络书目录",
                "读取网络书目录；可传详情返回的 toc_url，或只传 book_url 自动解析。",
                _object(
                    {
                        **source_id,
                        "toc_url": {"type": "string"},
                        "book_url": {"type": "string"},
                    },
                    ["source_id"],
                ),
            ),
            _tool(
                "read_network_chapter",
                "读取网络章节",
                "读取并清洗一章网络书正文，超长正文会截断。",
                _object(
                    {
                        **source_id,
                        "chapter_url": {"type": "string", "minLength": 1},
                        "title": {"type": "string"},
                        "clean": {"type": "boolean", "default": True},
                    },
                    ["source_id", "chapter_url"],
                ),
            ),
            _tool(
                "save_network_book",
                "保存网络书",
                "启动后台任务，把指定网络书保存到 Talebook 本地书库。",
                _object(
                    {
                        **source_id,
                        "book_url": {"type": "string", "minLength": 1},
                        "format": {"type": "string", "enum": ["txt", "epub"], "default": "epub"},
                        "clean": {"type": "boolean", "default": True},
                    },
                    ["source_id", "book_url"],
                ),
                read_only=False,
            ),
            _tool(
                "get_network_save",
                "网络书保存进度",
                "轮询网络书保存任务。",
                _object({**source_id, "book_url": {"type": "string", "minLength": 1}}, ["source_id", "book_url"]),
            ),
            _tool(
                "list_saved_network_books",
                "已保存网络书",
                "列出已保存到本地的网络书，可按连载状态筛选。",
                _object(
                    {
                        "status": {"type": "string", "enum": ["serial", "finished", "unknown"]},
                        **page,
                    }
                ),
            ),
        ]

    async def call_tool(self, name, arguments):
        method = self._methods.get(name)
        if method is None:
            raise KeyError(name)
        try:
            data = method(arguments)
            if hasattr(data, "__await__"):
                data = await data
            return {"ok": True, "data": data}
        except ToolFailure as error:
            return {"ok": False, "error": {"code": error.code, "message": error.message}}

    def _require_book(self, raw_id):
        try:
            book_id = int(raw_id)
        except (TypeError, ValueError):
            raise ToolFailure("params.book_id", "book_id must be a positive integer")
        book = self.handler.get_book(book_id, raise_exception=False)
        if not book:
            raise ToolFailure("book.not_found", "Book not found")
        return book_id, book

    def _require_source(self, raw_id):
        try:
            source_id = int(raw_id)
        except (TypeError, ValueError):
            raise ToolFailure("params.source_id", "source_id must be a positive integer")
        source = (
            self.handler.session.query(BookSourceModel)
            .filter(BookSourceModel.id == source_id, BookSourceModel.enabled.is_(True))
            .first()
        )
        if not source:
            raise ToolFailure("source.not_found", "Network source not found or disabled")
        return source

    def _page(self, arguments):
        try:
            page = max(1, int(arguments.get("page", 1)))
            maximum = int(CONF.get("MCP_MAX_BOOKS", 20))
            page_size = min(maximum, max(1, int(arguments.get("page_size", maximum))))
        except (TypeError, ValueError):
            raise ToolFailure("params.pagination", "page and page_size must be integers")
        return page, page_size

    def _format_books(self, books, with_files=False):
        formatted = [utils.BookFormatter(self.handler, book).format(with_files=with_files) for book in books]
        return self.handler.attach_reading_states(formatted)

    def _network_config(self):
        return {
            "BOOKSOURCE_HTTP_TIMEOUT": CONF.get("BOOKSOURCE_HTTP_TIMEOUT", 20),
            "BOOKSOURCE_MAX_TOC_PAGES": CONF.get("BOOKSOURCE_MAX_TOC_PAGES", 30),
            "BOOKSOURCE_MAX_CONTENT_PAGES": CONF.get("BOOKSOURCE_MAX_CONTENT_PAGES", 20),
            "BOOKSOURCE_AD_PATTERNS": CONF.get("BOOKSOURCE_AD_PATTERNS", []),
            "BOOKSOURCE_CLEAN_ENABLED": CONF.get("BOOKSOURCE_CLEAN_ENABLED", True),
        }

    def tool_library_overview(self, _arguments):
        db = self.handler.db
        with self.handler._db_lock:
            overview = {
                "title": CONF.get("site_title", "Talebook"),
                "books": db.count(),
                "authors": len(db.all_authors()),
                "tags": len(db.all_tags()),
                "publishers": len(db.all_publishers()),
                "series": len(db.all_series()),
                "last_modified": db.last_modified().strftime("%Y-%m-%d"),
            }
        overview["saved_network_books"] = self.handler.session.query(OnlineBookMeta).count()
        return overview

    def tool_search_books(self, arguments):
        query = str(arguments.get("query", "")).strip()
        if not query:
            raise ToolFailure("params.query", "query is required")
        page, page_size = self._page(arguments)
        ids = sorted(self.handler.cache.search(query), reverse=True)
        books = self.handler.get_books(ids=ids)
        total = len(books)
        start = (page - 1) * page_size
        return {
            "query": query,
            "total": total,
            "page": page,
            "books": self._format_books(books[start : start + page_size]),
        }

    def tool_get_book(self, arguments):
        _book_id, book = self._require_book(arguments.get("book_id"))
        return self._format_books([book], with_files=True)[0]

    def tool_list_authors(self, arguments):
        try:
            limit = min(200, max(1, int(arguments.get("limit", 50))))
        except (TypeError, ValueError):
            raise ToolFailure("params.limit", "limit must be an integer")
        items = self.handler.get_category_with_count("author")
        items.sort(key=lambda item: (-item["count"], item["name"]))
        return {"total": len(items), "authors": items[:limit]}

    def tool_list_categories(self, _arguments):
        groups = []
        for line in str(CONF.get("BOOK_NAV", "")).splitlines():
            if "=" not in line:
                continue
            name, values = line.split("=", 1)
            groups.append({"name": name.strip(), "tags": [item.strip() for item in values.split("/") if item.strip()]})
        return {"categories": groups}

    def tool_reading_overview(self, _arguments):
        query = self.handler.session.query(ReadingState).filter(ReadingState.reader_id == self.user_id)
        return {
            "reading": query.filter(ReadingState.read_state == 1).count(),
            "finished": query.filter(ReadingState.read_state == 2).count(),
            "favorite": query.filter(ReadingState.favorite == 1).count(),
            "wants": query.filter(ReadingState.wants == 1).count(),
        }

    def tool_list_bookshelf(self, arguments):
        shelf = arguments.get("shelf")
        query = self.handler.session.query(ReadingState).filter(ReadingState.reader_id == self.user_id)
        if shelf == "favorite":
            query = query.filter(ReadingState.favorite == 1).order_by(ReadingState.favorite_date.desc())
        elif shelf == "wants":
            query = query.filter(ReadingState.wants == 1).order_by(ReadingState.wants_date.desc())
        elif shelf == "reading":
            query = query.filter(ReadingState.read_state == 1).order_by(ReadingState.read_date.desc())
        elif shelf == "finished":
            query = query.filter(ReadingState.read_state == 2).order_by(ReadingState.read_date.desc())
        else:
            raise ToolFailure("params.shelf", "Unknown shelf")
        states = query.all()
        total = len(states)
        page, page_size = self._page(arguments)
        states = states[(page - 1) * page_size : page * page_size]
        state_map = {state.book_id: state for state in states}
        books = {book["id"]: book for book in self.handler.get_books(ids=list(state_map))}
        result = []
        for book_id in state_map:
            if book_id not in books:
                continue
            item = utils.BookFormatter(self.handler, books[book_id]).format()
            item["state"] = utils.ReadingStateFormatter.format_reading_state(state_map[book_id])
            result.append(item)
        return {"shelf": shelf, "total": total, "page": page, "books": result}

    def tool_update_reading_state(self, arguments):
        book_id, _book = self._require_book(arguments.get("book_id"))
        fields = {key for key in ("favorite", "wants", "read_state") if key in arguments}
        if not fields:
            raise ToolFailure("params.empty", "At least one reading-state field is required")
        state = (
            self.handler.session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == self.user_id)
            .first()
        )
        if not state:
            state = ReadingState(book_id, self.user_id)
            self.handler.session.add(state)
        if "favorite" in fields:
            state.set_favorite(bool(arguments["favorite"]))
        if "wants" in fields:
            state.set_wants(bool(arguments["wants"]))
        if "read_state" in fields:
            if arguments["read_state"] not in (0, 1, 2):
                raise ToolFailure("params.read_state", "read_state must be 0, 1, or 2")
            state.set_read_state(arguments["read_state"])
        self.handler.session.commit()
        return {"book_id": book_id, "state": utils.ReadingStateFormatter.format_reading_state(state)}

    def tool_get_reading_progress(self, arguments):
        book_id, _book = self._require_book(arguments.get("book_id"))
        state = (
            self.handler.session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == self.user_id)
            .first()
        )
        return {
            "book_id": book_id,
            "progress": state.get_progress() if state else {},
            "update_time": state.progress_update_time.isoformat() if state and state.progress_update_time else None,
        }

    def tool_update_reading_progress(self, arguments):
        book_id, _book = self._require_book(arguments.get("book_id"))
        progress = arguments.get("progress")
        if not isinstance(progress, dict) or len(json.dumps(progress)) > 8 * 1024:
            raise ToolFailure("params.progress", "progress must be an object no larger than 8 KiB")
        state = (
            self.handler.session.query(ReadingState)
            .filter(ReadingState.book_id == book_id, ReadingState.reader_id == self.user_id)
            .first()
        )
        if not state:
            state = ReadingState(book_id, self.user_id)
            self.handler.session.add(state)
        state.set_progress(progress)
        self.handler.session.commit()
        return {"book_id": book_id, "progress": state.get_progress()}

    def tool_update_book_metadata(self, arguments):
        book_id, _book = self._require_book(arguments.get("book_id"))
        if not self.user.can_edit():
            raise ToolFailure("permission", "Current MCP user cannot edit books")
        fields = {
            "authors",
            "title",
            "comments",
            "tags",
            "publisher",
            "isbn",
            "series",
            "rating",
            "language",
        }
        updates = {key: arguments[key] for key in fields if key in arguments}
        if "pubdate" in arguments:
            pubdate = douban.str2date(arguments["pubdate"])
            if pubdate is None:
                raise ToolFailure("params.pubdate", "Invalid publication date")
            updates["pubdate"] = pubdate
        if not updates:
            raise ToolFailure("params.empty", "No metadata fields supplied")
        for key in ("authors", "tags"):
            if key in updates and not isinstance(updates[key], list):
                raise ToolFailure("params.%s" % key, "%s must be an array" % key)
        metadata = self.handler.db.get_metadata(book_id, index_is_id=True)
        for key, value in updates.items():
            if key == "tags" and not value:
                metadata.set("tags", [])
                self.handler.db.set_tags(book_id, [])
            else:
                metadata.set(key, value)
        self.handler.db.set_metadata(book_id, metadata)
        return {"book_id": book_id, "updated_fields": sorted(updates)}

    def tool_auto_fill_metadata(self, arguments):
        if not CONF.get("auto_fill_meta", False):
            raise ToolFailure("feature.disabled", "Automatic metadata filling is disabled")
        ids = arguments.get("book_ids")
        maximum = int(CONF.get("MCP_MAX_AUTOFILL_BOOKS", 10))
        if not isinstance(ids, list) or not ids or len(ids) > maximum:
            raise ToolFailure("params.book_ids", "book_ids must contain between 1 and %d IDs" % maximum)
        normalized = [self._require_book(book_id)[0] for book_id in ids]
        AutoFillService().auto_fill_all(normalized)
        return {"book_ids": normalized, "status": "started"}

    def tool_save_metadata_to_file(self, arguments):
        book_id, _book = self._require_book(arguments.get("book_id"))
        fmt = arguments.get("format")
        if fmt is not None and fmt not in ("epub", "azw3", "pdf"):
            raise ToolFailure("params.format", "format must be epub, azw3, or pdf")
        result = self.handler.save_book_meta(book_id, fmt=fmt)
        if result.get("err") != "ok":
            raise ToolFailure(result.get("err", "save.failed"), result.get("msg", "Failed to save metadata"))
        return {"book_id": book_id, "format": fmt or "all", "message": result.get("msg", "")}

    def tool_list_network_sources(self, _arguments):
        sources = (
            self.handler.session.query(BookSourceModel)
            .filter(BookSourceModel.enabled.is_(True))
            .order_by(BookSourceModel.weight.desc(), BookSourceModel.id.asc())
            .all()
        )
        return {"sources": [{"id": source.id, "name": source.name, "group": source.group or ""} for source in sources]}

    def tool_search_network_books(self, arguments):
        key = str(arguments.get("query", "")).strip()
        if not key:
            raise ToolFailure("params.query", "query is required")
        try:
            page = max(1, int(arguments.get("page", 1)))
        except (TypeError, ValueError):
            raise ToolFailure("params.page", "page must be an integer")
        query = self.handler.session.query(BookSourceModel).filter(BookSourceModel.enabled.is_(True))
        source_ids = arguments.get("source_ids")
        group = str(arguments.get("group", "")).strip()
        order = (BookSourceModel.weight.desc(), BookSourceModel.id.asc())
        if source_ids:
            if not isinstance(source_ids, list) or not all(isinstance(item, int) for item in source_ids):
                raise ToolFailure("params.source_ids", "source_ids must be an integer array")
            sources = query.filter(BookSourceModel.id.in_(source_ids)).order_by(*order).all()
        elif group:
            sources = query.filter(BookSourceModel.group == group).order_by(*order).all()
        elif arguments.get("all_sources", False):
            sources = query.order_by(*order).all()
        else:
            sources = query.order_by(*order).limit(CONF.get("BOOKSOURCE_SEARCH_TOP_K", 50)).all()
        if not sources:
            return {"task_id": "", "total": 0}
        source_data = [(source.id, source.name, source.raw) for source in sources]
        service = SearchTaskService()
        service.configure(CONF.get("BOOKSOURCE_MAX_WORKERS", 6))
        return service.create_task(key, page, source_data, self._network_config())

    def tool_get_network_search(self, arguments):
        task_id = str(arguments.get("task_id", "")).strip()
        status = SearchTaskService().get_status(task_id)
        if status is None:
            raise ToolFailure("task.not_found", "Network search task not found or expired")
        if status["finished"]:
            hit_ids = SearchTaskService().pop_weight_updates(task_id)
            if hit_ids:
                self.handler.session.query(BookSourceModel).filter(BookSourceModel.id.in_(hit_ids)).update(
                    {BookSourceModel.weight: BookSourceModel.weight + 1}, synchronize_session=False
                )
                self.handler.session.commit()
        return status

    def tool_get_network_book(self, arguments):
        source = self._require_source(arguments.get("source_id"))
        book_url = str(arguments.get("book_url", "")).strip()
        if not book_url:
            raise ToolFailure("params.book_url", "book_url is required")
        try:
            detail = BookSourceEngine(BookSource(source.raw), config=self._network_config()).book_info(book_url)
        except JsRuleUnsupported:
            raise ToolFailure("source.js_unsupported", "This source requires unsupported JavaScript rules")
        return {"book": detail.to_dict(), "toc_url": detail.toc_url}

    def tool_get_network_toc(self, arguments):
        source = self._require_source(arguments.get("source_id"))
        toc_url = str(arguments.get("toc_url", "")).strip()
        book_url = str(arguments.get("book_url", "")).strip()
        engine = BookSourceEngine(BookSource(source.raw), config=self._network_config())
        try:
            detail = engine.book_info(book_url) if not toc_url and book_url else None
            toc_url = toc_url or (detail.toc_url if detail else "")
            if not toc_url:
                raise ToolFailure("params.toc_url", "toc_url or book_url is required")
            chapters = engine.toc(toc_url)
            status = engine.detect_serialization(detail, chapters) if detail else "unknown"
        except JsRuleUnsupported:
            raise ToolFailure("source.js_unsupported", "This source requires unsupported JavaScript rules")
        return {"chapters": [chapter.to_dict() for chapter in chapters], "serialize_status": status}

    def tool_read_network_chapter(self, arguments):
        if not self.user.can_read():
            raise ToolFailure("permission", "Current MCP user cannot read books")
        source = self._require_source(arguments.get("source_id"))
        chapter_url = str(arguments.get("chapter_url", "")).strip()
        if not chapter_url:
            raise ToolFailure("params.chapter_url", "chapter_url is required")
        try:
            content = BookSourceEngine(BookSource(source.raw), config=self._network_config()).content(
                chapter_url, clean=bool(arguments.get("clean", True))
            )
        except JsRuleUnsupported:
            raise ToolFailure("source.js_unsupported", "This source requires unsupported JavaScript rules")
        maximum = int(CONF.get("MCP_MAX_CONTENT_CHARS", 20000))
        truncated = len(content) > maximum
        return {
            "title": str(arguments.get("title", "")),
            "content": content[:maximum],
            "truncated": truncated,
            "total_characters": len(content),
        }

    def tool_save_network_book(self, arguments):
        if not self.user.can_save():
            raise ToolFailure("permission", "Current MCP user cannot save network books")
        source = self._require_source(arguments.get("source_id"))
        book_url = str(arguments.get("book_url", "")).strip()
        fmt = arguments.get("format", "epub")
        if not book_url or fmt not in ("txt", "epub"):
            raise ToolFailure("params.invalid", "book_url is required and format must be txt or epub")
        from webserver.services.background_service import BackgroundService, BackgroundTask
        from webserver.services.booksource.save_service import SaveOnlineBookService

        tag = SaveOnlineBookService.make_tag(source.id, book_url)
        existing = BackgroundService().get_task_by_tag(tag)
        if existing and existing.get("status") == BackgroundTask.STATUS_RUNNING:
            return {"tag": tag, "status": "running", "reused": True}
        title = (source.raw.get("bookSourceName") or source.name or "")[:20]
        task = BackgroundService().add_task(BackgroundTask.SERVICE_TYPE_ONLINE_SAVE, "[online]%s" % title, tag=tag)
        SaveOnlineBookService().save_online_book(
            self.user_id,
            source.raw,
            book_url,
            fmt,
            bool(arguments.get("clean", True)),
            task_id=task.id if task else None,
        )
        return {"tag": tag, "status": "started", "reused": False}

    def tool_get_network_save(self, arguments):
        source = self._require_source(arguments.get("source_id"))
        book_url = str(arguments.get("book_url", "")).strip()
        if not book_url:
            raise ToolFailure("params.book_url", "book_url is required")
        from webserver.services.background_service import BackgroundService
        from webserver.services.booksource.save_service import SaveOnlineBookService

        task = BackgroundService().get_task_by_tag(SaveOnlineBookService.make_tag(source.id, book_url))
        if not task:
            return {"found": False}
        data = task.get("progress_data") or {}
        return {
            "found": True,
            "status": task.get("status"),
            "progress": task.get("progress", 0),
            "done": data.get("done", 0),
            "total": data.get("total", 0),
            "book_id": data.get("book_id", 0),
            "error": task.get("error_message") or "",
        }

    def tool_list_saved_network_books(self, arguments):
        status = arguments.get("status")
        query = self.handler.session.query(OnlineBookMeta)
        allowed = (OnlineBookMeta.SERIAL, OnlineBookMeta.FINISHED, OnlineBookMeta.UNKNOWN)
        if status is not None:
            if status not in allowed:
                raise ToolFailure("params.status", "Unknown serialization status")
            query = query.filter(OnlineBookMeta.serialize_status == status)
        metas = query.all()
        status_map = {meta.book_id: meta.serialize_status for meta in metas}
        ids = sorted(status_map, reverse=True)
        total = len(ids)
        page, page_size = self._page(arguments)
        page_ids = ids[(page - 1) * page_size : page * page_size]
        books = self._format_books(self.handler.get_books(ids=page_ids))
        for book in books:
            book["serialize_status"] = status_map.get(book["id"], OnlineBookMeta.UNKNOWN)
        return {"total": total, "page": page, "books": books}
