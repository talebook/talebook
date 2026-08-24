# Talebook 插件开发与 API 指南（feat/plugins 分支）

> 适用分支：`feat/plugins`（插件系统集成分支，领先 `master` 26 commits，持续从 `master` 同步）  
> 目标读者：为 Talebook 编写新插件 / 内置能力 / 书源 的开发者  
> 本文基于对 `feat/plugins@51177f3` 全量源码走读，以及将 **PoxenStudio/mybooks** 三个工具（正文查找替换 / 繁简转换 / TXT 编码修复）移植到 `webserver/plugins/texttools` 的实战复盘。

---

## 1 概览与分支定位

| 分支 | 定位 | 说明 |
|------|------|------|
| `master` | 默认分支，发布主干 | 常规 bugfix / 功能 PR 的 base |
| `feat/plugins` | **插件系统集成** | 领先 `master` 26 commits，包含完整插件运行时；每天从 `master` 同步（PR #1008 刚完成同步） |
| `feat/ai_1.0` | AI 功能 | 与插件无关 |
| `dev/ai-tts` | 旧 TTS 实验（4 月停更） | 已废弃，勿选 |

**结论：所有插件/内置能力 PR 应以 `feat/plugins` 为 base。** 该分支独有：`webserver/services/plugin_runtime.py`、`plugin_secrets.py`、`plugin_jobs.py`、`webserver/plugins/runtime/`、`webserver/plugins/texttools/`、`app/pages/admin/plugins/`、`/plugins/weread` 等。

Talebook 插件系统与 **PoxenStudio/mybooks** 的 `BaseTool + ToolSet + @AsyncService + BackgroundService + $backend + toolbox` 工具体系完全不同——前者是**数据同步型 Provider 运行时**，后者是**工具箱型**。直接复制 mybooks 工具代码需重写编排层（见 §9）。

---
## 2 插件协议 `talebook.plugin/v1`

`webserver/plugins/runtime/protocol.py` 是唯一事实源。`PluginManifest.validate()` 在注册时校验全部字段，`REGISTRY.register()` 会立即失败并阻断启动——**manifest 错误是启动期错误**。

### 2.1 必填字段

| 字段 | 类型 | 约束 |
|------|------|------|
| `protocol_version` | string | 必须为 `talebook.plugin/v1` |
| `id` | string | `PLUGIN_ID_RE = ^[a-z0-9]+(?:[.-][a-z0-9]+)+$`，如 `talebook.weread` |
| `name` | string | 非空 |
| `version` | string | 语义化版本 `VERSION_RE` |
| `categories` | string[] | 非空，子集于 `CATEGORIES = {metadata, annotations, reviews, book_sources, integrations}` |
| `capabilities` | string[] | 形如 `category.action`，前缀必须已在 `categories` 中声明 |
| `runtime_kind` | string | `builtin / file / http / managed_process` |
| `actions` | string[] | 子集于 `ACTIONS = {test, preview, run, retry, rollback}` |
| `auth_schema` | object | JSON Schema，见 2.2 |
| `config_schema` | object | JSON Schema（公开配置） |
| `permissions` | string[] | 可为空，形如 `books.read` |
| `data_policy` | object | 任意 object，原样持久化 |
| `compatibility` | object | 如 `{talebook: ">=0.1.0"}` |
| `homepage` | string |  |
| `license` | string |  |
| `ui` | object | 非协议校验字段，但管理页强依赖（见 2.3） |
| `connection_owners` | string[] | 可选，默认 `["instance","user"]`，控制连接归属 |

### 2.2 凭据约束

`auth_schema.properties.<field>.writeOnly` **必须为 `true`**，且**禁止 `default`**。这是为了让 `SecretCipher` 统一走密文路径；任何带 `default` 的凭据会在 `validate()` 被 `manifest.secret_default_forbidden` 拒绝。

### 2.3 UI 约定（非协议但强依赖）

