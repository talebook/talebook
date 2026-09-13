# TB-199 修复后 full interface-review

本轮开发自审结论 **Approve（限定下述已验证范围）**。此前 UX 的 1 HIGH、4 MEDIUM、2 LOW 均已修复；仍须 UX 独立复核，唯一方案保持 WIP，父议题保持进行中。本报告不代替真实社区服务验收。

## Scope and Coverage

模式为 `interface-review full branch`，分别审查两个仓库相对默认分支的全部分支变更，包含已有提交和本轮未提交修改。范围在提交前解析；最终 Candle 修复提交为 `8cf246c`，Talebook 同步产物的 ES SHA256 为 `40f77f98627fd99a0ff725d6ad9f12241a6b0af7fd609b9f294a82b401215b0c`。最终完整提交见配套交付记录。

| 字段 | Candle Reader | Talebook |
| --- | --- | --- |
| Target | full branch | full branch |
| 默认分支 | origin/main | origin/master |
| Merge-base | 3eadb5ab9555e87df93b4cf084c656a0cf3408c5 | db8688429c55ed5a5d1a40a227725b83d54ca3a9 |
| 修复前 HEAD | aaa3105519596a1bfdf14c15f4b16fd9c49830ba | 92c05ee26f269b5bd790816c65c8b31ac1f58b1d |
| 审查范围 | 3 个已有提交 + 8 个本轮修改/新增文件 | 3 个已有提交 + 6 个本轮修改文件 |
| 文件数（报告与新截图加入前） | 共 29，排除后 16 | 共 17，排除后 6 |
| 排除逐行 UI 审查 | 13 个 EPUB/测试夹具文件 | 3 个 ES/UMD/CSS 生成物、8 张已有截图 |

技术栈：Vue 3、Vuetify、Vite 库模式，Talebook Tornado/Calibre 真实宿主。依据：两仓库 AGENTS.md、Candle CLAUDE.md、唯一 WIP、PR #18/#1036 及本轮 Mika/UX/QA 评论。加载仓库 `.agents/skills/interface-review/` 的 SKILL、scope-resolution、removed-signals，交由 `better-interface` 的 full 规则，并逐项使用 better-accessibility/layout/writing/typography/colors/ui 六个技能及相关 ARIA、键盘、对比度引用规则。

读取改动两侧：Talebook 外挂按钮、iframe 面板、编辑框、选区处理删除后，由阅读器自身组件替代；关闭、返回、定位、错误反馈及减少动态效果相关实现仍有对应路径。新回调通过根组件传入，缺目录回退继续保留真实 Range CFI。直接展开 4 个未改动消费者：`src/main.js`、`BookReview.vue`、`BookComments.vue`、`AudiobookPlayer.vue`；根组件和 Talebook 模板本已在范围内。未继续展开无关页面及这四个消费者的深层依赖；音频播放服务不在本次渲染验证范围。生成物虽不作源码逐行 UI 审查，但实际 HTTP 加载和校验纳入检查。

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | 真实页面完整 AX 树；fieldset/legend、命名 group、pressed/disabled；主开关点击、Enter/Tab 焦点、空态设置 CTA；44px 命中区域 | Clear；真机读屏未验证 |
| Layout | 402×874 DPR3 浅/深色设置、统一入口、底部四按钮；320px 设置/笔记；一层标题和独立返回路径 | Clear；旧 320px 字体栅格问题另列 |
| Writing | 总/子开关范围、工具栏关闭空态、错误与空态互斥、单一刷新入口 | Clear |
| Typography | 引用、正文及仅章节定位提示的层级；多行文本、窄屏换行；沿用现有字体 | Clear |
| Colors | white/grey 主题引用的实际 DOM 颜色及 opacity；禁用状态同时由原生 disabled 表达 | Clear；未扩展到全部皮肤 |
| UI | 既有 MDI/Vuetify 体系、单一标题/刷新、加载/错误/空/禁用/焦点/有数据状态；减少动态效果 CSS 保留 | Clear；完整动画慢放及减少动态效果运行态未验证 |

## Findings

No actionable interface findings in this change.

原七项整改核对（原状态均为 Introduced，已关闭）：

| 原严重度 | 位置 | 修复和验证 |
| --- | --- | --- |
| HIGH | `src/components/BookAnnotations.vue:56` | 引用改用不透明 on-surface token，opacity=1；white 黑色对 #e9e9e9 约 17.30:1，grey 白色对 #2c2c2c 约 13.97:1。对应 contrast JSON、浅/深色 populated 截图及两项自动回归。 |
| MEDIUM | `src/components/EpubReader.vue:99`、书评方法 | 本书评论仅由总开关控制；章段子开关只控制 summary/list、章评按钮及段评。子开关关闭仍能进入及提交书评（E2E mock）；总开关关闭使迟到读/写响应失效。真实宿主只验证入口，持久化限制见下。 |
| MEDIUM | `src/components/Settings.vue:119` | 原生 fieldset 分组，总开关加字重，两个子选项缩进 16px；总关后禁用且保留 pressed 偏好。浅/深色截图及几何数据确认。 |
| MEDIUM | `src/components/Settings.vue:124` | 每个开关按钮组 role=group，aria-labelledby 指向可见选项标签；完整 AX 树包含三个命名组及笔记设置外层组。 |
| MEDIUM | `src/components/BookAnnotations.vue:3` | loading/error/empty/list 互斥；工具栏关闭空态明确解释原因，并能点击前往设置；失败不再同时显示空态。故障注入截图及自动回归确认。 |
| LOW | `src/components/Settings.vue`、`EpubReader.vue:14` | 开关按钮和听书入口高度至少 44px；实际听书按钮 81.75×44，开关按钮宽 64.75–65.75、高 48px；听书仅注入可用性 prop 测量，不声称真实音频通过。 |
| LOW | `src/components/EpubReader.vue:89` | 一个“笔记”标题、一个刷新按钮；“划线笔记”变为类别文字，移除无意义的重复刷新操作。 |

