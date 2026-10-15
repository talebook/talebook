"""Destructive test fixtures: run ONLY inside the disposable config-audit container."""

import http.cookiejar
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path


BASE = "http://127.0.0.1"
if not Path("/data/.talebook-config-audit").exists():
    raise SystemExit("This script requires an explicitly marked disposable audit volume")
jar = http.cookiejar.CookieJar()
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
checks = []


def api(path, data=None, guest=False):
    req = urllib.request.Request(
        BASE + path, data=None if data is None else json.dumps(data).encode(), headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=60) if guest else client.open(req, timeout=60) as response:
        return json.load(response)


def ok(path, data=None):
    response = api(path, data)
    assert response.get("err") == "ok", (path, response.get("err"), response.get("msg"))
    return response


def save(values):
    return ok("/api/admin/settings", values)


def check(name, condition):
    assert condition, name
    checks.append(name)
    print("PASS", name, flush=True)


def wait_task(kind):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        result = ok(f"/api/admin/{kind}/status")
        if not result.get("running"):
            return
        time.sleep(0.1)
    raise AssertionError(f"{kind} task did not finish")


def epub(path, title):
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", "application/epub+zip")
        archive.writestr(
            "META-INF/container.xml",
            '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
        )
        archive.writestr(
            "content.opf",
            f"""<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>{title}</dc:title><dc:creator>Audit Author</dc:creator><dc:identifier id="uid">{title}</dc:identifier><dc:language>zh</dc:language></metadata><manifest><item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/><item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/></manifest><spine><itemref idref="c1"/></spine></package>""",
        )
        archive.writestr(
            "chapter.xhtml",
            f'<html xmlns="http://www.w3.org/1999/xhtml"><head><title>{title}</title></head><body><h1>{title}</h1><p>这是隔离实例的导入与阅读验证正文。</p></body></html>',
        )
        archive.writestr(
            "toc.xhtml",
            '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="chapter.xhtml">第一章</a></li></ol></nav></body></html>',
        )


def login():
    ok("/api/user/sign_in", {"username": "auditadmin", "password": "AuditOnly2026"})


if len(sys.argv) > 1 and sys.argv[1] == "postrestart":
    login()
    settings = ok("/api/admin/import/settings")["settings"]
    check(
        "import settings survive process restart",
        settings["import_directories"] == ["/books", "/books1"] and settings["import_mode"] == "index",
    )
    check("install stays complete after restart", api("/api/admin/install")["err"] == "installed")
    saved = json.loads(Path("/data/audit-settings-before-restart.json").read_text())
    current = ok("/api/admin/settings")["settings"]
    check("all saved settings survive process restart", all(current[k] == v for k, v in saved.items()))
    raise SystemExit(0)

state = api("/api/admin/install")
if state.get("err") != "installed":
    ok(
        "/api/admin/install",
        {
            "username": "auditadmin",
            "password": "AuditOnly2026",
            "email": "audit@example.invalid",
            "title": "配置验证书库",
            "invite": "false",
        },
    )
check("installation takes effect without restart", api("/api/user/info")["err"] == "ok")
login()
baseline = ok("/api/admin/settings")["settings"]
for key, value in baseline.items():
    save({key: value})
    loaded = ok("/api/admin/settings")["settings"]
    assert loaded[key] == value, key
check(f"all {len(baseline)} settings save and reload via HTTP", True)

for enabled in (False, True, False):
    save({"ALLOW_REGISTER": enabled})
    result = api("/api/user/sign_up", {}, guest=True)
    check(f"registration runtime={enabled}", (result["err"] == "register.disabled") == (not enabled))
save({"ALLOW_REGISTER": baseline["ALLOW_REGISTER"]})
save({"INVITE_MODE": True, "INVITE_CODE": "audit-code", "INVITE_MESSAGE": "audit welcome"})
check("invite runtime enabled", api("/api/welcome", guest=True).get("welcome") == "audit welcome")
save({"INVITE_MODE": False})
check("invite runtime disabled", api("/api/welcome", guest=True)["err"] == "free")

