# Talebook 插件开发与 API 指南（插件能力接口版）

> 适用分支：`feat/plugins`（插件系统集成分支，领先 `master` 26 commits，持续从 `master` 同步）  
> 目标读者：为 Talebook 编写新插件 / 内置能力 / 书源 的开发者  
> 本文已按 `refactor/20260824-plugin-capability-interfaces` 更新，覆盖类型化能力接口、通用书源入口与 extra feature 逃生舱。

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
| `connection_owners` | string[] | **必填**，取值限于 `{instance, user}`，**无默认值**——缺失即不允许任何连接 |
| `ui` | object | 可选，但类型受校验；管理页强依赖（见 2.3） |
| `description` | string | 可选，类型受校验 |
| `download_mode` | string | 书源必填：`single_book / by_chapters / none` |
| `extra_features` | object | 非标准动作白名单；每项声明 `mode / schema / required_scopes` |

未在上表出现、且不以 `x-` 开头的字段一律被 `manifest.unknown_field` 拒绝。`x-` 前缀保留为扩展区，不受协议约束。

`config_schema` 现在**后端生效**：连接配置会按它校验类型、必填、`enum`、`minimum/maximum` 与 `items.type`，未声明的键被 `config.unknown_field` 拒绝。三个平台保留键（`timeout_seconds` / `max_retries` / `backoff_seconds`）由运行时自身读取，对每个连接都合法，无需插件声明。

以下字段目前**仅作声明、不影响运行时行为**，编写 manifest 时不要据此假设平台已在管这些事：`categories`（仅用于校验 capability 前缀）、`runtime_kind`（`http` / `file` 取值不改变调用方式，均为进程内调用）、`data_policy`、`compatibility`（不阻止不兼容版本安装）、`homepage`、`license`。

### 2.2 凭据约束

`auth_schema.properties.<field>.writeOnly` **必须为 `true`**，且**禁止 `default`**。这是为了让 `SecretCipher` 统一走密文路径；任何带 `default` 的凭据会在 `validate()` 被 `manifest.secret_default_forbidden` 拒绝。

### 2.3 UI 约定（非协议但强依赖）

```python
"ui": {
    "icon": "mdi-book-open-page-variant",         # 管理页卡片图标
    "manage_route": "/plugins/weread",            # 管理入口：站内路由，前端直接 navigateTo
    "manage_dialog": "opds",                      # 或：由前端弹窗映射表处理（opds / legado）
    "manage_label_key": "pluginManagement.openWorkbench",  # 主按钮文案的 i18n key
    "primary_action": "configure",                # 为 configure 时，无连接会显示“待配置”状态
    "hidden": True,                               # 为 True 时 catalog 计算会过滤（如 mock）
    "supports_auto_trigger": True,                # 仅正文处理类：是否允许配置为自动执行
    "service_toggle": "opds",                    # 可选：声明平台已知的服务开关适配器
}
```

`manage_route` 与 `manage_dialog` 二选一。早期的 `manage_kind` 是与插件一一对应的闭合枚举，前端需为每个取值写一条分支，已移除。

管理页 `statusInfo()` 对 `primary_action === "configure"` 且既无连接、又未通过 `status()` 自报配置的插件置为 `unconfigured`。**内置工具**应设 `primary_action: "open"` 以避免「待配置」误判。

内置能力插件可选实现两个钩子，平台据此展示状态、决定首次安装是否启用：

```python
def status(self, session, settings):      # 自报已配置 / 已启用数量，进 builtin_state
def initial_enabled(self, settings):      # 首次安装时是否启用
```

---
## 3 Provider 契约

平台定义七个按能力拆分的 `Protocol`：`MetadataProvider`、`AnnotationProvider`、`ReviewProvider`、`SourceProvider`、`TransformProvider`、`ExtraFeatureProvider` 与 `PushProvider`。manifest 声明标准 capability 时，`REGISTRY.register()` 会在启动期检查对应接口；声明与实现不一致会直接拒绝注册。

