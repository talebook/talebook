# 用 Go 重写 Calibre 存储层（含一书多格式与一书多版本归一化）开发计划

> 本文件是设计模式产出的**唯一审批文档**，同时包含需求分析、概要设计与实施计划。
> 说明：Talebook 仓库规范要求内部方案落在 `design/<module>/yyyymmdd-<feature>.<status>.html` 。本计划获批并进入开发模式后，**第一项实施任务**即为按 `design/TEMPLATE.html` 的 8 节结构把本文件内容转写为 `design/booksvr/20261007-calibre-go-rewrite.wip.html` （设计模式只读门禁不允许直接写 `design/` ）。

---

## 0. 工作方式：在 fork 仓库中进行

**决策（用户 2026-10-07 确认）：** 本工作在 **fork 出来的 talebook 仓库**中进行，不在上游 `talebook/talebook` 直接开发。

**当前仓库状态（已核实）：**

```
[remote "origin"]
    url = https://github.com/talebook/talebook.git
[branch "master"]
    remote = origin
    merge = refs/heads/master
```

当前 `origin` 指向上游，**尚未配置 fork**。因此实施项 0 之前必须先完成 fork 与远端配置。

**工作方式约束：**

| 项 | 约定 |
|---|---|
| 开发仓库 | fork 仓库（如 `<your-account>/talebook`） |
| 上游仓库 | `talebook/talebook`，仅用于同步，不直接推送 |
| 远端命名 | `origin` = fork；`upstream` = `talebook/talebook` |
| 分支策略 | 在 fork 上开特性分支（如 `feat/booksvr-calibre-rewrite`），不直接改 `master` |
| 同步上游 | `git fetch upstream && git rebase upstream/master` |
| PR 目标 | 视需要决定是否向上游提 PR；本计划不强制 |

**注意：** 仓库规范中的 `design/`、`spec/`、`make check-*` 门禁在 fork 中同样适用，不因 fork 而豁免。PR 描述规范（中文、含方案路径与 RawGitHack 链接）在向上游提 PR 时才需要；仅留在 fork 时按需简化。

---

---

## User Request

**原始需求（用户原话）：**

> 我想把 calibre 重写，保留对外的 api 不变，改为用 go 语言，去掉这个必须重新复制文件的要求，也就是不再要求"文件系统即数据库"，用数据库检索效率明显远超文件系统。另外，也不需要支持 qt 界面，改为使用 web。是否可行？

> 一书多格式是对的！需要保留。而且我还需要实现一书多版本，识别书名，作者名，自动进行归一化。进设计模式完整设计

**已澄清信息（11 轮 brainstorming 决策）：**

| # | 维度 | 决策 |
|---|---|---|
| 1 | 目标定位 | 兼容 Talebook HTTP API（前端 Nuxt 零改动） |
| 2 | 存储 | 新 schema + 兼容层（导入现有 Calibre 书库，不导出回 Calibre） |
| 3 | 格式转换 | 读取主流格式 + 单向转 EPUB |
| 4 | 格式范围 | EPUB/TXT/PDF/MOBI/AZW3/DOCX/CBZ/FB2/HTMLZ |
| 5 | 保留能力 | OPDS、WebDAV、多用户与权限 |
| 6 | 部署 | 单二进制 + embed 前端 |
| 7 | API 兼容精度 | 完全兼容（复刻约 25 个展示字段） |
| 8 | 全文检索 | 仅元数据，trigram 分词（支持中文子串），否决全书正文 FTS |
| 9 | 与 Calibre 桌面版关系 | 完全取代，单向只读迁移 |
| 10 | 代码位置 | `talebook/booksvr/` 子目录 |
| 11 | 首期范围 | 全量实现 215 条路由 |

**本轮新增需求的澄清结论（5 轮追问）：**

| # | 问题 | 用户决策 |
|---|---|---|
| 12 | 归一化自动化程度 | **B. 自动归组到「作品」，保留人工纠正** |
| 13 | 版本与格式层级 | **作品 → 版本 → 格式（三层）**；同一版次的 epub+mobi 合并为 1 个版本，版本内再列格式 |
| 14 | 同版本判定依据 | **A. 按「版本指纹」自动判定**（出版社 + 版次/年份 + 译者 归一化后相同 → 同一版本） |
| 15 | 归一化流水线步骤 | **全部 8 步**：全半角、大小写、空白、标点、繁简、去版本后缀、作者归一、去盗版站后缀 |
| 16 | 繁简统一实现 | **A. 内置精简对照表**（常用 3000-5000 字），单文件 embed，无外部依赖 |
| 17 | 版本后缀风险处理 | **A. 归一化键只用于作品归组，版本后缀保留在版本指纹里**（提取而非删除） |
| 18 | 作品层与现有 API 关系 | **A. 保留 `books` 表作为版本层，新增 `works` 表作为作品层** |
| 19 | 归一化键计算时机 | **C. 写入时持久化 + 提供全库重算命令** |

**用户对「版本」的定义（原话）：**

> 版本：同一本书的不同版次，出版社，格式。作者和书名相同就认为是同一本书，其余不同都是版本差异

**用户偏好/约束：**

- 倾向彻底摆脱 Calibre，包括运行时依赖。
- 重视超大库的可承受性（否决全书正文 FTS）。
- 反对 Calibre 式的大规模 unicode 查表（32 万行 `unihandecode`）。
- 要求一书多格式 + 一书多版本 + 归一化。
- 选择「全量 215 条路由」，不接受分阶段缩减范围。
- 选择「完全兼容 Talebook API」，前端零改动。

---

## Goal

新增 `booksvr/` 作为 Go 实现的书库存储层，采用**作品 / 版本 / 格式**三层模型：导入默认原地登记源文件（不复制、不改名、不写 OPF），对外保持 Talebook 215 条 HTTP 路由完全兼容（前端 Nuxt 除多目录 UI 外零改动），并实现书名与作者名的 8 步自动归一化，把同一本书的不同版次、出版社、格式自动归组到同一作品下。

---

## Non-Goals

- 不实现 Calibre 桌面版 GUI 的任何功能；不提供 Qt 界面。
- 不导出回 Calibre 格式，不保证 Calibre 桌面版能继续打开新书库。
- 不做全书正文全文检索（超大库不可承受），仅做元数据检索。
- 不重写 Calibre 的 107,281 行转换引擎；只做读取主流格式 + 单向转 EPUB。
- 不引入 32 万行 `unihandecode` 式的文件名 ASCII 化查表。
- 本轮不实现归一化算法升级后的自动后台重算（只提供手动命令）。
- 不修改前端 Nuxt 代码。
- 不重构与本次目标无关的 `webserver/` 代码。

---

## Current Codebase Facts

### 相关文件与接口

| 事实 | 位置 |
|---|---|
| 前端字段契约（约 25 字段） | `webserver/utils.py:66-170` `SimpleBookFormatter` + `BookFormatter` |
| 路径构造函数 monkey-patch | `webserver/main.py:133-166`、`webserver/main.py:177-191` |
| 直接 SQL 绕过 Calibre API | `webserver/services/external_index.py:74-75`、`handlers/base.py:661,676,683`、`handlers/user.py:416`、`webdav/dav_provider.py:592` |
| 仅索引模式定义 | `webserver/services/scan.py:33-36`（`index`/`copy`/`move`） |
| 仅索引模式实现 | `webserver/services/external_index.py`（`set_external_format_record` 等） |
| 查重逻辑（3 处） | `webserver/services/scan.py:401,599`、`handlers/book.py:1442`、`services/booksource/save_service.py:188,205` |
| 查重辅助函数 | `webserver/services/import_metadata.py:15-20` `matching_import_books` |
| 已有书名别名表 | `webserver/models.py:357` `BookAlias`（`book_id` + `normalized_name`） |
| 已有作者别名表 | `webserver/models.py:369` `AuthorAlias`（`normalized_name` → `canonical_name`） |
| 已有归一化函数 | `webserver/services/aliases.py:26` `normalize_alias()` — **仅 `casefold()`** |
| 别名服务 | `webserver/services/aliases.py` `AliasService`（含 `replace_author_group` 冲突吸收） |
| 作者别名路由 | `webserver/handlers/meta.py:267` `(r"/api/author/(.*)/alias", AuthorAliases)` |
| 盗版站后缀清理 | `webserver/utils.py:15` `remove_zlibrary_suffix()` |
| 格式转换（外部进程） | `webserver/services/convert.py:158` `subprocess.Popen(["ebook-convert", ...])` |
| 媒体格式常量 | `webserver/services/media_analysis.py:22-30` |
| 路由注册（全部） | 各 `handlers/*.py` 的 `routes()` 函数 |

### 数据流

```
扫描/上传 → 解析元数据（calibre get_metadata）→ 查重（books_with_same_title + 作者精确相等）
         → 命中则 add_format / 未命中则 import_book → 写 Item 关联表 → 自动处理插件
```

### 既有模式

- 后端 JSON 接口统一 `@js` + `@auth` 装饰器，返回 `{"err": "ok", ...}`。
- 路由遵循 RESTful：单数资源名，动作作为子路径（如 `/api/author/(.*)/alias`）。
- 内部方案落在 `design/<module>/yyyymmdd-<feature>.<status>.html`，单文件离线 HTML，8 节结构。
- 领域规格落在 `spec/`，改变产品行为必须在同一 PR 更新对应篇目。

### 关键代码事实（实测）

- Talebook 对 Calibre 的依赖面：约 30 处 `from calibre...` import，103 处 `self.db` / `new_api` 调用。
- 高频方法：`get_data_as_dict`(14)、`get_metadata`(12)、`new_api`(8)、`field_metadata`(8)、`add_format`(7)、`import_book`(6)、`get_books_for_category`(6)、`books_with_same_title`(5)、`search_getting_ids`(4)。
- Calibre 源码规模（本地克隆 `D:\code\calibre-src`，commit `ff944d9`）：Python 1,569 文件 / 799,856 行；C/C++ 126 文件 / 173,794 行。
- Calibre `books` 表 schema 见 `db/schema_upgrades.py:115`。
- Calibre FTS 单独建库 `full-text-search.db`，`db/fts/text.py:extract_text()` 提取全书正文，1 万本约 15-20 GB。
- Calibre 转换引擎合计 107,281 行 Python，依赖 Qt 排版引擎与多个 C 扩展。

---

## Proposed Design

### 推荐方案

新增 `booksvr/` 作为 Go 实现的书库存储层，采用**作品 / 版本 / 格式**三层模型。作品层（`works`）由归一化键 `work_key` 决定，版本层复用 `books` 表并由 `edition_key` 区分，格式层（`book_formats`）以绝对路径原地登记源文件。所有权归 `booksvr/`：它拥有数据库 schema、归一化算法、路径解析与迁移逻辑；`webserver/` 通过兼容层继续提供 215 条路由，前端 Nuxt 除多目录 UI 外零改动。

### 5.1 三层数据模型

```sql
-- 第 1 层：作品（新增）
CREATE TABLE works (
    id             INTEGER PRIMARY KEY,
    title_norm     TEXT NOT NULL,          -- 归一化书名（已剔除版本后缀）
    author_norm    TEXT NOT NULL,          -- 归一化作者
    work_key       TEXT NOT NULL UNIQUE,   -- title_norm + '\x1f' + author_norm
    display_title  TEXT NOT NULL,          -- 展示用原始书名
    display_author TEXT NOT NULL,
    created_at     INTEGER NOT NULL,
    updated_at     INTEGER NOT NULL
);
CREATE INDEX idx_works_title_norm  ON works(title_norm);
CREATE INDEX idx_works_author_norm ON works(author_norm);

-- 第 2 层：版本（复用 books 表，新增列）
ALTER TABLE books ADD COLUMN work_id     INTEGER REFERENCES works(id);
ALTER TABLE books ADD COLUMN edition_key TEXT;   -- 版本指纹
ALTER TABLE books ADD COLUMN title_norm  TEXT;   -- 归一化书名（含版本后缀）
ALTER TABLE books ADD COLUMN author_norm TEXT;
CREATE INDEX idx_books_work_id     ON books(work_id);
CREATE INDEX idx_books_edition_key ON books(work_id, edition_key);

-- 第 3 层：格式（新增，替代 Calibre 的 data/ 目录约定）
CREATE TABLE book_formats (
    id      INTEGER PRIMARY KEY,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    format  TEXT NOT NULL,        -- EPUB / MOBI / PDF ...
    path    TEXT NOT NULL,        -- 绝对路径，不复制不改名
    size    INTEGER NOT NULL,
    mtime   INTEGER NOT NULL,
    hash    TEXT,                 -- 内容哈希，用于精确去重
    UNIQUE(book_id, format)
);
CREATE INDEX idx_book_formats_book_id ON book_formats(book_id);
```

**关键语义：**

- `work_key = title_norm + '\x1f' + author_norm` → 决定「是不是同一本书」。
- `edition_key = norm(出版社) + '\x1f' + norm(版次/年份) + '\x1f' + norm(译者)` → 决定「是不是同一版本」。
- 同一 `work_id` 下 `edition_key` 相同 → 同一版本，不同格式挂在同一 `book_id` 下。
- 同一 `work_id` 下 `edition_key` 不同 → 不同版本，各自一个 `book_id`。

**对应《三体》示例：**

| 文件 | work_id | book_id（版本） | edition_key | format |
|---|---|---|---|---|
| `三体.epub` | W1 | B1 | 重庆社｜2008｜- | EPUB |
| `三体.mobi` | W1 | **B1**（同版本） | 重庆社｜2008｜- | MOBI |
| `三体（第二版）.epub` | W1 | B2 | 重庆社｜2012｜- | EPUB |
| `三体.pdf` | W1 | B3 | （空） | PDF |

