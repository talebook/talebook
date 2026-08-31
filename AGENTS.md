# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 项目概述

Talebook 是基于 [Calibre](https://calibre-ebook.com/) 的个人电子书管理系统：

- **`webserver/`** — Python 后端（Tornado + Calibre），详见 `webserver/CLAUDE.md`
- **`app/`** — 前端（Nuxt 4 + Vue 3 + Vuetify），详见 `app/CLAUDE.md`

生产环境由 Nginx 托管静态前端，并将 `/api/` 、`/get/` 、`/read/` 、`/auth/` 、`/opds/` 反向代理到 8080 端口的 Tornado 后端。

## 常用命令

```bash
# 后端依赖
make init

# 后端测试与检查
make pytest
make lint-py

# Docker 全栈
make test    # Docker 内运行 pytest
make build   # 测试通过后构建生产镜像
make up      # docker compose up
make dev     # 挂载 webserver/ 进容器，用于后端开发调试
```

前端命令见 `app/CLAUDE.md` 。

## 开发规范

### 开发流程与内部方案

重要改动必须执行以下五阶段流程：

1. 复述需求。
2. 使用 grill 逐项澄清设计决策和边界。
3. 编码前创建 WIP 方案文档。
4. 按方案编码；grill、反馈、设计迭代和实现偏离都先更新同一份 WIP 再继续。
5. 完成测试、回写测试结果，将这份唯一方案转为 ACTIVE 后再合并。

以下改动必须创建方案：新功能或用户可感知行为变化；API、数据结构、库表、权限、部署、配置或兼容性变化；跨模块改动；性能、安全、数据迁移；复杂缺陷修复；开发规范和工程流程变化。错字、注释、小型文档修正、纯格式化、lint 修复、不改变业务行为的测试调整和小型重构通常可以豁免。最终回复或 PR 必须给出方案路径，或明确说明豁免原因。

#### 大型功能的本地界面审查

本节所称大型功能，仅包括新功能、用户可感知行为变化和跨模块功能。大型功能只要影响页面、交互、文案或其他前端消费者，就必须在完成常规测试后、将方案转为 ACTIVE 前，显式使用项目的 `interface-review` skill，以 `full` 模式审查当前分支相对默认分支的全部本地变更，包括已提交和未提交内容；不得以单个文件或最近一次提交的审查代替。

审查出现 `HIGH` 或 `MEDIUM` 问题时不得转为 ACTIVE；修复后必须重新执行 `interface-review`。审查范围、最终结论和问题处理情况必须回写同一份 WIP 的测试结果。若大型功能是纯后端改动，且确认不影响任何用户界面，可以豁免该 skill，但必须在 WIP 中记录“无界面影响”、判断依据和剩余风险。

内部方案使用中文，路径格式为 `design/<module>/yyyymmdd-<feature>.<status>.html` 。

- `<module>` 优先使用实际代码目录，例如 `app` 、`webserver` 、`docker` 、`scripts` 和 `tests` ；工程治理、发布和流程规范使用 `project` 。跨模块方案归入主要责任模块，并在正文列出影响范围。
- `<feature>` 使用小写英文 `kebab-case`；日期使用方案首次创建日期。
- 状态仅允许 `wip`、`active` 和 `superseded` 。WIP 表示开发或测试中，ACTIVE 表示已完成验证且当前有效，SUPERSEDED 表示已被新方案替代。
- 同一个工作只维护一份方案。同一 Issue、PR 或连续任务中的 grill、反馈轮次、候选方案比较、实现偏离和测试回写都直接更新这份 WIP；不得为同一工作中的设计迭代、反馈轮次或废弃选项创建多份方案，日期与 feature 在迭代期间保持不变。
- `.wip.html` 不允许合并。工作完成前保留唯一 WIP；验证完成后将它改名并更新为 ACTIVE，最终不保留同一工作的中间稿、未生效版本或废弃方案文件。
- ACTIVE 生效后仅允许修正错字、链接和非实质说明。目标、接口、数据、流程或核心设计发生变化时，必须由一个独立的后续工作创建新 WIP 方案。
- SUPERSEDED 仅用于已经合并并独立生效的 ACTIVE 被另一个后续工作替代的情形；替代方案生效后才把旧 ACTIVE 改为 SUPERSEDED，并注明替代方案和原因。不得用 SUPERSEDED 保存同一工作中的过程稿、方案 A/B/C 或反馈轮次。
- 模板文件 `design/TEMPLATE.html` 是上述方案路径规则的唯一例外；它不参与 WIP/ACTIVE 状态门禁，但仍须通过 HTML 结构和单文件资源校验。

新建方案默认复制 `design/TEMPLATE.html` 作为基础格式。模板提供顶部元信息、核心章节、常用内容组件、PC/手机响应式与可访问性基线；复制后必须替换占位内容、删除不适用的示例，并允许按主题调整配色、标题处理、章节顺序和真正有用的图表，不要求所有方案呈现相同视觉主题。原始诉求、目标、方案和测试结果为必备内容，顶部必须展示标题、创建日期、所属模块、状态以及存在时的需求来源。

```bash
cp design/TEMPLATE.html design/<module>/yyyymmdd-<feature>.wip.html
```

方案必须是可离线阅读的单文件 HTML。允许内联 CSS、SVG 和少量交互 JavaScript，禁止依赖 CDN、远程字体、远程脚本、远程样式、远程图片或仓库内的其他资源文件。根据内容使用有助于理解的表格、流程图、架构图、时序图、状态图或数据模型图，不添加纯装饰图表。

创建方案时，测试结果应标记为待验证并记录计划验证项。测试完成后回写实际命令、验证页面、结果、失败项和未执行原因。与本次改动相关的测试失败时不得转为 ACTIVE；受环境限制时必须记录原因、风险和替代验证。

运行 `make check-design` 校验方案路径、状态、HTML 基本结构、单文件资源约束和 WIP 合并门禁。`design/TEMPLATE.html` 不参与 WIP/ACTIVE 状态门禁；是否需要方案、必备内容是否充分、响应式质量以及图表质量仍由开发者和评审判断，不做样式一致性机器检查。

自然语言中输出文件路径、目录路径或 URL 时，路径与后续中英文标点之间必须留一个空格。例如“请查看 `design/project/example.active.html` 。”代码块、命令、HTML 属性和 Markdown 链接语法内部不插入额外空格。

### API 设计规范

- HTTP 接口应当遵守 RESTFUL 的 API 设计原则:
  - 例如，设计 作者 的 别名 功能是，应当设计为：
    - 已有接口：
      - (r"/api/author/(.*)/update", AuthorBooksUpdate),
      - (r"/api/(author|publisher|tag|rating|series|format)", MetaList),
      - (r"/api/(author|publisher|tag|rating|series|format)/(.*)", MetaBooks),
    - 正确设计：(r"/api/author/(.*)/alias", AuthorAliases),
    - 错误设计：(r"/api/author-aliases/(.*)", AuthorAliases) —— 没有遵守restful设计原则
    - 错误设计：(r"/api/authors/{id}/aliases", AuthorAliases) —— 不应该使用复数单词 authors

### Pull Request 提交规范

- PR 时使用中文描述。
- PR 标题应准确概括改动，正文不得为空或只重复提交消息。正文至少包含：背景或目标、关键改动、实际验证结果、风险或兼容性，以及方案路径或豁免原因。
- 测试结果必须列出实际执行的命令与结果；未执行的项目应说明原因和风险，不得写成已通过。
- 涉及界面、布局、交互或其他可视结果时必须附带截图；其他改动在截图有助于评审理解时也应优先附带。无法截图时在正文说明原因。
- PR 引用 `design/` 下的 ACTIVE 单文件 HTML 方案时，必须同时提供 GitHub 文件链接和 RawGitHack 在线预览链接。两个链接都使用已推送提交的完整 commit SHA，不得使用会漂移的分支名或 `HEAD`。新增提交导致方案内容变化后，应同步更新链接。
- 固定链接按以下格式转换：
  ```text
  https://github.com/<owner>/<repo>/blob/<commit-sha>/<path>
  https://raw.githack.com/<owner>/<repo>/<commit-sha>/<path>
  ```
- 示例：
  - GitHub 文件：`https://github.com/talebook/talebook/blob/18113f147aefa0ad79e8c7efd93f1c882610b3ed/design/webserver/20260721-booksource-large-json-import.active.html`
  - RawGitHack 预览：`https://raw.githack.com/talebook/talebook/18113f147aefa0ad79e8c7efd93f1c882610b3ed/design/webserver/20260721-booksource-large-json-import.active.html`

### 测试

- **每次新增或修改功能，必须附带对应的测试用例**，不允许只改业务代码不写测试。
- 后端改动在 `tests/` 中添加用例，前端改动在 `app/test/` 中添加用例。
- 具体写法见各子目录的 CLAUDE.md。

### 前端验收

- 修改前端交互、样式、主题、页面布局或弹窗时，除单元/组件测试外，必须使用 Chrome DevTools MCP 在浏览器中做实际渲染验证，并在回复中说明验证过的页面、主题或关键状态。
- 修改界面时允许使用 mock API 完成组件测试、E2E 和快速回归等隔离自测。mock 环境只服务于自动化测试或智能体内部验证，不得作为用户体验环境、实际数据验收或完整功能验证结果。
- 用户要求本地体验、查看实际效果或提供可访问地址时，必须使用 Docker 运行 Talebook 后端，并让前端连接该真实后端；不得提供由 mock API 驱动的体验地址。体验环境应能使用真实书库、封面、登录、阅读和管理等完整功能。
- 只要智能体需要手动启动并保留 Nuxt dev server，无论用户是否已明确要求体验，都必须先启动 Docker 后端并确认 `http://127.0.0.1:8080/api/welcome` 可用，再通过 `API_URL=http://127.0.0.1:8080` 启动前端。Docker 后端不可用时必须报告阻塞，不得静默降级到 mock。
- 自动化测试命令可以管理短生命周期的 mock 与临时页面服务作为上述规则的唯一例外；这些服务不得向用户提供，测试结束后必须停止。
- 前端改动完成后，如果需要 dev server 才能体验，必须启动符合上述 Docker 后端约束的本地 dev server，并在最终回复中提供可访问地址（例如 `http://127.0.0.1:3000/` ）。
- 永远禁止设置 `CHOKIDAR_USEPOLLING=true` 启动 Nuxt、Vite 或其他前端开发服务，不允许在交互命令、脚本、Makefile、CI 或文档示例中启用该轮询模式，也不为 Docker、worktree、网络文件系统或热更新故障设置例外。
- 文件监听或热更新异常时，必须停止 dev server 并报告现象，改用原生文件事件、手动刷新或其他不启用 Chokidar polling 的方案。发现由智能体启动的 dev server 异常占用 CPU 时，应立即停止该进程并检查残留。
- 前端本地体验默认使用两个终端启动：
  ```bash
  # 终端 1：Docker 后端
  make dev

  # 确认真实后端已经就绪
  curl --fail --silent http://127.0.0.1:8080/api/welcome

  # 终端 2：连接 Docker 后端的 Nuxt dev server
  cd app
  API_URL=http://127.0.0.1:8080 npx nuxt dev --port 3000 --host 127.0.0.1
  ```
- 如需使用本仓库 mock API 自测，应由测试步骤控制 mock 与临时前端进程的生命周期；不得把 mock 进程替代上述 Docker 体验环境。

### 提交前检查

```bash
make lint-py-fix  # 后端：用 black + isort 自动修复格式，开发完代码后必须执行
make lint-py      # 后端：flake8 必须通过，不允许提交有 lint 错误的代码
make pytest       # 后端：所有测试必须通过
make check-design # 内部方案：路径、状态、HTML 与资源约束必须通过
cd app && npm run lint   # 前端：eslint 必须通过
```

### 代码风格

- Python 行宽上限 120 字符（见 `pyproject.toml` black 配置）。
- 后端新增 JSON 接口默认使用 `@js` + `@auth` 装饰器，返回 `{"err": "ok", ...}`，禁止直接抛出 HTTP 异常。与公开阅读能力绑定的只读 JSON 可以不加 `@auth`，但必须逐资源调用 `can_view_book()` 或等价权限校验，并补游客、私有资源和所有者测试。媒体流、Podcast、OPDS 等非 JSON 协议可以使用标准 HTTP 状态码，但不得绕过资源权限。
- 前端 API 调用统一使用 `plugins/talebook.js` 的 `backend()` 函数，禁止直接使用 `fetch`。
- 前端 i18n 文案（`app/i18n/locales/*.json` ）中**禁止出现字面量 `@` 和 `<`**：vue-i18n 把 `@`（如 `@js:`）当链接消息语法（报 `Invalid linked format`）、把 `<`（如 `<js>`）当 HTML（报 `Detected HTML`），任一出现都会让**整个 locale 编译失败**——页面所有文案显示为原始 key、dev server 返回 500，而 `JSON.parse` 与 eslint 均不报错（只有 dev server 日志里有 `[unplugin-vue-i18n]` 错误）。文案应改写绕开这两个符号，必须保留时用字面插值 `{'@'}`。新增 key 后 HMR 常不热更，需重启 `nuxt dev`。

### 目录规范

- `scripts/` 目录存放迁移、构造数据、临时测试和工程检查脚本。
- `document/` 目录存放面向产品使用者的安装、使用和接口说明等文档。
- `design/` 目录存放内部开发方案和已生效的架构决策；同一工作的中间过程写回唯一 WIP，不另存过程废弃文档。
