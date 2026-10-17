# booksvr 内置插件装配与全量移植 Development Plan

## User Request

- 原始需求（原话）：「原来的Python插件在booksvr下能用吗？是要重写为go的吧？开个分支，把这些全部都补齐了吧」
- 已澄清信息：
  - 范围：**全量 39 个内置插件**（用户明确选择 C）。
  - 分支：`feat/booksvr-builtin-plugins`，从 `feat/booksvr-calibre-rewrite` 切出，在 fork 的 `leonzy/talebook` 仓库开发。
- 用户偏好/约束：
  - 中文交流；数据安全优先。
  - **前端 Nuxt 零改动**是硬验收口径。
  - 必须在 fork 的 talebook 仓库开发。
  - 设计模式只读门禁：本方案写在 `plans/` 下；开发模式需按仓库规范转写为 `design/booksvr/20261016-booksvr-builtin-plugins.wip.html`。

## Goal

让 booksvr（Go 后端）像 Python 后端一样装配全部 39 个内置插件：插件中心能列出、启停、配置它们，OPDS 服务开关可用，且每个插件在 Go 侧有真实实现（不是空壳）。

## Non-Goals

- 不改前端 Nuxt 任何代码（`app/**` 零改动）。
- 不改 Python 后端（`webserver/**` 仅作参照，不修改）。
- 不新增插件、不改插件协议（`talebook.plugin/v1`）、不改 manifest 字段集。
- 不重构与本次目标无关的模块。
- 不实现 `webserver/plugins/captcha/**`（验证码提供商不在 `register.py` 的 39 个内置 provider 内，Go 侧已有 `internal/captcha`）。

## Current Codebase Facts

### 根因（已核实）

- `webserver/plugins/register.py` 定义 39 个内置 provider：SOURCE 12 / META 7 / REVIEW 6 / ANNOTATION 1 / TOOL 4 / PUSH 7 / COMBO 2。
- Python 侧 `webserver/services/plugin_runtime.py:151-153` 在模块导入时 `REGISTRY = PluginRegistry()` + 遍历 `ALL_BUILTIN_PROVIDERS` 注册。
- Go 侧 `booksvr/internal/pluginruntime/registry.go:183` `NewPluginRegistry()` 只造空 map；**全仓库生产代码无任何 `.Register(` 调用**（仅 `_test.go` 注册假 provider）。
- 构造点：`booksvr/cmd/booksvr/wiring.go:58`、`booksvr/internal/httpapi/wiring.go:42` 均 `pluginruntime.NewPluginRegistry()` 后未注册。
- 结果：`booksvr/internal/httpapi/plugins.go:593` `SortedIDs()` 为空 → `pluginDefinitionsFor`(:655)/`pluginInstallationsFor`(:690) 直接 `return nil, nil` → `/api/admin/plugins` 返回空数组（`err:"ok"`，前端走「空列表」分支）。

### 关键接口与数据流

- `pluginiface.Provider`：仅要求 `Manifest() map[string]any`。
- `pluginiface.CapabilitySet`：`Interfaces`（接口名集合）、`DownloadMode`、`HasSelfCheck`、`HasExecute`、`Methods`。
- `pluginruntime.PluginRegistry.Register(provider, caps)`：先 `pluginproto.ValidateManifest`，再 `pluginiface.ContractViolations`；违反即注册失败。
- `pluginruntime.MethodDispatcher`：`Invoke(method string, args []any, context map[string]any) (any, error)`。Go 无 `getattr`，provider 必须显式分派。
- 动作分派（`pluginjobs/plugin_jobs.go:invokeAction`）：`Invoke(run.Action, nil, context)`，`run.Action ∈ {test, preview, run, retry, rollback}`。
- 能力分派（`pluginruntime/call.go:Read/Write/Sync`）：`Invoke(method, args, context)`，`method` 为能力方法名（`search_books`/`browse`/`self_check`/`get_reviews`/`list_annotations`/`push_annotation`/`preview`/`apply`/`execute_feature`/`push` 等）。
- Python 动作语义（`plugin_runtime.py:1516-1585`，必须逐字复刻）：
  - `action == "test"` 且 provider 有 `self_check` → 调 `self_check`，`healthy=false` 时抛 `UpstreamError(message)`，否则返回 `ProviderResult{health_message}`。
  - 否则若 provider 无 `execute` → 抛 `plugin.legacy_action_unsupported`。
  - 否则 → 调 `execute(context)`。
- `pluginruntime.EnsureBuiltinInstallations`（`install.go:49`）遍历 `registry.Manifests()` 物化定义与安装；空表 → 不写任何行。
- `pluginruntime.ProviderHooks`（`install.go:24`）：`InitialEnabled(settings)` / `InitialConfig(settings)`，对应 Python 的 `initial_enabled` / `initial_config`。
- `httpapi.pluginStatusReporter`（`plugins.go:648`）：`PluginStatus(db, settings) (map[string]any, error)`，对应 Python 的 `status(session, settings)`；`AdminPluginsHandler` 用它填 `builtin_state`。
- `PluginConfig.SaveExtraSettings`（`plugins.go:64`）：`func(ctx *Context, args map[string]any) (map[string]any, error)`；`AdminPluginOpdsServiceHandler`(:828) 与 `AdminPluginPreferencesHandler`(:908) 在 nil 时返回 `plugin.not_wired`。
- `httpapi.SaveSettings(path, values)`（`settings_save.go`）：把键写回 `conf/auto.py`，保留其它键；`newAdminConfig`（`serve.go:411`）已把它接到 `AdminConfig.SaveSettings`。

### 已有可复用零件

