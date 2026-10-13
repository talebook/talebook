import datetime
import hashlib
import sqlite3

db = sqlite3.connect('/data/books/calibre-webserver.db')
cur = db.cursor()


def legacy_hash(raw, salt):
    """复刻 Python 的旧密码算法：SHA256(salt + SHA256(raw))。"""
    p1 = hashlib.sha256(raw.encode('UTF-8')).hexdigest()
    return hashlib.sha256((salt + p1).encode('UTF-8')).hexdigest()


now = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
accounts = [
    ('e2e_admin', 'AdminPass123', 'adminsalt', 1),
    ('e2e_user', 'UserPass123', 'usersalt', 0),
]
for username, password, salt, admin in accounts:
    cur.execute("DELETE FROM readers WHERE username = ?", (username,))
    cur.execute(
        "INSERT INTO readers (username, password, salt, admin, active, permission, "
        "create_time, update_time) VALUES (?,?,?,?,1,'',?,?)",
        (username, legacy_hash(password, salt), salt, admin, now, now))
    print('created', username, 'admin=%d' % admin)
db.commit()
db.close()