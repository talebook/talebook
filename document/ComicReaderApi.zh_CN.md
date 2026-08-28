# 漫画阅读器接入契约

Talebook 后端直接处理 `/read-comic/:bookId`，渲染 `webserver/resources/book/comic-reader.html` 并通过本契约驱动独立的 `komga-reader`。Reader 只接触页面 manifest、同源图片 URL 和阅读进度；它不会读取 Calibre 路径、Talebook 数据库、可下载归档或归档条目名。

## 前端分发

Reader 沿用 Candle Reader 的静态 JavaScript 模式，不作为 Talebook 的 npm 依赖参与 Nuxt/Docker 安装：

- 上游 `komga-reader` 构建自包含的 ESM、UMD 和 CSS；浏览器 bundle 内含隔离的 Vue runtime，不依赖全局 `Vue`、裸模块解析或 CDN；
- Talebook 将不可变上游 commit 的产物、许可证和版本记录固定在 `app/public/static/komga-reader/`；
- `/read-comic/:bookId` 是 Tornado 路由，由后端先完成登录、权限、书籍媒体类型和容器选择校验，再渲染轻量 HTML host；Nginx 的 dev、SPA 和 SSR 配置均将该路径直接转发给 Tornado；
- 后端模板从同源版本 URL 动态加载 ESM，并在刷新或离页时调用 `destroy()`；Nuxt 中不存在 `app/pages/read-comic` 页面，也不承担 Reader 生命周期或 API 适配；
- 当前固定版本见仓库根目录 `komga-reader-version.txt`，后端版本常量与静态模块 URL 使用相同值完成缓存失效。

这种分发变化不改变下述 API、安全预算或进度格式。首次上游 GitHub release 产生后，可再接入与 Candle Reader 相同的 release/dispatch 自动更新流程；本阶段不发布 npm 或 release。

## 权限和支持范围

manifest 与进度接口要求登录。页面图片通常也接受登录 Cookie/Basic Auth；此外，manifest 会为每一页签发一个限时、页级别的访问凭证，供无法给图片下载单独附加认证头的受信客户端使用。对应账号仍必须：

1. 有在线阅读权限并已激活；
2. 能查看目标书籍（私有书只允许所有者和管理员）；
3. 目标书的 `media_type` 为 `comic`；
4. 至少含一个 CBZ、图片 ZIP、CBR 或图片 RAR 容器。

容器优先级为 CBZ、ZIP、CBR、RAR。漫画型 EPUB 不使用本契约，继续进入现有 EPUB 阅读器。

## 页面 manifest

```http
GET /api/book/:bookId/comic/pages
```

成功响应：

```json
{
  "err": "ok",
  "contract_version": 1,
  "book_id": 42,
  "title": "示例漫画",
  "format": "CBZ",
  "revision": "9f6b69e617ec75d870c4",
  "pages_count": 2,
  "pages": [
    {
      "id": "9f6b69e617ec75d870c4:0",
      "index": 0,
      "url": "/api/book/42/comic/pages/0?revision=9f6b69e617ec75d870c4&token=<signed-page-token>",
      "width": 1200,
      "height": 1800,
      "mime_type": "image/jpeg"
    }
  ]
}
```

`index` 是自然排序后的连续零基序号。`id` 在同一容器修订内稳定，适合保存进度；客户端仍应保存 `pageIndex` 作为修订变化后的回退。`revision` 是不包含路径信息的内容目录摘要。

逻辑错误沿用 Talebook JSON 信封，HTTP 状态为 200；客户端必须检查 `err`。稳定错误码包括：

- `user.need_login`；
- `comic.book_not_found`；
- `comic.no_permission` / `comic.account_inactive`；
- `comic.media_type` / `comic.container_missing`；
- `comic.invalid_container` / `comic.empty`；
- `comic.page_size` / `comic.page_type` / `comic.page_dimensions` / `comic.page_corrupt`；
- `comic.busy`。

错误消息不会包含本地文件路径或归档条目名。

## 页面图片

```http
GET /api/book/:bookId/comic/pages/:index?revision=:revision&token=:signedPageToken
```

客户端只能提交数字页序、manifest 返回的不透明修订和原样返回的 `token`。服务端通过私有索引解析真实条目，并在每次响应前复核 MIME、字节数和图片完整性。

页面 token 由服务端 `cookie_secret` 签名，有效期 1 天，并同时绑定签发用户、书籍、页序和归档修订；不能换页、换书或修改修订后复用。请求若已携带有效登录态，可不依赖 token。token 过期、篡改、用户被删除，或用户后来失去阅读/私有书访问权限时，接口返回 401/403/404，不会继续输出图片。该机制用于 Rulia 等插件运行时：插件可以用用户配置中的账号密码获取 manifest，而图片加载器无需再次暴露账号密码。

成功响应设置：

```text
Content-Type: image/*
Content-Length: ...
Cache-Control: private, max-age=3600, immutable
Vary: Cookie
X-Content-Type-Options: nosniff
```

协议错误使用稳定 HTTP 状态：401 未登录、403 无阅读权限、404 书籍/页序不存在、409 manifest 已更新、422 容器或页面无效、503 并发繁忙。响应正文只含可展示的简短说明。

## 漫画进度

```http
GET  /api/book/:bookId/comic/progress
POST /api/book/:bookId/comic/progress
Content-Type: application/json
```

POST 请求：

```json
{
  "progress": {
    "kind": "comic",
    "version": 1,
    "pageId": "9f6b69e617ec75d870c4:0",
    "pageIndex": 0,
    "percent": 50,
    "completed": false
  }
}
```

服务端要求 `pageId` 与当前 manifest 的 `pageIndex` 一致，并根据当前总页数重新计算 `percent` 和 `completed`。陈旧页面 ID 返回 `comic.progress_stale`，非法或超过 2 KiB 的负载返回 `comic.progress_invalid`。数据复用 Talebook 的 `ReadingState.progress` 列，但契约与通用 EPUB/其他阅读器相互独立。

## 安全与资源预算

导入与读取都会校验容器。当前边界：

- 最多 10,000 个归档条目；
- 归档展开后最多 512 MiB、单条目导入检查最多 128 MiB、压缩比最多 200；
- 在线阅读单页最多 32 MiB；
- 页面访问 token 最长有效 1 天，按用户、书籍、页序和归档修订隔离，不包含账号密码；
- 图片单边最多 32,768 像素且最多 100,000,000 像素；
- 最多 4 个并发归档读取，单归档串行读取，等待 5 秒后返回 503；
- 拒绝路径穿越、重复路径、符号链接、加密、分卷、ZIP64、签名/扩展不匹配和损坏页面；
- RAR4/RAR5 由 `rarfile` 建立目录，镜像内 `unar` 只负责解压选中的私有索引条目，不能绕过应用校验。

manifest 使用最多 32 个文件修订的进程内 LRU 缓存。文件元数据变化会重建私有索引；旧 `revision` 的图片请求会返回 409。
