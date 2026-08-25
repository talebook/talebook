# Handoff — Talebook 插件能力接口重构

最后更新：2026-08-25
接手后请先读方案文档，本文件只记录方案里没有的会话状态。

---

## 1. 当前工作位置

```
/Users/bytedance/github/talebook/.claude/worktrees/plugin-capability-interfaces
分支：refactor/20260824-plugin-capability-interfaces
基线：origin/feat/plugins @ 8c3601e8
```

不要在 ` /Users/bytedance/github/talebook/.worktrees/feat-plugins ` 上改代码——那是被审查的分支，已恢复干净状态。

插件系统只存在于 `feat/plugins`，**不在 master 上**，所以本次基线是 `origin/feat/plugins` 而非 `origin/master`（对 10xdev 技能默认规则的有意偏离）。

## 2. 方案文档（唯一事实来源）

```
design/webserver/20260824-plugin-capability-interfaces.wip.html
```

状态 WIP，已提交在本分支。用户已明确说「开工吧」，方案审查确认阶段已通过。

方案里已有的内容不要在别处重复：11 项缺陷 F-1…F-12、7 个能力接口签名、read/write/sync 三模式、按 Legado 实测校准的书源接口、12 步迁移路径 S1–S12、13 条决策 D-1…D-13、14 项测试 T-1…T-14、风险 R1–R4，以及第 10 节的完整执行记录。

需要改方案时**更新这一份**，不要新建。

## 3. 已完成：S1–S7、S9–S12 与 D-7

全部已提交并推送（截至 `7e4096db`）。测试从基线 966 增至 **1015**，新增 49 个用例，全程零回归。注册 provider 从 26 增至 32。

| 步骤 | 内容 | 关键提交 |
|---|---|---|
| S1 | 通用端点透传 `input_data`，删除 weread 特判 | `9eb08919` |
| S2 | 三族 provider 统一走 `SafeHttpClient` | `d1c97137` |
| S3 | `PluginProvider` Protocol + `PluginContext` + 注册期契约检查 | `1c12d5f3` |
| S4 | `connection_owners` 必填、`config_schema` 落地校验、未知键拒绝 | `cb2bf07c` |
| S5 | EntityWriter 解耦，运行时不再认识任何插件 | `0b61ff77` |
| S6 | `connections_for` / `read_many`，`book.py` 去硬编码 | `ce763cde` |
| S7 | `PluginConnection.role` + 迁移回填 | `28d09b78` |
| S9 | 改书审计 + `trigger` 动态配置 + 自动修复编码 | `ef8796f9` |
| S11 | 拆分 handler（1002 行 → 417/235/476/25） | `18aa7a7e` |
| S10 | `manage_route` + `status()` 钩子，前后端去硬编码 | `dff230c9` |
| S12 | 回写 `document/PluginGuide.md` 与方案测试结果 | `739cccd4` |
| D-7 | 设备推送纳入插件中心，`plugins/sending/` → `plugins/push/` | `7e4096db` |

## 4. 未完成：S8（书源接口）

**这是剩下的唯一一大块。** 需要：

1. 把 Legado 从 `services/booksource/` 接入插件系统（`BookSourceEngine` 的 6 个方法映射到 `SourceProvider`）
2. 回套 8 个 OPDS 族书源
3. 把 `SaveOnlineBookService._do_save()` 提为通用 `assemble_from_chapters`
4. 收敛 `/api/network/*` 12 条路由与对应前端

方案第 9 节风险 R3 建议拆成「先接入插件系统、保留旧路由」与「再删旧路由」两个独立 PR。方案第 5 节已按 Legado 与微信读书的**实测签名**校准过接口，直接照着实现即可，注意三处修正（`get_toc` 收 detail 而非 id、`get_chapter` 收 `SourceChapter`、identity 是不透明 URL）。

T-6（执行期 scope 强制）、T-7（`has_more` 续拉）、T-9（Legado 端到端）依赖 S8，一并未实现。

## 5. 转 ACTIVE 的前置门禁

**在 S8 完成前，本方案不得转为 ACTIVE。** 还差：

- **T-13 界面审查**：本方案属跨模块大型功能且影响前端，按 `AGENTS.md` 必须执行 `interface-review` 的 `full` 模式，出现 HIGH/MEDIUM 不得转 ACTIVE
- **T-14 真实后端体验**：Docker 后端 + Chrome DevTools MCP，桌面与移动、明暗主题

## 6. 环境与踩坑