- `sourcebase.Manifest`（`sourcebase.go:102`）、`sourcebase.NewOPDSProvider`（`opds.go:44`）、`sourcebase.Base`（含 `Execute/Search/Browse/GetCategories/GetBook/Download/GetTOC/GetChapter/SelfCheck/Normalize`）。
- `metabase.Manifest`/`MetaManifest`（`metabase.go:42/74`）、`metabase.MetaSourceMixin`（`metabase.go`，含 `InitialEnabled`/`InitialConfig`/`SearchBooks`/`GetMetadata`/`SelfCheck`）。
- `metasource`：`DoubanV2Source`/`BaikeSource`/`CalibreSource`/`XhsdSource`/`TomatoSource`/`QimaoSource`/`NeoDBSource` 逻辑齐备；**仅 `NeoDBProvider`（`neodb.go:402`）有完整 Provider 包装**。
- `booksource.VeneraProvider`（`venera_provider.go:18`）+ `booksource.VeneraManifest()`（`venera.go:491`）。
- `booksource` 的 Legado 规则引擎（`engine.go`/`book_source.go`/`metadata.go`/`save_service.go`）。
- `booktools`（文件读写/入库）、`booktransform`（`integrations.tool` 编排）、`normalize.ToSimplified`（繁简表）、`epubmeta`（EPUB 元数据）。
- `plugindomain`：`ReviewFromRating`、`SourceBook`、`SourceBookDetail`、`SourceChapter`、`SourceContent`、`Category`、`BookFile`、`CheckReport`、`Page`、`ToolInput/ToolReport/ToolOutput`、`PushReceipt`。
- `pluginproto`：`ValidateManifest`、`ProviderResult`、`ProviderItem`、`UpstreamError` 系列。

### 前端契约（不可改）

- `app/pages/admin/plugins/index.vue:606` `catalog` 由 `definitions` 映射；`:662` `plugin.ui.service_toggle === 'opds'` 决定是否渲染 OPDS 开关区块；`:963-964` 读 `catalogRsp.definitions/.installations/.builtin_state`。
- `pluginType()` 取 `plugin_key` 第二段（`talebook.<type>.<name>`）分组；`ui.hidden` 为真则不显示。
- `app/pages/library/apps.vue` 读 `/api/welcome` 的 `opds_enabled`。

### 规格与方案

- `spec/插件/` 已有 13 篇，**已覆盖全部 39 个插件 ID**（`make check-spec` 校验「已注册内置插件在 spec/插件/ 下有归属」）。
- `plans/2026-10-11-booksvr-gap-remediation.md:286` 写「`PluginRegistry` + 加载内置插件」，但 :380 实施记录只落了 `NewPluginRegistry()` 就标 ✅ —— 本方案补上这半句。

### 环境

- `make test-go` = `cd booksvr && go test ./...`；`make build-go`；`make lint-go` = `go vet ./...`。
- 本机 Docker 不可用（`npipe:////./pipe/dockerDesktopLinuxEngine` 连接失败），**无法起真实 Docker 后端做前端体验验证**；这是已知阻塞，须在 WIP 中记录。

## Proposed Design

### 推荐方案

新建单一注册入口包 `booksvr/internal/pluginbuiltin`，集中实现全部 39 个 provider 并暴露 `Register(reg *pluginruntime.PluginRegistry) error`；在 `cmd/booksvr/wiring.go` 与 `httpapi/wiring.go` 的注册表构造点调用它；接线 `PluginConfig.SaveExtraSettings`；补 OPDS 的 `PluginStatus`。

### 关键行为

1. **注册入口**：`pluginbuiltin.Register(reg)` 按固定顺序注册 39 个 provider，每个 provider 附带精确的 `CapabilitySet`。注册失败（manifest 非法或契约违反）直接返回错误，启动即失败——不静默跳过。
2. **动作分派**：新增共享 helper `pluginbuiltin.DispatchInvoke(provider any, method string, args []any, context map[string]any) (any, error)`，逐字复刻 Python `_call_provider` 的动作语义（见上）。每个 provider 的 `Invoke` 都是一行委托。
3. **能力分派**：`DispatchInvoke` 对能力方法名按类型断言调用对应接口方法；未实现的方法返回 `plugin.provider_contract`。
4. **物化**：`EnsureBuiltinInstallations` 不变，注册表非空后自动物化 39 条定义与安装。
5. **OPDS 开关**：`PluginConfig.SaveExtraSettings` 接到 `SaveSettings(opts.SettingsPath, args)`，使 `POST /api/admin/plugins/opds-service` 真正写回 `auto.py`。
6. **OPDS 状态**：`GenericOPDSProvider` 实现 `PluginStatus`，返回 `{configured, enabled, service_enabled}`，对应 Python `opds.py:_status`。

### 数据流/状态变化

- 启动：`NewPluginRegistry()` → `pluginbuiltin.Register(reg)` → 注册表含 39 个 provider。
- 首次 `GET /api/admin/plugins`：`EnsureBuiltinInstallations` 写 `plugin_definitions` 39 行 + `plugin_installations` 39 行 + 有 `connection_owners:["instance"]` 的插件各写 1 条内置连接。
- 前端按 `plugin_key` 第二段分 7 组渲染。

### 错误处理

- 注册期失败 → `Register` 返回错误 → 启动失败（与 Python 导入期 `REGISTRY.register` 抛错一致）。
- 运行期 provider 错误 → 沿用 `pluginruntime.RedactedException` 脱敏与错误码。
- `SaveExtraSettings` 为 nil 时仍返回 `plugin.not_wired`（保留兜底）。

### 兼容性

- 不改 manifest 字段集、不改协议版本、不改路由、不改前端。
- `plugin_definitions` 新增行对既有库是纯增量；`EnsureBuiltinDefinitions` 幂等（按 `plugin_key+version` upsert）。

## Planned File Structure

新增包 `booksvr/internal/pluginbuiltin/`：

| 文件 | 职责 |
|---|---|
| `register.go` | `Register(reg)` 唯一入口；39 个 provider 的注册顺序与 `CapabilitySet` |
| `dispatch.go` | `DispatchInvoke` 共享分派 helper（动作 + 能力） |
| `meta.go` | 7 个元数据源 Provider 包装（复用 `metasource` + `metabase.MetaSourceMixin`） |
| `source_opds.go` | `GenericOPDSProvider`（含 `PluginStatus`、`service_toggle`）+ Kavita/Komga/BookLore/StandardEbooks 预设 |
| `source_web.go` | Gutenberg / Internet Archive / WebDAV / Watch Folder |
| `source_legado.go` | Legado（`by_chapters` + `metadata.lookup`） |
| `source_tomato.go` | 番茄小说下载器 |
| `source_venera.go` | Venera 适配（复用 `booksource.VeneraProvider`） |
| `tool.go` | 4 个正文工具 Provider（`TransformProvider`） |
| `tool_transform.go` | 工具变换实现（查找替换 / 编码修复 / 繁简 / EPUB 美化） |
| `review.go` | 6 个评价源（`CatalogReviewProvider` 基类 + 5 个目录源 + 文件导入） |
| `push.go` | 7 个推送（`DevicePushProvider` 基类 + 6 个设备 + Kindle 邮箱） |
| `combo.go` | Open Library / 微信读书 |
| `annotation.go` | BRS 章评 |

