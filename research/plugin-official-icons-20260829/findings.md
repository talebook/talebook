# Talebook 内置插件的第一方品牌图标调研

- 调研日期：2026-08-29
- 调研范围：[`webserver/plugins/register.py`](../../webserver/plugins/register.py) 中注册的内置 Provider，以及各 Provider manifest。
- 目标：识别面向固定第三方服务或产品的插件，为其找到官网、官方代码仓库或官方应用商店记录所提供的图标；排除 Talebook 自身能力、通用协议和没有固定上游品牌的适配器。
- 结论性质：这是资源选型与合规清单，不等同于商标授权意见。

## 结论摘要

1. 微信读书应优先使用其官网 HTML 明确声明的 152×152 Apple Touch Icon，而不是图标聚合网站或社区仿制图：<https://rescdn.qqmail.com/node/wr/wrpage/style/images/independent/appleTouchIcon/apple-touch-icon-152x152.png>。图标由 `weread.qq.com` 页面直接引用；[App Store 官方应用](https://apps.apple.com/cn/app/id952059546)同时确认发布者为 Tencent Technology (Shenzhen) Company Limited。仓库当前 manifest 指向的 [Tencent/WeChatReading](https://github.com/Tencent/WeChatReading) 未提供图标文件，也未声明可识别的开源许可证，不能把仓库当作品牌素材来源。
2. 能直接采用官方开源仓库资源的服务包括 Open Library、Kavita、Komga、BookLore、Legado、NeoDB 和 Calibre。实现时仍应把 raw URL 换成固定 commit SHA，并把文件 vendoring 到 Talebook；代码许可证不当然放弃商标权。
3. 豆瓣、七猫、番茄、新华书店、当当、多看、掌阅、汉王、PureLibro 等商业服务没有明确的开放品牌授权。官网图标优先；只有官网没有合适大图时，Apple 官方目录中的开发者应用图标可作为身份核验和候选设计源，但上线前仍需确认品牌使用规则。
4. `talebook.meta.calibre` 同时代表 Google Books 与 Amazon，并由 Calibre 执行。插件卡片只显示 Calibre 图标最不误导。Google 明确要求 Google Books 结果附近显示指定归属标识，且禁止把 Google 标志与竞争搜索服务标志并列；因此不应给这个聚合插件制作 Google/Amazon 拼接图标。[Google Books 品牌规范](https://developers.google.com/books/branding)
5. `talebook.meta.ai` 是兼容 OpenAI API 形态的可配置适配器，并不固定连接 OpenAI；通用 OPDS、WebDAV、Watch Folder、评价文件导入、在线书源聚合等也没有唯一上游品牌。这些插件应继续使用 Talebook 自有类别 glyph。
6. 所有品牌文件应随前端本地发布，建议目录 `app/public/images/plugin-icons/`。不得从运行中的页面热链官方 CDN：CDN 地址可能变化、防盗链或限流，也会泄露管理员浏览行为。

## 固定品牌插件与推荐资源

### 综合服务与书源

| 插件 ID | 服务 | 推荐图标源 | 建议本地文件名 | 来源与使用注意 |
|---|---|---|---|---|
| `talebook.combo.weread` | 微信读书 | <https://rescdn.qqmail.com/node/wr/wrpage/style/images/independent/appleTouchIcon/apple-touch-icon-152x152.png> | `weread.png` | **首选。** 微信读书官网声明的 Apple Touch Icon；[官方应用](https://apps.apple.com/cn/app/id952059546)确认腾讯发布者。无开放品牌许可证，保持原图、原比例，不暗示官方合作。|
| `talebook.combo.open-library` | Open Library | <https://openlibrary.org/static/images/openlibrary-192x192.png> | `open-library.png` | 官网 favicon；[官方仓库](https://github.com/internetarchive/openlibrary)为 AGPL-3.0。代码许可不当然覆盖商标。|
| `talebook.source.legado` | Legado / 阅读 | <https://raw.githubusercontent.com/LegadoTeam/legado/master/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png> | `legado.png` | [官方仓库](https://github.com/LegadoTeam/legado)内的 Android launcher icon，仓库 GPL-3.0。Talebook manifest 的 homepage 仍写 Talebook 自身，后续应改到官方项目。|
| `talebook.source.kavita` | Kavita | <https://raw.githubusercontent.com/Kareadita/Kavita/develop/UI/Web/src/assets/images/logo.svg> | `kavita.svg` | [官方仓库](https://github.com/Kareadita/Kavita)资源，GPL-3.0。官网曾在 JSON-LD 中把 `assets/icons/favicon-192.png` 声明为组织 logo，但调研时该 URL 已返回 404，因此优先使用仓库 SVG。|
| `talebook.source.komga` | Komga | <https://raw.githubusercontent.com/gotson/komga/master/komga-webui/src/assets/logo.svg> | `komga.svg` | [官方仓库](https://github.com/gotson/komga)资源，仓库 MIT；README 说明 Komga icon 基于 Freepik 在 Flaticon 的图标，不能只看 MIT 许可证，发布时应保留来源记录并复核原始图标条款。|
| `talebook.source.booklore` | BookLore | <https://raw.githubusercontent.com/booklore-app/BookLore/develop/assets/logo.svg> | `booklore.svg` | [官方仓库](https://github.com/booklore-app/BookLore)资源，AGPL-3.0；商标权另行保留。|
| `talebook.source.standard-ebooks` | Standard Ebooks | <https://standardebooks.org/images/favicons/apple-touch-icon.png> | `standard-ebooks.png` | 官网声明的 180px touch icon；[官网源码](https://github.com/standardebooks/web)为 CC0-1.0。仍应把名称和图标仅用于准确说明来源。|
| `talebook.source.gutenberg` | Project Gutenberg | <https://www.gutenberg.org/gutenberg/pg-logo-144x144.png> | `project-gutenberg.png` | 官网发布的 144px 图标。Project Gutenberg 明确说明其名称是注册商标，商业使用或使人误以为获得支持时有额外限制；详见[官方许可说明](https://www.gutenberg.org/policy/permission)。|
| `talebook.source.internet-archive` | Internet Archive | <https://archive.org/offshoot_assets/favicon.ico> | `internet-archive.ico` | Archive.org 官网声明的 favicon；需文字标识时可用官方站的 `https://archive.org/images/wordmark-stacked.svg`。没有单独的开放商标授权说明。|

### 元数据与评价服务

| 插件 ID | 服务 | 推荐图标源 | 建议本地文件名 | 来源与使用注意 |
|---|---|---|---|---|
| `talebook.meta.baike` | 百度百科 | <https://baikebcs.bdimg.com/cms/static/baike-icon.svg> | `baidu-baike.svg` | 百度百科官网直接声明的 SVG icon。无开放品牌许可证；不改色、不描摹。|
| `talebook.meta.douban-v2` | 豆瓣 | <https://img1.doubanio.com/favicon.ico> | `douban.ico` | 豆瓣自有 CDN favicon，可能防盗链，必须下载入库而非运行时引用。[App Store 官方应用](https://apps.apple.com/cn/app/id907002334)可用于核验发布者。|
| `talebook.meta.qimao` | 七猫小说 | <https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/8a/df/15/8adf1599-8c8e-992b-5f8f-4db8ba680fe7/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg> | `qimao.jpg` | [Apple 官方目录](https://apps.apple.com/cn/app/id1387717110)中由 Shanghai Seven-Cat Culture Media Co.,Ltd. 发布的当前应用图标。URL 会随应用更新变化，且不是开放许可证；落库时记录抓取日期。|
| `talebook.meta.tomato` | 番茄小说 | <https://p1-tt.byteimg.com/origin/novel-static/a3621391ca2e537045168afda6722ee9> | `fanqie.png` | 番茄小说官网声明的 shortcut/touch icon，响应为 PNG；[官方应用](https://apps.apple.com/cn/app/id1468454200)确认发布者为 Beijing Zhending Technology Co., Ltd.。无开放品牌许可证。|
| `talebook.meta.xhsd` | 新华书店网上商城 | <https://www.xhsd.com/assets/images/other-images/favicon.ico> | `xhsd.ico` | `xhsd.com` 官网 favicon；[官方应用](https://apps.apple.com/cn/app/id1354331723)确认提供者为新华互联电子商务有限责任公司。无开放品牌许可证。|
| `talebook.meta.neodb`、`talebook.review.neodb` | NeoDB | <https://raw.githubusercontent.com/neodb-social/neodb/main/neodb/common/static/img/logo_square.svg> | `neodb.svg` | [官方仓库](https://github.com/neodb-social/neodb)方形 logo，AGPL-3.0；官网还声明 `https://neodb.social/s/img/icon.png`。代码许可不当然覆盖商标。|
| `talebook.meta.calibre` | Calibre 驱动的 Google Books / Amazon 聚合 | <https://raw.githubusercontent.com/kovidgoyal/calibre/master/resources/images/calibre.svg> | `calibre.svg` | 使用 [Calibre 官方仓库](https://github.com/kovidgoyal/calibre)应用图标，GPL-3.0，避免把两个商业品牌拼接为新标志。Google Books 查询结果仍需按[官方品牌规范](https://developers.google.com/books/branding)单独显示指定归属；Amazon 标志不建议用于本插件卡片。|
| `talebook.review.google-books` | Google Books | <https://books.google.com/favicon.ico> | `google-books.ico` | 官方站 favicon。只用于准确指向 Google Books；结果界面还必须满足 Google Books 的 attribution、链接与不混排要求，不能把小 favicon 当作“Powered by Google”归属标识的替代。|
| `talebook.review.hardcover` | Hardcover | <https://raw.githubusercontent.com/hardcoverapp/static-assets/main/static/logos/logo-standalone.png> | `hardcover.png` | [Hardcover 官方静态资产仓库](https://github.com/hardcoverapp/static-assets)中的独立 logo。该仓库没有声明许可证；相邻的 API 文档仓库为 MIT 不代表这里的 logo 也是 MIT，使用前应请求或确认品牌许可。|
| `talebook.review.bangumi` | Bangumi | <https://bgm.tv/img/ico/ico_ios.png> | `bangumi.png` | Bangumi 官网声明的 Apple Touch Icon；小图备选为 `https://bgm.tv/img/favicon.ico`。无开放品牌许可证。|
| `talebook.review.anilist` | AniList | <https://anilist.co/img/icons/android-chrome-512x512.png> | `anilist.png` | AniList 官网 `og:image` 与 web app icon。无开放品牌许可证；保持原始构图和颜色。|

### 推送设备与阅读应用

| 插件 ID | 服务/设备 | 推荐图标源 | 建议本地文件名 | 来源与使用注意 |
|---|---|---|---|---|
| `talebook.push.boox` | 文石 BOOX | <https://shop.boox.com/cdn/shop/files/booxshop-ico_32x32.png?v=1685413361> | `boox.png` | [BOOX 官方站](https://www.boox.com/)声明的 shortcut icon；官网帮助中心也明确 `boox.com` 才是官方网站。仅 32px，先做实际卡片清晰度检查，不要 AI 放大或重绘。|
| `talebook.push.dangdang` | 当当阅读器 | <https://www.dangdang.com/favicon.ico> | `dangdang.ico` | 当当官网 favicon；[当当云阅读官方应用](https://apps.apple.com/cn/app/id488202082)确认发布者。无开放品牌许可证。|
| `talebook.push.duokan` | 多看阅读 | <https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/07/10/46/07104663-a1dd-192a-e99a-aecf78742a0f/AppIcon-0-0-1x_U007emarketing-0-8-0-0-85-220.png/512x512bb.jpg> | `duokan.jpg` | [Apple 官方目录](https://apps.apple.com/cn/app/id517850153)中 Duokan Technology Company 发布的图标。多看官网的小米 CDN favicon 在本次复验中返回 504，因此不作为唯一来源。无开放品牌许可证。|
| `talebook.push.hanwang` | 汉王电纸书 | <https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/db/59/52/db59526e-3464-f312-5918-922d57cf311f/AppIcon-0-0-1x_U007ephone-0-11-0-0-85-220.png/512x512bb.jpg> | `hanwang.jpg` | [汉王“电纸本助手”官方应用](https://apps.apple.com/cn/app/id1619030681)，发布者为 Hanwang Technology Co., Ltd.。这是同厂商、同设备生态的候选，不是专门的“WiFi 传书”品牌资产；上线前应由产品确认是否接受厂商品牌级图标。|
| `talebook.push.ireader` | 掌阅 iReader | <https://www.ireader.com/favicon.ico> | `ireader.ico` | 掌阅官网 favicon；[官方应用](https://apps.apple.com/cn/app/id463150061)确认发布者为 IReader Technology Co., Ltd.。若小图清晰度不足，可在获得许可后以官方应用图标替换。|
| `talebook.push.purelibro` | PureLibro | <https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/51/9e/98/519e980f-40d7-56a0-a0ad-d8fa7bb2dc50/AppIcon-0-0-1x_U007epad-0-1-0-85-220.png/512x512bb.jpg> | `purelibro.jpg` | [PureLibro 官方 App Store 记录](https://apps.apple.com/es/app/purelibro-ebook-reader/id1546612448)，应用名、上传服务能力和插件行为相符，发布者为添欢 谢。无开放品牌许可证；Provider manifest 当前缺 homepage，建议补官方应用页以保留来源链。|

## 不应分配第三方品牌图标的内置插件

| 插件或类别 | 原因 | 建议 |
|---|---|---|
| `talebook.meta.ai` | Endpoint 可指向任意 OpenAI-compatible 服务；使用 OpenAI 标志会把协议兼容误写成服务归属。 | 保留中性 AI glyph；仅当连接实例明确是某家服务时，在连接详情显示服务名称，不改变插件品牌。|
| `talebook.meta.book-source` | 聚合用户启用的任意 Legado/在线书源，不代表 Legado 官方服务。 | 使用 Talebook 的“书源聚合”类别图标。|
| `talebook.meta.calibre-provider-bridge` | 只发现本机 Calibre runtime 中已启用的 provider，是平台桥接能力。 | 可使用 Calibre 图标或中性 bridge glyph；不展示其发现到的某一个上游品牌。|
| `talebook.annotation.brs` | Talebook 自身生态服务，不是第三方固定品牌。 | 使用 Talebook/BRS 自有图标；先为 BRS 建立独立品牌资源再替换。|
| Generic OPDS、WebDAV、Watch Folder | 协议或本地目录，不是某个服务。 | 使用协议/目录 glyph。Kavita、Komga、BookLore 预设则使用各自品牌。|
| 评价文件导入、文本替换、繁简转换、TXT 修复、mock | 本地数据处理或测试能力。 | 使用功能 glyph，不伪造外部品牌。|

## 许可证与品牌风险分级

| 等级 | 资源 | 落地策略 |
|---|---|---|
| A：有官方仓库与明确代码/内容许可证 | Open Library、Kavita、Komga、BookLore、Legado、NeoDB、Calibre、Standard Ebooks | 可优先实现，但提交中要保留上游 URL、仓库 commit SHA、许可证和抓取日期；仍做商标用途复核。|
| B：第一方发布但无开放品牌许可证 | 微信读书、百度百科、豆瓣、七猫、番茄、新华书店、Hardcover、Bangumi、AniList、Internet Archive、BOOX、当当、多看、汉王、掌阅、PureLibro | 仅用于准确识别对应服务，图标地位低于 Talebook 品牌；不改色、不重绘、不合成，不写“官方插件”“合作伙伴”等暗示背书的文案。|
| C：有明确附加约束 | Google Books、Project Gutenberg、Komga 的底层图标来源 | 按各自官方规则实现归属和链接；Google Books 的结果归属不能由卡片图标替代，Project Gutenberg 商标不能被用于暗示支持，Komga 应保留 Freepik/Flaticon 来源记录。|

Apple iTunes Search/Lookup API 返回的 artwork URL 是官方应用目录中的发布者素材，但并非开源许可证。将其长期 vendoring 到软件发行包前，应额外评估 Apple Promotional Content 条款和应用发布者的商标规则；本研究中的这些 URL 主要用于证明图标与官方发布者之间的来源关系。

## 建议实施方式

1. manifest 增加结构化字段，例如 `ui.brand_icon`，不要让 `ui.icon` 同时承载 MDI 名称和文件路径。字段只接受站内绝对路径，如 `/images/plugin-icons/weread.png`。
2. 将选择后的原文件下载到 `app/public/images/plugin-icons/`；禁止页面运行时访问第三方 CDN。
3. 增加 `app/public/images/plugin-icons/SOURCES.md`，逐个记录插件 ID、原始 URL、上游 commit（仓库资源）、许可证/商标提示、抓取日期与文件 SHA-256。
4. 不自动裁圆角。官方应用图标自身若包含圆角或背景则原样显示；卡片容器负责统一尺寸、留白和圆角遮罩。
5. 同时准备中性 fallback。图片加载失败、品牌许可未确认或暗色主题对比不足时，退回现有 MDI glyph，不能显示破图。
6. 为资源增加测试：manifest 指向本地文件、文件存在、大小不超过约定阈值、SVG 不含外链/脚本、所有外部品牌插件都有图标或明确的 fallback 豁免。
7. 在视觉验收中至少检查浅色/深色主题、32px/40px 两档、透明与非透明背景，并确认品牌图标不会比 Talebook 自身导航品牌更突出。

## 核验说明

- 仓库资源通过 GitHub 官方 API 核验 default branch、文件路径与仓库许可证；上表列出的 raw 资源在 2026-08-29 均返回 HTTP 200。
- 官网资源通过首页 `<link rel="icon">`、Apple Touch Icon、Open Graph/JSON-LD 或同域官方静态资源核验；不是从 Simple Icons、Iconify、Wikipedia、图标聚合站或搜索结果缩略图反向下载。
- Apple 应用资源通过官方 App Store 页面和 iTunes Lookup API 交叉核验应用名、开发者/销售方与 `artworkUrl512`。
- 本地插件范围以注册表为准；同一服务对应多个插件 ID（NeoDB）时共享同一品牌文件，避免重复资产。
