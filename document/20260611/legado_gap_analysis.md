# Legado 书源引擎兼容性差距分析

> 日期：2026-06-11
> 对比版本：Legado 2026-05（gedoor/legado，main 已清空，取自 refs/pull/5804/head 完整源码树）
> 我方实现：`webserver/services/booksource/`（约 1600 行 Python）

## 背景

用户反馈 `m.jhsssd.com` 的书目录只取到 ~25 章（实际 1600+ 章）。根因是该站目录用
`<select><option>` 分页，书源规则 `nextTocUrl: "option@value"` 在 Legado 中会返回
**全部分页 URL 的列表**并逐个抓取；我方引擎把多个 URL 用 `\n` 拼成单个字符串当一个
URL 请求，第二页起即失败。由此触发本次全面对比。

## 对比方法

通读 Legado 以下模块，与我方逐项对照：

| Legado 模块 | 行数 | 我方对应 |
|---|---|---|
| `model/analyzeRule/AnalyzeRule.kt` | 907 | `analyze_rule.py` (257) |
| `model/analyzeRule/AnalyzeByJSoup.kt` | 524 | `rule_dispatch.py` (237) |
| `model/analyzeRule/AnalyzeByXPath.kt / AnalyzeByJSonPath.kt / AnalyzeByRegex.kt` | 386 | `rule_dispatch.py` |
| `model/analyzeRule/AnalyzeUrl.kt` | 851 | `analyze_url.py` (152) |
| `model/analyzeRule/RuleAnalyzer.kt` | 377 | `_split_top`（朴素 split） |
| `help/JsExtensions.kt` | 1003 | `js_runtime.py` (90) |
| `model/webBook/BookChapterList.kt / BookContent.kt / BookList.kt / BookInfo.kt` | 961 | `engine.py` (310) |
| `data/entities/BookSource.kt` + `rule/*.kt` | ~530 | `book_source.py` (153) |

## 差距矩阵

状态：✅ 已支持 ｜ 🟡 部分支持 ｜ ❌ 未支持

### A. 规则语法（AnalyzeRule / AnalyzeByJSoup）

| # | 功能 | Legado 语义 | 状态 | 说明 / 影响 |
|---|---|---|---|---|
| A1 | jsoup 步骤 `class./id./tag.` | getElementsByClass/Id/Tag | ✅ | 转 CSS 实现 |
| A2 | `text.XXX` 步骤 | getElementsContainingOwnText（按文本筛元素） | ❌→✅(本次) | 我方误当 tag 处理；`text.下一页@href` 类规则全部失效 |
| A3 | `children` 步骤 | 直接子元素 | ✅ | |
| A4 | 单索引 `.N` / 负索引 `.-1` | 选第 N 个 | ✅ | |
| A5 | 排除索引 `!N` / `!0:3` | 排除指定索引 | ❌→✅(本次) | 内置种子源在用（`li!0:1:2:3:4@a`） |
| A6 | 多索引 `.0:3:7` | 选多个索引 | ❌→✅(本次) | 旧版写法，存量书源常见 |
| A7 | `[]` 索引/区间 `[1,3:5,-1]`、步长与反向 `[-1:0]` | 区间展开、可反向 | ❌→✅(本次) | |
| A8 | `@CSS:`、`@XPath:`、`//`、`@Json:`、`$.` | 多模式 | ✅ | JSONPath 实现为 jsonpath-ng，与 Jayway 有少量方言差异 |
| A9 | `@@` 强制 default 模式前缀 | | ❌ | 罕用，低优先级 |
| A10 | AllInOne 正则模式（规则以 `:` 开头 + `$1` 组引用） | AnalyzeByRegex | ❌ | 用于一条正则同时取多字段的书源，存量占比低 |
| A11 | 组合符 `&&` `||` `%%` | RuleAnalyzer 平衡切分（跳过 `[]`、引号、`{}` 内的分隔符） | 🟡 | 我方朴素 split，选择器含 `[href||...]` 或 JS 含 `||` 时会切错 |
| A12 | 尾部正则 `##p##r` | 替换 | ✅ | |
| A13 | `##p##r###` replaceFirst | 取首个匹配再替换 | ❌→✅(本次) | |
| A14 | `@put:{json}` 任意位置 + 标准 JSON | | 🟡 | 我方仅支持整条规则为 `@put:{k:rule}` 的形式 |
| A15 | `@get:{key}` | | ✅ | |
| A16 | `{{}}` 内嵌：变量 / 子规则 / **JS 表达式** / `{$.}` JSON 模板 | Rhino eval | 🟡 | 我方支持变量与子规则；JS 表达式（如 `{{(page-1)*20}}`）抛 JsRuleUnsupported |
| A17 | 规则级 JS：`<js>...</js>` 块、多段 JS 流水线 | Rhino | ❌ | 我方仅支持尾部单段 `@js:`（quickjs 受限执行） |
| A18 | HTML 实体反转义（unescapeHtml4） | | 🟡 | BeautifulSoup 解析时已部分处理 |
| A19 | `html` 属性提取时剔除 script/style | | ❌ | 低影响 |