修改文件：

| 文件 | 改动 |
|---|---|
| `booksvr/cmd/booksvr/wiring.go` | `newServiceWiring` 里 `NewPluginRegistry()` 后调用 `pluginbuiltin.Register` |
| `booksvr/internal/httpapi/wiring.go` | `newBookWiring` 的 registry 改为使用共享注册表（新增 `registry` 参数或注册内置） |
| `booksvr/internal/httpapi/serve.go` | `PluginRouteSpecs(PluginConfig{...})` 补 `SaveExtraSettings` |
| `booksvr/internal/pluginruntime/registry.go` | 无改动（如需，仅加注释） |

测试文件：`booksvr/internal/pluginbuiltin/*_test.go`。

## Alternatives Considered

- **方案 A：把 provider 分散到各领域包**（`metasource`/`booksource`/`sourcebase` 各自加 Provider）。优点：领域内聚。缺点：注册入口分散，难以一眼验证「39 个都注册了」；review/push/combo/annotation 无自然归属包。**不采用**。
- **方案 B：单一 `pluginbuiltin` 包集中实现 + 单一注册入口**（推荐）。优点：注册点唯一、可整体测试、与 Python `register.py` 一一对应。缺点：包较大（用文件切分缓解）。
- **方案 C：只注册已有实现的 9 个**。用户已否决（选择全量）。

推荐理由：B 与 Python 的「唯一装配入口」语义一致，且能让「39 个都注册」成为一条可断言的测试。

## Acceptance Criteria

- [ ] `GET /api/admin/plugins` 返回 39 条 `definitions` 与 39 条 `installations`。
- [ ] `plugin_definitions` 表有 39 行；`plugin_installations` 表有 39 行。
- [ ] `POST /api/admin/plugins/opds-service {"enabled":false}` 返回 `{"err":"ok","enabled":false}` 且 `conf/auto.py` 的 `OPDS_ENABLED` 变为 `False`；不再返回 `plugin.not_wired`。
- [ ] `builtin_state["talebook.source.opds"]` 含 `configured`/`enabled`/`service_enabled` 三键。
- [ ] 前端插件中心按 7 个分组显示 39 个插件（`ui.hidden` 为真的除外）。
- [ ] `cd booksvr && go test ./...` 全绿；`go vet ./...` 无输出。
- [ ] `make check-spec` 通过；`make check-design` 通过。
- [ ] `app/**` 零改动（`git diff --stat` 不含 `app/`）。

## Implementation Plan

> 通用约定：每个 provider 的 `Invoke` 都写成 `return DispatchInvoke(p, method, args, context)`；`CapabilitySet` 的 `Interfaces` 用 `pluginiface.CapabilityInterfaces` 的接口名（`MetadataProvider`/`SourceProvider`/`ReviewProvider`/`AnnotationProvider`/`TransformProvider`/`PushProvider`/`ExtraFeatureProvider`）。

### 实施项 0.1：注册入口骨架 + 分派 helper

**Files:**
- Add: `booksvr/internal/pluginbuiltin/register.go`
- Add: `booksvr/internal/pluginbuiltin/dispatch.go`
- Test: `booksvr/internal/pluginbuiltin/register_test.go`

- [ ] Step 1: 写失败测试 `TestRegisterNoError`：`reg := pluginruntime.NewPluginRegistry(); err := Register(reg)`，断言 `err == nil`。（「39 个都注册」的断言放在实施项 7.1，避免一个测试长期红着。）
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认因 `Register` 未定义而编译失败。
- [ ] Step 3: 实现 `Register(reg *pluginruntime.PluginRegistry) error`：先只注册 0 个 provider（返回 nil），并实现 `DispatchInvoke`：
  ```go
  func DispatchInvoke(p any, method string, args []any, context map[string]any) (any, error) {
      switch method {
      case "test", "run", "retry":
          if method == "test" {
              if sc, ok := p.(interface{ SelfCheck(map[string]any) (plugindomain.CheckReport, error) }); ok {
                  report, err := sc.SelfCheck(context)
                  if err != nil { return nil, err }
                  if !report.Healthy {
                      return nil, pluginproto.NewUpstreamError(report.Message, "other", nil)
                  }
                  return pluginproto.ProviderResult{HealthMessage: report.Message}, nil
              }
          }
          if ex, ok := p.(interface{ Execute(map[string]any) (pluginproto.ProviderResult, error) }); ok {
              return ex.Execute(context)
          }
          return nil, pluginruntime.NewPluginRuntimeError("plugin.legacy_action_unsupported",
              "Typed provider does not implement the legacy ingestion action", false)
      case "preview":
          // 见实施项 3.1
      case "rollback":
          // 见实施项 3.1
      }
      return dispatchCapability(p, method, args, context)
  }
  ```
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认 `TestRegisterNoError` 通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/pluginruntime/`，确认无回归。

### 实施项 0.2：接线到启动装配

**Files:**
- Modify: `booksvr/cmd/booksvr/wiring.go`
- Modify: `booksvr/internal/httpapi/wiring.go`
- Test: `booksvr/cmd/booksvr/wiring_test.go`（若不存在则新建）

- [ ] Step 1: 写失败测试：构造 `newServiceWiring`，断言 `w.pluginRegistry.SortedIDs()` 长度为 39。
- [ ] Step 2: 运行 `cd booksvr && go test ./cmd/booksvr/`，确认失败（当前为 0）。
- [ ] Step 3: 在 `newServiceWiring` 中 `pluginRegistry: pluginruntime.NewPluginRegistry()` 之后调用 `pluginbuiltin.Register(w.pluginRegistry)`。注意 `newServiceWiring` 当前签名不返回 error（`cmd/booksvr/serve.go:264` 在闭包里调用），因此注册失败时 `panic(fmt.Sprintf("booksvr: 注册内置插件失败: %v", err))` —— 注册失败是编程错误，与 Python 导入期抛错一致，启动即失败优于静默空转。`newBookWiring` 增加 `registry *pluginruntime.PluginRegistry` 参数（为 nil 时自建并注册），`serve.go:302` 调用处传入 `opts.PluginRegistry`。
- [ ] Step 4: 运行 `cd booksvr && go test ./cmd/booksvr/ ./internal/httpapi/`，确认通过。
- [ ] Step 5: 重构：把 `newBookWiring` 的 registry 参数化后，删除其内部 `NewPluginRegistry()` 兜底分支（保留 nil 兜底但改为注册内置）。

### 实施项 0.3：接线 SaveExtraSettings

**Files:**
- Modify: `booksvr/internal/httpapi/serve.go`
- Test: `booksvr/internal/httpapi/serve_factory_test.go`

- [ ] Step 1: 写失败测试 `TestPluginConfigSaveExtraSettingsWired`：以真实 `ServeOptions{SettingsPath: tmp/auto.py}` 构造 server，`POST /api/admin/plugins/opds-service {"enabled":false}`，断言响应 `err=="ok"` 且磁盘 `auto.py` 含 `'OPDS_ENABLED'` 且值为 `False`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/httpapi/ -run TestPluginConfigSaveExtraSettingsWired`，确认返回 `plugin.not_wired`（预期失败原因：`SaveExtraSettings` 未接线）。
- [ ] Step 3: 在 `serve.go:233` 的 `PluginConfig` 补：
  ```go
  SaveExtraSettings: func(_ *Context, args map[string]any) (map[string]any, error) {
      if err := SaveSettings(opts.SettingsPath, args); err != nil {
          return map[string]any{"err": "file.permission", "msg": "更新磁盘配置文件失败！请确保配置文件的权限为可写入！"}, nil
      }
      return map[string]any{"err": "ok"}, nil
  },
  ```
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/httpapi/ -run TestPluginConfigSaveExtraSettingsWired`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/httpapi/`，确认无回归。

