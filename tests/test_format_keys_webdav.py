#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""WebDAV 的 fmt_ 键注入路径测试。

WebDAV 不走 ``get_books()``，而是自己从 ``cache.format_abspath()`` 生产
``fmt_<format>`` 键。实施项 7.5 在此单独注入了 ``apply_format_keys``，
本文件固定该行为，防止缺口回归。
"""

import os
import sqlite3
import tempfile

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.services import format_keys


DAV_PROVIDER = os.path.join("webserver", "webdav", "dav_provider.py")


@pytest.fixture
def migrated_session():
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
        INSERT INTO books VALUES (7, '三体', '刘慈欣', '刘慈欣/三体 (1)');
        INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES
            (7, 'EPUB', '/library/刘慈欣/三体 (1)/三体.epub', 1000, 0),
            (7, 'MOBI', '/library/刘慈欣/三体 (1)/三体.mobi', 2000, 0);
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


class TestWebDavInjection:
    def test_dav_provider_calls_apply_format_keys(self):
        """dav_provider 必须在构造 item 后调用 apply_format_keys。"""
        with open(DAV_PROVIDER, encoding="utf-8") as fh:
            source = fh.read()
        assert "apply_format_keys" in source
        assert "from webserver.services.format_keys import apply_format_keys" in source

    def test_dav_provider_uses_get_session_func(self):
        """注入必须复用 provider 已有的 get_session_func，不新建连接。"""
        with open(DAV_PROVIDER, encoding="utf-8") as fh:
            source = fh.read()
        assert "self.provider.get_session_func" in source
        # session 必须被关闭，避免连接泄漏
        assert "session.close()" in source

    def test_dav_provider_keeps_calibre_fallback(self):
        """未迁移的库必须保留 cache.format_abspath() 的 Calibre 原值。"""
        with open(DAV_PROVIDER, encoding="utf-8") as fh:
            source = fh.read()
        assert "format_abspath" in source

    def test_webdav_item_gets_book_formats_paths(self, migrated_session):
        """模拟 WebDAV 的 item：注入后 fmt_ 键必须来自 book_formats。"""
        # WebDAV 先自己填 Calibre 路径
        item = {
            "id": 7,
            "title": "三体",
            "fmt_epub": "/calibre/old.epub",
            "fmt_azw3": None,
            "fmt_mobi": None,
            "fmt_pdf": None,
        }

        format_keys.apply_format_keys(migrated_session, [item])

        assert item["fmt_epub"] == "/library/刘慈欣/三体 (1)/三体.epub"
        assert item["fmt_mobi"] == "/library/刘慈欣/三体 (1)/三体.mobi"
        # 没有的格式保持 None，不凭空造键
        assert item["fmt_azw3"] is None
        assert item["fmt_pdf"] is None

    def test_webdav_format_selection_order(self, migrated_session):
        """WebDAV 按 SUPPORTED_FORMATS 顺序选第一个有路径的格式。"""
        item = {"id": 7, "title": "三体", "fmt_epub": None, "fmt_mobi": None}
        format_keys.apply_format_keys(migrated_session, [item])

        supported = ["epub", "azw3", "mobi", "pdf"]
        selected = next((f for f in supported if item.get(f"fmt_{f}")), None)
        assert selected == "epub"

    def test_unmigrated_library_keeps_calibre_paths(self):
        """没有 book_formats 表的库：apply_format_keys 返回 0，原值不动。"""
        tmpdir = tempfile.mkdtemp()
        db_path = os.path.join(tmpdir, "legacy.db")
        raw = sqlite3.connect(db_path)
        raw.executescript("CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT);")
        raw.commit()
        raw.close()

        engine = create_engine(f"sqlite:///{db_path}")
        session = sessionmaker(bind=engine)()
        format_keys._table_presence_cache.clear()
        try:
            item = {"id": 7, "title": "三体", "fmt_epub": "/calibre/old.epub"}
            changed = format_keys.apply_format_keys(session, [item])

            assert changed == 0
            assert item["fmt_epub"] == "/calibre/old.epub"
        finally:
            session.close()
            engine.dispose()
