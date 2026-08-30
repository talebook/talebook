# Talebook 插件开发指南

本文档定义 Talebook 插件的领域模型、能力契约、目录布局、生命周期和产品接入规则。它既是新增插件的开发指南，也是评审插件设计时的检查依据。

如果这里只记住一条原则，应当是：**插件不是一个万能的 `execute()`，而是一组由 Manifest 声明、由类型化 Provider 实现、通过 Connection 获得配置的能力。**

领域术语的简明定义见 [`CONTEXT.md`](../CONTEXT.md)；运行时代码是最终可执行契约，主要入口列在本文末尾。

## 1. 领域模型

### 1.1 六个核心对象

| 对象 | 回答的问题 | 不负责什么 |
| --- | --- | --- |
| Plugin | 这是什么插件？ | 不代表某次配置或运行 |
| Manifest | 插件声明了什么？ | 不保存密钥，不执行行为 |
| Capability | 插件能做什么？ | 不描述页面按钮，不等同插件类型 |
| Provider | 能力如何实现？ | 不持有数据库会话，不决定全局启停 |
| Connection | 谁以什么配置使用插件？ | 不代表插件定义，也不决定安装状态 |
| Run | 某次执行发生了什么？ | 不承担长期配置和领域数据存储 |

它们的关系是：

```text
Plugin Definition
  ├─ Manifest ── declares ──> Capability[]
  └─ Provider ── implements ─> typed interfaces

Plugin Installation
  ├─ activation state
  ├─ Connection(instance, owner=0, role=...)
  └─ Connection(user, owner=user_id, role=...)
                                │
                                └─ Run(action, status, result, error)
```

内置插件随系统代码交付，因此产品上只有“启用 / 未启用”，不提供“安装”按钮。首次物化内置插件时，可由 Provider 的 `initial_enabled(settings)` 决定默认启用状态；之后管理员的选择是持久化状态，升级不能擅自覆盖。

### 1.2 Definition、Activation 与 Connection 必须分开

这三个概念最容易被混淆：

- **Definition**：代码和 Manifest 是否存在。
- **Activation**：管理员是否允许当前实例使用插件。
- **Connection**：实例或用户是否已经提供了调用插件所需的配置与凭证。

因此：

- 插件可以已启用，但某个用户尚未绑定账号；
- 插件可以未启用，但历史 Connection 仍被保留，以便重新启用；
- 插件健康检查失败不等于未启用；
- Connection 的显示名称不是身份，不能用名称定位或覆盖配置。

Connection 的稳定身份是：

```text
(installation_id, owner_type, owner_id, role)
```

其中 `owner_type` 只有：

- `instance`：管理员维护的全局连接，`owner_id=0`；
- `user`：当前租户自己的连接，`owner_id=user_id`。

同一个插件可以同时声明两种 owner。例如，一个插件可使用实例级 API Key，同时让每个用户绑定自己的外部账号。

### 1.3 插件类型与能力不是同一个维度

目录类型用于组织代码和管理页面分组；Capability 用于运行时发现和调用。一个插件只有一个主类型，但可以实现多个 Capability。

当前主类型如下：

| 主类型 | Plugin ID 前缀 | 典型职责 |
| --- | --- | --- |
| `meta` | `talebook.meta.*` | 搜索书籍元数据 |
| `source` | `talebook.source.*` | 浏览、搜索和获取网络书籍 |
| `review` | `talebook.review.*` | 外部评分、评价或书评 |
| `annotation` | `talebook.annotation.*` | 批注导入、推送或章评 |
| `tool` | `talebook.tool.*` | 针对书籍文件的转换、修复或处理 |
| `push` | `talebook.push.*` | 发送书籍到阅读设备 |
| `combo` | `talebook.combo.*` | 同时提供多类能力的综合插件 |

`combo` 不是一个万能能力。它只表示该插件跨越多个业务类型；Manifest 仍必须逐项声明实际 Capability，Provider 仍必须实现相应的类型接口。