标准接口返回 `BookMetadata / Annotation / SourceState / Review / SourceBook / SourceBookDetail / SourceChapter / SourceContent / ToolInput / ToolReport / ToolOutput / PushReceipt / Page[T]` 等领域对象。插件作者应直接实现这些 typed 方法；`ProviderItem / ProviderResult` 只保留给存量摄入状态机的内部适配，不是新插件的扩展契约。

```python
from webserver.plugins.runtime import BookMetadata
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION

class MyMetadataProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.metadata.example",
        "name": "Example Metadata",
        "version": "1.0.0",
        "categories": ["metadata"],
        "capabilities": ["metadata.lookup"],
        "runtime_kind": "http",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {"api_key": {"type": "string", "writeOnly": True}}, "required": ["api_key"]},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read"],
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        "connection_owners": ["instance"],
        "homepage": "https://example.com",
        "license": "MIT",
    }

    def search_books(self, query: str, context: dict) -> list[BookMetadata]:
        return [BookMetadata.from_dict({"provider_value": "ext-1", "title": query})]

    def get_metadata(self, external_id: str, context: dict) -> BookMetadata:
        return BookMetadata.from_dict({"provider_value": external_id, "title": "Example"})

    def self_check(self, context: dict):
        from webserver.plugins.runtime import CheckReport
        return CheckReport(healthy=True, message="Example API is reachable")
```

分页能力返回 `Page[T]`：逐项失败放进 `Page.failures`，分页位置放进 `next_cursor`，并显式设置 `has_more`。平台会拒绝游标不推进的循环。不要用一个无类型 `data` 字典混装 metadata、annotation、review 与 book source。

异常：`UpstreamAuthError`（401/403）、`UpstreamRateLimitError(retry_after)`、`UpstreamError`。限流异常会触发运行时的退避与有界重试，认证失败则立即终止（见 §5）。**不要自己 sleep 重试**——退避策略、health 状态与游标推进都由运行时统一处理，插件抛对异常即可。

### 3.1 契约检查、能力映射与 `PluginContext`

`webserver/plugins/runtime/interfaces.py` 把事实契约显式化：

- 通用 `PluginProvider` 已废弃并删除。插件只实现 manifest 声明的能力接口；没有通用 `execute(context)` 注册兜底。
- 每个标准 capability 都必须存在于 `CAPABILITY_INTERFACES`，并映射到七类接口之一。未知 capability、声明但没实现对应接口、或声明 `extra_features` 却没实现 `ExtraFeatureProvider`，都会在注册期失败。
- typed-only provider 声明 `test` 动作时必须实现返回 `CheckReport` 的 `self_check(context)`；只有存量摄入适配器可在运行时内部用旧 `execute` 完成兼容体检。
- `PluginContext` 是冻结 dataclass，收拢运行时传给插件的 10 个字段；`as_dict()` 返回副本，插件收到的仍是普通 dict，改动不会回写平台状态。
- `REGISTRY.register()` 在**注册期**检查契约，违反直接抛 `TypeError`——不再降级成运行期 `AttributeError` 后被兜底成通用的 `plugin.execution_failed`。

用 `Protocol` 而非 ABC，是因为现有 provider 均不继承任何基类。

### 3.2 三种调用模式

判据是**插件行为的副作用方向**，不是平台拿到结果后做什么：

| 模式 | 方向 | 插件做什么 | 典型方法 | 回滚 |
|------|------|-----------|---------|------|
| `read` | 外部 → 平台 | 取数并返回，无副作用 | `search_books` / `list_annotations` / `download` | 不适用 |
| `write` | 平台内部 | 修改本地书籍正文 | `TransformProvider.apply` | 文件备份恢复 |
| `sync` | 平台 → 外部 | 把本地数据写进外部服务 | `push_annotation` | 可能不可用 |

注意 `download` 与 `list_annotations` 都是 **read**：插件只从远端读，写库的是平台。`runtime.read/write/sync` 统一获取连接租约、执行有界重试、更新 health 并创建 `PluginRun`；write 还可把平台写回与回滚钩子纳入同一 run。批量摄入另外写来源记录、推进游标，不因 provider 方法是 read 而取消。