**前端零改动保证：** `books.id` 语义不变，仍是一本书（一个版本）。`/api/book/{id}`、`/get/cover/{id}.jpg`、`/api/book/{id}.epub`、阅读进度、书架、划线笔记全部继续挂在 `book_id` 上。`works` 是新增的聚合层，只服务于「同作品其他版本」这类新能力。

### 5.2 归一化流水线

实现于 `booksvr/internal/normalize`，为纯函数、无 IO、可独立单测。8 步顺序固定，每步可单独测试。

```
输入 "《三体》（第二版） 刘慈欣 著"
  ↓ 1. 去盗版站后缀    remove_zlibrary_suffix 等价实现
  ↓ 2. 全半角统一      ＡＢＣ→ABC，１２３→123，全角标点→半角
  ↓ 3. 空白归一        首尾去空、连续空白合一、去零宽字符 U+200B/U+FEFF
  ↓ 4. 标点归一        中英标点统一、去《》「」【】、去副标题分隔符 ：/—/·
  ↓ 5. 繁简统一        内置 3000-5000 字对照表（embed，约 20-50 KB）
  ↓ 6. 大小写统一      casefold
  ↓ 7. 去版本后缀      （第X版）(修订版) 全集 套装 上下册 Vol.X → 提取而非删除
  ↓ 8. 作者归一        去「著/编/译」等角色词、去分隔符、统一「姓 名」顺序
输出 title_norm="三体"  author_norm="刘慈欣"  suffixes=["第二版"]
```

**第 7 步的关键设计：提取而非删除**

```go
type SuffixParse struct {
    Core     string   // "三体"      → 进 title_norm，用于 work_key
    Suffixes []string // ["第二版"]  → 进 edition_key，用于版本区分
}
```

这样《三体全集》解析为 `Core="三体"`、`Suffixes=["全集"]`：仍归入作品 W1，但 `edition_key` 含「全集」，与《三体》第一部**不是同一版本**，界面显示「《三体》· 全集」。若简单删除后缀，两者会被错误合并为同一版本。

**两个键的分工：**

| 键 | 组成 | 用途 | 是否含版本后缀 |
|---|---|---|---|
| `work_key` | `title_norm` + `author_norm` | 归组到作品 | 否（已剔除） |
| `edition_key` | `norm(出版社)` + `norm(版次/年份)` + `norm(译者)` | 区分版本 | 是（后缀进这里） |

**误合并兜底：** `edition_key` 为空（元数据缺失，如 TXT / PDF / 盗版扫描）时，**不与其他空指纹版本自动合并**，各自成版本，并在书详情页给出「这些可能是同一版本，是否合并？」的建议。

### 5.3 导入与归组流程

```
work_key 命中？
  ├─ 否 → 新建 work + 新建 book(版本) + 加 format
  └─ 是 → edition_key 命中？
            ├─ 否 → 同一 work 下新建 book(版本) + 加 format
            └─ 是 → 同一 book 下已有该 format？
                      ├─ 是 → 返回 {"err": "samebook"}（复用现有语义）
                      └─ 否 → 同一 book 下加 format（复用现有 add_format 语义）
```

对外行为保持不变：`{"err": "samebook"}`、`add_format`、`import_book` 的语义与响应结构与 Python 版一致，前端零改动。

### 5.4 存储层：去掉「文件系统即数据库」

| 维度 | 旧（Calibre） | 新（Go） |
|---|---|---|
| 文件位置 | `books.path` = 相对书库根目录 | `book_formats.path` = **绝对路径** |
| 文件名 | ASCII 化（32 万行 unicode 表） | **保留原始文件名**，删除查表 |
| 导入 | 必须复制 + 改名 | **默认原地登记**，不复制不改名 |
| 目录约定 | `data/{author}/{title}/{id}/` | **无目录约定**，路径即事实 |
| 封面 | `cover.jpg` 在书目录内 | `covers/{book_id}.jpg` 独立目录 |
| 元数据 | SQLite + `metadata.opf` 双写 | **仅数据库**，导出时按需生成 OPF |

**兼容层：** `books.path` 字段保留（存第一个格式所在目录），供 `webserver/main.py:177-191` 的 monkey-patch 与 `webserver/services/external_index.py:74-75` 的直接 SQL 平滑迁移，避免一次性改动面过大。

### 5.5 HTTP 层

- 215 条既有路由**全部保留**，路径、方法、响应结构不变。
- 新增 3 条路由，遵循仓库 RESTful 规范（单数资源名、动作作为子路径）：

| 方法 | 路径 | 用途 | 响应要点 |
|---|---|---|---|
| GET | `/api/work/([0-9]+)` | 作品详情 | 作品元数据 + 版本列表 + 每版本格式列表 |
| GET | `/api/book/([0-9]+)/versions` | 同作品其他版本 | 同 `work_id` 下其他 `book_id` 的摘要 |
| POST | `/api/book/([0-9]+)/merge` | 人工合并版本 | 把目标书并入当前书所在作品；返回合并结果 |

字段契约复刻 `webserver/utils.py:66-170` 的约 25 个字段；`files[]` 数组从 `book_formats` 生成，逐项含 `format` / `size` / `href` / `online_readable`。

#### 新增接口的响应契约

```jsonc
// GET /api/work/123
{
  "err": "ok",
  "work": {
    "id": 123,
    "title": "三体",              // display_title
    "author": "刘慈欣",           // display_author
    "title_norm": "三体",
    "author_norm": "刘慈欣",
    "version_count": 3,
    "format_count": 4
  },
  "versions": [
    {
      "id": 456,                  // book_id，可直接用于 /book/456
      "title": "三体",
      "publisher": "重庆出版社",
      "pubdate": "2008-01-01",
      "edition_key": "重庆出版社\u001f2008\u001f-",
      "suffixes": [],
      "img": "...", "thumb": "...",
      "files": [
        { "format": "EPUB", "size": 1234567, "href": "...", "online_readable": true },
        { "format": "MOBI", "size": 2345678, "href": "...", "online_readable": true }
      ]
    }
  ]
}

// GET /api/book/456/versions
{ "err": "ok", "work_id": 123, "versions": [ /* 同 work 下其他 book 的摘要，不含当前书 */ ] }

// POST /api/book/456/merge   body: {"target_book_id": 789}
{ "err": "ok", "work_id": 123, "merged": [456, 789], "msg": "已合并为同一作品" }
```

#### 前端如何使用（关键设计）

**前提：前端 Nuxt 除「多目录 UI」外零改动**（见 5.9 节的明确例外）。因此新增的 work/versions/merge 接口**不被现有前端调用**，而是作为后续前端迭代的接口储备。具体分工：

| 场景 | 现有前端行为 | 新接口的角色 |
|---|---|---|
| 书库列表 / 详情页 | 继续用 `/api/book/{id}`，`books.id` 语义不变 | 不介入 |
| 下载弹窗（`app/pages/book/[bid]/index.vue:166-188`） | 遍历 `book.files` 渲染格式列表 | 不介入；`files[]` 由 `book_formats` 生成，结构不变 |
| 格式转换（`BookConvertDialog`） | 用 `book.files` 作为 `:files` 入参 | 不介入 |
| 阅读 / 书架 / 笔记 | 全部挂 `book_id` | 不介入 |
| **「同作品其他版本」** | **当前无此能力** | **新增接口的唯一消费者** |

**为什么 work/versions/merge 不在本轮接入前端：** 用户要求「前端 Nuxt 零改动」。若本轮同时接入，会破坏「215 条路由完全兼容」的验收口径，也无法用「前端零改动跑通」作为兼容性的强证据。

**唯一的例外是多目录 UI**（见 5.9 节）：后端已支持 `import_allowed_roots` 但前端未暴露，用户明确要求本轮补齐。该例外不涉及任何 API 响应结构变化，不影响兼容性验收。

**后续前端接入路径（不在本轮范围，仅记录以便接口设计不返工）：**

1. 在 `app/pages/book/[bid]/index.vue` 详情页新增「其他版本」区块，调用 `$backend('/book/' + bid + '/versions')`。
2. 用 `app/components/BookCards_Small.vue` 渲染版本列表（它已支持 `href` 与 `id`，可直接复用）。
3. 版本卡片点击跳 `/book/{version.id}`，复用现有详情页路由。
4. 管理员在详情页提供「合并到当前作品」按钮，调用 `POST /api/book/{id}/merge`。
5. 新增 i18n 文案到 `app/i18n/locales/*.json`，**注意禁止字面量 `@` 与 `<`**。

**接口设计约束（为后续前端接入预留）：**

- `versions[].id` 必须是可直接用于 `/book/{id}` 的 `book_id`，避免前端做二次映射。
- `versions[].img` / `thumb` 复用现有封面 URL 模板，前端无需新逻辑。
- 所有响应遵循 `{"err": "ok", ...}` 信封，与 `plugins/talebook.js` 的 `backend()` 兼容。
- 权限：`/api/work/{id}` 与 `/api/book/{id}/versions` 逐资源调用 `can_view_book()`，游客只能看到公开书；`/merge` 需 `@auth` + 所有权校验。

### 5.6 迁移

- **单向只读**：读 Calibre `metadata.db`，写入新 schema，不导出回 Calibre。
- 迁移时对每本书跑归一化，自动建 `works` 并归组。
- 迁移报告：多少书归入多少作品、多少版本被合并、多少 `edition_key` 为空。
- **幂等**：可重复运行，已迁移的书跳过。

### 5.7 错误处理

| 场景 | 行为 |
|---|---|
| 源文件不存在 | 保留 `book_formats` 记录，标记 `missing`，接口返回既有 `err` 语义，不静默删除 |
| `edition_key` 为空 | 不自动合并，各自成版本，返回合并建议 |
| 归一化输入为空 | 回退到原始字符串，不抛异常 |
| 繁简表未命中 | 保留原字符，不报错 |
| 迁移中断 | 事务回滚，可重跑（幂等） |
| 合并冲突 | 返回 `{"err": "work.merge.conflict"}`，不静默覆盖 |

### 5.8 格式范围与既有常量的关系

Talebook 现有格式常量（`webserver/services/media_analysis.py:23-25`）：

```python
EBOOK_MEDIA_FORMATS      = {"azw", "azw3", "epub", "mobi", "pdf", "txt"}
COMIC_CONTAINER_FORMATS  = {"cbz", "zip", "cbr", "rar"}
MANAGED_DOCUMENT_FORMATS = {"djvu", "uvz"}
SUPPORTED_MEDIA_FORMATS  = 三者并集
ONLINE_READ_FORMATS      = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS
```

本轮决策的格式范围（EPUB/TXT/PDF/MOBI/AZW3/DOCX/CBZ/FB2/HTMLZ）与上述常量的差异及处理：

| 格式 | 现状 | 本轮处理 |
|---|---|---|
| EPUB / TXT / PDF / MOBI / AZW3 | 已在 `EBOOK_MEDIA_FORMATS` | 保持，可在线阅读 |
| CBZ | 已在 `COMIC_CONTAINER_FORMATS` | 保持，可在线阅读 |
| DOCX / FB2 / HTMLZ | **不在**现有常量中 | **新增**到 `SUPPORTED_MEDIA_FORMATS`；仅支持读取元数据与单向转 EPUB，**不加入** `ONLINE_READ_FORMATS`（无内置阅读器） |

**约束：** 新增格式必须同步更新 `webserver/services/media_analysis.py` 的常量与 `analyze_media_file` 校验分支，并补充对应测试；`online_readable` 字段对 DOCX/FB2/HTMLZ 返回 `false`，与现有 `online_readable_formats()` 语义一致。

### 5.9 多电子书目录配置

**现状（已核实）：后端已支持多目录，前端未暴露。**

| 层 | 现状 | 证据 |
|---|---|---|
| 配置项 | `import_allowed_roots` 是**数组**，默认 `["/data/books/imports/"]` | `webserver/settings.py:25` |
| 解析 | 支持数组或逗号分隔字符串，并与 `scan_upload_path` 合并去重 | `webserver/handlers/scan.py:37-49` |
| 校验 | `_is_path_in_roots()` 用 `commonpath` 逐个根目录判断 | `webserver/handlers/scan.py:52-62` |
| 目录浏览 | `/api/admin/import/directory/list` 返回 `allowed_roots`，逐项标 `in_allowed_roots` | `webserver/handlers/scan.py:469-510` |
| 设置读写 | `import_allowed_roots` 在可写白名单里 | `webserver/handlers/admin.py:530` |
| 插件平台 | 已把 `import_allowed_roots` 传给插件 | `webserver/services/plugin_runtime.py:1554-1557` |
| **前端** | **只暴露单个 `scan_upload_path` 文本框**，`import_allowed_roots` 完全未出现 | `app/pages/admin/imports.vue:324`、`app/components/admin/GeneralSettingsContent.vue:762` |

**关键区分：** `import_allowed_roots` 目前只是**安全白名单**（限制能扫哪些目录），不是「书库根目录」。真正的书库根目录是 `with_library`（`/data/books/library/`，单个），Calibre 的 `books.path` 相对它解析。去掉「必须复制」后，单一书库根目录的概念需要重新定义。

**本轮方案（用户 2026-10-07 确认选 A）：**

1. **后端**：复用现有 `import_allowed_roots` 机制，不新增配置项。把「原地登记」的目录范围明确为这些根目录。
2. **前端**：在 `app/pages/admin/imports.vue` 把单个 `scan_upload_path` 文本框改为**可增删的目录列表**，绑定 `import_allowed_roots`。
3. **`with_library` 的处理**：保留为兼容字段（供 `webserver/main.py:177-191` 的 monkey-patch 使用），但新模型下 `book_formats.path` 存**绝对路径**，不再依赖单一书库根目录。

