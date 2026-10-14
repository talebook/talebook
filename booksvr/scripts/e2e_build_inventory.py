#!/usr/bin/env python3
"""生成端到端测试的权威清单。

输入：
  - .local-e2e/routes.json     后端路由表（由 go test -run TestExportRouteTable 导出）
  - app/pages/**/*.vue         前端页面

输出：
  - .local-e2e/inventory.json  可复核的清单：每条路由展开成可调用的具体 URL

设计要点：
  - 正则 pattern 必须展开成真实 URL，否则无法"点击测试"。
  - 展开需要真实 id（书 id、用户 id 等），从运行中的后端探测得到。
  - 无法展开的 pattern 必须显式记录原因，不得静默跳过。
"""

import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ROUTES = ROOT / ".local-e2e" / "routes.json"
PAGES_DIR = ROOT / "app" / "pages"
OUT = ROOT / ".local-e2e" / "inventory.json"

# 正则捕获组的替换值。key 是捕获组内容（去掉括号后的字面量），
# value 是替换成的具体值。这些值来自真实测试库。
# 捕获组内容 -> 替换值。按 key 长度降序匹配，避免短模式先命中。
GROUP_VALUES = {
    # 分类名
    "author|publisher|tag|rating|series|format": "publisher",
    # 插件 id（内置插件 id 形如 zh-converter / epub-beautify）
    "[a-z0-9.-]+": "zh-converter",
    # 插件能力名
    "[a-z0-9_]+": "search",
    # 连接动作
    "test|preview|run|retry|rollback": "test",
    # 数字 id
    "[0-9]+": "7",
    # 十六进制 session id
    "[a-f0-9]+": "0123456789abcdef",
    # 带扩展名的书籍文件（/api/book/7.EPUB）
    "[0-9]+\\..+": "7.EPUB",
    # 通配
    ".*": "人民文学出版社",
}

# 明确不测的路由：pattern -> 原因
SKIP_REASONS = {
    "/(.*)": "StaticFileHandler，由 Nginx 服务前端 SPA，后端不实现",
}


def _split_groups(pattern: str) -> list[str]:
    """拆出 pattern 里的顶层捕获组内容（不含外层括号）。

    支持嵌套：/api/plugins/([a-z0-9.-]+)/features/([a-z0-9_]+) ->
      ['[a-z0-9.-]+', '[a-z0-9_]+']
    """
    groups = []
    depth = 0
    start = -1
    for i, ch in enumerate(pattern):
        if ch == "(":
            if depth == 0:
                start = i + 1
            depth += 1
        elif ch == ")":
            depth -= 1
            if depth == 0 and start >= 0:
                groups.append(pattern[start:i])
                start = -1
    return groups


def expand_pattern(pattern: str) -> tuple[str | None, str]:
    """把 Tornado 风格 pattern 展开成可调用的具体 URL。

    返回 (url, reason)；url 为 None 时 reason 说明为什么无法展开。
    """
    if pattern in SKIP_REASONS:
        return None, SKIP_REASONS[pattern]

    url = pattern
    # 逐个替换顶层捕获组。按内容长度降序，避免短模式先命中长模式的一部分。
    for group in sorted(_split_groups(pattern), key=len, reverse=True):
        value = GROUP_VALUES.get(group)
        if value is None:
            return None, f"未登记捕获组取值: ({group})"
        url = url.replace("(" + group + ")", value, 1)

    if "(" in url or ")" in url:
        return None, f"无法展开的捕获组: {url}"
    return url, ""


def collect_pages() -> list[dict]:
    """收集前端页面路由。"""
    pages = []
    for path in sorted(PAGES_DIR.rglob("*.vue")):
        rel = path.relative_to(PAGES_DIR).with_suffix("")
        parts = list(rel.parts)
        # index.vue -> 目录本身
        if parts and parts[-1] == "index":
            parts = parts[:-1]
        route = "/" + "/".join(parts) if parts else "/"
        # 动态段替换成真实值
        route = re.sub(r"\[bid\]", "7", route)
        route = re.sub(r"\[aid\]", "1", route)
        route = re.sub(r"\[jid\]", "1", route)
        route = re.sub(r"\[id\]", "1", route)
        route = re.sub(r"\[meta\]", "publisher", route)
        route = re.sub(r"\[name\]", "人民文学出版社", route)
        pages.append({
            "route": route,
            "source": str(path.relative_to(ROOT)).replace("\\", "/"),
            "dynamic": "[" in str(rel),
        })
    # 去重（同一路由可能由多个文件产生）
    seen = {}
    for p in pages:
        seen.setdefault(p["route"], p)
    return sorted(seen.values(), key=lambda p: p["route"])


def collect_apis() -> list[dict]:
    """收集后端 API 路由并展开成具体 URL。"""
    routes = json.loads(ROUTES.read_text(encoding="utf-8"))
    apis = []
    for r in routes:
        pattern = r["pattern"]
        if not pattern.startswith("/api/"):
            continue
        url, reason = expand_pattern(pattern)
        apis.append({
            "pattern": pattern,
            "url": url,
            "handler": r.get("handler", ""),
            "methods": r.get("methods", []),
            "skipped_reason": reason,
        })
    return apis


def main() -> int:
    if not ROUTES.exists():
        print(f"缺少路由表 {ROUTES}，先运行：", file=sys.stderr)
        print("  cd booksvr && TALEBOOK_ROUTE_DUMP=../.local-e2e/routes.json "
              "go test ./internal/httpapi/ -run TestExportRouteTable", file=sys.stderr)
        return 1

    pages = collect_pages()
    apis = collect_apis()
    skipped = [a for a in apis if a["url"] is None]

    inventory = {
        "pages": pages,
        "apis": apis,
        "summary": {
            "page_count": len(pages),
            "api_count": len(apis),
            "api_callable": len(apis) - len(skipped),
            "api_skipped": len(skipped),
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(inventory, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"页面: {len(pages)}")
    print(f"API:  {len(apis)}（可调用 {len(apis) - len(skipped)}，跳过 {len(skipped)}）")
    for s in skipped:
        print(f"  跳过 {s['pattern']}: {s['skipped_reason']}")
    print(f"已写入 {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())