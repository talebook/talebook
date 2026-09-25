# TB-199 焦点修复独立复核

结论：**Approve**。原七项、关闭后焦点丢失、同 CFI 多笔记标记清理均已关闭；本轮无新增 actionable interface findings。保留 Vuetify/MDI、四按钮、主从设置与统一入口，同一方案转 ACTIVE，父议题保持进行中，交付验收由 Mika 汇总。

## Scope and Coverage

模式：`interface-review full branch`，2026-09-14（Asia/Shanghai）。读取整个分支相对默认分支 merge-base 的增删两侧，另对比上轮审查 HEAD；未用最近一次提交代替完整范围。

| Field | Candle Reader PR #18 | Talebook PR #1036 |
| --- | --- | --- |
| 默认分支 | origin/main | origin/master |
| Merge-base | 3eadb5ab9555e87df93b4cf084c656a0cf3408c5 | db8688429c55ed5a5d1a40a227725b83d54ca3a9 |
| 实现 HEAD | 1d22c7a58fae6cf196a9238d50520a63c58750d6 | 05e387ee2fd7a74848a87818a8868613bb933a17 |
| 已提交 / 初始未提交 | 5 / 0 | 6 / 0 |
| 变更文件 / 排除后 | 30 / 17 | 29 / 9 |
| 排除 | 13 个 EPUB/测试 fixture | 3 个生成包、17 张截图 |

后续回写仅修改方案、交付/审查说明及代表截图；不修改产品代码。生成包虽不逐行作设计审查，已核对实际 HTTP 字节。

技术栈：Vue3、Vuetify、MDI、Vite library；真实 Docker Tornado/Calibre 宿主。规则来源：两仓 AGENTS/CLAUDE、Talebook app 规范、唯一方案、PR 描述和触发评论。使用仓库 interface-review、scope-resolution、removed-signals、better-interface 及六域技能；技能和 Chrome DevTools MCP 均可用。

展开四个未改直接消费者：src/main.js、BookReview.vue、BookComments.vue、AudiobookPlayer.vue；CandleReader、EpubReader 和宿主模板已在变更范围。深层用户中心、第三方 EPUB 引擎和无关全站页面未继续展开。本报告不声称整站审查或无障碍认证。

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | 112 项真实焦点检查；MCP Escape、Tab、AX 命名组/pressed；失效入口、遮罩、底部切换 | Clear |
| Layout | 402×874/DPR3 浅深设置、笔记、章评/书评、目录；四按钮及引用/编辑截图；完整 CSS diff | Clear；保留既有 320px 问题 |
| Writing | 三设置作用域、主关闭/工具栏关闭 CTA、加载/错误/空态互斥、统一标题 | Clear；原七项源码未退回 |
| Typography | 本轮真实两条同 CFI 内容/引用、正文编辑截图；上轮长 URL/书名证据及未变源码 | Clear；真机键盘未验 |
| Colors | 本轮浅深渲染；引用 on-surface/opacity1 未变；上轮实测 17.30:1 / 13.97:1 | Clear；对比度数值沿用上轮测量 |
| UI | 开关状态、Vuetify 焦点环、面板往返和离场时序、统一标题/刷新/分类；减少动态效果规则未变 | Clear；完整慢放动画未验 |

## Findings

No actionable interface findings in this change.

上轮 MEDIUM（Accessibility / Regression）关闭：`src/components/EpubReader.vue:664–677` 同步 Escape/遮罩关闭，最终 after-leave 恢复有效入口；`:684–699` 保留面板组触发上下文，兄弟面板离场不抢焦。此前 BODY → 下一 Tab IFRAME 的复现已不成立。

## 原七项及同 CFI

| 已确认项 | 本轮复核依据 | 状态 |
| --- | --- | --- |
| 引用对比度 HIGH | BookAnnotations.vue:55 的不透明 on-surface 未变；浅深真实列表截图一致 | Closed |
| 章段子开关误限书评 MEDIUM | 本书评论仅检查 notes_enabled，章评独立检查 comments_enabled；本轮完整 diff 无退回 | Closed |
| 主从层级 MEDIUM | MCP 设置布局：子项16px缩进，主项加重，偏好保留 | Closed |
| 分组语义 MEDIUM | MCP AX 外层“笔记设置”、三个命名group、pressed/disabled | Closed |
| 状态与关闭引导 MEDIUM | loading/error/empty/list 互斥源码未变；本轮真实工具栏关闭空态 CTA 进入设置 | Closed |
| 触屏尺寸 LOW | MCP设置按钮48px；底部四项100.5×56px。顶部听书44px源码未变，上轮prop注入渲染结果保留 | Closed |
| 重复标题/刷新 LOW | 笔记面板一个标题、一个刷新，“划线笔记”为静态分类；本轮截图 | Closed |

同 CFI 本轮重新实测：真实 `/read/8` 正常书、`/read/1` 缺目录书，white/grey × guest/login × 两书共8组。真实 DOM Range 触发 selectionchange，通过 UI 共保存16条笔记，未注入 selected_location、未 mock API、未直接写笔记数组。每组同 CFI 两条不同内容：刷新一个SVG → 主关闭零标记 → 关闭后刷新零 → 重开一个SVG，两条数据始终保留。登录实际8 POST/38 GET，游客零 annotations HTTP；pageerror0。完整响应/CFI/ID/状态见附件 real-cfi.json；保留原跨书与权限验收证据，不将此窄矩阵称全后端验收。

## 焦点矩阵与实际版本

独立脚本在真实 `/read/13`（彼得·潘）运行，使用独立未写笔记的书避免与同 CFI 数据矩阵相互影响。402×874/DPR3，white/grey × guest/login，各28项共112项，全部通过；Chrome150.0.7871.100，pageerror0。

