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

## 启动页预加载

`sync.mjs` 会从本次导出的 `reader.html` 自动刷新 `talebook-launch.html` 的 preload 区块。只选择同源、现存的两个小型 framework/main 入口脚本（各不超过256 KiB），以低优先级与权限校验并行下载；不执行 Reader，不请求 EPUB，不等待 preload 成功再跳转。升级时不要手写哈希路径。缺少符合条件的脚本时自然退化为原启动流程。

真实 A/B 实测中，最初预取7个大资源会争用连接，已舍弃。最终两个脚本均在 bootstrap 结束前下载完毕，跳转后命中缓存；总开书时间仅有小幅变化，不能宣称大幅提速。逐轮数据与限制见 `document/readest-preload-tb204.json` 。

```bash
node --test scripts/readest/preload.test.mjs scripts/readest/sync.test.mjs
READEST_BASE_URL=http://127.0.0.1:39211 node --test scripts/readest/preload-browser.test.cjs
# READEST_PASSWORD 由安全环境注入，两个地址必须连接相同书籍内容的真实后端
READEST_BASELINE_URL=http://127.0.0.1:39209 READEST_CANDIDATE_URL=http://127.0.0.1:39211 READEST_RESULT_PATH=./preload-results.json node scripts/readest/preload-benchmark.cjs
```

浏览器用例中的拒绝/延迟 bootstrap 是故障注入，不是性能基准或体验环境；A/B 基准不拦截请求，保留 HTTP 缓存。仅测试 Chromium，其他浏览器可能忽略 preload 优先级。

## 正文优先初始化（TB-204）

在 0002 后应用 `0003-progressive-navigation.patch` 。仅在线嵌入、非固定版式且原始目录不稀疏、未排序的 EPUB 启用：先整理原始目录与章节位置，不读取全书片段；首次实际 relocate 后 100ms 再以两个并发任务补齐目录锚点。每段之间让出主线程。关闭或重新打开取消旧任务，结果原子补齐且保留 Foliate 目录对象、ID、标签与阅读位置。完整缓存命中直接复用；稀疏目录等情况保留旧流程。

真实后端回归及 A/B（凭据仅由环境注入）：

```bash
READEST_BASE_URL=http://127.0.0.1:39211 node scripts/readest/progressive-browser.test.cjs
READEST_BASELINE_URL=http://127.0.0.1:39209 READEST_CANDIDATE_URL=http://127.0.0.1:39211 READEST_RESULT_PATH=./progressive-results.json node scripts/readest/progressive-benchmark.cjs
```

基准要求页码和实际章节 iframe 内容均出现；不是只测启动页面消失，也不是完整导航索引耗时。书籍10《西游记》有12个章节文件、101项目录，首屏时0个片段索引，随后11个章节索引补全。上游 main 已另行合入 TB-205 的在线导航跳过策略；这里仍固定来源 SHA 加显式补丁，不将不同策略混入已验证构建。

## 子路径反代测试分支

在 0003 后应用 `0004-reverse-proxy-base-path.patch`，运行：

```sh
NEXT_PUBLIC_APP_PLATFORM=web NEXT_PUBLIC_EMBEDDED_BASE_PATH=/readest-test/readest npx --yes pnpm@11.1.1 build
NEXT_PUBLIC_EMBEDDED_BASE_PATH=/readest-test/readest node scripts/readest/sync.mjs /path/to/readest-reader/out/readest
TALEBOOK_BASE_PATH=/readest-test npm --prefix app run build-spa
```

补丁允许服务器地址携带经过严格校验的 ASCII 路径；资源仍必须精确匹配该服务器的 `/read/resource/{bookId}.epub` 和单个 revision 参数。字体由 webpack 输出为带哈希资源，语言包从实际嵌入路径读取。启动页按自己的模块 URL 获取部署前缀。子路径环境不清理根域名的旧 Readest 缓存或 service worker；tombstone 的允许作用域限定在前缀之下。

本分支的导出固定为 `/readest-test/readest`，不是直接替换根路径部署的发布包。改变路径需重新构建 Readest 与 Talebook，并同步来源清单；不要手改压缩产物。Talebook 通用说明见 `document/reverse-proxy.md`。
