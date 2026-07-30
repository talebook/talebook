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
4. 按方案编码；实现偏离方案时先更新方案再继续。
5. 完成测试、回写测试结果，将方案转为 ACTIVE 后再合并。

以下改动必须创建方案：新功能或用户可感知行为变化；API、数据结构、库表、权限、部署、配置或兼容性变化；跨模块改动；性能、安全、数据迁移；复杂缺陷修复；开发规范和工程流程变化。错字、注释、小型文档修正、纯格式化、lint 修复、不改变业务行为的测试调整和小型重构通常可以豁免。最终回复或 PR 必须给出方案路径，或明确说明豁免原因。

内部方案使用中文，路径格式为 `design/<module>/yyyymmdd-<feature>.<status>.html` 。

- `<module>` 优先使用实际代码目录，例如 `app` 、`webserver` 、`docker` 、`scripts` 和 `tests` ；工程治理、发布和流程规范使用 `project` 。跨模块方案归入主要责任模块，并在正文列出影响范围。
- `<feature>` 使用小写英文 `kebab-case`；日期使用方案首次创建日期。
- 状态仅允许 `wip`、`active` 和 `superseded` 。WIP 表示开发或测试中，ACTIVE 表示已完成验证且当前有效，SUPERSEDED 表示已被新方案替代。
- `.wip.html` 不允许合并。未生效的 WIP 可以删除；ACTIVE 不允许删除，只能在替代方案生效后改为 SUPERSEDED，并注明替代方案和原因。
- ACTIVE 生效后仅允许修正错字、链接和非实质说明。目标、接口、数据、流程或核心设计发生变化时，必须创建新 WIP 方案。

方案必须是可离线阅读的单文件 HTML，不要求固定模板或固定章节顺序。允许内联 CSS、SVG 和少量交互 JavaScript，禁止依赖 CDN、远程字体、远程脚本、远程样式、远程图片或仓库内的其他资源文件。方案必须包含原始诉求、目标、方案和测试结果，并在顶部展示标题、创建日期、所属模块、状态以及存在时的需求来源。根据内容使用有助于理解的表格、流程图、架构图、时序图、状态图或数据模型图，不添加纯装饰图表。

创建 WIP 方案时，必须使用项目的 `frontend-design` skill（`.agents/skills/frontend-design/SKILL.md`）制作页面的视觉设计与信息层级，并遵循该 skill 的设计与自检要求。

创建方案时，测试结果应标记为待验证并记录计划验证项。测试完成后回写实际命令、验证页面、结果、失败项和未执行原因。与本次改动相关的测试失败时不得转为 ACTIVE；受环境限制时必须记录原因、风险和替代验证。

运行 `make check-design` 校验方案路径、状态、HTML 基本结构、单文件资源约束和 WIP 合并门禁。是否需要方案、必备内容是否充分以及图表质量由开发者和评审判断，不做机器检查。

自然语言中输出文件路径、目录路径或 URL 时，路径与后续中英文标点之间必须留一个空格。例如“请查看 `design/project/example.active.html` 。”代码块、命令、HTML 属性和 Markdown 链接语法内部不插入额外空格。

### Pull Request 提交规范

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
- 前端改动完成后，如果需要 dev server 才能体验，必须启动本地 dev server，并在最终回复中提供可访问地址（例如 `http://127.0.0.1:3000/` ）。
- 永远禁止设置 `CHOKIDAR_USEPOLLING=true` 启动 Nuxt、Vite 或其他前端开发服务，不允许在交互命令、脚本、Makefile、CI 或文档示例中启用该轮询模式，也不为 Docker、worktree、网络文件系统或热更新故障设置例外。
- 文件监听或热更新异常时，必须停止 dev server 并报告现象，改用原生文件事件、手动刷新或其他不启用 Chokidar polling 的方案。发现由智能体启动的 dev server 异常占用 CPU 时，应立即停止该进程并检查残留。
- 前端本地体验默认启动方式：
  ```bash
  cd app
  npx nuxt dev --port 3000 --host 127.0.0.1
  ```
- 如需使用本仓库 mock API，可用两个终端启动 mock 与 Nuxt：
  ```bash
  # 终端 1
  cd app
  PORT=18180 node test/mock-server.js

  # 终端 2
  cd app
  API_URL=http://127.0.0.1:18180 npx nuxt dev --port 3000 --host 127.0.0.1
  ```

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
- 后端新增接口统一使用 `@js` + `@auth` 装饰器，返回 `{"err": "ok", ...}`，禁止直接抛出 HTTP 异常。
- 前端 API 调用统一使用 `plugins/talebook.js` 的 `backend()` 函数，禁止直接使用 `fetch`。
- 前端 i18n 文案（`app/i18n/locales/*.json` ）中**禁止出现字面量 `@` 和 `<`**：vue-i18n 把 `@`（如 `@js:`）当链接消息语法（报 `Invalid linked format`）、把 `<`（如 `<js>`）当 HTML（报 `Detected HTML`），任一出现都会让**整个 locale 编译失败**——页面所有文案显示为原始 key、dev server 返回 500，而 `JSON.parse` 与 eslint 均不报错（只有 dev server 日志里有 `[unplugin-vue-i18n]` 错误）。文案应改写绕开这两个符号，必须保留时用字面插值 `{'@'}`。新增 key 后 HMR 常不热更，需重启 `nuxt dev`。

### 目录规范

- `scripts/` 目录存放迁移、构造数据、临时测试和工程检查脚本。
- `document/` 目录存放面向产品使用者的安装、使用和接口说明等文档。
- `design/` 目录存放内部开发方案、架构决策和开发过程记录。
