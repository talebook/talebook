import sqlite3

db = sqlite3.connect('/data/books/calibre-webserver.db')
cur = db.cursor()

print('-- reading_state --')
for row in cur.execute(
        "SELECT book_id, reader_id, favorite, wants, read_state FROM reading_state"):
    print('  ', row)

print('-- annotations --')
for row in cur.execute(
        "SELECT id, book_id, reader_id, annotation_type, client_id FROM annotations"):
    print('  ', row)

print('-- readers.name (昵称是否更新) --')
for row in cur.execute("SELECT id, username, name, admin FROM readers"):
    print('  ', row)

db.close()