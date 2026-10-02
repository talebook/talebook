# 尝试登记与中心创建入口复审修复

修复前 Talebook `e0e2220caa6c91277c93005664a92f20727e67d7`；Voicebook 固定并保持 `3316bae6a7372e82d7037d31b9ffb32633ef2aa4`。最终修复提交 SHA 见 PR #1071 和交付评论。v2 契约、CLI 参数、共享预算配置及数据库结构没有变化。

## QA 附件与 SQL 前后证据

依据 QA 评论 fbf238e7 的 `qa-evidence-e0e2220-3316bae.zip`，附件及原探针哈希在 `provenance.json`。`qa-original-invocation-boundary.py` 是附件原样副本；`original-before.json` 是本轮在未改动 e0e2220 源码上执行原探针的结果。真实 SQLite UPDATE 暂停 120ms，让原有效的 100ms 租约过期；真实恢复、领取、新尝试登记及 seq=1 心跳随后提交。

同一 `invocation-probe.py` 在隔离 e0e2220 源码和修复树上执行，两次交错都实际触发：

| 观察 | before.json | after.json |
| --- | --- | --- |
| 旧登记覆盖新 attempt | true | false |
| 新 worker 已确认的完成量 | 被清空 | 保留 0 |
| 新 worker seq=2 心跳 | 被拒绝 | 被接受 |
| 旧登记调用 | 正常返回并造成覆盖 | 抛出 AudiobookLeaseLost，停止旧调用 |

适配只包含两项：替换 worker 的测试回调接受新增领取身份参数；捕获预期旧调用异常，以便继续检查新 worker 心跳。原 SQL 挂点、120ms 暂停、恢复/领取流程及生成侧配置保留。旧版仍检出故障，避免以探针没有执行或异常中断代替正确性验证。

复现（安装项目依赖、Calibre、ffmpeg 及固定 Voicebook，从仓库根目录执行）：

```bash
PYTHONPATH=. python3 document/audiobook-progress-v2-review/attempt-registration/invocation-probe.py --expect fixed --output after.json
pytest tests/test_audiobook.py tests/test_audiobook_progress_v2.py tests/test_audiobook_reliability.py tests/test_audiobook_media_type.py tests/test_audiobook_transactions.py -q
# 本容器低于默认 5GB；仅本轮测试初始化在 setup_server 后设置 AUDIOBOOK_MIN_FREE_GB=0。
# 容量限制专用用例仍显式设置并验证 5GB，生产配置没有变动。
```

负对照：将 e0e2220 的 `git archive` 解压到独立目录；用该目录作 PYTHONPATH，运行相同探针并传 `--expect vulnerable`。两次保持 Voicebook 3316bae6 不变。

## 写入边界审计

| 边界 | 保护及验证 |
| --- | --- |
| 领取、过期恢复 | 比较原 owner/status/领取次数/seq/data/lease/cancel；领取身份传入实际处理调用。终态赢得 UPDATE 后，旧恢复不能重新排队。 |
| 登记 inspect/generate | 原值条件更新及有效租约检查；生成阶段与新 attempt 在同一写入中完成，不再先无条件写 generating。竞争失败阻止后续供应商调用。 |
| 控制续租 | 校验领取和 attempt 身份，不允许过期租约复活；同 owner 新领取/新尝试也返回失去租约。若同一有效尝试的进度或取消抢先提交，重新读取其身份，正确传递取消而不错误强制终止。 |
| 检查完成、进入 finalizing | 条件任务 UPDATE 与版本元数据在同一事务提交；失败回滚版本变更，停止旧流程。 |
| 异常、取消、最终完成 | 收尾校验当前领取/尝试及有效租约；旧异常不能把新 worker 标为 failed，旧取消不能结束新尝试。原取消先胜、发布先胜及章节写入失败回滚回归保留。 |
| 页面重试、确认、脚本编辑 | 修改取消/脚本文件前以原值 UPDATE 取得任务写锁，持有到事务结束；旧请求不能清除新 worker 的尝试或取消文件。 |
| v1/v2 事件回调 | 事件回调携带完整领取/attempt 身份。同 owner 的新线程领取尚未登记新 attempt 时，旧事件也不能写入继承的数据；两个负对照均在修复前检出覆盖，修复后保留新领取并接受后续新心跳。 |
| 子进程失去租约 | 先 TERM，超出回收期限则 KILL；测试启动忽略 TERM 的真实子进程，验证 wait 回收后 PID 已不存在。 |

SQLite 使用 SQL 执行时本地时间，与既有 naive datetime.now() 存储一致；100ms 租约在 SQL 暂停期间自行过期、没有其他 worker 写入时也拒绝登记。其他数据库保留进程时间和原值条件检查，本轮未验证其数据库时钟、隔离级别或生产部署。

