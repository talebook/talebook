# TB-199 焦点修复后 full interface-review

开发自审完成；待 UX 独立复核，唯一方案继续 WIP，父议题继续进行中。当前报告取代上轮开发自审结论，不覆盖或改写 UX 的历史复现记录。

## Scope and Coverage

模式：`interface-review full branch`，覆盖两个仓库默认分支 merge-base 到整个工作分支及本轮未提交修改。范围在报告和新增截图加入前解析；不是仅审查最新焦点 diff。

| Field | Candle Reader | Talebook |
| --- | --- | --- |
| Target | full branch | full branch |
| Base ref / merge-base | origin/main / 3eadb5ab9555e87df93b4cf084c656a0cf3408c5 | origin/master / db8688429c55ed5a5d1a40a227725b83d54ca3a9 |
| 审查起点 HEAD | 8cf246ce993a89e3b3f0ce23d23243907ed8ea2a | 3a0e1bcf2422056f0bb7fab1d88b8806fc85b31f |
| Commits / 本轮工作树 | 4 个已有提交 + 2 个修改/新增文件 | 5 个已有提交 + 5 个 tracked 修改及 1 个新增脚本 |
| Files in scope | 30，排除后 17 | 26，排除后 9 |
| Excluded | 13 个 EPUB/测试夹具 | 3 个生成 bundle、14 张截图 |
| 最终实现 | 1d22c7a58fae6cf196a9238d50520a63c58750d6 | ES SHA256 fcf5eea8544bbd469e3ba5a9a4dad7f7f584f31bef0c6e28edbcb202af9fdc61；最终提交见交付 manifest |

技术栈为 Vue 3 / Vuetify / MDI / Vite 库构建，Talebook Tornado / Calibre 宿主。依据两仓 AGENTS.md、Candle CLAUDE.md、唯一 WIP、现有 PR #18/#1036 和 Mika/UX/QA 评论。实际使用 `talebook/.agents/skills/interface-review/SKILL.md`、scope-resolution、removed-signals、better-interface 及 accessibility/layout/writing/typography/colors/ui 六域技能。

完整 diff 两侧包括宿主外挂选区、笔记按钮和面板删除及 Candle 组件替代；此次重点检查删除旧宿主 `toggle.focus()` 后的等价恢复路径。直接展开四个未改消费者：`src/main.js`、`BookReview.vue`、`BookComments.vue`、`AudiobookPlayer.vue`，根组件/宿主模板本已在范围内。没有继续展开四个消费者的深层依赖及无关页面。生成物不逐行作 UI 源码审查，但 HTTP 字节与源码构建一致性已检查。

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | 64 项真实宿主焦点记录；Escape/Enter/Tab、关闭按钮、外部点击；MCP AX 树、三个命名设置组、pressed/disabled；入口失效 fallback 自动回归 | Clear；旧控件问题及真机读屏限制另列 |
| Layout | 402×874 DPR3 浅/深色，统一笔记/章评/书评/设置；320px 设置和笔记，底部固定四入口 | Clear；320px 旧字体栅格问题另列 |
| Writing | 总开关与章段子开关范围；加载/错误/空态互斥、关闭工具栏的设置 CTA、单一刷新入口 | Clear |
| Typography | 长引用、多行笔记和仅章节定位；使用既有字号与行高；正文可换行 | Clear |
| Colors | 当前 white 引用黑色/#e9e9e9、grey 白色/#2c2c2c，opacity=1，约17.30/13.97:1；关闭后可见焦点框，非仅颜色区分禁用 | Clear；未扩展全皮肤 |
| UI | 沿用 Vuetify/MDI；空/加载/错误/有数据/禁用/焦点态；面板离场与切换时序，保留 reduced-motion CSS | Clear；本轮未重测完整动画慢放/系统减少动态效果 |

## Findings

No actionable interface findings in this change.

本轮关闭 UX 的 **MEDIUM / Accessibility / Regression**：`src/components/EpubReader.vue:664` 开始统一处理 model 更新和 after-leave，`set_menu` 保留有效外部入口；仅最后一个面板关闭后恢复，已有其它面板或登录/编辑等模态打开时不抢焦。入口断开、禁用或处于 overlay/inert 时采用有效底部入口。设置即时保存，移除 persistent 以支持 Escape。针对性回归在旧版本上确实失败，修复后通过。

原七项的代码继续保留：引用对比度、书评仅受总开关控制、子项16px缩进、命名组、状态互斥和可操作空态、44px以上触控目标、去重标题/刷新。本轮全量67项 E2E（含原 notes-review 与 missing-toc）再次通过。当前 MCP 重新检查设置/状态/对比度；实际社区写入仍不可据此认定。同 CFI 共享标记修复未改，缺目录和重复 CFI 自动回归通过；前次 UX 的8组真实写入证据仍保留，本轮没有重复制造真实写入记录。

## Considered but Rejected