### 3.2.1 设备推送（sync）

`webserver/plugins/push/devices.py` 保留 6 个上传器的纯上传逻辑，
`webserver/plugins/runtime/push.py` 把它们包装为 `talebook.push.*` 插件：
每用户一条连接（`connection_owners: ["user"]`，设备属于个人），配置项为
`device_url`，manifest 的 `ui.device_type` 声明既有设备路由。handler 仅把
`device_type` 交给 runtime 解析；认证用户由 runtime 创建/复用个人连接，
再经 `runtime.sync(..., "push", ...)` 取得 lease、重试、超时、脱敏和 `PluginRun`
审计，handler 不持有 provider map 或直接调用 `push()`。
推送使用专用总预算 `PUSH_TIMEOUT`（默认 60s）；provider 从
`PluginContext.deadline` 计算 requests timeout 并预留 100ms 给 runtime
结算，不会出现 API 先报超时、底层上传后成功的窗口。

`ALLOW_GUEST_PUSH=true` 是明确的兼容例外：游客没有可写入
`PluginRun.requested_by` 的审计主体，runtime 因此执行无持久连接的单次
`guest_sync`，仍负责声明式 provider 解析、总超时和异常脱敏，但不伪造
用户、不保存设备地址也不创建 run。开关优先级为：全局
`ALLOW_GUEST_PUSH=false` 一律拒绝游客；开关为 true 时，尚未创建安装记录的
内置推送 provider 保持历史默认可用；一旦已有 `PluginInstallation`，其
`enabled=false` 或非 `active` 状态优先并拒绝调用。因此管理员禁用已安装插件
后，游客路径不能绕过该状态。

外部写入不可撤销，因此 `PushProvider` 不提供回滚。

### 3.3 实体写入器

`webserver/services/plugin_writers.py` 按 `entity_type` 注册写入器，提供 `prepare` / `materialize` / `rollback` 三个钩子。**通用运行时不认识任何具体插件**：微信读书保留历史 `weread` 标识，其他来源以完整 `plugin_key + connection_id` 计算命名空间；可读值超出目标列宽时使用“截断前缀 + SHA-256 摘要”稳定编码，`source_name`、`source_type`、`client_id` 均不超过 64 字符。不同厂商同后缀、同插件多账户导入相同 external id 都不会冲突。

### 3.4 按能力调用插件

业务流不要按 `plugin_key` 查安装与连接，更不要自行解密凭据：

```python
runtime = PluginRuntime(session, CONF)
for connection in runtime.connections_for("metadata.lookup", user_id):
    metadata = runtime.read(connection, "search_books", title)
results = runtime.read_many(connections, "search_books", title, timeout=30)

# 本地文件变换由 write 边界执行；外部批注写回由 sync 边界执行。
output = runtime.write(tool_connection, "apply", tool_input, out_dir)
receipt = runtime.sync(annotation_connection, "push_annotation", annotation, source_state)
```

`read_many` 内部并发，每条连接分别维护 deadline 与 `next_retry_at`；单个限流源的 backoff 不会阻塞其他 future 的收割。若要接入既有线程池，用 `prepare_read(..., audit=True, requested_by=...)` / `finish_read()` 两段式：**凭据与租约在调用线程准备，worker 只做带退避重试的网络 I/O、不得触碰 session**，join 后回到调用线程统一结束 run、释放租约并写 health。SQLAlchemy session 不是线程安全的；不带 `audit=True` 的低层形式只供运行时内部组合。在线书源的多个 binding 按 connection 分组，通过 `begin_read_batch` / `finish_read_batch` 共用一个 lease/run，同时保留每个 binding 的独立上下文。最后一个 binding 结束时，`SearchTaskService` 用预绑定的独立 session 立即收口 durable run，不依赖客户端继续轮询；status 请求与 TTL cleanup 只作持久化失败时的可靠重试，且仅在成功后标记 settled。书籍元数据的同步与流式入口统一复用进程级 16 线程执行器，不再按请求创建线程池。

---
### 3.5 Extra feature 逃生舱