```python
"ui": {
    "icon": "mdi-book-open-page-variant",  # 管理页卡片图标
    "manage_kind": "weread",               # 决定 primaryAction 走向（admin 页 switch）
    "primary_action": "configure",         # 为 configure 时，无连接会显示“待配置”状态
    "hidden": True,                        # 为 True 时 catalog 计算会过滤（如 mock）
}
```

管理页 `app/pages/admin/plugins/index.vue:statusInfo()` 对 `primary_action === "configure" && manage_kind !== "metadata"` 的插件在无连接时置为 `unconfigured`。**内置工具**应设 `primary_action: "open"` 以避免“待配置”误判。

---
## 3 Provider 契约

```python
from webserver.plugins.runtime import ProviderItem, ProviderResult
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION

class MyProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.my-provider",
        "name": "My Provider",
        "version": "1.0.0",
        "categories": ["integrations"],
        "capabilities": ["integrations.search"],
        "runtime_kind": "http",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": {"type": "object", "properties": {"api_key": {"type": "string", "writeOnly": True}}, "required": ["api_key"]},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read"],
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://example.com",
        "license": "MIT",
    }

    def execute(self, context: dict) -> ProviderResult:
        # context = {action, attempt, config, cursor, secrets, scopes,
        #            target_external_ids, input_data, deadline, platform}
        if context["action"] == "test":
            return ProviderResult(health_message="ok")
        # ... 拉取外部数据 ...
        items = [ProviderItem(external_id="ext-1", entity_type="metadata", data={...})]
        return ProviderResult(items=items, next_cursor={...}, health_message="fetched 1")
```

- `ProviderItem.entity_type` 必须属于 `ENTITY_TYPES = {metadata, annotation, review, book_source}`，否则 `_apply_result` 会判 `plugin.item_invalid`。
- `ProviderItem.error_code / error_message` 非空时，该条会被记为 `failed`，不进入幂等写入。
- `ProviderResult.next_cursor` 仅在 `run/retry` 成功时推进到 `connection.cursor`。

异常：`ProviderAuthError`（401/403）、`ProviderRateLimitError(retry_after)`、`ProviderError`。前两者会触发运行时的退避与重试逻辑（见 §5）。

---
## 4 现有 Provider 形态（四类 + 两个特例）

| 形态 | 典型实现 | `runtime_kind` | 特点 |
|------|----------|---------------|------|
| **内置能力** | `builtin_capabilities.py` 的 `talebook.metadata.builtin / talebook.book-source.{opds,legado}` | `builtin` | `execute()` 仅返回 `health_message`，真实能力在原生页面/服务；`ensure_builtin_capability_installations()` 自动安装并创建 `instance/0/内置连接` |
| **书源** | `book_sources.py` 的 `OPDSProvider / GutenbergProvider / InternetArchive / WebDAV / WatchFolder` | `http` / `file`(watch-folder) | `discover()` 拉取 OPDS/Atom/JSON，`_normalize()` 统一为 `book_source` 实体的 `external_id/title/authors/isbn/format/acquisition_url/access` 等 |
| **富化连接器** | `enrichment.py` 的 `OpenLibrary / EmbeddedMetadata / CatalogReview(BRS, Goodreads...)` | `builtin` | 走 `requests` 直调，`_manifest()` 统一打 `talebook.metadata.* / talebook.reviews.*` |
| **通用集成** | `weread.py:WereadProvider` | `http` | 17 个 `operation -> api_name` 的 allowlist，全只读；`query(api_key, operation, params)` 在 handler 层被独立封装，不走通用 `execute()` |
| **Mock** | `mock.py:MockMultiTabProvider` | `builtin` | `ui.hidden: true`，用于证明跨类别与重试/回滚行为，`token` 驱动的 `rate_limit / delay / fail_external_ids` |
| **本次新增** | `texttools` 的 3 个 `talebook.tool.*` | `builtin` | 同内置能力形态：`execute()` 只做健康检查，真实处理在 `webserver/plugins/texttools/` + `handlers/plugins.py` 的专用端点 |

