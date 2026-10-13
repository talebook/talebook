# 阶段 6：业务逻辑接管 —— 把 215 条 handler 搬成 Go

> 本文件是**阶段 6 的可执行计划**，含 TDD 步骤。
>
> **上游依据：** `plans/2026-10-10-backend-go-migration-roadmap.md`（总纲级路线图）。
>
> **用户目标（原话）：** 「给我全部完成，实现后端只用booksvr」

---

## User Request

**原始需求（用户原话）：**

> 我的目标从来都是替换 calibre，整个 talebook 的后端换成 go 的 booksvr 呀

> 我要你全改完，怎么还有215个反向代理给tornado呢？

> **为什么还要python？**

> **给我全部完成，实现后端只用booksvr**

**已确认的推进方式：**

> A 按路线图阶段 3→7 依次做完

**已完成的前置阶段：**

| 阶段 | 状态 | 交付 |
|---|---|---|
| 1 存储层 | ✅ | 作品/版本/格式三层模型、8 步归一化、格式路径解析接管 |
| 2 流量切换 | ✅ | `booksvr serve` 接管 8000，未实现路由代理回 Tornado(8001) |
| 3 Go 数据层 | ✅ | 读 17 + 写 4 个方法、搜索语法、回收站、字段元信息、封面 |

---

## Goal

把 215 条路由的 handler 从 Python 搬到 Go，直到：

1. 每条路由都有 Go handler。
2. `-serve-routes` 覆盖全部路由，**代理不再被命中**。
3. Tornado 从 supervisor 下线。
4. Calibre 运行时移除。

**本阶段是「后端只用 booksvr」的主体工作。**

---

## Non-Goals

- **不改变对外 HTTP API 契约。** 218 条路由的路径、方法、响应结构不变。
- **不改变前端。** `app/` 零改动（多目录 UI 为唯一例外）。
- **不重写转换引擎。** `ebook-convert`（107,281 行）为明确 Non-Goal，继续调用外部二进制。
- **不做与搬迁无关的重构。**

---

## Current Codebase Facts

> 以下全部为 2026-10-10 实测核实，非推测。

### 规模

| | 行数 | 文件 |
|---|---|---|
| Python 后端（`webserver/`） | **40,296** | 191 |
| Go booksvr | **13,435** | 52 |
| 路由总数 | **218**（215 镜像 + 3 新增） | — |
| Go 已实现 handler | **3** | — |

### 路由前缀分布（实测）

| 前缀 | 条数 |
|---|---|
| `/api/*` | 191 |
| `/opds/*` | 5 |
| `/auth/*` | 4 |
| `/get/*` | 4 |
| `/podcast/*` | 4 |
| `/media/*` | 2 |
| `/read/*` | 2 |
| `/books/*`（WebDAV） | 1 |
| `/logo/*`、`/read-comic/*`、`/read-online-comic`、`/static/*`、`/(.*)` | 各 1 |

### handler 依赖强度（实测，决定搬迁顺序）

| 文件 | 行数 | 路由数 | `self.db`/`self.cache` | `self.session` | `import calibre` |
|---|---|---|---|---|---|
| `theme.py` | 138 | 3 | 0 | 0 | 0 |
| `captcha.py` | 168 | 3 | 0 | 0 | 0 |
| `network_comic.py` | 149 | 3 | 0 | 0 | 0 |
| `comic.py` | 289 | 4 | 0 | 6 | 0 |
| `annotations.py` | 425 | 4 | 0 | 20 | 0 |
| `scan.py` | 573 | 11 | 0 | 18 | 0 |
| `plugin_booktools.py` | 583 | 10 | 0 | 6 | 0 |
| `booksource_admin.py` | 701 | 10 | 0 | 17 | 0 |
| `plugins.py` | 885 | 20 | 0 | 53 | 0 |
| `admin_opds_sources.py` | 138 | 1 | 0 | 7 | 0 |
| `network_library.py` | 344 | 22 | 0 | 9 | 0 |
| `upgrade.py` | 78 | 0 | 0 | 0 | 0 |
| `user.py` | 494 | 12 | 2 | 16 | 0 |
| `audiobook.py` | 1614 | 27 | 2 | 114 | 0 |
| `files.py` | 159 | 6 | 4 | 0 | 2 |
| `admin.py` | 1271 | 24 | 5 | 21 | 0 |
| `meta.py` | 243 | 5 | 14 | 5 | 0 |
| `opds.py` | 679 | 5 | 16 | 0 | 9 |
| `base.py` | 696 | 0 | 16 | 21 | 2 |
| `book.py` | 2620 | 38 | 24 | 69 | 3 |

**关键发现：12 个文件（91 条路由、约 4,400 行）完全不依赖 Calibre 的 `self.db`/`self.cache`**，只用 `self.session`（SQLAlchemy 用户库）。它们是第一批搬迁对象。

### 用户库（SQLAlchemy 侧）

- `webserver/models.py`：1,079 行、**32 个模型**。
- 实测 `tests/cases/users.db` 有 15 张表（含 social_auth_* 4 张）。
- 模型清单：`Reader`、`Message`、`Item`、`BookAlias`、`AuthorAlias`、`ScanFile`、`OpdsSource`、`Device`、`ReadingState`、`Annotation`、`AnnotationSource`、`BookSourceModel`、`OnlineBookMeta`、`AudiobookEdition`、`AudiobookChapter`、`AudiobookJob`、`AudiobookProgress`、`AudiobookBookmark`、`AudiobookPlaybackSession`、`PodcastSubscription`、`PodcastAccessLog`、`AudiobookDailyStat`、`InstalledTheme`、`PluginDefinition`、`PluginInstallation`、`PluginSecret`、`PluginConnection`、`PluginRun`、`PluginRunItem`、`PluginEntityMatch`、`PluginSourceRecord`、`PluginPermission`。

### 非 handler 的 Python 模块

| 模块 | 行数 |
|---|---|
| `services/` | 11,033 |
| `plugins/` | 12,912 |
| `webdav/` | 918 |
| `base/` | 225 |
| 根目录 | 2,897 |

### 现有 Go 能力

- `internal/library`：数据层（阶段 3 交付）。
- `internal/httpapi`：路由注册表（218 条）、`Server`、`Dispatcher`、`Identity`、`WorkService`。
- `internal/normalize`、`internal/migrate`、`internal/reindex`。

---

## Proposed Design

### 总体策略：按依赖强度分批搬迁

```
批次 1：12 个零 Calibre 依赖文件（91 条路由）
   └─► 批次 2：user.py / audiobook.py / admin.py（63 条路由）
        └─► 批次 3：meta.py / files.py / book.py（49 条路由）
             └─► 批次 4：opds.py / webdav / 其余（15 条路由）
                  └─► 批次 5：移除 Tornado + Calibre
```

**每批完成后：** 把该批路由加入 `-serve-routes`，代理少一批，可独立验证与回滚。

### 关键设计点

#### 1. 用户库访问层（Go）

新增 `booksvr/internal/userdb` 包，用 Go 直接读写 SQLAlchemy 的用户库（SQLite/MySQL）。

- **表结构对齐**：从 `models.py` 的 32 个模型逐字段复刻。
- **迁移兼容**：不改变表结构，只读写。
- **密码哈希**：复刻 `Reader.get_secure_password`（需实测算法）。

#### 2. 会话与鉴权

阶段 2 已实现 Tornado secure cookie 解析。本阶段需补：

- 登录/登出（写 cookie）。
- `@auth` / `@is_admin` 装饰器等价。
- demo 模式、邀请码、安装检查。

#### 3. 响应格式

`@js` 装饰器等价已在阶段 2 实现（`{"err":"ok", ...}` + 自动补 `msg`）。

#### 4. 元数据解析（阶段 4）

`book.py`/`opds.py`/`files.py` 需要 `get_metadata`。Go 侧需实现 epub/mobi/pdf 元数据解析。

#### 5. 元数据源插件（阶段 5）

Amazon/Google/OpenLibrary 等，需 HTTP 客户端 + 解析。

---

## Planned File Structure

### 批次 1（本计划首先实施）

| 文件 | 职责 |
|---|---|
| `booksvr/internal/userdb/schema.go` | 用户库表结构定义 |
| `booksvr/internal/userdb/models.go` | 32 个模型的 Go 结构体 |
| `booksvr/internal/userdb/reader.go` | `Reader` 读写 + 密码校验 |
| `booksvr/internal/userdb/session.go` | 会话/登录态 |
| `booksvr/internal/httpapi/theme.go` | `theme.py` 的 3 条路由 |
| `booksvr/internal/httpapi/captcha.go` | `captcha.py` 的 3 条路由 |
| `booksvr/internal/httpapi/network_comic.go` | `network_comic.py` 的 3 条路由 |
| `booksvr/internal/httpapi/comic.go` | `comic.py` 的 4 条路由 |
| `booksvr/internal/httpapi/annotations.go` | `annotations.py` 的 4 条路由 |
| `booksvr/internal/httpapi/scan.go` | `scan.py` 的 11 条路由 |
| `booksvr/internal/httpapi/plugin_booktools.go` | `plugin_booktools.py` 的 10 条路由 |
| `booksvr/internal/httpapi/booksource_admin.go` | `booksource_admin.py` 的 10 条路由 |
| `booksvr/internal/httpapi/plugins.go` | `plugins.py` 的 20 条路由 |
| `booksvr/internal/httpapi/admin_opds_sources.go` | `admin_opds_sources.py` 的 1 条路由 |
| `booksvr/internal/httpapi/network_library.go` | `network_library.py` 的 22 条路由 |
| 对应 `*_test.go` | 每文件的测试 |