例如：

- Legado 的主类型是 `source`，但可同时提供书源和元数据能力；
- 微信读书是 `combo`，因为它可能同时提供书籍、书架、统计、社区和批注导入等能力；
- BRS 是 `annotation`，提供章评读取与批注推送。

## 2. 标识与目录

### 2.1 Plugin ID

Plugin ID 是持久化身份，格式为：

```text
talebook.{type}.{name}
```

示例：

```text
talebook.meta.douban-v2
talebook.source.opds
talebook.annotation.brs
talebook.combo.weread
talebook.push.kindle
```

规则：

- 全小写；
- 使用点号分段；
- `{type}` 必须是上表中的单数主类型；
- `{name}` 使用稳定、可读的短名称，单词之间用连字符；
- ID 一旦进入数据库或公开 API，不因品牌文案、目录重命名而变化；
- 不添加兼容性的隐式 ID 重写。确需迁移时使用显式迁移，并保留测试。

### 2.2 目录布局

具体插件必须位于：

```text
webserver/plugins/{type}/{name}.py
```

或在实现较复杂时使用：

```text
webserver/plugins/{type}/{name}/
  __init__.py
  provider.py
  api.py
  ...
```

平台运行时只放通用基础设施：

```text
webserver/plugins/runtime/
  domains.py
  interfaces.py
  protocol.py
  safe_http.py
  triggers.py
```

禁止把某个具体插件、具体服务域名、具体 Plugin ID 或产品专属转换逻辑放进 `runtime/`。各类型目录的 `__init__.py` 也不维护第二份注册表。

### 2.3 唯一装配入口

所有内置 Provider 只在 [`webserver/plugins/register.py`](../webserver/plugins/register.py) 装配一次。每个 Provider 进入一个与目录类型一致的主分组；其他运行时视图从这些分组派生。

新增插件时：

1. 在对应类型目录实现并导出 `PROVIDER`；
2. 在 `register.py` 导入；
3. 加入一个主分组；
4. 不在其他模块复制 Provider 列表。

测试用的 mock Provider 放在测试代码中，不注册为生产插件，也不出现在插件中心。

## 3. Manifest：声明契约

Manifest 使用协议版本：

```python
PROTOCOL_VERSION = "talebook.plugin/v1"
```

完整必填字段如下：

| 字段 | 含义 |
| --- | --- |
| `protocol_version` | 插件协议版本 |
| `id` | 稳定 Plugin ID |
| `name` | 面向用户的名称 |
| `version` | 语义化版本号 |
| `categories` | Capability 使用到的协议类别 |
| `capabilities` | 插件提供的标准能力 |
| `runtime_kind` | `builtin`、`file`、`http` 或 `managed_process` |
| `actions` | 运行时允许的标准动作 |
| `auth_schema` | 密钥字段 Schema |
| `config_schema` | 非敏感配置 Schema |
| `connection_owners` | `instance`、`user` 或两者 |
| `permissions` | 外部访问或额外能力所需权限 |
| `data_policy` | 数据处理和留存声明 |
| `compatibility` | Talebook 或协议兼容性声明 |
| `homepage` | 服务或项目主页 |
| `license` | 许可证标识 |

可选字段只有：

- `description`
- `ui`
- `download_mode`
- `extra_features`
- 以 `x-` 开头的显式扩展字段

其他未知顶层字段会被拒绝。不要通过给 Manifest 随意加字段来绕过领域设计。

### 3.1 categories 与 capabilities

协议类别是复数领域名：

```text
metadata
annotations
reviews
sources
integrations
```

Capability 格式为 `{category}.{verb}`，其类别前缀必须已经出现在 `categories` 中。当前标准能力包括：

