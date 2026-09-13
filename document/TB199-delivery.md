# TB-199 焦点恢复交付

焦点回归已修复，等待 UX 独立复核。方案保持 `design/app/20260904-candle-reader-annotations.wip.html`，父议题保持进行中。原七项和同 CFI 修复继续保留。

关闭 Escape、键盘关闭按钮或点击遮罩后，仅在最后一个面板离场时恢复原入口；章评/书评/设置切换保留入口且不抢焦。直接设置关闭回到设置；由笔记切入设置，最终关闭回到笔记。失效触发元素使用有效底部入口。新增 `tests/e2e/panel-focus.spec.js` 及真实宿主 `scripts/tb199_focus.cjs`。

## 版本与结果

- Candle 修复：`1d22c7a58fae6cf196a9238d50520a63c58750d6`；Talebook 最终提交见 `versions.json`，起点 `3a0e1bcf2422056f0bb7fab1d88b8806fc85b31f`。
- PR：<https://github.com/talebook/candle-reader/pull/18>、<https://github.com/talebook/talebook/pull/1036>。两仓更新同一现有 PR，不合并，不等待外部 CI。
- `npm run lint`、`npm run build` 通过；`E2E_PORT=5019 npm run test:e2e -- --workers=1` **67 passed**；Docker/Calibre `python3 -m pytest tests/test_annotations.py -q` **22 passed**。
- 新焦点回归先在旧实现复现失败，修复后四主题/身份组合通过；还覆盖下一次 Tab、遮罩关闭及入口移除 fallback。
- 真实宿主 `/read/8`，**402×874、DPR3、white/grey×guest/login，64项 passed、0 pageerrors**，Chromium148.0.7778.96。每项操作、结果、焦点元素/连接状态/面板状态、主题/数据源和截图文件名均在 `focus-results.json`。真实路径没有 mock API、没有注入焦点或保存记录。
- 三方 bundle 校验：当前 dist、Talebook静态文件、实际 HTTP 字节一致，模板 cache=`v1.2.0-tb199.4`。ES `fcf5eea8544bbd469e3ba5a9a4dad7f7f584f31bef0c6e28edbcb202af9fdc61`；UMD `f140836373ea7b4af0bf688a59763a31fe5c14df8b3e6215d2501a02525e1860`；CSS `5186644e77d6042cb83ea43fd29c212a271c71e23b93ea1d957b025dbb6b4b01`。

## 证据阅读

`focus-results.json` 的每条记录直接对应同名 PNG。white/grey 分别为浅/深色，guest 为本地存储，login 为真实宿主回调。16种操作均在四组合执行，截图包按体积拆分，解压到同一目录即可按JSON索引查阅。关闭后的截图显示底部入口焦点框；切换截图结合 `inActivePanel=true` 与 `navbarFocusDuringSwitch=[]` 确认没有抢焦。

`mcp-*` 文件为 Chrome DevTools MCP 的补充审查：关闭回焦、切换、完整AX树、浅/深色与320px状态。loading/error/长笔记/总关等样本明确为界面状态注入，仅检验布局和反馈，不属于真实读写证明。错误的主题方法调用已纠正并重拍；原调用错误保留于日志。MCP会话完成取证后退出清理，不把清理时终止客户端的退出码当作测试失败或通过。

完整 `interface-review full branch` 自审 **Approve（所述覆盖范围）**，报告 `TB199-focus-interface-review.md` 和同一WIP包含两仓全部分支范围、六域结果、被排除候选、既有问题、准确限制。独立 UX 复核尚未完成。`make -C talebook check-design` **退出2**，唯一失败为保留WIP不可合并门禁。

## 最终 DeepSec

DeepSec Shield **0.2.0**，来源 `fff031fc01fb36b95348214c8ee359f6ede8aa8b`；CLI `/opt/deepsec/fff031fc01fb36b95348214c8ee359f6ede8aa8b/venv/bin/deepsec`。仅本地 L1/L2；各受影响仓默认全仓（含测试/脚本与bundle）执行：

```bash
deepsec shield scan . --layer l1,l2 --include-tests --format json --output -
```

stdout 保存各仓 `.deepsec/deepsec-report.json`，保留 stderr 与退出码；附件为脱敏文件/规则/严重度，不附原始源码片段。

| 范围 | 扫描文件数 | 退出码 | 发现与处理 |
| --- | ---: | ---: | --- |
| Candle Reader | 33 | 2 | 既有HIGH1：epub.js CSS innerHTML；相对前轮按文件/规则/严重度对照无新增 |
| Talebook | 522 | 2 | 既有120：CRITICAL32/HIGH67/MEDIUM21；相同方法对照无新增，含bundle中的框架DOM/CSS规则告警 |
| 4个受影响Vue的script原样提取 | 各1 | 各0 | 各0发现；EpubReader/Settings/BookAnnotations/CandleReader |
| focus-tools MCP脚本 | 1 | 0 | 0发现 |

本轮焦点实现和回归脚本没有新增发现；没有靠忽略规则或把报告当成功来消除既有问题。既有高危/严重告警未整体修复，不能宣称全仓安全通过。Vue模板、HTML、CSS、XML未被工具解析；提取script不等于覆盖模板。扫描覆盖最终代码，之后仅回写文档及添加截图。stderr为空的主扫描及有效JSON确认退出2来自发现而非参数错误。未开启 Spear 或上传源码到远程LLM。

## 保留限制

真实社区链路按 QA 结论：`legacyCommunityResponse` 返回空列表，review路由缺失/404；入口和mock成功不等于社区持久化通过。此前真实 annotations API 与同CFI证据保留，本轮未重新跑真实写入矩阵，前端全量回归与后端22项再次通过。

真机Safari、VoiceOver、系统选区/软键盘、200%真实缩放、全皮肤、完整动画和实际音频未验证。深层登录/用户中心/主题对话框有不抢焦守卫，但未在本轮完整验收其多层键盘路径。320px旧设置栅格、皮肤名称、社区输入标签作为既有问题另列。测试环境已收尾，不交付临时运行地址；不包含凭据、Cookie或私有服务器日志。