### 修改文件

| 文件 | 预期改动 |
|---|---|
| `booksvr/internal/httpapi/serve.go` | 挂载新 handler |
| `booksvr/internal/httpapi/routes.go` | 标注已实现 |
| `conf/supervisor/*.conf`（三份） | `-serve-routes` 增加批次 1 路由 |
| `tests/test_booksvr_contract.py` | 扩展契约断言 |

### 不改动

- `app/` 前端全部代码。
- 218 条路由的路径/方法/响应结构。
- 阶段 1/2/3 成果。

---

## Implementation Steps（TDD）

### 实施项 1：用户库访问层

**测试先行**（`userdb/*_test.go`）：

- `TestReaderCRUD`：增删改查。
- `TestReaderPasswordVerify`：密码校验与 Python 一致。
- `TestReaderIsAdmin`。
- `TestMessageCRUD`、`TestItemCRUD`、`TestReadingStateCRUD`、`TestAnnotationCRUD`。
- `TestScanFileCRUD`、`TestOpdsSourceCRUD`、`TestBookSourceCRUD`。
- `TestAudiobookModels`、`TestPluginModels`、`TestPodcastModels`。
- `TestSchemaMatchesPython`：断言 Go 结构体字段与 `models.py` 一致。

**实现：** `booksvr/internal/userdb` 包。

**验收：** `go test ./internal/userdb/ -v` 全绿。

**实施结果（2026-10-10）：**

- 生产代码 1,875 行 / 6 文件：`reader.go`（Reader + 双算法密码）、`library_models.go`、
  `scan_models.go`、`annotation_models.go`、`audiobook_models.go`、`plugin_models.go`。
- 测试代码 1,694 行 / 6 文件；覆盖率 **92.8%**。
- **32 个模型全部落地**，对齐 `models.py` 的 32 个 SQLAlchemy 模型。
- 跨语言密码校验已验证：`legacyHash` 与 Python `get_secure_password` 逐字节一致。
- `testdata/schema.sql`（537 行 / 32 张表）由 `scripts/export_userdb_schema.py`
  从 SQLAlchemy 元数据导出，保证测试跑在权威 schema 上。
- 实测发现并修正：`book_sources.group` 是 SQL 保留字，必须写成 `"group"`。
- 全量回归 `go test ./...` 7 包全绿；`go vet` / `gofmt` 无输出；`go.mod` 保持 `go 1.22`。

---

### 实施项 2：会话与鉴权

**测试先行：**

- `TestLoginSetsCookies`：登录写 `user_id`/`lt` cookie。
- `TestLogoutClearsCookies`。
- `TestAuthDecorator`：未登录返回 `user.need_login`。
- `TestAdminDecorator`：非管理员返回 `permission.not_admin`。
- `TestDemoMode`：演示模式只读。
- `TestInviteMode`：邀请码校验。

**实现：** `booksvr/internal/httpapi/auth.go`。

**验收：** `go test ./internal/httpapi/ -run TestLogin|TestAuth|TestAdmin|TestDemo|TestInvite -v` 全绿。

**实施结果（2026-10-10，已完成）：**

- `userdb/reader_permission.go`：`HasPermission` 大小写语义、8 个 `Can*` 方法、`IsActive`、
  `MigratePassword`、`ResetPassword`、`SaveReaderPassword`、`UpdateReaderLogin`。
- `httpapi/auth.go`（~330 行）：`SignCookie`（Tornado v2 签名，与 `DecodeSignedValue`
  互为逆运算）、`SignInHandler`、`SignOutHandler`、`WelcomeHandler`、demo 模式只读门禁
  （`requestIsAllowed`）、访问码流程、`remoteIP`。
- `httpapi/server.go`：`Context` 新增 `Writer` 字段，供 handler 写 cookie。
- `httpapi/serve.go`：`ServeOptions` 新增 `Demo`/`Invite`，`Serve` 注册
  `WorkRouteSpecs() + AuthRouteSpecs()`。
- `cmd/booksvr/serve.go`：新增 `-demo-mode`/`-demo-username`/`-invite-code`/`-invite-message`
  四个 flag 及对应环境变量。
- 实测确认的语义：`has_permission` 小写=允许、大写=显式拒绝、缺省取 `default=True`；
  `reset_password` 用 `token_urlsafe(12)` → 16 字符密码；Tornado `set_secure_cookie`
  默认 `expires_days=30`。
- 验收：`go test ./...` 7 包全绿；`httpapi` 覆盖率 90.2%；`go vet`/`gofmt` 无输出。
- **已接管路由：3 条**（`/api/welcome`、`/api/user/sign_in`、`/api/user/sign_out`）。

---

### 实施项 3：`theme.py`（3 条路由）—— 已完成

**实施结果（2026-10-10）：**

- `httpapi/theme.go`：5 个内置主题常量（逐字复刻 `BUILTIN_THEMES`）、
  `ThemeListHandler`、`ThemeActiveHandler`、`ThemeActivateHandler`、`ThemeRouteSpecs`。
- `httpapi/themestore.go`：`ThemeStore` 接口 + `FileThemeStore`（写 `conf/auto.py` 的
  `ACTIVE_THEME` 行，只改一行不重写整份配置，避免与 Python 争抢写入权）+ `MemoryThemeStore`。
- `httpapi/auth.go`：新增 `decodeJSONObject`（严格 JSON 对象解析，对齐 `json.loads` 抛错语义）。
- `cmd/booksvr/serve.go`：新增 `-settings-file` flag（`BOOKSVR_SETTINGS_FILE`）。
- **跨语言逐字校验**：5 个主题的 id/name/display_name/description 与 `theme.py`
  逐字节一致（用 Python 正则提取后比对，5/5 OK）。
- 验收：`go test ./...` 7 包全绿；`httpapi` 覆盖率 93.7%；`go vet`/`gofmt` 无输出。

**选型说明**：计划原定先搬 `network_library.py`（22 条路由），但实测它依赖
`plugin_runtime.py`（1,832 行）+ JS 规则引擎 + 搜索任务服务，不是「依赖最轻」。
改从 `theme.py`（138 行 / 3 路由 / **零服务依赖**）起步，符合「按依赖强度分批」原则。

---

### 实施项 4：`admin_opds_sources.py`（1 条路由 / 4 方法）—— 已完成

**实施结果（2026-10-10）：**

- `httpapi/opds_sources.go`：`AdminOpdsSourcesHandler`（GET/POST/PUT/DELETE 四方法分发）、
  `jsonString`/`jsonInt`/`nullIfEmpty` 辅助。
- `userdb/opds_write.go`：`GetOpdsSourceByID`、`GetOpdsSourceByName`、
  `ListOpdsSourcesByCreateTimeDesc`、`CreateOpdsSource`、`UpdateOpdsSource`（部分字段更新）、
  `DeleteOpdsSource`。
- `httpapi/routes.go`：修正该路由的 Methods（原记录为 GET/POST，实测 handler 实现 4 个方法）。
- **实测发现**：该路由在 `admin.py` 与 `admin_opds_sources.py` 中**重复注册**，
  但 `admin.py` 是从 `admin_opds_sources.py` import 同一个类，因此是同一 handler。
- 验收：`go test ./...` 7 包全绿；`httpapi` 94.7% / `userdb` 93.7%；`go vet`/`gofmt` 无输出。
- 未覆盖的 2 个块（`rows.Err()`、`LastInsertId` 失败）经探针实测确认在本驱动下不可达。

---

### 实施项 5：`annotations.py`（4 条路由）—— 已完成

**实施结果（2026-10-10）：**

- `httpapi/annotations.go`（~750 行）：4 条路由的 handler、`AnnotationSyncer` 接口、
  `parseDatetime`/`asBool`/`toStr`/`truncate`/`sourceIdentity`/`sourceFieldsAreValid` 等辅助。
- `userdb/annotation_write.go`（~440 行）：批注与来源副本的完整读写（含级联删除、
  `MarkPluginRecordsLocallyModified`）。
- **关键设计**：外部同步（`AnnotationSyncService`）依赖插件运行时（`plugin_runtime.py`
  1,832 行）。Go 侧抽象为 `AnnotationSyncer` 接口，默认实现为空操作——与 Python 在
  未安装 `annotations.push` 插件时的行为一致（`_writers` 为空、`connections_for` 返回空）。