只有无法映射到六个标准业务接口的插件自有动作，才允许声明到 `extra_features`。平台先按 manifest schema 校验参数，再检查本次动作的 `required_scopes`，最后调用 `ExtraFeatureProvider.execute_feature(action, params, context)`：

```text
POST /api/plugins/{plugin_key}/features/{action}
```

当前微信读书仅将阅读统计、热门划线和划线热度保留在该入口；书、笔记、书评和书源结果不得借此绕过领域类型。

## 4 现有 Provider 形态

| 形态 | 典型实现 | `runtime_kind` | 特点 |
|------|----------|---------------|------|
| **内置能力** | `builtin_capabilities.py` 的 `talebook.book-source.{opds,legado}` 与三个正文工具 | `builtin` | 自动安装并创建 `instance/0/builtin` 连接；OPDS 与 Legado 再由绑定层展开存量事实表 |
| **书源** | `book_sources.py` 的 `OPDSProvider / GutenbergProvider / InternetArchive / WebDAV / WatchFolder`，以及 `legado.py` | `http` / `file` / `builtin` | 全部实现 `SourceProvider`；统一返回领域对象，并由 `download_mode` 选择单文件或分章组装 |
| **富化连接器** | `enrichment.py` 的 `OpenLibrary / EmbeddedMetadata / CatalogReview(BRS, Goodreads...)` | `builtin` | 经 `SafeHttpClient` 的 `_http_json()` 统一出网，`_manifest()` 统一声明 `talebook.metadata.* / talebook.reviews.*` |
| **通用集成** | `weread.py:WereadProvider` | `http` | 实现 metadata/annotation/extra feature 接口；嵌套分页通过显式 cursor 逐页推进 |
| **Mock** | `mock.py:MockMultiTabProvider` | `builtin` | `ui.hidden: true`，用于证明跨类别与重试/回滚行为，`token` 驱动的 `rate_limit / delay / fail_external_ids` |
| **正文工具** | `texttools` 的 3 个 `talebook.tool.*` | `builtin` | `TransformProvider.preview/apply` 执行真实正文处理；handler 仅解析 HTTP、定位书籍，并通过 `runtime.write` 的 finalize/rollback 钩子写回或另存 |

书源配置不复制：`BookSourceModel` 与 `OpdsSource` 继续是唯一事实，`SourceCatalogService` 用 opaque `source_key` 将它们绑定到插件连接。新入口为 `/api/book-sources/*`；`/api/network/*` 按 D-14 保留一版兼容别名。

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
- `ensure_builtin_capability_installations(session, installed_by, settings)`：幂等地为每个 `BUILTIN_CAPABILITY_PROVIDERS` 安装并创建 `instance/0/内置连接`。存量 `plugins/meta/` 来源仍由元数据设置管理，不伪装成一个返回空结果的 provider；完成逐来源 typed 适配前不会出现在插件目录。

### 5.3 连接与凭据

```python
save_connection(session, settings, installation_id, owner_type, owner_id,
                credentials, name="default", config=None, scopes=None, schedule="")
```

- `owner_type ∈ {instance, user}`，`instance` 时 `owner_id` 强制为 0。
- `credentials` 走 `SecretCipher(settings)` 加密进 `PluginSecret(ciphertext, key_id, mask_hint)`，`connection.secret_id` 关联；`_validate_credentials()` 校验 `auth_schema.required`。
- `config` 为公开配置，禁止含敏感键（`SENSITIVE_KEY_RE`）或凭据原文（`plugin.secret_in_config`）。

### 5.4 Typed 调用与存量摄入状态机

新业务流通过 `connections_for(capability)` 发现连接，再调用 `read / write / sync`；连接租约、凭据解密、scope 校验、退避重试、超时、`PluginRun` 审计与 health 更新全部留在 `PluginRuntime` 边界内。业务 handler 不得导入具体 provider、读取 `PluginSecret` 或调用 `SecretCipher`。

