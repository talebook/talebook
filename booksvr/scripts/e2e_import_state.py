#!/usr/bin/env python3
"""直查 Calibre 库，确认导入后的 books.path / data / book_formats 状态。"""
import sqlite3
import sys

db = "/data/books/library/metadata.db"
con = sqlite3.connect(db)
con.row_factory = sqlite3.Row

print("=== books ===")
for r in con.execute("SELECT id, title, author_sort, path, has_cover FROM books"):
    print(f"  id={r['id']}")
    print(f"    title       = {r['title']}")
    print(f"    author_sort = {r['author_sort']}")
    print(f"    path        = {r['path']!r}")
    print(f"    has_cover   = {r['has_cover']}")

print("=== data ===")
for r in con.execute("SELECT book, format, uncompressed_size, name FROM data"):
    print(f"  book={r['book']} format={r['format']} size={r['uncompressed_size']} name={r['name']!r}")

print("=== book_formats ===")
try:
    for r in con.execute("SELECT book_id, format, path, size FROM book_formats"):
        print(f"  book_id={r['book_id']} format={r['format']} path={r['path']!r} size={r['size']}")
except sqlite3.OperationalError as e:
    print(f"  (无此表: {e})")

print("=== authors ===")
for r in con.execute("SELECT id, name, sort FROM authors"):
    print(f"  id={r['id']} name={r['name']!r} sort={r['sort']!r}")

con.close()