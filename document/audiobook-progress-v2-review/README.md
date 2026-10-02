# TB-234 接入预审修复验证

修复前 Talebook：`b02a2e15f8bc278a7f0f5f305053253b65787630` / Voicebook `f3109d00d191066d887b3a76c19d60460bc5b253`。修复版为包含本记录的 PR #1071 提交；交付评论记录完整 SHA。最终固定并实际验证 Voicebook `3316bae6a7372e82d7037d31b9ffb32633ef2aa4`（0.8.0）：生成侧独立复审通过后，Mika 在 `21cbc5a9-cb52-45fb-b57c-2566c2b29bda` 要求并入本轮。v2 契约、CLI 参数和默认值未变化。实际安装模块的 21 个 Python 源文件与该提交逐字节一致。

依据 QA 评论 `af15aa15-2a9c-4674-86a3-d3966a519e63` 附件 `evidence-b02a2e1.zip`。原 ZIP SHA256：`bc5f6996312a4ecaaebbc28043783589577ca23444e1f663c8b564703f0a4d5a`。`qa-original-probes.py` 保留原脚本。没有真实供应商调用。

| Finding | 修复前 | 修复后 |
| --- | --- | --- |
| High：读取校验后，旧事件覆盖接管后的新尝试 | 同一 SQL 边界探针中，owner 已为 replacement-worker，但 attempt 被旧值覆盖，seq=7、completed=2；新 worker 心跳被拒绝 | 保留新 attempt、seq=1、completed=0；后续新心跳被接受 |
| Medium：SSR 后首次浏览器轮询失败，卡片消失 | 旧 AudioJobsPage 加同一新 SSR 用例：初始响应 HTML 中有卡片及 3/12，但首次轮询失败后卡片和断连说明消失；用例失败 | SSR payload 初始化确认缓存；失败时仍有卡片及 3/12，恢复后更新到 5/12；用例通过 |
| Medium：manifest 校验期间已提交取消，仍完成并发布 | cancel_requested=true，但 completed、progress=1、edition=published | cancelled、progress=0、edition=draft；发布先提交时拒绝迟到取消 |

`before.json` 为旧 Talebook / f3109d0，`after-f310.json` 为修复工作树 / 同一 f3109d0，`after.json` 为最终修复工作树 / 3316bae6：相同适配探针在三次执行中都确认 interleaving_executed=true，不能把没有执行交错当作通过。先在原依赖下关闭故障，再在最终依赖下重复确认；UUID 每次不同。SSR 失败日志在 `ssr-before-failure.txt`，修复截图为 `../screenshots/audiobook-progress-v2/ssr-first-poll-retained.png`。

## 探针适配与故障检出

QA 原租约探针在 `Session.before_flush` 注入接管。修复改用条件 UPDATE，原挂点不再执行；直接运行原探针不能证明竞态关闭。适配版 `backend-boundary-probes.py` 只改注入挂点和输出路径：改在 `Engine.before_cursor_execute` 的首次任务 UPDATE 前，仍调用真实租约恢复、领取、新尝试登记与新心跳。只有供应商进程由离线心跳替代。取消探针仍在 manifest 读取中通过独立 Session 提交真实取消。

适配版也在旧 b02a2e1 上检出了两项原故障，见 `before.json`；原 QA 脚本在旧版亦复现相同结论。新增 `tests/test_audiobook_transactions.py` 则覆盖实际 SQL 边界下的 owner、同 owner 新 attempt、seq、status 竞争，取消在 manifest/任务 UPDATE 前提交、发布先胜出、租约失效、旧取消收尾与接管交错，以及章节 INSERT 失败时任务/版本/章节一起回滚。

## 验证结果