- **实测发现并修正的 2 个真实缺陷**：
  1. `CreateAnnotationSource` 未写入 `source_run_id`/`source_position`/`source_raw_hash`/
     `source_updated_at`，导致创建时这些字段丢失；
  2. 因上一条，`source_updated_at` 无基线，旧数据保护（`stale_ignored`）永不触发。
- 验收：`go test ./...` 7 包全绿；`httpapi` 92.0% / `userdb` 94.5%；`go vet`/`gofmt` 无输出。
- 未覆盖的 4 个块（`rows.Err()`、`LastInsertId`）经探针实测确认在本驱动下不可达。

---

### 实施项 6a：`comic_archive.py` 服务层（Go 包）—— 已完成

**实施结果（2026-10-10）：**

- 新增 `booksvr/internal/comic` 包（593 行生产 + 1,032 行测试）：
  `SelectContainer`、`GetManifest`、`ReadPage`、自然排序、图片魔数与尺寸探测、
  revision 哈希、清单缓存。
- **跨语言逐字校验**：
  - 自然排序：18 个含中文/全角/反斜杠/前导零的文件名，Go 与 Python 的
    `natural_page_sort_key` 排序结果**逐项一致**；
  - revision 哈希：`revisionOf("zip", ...)` = `c1dbc66ef38c83b51003`，与 Python 一致；
  - JPEG 尺寸解析：用 PIL 生成的真实 JPEG 验证字节偏移（SOF 在 158，640×480）。
- **实测发现并修正的 2 个缺陷**：
  1. JPEG 段扫描的循环守卫 `i+9 < len(b)` 过严，导致恰好 11 字节的最小 JPEG 无法解析；
     改为 `i+9 <= len(b)`。
  2. 测试期望错误：`dir/__MACOSX/x.jpg` 在 Python 中**不**被忽略（只判断根目录
     `parts[0]`），已用 Python 实测确认并修正测试。
- **已知限制（已记录）**：Go 标准库无 rar 解压能力，`cbr`/`rar` 容器返回
  `comic.invalid_container`。Python 侧支持 rar。这是**行为差异**，需在灰度前确认
  书库中是否存在 cbr 容器。
- 验收：`go test ./...` 8 包全绿；`comic` 覆盖率 97.2%；`go vet`/`gofmt` 无输出。
- 未覆盖的 8 个块是损坏归档的防御分支，经探针实测确认 `zip.OpenReader` 会先行拒绝。

---

### 实施项 6c：`captcha.py`（3 条路由）—— 已完成

**产出：**

- `booksvr/internal/captcha/`：提供商层（image / geetest / turnstile），
  含内置 5x7 点阵字模的图形验证码生成，不依赖系统字体文件。
- `booksvr/internal/httpapi/captcha.go`：3 条路由 + 授权 cookie 机制。
- `booksvr/cmd/booksvr/serve.go`：新增 `-captcha-provider`、`-captcha-scenes`、
  `-turnstile-*`、`-geetest-*` 参数（均可用 `BOOKSVR_*` 环境变量）。

**测试结果（实测）：**

- `go test ./internal/captcha/`：全部通过，覆盖率 81.8%。
- `go test ./internal/httpapi/ -run Captcha`：全部通过；`captcha.go` 覆盖率
  `checkCaptcha` 83.8%、`CaptchaVerifyHandler` 94.1%、`CaptchaConfigHandler` 100%。
- `go test ./...`：9 个包全绿；`go vet ./...` 无告警。

**实测发现并修正的 2 个缺陷：**

1. `FrontendConfig` 返回 `map[string]any` 时，nil map 会被装箱成非 nil 接口值，
   导致调用方无法用 `== nil` 判断「未启用」；改为返回 `any`。
2. `routes.go` 把 3 条 captcha 路由的方法记为 `GET, POST`，与 Python 实际实现
   （GET / GET / POST）不符；已按实测修正。

**行为差异（已记录）：**

- 图形验证码用内置点阵字模渲染，与 Python 的 PIL + 系统字体在像素层面不同；
  但接口契约（`captcha_id` / `image` 数据 URI / 答案 cookie）与校验语义一致。
- Python 的 `current_user` 与 `admin_user` 是两个独立身份，Go 侧 `Identity`
  只保留一个 `UserID` 与 `IsAdmin` 标志，因此授权上下文中的 `admin` 字段
  在管理员登录时取同一 ID。

---

### 实施项 6d 前置调研：批次 1 剩余文件的依赖强度（实测）

在动手前先核实了剩余文件的依赖面，发现原计划的「零 Calibre 依赖」判断
对其中三个文件不成立：

| 文件 | 行数 | 路由 | 实测依赖 | 结论 |
|---|---|---|---|---|
| `network_comic.py` | 169 | 3 | 插件运行时：`NetworkBaseHandler`、`get_source`、`get_catalog`、`SourceChapter`、venera 插件、`require_scopes` | **阻塞**：Go 侧无插件运行时 |
| `network_library.py` | 402 | 22 | 同上（`network_comic` 的基类就定义在这里） | **阻塞**：同上 |
| `scan.py` | 663 | 11 | `ScanService`（文件导入/移动）、`media_analysis` | 需先搬服务层 |
| `plugin_booktools.py` | 656 | 10 | 插件运行时 | **阻塞** |
| `booksource_admin.py` | 810 | 10 | 插件/书源管理 | **阻塞** |
| `plugins.py` | 972 | 20 | 插件运行时 | **阻塞** |
| `upgrade.py` | 88 | **2** | `application_upgrade` 服务、`AsyncService` | 部署关注点，非数据层 |

**修正：** `upgrade.py` 实际有 2 条路由（`/api/admin/upgrade`、`/api/upgrade/health`），
原计划记为 0 条有误。

**影响：** 批次 1 中依赖插件运行时的 5 个文件（共 65 条路由）无法在
「先搬 handler」的顺序下完成，必须先建立 Go 侧的插件运行时与书源抽象。
这属于新的前置工作，需单独规划，不在本计划范围内。

**本计划可继续的部分：** `scan.py`（需先搬 `ScanService` 服务层）。

---

### 实施项 6d：`scan.py` 的导入目录部分（4 条路由）—— 已完成

`scan.py` 共 11 条路由，其中 7 条（`ScanList`/`ScanRun`/`ScanStatus`/`ScanDelete`/
`ScanMark`/`ImportRun`/`ImportStatus`）依赖 `ScanService` 的扫描/导入流水线，
本项先完成不依赖流水线的 4 条导入目录路由。

**产出：**

- `booksvr/internal/importdir/`：路径归一化、允许根目录校验、目录检查、目录列举。
- `booksvr/internal/httpapi/import_settings.go`：4 条路由。
- `booksvr/cmd/booksvr/serve.go`：新增 `-scan-upload-path`、`-import-allowed-roots`、
  `-import-mode`、`-import-auto-watch-enabled`、`-import-scan-batch-size` 参数。

**测试结果（实测）：**

- `go test ./internal/importdir/`：全部通过，覆盖率 81.2%。
- `go test ./internal/httpapi/ -run Import`：全部通过；`import_settings.go`
  覆盖率 `ImportSettingsHandler` 92.3%、`ImportDirectoryCheckHandler` 100%。
- `go test ./...`：10 个包全绿；`go vet ./...` 无告警。

**跨语言校验（实测，发现 2 处差异）：**

1. **`_is_within("/data", "/data")` 在 Windows 上返回 `False`**，在 Linux 上返回 `True`。
   根因：`ntpath.commonpath` 把 `/data` 归一化为 `\data` 后与未归一化的前缀比较，
   相等判断失败。生产环境是 Linux Docker，Go 实现按 Linux 语义返回 `True`，
   已用 `TestCrossLangVectors` 固定该语义。
2. **`_normalize_path("   ")` 在 Python 中返回当前工作目录**（`os.path.abspath` 对
   纯空白的行为），Go 实现返回空串。这是有意的偏离：返回 CWD 既不是用户意图，
   也可能绕过 `/data/` 前缀检查；`_sanitize_allowed_roots` 本就先剔除纯空白项。

---

### 实施项 6e：`media_analysis.py` 服务层（Go media 包）—— 已完成

这是 `ScanService` 的前置依赖：扫描流水线在解析元数据前会先调用
`analyze_media_file` 做容器校验与内容分类。

**产出：** `booksvr/internal/media/`（`media.go` 常量与工具、`analyze.go` 容器校验）。

覆盖：签名探测、压缩包预算检查（条目数/体积/压缩比/加密/符号链接/路径安全）、
漫画 ZIP 与 RAR、EPUB 结构（mimetype/container/package/spine/图片页判定）、
DjVu、UVZ、DOCX、FB2、HTMLZ，以及 `merge_media_type` 等分类工具。

**测试结果（实测）：**

- `go test ./internal/media/`：全部通过，覆盖率 90.2%。
- `go test ./...`：11 个包全绿；`go vet ./...` 无告警。

**跨语言校验发现并修正的 3 个真实缺陷：**

1. **`SUPPORTED_MEDIA_FORMATS` 漏了 `MANAGED_DOCUMENT_FORMATS`**。
   Python 是 `EBOOK | COMIC | MANAGED | DOWNLOAD_ONLY`，漏掉后 `djvu`/`uvz`
   会被误判为 `format.unsupported`。
