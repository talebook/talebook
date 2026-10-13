#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""验证 22 条 ``books.path`` 家族路由的格式路径来源已切换到 ``book_formats``。

不依赖 Calibre：直接断言这些路由读取 ``fmt_<format>`` 键的代码路径，
在 ``get_books`` 之后拿到的是 ``book_formats`` 的值。
"""

import os
import sqlite3
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.services import format_keys


# 实施项 1 盘点出的 22 条以 books.path 家族为键的路由，逐字取自
# booksvr/docs/route-inventory.md 的「3.2 受影响的 22 条路由」表。
#
# 注意：这 22 条是「盘点出的风险路由」，不等于「都直接读 fmt_ 键」。
# 逐条核实后分为三类（见下方 *_ROUTES 常量）：
#   1. 直接读 fmt_<format> / available_formats 的 handler；
#   2. 自己查 ScanFile 等业务表、与 books.path 无关的 handler；
#   3. 自己从 cache.format_abspath() 生产 fmt_ 键的 WebDAV provider。
INVENTORY_ROUTES = [
    ("available_formats", "/api/book/([0-9]+)/media_type", "BookSetMediaType", "webserver/handlers/book.py"),
    ("available_formats", "/api/book/([0-9]+)/delete_format", "BookDeleteFormat", "webserver/handlers/book.py"),
    ("available_formats+path", "/api/book/([0-9]+)/separate", "BookSeparate", "webserver/handlers/book.py"),
    ("path", "/api/book/([0-9]+\\..+)", "BookDownload", "webserver/handlers/book.py"),
    ("path", "/api/book/([0-9]+)/send_to_device", "BookSendToDevice", "webserver/handlers/book.py"),
    ("path", "/api/book/([0-9]+)/mailto", "BookSendToMail", "webserver/handlers/book.py"),
    ("path", "/api/book/upload", "BookUpload", "webserver/handlers/book.py"),
    ("path", "/api/book/upload/chunk", "BookUploadChunk", "webserver/handlers/book.py"),
    ("path", "/api/book/upload/complete", "BookUploadComplete", "webserver/handlers/book.py"),
    ("path", "/api/book/txt/init", "BookTxtInit", "webserver/handlers/book.py"),
    ("path", "/api/admin/opds/import/failed", "AdminOPDSImportFailedList", "webserver/handlers/admin.py"),
    ("path", "/api/admin/opds/import/retry", "AdminOPDSImportRetry", "webserver/handlers/admin.py"),
    ("path", "/api/admin/log", "AdminSystemLog", "webserver/handlers/admin.py"),
    ("path", "/api/admin/log/download", "AdminSystemLogDownload", "webserver/handlers/admin.py"),
    ("path", "/api/admin/booksource/seed", "BookSourceSeed", "webserver/handlers/booksource_admin.py"),
    ("path", "/api/admin/scan/list", "ScanList", "webserver/handlers/scan.py"),
    ("path", "/api/admin/scan/run", "ScanRun", "webserver/handlers/scan.py"),
    ("path", "/api/admin/import/settings", "ImportSettings", "webserver/handlers/scan.py"),
    ("path", "/api/admin/import/directory/list", "ImportDirectoryList", "webserver/handlers/scan.py"),
    ("path", "/get/pcover", "ProxyImageHandler", "webserver/handlers/files.py"),
    ("path", "/get/progress/([0-9]+)", "ProgressHandler", "webserver/handlers/files.py"),
    ("path", "/books/?(.*)", "WebDAVHandler", "webserver/webdav/handler.py"),
]

# 真正直接读 fmt_<format> 键的 handler（经 get_books() 注入，已被 apply_format_keys 覆盖）。
# 分类依据：逐类体 grep fmt_，结果见下方断言。
FMT_CONSUMER_ROUTES = [
    ("path", "/api/book/([0-9]+\\..+)", "BookDownload", "webserver/handlers/book.py"),
    ("path", "/api/book/([0-9]+)/send_to_device", "BookSendToDevice", "webserver/handlers/book.py"),
    ("path", "/api/book/([0-9]+)/mailto", "BookSendToMail", "webserver/handlers/book.py"),
    ("path", "/api/book/txt/init", "BookTxtInit", "webserver/handlers/book.py"),
    ("available_formats", "/api/book/([0-9]+)/delete_format", "BookDeleteFormat", "webserver/handlers/book.py"),
    ("available_formats+path", "/api/book/([0-9]+)/separate", "BookSeparate", "webserver/handlers/book.py"),
    # 盘点表把 files.py 的 fmt_ 消费者记成了 /get/pcover（ProxyImageHandler），
    # 实际是 /get/extract/([0-9]+)/(.*)（EpubReader）。这是盘点遗漏的第 23 条。
    ("path", "/get/extract/([0-9]+)/(.*)", "EpubReader", "webserver/handlers/files.py"),
]

# 盘点表里列出、但实际不读 fmt_ 键的路由。
# 保留在清单里是为了证明「已逐条核实」，而不是假设它们都依赖 books.path。
# 其中 upload 三兄弟与 BookSetMediaType 只做写入/元数据，不读旧路径；
# admin/scan 系列查 ScanFile 等自有业务表；ProgressHandler 读阅读进度。
NON_FMT_ROUTES = [
    ("/api/book/upload", "BookUpload", "webserver/handlers/book.py"),
    ("/api/book/upload/chunk", "BookUploadChunk", "webserver/handlers/book.py"),
    ("/api/book/upload/complete", "BookUploadComplete", "webserver/handlers/book.py"),
    ("/api/book/([0-9]+)/media_type", "BookSetMediaType", "webserver/handlers/book.py"),
    ("/api/admin/opds/import/failed", "AdminOPDSImportFailedList", "webserver/handlers/admin.py"),
    ("/api/admin/opds/import/retry", "AdminOPDSImportRetry", "webserver/handlers/admin.py"),
    ("/api/admin/log", "AdminSystemLog", "webserver/handlers/admin.py"),
    ("/api/admin/log/download", "AdminSystemLogDownload", "webserver/handlers/admin.py"),
    ("/api/admin/booksource/seed", "BookSourceSeed", "webserver/handlers/booksource_admin.py"),
    ("/api/admin/scan/list", "ScanList", "webserver/handlers/scan.py"),
    ("/api/admin/scan/run", "ScanRun", "webserver/handlers/scan.py"),
    ("/api/admin/import/settings", "ImportSettings", "webserver/handlers/scan.py"),
    ("/api/admin/import/directory/list", "ImportDirectoryList", "webserver/handlers/scan.py"),
    ("/get/progress/([0-9]+)", "ProgressHandler", "webserver/handlers/files.py"),
    ("/get/pcover", "ProxyImageHandler", "webserver/handlers/files.py"),
]

# WebDAV 自己从 cache.format_abspath() 生产 fmt_ 键，不经过 get_books()。
# 这是 apply_format_keys 覆盖不到的唯一缺口，需在实施项 8 的兼容层处理。
WEBDAV_PRODUCER = ("/books/?(.*)", "WebDAVHandler", "webserver/webdav/dav_provider.py")


@pytest.fixture
def migrated_session():
    """一个已迁移的库：book_formats 有真实路径，Calibre 旧路径是错的。"""
    tmpdir = tempfile.mkdtemp()
    db_path = os.path.join(tmpdir, "migrated.db")
    raw = sqlite3.connect(db_path)
    raw.executescript(
        """
        CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT, author_sort TEXT, path TEXT);
        CREATE TABLE book_formats (
            id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
            path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT,
            UNIQUE(book_id, format)
        );
        INSERT INTO books VALUES (1, '三体', '刘慈欣', '刘慈欣/三体 (1)');
        INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
            (1, 'EPUB', '/library/刘慈欣/三体 (1)/三体.epub', 1000, 0),
            (1, 'MOBI', '/library/刘慈欣/三体 (1)/三体.mobi', 2000, 0),
            (1, 'PDF',  '/library/刘慈欣/三体 (1)/三体.pdf',  3000, 0);
        """
    )
    raw.commit()
    raw.close()

    engine = create_engine(f"sqlite:///{db_path}")
    session = sessionmaker(bind=engine)()
    format_keys._table_presence_cache.clear()
    yield session
    session.close()
    engine.dispose()


def _class_body(repo_root, rel_path, class_name):
    """取出 ``class <class_name>`` 到下一个顶层 ``class`` 之间的源码。

    按类体而非整个文件断言，因为同一文件可能同时包含读与不读 fmt_ 的 handler。
    """
    with open(os.path.join(repo_root, rel_path), encoding="utf-8") as fh:
        lines = fh.readlines()

    start = None
    for idx, line in enumerate(lines):
        if line.startswith(f"class {class_name}(") or line.startswith(f"class {class_name}:"):
            start = idx
            break
    assert start is not None, f"{rel_path} 中未找到 class {class_name}"

    end = len(lines)
    for idx in range(start + 1, len(lines)):
        if lines[idx].startswith("class "):
            end = idx
            break
    return "".join(lines[start:end])


class TestRouteCoverage:
    def test_inventory_lists_22_routes(self):
        """实施项 1 盘点出的风险路由必须恰好 22 条。"""
        assert len(INVENTORY_ROUTES) == 22

    def test_inventory_partitions_completely(self):
        """盘点 22 条 = 「读 fmt_」+「不读 fmt_」+「WebDAV 生产者」；

        另加盘点遗漏的第 23 条（EpubReader），故读 fmt_ 的集合比盘点表多 1。
        """
        assert len(FMT_CONSUMER_ROUTES) + len(NON_FMT_ROUTES) + 1 == len(INVENTORY_ROUTES) + 1

    def test_epub_reader_is_the_23rd_route(self):
        """盘点遗漏的第 23 条：/get/extract 的 EpubReader 也读 fmt_epub。

        它不在盘点表的 22 条里，但同样经 get_books() 拿 book dict，
        因此已被 apply_format_keys 覆盖。此测试固定该事实。
        """
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        body = _class_body(repo_root, "webserver/handlers/files.py", "EpubReader")
        assert 'book.get("fmt_epub"' in body
        with open(os.path.join(repo_root, "webserver/handlers/files.py"), encoding="utf-8") as fh:
            assert "/get/extract/([0-9]+)/(.*)" in fh.read()

    def test_route_patterns_are_registered(self):
        """22 条路由的 URL 模式必须真实注册在 handler 的 handlers 列表中。"""
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for _kind, pattern, _handler, rel_path in INVENTORY_ROUTES:
            with open(os.path.join(repo_root, rel_path), encoding="utf-8") as fh:
                source = fh.read()
            assert pattern in source, f"{pattern} 未在 {rel_path} 中注册"

    def test_fmt_consumers_actually_read_fmt_keys(self):
        """被归为「读 fmt_」的 handler 类体必须真的出现 fmt_ 键。"""
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for _kind, _pattern, handler, rel_path in FMT_CONSUMER_ROUTES:
            body = _class_body(repo_root, rel_path, handler)
            assert "fmt_" in body, f"{handler} 未引用 fmt_ 键"

    def test_non_fmt_routes_do_not_read_fmt_keys(self):
        """被归为「不读 fmt_」的 handler 类体必须真的不出现 fmt_ 键。

        这条断言防止清单腐化：若将来某个 handler 开始读 fmt_，
        它必须从 NON_FMT_ROUTES 移到 FMT_CONSUMER_ROUTES。

        按类体而非整个文件断言：``files.py`` 同时包含读 fmt_ 的
        ``ProxyImageHandler`` 与不读的 ``ProgressHandler``。
        """
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        for _pattern, handler, rel_path in NON_FMT_ROUTES:
            body = _class_body(repo_root, rel_path, handler)
            assert "fmt_" not in body, f"{handler} 已开始引用 fmt_ 键，需重新分类"

    def test_webdav_produces_fmt_keys_without_get_books(self):
        """WebDAV 自己生产 fmt_ 键，不经过 get_books()。

        这是 apply_format_keys 覆盖不到的缺口，必须在实施项 8 的
        HTTP 兼容层处理；此测试固定该事实，避免缺口被遗忘。
        """
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        _pattern, _handler, rel_path = WEBDAV_PRODUCER
        with open(os.path.join(repo_root, rel_path), encoding="utf-8") as fh:
            source = fh.read()
        assert "fmt_" in source
        # 它用的是 cache.format_abspath，而非 get_books
        assert "format_abspath" in source


class TestMigratedLibraryServesBookFormatsPaths:
    def test_fmt_keys_come_from_book_formats(self, migrated_session):
        """迁移后，fmt_<format> 的值必须来自 book_formats，而非 Calibre 旧路径。"""
        # 模拟 Calibre 给出的旧路径
        books = [{"id": 1, "title": "三体", "fmt_epub": "/calibre/old.epub"}]

        format_keys.apply_format_keys(migrated_session, books)

        assert books[0]["fmt_epub"] == "/library/刘慈欣/三体 (1)/三体.epub"
        assert books[0]["fmt_mobi"] == "/library/刘慈欣/三体 (1)/三体.mobi"
        assert books[0]["fmt_pdf"] == "/library/刘慈欣/三体 (1)/三体.pdf"

    def test_available_formats_rebuilt(self, migrated_session):
        """available_formats 字符串必须能从 book_formats 重建。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)

        assert format_keys.available_formats(books[0]) == "EPUB,MOBI,PDF"

    def test_book_download_resolves_path(self, migrated_session):
        """BookDownload 的取值路径：book['fmt_<fmt>'] 必须指向 book_formats。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)
        book = books[0]

        # BookDownload.parse_url_path 用 bid + fmt 取路径
        assert format_keys.format_path(book, "epub") == "/library/刘慈欣/三体 (1)/三体.epub"
        assert format_keys.has_format(book, "epub") is True

    def test_book_separate_format_not_found_semantics(self, migrated_session):
        """BookSeparate 的 format.not_found 语义：没有该格式时 has_format 为 False。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)
        book = books[0]

        assert format_keys.has_format(book, "azw3") is False
        assert format_keys.has_format(book, "epub") is True

    def test_book_delete_format_semantics(self, migrated_session):
        """BookDeleteFormat 依赖 available_formats 判断格式存在性。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)

        assert "EPUB" in format_keys.available_formats(books[0])
        assert "AZW3" not in format_keys.available_formats(books[0])

    def test_missing_file_reports_file_missing(self, migrated_session):
        """源文件缺失时返回 file.missing 语义，记录仍保留。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)
        path = format_keys.format_path(books[0], "epub")

        # 这些路径在测试机上不存在
        assert format_keys.file_missing(path) is True
        # 但记录仍在 book_formats 中
        assert format_keys.load_format_paths(migrated_session, [1])[1]["epub"] == path

    def test_webdav_selects_first_available_format(self, migrated_session):
        """WebDAV 按 SUPPORTED_FORMATS 顺序选第一个有路径的格式。"""
        books = [{"id": 1, "title": "三体"}]
        format_keys.apply_format_keys(migrated_session, books)
        book = books[0]

        supported = ["epub", "azw3", "mobi", "pdf"]
        selected = next((f for f in supported if format_keys.has_format(book, f)), None)
        assert selected == "epub"