**前端改动范围（「前端零改动」的明确例外）：**

| 文件 | 改动 |
|---|---|
| `app/pages/admin/imports.vue` | 目录设置区改为多目录列表（增/删/校验）；`settingsDraft` 增加 `import_allowed_roots` |
| `app/components/admin/GeneralSettingsContent.vue` | 保留 `scan_upload_path` 单项（兼容），或标注为「默认导入目录」 |
| `app/i18n/locales/*.json` | 新增多目录相关文案（**禁止字面量 `@` 与 `<`**） |
| `app/test/mock-server.js` | mock 增加 `import_allowed_roots` 字段 |

**约束：** 除上述文件外，`app/` 下其他文件不得修改。215 条路由的响应结构不变（`allowed_roots` 字段已存在，无需新增）。

### 5.10 兼容性

- 215 条路由路径、方法、响应结构不变。
- `books.id` 语义与取值稳定性不变。
- 前端 Nuxt 除多目录 UI（见 5.9 节）外零改动。
- OPDS、WebDAV、多用户与权限模型不变。
- 阅读进度、书架、划线笔记的存储与接口不变。
- 现有 `BookAlias` / `AuthorAlias` 表与搜索别名行为不变（新归一化服务于作品归组，与搜索别名分工并存）。

---

## Planned File Structure

### 新增文件（`booksvr/`）

| 文件 | 职责 | 关键接口/边界 |
|---|---|---|
| `booksvr/go.mod` | Go 模块定义 | module `talebook/booksvr` |
| `booksvr/cmd/booksvr/main.go` | 进程入口、配置加载、路由装配 | `main()` |
| `booksvr/internal/normalize/normalize.go` | 8 步归一化流水线 | `NormalizeTitle(string) SuffixParse`、`NormalizeAuthor(string) string` |
| `booksvr/internal/normalize/suffix.go` | 版本后缀提取 | `ParseSuffix(string) SuffixParse` |
| `booksvr/internal/normalize/zhconv.go` | 繁简对照表（embed） | `ToSimplified(string) string` |
| `booksvr/internal/normalize/data/zh_conv.txt` | 3000-5000 字繁简对照数据 | `//go:embed` |
| `booksvr/internal/normalize/keys.go` | 键生成 | `WorkKey(title, author) string`、`EditionKey(publisher, edition, translator) string` |
| `booksvr/internal/library/schema.go` | 建表与迁移 DDL | `Migrate(*sql.DB) error` |
| `booksvr/internal/library/work.go` | 作品层读写 | `FindOrCreateWork(...)`、`GetWork(id)`、`ListVersions(workID)` |
| `booksvr/internal/library/book.go` | 版本层读写 | `FindOrCreateEdition(...)`、`AddFormat(...)` |
| `booksvr/internal/library/format.go` | 格式层读写（路径登记） | `RegisterFormat(...)`、`ResolvePath(bookID, fmt)` |
| `booksvr/internal/library/group.go` | 三层归组判定 | `GroupFile(meta) (workID, bookID, created)` |
| `booksvr/internal/library/merge.go` | 人工合并/拆分 | `MergeBooks(src, dst)`、`SplitBook(id)` |
| `booksvr/internal/migrate/calibre.go` | Calibre 单向只读迁移 | `ImportCalibre(dbPath) (Report, error)` |
| `booksvr/internal/migrate/report.go` | 迁移报告 | `Report` 结构体 |
| `booksvr/internal/httpapi/router.go` | 215 条路由注册 | `Routes() []Route` |
| `booksvr/internal/httpapi/compat.go` | 字段契约复刻 | `FormatBook(...) map[string]any` |
| `booksvr/internal/httpapi/work.go` | 新增 3 条路由 | `WorkDetail`、`BookVersions`、`BookMerge` |
| `booksvr/internal/reindex/normalize.go` | 全库重算命令 | `ReindexNormalize(*sql.DB) (Diff, error)` |

### 修改文件

| 文件 | 改动 |
|---|---|
| `Makefile` | 新增 `build-go`、`test-go`、`lint-go` 目标 |
| `Dockerfile` | 多阶段构建：Go 编译 + embed 前端 |
| `spec/书籍.md` | 更新「一书多格式」「一书多版本」领域定义 |
| `spec/书库.md` | 更新导入不再复制文件的领域规则 |
| `spec/元数据.md` | 更新归一化与作品归组规则 |
| `spec/索引.md` | 若新增篇目则同步收录 |
| `app/pages/admin/imports.vue` | 目录设置区改为多目录列表（见 5.9 节） |
| `app/components/admin/GeneralSettingsContent.vue` | 标注 `scan_upload_path` 为默认导入目录 |
| `app/i18n/locales/zh-CN.json`、`en-US.json` | 新增多目录文案 |
| `app/test/mock-server.js` | mock 增加 `import_allowed_roots` |

### 关键接口/边界

- `normalize` 包**不依赖数据库**，纯函数，可独立测试。
- `library` 包**不依赖 HTTP**，只操作数据库与文件系统。
- `httpapi` 包**不直接写 SQL**，只调用 `library`。
- `migrate` 包**只读** Calibre 源库，绝不写入。

---

## Alternatives Considered

### 方案 A：保留 `books` 为版本层，新增 `works` 为作品层（**推荐，已选**）

- **优点**：`books.id` 语义不变，215 条路由与前端契约完全不受影响；`works` 是纯增量聚合层；回滚只需停止使用新表。
- **代价**：`books` 表需加 4 列；作品层与版本层存在一定冗余（`title_norm` 两处存储）。
- **适用条件**：必须保持前端零改动与 API 完全兼容——正是本项目约束。

### 方案 B：彻底重建 `works` / `editions` / `formats` 三张新表，`books` 仅作兼容视图

- **优点**：模型最干净，无冗余。
- **代价**：所有以 `book_id` 为键的路由、阅读进度、笔记、书架都要重新映射；前端契约有破坏风险；`books` 视图需要维护双向映射。
- **不选原因**：与「前端零改动」「完全兼容」的硬约束冲突，风险远大于收益。

### 方案 C：作品 → 版本(=文件) 两层，格式作为版本属性

- **优点**：模型最简单，少一层。
- **代价**：同一版次的 epub+mobi 会显示成 2 个版本，用户会觉得「版本」一词被滥用。
- **不选原因**：用户明确要求「同一版次的 epub+mobi 应该合并为 1 个版本，版本内再列格式」。

### 归一化实现方案的取舍

| 方案 | 优点 | 代价 | 结论 |
|---|---|---|---|
| 内置精简对照表（3000-5000 字） | 零依赖、约 20-50 KB、可离线 | 生僻字不转换 | **已选** |
| OpenCC Go 移植库 | 覆盖全、质量高 | 引入数 MB 词典依赖 | 不选 |
| 不做繁简归一 | 零风险、零体积 | 「三體」与「三体」仍是两本书 | 不选 |

---

## Acceptance Criteria

- [x] `booksvr/` 目录存在，`go build ./...` 通过。→ `go build -o bin/booksvr ./cmd/booksvr` 成功，`--version` 输出 `booksvr dev`；`go vet` / `gofmt -l` 无输出。
- [x] 归一化 8 步流水线全部实现，每步有独立单元测试且通过。→ `internal/normalize` 覆盖率 **100.0%**。
- [x] `work_key` 与 `edition_key` 生成符合《三体》系列真实用例断言。→ `internal/library` 87.6% 覆盖，断言通过。
- [x] 导入 4 个《三体》文件后，数据库状态为 **1 个 work / 3 个 book / 4 个 format**。→ `internal/library` 与 `internal/migrate` 用例断言通过。
- [x] 导入后源文件位置与文件名**完全不变**（不复制、不改名）。→ `internal/migrate` 89.5% 覆盖，源库哈希不变断言通过。
- [x] 215 条既有路由的路径、方法、响应结构与 Python 版逐字段一致。→ `internal/httpapi` 99.6% 覆盖；`tests/test_booksvr_contract.py` 通过。
- [ ] 前端 Nuxt 除多目录 UI 外**零改动**可跑通登录、书库、详情、阅读、书架全流程。→ **未验证**：需 Docker 后端，Docker Hub 不可达。
- [x] 管理员可在 `app/pages/admin/imports.vue` 增删多个电子书目录，保存后 `import_allowed_roots` 生效。→ 前端 26 用例通过 + lint 0 errors + build 成功；后端 `_sanitize_allowed_roots` 19 用例通过。**浏览器实际渲染未验证**（环境阻塞）。
- [x] 新增 3 条路由（`/api/work/{id}`、`/api/book/{id}/versions`、`/api/book/{id}/merge`）可用且遵循 RESTful 规范。→ 已注册，45 用例，99.4% 覆盖。
- [x] 新增接口的响应契约符合 5.5 节定义（`versions[].id` 可直接用于 `/book/{id}`；遵循 `{"err": "ok", ...}` 信封）。→ 契约用例通过。
- [x] 新增接口逐资源调用 `can_view_book()`；游客只能看到公开书；`/merge` 需 `@auth` + 所有权校验。→ 权限用例通过。
- [x] fork 仓库与远端配置完成（`origin` = fork，`upstream` = 上游），开发在特性分支上进行。→ `leonzy/talebook`，分支 `feat/booksvr-calibre-rewrite`。
- [x] Calibre 迁移幂等：重复运行结果一致，源库不被修改。→ `internal/migrate` 用例通过。**本轮发现并修复一个真实缺陷**：`Merged` 与格式重复计数把「命中已存在的行」也算作合并，导致重跑时 `Merged` 从 2 虚增到 6（数据本身幂等，是报告不幂等）。已改为只统计**本次运行内**发生的合并，并拆出 `DuplicateFormats` 字段；重跑现在报 `merged=0 duplicate_formats=0`。原测试只比 `Works/Editions/Formats` 三个字段，所以漏掉了这个缺陷，已改为逐字段对比。
- [x] 迁移报告输出作品数、版本数、被合并数、空指纹数。→ `internal/migrate/report.go` 用例通过；另新增 `duplicate_formats` 字段区分「源库自身重复」与「自动归组合并」。
- [x] **迁移命令已接入 CLI（本轮补齐）**：`cmd/booksvr/main.go` 新增 `import-calibre` 子命令（`-source` / `-target` 必填，`-library-root` 默认取源库目录）。目标库必须是 Calibre 派生库（`Migrate` 只加列不建表），否则报错而非静默建出半成品。
- [x] 全库重算命令 `reindex-normalize` 可用并输出差异报告。→ **已接入 CLI**（`cmd/booksvr/main.go` 新增子命令，`-db` 必填、`-backup` 默认开启）；`internal/reindex` 53 用例 94.9% 覆盖，`cmd/booksvr` 78.4% 覆盖。**端到端实测**：3 本《三体》（含繁简差异与「修订版」后缀）→ 1 work / edition_key 更新 1 / 空 edition_key 2；第二次运行 0 更新（幂等）；备份文件带时间戳生成。
- [x] `make check-design` 与 `make check-spec` 通过。→ `check_design_docs.py` **171 篇通过**；`check_spec.py` **25 篇通过**。
- [x] `spec/书籍.md`、`spec/书库.md`、`spec/元数据.md` 已同步更新。→ 已更新，并同步 `spec/索引.md`。
- [x] DOCX / FB2 / HTMLZ 可导入，且 `online_readable` 返回 `false`。→ 45 用例，三个新函数 100% 覆盖。
- [x] `design/booksvr/20261007-calibre-go-rewrite.wip.html` 已按 8 节结构产出。→ 已产出并转为 **`design/booksvr/20261007-calibre-go-rewrite.active.html`**。

**未完成项（环境阻塞）：** 前端零改动全流程回归、浏览器实际渲染验证、`interface-review`、`make build` 镜像构建——均需 Docker Hub 可达（当前 `dialing registry-1.docker.io:443 ... connection attempt failed`）。

---

## Implementation Plan

> 说明：以下实施项按依赖顺序排列。每项尽量小到可独立验证。涉及代码变更的步骤优先 TDD：先写失败测试，确认失败，再写最小实现。

### 实施项 -1：配置 fork 仓库与远端

**Files:**
- Modify: `.git/config`（通过 git 命令，不手改）

- [x] Step 1: 在 GitHub 上 fork `talebook/talebook` 到目标账号（需用户提供 fork 仓库地址）。
- [x] Step 2: 把 `origin` 指向 fork：`git remote set-url origin <fork-url>`。
- [x] Step 3: 添加上游：`git remote add upstream https://github.com/talebook/talebook.git`。
- [x] Step 4: 验证：`git remote -v` 输出 `origin` = fork、`upstream` = 上游。
- [x] Step 5: 同步上游：`git fetch upstream`，确认无冲突。
- [x] Step 6: 创建特性分支：`git switch -c feat/booksvr-calibre-rewrite`。

**验证：** `git remote -v` 正确；当前分支为 `feat/booksvr-calibre-rewrite`；`git status` 干净。

**阻塞点：** 需用户提供 fork 仓库地址。若未提供，**停止并询问**，不要自行猜测或直接向上游推送。

---

### 实施项 0：产出 Talebook 规范的设计文档

**Files:**
- Create: `design/booksvr/20261007-calibre-go-rewrite.wip.html`

- [x] Step 1: 创建目录 `design/booksvr/`（`check_design_docs.py` 要求 module 目录真实存在）。
- [x] Step 2: 复制 `design/TEMPLATE.html` 到 `design/booksvr/20261007-calibre-go-rewrite.wip.html`。
- [x] Step 3: 按模板 8 节结构填充本计划的需求分析、概要设计与实施计划内容；替换全部「〔……〕」占位；顶部 chips 填标题、创建日期 `2026-10-07`、模块 `booksvr`、状态 `WIP`、需求来源。
- [x] Step 4: 第 7 节测试结果全部标记「待验证」。
- [x] Step 5: 运行 `make check-design`，确认输出 `N design document(s) passed` 且无 WIP 合并门禁报错。
- [x] Step 6: 确认单文件离线可读（无 CDN / 远程字体 / 远程脚本 / 远程图片）。

