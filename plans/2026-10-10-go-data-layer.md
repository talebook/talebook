# 阶段 3：Go 数据访问层 —— 为搬 handler 建基础设施

> 本文件是**阶段 3 的可执行计划**，含 TDD 步骤。
>
> **上游依据：** `plans/2026-10-10-backend-go-migration-roadmap.md`（总纲级路线图）。
>
> **⚠️ 本计划是路线修正后的版本。** 原「让 Python 换个方式读库」的方案已作废（用户否决：「为什么还要python？」）。本计划**不碰 Python 的数据访问代码**。

---

## User Request

**原始需求（用户原话）：**

> 我的目标从来都是替换 calibre，整个 talebook 的后端换成 go 的 booksvr 呀

**用户 2026-10-10 追问（触发路线修正）：**

> 我要你全改完，怎么还有215个反向代理给tornado呢？

> **为什么还要python？**

**用户 2026-10-10 确认的推进方式：**

> **A 跳过阶段 3（原定义），直接搬 handler**

**修正后的阶段 3 定义（用户确认）：**

> **B 阶段 3 重定义为「Go 数据层」，不碰 Python**

即：在 Go 里把数据访问层建完整（读+写），作为搬 handler 的基础设施。**Python 侧的数据访问代码不优化、不改造，随阶段 6 的 handler 搬迁一起删除。**

---

## Goal

在 Go 里实现完整的数据访问层，覆盖 Calibre `LibraryDatabase` 的实测调用面，供阶段 6 的 handler 直接使用：

1. **读接口**：批量取书数据、分类查询、搜索、字段元信息、封面、格式路径。
2. **写接口**：导入、删除、加格式、设标签。
3. **搜索语法**：复刻 Calibre 查询语法（用户决策 2）。
4. **回收站**：Go 直接读 `.caltrash` 目录（用户决策 3）。
5. **契约测试**：与 Calibre 的查询结果逐条一致。

**本阶段完成后：** Go 侧具备搬 handler 所需的全部数据能力；**Python 代码一行未改**。

---

## Non-Goals

- **不修改任何 Python 代码。** 这是本次路线修正的核心。
- **不实现 handler。** 属阶段 6。
- **不实现元数据文件解析**（`get_metadata` 从 epub/mobi 读元数据）。属阶段 4。
- **不实现元数据源插件。** 属阶段 5。
- **不删除 Calibre 运行时。** 属阶段 7。
- **不改变对外 HTTP API 契约。**

---

## Current Codebase Facts

> 以下全部为 2026-10-10 实测核实，非推测。

### `self.db` 调用面（实测频次）

| 方法 | 次数 | 类别 |
|---|---|---|
| `get_data_as_dict` | 12 | 读 |
| `get_metadata` | 11 | 读（DB 部分） |
| `field_metadata` | 8 | 读 |
| `get_books_for_category` | 6 | 读 |
| `add_format` | 5 | **写** |
| `search_getting_ids` | 4 | 读 |
| `cover` | 4 | 读 |
| `get_categories` | 4 | 读 |
| `new_api` | 4 | 读 |
| `import_book` | 4 | **写** |
| `last_modified` | 4 | 读 |
| `format_abspath` | 3 | 读 |
| `books_with_same_title` | 3 | 读 |
| `data` | 2 | 读 |
| `delete_book` | 2 | **写** |
| `set_tags` | 2 | **写** |
| `prefs` / `all_book_ids` / `cover_last_modified` / `FIELD_MAP` / `has_id` / `sort` | 各 1 | 读 |

**读 17 个、写 4 个。**

### `self.cache`（`new_api`）调用面

`search`(8)、`backend`(7)、`get_metadata`(6)、`field_for`(5)、`get_item_id`(5)、`all_field_names`(2)、`all_book_ids`/`field_metadata`/`format_abspath`/`formats`/`get_categories`/`get_item_name_map`/`invalidate`/`search_for_books`(各 1)。

### 搜索语法的实际使用（实测）

| 位置 | 语法 |
|---|---|
| `book.py:1197` | `publisher:'{publisher}'` |
| `book.py:1201` | `author:'{author}'` |
| `book.py:1205` | `tag:'{tag}'` |
| `opds.py:699` | `search:"{which}"` |
| `base.py:669` | `(query or "").strip()` —— 前端搜索框，**语法未知** |
| `book.py:1227` | `self.cache.search(name)` —— 全文搜索 |
| `admin.py:909,952`、`book.py:134`、`opds.py:522` | `self.cache.search("")` —— 空查询=全部 |

