import sqlite3

for label, path in [('calibre', '/data/calibre-library/metadata.db'),
                    ('userdb', '/data/books/calibre-webserver.db')]:
    db = sqlite3.connect(path)
    rows = set(r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'"))
    print('===', label, '(', len(rows), 'tables )')
    for t in ['scanfiles', 'plugin_definitions', 'plugin_installations',
              'plugin_connections', 'installed_themes', 'books', 'authors', 'readers']:
        print('   ', t, '->', 'YES' if t in rows else 'NO')
    db.close()