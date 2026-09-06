# Readest 宿主补丁

基线：`https://github.com/hehetoshang/readest-reader` 的 `a4fc84077ad4f4c490305961235086f25bd4da12`。

`0001-android-web-head.patch` 修复 TB-204：仅 Tauri Android 使用 asset 协议的 Range 初始化；Android 浏览器和其他 web 平台使用 HEAD，先建立 Moke 资源传输层的文件大小和 ETag 校验状态。补丁含 5 项平台分支/真实传输层回归测试，不关闭任何鉴权、来源、版本或字节校验。

在干净的固定上游检出中应用补丁（将下方补丁路径替换为 Talebook 检出的实际路径）：

```bash
git apply --check /path/to/talebook/scripts/readest/0001-android-web-head.patch
git apply /path/to/talebook/scripts/readest/0001-android-web-head.patch
npx --yes pnpm@11.1.1 install --frozen-lockfile
npx --yes pnpm@11.1.1 test
npx --yes pnpm@11.1.1 typecheck
NEXT_PUBLIC_APP_PLATFORM=web npx --yes pnpm@11.1.1 build
```

将仓库根目录的 `out/readest/` 同步到 Talebook 的 `app/public/readest/` ，保留 `TALEBOOK_SOURCE.json` 、许可证声明和清单中的宿主文件。可在 Talebook 根目录运行 `node scripts/readest/sync.mjs /path/to/readest-reader/out/readest` 。来源清单必须列出此补丁，并更新 reader.html 与所有带哈希的 chunk，不能直接手工替换压缩 JavaScript。

验收必须覆盖 Android 浏览器 UA、移动视口、真实后端与 Cookie 登录；首次资源请求必须是 HEAD，随后 GET Range 返回 206，且正文和翻页完成。只验证桌面或只检查服务器支持 Range 不足以覆盖本次故障。

原生 Android 范围探测保留且单测覆盖；未运行 Android 原生安装包。本补丁不解决远程明文 HTTP 缺少跨源隔离的问题。