2. **`_IMAGE_MIME_EXTENSIONS` 的值是 `frozenset` 而非字符串**。
   我最初按子串匹配实现，导致 `.jpeg` 与 `.tif` 被误判为不匹配；
   改为集合成员判断后与 Python 一致。
3. **`_safe_archive_name` 依赖 `PurePosixPath` 的归一化**。
   `a/./b.png` 与 `a//b.png` 在 Python 中都是**合法**路径（`.` 段与重复斜杠被折叠），
   我最初一律拒绝；已改为先折叠空段与 `.` 段再检查 `..`。

**行为差异（已记录）：**

- `cbr`/`rar` 只做签名与体积校验，随后返回 `comic.invalid_container`；
  Python 用 `rarfile` 库可完整校验。Go 标准库无 RAR 能力，
  引入第三方库有许可与安全风险。

---

### 实施项 6f：`import_metadata.py` + `ScanService` 扫描流水线 —— 已完成

**产出：**

- `booksvr/internal/importmeta/`：文件名元数据与保守的重复匹配规则。
- `booksvr/internal/scan/`：扫描流水线（目录遍历、临时哈希登记、真实哈希、
  媒体分析、元数据提取、重复检测、状态落库）。

**测试结果（实测）：**

- `go test ./internal/importmeta/`：全部通过，覆盖率 **100%**。
- `go test ./internal/scan/`：全部通过，覆盖率 84.4%。
- `go test ./...`：13 个包全绿；`go vet ./...` 无告警。

**实测发现并修正的 3 个真实缺陷：**

1. **`loadBooksForMatch` 产生笛卡尔积**。在一条 SQL 里同时 `LEFT JOIN`
   作者表与格式表（两张一对多表）会把作者与格式重复输出；
   已拆成两次独立查询，与 Python 的分开查询一致。
2. **`setRowData(row, analysis.ToDict())` 静默丢弃分析结果**。
   `ToDict()` 返回 map，作为单个可变参数传入时键值配对循环不会执行；
   已改为逐键展开。
3. **`findDuplicate` 在 `book_id` 为 0 时误删记录**。
   Python 的 `if existing.book_id:` 分支在无关联书籍时保守地判为重复；
   我最初无条件删除旧记录，导致重复文件被重新导入。

**未覆盖部分（已记录）：**

- 自动监控循环（`run_auto_watch`）与导入落库（`do_import`）尚未移植；
  它们依赖 Calibre 的写库接口（`new_api`、`add_external_index_record`）。
- 元数据提取目前统一退回「文件名 + 佚名」；Python 对 epub/mobi/azw3
  会调 Calibre 的 `get_metadata` 解析真实书名与作者。

---

### 实施项 6g：`ScanService` 导入落库 + 自动监控循环 —— 已完成

**产出：**

- `booksvr/internal/scan/import.go`：导入流水线（`Import`、`readyRows`、
  `importRow`、`findSameAuthorBook`、`addFormatToBook`、`importNewBook`、
  `setItemMediaType`、`markImported`、`markIndexed`、`deleteSourceAfterImport`、
  `addExternalIndexRecord`、`ensureIndexedItem`）与 Watch 状态机
  （`NewWatch`、`Start`、`Stop`、`Status`、`WatchInterval`）。
- `booksvr/internal/scan/import_test.go`、`import_extra_test.go`、
  `import_helper_test.go`：导入与监控的完整测试。

**测试结果（实测）：**

- `go test ./internal/scan/`：全部通过，覆盖率 **92.1%**（6f 时为 84.4%）。
- Watch 状态机（`NewWatch`/`Start`/`Stop`/`Status`/`WatchInterval`）覆盖率 **100%**。
- `go test ./...`：13 个包全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**实测发现并修正的 3 个真实缺陷：**

1. **`library.ImportBook` 在 `LibraryDB == nil` 时 panic**。
   已在 `Import`、`importNewBook`、`addExternalIndexRecord`、`addFormatToBook`
   四处加 nil 守卫，返回明确错误而非崩溃。
2. **测试 schema 的 `book_formats` 表缺 `id` 列**。
   `library.RegisterFormat` 需要 `SELECT id FROM book_formats`；
   已改为 `id INTEGER PRIMARY KEY AUTOINCREMENT ... UNIQUE (book_id, format)`。
3. **两处测试期望本身写错**（回查 Python 源码后确认实现正确）：
   - `TestLibraryFormatExists`：Python `_library_format_exists` 的
     `except Exception: return True` 是**有意的保守设计**——未登记格式时
     `format_abspath` 抛异常，Python 返回 `True`。Go 实现一致，
     测试已改为断言「未登记格式应保守返回 true」。
   - `TestImportMoveModeDeletesSource`：书库格式就是源文件本身
     （索引式登记），`libraryFormatExists` 返回 true，源文件被正常删除。
     已拆为 `TestImportMoveModeDeletesSource`（预期 imported + 源文件被删）
     与 `TestImportMoveModeDeleteFailedWhenTargetMissing`
     （预登记指向不存在文件的格式，预期 delete_failed + 源文件保留）。

**未覆盖部分（已记录）：**

- 元数据提取仍统一退回「文件名 + 佚名」；Python 对 epub/mobi/azw3
  会调 Calibre 的 `get_metadata` 解析真实书名与作者。
- cbr/rar 容器在 Go 中只做签名与体积校验（返回 `comic.invalid_container`），
  Python 用 `rarfile` 可完整校验。**灰度前需确认书库中是否有 cbr 容器。**

---

### 实施项 7：`scan.py` 剩余 7 条路由 —— 已完成

**产出：**

- `booksvr/internal/scan/query.go`：查询层（`Summary`、`CountByStatus`、
  `ScanStatus`、`ImportStatus`、`CountReady`、`Delete`、`List`）。
- `booksvr/internal/httpapi/scan.go`：7 条路由 handler 与 `ScanRouteSpecs`。
- `booksvr/internal/httpapi/serve.go`：新增 `ScanService` / `StartScan` /
  `StartImport` 三个装配字段并接入 `ScanRouteSpecs`。

**接管的 7 条路由（均需登录 + 管理员）：**

| 路由 | 方法 | 说明 |
|---|---|---|
| `/api/admin/scan/list` | GET | 列表 + 汇总 + 监控状态 |
| `/api/admin/scan/run` | POST | 启动异步扫描 |
| `/api/admin/scan/status` | GET | 扫描状态计数 |
| `/api/admin/scan/delete` | POST | 按 hash 删除（`all` 删全部） |
| `/api/admin/scan/mark` | POST | 空实现，仅返回成功 |
| `/api/admin/import/run` | POST | 启动异步导入 |
| `/api/admin/import/status` | GET | 导入状态计数 |

**测试结果（实测）：**

- `go test ./internal/scan/`：全部通过，覆盖率 **92.0%**。
- `go test ./internal/httpapi/`：全部通过，覆盖率 **91.3%**。
- `go test ./...`：13 个包全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**实测发现并修正的 1 个测试期望错误：**

- `TestScanRunHandlerOutsideData`：原以为路径不在 `/data/` 下会返回
  `params.error`。回查 Python 后确认 `_configured_allowed_roots()`
  **会把 `scan_upload_path` 自身追加进根列表**，因此配置的路径总能通过
  `_is_path_in_roots`，实际拦截发生在目录检查（`params.path`）。
  Go 实现与 Python 一致，测试已改为断言真实行为。

**未覆盖部分（已记录）：**

- `StartScan` / `StartImport` 的**异步执行体**（后台 goroutine 与自动监控循环
  的调度）尚未接入 `serve.go`；当前仅完成 handler 与装配接口，
  未配置时返回 `service.unavailable`。

---

### 前置工作 A（部分）：`plugins/runtime/domains.py` —— 已完成

**产出：**

- `booksvr/internal/plugindomain/plugindomain.go`：领域对象层。
- `booksvr/internal/plugindomain/plugindomain_test.go`：跨语言逐字节校验。

**覆盖的领域对象：**

`DomainRecord`（基类）、`BookMetadata`、`MetadataQuery`、`Annotation`、
`SourceState`、`Review`、`SourceBook`、`SourceBookDetail`、`SourceChapter`、
`SourceContent`、`Category`、`BookFile`、`CheckReport`、`ItemFailure`、`Page`、
`ToolInput`、`ToolReport`、`ToolOutput`、`PushReceipt`，以及
`EntityDomainTypes` / `CoerceEntity`。

**测试结果（实测）：**

- `go test ./internal/plugindomain/`：全部通过，覆盖率 **99.3%**。
- `go test ./...`：**14 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验（逐字节比对 Python 实测输出）：**

- `SourceBook.to_dict`：含 `name`/`author`/`book_url` 三个兼容别名，
  未知键进 `extra`，默认值 `access=external_link`、`target_library=main`、
  `review_status=pending`。
