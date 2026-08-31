# Talebook 公开免费书源调研

> 调研日期：2026-08-29
> 范围：只采用来源方的官方网站、文档、API 或官方工具；排除盗版、来路不明的 Legado 书源集合。
> 目标：为插件中心“书源”Tab 提供无需用户填 JSON、无需理解通用配置的一键体验来源。

## 结论

推荐先做 5 个明确命名的内置书源，每个由专用 Provider 封装固定入口和协议差异，管理员只看到“启用 / 停用 / 浏览”：

| 优先级 | 建议显示名 | 默认入口 | 协议 | 匿名可用 | 适合内容 |
| --- | --- | --- | --- | --- | --- |
| P0 | Project Gutenberg | `https://www.gutenberg.org/ebooks/search.opds/` | OPDS 1 / Atom XML | 是 | 多语古典、公版书 |
| P0 | Gallica 公版 EPUB | `https://gallica.bnf.fr/opds` | OPDS 1 / Atom XML | 是，但需限速和健康检查 | 法国国家图书馆公版藏书 |
| P0 | Standard Ebooks · 最新上架 | `https://standardebooks.org/feeds/atom/new-releases` | Atom 1.0，非 OPDS | 是 | 高质量英文公版 EPUB |
| P1 | 中文维基文库 | `https://zh.wikisource.org/w/api.php` | MediaWiki Action API + EPUB 导出 | 是 | 中文古籍、公共领域文本 |
| P1 | OpenStax 免费教材 | `https://openstax.org/apps/cms/api/v2/pages/30/` | 第一方 JSON + PDF | 是 | 英文 K12 与高校教材 |

这 5 个来源都不应展示通用 JSON 配置框。非 OPDS 来源不应伪装成 OPDS；Provider 应直接解析其官方协议，并把书目、下载链接和授权边界转成 Talebook 的统一书源结果。DOAB 可作为下一批学术书候选，详见后文。

## 1. Project Gutenberg（P0）

### 入口与协议

