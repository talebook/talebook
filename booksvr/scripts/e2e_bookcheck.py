import sqlite3

print('=== Calibre metadata.db: books ===')
db = sqlite3.connect('/data/books/library/metadata.db')
for row in db.execute("SELECT id, title, sort, author_sort, path, uuid FROM books ORDER BY id"):
    print('  id=%s' % row[0])
    print('    title       =', row[1])
    print('    sort        =', row[2])
    print('    author_sort =', row[3])
    print('    path        =', row[4])
    print('    uuid        =', row[5])
print('--- authors ---')
for row in db.execute("SELECT id, name, sort FROM authors ORDER BY id"):
    print('  ', row)
print('--- data (formats) ---')
for row in db.execute("SELECT book, format, name FROM data ORDER BY book"):
    print('  ', row)
print('--- book_formats ---')
for row in db.execute("SELECT book_id, format, path, size FROM book_formats ORDER BY book_id"):
    print('  ', row)
db.close()

print()
print('=== Talebook userdb: scanfiles ===')
db = sqlite3.connect('/data/books/calibre-webserver.db')
for row in db.execute("SELECT id, path, status, book_id FROM scanfiles ORDER BY id"):
    print('  ', row)
db.close()