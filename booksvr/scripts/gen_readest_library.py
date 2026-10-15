"""从 reader.html 生成 library.html。

Readest 是 Next.js 静态导出，其「关闭书籍 / 回库」会执行
router.replace("/library")；因为 assetPrefix=/readest，解析成
/readest/library。但导出产物里只有 reader.html，没有 library.html，
该路径会落到 Nuxt 的 catch-all，返回 Nuxt 应用壳，其 CSP 拦掉
Readest 的内联启动脚本，导致空白页。

library 视图本身就在 reader 的 chunk 里（Library 出现 59 次），
所以 library.html 复用 reader.html 的完整资源清单，只把
__NEXT_DATA__ 的 page 从 /reader 改成 /library。
"""

import json
import re
import sys
from pathlib import Path

READEST = Path("app/public/readest")
# newline="" 保留原始换行，避免 Windows 下把 \n 写成 \r\n。
# Path.read_text 在 Python < 3.13 不支持 newline，故用 open。
with open(READEST / "reader.html", encoding="utf-8", newline="") as fh:
    src = fh.read()

m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', src, re.S)
if not m:
    sys.exit("reader.html 里找不到 __NEXT_DATA__")

data = json.loads(m.group(1))
if data.get("page") != "/reader":
    sys.exit(f"预期 page=/reader，实际 {data.get('page')!r}")

data["page"] = "/library"
new_script = '<script id="__NEXT_DATA__" type="application/json">' + json.dumps(
    data, ensure_ascii=False, separators=(",", ":")
) + "</script>"

out = src[: m.start()] + new_script + src[m.end():]
out = out.replace("<title data-next-head=\"\">Readest</title>",
                  "<title data-next-head=\"\">Readest 书架</title>", 1)

# 页面 chunk 保持 reader 不变："/library" 的注册就写在 reader chunk 里
# （见 gen_readest_library_chunk.py），因为页面模块 3337 是它的局部模块，
# 外部 chunk 拿不到。这里只改 __NEXT_DATA__.page 与标题。
#
# 另外必须在所有 Next 脚本之前插入 talebook-library-entry.js：
# main-*.js 里的 initialize() 会消费 __NEXT_P 并把它换成 onEntrypoint
# 处理器，晚注册会让 hydrate 的 whenEntrypoint("/library") 永远待决，
# 路由不初始化（实测 window.next.router 恒为 undefined）。
entry_tag = '<script src="/readest/talebook-library-entry.js"></script>'
if entry_tag not in out:
    first = out.find("<script")
    if first < 0:
        sys.exit("library.html 里找不到 script 标签")
    out = out[:first] + entry_tag + out[first:]

with open(READEST / "library.html", "w", encoding="utf-8", newline="") as fh:
    fh.write(out)
print(f"已生成 library.html（{len(out)} 字节），page=/library")