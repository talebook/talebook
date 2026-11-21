# 条件阅读进度 v1

## 探测和读取

客户端可用原服务器的规范地址与 `GET /api/user/info` 返回的 `user.id` 绑定本机下载归属。已登录时，普通与 `?detail=1` 响应提供相同的 64 位小写十六进制字符串，重登或改昵称后保持，作用域为该 Talebook 用户库。未登录时省略该字段。条件进度协议使用下文探针返回的 `instance_id` 与 `account_id`。

请求使用 Talebook 现有登录会话（签名 Cookie 或服务器现有的 HTTP Basic 登录），路径基于当前服务器的公开地址和部署路径前缀。先请求 `GET /api/reading-progress/conditional`。仅当返回 `err: "ok"`、`protocol: "talebook.reading-progress.v1"`、非空实例和账号标识以及目标格式描述时，客户端才启用补传。旧服务器可能返回 404、HTML 或其他响应。遇到这些响应或以下错误，应保留本机队列。

`GET /api/book/{book_id}/progress/conditional/EPUB` 返回以下字段，路径中的格式不区分大小写。响应使用 `Cache-Control: private, no-store`。

| 字段 | 说明 |
| --- | --- |
| `instance_id` | 64 位小写十六进制。由 Talebook 用户库中持久化的随机值与 Calibre 库 UUID 导出。换主机名、端口或重启后保持，换用户库或 Calibre 库时改变。完整克隆两套数据库会保留实例身份。 |
| `account_id` | 64 位小写十六进制。由已验证账号的内部主键及创建时间导出，缺创建时间的旧账号使用用户名。账号标识应与实例一起使用。 |
| `book_id`, `format` | 目标实例的数字书号、规范化后的 `EPUB`。 |
| `file_version` | `sha256:<64 位小写十六进制>`。服务器对 Calibre 当前原始 EPUB 文件的全部字节计算。客户端验证实际打开的相同字节后，才可绑定精确位置。 |
| `current.progress_version` | 不透明的 64 位十六进制字符串。没有已保存进度时为显式 `null`，即使已存在收藏、书架或已读记录。 |
| `current.position` | 当前文件上经此协议保存的位置，形如 `{"kind":"epub_cfi","cfi":"epubcfi(/6/4!/4/2/2)","percentage":24.5}`，其余情况为 `null`。 |
| `current.source`, `current.preview_progress` | `empty`、`conditional`、`legacy` 或 `different_file`。后两种同时提供未绑定当前文件的旧进度对象，可用于只读参考。前两种的预览字段为 `null`。 |

账号和实例标识绑定重连目标。服务端每次根据会话重新解析当前账号，并检查登录、激活、在线阅读、书籍可见性和已配置的阅读人机验证。跨库使用时须独立探测、选择并校验目标。客户端仅在两边 EPUB 格式和字节指纹均匹配时使用精确 CFI。

## 条件保存与确认

对相同书籍路径发送 `POST`，`Content-Type: application/json`，请求体最多 8 KiB。

| 字段 | 说明 |
| --- | --- |
| `instance_id`, `account_id`, `file_version` | 绑定本机待同步记录的已验证身份和原始文件版本。 |
| `expected_progress_version` | 读取或冲突预览得到的版本，首次空记录必须显式传 `null`。遗漏字段会导致请求无效。 |
| `write_id` | 小写、带连字符的 UUID。作用域是实例和账号，同一作用域内跨书籍、格式及操作都应使用新 UUID。 |
| `operation` | `save` 保存本机位置，`keep` 确认保留服务器观察到的版本。 |
| `position` | 仅 `save` 提供。必须含 `kind: "epub_cfi"` 与 Readest 兼容的 EPUB CFI；可选 `percentage` 为 0 至 100 的有限数字，仅用于预览。服务端验证信封和 CFI 外层形状，阅读器负责生成和解析定位。 |

成功响应包含相同资源字段及 `receipt`，其中 `write_id` 对应这次操作，`progress_version` 是该操作产生或确认的版本，`replayed` 表示已有回执。重试时重发同一个 UUID 和相同请求值。客户端按回执的写入标识确认对应队列记录。重试响应中的 `current` 是服务器目前的快照，可以比回执更新。确认保留服务器位置会写回执，进度版本保持原样。

比较与写入使用 SQLite 同一个写事务。首次写入同样需要匹配预期版本。前进、回读和确认使用同一套比较规则。已提交回执在实例、账号、访问权限与文件版本仍有效时优先于进度版本比较。相同 UUID 对应不同书号、格式、操作、预期版本或位置时拒绝重放。冲突或校验失败时客户端可重新读取、展示两个位置，并在读者选择后用新 UUID 和当前版本再提交。

| `err` | 客户端处理 |
| --- | --- |
| `progress.version_conflict` | 响应含 `current`，可只读展示，确认时再次比较。 |
| `progress.file_version_changed` | 响应含服务端当前指纹及快照，要求重新核对版本。 |
| `progress.write_id_reused` | 保留待同步记录，检查写入标识与请求体的持久化。 |
| `progress.instance_mismatch`, `progress.account_mismatch` | 重新验证原实例或账号。 |
| `user.need_login`, `user.activation_required`, `user.no_permission`, `captcha.required` | 重新登录或恢复对应权限。人机验证的原 HTTP 403 保留。 |
| `params.book.invalid`, `progress.file_unavailable` | 书籍不可见、已删除、文件不存在或在检查过程中变化。重新读取前保留当地记录。 |
| `progress.unsupported`, `progress.unsupported_format`, `progress.unavailable` | 保留队列。运行环境、目标格式或存储需要重新探测。 |
| `params.invalid` | 请求字段、类型或大小不符合协议。 |

除 Talebook 公共中间件的错误外，应用错误沿用 HTTP 200 和 `err` 信封。实测示例见 [HTTP fixtures](reading-progress-v1.fixtures.json)。

## 升级与降级

- 使用现有 `server.py --syncdb` 通路创建 `reading_progress_identity` 和 `reading_progress_receipts`。旧 `reading_state` 表和旧接口的请求、响应格式保持兼容。当前版本写入仍对旧客户端可见。回滚旧二进制时保留两张附加表，旧客户端可继续读写。再次升级时用现存表恢复实例和回执。完整回滚备份也会恢复备份时的版本和回执。
- 所有已启用的新旧位置写入共用每账号每书一条进度行。写入时进度时间严格前进，版本从时间和原进度 JSON 得出，因此同位置旧写入也使已有条件版本失效。旧写入的文件归属未知，冲突预览保留该进度对象。
- 持久回执只存作用域、书号、请求摘要、结果版本与写入来源文件指纹。回执随数据库备份恢复。本协议未定义过期回收周期。
- 该版本在 SQLite 上启用。MySQL 保持旧接口，探测返回 `progress.unsupported`。
- PDF 和漫画适合经原始文件 SHA-256 核实后使用页面位置，漫画还需要页序契约。TXT 需要明确编码和字符位置定义。MOBI、AZW、AZW3 若使用转换 EPUB，需要核验实际打开的输出文件，原始输入指纹无法证明输出一致。以上路径在 v1 均使用旧在线保存或本机续读。跨格式、不同字节或无法核验时用来源进度作定位参考。
- 哈希在数据库写事务之前执行。提交在 Calibre 读锁内核对文件路径、文件身份与时间戳，防止应用内格式替换和删除与提交交错。直接修改书库文件的外部进程不共享该锁，管理员应通过 Calibre/Talebook 管理格式。
