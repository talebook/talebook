# TB-199 七项 UX 修复交付

七项问题已修复，完整分支界面自审 Approve；仍等待 UX 独立复核，唯一方案保持 WIP，父议题保持进行中。另修复同 CFI 多条笔记导致关闭后残留标记的问题。

版本：Candle Reader `8cf246ce993a89e3b3f0ce23d23243907ed8ea2a`；Talebook 使用同一构建并更新缓存标识 `v1.2.0-tb199.3`。最终两仓库提交和 PR 链接见本交付的版本 JSON 与议题评论。ES/UMD/CSS 三份实际 HTTP 响应均与构建文件相同，完整 SHA256 见 bundle-hashes.json。

## 验证结果与复现

- `npm run lint`、`npm run build`：通过。
- `E2E_PORT=5019 npm run test:e2e -- --workers=1`：最终 **63 passed**。新增六项 UX/语义回归、更新开关组合和错误状态断言；两项缺目录用例增加同 CFI 双记录测试。
- Docker 镜像 `talebook:tb214-revision-tests`，复制只读源码到隔离 /work 后 `python3 -m pytest tests/test_annotations.py -q`：**22 passed**。
- 使用 `scripts/tb199_acceptance_server.py` 的独立测试库，运行 `NODE_PATH=<candle-reader/node_modules> TB199_EVIDENCE=<证据目录> [TB199_THEME=grey] node talebook/scripts/tb199_acceptance.cjs`。默认 white；另运行 grey。真实登录会话、真实 `/read/` 模板、真实 annotations GET/POST，无 API mock。按脚本要求使用私有测试凭据文件，不随附件交付。
- **white/grey 各 88 个检查点通过，共 176 项**；各自 4 POST、48 GET，合计 **8 POST、96 GET**；无 pageerror。每个 POST 返回记录均能在重新加载后的 GET 记录中按 id/CFI 对应；游客没有 annotations HTTP 请求，数据来自本地存储。
- 402×874、DPR3，实际 PNG 1206×2622。真实 API 矩阵浏览器 Chromium **148.0.7778.96**；Chrome DevTools MCP 渲染审查为 **150**。两者明确区分，不称真机测试。
- `make check-design` 退出 **2**，唯一错误：`design/app/20260904-candle-reader-annotations.wip.html` 仍为 WIP，不能合并。按 Mika 要求保留，待 UX 复核；不是已通过合并门禁。

API 证据分为 real-light/real-dark，两份 acceptance.json 中每项包含操作名称、book/mode、结果状态和对应截图名。以下前缀均覆盖 `missing-login`、`missing-guest`、`normal-login`、`normal-guest`，每个主题各四种路径。

| 操作 | 结果 | 截图后缀 |
| --- | --- | --- |
| 在真实 EPUB 中设置 DOM Range，触发 selectionchange | 真实 CFI/引用保留，一个工具栏位于视口内 | 01-toolbar |
| 点击笔记、输入、保存；另保存划线 | 登录实际 API 写入；游客本地保存 | 02-saved、02b-highlight |
| 重新打开 /read/ 当前书 | 内容读回；登录无本地副本，游客从 localStorage 恢复 | 03-refresh |
| 打开 book13 | 本书笔记列表为空，其他书数据不混入 | 04-other-book |
| 返回原书并定位已存 CFI | 原记录及标记仍可用 | 05-mark |
| 关闭总开关并重新选文字 | 子偏好保留，选区工具栏隐藏，SVG 标记为零 | 06-disabled-settings、07-disabled-selection |
| 重开总开关、打开笔记 | 标记和数据恢复；同 CFI 的多记录仅渲染一个标记 | 08-reenabled-mark、09-reenabled-data |
| 8 种总/子开关组合并刷新 | 偏好持久化，选区动作遵循组合，四入口顺序不变 | settings-true/false-true/false-true/false |
| 统一入口进入章评、返回、进入本书评论 | 访问路径保留；社区内容为空由宿主限制导致 | unified-notes、chapter-comments、book-comments |
| 关闭面板 | 底部固定目录、夜晚/白天、笔记、设置 | bottom-menu |

