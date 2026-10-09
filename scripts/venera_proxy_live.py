"""Verify a disposable real backend through production SPA Nginx rules.

Keep this command running while app/test/venera-proxy.mjs completes its browser
check. Both results are collected here before Nginx exits. No production data.
"""

import argparse
import datetime
import json
import os
import time
import urllib.parse
from pathlib import Path

import requests

from scripts.venera_proxy import SPA_FALLBACK, production_proxy


BOOK = "df25d42b-806c-4cc5-9aef-ce08daa4b83a"


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--backend-port", type=int, default=8080)
    parser.add_argument("--prefix", default="")
    parser.add_argument("--access-file", required=True)
    parser.add_argument("--browser-file", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    access = json.loads(Path(args.access_file).read_text())
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    browser_file = Path(args.browser_file)
    completed = browser_file.with_suffix(".done.json")
    completed.unlink(missing_ok=True)
    with production_proxy(args.backend_port, prefix=args.prefix) as base_url, requests.Session() as session:
        session.trust_env = False
        login = session.post(
            base_url + "/api/user/sign_in", data={"username": access["username"], "password": access["password"]}, timeout=30
        )
        assert login.json()["err"] == "ok"

        def api(path, **params):
            response = session.get(base_url + path, params=params, timeout=90)
            response.raise_for_status()
            value = response.json()
            assert value["err"] == "ok", value.get("msg")
            return value

        source = access["source_id"]
        book = api("/api/book-sources/book", source_id=source, book_url=BOOK)["book"]
        toc = api("/api/book-sources/toc", source_id=source, book_url=BOOK)["chapters"]
        chapter = toc[0]
        params = {"source_id": source, "chapter_url": chapter["url"], "book_url": BOOK, "title": book["name"]}
        reader_url = base_url + "/read-online-comic?" + urllib.parse.urlencode(params)
        html = session.get(reader_url, timeout=30)
        assert html.status_code == 200 and 'id="host"' in html.text
        assert SPA_FALLBACK not in html.text
        assert html.headers["Cache-Control"] == "no-store"
        assert f"{args.prefix}/static/komga-reader/komga-reader.es.js" in html.text
        pages = api("/api/book-sources/comic/pages", source_id=source, chapter_url=chapter["url"])["pages"]
        images = []
        origin = base_url.removesuffix(args.prefix) if args.prefix else base_url
        for page in pages[:2]:
            assert page["url"].startswith(args.prefix + "/api/")
            image = session.get(origin + page["url"], timeout=90)
            assert image.status_code == 200 and image.headers["Content-Type"].startswith("image/")
            images.append({"status": image.status_code, "type": image.headers["Content-Type"], "bytes": len(image.content)})
        report = {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "production_config": "conf/nginx/talebook.conf",
            "public_prefix": args.prefix,
            "nginx": True,
            "backend": "real Talebook + Calibre",
            "source_api_mocks": False,
            "static_fallback_control": SPA_FALLBACK,
            "static_scope": "production location rules plus unchanged public Reader assets; SPA not rebuilt",
            "reader": {
                "status": html.status_code,
                "is_reader": True,
                "spa_fallback": False,
                "cache_control": html.headers["Cache-Control"],
            },
            "comic": {"title": book["name"], "chapters": len(toc), "pages": len(pages)},
            "images": images,
        }
        private = {
            **access,
            "base_url": base_url,
            "reader_url": reader_url,
            "completed": str(completed),
            "output": str(output),
        }
        fd = os.open(browser_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w") as stream:
            json.dump(private, stream)
        print("Production proxy ready for browser validation", flush=True)
        deadline = time.monotonic() + 300
        while not completed.exists():
            if time.monotonic() > deadline:
                raise TimeoutError("Browser verification did not complete")
            time.sleep(0.2)
        report["browser"] = json.loads(completed.read_text())
        assert report["browser"]["image_decoded"] and report["browser"]["flipped"]
        (output / "proxy-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
        browser_file.unlink()
        completed.unlink()
        print(json.dumps(report, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    run()