- `SourceBookDetail.to_dict`：额外补 `intro`/`toc_url`。
- `SourceChapter.to_dict`：补 `name`/`url`。
- `Review.from_rating`：摘要先折叠空白再截断到 500 字符。
- `MetadataQuery.from_value`：兼容裸字符串、mapping 与 nil。

**跨语言校验发现并修正的 1 个真实缺陷：**

- **`Review.from_rating` 的 `review_kind` 默认值漏了**。
  Python 签名是 `review_kind="rating"`，Go 零值为 `""`，
  导致 `to_dict()` 输出 `review_kind: ""` 而非 `"rating"`。
  已补默认值。

**已核实的关键语义（易错点）：**

- `setdefault` 语义：显式传入 `name` 时**不覆盖**，但 `author` 仍按
  （可能为空的）`authors` 计算——实测 `SourceBook.from_dict({"external_id":"e1",
  "title":"三体","name":"自定义"})` 输出 `author: ""`、`authors: []`。
- `truncateSummary` 是 `" ".join(str(x or "").split())[:500]`，
  先折叠连续空白再截断，不是简单 `TrimSpace`。

---

### 前置工作 A-2：`plugins/runtime/protocol.py` —— 已完成

**产出：**

- `booksvr/internal/pluginproto/pluginproto.go`：协议常量、manifest 校验、
  schema 校验与上游错误类型。
- `booksvr/internal/pluginproto/pluginproto_test.go`：跨语言向量校验。

**覆盖内容：**

`ProtocolVersion`、`Categories`/`RuntimeKinds`/`Actions`、
`RequiredManifestFields`/`OptionalManifestFields`/`ConnectionOwners`、
三个正则、`ManifestError`、`UpstreamError`/`UpstreamAuthError`/
`UpstreamRateLimitError`、`ProviderItem`/`ProviderResult`、
`PluginManifest.Validate`/`ToDict`、`ValidateAgainstSchema`。

**测试结果（实测）：**

- `go test ./internal/pluginproto/`：全部通过，覆盖率 **95.9%**。
- `go test ./...`：**15 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验（26 条 Python 实测向量全部对齐）：**

覆盖 `manifest.missing_fields`、`protocol_unsupported`、`id_invalid`、
`version_invalid`、`name_invalid`、`runtime_invalid`、`category_invalid`、
`capability_invalid`、`action_invalid`、`categories_duplicate`、`schema_invalid`、
`permission_invalid`、`connection_owner_invalid`、`metadata_invalid`、`ui_invalid`、
`description_invalid`、`download_mode_invalid`、`unknown_field`、
`secret_default_forbidden`、`secret_write_only`、`extra_features_invalid`，
以及 `x-` 前缀放行与 `extra_features` 合法用例。

**跨语言校验发现并修正的 1 个真实缺陷：**

- **`validate_against_schema` 的 `where` 默认值是我自己加的**。
  Python 签名是 `where="config"`，但**调用方传空串时不做替换**——
  实测 `validate_against_schema(schema, {"zzz":1}, "")` 返回
  code `.unknown_field`、msg `unknown  fields: zzz`（双空格）。
  我最初加了 `where == "" → "config"` 的兼容分支，属于无依据的偏离，已删除。

---

### 前置工作 A-3：`plugins/runtime/safe_http.py` —— 已完成

**产出：**

- `booksvr/internal/safehttp/safehttp.go`：受策略约束的 HTTP 客户端。
- `booksvr/internal/safehttp/json.go`：JSON 辅助。
- `booksvr/internal/safehttp/safehttp_test.go`：跨语言向量校验。

**覆盖内容：**

`HostQueue`（按插件+归一化主机的公平并发队列，含 deadline 超时）、
`WithPolicy`（策略绑定，Go 侧用 context 取代 Python 的 thread-local）、
`ValidateRemoteEndpoint`（防 SSRF）、`isGlobalIP`、`SafeHttpClient`
（`Request`/`Get`/`Post`/`JSON`）、`HostQueueTimeout`、`EndpointPolicyError`、
`EndpointResponseTooLarge`。

**测试结果（实测）：**

- `go test ./internal/safehttp/`：全部通过，覆盖率 **94.1%**。
- `go test ./...`：**16 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验发现并修正的 2 个真实缺陷：**

1. **`is_global` 的组播语义反了**。Python 的 `ipaddress.is_global` 对
   **组播地址返回 True**（实测 `224.0.0.1`、`233.252.0.1`、
   `239.255.255.255`、`ff02::1` 均为 True），而我最初用 Go 的
   `ip.IsMulticast()` 直接判否。已改为按 Python 实测表逐段判定。
   同时修正了 `192.88.99.1`（Python 为 True）与文档段
   `192.0.2.0/24`、`198.51.100.0/24`、`203.0.113.0/24`（Python 为 False）。
2. **越界端口未拦截**。Python 的 `parsed.port` 对 `:99999` 抛 `ValueError`
   并转为 `Endpoint URL is invalid`；Go 的 `url.Parse` 不报错。
   已显式校验端口范围 [0, 65535]。

**已核实的 `is_global` 实测表（Python 3）：**

| 地址 | global | 地址 | global |
|---|---|---|---|
| `0.0.0.0` | False | `192.88.99.1` | **True** |
| `10.0.0.1` | False | `198.18.0.1` | False |
| `100.64.0.1` | False | `198.51.100.1` | False |
| `127.0.0.1` | False | `203.0.113.1` | False |
| `169.254.0.1` | False | `224.0.0.1` | **True** |
| `172.16.0.1` | False | `240.0.0.1` | False |
| `192.0.0.1` | False | `255.255.255.255` | False |
| `192.0.2.1` | False | `8.8.8.8` | True |
| `192.168.0.1` | False | `::1` / `::` | False |
| `fe80::1` | False | `fc00::1` | False |
| `2001:db8::1` | False | `ff02::1` | **True** |

**有意偏离（已记录）：**

- Python 用 `threading.local()` 绑定插件策略；Go 用 `context.Context` 传递，
  避免全局可变状态，语义等价且更适合 Go 的并发模型。

---

### 前置工作 A-4：`plugins/runtime/interfaces.py` —— 已完成

**产出：**

- `booksvr/internal/pluginiface/pluginiface.go`：插件能力接口与契约校验。
- `booksvr/internal/pluginiface/pluginiface_test.go`：跨语言向量校验。

**覆盖内容：**

`DownloadMode` 常量、`PluginContext.AsDict`、六个能力接口
（`MetadataProvider`/`AnnotationProvider`/`ReviewProvider`/`SourceProvider`/
`TransformProvider`/`ExtraFeatureProvider`/`PushProvider`）、
`CapabilityInterfaces`（19 项）、`ContractViolations`。

**测试结果（实测）：**

- `go test ./internal/pluginiface/`：全部通过，覆盖率 **96.8%**。
- `go test ./...`：**17 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验发现并修正的 1 个真实缺陷：**

- **缺少方法列表被我多排了一次序**。Python 的 `missing` 列表保持
  `required` 的声明顺序，实测 `download_mode=by_chapters` 输出
  `get_toc, get_chapter`；我最初加了 `sort.Strings`，输出变成
  `get_chapter, get_toc`。已删除排序。

**已核实的关键语义：**

- `contract_violations` 在 `manifest` 不是 dict 时**立即返回**，
  不再继续检查能力。
- `extra_features` 为空 map 或 nil 时**不**触发
  `ExtraFeatureProvider` 检查。
- `test` action 由 `self_check` **或** `execute` 任一满足即可。
- `download_mode` 为 `none` 时无需任何方法。

**有意偏离（已记录）：**

- Python 用 `runtime_checkable Protocol` 做鸭子类型检查；Go 侧用显式的
  `CapabilitySet`（已实现接口名 + 方法名集合）描述 provider 实际能力，
  由 `ContractViolations` 校验声明与实现是否一致。语义等价，
  且避免了 Go 无法在运行时做结构化类型断言的限制。

---

### 前置工作 B-1：`plugins/source/base.py` —— 已完成

**产出：**

- `booksvr/internal/sourcebase/sourcebase.go`：单文件书源共享实现。
- `booksvr/internal/sourcebase/helpers.go`：时间与 IO 辅助。
- `booksvr/internal/sourcebase/sourcebase_test.go`：跨语言向量校验。

**覆盖内容：**

`AllowedFormats`、`MIMEFormats`、`CommonConfigProperties`、`FormatFrom`、
`ISBN`、`ExternalID`、`Manifest`、`Base`（`Execute`/`Search`/`Browse`/
`GetCategories`/`GetBook`/`Download`/`GetTOC`/`GetChapter`/`SelfCheck`/
`Normalize`）。

**测试结果（实测）：**

- `go test ./internal/sourcebase/`：全部通过，覆盖率 **93.6%**。
- `go test ./...`：**18 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验发现并修正的 2 个真实缺陷：**

1. **`_manifest` 的 `network_read` 默认值漏了**。Python 签名是
   `network_read=True`，Go 的 bool 零值为 `false`，导致默认生成的
   manifest 缺少 `network.read` 权限。已改为用 `NetworkReadSet`
   区分「未设置」与「显式设为 false」。
