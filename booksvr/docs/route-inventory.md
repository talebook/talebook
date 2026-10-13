# 213 条路由键依赖盘点（实施项 1）

> 产出时间：2026-10-09
> 对应方案：`design/booksvr/20261007-calibre-go-rewrite.wip.html`
> 计划文件：`plans/2026-10-07-calibre-go-rewrite.md` 实施项 1

## 1. 结论摘要

| 项 | 计划预期 | 实测 | 差异 |
|---|---|---|---|
| 路由总数 | 213 | **215** | **+2** |
| 以 `book_id` 为键 | 绝大多数 | 193 | — |
| 以 `books.path` 家族为键 | 计划要求「若发现则停止」 | **发现 22 条** | **触发停止条件** |
| 以 `available_formats` 字符串为键 | 计划要求「若发现则停止」 | **发现 2 条** | **触发停止条件** |

**两个必须回到设计确认的发现：**

1. **路由总数是 215，不是 213。** 计划的「213」口径不准确。
2. **存在以 `books.path` 家族（`fmt_<format>` 路径键）为键的路由，共 22 条。** 这正是计划实施项 1 验证条款中写明的停止条件：

   > 若发现以 `books.path` 或 `available_formats` 字符串为键的路由，**停止并说明**，不要自行猜测兼容策略。

---

## 2. 路由总数：215（非 213）

### 2.1 组成

路由在 `webserver/main.py:270-273` 组装：

```python
theme_routes = [(r"/static/themes/(.*)", web.StaticFileHandler, {"path": themes_path})]
app = web.Application(
    theme_routes + social_routes.SOCIAL_AUTH_ROUTES + handlers.routes(),
    **app_settings,
)
```

| 来源 | 条数 |
|---|---|
| `theme_routes`（`main.py:270`） | 1 |
| `social_routes.SOCIAL_AUTH_ROUTES`（`social_routes.py:32-41`） | 4 |
| `handlers.routes()`（`handlers/__init__.py:29-50`） | 210 |
| **合计** | **215** |

### 2.2 `handlers.routes()` 的 210 条按模块分布

| 模块 | 条数 |
|---|---|
| `handlers/book.py` | 38 |
| `handlers/plugins.py`（含 `plugin_booktools.routes()` 的 10 条） | 30 |
| `handlers/audiobook.py` | 27 |
| `handlers/admin.py` | 24 |
| `handlers/network_library.py` | 22 |
| `handlers/user.py` | 12 |
| `handlers/scan.py` | 11 |
| `handlers/booksource_admin.py` | 10 |
| `handlers/files.py` | 6 |
| `handlers/meta.py` | 5 |
| `handlers/opds.py` | 5 |
| `handlers/annotations.py` | 4 |
| `handlers/comic.py` | 4 |
| `handlers/captcha.py` | 3 |
| `handlers/network_comic.py` | 3 |
| `handlers/theme.py` | 3 |
| `handlers/upgrade.py` | 2 |
| `webdav/handler.py` | 1 |
| **合计** | **210** |

### 2.3 按路径前缀分布（215 条）

| 前缀 | 条数 |
|---|---|
| `/api/*` | 188 |
| `other` | 8 |
| `/opds*` | 5 |
| `/auth*` | 4 |
| `/get*` | 4 |
| `/read*` | 4 |
| `/books*`（WebDAV） | 1 |
| `/static*` | 1 |

### 2.4 为什么计划写 213

计划中的「213」来自设计阶段的估算，未逐条枚举。实测 215 条无重复 pattern（215 个唯一 pattern）。差异 2 条的可能来源：`plugin_booktools.routes()` 的 10 条是通过 `plugins.py:972` 的 `] + plugin_booktools.routes()` 拼接注册的，容易被漏算；`captcha.routes()` 在 `handlers/__init__.py:44` 是赋值给变量而非 `routes +=`，也容易被漏算。

**影响：** 验收标准「213 条既有路由的路径、方法、响应结构与 Python 版逐字段一致」应改为 **215 条**。这是口径修正，不改变设计。

---

## 3. 停止条件：以 `books.path` 家族为键的路由

### 3.1 根因