独立 MCP 证据覆盖设置浅/深色、禁用、键盘焦点、命名组、统一入口、空/加载/错误/有数据、听书 44px、320px。`notes-populated-*` 明确使用界面样本；错误/加载和音频可用性为状态注入，不是 API 证据。原七项的操作与结果见完整 interface-review 报告。

## DeepSec 最终结果

采用 `deepsec-shield` 技能，仅本地 Shield L1/L2。DeepSec **0.2.0**，来源 **fff031fc01fb36b95348214c8ee359f6ede8aa8b**；版本由 Python 包元数据确认，CLI 不支持 `--version`。

命令：`/opt/deepsec/fff031fc01fb36b95348214c8ee359f6ede8aa8b/venv/bin/deepsec shield scan . --layer l1,l2 --include-tests --format json --output -`。分别在两仓库和 review-tools 执行，stdout 保存 `.deepsec/deepsec-report.json`，另保存退出码和 stderr。Vue 脚本不修改内容提取后，使用同一命令把 `.` 换成 `.deepsec/<组件>.script.js` 扫描。覆盖分支已提交修改、本轮测试/脚本及相关模块；范围内无外向符号链接。

| 范围 | 文件数 | 退出码 | Findings |
| --- | --- | --- | --- |
| Candle 全仓，含测试 | 32 | 2 | 1 HIGH：既有 epub.js CSS innerHTML |
| Talebook 全仓，含测试/发行 JS | 521 | 2 | 120：32 CRITICAL、67 HIGH、21 MEDIUM，既有告警 |
| review-tools MCP 辅助脚本 | 1 | 0 | 0 |
| EpubReader / Settings / BookAnnotations / CandleReader script | 每项 1 | 每项 0 | 每项 0 |

两份退出 2 均有完整 L1/L2 非零文件报告，属于安全发现，不是扫描参数失败。按相对文件、规则、严重度比较上一轮报告，没有新增告警；最终源码/测试修复后重新扫描。脱敏附件保留相对位置/规则/严重度，移除源码片段及绝对路径。

本轮 UI 的 HIGH 是引用对比度，已通过 token 修复；不与 DeepSec 的既有 HIGH 混淆。此前关联章评计数的 innerHTML 已改为 textContent，恶意标记计数回归仍通过。发行 ES 的三处 DOM/CSS 警告及 UMD 三份对应点为 Vue 内部 patch/编译静态模板、Vuetify 主题 CSS；与上一轮相同，未通过修改生成物消警。epub.js `public/js/epub-v0.3.88.js:7772` 为既有样式注入，仍保留告警。Talebook 其余 SQL/命令/配置等既有规则发现未在这轮无关改动中修复，不能认定全仓安全通过。

限制：目录扫描不支持 Vue 模板、HTML、CSS、XML；提取 script 只补充脚本覆盖，不能覆盖模板安全。界面/DOM 人工检查与 MCP 是补充，不等于安全扫描完整覆盖。未启动 Spear，也未把源码上传远程 LLM。

## 仍然保留的验收边界

真实社区宿主 `legacyCommunityResponse()` 返回空列表，review 真实路由缺失/404，故只验证访问入口和 mock 下的独立请求控制，不能声称真实社区读写持久化通过。此限制沿用 QA 已确认的结论。实际 annotations 登录读写与游客本地读写独立通过。

未验证真机 Safari、系统选区手柄、软键盘/VoiceOver、200% 浏览器缩放、所有皮肤和完整动画慢放。旧字体栅格 320px 裁切、旧皮肤按钮无名称、旧社区输入缺标签单独列为 pre-existing；不计入本次整改自审结论。