另在真实重复写入回归中修复同 CFI 多记录的残留标记：按 CFI 共用一个 EPUB 标记，保留所有数据。缺目录两种夹具均覆盖“双记录 → 刷新一个标记 → 关闭零标记 → 重开一个标记”，真实 API 多记录库也通过。该正确性修复详见代码与验收 JSON，不列作新的界面审查发现。

## Considered but Rejected

| 位置 | 候选 | 不采纳原因 |
| --- | --- | --- |
| 设置的开启/关闭 | 改成全新 switch 视觉组件 | 命名 group、原生按钮、pressed 和键盘行为已可识别；保留现有 Vuetify 按钮组习惯。 |
| 统一入口的本书评论 | 随章段子开关禁用 | 与选项文字和 Mika 明确范围不符；只受总开关控制。 |
| 工具栏关闭的已有笔记 | 隐藏已有列表 | 子选项控制选区动作，不应影响读取和定位已有数据。 |
| 同 CFI 多条记录 | 删除重复数据 | 数据可能是同一段的不同想法；仅合并渲染标记，保留每条记录。 |

## Pre-existing（不计入本次 verdict）

| Severity | Domain | Location | Issue |
| --- | --- | --- | --- |
| HIGH | Layout | `Settings.vue` 字体/行距/字距旧栅格 | 320px 下数值与按钮拥挤、默认按钮局部裁切；位于未改行，基线已有；本轮新增笔记设置行可用。 |
| HIGH | Accessibility | `Settings.vue` 四个旧皮肤图标按钮 | 无稳定可访问名称，基线已有，未改。 |
| HIGH | Accessibility | `BookReview.vue`、`BookComments.vue` 旧输入框 | 仅 placeholder，缺持久标签；基线已有，未改。 |

## Verification

- Git 范围检查：`git -C candle-reader fetch origin main --no-tags`、`git -C talebook fetch origin master --no-tags`（写入 .git）；`git merge-base origin/<default> HEAD`、`git rev-list --count BASE..HEAD`、`git diff BASE --name-only`、`git diff BASE`、`git ls-files --others --exclude-standard`、`git status --short`。审查包含上述 base 到工作树的两侧差异，并复核最终修复差异。排除及文件清单见 scope.json。
- PR 状态：`gh pr view 18 --repo talebook/candle-reader --json ...` 和 Talebook #1036 对应命令，均 OPEN；读取实际标题/正文/head。未合并或发布。
- 渲染隔离：`git -C talebook worktree add --detach ../review-talebook 92c05ee26f269b5bd790816c65c8b31ac1f58b1d`，向这个任务自有工作树应用本轮 diff；它的源码以只读 /source 挂载 Docker，复制到容器 /work。后续只同步该隔离副本及容器的发行包。没有为审查 checkout/stash 开发源码；实现修改是 Mika 已授权的修复。worktree add/remove 会写 .git，临时环境交付前清理。
- Chrome DevTools MCP 已发现并执行：`review-tools/mcp-client.mjs` 连接配置的 chrome-devtools-mcp，独立 profile；`emulate`、`navigate_page`、`evaluate_script`、`click`、`press_key`、`take_snapshot`、`take_screenshot`。真实 `/read/8`、Chrome 150、402×874 DPR3；white/grey 两主题，补查 320px。所有请求记录在 MCP 日志；页面可用、AX 和截图已人工核对。一次 reload 的 load 事件超时，随后检测 reader.loading=false 并完成截图；未把 timeout 作为通过。
- 引用样本、错误/加载状态、听书 prop 为明确的界面注入；真实读写采用独立的 `scripts/tb199_acceptance.cjs`，不混作 API 证据。MCP 设置截图实际点击总/子开关；通过 Enter 开启、Tab 移动焦点；点击空态 CTA 到设置成功。
- `npm run lint`、`npm run build` 通过；`E2E_PORT=5019 npm run test:e2e -- --workers=1` 最终 63 passed。先前新书评测试曾早于章节就绪提交，补充等待真实 current_toc/book_id 后全套通过；未靠加重试掩盖失败。
- Docker/Calibre `python3 -m pytest tests/test_annotations.py -q`：22 passed。真实浅/深色各 88 检查点：故障书1/正常书8 × 登录/游客；8组合刷新、写入读回、跨书13隔离、关闭动作与标记、重开恢复。共 8 POST、96 GET，无 pageerror；浏览器 Chromium 148。底部顺序均为目录、夜晚/白天、笔记、设置。
- 实际 ES/UMD/CSS HTTP 字节与当前构建、Talebook 文件一致，缓存标识 `v1.2.0-tb199.3`；见 bundle-hashes.json。最终 CSS 同步后再刷新 MCP 核对主截图；API 矩阵采用同一最终 ES，测试不把界面样本算真实写入。
- `make -C talebook check-design`：WIP 合并门禁按要求保留；详细退出结果见交付记录。DeepSec 是独立的安全检查，见脱敏报告，不用于替代界面审查。

**Not verified：**真机 Safari、系统选区手柄/软键盘/VoiceOver、200% 浏览器缩放、所有皮肤、完整动画慢放及减少动态效果运行态、实际音频播放。真实社区链路沿用 QA 限制：宿主 legacyCommunityResponse 返回空列表，真实 review 路由未实现/404；只证明入口可用与 mock 请求范围，不能证明社区读写持久化。annotations API 登录写入与游客 localStorage 已独立实测。

## Verdict

Approve