下面的 `prepare_run() + execute()` 是平台持久化 run、retry 与 rollback 的状态机。此处的 `execute()` 是 **PluginRuntime 方法**，不是已废弃的 provider 通用接口。存量内置摄入适配器仍在状态机内部转换为 `ProviderResult`，新插件不要以该兼容层代替 typed capability：

```python
runtime = PluginRuntime(session, loader.get_settings(), calibre_db=self.db)
run = runtime.prepare_run(connection_id, action, requested_by, trigger="manual",
                          parent_run_id=None, input_data={"allowed_book_ids": [...]})
runtime.execute(run.id)  # 同步阻塞，handler 内直接调用
```

- `TERMINAL_STATUSES = {succeeded, failed, partial, rolled_back}`；`retry` 仅允许 `failed/partial` 的父运行，`rollback` 仅允许 `run/retry` 的父运行。
- `lease_token / lease_until` 乐观锁防并发（`timeout_seconds` 默认 30，lease = now + timeout + 30s）；连接配置与调用方预算取更严格者。
- 全部 attempts 共用一个墙钟 deadline，指数退避重试 `max_retries(≤5)`，`retry_after` 优先，不会给每次 retry 重新发一份 timeout。typed 调用、存量摄入与元数据兼容入口都只使用进程级有界 I/O 执行器；已开始的超时 future 可能无法中断，此时运行时不再提交重叠 attempt，并保留 lease 至既定 `timeout+30s` 宽限结束，避免新请求立即与未退出调用重叠；线程数仍有固定上限。
- provider 异常离开运行时前会转换为保留 `code/retryable/retry_after` 的脱敏异常；API、日志、run 与 health 都不得出现连接 secret 明文。
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
| `PluginConnection` | `installation_id, owner_type, owner_id, role, name, config, scopes, cursor(JSON), lease_token, lease_until, secret_id, health` | `role` 是稳定查询键，`name` 仅展示；`cursor` 为增量游标 |
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
| `POST /api/plugins/connections/:id/{test,preview,run,retry,rollback}` | 校验连接归属，服务端重算 `allowed_book_ids` 后执行通用流水线 |
| `POST /api/plugins/:plugin_key/features/:action` | 仅执行 manifest `extra_features` 白名单动作；校验 schema 与 `required_scopes` |
| `GET /api/plugins/runs` | 当前用户 100 条 runs |
| `GET /api/plugins/runs/:id` | 校验归属后返回 items |
| `GET /api/plugins/weread` | `{connection, runs, operations[17], read_only: true, skill_version}` |
| `POST /api/plugins/weread/query` `{api_key?, operation, params}` | 工作台兼容入口；标准业务调用应优先使用 typed provider，三个非标准动作已迁到 generic feature 路由 |
| `GET/POST /api/plugins/weread/import` `{action=test/preview/run, export?, matches?, api_key?}` | 导入兼容入口；内部仍走 `PluginRuntime`，`allowed_book_ids` 注入 `input_data` |

### 7.3 本次新增（文本工具，复用 `integrations` 分类，`@auth/@is_admin` 混合）

| 方法与路径 | 权限 | 说明 |
|------------|------|------|
| `GET /api/plugins/tools/books?query=` | `@auth` | 书库筛选（仅 `EPUB/TXT`，`query` 匹配标题/作者，取最近 100，`check_permission` 已过滤私藏） |
| `POST /api/plugins/tools/text-replace/preview` `{book_id, pattern, replacement, use_regex}` | `@auth` | handler 解析书籍后调用声明式发现的 `TransformProvider.preview`；provider 在 `PREVIEW_LIMIT=200k` 内统计命中与最多 5 条上下文样本 |
| `POST /api/plugins/tools/text-replace/run` `{book_id, pattern, replacement, use_regex, output_mode=new/overwrite, suffix?}` | `@is_admin` | `TransformProvider.apply` 产生新文件；`runtime.write` 的 finalizer 执行覆写或另存，失败 rollback 从持久备份恢复 |
| `POST /api/plugins/tools/txt-fixer/analyze` `{book_id}` | `@auth` | `TransformProvider.preview` 读前 `2MB` 做 BOM/候选打分/chardet/反转链分析 |
| `POST /api/plugins/tools/txt-fixer/run` `{book_id, output_mode}` | `@is_admin` | `TransformProvider.apply` 全量修复编码，`unrecoverable/garbage` 直接报错，写出 UTF-8 无 BOM；落库由 `runtime.write` finalizer 完成 |
| `POST /api/plugins/tools/zh-converter/run` `{book_id, direction, use_a5, convert_title, output_mode, backup}` | `@is_admin` | `TransformProvider.apply` 执行 OpenCC 8 方向与 A5 增强；`runtime.write` 统一审计备份路径、正文落库及标题/语言更新 |

