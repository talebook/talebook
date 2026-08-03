# Apple Podcasts 私有有声书 RSS 调研

调研日期：2026-07-18

## 已确认的产品决策（覆盖调研推荐）

用户在 2026-07-18 明确要求：**每个 talebook 用户只有一个站点级私人 Podcast RSS；每本有声书作为一个 Season；每章 MP3 作为一个 Episode**。原因是用户必须能在 Apple Podcasts 中直接、精准地选择小说章节，不能依赖一个超长的整书合并 MP3。

因此实际方案采用：

- talebook 站点 = 一个私人 Podcast show；
- 已发布有声书 = 一个稳定 Season；
- 章节 MP3 = 一个可独立选择、下载和续播的 Episode；
- Episode 标题包含书名与章节名，并提供书籍封面；
- 默认列出用户有权访问的全部已发布有声书，允许用户按书隐藏；
- 使用 ETag、Last-Modified、gzip 和稳定 GUID 控制大 Feed 成本，并把超大馆藏真机验收列为发布门槛。

下文“一书一个 Episode”的内容是规范调研阶段的技术推荐与取舍证据，不再是最终产品决策。

## 结论摘要

talebook 可以把用户可访问的全部已发布有声书暴露为 Apple Podcasts 可“通过 URL 关注”的**每用户一个私人 RSS**。对两种编排的明确推荐是：**一本书一个 episode/item，合并该书逐章 MP3，并用 Podcasting 2.0 `podcast:chapters` 和 MP3 ID3 chapter marker 表示小说章节**。这样 Apple 中的节目就是“我的 talebook 有声书”，episode 列表就是书架，书名、封面和简介都落在 episode 一级；章节仍可在播放器内跳转。

私人订阅必须采用每用户独立的高强度随机 bearer token URL，并在 channel 中设置 `<itunes:block>Yes</itunes:block>`，避免进入 Apple 公共目录。Feed、封面、MP3 都必须能脱离 talebook 浏览器 Cookie 访问，因此媒体 URL 也要携带同一订阅权限域的不可猜 token。token 持有者等同于拥有该用户 podcast 书架的下载权限；这不是 DRM，无法阻止转发和离线复制。

Apple 明确说明：通过 URL 关注的节目不会进入 Apple Podcasts Analytics。Apple 客户端也没有向自托管服务器回传播放位置、真实收听时长、倍速或完成率的开放协议。talebook 能记录的只有 feed/封面/音频 HTTP 请求，并据此得到“订阅 URL 最近访问”“疑似开始播放/下载”“传输字节”“章节被请求”等近似指标；这些不得标成真实播放时长或完成率。

## 1. 分发模式与数据模型

### 目标：整个 talebook 站点作为每用户一个私人 feed

推荐映射：

| talebook | RSS / Apple Podcasts |
|---|---|
| 当前用户可访问的有声书书架 | 一个私人 `<channel>` / 一个 feed URL |
| 站点名称 | channel `<title>`，例如“张三的 talebook 有声书” |
| 一本已发布有声书 | 一个 `<item>` / episode |
| 书名、作者、简介、封面 | item `title`、`itunes:author`、`description`、`itunes:image` |
| 整书合并 MP3 | item `<enclosure>` |
| 小说章节 | `podcast:chapters` JSON + MP3 ID3 chapter marker |
| 书架新增一本书 | feed 新增一个 item |

### 两种编排比较

#### A. 每本书一个 season，每章一个 episode

做法：channel 是整个 talebook；每本书分配稳定数字 `itunes:season`；每章是 item，`itunes:episode` 是章序号。

优点：

