# Talebook CLI 与 API 参考

本参考用于把用户意图路由到 `scripts/talebook-cli.py`。CLI 的 `--help` 是参数名称的最终依据；这里记录命令语义、Talebook 接口、权限与风险。

## 目录

- [连接与输出](#连接与输出)
- [风险等级](#风险等级)
- [me](#me)
- [books](#books)
- [audios](#audios)
- [remote](#remote)
- [admin](#admin)
- [错误处理](#错误处理)

## 连接与输出

全局语法：

```bash
python scripts/talebook-cli.py \
  [--site URL] [--user USER] [--password PASSWORD] [--timeout SECONDS] \
  <command...>
```

配置优先级：命令行参数高于环境变量。

| 参数 | 环境变量 | 规则 |
|---|---|---|
| `--site` | `TALEBOOK_URL` | 必填；没有 scheme 时补 `https://`；允许显式 HTTP；移除末尾斜杠。 |
| `--user` | `TALEBOOK_USERNAME` | 与密码成对可选；两者均省略时为 guest。 |
| `--password` | `TALEBOOK_PASSWORD` | 与用户名成对可选；优先使用环境变量，避免 shell 历史和进程列表泄露。 |
| `--timeout` | 无 | 单次 HTTP 超时，默认 30 秒。 |
| 无 | `TALEBOOK_NO_UPDATE_NOTIFIER` | 设置为 `1`、`true`、`yes` 或 `on` 时关闭更新提醒与对应的额外请求。 |

CLI 使用 HTTP Basic Auth，不持久化 Cookie。JSON 写入 stdout，错误 JSON 写入 stderr；下载内容以固定大小分块写入同目录临时文件，成功后才移动到目标路径，不把完整文件缓存在内存。

使用管理员凭据执行成功后，CLI 会尽力读取 `GET /api/admin/update` 的服务端缓存。存在新版本时，原成功 JSON 会附加 `_notice.update`，其中包含提示文案、当前版本、最新版本和可用的发布页。提醒检查失败不改变原命令结果；guest、普通用户和业务失败响应不附加提醒。Agent 应先完成当前任务，再简短报告提醒，不得据此自动升级实例。

退出码：

| 代码 | 含义 |
|---:|---|
| 0 | Talebook 返回成功。 |
| 2 | 参数、配置或本地文件错误。 |
| 3 | 需要登录、管理员权限或用户确认。 |
| 4 | DNS、连接、TLS、重定向或超时错误。 |
| 5 | Talebook 业务错误或响应格式错误。 |

## 风险等级

| 等级 | 行为 | 示例 |
|---|---|---|
| 只读 | 可直接执行。 | 搜索、详情、列表、状态。 |
| 常规写入 | 用户已明确要求即可执行。 | 上传、收藏、书架、阅读进度。 |
| 外部副作用 | 展示目标后确认，添加 `--confirmed`。 | 发送邮件、推送设备、测试邮件。 |
| 管理写入 | 展示字段或任务影响后确认，添加 `--confirmed`。 | 用户权限、设置、书源、主题。 |
| 破坏性 | 展示精确目标和数量后确认，添加 `--confirmed`。 | 删除、清空回收站、数据库迁移。 |

缺少确认时 CLI 只输出 `confirmation.required` 预览，不连接 Talebook。预览会隐藏密码及常见 secret/token/key 赋值。

## me

### `me status`

调用 `GET /api/user/info`。guest 也可使用。返回：

- 站点标题、版本和书籍统计；
- 当前用户是否登录、是否管理员；
- guest 阅读、下载和推送权限；
- 普通上传和分片上传阈值。

首次操作、身份变化或权限错误后优先运行此命令。

### `me update`

调用 `POST /api/user/update`，需要登录。支持昵称、Kindle 邮箱和密码修改。修改密码时同时提供当前密码与新密码；Talebook 服务端要求新密码满足自己的长度与格式规则。

### `me devices list|add|delete`

调用 `GET/POST /api/user/devices`，需要登录。服务端使用“整表替换”写入个人设备，设备没有独立 ID，因此 CLI 的删除参数是设备名称。添加同名设备会替换旧值。

设备字段：`name`、`type`、`ip`、`port`、`schema`、`mailbox`。Kindle 使用邮箱；其他设备使用 HTTP(S) 地址。删除需要确认。

## books

### 查询与文件

| 命令 | 接口 | 权限与说明 |
|---|---|---|
| `books list` | `GET /api/library` 等列表接口 | `--view` 支持 `library`、`recent`、`hot`、`favorites`、`shelf`、`reading`、`finished`、`private`；个人列表需要登录。 |
| `books search` | `GET /api/search` | guest 可用；使用 `--name`。 |
| `books show` | `GET /api/book/{id}` | 返回格式、权限和阅读状态。 |
| `books upload` | `POST /api/book/upload*` | 根据 `me status` 的服务端阈值自动选择普通或分片上传；服务端决定 guest 是否可上传。 |
| `books download` | `GET /api/book/{id}.{format}` | 先检查 guest 下载权限；拒绝把登录 HTML 当成电子书；默认不覆盖本地文件。 |
| `books edit` | `POST /api/book/{id}/edit` | 需要登录及书籍编辑权限；`--set KEY=VALUE` 修改元数据，`--cover` 上传封面。组合执行会先验证全部本地输入；后续步骤失败时返回 `partial: true` 及已完成步骤，不伪装成整体成功。 |
| `books delete` | `POST /api/book/{id}/delete` | 需要登录、所有权或管理员权限以及删除确认。 |

### 个人书库状态

| 命令 | 接口 | 说明 |
|---|---|---|
| `books favorite set|unset` | `POST /api/book/{id}/favorite` | 设置或取消收藏。 |
| `books shelf add|remove` | `POST /api/book/{id}/shelf` | 加入或移出书架。 |
| `books reading state` | `GET/POST /api/book/{id}/readstate` | 不传 `--value` 时读取；值为 `unread`、`reading` 或 `finished`。 |
| `books reading progress` | `GET/POST /api/book/{id}/progress` | 不传内容时读取；写入值必须是 JSON 对象，服务端限制约 8 KiB。 |
| `books reading stats` | `GET /api/reading/stats` | 查看在读、读完及月度统计。 |

### 外发

| 命令 | 接口 | 说明 |
|---|---|---|
| `books send device` | `POST /api/book/{id}/send_to_device` | Kindle 提供 `--mailbox`；其他设备提供类型和 URL。需要确认。 |
| `books send mail` | `POST /api/book/{id}/mailto` | Talebook 自动选择可发送格式。需要确认。 |

Talebook 可以由管理员开放 guest 推送，因此外发命令不强制本地登录预检；服务端仍会按实际设置判定。

## audios

本组命令只使用已发布有声书的稳定消费接口，不包含生成任务、脚本工作区、发布回滚、播放会话、Podcast、音色、统计或审计。

| 命令 | 接口 | 说明 |
|---|---|---|
| `audios list` | `GET /api/audios` | 列出当前身份可见的已发布有声书；`--keyword` 按书名或作者过滤。 |
| `audios show` | `GET /api/book/{book_id}/audios`、`GET /api/audio/{edition_id}` | 使用 `--book-id` 解析当前 published edition，返回书籍信息和按章节号排序的 manifest；不输出生成能力字段。 |
| `audios download` | 上述详情接口、`GET /media/audio/{edition_id}/chapter/{number}.mp3` | 使用 `--book-id` 把全部章节下载到 `--output` 指定的新目录。 |

`audios download` 将章节命名为 `001-章节标题.mp3`。文件名会替换路径分隔符、控制字符和常见跨平台保留字符；空标题使用章节号回退。输出目录已存在时命令在下载音频前失败，不提供覆盖参数。每章使用流式临时文件写入；整本先进入同级临时目录，全部章节成功后才把目录移动到目标路径，任一章节失败会清理临时内容。

列表、详情、manifest 和音频流均由服务端逐书校验查看权限。guest 可以下载公开且允许查看的有声书；private book 或不可见版本保持服务端的拒绝结果。成功输出包含 book ID、edition ID、绝对目录、章节数量、总字节数和逐章路径。

## remote

“remote”对应 Talebook 页面中的网络书库与 Legado 书源。整组命令都需要登录；网络书源接口使用
`/api/network/*`，已保存书籍列表使用 `/api/library/online`。

| 命令 | 接口 | 说明 |
|---|---|---|
| `remote sources list` | `GET /api/network/sources` | 列出当前启用且可供读者使用的书源。 |
| `remote search start` | `GET /api/network/search` | 参数包括关键词、页码、模式和可选书源 ID；返回异步任务 ID。 |
| `remote search status` | `GET /api/network/search/status` | 使用搜索任务 ID 读取部分结果和完成状态。 |
| `remote explore categories` | `GET /api/network/categories` | 读取指定书源的分类。 |
| `remote explore list` | `GET /api/network/explore` | 按分类 URL 和页码浏览远程书籍。 |
| `remote books show` | `GET /api/network/book` | 读取远程书籍信息。 |
| `remote books toc` | `GET /api/network/toc` | 读取目录与序列化状态。 |
| `remote books content` | `GET /api/network/content` | 读取指定章节内容。 |
| `remote books save` | `POST /api/network/save` | 保存为 TXT 或 EPUB。 |
| `remote books save-status` | `GET /api/network/save/status` | 按书源与书籍 URL 查询保存进度。 |
| `remote library list` | `GET /api/library/online` | 列出本地书库中来自远程书源的书籍，可按连载状态筛选。 |

远程搜索和保存是异步操作。启动成功后继续查询对应 `status`，不要把“已加入队列”报告成“已完成”。

## admin

所有 `admin` 命令先调用 `GET /api/user/info` 验证管理员身份。只读管理命令无需二次确认；任何管理写入均要求 `--confirmed`。

### 用户与书籍

| 命令 | 接口 | 风险 |
|---|---|---|
| `admin users list` | `GET /api/admin/users` | 只读。 |
| `admin users create` | `POST /api/admin/users` | 管理写入；密码参数为 `--new-password`，避免与登录密码混淆。 |
| `admin users update` | `POST /api/admin/users` | 管理写入；可修改启用、管理员和权限字符串。 |
| `admin users delete` | `POST /api/admin/users` | 破坏性；Talebook 要求同时提交 ID 与精确用户名。 |
| `admin users batch` | `POST /api/admin/users/batch` | 批量管理写入；单次服务端上限 500。 |
| `admin books list` | `GET /api/admin/book/list` | 只读。 |
| `admin books fill start|status` | `POST/GET /api/admin/book/fill` | 启动元数据补全需确认，状态只读。 |
| `admin books convert start|status` | `POST/GET /api/admin/book/kindleconvert` | 启动批量转换需确认，状态只读。 |
| `admin books delete` | `POST /api/admin/book/delete` | 破坏性批量删除。 |

### 扫描导入

| 命令 | 接口 | 风险 |
|---|---|---|
| `admin imports list` | `GET /api/admin/scan/list` | 只读。 |
| `admin imports scan start|status` | `/api/admin/scan/run`、`/status` | 启动扫描需确认。 |
| `admin imports run start|status` | `/api/admin/import/run`、`/status` | 启动入库需确认；`--delete-after` 会删除导入源文件。 |
| `admin imports delete` | `POST /api/admin/scan/delete` | 删除扫描记录，需确认。 |

### 网络书源

命令前缀为 `admin booksources`：

- `list`、`show`：查询摘要；当前后端没有独立详情 GET，`show` 按服务端总数逐页查找 ID，不受单页 200 条上限影响。
- `create --file`、`update`：使用 Legado 书源 JSON。
- `delete --ids`：删除一个或多个书源。
- `import --url|--file`、`seed`、`toggle`：导入、加载内置源或批量启停。
- `test`：执行搜索、详情、目录和章节样本测试，会访问第三方书源。
- `check start|status|clean-invalid`：全量有效性检查；当前 `clean-invalid` 是兼容入口，只触发检查，不会删除书源。

### OPDS

命令前缀为 `admin opds`：

- `browse --url`：浏览 OPDS 目录。
- `sources list|create|update|delete`：管理保存的 OPDS 源配置。
- `import start|status|failed|retry`：启动导入、查询进度、列出失败记录或重试。

`import start --books-file` 接受 JSON 数组；不提供时导入目录中的全部书籍。启动和重试均为异步管理写入。

### 系统

| 命令 | 接口 | 风险 |
|---|---|---|
| `admin settings show` | `GET /api/admin/settings` | 只读；CLI 在写入 stdout 前递归隐藏密码、secret、token、API key、访问码和 URL 凭据，普通配置保持可读。 |
| `admin settings update` | `POST /api/admin/settings` | 使用重复 `--set KEY=VALUE` 或 JSON 文件；管理写入。 |
| `admin settings test-mail` | `POST /api/admin/testmail` | 向 SMTP 账号发送测试邮件，需要确认。 |
| `admin settings test-db` | `POST /api/admin/testdb` | 测试数据库连接，需要确认。 |
| `admin settings migrate-db` | `POST /api/admin/migratedb` | 破坏性；`--force` 可能覆盖已有目标数据。 |
| `admin settings check-update` | `GET/POST /api/admin/update` | 默认读缓存；`--refresh` 触发联网检查。 |
| `admin trash size|clear` | `/api/admin/trash/*` | `clear` 清除 Calibre 回收站与上传临时目录，破坏性。 |
| `admin ssl update` | `POST /api/admin/ssl` | 上传证书与私钥并重载 Nginx；后端当前没有 SSL 查询接口。 |
| `admin themes list|active|activate` | `/api/themes*` | 激活或恢复默认主题会写设置并可能触发服务重启。 |
| `admin logs show|download` | `/api/admin/log*` | 只读；下载默认不覆盖已有文件。 |

## 错误处理

- `not_installed`：实例已启动但尚未初始化；打开站点根地址，在浏览器完成安装。
- 身份预检返回任何非成功业务错误时，CLI 立即停止，不继续请求受保护接口。
- `not_invited`：实例开启访问码；使用浏览器输入访问码。Basic Auth 登录用户会由服务端自动标记已访问。
- `captcha.invalid`：CLI 不处理验证码，切换浏览器。
- `user.need_login`、`auth.required`：提供登录凭据后重试。
- `permission.not_admin`、`permission`：报告当前身份和服务端要求，不尝试绕过。
- `confirmation.required`：把返回的命令、风险和参数预览给用户；确认后原命令增加 `--confirmed`。
- `task.running`：查询状态并等待，不重复启动任务。
- TLS 校验失败：报告证书问题；不要自动关闭证书验证。