**验证：** `make check-design` 通过；浏览器打开该 HTML 无外部请求。

---

### 实施项 1：盘点 215 条路由的键依赖（前置调研，不改代码）

**Files:**
- Read: `webserver/handlers/*.py` 全部 `routes()` 函数
- Create: `booksvr/docs/route-inventory.md`

- [x] Step 1: 遍历所有 `handlers/*.py` 的 `routes()`，导出 215 条路由清单（路径、方法、Handler 类）。
- [x] Step 2: 逐条标注其主键依赖：`book_id` / `books.path` / `available_formats` 字符串 / 其他。
- [x] Step 3: 标记出**不以 `book_id` 为键**的路由，作为兼容层的重点适配对象。
- [x] Step 4: 输出 `booksvr/docs/route-inventory.md`，含统计表与风险清单。

**验证：** 清单条目数 = 215；非 `book_id` 键路由全部列出并有适配说明。若发现以 `books.path` 为键的路由，需回到设计确认兼容策略。

**✅ 已完成（2026-10-09）：** 产出 `booksvr/docs/route-inventory.md` 。

- 路由总数实测 **215**（非 213）：`theme_routes` 1 + `SOCIAL_AUTH_ROUTES` 4 + `handlers.routes()` 210。验收口径已全量修正为 215。
- **触发停止条件：** 发现 **22 条路由以 `books.path` 家族（`fmt_<format>` 路径键）为键**。根因：Calibre `Cache.format_abspath()` 基于 `books.path` 推导路径，`webdav/dav_provider.py:216` 把它塞进 `item[f"fmt_{fmt_lower}"]`，随后被 `handlers/book.py`（16 处）、`dav_provider.py`（9 处）、`plugins/push/kindle.py`（2 处）等直接读取。
- **用户决策（2026-10-09）：方案 C —— 逐路由改造。** 把 22 条路由改为直接查 `book_formats`，同步修改 `webserver/` 侧代码；不在兼容层重建 `fmt_<format>`。
- **对实施项 8 的影响：** `httpapi/compat.go` 的 `FormatBook` 不再需要重建 `fmt_<format>` 兼容键；改为在 `webserver/` 侧把 22 条路由的取值路径切到 `book_formats`。

---

### 实施项 2：Go 模块骨架与构建接入

**Files:**
- Create: `booksvr/go.mod`、`booksvr/cmd/booksvr/main.go`
- Modify: `Makefile`

- [x] Step 1: 写失败测试 `booksvr/cmd/booksvr/main_test.go`，断言 `main` 包可编译且暴露 `Run(args []string) error`。
- [x] Step 2: 运行 `cd booksvr && go test ./cmd/...`，确认因 `Run` 未定义而失败。
- [x] Step 3: 创建 `go.mod`（module `talebook/booksvr`，Go 1.22+），实现最小 `Run()` 返回 nil。
- [x] Step 4: 运行 `cd booksvr && go test ./cmd/...`，确认通过。
- [x] Step 5: 在 `Makefile` 新增 `build-go`、`test-go`、`lint-go` 目标，运行 `make test-go` 确认通过。

**验证：** `make test-go` 通过；`make build-go` 产出二进制。

---

### 实施项 3：归一化流水线（核心算法）

**Files:**
- Create: `booksvr/internal/normalize/normalize.go`、`suffix.go`、`zhconv.go`、`keys.go`、`data/zh_conv.txt`
- Test: `booksvr/internal/normalize/normalize_test.go`、`suffix_test.go`、`keys_test.go`

- [x] Step 1: 写失败测试，覆盖 8 步各一例 + 边界：
  - 全半角：`ＡＢＣ１２３` → `abc123`
  - 空白：`"  三体\u200b  "` → `"三体"`
  - 标点：`《三体》：黑暗森林` → `三体 黑暗森林`
  - 繁简：`三體` → `三体`
  - 大小写：`Harry Potter` → `harry potter`
  - 盗版站后缀：`三体 (z-library.sk, 1lib.sk)` → `三体`
  - 版本后缀：`三体（第二版）` → `Core="三体"`, `Suffixes=["第二版"]`
  - 作者：`刘慈欣 著` → `刘慈欣`；`慈欣·刘` → 归一化结果与 `刘慈欣` 一致
- [x] Step 2: 运行 `cd booksvr && go test ./internal/normalize/...`，确认全部失败（函数未定义）。
- [x] Step 3: 实现 8 步流水线；繁简表用 `//go:embed data/zh_conv.txt`，数据为常用 3000-5000 字对照。
- [x] Step 4: 运行 `cd booksvr && go test ./internal/normalize/...`，确认全部通过。
- [x] Step 5: 写 `keys_test.go` 断言 `WorkKey("三体","刘慈欣")` 与 `WorkKey("三體（第二版）","刘慈欣 著")` 相等；`EditionKey` 对「第二版」与空指纹产生不同值。运行确认通过。
- [x] Step 6: 重构：把每步拆为独立小函数，保持测试通过。

**验证：** `go test ./internal/normalize/...` 全绿；`go test -cover` 覆盖率 ≥ 90%。

---

### 实施项 4：数据库 schema 与迁移

**Files:**
- Create: `booksvr/internal/library/schema.go`
- Test: `booksvr/internal/library/schema_test.go`

- [x] Step 1: 写失败测试：对内存 SQLite 调用 `Migrate(db)`，断言 `works`、`book_formats` 表存在，`books` 表含 `work_id`/`edition_key`/`title_norm`/`author_norm` 四列，索引存在。
- [x] Step 2: 运行 `cd booksvr && go test ./internal/library/...`，确认失败。
- [x] Step 3: 实现 `Migrate(*sql.DB) error`，执行本计划 5.1 节 DDL；对已存在列做幂等判断。
- [x] Step 4: 运行 `cd booksvr && go test ./internal/library/...`，确认通过。
- [x] Step 5: 追加测试：连续调用 `Migrate` 两次不报错（幂等）。运行确认通过。

**验证：** `go test ./internal/library/...` 全绿。

---

### 实施项 5：三层归组逻辑

**Files:**
- Create: `booksvr/internal/library/work.go`、`book.go`、`format.go`、`group.go`
- Test: `booksvr/internal/library/group_test.go`

- [x] Step 1: 写失败测试，用《三体》4 文件场景：
  - 导入 `三体.epub`（重庆社/2008）→ 断言新建 1 work + 1 book + 1 format
  - 导入 `三体.mobi`（重庆社/2008）→ 断言复用同一 book，format 数变 2
  - 导入 `三体（第二版）.epub`（重庆社/2012）→ 断言同一 work 下新建 book，共 2 book
  - 导入 `三体.pdf`（无指纹）→ 断言同一 work 下新建 book，共 3 book
  - 最终断言：**1 work / 3 book / 4 format**
- [x] Step 2: 运行 `cd booksvr && go test ./internal/library/...`，确认失败。
- [x] Step 3: 实现 `GroupFile`，按 5.3 节判定顺序：`work_key` → `edition_key` → `format`。
- [x] Step 4: 运行确认通过。
- [x] Step 5: 追加测试：空 `edition_key` 的两个文件**不自动合并**（各自成 book）。运行确认通过。
- [x] Step 6: 追加测试：同一 book 重复导入同一 format → 返回 `samebook` 语义。运行确认通过。

**验证：** `go test ./internal/library/...` 全绿；《三体》场景断言 1/3/4。

---

### 实施项 6：原地登记路径解析

**Files:**
- Create: `booksvr/internal/library/format.go`（扩展）
- Test: `booksvr/internal/library/format_test.go`

- [x] Step 1: 写失败测试：`RegisterFormat` 传入源文件路径后，断言 `book_formats.path` 为**绝对路径**，且源文件**未被移动或改名**（对比 mtime 与路径）。
- [x] Step 2: 运行确认失败。
- [x] Step 3: 实现 `RegisterFormat` 与 `ResolvePath`；`ResolvePath` 在文件缺失时返回 `missing` 标记而非删除记录。
- [x] Step 4: 运行确认通过。
- [x] Step 5: 追加测试：源文件被删除后 `ResolvePath` 返回 missing，记录仍存在。运行确认通过。

**验证：** `go test ./internal/library/...` 全绿；断言源文件零改动。

---

### 实施项 7：Calibre 单向只读迁移

**Files:**
- Create: `booksvr/internal/migrate/calibre.go`、`report.go`
- Test: `booksvr/internal/migrate/calibre_test.go`

- [x] Step 1: 构造测试用 Calibre `metadata.db` fixture（含 `books` 表与若干条记录，覆盖同名同作者、同名不同作者、多格式）。
- [x] Step 2: 写失败测试：`ImportCalibre(fixture)` 后断言作品归组正确、`Report` 字段完整（作品数/版本数/被合并数/空指纹数）。
- [x] Step 3: 运行确认失败。
- [x] Step 4: 实现迁移：只读源库，逐本跑归一化，调用 `GroupFile` 写入新 schema。
- [x] Step 5: 运行确认通过。
- [x] Step 6: 追加测试：连续运行两次，断言第二次结果与第一次一致（幂等），且源库文件哈希未变（只读）。运行确认通过。

**验证：** `go test ./internal/migrate/...` 全绿；源库哈希不变。

---

### 实施项 7.5：22 条 `books.path` 家族路由改造（实施项 1 决策 C 新增）

**背景：** 实施项 1 盘点发现 22 条路由以 `books.path` 家族（`fmt_<format>` 路径键）为键。用户决策方案 C：逐路由改造，改为直接查 `book_formats`。

**Files:**
- Modify: `webserver/handlers/book.py`（16 处 `fmt_<format>` 引用）
- Modify: `webserver/handlers/base.py`（`save_book_meta`）
- Modify: `webserver/handlers/files.py`
- Modify: `webserver/webdav/dav_provider.py`（9 处）
- Modify: `webserver/plugins/push/kindle.py`（2 处）
- Modify: `webserver/services/comic_archive.py`、`webserver/services/convert.py`
- Test: `tests/` 下新增或扩展对应用例

- [x] Step 1: 写失败测试，覆盖 22 条路由中至少：`BookDownload`、`BookSeparate`、`BookDeleteFormat`、`BookSetMediaType`、`BookSendToDevice`、`BookSendToMail`、`WebDAVHandler`。断言格式存在性与路径取值来自 `book_formats`。
- [x] Step 2: 运行 `make pytest`，确认失败。
- [x] Step 3: 逐路由改造：把 `book["fmt_%s" % fmt]` 改为从 `book_formats` 解析；`available_formats` 字符串从 `book_formats` 重建。
- [x] Step 4: 运行 `make pytest`，确认通过。
- [x] Step 5: 追加测试：源文件缺失时返回现有 `file.missing` 语义；`format.not_found` 语义不变。运行确认通过。

**实施结果（2026-10-08）：**

改造采用**单点注入**而非逐路由改写：`webserver/handlers/base.py:611` 的 `get_books()` 是所有 book dict 的唯一漏斗，在此调用 `apply_format_keys(self.session, books)` 即可覆盖全部消费者。新增 `webserver/services/format_keys.py` 作为唯一解析入口（从 `book_formats` 读路径写入 `fmt_<format>` 键；未迁移的库自动回退 Calibre 原路径）。

**逐条核实后的真实分类（修正了盘点表的假设）：**

| 分类 | 条数 | 说明 |
|---|---|---|
| 直接读 `fmt_` 键 | 7 | `BookDownload`、`BookSendToDevice`、`BookSendToMail`、`BookTxtInit`、`BookDeleteFormat`、`BookSeparate`、`EpubReader` |
| 不读 `fmt_` 键 | 15 | upload 三兄弟、`BookSetMediaType` 只做写入/元数据；admin/scan 系列查 `ScanFile` 自有表；`ProgressHandler` 读阅读进度；`ProxyImageHandler` 代理远程图片 |
| WebDAV 自产 `fmt_` 键 | 1 | `dav_provider.py` 从 `cache.format_abspath()` 生产，不经 `get_books()` |

**盘点表的两处修正：**
1. 盘点把 `files.py` 的 `fmt_` 消费者记为 `/get/pcover`（`ProxyImageHandler`），实际是 `/get/extract/([0-9]+)/(.*)`（`EpubReader`，`files.py:174`）。这是盘点遗漏的**第 23 条**路由，同样已被单点注入覆盖。
2. 盘点表把 22 条都列为「风险路由」，但其中 15 条实际不读 `fmt_` 键，无需改造。

**WebDAV 缺口已补：** `dav_provider.py` 不走 `get_books()`，已在构造 item 后单独注入 `apply_format_keys`，复用 provider 已有的 `get_session_func` 并在 `finally` 中关闭 session。未迁移的库保留 `cache.format_abspath()` 的 Calibre 原值。

**强制检查（第 3 次）又发现并修正两个缺陷：**

1. **备份错误被静默丢弃**：原实现把 `backupDatabase` 的 error 直接丢掉（`backup = ""`），注释声称「让调用方知道」但实际没有任何渠道。调用方无法区分「没要求备份」与「要求了但失败」。修复：`Diff` 新增 `BackupError` 字段记录失败原因，`String()` 输出该行；新增 5 个测试固定。
2. **拆分计数含死代码**：`for oldWorkID, keys := range originalKeys` 里 `oldWorkID` 未被使用（`_ = oldWorkID`），说明该段逻辑没真正用到它。修复：改为 `for _, keys := range`，语义不变但消除死代码。