Calibre 的 `Cache.format_abspath(book_id, fmt)` 返回**基于 `books.path` 推导的绝对路径**。Talebook 把这个路径塞进 book dict 的 `fmt_<format>` 键：

```python
# webserver/webdav/dav_provider.py:203-216
"fmt_epub": None,
"fmt_azw3": None,
"fmt_mobi": None,
"fmt_pdf": None,
...
formats = self.provider.cache.formats(book_id, verify_formats=False)
for fmt in formats:
    fmt_lower = fmt.lower()
    if fmt_lower in SUPPORTED_FORMATS:
        fmt_path = self.provider.cache.format_abspath(book_id, fmt)
        if fmt_path:
            item[f"fmt_{fmt_lower}"] = fmt_path   # ← 路径作为键值
```

于是 `book["fmt_epub"]`、`book["fmt_azw3"]`、`book["fmt_pdf"]` 等**以格式名为键、以文件路径为值**，被大量 handler 直接读取。

### 3.2 受影响的 22 条路由

| 风险类型 | 路由 | Handler | 位置 |
|---|---|---|---|
| `available_formats` | `/api/book/([0-9]+)/media_type` | `BookSetMediaType` | `handlers/book.py:2949` |
| `available_formats` | `/api/book/([0-9]+)/delete_format` | `BookDeleteFormat` | `handlers/book.py:2956` |
| `available_formats` + path | `/api/book/([0-9]+)/separate` | `BookSeparate` | `handlers/book.py:2957` |
| path | `/api/book/([0-9]+\..+)` | `BookDownload` | `handlers/book.py:2950` |
| path | `/api/book/([0-9]+)/send_to_device` | `BookSendToDevice` | `handlers/book.py:2951` |
| path | `/api/book/([0-9]+)/mailto` | `BookSendToMail` | `handlers/book.py:2952` |
| path | `/api/book/upload` | `BookUpload` | `handlers/book.py:2942` |
| path | `/api/book/upload/chunk` | `BookUploadChunk` | `handlers/book.py:2943` |
| path | `/api/book/upload/complete` | `BookUploadComplete` | `handlers/book.py:2944` |
| path | `/api/book/txt/init` | `BookTxtInit` | `handlers/book.py:2963` |
| path | `/api/admin/opds/import/failed` | `AdminOPDSImportFailedList` | `handlers/admin.py:1480` |
| path | `/api/admin/opds/import/retry` | `AdminOPDSImportRetry` | `handlers/admin.py:1481` |
| path | `/api/admin/log` | `AdminSystemLog` | `handlers/admin.py:1486` |
| path | `/api/admin/log/download` | `AdminSystemLogDownload` | `handlers/admin.py:1487` |
| path | `/api/admin/booksource/seed` | `BookSourceSeed` | `handlers/booksource_admin.py:803` |
| path | `/api/admin/scan/list` | `ScanList` | `handlers/scan.py:596` |
| path | `/api/admin/scan/run` | `ScanRun` | `handlers/scan.py:597` |
| path | `/api/admin/import/settings` | `ImportSettings` | `handlers/scan.py:601` |
| path | `/api/admin/import/directory/list` | `ImportDirectoryList` | `handlers/scan.py:603` |
| path | `/get/pcover` | `ProxyImageHandler` | `handlers/files.py:188` |
| path | `/get/progress/([0-9]+)` | `ProgressHandler` | `handlers/files.py:189` |
| path | `/books/?(.*)` | `WebDAVHandler` | `webdav/handler.py:154` |

### 3.3 `fmt_<format>` 键的完整使用面

| 文件 | 命中数 | 关键行 |
|---|---|---|
| `handlers/book.py` | 16 | 262, 1113, 1116, 1758, 1778, 1791, 1803, 1821, 1849, 1935, 1963, 1991 |
| `webdav/dav_provider.py` | 9 | 53, 203-206, 708-711 |
| `plugins/push/kindle.py` | 2 | 61, 66 |
| `handlers/base.py` | 1 | 540 |
| `handlers/files.py` | 1 | 174 |
| `services/comic_archive.py` | 1 | 179 |
| `services/convert.py` | 1 | 175 |

### 3.4 关键代码证据

