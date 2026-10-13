import sqlite3

db = sqlite3.connect('/data/books/library/metadata.db')
for name, sql in db.execute(
        "SELECT name, sql FROM sqlite_master WHERE type='trigger' AND name='books_insert_trg'"):
    print(sql)
db.close()