### 回收站

| 事实 | 位置 |
|---|---|
| 回收站目录 | `trash_manager.py:21`：`TRASH_PATH = os.path.join(CONF["with_library"], ".caltrash")` |
| **实际目录结构（实测）** | `.caltrash/b/<book_id>/` —— 注意中间有 `b` 子目录（`_book_trash_path` 用 `os.path.join(trash_root, "b")`） |
| 目录内容 | `cover.jpg`、`metadata.opf`、`annotations.json` 与各格式文件（`_trash_book_formats` 排除前三个与无扩展名文件） |
| 路径穿越防护 | `_book_trash_path` 用 `os.path.commonpath` 校验，Go 侧必须复刻 |
| 依赖 Calibre API | `trash_manager.py:121,143,172,180`：`cache.list_trash_entries()` / `cache.delete_trash_entry()` / `cache.move_book_from_trash()` |
| 上传回收站 | `trash_manager.py:22`：`UPLOAD_TRASH_PATH = CONF["upload_path"]` |

### 新 schema（第一阶段已建）

`works`（作品层）、`books`（版本层，扩展 4 列）、`book_formats`（格式层）+ 5 个索引。

### 现有 Go `library` 包能力

`FindOrCreateWork`、`GetWork`、`ListVersions`、`FindOrCreateEdition`、`GetBookWorkID`、`SetBookWorkID`、`RegisterFormat`、`ResolvePath`、`ListFormats`、`NormalizeFormatName`、`GroupFile`、`MergeBooks`、`SplitBook`、`Migrate`。

**缺口：** 没有「批量取书数据」「分类查询」「搜索」「字段元信息」「封面」「回收站」等接口。

### Calibre 书库表结构（实测）

`authors`、`books`、`books_authors_link`、`books_languages_link`、`books_plugin_data`、`books_publishers_link`、`books_ratings_link`、`books_series_link`、`books_tags_link`、`comments`、`conversion_options`、`custom_columns`、`data`、`feeds`、`identifiers`、`languages`、`library_id`、`metadata_dirtied`、`annotations_dirtied`、`preferences`、`publishers`、`ratings`、`series`、`tags`。

### 搬 handler 的依赖分布（实测，决定阶段 6 顺序）

| 文件 | 行数 | `self.db`/`self.cache` 用法 | `import calibre` |
|---|---|---|---|
| `theme.py` | 138 | 0 | 0 |
| `captcha.py` | 168 | 0 | 0 |
| `network_comic.py` | 149 | 0 | 0 |
| `comic.py` | 289 | 0 | 0 |
| `annotations.py` | 425 | 0 | 0 |
| `scan.py` | 573 | 0 | 0 |
| `plugin_booktools.py` | 583 | 0 | 0 |
| `booksource_admin.py` | 701 | 0 | 0 |
| `plugins.py` | 885 | 0 | 0 |
| `admin_opds_sources.py` | 138 | 0 | 0 |
| `network_library.py` | 344 | 0 | 0 |
| `upgrade.py` | 78 | 0 | 0 |
| `user.py` | 494 | 2 | 0 |
| `audiobook.py` | 1614 | 2 | 0 |
| `files.py` | 159 | 4 | 2 |
| `admin.py` | 1271 | 5 | 0 |
| `meta.py` | 243 | 14 | 0 |
| `opds.py` | 679 | 16 | 9 |
| `base.py` | 696 | 16 | 2 |
| `book.py` | 2620 | 24 | 3 |

**关键发现：** 12 个文件**完全不依赖** `self.db`/`self.cache`，它们用 `self.session`（SQLAlchemy 用户库）访问数据。这些是阶段 6 的**第一批搬迁对象**。

---

## Proposed Design

### 总体策略

**在 Go 里建完整数据层，Python 一行不改。**

```
现状：  Python handler ──► self.db (Calibre) ──► SQLite
阶段 3：Go library 包 ──► SQLite（读+写，完整能力）   ← 本阶段只做这个
阶段 6：Go handler ──► Go library 包                  ← 逐条搬，搬完删 Python
```

### 关键设计点

#### 1. 数据层形态：纯 Go 包，不引入 HTTP

数据层是 `booksvr/internal/library` 包的扩展，**不是** HTTP API。理由：