### 实施项 1.1：元数据源 Provider 包装（7 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/meta.go`
- Test: `booksvr/internal/pluginbuiltin/meta_test.go`

参照：`webserver/plugins/meta/{douban_v2,baike,calibre,xhsd,tomato,qimao,neodb}/**`、`webserver/plugins/meta/base.py`。

- [ ] Step 1: 写失败测试 `TestMetaProvidersRegistered`：断言 7 个 ID 均在 `reg.SortedIDs()` 中，且每个 `Manifest()["capabilities"] == ["metadata.lookup"]`、`categories == ["metadata"]`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestMetaProvidersRegistered`，确认失败。
- [ ] Step 3: 实现 7 个 Provider：每个结构体嵌入 `*metabase.MetaSourceMixin`，`Manifest()` 返回 `metabase.MetaManifest(...)`，`Search`/`Fetch` 委托给对应 `metasource.*Source`，`Invoke` 委托 `DispatchInvoke`。ID 与参数：
  | plugin_id | name | icon | homepage | 备注 |
  |---|---|---|---|---|
  | `talebook.meta.douban-v2` | 豆瓣 | `mdi-...`（照 `douban_v2/plugin.py`） | 照 Python | `default_enabled=true` |
  | `talebook.meta.baike` | 百度百科 | 照 Python | 照 Python | |
  | `talebook.meta.calibre` | Calibre 元数据 | 照 Python | 照 Python | 需 `CalibreIdentifier` |
  | `talebook.meta.xhsd` | 新华书店 | 照 Python | 照 Python | |
  | `talebook.meta.tomato` | 番茄小说 | 照 Python | 照 Python | |
  | `talebook.meta.qimao` | 七猫小说 | 照 Python | 照 Python | |
  | `talebook.meta.neodb` | NeoDB | `mdi-database-search` | `https://neodb.social/` | 复用 `metasource.NewNeoDBProvider`；`default_enabled=false`，`legacy_sources=["neodb"]` |
  `CapabilitySet{Interfaces:{"MetadataProvider":true}, HasSelfCheck:true}`。
- [ ] Step 4: 在 `Register` 中注册这 7 个；运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/metasource/ ./internal/metabase/`，确认无回归。

### 实施项 2.1：GenericOPDSProvider + OPDS 预设（5 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/source_opds.go`
- Test: `booksvr/internal/pluginbuiltin/source_opds_test.go`

参照：`webserver/plugins/source/opds.py`、`kavita.py`、`komga.py`、`booklore.py`、`standard_ebooks.py`。

- [ ] Step 1: 写失败测试 `TestOPDSProviderManifest`：断言 `talebook.source.opds` 的 manifest 含 `ui.service_toggle=="opds"`、`ui.manage_dialog=="opds"`、`ui.icon=="mdi-rss-box"`、`runtime_kind=="builtin"`、`actions==["test"]`、`data_policy.retention=="source_owned"`、`download_mode=="single_book"`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestOPDSProviderManifest`，确认失败。
- [ ] Step 3: 实现 `GenericOPDSProvider`：内嵌 `*sourcebase.OPDSProvider`，覆写 `Manifest` 为 Python `opds.py` 的完整 manifest（含 `ui.healthy_message`）；实现 `InitialEnabled(settings) bool { return true }`、`PluginStatus(db, settings)`（查 `opds_sources` 表得 `configured`/`enabled`，`service_enabled = settings["OPDS_ENABLED"] != false`）、`Execute`/`SelfCheck`（无 endpoint 时返回 `healthy_message`）。`CapabilitySet{Interfaces:{"SourceProvider":true}, DownloadMode:DownloadSingleBook, HasSelfCheck:true, HasExecute:true, Methods:{"download":true}}`。
- [ ] Step 4: 实现 4 个预设（`kavita`/`komga`/`booklore`/`standard-ebooks`）：用 `sourcebase.NewOPDSProvider(OPDSOptions{PluginID, Name, Description, Homepage, Endpoint, LicenseName, BrandIcon})`；`standard-ebooks` 额外设 `manifest["ui"]["catalog_access"]="public_free"` 且 `InitialEnabled=true`。运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/sourcebase/`，确认无回归。

