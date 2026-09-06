# Readest 宿主补丁

基线：`https://github.com/hehetoshang/readest-reader` 的 `a4fc84077ad4f4c490305961235086f25bd4da12`。

`0001-android-web-head.patch` 修复 TB-204：仅 Tauri Android 使用 asset 协议的 Range 初始化；Android 浏览器和其他 web 平台使用 HEAD，先建立 Moke 资源传输层的文件大小和 ETag 校验状态。补丁含 5 项平台分支/真实传输层回归测试，不关闭任何鉴权、来源、版本或字节校验。

在干净的固定上游检出中应用补丁（将下方补丁路径替换为 Talebook 检出的实际路径）：

```bash
git apply --check /path/to/talebook/scripts/readest/0001-android-web-head.patch
git apply /path/to/talebook/scripts/readest/0001-android-web-head.patch
git apply --check /path/to/talebook/scripts/readest/0002-online-range-performance.patch
git apply /path/to/talebook/scripts/readest/0002-online-range-performance.patch
npx --yes pnpm@11.1.1 install --frozen-lockfile
npx --yes pnpm@11.1.1 test
npx --yes pnpm@11.1.1 typecheck
NEXT_PUBLIC_APP_PLATFORM=web npx --yes pnpm@11.1.1 build
```

将仓库根目录的 `out/readest/` 同步到 Talebook 的 `app/public/readest/` ，保留 `TALEBOOK_SOURCE.json` 、许可证声明和清单中的宿主文件。可在 Talebook 根目录运行 `node scripts/readest/sync.mjs /path/to/readest-reader/out/readest` 。来源清单必须列出此补丁，并更新 reader.html 与所有带哈希的 chunk，不能直接手工替换压缩 JavaScript。

验收必须覆盖 Android 浏览器 UA、移动视口、真实后端与 Cookie 登录；首次资源请求必须是 HEAD，随后 GET Range 返回 206，且正文和翻页完成。只验证桌面或只检查服务器支持 Range 不足以覆盖本次故障。

原生 Android 范围探测保留且单测覆盖；未运行 Android 原生安装包。本补丁不解决远程明文 HTTP 缺少跨源隔离的问题。

## 在线阅读性能补丁

`0002-online-range-performance.patch` 在补丁 0001 后应用：在线文件按16 KiB块缓存、相邻缺失块最多合并128 KiB，重叠并发复用请求，大章节复用缓存，实例关闭阻止延迟响应回填；16 MiB LRU 上限，不持久化书籍字节。小hash探测不扩大到128 KiB。无受管理条目时跳过预hash，实际导入hash不变；在线嵌入不为不存在的书架下载缩略图，书内封面正常显示。补丁含12项新回归测试。

配套Nginx配置仅压缩公开的 `/readest/_next/static/` JS/CSS等资源，不压缩鉴权 EPUB Range。更新容器时必须同时带上静态产物和 SPA/SSR Nginx 配置。

验证命令（从 Talebook 根目录运行，先安装 app 依赖及 Playwright Chromium）：

```bash
node --test scripts/readest/sync.test.mjs scripts/readest/layout.test.cjs
READEST_BASE_URL=http://127.0.0.1:39211 node --test scripts/readest/http.test.mjs
# 通过安全环境注入 READEST_PASSWORD（勿写入仓库、命令历史或报告）
READEST_BASE_URL=http://127.0.0.1:39211 READEST_USERNAME=admin READEST_RESULT_PATH=./benchmark.json node scripts/readest/benchmark.cjs
```

基准依赖真实后端中书籍10（本任务的《西游记》，4,680,179字节），其他环境需先修改脚本书号；不创建书籍/账号。Android UA，412×915，Chromium，10 Mbps，附加延迟0/100 ms各3轮，冷开使用全新context；暖开是在同一context停留2秒后重新进入，不强制导航缓存命中。计时从进入 `/read/10?reader=readest` 到出现页码，目录/正文交互另行验证。结果包含资源时间线但不包含Cookie或密码。测量会正常记录阅读历史，不应用于不允许产生访问记录的书库。