2. **`SafeHttpClient.Request` 不接受 nil context**。
   `sourcebase.Download` 最初传 nil，导致 `http.NewRequestWithContext`
   报 `Endpoint URL is invalid`。已在 `Request` 入口把 nil 归一化为
   `context.Background()`。

**已核实的关键语义：**

- `_format_from` 的 **MIME 优先于 URL 后缀**：
  实测 `_format_from("http://x/a.txt", "application/pdf")` 返回 `pdf`。
- `_isbn` 保留 `X` 并转大写，长度必须为 10 或 13。
- `_external_id` = `sha256("<source>:<value>")`，实测向量：
  `("demo","abc")` → `2073b79b...5df708`。
- `_normalize` 在 `access != "download"` 时**清空** `acquisition_url`。
- `_normalize` 的标题截断到 500 字符，空标题退回「未知标题」。
- `_normalize` 过滤空作者字符串。
- `browse` 的 `has_more` 取自 `next_cursor["next"]` 的真值。

**未覆盖部分（已记录）：**

- `_parse_json` / `_parse_atom` / `_json_acquisition` 属于 OPDS 子类
  （`source/opds.py` 一类），不在 `base.py` 范围内，随具体来源实现。

---

### 前置工作 B-2：`plugins/source/base.py` 的 `OPDSProvider` —— 已完成

**产出：**

- `booksvr/internal/sourcebase/opds.go`：OPDS 1/2 目录适配器。
- `booksvr/internal/sourcebase/opds_test.go`：跨语言向量 + 端到端校验。

**覆盖内容：**

`AtomNS`/`DAVNS`、`OPDSProvider`（`discover`/`parseJSON`/`parseAtom`）、
`jsonAcquisition`、`jsonAuthors`、`firstISBN`、`formats`、`resolveURL`。

**测试结果（实测）：**

- `go test ./internal/sourcebase/`：全部通过，覆盖率 **94.1%**。
- `go test ./...`：**18 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验（Python 实测向量全部对齐）：**

- `OPDSProvider` 的 manifest（含 `endpoint` 必填与 `api_key`/`username`/
  `password` 三个 `writeOnly` 认证字段）。
- `_parse_json`：3 条实测条目逐字段对齐（含 `authors` 为字符串、
  `identifier` 非法、无链接三种边界）。
- `_parse_atom`：2 条实测条目逐字段对齐（含多作者、`dc:identifier`、
  `rights`、无获取链接）。
- 格式过滤：`formats=["epub"]` 时 3 条 → 2 条。

**已核实的关键语义：**

- `_parse_json` 的 `metadata` 缺失时**退回 publication 自身**。
- `identifier` 依次回退：`metadata.identifier` → `publication.id` →
  `metadata.title`。
- `authors` 支持三种形态：字符串、单个 dict、dict 列表。
- `_json_acquisition` 要求 `rel` 含 `acquisition` **且**格式可识别。
- `_parse_atom` 的获取链接 `rel` 含 `acquisition` **或**等于 `enclosure`。
- Atom 空标题退回「未知标题」。
- 预设 `endpoint` 时 `config_schema.required` 为空列表，
  且不再注入 `endpoint` 属性。

**强制检查结果（本轮）：**

- 生产代码扫描：无 `TODO`/`FIXME`/占位符、无空函数体、无 `panic`、
  无 mock/stub/fake 替代真实依赖、无 `testing` 包引用。
- 仅有的 3 处 `_ = ` 是 `resp.Body.Close()` 与 `io.Copy(io.Discard, ...)`，
  与 Python 的 `response.close()` 语义一致，属有意为之。
- 覆盖率：`safehttp` **96.5%**、`sourcebase` **96.6%**（两包合计 96.6%）。
- 剩余未覆盖分支均为防御性错误路径（如 `url.Parse` 失败、
  `io.ReadAll` 失败、`http.NewRequestWithContext` 失败），
  需注入故障才能触发，不影响正常语义。

**未覆盖部分（已记录）：**

- `komga.py` / `kavita.py` / `booklore.py` 是 `OPDSProvider` 的
  **纯参数化预设**（各 15 行，仅传 plugin_id/name/description/homepage/
  brand_icon），Go 侧直接调 `NewOPDSProvider` 即可，无需单独包。
- `venera.py`（391 行）依赖 QuickJS 子进程沙箱（`venera_host.js` +
  `venera_worker.py` 的 IPC 协议），`legado.py`（319 行）依赖
  `webserver/services/booksource/` 规则引擎（~2,200 行，含 JS 规则运行时），
  两者均为独立子系统，需单独规划。

---

### 前置工作 C-1：`plugins/meta/base.py` —— 已完成

**产出：**

- `booksvr/internal/metabase/metabase.go`：元数据源共用样板。
- `booksvr/internal/metabase/helpers.go`：数值转换辅助。
- `booksvr/internal/metabase/metabase_test.go`：跨语言向量校验。

**覆盖内容：**

`SummaryLimit`/`CalibreMIKey`/`MetadataFields`、`Manifest`、`MetaManifest`、
`First`、`Summary`、`BuildFieldDecisions`、`ToBookMetadata`、
`ToCalibreMetadata`、`MetaSourceMixin`（`InitialEnabled`/`InitialConfig`/
`SearchBooks`/`GetMetadata`/`SelfCheck`）、`Setting`。

**测试结果（实测）：**

- `go test ./internal/metabase/`：全部通过，覆盖率 **100.0%**。
- `go test ./...`：**19 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验（Python 实测向量全部对齐）：**

- `_first`：8 个输入向量（含 `None`/`""`/`[]`/`{}`/`0`/`False`）。
- `_summary`：空白折叠、截断到 500、非字符串输入。
- `build_field_decisions`：4 条决策逐字段对齐（`fill_empty`/`locked`/
  `unchanged`），字段按字典序输出。
- `meta_manifest`：默认与 `configuration_mode=form` + `brand_icon` +
  `deprecated` 两种形态逐字节对齐。
- `to_book_metadata`：17 个字段 + `_calibre_mi` 原对象引用。

**已核实的关键语义：**

- `build_field_decisions` 的 `current` 有 `or {}` 兜底，但 `candidate`
  **没有**——Python 传 `None` 会抛 `TypeError`。Go 侧返回空切片，
  已在文档注释中记录该差异。
- `_summary` 是 `re.sub(r"\s+", " ", ...).strip()[:500]`，
  先折叠空白再截断。
- `to_book_metadata` 仅在 `provider_key` 为空时用参数补上。
- `initial_enabled`：`default_enabled` 为真时直接开启；否则看
  `META_SELECTED_SOURCES` 是否命中 `legacy_sources`。
- `_setting` 的配置双读：`connection.config` 优先，空值（含空串）
  回落已发布的 CONF 键。

**未覆盖部分（已记录）：**

- 具体元数据源（`douban_v2`/`baike`/`calibre`/`ai`/`neodb`/`qimao`/
  `tomato`/`xhsd`/`youshu` 等）各自实现 `_search`/`_fetch`，
  需逐个移植；本包只提供共用样板。

---

### 前置工作 C-2：`plugins/meta/neodb/` —— 已完成

**产出：**

- `booksvr/internal/htmlx/`：基于 `golang.org/x/net/html` 的轻量 DOM 查询。
- `booksvr/internal/metasource/neodb.go`：NeoDB 元数据源。
- 对应测试：`htmlx_test.go`、`neodb_test.go`。

**新增依赖（已核实）：**

- `golang.org/x/net v0.31.0`（与现有 `x/crypto v0.31.0` 同一发布列车）。
- **`go` 版本保持 1.22 不变**（已确认，避免 `go get` 自动升级）。

**测试结果（实测）：**

- `go test ./internal/htmlx/`：全部通过，覆盖率 **99.0%**。
- `go test ./internal/metasource/`：全部通过，覆盖率 **98.3%**。
- `go test ./...`：**21 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验发现并修正的 3 个真实缺陷：**

1. **`Find()` 错误地包含了节点自身**。BeautifulSoup 的 `find()` 只搜
   **后代**，不包含自身；我最初从根节点开始遍历，导致
   `<span>作者: <span>刘慈欣</span></span>` 取到外层 span 的完整文本
   `作者:刘慈欣` 而非内层的 `刘慈欣`。已改为从子节点开始遍历。
2. **`get_text` 的 separator 语义**。Python 用
   `get_text(separator=" ", strip=True)`，我最初传空串，
   导致 `作者:刘慈欣` 而非 `作者: 刘慈欣`。已修正为空格分隔。
3. **`provider_key` 被 mixin 覆盖**。`build_metadata` 写入 `KEY`（`"neodb"`），
   但 `MetaSourceMixin.search_books` 随后用 `manifest["id"]`
   （`"talebook.meta.neodb"`）覆盖。最终值是 manifest id。

**已核实的关键语义（易错点）：**