- 笔记：Escape、关闭按钮 Enter、遮罩、底部同按钮关闭。
- 章评与书评：各 Escape、关闭按钮、遮罩；进入/返回笔记/前往设置期间焦点留在面板，无底部入口抢焦；最终关闭回原笔记入口。
- 设置及目录：直接打开后 Escape、遮罩、底部同按钮关闭；目录选择后回目录入口。
- 底部笔记→设置→关闭：焦点仍回该面板组最初的笔记入口；直接进入设置→关闭则回设置。失效/移除触发按钮回退笔记。
- MCP 另核验 `/read/8` 真实渲染、笔记 Escape、设置/更多关闭、浅深设置/笔记、AX、导航和设置尺寸。登录/游客完整矩阵由 Playwright 驱动同一真实宿主，不宣称每个矩阵步骤都经 MCP。

浏览器执行的 on_panel_after_leave 与修复一致；实际资源 URL 为 `v1.2.0-tb199.4`。ES、UMD、CSS 的 HTTP 字节逐一等于 HEAD 文件：

- ES SHA256 fcf5eea8544bbd469e3ba5a9a4dad7f7f584f31bef0c6e28edbcb202af9fdc61
- UMD f140836373ea7b4af0bf688a59763a31fe5c14df8b3e6215d2501a02525e1860
- CSS 5186644e77d6042cb83ea43fd29c212a271c71e23b93ea1d957b025dbb6b4b01

## Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| 底部笔记→设置的最终回焦 | 要求最终焦点改为设置 | 本轮请求明确保留面板组原入口；返回仍有效可见的笔记入口符合该约定，并未丢到BODY。最初断言误设为设置导致4次失败，核对约定后修正预期，最终完整重跑112项通过；如需按最后点击入口回焦可作为后续偏好调整 |
| 目录遮罩 | 首轮点击超时判定不能关闭 | 固定y=100落在高目录内容区，实际遮罩仍有可点区域；改用elementFromPoint找真实暴露区域后点击通过，未force点击 |
| 同 CFI 两条笔记 | 合并或删除记录 | 多个想法可以关联同一原文，仅合并渲染标记符合需求，数据需保留 |
| 顶部听书/皮肤风格 | 新增第五底部入口或更换UI库 | 四按钮与既有Vuetify/MDI是既定需求，焦点修复无需改变视觉系统 |

## Pre-existing

以下不归本次变更负责，不计入 verdict：

| Severity | Domain | Location | Issue |
| --- | --- | --- | --- |
| HIGH | Layout | Settings.vue 原字体/行距栅格 | 320px时既有裁切，上轮证据保留，本轮无相关改动 |
| HIGH | Accessibility | Settings.vue 原皮肤按钮 | 既有未命名图标按钮；本轮AX仍见 |
| HIGH | Accessibility | BookReview.vue / BookComments.vue 原输入框 | 既有输入label缺失；未由本次分支引入 |

## Verification

已完成：

- 两仓 `git fetch origin agent/talebook/e4804b22`，并分别 `git fetch origin main --no-tags` / `master --no-tags`；`git worktree add --detach ../*-focus-review origin/agent/talebook/e4804b22` 创建隔离渲染工作树。未 checkout/switch/stash 开发工作树。随后 merge-base、rev-list --count、diff --name-status / 完整 source diff、git status及PR正文核对，结果见scope.json。
- `node ../review-round2/review-tools/real-cfi.cjs`：退出0，8组通过。
- `node review-tools/focus.cjs`：112项记录通过，截图轮进程退出143，未将该退出码写成通过。随后 `NO_SCREENSHOTS=1 node review-tools/focus.cjs` 重跑全部交互与断言，退出0，112/112、pageerror0，日志及exit-code附后。首轮脚本定位/预期调整在上表说明。
- Chrome DevTools MCP：emulate、navigate_page、click、press_key、evaluate_script、take_snapshot、take_screenshot；实际页面及记录在附件 mcp-log.jsonl。
- `make check-design`：同一方案改名ACTIVE并回写后退出0，138 design document(s) passed。
- 本轮不修改产品源码，未重复上游67 E2E、22后端测试；明确引用开发在同一实现SHA的交付记录，不算UX自行重跑。

DeepSec：本轮新增1个本地复核脚本，使用工作区 deepsec-shield。0.2.0 / 来源 fff031fc01fb36b95348214c8ee359f6ede8aa8b，`deepsec shield scan review-tools --layer l1,l2 --include-tests --format json --output -`，1文件，L1/L2，退出0，stderr空。1 MEDIUM `sast_information_leakage_error_details` 命中 focus.cjs:13 的 `res.json()).err`，为客户端测试登录结果断言，无向服务端客户返回内部异常；判定误报并保留原始报告。产品仓本轮仅文档/截图，豁免重新产品扫描；沿用开发披露的Candle既有HIGH1、Talebook既有120发现，不称全仓安全通过。未启用Spear或远程LLM。

**Not verified / 保留限制**：真实社区仍被宿主 legacyCommunityResponse 空列表短路，review路由缺失/404，本轮章评/书评仅验证界面与焦点，不将隔离或空响应算真实社区加载/停止/恢复/持久化通过。真机Safari、VoiceOver、系统选区、软键盘、200%真实浏览器缩放、全皮肤、完整10%慢放动画、真实音频、深层用户中心/登录嵌套模态完整链路未验。加载/错误/长书名/音频prop的此前界面注入证据仍仅代表渲染，不代表真实API。快速连续打断动画未单独形成全矩阵，未由此推定缺陷。

## Verdict

**Approve** — 已声明的分支界面范围内无待处理HIGH/MEDIUM/LOW；社区/真机等验收限制保留，ACTIVE不等于父议题验收完成或允许直接合并。