| Capability | Provider 接口 |
| --- | --- |
| `metadata.lookup` | `MetadataProvider` |
| `metadata.extract` | `ExtraFeatureProvider` |
| `metadata.discover` | `ExtraFeatureProvider` |
| `annotations.import` | `AnnotationProvider` |
| `annotations.push` | `AnnotationProvider` |
| `annotations.chapter_reviews` | `ReviewProvider` |
| `reviews.lookup` | `ReviewProvider` |
| `reviews.import` | `ReviewProvider` |
| `sources.search` | `SourceProvider` |
| `sources.browse` | `SourceProvider` |
| `sources.acquire` | `SourceProvider` |
| `integrations.tool` | `TransformProvider` |
| `integrations.push` | `PushProvider` |
| `integrations.search` 等综合服务扩展 | `ExtraFeatureProvider` |

能力决定调用接口，主类型决定代码归属。不要根据 Plugin ID 猜测 Provider 方法，也不要根据页面按钮发明 Capability。

### 3.2 actions

标准 action 只有：

```text
test, preview, run, retry, rollback
```

它们描述运行生命周期，不是业务能力的替代品：

- 声明 `test` 时，类型化 Provider 应实现 `self_check(context)`；
- 书籍工具可使用 `preview` 和 `run`，但具体语义仍由 `TransformProvider` 定义；
- 不要为了让通用详情页显示按钮而声明没有真实语义的 action。

### 3.3 配置与密钥 Schema

`auth_schema` 只描述秘密数据；每个属性必须：

- `writeOnly: true`；
- 不设置默认值；
- 不在响应、日志或运行结果中回显。

`config_schema` 描述普通配置。平台当前校验 JSON Schema 的受控子集，包括 `type`、`properties`、`required`、`enum`、`minimum`、`maximum` 和数组元素类型；不要依赖未实现的高级关键字。

没有用户可理解配置的插件应使用空 Schema，并设置 `ui.configuration_mode = "none"`。不要向普通用户展示通用 JSON 编辑框。

复杂领域配置不应硬塞进 Connection JSON。例如：

- Legado 书源使用自己的书源模型；
- OPDS 使用自己的来源模型；
- 阅读设备使用设备模型；
- 本地批注使用批注模型。

Connection 只保存“如何连接插件”的信息，领域实体、列表、同步状态使用各自的业务表。

### 3.4 UI 元数据

`ui` 是产品呈现提示，不是业务协议。当前常用字段包括：

| 字段 | 用途 |
| --- | --- |
| `icon` | 通用图标名 |
| `brand_icon` | 本地品牌图标路径 |
| `configuration_mode` | `none`、`form` 或 `manager` |
| `manage_route` | 复杂配置页面路由 |
| `manage_dialog` | 受控的专用弹窗标识 |
| `primary_action` | 列表中的主要操作 |
| `hidden` | 不在普通插件目录展示 |
| `deprecated` | 标记已废弃能力 |
| `catalog_access` | 提供网络书库入口 |
| `service_toggle` | 是否展示全局服务开关 |
| `device_type` | 推送设备类型选择器 |
| `default_port` | 设备默认端口 |

原则：

- 外部服务优先使用官方图标，资源放在 `app/public/images/plugin-icons/`；
- 图标不得引用远程脚本或资源，单个文件控制在 200 KB 内；
- 插件自己的图片代理白名单由 Provider 声明，不得在公共 Handler 中写死域名；
- 已删除的 `manage_label_key` 不得重新引入；
- `primary_action` 只影响入口文案，不改变 Connection owner 或 Capability。

## 4. Provider：类型化实现

插件不继承一个万能基类，也不存在通用 `PluginProvider`。Provider 可以是普通 Python 对象；只要其方法满足 Protocol，并带有合法 `manifest` 即可。

接口定义位于 [`webserver/plugins/runtime/interfaces.py`](../webserver/plugins/runtime/interfaces.py)。

### 4.1 MetadataProvider

```python
class MetadataProvider(Protocol):
    def search_books(self, query: MetadataQuery, context: dict) -> list[BookMetadata]: ...
    def get_metadata(self, external_id: str, context: dict) -> BookMetadata | None: ...
    def get_cover(self, cover_url: str, context: dict) -> tuple[str, bytes] | None: ...
```

