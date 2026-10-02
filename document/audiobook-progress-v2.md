# 有声书真实进度与并发配置

Talebook 固定使用 Voicebook 提交 `f3109d00d191066d887b3a76c19d60460bc5b253`，显式选择 `voicebook-progress.v2`。此提交的版本字符串是 0.8.0，尚无发布标签。重新安装 `requirements.txt` 或重建镜像后生效。

当前为接入草稿的实际验证版本。QA 在此提交补查出 Edge 同伴失败期间的慢媒体回收缺口；Mika 要求最终依赖跟随生成侧复审通过的提交。合并或部署前必须更新到该提交并重跑核心验证，不能把当前离线自测视为整体验收。

页面显示章节标题和可朗读正文的语音片段完成量，不估算整书剩余时间。解析、人工审阅、音频合成、写入和发布各自显示阶段；生成侧完成也不会提前把 Talebook 任务标为完成。

在站点的持久配置中设置以下参数，所有 Tornado worker 和有声书 worker 使用同一配置。参数由宿主在每次 `generate` 调用中显式传入，供应商重试仍由 Voicebook 调度。

| 配置 | 默认 | 含义 |
| --- | --- | --- |
| `AUDIOBOOK_WORKERS` | 1 | 站点并行制作任务数，最多 3 |
| `VOICEBOOK_EDGE_CONCURRENCY` | 1 | 单本 Edge 工作上限，1–32 |
| `VOICEBOOK_QWEN_CONCURRENCY` | 2 | 单本 Qwen 工作上限，1–32；供应商的多本总额度另行控制 |
| `VOICEBOOK_EDGE_BUDGET_PATH` | 空 | 使用 `AUDIOBOOK_PATH/rate-limits/edge-budget.sqlite3`；自定义时必须是绝对路径 |
| `VOICEBOOK_EDGE_MAX_CONCURRENCY` | 1 | 全部 Edge 请求共享连接上限，1–32 |
| `VOICEBOOK_EDGE_INTERVAL` | 5 | 共享请求启动间隔（秒），0–3600 |
| `VOICEBOOK_MAX_RETRIES` | 2 | 每个唯一片段额外尝试数，0–10 |
| `VOICEBOOK_RETRY_BACKOFF` | 1 | 指数退避基数（秒），0–30 |
| `VOICEBOOK_MAX_WAIT_SECONDS` | 300 | 累计退避、冷却及窗口配额等待预算（秒），0–86400；正常频率和连接排队不扣此预算 |
| `VOICEBOOK_EDGE_COOLDOWN_SECONDS` | 30 | 连续瞬时失败的共享冷却基线（秒） |
| `VOICEBOOK_EDGE_REQUEST_LIMIT` | 0 | 共享窗口请求配额，0 表示不设配额 |
| `VOICEBOOK_EDGE_WINDOW_SECONDS` | 3600 | 配额窗口长度（秒） |
| `AUDIOBOOK_PROGRESS_STALE_SECONDS` | 15 | 无生成进度更新后提示状态待确认；不因宿主租约续期而重置 |

预算文件放在持久目录的 `rate-limits`，不随片段缓存维护清理。同机多进程统一使用同一个文件；多容器绑定同一个支持 SQLite 文件锁的本地挂载，同时共享任务数据库和有声书目录。不要给每本书或每个 worker 分配预算文件。宿主显式路径优先于 CLI 的账户缓存目录和 `VOICEBOOK_EDGE_BUDGET` 环境默认值。

不同 worker 的共享间隔、连接上限、窗口配额和冷却参数不一致时，Voicebook 拒绝执行并向页面报告失败。修改已有预算配置需先统一停用全部使用旧配置的 worker，再由部署维护者重建预算文件并同时启用新配置。此 PR 不执行部署或删除线上预算。

跨主机、隔离文件系统以及同出口的其他客户端不自动共享；把 Edge 生成集中到同一个调度实例。不要把 SQLite 文件放到网络文件系统。Edge 默认并发 1、间隔 5 秒只是保守起点；经验频率、可能封禁时长和每日调用量不是供应商保证，不能承诺固定加速倍数。此方案不使用代理池或 IP 轮换。

等待期间完成量保持不变。有效 `Retry-After` 按秒数或 HTTP 日期等待，不会为了满足等待预算而提前请求；超出额度会明确失败，可在调整配置后重试。取消期间停止后续请求，活动调用在安全边界结束，宿主必要时终止进程。

任务 API 的 `generation` 包含 `protocol_version`、`task_id`、当前 `attempt_id`、已接收 `seq`、`connection` 和持久化 `snapshot`。消费者直接覆盖绝对计数；不同尝试的序号不能互比。`plan.overall_percent` 在未完成时为 null，仅宿主提交成功后为 100；旧的 `progress` 数值在未完成时为 0。旧 CLI（0.7.x）只传原参数，保留阶段及章级记录并提示详细实时进度不可用。

离线验证使用真实 Voicebook 生成管线和可控 WAV 模拟引擎，不调用语音供应商。页面自动化使用短生命周期 mock API，属于隔离页面自测；截图不代表真实书库或整体验收。运行：

```bash
pytest tests/test_audiobook_progress_v2.py tests/test_audiobook_reliability.py tests/test_audiobook.py
cd app
npx vitest run test/components/AudiobookGenerationProgress.spec.ts
npx playwright test --config playwright.audiobook-progress.config.ts
```
