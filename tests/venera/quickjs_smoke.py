"""Check source import and async hooks in QuickJS using Venera's real API library.

python tests/venera/quickjs_smoke.py --api-init /path/to/venera/assets/init.js
Requires the existing Talebook dependency `quickjs`. No network or real credentials.
"""

import argparse
import json
from pathlib import Path

import quickjs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-init", type=Path, required=True)
    args = parser.parse_args()
    context = quickjs.Context()
    stored = {}
    requests = []
    book = {
        "id": 1,
        "title": "QuickJS 测试漫画",
        "media_type": "comic",
        "files": [{"format": "CBZ"}],
    }

    def bridge(encoded):
        message = json.loads(encoded)
        method = message["method"]
        if method == "load_data":
            result = stored.get(message["data_key"])
        elif method == "save_data":
            stored[message["data_key"]] = message["data"]
            result = None
        elif method == "delete_data":
            stored.pop(message["data_key"], None)
            result = None
        elif method == "load_setting":
            result = "https://books.example.org"
        elif method == "cookie":
            result = None
        elif method == "http":
            assert message["extra"]["sensitive"] is True
            requests.append(message)
            url = message["url"]
            data = {"err": "ok"}
            if url.endswith("/api/welcome"):
                data["err"] = "free"
            elif url.endswith("/api/user/info"):
                data["user"] = {"is_login": True}
            elif "/api/library?" in url:
                data.update(total=1, books=[book])
            elif url.endswith("/api/book/1"):
                data["book"] = book
            elif url.endswith("/comic/pages"):
                data.update(
                    contract_version=1,
                    book_id=1,
                    pages_count=2,
                    pages=[
                        {"index": index, "url": f"/api/book/1/comic/pages/{index}?revision=r&token=TEST"}
                        for index in [1, 0]
                    ],
                )
            elif not url.endswith("/api/user/sign_in"):
                raise AssertionError("Unexpected request path")
            result = {"status": 200, "body": json.dumps(data)}
        else:
            raise AssertionError("Unexpected bridge method")
        return json.dumps(result)

    context.add_callable("python_bridge", bridge)
    context.eval(
        "function sendMessage(message) { const result = JSON.parse(python_bridge(JSON.stringify(message)));"
        " return message.method === 'http' ? Promise.resolve(result) : result; }"
    )
    context.eval(args.api_init.read_text())
    source = Path(__file__).resolve().parents[2] / "contrib/venera/talebook.js"
    context.eval(source.read_text() + "\nglobalThis.source = new TalebookSource();")
    context.eval("""
        globalThis.done = false;
        globalThis.failure = null;
        (async () => {
            const capability = Network.sensitiveRequestsVersion;
            Network.sensitiveRequestsVersion = undefined;
            let refused = false;
            try { await source.account.login('reader', 'test-only-password'); }
            catch (error) { refused = error.message.includes('隐私补丁'); }
            if (!refused) throw new Error('Original runtime did not refuse login');
            Network.sensitiveRequestsVersion = capability;
            await source.account.login('reader', 'test-only-password');
            source.saveData('account', ['reader', 'test-only-password']);
            const list = await source.explore[0].loadNext(null);
            if (list.comics.length !== 1) throw new Error('Invalid comic list');
            const details = await source.comic.loadInfo('1');
            if (details.chapters.full !== '完整漫画') throw new Error('Invalid chapters');
            const pages = await source.comic.loadEp('1', 'full');
            if (pages.images.length !== 2 || !pages.images[0].endsWith('/0?revision=r')) {
                throw new Error('Invalid page ordering or token stripping');
            }
            if (!source.comic.onImageLoad(pages.images[0]).sensitive) throw new Error('Unsafe image config');
            globalThis.done = true;
        })().catch(error => { globalThis.failure = error.message; });
        """)
    for _ in range(1000):
        if not context.execute_pending_job():
            break
    assert context.eval("failure") is None, context.eval("failure")
    assert context.eval("done") is True, "Async source hooks did not complete"
    assert len(requests) == 8, "Unexpected requests (including unpatched-runtime requests)"
    print("QuickJS: official API import, privacy gate, auth, browse, details, chapter, pages: PASS")


if __name__ == "__main__":
    main()