### B. URL 规则（AnalyzeUrl）

| # | 功能 | 状态 | 说明 |
|---|---|---|---|
| B1 | `url,{options}` 拆分 | ✅ | |
| B2 | options: method/charset/headers/body | ✅ | |
| B3 | 分页占位 `<a,b,c>`（按 page 选段） | ❌→✅(本次) | 搜索/发现翻页常用，如 `search?key={{key}}<,&page={{page}}>` |
| B4 | options: retry 重试 | ❌ | 可补，低成本 |
| B5 | options: js（url 后处理） | ❌ | 依赖 JS 运行时增强 |
| B6 | options: type（返回字节，图片/字体） | ❌ | 文本书源不需要 |
| B7 | options: webView/webJs/webViewDelayTime | ❌（明确不移植） | 服务端无浏览器内核；见"不移植项" |
| B8 | POST body 自动表单编码 / JSON 直发 / multipart | 🟡 | 我方原样发送，多数站点可用 |
| B9 | GET query 按 charset 编码、escape 模式 | 🟡 | 依赖 requests 默认行为 |
| B10 | proxy（header 内指定） | ❌ | 服务端代理策略应全局配置，不宜书源自带 |
| B11 | 并发率 concurrentRate | ❌ | 我方有全局超时；按源限速可后补 |
| B12 | CookieStore 持久化 / enabledCookieJar | 🟡 | requests.Session 进程内有 cookie，不落库 |
| B13 | `<js>`/`{{js}}` 生成 URL、`@result` 引用 | ❌ | 同 A17 |
| B14 | data: URI | ❌ | 仅图片用 |

### C. 书源字段（BookSource 实体）

| # | 字段 | 状态 | 说明 |
|---|---|---|---|
| C1 | bookSourceType 0 文本 | ✅ | 1 音频/2 图片/3 文件：明确不移植 |
| C2 | header（JSON） | ✅ | header 为 JS 时回退默认头 |
| C3 | searchUrl/exploreUrl（含分类解析） | ✅ | |
| C4 | loginUrl/loginUi/loginCheckJs | ❌（明确不移植） | 服务端多用户场景下书源级登录态难以安全隔离 |
| C5 | jsLib | ❌ | 依赖完整 JS 运行时 |
| C6 | concurrentRate | ❌ | 同 B11 |
| C7 | coverDecodeJs | ❌ | 罕用 |
| C8 | bookUrlPattern | ❌ | 搜索结果直接 302 到详情页的站点需要；可后补 |
| C9 | ruleSearch.checkKeyWord | ❌ | 体检时可用源自定义关键词，可后补 |
| C10 | variableComment/customOrder/respondTime | ❌ | 客户端 UI/排序用，服务端无需 |

### D. 工作流语义（WebBook）