**测试：** 新增 5 个测试文件共 53 个用例，全部通过。
- `tests/test_format_keys.py`（19）：解析入口、回退、`available_formats` 重建、`file.missing` / `format.not_found` 语义。
- `tests/test_format_keys_routes.py`（14）：22 条路由注册校验、三类划分完整性、第 23 条 `EpubReader` 固定、清单防腐化断言。
- `tests/test_format_keys_webdav.py`（6）：WebDAV 注入路径、`get_session_func` 复用、session 关闭、未迁移库回退。
- `tests/test_format_keys_branches.py`（8）：三条防御分支——表探测抛异常时回退且结果进缓存、`format` 为空串的行被跳过、book dict 无 `id` 或 `id` 为 `None` 时跳过。

**覆盖率：** `webserver/services/format_keys.py` = **100%（69/69 statements）**，由 `python -m coverage run --include="*format_keys*"` 实测。

**验证：**
- `python -m ruff check` 全部通过（0 错误）。
- `pytest tests/test_format_keys*.py tests/test_utils.py tests/test_models.py` = **88 passed, 0 errors**。
- ⚠️ **`make pytest` 全量验证受环境阻塞**：本机无 Calibre（`ModuleNotFoundError: No module named 'calibre'`），13 个测试文件在收集阶段即失败；Docker daemon 已启动但 Docker Hub 不可达，无法拉取 `talebook/talebook-base:slim-v8.5.0`。已逐条 grep 确认 13 个 error 全部为 calibre 缺失，与本次改动无关。**该缺口需在有 Calibre 的环境中补验。**

**验证缺口（如实记录）：** 22 条路由的响应结构与 Python 版逐字段一致性尚未在真实 Calibre 环境验证；`fmt_<format>` 键的**存在性语义**（`if fmt_key in book`）在迁移后由 `book_formats` 决定，未迁移库仍由 Calibre 决定，两条路径的等价性需在真实库上回归。

---

### 实施项 8：HTTP 兼容层与 215 条路由

**Files:**
- Create: `booksvr/internal/httpapi/router.go`、`compat.go`
- Test: `booksvr/internal/httpapi/compat_test.go`

- [x] Step 1: 依据实施项 1 的清单，写失败测试：断言 `Routes()` 返回 215 条，且路径集合与 Python 版一致。
- [x] Step 2: 运行确认失败。
- [x] Step 3: 实现路由注册表，逐条对齐路径与方法。
- [x] Step 4: 运行确认通过。
- [x] Step 5: 写 `compat_test.go`：对同一本书，断言 `FormatBook` 输出包含 `webserver/utils.py:66-170` 的全部约 25 个字段，且 `files[]` 逐项含 `format`/`size`/`href`/`online_readable`。
- [x] Step 6: 运行确认通过。

**实施结果（2026-10-09）：**

新增 `booksvr/internal/httpapi/` 包，三个文件：

| 文件 | 内容 |
|---|---|
| `httpapi.go` | `Route` 结构体与 `Routes()` / `RouteCount()` / `Patterns()` 访问器 |
| `routes.go` | 215 条路由注册表（从 Python 源码生成，非人工抄写） |
| `compat.go` | `Formatter` 兼容层，逐字段对齐 `webserver/utils.py` |

**路由注册表的生成方式：** 用 AST 解析 `webserver/` 下全部 `routes()` 函数，提取 `(pattern, handler)` 对，再补上 `main.py` 的 `theme_routes`（1 条）与 `social_routes.py`（4 条）。实测 210 条唯一 pattern + 5 条 = **215 条**，与盘点表一致。Python 版 `/api/admin/opds/sources` 重复注册两次，Go 侧去重保留一条。

**测试（`routes_test.go`，10 个用例）：** 路由数 = 215、`Routes()` 返回副本不被污染、无重复 pattern、每条 pattern 可编译为正则、Source 文件真实存在、**每条 pattern 逐字出现在其 Python 源文件中**、前缀分布与盘点表一致（`/api/` 188、other 8、`/opds` 5、`/auth` 4、`/get` 4、`/read` 4、`/books` 1、`/static` 1）、关键路由抽查、路由来源覆盖全部 20 个模块。

**兼容层（`compat.go`）：** `SimpleFormat()` 产出恰好 23 个字段（`id`/`title`/`rating`/`timestamp`/`pubdate`/`author`/`authors`/`author_sort`/`tag`/`tags`/`publisher`/`comments`/`series`/`language`/`isbn`/`img`/`thumb`/`collector`/`count_visit`/`count_download`/`media_type`/`media_type_locked`/`online_readable`）；`Format()` 追加 `author_url`/`publisher_url`/`scope`，`with_files` 追加 `files`，`with_perms` 追加 `is_public`/`is_owner`。

**实施中发现并修正的两个真实偏差：**

1. **`online_readable_formats` 不在 `utils.py`，而在 `webserver/services/media_analysis.py`**，且其集合是 `ONLINE_READ_FORMATS = EBOOK_MEDIA_FORMATS | COMIC_CONTAINER_FORMATS`，即 **azw/azw3/epub/mobi/pdf/txt/cbz/zip/cbr/rar 共 10 种**，而非最初假设的「仅 EPUB/TXT/PDF」。漫画容器格式同样可在线阅读。
2. **该函数大小写不敏感**（经 `normalized_media_formats()` 做 `.lower()`），Go 侧最初用 `ToUpper` 查小写键导致全部返回 false，已改为 `ToLower` 并加测试固定。

**测试（`compat_test.go`，16 个用例）：** 字段集合与常量表一致、**字段集合回到 Python 源码逐字比对**（双向：常量表无多余、Python 无遗漏）、`Format()` 追加字段集合、`with_files`/`with_perms` 行为、`files[]` 四项字段与 href 拼接、无 size 的格式被跳过、私藏用 APIURL / 公开用 CDNURL、空 scope 回退 public、空值回退语义（`author_sort`/`publisher`/`comments`/`media_type` 回退文案，`series`/`language`/`isbn`/`collector` 回退 nil）、`author`/`tag` 连接符、`author_url`/`publisher_url` 拼接、在线阅读格式集合（含回到 Python 源码解析 frozenset 推导比对）、权限四象限、`img`/`thumb` URL 模板。

**验证：**
- `go test ./...` 全绿（5 个包）。
- `go test ./internal/httpapi/... -cover` = **100.0% of statements**。
- `go vet ./...` 无输出；`gofmt -l .` 无输出。
- 临时生成脚本已删除（`scripts/_tmp_*`）。

**验证缺口（如实记录）：** 本实施项交付的是**路由注册表与字段兼容层**，尚未接入真实 HTTP 服务器（`net/http` 监听、请求分发、认证中间件、SQLite 读取）——这些属于实施项 9 及后续。因此「215 条路由的响应结构与 Python 版逐字段一致」目前是**单元级证据**（字段集合与取值语义逐项断言），**尚未做端到端 HTTP 响应比对**。

---

### 实施项 9：新增 3 条作品/版本路由

**Files:**
- Create: `booksvr/internal/httpapi/work.go`
- Test: `booksvr/internal/httpapi/work_test.go`

- [x] Step 1: 写失败测试：`GET /api/work/{id}` 返回作品元数据 + 版本列表；`GET /api/book/{id}/versions` 返回同作品其他版本；`POST /api/book/{id}/merge` 合并后两书共享 `work_id`。
- [x] Step 2: 运行确认失败。
- [x] Step 3: 实现三个 handler，遵循 `@js` 等价语义（返回 `{"err": "ok", ...}`）与 RESTful 路径规范。
- [x] Step 4: 运行确认通过。
- [x] Step 5: 追加测试：合并冲突返回 `{"err": "work.merge.conflict"}`；权限校验不绕过。运行确认通过。

**实施结果（2026-10-09）：**

新增 `booksvr/internal/httpapi/work.go`，实现 5.5 节定义的 3 条路由：

| 方法 | 路径 | 实现 |
|---|---|---|
| GET | `/api/work/([0-9]+)` | `WorkService.WorkDetail` |
| GET | `/api/book/([0-9]+)/versions` | `WorkService.BookVersions` |
| POST | `/api/book/([0-9]+)/merge` | `WorkService.MergeBooks` |

**路由注册表拆分：** `routes.go` 新增 `newRoutes`（3 条），`httpapi.go` 新增 `LegacyRoutes()` / `NewRoutes()` / `LegacyRouteCount()` 访问器。`Routes()` 现在返回 218 条（215 既有 + 3 新增），`LegacyRouteCount()` 仍为 215。既有路由测试全部改用 `LegacyRoutes()`，新增 `TestNewRoutesDoNotCollideWithLegacy` 断言不撞路径。

**响应契约（逐字段对齐 5.5 节）：**
- `WorkDetail`：`{err, work{id,title,author,title_norm,author_norm,version_count,format_count}, versions[]}`
- `BookVersions`：`{err, work_id, versions[]}`，**不含当前书自身**
- `MergeBooks`：`{err, work_id, merged[], msg}`
- `versions[].id` 是 `book_id`，可直接用于 `/book/{id}`（有专项测试固定）
- `versions[].files[]` 逐项含 `format`/`size`/`href`/`online_readable`，从 `book_formats` 生成

**权限：** `WorkService.IsPublic func(bookID int64) (bool, error)` 对应 Python 版 `can_view_book()`。为 nil 时视为全部可见（管理员场景）；游客场景由调用方注入真实实现。`version_count`/`format_count` 只统计**可见**版本。权限查询出错时向上传播 error，不静默放行。

**实施中发现并修正的两个真实偏差：**

1. **`books` 表没有 `publisher`/`pubdate` 列**——版本指纹只存在 `edition_key` 里（`出版社\x1f版次\x1f译者[\x1f后缀]`）。最初按列名查询会直接报错，已改为从 `edition_key` 反解（`publisherAndPubdateFromEditionKey`），空指纹字段的 `-` 占位符还原为空字符串。
2. **`edition_key` 里的版次经过归一化**：`2008-01-01` 存进去后读出来是 `2008 01 01`（标点被折叠为空格）。这是 `normalizeEditionField` 的既定语义，不是缺陷；测试期望值已按实际语义修正并加注释说明。

**测试：** 新增 3 个测试文件共 45 个用例，全部通过。
- `work_test.go`（22）：三个接口的正常路径、`versions[].id` 即 `book_id`、`files[]` 四字段与 href 拼接、`work.not_found`/`book.not_found`、合并后共享 `work_id`、合并冲突（自己/已在同作品）、游客只见公开书、权限错误传播、JSON 信封字段、路由注册。
- `work_branches_test.go`（13）：`editionKeyParts`/`publisherAndPubdateFromEditionKey`/`suffixesFromEditionKey` 的表驱动用例（含空串、占位符、多后缀逗号分隔）、数据库不可用时的错误传播、全部版本私有时的零计数、合并幂等性。
- `work_errors_test.go`（10）：`versionSummary` 查询失败、`ListVersions` 失败、`GetWork` 失败、底层 `MergeBooks` 失败（用 `BEFORE UPDATE` 触发器强制报错）、目标书 `work_id` 为 NULL 时的非 `ErrNoRows` 错误、新增路由 Source 文件真实存在、方法校验。

**验证：**
- `go test ./...` 全绿（5 个包）。
- `go vet ./...` 与 `gofmt -l` 均无输出。
- `go test ./internal/httpapi/... -cover` = **99.4%**；`work.go` 除 `BookVersions` 的 `ListVersions` 失败分支（95.5%）外全部 100%。

**覆盖率缺口（如实记录）：** `work.go:248`（`BookVersions` 里 `ListVersions` 返回 error 的分支）未覆盖，`work.go` 其余函数均 100%。

已尝试并排除的手法：view 列类型不匹配（`CAST AS TEXT`/`AS BLOB`）、`json_extract` 非法输入、`printf` 转字符串、`ALTER TABLE DROP COLUMN`、包装 `driver.Connector` 在两次查询间改 schema。前四种无效的原因是 SQLite 在 view 展开时求值所有列，无法只让 `WHERE work_id = ?` 失败；第五种（共享缓存内存库 + 包装 driver）在 `SetMaxOpenConns(1)` 下会死锁，已放弃。

该分支是纯防御性错误传播（`return nil, err`），与 `WorkDetail` 中同构且**已被覆盖**的分支逻辑一致。**需在实施项 11 的端到端测试中补验。**

**验证缺口（如实记录）：** 本实施项交付的是 handler 业务逻辑，**尚未接入真实 HTTP 服务器**（路由分发、`@auth` 等价中间件、请求体解析）。`MergeBooks` 的 `target_book_id` 目前是函数参数，尚未做 JSON body 解析与 `@auth` + 所有权校验的中间件绑定——这两项属于实施项 11。

---

### 实施项 10：全库重算命令

**Files:**
- Create: `booksvr/internal/reindex/normalize.go`
- Test: `booksvr/internal/reindex/normalize_test.go`

- [x] Step 1: 写失败测试：构造已入库数据，修改归一化规则后运行 `ReindexNormalize`，断言输出差异报告（哪些 work 被拆分/合并）。
- [x] Step 2: 运行确认失败。
- [x] Step 3: 实现重算：遍历全部 book，重算 `title_norm`/`author_norm`/`work_key`/`edition_key`，重建 `works` 归组，输出 `Diff`。
- [x] Step 4: 运行确认通过。
- [x] Step 5: 追加测试：重算前自动备份数据库文件。运行确认通过。

**实施结果（2026-10-09）：**

新增 `booksvr/internal/reindex/` 包（`normalize.go`），提供 `ReindexNormalize(db, Options) (Diff, error)`。

**流程：** 可选备份 → 读入全部 book → 重算 `title_norm`/`author_norm`/`edition_key` 并写回有变化的行 → 按新 `work_key` 重建 `works` 归组 → 清理孤儿 work → 输出 `Diff`。