> 启示：**并非所有“功能”都适合走 `PluginRuntime` 的 `run` 流水线**。文件处理型工具（EPUB 读写、编码修复）若硬套 `book_source` 实体，会扭曲语义；更自然的是**内置能力 + 专用端点**（与 OPDS 的 `service_enabled` 开关同理）。

---
## 5 运行时 `webserver/services/plugin_runtime.py`

### 5.1 注册表

```python
from webserver.services.plugin_runtime import REGISTRY
from webserver.plugins.runtime import PLUGIN_ID_RE

REGISTRY = PluginRegistry()  # 启动时顺序注册
REGISTRY.register(MockMultiTabProvider())
REGISTRY.register(WereadProvider())
for p in BUILTIN_CAPABILITY_PROVIDERS: REGISTRY.register(p)   # 含本次 3 个 tool
for p in BOOK_SOURCE_PROVIDERS:  REGISTRY.register(p)
for p in EXTERNAL_CONNECTOR_PROVIDERS: REGISTRY.register(p)
```

`register()` 内做 `PluginManifest.validate()`，启动即失败优于运行时失败。

### 5.2 定义与安装

- `ensure_builtin_definitions(session)`：按 `REGISTRY.manifests()` upsert `PluginDefinition`（`plugin_key + version` 唯一）。
- `install_builtin(session, plugin_key, installed_by, config, approved_permissions)`：创建/更新 `PluginInstallation(status=active, scope=shared)` 与 `PluginPermission` 行；`permissions` 必须为 manifest 声明的子集。
- `ensure_builtin_capability_installations(session, installed_by, settings)`：幂等地为每个 `BUILTIN_CAPABILITY_PROVIDERS` 安装并创建 `instance/0/内置连接`（`talebook.metadata.builtin` 受 `AUTO_FILL_META` 开关控制）。

### 5.3 连接与凭据

```python
save_connection(session, settings, installation_id, owner_type, owner_id,
                credentials, name="default", config=None, scopes=None, schedule="")
```

- `owner_type ∈ {instance, user}`，`instance` 时 `owner_id` 强制为 0。
- `credentials` 走 `SecretCipher(settings)` 加密进 `PluginSecret(ciphertext, key_id, mask_hint)`，`connection.secret_id` 关联；`_validate_credentials()` 校验 `auth_schema.required`。
- `config` 为公开配置，禁止含敏感键（`SENSITIVE_KEY_RE`）或凭据原文（`plugin.secret_in_config`）。

### 5.4 执行

```python
runtime = PluginRuntime(session, loader.get_settings(), calibre_db=self.db)
run = runtime.prepare_run(connection_id, action, requested_by, trigger="manual",
                          parent_run_id=None, input_data={"allowed_book_ids": [...]})
runtime.execute(run.id)  # 同步阻塞，handler 内直接调用
```

- `TERMINAL_STATUSES = {succeeded, failed, partial, rolled_back}`；`retry` 仅允许 `failed/partial` 的父运行，`rollback` 仅允许 `run/retry` 的父运行。
- `lease_token / lease_until` 乐观锁防并发（`timeout_seconds` 默认 30，lease = now + timeout + 30s）。
- `_call_provider()`：指数退避重试 `max_retries(≤5)`，`ProviderRateLimitError.retry_after` 优先；`_call_with_timeout()` 用单线程池 + `future.result(timeout)` 实现超时。
- `_apply_result()`：
  - 逐条校验 `entity_type`，`error_code` 非空即 `failed`；
  - `annotation` 需 `prepare_annotation_item()` 匹配到书库书籍，否则 `conflict: confirmation_required`；
  - `book_source` 做 **去重**：批次内 `content_hash+format / isbn+format` 去重，库内 `source_identity / content_hash / isbn` 三级去重；
  - `preview/test` 仅写 `previewed` 的 `PluginRunItem`，不写 `PluginSourceRecord`；
  - `run/retry` 写入/更新 `PluginSourceRecord`，`annotation` 额外 `materialize_annotation()`；
  - 失败/冲突存在时 `cursor_after` 不推进，健康度置 `degraded`。