| Location | Candidate | Rejected because |
| --- | --- | --- |
| EpubReader 面板组 | 每次 after-leave 都回到笔记 | 会让章评/书评/设置切换抢焦；仅最终关闭恢复原始入口 |
| EpubReader 设置面板 | 保留 persistent 以避免丢失设置 | 设置即时保存；阻止 Escape 无必要，直接设置入口现在也正确恢复 |
| BookAnnotations 引用 | 长引用省略视为正文丢失 | 列表为引用摘要，正文笔记完整换行，CFI 记录有返回正文路径；未删除数据 |
| 章段子选项 | 连带禁用本书评论 | 不符合选项文字与已确认范围；书评只受总开关控制 |

## Pre-existing

以下在基线和 UX 上轮报告已确认，不计入本次变更 verdict；未将其扩展为全应用整改。

| Severity | Domain | Location | Issue |
| --- | --- | --- | --- |
| HIGH | Layout | Settings.vue 旧字体/行距/字距栅格 | 320px 挤压/裁切，新增笔记设置可用 |
| HIGH | Accessibility | Settings.vue 四个旧皮肤图标按钮 | 缺稳定可访问名称 |
| HIGH | Accessibility | BookReview.vue / BookComments.vue 旧输入框 | 仅 placeholder，缺持久标签 |

## Verification

- 范围：`git -C candle-reader fetch origin main --no-tags`、`git -C talebook fetch origin master --no-tags`；各仓 `git merge-base origin/<default> HEAD`、`git rev-list --count BASE..HEAD`、`git diff BASE --name-only`、`git diff BASE`、`git ls-files --others --exclude-standard`、`git status --short`。fetch 写 .git，scope.json 保留范围清单，完整 diff 已保存。
- PR：`gh pr view 18 --repo talebook/candle-reader --json number,state,title,body,headRefName,headRefOid,url` 及 Talebook #1036 对应查询，均 OPEN；交付时以 API 更新正文并读回 head，不合并、不等待外部 CI。
- 隔离渲染：`git -C talebook worktree add --detach ../focus-talebook 3a0e1bcf2422056f0bb7fab1d88b8806fc85b31f`，向任务自有副本应用本轮 tracked diff；Docker `tb199-focus` 只读挂载此源码，复制到容器 /work 后运行 `scripts/tb199_acceptance_server.py`。审查没有 checkout/stash 原工作树。worktree add/remove 写 .git；产品实现、提交和推送是已授权的实现步骤，与只读审查分开。
- MCP：`node focus-tools/mcp-client.mjs` 连接 Chrome DevTools MCP，独立 profile/context；真实 `/read/8`，使用 emulate、click、press_key、evaluate_script、take_snapshot、take_screenshot。浅色 Escape 后 activeElement 为 BUTTON/笔记；深色关闭按钮同样恢复；章评切换焦点留在 active overlay。64 项独立真实测试提供完整四组合矩阵。MCP 日志、AX、截图一并附上。
- MCP 状态样本：320px loading/error、402px white/grey 长笔记、总关/子项禁用为明确的状态注入，仅用于 UI 呈现。当前引用对比度读自实际计算样式；320px 新设置按钮高48px，页面 scrollWidth=innerWidth=320。一次错误的 `on_set_theme` 调用失败，改用实际 `apply_theme` 后重拍并读取白色计算样式；失败调用保留日志，不作为通过。
- `npm ci`、`npm run lint`、`npm run build` 通过；`E2E_PORT=5019 npm run test:e2e -- --workers=1`：**67 passed**。新增 `tests/e2e/panel-focus.spec.js` 四组合在关闭/切换后等待500ms，包含下一次Tab、失效触发器 fallback；组件测试使用 mock，与真实宿主证据分开。
- `NODE_PATH="$PWD/candle-reader/node_modules" TB199_EVIDENCE="$PWD/evidence-focus" node talebook/scripts/tb199_focus.cjs`：**64 passed，pageerrors=0**，Chromium148.0.7778.96。真实登录或游客，实际 API callback/localStorage 源检查；未 mock API，未注入焦点或保存记录。全量键盘操作/结果/截图逐项列在 focus-results.json。
- Docker/Calibre `python3 -m pytest tests/test_annotations.py -q`：**22 passed**。实际 ES/UMD/CSS 与 dist、Talebook文件、HTTP 三方 SHA256 一致，缓存 `v1.2.0-tb199.4`，详见 bundle-hashes.json。
- `git diff --check` 两仓通过。`make -C talebook check-design` 保留 WIP 不可合并门禁，交付记录附真实退出码。DeepSec 是独立安全检查，见交付报告及脱敏结果，不替代界面审查。

**Not verified：**真实社区链路被 `legacyCommunityResponse` 空列表短路，review 后端路由缺失/404；入口与 mock 写入不可证明真实社区持久化。此次不重新主张 API 写入矩阵；继承先前 QA/UX 已验证的 annotations 写入证据。真机 Safari、VoiceOver、系统选区/软键盘、200%真实缩放、全皮肤、完整动画和实际音频未验证。登录/用户中心/主题选择等嵌套模态只检查不抢焦的代码守卫，未作新的完整键盘链路验收。

## Verdict

Approve