约束：

- `MetadataQuery` 保留 `title`、`isbn`、`publisher` 和 `authors`，不要压回一个模糊字符串；
- 候选按相关度降序；没有结果返回空列表；
- 每个来源最多向“从互联网同步书籍信息”返回 5 条候选；
- 候选只携带 `cover_url`，用户选用后再下载封面；
- 元数据插件默认无需配置时，不显示配置入口。

### 4.2 SourceProvider

`SourceProvider` 负责网络书库的搜索、浏览、详情与获取：

```python
class SourceProvider(Protocol):
    download_mode: Literal["single_book", "by_chapters", "none"]

    def search(self, query, cursor, context) -> Page[SourceBook]: ...
    def browse(self, category_id, cursor, context) -> Page[SourceBook]: ...
    def get_categories(self, context) -> list[Category]: ...
    def get_book(self, external_id, context) -> SourceBookDetail: ...
    def download(self, book, context) -> BookFile: ...
    def get_toc(self, book, context) -> list[SourceChapter]: ...
    def get_chapter(self, chapter, context) -> SourceContent: ...
    def self_check(self, context) -> CheckReport: ...
```

`download_mode` 必须在 Manifest 和 Provider 上一致：

- `single_book`：实现 `download()`；
- `by_chapters`：实现 `get_toc()` 与 `get_chapter()`；
- `none`：只提供外链或目录，不承诺下载。

一个书源插件可以额外声明 `metadata.lookup`，例如 Legado。此时同一个 Provider 同时满足 `SourceProvider` 和 `MetadataProvider`，不再创建一个名字含糊的“在线书源元数据”插件。

### 4.3 AnnotationProvider 与 ReviewProvider

```python
class AnnotationProvider(Protocol):
    def list_annotations(self, context) -> Page[Annotation]: ...
    def push_annotation(self, item, state, context) -> PushReceipt: ...

class ReviewProvider(Protocol):
    def get_reviews(self, query, context) -> Page[Review]: ...
```

本地 `Annotation` 是权威数据；外部平台记录是副本，使用来源状态关联。关闭微信读书、BRS 等外部插件，只应移除外部入口和同步能力，不应删除或隐藏 Talebook 的本地划线笔记能力。

批注的可见性规则：

- 默认视图：所有用户的公开批注，加当前用户自己的公开与私有批注；
- `public`：所有公开批注；
- `mine`：当前用户自己的公开与私有批注；
- 私有批注绝不推送给公共外部服务。

外部同步必须准确描述方向：

- 微信读书当前是导入，不是写回；
- BRS 可读取章评并追加推送，但不等同完整双向同步；
- 删除外部来源连接时，解除副本关联，不删除本地批注；
- 本地已编辑记录不得被一次重新导入静默覆盖。

### 4.4 TransformProvider

```python
class TransformProvider(Protocol):
    supported_formats: frozenset
    supports_auto_trigger: bool

    def preview(self, src: ToolInput, context) -> ToolReport: ...
    def apply(self, src: ToolInput, out_dir: str, context) -> ToolOutput: ...
```

书籍工具的长期入口在书籍详情页“书籍管理”菜单，由已启用 Capability 动态生成。插件中心只负责启停与全局策略；既有工作台可作为全局配置或兼容入口，但不要把手工执行当成插件中心的核心交互。

### 4.5 PushProvider

```python
class PushProvider(Protocol):
    default_port: int
    def push(self, book_file, target, context): ...
```

产品统一称为“发送到设备”。连接归用户所有，个人入口为 `/me/devices`。交互应先选择设备类型，再展示该类型所需字段：

- Kindle：邮箱等邮件推送信息；
- 局域网设备：IP、端口等网络信息。

设备类型列表必须从已启用的 `integrations.push` Provider 派生，不能在前端维护一份不一致的硬编码列表。