---
## 6 存储模型 `webserver/models.py`

| 模型 | 关键字段 | 说明 |
|------|----------|------|
| `PluginDefinition` | `plugin_key, version, protocol_version, categories, capabilities, actions, auth_schema, config_schema, permissions, manifest(JSON)` | 每次 `ensure_*` 时 upsert |
| `PluginInstallation` | `plugin_key, definition_id, version, enabled, scope, config, installed_from, checksum, status` | `scope=shared`；`checksum` 为 manifest 的 sha256 |
| `PluginPermission` | `installation_id, permission, scope, approved_by, revoked_at` | 安装时按 manifest 声明批量创建 |
| `PluginConnection` | `installation_id, owner_type, owner_id, name, config, scopes, cursor(JSON), lease_token, lease_until, secret_id, health` | `cursor` 为增量游标（如 WebDAV 的 `etags`、WatchFolder 的 `files`） |
| `PluginSecret` | `owner_type, owner_id, kind, ciphertext, key_id, mask_hint, version` | `mask_hint` 如 `••••abcd` 用于回显 |
| `PluginRun` | `connection_id, parent_run_id, action, trigger, status, requested_by, counts(JSON), cursor_before/after, input_data(JSON), attempt, duration_ms` | `input_data` 不进 `to_public_dict()`，仅 retry 时回放 |
| `PluginRunItem` | `run_id, external_id, entity_type, status(previewed/succeeded/failed/conflict/skipped/rolled_back), operation, error_code, payload_hash, data(JSON)` | `data` 已 `redact()` 脱敏 |
| `PluginSourceRecord` | `connection_id, external_id, entity_type, status(active/rolled_back), data, raw_hash, remote_updated_at, local_modified` | 幂等锚点；`local_modified && raw_hash != new` 即 `conflict: protected` |
| `PluginEntityMatch` | `connection_id, source_type(weread_book), source_id, book_id, status` | 仅 Weread 注释链路使用 |

---

## 7 HTTP API `webserver/handlers/plugins.py`

所有接口返回 `{err, msg?}` 信封；`err === "ok"` 为成功。`@js` 自动序列化并附加 CORS，`@is_admin` 校验管理员，`@auth` 校验登录。

### 7.1 管理后台（`@is_admin`）

| 方法与路径 | 说明 |
|------------|------|
| `GET /api/admin/plugins` | 目录：`definitions/installations/builtin_state`，并触发 `ensure_builtin_capability_installations()` |
| `POST /api/admin/plugins/install` `{plugin_key, config?, permissions?}` | `install_builtin()` |
| `POST /api/admin/plugins/installations/:id/state` `{enabled: bool}` | 启停安装 |
| `POST /api/admin/plugins/opds-service` `{enabled: bool}` | 切换 `OPDS_ENABLED` 的 `SettingsSaverLogic` 入口（OPDS 能力虽注册为插件，开关仍走旧设置） |
| `GET /api/admin/plugins/connections` | `instance` 连接列表 + `user_connection_health` 聚合 |
| `POST /api/admin/plugins/connections` `{installation_id, credentials, name?, config?, scopes?}` | `save_connection(..., "instance", 0, ...)` |
| `POST /api/admin/plugins/connections/:id/state` `{enabled: bool}` | 启停 `instance` 连接 |
| `POST /api/admin/plugins/connections/:id/{test,preview,run,retry,rollback}` | `PluginRuntime.prepare_run() + execute_plugin_run()` |
| `GET /api/admin/plugins/runs[?connection_id=&include_items=]` | 最近 100 条 runs |
| `GET /api/admin/plugins/runs/:id` | 单条 run + items（含 data） |

### 7.2 用户（`@auth`）