### 实施项 2.2：Gutenberg / Internet Archive / WebDAV / Watch Folder（4 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/source_web.go`
- Test: `booksvr/internal/pluginbuiltin/source_web_test.go`

参照：`webserver/plugins/source/{gutenberg,internet_archive,webdav,watch_folder}.py`。

- [ ] Step 1: 写失败测试 `TestWebSourceManifests`：断言 4 个 ID 的 `capabilities`、`download_mode=="single_book"`、`ui.catalog_access`（gutenberg=`public_free`、internet-archive=`rights_vary`）、`runtime_kind`（watch-folder=`file`）、`permissions`（watch-folder 无 `network.read`）。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestWebSourceManifests`，确认失败。
- [ ] Step 3: 用 `sourcebase.Base` + `sourcebase.Manifest` 实现 4 个 provider，`Discover` 逐字移植 Python：
  - Gutenberg：`GET https://gutendex.com/books/`，遍历 `results[].formats`，`identity="<id>:<fmt>"`，`access="download"`，cursor `{"next","seen"}`。
  - Internet Archive：先 `advancedsearch.php`，再逐条 `https://archive.org/metadata/<id>`；`access-restricted-item=="true"` → `access="restricted"`；否则挑非 private 且格式合法的文件 → `access="download"`。
  - WebDAV：`PROPFIND` + `Depth:1`，解析 `d:response`，跳过 collection，按 `getetag` 增量，cursor `{"etags":{...}}`。
  - Watch Folder：`_allowed_path` 白名单校验（`platform.import_allowed_roots`），`recursive` 决定 glob，`signature="<mtime_ns>:<size>"` 增量，`sha256` 内容指纹，cursor `{"files":{...}}`。
  `CapabilitySet{Interfaces:{"SourceProvider":true}, DownloadMode:DownloadSingleBook, HasSelfCheck:true, HasExecute:true, Methods:{"download":true}}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 为 WebDAV/Watch Folder 补边界测试（白名单外路径报错、etag 未变不产出条目）。

### 实施项 2.3：Legado（1 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/source_legado.go`
- Test: `booksvr/internal/pluginbuiltin/source_legado_test.go`

参照：`webserver/plugins/source/legado.py`。

- [ ] Step 1: 写失败测试 `TestLegadoManifest`：断言 `capabilities==["sources.browse","sources.search","sources.acquire","metadata.lookup"]`、`download_mode=="by_chapters"`、`ui.manage_route=="/plugins/legado"`、`ui.configuration_mode=="manager"`、`connection_owners==["instance"]`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestLegadoManifest`，确认失败。
- [ ] Step 3: 实现 `LegadoProvider`：`Manifest` 照 Python；`Execute`/`SelfCheck`/`Search`/`Browse`/`GetCategories`/`GetBook`/`GetTOC`/`GetChapter` 委托 `booksource` 引擎（`BookSourceEngine`）；`SearchBooks` 委托 `booksource` 元数据服务；`PluginStatus` 查 `book_sources` 表。`CapabilitySet{Interfaces:{"SourceProvider":true,"MetadataProvider":true}, DownloadMode:DownloadByChapters, HasSelfCheck:true, HasExecute:true, Methods:{"get_toc":true,"get_chapter":true}}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/booksource/`，确认无回归。

### 实施项 2.4：番茄小说下载器（1 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/source_tomato.go`
- Test: `booksvr/internal/pluginbuiltin/source_tomato_test.go`

参照：`webserver/plugins/source/tomato_downloader.py`。

- [ ] Step 1: 写失败测试 `TestTomatoDownloaderManifest`：断言 `capabilities==["sources.search","sources.acquire"]`、`runtime_kind=="file"`、`config_schema.required==["binary_path"]`、`download_mode=="single_book"`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestTomatoDownloaderManifest`，确认失败。
- [ ] Step 3: 实现 provider：`book_id()` 正则校验、`output_format()` 校验、`DownloaderSession`（启动子进程、`/api/status` 版本校验、`/api/jobs` 轮询、`/api/history` 完整性校验、EPUB 结构校验、64 MiB 上限）、`Search`/`GetBook`/`Download`/`SelfCheck`。`CapabilitySet{Interfaces:{"SourceProvider":true}, DownloadMode:DownloadSingleBook, HasSelfCheck:true, HasExecute:true, Methods:{"download":true}}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过（子进程相关用例用假二进制/httptest 替身）。
- [ ] Step 5: 补 `book_id` 与 `validate_epub` 的边界测试。

### 实施项 2.5：Venera 接入（1 个）

**Files:**
- Add: `booksvr/internal/pluginbuiltin/source_venera.go`
- Test: `booksvr/internal/pluginbuiltin/source_venera_test.go`

- [ ] Step 1: 写失败测试 `TestVeneraRegistered`：断言 `talebook.source.venera` 在注册表中，`download_mode=="none"`，`capabilities==["sources.search","sources.browse"]`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestVeneraRegistered`，确认失败。
- [ ] Step 3: 实现适配：`Manifest()` 返回 `booksource.VeneraManifest()`；`Invoke` 委托 `DispatchInvoke`；`Search`/`Browse`/`GetBook`/`GetTOC`/`GetChapter`/`SelfCheck` 委托 `booksource.VeneraProvider`。`CapabilitySet{Interfaces:{"SourceProvider":true}, DownloadMode:DownloadNone, HasSelfCheck:true, Methods:{}}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/booksource/`，确认无回归。

### 实施项 3.1：工具基类 + 分派扩展

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/dispatch.go`
- Add: `booksvr/internal/pluginbuiltin/tool.go`
- Test: `booksvr/internal/pluginbuiltin/tool_test.go`

参照：`webserver/plugins/tool/base.py`。

