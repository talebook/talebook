import sqlite3
import sys

c = sqlite3.connect("/data/books/library/metadata.db")
print("books:", list(c.execute("SELECT id, title, path, has_cover FROM books")))
print("data:", list(c.execute("SELECT book, format, name FROM data")))