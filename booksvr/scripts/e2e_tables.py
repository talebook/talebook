import sqlite3
import sys

db = sqlite3.connect('/data/books/calibre-webserver.db')
rows = [r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")]
print('TOTAL TABLES:', len(rows))
print('HAS scanfiles:', 'scanfiles' in rows)
print('scan-related:', sorted(r for r in rows if 'scan' in r.lower()))
print('theme-related:', sorted(r for r in rows if 'theme' in r.lower()))
db.close()