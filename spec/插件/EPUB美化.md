# EPUB美化

## 1. 定义

EPUB美化是对书库中已有 EPUB 的目录、章节标题与排版进行整理，并生成一本新书的书籍工具。它不依赖外部服务，原书文件保持不变。

**不是什么：**不是元数据编辑、格式转换或在线阅读器主题设置；不是覆盖原书的正文查找替换，也不处理 TXT、PDF 或漫画容器。

## 2. 使用场景

- 管理员为《唐诗三百首》选择古籍排版与目录样式，保留原版并生成美化版。
- 读者先分析《百年孤独》的章节与目录，再决定是否请管理员生成新版本。
- 管理员调整一本 EPUB 的字体、配色、段距或背景纹理，便于在不同阅读器中阅读。

## 3. 功能

- 提供十二套排版预设、四种目录样式及内置背景纹理。
- 分析 EPUB 的结构，返回章节、目录与可用选项，预览不写入书库。
- 配置字体、配色、段落、目录深度、标题整理与标注处理；古籍预设支持竖排右翻。
- 管理员执行美化后生成新书，返回新书标识与处理统计。

## 4. 术语与界面用词

### 术语表

| 标准用词 | 英文 | 含义 | 示例 |
|---|---|---|---|
| EPUB美化 | EPUB beautification | 整理 EPUB 的目录与排版并生成新版本 | 管理员美化《唐诗三百首》 |
| 排版预设 | layout preset | 一组字体、颜色与段落规则 | 为《百年孤独》选择经典排版 |
| 结构分析 | structure analysis | 读取章节与目录结构，不写入文件 | 读者查看《百年孤独》的章节分析 |
| 美化版 | beautified edition | 美化后另行入库的新书 | 《唐诗三百首（美化版）》与原书同时保留 |

界面入口使用「EPUB 美化」，位于插件中心及专属工具页。生成结果默认使用「（美化版）」书名后缀，管理员可以自定义后缀。

## 5. 行为逻辑

### 5.1 分析与执行分离

登录读者可以取得选项与分析其可见书籍。分析只读取 EPUB，不生成新书，也不持久化排版修改。正式执行仅限管理员，并仍校验书籍可见范围、插件启用状态与读写授权。

### 5.2 仅生成新书

美化结果通过正常书库导入链路另存，原书的 EPUB 不覆盖、不删除。新书归执行者收集，标题使用原书名加后缀。因为原书不改动，本工具没有写回与回滚选项。

### 5.3 格式与参数校验

书籍必须具备 EPUB 格式；缺少格式、无权查看、插件不可用或参数非法时返回明确失败。预设、目录形式、配色、段距、背景纹理与标注样式按工具支持范围校验，不把非法参数静默当作成功。

### 5.4 连接归属

工具使用实例连接，不需要外部账号。执行经插件运行机制记录操作与结果，临时输出在处理结束后清理。

## 6. 关联实体

- [书籍](../书籍.md)：输入格式文件、可见范围与新书身份。
- [书库](../书库.md)：美化版的导入与收集。
- [插件平台](插件平台.md)：实例连接、插件授权与执行记录。
- [正文查找替换](正文查找替换.md)：可写回原书的另一种正文工具。

## 7. 实现对照

### 7.1 数据存储

| 概念 | 存储 | 说明 |
|---|---|---|
| 原书与美化版 | Calibre 书库的 EPUB 文件与书籍记录 | 结果作为新书导入，原书不覆盖 |
| 插件与连接 | `plugin_definitions` / `plugin_connections` | 实例级工具连接 |
| 执行记录 | `plugin_runs` | 保存插件执行状态与审计信息 |

### 7.2 API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/plugins/tools/books` | 工具可选择的书籍 |
| GET | `/api/plugins/tools/epub-beautify/presets` | 排版预设、目录样式与纹理 |
| POST | `/api/plugins/tools/epub-beautify/preview` | 登录读者分析可见 EPUB |
| POST | `/api/plugins/tools/epub-beautify/run` | 管理员执行并导入新书 |

### 7.3 关键定义

| 符号 | 值 | 含义 |
|---|---|---|
| 插件 ID | `talebook.tool.epub-beautify` | 内置插件稳定身份 |
| 分类 / 能力 | `integrations` / `integrations.tool` | 书籍工具 |
| 权限 | `books.read` / `books.write` | 分析与生成授权 |
| 连接归属 | `instance` | 无外部账号 |
| 管理入口 | `/plugins/epub-beautify` | 专属工具页面 |
| 输出模式 | `new` | 仅生成新书 |

### 7.4 代码落点

| 行为 | 文件与函数 |
|---|---|
| 插件定义与处理 | `webserver/plugins/tool/epub_beautify/provider.py` 的 `EpubBeautifyTransformPlugin` |
| EPUB 分析与重写 | `webserver/plugins/tool/epub_beautify/beautify_lib.py` |
| 预设、目录与纹理 | `webserver/plugins/tool/epub_beautify/styles/` |
| API 编排与权限 | `webserver/handlers/plugin_booktools.py` 的 `UserEpubBeautifyPresets`、`UserEpubBeautifyPreview`、`UserEpubBeautifyRun` |
| 新书导入 | `webserver/services/booktools.py` 的 `import_as_new_book` |
| 工具页面 | `app/pages/plugins/epub-beautify.vue` |

### 7.5 界面文案

| i18n 分组 | 覆盖 |
|---|---|
| `bookTools.epubBeautify.*` | 排版选项、分析与生成反馈 |
| `pluginManagement.*` | 插件中心入口 |
