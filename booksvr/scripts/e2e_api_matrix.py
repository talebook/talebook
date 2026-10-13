"""带登录态的接口矩阵探测：先登录拿 cookie，再逐条请求。"""

import json
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8080"

CASES = [
    ("GET", "/api/welcome", None),
    ("GET", "/api/site/info", None),
    ("GET", "/api/recent", None),
    ("GET", "/api/hot", None),
    ("GET", "/api/book/7", None),
    ("GET", "/api/book/7/reader-bootstrap", None),
    ("GET", "/api/book/7/versions", None),
    ("GET", "/api/category/author", None),
    ("GET", "/api/category/publisher", None),
    ("GET", "/api/category/tag", None),
    ("GET", "/api/category/series", None),
    ("GET", "/api/category/rating", None),
    ("GET", "/api/category/format", None),
    ("GET", "/api/author", None),
    ("GET", "/api/publisher", None),
    ("GET", "/api/tag", None),
    ("GET", "/api/series", None),
    ("GET", "/api/rating", None),
    ("GET", "/api/format", None),
    ("GET", "/api/search?query=%E7%BA%A2%E6%98%9F", None),
    ("GET", "/api/scan/status", None),
    ("GET", "/api/scan/list", None),
    ("GET", "/api/admin/book/list?num=10&page=1", None),
    ("GET", "/api/admin/trash", None),
    ("GET", "/api/admin/trash/size", None),
    ("GET", "/api/admin/user/list", None),
    ("GET", "/api/admin/settings", None),
    ("GET", "/api/admin/log", None),
    ("GET", "/api/user/info", None),
    ("GET", "/api/user/messages", None),
    ("GET", "/api/reader/state", None),
    ("GET", "/api/plugins", None),
    ("GET", "/api/booksource/list", None),
    ("GET", "/api/network/list", None),
    ("GET", "/api/theme/list", None),
    ("GET", "/api/opds/sources", None),
    ("GET", "/api/audiobook/list", None),
    ("GET", "/api/comic/list", None),
    ("GET", "/api/annotation/list", None),
    ("GET", "/api/social/list", None),
]


def call(method, path, body=None, cookie=None):
    url = BASE + path
    data = None
    headers = {}
    if body is not None:
        data = urllib.parse.urlencode(body).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), resp.headers.get("Set-Cookie", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e), ""


def main():
    status, raw, cookie = call(
        "POST",
        "/api/user/login",
        {"username": "e2e_admin", "password": "AdminPass123", "remember": "true"},
    )
    print(f"login: {status} {raw[:120]}")
    cookie = cookie.split(";")[0] if cookie else ""
    print(f"cookie: {cookie[:40]}...")
    print()

    ok = 0
    bad = []
    for method, path, body in CASES:
        status, raw, _ = call(method, path, body, cookie)
        err = ""
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                err = parsed.get("err", "")
        except Exception:  # noqa: BLE001
            err = "<non-json>"
        flag = "OK "
        if status in (502, 0) or status >= 500:
            flag = "GAP"
            bad.append((method, path, status, err))
        else:
            ok += 1
        print(f"{flag} {status:3d} {err:28s} {method} {path}")

    print()
    print(f"通过 {ok}/{len(CASES)}；问题 {len(bad)} 条")
    for m, p, s, e in bad:
        print(f"  {s} {e} {m} {p}")


if __name__ == "__main__":
    main()