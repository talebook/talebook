# Handoff — Talebook 插件能力接口重构

生成时间：2026-08-24
接手后请先读方案文档，本文件只记录方案里没有的会话状态。

---

## 1. 当前工作位置（重要）

**在这个 worktree 里干活：**

```
/Users/bytedance/github/talebook/.claude/worktrees/plugin-capability-interfaces
分支：refactor/20260824-plugin-capability-interfaces
基线：origin/feat/plugins @ 8c3601e8
```

不要在 ` /Users/bytedance/github/talebook/.worktrees/feat-plugins ` 上改代码——那是被审查的分支，已恢复干净状态。

插件系统只存在于 `feat/plugins`，**不在 master 上**，所以本次基线是 `origin/feat/plugins` 而非 `origin/master`（这是对 10xdev 技能默认规则的有意偏离，原因已记录）。

## 2. 方案文档（唯一事实来源）

```
design/webserver/20260824-plugin-capability-interfaces.wip.html
```

状态 WIP，已提交在本分支（尚未合并；`.wip.html` 按仓库规范不得合入主干）。**用户已明确说「开工吧」，方案审查确认阶段已通过**，可以直接进入实现。

方案里已有的内容不要在别处重复：11 项缺陷 F-1…F-12、7 个能力接口签名、read/write/sync 三模式定义、书源接口按 Legado 实测校准的结果、12 步迁移路径 S1–S12、13 条决策记录 D-1…D-13、14 项测试计划 T-1…T-14、风险 R1–R4。

需要改方案时**更新这一份**，不要新建。同一工作只维护一份 WIP。

## 3. 已完成

### S1 — 通用动作端点透传 input_data（已实现，已测试通过）

改动（已提交在本分支，2 文件 +110 −9）：

- `webserver/handlers/plugins.py`
  - 新增 `_plugin_input_data(handler, connection)`，以及常量 `SERVER_OWNED_INPUT_KEYS` / `BOOK_SCOPED_CAPABILITIES`
  - `UserPluginAction.post`：删除了硬编码拒绝 weread 的特判，改为透传 `input_data`
  - `AdminPluginAction.post`：同步支持 `input_data`
- `tests/test_plugins_api.py`：新增 `TestGenericActionInputData` 三个用例

**安全要点（勿回退）**：`allowed_book_ids` 属服务端受控字段，客户端传入的同名值一律丢弃，由平台按 `handler.get_book(book_id, raise_exception=False)` 重算；仅对声明了 `annotations.import` 能力的插件注入。

验证结果：`tests/test_plugins_api.py` 12 passed（在 feat/plugins worktree 上跑的；迁移到新 worktree 后**尚未重跑**，见下方阻塞项）。

## 4. 立即要处理的阻塞

在新 worktree 里执行 Docker 测试时被拒：

```
docker run --rm -v "$PWD":"$PWD" -w "$PWD" talebook/test pytest tests/test_plugins_api.py -q
→ 被 worktree 隔离机制拒绝：命令过于复杂，无法验证是否停留在 worktree 内
```

处理建议：拆成不含 `$PWD` 展开与多重引号的简单命令，或用绝对路径直写：

```
docker run --rm -v /Users/bytedance/github/talebook/.claude/worktrees/plugin-capability-interfaces:/w -w /w talebook/test pytest tests/test_plugins_api.py -q
```

**本地没有可用的 Python 测试环境**——`calibre` 模块缺失，`python3.11` / `uv run` 均不可用。必须走 Docker 镜像 `talebook/test:latest`（已存在，1.06GB）。

另一个未完成的验证：方案 HTML 的浏览器渲染核对。Chrome DevTools MCP 报 `browser is already running for .../chrome-profile`，已有实例无法接入，`--isolated` 也被同一 profile 拦住。这一项一直如实记为「未执行」，不要写成已通过。

## 5. 下一步顺序

按方案第 8 节的 S 序列走。S1 已完成，接着：

- **S2** 三族 provider 统一走 `SafeHttpClient`（`enrichment.py` 的 `_http_json` 与 `weread.py` 的 `urlopen`）→ 对应 T-2
- **S3** 补 `PluginProvider` Protocol、`PluginContext` dataclass、`register()` 契约检查（**先只告警不抛错**，见风险 R4）
- **S4** 协议收口：`connection_owners` 必填、`config_schema` 落地校验、未知键拒绝、`Page.has_more`（此步才把 S3 的告警改为抛错）
- S5…S12 见方案

用户倾向的 PR 拆分：S1+S2 / S3+S4 / S5+S6 / S7 / S8–S12（该问题在方案第 11 节列为待确认，用户尚未明确回答）。

## 6. 仍待用户拍板的三件事

方案第 11 节末尾列了三条，用户至今只答了其中隐含的部分：

1. **D-7**：`webserver/plugins/sending/` 的 6 个设备推送器是否纳入插件中心（决定 `PushProvider` 本次是否落地）
2. PR 拆分粒度
3. Legado 的 12 条 `/api/network/*` 旧路由能否接受「先并存一个版本再删」的过渡期

## 7. 会话中用户已定的命名与语义（勿擅自更改）

这些是用户逐轮 grill 后拍定的，方案已同步，改动前须再确认：

