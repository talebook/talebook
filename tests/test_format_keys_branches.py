#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""``format_keys`` 的防御分支测试。

补齐三条未覆盖路径：
1. ``book_formats`` 表探测抛异常时回退（非 SQLite 后端 / 权限问题）；
2. ``book_formats`` 里 format 为空串时跳过该行；
3. book dict 没有 ``id`` 键时跳过该书。
"""

import os
import sqlite3
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.services import format_keys


@pytest.fixture(autouse=True)
def clear_cache():
    """每个用例前后清空表存在性缓存，避免用例互相污染。"""
    format_keys._table_presence_cache.clear()
    yield
    format_keys._table_presence_cache.clear()


def _make_session(script):
    tmpdir = tempfile.mkdtemp()
    db_path = os.path.join(tmpdir, "t.db")
    raw = sqlite3.connect(db_path)
    raw.executescript(script)
    raw.commit()
    raw.close()
    engine = create_engine(f"sqlite:///{db_path}")
    return sessionmaker(bind=engine)(), engine


class TestTableProbeFailure:
    def test_probe_exception_falls_back_to_calibre(self):
        """表探测抛异常时必须回退，且不把异常抛给调用方。"""
        session, engine = _make_session("CREATE TABLE books (id INTEGER PRIMARY KEY);")
        try:
            # 用一个不存在于 sqlite_master 的查询制造异常：把 session.execute 替换为抛错版本
            class Boom(Exception):
                pass

            original = session.execute

            def explode(*args, **kwargs):
                raise Boom("模拟非 SQLite 后端")

            session.execute = explode
            try:
                exists = format_keys._book_formats_table_exists(session)
            finally:
                session.execute = original

            assert exists is False
        finally:
            session.close()
            engine.dispose()

    def test_probe_failure_result_is_cached(self):
        """探测失败的结果也要进缓存，避免每本书都重试。"""
        session, engine = _make_session("CREATE TABLE books (id INTEGER PRIMARY KEY);")
        try:
            def explode(*args, **kwargs):
                raise RuntimeError("boom")

            session.execute = explode
            format_keys._book_formats_table_exists(session)

            # 缓存里应记录 False
            assert False in format_keys._table_presence_cache.values()
        finally:
            session.close()
            engine.dispose()

    def test_apply_returns_zero_when_probe_fails(self):
        """探测失败时 apply_format_keys 返回 0，且不改动 book dict。"""
        session, engine = _make_session("CREATE TABLE books (id INTEGER PRIMARY KEY);")
        try:
            def explode(*args, **kwargs):
                raise RuntimeError("boom")

            session.execute = explode
            books = [{"id": 1, "fmt_epub": "/calibre/old.epub"}]
            changed = format_keys.apply_format_keys(session, books)

            assert changed == 0
            assert books[0]["fmt_epub"] == "/calibre/old.epub"
        finally:
            session.close()
            engine.dispose()


class TestEmptyFormatSkipped:
    def test_empty_format_row_is_skipped(self):
        """book_formats 里 format 为空串的行必须被跳过，不产生空键。"""
        session, engine = _make_session(
            """
            CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);
            CREATE TABLE book_formats (
                id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
                path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT
            );
            INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
                (1, '',     '/library/empty-path', 1, 0),
                (1, 'EPUB', '/library/real.epub',  2, 0);
            """
        )
        try:
            paths = format_keys.load_format_paths(session, [1])

            # 空 format 不产生键
            assert "" not in paths[1]
            assert paths[1] == {"epub": "/library/real.epub"}
        finally:
            session.close()
            engine.dispose()

    def test_empty_format_does_not_create_fmt_key(self):
        """空 format 不得在 book dict 上产生 ``fmt_`` 空后缀键。"""
        session, engine = _make_session(
            """
            CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);
            CREATE TABLE book_formats (
                id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
                path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT
            );
            INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
                (1, '',     '/library/empty-path', 1, 0),
                (1, 'EPUB', '/library/real.epub',  2, 0);
            """
        )
        try:
            books = [{"id": 1, "title": "三体"}]
            format_keys.apply_format_keys(session, books)

            assert "fmt_" not in books[0]
            assert books[0]["fmt_epub"] == "/library/real.epub"
        finally:
            session.close()
            engine.dispose()


class TestBookWithoutID:
    def test_book_without_id_is_skipped(self):
        """book dict 没有 id 键时必须跳过，不抛异常。"""
        session, engine = _make_session(
            """
            CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);
            CREATE TABLE book_formats (
                id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
                path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT
            );
            INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
                (1, 'EPUB', '/library/real.epub', 2, 0);
            """
        )
        try:
            books = [
                {"title": "没有 id 的书"},
                {"id": 1, "title": "三体"},
            ]
            changed = format_keys.apply_format_keys(session, books)

            # 第一本被跳过，第二本被填充
            assert "fmt_epub" not in books[0]
            assert books[1]["fmt_epub"] == "/library/real.epub"
            assert changed == 1
        finally:
            session.close()
            engine.dispose()

    def test_book_with_none_id_is_skipped(self):
        """id 为 None 时同样跳过。"""
        session, engine = _make_session(
            """
            CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);
            CREATE TABLE book_formats (
                id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
                path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT
            );
            INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
                (1, 'EPUB', '/library/real.epub', 2, 0);
            """
        )
        try:
            books = [{"id": None, "title": "id 为 None"}]
            changed = format_keys.apply_format_keys(session, books)

            assert changed == 0
            assert "fmt_epub" not in books[0]
        finally:
            session.close()
            engine.dispose()

    def test_all_books_skipped_returns_zero(self):
        """全部书都没有 id 时返回 0。"""
        session, engine = _make_session(
            """
            CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);
            CREATE TABLE book_formats (
                id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
                path TEXT NOT NULL, size INTEGER NOT NULL, mtime INTEGER NOT NULL, hash TEXT
            );
            """
        )
        try:
            books = [{"title": "a"}, {"title": "b"}]
            assert format_keys.apply_format_keys(session, books) == 0
        finally:
            session.close()
            engine.dispose()