- `get_text(strip=True)` 的 `separator` 默认为 `""`，
  **单个文本节点内部的空白不被折叠**：实测
  `"<div>\n  a  \n  b\n</div>"` → `"a  \n  b"`；
  多文本节点时各自 strip 再拼接：`"<div>\n  a  \n  <span>b</span>\n</div>"`
  → `"ab"`（separator=""）/ `"a b"`（separator=" "）。
- `_parse_item_card` 用**硬编码的 `_BASE_URL`** 拼绝对 URL，
  不依赖请求 URL。
- `round()` 是**银行家舍入**：实测 `round(8.5)=8`、`round(7.5)=8`、
  `round(9.5)=10`。
- `_parse_rating` 用 `re.match(r"([\d.]+)", ...)`，
  只匹配开头的数字与点。
- `get_cover` 在 `Content-Type` 不含 `image` 时返回 `None`。
- `NeodbProvider` 的 `default_enabled = False`、`legacy_sources = ("neodb",)`。

**未覆盖部分（已记录）：**

- 其余 9 个元数据源（`baike`/`biquge`/`ai`/`douban_v2`/`qimao`/
  `tomato`/`calibre`/`xhsd`/`youshu`，约 2,500 行）待逐个移植。
- `htmlx.Parse` 的错误分支与 `io.ReadAll` 失败分支不可达
  （`x/net/html` 对字符串输入从不报错），属防御性代码。

---

### 实施项 6g-14：批次 1 的其余 handler 文件

每个文件按同一模式：

1. **测试先行**：为该文件的每条路由写契约测试（响应结构、权限、错误码）。
2. **实现**：Go handler。
3. **验收**：`go test` 全绿 + 契约测试通过。

| 实施项 | 文件 | 路由数 |
|---|---|---|
| 3 | `theme.py` | 3 | ✅ 已完成 |
| 4 | `captcha.py` | 3 | ✅ 已完成 |
| 5 | `network_comic.py` | 3 | ⬜ 待做 |
| 6 | `comic.py` | 4 | ✅ 已完成 |
| 7 | `annotations.py` | 4 |
| 8 | `scan.py` | 11 |
| 9 | `plugin_booktools.py` | 10 |
| 10 | `booksource_admin.py` | 10 |
| 11 | `plugins.py` | 20 |
| 12 | `admin_opds_sources.py` | 1 |
| 13 | `network_library.py` | 22 |
| 14 | `upgrade.py` | 0（无路由，仅逻辑） |

---

### 实施项 15：批次 1 灰度切换

**实现：** 把批次 1 的 91 条路由加入 `-serve-routes`。

**验收：** 真实 Docker 环境验证这 91 条路由由 booksvr 服务。

---

### 实施项 16：design 方案文档

**产出：** `design/booksvr/20261010-handler-migration.wip.html`

---

## Testing Strategy

| 层级 | 命令 |
|---|---|
| Go 单元 | `cd booksvr && go test ./...` |
| Go 静态 | `go vet ./... && gofmt -l .` |
| 契约 | `python -m pytest tests/test_booksvr_contract.py -v` |
| 真实环境 | Docker 镜像 + 容器内验证 |

---

## Risks and Mitigations

| 风险 | 影响 | 缓解 |
|---|---|---|
| 规模巨大（40,296 行） | 长期无法交付 | 分批搬迁，每批可独立验证与回滚 |
| 用户库表结构复刻错误 | 数据错乱 | 从 `models.py` 逐字段复刻 + 契约测试 |
| 密码哈希算法不一致 | 无法登录 | 实测 Python 算法 + 向量比对 |
| 响应结构不一致 | 前端异常 | 逐路由契约测试 |
| 本机无 Calibre | 无法真双跑 | 固化期望结果；如实记录 |

---

## Rollback Plan

1. **单批回滚：** 从 `-serve-routes` 移除该批路由，重启 booksvr。
2. **全量回滚：** `-serve-routes` 置空，全部流量回 Tornado。
3. **镜像回滚：** 保留变更前的镜像 tag。

---

## Handoff Notes

1. **本计划是阶段 6 的可执行计划**，上游是路线图。
2. **用户目标：后端只用 booksvr。** 本阶段是主体工作。
3. **分批搬迁，每批可独立验证与回滚。**
4. **不要重复第一阶段会话的错误表述。** booksvr 已接管格式路径解析层、8000 端口、数据层。
5. **阶段 1/2/3 成果保留**，不推翻、不修改。
6. **`plans/` 不进仓库。**
7. **前端 Nuxt 零改动**是硬验收口径。
8. **若实施时发现 plan 与代码事实冲突、范围越界或关键需求不明，应停止并说明，不要自行猜测或改设计。**

---

### 前置工作 B-3b：`js_runtime.py` —— 已完成

**产出：**

- `booksvr/internal/booksource/js_runtime.go`：受限书源 JS 运行时。
- `booksvr/internal/booksource/exceptions.go`：`BookSourceError`/`RuleParseError`/
  `SourceHttpError`/`JsRuleUnsupported`。
- 对应测试：`js_runtime_test.go`、`exceptions_test.go`。

**覆盖内容：**

`RunJS`（含 `__talebook_md5` 纯 JS 实现、`java` 门面 13 个方法、`book` 对象、
`key`/`page`/`searchKey`/`searchPage`/`baseUrl` 注入、变量回写）、
`_stringify_js_value`、`truncateRule`。

**测试结果（实测）：**

- `go test ./internal/booksource/`：全部通过，覆盖率 **86.8%**。
- `go test ./...`：**22 个包**全绿；`go vet ./...` 无告警；`gofmt -l .` 无输出。

**跨语言校验（43 组 Python 向量全部对齐）：**

- 空代码短路、`result` 变量与返回值回落（`undefined`/`null` 均回落）。
- 字符串化：数字、布尔、对象（JSON）、数组。
- `java` 门面：`get`/`put`/`t2s`/`s2t`/`encodeURI`/`longToast`/`log`/`md5Encode`
  （含中文与空串的 MD5 向量）。
- `java` 不支持能力（`getString`/`ajax`/`post`/`startBrowserAwait`）均抛
  `JsRuleUnsupported`。
- `book.origin` 的 origin 推导（`https://a.com/path?q=1` → `https://a.com`）。
- 变量回写（`java.put` 后 `variables` 被就地更新）。
- 三类错误（语法/运行时/显式 throw）均转为 `JsRuleUnsupported`。
- 超时中断（`while(true){}` 被 0.2s 中断）。
- 4 个真实规则场景（空白折叠、split/join、JSON 解析、正则捕获组）。

**跨语言校验发现并修正的 1 个真实缺陷：**

1. **MD5 初始状态常量抄错**。Python 原文是
   `[1732584193, -271733879, -1732584194, 271733878]`，
   我最初写成 `-1734339076`。已修正并用 3 组 MD5 向量（含中文、空串）验证。

**已记录的 Go 语言差异（非缺陷）：**

- **`errors.As` 不穿透嵌入结构体**。Python 的异常继承允许
  `except BookSourceError` 捕获子类；Go 的 `errors.As` 对嵌入字段不生效。
  已改为直接访问嵌入的 `Message` 字段，并在测试中记录该差异。

---

### 前置工作 B-3a：JS 引擎选型与沙箱能力验证 —— 已完成

**用户决策（已采纳）：**

- JS 引擎选 **goja**（纯 Go、无 CGO）。
- legado 规则引擎**全量移植**（含 `services/booksource/` 约 2,249 行）。

**依赖版本（关键）：**

- `github.com/dop251/goja v0.0.0-20240220182346-e401ed450204`。
- **`go` 版本保持 1.22 不变**。最新版 goja 要求 `go 1.26.0`，
  而 `Dockerfile` 的构建阶段固定为 `golang:1.22-alpine`，
  直接升级会**破坏 Docker 构建**。已回退到仍声明 `go 1.16` 的版本。
- 新增间接依赖：`dlclark/regexp2 v1.7.0`、`go-sourcemap/sourcemap`。

**沙箱能力实测（已验证）：**

| 能力 | 结果 |
|---|---|
| 超时中断 | ✅ `vm.Interrupt()` 精确生效（200ms 死循环被中断） |
| 中断后复用 | ✅ `ClearInterrupt()` 后 VM 可继续求值 |
| 栈深限制 | ✅ `SetMaxCallStackSize` 拦住深递归 |
| 内存压力 | ✅ 超时中断可兜住（堆增长仅 0.1 MB） |
| **内存上限** | ❌ **goja 无 `SetMemoryLimit` API**（QuickJS 有） |

**ES 特性探测（20 项全部 OK）：** `String.replace`/`replaceAll`/`matchAll`、
`JSON.parse`、`Array.map`/`flatMap`、`Object.entries`、`padStart`、
模板字符串、箭头函数、`let`/`const`、解构、展开、`Promise`、`async/await`、
`Map`/`Set`、`encodeURIComponent`、`unescape`、`Date.now`。

**已记录的差异（需在后续实现中兜底）：**

- **无内存上限**：QuickJS 的 `set_memory_limit(8MB)` 无法直接对应。
  替代方案：靠 `Interrupt` 超时兜底（实测有效），并在文档中记录该差异。