> 轮询：运行历史统一经 `GET /api/{admin/plugins,plugins}/runs` 拉取，无独立“任务”轮询接口；重操作的前端以按钮 `loading` 态 + 成功提示收口。

> **权限边界（review 修正）**：以上按 `book_id` 取书的端点统一经 `_tool_resolve_book(handler, book_id)` 解析，内部先调 `handler.can_view_book(book_id)`，无权查看时返回与「书籍不存在」一致的错误——防止任意登录用户用列表外的 `book_id` 探测他人**私有书籍**（`Item.scope == "private"`）。这是 `AGENTS.md` 的硬性规则：只读 JSON 也必须逐资源做权限校验，仅靠书籍选择接口的 `get_books()` 过滤是不够的。

---
## 8 前端 `app/`

- **栈**：`nuxt@^4.3.0 + vue@^3.5 + vuetify-nuxt-module + pinia + @nuxtjs/i18n@^10`，与 `PoxenStudio/mybooks` 的 `Nuxt 2 + Vue 2 + Vuetify 2` 完全不同。`app/CLAUDE.md` 明确要求所有请求经 `plugins/talebook.js` 的 `backend(url, opts)` 发起，禁止裸 `fetch`。
- **管理页** `app/pages/admin/plugins/index.vue`：`activeTab ∈ {integrations, metadata, annotations, reviews, book_sources}`；`capabilityLabel()` 包含 `integrations.tool`；主动作由 `ui.manage_route / manage_dialog` 声明驱动。服务开关只在 manifest 显式声明 `ui.service_toggle` 时显示，不再从状态字段猜插件类型。
- **在线书库** `app/pages/network/`：统一调用 `/api/book-sources/*` 并传 opaque `source_key`；详情按 `download_mode` 呈现分章阅读、单文件保存或外链，旧 `/api/network/*` 仅供兼容消费者。
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
| 归属分类 | A 扩展 `CATEGORIES` 新增 `tools` / B 复用 `integrations` / C 不进目录 | **B** | 用户评审选择复用 `integrations`，避免改共享协议与管理页 tab；`primary_action=open` + `ui.manage_route` 已满足“出现在插件目录且可打开” |
| 输出形态 | 纯“写回原书” / 纯“另存新书” / 二选一 | **二选一** | 用户要求“选书后可选写回原书或入库为新书”；实现为 `output_mode ∈ {new, overwrite/replace}`，TXT 前者 `add_format`，后者 `import_as_new_book`（完整继承原书元数据与封面，参考 `epub_beautify / chinese_converter` 的 `Metadata` + `Item` 模式） |
| PR 粒度 | 3 个独立 PR / 1 个 PR 3 工具 | **1 个 PR** | 按用户要求合并提交，提交信息与说明中保留上游归属 |
| 执行模型 | `BackgroundService` 轮询 / typed runtime 同步调用 | **typed runtime + 共享有界线程池** | provider 的纯文件处理由运行时 I/O 池执行并受 timeout/重试/run 状态机约束；handler 只等待结果并执行平台 finalizer，不另建工具专属任务协议 |
| 纯核心位置 | `services/booktools` / provider 内部 | **`builtin_capabilities` provider + `plugins/texttools` + `services/booktools`** | provider 持有 preview/apply 业务语义并调用纯文本/EPUB 处理模块；Calibre 定位、覆写、另存与备份属于平台 finalizer，放在 `services/booktools` |
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
- `entity_type` 写错会得 `plugin.item_invalid` 且 `counts.failed` 自增；`book_source` 的 `format` 不在 `ALLOWED_FORMATS` 会 `UpstreamError`。
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