| 方法与路径 | 说明 |
|------------|------|
| `GET /api/plugins/connections` | 当前用户的连接 |
| `POST /api/plugins/connections` | `save_connection(..., "user", self.user_id(), ...)` |
| `POST /api/plugins/connections/:id/{test,preview,run,retry,rollback}` | 同上，但校验 `owner_type === "user" && owner_id === self.user_id()`；Weread 的 `test/preview/run` 被禁止（`plugin.action_requires_import_endpoint`） |
| `GET /api/plugins/runs` | 当前用户 100 条 runs |
| `GET /api/plugins/runs/:id` | 校验归属后返回 items |
| `GET /api/plugins/weread` | `{connection, runs, operations[17], read_only: true, skill_version}` |
| `POST /api/plugins/weread/query` `{api_key?, operation, params}` | `WereadProvider.query(stored_key, operation, params)`，17 项 allowlist，`api_key` 仅进 `Authorization: Bearer` |
| `GET/POST /api/plugins/weread/import` `{action=test/preview/run, export?, matches?, api_key?}` | 走 `PluginRuntime` 的 `run` 流水线，`allowed_book_ids` 注入 `input_data` |

### 7.3 本次新增（文本工具，复用 `integrations` 分类，`@auth/@is_admin` 混合）

| 方法与路径 | 权限 | 说明 |
|------------|------|------|
| `GET /api/plugins/tools/books?query=` | `@auth` | 书库筛选（仅 `EPUB/TXT`，`query` 匹配标题/作者，取最近 100，`check_permission` 已过滤私藏） |
| `POST /api/plugins/tools/text-replace/preview` `{book_id, pattern, replacement, use_regex}` | `@auth` | `PREVIEW_LIMIT=200k` 内统计命中数与最多 5 条上下文样本（`pre/match/post`） |
| `POST /api/plugins/tools/text-replace/run` `{book_id, pattern, replacement, use_regex, output_mode=new/overwrite, suffix?}` | `@is_admin` | 线程池内执行 `replace_txt_file / replace_epub_file`，`overwrite` 直写格式，`new` 经 `booktools.import_as_new_book` 另存 |
| `POST /api/plugins/tools/txt-fixer/analyze` `{book_id}` | `@auth` | 读前 `2MB` 做 `analyze_bytes`（BOM/候选打分/chardet/反转链） |
| `POST /api/plugins/tools/txt-fixer/run` `{book_id, output_mode}` | `@is_admin` | `fix_bytes` 全量解码，`unrecoverable/garbage` 直接报错，写出 UTF-8 无 BOM |
| `POST /api/plugins/tools/zh-converter/run` `{book_id, direction, use_a5, convert_title, output_mode, backup}` | `@is_admin` | `OpenCC` 8 方向 + `a5_phrases` 增强词表（仅 `t2s/tw2s`），EPUB 用 `chinese_epub.convert_epub` / `convert_txt_file`，`replace` 模式可选备份到 `convert_path/texttools-backups` 并同步库内标题/语言 |

> 轮询：运行历史统一经 `GET /api/{admin/plugins,plugins}/runs` 拉取，无独立“任务”轮询接口；重操作的前端以按钮 `loading` 态 + 成功提示收口。

> **权限边界（review 修正）**：以上按 `book_id` 取书的端点统一经 `_tool_resolve_book(handler, book_id)` 解析，内部先调 `handler.can_view_book(book_id)`，无权查看时返回与「书籍不存在」一致的错误——防止任意登录用户用列表外的 `book_id` 探测他人**私有书籍**（`Item.scope == "private"`）。这是 `AGENTS.md` 的硬性规则：只读 JSON 也必须逐资源做权限校验，仅靠书籍选择接口的 `get_books()` 过滤是不够的。

---
## 8 前端 `app/`

