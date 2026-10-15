"""为 Readest 注册 /library 页面路由（就地改 reader chunk）。

## 为什么需要这个

Readest 是 Next.js 静态导出，导出产物里只有 /reader 一个页面：

    _buildManifest.sortedPages = ["/_app", "/_error", "/reader"]

Next 的客户端路由靠页面 chunk 里的 `window.__NEXT_P` 注册解析组件：

    // reader-c6d019d0aa9c213f.js
    9920: (e,t,r) => {
      (window.__NEXT_P = window.__NEXT_P || []).push(["/reader", () => r(3337)])
    }

路由拿到 `__NEXT_DATA__.page` 后去 `components[page]` 找组件，找不到就
不挂载 —— 这是 /library 空白页的直接原因（`#__next` 子节点 0，控制台无报错）。

## 为什么不能另建一个 chunk

模块 3337 是 reader chunk 的**局部模块**，外部 chunk 拿不到它
（实测报 `Cannot read properties of undefined (reading 'call')`）。
所以必须在 reader chunk 内部追加一条 `"/library"` 注册，
复用同一个模块 3337 —— library 视图本来就在这个模块里。

脚本幂等：已注册就跳过。
"""

import re
import sys
from pathlib import Path

READEST = Path("app/public/readest")
CHUNKS = READEST / "_next/static/chunks/pages"

readers = sorted(CHUNKS.glob("reader-*.js"))
if len(readers) != 1:
    sys.exit(f"预期恰好 1 个 reader chunk，实际 {len(readers)}")
reader = readers[0]

# newline="" 必须保留：这些是压缩过的单行 JS，Windows 下默认会把
# 写入时的 \n 变成 \r\n，把整个 chunk 弄坏（实测会多出 1474 个 CRLF，
# 导致模块 9920 注册失败、router 不初始化）。
# Path.read_text 在 Python < 3.13 不支持 newline，故用 open。
with open(reader, encoding="utf-8", newline="") as fh:
    src = fh.read()

if '["/library"' in src:
    print("reader chunk 已注册 /library，跳过")
    sys.exit(0)

# 定位 /reader 的注册，取出模块 id。
pat = re.compile(r'\["/reader",function\(\)\{return r\((\d+)\)\}\]')
m = pat.search(src)
if not m:
    sys.exit("reader chunk 里找不到 /reader 的页面注册")
module_id = m.group(1)

# 在同一个 push 里追加 /library，复用同一模块。
# 同时把模块工厂挂到 window，供 talebook-library-entry.js 在 main 之前
# 同步注册（main 的 initialize 会消费 __NEXT_P，晚注册会让 hydrate 的
# whenEntrypoint 永远待决，router 不初始化）。
# 工厂是惰性的：onEntrypoint 到 hydrate 时才调用它，那时本 chunk 已执行完。
old = m.group(0)
new = (
    old
    + f',["/library",function(){{return r({module_id})}}]'
    + f',window.__TALEBOOK_LIBRARY_PAGE__=function(){{return r({module_id})}}'
)
src = src.replace(old, new, 1)
with open(reader, "w", encoding="utf-8", newline="") as fh:
    fh.write(src)
print(f"已在 {reader.name} 内注册 /library（复用模块 {module_id}）")

# manifest：/library 指向 reader chunk 本身，并补进 sortedPages。
manifests = list((READEST / "_next/static").glob("*/_buildManifest.js"))
if len(manifests) != 1:
    sys.exit(f"预期恰好 1 个 _buildManifest.js，实际 {len(manifests)}")
mpath = manifests[0]
with open(mpath, encoding="utf-8", newline="") as fh:
    msrc = fh.read()

rel = f"static/chunks/pages/{reader.name}"
m2 = re.search(r'"/reader":(\[[^\]]*\])', msrc)
if not m2:
    sys.exit("manifest 里找不到 /reader 条目")
reader_list = m2.group(1)

if '"/library":' in msrc:
    msrc = re.sub(r'"/library":\[[^\]]*\]', f'"/library":{reader_list}', msrc, count=1)
else:
    msrc = msrc.replace('"/reader":' + reader_list,
                        f'"/library":{reader_list},"/reader":' + reader_list, 1)

m3 = re.search(r"sortedPages:(\[[^\]]*\])", msrc)
if not m3:
    sys.exit("manifest 里找不到 sortedPages")
pages = m3.group(1)
if '"/library"' not in pages:
    msrc = msrc.replace("sortedPages:" + pages,
                        "sortedPages:" + pages.replace('"/reader"', '"/library","/reader"', 1), 1)

with open(mpath, "w", encoding="utf-8", newline="") as fh:
    fh.write(msrc)
print(f"已把 /library 接入 {mpath.name}")