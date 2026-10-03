# 在 Talebook 阅读 Venera 漫画源

管理员在「书库浏览 → 网络书库」点击「配置漫画源」，打开 **Venera 漫画源**插件，启用插件，在「全局配置」保存 MangaDex 连接，再执行「测试连接」。读者登录后即可在网络书库选择此源，浏览最新、热门和最近更新，或搜索漫画；打开详情、选择章节后使用本站现有漫画阅读器翻页，退出返回详情。

公开阅读无需 MangaDex 账号。配置支持标题语言、原图或压缩图、搜索内容分级及连接超时。默认搜索 safe 内容；浏览分类沿用官方源的行为，不作为内容分级过滤。默认超时 20 秒，网络较慢时可调至 60 秒。未启用、连接不兼容、网络失败或权限不足会显示错误；详情和阅读器提供重试。

## 接入机制与兼容范围

Venera 的源是客户端 JavaScript 扩展。官方无头模式没有可直接对接的漫画 HTTP 服务。本插件运行已验证的官方源脚本，通过受限宿主 API 将结果映射到 Talebook 的 SourceProvider。

- 首版仅支持官方 **MangaDex v1.2.0**，固定配置提交 `d8a71168a83a6797482a5be9c000989dabf21c08`，SHA-256 为 `c8beb84262da8fa3922ff0392fc2f79f03ee36ae08933d10571172ef6c8ce21d`。首次使用从 GitHub 获取并校验脚本，缓存在服务进程内，重启后重新获取。
- 服务器需要访问 GitHub API、`api.mangadex.org`、`uploads.mangadex.org` 与公共 `*.mangadex.network` 图片节点。仅允许 HTTPS 443、公共 IP 和指定图片路径；不跟随重定向。特殊端口、需额外令牌路径的节点会明确拒绝。
- 章节保留官方脚本的卷、翻译语言及条目顺序；页面保留源返回的顺序。单次源操作至多 40 次请求，章节至多 1,000 页；源结果、上游响应、执行时间和内存均有限制。超大目录可能超出兼容范围。
- 插件执行需要支持 Linux resource 限制的部署及项目已有 QuickJS 依赖。源脚本运行在独立 QuickJS 进程中。宿主不传入本站账号或凭据，不暴露文件、环境变量或 Python 回调；源网络会话不继承环境代理、认证头或 cookie。
- 封面和页面使用同站代理，凭证绑定当前读者与源，有效期 15 分钟。每次读取重新检查登录、账号激活、阅读权限、源是否启用及连接 scopes。权限撤销后停止新请求，已显示的图片不会从屏幕消失。停留较久出现图片失败时，可点击「重新加载章节」更新凭证。
- 在线漫画不保存到本地书库，也不持久保存阅读进度。论坛 WebView 登录、收藏、评论、DRM 图片变换及其他 Venera 源尚未支持；不提供任意脚本上传。

这是 Talebook 接收 Venera 源的能力。旧 PR [#1073](https://github.com/talebook/talebook/pull/1073) 的客户端导出方向已关闭、未合并。

## 验证与复验

`tests/test_venera_source.py` 覆盖异步宿主、分页、分组顺序、隔离与网络限制；`tests/test_network_comic.py` 覆盖真实插件运行时、页面接口及图片权限。前端状态测试位于 `app/test/e2e/venera.spec.ts`，按现有 Playwright/mock-server 流程运行。

实际源的浏览器验证使用临时 Calibre 书库、真实 Talebook 后端与真实 Nuxt 页面，没有替换书源 API。工具生成随机临时管理员和启用的 MangaDex 连接，不会修改生产书库：

```sh
# 在具备 Calibre、项目 Python 依赖的环境，从仓库根目录启动临时后端。
python3 scripts/venera_live_server.py --access-file .local-e2e/access.json
# 另一个终端启动前端；需当前 Nuxt 支持的 Node 版本。
cd app
API_URL=http://127.0.0.1:8080 npm run dev -- --port 3000 --host 127.0.0.1
# 安装 Playwright Chromium 后，在 app 目录验证。
node test/venera-live.mjs ../.local-e2e/access.json ../document/screenshots/tb-236
```

可用 `CHROMIUM_EXECUTABLE` 指定已有浏览器，`PLAYWRIGHT_BASE_URL` 指定预览地址。访问文件及浏览器认证文件含临时凭据，应保存在私有工作目录并在验证后删除，不要提交。验证结束停止上述进程。

实际记录见同目录 [`screenshots/tb-236/live-report.json`](screenshots/tb-236/live-report.json) 与截图。上游内容、目录和图片节点会随时间变化，报告记录的是验证时的结果。

机制依据：[Venera 源文档](https://github.com/venera-app/venera/blob/master/doc/comic_source.md)、[固定版本 MangaDex 脚本](https://github.com/venera-app/venera-configs/blob/d8a71168a83a6797482a5be9c000989dabf21c08/manga_dex.js)。
