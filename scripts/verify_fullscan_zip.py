"""End-to-end fixtures for the explicitly marked disposable fullscan container."""

import http.cookiejar
import io
import json
import sqlite3
import sys
import time
import urllib.request
import zipfile
from pathlib import Path


if not Path("/data/.talebook-fullscan-audit").is_file():
    raise SystemExit("Requires a marked disposable fullscan audit volume")

client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def api(path, data=None):
    request = urllib.request.Request(
        "http://127.0.0.1" + path,
        data=None if data is None else json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
    )
    with client.open(request, timeout=30) as response:
        return json.load(response)


def ok(path, data=None):
    response = api(path, data)
    assert response.get("err") == "ok", (path, response.get("err"), response.get("msg"))
    return response


def wait_task(kind):
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        response = ok(f"/api/admin/{kind}/status")
        if not response["running"]:
            return response
        time.sleep(0.5)
    raise AssertionError(f"{kind} did not finish")


def zip_bytes(entries):
    data = io.BytesIO()
    with zipfile.ZipFile(data, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, body in entries:
            archive.writestr(name, body)
    return data.getvalue()


stage = sys.argv[1] if len(sys.argv) > 1 else "setup"
if api("/api/admin/install").get("err") != "installed":
    ok(
        "/api/admin/install",
        {
            "username": "auditadmin",
            "password": "AuditOnly2026",
            "email": "audit@example.invalid",
            "title": "全量扫描验证书库",
            "invite": "false",
        },
    )
ok("/api/user/sign_in", {"username": "auditadmin", "password": "AuditOnly2026"})

if stage == "setup":
    for root, count in ((Path("/books"), 501), (Path("/books1"), 7)):
        for number in range(count):
            (root / f"fullscan-{root.name}-{number:04}.txt").write_text(f"第一章\n{root.name} 正文 {number}", encoding="utf-8")
    entries = [(f"合集/压缩小说-{number:04}.txt", f"第一章\nZIP 正文 {number}") for number in range(603)]
    Path("/books1/合集.zip").write_bytes(zip_bytes(entries))
    nested = zip_bytes([("内层小说.txt", "第一章\n嵌套正文")])
    Path("/books1/嵌套.zip").write_bytes(zip_bytes([("nested.zip", nested), ("另一部.txt", "第一章\n另一部正文")]))
    ok(
        "/api/admin/import/settings",
        {"import_directories": ["/books", "/books1"], "import_mode": "copy", "auto_watch_enabled": False},
    )
    print("PASS fixture setup: two roots, 1113 books including 605 ZIP entries", flush=True)
elif stage == "scan":
    started = time.monotonic()
    ok("/api/admin/scan/run", {})
    assert time.monotonic() - started < 3
    print("PASS scan request returned immediately", flush=True)
    response = wait_task("scan")
    assert response["summary"]["todo"] == 1113, response["summary"]
    print("PASS one request scanned all 1113 books across two roots", flush=True)
elif stage == "import":
    ok("/api/admin/import/run", {"hashlist": "all", "import_mode": "copy"})
    response = wait_task("import")
    assert response["summary"]["done"] == 1113 and response["summary"]["failed"] == 0, response["summary"]
    database = sqlite3.connect("/data/books/library/metadata.db")
    for name in ("压缩小说-0000", "压缩小说-0602", "内层小说", "另一部"):
        stored = database.execute(
            "SELECT f.path FROM book_formats f JOIN books b ON b.id=f.book_id WHERE b.title=?", (name,)
        ).fetchone()
        assert stored and Path(stored[0]).is_file(), name
        assert stored[0].startswith("/data/books/library/"), stored
    assert Path("/books1/合集.zip").is_file() and Path("/books1/嵌套.zip").is_file()
    print("PASS all 1113 imported; nested ZIP books are readable; original ZIPs retained", flush=True)
    ids = [
        row[0] for row in database.execute("SELECT id FROM books WHERE title IN ('压缩小说-0601','压缩小说-0602') ORDER BY id")
    ]
    Path("/data/bulk-delete-test-ids.json").write_text(json.dumps(ids))
    print("Browser bulk-delete targets are saved in the audit data volume", flush=True)
elif stage == "verify-delete":
    ids = json.loads(Path("/data/bulk-delete-test-ids.json").read_text())
    database = sqlite3.connect("/data/books/library/metadata.db")
    assert not database.execute("SELECT id FROM books WHERE id IN (?,?)", ids).fetchall()
    userdb = sqlite3.connect("/data/books/calibre-webserver.db")
    assert not userdb.execute("SELECT id FROM scanfiles WHERE book_id IN (?,?)", ids).fetchall()
    assert Path("/books1/合集.zip").is_file()
    print("PASS browser bulk delete removed both selected books and scan records, retaining source ZIP", flush=True)
else:
    raise SystemExit("Unknown audit stage")
