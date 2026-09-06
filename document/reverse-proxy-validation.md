# 子路径反代验证记录

通用功能基线：master `db8688429c55ed5a5d1a40a227725b83d54ca3a9`。Readest 单独在 PR #977 的 `f3fc6d0234b834e0e332e52dae4a17a924420088` 上做集成，未混入主干功能。

## 验证结果

- `python3 -m pytest tests/test_base_path.py -q`：29 passed。
- Docker 内相关后端回归：171 passed、1 skipped；`pytest tests/test_reverse_proxy_integration.py tests/test_webdav.py -q`：11 passed。
- Docker 内 `make pytest`：1292 passed、20 skipped、3 failed。未改动 master 的 network_library 测试同样出现 3 个失败：`test_search_empty_result`、`test_search_groups_multiple_bindings_into_one_runtime_run`、`test_search_weight_increment`，均涉及异步搜索 finish 断言，未在本功能中修改。
- `make lint-py-fix`、`make lint-py`：通过；`cd app && npm run lint`：0 errors、459 warnings。
- Vitest 的 utils、plugins、受影响组件回归：12 files、69 passed。
- `TALEBOOK_BASE_PATH=/readest-test npm run build-spa`、同前缀 `npm run build`：通过；SSR 实例访问首页返回 200，Nuxt 与 favicon 资源携带前缀。
- `TALEBOOK_TEST_URL=http://127.0.0.1:39220/readest-test TALEBOOK_TEST_EPUB_ID=2 TALEBOOK_TEST_CREDENTIALS=<本地凭据文件> node app/test/scripts/reverse-proxy-live.mjs`：真实 Docker 后端登录、cookie 路径、API、封面、详情刷新、390px 页面、EPUB 解包加载和退出通过。凭据不随报告提交。
- Readest 集成：50 个后端测试、35 个宿主 Vitest 测试、2 个 preload/sync 测试通过。上游补丁新增的路径契约与远程资源测试 17 passed；Next 构建含类型检查通过。
- `READEST_BASE_URL=http://127.0.0.1:39222/readest-test READEST_CREDENTIALS=<本地凭据文件> node scripts/readest/subpath-browser.cjs`：真实正文、翻页 CFI 变化、HEAD 200、GET Range 206、无越前缀 HTTP 请求或页面错误。
- 浏览器：独立 Playwright Chromium；Chrome DevTools MCP 因已有 profile 占用未成功，未声称 MCP 验收通过。旧阅读器未逐一执行所有交互，社交登录未使用真实提供商完成回调；通过 URL/HTTP 测试和代码检查补充。
- Docker 运行验证使用在已有 master 运行时镜像上覆盖本次源码和已构建 SPA 的派生镜像；未从零构建完整多阶段生产 Dockerfile。

## interface-review full

### Scope and Coverage

本次为变更审查，Nuxt 4 / Vue 3 / Vuetify。已读取根目录、app、webserver 的 AGENTS/CLAUDE 与 interface-review、better-interface 及六个领域技能。目标为当前分支相对默认 master 的全部变更（含暂存和未暂存）；base/head 均为上述 db868842，0 个已有提交、41 个功能变更文件；排除本地 .deepsec、构建产物、日志和截图二进制。源码逐个读取 diff 的新增与删除行。

扩展 5 个消费者：登录、详情/BookDetailActions、客户端入口、启动失败诊断、EPUB 阅读；其余 13 个直接或主题二级消费者未展开运行检查（仍检查了相关变更 hunk）。Readest 的 26 个既有提交不属于通用功能分支；集成分支的完整界面审查及合并验收另行处理。

| 领域 | 证据 | 结果 |
| --- | --- | --- |
| Accessibility | URL 替换保留原有原生链接、按钮名称、iframe title、reader error/status 语义；未移除 focus/aria/inert | Clear（变更语义）；完整键盘/屏幕阅读器未验证 |
| Layout | 390px 详情实际渲染；无模板层级/样式变化 | Clear（该视口）；320px/200% zoom 未验证 |
| Writing | 原文案与 i18n 保留；文档明确前缀构建、去前缀反代和第三方限制 | Clear |
| Typography | 无字体/字号变更证据 | Not reviewed: no evidence in the change scope |
| Colors | 无色值/主题 token 变更证据 | Not reviewed: no evidence in the change scope |
| UI | 登录到详情、阅读入口、刷新/退出；错误与加载模板的前后代码 | Clear（已检查状态）；其他浏览器未验证 |

### Findings

No actionable interface findings in this change.

### Considered but Rejected

| 位置 | 候选 | 未列为问题的依据 |
| --- | --- | --- |
| app/components/BookDetailActions.vue:22 | 将阅读链接改成程序化导航 | 保留原生 href/新标签行为对键盘和浏览器默认行为更合适；仅添加前缀 |
| app/pages/library/apps.vue:225 | 隐藏较长的子路径地址 | 这是开发者需要复制的真实地址；未引入新的布局或裁切规则 |
| app/utils/theme-runtime.ts:15 | 重做主题外观 | 本次仅修复模块 URL；无色彩和字体变更依据 |

### Verification

`gh repo view --json defaultBranchRef` 得到 master；`git merge-base origin/master HEAD` 为 db868842；`git rev-list --count origin/master..HEAD` 为 0（通用分支）；`git diff HEAD --name-only`、`git diff HEAD -- app/components app/pages app/utils/theme-runtime.ts webserver/resources` 覆盖未提交改动双方。审查期间未切换分支、stash 或写入 .git；实现阶段此前为集成获取 PR #977 ref 不属于审查操作。实际浏览器步骤及限制见上方。没有宣称未运行的视口、读屏或所有 legacy reader 已验证。

### Verdict

Approve

## DeepSec Shield