| # | 功能 | Legado 语义 | 状态 | 说明 |
|---|---|---|---|---|
| D1 | **nextTocUrl 多 URL 列表** | 规则取出多个 URL ⇒ 视为全部分页，逐个抓取（App 内并发） | ❌→✅(本次) | **本次用户问题的根因** |
| D2 | nextTocUrl 单 URL 循环 | 逐页跟进，seen 防环 | 🟡→✅(本次) | 原实现遇多 URL 串崩坏 |
| D3 | nextContentUrl 同样的列表语义 | 同 D1/D2 | ❌→✅(本次) | |
| D4 | 章节去重 | 双反转 + LinkedHashSet：保留靠后出现的重复项（剔掉页首"最新章节"块） | ❌→✅(本次) | m.jhsssd.com 首页 25 项中 5 项是重复 |
| D5 | chapterList `-` 前缀（倒序目录翻正）/ `+` 前缀 | | ❌→✅(本次) | |
| D6 | 目录页数上限 | App 无上限（页列表一次取回） | 🟡 | 我方 BOOKSOURCE_MAX_TOC_PAGES=30，本次默认提至 200 |
| D7 | isVolume 卷标记、章节 url 缺省回退 | | ❌ | 影响有卷结构的书的保存排版，可后补 |
| D8 | isPay（isVip 之外） | | ❌ | 我方有 isVip |
| D9 | formatJs 章节标题格式化 | JS | ❌ | 依赖 JS 运行时 |
| D10 | preUpdateJs / reGetBook / refreshTocUrl | JS，目录 url 定期变化的源 | ❌ | 依赖 JS 运行时 |
| D11 | 正文 title 规则（从正文页取章节名） | | ❌ | 可后补 |
| D12 | 正文 replaceRegex 是"规则"（可含 JS）非纯正则 | | 🟡 | 我方按 `pattern##replacement` 列表处理，覆盖绝大多数 |
| D13 | 正文翻页遇下一章 URL 即停 | 防止把下一章并进本章 | ❌ | 保存任务里有意义，可后补 |
| D14 | payAction/imageStyle/imageDecode | | ❌（明确不移植） | 付费/图片源场景 |
| D15 | 搜索结果空且配 bookUrlPattern 时按详情页解析 | | ❌ | 同 C8 |

### E. JS 扩展（JsExtensions，约 70 个 java.* 函数）

我方 quickjs 运行时仅提供 `java.get/put` 与少量空实现桩。Legado 的 java.* 分三类：

1. **纯计算类**（可安全移植）：base64/hex 编解码、`timeFormat`、`encodeURI`、
   `htmlFormat`、`toNumChapter`、`randomUUID`、`strToBytes/bytesToStr`、`t2s/s2t` 简繁转换。
2. **网络类**（默认不移植，SSRF 风险）：`ajax/ajaxAll/get/post/head/connect`、
   `downloadFile`、`cacheFile`、`getCookie`。书源 JS 在服务端拥有发任意请求的能力，
   等于给所有可导入书源的用户一个内网探测器。若未来确需支持，必须加 URL 白名单
   /禁内网地址/限流，且默认关闭。
3. **设备/环境类**（明确不移植）：webView 系、`startBrowser`、文件系统系
   （readFile/unzipFile/getTxtInFolder…）、`queryTTF/replaceFont` 字体反爬、
   `toast/log/openUrl/androidId`。

## 明确不移植项及原因

| 项 | 原因 |
|---|---|
| WebView 渲染（B7、E3） | 服务端无浏览器内核；引入 headless 浏览器的成本/攻击面不成比例 |
| 书源登录（C4） | Talebook 是多用户服务端，书源级登录态属于单用户客户端模型 |
| 网络类 JS（E2） | SSRF：书源 JSON 可由管理员导入，但执行环境在服务器内网 |
| 音频/图片/文件源（C1） | Talebook 网络书库定位是文本小说 |
| 字体解密/付费购买（E3、D14） | 反爬军备与付费场景超出服务端书库职责 |

## 本次移植清单（P0，2026-06-11 实施）

1. **D1/D2/D3**：`AnalyzeRule.get_string_list()` 新增；`engine.toc()/content()` 改队列式翻页，
   兼容"单链接逐页"与"多链接一次全发"两种语义，URL 去重防环。
2. **D4**：章节按 (name,url) 去重，保留靠后出现项（Legado 双反转语义）。
3. **D5**：chapterList `-`/`+` 前缀。
4. **D6**：`BOOKSOURCE_MAX_TOC_PAGES` 默认 30 → 200。
5. **A2**：`text.XXX` 改为"含指定自有文本的元素"。
6. **A5/A6/A7**：完整移植 ElementsSingle 索引语义（`!` 排除、`:` 多索引、`[]` 区间/步长/反向）。
7. **A13**：`###` replaceFirst。
8. **B3**：URL `<a,b,c>` 分页占位。

## 后续路线（P1/P2，按需排期）

- P1：A11 平衡切分（RuleAnalyzer 移植）、A16 `{{}}` 纯计算 JS、E1 纯计算 java.*、
  B4 retry、C8/D15 bookUrlPattern、C9 checkKeyWord、D7 isVolume、D11 正文 title、D13 翻页停止条件。
- P2：A10 AllInOne 正则、A14 @put 增强、B8/B9 编码细化、B11/C6 并发率、B12 cookie 落库、D9/D10（依赖 JS 运行时升级决策）。