- [ ] Step 1: 写失败测试 `TestToolManifests`：断言 4 个工具 ID 的 `categories==["integrations"]`、`capabilities==["integrations.tool"]`、`actions==["test"]`、`ui.manage_route` 分别为 `/plugins/text-replace`、`/plugins/txt-fixer`、`/plugins/zh-converter`、`/plugins/epub-beautify`；`txt-fixer` 的 `ui.supports_auto_trigger==true`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestToolManifests`，确认失败。
- [ ] Step 3: 在 `dispatch.go` 补 `preview` → `TransformProvider.Preview(src, context)`、`apply` → `TransformProvider.Apply(src, outDir, context)`、`rollback` → 可选 `Rollback(context)`；`src` 由 `args[0]` 的 `plugindomain.ToolInput` 取得，`outDir` 由 `args[1]` 取得。实现 `toolBase`（`Manifest`/`SelfCheck`/`InitialEnabled`/`SupportedFormats`/`SupportsAutoTrigger`/`Invoke`）。
- [ ] Step 4: 注册 4 个工具（`CapabilitySet{Interfaces:{"TransformProvider":true}, HasSelfCheck:true, Methods:{"self_check":true}}`），运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 运行 `cd booksvr && go test ./internal/booktransform/ ./internal/httpapi/`，确认无回归。

### 实施项 3.2：正文查找替换

**Files:**
- Add: `booksvr/internal/pluginbuiltin/tool_transform.go`
- Test: `booksvr/internal/pluginbuiltin/tool_transform_test.go`

参照：`webserver/plugins/tool/text_replace/{provider,transform}.py`。

- [ ] Step 1: 写失败测试：`preview` 对含 `foo` 的 TXT 返回匹配数；`apply` 写出 `replaced.txt` 且内容已替换；非法正则返回错误。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestTextReplace`，确认失败。
- [ ] Step 3: 实现 `compile_rule`（字面量/正则）、`replace_txt_file`、`replace_epub_file`（遍历 EPUB 内 XHTML 文本节点）、`preview`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestTextReplace`，确认通过。
- [ ] Step 5: 补 EPUB 分支测试。

### 实施项 3.3：TXT 编码修复

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/tool_transform.go`
- Test: `booksvr/internal/pluginbuiltin/tool_transform_test.go`

参照：`webserver/plugins/tool/common.py`（`detect_encoding`/`decode_with_report`/`fix_to_utf8`）、`txt_fixer/{provider,transform}.py`。

- [ ] Step 1: 写失败测试：UTF-8 BOM 文件识别为 `utf-8-sig`；GB18030 文件识别为 `gb18030`；`unrecoverable` 时 `apply` 报错。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestTxtFixer`，确认失败。
- [ ] Step 3: 移植检测流水线：BOM 表 → 候选编码 strict 解码打分（`utf-8`/`gb18030`/`big5`）→ 可读性评分（`_readability_score`/`_common_ratio`）→ mojibake 反转链（`_MOJIBAKE_PAIRS`，最多 3 轮，`visited` 防环）→ 全量解码一次。`analyze_bytes`/`fix_bytes` 返回报告 dict。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestTxtFixer`，确认通过。
- [ ] Step 5: 补乱码反转与循环检测用例。

### 实施项 3.4：繁简转换

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/tool_transform.go`
- Test: `booksvr/internal/pluginbuiltin/tool_transform_test.go`

参照：`webserver/plugins/tool/zh_converter/{provider,engine,transform}.py`。

- [ ] Step 1: 写失败测试：8 个方向合法、其余拒绝；`t2s` 把「體」转「体」；`language` 映射正确。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestZhConverter`，确认失败。
- [ ] Step 3: 实现 `ZH_DIRECTIONS`/`ZH_DIRECTION_LANG`、`OpenCC` 等价引擎（复用 `normalize.ToSimplified` 做 `t2s`；其余方向按 Python `engine.py` 的映射表实现）、`convert_txt_file`/`convert_epub`、`preview`/`apply`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestZhConverter`，确认通过。
- [ ] Step 5: 补 `use_a5` 与 `convert_title` 用例。

### 实施项 3.5：EPUB 美化

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/tool_transform.go`
- Test: `booksvr/internal/pluginbuiltin/tool_transform_test.go`

参照：`webserver/plugins/tool/epub_beautify/{provider,beautify_lib,chapter_patterns}.py`、`styles/`。

- [ ] Step 1: 写失败测试：`describe()` 返回 `presets`/`toc_styles`/`textures`；`_plan` 对非法 `para_mode`/`preset`/`note_mark` 报错；`apply` 产出 `beautified.epub` 且原书未改。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestEpubBeautify`，确认失败。
- [ ] Step 3: 移植 `analyze_epub`、`beautify`、`validate_note_mark`、`get_preset_css`、`list_presets`/`list_toc_styles`/`list_builtin_textures`/`get_texture_bytes`（12 套预设 × 4 种目录形式；预设元数据与 CSS 内嵌为 Go 常量/embed）。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestEpubBeautify`，确认通过。
- [ ] Step 5: 补竖排右翻与背景纹理用例。

### 实施项 4.1：评价源基类 + 5 个目录源

**Files:**
- Add: `booksvr/internal/pluginbuiltin/review.go`
- Test: `booksvr/internal/pluginbuiltin/review_test.go`

参照：`webserver/plugins/review/{base,hardcover,neodb,google_books,bangumi,anilist}.py`。

- [ ] Step 1: 写失败测试 `TestReviewManifests`：断言 5 个 ID 的 `categories==["reviews"]`、`capabilities==["reviews.lookup"]`、`permissions` 含 `plugin_records.write`；`hardcover` 的 `auth_schema.required==["token"]`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestReviewManifests`，确认失败。
- [ ] Step 3: 实现 `CatalogReviewProvider` 基类（`Execute`/`GetReviews`/`_fetch`/`_parse` 模板 + `review_manifest`），再实现 5 个源（SPEC 参数照 Python；`_fetch`/`_parse` 逐字移植）。`CapabilitySet{Interfaces:{"ReviewProvider":true}, HasExecute:true}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过。
- [ ] Step 5: 补 `_parse` 缺 rating 时产出 `*.invalid_response` 失败的用例。

