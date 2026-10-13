"""逐条请求真实注册的管理端/主题 GET 路由，记录 err。

用法：python3 e2e_admin_sweep.py <base> <cookiejar>

路径全部取自 booksvr/internal/httpapi/routes.go 中真实注册的 pattern，
不使用臆测路径（臆测路径会落到兜底代理，产生假阳性）。
"""
import json
import subprocess
import sys

base = sys.argv[1]
jar = sys.argv[2]

PATHS = [
    # 主题（真实路径是 /api/themes*，不是 /api/admin/themes*）
    "/api/themes",
    "/api/themes/active",
    # 扫描 / 导入
    "/api/admin/scan/list",
    "/api/admin/scan/status",
    "/api/admin/import/status",
    "/api/admin/import/settings",
    "/api/admin/import/watch/status",
    "/api/admin/import/directory/list",
    # 图书 / 用户 / 设置
    "/api/admin/book/list",
    "/api/admin/users",
    "/api/admin/settings",
    "/api/admin/log",
    # 插件
    "/api/admin/plugins",
    "/api/admin/plugins/connections",
    # 书源
    "/api/admin/booksource/list",
    "/api/admin/booksource/export",
    # 有声书 / OPDS
    "/api/admin/audio-stats",
    "/api/admin/opds/sources",
    "/api/admin/opds/import/status",
]

ok = 0
errs = []
for p in PATHS:
    try:
        out = subprocess.run(
            ["curl", "-sS", "-b", jar, "--max-time", "20", base + p],
            capture_output=True, text=True, timeout=30).stdout
    except Exception as exc:  # noqa: BLE001
        errs.append((p, "curl-failed", str(exc)))
        print("  %-42s CURL-FAIL %s" % (p, exc))
        continue
    try:
        data = json.loads(out)
        e = data.get("err")
    except Exception:  # noqa: BLE001
        e = "NON-JSON"
        data = {}
    if e == "ok":
        ok += 1
        print("  %-42s ok" % p)
    else:
        msg = str(data.get("msg", ""))[:70]
        errs.append((p, e, msg))
        print("  %-42s err=%s msg=%s" % (p, e, msg))

print()
print("SUMMARY: ok=%d err=%d total=%d" % (ok, len(errs), len(PATHS)))
if errs:
    print("FAILED:")
    for p, e, m in errs:
        print("   %s -> %s %s" % (p, e, m))