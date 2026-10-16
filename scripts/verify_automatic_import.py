"""End-to-end fixtures for the explicitly marked disposable automatic-import container."""

import http.cookiejar
import io
import json
import sqlite3
import sys
import time
import urllib.request
import zipfile
from pathlib import Path


if not Path("/data/.talebook-automatic-import-audit").is_file():
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
    for number in range(3):
        Path(f"/books/existing-{number}.txt").write_text(f"第一章\n已有正文 {number}", encoding="utf-8")
    ok(
        "/api/admin/import/settings",
        {"import_directories": ["/books", "/books1"], "import_mode": "copy", "auto_watch_enabled": False},
    )
    ok("/api/admin/scan/run", {})
    assert wait_task("scan")["summary"]["todo"] == 3
    for root, count in ((Path("/books"), 501), (Path("/books1"), 4)):
        for number in range(count):
            (root / f"automatic-{root.name}-{number:04}.txt").write_text(
                f"第一章\n{root.name} 自动正文 {number}", encoding="utf-8"
            )
    entries = [(f"合集/压缩小说-{number:04}.txt", f"第一章\nZIP 正文 {number}") for number in range(603)]
    Path("/books1/合集.zip").write_bytes(zip_bytes(entries))
    nested = zip_bytes([("内层小说.txt", "第一章\n嵌套正文")])
    Path("/books1/嵌套.zip").write_bytes(zip_bytes([("nested.zip", nested), ("另一部.txt", "第一章\n另一部正文")]))
    print("PASS 3 existing pending books, 1113 total files prepared; awaiting browser Import all", flush=True)
elif stage == "verify":
    response = wait_task("import")
    assert response["summary"]["done"] == 1113 and response["summary"]["failed"] == 0, response["summary"]
    assert response["summary"]["todo"] == 0, response["summary"]
    database = sqlite3.connect("/data/books/library/metadata.db")
    for title in ("existing-0", "压缩小说-0000", "压缩小说-0602", "内层小说", "另一部"):
        row = database.execute(
            "SELECT f.path FROM book_formats f JOIN books b ON b.id=f.book_id WHERE b.title=?", (title,)
        ).fetchone()
        assert row and Path(row[0]).is_file() and row[0].startswith("/data/books/library/"), title
    assert Path("/books1/合集.zip").is_file() and Path("/books1/嵌套.zip").is_file()
    print(
        "PASS one browser action scanned and imported all 1113 books, including 605 ZIP members and 3 previous discoveries",
        flush=True,
    )
else:
    raise SystemExit("Unknown audit stage")