使用工作区 deepsec-shield 技能；版本 0.2.0，来源提交 `fff031fc01fb36b95348214c8ee359f6ede8aa8b`。逐仓库运行：

```sh
/opt/deepsec/fff031fc01fb36b95348214c8ee359f6ede8aa8b/venv/bin/deepsec shield scan . --layer l1,l2 --include-tests --format json --output -
```

stdout、stderr、真实退出码保留在各自 `.deepsec/`。仅本地 L1/L2，不上传源码。主仓库 765 files，退出 2，有 184 项（critical 35 / high 128 / medium 21）；有效 JSON 报告确认是发现项退出，不是参数错误。

改动文件中的发现：`tests/test_base_path.py:53` 是明确标记 test-only 的测试 cookie secret；`webserver/handlers/comic.py:23` 是既有 token 名称常量，不是凭据；`webserver/handlers/audiobook.py:1617` 是既有 subprocess 参数数组调用，未使用 shell。其余告警集中在未改源码与第三方/生成资源（包括 .output/public 的重复），未逐项修复或证明全部为误报，不宣称全库安全通过。

Readest 源码扫描 1065 files，退出 2，36 项（critical 10 / high 19 / medium 7），无命中本次修改源码文件；其既有发现未全部审计。集成仓库最终扫描结果在该分支的验证记录中给出。

覆盖限制：不覆盖 Vue、HTML 内嵌脚本、CSS、nginx、Dockerfile 和 Shell；生成目录的扫描也不等价于完整第三方审计。上述文件以 lint、模板/配置人工检查和真实浏览器补充；SSR 验证后产生的服务器构建产物未单独扫描，扫描覆盖的是最终源码和之前的 SPA 产物。


## Readest 预览集成补充

此分支基于 PR #977，仅交付 `/readest-test/` 预览专用产物，尚不是可直接合入 master 的通用 Readest 发布包。其默认路径需要显式构建为 `/readest-test`；根路径 Readest 分发应重新生成。通用子路径功能已在独立主干 PR 中提交。本分支保留 WIP：对 PR #977 全部既有提交的默认分支界面审查、完整 SSR 集成以及发布包矩阵不是此次预览验收结果。

- `cd app && npm run lint`：0 errors / 459 warnings。
- `cd app && npx vitest run test/utils/base-path.spec.ts test/utils/readestLaunch.spec.ts test/utils/readestLegacyWorkerCleanup.spec.ts`：35 passed。
- `node --test scripts/readest/preload.test.mjs scripts/readest/sync.test.mjs`：2 passed。
- `pytest tests/test_readest_embed.py tests/test_base_path.py tests/test_reverse_proxy_integration.py -q`：Docker 中 50 passed。
- 上游 `mokeRemoteSource` 与 `remoteSourceBasePath`：17 passed；最终 Next 构建通过（含 TS 检查）。补丁 0004 以固定上游 SHA 加 0001–0003 为基线；来源清单与所有已生成产物一并提交。
- 浏览器自动化已实际观察 foliate-view 正文、翻页 CFI 改变、EPUB HEAD 200 / GET 206。网络检查排除 blob: 内存资源，仅检查 HTTP/HTTPS 的同源前缀与失败响应。
- https://miu.rexliao.cn/readest-test/ 已映射。公网登录页真实 Chromium 渲染，没有越前缀 HTTP 请求或页面错误。首页、API welcome、Readest HTML 和 SW 返回 200；SW 允许作用域为 `/readest-test/`；原域名根首页仍为 200。
- 原测试环境 `/srv/talebook-preview-tb203/data` 复制为独立目录，SQLite 使用 backup API 快照；保留原有账号，原实例继续运行。公网实例没有使用随机凭据的自动化测试书库。

最终 DeepSec：与通用仓库相同版本和命令，扫描本集成仓库全部受支持源码/测试/相关模块以及 Readest 静态产物，1070 files，L1/L2，退出 2，223 findings（critical 39 / high 161 / medium 23）。`scripts/readest/subpath-browser.cjs:15` 的断言访问 JSON `.err` 被报为信息泄漏，它仅比较状态且不输出凭据；`app/test/utils/readestLaunch.spec.ts:27` 为测试固定 HTML fixture 的 innerHTML；其余改动文件告警与通用分支相同。生成 Readest 产物中的命中及继承的其他告警未全部验证/修复，不宣称扫描完整通过。扫描器不支持 Vue/HTML/CSS/nginx/Dockerfile/Shell；补丁文本本身不等于源码扫描，另对实际应用补丁后的 readest-reader 源码扫描 1065 files / 36 findings / 退出 2。无新增命中该源码工作树修改文件的发现。报告在本地保留，不提交可能包含源码敏感片段的原始报告。

### 运行维护

- 容器：`talebook-readest-subpath`，restart policy `unless-stopped`，宿主监听 `127.0.0.1:39224`；由 Docker 管理生命周期。
- 日志：`docker logs talebook-readest-subpath`，应用日志位于持久化数据目录。
- 停止：`docker stop talebook-readest-subpath`（会使该体验地址暂时不可用）。
- Caddy 仅增加 `/readest-test` 的 308 跳转和去前缀 handle_path，已 validate + reload；备份 `/etc/caddy/Caddyfile.before-readest-subpath-20260906`。回滚应移除新增的对应规则后 validate/reload，避免覆盖随后其他人的配置改动。
- 数据：`/srv/talebook-readest-subpath/data`；无需依赖任务目录。

源码 `git diff --check`（排除上游生成 `_next` 和 patch 格式）通过；原始 Next 产物有尾空白，patch 的空上下文行亦会触发 whitespace 报告，保留原生成字节与可应用补丁，未手改压缩产物。通用功能 PR： https://github.com/talebook/talebook/pull/1039 。