1. **`webserver/plugins/runtime/safe_http.py:SafeHttpClient`** —— SSRF 防护的管理员白名单、逐跳重定向校验与响应体上限；`enrichment.py:_http_json` 和 Legado transport 都复用这条受限出网边界。
2. **`webserver/services/annotation_writer.py`** —— EPUB 的 CFI 定位与 `prepare_annotation_item / materialize_annotation / rollback_materialized_annotation` 的三段式落库；可复用到“批注回写”类插件。
3. **`webserver/services/booksource/`** —— `engine / rule_dispatch / js_runtime(quickjs) / cleaner` 构成的 Legado 书源执行链路；与 `plugins/texttools` 的纯函数式形成对比，适合做“规则引擎”类插件的脚手架。
4. **`webserver/services/convert.py:ConvertService`** —— `ebook-convert / txt2epub-next` 的 `BackgroundService + progress_path` 轮询模型；超大书籍的长任务可借鉴为 `BackgroundTask + /progress` 接口。
5. **`app/test/mock-server.js`** —— 前端隔离自测的 mock 路由表（含 `weread` 的完整 mock）；新增插件时先在 mock 中定契约，可免起后端联调。
6. **`tests/test_weread_plugin.py / test_enrichment_connectors.py`** —— `validate_weread_query` 的 allowlist 校验与 `build_field_decisions` 的“只补空”富化策略；可作為新 provider 的单测模板。

---

## 12 快速开始：最小可运行插件

```python
# webserver/plugins/runtime/my_demo.py
from .domains import BookMetadata
from .protocol import PROTOCOL_VERSION

class MyDemoMetadataProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.metadata.hello",
        "name": "Hello Demo",
        "version": "0.1.0",
        "categories": ["metadata"],
        "capabilities": ["metadata.lookup"],
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "connection_owners": ["instance"],
        "permissions": ["books.read"],
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": "https://github.com/talebook/talebook",
        "license": "MIT",
        "ui": {"icon": "mdi-emoticon-outline", "hidden": False, "primary_action": "open"},
    }

    def search_books(self, query, context):
        return [BookMetadata.from_dict({"provider_value": "hello:1", "title": "Hello " + query})]

    def get_metadata(self, external_id, context):
        return BookMetadata.from_dict({"provider_value": external_id, "title": "Hello Talebook"})
```

```python
# webserver/plugins/runtime/builtin_capabilities.py 末尾
from .my_demo import MyDemoMetadataProvider
BUILTIN_CAPABILITY_PROVIDERS = (*BUILTIN_CAPABILITY_PROVIDERS, MyDemoMetadataProvider())
```

重启后访问 `GET /api/admin/plugins` 即可在 `metadata` 分类看到新卡片。已有 metadata 业务流会通过 `connections_for("metadata.lookup")` 自动发现它；不需要再新增一个 provider 专属 handler。只有插件确实需要自有工作台时才声明 `ui.manage_route`，该页面也必须通过 generic feature 路由调用 `ExtraFeatureProvider`。

---

## 13 参考与归属

- **上游**：`talebook/talebook#feat/plugins`（`protocol.py / plugin_runtime.py / handlers/plugins.py / app/pages/admin/plugins/index.vue`）
- **下游**：`PoxenStudio/mybooks` Toolbox 工具体系（3 个工具的纯核心与 `book_utils.import_as_new_book` 模式）
- **字典**：OpenCC（BYVoid, Apache-2.0）、opencc-python（Hopkins1, Apache-2.0）、a5566123s/Calibre-BIG5toGBK 修正表
- **设计稿**：`design/webserver/20260817-weread-annotation-import.active.html`（17 项能力与只读边界的范式）

> 文档版本：2026-08-25，基于 `refactor/20260824-plugin-capability-interfaces`。后续若 `CATEGORIES` 新增 `tools` 或运行时改为异步任务池，§4/§9 的决策需同步修订。