- **栈**：`nuxt@^4.3.0 + vue@^3.5 + vuetify-nuxt-module + pinia + @nuxtjs/i18n@^10`，与 `PoxenStudio/mybooks` 的 `Nuxt 2 + Vue 2 + Vuetify 2` 完全不同。`app/CLAUDE.md` 明确要求所有请求经 `plugins/talebook.js` 的 `backend(url, opts)` 发起，禁止裸 `fetch`。
- **管理页** `app/pages/admin/plugins/index.vue`：`activeTab ∈ {integrations, metadata, annotations, reviews, book_sources}`，`filteredPlugins` 按 `tabPlugins + search + statusFilter` 计算；`capabilityLabel()` 为固定映射，未知能力回退 `value`；`primaryAction()` 按 `manage_kind` 分发（`opds/legado/metadata/weread` 各有专属弹窗，本次新增 `text_replace/zh_converter/txt_fixer -> /plugins/*` 直跳）。
- **工作台** `app/pages/plugins/weread.vue`：`<script setup> + useI18n + $backend + useMainStore + useHead` 的典型范式，6 个 `v-window-item` + `v-autocomplete/v-select/v-alert/v-list`。本次三个工具页沿用同范式：`v-autocomplete` 选书（防抖 300ms 调 `GET /api/plugins/tools/books?query=`，仅展示 `EPUB/TXT`），`v-radio-group` 选输出模式，`v-alert` 分层展示 `error/success/report`。
- **i18n**：`app/i18n/locales/{zh-CN,en-US}.json`。**致命坑**：文案中**禁止出现字面量 `@` 和 `<`**（`vue-i18n` 会把 `@` 当链接、` <` 当 HTML，致整个 locale 编译失败、`dev server 500`，而 `JSON.parse` 与 `eslint` 均不报错，仅 `unplugin-vue-i18n` 日志可见）。本 PR 的 `bookTools.*` 均已规避；新增 `pluginManagement.openTool / capContent*`。

---

## 9 移植实战：从 mybooks 工具到 Talebook 插件

下游三工具在 `PoxenStudio/mybooks` 中为 **Toolbox 工具**：

```
webserver/toolbox/{text_replace,chinese_converter_tool,txt_encoding_fixer}.py  # BaseTool + @AsyncService.register_service + BackgroundService
webserver/toolbox/toolset.py      # ToolSet.register(Tool.info())
webserver/handlers/toolbox.py     # /api/toolbox/* + clone/prompt/progress
app/src/pages/toolbox/*.vue       # Vuetify 2（item-text / outlined / dense）
```

移植时的核心决策与对比：

| 议题 | 选项 | 本 PR 决策 | 原因 |
|------|------|------------|------|
| 归属分类 | A 扩展 `CATEGORIES` 新增 `tools` / B 复用 `integrations` / C 不进目录 | **B** | 用户评审选择复用 `integrations`，避免改共享协议与管理页 tab；`primary_action=open` + `manage_kind∈{text_replace,zh_converter,txt_fixer}` 已满足“出现在插件目录且可打开” |
| 输出形态 | 纯“写回原书” / 纯“另存新书” / 二选一 | **二选一** | 用户要求“选书后可选写回原书或入库为新书”；实现为 `output_mode ∈ {new, overwrite/replace}`，TXT 前者 `add_format`，后者 `import_as_new_book`（完整继承原书元数据与封面，参考 `epub_beautify / chinese_converter` 的 `Metadata` + `Item` 模式） |
| PR 粒度 | 3 个独立 PR / 1 个 PR 3 工具 | **1 个 PR** | 按用户要求合并提交，提交信息与说明中保留上游归属 |
| 执行模型 | `BackgroundService` 轮询 / `IOLoop.run_in_executor` 同步 | **同步 + 线程池** | 与 `WereadProvider.query` 一致，重操作经 `IOLoop.current().run_in_executor(None, functools.partial(...))` 避免卡 `Tornado` 事件循环；`BackgroundService` 需额外轮询页，同步模型对书库工具（数 MB 内）已足够；`@js` 装饰器已支持 `async def`（自动 `await`） |
| 纯核心位置 | `services/booktools` / `plugins/texttools` | **`plugins/texttools` + `services/booktools`** | 纯文本/EPUB 处理放 `plugins/texttools`（`encoding_detect/epub_utils/text_replace/txt_fixer/opencc_engine/chinese_epub`），Calibre 交互放 `services/booktools`（`resolve_book/pick_format/get_format_path/overwrite_format/import_as_new_book`） |
| 编码策略 | 沿用 `chardet` / 自研打分 | **沿用下游自研** | `encoding_detect.py` 的 `CANDIDATE_ENCODINGS(gb18030/big5/utf-8) + chardet 三段投票 + _MOJIBAKE_PAIRS 反转链 + COMMON_CHARS 语义校验` 在中文书籍上显著优于单 `chardet`；`requirements.txt` 已含 `chardet/bs4/lxml` |
| EPUB 处理 | 全量 `read_zip_entries` / 仅正文 `read_text_entries` | **按场景区分** | 预览用 `read_text_entries`（仅 container/opf/正文 xhtml），执行用 `read_zip_entries`（全条目重写，`mimetype` ZIP_STORED 置首） |
| 汉化词表 | 打包字典 | **一并打包** | `config/*.json + dictionary/*.txt + a5_phrases.txt` 约 1.4 MB，`opencc_engine._PKG_DIR` 相对定位，额外词表经 `extra_dicts` 注入各 group 首位 |