- 三层命名：能力接口 `XxxProvider`（Protocol）／共享实现基类 `XxxBase`／具体插件 `XxxPlugin`
- 接口名：`SourceProvider`、`TransformProvider`、`PushProvider`、`MetadataProvider`、`AnnotationProvider`、`ReviewProvider`、`ExtraFeatureProvider`
- 模式：`read` / `write` / `sync`，判据是**插件行为的副作用方向**，不是「是否修改 Talebook 数据」
  - `download`、`list_annotations` 都是 **read**（插件只从远端读，写库的是平台）
  - `write` 只有修改书籍正文一类，目前仅 `TransformProvider.apply`
  - `sync` 是往外部服务写（笔记回写 BRS、推送到设备）
- 取书：manifest 声明 `download_mode`（`single_book` / `by_chapters` / `none`），方法名用 `download` / `get_toc` / `get_chapter`，**不用 `acquire`**
- `integrations` 下三个 capability 已合并为单个 `integrations.tool`
- `TransformProvider` 需提供动态配置 `trigger`（`manual` 默认 / `auto` 自动处理新书）
- 异常类改名 `ProviderError` → `UpstreamError` 系列（让出 `Provider` 词位）

## 8. 两个容易被忽略的实现约束

- **`/api/book/{id}/refer` 必须并发**。现有 `plugin_search_books` / `plugin_search_books_stream` 已用 `ThreadPoolExecutor`。但现有 task 不碰 DB，而 `runtime.read` 会写 `connection.health`——**多线程共用一个 SQLAlchemy session 不安全**。方案要求实现 `runtime.read_many()`：调用线程内预解密凭据 → worker 只做网络 I/O 不碰 session → join 后回调用线程统一写 health。（决策 D-13）
- **sync 有现成基础，是接线不是新建**。`webserver/services/annotation_sync.py` 已实现完整扇出（`register_writer()` 钩子、`AnnotationSource` 表的 pending/synced/failed 状态、`exclude_source_name` 防回环），但**生产代码中无人注册 writer，只有 `tests/test_annotations.py:310-311` 注册过**。接入时务必保证平台注册的 writer key 与导入时写入的 `source_name` 一致，否则回环防护失效。

## 9. 项目规范要点

完整规范见仓库 `AGENTS.md`。容易踩的几条：

- 提交前必须过：`make lint-py-fix` → `make lint-py` → `make pytest` → `make check-design` → `cd app && npm run lint`
- `make check-design` **只要存在 `.wip.html` 就会失败**，这是合并门禁，属预期行为。要确认的是**除该条外没有其他错误**（路径 / HTML 结构 / 单文件资源）
- 方案文件不得依赖外部资源——**不能用 Google Fonts 等远程链接**，必须内联
- 本方案属跨模块大型功能且影响前端，**不适用「无界面影响」豁免**，转 ACTIVE 前必须跑 `interface-review` 的 `full` 模式（T-13），出现 HIGH/MEDIUM 不得转 ACTIVE
- 前端体验必须连 Docker 真后端（`make dev` + `API_URL=http://127.0.0.1:8080`），**禁止用 mock 冒充**；**永远禁止 `CHOKIDAR_USEPOLLING=true`**
- 自然语言中输出路径时，路径前后各留一个空格
- 每次改代码前先 `git fetch` 并合并主干

## 10. 建议调用的技能

- **`10xdev`** — 本次工作全程在这套六阶段流程内。当前处于第 5 阶段（按方案实现）。注意其默认要求「基于 origin/master 开 worktree」已按上述理由偏离，worktree 已建好无需重开。
- **`interface-review`**（项目内技能，`full` 模式）— S8–S10 涉及前端后必须执行，是转 ACTIVE 的前置门禁（T-13）。
- **`diagnosing-bugs`** — 若 S5（EntityWriter 解耦）或 S8（Legado 接入）出现难定位的回归时使用。
- 不要调用 `Explore` / 通用搜索类子代理去重新摸插件系统的底 —— 现状调研已经做完并全部写进方案第 3 节，重复调研只会浪费上下文。

## 11. 参考文件清单

会话中重点读过、下一步大概率还要改的：

```
webserver/plugins/runtime/protocol.py          协议校验，152 行
webserver/plugins/runtime/book_sources.py      8 个书源 provider，_normalize() 是 SourceBook 的隐式构造器
webserver/plugins/runtime/enrichment.py        10 个 provider，_http_json 无 IP 校验（F-2），normalized_review() 是 Review 的隐式构造器
webserver/plugins/runtime/weread.py            横跨 4 个接口，query() 是协议外自建的类型化接口
webserver/plugins/runtime/builtin_capabilities.py  6 个壳插件
webserver/services/plugin_runtime.py           841 行，:535/:732 是与 weread 的耦合点（F-1）
webserver/services/weread_annotations.py       需拆为通用 AnnotationWriter + weread 身份策略
webserver/services/annotation_sync.py          sync 的现成基础
webserver/services/booksource/engine.py        Legado 引擎，6 个方法
webserver/handlers/plugins.py                  1002 行，混装三类职责
webserver/handlers/book.py:544-576             weread 元数据硬编码 33 行（F-5）
app/pages/admin/plugins/index.vue              1082 行，:727-744 是 7 个 manage_kind 分支
```

另有一份更早的架构审查报告（内容已被方案文档吸收，无需再读）：
` /private/tmp/claude-501/-Users-bytedance-github-talebook--worktrees-feat-plugins/f2f0575a-fd62-4c63-aed7-3e05c75923ea/scratchpad/plugin-architecture-review.html `