- 阶段 6 的 handler 是 Go 代码，直接调包即可，无需 HTTP 一跳。
- 原「内部 API」设计是为 Python 服务的——但 Python 注定要删，不需要。

#### 2. 搜索语法复刻（用户决策 2）

分三步：

- **Step A（必做）：** 实测被调用的语法——`publisher:'x'`、`author:'x'`、`tag:'x'`、`search:"x"`、空查询、全文搜索。
- **Step B（必做）：** 补齐 `series:`/`rating:`/`format:`/`title:`、比较符（`:=`/`:<`/`:>`）、布尔（`and`/`or`/`not`）、括号分组。
- **Step C（记录为已知缺口）：** 正则（`~`）、虚拟书库、`custom_columns` 高级查询——若工作量超预期，如实记录为未实现。

#### 3. 回收站（用户决策 3）

Go 直接读 `.caltrash` 目录：

- **列出：** 扫描 `.caltrash/<book_id>/`，读 `metadata.opf` 补标题/作者，算目录大小，列出格式。
- **恢复：** 文件移回书库目录 + 更新 `book_formats` + 从 `metadata.opf` 恢复 `books` 行。
- **永久删除：** 删目录。

#### 4. 字段元信息

Calibre 从 `custom_columns` 表 + 内置字段表构造。Go 侧复刻**静态内置字段表** + 动态读 `custom_columns`。

#### 5. 写接口

`import_book`、`delete_book`、`add_format`、`set_tags`——直接写 SQLite（新 schema + Calibre 表）。

---

## Planned File Structure

### 新增文件

| 文件 | 职责 |
|---|---|
| `booksvr/internal/library/query.go` | 读：`GetBooksData`、`GetBooksForCategory`、`GetCategories`、`AllBookIDs`、`BooksWithSameTitle`、`HasID`、`LastModified` |
| `booksvr/internal/library/query_test.go` | 上述测试 |
| `booksvr/internal/library/search.go` | Calibre 查询语法解析与执行 |
| `booksvr/internal/library/search_test.go` | 语法解析 + 结果测试 |
| `booksvr/internal/library/fields.go` | 字段元信息 |
| `booksvr/internal/library/fields_test.go` | 字段元信息测试 |
| `booksvr/internal/library/cover.go` | 封面读取与时间戳 |
| `booksvr/internal/library/cover_test.go` | 封面测试 |
| `booksvr/internal/library/trash.go` | 回收站：列出/恢复/永久删除 |
| `booksvr/internal/library/trash_test.go` | 回收站测试 |
| `booksvr/internal/library/write.go` | 写：`ImportBook`、`DeleteBook`、`AddFormat`、`SetTags` |
| `booksvr/internal/library/write_test.go` | 写接口测试 |
| `tests/test_library_contract.py` | 与 Calibre 的一致性契约测试 |

### 修改文件

| 文件 | 预期改动 |
|---|---|
| `booksvr/internal/library/schema.go` | 如需补索引/列 |

### 不改动

- **`webserver/` 全部 Python 代码**（本次路线修正的核心）。
- `app/` 前端全部代码。
- 218 条路由的路径/方法/响应结构。
- 第一阶段与阶段 2 成果。

---

## Implementation Steps（TDD）

### 实施项 1：读接口 —— 批量取书数据

**测试先行**（`query_test.go`）：

- `TestGetBooksDataByIDs`：给定 ids，返回字段集合与 `webserver/utils.py` 的 `SimpleBookFormatter` 一致。
- `TestGetBooksDataEmptyIDs`：空 ids → 空结果。
- `TestGetBooksDataMissingID`：不存在的 id → 跳过。
- `TestGetBooksDataIncludesAuthors`：多作者拼接。
- `TestGetBooksDataIncludesTags` / `Series` / `Publisher` / `Rating` / `Languages` / `Comments` / `Identifiers`。

**实现：** `func GetBooksData(db *sql.DB, ids []int64) ([]BookData, error)`

**验收：** `go test ./internal/library/ -run TestGetBooksData -v` 全绿。

---

### 实施项 2：读接口 —— 分类查询

**测试先行：**

- `TestGetBooksForCategoryAuthors` / `Tags` / `Publishers` / `Series` / `Ratings` / `Languages`。
- `TestGetCategories`：返回 `(id, name, count)`。
- `TestGetBooksForCategoryUnknown`：未知分类 → 空结果。
- `TestGetItemID` / `TestGetItemNameMap`。