### 4.6 ExtraFeatureProvider

```python
class ExtraFeatureProvider(Protocol):
    def execute_feature(self, action, params, context) -> dict: ...
```

这是受控逃生舱，只用于尚未形成稳定标准接口、且确实属于复杂综合服务的额外能力。使用时必须在 `extra_features` 中为每个 action 声明：

- `mode`：`read`、`write` 或 `sync`；
- 参数 `schema`；
- `required_scopes`，并且这些 scope 已出现在 `permissions`。

如果多个插件重复出现同一种 action，应将其提升为标准 Capability 和类型化 Protocol，而不是继续扩张 `ExtraFeatureProvider`。

## 5. 生命周期与配置所有权

### 5.1 内置插件生命周期

Talebook 当前交付系统内置插件：

1. 服务启动时从 `ALL_BUILTIN_PROVIDERS` 物化插件定义和安装记录；
2. 第一次创建安装记录时读取 `initial_enabled(settings)`；
3. 管理员之后只执行启用或停用；
4. 版本升级同步 Manifest，但不重置管理员启停选择；
5. 停用插件后，Capability 不再参与发现与执行，Connection 和领域数据保留。

不在 Provider 上使用 `auto_install`。历史兼容的内部安装方法或 API 也不意味着产品要重新展示安装按钮。

### 5.2 全局配置与个人设置

产品入口按 owner 分工：

- `/admin/settings/plugins`：管理员启停插件，维护实例级策略和实例 Connection；
- `/me/plugins`：当前用户绑定账号或维护个人 Connection；
- `/me/devices`：用户维护发送设备；
- `/library/network`：消费已启用、已配置的网络书源；
- 书籍详情页：执行针对当前书籍的工具和发送能力。

文案只使用两种动作：

- **全局配置**：实例 owner 或全局业务模型；
- **个人设置**：用户 owner 或用户业务模型。

不要在普通用户界面使用“实例配置”“公开配置 JSON”等内部术语。

### 5.3 Connection 解析

运行时按 Capability 和当前用户解析连接：

- 未提供 `user_id`：只返回实例连接；
- 提供 `user_id`：返回实例连接与当前用户连接；
- 从不返回其他用户的连接；
- 只有插件已启用、Connection 可用且权限满足时，才参与执行。

若同一插件有多种角色，通过稳定的 `role` 区分，例如 `builtin`、`account` 或其他明确业务角色；不要用可编辑的连接名称代替 role。

### 5.4 健康状态

健康状态是观测结果，不是生命周期状态：

- `正常`：最近检查或调用成功；
- `异常`：最近检查或调用失败，应展示可操作原因；
- `未配置` / `需要绑定账号`：缺少必需 Connection；
- `未启用`：管理员关闭插件。

没有实现有意义测试协议的插件，不应显示一个虚假的通用“测试连接”按钮。测试能力必须按 Provider 接口构造真实、最小且无破坏性的请求。

## 6. 运行时执行规则

### 6.1 Context

运行时向 Provider 传入普通字典形式的上下文，包含本次 action、配置、密钥、游标、权限、目标外部 ID、截止时间和平台信息。Provider 不应自行读取全局数据库配置来绕过 Connection 解析。

严禁把数据库 `Session`、ORM 对象或请求对象传入后台线程。主线程读取并复制所需数据，Worker 只处理不可变领域值和普通字典，结果回到主线程后再持久化。

### 6.2 可靠性

平台统一提供：

- 有界线程池；
- 运行租约；
- 超时；
- 有界重试与退避；
- 运行日志和错误分类；
- 密钥脱敏。

Provider 应：

- 为外部 HTTP 使用平台安全客户端；
- 设置合理超时，不创建无界线程；
- 将鉴权失败、限流和一般上游错误映射为平台异常；
- 无结果返回空集合或 `None`，不要把“没有数据”当系统异常；
- 保持重试安全，写操作应使用外部 ID、幂等键或同步状态避免重复副作用。

