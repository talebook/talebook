# 子路径反代验证记录

通用功能基线：master `db8688429c55ed5a5d1a40a227725b83d54ca3a9`。Readest 单独在 PR #977 的 `f3fc6d0234b834e0e332e52dae4a17a924420088` 上做集成，未混入主干功能。

## 当前合并验收（2026-09-07）

本 PR 不依赖 Readest；只合并 #1039 即可获得通用子路径反代能力，无需合并 #1040。默认根路径镜像与启动配置保持兼容，只有使用子路径时才需要显式构建参数。已合入最新 master `26d8dd74c1b33109668fed4cbf1611cfc459688a`，保留 #1037 的移动端详情布局。

- 修复默认侧栏内置图片遗漏前缀；管理员自定义 HTML 原样保留。新增真实 API 回归覆盖二者。
- CodeQL 评论指向测试探针的任意 `next` 重定向；改为测试应用内固定目标配置，保留外部跳转兼容性测试，不抑制告警规则、不改变业务重定向策略。
- `docker run --rm --tmpfs /work/tests/library/audiobooks:rw,size=6g -v "$PWD":/work -w /work talebook/test:tb208-epub make pytest`：**1301 passed / 20 skipped**，退出 0。
- 最初直接使用宿主磁盘运行时 1297 passed / 20 skipped / 4 failed，均由磁盘不足 5 GiB 触发有声书保护。使用独立 tmpfs 测试存储后全部通过，未调低阈值、mock 磁盘检查或关闭保护。上一轮异步搜索失败本轮也未再出现。
- 路径/HTTP/WebDAV 测试单独运行：42 passed；`tests/test_main.py`：98 passed / 1 skipped。曾将这些模块手动混合排序运行时遇到共享 fixture 用户总数 33/31 断言；按完整套件默认顺序和主模块单独运行均通过。
- `cd app && npx vitest run test/utils test/plugins test/components/BookDetailActions.spec.ts`：11 files / 67 passed。`npm run lint`：0 errors / 459 warnings。`make lint-py-fix`、`make lint-py`、`git diff --check` 通过。
- `cd app && TALEBOOK_BASE_PATH= npm run build-spa`：默认根路径 SPA 构建通过。浏览器脚本现在同时支持根路径与子路径，并实际展开帮助菜单，等待默认图片 naturalWidth 大于 0。
- `TALEBOOK_TEST_URL=http://127.0.0.1:39225 TALEBOOK_TEST_EPUB_ID=2 TALEBOOK_TEST_CREDENTIALS=<本地文件> node app/test/scripts/reverse-proxy-live.mjs`：根路径登录、cookie、API、侧栏图片、详情刷新、390px 页面、EPUB 解包阅读和退出通过。
- 同一脚本以 `TALEBOOK_TEST_URL=http://127.0.0.1:39220/readest-test` 再跑：同样通过。前者为真实 Docker 后端挂载新默认 SPA，后者为已构建子路径 SPA 加最新后端修复；不是 mock 体验。临时实例验收后停止，既有公开 Readest 预览继续运行。
- 完整默认镜像的既有 CI 证据：提交 `87be3efdf5bf6d6b30a43f6de2f68b87509128a2` 的 [build run](https://github.com/talebook/talebook/actions/runs/34043113065) 中 Build SPA、Build SSR、Build development image 全部 success；同提交 test-server / test-ui / integration-test / check-design / CodeQL 也成功。本轮新提交将重新触发 CI，未把旧结果当作新提交结果。主机仅约 2GB 空闲，未在本机重复完整多阶段镜像构建，也未声称子路径完整构建矩阵全部完成。

### 最终 interface-review full

目标：分支相对默认 master `26d8dd74c1b33109668fed4cbf1611cfc459688a` 的全部已提交和未提交改动。审查时 HEAD `892990fa2b1b74090e710bcd772649c49cd8dc72`，领先 2 个提交（含 master 合并）；新增修复尚未提交。最终功能差异 44 文件，排除本地日志/.deepsec/生成产物和截图二进制。读取 `git diff origin/master` 双方，先前 URL 变更保持原有语义；本轮重点为默认图片响应与消费者 SidebarHelpMenu。

展开 5 个消费者：登录、书籍详情及阅读入口、客户端地址、侧栏帮助菜单、EPUB 阅读；另 13 个直接/主题消费者未扩展运行检查。根目录与子目录 AGENTS/CLAUDE、interface-review/better-interface 及六领域技能沿用首轮规则。审查阶段只读；此前 `git fetch origin master` 和 `git merge --no-edit origin/master` 为实现同步操作，明确记录。

| 领域 | 本轮证据 | 结论 |
| --- | --- | --- |
| Accessibility | 原生按钮/链接及名称、focus/aria/iframe title 未改变；图片保留已有 HTML 属性 | Clear（变更语义），完整读屏未验证 |
| Layout | 最新 master 390px 详情截图、帮助菜单实际展开；功能 diff 无新样式变化 | Clear（已验证视口），320px/200% zoom 未验证 |
| Writing | 文档明确通用能力、默认无需新配置、子路径构建和 Readest 独立关系 | Clear |
| Typography | 无字体或字号变更 | Not reviewed: no evidence in the change scope |
| Colors | 无配色或 token 变更 | Not reviewed: no evidence in the change scope |
| UI | 两种部署登录、真实图片、刷新、阅读、退出；已有加载/错误逻辑保留 | Clear（上述状态），其他浏览器未验证 |

No actionable interface findings in this change. Considered but Rejected：不将原生阅读 href 改成程序化导航，以保留浏览器行为；不自动重写所有管理员 HTML，避免改变管理员显式 URL。未发现需单列的既有界面问题。Verification：上述脚本与截图；`git diff origin/master -- app/components app/pages app/utils/theme-runtime.ts webserver/resources` 422 行，与首轮已检查的前缀修复一致；新增后端图片输出和 SidebarHelpMenu 的实际加载已检查。Verdict：**Approve**。

### 最终 DeepSec（2026-09-07）

全部最终代码修改后重新执行下文同版本、同完整命令的本地 Shield L1/L2 扫描，覆盖本仓库受支持源码/测试/相关模块：765 files、184 findings（critical 35 / high 128 / medium 21）、退出 2。命中改动文件仍只有 test-only cookie secret、既有 comic token 名称和未修改的 subprocess 调用；新增侧栏修复无命中。完整 JSON、stderr、退出码本地留存。既有/第三方告警未全部处理，语言覆盖限制不变，不能称全库安全通过。本轮未修改 Readest 仓库。

## 首轮验证结果（2026-09-06）

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

## 首轮 interface-review full（2026-09-06）

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