### 实施项 4.2：评价文件导入

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/review.go`
- Test: `booksvr/internal/pluginbuiltin/review_test.go`

参照：`webserver/plugins/review/file_import.py`。

- [ ] Step 1: 写失败测试：Goodreads CSV 解析出评分；`rating` 非数字产出 `review_file.invalid_rating`；缺 rating 产出 `review_file.rating_missing`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestReviewFileImport`，确认失败。
- [ ] Step 3: 实现 `parse_review_file`（CSV/JSON、`GOODREADS_ALIASES`/`STORYGRAPH_ALIASES`、显式 `mapping`）、`Execute`/`GetReviews`。`CapabilitySet{Interfaces:{"ReviewProvider":true}, HasExecute:true}`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestReviewFileImport`，确认通过。
- [ ] Step 5: 补 JSON 与 generic mapping 用例。

### 实施项 5.1：推送基类 + 6 个设备

**Files:**
- Add: `booksvr/internal/pluginbuiltin/push.go`
- Test: `booksvr/internal/pluginbuiltin/push_test.go`

参照：`webserver/plugins/push/{base,duokan,boox,hanwang,ireader,dangdang,purelibro}.py`。

- [ ] Step 1: 写失败测试 `TestPushManifests`：断言 6 个 ID 的 `categories==["integrations"]`、`capabilities==["integrations.push"]`、`connection_owners==["user"]`、`ui.device_type` 为 ID 末段、`ui.default_port` 正确（duokan 12121 / boox 8085 / hanwang 9310 / ireader 10123 / dangdang 11111 / purelibro 80）。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestPushManifests`，确认失败。
- [ ] Step 3: 实现 `DevicePushProvider` 基类（`_manifest`、`InitialEnabled=true`、`Push`、`SelfCheck`、`DefaultPort`）+ 6 个上传器（各自的 URL 与 multipart 字段照 Python）。`CapabilitySet{Interfaces:{"PushProvider":true}, HasSelfCheck:true}`。
- [ ] Step 4: 注册并运行 `cd booksvr && go test ./internal/pluginbuiltin/`，确认通过（上传用 httptest 替身）。
- [ ] Step 5: 补「设备地址未配置」与「格式不支持」用例。

### 实施项 5.2：Kindle 邮箱推送

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/push.go`
- Test: `booksvr/internal/pluginbuiltin/push_test.go`

参照：`webserver/plugins/push/kindle.py`。

- [ ] Step 1: 写失败测试：`ui.device_type=="kindle"`、`ui.default_port==0`、`InitialEnabled==true`；无邮箱时报错；有 epub 时走邮件发送。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestKindle`，确认失败。
- [ ] Step 3: 实现 `KindleProvider`：`Push` 按 `epub`/`pdf`/`txt` 顺序找 `fmt_*` 走 `MailService`，否则 `azw3`/`mobi` 走 `ConvertService`，都没有返回 `format.not_supported`。`CapabilitySet{Interfaces:{"PushProvider":true}, HasSelfCheck:true}`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestKindle`，确认通过。
- [ ] Step 5: 补「无可用格式」用例。

### 实施项 6.1：Open Library

**Files:**
- Add: `booksvr/internal/pluginbuiltin/combo.go`
- Test: `booksvr/internal/pluginbuiltin/combo_test.go`

参照：`webserver/plugins/combo/open_library.py`。

- [ ] Step 1: 写失败测试：`capabilities==["metadata.lookup","reviews.lookup"]`、`categories==["metadata","reviews"]`、`ui.configuration_mode=="none"`；`search_books` 返回候选；`get_reviews` 返回评分。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestOpenLibrary`，确认失败。
- [ ] Step 3: 实现 `OpenLibraryProvider`：`Execute`（`/api/books` + `_field_decisions` + 可选 rating）、`SearchBooks`（`/search.json`）、`GetMetadata`、`GetCover`（返回 nil）、`GetReviews`。`CapabilitySet{Interfaces:{"MetadataProvider":true,"ReviewProvider":true}, HasExecute:true}`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestOpenLibrary`，确认通过。
- [ ] Step 5: 补 `open_library.not_found` 用例。

### 实施项 6.2：微信读书

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/combo.go`
- Test: `booksvr/internal/pluginbuiltin/combo_test.go`

参照：`webserver/plugins/combo/weread/{provider,metadata,export}.py`。

- [ ] Step 1: 写失败测试：`capabilities` 为 8 项、`categories==["integrations","metadata","annotations"]`、`connection_owners==["user"]`、`extra_features` 含 17 个操作；`validate_weread_query` 拒绝未知参数。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestWeread`，确认失败。
- [ ] Step 3: 实现 `WereadProvider`：`WEREAD_QUERY_OPERATIONS`/`WEREAD_EXTRA_FEATURES`/`validate_weread_query`、`Execute`（export 或 API）、`SearchBooks`/`GetMetadata`/`GetCover`、`ListAnnotations`/`PushAnnotation`（报错）、`ExecuteFeature`、`_gateway`（errcode 分类）、`_fetch_page`/`_fetch_all`（双层游标）、`ProxyImageHosts()==["weread.qq.com"]`。`CapabilitySet{Interfaces:{"MetadataProvider":true,"AnnotationProvider":true,"ExtraFeatureProvider":true}, HasExecute:true}`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestWeread`，确认通过。
- [ ] Step 5: 补分页游标不前进报错用例。

### 实施项 6.3：BRS 章评

**Files:**
- Add: `booksvr/internal/pluginbuiltin/annotation.go`
- Test: `booksvr/internal/pluginbuiltin/annotation_test.go`

参照：`webserver/plugins/annotation/brs.py`。

- [ ] Step 1: 写失败测试：`capabilities==["annotations.chapter_reviews","annotations.push"]`、`connection_owners==["user"]`、`auth_schema.required==["email","password"]`、`data_policy.stores_full_text==true`；未映射书籍产出 `brs.book_unmapped`。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestBRS`，确认失败。
- [ ] Step 3: 实现 `BRSProvider`：`Execute`（Basic 认证拉 `/api/v1/comments` + 映射）、`GetReviews`、`ListAnnotations`（空）、`PushAnnotation`（登录 → add/update）、`DeleteAnnotation`、`PushVote`。`CapabilitySet{Interfaces:{"AnnotationProvider":true,"ReviewProvider":true}, HasExecute:true}`。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestBRS`，确认通过。
- [ ] Step 5: 补 `push_annotation` 回复与投票用例。

### 实施项 7.1：全量注册断言 + 端到端