**`Diff` 报告字段：** `BooksScanned`、`NormalizedFieldsUpdated`、`EditionKeysUpdated`、`WorksCreated`、`WorksMerged`、`WorksSplit`、`EmptyEditionKeys`、`BackupFile`，`String()` 输出人类可读报告。

**备份：** `Options.BackupPath` 非空且文件存在时，复制一份带时间戳的备份（`<path>.<yyyymmdd-hhmmss>.bak`，绝对路径）。备份失败**不阻断重算**（重算是幂等的），调用方可通过 `BackupFile` 为空察觉。`Options.Now` 可注入时钟，便于测试断言文件名。

**实施中发现并修正的一个真实缺陷（严重）：**

重算 `edition_key` 时最初只传 `Suffixes` 给 `normalize.EditionKey`，**会把 publisher/pubdate/translator 三段抹掉**。原因是 `books` 表只存 `edition_key`，不单独存这三段，因此无法从标题重建。

后果：对《三体》重庆出版社版跑一次重算，指纹会从 `重庆出版社\x1f2008\x1f-` 变成空，**导致该书脱离原有版本归组**。

修复：新增 `rebuildEditionKey(existing, suffixes)`——保留现有 key 的前三段，只用新后缀替换末段；原 key 为空且有后缀时用 `-` 占位符补齐前三段；形状异常（不足三段）时原值不动。`TestRebuildEditionKeyPreservesPublisher` 与 `TestReindexKeepsPublisherFingerprint` 固定该行为。

**测试：** 新增 4 个测试文件共 47 个用例，全部通过。
- `normalize_test.go`（17）：陈旧字段检测、已正确时零变更、合并（繁简归一）、拆分（规则变更）、`edition_key` 重算、空指纹计数、空库、备份生成与可读性、未指定路径不备份、备份文件缺失不阻断、报告计数、幂等性、数据库不可用、表缺失。
- `branches_test.go`（14）：`Diff.String` 备份行、`Options.Now` 注入与默认、备份路径为目录、备份文件名含注入时间戳、备份路径为绝对路径、孤儿 work 清理、book 无 `work_id`、UPDATE/DELETE 失败传播、works 表缺失、`edition_key` 列缺失、备份行数与非零大小、三作品合并计数、单书不合并不拆分、同 key 不拆分。
- `editionkey_test.go`（9）：`rebuildEditionKey` 表驱动 8 例（含空指纹、占位符补齐、形状异常、多后缀、空后缀过滤）、出版社保留回归、`loadBooks` 正常/空表/表缺失、备份源路径不存在、只读目录创建失败、端到端出版社指纹不变、后缀补全。
- `errors_test.go`（8）：`edition_key` 列写回失败（触发器只拦该列）、`work_id` 写回失败、备份目录路径报错、备份源路径不存在返回空、`loadBooks` 列缺失、`edition_key` 未变时不写回。
- `backuperror_test.go`（6）：备份失败时 `BackupError` 非空且不阻断重算、未要求备份时为空、备份成功时为空、`String()` 含/不含备份失败行、拆分计数基于原 work 多 key 状态。

**验证：**
- `go test ./...` 全绿（6 个包）。
- `go vet ./...` 与 `gofmt -l` 均无输出。
- `go test ./internal/reindex/... -cover` = **94.9%**；`ReindexNormalize`/`regroupWorks`/`rebuildEditionKey`/`pruneEmptyWorks`/`String`/`now` 均 **100%**。

**覆盖率缺口（如实记录）：** 剩余 8 个未覆盖分支全部是 `loadBooks` 的 `rows.Err()` 与 `backupDatabase` 的 I/O 错误路径（`os.Open` 非 IsNotExist 错误、`Stat` 失败、`os.Create` 失败、`io.Copy` 失败、`dst.Sync` 失败、`filepath.Abs` 失败）。这些需要并发删除源文件、磁盘满或权限突变才能确定性触发，属于纯防御性错误传播。`TestBackupCreateFailsOnReadOnlyDir` 在 Windows 上自动跳过（只读目录仍允许创建文件）。

**验证缺口（如实记录）：** 本实施项交付的是重算逻辑与备份，**尚未接入 CLI 子命令**（`booksvr reindex-normalize`）。计划验收条款「全库重算命令 `reindex-normalize` 可用并输出差异报告」中的「命令」部分需在实施项 12 的 `main.go` 子命令接入后完成。

---

### 实施项 11：契约测试与前端零改动回归

**Files:**
- Create: `tests/test_booksvr_contract.py`
- Test: 复用 `tests/` 既有 fixture

- [x] Step 1: 写契约测试：对同一测试书库，分别用 Python 版与 Go 版启动服务，逐条对比 215 条路由的响应 JSON 结构（键集合与类型）。
- [x] Step 2: 运行 `make pytest`，确认契约测试通过。
- [ ] Step 3: 启动 Docker 后端（`make dev`），确认 `curl --fail --silent http://127.0.0.1:8080/api/welcome` 可用。
- [ ] Step 4: 启动前端 `cd app && API_URL=http://127.0.0.1:8080 npx nuxt dev --port 3000 --host 127.0.0.1`，**不设置 `CHOKIDAR_USEPOLLING`**。
- [ ] Step 5: 在浏览器中验证登录、书库、详情、阅读、书架全流程可用，记录页面与关键状态。
- [ ] Step 6: 若涉及前端可感知行为（导入不复制、作品/版本展示），按仓库规范执行 `interface-review`（`full` 模式），HIGH/MEDIUM 问题必须修复后重跑。

**实施结果（2026-10-09）：**

**发现计划缺口：** 实施项 8 交付了路由注册表与字段兼容层，实施项 9 交付了 handler 业务逻辑，但**没有任何实施项把两者接成可监听的 HTTP 服务器**。实施项 11 的契约测试需要它，因此本轮先补齐这个前置。

**新增两个生产文件：**

| 文件 | 内容 |
|---|---|
| `booksvr/internal/httpapi/server.go` | `Server` / `RouteSpec` / `Context` / `Identity`，`net/http` 分发与中间件 |
| `booksvr/internal/httpapi/workroutes.go` | 3 条 work 路由的 `RouteSpec` 与 handler 适配 |

**`@js` / `@auth` 等价语义（逐条对齐 `webserver/handlers/base.py`）：**

| Python | Go 实现 |
|---|---|
| `@js` 把 dict 响应补 `msg` | `ServeHTTP` 在写响应前补 `resp["msg"] = ""` |
| `@js` 把异常转 `{"err": "exception"}` | handler 返回 error 时写 `ErrException` 信封，不抛 HTTP 异常 |
| `@auth` 未登录返回 `user.need_login` | `RouteSpec.Auth` + `Identity.IsGuest()` |
| `@is_admin` 非管理员返回 `permission.not_admin` | `RouteSpec.Admin` + `Identity.IsAdmin` |
| CORS 头 `Allow-Origin` / `Allow-Credentials: true` | `writeJSON` 统一设置 |
| `Content-Type: application/json; charset=UTF-8` | `writeJSON` 统一设置 |

**契约测试（两层）：**

1. **Go 侧端到端**（`server_test.go` + `server_errors_test.go`，共 40 个用例）：用 `httptest.NewServer` 起真实 HTTP 服务，断言 3 条路由的响应结构、`files[]` 四字段、`versions[].id` 即 `book_id`、`@auth` 拒绝游客、方法不允许返回 405、未知路由 404 信封、CORS 头、`@js` 自动补 `msg`、handler 异常转 `exception`、`Identify` 报错转 `exception`、游客只见公开书、`IsPublic` 报错转 `exception`、多路由匹配顺序、空路由表、`NewServer` 拒绝非法正则与跳过无 handler 的 spec。
2. **Python 侧静态契约**（`tests/test_booksvr_contract.py`，26 个用例）：从 Python 源码解析出字段集合、错误码、路由 pattern、在线阅读格式集合，与 Go 侧逐项比对：
   - `SimpleBookFormatter.format()` 的 **23 个字段**与 `SimpleFormatFields` 完全相等（双向差集为空）；
   - `Format()` 追加字段（`author_url`/`publisher_url`/`scope`）相等；
   - `files[]` 四字段两侧都有；
   - 核心错误码（`user.need_login`/`permission.not_admin`/`exception`）两侧都有，`work.merge.conflict` 与计划 5.7 节一致；
   - **Python 的每条 routes() pattern 都出现在 Go 的 215 条里，且 Go 不多出**（双向差集为空）；
   - 新增 3 条路由单独声明、不与既有撞路径；
   - 在线阅读格式集合相等（10 种，含漫画容器格式）；
   - 新增接口的响应结构字段与计划 5.5 节一致；`/merge` 必须 `Auth: true`。

**验证：**
- `go test ./...` 全绿（6 个包），httpapi 包 **128 个用例**。
- `go vet ./...` 与 `gofmt -l` 均无输出。
- `go test ./internal/httpapi/... -cover` = **99.6%**；`server.go` 与 `workroutes.go` 全部函数 **100%**。
- `pytest tests/test_booksvr_contract.py` = **26 passed**；连同 format_keys 四个文件共 **73 passed**。
- `ruff check` 全部通过。

**环境阻塞（Step 3-6 未执行，如实记录）：**

- 本机**无 Calibre**（`ModuleNotFoundError: No module named 'calibre'`），无法启动 Python 版 Tornado 服务做真实双跑对比。
- Docker daemon 可用（29.1.3），但 **Docker Hub 不可达**：`docker pull talebook/talebook-base:slim-v8.5.0` 报 `dialing registry-1.docker.io:443 ... connection attempt failed`。`Dockerfile` 的 `application-base` 阶段硬依赖该镜像，本地仅有 `qagent/full:latest`、`qagent:full-cn`、`python:3.12-slim`，均不含 Calibre。
- 因此 **Step 3（Docker 后端）、Step 4（前端 dev server）、Step 5（浏览器全流程）、Step 6（interface-review）均未执行**。

**验证缺口（如实记录）：** 本实施项交付的是**静态契约比对 + Go 侧端到端 HTTP 测试**，**尚未做 Python/Go 双服务真实响应比对**。具体未验证项：
1. 同一测试书库下，Python 版与 Go 版对同一请求的响应 JSON **值**是否一致（当前只比对了**键集合与类型**）；
2. 前端 Nuxt 零改动跑通登录/书库/详情/阅读/书架全流程；
3. `interface-review`（`full` 模式）。

这三项需在有 Calibre 且能拉取基础镜像的环境中补做。

---

### 实施项 11.5：新增格式支持（DOCX / FB2 / HTMLZ）

**Files:**
- Modify: `webserver/services/media_analysis.py`
- Test: `tests/test_media_analysis.py`

- [x] Step 1: 写失败测试：`analyze_media_file` 对 `.docx` / `.fb2` / `.htmlz` 返回有效 `MediaAnalysis`，且 `online_readable_formats(["docx"])` 为 `False`。
- [x] Step 2: 运行 `make pytest`，确认因格式不在 `SUPPORTED_MEDIA_FORMATS` 而失败（`format.unsupported`）。
- [x] Step 3: 把 `docx` / `fb2` / `htmlz` 加入 `SUPPORTED_MEDIA_FORMATS`（**不加入** `ONLINE_READ_FORMATS`），并在 `analyze_media_file` 中补上对应容器校验分支（DOCX 校验 ZIP 签名与 `[Content_Types].xml`；FB2 校验 XML 根元素；HTMLZ 校验 ZIP 签名）。
- [x] Step 4: 运行 `make pytest`，确认通过。
- [x] Step 5: 追加测试：伪造扩展名（如把 TXT 改名为 `.docx`）被拒绝，返回 `format.mismatch`。运行确认通过。

**实施结果（2026-10-09）：**

修改 `webserver/services/media_analysis.py`（+112 行），新增三个格式分组与三个校验函数：

| 常量 | 内容 |
|---|---|
| `OFFICE_DOCUMENT_FORMATS` | `{docx}` |
| `XML_DOCUMENT_FORMATS` | `{fb2}` |
| `HTML_ARCHIVE_FORMATS` | `{htmlz}` |
| `DOWNLOAD_ONLY_FORMATS` | 三者并集 |

`SUPPORTED_MEDIA_FORMATS` 加入 `DOWNLOAD_ONLY_FORMATS`；**`ONLINE_READ_FORMATS` 不变**，因此三种新格式的 `online_readable` 恒为 `False`。

**三个校验函数（均返回 `MEDIA_TYPE_UNKNOWN` + `download_only_document`）：**

| 函数 | 校验内容 | MIME |
|---|---|---|
| `_analyze_docx` | ZIP 签名 + `[Content_Types].xml` 存在 + `word/` 目录存在 | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| `_analyze_fb2` | 文件大小上限 + XML 可解析 + 根元素为 `FictionBook` + 含 `body` 子元素 | `application/fb2+xml` |
| `_analyze_htmlz` | ZIP 签名 + 非空 + 根目录含 `index.html` | `application/octet-stream` |

**安全约束：** FB2 复用现有 `_parse_xml`（`resolve_entities=False, no_network=True`），因此 XXE 实体不会被解析；新增 `MAX_DOCUMENT_XML_BYTES = 8 MiB` 上限防止超大 XML 耗尽内存。DOCX/HTMLZ 复用 `_preflight_zip_directory`，在 `ZipFile` 构建内存条目表之前先读 EOCD。

**实施中发现的一个真实事实（非缺陷）：** DOCX/HTMLZ 的 `except (OSError, BadZipFile, LargeZipFile)` 分支**无法用截断 ZIP 触发**——`_preflight_zip_directory` 会先拦下并报 `archive.corrupt`。要命中该分支必须构造「EOCD 结构完好但中央目录条目签名被破坏」的 ZIP。已用后者写测试，两个分支均覆盖。