后端核心 **118 项通过**，其中事务文件 **52 项**（新增 39 项），另新增 1 项真实子进程强制回收用例。包括 owner、attempt、领取次数、seq、过期、终态及取消的 SQL 竞争，真实恢复/领取、四个处理阶段写入失败后的调用次数，新 worker 后续心跳，旧请求文件保护。旧测试 fixture 补上实际领取后的有效租约及领取身份，不再模拟无租约的活动 worker。

## 创建向导

中心向导此前优先使用 `/library?stream=1` 摘要，摘要没有格式而详情包含 EPUB、can_generate=true 时仍禁用创建；这是 QA 已确认的基线问题。现在所选书保留摘要与详情信息，格式识别和列表/详情标签统一优先读取详情。没有放宽权限、漫画、活动任务或不支持格式限制。

新增隔离页面用例覆盖 EPUB 详情与错误 PDF 摘要、TXT 详情与缺失格式摘要，以及 MOBI 详情与错误 EPUB 摘要；前两者可从中心入口提交，第三者继续显示转换入口。深色 320px 验证无水平溢出。QA 原始入口截图和实测 API 证据保留为 qa-wizard-before.png / qa-wizard-baseline.json。实际 Docker API 的快捷/高级创建、确认、发布、MP3 播放及取消复验记录随本轮证据包交付；模拟 API 与实际 API 结果分别标注。

## QA 附件的真实 CLI 页面复验

`real-cli-generation-workflows.json`、`real-cli-recovery-workflows.json` 和 `real-cli-waiting-workflows.json` 记录 **3 个测试、7 个流程全部通过**：中心向导快捷/高级创建至真实 MP3 播放；活动请求取消；部分失败后页面重试与缓存复用；429 等待刷新后成功重试；Edge 共享间隔排队刷新及取消；Edge 共享冷却在 320px 深色刷新后取消。检查真实 API、数据库、scheduler、VoicebookProcess、CLI 子进程、ffmpeg、持久快照和供应商调用记录。输入书、认证及语音供应商为隔离夹具，没有实际供应商调用。

`candidate-source-verification.json` 保留运行时三个生产文件的 SHA256，提交后再次核对其字节；安装的 21 个生成侧 Python 文件与固定 3316bae6 源码逐字节一致。记录的 talebook_parent_sha 是父提交 e0e2220，不被当作修复版本；最终两仓版本随交付评论及证据包 manifest 提供。

使用 QA 原供应商 stub，改动仅为隔离端口/容器/路径、版本证据字段、创建 helper 走中心向导，以及初始 Nuxt 客户端预热；其余流程断言保留。完整可复用驱动随交付 ZIP 的 qa-attempt-workflows 目录附上；将 config、spec 和 teardown 分别复制到 app、app/test/e2e 和 app/test 后，运行 `npx playwright test --config qa-attempt.config.ts`，测试结束删除这些临时文件。需要与原 QA 相同的 Docker 依赖环境，及固定生成侧源目录供逐字节核对。

## 验证范围与状态

固定依赖环境的核心、页面及实际离线流程记录见交付证据包。全量后端首次执行得到 1877 passed、40 skipped、10 failed；这 10 项均在未改动默认分支 db5744b13e245414762bafc6219c6056fcb33837 的相同容器中逐项复现：规格归属两项、Readest mock 资源一项、扫描书名夹具一项，以及缺少可执行 git 的升级工作流六项。本记录不把全量称为通过，也不为本任务扩大到这些独立基线/环境问题。

Node 使用 22.23.3，Python 3.13.5，Chromium 153。运行默认 Node 18 时前端测试无法启动，已切换测试要求的版本；Nuxt 首次 HTTP 就绪可能早于客户端编译，按既有入口用例方式做一次预热和必要刷新。最终模拟页面全套首次为 6/7，通过的格式入口三项均包含提交验证；共享冷却用例在移动刷新后停于基线主题运行时加载层，保持原断言单独复跑通过（1/1），两次日志一并保留。Chrome DevTools MCP 不可用，使用 Chromium/Playwright 实际渲染。无真实语音供应商调用或生产部署；真实供应商、生产多容器/跨主机共享预算、真实用户隔离、读屏器和 200% 缩放未验证。

仓库内离线复合用例最终 1 passed，含中心向导快捷/高级到播放及页面取消三个流程。首次驱动点击 Vuetify 内部 combobox 输入层超时，改用与 QA 一致的键盘选择方式后通过；保留原验证断言及失败日志。

独立复审仍待 Mika 派发。TB-234 保持 in_progress，PR 保持 draft；同一份 WIP 保留，复审通过后再安排 ACTIVE 及门禁收尾。
