# Venera

## 1. 定义

Venera 漫画源插件让读者在 Talebook 在线书库中浏览并阅读受支持的 Venera 在线漫画源。它执行固定版本的源脚本，把漫画、章节与页面接入本站的书源和漫画阅读流程。

**不是什么：**不是 Venera 客户端连接 Talebook 的导出插件；不是全部 Venera 脚本的兼容宿主；不提供论坛登录、收藏、评论或漫画下载入库。

## 2. 使用场景

- 管理员从在线书库进入漫画源配置，启用 MangaDex 并测试连接。
- 读者搜索漫画，查看简介与章节，在本站直接翻页。
- 源不可访问时，读者查看错误提示并重试。

## 3. 功能

- 支持固定版本的官方 MangaDex 源，公开阅读无需源账号。
- 支持最新、热门与最近更新的分页浏览，以及按内容分级搜索。
- 查看漫画详情、按卷和翻译语言分组的章节列表。
- 在现有漫画阅读器中按源返回的页序阅读原图或压缩图。
- 使用同站受保护的封面和页面地址。

## 4. 术语与界面用词

### 术语表

| 标准用词 | 英文 | 含义 | 示例 |
|---|---|---|---|
| 漫画源 | comic source | 提供在线漫画及章节的来源 | 在在线书库选择 MangaDex |
| 源脚本 | source script | 描述源查询和章节加载行为的扩展 | 固定版本的 MangaDex Venera 脚本 |
| 章节分组 | chapter group | 源定义的卷和翻译版本 | Volume 1 - EN 下的第 2 话 |
| 页面 | page | 章节中的一张顺序图片 | 翻到当前章节的第二张图片 |

| 界面用词 | 位置 | 行为 |
|---|---|---|
| 配置漫画源 | 在线书库工具栏 | 打开 Venera 插件配置 |
| 在线阅读 | 漫画详情 | 打开首章 |
| 重试 | 漫画阅读错误页 | 重新获取章节页面 |

## 5. 行为逻辑

管理员启用插件、保存实例连接并测试后，所有已登录读者可在在线书库使用该源。公开阅读不请求源账号，不支持论坛 WebView 认证。

源脚本固定版本并校验摘要，不自动追随上游更新。脚本在独立受限环境内执行，只有宿主可以发起允许的公共 HTTPS 请求。脚本无法访问本站账号、文件或环境变量。

章节按源返回的卷、翻译语言与条目顺序展开，页面严格保持源返回的顺序。浏览使用一基页码；搜索和章节有请求与大小上限，超出范围明确报错。

图片需要当前登录与阅读权限，访问凭证绑定读者和源并短期有效。源关闭或登录失效后停止读取图片。源访问被拒绝、网络超时、接口不兼容与空章节有明确反馈。

在线漫画不产生本地书籍或持久阅读进度；读者从详情选择章节，退出阅读返回详情。其他源、DRM 变换、非标准图片节点端口与需额外宿主 API 的脚本不在兼容范围。

## 6. 关联实体

- [网络书库](../网络书库.md)：浏览、搜索及详情入口。
- [插件平台](插件平台.md)：管理员配置、连接与权限。
- [阅读器](../阅读器.md)：共享漫画阅读能力。

## 7. 实现对照

### 7.1 数据存储

| 概念 | 存储 | 说明 |
|---|---|---|
| 配置与连接 | `plugin_installations` / `plugin_connections` | 固定源预设、语言、质量与超时 |
| 源脚本缓存 | 进程内存 | 固定提交与 SHA-256；重启后重新获取 |

### 7.2 API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/book-sources` | 来源目录 |
| GET | `/api/book-sources/browse` | 分页浏览 |
| GET | `/api/book-sources/book` | 漫画详情 |
| GET | `/api/book-sources/toc` | 章节列表 |
| GET | `/api/book-sources/comic/pages` | 登录保护的顺序页面列表 |
| GET | `/api/book-sources/comic/image` | 短期用户绑定的图片代理 |
| GET | `/read-online-comic` | 现有漫画阅读器宿主页 |

### 7.3 关键定义

| 符号 | 值 | 含义 |
|---|---|---|
| 插件 ID | `talebook.source.venera` | Venera 漫画源适配 |
| 源预设 | `MangaDex` | 固定版本的 MangaDex 脚本 |
| 能力 | `sources.search` / `sources.browse` | 复用 SourceProvider |
| 获取模式 | `none` | 只支持在线阅读 |

### 7.4 代码落点

| 行为 | 文件 |
|---|---|
| 源适配与网络策略 | `webserver/plugins/source/venera.py` |
| JS 宿主与隔离进程 | `webserver/plugins/source/venera_host.js` / `webserver/plugins/source/venera_worker.py` |
| 漫画页面与图片接口 | `webserver/handlers/network_comic.py` |
| 阅读器宿主 | `webserver/resources/book/online-comic-reader.html` |
| 在线书库与详情 | `app/pages/library/network.vue` / `app/pages/network/book.vue` |

### 7.5 界面文案

| i18n 分组 | 覆盖 |
|---|---|
| `network.*` | 配置入口与在线阅读 |