- 直接复用逐章 MP3，不需要整书合并；单章生成、修订、重试和下载较轻。
- Apple 官方明确支持 serial show、数字 season 与 episode；serial 按顺序展示，每个 episode 都应带 season/episode number。Apple 还明确说明缺少 season 的条目会进入 Unknown Season，无法自动下载或进入 Up Next。[Apple episode 排序与 seasons](https://podcasters.apple.com/support/3143-how-to-set-the-order-of-podcast-episodes)

缺点：

- Apple 的 season 是数字分组，不是“一本书”实体；官方文档没有承诺可为 season 提供自定义书名、作者、简介和封面。一本书的书目元数据只能重复到每章 episode，用户看到的是数百/数千个章节而不是书架。
- Apple 默认显示最新 season，跨书导航依赖 season 选择器；season 数字一旦分配必须永久稳定，删除/插入书籍不能重排。
- feed item 数量等于所有书的章节总数，书库大时 XML、刷新和客户端列表都会膨胀。RSS 2.0 本身不限制 item 数量，但 Apple 官方没有给出私人 feed 的无限 item/无限 feed 大小保证，因此不能把“规范无上限”等价为“大 feed 已验证兼容”。[RSS 2.0 item 规则](https://cyber.harvard.edu/rss/rss.html)

#### B. 每本书一个 episode，章节作为 marker（推荐）

做法：每本书保留逐章 MP3 供 talebook/candle-reader 使用；发布到 podcast 时无重编码 concat 为一个 immutable 整书 MP3，并生成 `podcast:chapters` JSON，同时写入等价 ID3 chapter marker 作为兼容兜底。

优点：

- Apple episode 列表直接成为有声书书架；书名、封面、作者、简介、时长各自完整，不滥用 season 语义。
- Apple 明确支持三种章节来源：description 时间戳、RSS `podcast:chapters`、MP3/AAC 文件元数据；出版方提供的章节优先展示，已经发布后仍可更新。[Apple Chapters](https://podcasters.apple.com/support/5482-using-chapters-on-apple-podcasts)
- Apple 官方列出 RSS 音频支持 MP3/AAC，并要求 HEAD 与 byte range，从而支持流式播放和 seek。[Apple 音频要求](https://podcasters.apple.com/support/893-audio-requirements) [Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements)
- Feed item 数量等于书籍数量，刷新和书架浏览规模明显优于 A。

成本与风险：

- 一本几十小时的书会形成很大的 MP3；单章更新需要重新产出合并文件和新的 enclosure URL。应使用 ffmpeg stream-copy/concat，保留逐章源文件并把合并物视为可重建发布产物。
- Apple 官方当前没有公布 RSS episode 的最大时长、最大音频字节数或私人 feed 最大 item 数；只能说格式和 Range 能力受支持，不能声称任意超长文件都已被 Apple 保证。上线前必须用短篇、中篇和至少一部 30 小时级长篇在 iPhone/Mac 真机验证下载、seek、章节与断点恢复。
- Apple 推荐用较小文件，并指出 AAC/MP4 在同码率下更高效、seek 更准确；本项目当前坚持 MP3 时，必须使用合理的单声道码率并接受体积代价。[Apple 音频最佳实践](https://podcasters.apple.com/support/893-audio-requirements)

**明确推荐 B**。它符合“整个 talebook 是一个 podcast feed、一本书是书架条目”的用户心智。A 保留为未来可选兼容模式或超长书降级方案，不作为首版默认。首版可设置可配置的合并文件安全阈值；超过阈值时先提示管理员，而不是静默切换数据模型。

每个用户应拥有永久的 `feed_uuid`；每本逻辑有声书拥有永久的 `episode_uuid`。用户 token 不参与 GUID 生成，token 轮换后 episode 不会在 Apple 中重复。

### 版本选择

Feed 默认只代表该书的“当前已发布版本”。候选版本不进入 feed。发布新版本时：

- 相同逻辑书继续使用同一个 episode GUID；允许更新标题、描述、总时长、章节 marker 和 enclosure URL。
- 书架新增一本书生成新 GUID，并向 feed 添加一个 item。
- 书被拆分为不同独立作品、合并或语义上成为新作品时使用新 GUID。
- 不把 talebook 内部候选版本全部列成重复 episode；Apple 的规则与内容指南都强调避免重复内容和重复 GUID/enclosure。

## 2. Feed 与 item 字段

### XML 和命名空间

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:podcast="https://podcastindex.org/namespace/1.0">
```

Apple 要求 RSS 2.0、UTF-8 XML 声明和 iTunes/content 命名空间，且 XML tag 大小写敏感。[Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements) Podcasting 2.0 扩展使用 `https://podcastindex.org/namespace/1.0`。[Podcasting 2.0 namespace 规范](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md)

### channel 必需/实现时强制字段

talebook 生成器应强制输出：

- RSS 2.0 基础必需字段：`title`、`link`、`description`。[RSS 2.0 规范](https://cyber.harvard.edu/rss/rss.html)
- Apple 校验所需字段：`language`、`itunes:explicit`、`itunes:category`、`itunes:image`；至少一个有效 item 和可访问封面。Apple 的校验错误文档逐项列出 title、description、language、explicit、category，主要求文档要求 artwork 与至少一集。[Apple Feed 校验](https://podcasters.apple.com/support/829-validate-your-podcast) [Apple Podcast RSS 要求](https://podcasters.apple.com/support/823-podcast-requirements)
- 私人 feed：`<itunes:block>Yes</itunes:block>`，阻止 Apple 公共目录处理。[Apple 私人 RSS 分发说明](https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners)
- 书架内各书可任意选择，使用 `<itunes:type>episodic</itunes:type>` 或省略该默认值，不使用 serial。Apple 的 serial 语义是同一节目从第一集到最后一集连续收听，不适合把多本独立书强制成一条连续故事线。[Apple episode 排序](https://podcasters.apple.com/support/3143-how-to-set-the-order-of-podcast-episodes)
- 不输出 `<podcast:medium>audiobook</podcast:medium>`：该值描述“这个 feed 本身是一本有声书”，而目标 feed 是整个站点的多书书架。`audiobookL` 又要求只含 `remoteItem`，不能与普通 item 混用；因此首版保持默认 `podcast` medium 最符合规范。[Podcasting 2.0 medium 规范](https://podcasting2.org/docs/podcast-namespace/tags/medium)
- 稳定 feed 身份：`<podcast:guid>`；Podcasting 2.0 规定它是 UUIDv5 且迁移 feed URL 后保持不变。[Podcasting 2.0 feed GUID](https://podcasting2.org/docs/podcast-namespace/tags/guid)
- `generator`、`lastBuildDate`、`copyright` 建议输出；PSP 转述 Apple 的主机商格式要求包含 `generator` 与 ETag，并建议不再输出废弃的 `itunes:owner`、`itunes:keywords`、`itunes:order`。[Podcast Standards Project 会议记录](https://podstandards.org/2025/05/21/psp-members-meeting-london-podcast-show/)

`language` 使用用户/站点书架的主语言，例如中文 `zh-CN`，不要无条件默认英语；单个 feed 混合多语书籍时，RSS/Apple 没有 item 级语言字段可完整表达，应在书籍 description 中标注。AI 合成内容应在 channel 与 episode 元数据中清楚披露；Apple 内容指南要求使用合成语音的节目在节目和每一集中显著披露。[Apple 内容指南](https://podcasters.apple.com/support/891-content-and-subscription-guidelines)

### item 必需/推荐字段

每本书的 item 强制输出：

- `title`：书名。
- `description`：作者、书籍简介及“本书由 AI 合成语音生成”的披露；不要放整书版权正文。
- `enclosure`：每本书恰好一个整书合并 MP3，必须有唯一 `url`、真实字节数 `length` 和 MIME `type`。MP3 使用 `audio/mpeg`。Apple 会忽略重复 enclosure URL。[Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements) RSS 2.0 也规定 enclosure 的三个属性。[RSS 2.0 enclosure](https://cyber.harvard.edu/rss/rss.html)
- `guid isPermaLink="false"`：稳定、全局唯一、永不因标题、音频 URL 或元数据更新而变化的 UUID。Apple 要求每集 GUID；变更会造成重复集和统计错乱。[Apple 更换 Feed URL/GUID 说明](https://podcasters.apple.com/support/837-change-the-rss-feed-url)
- `pubDate`：RFC 2822 格式并含时区，例如 `Sat, 18 Jul 2026 12:30:00 +0800`；不要输出 ISO 8601。[Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements)
- `itunes:episodeType`：`full`。
- `itunes:episode`：对 episodic feed 并非必需；如输出，使用该用户 feed 内永久不复用、不重排的发布序号，不能用当前书架下标。
- `itunes:duration`：整书总秒数整数。
- `itunes:explicit`：显式给出 `true` 或 `false`。

`pubDate` 建议使用“该书首次发布进当前用户 feed 的时间”，而不是每次 feed 渲染时的当前时间；仅修订音频时保持原日期，避免客户端误认为新书。若产品希望让重制版重新出现在“最新”，应作为显式“重新发布为新条目”操作，并使用新的 episode GUID，而不是暗中改日期。

## 3. 章节方案

推荐模式中“每本书一个 episode”，因此小说章节必须作为 episode 内的 chapter marker。首版同时输出外部 `podcast:chapters` JSON 和 MP3 ID3 章节元数据，前者便于无重编码更新，后者作为客户端兼容兜底。

若一本小说章节内部确实有较长小节，可选输出：

```xml
<podcast:chapters
  url="https://host.example/p/.../chapter-12/chapters.json"
  type="application/json+chapters" />
```

Podcasting 2.0 规定该 tag 位于 item 下，`url` 和 `type` 必需；外部 JSON 可在不重写音频的情况下更新。[Podcasting 2.0 chapters](https://podcasting2.org/docs/podcast-namespace/tags/chapters) Apple 已明确支持 RSS 中的 `podcast:chapters`。[Apple Chapters](https://podcasters.apple.com/support/5482-using-chapters-on-apple-podcasts)

边界：

- 不把几秒或几十秒的每句对白作为 Podcast chapter。Apple 建议章节不少于 2 分钟、每小时不超过约 6 个、标题简短；句子级同步应继续留在 talebook/candle-reader 的私有同步清单中。[Apple Chapters 最佳实践](https://podcasters.apple.com/support/5482-using-chapters-on-apple-podcasts)
- 私人 URL feed 不会由 Apple 自动生成章节；若要在 Apple 中显示，必须自己提供 `podcast:chapters` 或在 MP3 ID3 中写章节。[Apple Chapters 私人 Feed 限制](https://podcasters.apple.com/support/5482-using-chapters-on-apple-podcasts)
- Apple 也不会为未进入公共目录的私人 feed 显示自动 transcript；talebook 的音文同步不能依赖 Apple transcript。[Apple Transcripts](https://podcasters.apple.com/support/5316-transcripts-on-apple-podcasts)

## 4. 私人 token Feed 与安全边界

Apple 明确允许用户在 iPhone/iPad/Mac 中“Follow a Show by URL”，也明确支持私人、个性化、密码保护或认证 feed；这与“提交 Apple 公共目录时 feed 必须公开可访问”是两种不同模式。[Apple 私人 RSS 分发说明](https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners) [Apple 公共目录 Feed 要求](https://podcasters.apple.com/support/823-podcast-requirements)

### 推荐 URL 设计

```text
https://talebook.example/podcast/v1/<opaque-token>/feed.xml
https://talebook.example/podcast/v1/<opaque-token>/site-cover.jpg
https://talebook.example/podcast/v1/<opaque-token>/books/<audiobook-id>/cover.jpg
https://talebook.example/podcast/v1/<opaque-token>/books/<audiobook-id>/<asset-version>.mp3
https://talebook.example/podcast/v1/<opaque-token>/books/<audiobook-id>/<asset-version>.chapters.json
```

实现要求：

- token 至少 128 bit CSPRNG，数据库只存 token 哈希；每用户签发一个 feed token，可独立撤销/重置。
- token 只授予该用户访问“当前仍有权限的已发布有声书”及其封面、章节 JSON 的权限；每次请求都重新校验用户/书籍可见性，不接受任意文件路径，不复用网页登录 session 或全站 API token。
- Apple/其他 podcast 客户端不会携带 talebook 浏览器 Cookie，因此 feed 内所有资源必须凭 URL token 独立授权。
- token 是 bearer secret。任何拿到 URL 的人都可下载；Apple 会在用户设备间同步该私人订阅和播放进度，意味着 token 会离开 talebook 控制边界。[Apple 私人 RSS 分发说明](https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners)
- UI 必须提示“链接可访问你在本站有权收听的全部有声书，请勿分享”，提供“复制 URL”“撤销”“重新生成”，并记录签发、最后使用和撤销时间。
- feed 和媒体响应使用 HTTPS；避免在应用日志、错误追踪、分析系统和 Referer 中记录完整 token。访问日志只存 token 对应的 subscription ID 或 token 前缀哈希。
- 私人响应建议 `Cache-Control: private, no-store`（feed）和 `Cache-Control: private`（媒体）。不能依赖缓存头防止 Apple 客户端下载/离线保存。
- 不建议短时效签名 enclosure URL：Podcast 客户端可能长期缓存 feed 和 episode URL，过期会让已关注节目突然失效。使用可撤销的稳定订阅 token；撤销后统一返回 401/403 或 404。

不要承诺 DRM、禁止复制或阻止账号共享。RSS enclosure 本质是可下载 URL；安全目标只能是不可猜、最小权限、可撤销、可审计。

## 5. HTTP、Range、重定向和缓存

### 必须支持

- HTTPS，证书来自受信任根 CA。Apple 对自管服务器强烈建议 SSL，Feed 校验示例也要求完整 HTTPS URL。[Apple 自管托管说明](https://podcasters.apple.com/support/826-find-a-hosting-solution) [Apple Feed 校验](https://podcasters.apple.com/support/829-validate-your-podcast)
- Feed、封面、MP3 支持 `HEAD`。
- MP3 支持单字节范围请求：请求 `Range: bytes=start-end` 返回 `206 Partial Content`、正确 `Content-Range`、`Content-Length`、`Accept-Ranges: bytes`；不可满足返回 `416`。Apple 明确要求 HEAD 和 byte-range，否则会出现“episodes hosted on a server that does not support byte-range requests”。[Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements) [Apple Feed 校验错误](https://podcasters.apple.com/support/829-validate-your-podcast)
- `enclosure length` 必须是完整 MP3 的真实字节数，即使当前响应是 206。
- ASCII 路径/文件名最稳妥；章节中文标题保留在 XML `<title>`，文件 URL 使用 ID/slug。Apple 要求 URL/文件名使用 ASCII 字符。[Apple Podcast RSS 技术要求](https://podcasters.apple.com/support/823-podcast-requirements)

### 缓存与更新

- Feed 输出稳定的强/弱 `ETag` 和 `Last-Modified`，处理 `If-None-Match` / `If-Modified-Since` 并返回 `304`。Apple 已宣布 feed crawler 接受这两个条件请求头，以减少无变化抓取。[Apple 托管方技术更新](https://podcasters.apple.com/4115-technical-updates-for-hosting-providers)
- Feed 内容发生书籍新增/删除、某书发布版本切换、章节清单或元数据变化时更新 ETag/Last-Modified；单纯统计访问不能改变它们。
- 整书 MP3 内容不可在同一 URL 下静默替换。新二进制使用新 immutable asset URL；书籍 item GUID 保持不变，feed 更新 enclosure URL、length、duration 和 chapters URL。这样避免 CDN/客户端缓存旧音频，同时不制造重复 episode。
- MP3 可使用长缓存和 immutable；私人 token 撤销仍必须在源站/CDN鉴权层生效，不能把私有媒体放到无鉴权永久公开 CDN URL。

### 重定向

- 正常媒体路径尽量直接 200/206，避免多跳或跨域鉴权丢失；如果使用 CDN，必须把 token/签名安全地带到最终 URL，并实际测试 HEAD、Range 与 redirect 后的 206。
- feed URL 迁移使用永久 `301`，新 feed 同时保留 `<itunes:new-feed-url>`；Apple 要求两者至少保留 4 周，且所有 episode GUID 不变。[Apple 更换 Feed URL](https://podcasters.apple.com/support/837-change-the-rss-feed-url)
- token 轮换不是 feed 迁移：旧 token 应在一个明确宽限期内 301 到新 token 或继续服务，之后撤销。直接永久 301 会把新秘密暴露在更多代理日志中，因此产品默认可选择“旧 URL 立即失效，用户重新添加”；若做无感迁移，必须把风险写进 UI。

## 6. 收听统计：能做什么，不能做什么

### Apple 不会回传的数据

通过私人 RSS URL 关注的节目：

- 不显示在 Apple Podcasts Analytics；Apple 官方明确写明 URL-followed shows 没有 Analytics。[Apple 私人 RSS 分发说明](https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners)
- “Listening via RSS”不显示在 Apple Podcasts Analytics。[Apple 使用 RSS URL 订阅说明](https://podcasters.apple.com/support/3993-subscribe-podcasts)
- Apple 可以在其设备间同步用户的播放进度，但没有向 feed 主机回传该进度的 RSS/HTTP 标准接口。[Apple 私人 RSS 分发说明](https://podcasters.apple.com/zh-cn/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners)

因此 talebook 无法从 Apple 外部客户端取得：准确播放位置、实际听了多少秒、暂停/快进、播放倍速、是否听完、跨设备最终进度。不能把 HTTP 下载量换算为“真实收听时长”或“完成率”。

### 服务端可观测的近似指标

每次 feed/media 请求可记录：

- subscription ID、book/version ID；
- 请求时间、方法、状态码；
- Range 起止、响应字节数、完整文件字节数；
- 归一化 User-Agent、粗粒度 IP/网络信息（遵守隐私设置与保留期）；
- ETag 命中、HEAD/GET、请求是否由同一 token 发起。

可以展示且要明确标“估算”的指标：

- 私人订阅链接数、活跃链接数、最近访问时间；
- feed 拉取次数/最近刷新；
- 书籍媒体请求次数、疑似独立下载/播放次数；
- 传输流量；
- “疑似完整下载”：在合理时间窗内，去重并合并 Range 后覆盖足够高比例的文件字节。

不能展示为事实的指标：

- 收听时长；
- 真实完成率；
- 当前播放进度；
- 独立听众人数（同一用户多设备、代理、预下载和自动下载会混淆）；
- 一次完整 GET 就代表听完。

产品统计应拆成两类：

1. talebook/candle-reader 第一方播放器：客户端显式上报播放 session、进度、累计前台播放秒数、完成事件，可以提供真实得多的收听统计。
2. Podcast RSS 外部客户端：只提供“RSS 传输统计（估算）”，永不与第一方真实播放统计混算。

## 7. Feed 更新、增量、删除与重发语义

### 增量发布

- 新生成并发布的一本书向用户 feed 追加一个 item、新 episode GUID、唯一整书 enclosure URL 和首次 `pubDate`。
- 一本书只有全部目标章节生成成功且合并 MP3、chapters JSON/ID3 marker 验证通过后才进入 podcast feed；候选版本和半成品不暴露。
- Feed 使用 episodic 语义，通常按 pubDate 展示最近新增书籍；不依靠 season/episode 把不同书强行串成一部连续作品。
- Apple 对目录 feed 的元数据更新通常在 24 小时内反映；私人直连客户端的刷新频率由客户端决定，talebook不能承诺即时。[Apple 更新元数据](https://podcasters.apple.com/support/832-podcast-metadata)

### 修订现有书籍

- 书目文案修订：相同 GUID，更新 title/description/episode art。
- 音频重制但仍是同一逻辑书：相同 GUID，重新合并并使用新的 immutable enclosure URL、length、duration、chapters URL；保留首次 pubDate。
- 语义上是新版本或希望作为新内容重新通知：新 GUID 和新 enclosure URL，并在标题/描述标明“重制版”；避免与旧 item 同时造成不必要重复。

### 删除与恢复

- 从 feed 移除一本书的 item 表示后续刷新不再列出，但已经被 Apple 客户端下载的整书 MP3 可能继续存在于用户设备；RSS 无远程擦除能力。
- 不立即物理删除旧 MP3。先将 item 从 feed 隐藏，保留一个可配置宽限期，避免已缓存 feed 的客户端马上 404；版权/安全紧急删除例外。
- 若恢复同一逻辑书，应恢复原 GUID；不要生成新 GUID，否则客户端通常会将它视为全新 episode。Apple 要求 GUID 永久稳定，变更会造成重复。[Apple GUID 说明](https://podcasters.apple.com/support/837-change-the-rss-feed-url)
- Apple 说明 RSS 创建的 episode 不能在 Apple Podcasts Connect 中恢复，必须由托管方通过 feed 使其重新可用，正说明 talebook 是该内容生命周期的权威来源。[Apple archive/restore](https://podcasters.apple.com/support/901-archive-or-restore-a-channel-podcast-or-episode)

### Feed/版本撤销

- 用户撤销私人订阅：token 失效，feed、cover、chapters JSON 和 MP3 全部拒绝访问。
- 单本书取消发布：从 feed 移除该 item；旧媒体可经过宽限期再返回 404/410，紧急版权撤销可立即 410。整个用户 feed 停用时才让 feed URL 返回 404/410。
- Feed URL 域名/路径迁移：301 + `itunes:new-feed-url` 至少 4 周，feed GUID 和所有 item GUID 保持不变。

## 8. 可直接进入 10xdev 方案的验收项

1. talebook 为每个用户生成一个站点级私人 RSS URL；支持复制、撤销、重置；channel 含 `itunes:block`。
2. 每本已发布有声书一个 item/episode；每书一个 immutable 合并 MP3 enclosure；小说章节同时使用 `podcast:chapters` JSON 和 MP3 ID3 marker；feed 使用 episodic 语义并保持稳定 feed/item GUID。
3. Feed 通过 XML/RSS 校验；所有 item 具备 title、description、episode art、enclosure(url/length/type)、GUID、RFC 2822 pubDate、duration、explicit。
4. MP3 MIME 为 `audio/mpeg`；feed/站点封面/书封面/整书 MP3/chapters JSON 可在无 talebook Cookie 环境凭 token 访问。
5. HEAD 正确；整书 MP3 的首段、中段、尾段和非法 Range 分别验证 206/Content-Range/416；enclosure length 与完整文件一致。
6. HTTPS 受信任；feed 支持 ETag、Last-Modified 和 304；合并 MP3 URL 内容不可变。
7. token 不以明文入库，不进入普通日志；权限限定为单用户可访问书架；书籍权限变更实时生效；撤销后所有资源同时失效。
8. 使用真实 Apple Podcasts iPhone/Mac “通过 URL 关注”验收：站点 feed 中一本书显示为一个 episode，显示书封面，整书播放/seek/断点正常，章节 marker 可见可跳转，新增书籍可刷新出现。
9. 统计 UI 将第一方“收听统计”与外部 RSS“传输统计（估算）”分开；不宣称 Apple 回传真实进度、时长或完成率。
10. 删除、恢复、整书音频重制、章节 marker 更新、feed 迁移测试验证 GUID 稳定、无重复 episode、宽限期后旧资源行为符合策略。
11. 用短篇、中篇和至少 30 小时长篇真机评测；记录合并耗时、MP3 字节数、Apple 首播等待、随机 seek、章节跳转、离线下载与 feed 刷新结果。Apple 未公布超长 episode/大 feed 的硬上限，未通过该评测不得把兼容性标为完成。

## 一手来源

- [Apple Podcast RSS feed requirements](https://podcasters.apple.com/support/823-podcast-requirements)
- [Apple: How Apple Podcasts distributes shows / private RSS](https://podcasters.apple.com/support/5108-how-apple-podcasts-distributes-your-shows-to-listeners)
- [Apple: Subscribe using an RSS feed URL](https://podcasters.apple.com/support/3993-subscribe-podcasts)
- [Apple: Validate your podcast RSS feed](https://podcasters.apple.com/support/829-validate-your-podcast)
- [Apple: RSS feed sample](https://help.apple.com/itc/podcasts_connect/en.lproj/itcbaf351599.html)
- [Apple: Audio requirements](https://podcasters.apple.com/support/893-audio-requirements)
- [Apple: Chapters](https://podcasters.apple.com/support/5482-using-chapters-on-apple-podcasts)
- [Apple: Technical updates for hosting providers](https://podcasters.apple.com/4115-technical-updates-for-hosting-providers)
- [Apple: Change the RSS feed URL](https://podcasters.apple.com/support/837-change-the-rss-feed-url)
- [RSS 2.0 Specification](https://cyber.harvard.edu/rss/rss.html)
- [Podcasting 2.0: medium](https://podcasting2.org/docs/podcast-namespace/tags/medium)
- [Podcasting 2.0: chapters](https://podcasting2.org/docs/podcast-namespace/tags/chapters)
- [Podcasting 2.0: feed GUID](https://podcasting2.org/docs/podcast-namespace/tags/guid)
- [Podcast Standards Project: RSS formatting notes](https://podstandards.org/2025/05/21/psp-members-meeting-london-podcast-show/)