**实现：** `GetBooksForCategory`、`GetCategories`、`GetItemID`、`GetItemNameMap`。

**验收：** `go test ./internal/library/ -run "TestGetBooksForCategory|TestGetCategories|TestGetItem" -v` 全绿。

---

### 实施项 3：读接口 —— 其余读方法

**测试先行：**

- `TestAllBookIDs`、`TestHasID`、`TestBooksWithSameTitle`、`TestLastModified`、`TestFormatAbsPath`、`TestSort`、`TestFieldFor`。

**实现：** 对应函数。

**验收：** `go test ./internal/library/ -run "TestAllBookIDs|TestHasID|TestBooksWithSameTitle|TestLastModified|TestFormatAbsPath|TestSort|TestFieldFor" -v` 全绿。

---

### 实施项 4：搜索语法 —— Step A（实测子集）

**测试先行**（`search_test.go`）：

- `TestSearchEmptyQueryReturnsAll`：空查询 → 全部 id。
- `TestSearchPublisher`：`publisher:'重庆出版社'`。
- `TestSearchAuthor`：`author:'刘慈欣'`。
- `TestSearchTag`：`tag:'科幻'`。
- `TestSearchFullText`：`search:"三体"` → 匹配 title/comments/tags。
- `TestSearchQuotedWithSpaces`：值含空格与中文。
- `TestSearchNoMatch`：无匹配 → 空结果。

**实现：** `func Search(db *sql.DB, query string) ([]int64, error)`

**验收：** `go test ./internal/library/ -run TestSearch -v` 全绿。

---

### 实施项 5：搜索语法 —— Step B（补齐语法）

**测试先行：**

- `TestSearchSeries` / `Rating` / `Format` / `Title`。
- `TestSearchComparison`：`rating:>3`、`rating:<3`、`rating:=3`。
- `TestSearchBooleanAnd` / `Or` / `Not`。
- `TestSearchParentheses`：`(author:'a' or author:'b') and tag:'c'`。
- `TestSearchInvalidSyntax`：非法语法 → 明确错误，不 panic。

**实现：** 词法分析 + 递归下降解析 + SQL 生成。

**验收：** `go test ./internal/library/ -run TestSearch -v` 全绿。

---

### 实施项 6：字段元信息

**测试先行：**

- `TestFieldMetadataBuiltin`：内置字段（title/author/tags/series/publisher/rating/…）。
- `TestFieldMetadataCustomColumns`：从 `custom_columns` 读自定义字段。
- `TestFieldMetadataSortable`：可排序性标记。
- `TestAllFieldNames`。

**实现：** `func FieldMetadata(db *sql.DB) (map[string]Field, error)`

**验收：** `go test ./internal/library/ -run TestFieldMetadata -v` 全绿。

---

### 实施项 7：封面

**测试先行：**

- `TestCoverReturnsBytes`：有封面 → 返回字节。
- `TestCoverMissingReturnsNil`：无封面 → nil（不报错）。
- `TestCoverLastModified`。

**实现：** `Cover(db, bookID)`、`CoverLastModified(db, bookID)`。

**验收：** `go test ./internal/library/ -run TestCover -v` 全绿。

---

### 实施项 8：回收站

**测试先行**（`trash_test.go`）：

- `TestListTrashEntries`：扫描 `.caltrash` + 读 `metadata.opf` 补元数据。
- `TestListTrashEntriesEmpty`：目录不存在 → 空结果。
- `TestRestoreTrashEntry`：文件移回 + 更新 `book_formats`。
- `TestDeleteTrashEntry`：永久删除。
- `TestTrashPathTraversalRejected`：路径穿越防护。
- `TestTrashBookFormats`：列出格式（排除 cover.jpg/metadata.opf/annotations.json）。

**实现：** `ListTrashEntries`、`RestoreTrashEntry`、`DeleteTrashEntry`。

**验收：** `go test ./internal/library/ -run TestTrash -v` 全绿。

---

### 实施项 9：写接口

**测试先行**（`write_test.go`）：

- `TestImportBookCreatesRow`：插入 `books` 行 + 关联 authors/tags。
- `TestDeleteBookRemovesRow`：删除 + 级联清理。
- `TestAddFormatRegistersFormat`：写 `book_formats`。
- `TestSetTagsReplacesTags`：替换标签关联。
- `TestWriteRejectsClosedDB`。