### 6.3 外部访问安全

访问用户配置 URL 或第三方资源时，使用 [`webserver/plugins/runtime/safe_http.py`](../webserver/plugins/runtime/safe_http.py) 提供的安全能力，遵守：

- 禁止访问回环、链路本地、云元数据和未授权内网地址；
- 限制重定向、响应体大小和超时；
- 不记录 Authorization、Cookie、Token 等秘密；
- 图片代理 host 白名单由具体 Provider 提供；
- 返回内容按协议校验，不信任 MIME 或文件扩展名。

## 7. 产品与 API 接入

### 7.1 插件中心不是万能工作台

管理员插件中心只承担：

- 查看插件定义与健康状态；
- 启用 / 未启用；
- 配置全局策略；
- 进入必要的全局管理页；
- 查看执行记录与详情。

个人插件设置只列出确实需要用户账号或用户配置的插件。无需配置的元数据插件不出现配置框；复杂插件使用专用页面，不回退为通用 JSON 表单。

### 7.2 入口由 Capability 派生

前端和 Handler 不应硬编码具体插件名称来决定功能是否出现。正确关系是：

```text
enabled installation
  + matching capability
  + usable connection for current owner
  + domain-specific prerequisites
  = visible and executable product entry
```

例如：

- 书籍详情页工具菜单来自已启用的 `integrations.tool`；
- 元数据候选只来自已启用的 `metadata.lookup`；
- 网络书库只聚合已启用且可用的 `sources.*`；
- 设备类型只来自已启用的 `integrations.push`；
- 微信读书停用后不显示微信读书专属入口，但本地划线笔记仍存在。

### 7.3 通用 API 与专用 API

通用插件 API 适合 definition、activation、connection、run 和 manifest 这类平台对象。复杂插件的工作台可以提供专用 API，但必须遵守同一套认证、owner、启停与 Capability 规则。

不要为了一个插件新建只属于它的顶层 Handler 文件，再让公共 Handler 硬编码转发。优先将协议实现收进具体插件目录，由稳定的服务层或路由装配调用。

## 8. 最小可运行示例：元数据插件

下面示例展示一个无需配置、实例级、默认启用的内置元数据插件。它没有继承基类，也没有实现万能 `execute()`。

```python
from webserver.plugins.runtime import (
    BookMetadata,
    CheckReport,
    MetadataQuery,
    PROTOCOL_VERSION,
)


class HelloMetadataProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "talebook.meta.hello-books",
        "name": "Hello Books",
        "version": "1.0.0",
        "description": "演示类型化元数据契约。",
        "categories": ["metadata"],
        "capabilities": ["metadata.lookup"],
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "connection_owners": ["instance"],
        "permissions": [],
        "data_policy": {"stores_remote_data": False},
        "compatibility": {"talebook": ">=2.0.0"},
        "homepage": "https://example.invalid/hello-books",
        "license": "MIT",
        "ui": {
            "icon": "mdi-book-search-outline",
            "configuration_mode": "none",
            "primary_action": "details",
        },
    }

    @staticmethod
    def initial_enabled(_settings):
        return True

    def search_books(self, query, context):
        query = MetadataQuery.from_value(query)
        if query.is_empty():
            return []
        return [
            BookMetadata.from_dict(
                {
                    "provider_key": self.manifest["id"],
                    "provider_value": "hello-1",
                    "title": query.title,
                    "authors": list(query.authors),
                }
            )
        ]

    def get_metadata(self, external_id, context):
        if external_id != "hello-1":
            return None
        return BookMetadata.from_dict(
            {
                "provider_key": self.manifest["id"],
                "provider_value": external_id,
                "title": "Hello Talebook",
            }
        )

    def get_cover(self, cover_url, context):
        return None

    def self_check(self, context):
        return CheckReport(healthy=True, message="provider ready")


PROVIDER = HelloMetadataProvider()
```