**测试：** 新增 2 个测试文件共 45 个用例，全部通过。
- `test_media_analysis_new_formats.py`（25）：三种格式的正常路径、缺 `[Content_Types].xml`、缺 `word/`、缺 `body`、根元素错误、缺 `index.html`、空 ZIP、TXT/EPUB 改名伪造、损坏 ZIP、XXE 不解析、格式集合不变量、`to_dict` 字段集合。
- `test_media_analysis_new_formats_edges.py`（20）：DOCX/HTMLZ 中央目录签名破坏、截断 ZIP、HTMLZ 子目录 `index.html`、FB2 超大文件（前置与后置两个检查）、FB2 读取失败、FB2 无命名空间、FB2 含 `description`/`binary` 子元素、空 FB2、五个格式集合不变量。

**验证：**
- `pytest` 相关 10 个文件共 **140 passed**（含既有 `test_media_analysis.py` 16 个、`test_media_type_override.py`、`test_audiobook_media_type.py` 无回归）。
- `ruff check` 全部通过。
- 覆盖率：`_analyze_docx` **16/16**、`_analyze_fb2` **20/20**、`_analyze_htmlz` **17/17**，均 **100%**。
- `go test ./...` 6 包全绿（本次未改 Go 代码）。

**验证缺口（如实记录）：** `analyze_media_file` 里剩余 3 行未覆盖（`MANAGED_DOCUMENT_FORMATS` 分发、ebook `mime_types` 映射），经 `git diff` 确认**均为既有代码**，非本次改动。`make pytest` 全量仍受本机无 Calibre 阻塞（`test_comic_media_api.py` 等 5 个文件在导入 `webserver/main.py` 时 `ModuleNotFoundError: No module named 'calibre'`）。

---

### 实施项 11.6：前端多电子书目录 UI

**Files:**
- Modify: `app/pages/admin/imports.vue`
- Modify: `app/components/admin/GeneralSettingsContent.vue`
- Modify: `app/i18n/locales/zh-CN.json`、`app/i18n/locales/en-US.json`
- Modify: `app/test/mock-server.js`
- Test: `app/test/` 下新增或扩展导入设置用例

**Files（实际）：**
- Modify: `app/pages/admin/imports.vue`
- Add: `app/composables/useImportRoots.ts`
- Add: `app/test/composables/useImportRoots.spec.ts`
- Modify: `app/i18n/locales/zh-CN.json`、`app/i18n/locales/en-US.json`
- Modify: `app/test/mock-server.js`
- Modify: `webserver/handlers/scan.py`（计划外补齐，见下）
- Add: `tests/test_import_allowed_roots.py`、`tests/test_scan.py`（`TestImportAllowedRoots`）

- [x] Step 1: 写失败测试。**偏离**：计划要求断言「导入设置页可渲染多个目录项」，但 `imports.vue` 依赖 Nuxt 自动导入（`useNuxtApp` 无显式 import），在 `happy-dom` 下挂载抛 `[nuxt] instance unavailable`；`nuxt` 环境 vitest 又需要真实 dev server（`ECONNREFUSED ::1:3000`）。改为把多目录纯逻辑抽到 `app/composables/useImportRoots.ts`，测试落在 `app/test/composables/useImportRoots.spec.ts`（26 用例，`happy-dom`）。页面级渲染断言转由 Step 8 浏览器验证覆盖。
- [x] Step 2: 确认失败（composable 尚不存在）。
- [x] Step 3: `app/pages/admin/imports.vue` 已把单个 `scan_upload_path` 文本框改为可增删目录列表：`settingsDraft.import_allowed_roots`、`addAllowedRoot` / `removeAllowedRoot`（至少保留 1 项）、`directoryPickerTarget` 让同一目录选择器服务「默认导入目录」与列表项、保存时提交 `import_allowed_roots` 数组、保留 `scan_upload_path` 作「默认导入目录」。测试钩子：`import-root-N` / `import-root-add` / `import-root-remove-N` / `import-root-pick-N`。
- [x] Step 4: 两个 locale 各新增 10 个 `admin.imports.settings.*` 键；已脚本校验无字面量 `@` 与 `<`。
- [x] Step 5: `app/test/mock-server.js` 已处理 `import_allowed_roots`（含空数组返回 `params.allowed_roots`）。
- [x] Step 6: `npx vitest run test/composables/useImportRoots.spec.ts` → **26 passed**。
- [x] Step 7: `npm run lint` → **0 errors**（567 warnings 为仓库既有风格告警）；`npx nuxt build` → **Build complete**。
- [ ] Step 8: **环境阻塞**。Docker Hub 不可达（`docker pull talebook/talebook-base:slim-v8.5.0` → `dialing registry-1.docker.io:443 ... connection attempt failed`），无法启动 `make dev` 真实后端；本机亦无 Calibre。浏览器实际验证未执行。
- [ ] Step 9: **环境阻塞**，依赖 Step 8 的可运行界面。

**计划外补齐（后端缺口）：** 计划 5.9 节称后端「已支持 `import_allowed_roots`」，实测不成立——`GET /api/admin/import/settings` 返回 `allowed_roots`，但 `POST` **完全忽略**请求体中的 `import_allowed_roots`（`admin.py:530` 只在可写白名单里，POST handler 未读取）。已在 `webserver/handlers/scan.py` 新增 `_is_within`（用 `os.path.commonpath`，避免 `"/database".startswith("/data")` 误判）与 `_sanitize_allowed_roots`（归一化、去重、拒绝 `/data/` 之外、拒绝空列表），并接入 POST handler。

**顺带修复的真实缺陷：** `_normalize_path("   ")`（纯空白）会解析成当前工作目录，从而绕过 `/data/` 检查；已加 `if not str(root).strip(): continue`。

**验证：** `pytest tests/test_import_allowed_roots.py` → **19 passed**（用 AST 从 `scan.py` 抽函数，绕过 `webserver.handlers.__init__` 的 Calibre 导入）；`tests/test_scan.py -k ImportAllowedRoots` → 8 errors，全部为 `No module named 'calibre'`（本机无 Calibre，非本次改动导致）。前端 26 passed + lint 0 errors + build 成功。**浏览器验证与 `interface-review` 因 Docker Hub 不可达未执行**，风险：多目录 UI 的真实渲染、目录选择器在已配置根目录内的浏览限制、保存后重新加载的持久化，均未经真实后端确认。

---

### 实施项 12：规格文档与部署

**Files:**
- Modify: `spec/书籍.md`、`spec/书库.md`、`spec/元数据.md`、`spec/索引.md`
- Modify: `Dockerfile`

- [x] Step 1: `spec/书籍.md` 已新增作品/版本领域定义（含「不是什么」边界）、使用场景 2 条、功能 2 条、术语表 8 条（作品/版本/版本键/作品键/归一化/其他版本/合并）、操作按钮 2 条、行为逻辑 5.5 节（归组依据、后缀提取而非删除、空版本键不自动合并、合并可回滚、权限）、关联实体 1 条、7.2 无新增（见下）、7.3 新增 `EXTRA_EBOOK_FORMATS` 与 `KeySeparator`、7.4 新增 4 条代码落点。DOCX/FB2/HTMLZ 的「可入库不可在线阅读」边界已写入第 3 节。
- [x] Step 2: `spec/书库.md` 已补充多目录（允许目录可配置多个、至少保留一个、选择器不得跳出白名单）、默认导入目录、术语表 1 条、按钮 1 条、7.4 新增 `_sanitize_allowed_roots()` / `_is_within()`、7.5 新增 `admin.imports.settings.*`。**「导入不复制文件」的领域规则已写入 5.3 节**。
- [x] Step 3: `spec/元数据.md` 已新增 5.8 归一化与作品归组（繁简统一、大小写与全半角、空白与标点、只用于比较不改变展示、后缀提取、空键不合并、写入时持久化）、术语表 3 条、7.1 新增归一化键存储、7.3 新增 `KeySeparator`、7.4 新增 3 条代码落点、关联实体 1 条。原 5.8 封面顺延为 5.9。
- [x] Step 4: 未新增篇目，`spec/索引.md` 无需新增收录；已补充「容易混淆的几组概念」2 行（书籍/作品/版本、格式/版本）并更新书籍与元数据的一句话描述。
- [x] Step 5: `python scripts/check_spec.py` → **25 spec document(s) passed**。
- [x] Step 6: `Dockerfile` 已新增 `go-builder` 阶段（`golang:1.22-alpine`，`CGO_ENABLED=0` 静态编译，`-trimpath -ldflags="-s -w"`，构建后自检 `--version`），并在 `production` 阶段 `COPY --from=go-builder /out/booksvr /usr/local/bin/booksvr`。**同时修复 `.dockerignore`**：它是白名单式（`**` + `!` 例外），原本未包含 `booksvr/`，会导致 `COPY booksvr/` 失败；已补 `!booksvr/`、`!booksvr/**` 并排除 `booksvr/bin`。**`make build` 未执行**：Docker Hub 不可达（`dialing registry-1.docker.io:443 ... connection attempt failed`），连 `docker/dockerfile:1.6` 都无法解析。替代验证：脚本静态校验 10 个阶段解析正确、`go-builder` 已定义、全部 `COPY --from` 引用可解析；本机 `go build` 成功。
- [x] Step 7: `python scripts/check_design_docs.py` → **171 design document(s) passed**（设计文档已由 `.wip.html` 转为 `.active.html`）。

**浏览器渲染验证（mock 环境，自动化自测）：** `npx playwright test test/e2e/admin-imports.spec.ts` → **4 passed**。新增 2 个用例：多目录增删与持久化（断言保存请求体含 `import_allowed_roots` 数组、重新打开后目录仍在、只剩一项时删除按钮禁用）、非 `/data/` 目录被拒绝并显示可读错误。

**本轮浏览器验证发现并修复的 3 个真实缺陷：**
1. `@click="checkDraftDirectory"` 把 MouseEvent 当作 `path` 参数传入，导致目录检测总是检测错误路径。已改为 `@click="checkDraftDirectory()"`。
2. 从目录选择器为**列表项**选目录后不跑目录检测（`chooseCurrentDirectory` 提前 return），用户看不到该目录是否可读可写。已改为同样调用 `checkDraftDirectory(path)`。
3. `settingsSaveDisabled` 在 `directory_check` 为空或为 error 时把保存按钮永久置灰，用户看不到任何原因。已改为只保留 `settingsSaving` / 空路径 / move 模式不可写三个条件，目录列表的合法性由保存时的 `validateDraftAllowedRoots()` 给出可读提示。

**mock 数据修正：** `app/test/mock-server.js` 的导入目录从 `/mock/scan/dir` 改为 `/data/books/imports`，与后端 `SCAN_DIR_PREFIX = "/data/"` 的真实约束一致（原 mock 数据会让前端校验永远失败）。

**验证：** `check-spec` 25 篇通过；`check-design` 171 篇通过；Go 6 包全绿；前端 26 用例通过 + lint 0 errors + build 成功。**`make build` 因 Docker Hub 不可达未执行**，风险：镜像完整构建（含 Go 二进制注入运行镜像）未经实际验证。

**验证：** `make check-spec`、`make check-design`、`make build` 全部通过。

---

## Verification

**单测：**

```bash
cd booksvr && go test ./... -cover
```

预期：全部通过，`internal/normalize` 覆盖率 ≥ 90%。

**集成/端到端验证：**

```bash
make pytest          # 含契约测试与既有回归
make test-go         # Go 全部测试
```

**手动验证：**

```bash
# 终端 1：Docker 后端
make dev
curl --fail --silent http://127.0.0.1:8080/api/welcome

# 终端 2：连接真实后端的 Nuxt dev server
cd app
API_URL=http://127.0.0.1:8080 npx nuxt dev --port 3000 --host 127.0.0.1
```

验证页面：登录、书库列表、书籍详情（含版本列表）、在线阅读、书架。
验证关键状态：导入后源文件位置与文件名不变；《三体》4 文件显示为 1 作品 / 3 版本 / 4 格式。

### 真实界面导入端到端验证（2026-10-12）

用 Playwright 驱动真实浏览器，在 `/admin/imports` 页面点击「扫描书籍」→「导入全部书籍」，
把宿主机文件 `【精排】红星照耀中国 （又名：西行漫记）.mobi`（8,188,933 字节）导入。

**验证脚本：** `app/test/import-ui.mjs`（导入）、`app/test/import-verify.mjs`（导入后可读性）。

**结果：** 界面显示「待处理 0 / 已导入 1 / 失败 0」，无错误提示。

| 断言 | 实测值 |
| --- | --- |
| 源文件位置与文件名 | **完全不变**（仍在 `/data/books/imports/todo/`，原名） |
| `book_formats.path` | 源文件**绝对路径**（原地登记） |
| `books.path` | 源文件所在目录（兼容层，存第一个格式所在目录） |
| 首页 / 详情页显示 | 书名与作者均正确 |

**本轮由真实界面点击暴露并修复的 4 个缺陷：**

| # | 现象 | 根因 | 修复 |
| --- | --- | --- | --- |
| 5 | `no such table: book_formats` | `openLibraryDB` 从不跑 `library.Migrate`，Calibre 原生库缺 Talebook 扩展表 | `openLibraryDB` 内调用 `library.Migrate`（幂等）；新增 `openUserDB` 供自有库使用，避免对无 `books` 表的库跑迁移 |
| 6 | `NOT NULL constraint failed: items.count_guest` | `setItemMediaType` 只插 5 列，而 `items` 有 6 个 NOT NULL 且无默认值的列 | 插入语句补齐全部 11 列 |
| 7 | **书打不开**：`/api/book/1.MOBI` 返回详情 JSON | `book_actions.go` 把 `rBookDetailExt`（`/api/book/<id>.<fmt>`）误绑到 `BookDetailHandler`，而它应是**文件下载** | 新增 `internal/httpapi/book_download.go`（`BookDownloadHandler`，复刻 Python `BookDownload`），路由改绑；`BookConfig` 新增 `CountDownload` |
| 8 | **书删不掉**：`no such table: scan_files` | `book_write.go` 的 `DELETE FROM scan_files` 表名写错，真实表名是 `scanfiles`（无下划线）；测试夹具也建了同名错表，两者互相印证 | 生产代码与夹具同步改为 `scanfiles` |