- 后端五个相关文件：**76 passed**，其中新增 **13 项真实 SQLite 事务交错**。包含真实离线 Voicebook 生成及 ffmpeg 产物、旧 CLI、共享预算多进程、API、恢复及修订回归。
- Vitest 进度组件：**16 passed**。
- 真实 Nuxt SSR / Chromium 页面 / 隔离模拟 API：**4 passed**，新增 SSR 首次断连与恢复；原有三场景全部回归。浅色/深色进度文字对比度 ≥4.5:1，320px 无水平溢出。
- 真实 API 到页面离线流程：**1 passed，包含快捷、高级和页面取消三个流程**。两种模式各生成两章、6/6 个标题/正文单元，峰值活动请求 2；浏览器收到真实 206 audio/mpeg（27,586 字节）并开始播放。高级候选经页面发布成为当前版本，旧版本转历史。页面取消后生成侧及宿主均 cancelled，0/6、活动请求 0、版本 draft、章节 0。详情首次 SSR 的两次连续 API 请求也验证通过。
- Python lint、测试 Ruff、前端 lint 和 diff 检查通过；前端仍有 566 项已有风格 warnings。数据库 JSONType 的 cache_ok 警告来自既有类型，不影响本次断言。
- `make check-design` 仅因本方案仍为 WIP 而禁止合并；PR 按 Mika 要求保持 draft。规格检查仍有基线已证实的 epub-beautify 归属缺失。

本轮未重跑全量后端。此前全量的三项失败已在未改动的 Talebook db5744b1 + f3109d0 环境复现：两项规格归属检查与一项 Readest mock os.stat 回归；本记录不宣称全量通过。生成侧独立复审已通过；本次接入修复的独立复审及最终全链路验收仍由 Mika 后续安排。

贯通中另发现并修复基线详情 SSR 的 Nuxt 上下文错误：`app/plugins/talebook.js` 的 backend 函数在第二次异步调用时重新取运行配置和请求头，已移到每个 Nuxt 插件实例初始化时获取，避免退出 setup 上下文后调用 composable。请求头仍属于当前 SSR 请求，没有放到模块全局。真实详情首次加载与播放回归覆盖此修复。

## 复现

在含项目依赖、Calibre、ffmpeg 和固定 Voicebook 提交的环境中，从仓库根目录执行：

```bash
PYTHONPATH=. python3 document/audiobook-progress-v2-review/backend-boundary-probes.py --output after.json
pytest tests/test_audiobook.py tests/test_audiobook_progress_v2.py tests/test_audiobook_reliability.py tests/test_audiobook_media_type.py tests/test_audiobook_transactions.py -q
make lint-py
ruff check tests/test_audiobook_transactions.py tests/test_audiobook_progress_v2.py
ruff format --check tests/test_audiobook_transactions.py tests/test_audiobook_progress_v2.py
cd app
npx vitest run test/components/AudiobookGenerationProgress.spec.ts
npx playwright test --config playwright.audiobook-progress.config.ts
npm run lint
```

离线 API 到页面流程使用 `tests/audiobook_offline_server.py`：真实 Talebook HTTP handler、数据库和调度器，固定版本 Voicebook 的 inspect / generate / ProgressEmitter / ffmpeg。输入是两章 EPUB 夹具，登录是测试管理员，供应商用 WAV 音调夹具替代；测试适配器在同一进程调用生成 API，CLI 子进程控制另由后端核心回归覆盖。快捷模式首个版本自动发布；高级模式待审查，由页面确认后生成候选，再在书籍页面发布后播放；慢任务通过页面取消按钮停止生成。服务由 Playwright 启停，Docker 全局 teardown 会停止该测试专用容器，未部署到站点。

```bash
docker build --target dev -t tb234-3316-test-env .
cd app
npx playwright test --config playwright.audiobook-offline.config.ts
```

该服务会重置仓库的测试书库，需与后端 pytest 串行运行。正常环境用 Playwright 安装的 Chromium；本运行因浏览器下载受限，通过 TB234_CHROMIUM_PATH 使用仓库外 Chromium 153。贯通结果输出到 `offline-workflows.json`，截图来自模拟书库。

故障检出对照：在隔离目录展开 `git archive b02a2e15f8bc278a7f0f5f305053253b65787630`，保持 Voicebook f3109d0 不变，用该目录作为 PYTHONPATH 执行同一适配脚本，应得到 before.json 的两个故障标记为 true。SSR 负对照仅将 AudioJobsPage 恢复为 b02a2e1 版本，使用当前新用例和 mock SSR 初始数据，应在首次轮询断连后失败。

测试环境 Python 3.13.5、Node 22、Chromium 153。测试磁盘不足默认 5GB，只在测试初始化关闭空间预检查，容量专用用例仍验证 5GB；生产默认未变。Chrome DevTools MCP 不可用，以 Playwright Chromium 替代。真实供应商、实际多容器挂载、读屏器和 200% 缩放未验证；截图来自模拟书目。接口审查范围及六个领域结论记录在同一份 WIP HTML。