---
## 10 常见坑与检查清单

### 10.1 会直接导致提交被打回的

- **i18n 的 `@` / `<`**：`zh-CN.json` 中出现 `@` / `<` 会致整个 locale 编译失败、`dev 500`，需改写为全角或 `{''@''}` 字面插值。
- **Vuetify 3 误用 Vuetify 2 语法**：`feat/plugins` 已是 `Vuetify 3`（`item-title` / `variant="outlined"` / `density="compact"`），不可再写 `item-text / outlined(boolean) / dense(boolean)`。
- **裸 `fetch`**：必须经 `plugins/talebook.js:$backend`，否则鉴权与 `handleErrorEnvelope` 失效。
- **`auth_schema.writeOnly` 与 `default`**：缺 `writeOnly: true` 或带 `default` 会在启动时 `ManifestError`。

### 10.2 运行时易错

- `capabilities` 前缀必须已在 `categories` 中声明（`capability must use a declared category prefix`）。
- `permissions` 必须为 `capabilities` 风格的点分标识，且 `save_connection scopes` 必须为已批准权限的子集。
- `entity_type` 写错会得 `plugin.item_invalid` 且 `counts.failed` 自增；`book_source` 的 `format` 不在 `ALLOWED_FORMATS` 会 `ProviderError`。
- `OPDS_ENABLED` 等开关虽注册为插件，但仍走 `SettingsSaverLogic.save_extra_settings`，勿重复写表。
- **逐资源权限校验**：凡按 `book_id` 取书的只读端点（preview/analyze 类），必须经 `handler.can_view_book(book_id)` 校验后再取数——本项目曾因此被打回：仅 `@auth` + 书籍列表过滤挡不住客户端直传任意 `book_id` 读他人私藏（`Item.scope == "private"`）。统一封装 `_tool_resolve_book(handler, book_id)` 一类的辅助函数最稳妥。
- **新增内置能力会破坏既有计数断言**：`BUILTIN_CAPABILITY_PROVIDERS` 每加一项，`tests/test_plugin_runtime.py` 中硬编码的安装数量断言要同步 +1，否则全量 pytest 直接回归。

### 10.3 提交前

```bash
python -m py_compile webserver/plugins/texttools/*.py webserver/services/booktools.py
python -c "import json; json.load(open('app/i18n/locales/zh-CN.json',encoding='utf-8'))"
make lint-py-fix && make lint-py          # ruff（行宽 127，plugins/** 放宽 D/I）
cd app && npm run lint
make pytest                               # Docker 内
make check-design                          # 如新增设计稿
```

