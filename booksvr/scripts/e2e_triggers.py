import sqlite3

db = sqlite3.connect('/data/books/library/metadata.db')
print('=== TRIGGERS ===')
for name, sql in db.execute("SELECT name, sql FROM sqlite_master WHERE type='trigger'"):
    print('TRIGGER:', name)
    print(sql)
    print('---')
print()
print('=== books 表 DDL ===')
for (sql,) in db.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='books'"):
    print(sql)
db.close()