**Files:**
- Modify: `booksvr/internal/pluginbuiltin/register_test.go`
- Test: `booksvr/internal/httpapi/plugins_test.go`

- [ ] Step 1: 写失败测试 `TestRegisterAllBuiltins`：断言 `len(reg.SortedIDs())==39`，且 39 个 ID 与 `webserver/plugins/register.py` 的清单逐一对齐（把清单硬编码进测试）。
- [ ] Step 2: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestRegisterAllBuiltins`，确认失败（若前面有遗漏）。
- [ ] Step 3: 补齐 `Register` 中缺失的注册。
- [ ] Step 4: 运行 `cd booksvr && go test ./internal/pluginbuiltin/ -run TestRegisterAllBuiltins`，确认通过。
- [ ] Step 5: 写 `TestAdminPluginsReturnsAllBuiltins`：用注册了内置的 registry 构造 `PluginConfig`，调 `AdminPluginsHandler`，断言 `len(definitions)==39`、`len(installations)==39`、`builtin_state["talebook.source.opds"]` 含三键。

### 实施项 7.2：规格与方案文档

**Files:**
- Modify: `design/booksvr/20261016-booksvr-builtin-plugins.wip.html`（开发模式转写）
- Test: `make check-spec`、`make check-design`

- [ ] Step 1: 运行 `make check-spec`，确认通过（`spec/插件/` 已覆盖 39 个 ID）。
- [ ] Step 2: 若失败，按报错补齐 `spec/插件/` 归属。
- [ ] Step 3: 把本方案转写为 `design/booksvr/20261016-booksvr-builtin-plugins.wip.html`（复制 `design/TEMPLATE.html`）。
- [ ] Step 4: 运行 `make check-design`，确认通过。
- [ ] Step 5: 回写测试结果到 WIP。

### 实施项 7.3：前端验证与收尾

**Files:**
- Test: `cd app && npm run lint`

- [ ] Step 1: 运行 `cd app && npm run lint`，确认通过（`app/**` 应零改动）。
- [ ] Step 2: 尝试 `make dev` 起 Docker 后端；若 Docker 不可用，记录阻塞与替代验证（`go test` + 直接调 handler）。
- [ ] Step 3: 后端可用时，`API_URL=http://127.0.0.1:8080 npx nuxt dev --port 3000 --host 127.0.0.1`，在浏览器验证插件中心显示 39 个插件、OPDS 开关可切换。
- [ ] Step 4: 因涉及用户可感知界面变化，按 AGENTS.md 以 `full` 模式执行 `interface-review`；有 `HIGH`/`MEDIUM` 必须修复后重跑。
- [ ] Step 5: 把审查范围、结论与问题处理回写 WIP，将 WIP 转为 ACTIVE。

## Verification

- 单测：`cd booksvr && go test ./...`（新增 `internal/pluginbuiltin` 全绿，既有包无回归）。
- 静态检查：`cd booksvr && go vet ./...`。
- 端到端（无 Docker 时）：`go test ./internal/httpapi/ -run TestAdminPluginsReturnsAllBuiltins`；有 Docker 时 `curl http://127.0.0.1:8080/api/admin/plugins`（带管理员会话）应返回 39 条。
- 手动验证：`POST /api/admin/plugins/opds-service {"enabled":false}` 后检查 `conf/auto.py`。
- 规格/方案：`make check-spec`、`make check-design`。
- 前端：`cd app && npm run lint`；Docker 可用时浏览器验证。

## Risks and Rollback

- **风险 1：import cycle**。`pluginbuiltin` 同时导入 `metasource`/`booksource`/`sourcebase`/`booktools`/`booktransform`/`pluginruntime`。若出现环，把 `DispatchInvoke` 抽到独立小包 `plugininvoke`（只依赖 `pluginiface`/`plugindomain`/`pluginproto`），由 provider 包导入。
- **风险 2：注册期契约违反导致启动失败**。缓解：每个 provider 的 `CapabilitySet` 在实施项内用测试断言；`Register` 返回错误而非 panic。
- **风险 3：EPUB 美化移植量大**（12 预设 × 4 目录形式 + 纹理）。缓解：单独实施项，先落 `describe()` 与最小预设，再补全。
- **风险 4：番茄下载器依赖 Linux 子进程**。缓解：测试用替身；非 Linux 环境返回明确错误（与 Python 一致）。
- **风险 5：Docker 不可用导致前端无法真实验证**。缓解：记录阻塞与替代验证，不静默降级到 mock。
- **回滚**：本方案为纯增量（新增包 + 3 处接线）。回滚即 `git revert` 该分支提交；`plugin_definitions`/`plugin_installations` 新增行不影响既有功能（前端按注册表过滤）。

## Handoff Notes

- 开发模式必须遵守的实施约束：
  - 分支：`feat/booksvr-builtin-plugins`，从 `feat/booksvr-calibre-rewrite` 切出，在 `leonzy/talebook` fork 上开发。
  - **`app/**` 零改动**；不改 `webserver/**`。
  - 每个 provider 的 `Invoke` 必须委托 `DispatchInvoke`，动作语义逐字复刻 `plugin_runtime.py:1516-1585`。
  - 每个 provider 的 manifest 必须与对应 Python 文件逐字段一致（含 `ui` 字段）。
  - 每个实施项先写失败测试、确认失败、再实现、确认通过。
  - 提交前跑：`cd booksvr && go test ./...`、`go vet ./...`、`make check-spec`、`make check-design`、`cd app && npm run lint`。
- 不得擅自改变的设计决定：
  - 单一注册入口 `pluginbuiltin.Register`。
  - `SaveExtraSettings` 接到 `SaveSettings(opts.SettingsPath, args)`。
  - OPDS 的 `ui.service_toggle=="opds"` 与 `PluginStatus` 三键。
  - 39 个 plugin_id 与 Python `register.py` 完全一致。
- 若实施时发现 plan 与代码事实冲突（如某 provider 的 Go 底层逻辑缺失、import cycle、Python manifest 与实测不符）、范围越界或关键需求不明，应停止并说明，不要自行猜测或改设计。
- 本方案需由开发模式转写为 `design/booksvr/20261016-booksvr-builtin-plugins.wip.html`，完成后转 ACTIVE。