**本地没有 Python 测试环境**（缺 `calibre`），必须走 Docker 镜像 `talebook/test:latest`。worktree 隔离会拒绝含 `$PWD` 展开的复杂命令，用绝对路径直写：

```
docker run --rm -v /Users/bytedance/github/talebook/.claude/worktrees/plugin-capability-interfaces:/w -w /w talebook/test pytest tests -q
```

**前端**：`app/` 下已 `npm install`。`npm run lint` 目前 0 errors / 490 warnings（warnings 为存量）。

**E2E 已知失败**：`test/e2e/plugins.spec.ts` 9 个用例全部失败。已用 `git stash` 回退到改动前对比确认，**基线上同样全挂，是预先存在的失败**，不要误判为本次引入。跑 E2E 需要同时起 mock server（`node test/mock-server.js`）和 dev server（`API_URL=http://127.0.0.1:8080 npx nuxt dev --port 3000 --host 127.0.0.1`）。

**`make check-design` 必然失败**——只要存在 `.wip.html` 就会报「WIP design document cannot be merged」，这是合并门禁，属预期。要确认的是**除该条外没有其他错误**。

**git stash 有坑**：本仓库 stash 栈与其他 worktree 共享。本次 `git stash apply <sha>` 曾因 `test-results/` 产物冲突而静默只恢复了部分文件，drop 之后靠对象库里的 SHA 才找回。**优先用临时 WIP 提交而非 stash**；确需 stash 时先清掉 `app/test-results/`。

## 7. 会话中用户已定的命名与语义（勿擅自更改）

- 三层命名：能力接口 `XxxProvider`（Protocol）／共享实现基类 `XxxBase`／具体插件 `XxxPlugin`
- 接口名：`SourceProvider`、`TransformProvider`、`PushProvider`、`MetadataProvider`、`AnnotationProvider`、`ReviewProvider`、`ExtraFeatureProvider`
- 模式 `read` / `write` / `sync`，判据是**插件行为的副作用方向**
  - `download`、`list_annotations` 都是 **read**（插件只从远端读，写库的是平台）
  - `write` 只有修改书籍正文一类
  - `sync` 是往外部服务写
- 取书：manifest 声明 `download_mode`（`single_book` / `by_chapters` / `none`），方法名 `download` / `get_toc` / `get_chapter`，**不用 `acquire`**
- `integrations` 下三个 capability 合并为 `integrations.tool`
- `TransformProvider` 提供 `trigger` 动态配置（`manual` 默认 / `auto`）
- 异常类改名 `ProviderError` → `UpstreamError` 系列（**尚未执行**，属 S8 之后的清理）
- 设备推送：`plugins/push/`，插件 id 为 `talebook.push.<device>`，连接为 user 级

## 8. 仍待用户拍板

1. **PR 拆分粒度**：当前已推 13 个提交在一条分支上，是否需要拆成多个 PR
2. **R3**：Legado 的 12 条旧路由能否接受「先并存一个版本再删」的过渡期

（D-7 已定：设备推送纳入插件中心，已实现。）

## 9. 建议调用的技能

- **`10xdev`** — 全程在这套六阶段流程内，当前处于第 5 阶段（按方案实现）。worktree 已建好，无需重开。
- **`interface-review`**（`full` 模式）— S8 完成后必须执行，是转 ACTIVE 的前置门禁。
- 不要派子代理重新摸插件系统的底——现状调研已全部写进方案第 3 节。

## 10. 本次新增的关键文件

```
webserver/plugins/runtime/interfaces.py    PluginContext / PluginProvider / TransformProvider / trigger
webserver/services/plugin_writers.py       EntityWriter 注册表，来源身份由 plugin_key 推导
webserver/services/annotation_writer.py    原 weread_annotations.py，已通用化
webserver/services/book_transform.py       新书入库后的自动编码修复
webserver/handlers/plugins_common.py       共用请求体解析与错误封装
webserver/handlers/plugin_weread.py        微信读书专属接口
webserver/handlers/plugin_booktools.py     三个文本工具的 HTTP 编排
webserver/plugins/push/devices.py          原 plugins/sending/uploader.py，6 个设备上传器
webserver/plugins/runtime/push.py          6 个 talebook.push.* 插件与设备路由表

tests/test_plugin_contract.py              契约检查
tests/test_plugin_protocol_tightening.py   协议收口
tests/test_plugin_entity_writers.py        F-1 回归护栏
tests/test_plugin_capability_lookup.py     按能力查询 + 并发约束
tests/test_plugin_connection_role.py       role 查询键与迁移
tests/test_book_auto_transform.py          自动触发的安全默认
```
