#!/usr/bin/env python3
"""统计前端页面里「useAsyncData + watch 回填 ref」这一 SSR 不安全模式的使用情况。

该模式在服务端渲染时 watch 回调不会于渲染前触发，导致 SSR 输出空内容、
客户端首帧有内容，触发 hydration mismatch。
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PAGES = ROOT / "app" / "pages"

rows = []
for path in sorted(PAGES.rglob("*.vue")):
    src = path.read_text(encoding="utf-8", errors="replace")
    has_async = "useAsyncData" in src
    has_watch = re.search(r"watch\(\s*\(\)\s*=>\s*\w+Data", src) or re.search(
        r"watch\(\s*\(\)\s*=>\s*\w+\.value", src
    )
    # 是否把结果写进 ref（而非直接用 data）
    writes_ref = re.search(r"watch\([^)]*\)\s*=>\s*\{[^}]*\.value\s*=", src, re.S)
    if has_async and has_watch and writes_ref:
        rel = path.relative_to(ROOT).as_posix()
        rows.append(rel)

print(f"命中「useAsyncData + watch 回填 ref」的页面: {len(rows)}")
for r in rows:
    print("  " + r)