在 [`webserver/plugins/register.py`](../webserver/plugins/register.py) 中导入并加入 `META_PROVIDERS`，然后至少验证 Manifest 与接口：

```python
from webserver.plugins.runtime import PluginManifest, contract_violations

manifest = PluginManifest.validate(PROVIDER.manifest)
assert contract_violations(PROVIDER, manifest) == []
```

真实插件还应为正常结果、空结果、上游失败、Schema、默认启用策略和产品入口补充测试。

## 9. 新增插件步骤

### 9.1 设计前

- [ ] 明确插件主类型与稳定 Plugin ID。
- [ ] 列出标准 Capability；确认是否真的需要 `ExtraFeatureProvider`。
- [ ] 明确配置属于实例、用户，还是独立业务模型。
- [ ] 明确外部数据是权威数据、缓存还是副本。
- [ ] 明确停用、断开连接、删除外部来源时的数据保留规则。
- [ ] 明确处理当前书籍的入口是否应位于书籍详情页。

### 9.2 实现

- [ ] 按 `{type}/{name}.py` 或 `{type}/{name}/` 建目录。
- [ ] 编写完整 Manifest，不添加未知字段。
- [ ] 实现每个 Capability 对应的完整 Protocol。
- [ ] 使用平台领域对象，不返回随意漂移的字典结构。
- [ ] 使用安全 HTTP 客户端、超时和明确错误分类。
- [ ] 密钥只进入 `auth_schema`，且 `writeOnly`、无默认值。
- [ ] 外部服务图标使用本地安全资源。
- [ ] 导出单例 `PROVIDER`，只在 `register.py` 装配一次。

### 9.3 测试

- [ ] `PluginManifest.validate()` 通过。
- [ ] `contract_violations()` 返回空列表。
- [ ] Provider 只进入一个主分组。
- [ ] 默认启用策略只影响首次物化。
- [ ] 停用后不再被 Capability 发现。
- [ ] 实例连接与用户连接不会串租户。
- [ ] 密钥不会进入日志、API 响应或运行结果。
- [ ] 空结果、超时、鉴权失败、限流和部分失败有测试。
- [ ] 专用业务表不会被通用 Connection JSON 重复存储。
- [ ] UI 入口由启用状态、Capability 与可用 Connection 共同决定。

建议先运行：

```bash
pytest tests/test_plugin_contract.py -q
pytest tests/test_plugin_runtime.py -q
pytest tests/test_plugins_api.py -q
```

涉及具体能力时再运行对应测试，例如元数据、书源、批注、工具或设备推送测试。提交前仍需遵循仓库根目录的完整检查要求。

## 10. 权威来源与演进规则

当文档与代码有差异时，按以下顺序核对并修正文档或实现：

1. [`webserver/plugins/runtime/protocol.py`](../webserver/plugins/runtime/protocol.py)：Manifest 和协议校验；
2. [`webserver/plugins/runtime/interfaces.py`](../webserver/plugins/runtime/interfaces.py)：Capability 与类型接口；
3. [`webserver/plugins/runtime/domains.py`](../webserver/plugins/runtime/domains.py)：跨插件领域对象；
4. [`webserver/services/plugin_runtime.py`](../webserver/services/plugin_runtime.py)：安装、连接和运行生命周期；
5. [`webserver/plugins/register.py`](../webserver/plugins/register.py)：内置插件装配；
6. [`tests/test_plugin_contract.py`](../tests/test_plugin_contract.py)：结构和契约守卫。

演进插件体系时遵守：

- 重复语义先收敛术语，再新增接口；
- 多个插件共享的稳定能力才进入 runtime；
- 具体服务实现始终留在具体插件目录；
- 不用 ID 重写、硬编码 Handler 或通用 JSON 框掩盖领域缺口；
- 破坏性协议变更必须提升 `protocol_version` 并提供显式迁移；
- 难以回退且带有明显取舍的架构决定，再记录为独立 ADR。