- 推荐显示名：`Project Gutenberg`
- 默认目录 URL：[`https://www.gutenberg.org/ebooks/search.opds/`](https://www.gutenberg.org/ebooks/search.opds/)
- 协议：OPDS 1，基于 Atom XML；官方的 [Offline Catalogs and Feeds](https://www.gutenberg.org/ebooks/offline_catalogs.html) 明确指定该 URL 为 OPDS 起点。
- 目录首页是导航 feed，单书详情位于如 [`https://www.gutenberg.org/ebooks/1342.opds`](https://www.gutenberg.org/ebooks/1342.opds) 的二级 feed；Provider 必须跟进 `subsection` 链接，才能取得 `http://opds-spec.org/acquisition` EPUB 链接。

### 2026-08-29 实测

- 目录 URL 返回 `HTTP 200`，`Content-Type: application/atom+xml; charset=UTF-8`，首页 25 个 entry，包含 `next` 和 `search` 导航。
- 《Pride and Prejudice》详情 OPDS 返回 `HTTP 200`，可见 EPUB 和 Kindle 的 acquisition 链接。
- 因此可作为当前唯一个“完整官方 OPDS 目录”默认来源，不需要用户配置 endpoint。

### 许可与使用边界

- Gutenberg 说明大多数作品在美国不受版权限制，但也存在由权利人特别授权发布的受版权作品；需以单本书内嵌许可为准。美国以外的用户需自行核对当地版权法。见官方 [Project Gutenberg License](https://www.gutenberg.org/policy/license) 和 [Permission How-to](https://www.gutenberg.org/policy/permission)。
- 官方 [Terms of Use](https://www.gutenberg.org/policy/terms_of_use.html) 要求 OPDS 应用使用包含联系方式的 User-Agent，按用户实际浏览分页发起请求，不得批量预抓整库。
- 官方已预告现有 XML OPDS 计划在 2027 年退役，OPDS 2 尚处于测试接入阶段。Provider 应把协议切换隔离在内部，不让用户重新配置 URL。见官方 [Offline Catalogs and Feeds](https://www.gutenberg.org/ebooks/offline_catalogs.html)。

### 对现有实现的影响

`webserver/plugins/source/gutenberg.py` 当前调用 `https://gutendex.com/books/`，不是 Project Gutenberg 官方端点。若坚持“只用第一方来源”，应调整为官方 OPDS，并补上导航 feed 遍历、可联系 User-Agent 和按页请求限制。

## 2. Gallica 公版 EPUB（P0）

### 入口与协议

- 推荐显示名：`Gallica 公版 EPUB`
- 默认目录 URL：[`https://gallica.bnf.fr/opds`](https://gallica.bnf.fr/opds)
- 协议：OPDS 1 / Atom XML。法国国家图书馆 BnF 的 [Gallica OPDS 官方文档](https://api.bnf.fr/fr/api-opds-du-catalogue-de-livres-numeriques-de-gallica) 说明，该目录按文学、历史、科学等主题组织，并通过 SRU 检索服务返回 EPUB 的 OPDS acquisition 链接。
- 根目录是主题导航；Provider 必须支持 OPDS navigation/子 feed，或将用户搜索转换为 BnF 官方 SRU/OPDS 查询，不能只扫根 feed 的 acquisition。

### 2026-08-29 实测

- 首次实际 GET 返回 `HTTP 200`、`Content-Type: text/xml;charset=UTF-8`，10,932 字节，根元素为 Atom `<feed>`。
- 后续重复探测出现过 `HTTP 403`，因此 Provider 必须使用标识 Talebook 与联系地址的 User-Agent、低频分页，并在启用前做后端实时健康检查。不应把一次成功等价为任意频率稳定访问。
- 官方文档直接给出 `rel="http://opds-spec.org/acquisition"` 的 `application/epub+zip` 响应样例，因此协议层可与 Gutenberg 共用完整的 OPDS 导航能力。

### 许可与使用边界

- BnF 官方文档明确表示，Gallica OPDS 中的 EPUB 由 BnF 从公共领域作品制作。但“原作公版”不代表 BnF 数字复制品不带使用条件。见 [Gallica OPDS 官方文档](https://api.bnf.fr/fr/api-opds-du-catalogue-de-livres-numeriques-de-gallica)。
- BnF 说明，非商业使用以及学术/科研出版通常免费，但需标注 `BnF` 或 `Bibliothèque nationale de France`；商业出版、付费服务、促销传播和完整再版可能需授权和付费。见 BnF 官方 [商业使用复制品说明](https://www.bnf.fr/fr/faire-une-utilisation-commerciale-dune-reproduction)。
- Talebook 应保留 BnF/Gallica 来源标注，并在条目上提示商业再利用边界。

## 3. Standard Ebooks · 最新上架（P0）

### 入口与协议

- 推荐显示名：`Standard Ebooks · 最新上架`
- 默认 URL：[`https://standardebooks.org/feeds/atom/new-releases`](https://standardebooks.org/feeds/atom/new-releases)
- 协议：Atom 1.0，**不是 OPDS**。书籍下载位于 entry 的 `rel="enclosure"`，包含标准 EPUB、advanced EPUB、Kobo EPUB、AZW3 和单页 XHTML。
- 官方 [Ebook Feeds](https://standardebooks.org/feeds) 说明“New Releases RSS/Atom”向所有人开放；其他完整 feed 是会员、赞助方或符合条件的开源项目权益。

### 2026-08-29 实测

- 公开 Atom URL 返回 `HTTP 200`，`Content-Type: application/atom+xml`，当次包含 15 本最新电子书及直接 EPUB enclosure。
- 完整 OPDS `https://standardebooks.org/feeds/opds` 返回 `HTTP 401`。
- 仓库现有 `https://standardebooks.org/feeds/opds/all` 同样返回 `HTTP 401`。
- 因此未获得 Standard Ebooks 的开源项目授权前，不应把“完整 OPDS”显示为免配置正常来源；可先用公开 Atom 做“最新上架”体验。

### 许可与使用边界

- Standard Ebooks 表示其采用的文本与封面在美国被认为公共领域，并将自身制作的格式、封面和编辑工作贡献至公共领域；官网自制内容使用 CC0。见官方 [About](https://standardebooks.org/about) 和 [Standard Ebooks and the Public Domain](https://standardebooks.org/about/standard-ebooks-and-the-public-domain)。
- 其收录标准基于美国公共领域；其他国家或地区的公版状态可能不同。见官方 [Collections Policy](https://standardebooks.org/contribute/collections-policy)。

### 对现有实现的影响

本轮实现已将 `webserver/plugins/source/standard_ebooks.py` 从返回 401 的 `/feeds/opds/all` 改为公开的“最新上架”Atom feed，并让通用 Atom 解析器识别 `rel="enclosure"` 中的直接下载文件。如需全库搜索，再以 Talebook 开源项目身份向官方申请 feed 访问，不把账号密码转嫁给普通用户。

## 4. 中文维基文库（P1）

### 入口与协议

- 推荐显示名：`中文维基文库`
- 目录 API：[`https://zh.wikisource.org/w/api.php`](https://zh.wikisource.org/w/api.php)
- EPUB 导出：[`https://ws-export.wmcloud.org/`](https://ws-export.wmcloud.org/)
- 协议：MediaWiki Action API JSON + WS Export，**不是 OPDS**。MediaWiki 官方文档说明 Wikimedia 站点均通过 `/w/api.php` 提供 Action API，可以查询和搜索页面。见 [API:Action API](https://www.mediawiki.org/wiki/API:Action_API/en)。
- Wikisource 官方 [WS Export 说明](https://wikisource.org/wiki/Wikisource:WS_Export) 将该工具定义为导出 Wikisource 文本到 EPUB、PDF 等格式的工具，支持各语言子域。

### 2026-08-29 实测

- `zh.wikisource.org/w/api.php?action=query&generator=allpages&gaplimit=3&gapnamespace=0&prop=info&format=json` 返回 `HTTP 200`、JSON。
- `https://ws-export.wmcloud.org/?lang=zh&format=epub&page=紅樓夢` 返回 `HTTP 200`、`Content-Type: application/epub+zip`，实测文件 1,679,278 字节且能识别为 EPUB。
- 中文维基文库适合做“中文免费书”的明确体验来源，但需专用的书目筛选与导出 Provider，不能将 `allpages` 的所有主命名空间页面都当作完整书籍。

### 许可与使用边界

- 中文维基文库的官方 [版权信息](https://zh.wikisource.org/wiki/Wikisource:COPY) 说明站点贡献以 CC BY-SA 4.0 和 GFDL 发布。
- 文库所载的底本可能是公共领域，也可能带特定授权；复用时应保留来源页、版本历史和许可提示，并以单本条目的版权标记为准。
- Provider 可以下载 EPUB 到用户自己的书库，但不应去掉归属、共享方式与作品来源信息。

## 5. OpenStax 免费教材（P1）

### 入口与协议

- 推荐显示名：`OpenStax 免费教材`
- 用户官方目录：[`https://openstax.org/subjects/view-all`](https://openstax.org/subjects/view-all)
- 第一方 JSON：[`https://openstax.org/apps/cms/api/v2/pages/30/`](https://openstax.org/apps/cms/api/v2/pages/30/)
- 协议：OpenStax 网页内部使用的第一方 CMS JSON，**不是 OPDS**。`books[]` 中包含书名、主题、封面、`pdf_url`、高清 PDF 与在线阅读链接。
- 该 JSON 未见正式的版本稳定性承诺，因此必须由 OpenStax 专用 Provider 做字段容错、只显示 `book_state=live` 条目与定期健康检查，不应暴露为用户可编辑的通用 API URL。

### 2026-08-29 实测

- 官方 CMS JSON 返回 `HTTP 200`、`Content-Type: application/json`，响应的页面说明书籍“Peer-reviewed. Openly licensed. 100% free.”。
- 记录中可见直接 `https://assets.openstax.org/...pdf` 下载链接与在线阅读页，适合将“加入书库”固定为 PDF 取得动作。
- 本地 `curl` 探测曾出现超时，但独立网络探测可稳定取得完整 JSON。启用前仍应在 Talebook Docker 后端的实际网络环境做一次健康检查。

### 许可与使用边界

- OpenStax 当前官方许可说明将教材库定义为 CC BY-NC-SA：可在非商业目的下共享和改编，但必须署名 OpenStax、标出书名并链接免费版，改编内容以相同许可发布。见官方 [OpenStax textbook licensing and customization](https://help.openstax.org/s/article/Openstax-textbook-licensing-and-customization)。
- 部分历史教材仍可能使用 CC BY 或其他来源许可，书本页面还可能声明不得将内容用于大模型训练。Provider 必须保留单本书的 attribution/许可信息，不用一个全局标签覆盖所有旧书。单书官方页可参考 [Introduction to Computer Science 版权与归属示例](https://openstax.org/books/introduction-computer-science/pages/preface)。
- OpenStax 名称、Logo 和封面商标不随正文的 Creative Commons 许可开放；Talebook 可展示来源封面，但不应将它们作为自己的品牌元素二次使用。

## 后续候选：DOAB 开放学术图书

### 入口与协议

- 推荐显示名：`DOAB 开放学术图书`
- OAI-PMH Base URL：[`https://directory.doabooks.org/oai/`](https://directory.doabooks.org/oai/)
- Provider 建议使用：[`https://directory.doabooks.org/oai/request?verb=ListRecords&metadataPrefix=xoai`](https://directory.doabooks.org/oai/request?verb=ListRecords&metadataPrefix=xoai)
- 协议：OAI-PMH XML，优先使用 XOAI 元数据，**不是 OPDS**。官方 [DOAB metadata](https://www.doabooks.org/en/article/metadata) 公布了 OAI-PMH base URL，并说明 XOAI 包含全部元数据字段。

### 2026-08-29 实测

- `ListRecords&metadataPrefix=oai_dc` 返回 `HTTP 200`、`Content-Type: text/xml;charset=UTF-8`，当次首页 100 条记录并包含 resumption token。
- 样例 XOAI `GetRecord` 返回 `HTTP 200`，可读取直接 PDF 的 `oapenidentifierdownloadUrl`、`rights` 和 `rightsuri`；例如实测记录声明 `CC-BY-NC-SA` 及对应 Creative Commons URL。
- DOAB 是发现目录而非统一内容主机；Provider 应优先展示记录内的直接下载 URL，没有可验证文件链接时改为“打开出版方页面”，不谎称已可导入。

### 许可与使用边界

- DOAB 定义收录的开放学术图书为：在线免费、无需注册，并以 Creative Commons 等开放许可允许进一步使用的同行评审学术书。见官方 [Join DOAB: Requirements and Application](https://www.doabooks.org/en/publishers/join-doab)。
- DOAB 的元数据 feed 均以 CC0 1.0 开放，但书籍正文的复用条件由每本书自己的许可决定。DOAB 不托管全部正文，只指向出版方或开放平台。见官方 [DOAB FAQ](https://www.doabooks.org/en/researchers/full-faq) 和 [DOAB metadata](https://www.doabooks.org/en/article/metadata)。
- UI 必须在书籍条目上显示许可标签；“免费阅读”不等于可以无条件二次分发。

## 不建议作为默认体验的来源

### Internet Archive 全站文本

- Internet Archive 官方 [Downloading Guide](https://help.archive.org/help/downloading-a-basic-guide/) 明确说明并非所有文件都可下载，借阅项目和部分集合会受限。
- 仓库现有 `webserver/plugins/source/internet_archive.py` 用 `mediatype:texts` 查询全站文本，这不是“免费合法可导入”筛选；平台可下载与内容可重新分发也不是同一件事。
- 官方的 [Item Metadata API](https://archive.org/developers/md-read.html) 能提供单条元数据和文件列表，但只有在单条授权、限制状态和可下载文件都明确时才能进入待审取得。
- 2026-08-29 本机对其 `advancedsearch.php` JSON 请求在 20 秒后超时，不适合当前体验环境的默认启用来源。可保留为显式开启的实验来源，但不应出现“正常”默认状态。

### Open Library

- Open Library 官方提供免费低频 API，但要求标识 User-Agent、控制到匿名每秒 1 个请求，并且不应把 API 当作高流量后端。见官方 [APIs](https://openlibrary.org/developers/api)。
- Search API 可返回 `ebook_access: public` 和 `public_scan_b`，但其书目数据开放不等于所有关联扫描文件都可自由下载或分发。见官方 [Search API](https://openlibrary.org/dev/docs/api/search) 和 [Licensing](https://openlibrary.org/developers/licensing)。
- 2026-08-29 本机调用 `search.json` 在 20 秒后超时，因此不列入当前一键体验默认来源。

### Feedbooks Public Domain、DOAB REST 与未知 Legado 集合

- `https://catalog.feedbooks.com/publicdomain/catalog.atom` 实测返回 Cloudflare `HTTP 403`，无法作为稳定的服务端一键目录。
- `https://directory.doabooks.org/server/api/...` 实测返回 Cloudflare `HTTP 403`；DOAB 应使用其官方 OAI-PMH 端点，不要走 REST 页面接口。
- 网络上的 Legado 书源聚合文件通常同时包含来路不明的连载站、网页抓取规则和随时变化的域名，无法仅凭“免费”确认版权与服务条款；不作为 Talebook 官方体验预置。

## 产品和实现建议

1. **删除公共书源的通用配置按钮。** 官方公共来源的 endpoint、协议、User-Agent 策略和许可提示都由 Provider 内置，用户只需启停和浏览。
2. **一个来源对应一个专用 Provider。** Gutenberg 跟进 OPDS 导航；Standard Ebooks 解析 Atom enclosure；中文维基文库使用 MediaWiki + WS Export；DOAB 使用 OAI-PMH XOAI。不要用 JSON 文本框把协议复杂度暴露给用户。
3. **区分“下载”与“打开来源”。** 只有经验证的 EPUB/PDF 等直接文件才显示“加入书库”；仅有出版方页面、借阅或受限项目时显示“打开来源”。
4. **每本书显示许可与地域提示。** 平台默认不将“免费可读”表述为“无限制复制”；保留来源页、许可 URL 和条目权利说明。
5. **先上 Gutenberg，其他来源通过实际后端健康检查后再默认启用。** Gutenberg 是当前已验证的完整官方 OPDS；Gallica 需处理导航和间歇 403；Standard Ebooks 只提供匿名的最新 15 本 Atom；中文维基文库与 OpenStax 需专用 Provider。DOAB 作为后续学术书来源，不阻塞首批体验。