- **无 `set_time_limit` 自动中断**：QuickJS 的 `ctx.set_time_limit(0.2)` 是
  引擎内置的；goja 需外部 `time.AfterFunc` + `Interrupt` 实现，
  语义等价但需注意 goroutine 生命周期。

**测试结果（实测）：**

- `go build ./...`：通过。
- `go test ./...`：**21 个包**全绿。
- `go.mod` 的 `go` 版本仍为 **1.22**（Dockerfile 兼容）。

---

### 前置工作 C-2b：其余 9 个元数据源 —— 已完成（9/9）

**范围：** `biquge`/`youshu`/`ai`/`douban_v2`/`qimao`/`tomato`/`calibre`/`baike`/`xhsd`，
合计约 2,500 行。

**已完成：**

- `booksvr/internal/htmlx/` 扩展：`FindBy`/`FindAllBy`（`find(tag, id=/class_=)`）、
  `FindByText`（`string=` 谓词）、属性选择器（`*=`/`^=`/`$=`/`=`）、`:not([attr])`、
  `AttrOK`（区分属性缺失与空值）。
- `booksvr/internal/metasource/helpers.go`：Python `\s` 的 29 个 Unicode 码位集合，
  以及 `pyStrip`/`pyCollapseSpace`/`pyCleanText`。
- `booksvr/internal/metasource/dateparse.go`：strptime 语义的日期解析器。
- `booksvr/internal/metasource/common.go`：`Str2Date`/`DoubanStr2Date`/`pyIntFloat`/`stripBookMarks`。
- `booksvr/internal/metasource/biquge.go`：笔趣阁源（**已完成**）。
- `booksvr/internal/metasource/youshu.go`：优书网源（**已完成**）。
- `booksvr/internal/metasource/ai.go`：AI 元数据源（**已完成**）。
- `booksvr/internal/metasource/douban_v2.go` + `douban_v2_meta.go`：豆瓣(V2) 源（**已完成**）。
- `booksvr/internal/metasource/pyrandom.go`：CPython `random.seed(str)` + `choice` 的逐位复刻。
- `booksvr/internal/metasource/qimao.go`：七猫小说源（**已完成**）。
- `booksvr/internal/metasource/tomato.go` + `tomato_meta.go`：番茄小说源（**已完成**，含 617 行子包）。
- `booksvr/internal/metasource/calibre.go`：Calibre 元数据源（**已完成**，identify 改为注入接口）。
- `booksvr/internal/metasource/baike.go`：百度百科源（**已完成**，含 PNG→JPEG 原生转换）。
- `booksvr/internal/metasource/xhsd.go`：新华书店源（**已完成**，仅支持 ISBN 精确查询）。
- `booksvr/internal/htmlx/` 再扩展：`#id` 选择器。
- `booksvr/internal/htmlx/` 再扩展：`Walk`（前序遍历）、`Attrs`、`AttrOK`、`NodeText`/`NodeElement`。

**测试结果（实测）：**

- `go test ./internal/htmlx/`：全部通过，覆盖率 **99.0%**。
- `go test ./internal/metasource/`：全部通过，覆盖率 **65.5%**。
  （覆盖率偏低是分母增长所致：各源的 `Search`/`GetCover` 等 HTTP 分支需 mock 服务器，
  计划在后续统一补一轮 HTTP 集成测试。纯解析逻辑已逐字节对齐 Python。）
- `go test ./...`：**21 个包**全绿；`go vet ./...` 无告警。

**跨语言校验发现并修正的 4 个真实缺陷：**

1. **Python 的 `\s` 是 Unicode 感知的，Go 的 RE2 `\s` 只匹配 ASCII**。
   实测 `re.match(r"\s", "\u3000")` 为真，共 **29 个码位**（含 U+3000 表意空格、
   U+00A0、U+1680、U+2000-200A、U+2028/2029、U+202F、U+205F、U+001C-001F、U+0085）。
   影响 `_clean_text` 与 `re.sub(r"作\s*者[：:]", ...)`：
   `作　者：天蚕土豆`（U+3000）在 Go 侧原本无法剥离前缀。
2. **Python 的 `strptime` 接受非零填充数字，Go 的 `time.Parse` 不接受**。
   `2024-1-2` 在 Python 匹配 `%Y-%m-%d`，Go 报错。已改为手写解析器。
3. **`%Y` 在 Python 中固定取 4 位**，贪婪吃满会导致 `20240102` 被误解析为
   年份 20240102；已为字段加 `maxWidth`（`%Y`=4、`%m`/`%d`=2）。
4. **`str2date` 的格式表是 i18n 相关的**：`_("%Y年")` 在 zh-CN 下原样保留，
   在 en-US 下变为 `%Y`。已按语言给出两张表，未知语言回落 zh-CN。
5. **Python 的 `json.dumps` 默认分隔符是 `(", ", ": ")`**，Go 的 `json.Marshal`
   是紧凑的 `(",", ":")`。AI 提示词里嵌了证据 JSON，分隔符差异会直接改变
   提示词文本。已加 `pyJSONDumps` + `addJSONSpaces`（跳过字符串字面量内的标点）。
6. **Python 的 dict 保留插入顺序，Go 的 map 按字典序序列化**。
   `_build_prompt` 的 `safe_item` 按 `allowed_fields` 顺序构建，
   证据 JSON 的键序因此是 `source, title, author, ...` 而非字典序。
   已用 `orderedEvidence`（自定义 `MarshalJSON`）承载。
7. **Python 的 `HTMLParser` 对自闭合标签同时触发 start 与 end 事件**。
   `<img src="a.png"/>` 在 `_BookDetailParser` 中会被拼成
   `<img src="a.png"></img>`。Go 侧需用 DOM 前序遍历重建同一事件序列。
8. **`random.seed(str)` 不是「字节直接当种子」**。CPython 的
   `random.Random.seed` 对 str 走 version=2 分支：
   `a = int.from_bytes(a.encode() + sha512(a.encode()).digest())`，
   即「UTF-8 字节 ‖ 其 SHA-512 摘要」按大端解释为整数，
   再按小端拆成 32 位字交给 `init_by_array`。
   我最初直接用字节分组，state 向量对不上。
9. **`random.choice` 不用 `int(random() * n)`**，而是
   `_randbelow(n)`：取 `k = n.bit_length()`，反复 `getrandbits(k)`
   直到落在 `[0, n)`。七猫的 app-version 选择依赖此语义。
10. **`htmlx` 缺少 `#id` 选择器**。番茄的验证页识别用 `#vf`、
    `#captcha_container` 等选择器，原实现只支持标签/类/属性，
    导致验证页漏判。已补 `#id`（含 `div#vf` 组合形式）。

**已核实的关键语义（易错点，续）：**

- `qimao._make_headers` 用 `random.seed(book_id)` 选 app-version，
  因此同一 book_id 的请求头可复现（已逐位对齐 CPython）。
- `qimao` 的 tags 取值链：`[category1_name, category2_name]`（过滤空值）
  → `category_name` → `ptags` → `tags`；字符串按 `，`/`,` 拆分，
  列表截断到 8 个。
- `qimao.get_cover` 的扩展名取 `split(".")[-1].lower().split("?")[0]`，
  白名单外回落 `jpg`。

**已核实的关键语义（易错点）：**

- `requests.post(data=payload)` 发送 `application/x-www-form-urlencoded`；
  `safehttp` 的 `Data []byte` 不自动设 Content-Type，需显式补。
- `youshu.get_summary` 用 `.text.strip()`（不折叠内部空白），
  与 `biquge._clean_text`（折叠）不同。
- `youshu.get_rating` 返回 **int**（`int(float(text))` 向零截断），
  而 `biquge` 的 `rating` 是 **None**。
- `youshu.get_cover` **不做扩展名白名单**，直接取 URL 最后一段；
  `biquge.get_cover` 有白名单（jpg/jpeg/png/gif/webp，否则回落 jpg）。
- `youshu.get_plat` 用 `td.text.split("：")[-1]`，无冒号时返回整串。
- `ai.get_cover` 恒返回 `None`（模型输出不得成为服务端出站请求目标）。

**9 个源全部移植完成：** `biquge`、`youshu`、`ai`、`douban_v2`、`qimao`、`tomato`、`calibre`、`baike`、`xhsd`。

**架构决策（calibre 源）：** 原实现直接调用 `calibre.ebooks.metadata.sources.identify`，
而目标运行时不含 Calibre。因此把 `identify` 抽象为 `CalibreIdentifier` 接口由调用方注入，
纯逻辑（来源→插件映射、结果归一化、去重、封面协议校验）逐字保留。

---

## 附：批次依赖顺序

```
批次 1（91 条路由，零 Calibre 依赖）
  ├─► 用户库访问层（userdb 包）
  ├─► 会话与鉴权
  └─► 12 个 handler 文件
        └─► 批次 2（user/audiobook/admin，63 条）
              └─► 批次 3（meta/files/book，49 条，需元数据解析）
                    └─► 批次 4（opds/webdav/其余，15 条）
                          └─► 批次 5（移除 Tornado + Calibre）
```