for scene, endpoint in (
    ("login", "/api/user/sign_in"),
    ("register", "/api/user/sign_up"),
    ("reset", "/api/user/reset"),
    ("welcome", "/api/welcome"),
):
    key = "CAPTCHA_ENABLE_FOR_" + scene.upper()
    save({"CAPTCHA_PROVIDER": "image", key: True})
    check(f"captcha {scene} enforced", api(endpoint, {}, guest=True)["err"] == "captcha.invalid")
    save({key: False})
save({"CAPTCHA_PROVIDER": baseline["CAPTCHA_PROVIDER"]})

db = sqlite3.connect("/data/books/library/metadata.db")
for mode in ("copy", "index", "move"):
    sources = [Path(root) / f"audit-{mode}-{index}.epub" for index, root in enumerate(("/books", "/books1"))]
    for source in sources:
        epub(source, source.stem)
    result = ok(
        "/api/admin/import/settings",
        {"import_directories": ["/books", "/books1"], "import_mode": mode, "auto_watch_enabled": False},
    )
    check(f"{mode}: save multiple directories", result["settings"]["import_directories"] == ["/books", "/books1"])
    check(f"{mode}: refresh keeps mode", ok("/api/admin/import/settings")["settings"]["import_mode"] == mode)
    ok("/api/admin/scan/run", {})
    wait_task("scan")
    rows = ok("/api/admin/scan/list?num=0")["items"]
    hashes = [r["hash"] for r in rows if r["path"] in [str(p) for p in sources] and r["status"] == "ready"]
    check(f"{mode}: scan both mounted directories", len(hashes) == 2)
    ok("/api/admin/import/run", {"hashlist": hashes})
    wait_task("import")
    for source in sources:
        stored = db.execute(
            "SELECT bf.path FROM book_formats bf JOIN books b ON b.id=bf.book_id WHERE b.title=?", (source.stem,)
        ).fetchone()
        check(f"{mode}: stored format {source.name}", stored is not None and Path(stored[0]).is_file())
        if mode == "index":
            check("index retains source path", stored[0] == str(source))
        else:
            check(f"{mode}: destination stays in builtin library", stored[0].startswith("/data/books/library/"))
        check(f"{mode}: source retention", source.exists() == (mode != "move"))

book_id = db.execute("SELECT id FROM books WHERE title='audit-copy-0'").fetchone()[0]
for enabled in (False, True):
    save({"ALLOW_GUEST_READ": enabled})
    req = urllib.request.Request(BASE + f"/read/extract/{book_id}/META-INF/container.xml")
    with urllib.request.urlopen(req, timeout=30) as response:
        content = response.read()
        check(f"guest reader permission={enabled}", (b"<container" in content) == enabled)
save({"ALLOW_GUEST_READ": baseline["ALLOW_GUEST_READ"]})
for scene, route in (("read", f"/read/extract/{book_id}/META-INF/container.xml"), ("download", f"/api/book/{book_id}.epub")):
    key = "CAPTCHA_ENABLE_FOR_" + scene.upper()
    save({"CAPTCHA_PROVIDER": "image", key: True})
    check(f"captcha {scene} enforced", api(route, guest=True)["err"] == "captcha.required")
    save({key: False})
save({"CAPTCHA_PROVIDER": baseline["CAPTCHA_PROVIDER"]})

ok(
    "/api/admin/import/settings",
    {"import_directories": ["/books", "/books1"], "import_mode": "index", "auto_watch_enabled": True},
)
epub(Path("/books1/audit-auto.epub"), "audit-auto")
deadline = time.monotonic() + 40
while time.monotonic() < deadline:
    if db.execute("SELECT id FROM books WHERE title='audit-auto'").fetchone():
        break
    time.sleep(1)
check(
    "automatic watcher imports newly added book",
    db.execute("SELECT id FROM books WHERE title='audit-auto'").fetchone() is not None,
)
ok(
    "/api/admin/import/settings",
    {"import_directories": ["/books", "/books1"], "import_mode": "index", "auto_watch_enabled": False},
)
time.sleep(2)
check("automatic watcher stops after save", ok("/api/admin/import/watch/status")["watch_status"]["state"] == "off")

snapshot = ok("/api/admin/settings")["settings"]
Path("/data/audit-settings-before-restart.json").write_text(json.dumps(snapshot))
Path("/data/audit-report.json").write_text(json.dumps(checks, ensure_ascii=False, indent=2))
print("TOTAL", len(checks), "checks; ready for restart test")