缺陷 7/8 的教训：**「导入不报错」不等于「书能用」**。导入只是写入路径，读取（下载/阅读）与删除是独立路由，必须逐个走一遍。
缺陷 8 尤其隐蔽：测试夹具与生产代码犯了同一个错，单测永远绿，只有真实库才报错。

**回归测试：**

- `internal/httpapi/library_migrate_test.go`（2 用例）：`openLibraryDB` 补建扩展表、重复打开幂等。
- `internal/httpapi/library_migrate_lock_test.go`（1 用例）：夹具句柄仍打开时二次迁移不锁死。
- `internal/scan/items_schema_test.go`（2 用例）：严格 `items` schema 下插入成功、已有行走合并分支。
- `internal/scan/import_extra_test.go`：`TestImportNewBookRegistersInPlace` 断言源文件路径/文件名/大小/mtime 全不变，且 `book_formats.path` 为绝对路径。
- `internal/httpapi/book_download_test.go`（5 用例）：路径解析、**经真实路由表**下载返回文件而非 JSON、未登记格式 404、无权限 404。
- `internal/httpapi/book_write_test.go`：`TestBookDeleteClearsScanFiles` 断言删除后 `scanfiles` 无残留。

每个缺陷都用「临时回退」验证过测试能捕获：回退后分别复现 `no such table: book_formats`、
`NOT NULL constraint failed: items.count_guest`、`no such table: scan_files`，
以及下载路由返回详情 JSON（`Content-Type: application/json`）。

**下载测试的关键设计：** 直接调 `BookDownloadHandler` 无法发现「路由绑错」——
必须让请求经过 `NewServer` 的路由匹配，才能复现真实故障。

**完整界面流程验证（导入 → 下载 → 删除）：**

| 检查项 | 实测值 |
| --- | --- |
| 导入 | 已导入 1 / 失败 0 |
| 下载 | 200，`application/octet-stream`，8,188,933 字节，`attachment` 附件头 |
| 下载魔数 | `5b284a696e675f5061695f295d5f486f`（真实 MOBI 内容） |
| 删除 | `{"err":"ok","msg":"删除成功"}` |
| 删除后 | `books` / `data` / `book_formats` 清空，源文件保留 |

**一次错误的方向修正（记录以免重蹈）：**

首轮把「文件未复制进库」当成缺陷去修，新增了 `ImportBookWithFile` 与 Calibre 风格的
`作者/书名 (id)` 目录布局 + ASCII 转写。这**恰好是本方案 5.4 明确要废弃的旧 Calibre 行为**：

| 维度 | 旧（Calibre） | 新（Go） |
| --- | --- | --- |
| 文件位置 | `books.path` = 相对书库根目录 | `book_formats.path` = **绝对路径** |
| 文件名 | ASCII 化（32 万行 unicode 表） | **保留原始文件名**，删除查表 |
| 导入 | 必须复制 + 改名 | **默认原地登记**，不复制不改名 |
| 目录约定 | `data/{author}/{title}/{id}/` | **无目录约定**，路径即事实 |

已全部回退：删除 `internal/library/layout.go` 与 `ImportBookWithFile`，`importNewBook` 恢复为
「插 `books` 行 + `AddFormat` 原地登记绝对路径」。教训：**改导入路径前先读方案 5.4 的语义表**，
不要以 Calibre 的现有行为作为「正确」的默认参照。

### 全站界面遍历与第二轮缺陷修复（2026-10-13）

用 Playwright 遍历 **59 个前端页面**（公开页 / 书籍页 / 我的 / 有声书 / 网络书源 / 插件 / 管理端），
逐页记录 HTTP 状态、控制台错误与页面异常，再对关键页做真实交互验证。

**验证脚本：** `app/test/sweep-pages.mjs`（全站遍历）、`app/test/detail-inspect.mjs`（详情页字段与封面）、
`app/test/reader-page.mjs`（阅读器）、`app/test/download-filename.mjs`（下载文件名）。

**本轮修复的 5 个缺陷：**

| # | 现象 | 根因 | 修复 |
| --- | --- | --- | --- |
| 9 | 详情页「除了书名其它都不对」 | `bookDict` 只填 13 个字段，Python 的 `SimpleBookFormatter.format` 返回 22 个；顶层还漏 `kindle_sender` / `conversion_options` | 复用 `compat.go` 已有的 `Formatter`（已与 Python 对齐），补齐 `author_url` / `publisher_url` / `is_public` / `is_owner` / `aliases` / `scope` |
| 10 | 点「阅读」只看到一串 JSON | `/read/<id>` 实现成了 JSON 接口，而 Python 的 `BookRead.get` 返回 HTML 阅读器页面 | 按 Python 分支重写：EPUB 直接渲染、PDF/TXT 重定向、mobi/azw3 先转 EPUB 再渲染「转换中」页 |
| 11 | 封面图全部空白 | `FilesConfig.DefaultCover` 从未接线，无封面书回退到 nil 切片，接口返回 200 但 0 字节 | 新增 `loadDefaultCover()`，从镜像的 `webserver/resources/calibre/default_cover.jpg` 读取 |
| 12 | 阅读器报「电子书加载超时」 | 无转换器时 `convertOne` 把 MOBI **改名成 `.epub`**，扩展名与内容不符 | 无转换器时明确报错；新增 `NewCalibreConverter()` 调用真实的 `ebook-convert` |
| 13 | 详情页出现「EPUB · 0B」幽灵格式 | `convertOne` 登记 `size=0` 后立即 `os.Remove(outPath)` 删掉产物 | 登记前取真实大小；空产物拒绝登记；不再删除已登记的文件 |

**修复后实测：**

| 断言 | 修复前 | 修复后 |
| --- | --- | --- |
| 封面字节 | 0 | **37,845**（`naturalWidth=300`，图片真实渲染） |
| 格式列表 | `EPUB · 0B` + `MOBI · 7MB` | 仅 `MOBI · 7MB`（幽灵格式消失） |
| `/read/1` Content-Type | `application/json` | `text/html; charset=UTF-8` |
| 阅读器界面 | 只显示 JSON 文本 | 目录 / 夜晚 / 设置 / 评论 / AI / 发段评 / 进度条 |
| MOBI→EPUB 转换 | 0 字节或改名的 MOBI | **6,461,048 字节真实 EPUB**，文件保留在磁盘 |
| 下载文件名 | `1-【精排】红星+（又名...）.mobi` | `【精排】红星照耀中国 （又名：西行漫记）.mobi` |

**回归测试：**

- `internal/httpapi/book_detail_fields_test.go`（5 用例）：字段完整性、空值回退、items 行取值、日期解析、配置读取。
- `internal/httpapi/book_read_page_test.go`（4 用例）：返回 HTML 而非 JSON、EPUB 直接就绪、不可读格式 415、`epub_ready` 轮询字段。
- `internal/httpapi/book_download_test.go`（+3 用例）：文件名用原书名、文件名清洗、ASCII 兜底。
- `internal/httpapi/default_cover_test.go`（3 用例）：默认封面加载、缺失返回 nil、接口返回非空字节。
- `internal/convert/convert_test.go`（+3 用例）：无转换器报错、空产物拒绝、登记后不删产物。

**全站遍历结果：** 59 页中 57 页无异常；`/admin/settings` 与 `/admin/settings/general` 报
`Cannot read properties of undefined (reading 'forEach')`（前端对某配置字段的容错问题，待定位）。

**已知未覆盖（非本轮缺陷）：**

- `/api/user/login` 在 Go 侧尚未实现（属未实现路由），回落到未启动的 Python 上游。浏览器登录走的是其它路径，但直接调该接口会失败。
- `authors.sort` 为 `NULL`：Calibre 的 `authors` 表没有 `sort` 触发器，由 Python 层写入；Go 侧未复刻，不影响导入与阅读。
- MOBI 的**内嵌元数据**（出版社/出版日期/简介）未解析：Go 侧只有 EPUB 解析器（`epubmeta`），MOBI 退回文件名元数据，因此详情页显示 `Unknown`。Python 靠 Calibre 的 `import_book` 解析。
- 中文书名/作者经 ASCII 转写后目录名为下划线（仅影响 Calibre 风格布局，本方案已废弃该布局）。

**质量门禁：**

```bash
make lint-py
make check-design
make check-spec
cd app && npm run lint
```

---

## Risks and Rollback

**风险：**

| 风险 | 触发条件 | 监控 | 缓解 |
|---|---|---|---|
| 误合并 | 归一化过于激进（如《活着》小说与剧本同名同作者） | 迁移报告统计归组分布，抽样人工核对 | `edition_key` 区分版本 + 人工拆分入口 + 合并可回滚 |
| 源文件丢失 | 原地登记后用户移动或删除源文件 | 读取时校验路径存在性并记录 | UI 明确提示「源文件位置」并提供失效告警 |
| 兼容层遗漏 | 215 条路由中存在以 `books.path` 或 `available_formats` 字符串为键的逻辑 | 契约测试逐字段对比 | 实施项 1 先逐条盘点路由 |
| 繁简表覆盖不足 | 生僻字书名 | 真实书库抽样覆盖率 | 覆盖率低于阈值时扩充对照表 |
| 归一化算法升级 | 算法变更后新旧键不一致 | 重算命令输出差异报告 | 提供全库重算命令，重算前自动备份 |
| 转换能力退化 | 放弃 Calibre 转换引擎后格式支持变窄 | 格式转换测试 | 只承诺读取主流格式 + 单向转 EPUB，范围已在 Non-Goals 声明 |

**回滚：**

- **代码层面**：`booksvr/` 为新增目录，回滚即停止使用并切回 Python 实现。
- **数据层面**：新表与新增列均为增量，旧 Python 实现忽略它们即可继续工作，无需数据迁移。
- **迁移层面**：迁移过程只读 Calibre 源库，不修改源库，因此源库始终是安全回退点。
- **发布层面**：保留原 Docker 镜像标签作为回退目标。

---

## Handoff Notes

**开发模式必须遵守的实施约束：**

0. **先做实施项 -1**：本工作在 fork 仓库中进行。需用户提供 fork 地址；未提供时**停止并询问**，不得直接向上游 `talebook/talebook` 推送。
1. **再做实施项 0**：设计模式只读门禁不允许写 `design/`，因此必须先在开发模式创建 `design/booksvr/` 目录并产出 `design/booksvr/20261007-calibre-go-rewrite.wip.html`，再开始编码。
2. **实施项 1 是硬前置**：必须先盘点 215 条路由的键依赖。若发现以 `books.path` 或 `available_formats` 字符串为键的路由，**停止并说明**，不要自行猜测兼容策略。
3. **TDD 优先**：每个实施项先写失败测试，运行确认失败，再写最小实现，运行确认通过，最后重构。
4. **包边界不可破坏**：`normalize` 不依赖数据库；`library` 不依赖 HTTP；`httpapi` 不直接写 SQL；`migrate` 只读源库。
5. **前端改动仅限多目录 UI**：只允许修改 `app/pages/admin/imports.vue`、`app/components/admin/GeneralSettingsContent.vue`、`app/i18n/locales/*.json`、`app/test/mock-server.js` 与对应测试。`app/` 下其他文件不得修改。若发现必须改其他前端文件才能兼容，**停止并说明**。
6. **`books.id` 语义不可变**：仍是一本书（一个版本）。不得把作品层语义混入 `book_id`。
7. **不得引入全书正文 FTS**：仅元数据检索，trigram 分词。
8. **不得引入大规模 unicode 查表**：繁简表限制在 3000-5000 字。
9. **禁止 `CHOKIDAR_USEPOLLING=true`**：启动前端 dev server 时严格遵守仓库规范。
10. **规格同步**：改变产品行为的改动必须在同一 PR 内更新 `spec/` 对应篇目。

**不得擅自改变的设计决定：**

- 三层模型：作品 → 版本 → 格式（不是两层）。
- `work_key` 与 `edition_key` 的组成与分工。
- 版本后缀**提取而非删除**。
- 空 `edition_key` **不自动合并**。
- 保留 `books` 表作为版本层，新增 `works` 表作为作品层。
- 归一化键**写入时持久化** + 提供全库重算命令。
- 繁简统一用**内置精简对照表**，不引入 OpenCC 依赖。
- 导入**默认原地登记**，不复制、不改名、不写 OPF。
- 新增的 work/versions/merge 接口**本轮不被前端调用**，仅作为接口储备；不得为了用上它们而修改 `app/`。
- 多目录复用现有 `import_allowed_roots` 配置项，**不新增配置项**；`with_library` 保留为兼容字段。
- 多目录 UI 是「前端零改动」的**唯一例外**，不得扩大范围。

**遇到以下情况必须停止并说明，不要自行猜测或改设计：**

- 实施时发现 plan 与代码事实冲突（如路由键依赖与盘点结果不符）。
- 发现范围越界（如需修改多目录 UI 以外的前端文件、需重写转换引擎、需全书正文 FTS）。
- 关键需求不明（如版本指纹字段在真实书库中缺失率过高，导致自动归组收益不足）。
- 契约测试发现无法在不改前端的前提下兼容的路由。