---

## 11 可继续深挖的源码方向

1. **`webserver/plugins/runtime/safe_http.py:SafeHttpClient`** —— SSRF 防护的 `allowed_hosts` 白名单、重定向与超时策略；对比 `enrichment.py:_http_json` 的直调 `requests`，理解何时该用受限客户端。
2. **`webserver/services/weread_annotations.py`** —— EPUB 的 CFI 定位与 `prepare_annotation_item / materialize_annotation / rollback_materialized_annotation` 的三段式落库；可复用到“批注回写”类插件。
3. **`webserver/services/booksource/`** —— `engine / rule_dispatch / js_runtime(quickjs) / cleaner` 构成的 Legado 书源执行链路；与 `plugins/texttools` 的纯函数式形成对比，适合做“规则引擎”类插件的脚手架。
4. **`webserver/services/convert.py:ConvertService`** —— `ebook-convert / txt2epub-next` 的 `BackgroundService + progress_path` 轮询模型；超大书籍的长任务可借鉴为 `BackgroundTask + /progress` 接口。
5. **`app/test/mock-server.js`** —— 前端隔离自测的 mock 路由表（含 `weread` 的完整 mock）；新增插件时先在 mock 中定契约，可免起后端联调。
6. **`tests/test_weread_plugin.py / test_enrichment_connectors.py`** —— `validate_weread_query` 的 allowlist 校验与 `build_field_decisions` 的“只补空”富化策略；可作為新 provider 的单测模板。

---

## 12 快速开始：最小可运行插件

```python
# webserver/plugins/runtime/my_demo.py
from .protocol import PROTOCOL_VERSION, ProviderResult, ProviderItem

class MyDemoProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.demo.hello",
        "name": "Hello Demo",
        "version": "0.1.0",
        "categories": ["integrations"],
        "capabilities": ["integrations.search"],
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read"],
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/talebook/talebook",
        "license": "MIT",
        "ui": {"icon": "mdi-emoticon-outline", "manage_kind": "hello", "primary_action": "open"},
    }
    def execute(self, context):
        if context["action"] == "test":
            return ProviderResult(health_message="hello ok")
        return ProviderResult(items=[ProviderItem("hello:1", "metadata", {"title": "Hello Talebook"})])
```

```python
# webserver/plugins/runtime/builtin_capabilities.py 末尾
from .my_demo import MyDemoProvider
BUILTIN_CAPABILITY_PROVIDERS = (*BUILTIN_CAPABILITY_PROVIDERS, MyDemoProvider())
```

```python
# webserver/handlers/plugins.py 末尾 routes() 中
(r"/api/plugins/demo/hello", MyDemoHandler),
```

```jsonc
// app/i18n/locales/zh-CN.json
"pluginManagement": { "capSearch": "搜索", ... },
"bookTools": { "hello": { "title": "Hello" } }
```

重启后访问 `GET /api/admin/plugins` 即可在 `integrations` 看到新卡片；`primary_action: open` 时卡片直跳你的页面。

---

## 13 参考与归属

- **上游**：`talebook/talebook#feat/plugins`（`protocol.py / plugin_runtime.py / handlers/plugins.py / app/pages/admin/plugins/index.vue`）
- **下游**：`PoxenStudio/mybooks` Toolbox 工具体系（3 个工具的纯核心与 `book_utils.import_as_new_book` 模式）
- **字典**：OpenCC（BYVoid, Apache-2.0）、opencc-python（Hopkins1, Apache-2.0）、a5566123s/Calibre-BIG5toGBK 修正表
- **设计稿**：`design/webserver/20260817-weread-annotation-import.active.html`（17 项能力与只读边界的范式）

> 文档版本：2026-08-22，基于 `feat/plugins@51177f3`。后续若 `CATEGORIES` 新增 `tools` 或运行时改为异步任务池，§4/§9 的决策需同步修订。

