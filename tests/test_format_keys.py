#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""实施项 7.5：``fmt_<format>`` 键的来源从 Calibre ``books.path`` 切换到 ``book_formats``。

这些测试不依赖 Calibre：它们直接构造 book dict 与一个带 ``book_formats`` 表的
SQLite 会话，验证 22 条路由读取格式路径的唯一入口 ``format_keys`` 的行为。
"""

import os
import sqlite3
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.services import format_keys


@pytest.fixture
def session_with_formats():
    """构造一个带 book_formats 表的临时库，返回 (session, book_id)。"""
    tmpdir = tempfile.mkdtemp()
    db_path = os.path.join(tmpdir, "library.db")
    raw = sqlite3.connect(db_path)
    raw.executescript(
        """
        CREATE TABLE books (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            author_sort TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE book_formats (
            id INTEGER PRIMARY KEY,
            book_id INTEGER NOT NULL,
            format TEXT NOT NULL,
            path TEXT NOT NULL,
            size INTEGER NOT NULL,
            mtime INTEGER NOT NULL,
            hash TEXT,
            UNIQUE(book_id, format)
        );
        INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', '刘慈欣/三体 (1)');
        INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
            (1, 'EPUB', '/library/刘慈欣/三体 (1)/三体.epub', 1000, 0),
            (1, 'MOBI', '/library/刘慈欣/三体 (1)/三体.mobi', 2000, 0);
        """
    )
    raw.commit()
    raw.close()

    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    session = Session()
    # 清掉进程内缓存，避免跨测试污染
    format_keys._table_presence_cache.clear()
    yield session, 1
    session.close()
    engine.dispose()


@pytest.fixture
def session_without_formats():
    """构造一个未迁移的库（没有 book_formats 表）。"""
    tmpdir = tempfile.mkdtemp()
    db_path = os.path.join(tmpdir, "legacy.db")
    raw = sqlite3.connect(db_path)
    raw.executescript(
        """
        CREATE TABLE books (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL DEFAULT '',
            author_sort TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL DEFAULT ''
        );
        INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', '刘慈欣/三体 (1)');
        """
    )
    raw.commit()
    raw.close()

    engine = create_engine(f"sqlite:///{db_path}")
    Session = sessionmaker(bind=engine)
    session = Session()
    format_keys._table_presence_cache.clear()
    yield session, 1
    session.close()
    engine.dispose()


class TestApplyFormatKeys:
    def test_overrides_fmt_keys_from_book_formats(self, session_with_formats):
        session, book_id = session_with_formats
        # 模拟 Calibre 给出的旧路径（基于 books.path）
        books = [{"id": book_id, "title": "三体", "fmt_epub": "/calibre/old/path.epub"}]

        touched = format_keys.apply_format_keys(session, books)

        assert touched == 1
        assert books[0]["fmt_epub"] == "/library/刘慈欣/三体 (1)/三体.epub"
        assert books[0]["fmt_mobi"] == "/library/刘慈欣/三体 (1)/三体.mobi"

    def test_adds_keys_absent_from_calibre(self, session_with_formats):
        session, book_id = session_with_formats
        books = [{"id": book_id, "title": "三体"}]

        format_keys.apply_format_keys(session, books)

        assert books[0]["fmt_epub"].endswith("三体.epub")
        assert books[0]["fmt_mobi"].endswith("三体.mobi")

    def test_legacy_library_is_untouched(self, session_without_formats):
        session, book_id = session_without_formats
        books = [{"id": book_id, "title": "三体", "fmt_epub": "/calibre/old/path.epub"}]

        touched = format_keys.apply_format_keys(session, books)

        assert touched == 0
        # 未迁移的库必须保持 Calibre 原值
        assert books[0]["fmt_epub"] == "/calibre/old/path.epub"

    def test_empty_book_list(self, session_with_formats):
        session, _ = session_with_formats
        assert format_keys.apply_format_keys(session, []) == 0

    def test_book_without_formats_is_skipped(self, session_with_formats):
        session, _ = session_with_formats
        books = [{"id": 999, "title": "不存在的书"}]

        touched = format_keys.apply_format_keys(session, books)

        assert touched == 0
        assert "fmt_epub" not in books[0]

    def test_batch_multiple_books(self, session_with_formats):
        session, book_id = session_with_formats
        books = [{"id": book_id}, {"id": 999}]

        touched = format_keys.apply_format_keys(session, books)

        assert touched == 1


class TestAvailableFormats:
    def test_rebuilds_from_fmt_keys(self):
        book = {"id": 1, "fmt_epub": "/a.epub", "fmt_mobi": "/a.mobi"}
        assert format_keys.available_formats(book) == "EPUB,MOBI"

    def test_ignores_empty_values(self):
        book = {"id": 1, "fmt_epub": "/a.epub", "fmt_mobi": None, "fmt_pdf": ""}
        assert format_keys.available_formats(book) == "EPUB"

    def test_no_formats(self):
        assert format_keys.available_formats({"id": 1}) == ""

    def test_sorted_and_uppercased(self):
        book = {"fmt_mobi": "/a.mobi", "fmt_azw3": "/a.azw3", "fmt_epub": "/a.epub"}
        assert format_keys.available_formats(book) == "AZW3,EPUB,MOBI"


class TestFormatPathHelpers:
    def test_format_path_case_insensitive(self):
        book = {"fmt_epub": "/a.epub"}
        assert format_keys.format_path(book, "EPUB") == "/a.epub"
        assert format_keys.format_path(book, "epub") == "/a.epub"

    def test_format_path_missing(self):
        assert format_keys.format_path({"id": 1}, "epub") is None
        assert format_keys.format_path({"id": 1}, "") is None
        assert format_keys.format_path({"id": 1}, None) is None

    def test_has_format(self):
        book = {"fmt_epub": "/a.epub", "fmt_mobi": None}
        assert format_keys.has_format(book, "epub") is True
        assert format_keys.has_format(book, "mobi") is False
        assert format_keys.has_format(book, "pdf") is False

    def test_file_missing(self, tmp_path):
        real = tmp_path / "real.epub"
        real.write_text("x")
        assert format_keys.file_missing(str(real)) is False
        assert format_keys.file_missing(str(tmp_path / "nope.epub")) is True
        assert format_keys.file_missing(None) is True
        assert format_keys.file_missing("") is True


class TestLoadFormatPaths:
    def test_returns_lowercased_format_map(self, session_with_formats):
        session, book_id = session_with_formats
        result = format_keys.load_format_paths(session, [book_id])

        assert set(result[book_id].keys()) == {"epub", "mobi"}
        assert result[book_id]["epub"].endswith("三体.epub")

    def test_empty_ids(self, session_with_formats):
        session, _ = session_with_formats
        assert format_keys.load_format_paths(session, []) == {}

    def test_legacy_library_returns_empty(self, session_without_formats):
        session, book_id = session_without_formats
        assert format_keys.load_format_paths(session, [book_id]) == {}


class TestTablePresenceCache:
    def test_cache_is_used(self, session_with_formats):
        session, _ = session_with_formats
        format_keys._table_presence_cache.clear()

        assert format_keys._book_formats_table_exists(session) is True
        # 第二次调用命中缓存
        assert format_keys._book_formats_table_exists(session) is True
        assert len(format_keys._table_presence_cache) == 1

    def test_missing_table_reports_false(self, session_without_formats):
        session, _ = session_without_formats
        format_keys._table_presence_cache.clear()
        assert format_keys._book_formats_table_exists(session) is False