**`BookSeparate`（`handlers/book.py:2957`）** —— 直接以 `fmt_<format>` 为键取路径：

```python
fmt_key = "fmt_%s" % fmt
if fmt_key not in book:
    return {"err": "format.not_found", "msg": _("书籍不包含 %s 格式") % fmt.upper()}
original_path = book[fmt_key]
if not os.path.exists(original_path):
    return {"err": "file.missing", "msg": _("格式文件不存在: %s") % original_path}
```

**`BookDownload`（`handlers/book.py:2950`）** —— 从 URL 解析 `bid` 与 `fmt`，再取 `fmt_<format>` 路径：

```python
def parse_url_path(self, url_path: str) -> str:
    filename = url_path.split("/")[-1]
    bid, fmt = filename.split(".")
    fmt = fmt.lower()
    book = self.get_book_or_404(bid)
```

**`save_book_meta`（`handlers/base.py:540-545`）** —— 遍历固定格式列表，用 `fmt_<format>` 判断存在性：

```python
for f in ["epub", "azw3", "pdf"]:
    fmt_key = "fmt_%s" % f
    if fmt_key in book:
        if is_external_index_format(self.session, book_id, f):
            skipped_external_formats.append(f.upper())
            continue
        supported_formats.append((f, book[fmt_key]))
```

### 3.5 为什么这是「键依赖」而非「值依赖」

`fmt_<format>` 的**键是格式名**（稳定），**值是路径**（在旧模型下由 `books.path` 推导）。风险不在「值是不是路径」，而在：

1. **存在性判断依赖键**：`if fmt_key in book` 决定「这本书有没有该格式」。新模型下格式存在性来自 `book_formats` 表，需要保证 `fmt_<format>` 键的**存在性与取值语义**与旧版一致。
2. **`available_formats` 是字符串**：`BookSetMediaType`、`BookDeleteFormat`、`BookSeparate` 依赖它做格式枚举与校验，新模型需从 `book_formats` 重建该字符串。
3. **路径语义变化**：旧值 = `books.path` 推导的相对书库根目录路径；新值 = `book_formats.path` 绝对路径。若下游有代码假设「路径在书库根目录内」，会失效。

---

## 4. 兼容策略（**待设计确认，不自行决定**）

计划明确要求「停止并说明，不要自行猜测兼容策略」。以下仅为**候选方向**，需回到设计确认后才可实施：

| 候选 | 做法 | 代价 |
|---|---|---|
| A. 兼容层重建 `fmt_<format>` | 在 `httpapi/compat.go` 的 `FormatBook` 中，从 `book_formats` 重建 `fmt_<format>` 键，值填 `book_formats.path` 绝对路径 | 需逐条核对 22 条路由对路径语义的假设 |
| B. 保留 `books.path` 派生 | 继续用 `books.path` 推导路径，`book_formats.path` 仅作新接口使用 | 未真正摆脱「文件系统即数据库」，与目标冲突 |
| C. 逐路由改造 | 把 22 条路由改为直接查 `book_formats` | 改动面大，且 `webserver/` 侧代码需同步改，超出「前端零改动」但仍在后端范围内 |

**倾向 A**（最小改动、保持 215 条路由响应结构不变），但**必须经设计确认**。

---

## 5. 验收口径修正建议

| 原验收标准 | 建议修正 |
|---|---|
| 「213 条既有路由的路径、方法、响应结构与 Python 版逐字段一致」 | 改为 **215 条** |
| 「清单条目数 = 213」 | 改为 **215** |
| 「非 `book_id` 键路由全部列出并有适配说明」 | 已列出 22 条，**适配策略待设计确认** |

---

## 6. 复现方式

盘点脚本（临时，位于 `scripts/`，实施完成后删除）：

```bash
python scripts/_tmp_route_inventory.py > .qagent/routes.tsv
python scripts/_tmp_route_risk.py
python scripts/_tmp_fmt_usage.py
```

`_tmp_route_inventory.py` 解析 `handlers/__init__.py` 的真实注册顺序，递归解析 `] + other.routes()` 拼接，并补上 `main.py` 的 `theme_routes` 与 `social_routes.SOCIAL_AUTH_ROUTES`。