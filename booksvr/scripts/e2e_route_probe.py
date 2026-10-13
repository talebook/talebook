"""按权威路由表逐条探测 Go 侧接口，找出真正未实现（502）的路径。

路由表来自 booksvr/internal/httpapi/routes.go 的 registeredRoutes，
由 Go 侧导出为 JSON，避免手工猜测路径。
"""

import json
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = "http://127.0.0.1:8080"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """不跟随重定向。

    后端很多接口用 302 跳转（如 /api/done/ 登录后跳 /），
    跟随重定向会请求到前端 SPA 路由（由 Nginx 服务，Go 侧不实现），
    从而误报 502。
    """

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_OPENER = urllib.request.build_opener(NoRedirect)


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
        with _OPENER.open(req, timeout=15) as resp:
            return resp.status, resp.read().decode("utf-8", "replace"), resp.headers.get("Set-Cookie", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace"), ""
    except Exception as e:  # noqa: BLE001
        return 0, str(e), ""


def main():
    routes = json.load(open(sys.argv[1], encoding="utf-8"))

    # Python 版的登录路由是 /api/user/sign_in（不是 /api/user/login）。
    status, raw, cookie = call(
        "POST",
        "/api/user/sign_in",
        {"username": "e2e_admin", "password": "AdminPass123", "remember": "true"},
    )
    print(f"login: {status} {raw[:100]}")
    cookie = cookie.split(";")[0] if cookie else ""
    print(f"cookie: {cookie[:40]}")

    gaps = []
    checked = 0
    for r in routes:
        pattern = r["pattern"]
        # 跳过静态兜底与含通配的复杂路径，只测能直接构造的。
        if pattern in ("/(.*)", "/logo/(.*)", "/static/themes/(.*)"):
            continue
        # 把正则参数替换成样本值。
        # 注意：必须保留 pattern 自带的尾斜杠（如 /api/done/），
        # 否则会请求到不存在的路径并误报 502。
        path = pattern
        path = path.replace("([0-9]+)", "7")
        path = path.replace("(.*)", "test")
        path = path.replace("([a-zA-Z0-9_]+)", "test")
        if "(" in path or ")" in path or "?" in path:
            continue
        # 只探测 Nginx 会转发给后端的路径前缀。
        # 其余（/、/book/... 等前端 SPA 路由）由 Nginx 直接服务，
        # 后端不实现，探测它们会误报。
        if not path.startswith(("/api/", "/opds", "/get/", "/read/", "/auth/", "/books")):
            continue

        checked += 1
        status, raw, _ = call("GET", path, None, cookie)
        # 502 = 回落到未启动的 Python 上游，即 Go 侧未实现。
        # 5xx 其他 = 实现有缺陷。
        if status in (502, 0) or status >= 500:
            gaps.append((path, r["handler"], status))
            print(f"GAP {status:3d} {r['handler']:32s} {path}")

    print()
    print(f"探测 {checked} 条后端路由；缺口 {len(gaps)} 条")
    for p, h, s in gaps:
        print(f"  {s} {h} {p}")


if __name__ == "__main__":
    main()