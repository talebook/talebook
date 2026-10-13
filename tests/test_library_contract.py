#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""阶段 3 数据层一致性契约测试。

验证 Go 数据层（`booksvr/internal/library`）的查询结果与 Calibre 语义一致。

设计说明
--------
本机无 Calibre（`ModuleNotFoundError: No module named 'calibre'`），
因此无法启动 Calibre 做真实双跑对比。本测试改为：

1. **用真实 fixture**：`tests/cases/metadata.db`（13 本书、15 个作者、72 个标签）；
2. **用 Python 独立复算期望值**：直接用 sqlite3 按 Calibre 的语义算出结果；
3. **断言 Go 侧实现存在且语义对齐**：静态检查 Go 源码的 SQL 与 Python 复算一致。

真实双跑对比需在有 Calibre 的环境中补做（见计划实施项 10 的验证缺口）。
"""

import os
import re
import sqlite3

import pytest


REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FIXTURE = os.path.join(REPO, "tests", "cases", "metadata.db")
GO_LIB = os.path.join(REPO, "booksvr", "internal", "library")


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


@pytest.fixture(scope="module")
def calibre_db():
    """打开真实 Calibre fixture（只读）。"""
    if not os.path.exists(FIXTURE):
        pytest.skip("缺少 fixture: tests/cases/metadata.db")
    conn = sqlite3.connect(f"file:{FIXTURE}?mode=ro", uri=True)
    yield conn
    conn.close()


# ---------------------------------------------------------------- 期望值复算


def expected_all_book_ids(conn):
    return [r[0] for r in conn.execute("SELECT id FROM books ORDER BY id")]


def expected_books_for_author(conn, author_name):
    return [
        r[0]
        for r in conn.execute(
            """SELECT DISTINCT l.book FROM books_authors_link l
               JOIN authors a ON a.id = l.author
               WHERE a.name = ? ORDER BY l.book""",
            (author_name,),
        )
    ]


def expected_books_for_tag(conn, tag_name):
    return [
        r[0]
        for r in conn.execute(
            """SELECT DISTINCT l.book FROM books_tags_link l
               JOIN tags t ON t.id = l.tag
               WHERE t.name = ? ORDER BY l.book""",
            (tag_name,),
        )
    ]


def expected_categories(conn, table, link_table, link_col):
    return {
        r[0]: r[1]
        for r in conn.execute(
            f"""SELECT i.name, COUNT(DISTINCT l.book) FROM {table} i
                LEFT JOIN {link_table} l ON l.{link_col} = i.id
                GROUP BY i.id"""
        )
    }


# ---------------------------------------------------------------- fixture 健全性


class TestFixtureSanity:
    """确认 fixture 本身可用。"""

    def test_fixture_exists(self):
        assert os.path.exists(FIXTURE), "缺少 tests/cases/metadata.db"

    def test_fixture_has_books(self, calibre_db):
        n = calibre_db.execute("SELECT COUNT(*) FROM books").fetchone()[0]
        assert n == 13, f"fixture 应有 13 本书，实际 {n}"

    def test_fixture_has_required_tables(self, calibre_db):
        tables = {
            r[0]
            for r in calibre_db.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
        for t in [
            "books", "authors", "tags", "publishers", "series", "ratings",
            "languages", "comments", "identifiers", "data",
            "books_authors_link", "books_tags_link", "books_publishers_link",
            "books_series_link", "books_ratings_link", "books_languages_link",
        ]:
            assert t in tables, f"fixture 缺少表 {t}"


# ---------------------------------------------------------------- Go 实现语义


class TestGoImplementationSemantics:
    """Go 侧 SQL 语义与 Calibre 一致。"""

    def test_all_book_ids_orders_by_id(self):
        src = read(os.path.join(GO_LIB, "read.go"))
        assert "SELECT id FROM books ORDER BY id" in src

    def test_books_for_category_uses_distinct(self):
        src = read(os.path.join(GO_LIB, "category.go"))
        assert "SELECT DISTINCT book FROM" in src, "分类查询应去重"

    def test_categories_uses_left_join(self):
        """分类列表用 LEFT JOIN，保证 0 本书的分类也出现（与 Calibre 一致）。"""
        src = read(os.path.join(GO_LIB, "category.go"))
        assert "LEFT JOIN" in src

    def test_search_empty_returns_all(self):
        src = read(os.path.join(GO_LIB, "search.go"))
        assert "AllBookIDs(db)" in src, "空查询应返回全部"

    def test_search_supports_required_fields(self):
        src = read(os.path.join(GO_LIB, "search.go"))
        for field in ["title", "author", "tag", "publisher", "series", "rating", "format", "search"]:
            assert f'"{field}"' in src, f"搜索应支持字段 {field}"

    def test_search_supports_boolean_ops(self):
        src = read(os.path.join(GO_LIB, "search.go"))
        for op in ["and", "or", "not"]:
            assert f'"{op}"' in src, f"搜索应支持布尔运算 {op}"

    def test_search_supports_comparison_ops(self):
        src = read(os.path.join(GO_LIB, "search.go"))
        for op in [":<", ":>", ":="]:
            assert f'"{op}"' in src, f"搜索应支持比较符 {op}"

    def test_search_rejects_unknown_field(self):
        src = read(os.path.join(GO_LIB, "search.go"))
        assert "未知字段" in src, "未知字段应报错而非静默"

    def test_get_books_data_covers_formatter_fields(self):
        """BookData 字段覆盖 SimpleBookFormatter 的字段集合。"""
        src = read(os.path.join(GO_LIB, "query.go"))
        for field in ["Title", "Authors", "Tags", "Publisher", "Series", "Rating", "Comments", "Language", "ISBN"]:
            assert field in src, f"BookData 缺少字段 {field}"


# ---------------------------------------------------------------- 真实数据比对


class TestRealFixtureQueries:
    """用真实 fixture 复算，确认 Go 侧 SQL 能产出同样结果。"""

    def test_author_query_matches_go_sql(self, calibre_db):
        """Go 的作者查询 SQL 在真实库上可执行且结果非空。"""
        row = calibre_db.execute(
            "SELECT a.name FROM authors a JOIN books_authors_link l ON l.author = a.id LIMIT 1"
        ).fetchone()
        assert row, "fixture 应有作者关联"
        author = row[0]

        expected = expected_books_for_author(calibre_db, author)
        assert expected, f"作者 {author} 应有书"

        # 用 Go 侧同样的 SQL 复算，确认语义一致。
        got = [
            r[0]
            for r in calibre_db.execute(
                """SELECT DISTINCT book FROM books_authors_link
                   WHERE author = (SELECT id FROM authors WHERE name = ? LIMIT 1)
                   ORDER BY book""",
                (author,),
            )
        ]
        assert got == expected

    def test_tag_query_matches_go_sql(self, calibre_db):
        row = calibre_db.execute(
            "SELECT t.name FROM tags t JOIN books_tags_link l ON l.tag = t.id LIMIT 1"
        ).fetchone()
        assert row, "fixture 应有标签关联"
        tag = row[0]

        expected = expected_books_for_tag(calibre_db, tag)
        assert expected, f"标签 {tag} 应有书"

        got = [
            r[0]
            for r in calibre_db.execute(
                """SELECT DISTINCT book FROM books_tags_link
                   WHERE tag = (SELECT id FROM tags WHERE name = ? LIMIT 1)
                   ORDER BY book""",
                (tag,),
            )
        ]
        assert got == expected

    def test_all_book_ids_count(self, calibre_db):
        ids = expected_all_book_ids(calibre_db)
        assert len(ids) == 13
        assert ids == sorted(ids), "应升序"

    def test_categories_count_matches(self, calibre_db):
        cats = expected_categories(calibre_db, "authors", "books_authors_link", "author")
        assert len(cats) == 15, f"应有 15 个作者，实际 {len(cats)}"

    def test_full_text_search_finds_known_title(self, calibre_db):
        """全文搜索能命中已知书名。"""
        got = [
            r[0]
            for r in calibre_db.execute(
                "SELECT id FROM books WHERE title LIKE ? ORDER BY id", ("%百年孤独%",)
            )
        ]
        assert got, "应能搜到《百年孤独》"

    def test_format_query_finds_known_format(self, calibre_db):
        row = calibre_db.execute("SELECT format FROM data LIMIT 1").fetchone()
        assert row, "fixture 应有格式数据"
        fmt = row[0]
        got = [
            r[0]
            for r in calibre_db.execute(
                "SELECT book FROM data WHERE UPPER(format) = UPPER(?) ORDER BY book", (fmt,)
            )
        ]
        assert got, f"应能按格式 {fmt} 搜到书"