**实现：** `ImportBook`、`DeleteBook`、`AddFormat`、`SetTags`。

**验收：** `go test ./internal/library/ -run "TestImportBook|TestDeleteBook|TestAddFormat|TestSetTags" -v` 全绿。

---

### 实施项 10：一致性契约测试

**测试先行**（`tests/test_library_contract.py`）：

- 用 `tests/cases/metadata.db` 作为固定 fixture。
- 把 Calibre 的期望结果**预先固化为 JSON**，Go 侧断言与之逐条一致。
- 覆盖：`get_data_as_dict`、`get_books_for_category`、`search_getting_ids`（各语法）、`all_book_ids`。

> ⚠️ 本机无 Calibre，无法真双跑。**替代方案：** 固化期望结果为 JSON。真实双跑需在有 Calibre 的环境补做，**如实记录为未执行项**。

**验收：** `python -m pytest tests/test_library_contract.py -v` 全绿。

---

### 实施项 11：design 方案文档

**产出：** `design/booksvr/20261010-go-data-layer.wip.html`

**验收：** 结构/资源校验通过。

---

## Testing Strategy

| 层级 | 命令 |
|---|---|
| Go 单元 | `cd booksvr && go test ./...` |
| Go 静态 | `go vet ./... && gofmt -l .` |
| 一致性契约 | `python -m pytest tests/test_library_contract.py -v` |
| 回归 | `python -m pytest tests/test_booksvr_contract.py tests/test_booksvr_serve_contract.py tests/test_deploy_config.py -v` |

**覆盖率目标：** 新增代码 ≥ 90%。

---

## Risks and Mitigations

| 风险 | 影响 | 缓解 |
|---|---|---|
| 搜索语法复刻不完整 | 阶段 6 搬 handler 时行为不一致 | 分步实现 + 契约测试；未实现部分如实记录 |
| 本机无 Calibre 无法真双跑 | 一致性未真实验证 | 固化期望结果为 JSON；真实双跑记录为未执行项 |
| `.caltrash` 目录结构假设错误 | 回收站不可用 | 实施前先实测目录结构 |
| 写接口绕过 Calibre 导致数据不一致 | 书库损坏 | 写接口只在阶段 6 使用；本阶段只做单元测试，不接生产路径 |
| 数据层能力不足 | 阶段 6 搬 handler 时才发现缺接口 | 按实测调用面逐项覆盖；阶段 6 发现缺口再补 |

---

## Rollback Plan

本阶段**不接生产路径**（纯新增 Go 包），因此无需回滚——删掉新增文件即可。

---

## Handoff Notes

1. **本计划是路线修正后的阶段 3**，上游是 `plans/2026-10-10-backend-go-migration-roadmap.md`。
2. **核心修正：不碰 Python。** 原「让 Python 换个方式读库」方案已作废（用户否决：「为什么还要python？」）。
3. **三个设计决策仍然有效**：复刻完整搜索语法（决策 2）、Go 直读 `.caltrash`（决策 3）；决策 1「先切读后切写」**已作废**（它预设 Python 还在）。
4. **本阶段不接生产路径**，纯新增 Go 包，风险低。
5. **不要重复第一阶段会话的错误表述。** booksvr 已接管格式路径解析层，且阶段 2 已让它接管 8000 端口。
6. **第一阶段与阶段 2 成果保留**，不推翻、不修改。
7. **`plans/` 不进仓库。**
8. **前端 Nuxt 零改动**是硬验收口径。
9. **若实施时发现 plan 与代码事实冲突、范围越界或关键需求不明，应停止并说明，不要自行猜测或改设计。**

---

## 附：实施项依赖顺序

```
1 (批量取书) ──► 2 (分类查询) ──► 3 (其余读方法)
                                      │
4 (搜索 Step A) ──► 5 (搜索 Step B) ──┤
                                      ├──► 10 (一致性契约)
6 (字段元信息) ───────────────────────┤
7 (封面) ─────────────────────────────┤
8 (回收站) ───────────────────────────┤
9 (写接口) ───────────────────────────┘
                                      └──► 11 (design)
```

**本阶段完成后：** Go 侧具备搬 handler 所需的全部数据能力，可进入阶段 6（或先做阶段 4 元数据解析，视 handler 依赖而定）。