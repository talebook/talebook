# Audiobookshelf 对 Talebook 有声书能力的参考结论

> 调研日期：2026-07-18
> 范围：仅使用 Audiobookshelf 官方仓库、官方文档和官方 API。本文是 Talebook / candle-reader 的产品与技术设计输入，不主张复刻 Audiobookshelf。

## 一句话结论

Talebook 最值得借鉴的不是 Audiobookshelf 的“独立媒体服务器”架构，而是四个稳定模式：**面向个人的书架分区、同一书目下组合文字与音频、短生命周期播放会话加持久化个人进度、以章节为一级导航**。转换队列、逐句时间轴和音文同步是 Talebook + voicebook 自己的核心能力，Audiobookshelf 并未提供可直接照搬的逐句同步模型。

官方项目明确将“流式播放多种音频格式、多用户自定义权限、按用户跨设备同步进度、章节编辑”等列为核心能力：[官方仓库 README](https://github.com/advplyr/audiobookshelf#features)。

## 1. 导航与浏览

### 官方事实

- Web 端左侧 rail 以当前媒体库为作用域，包含首页、书库、系列、收藏、播放列表、作者、演播者、统计与问题项；管理入口按媒体类型和用户级别显示。[`SideRail.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/app/SideRail.vue)
- 首页不是普通分页列表，而是调用 `GET /api/libraries/:id/personalized` 返回多个 shelf；前端识别“继续收听/继续阅读”等分区，并通过 WebSocket 响应条目和用户进度变化。[`BookShelfCategorized.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/app/BookShelfCategorized.vue)、[个性化书架 API](https://api.audiobookshelf.org/#get-a-librarys-personalized-view)
- 全量书库支持分页、排序、过滤、精简对象和系列折叠；服务端还提供作者、类型、系列、演播者和语言等过滤数据。[书库条目 API](https://api.audiobookshelf.org/#get-a-librarys-items)、[过滤数据 API](https://api.audiobookshelf.org/#get-a-librarys-filter-data)
- Audiobookshelf 把 library 作为强边界：条目、系列、收藏和播放列表都属于单一 library，跨 library 移动不会自动迁移元数据与个人进度。[Library Overview](https://audiobookshelf.org/docs/documentation/libraries/common-content/overview/)

### 给 Talebook 的建议

- 左侧新增一级菜单“有声书”，首屏采用 shelf，而不是把所有音频平铺：
  1. 继续收听；
  2. 最近生成；
  3. 最近加入；
  4. 已完成；
  5. 按作者/分类的推荐分区。
- “有声书”是 Talebook 现有馆藏的一个媒体视图，不要复制出另一套作者、分类和书目主数据。筛选可复用现有书目字段，另加 `有声状态 / 演播音色 / 时长 / 生成时间`。
- 左侧第一期只保留“有声书”一级入口；系列、作者、演播者做页内筛选。Audiobookshelf 的多级 rail 是独立媒体服务器需求，对 Talebook 会造成导航重复。

## 2. 详情页与文字书关系

### 官方事实

- Audiobookshelf 允许一个 library item 同时包含电子书与音频；主电子书的阅读进度与有声书进度分别保存，详情页并列提供 Play 和 Read。[E-books 官方文档](https://audiobookshelf.org/docs/documentation/libraries/book-library/ebooks/)
- 详情页围绕同一个条目展示封面、标题/副标题、作者/系列、元数据、收听进度与剩余时间，并提供播放、阅读、加入队列、编辑、完成状态等动作。[`client/pages/item/_id/index.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/pages/item/_id/index.vue)
- Book 的完整对象包含 `metadata`、`audioFiles`、`chapters`；精简对象增加 `numTracks / numAudioFiles / numChapters / duration / size`，展开对象增加可播放 `tracks`。[Book API 对象](https://api.audiobookshelf.org/#book)
- 元数据包含标题、副标题、作者、演播者、系列、类型、出版信息、语言等；音轨包含 `index / startOffset / duration / title / contentUrl / mimeType`。[Book Metadata](https://api.audiobookshelf.org/#book-metadata)、[Audio Track](https://api.audiobookshelf.org/#audio-track)

### 给 Talebook 的建议

- 数据关系采用 `Book 1 -> N AudiobookEdition`：同一本文字书可以有多个有声版本（不同引擎、角色方案、音色映射或重新生成版本），但只能有一个“当前发布版本”。不要把生成结果伪装成第二本书。
- 文字书详情页在独立功能区显示：
  - 尚未生成：`生成有声书`；
  - 排队/生成中：状态、阶段、百分比、预计剩余、进入任务详情；
  - 已生成：`播放`、`重新生成`、`管理版本`、`删除有声版本`。
- 有声详情页应显示封面、作者、总时长、章节数、生成引擎、生成时间、角色数、声音方案、音频质量、文件大小和生成来源书；管理者还能查看脚本与失败章节。

## 3. 播放器、队列、章节与进度

### 官方事实

- 播放前由 `POST /api/items/:id/play` 创建 Playback Session，客户端上报设备、支持 MIME、是否强制直放/转码等信息；响应包含当前时间、音轨、章节与播放方式。[播放 API](https://api.audiobookshelf.org/#play-a-library-item-or-podcast-episode)、[`PlayerHandler.js`](https://github.com/advplyr/audiobookshelf/blob/master/client/players/PlayerHandler.js)
- Web 播放器提供播放/暂停、前后跳、倍速、音量、章节、书签、睡眠定时、全屏、队列以及快捷键；章节既显示为进度条刻度，也可以切换为“当前章节时间轴”。[`PlayerUi.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/player/PlayerUi.vue)、[`PlayerTrackBar.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/player/PlayerTrackBar.vue)
- 官方章节模型只有 `id / start / end / title`，单位为秒。[Book Chapter](https://api.audiobookshelf.org/#book-chapter)
- Web 客户端首次播放 20 秒后同步，此后约每 10 秒向 `POST /api/session/:id/sync` 上报 `currentTime` 与本周期 `timeListened`；关闭时再调用 `/close`。[`PlayerHandler.js`](https://github.com/advplyr/audiobookshelf/blob/master/client/players/PlayerHandler.js)、[Session Sync API](https://api.audiobookshelf.org/#sync-an-open-session)
- 用户持久进度包含 `duration / currentTime / isFinished / hideFromContinueListening / lastUpdate / startedAt / finishedAt`；个人进度可直接更新，也能驱动“继续收听”。[Media Progress](https://api.audiobookshelf.org/#media-progress)、[进度更新 API](https://api.audiobookshelf.org/#createupdate-media-progress)
- 临时播放队列在 Web 客户端状态中维护，支持增删、选中播放与自动播放下一项；持久 Playlist 则是另一套、且属于单个用户和单个 library。[`QueueItemsModal.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/modals/player/QueueItemsModal.vue)、[Playlist API](https://api.audiobookshelf.org/#playlists)

### 给 Talebook / candle-reader 的建议

- 区分三类状态：
  1. `PlaybackSession`：一次设备播放，短生命周期；
  2. `UserAudiobookProgress`：跨设备持久进度；
  3. `PlayerQueue`：当前设备临时队列。第一期不必实现持久播放列表。
- Web 与 candle-reader 共用同一进度 API，建议播放中每 10 秒、暂停、seek、切后台和退出时同步；服务端记录 `position_ms / duration_ms / listened_delta_ms / device_id / updated_at`，并用服务端版本或 `updated_at` 处理跨设备覆盖。
- 第一版播放器必须有：播放/暂停、±15/30 秒、`x0.5–x3.0` 倍速、章节列表、当前/剩余时间、拖动、上一/下一章、睡眠定时、错误重试。书签和播放队列可随后补充。
- 一个章节对应一个 MP3 最适合现有 voicebook 输出；统一时间轴仍需保存每章的全书 `startOffset`，播放器跨文件时才能把位置稳定表达为 `chapter_id + offset_ms` 或 `absolute_position_ms`。

## 4. candle-reader 的音文同步：不能只用章节模型

### 官方事实与边界

- 官方章节只提供章节级 `start/end/title`；Audio Track 只提供文件级 `startOffset/duration/contentUrl`。两者都没有句子、段落或字词级时间信息。[Book Chapter](https://api.audiobookshelf.org/#book-chapter)、[Audio Track](https://api.audiobookshelf.org/#audio-track)
- Audiobookshelf 将电子书阅读位置（`ebookLocation / ebookProgress`）与音频位置（`currentTime`）存放在进度对象的不同字段，并在产品上明确说明两种进度独立。[`MediaProgress.js`](https://github.com/advplyr/audiobookshelf/blob/master/server/models/MediaProgress.js)、[E-books 官方文档](https://audiobookshelf.org/docs/documentation/libraries/book-library/ebooks/)

因此，Audiobookshelf **没有提供“音频时间 → EPUB 文本节点”同步方案**。Talebook 必须利用 voicebook 的生成过程额外产出时间轴 sidecar，而不是事后从 MP3 猜测。

建议的最小同步片段：

```json
{
  "chapter_id": "ch-001",
  "segment_id": "seg-00042",
  "start_ms": 123400,
  "end_ms": 128920,
  "text": "黛玉听了，不觉又喜又惊。",
  "locator": {
    "type": "epub-cfi",
    "start": "epubcfi(...) ",
    "end": "epubcfi(...)"
  }
}
```

- 以 voicebook script 的可朗读 segment 为高亮粒度；优先保存稳定 EPUB CFI，TXT 则保存规范化字符区间和文本指纹。
- candle-reader 根据当前 `audio.currentTime` 二分查找 segment，切换 `.active-speaking` 高亮并按用户设置自动滚动；用户点正文则 seek 到 `start_ms`。
- 高亮只依赖已发布有声版本自己的时间轴，版本切换必须同时切换对应映射；不要把映射写回 EPUB 原文。

## 5. 转换任务、扫描与管理

### 官方事实

- Audiobookshelf 扫描 library 是管理员操作，`POST /api/libraries/:id/scan` 支持普通/强制扫描。[扫描 API](https://api.audiobookshelf.org/#scan-a-librarys-folders)
- 前端把 `library-scan / library-match-all` 等后台动作统一建模为 Task，并按 `action + libraryItemId` 去重；Task 有 `id / action / data / title / description / error / isStarted / isFinished / isFailed / startedAt / finishedAt` 等字段。[`client/store/tasks.js`](https://github.com/advplyr/audiobookshelf/blob/master/client/store/tasks.js)、[`server/objects/Task.js`](https://github.com/advplyr/audiobookshelf/blob/master/server/objects/Task.js)
- 首页通过 socket 事件更新新增/变化的媒体条目，因此扫描和后台媒体操作结束后无需整页轮询。[`BookShelfCategorized.vue`](https://github.com/advplyr/audiobookshelf/blob/master/client/components/app/BookShelfCategorized.vue)

### 给 voicebook 转换队列的建议

- 只借鉴统一 Task 视图，不照搬其偏内存态任务对象。整本书 TTS 可能运行数小时，Talebook 必须持久化任务并在进程重启后明确恢复或失败。
- 建议任务状态：`queued -> inspecting -> awaiting_review(optional) -> generating -> packaging -> completed`，以及 `cancel_requested / cancelled / failed`。
- 任务必须保存：书目、提交者、voicebook script/配置快照、引擎、角色与音色映射、章节总数/完成数、当前章节、重试次数、输出版本、错误码/消息、创建/开始/结束时间。
- 去重键建议为 `book_id + config_hash + active(non-terminal)`；相同配置已有活跃任务时返回原任务。重试从失败章节开始，成功章节不可重复计费/生成。
- 管理页至少支持筛选、查看阶段与日志、取消、失败重试、提升/降低优先级、删除失败记录；普通用户只见自己的任务，管理员见全站任务。
- 实时进度可用现有 Talebook 推送能力；若没有可靠长连接，先用 3–5 秒轮询。数据库才是真实状态，推送只做界面刷新。

## 6. 权限与多用户边界

### 官方事实

- Audiobookshelf 的个人进度、书签、播放会话和播放列表属于用户；媒体库条目属于共享 library。[用户模型](https://github.com/advplyr/audiobookshelf/blob/master/server/models/User.js)、[Media Progress](https://api.audiobookshelf.org/#media-progress)
- 用户访问先经过 library 边界，再按 tag 与 explicit content 检查；写能力细分为 download/update/delete/upload 等。创建用户、查看所有用户/全站 session、强制扫描等管理动作有更高权限。[`User.js`](https://github.com/advplyr/audiobookshelf/blob/master/server/models/User.js)、[User Permissions API](https://api.audiobookshelf.org/#user-permissions)、[Sessions API](https://api.audiobookshelf.org/#get-all-listening-sessions)

### 给 Talebook 的建议

- 有声书媒体与发布版本属于共享馆藏；播放进度、倍速、书签、临时队列属于用户。
- 新增独立能力 `audiobook_generate`，不要直接复用“可编辑书目”：生成会消耗外部 API 配额和计算资源。建议：管理员默认允许；普通用户由站点开关/角色授权；访客禁止。
- 权限检查必须在提交任务、读取任务、下载音频、播放音频、删除版本五个端点分别执行；隐藏按钮不是权限控制。
- 任务中的密钥只引用服务端凭据 ID，配置快照不得包含 Qwen/Edge 等敏感令牌；错误日志对普通用户脱敏。

## 7. 不应照搬的复杂度

| Audiobookshelf 能力 | Talebook 第一阶段处理 |
| --- | --- |
| 独立多 library、文件夹扫描、缺失 inode 与目录约定 | 不照搬；Talebook 已有书目和文件生命周期 |
| Podcast、RSS、自动下载、节目队列 | 完全排除 |
| Direct Play / Direct Stream / HLS Transcode / Chromecast | 先只做 HTTP Range 的 MP3 直放 |
| M4B 合并、嵌入元数据、外部章节匹配 | 后续增强，不阻塞 MP3 分章节上线 |
| 收藏、持久播放列表、统计报表、公开分享 | 后续迭代 |
| 全套作者/系列/演播者独立页 | 复用 Talebook 主数据并先做筛选 |
| WebSocket 作为状态真相 | 不采用；任务表和进度表为真相，推送只是通知 |
| Audiobookshelf 的电子书阅读器 | 不采用；阅读与音文同步由 candle-reader 承担 |

## 8. 可直接进入方案设计的最小模型/API

### 核心模型

- `AudiobookEdition`：`id, book_id, status, engine, config_json, script_path, duration_ms, chapter_count, size_bytes, created_by, published_at`。
- `AudiobookChapter`：`id, edition_id, source_chapter_id, index, title, audio_path, duration_ms, absolute_start_ms`。
- `AudiobookSegment`：`chapter_id, index, start_ms, end_ms, text, locator_json, speaker, voice`。
- `AudiobookJob`：持久任务与队列字段。
- `UserAudiobookProgress`：`user_id, edition_id, chapter_id, offset_ms, absolute_position_ms, duration_ms, is_finished, device_id, version, updated_at`。
- `PlaybackSession`：`id, user_id, edition_id, device_id, started_position_ms, current_position_ms, listened_ms, opened_at, closed_at`。

### 面向 Web/candle-reader 的最小 API

- `GET /api/audiobooks/home`：个性化 shelves。
- `GET /api/audiobooks`、`GET /api/audiobooks/:edition_id`。
- `POST /api/books/:book_id/audiobook-jobs`：提交生成。
- `GET /api/audiobook-jobs`、`GET/PATCH /api/audiobook-jobs/:id`：查询、取消、重试、优先级。
- `POST /api/audiobooks/:edition_id/playback-sessions`。
- `POST /api/playback-sessions/:id/sync`、`POST /api/playback-sessions/:id/close`。
- `GET /api/audiobooks/:edition_id/chapters/:chapter_id/timeline`：返回音文同步片段。
- 音频 URL 支持鉴权与 HTTP Range；timeline 与音频版本必须通过 edition ID 强绑定。

## 9. 设计验收检查

- 有声书首页是否优先呈现“继续收听”，而非仅有全量列表？
- 文字书与有声版本是否共享书目身份，同时允许多个生成版本？
- 转换任务是否持久化、可取消/重试、可跨重启解释状态？
- 普通用户是否只能看到自己的任务和自己的进度？
- candle-reader 是否使用 voicebook 产出的 segment 时间轴，而不是只靠章节或文本模糊匹配？
- 播放进度是否能在 Web 与 candle-reader 间恢复，并处理并发设备更新？
- 第一阶段是否主动排除了 Podcast、转码、RSS、M4B、Chromecast 等非目标复杂度？
