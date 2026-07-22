# Claude Code Action v1 的业务环境依赖调研

- 调研日期：2026-07-21
- 调研对象：`anthropics/claude-code-action@v1`
- 官方仓库基准：[`b76a0776ae74036e77cd11018083743453d7ad35`](https://github.com/anthropics/claude-code-action/tree/b76a0776ae74036e77cd11018083743453d7ad35)
- 来源范围：Anthropic 官方仓库的 README、文档、示例和 Action 元数据，以及 GitHub Actions 官方文档。本文未用第三方博客作为依据，也未用 Issue/Discussion 推导主结论。

## 结论摘要

1. `anthropics/claude-code-action@v1` **不会准备业务项目的 Python、Node.js、Calibre、编译器或项目依赖**。它负责的是自身运行：安装或选择 Bun、安装 Action 自己的 production dependencies，并启动 Claude Code。官方元数据明确显示它是一个 **composite action**，其 `Install Dependencies` 在 `${GITHUB_ACTION_PATH}` 中执行，而不是在业务仓库中安装依赖。[Action 元数据，第 186–212 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L186-L212)
2. Anthropic 官方没有宣称“业务依赖必须用 setup/install”或“必须用 job container”。官方入门示例只使用 `ubuntu-latest`，checkout 后直接调用 Action；它仅示范通过 `--allowedTools` 授权 Claude 执行 `npm install`、build、test、lint，并没有准备 Python、Node 或系统包。[官方 `examples/claude.yml`，第 20–50 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/examples/claude.yml#L20-L50)
3. 在普通 GitHub-hosted runner 上，GitHub 官方推荐用 `actions/setup-python` / `actions/setup-node` 固定语言版本，再用 `pip` / `npm ci` 安装业务依赖。[GitHub：构建和测试 Python](https://docs.github.com/en/actions/how-tos/use-cases-and-examples/building-and-testing/building-and-testing-python)、[GitHub：构建和测试 Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
4. 对包含 Calibre 和较多系统依赖的 Talebook，使用 `jobs.<job_id>.container.image: talebook/talebook:dev` 提供统一开发环境是合理且受 GitHub 官方支持的选择。GitHub 明确说明，job container 会运行该 job 中所有未另行声明容器的步骤；Docker container action 才会作为 sibling container 运行。[GitHub：在容器中运行 job](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)
5. `path_to_claude_code_executable` 和 `path_to_bun_executable` **只替换 Action 自己使用的 Claude Code / Bun 可执行文件**，不是业务依赖入口。默认不要为了安装 Talebook 依赖而设置它们。[Action 元数据，第 144–151 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L144-L151)

## 1. 官方如何划分 Action 运行时和业务运行时

### Action 自己负责的内容

当前 v1 的 `action.yml` 声明 `runs.using: composite`，随后：

- 没有传 `path_to_bun_executable` 时，调用固定提交的 `oven-sh/setup-bun` 安装指定 Bun 版本；
- 有自定义 Bun 路径时，把它所在目录写入 `GITHUB_PATH`；
- 在 `${GITHUB_ACTION_PATH}` 中执行 `bun install --production`，安装的是 **Claude Code Action 自身依赖**；
- composite action 的多个执行步骤显式使用 `shell: bash`。

以上均可从 [Action 元数据，第 186–212 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L186-L212) 直接核对。

因此，日志中的 `Install Dependencies` 不能理解成“安装 Talebook 的 `requirements.txt` 或 `app/package-lock.json`”。它的工作目录是 Action 下载目录，不是 `${GITHUB_WORKSPACE}`。

### 业务仓库需要自己负责的内容

Anthropic 的高级配置文档明确说，Claude 默认不能执行任意 Bash；若希望它运行 `npm install` 或 `npm run test`，必须通过 `claude_args` 显式授权。[官方配置文档，第 223–244 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L223-L244)

这说明“命令是否可调用”和“命令及依赖是否已存在”是两件事：

- `--allowedTools` 解决权限问题；
- workflow 的 setup/install 步骤或 job container 解决环境问题；
- `settings.env` 只传递测试所需环境变量，例如 `NODE_ENV`、`CI`、`DATABASE_URL`，也不会安装软件。[官方配置文档，第 184–202 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L184-L202)

## 2. 官方推荐前置 setup/install，还是 job container

### Anthropic 官方仓库没有二选一结论

Anthropic 提供的基础示例是：

```yaml
runs-on: ubuntu-latest
steps:
  - uses: actions/checkout@v6
  - uses: anthropics/claude-code-action@v1
```

示例只在注释中展示 `--allowedTools "Bash(npm install),..."`，没有 `setup-python`、`setup-node`、`pip install`、`npm ci` 或 job container。[官方 `examples/claude.yml`，第 20–50 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/examples/claude.yml#L20-L50)

进一步核对该固定提交的 [整个官方 `examples/` 目录](https://github.com/anthropics/claude-code-action/tree/b76a0776ae74036e77cd11018083743453d7ad35/examples) 后，11 个顶层 workflow 示例中没有 `jobs.<job_id>.container` / `container:` 示例。也就是说，**Anthropic 官方文档支持“自定义容器环境”这一用例，但没有提供可直接复制的 job container workflow**；job container 的正确性依据来自 GitHub Actions 官方规范，而不是 Anthropic 示例。

另一个官方 CI 自动修复示例也只是允许 `Bash(bun:*)`、`Bash(npm:*)`、`Bash(npx:*)`，没有替业务仓库建立语言或系统环境。[官方 `ci-failure-auto-fix.yml`，第 101–117 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/examples/ci-failure-auto-fix.yml#L101-L117)

所以不能说 Anthropic 官方“推荐项目在 Claude Action 前安装全部依赖”，也不能说 Anthropic 官方“推荐 job container”。准确说法是：**Action 使用调用方提供的 runner/job 环境，项目自行选择环境准备方式。**

### GitHub 官方对一般项目的建议

GitHub 对 GitHub-hosted runner 的语言项目给出的标准做法是：

- Python：使用 `actions/setup-python` 固定 Python/PyPy 版本，然后用 pip 安装依赖；
- Node.js：使用 `actions/setup-node` 固定 Node 版本，然后执行 `npm ci`；
- 自托管 runner 则需要自行安装语言运行时并加入 `PATH`。

来源：[GitHub：构建和测试 Python](https://docs.github.com/en/actions/how-tos/use-cases-and-examples/building-and-testing/building-and-testing-python)、[GitHub：构建和测试 Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)。

### 复杂系统依赖适合 job container

GitHub 同时正式支持 `jobs.<job_id>.container`：job 中未单独声明容器的步骤都在指定镜像内运行，镜像可以来自 Docker Hub 或其他 registry。[GitHub：在容器中运行 job](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)

因此选择标准应是：

| 场景 | 更合适的方式 |
| --- | --- |
| 仅需标准 Python 或 Node 版本 | `setup-python` / `setup-node` + lockfile 安装 |
| 依赖 Calibre、系统动态库、编译工具等复杂环境 | 维护项目 dev 镜像，作为 job container |
| 自托管 runner 已统一预装环境 | 使用 runner 环境，并在 workflow 中做版本探测 |
| 只需替换 Claude/Bun 自身安装方式 | `path_to_claude_code_executable` / `path_to_bun_executable` |

Talebook 明显属于第二类；现有 `ci.yml` 已通过 `talebook/talebook-base:latest` 解决 Calibre 等依赖，这一模式可以直接推广到 Claude/Codex job。

## 3. job container 是否兼容 Claude Code Action

### 结论：兼容，但需满足镜像契约

首先需要纠正一个表述：当前 `anthropics/claude-code-action@v1` 顶层不是单一 JavaScript Action，而是 composite action。[Action 元数据，第 186–188 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L186-L188)

GitHub 官方规定，配置 job container 后，该 job 中所有没有自行声明 container 的步骤都在 job container 运行；若某一步本身是 Docker container action，它才会在同网络、同 volume mounts 的 sibling container 中运行。[GitHub：在容器中运行 job](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)

所以 checkout、Claude composite action 的 Bash 步骤、Action 启动的 Claude Code 进程，以及 Claude 获准执行的 `make` / `npm` / `pytest` 命令都会位于 Talebook job container 中。

镜像至少应满足以下契约：

- Linux 镜像；
- `bash`，因为 Action 的多个 composite run step 显式指定 `shell: bash`；
- `git`、`curl`、CA certificates 和常用 coreutils；
- 可写的 workspace、`HOME`、`RUNNER_TEMP` 和 GitHub file-command 目录；
- 推荐 Debian/Ubuntu/glibc 基线，避免 Alpine/musl 对第三方 Action 和原生可执行文件造成额外兼容风险；
- 若以非 root 用户运行，需要验证 checkout、`GITHUB_PATH`、Action 安装目录及缓存目录权限。Talebook 当前 `ci.yml` 的 `options: --user root` 是更简单、已验证过的基线；
- job 内自行编写的 `run` 步骤默认 shell 是 `sh`，GitHub 官方建议按需覆盖；Talebook 可设置 `defaults.run.shell: bash`。[GitHub：在容器中运行 job](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/run-jobs-in-a-container)

这些属于镜像兼容性要求，不需要给容器 `--privileged`。Claude Action 的常规运行与 Docker-in-Docker 无关。

## 4. 两个 `path_to_*` 输入到底解决什么

### `path_to_claude_code_executable`

它提供自定义 Claude Code 可执行文件路径，并跳过 Action 的自动安装。官方同时警告旧版本可能与 Action 后续使用的新 Claude Code 特性不兼容。[Action 元数据，第 144–147 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L144-L147)

### `path_to_bun_executable`

它提供自定义 Bun 路径，并跳过默认 Bun 安装。官方警告不兼容 Bun 版本可能导致 Action 失败。[Action 元数据，第 148–151 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/action.yml#L148-L151)

官方高级配置把两者定位为 Nix、自定义容器或特殊包管理环境中默认安装不可用时的替代入口，并再次要求版本兼容。[官方配置文档，第 352–378 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L352-L378)

它们不负责：

- 安装 Calibre；
- 安装 Talebook 的 `requirements.txt` / `requirements-test.txt`；
- 安装 `app/package-lock.json` 对应的 `node_modules`；
- 安装 `make`、ruff、pytest 或浏览器；
- 授权 Claude 执行业务命令。

对 Talebook 的默认建议是 **不设置这两个输入**，让 `@v1` 使用其配套的 Bun/Claude Code 版本；dev 镜像专注提供业务开发环境。只有在网络受限、确实要离线运行，或已经建立 Action 与 CLI 版本联动测试时，才把 Bun/Claude Code 烘进镜像并传入路径。

## 5. 官方示例是否包含 Python、Node 或自定义工具准备

截至本次固定提交，结论如下：

| 项目 | 官方示例情况 | 含义 |
| --- | --- | --- |
| Node 项目依赖 | 示例仅展示允许 `npm install` / build / test / lint，没有 `setup-node` 或 `npm ci` 前置步骤 | 调用方自己准备；授权不等于安装 |
| Python 项目依赖 | 没有通用 `setup-python` / `pip install -r ...` 示例 | 调用方自己准备 |
| Python MCP | 有 `uv --directory ... run server_file.py` 配置示例，但没有安装 `uv` 或业务依赖 | 文档假设 `uv` 已在调用环境中，[官方配置文档，第 49–87 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L49-L87) |
| Node MCP | 有 `npx` 命令示例，但没有为业务项目建立 Node 环境 | 文档假设相关命令可用，[官方配置文档，第 7–17 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L7-L17) |
| Action 自身依赖 | Action 会安装自己的 Bun 和 `${GITHUB_ACTION_PATH}` production dependencies | 与业务仓库依赖严格分开 |
| 自定义工具权限 | 必须通过 `--allowedTools` 精确授权 | 工具要先存在于 job 环境中 |

## 6. 对 Talebook 的建议

### 推荐结构

继续采用用户已确认的单一 mutable tag：`talebook/talebook:dev`，不引入 dev-SHA 标签。Claude job 使用与现有 `ci.yml` 相同的 job container 模式：

```yaml
jobs:
  claude:
    runs-on: ubuntu-latest
    container:
      image: talebook/talebook:dev
      options: --user root
    defaults:
      run:
        shell: bash
    steps:
      - uses: actions/checkout@v4

      - name: Verify development environment
        run: |
          command -v ebook-convert
          command -v python3
          command -v npm
          command -v make
          ebook-convert --version
          python3 --version
          node --version

      - name: Synchronize checkout dependencies
        run: |
          make init
          cd app
          npm ci

      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          claude_args: |
            --allowedTools "Bash(make init),Bash(make lint-py),Bash(make lint-py-fix),Bash(make pytest),Bash(npm ci),Bash(npm run lint),Bash(npm run test:*),Bash(npm run build)"
```

以上是结构示意，最终权限应结合 Talebook 实际命令做最小化整理。官方 v1 文档采用 `--allowedTools` 拼写；迁移表也明确把旧 `allowed_tools` 迁移到 `claude_args: --allowedTools ...`。[官方配置文档，第 336–350 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L336-L350)

### dev 镜像负责什么

`talebook/talebook:dev` 应至少包含：

- 与后端测试一致的 Calibre 和系统动态库；
- Python、pip、后端生产与测试依赖；
- Node.js 20、npm，以及前端 native package 构建所需系统包；
- git、bash、curl、CA certificates、make、常用诊断工具；
- ruff、pytest 等仓库规定的开发测试工具。

但要区分“镜像里的预装依赖”和“当前 checkout 的依赖”：GitHub 会把当前仓库 checkout 到工作空间，镜像构建时位于 `/var/www/talebook/app/node_modules` 的内容不会自动变成当前 `${GITHUB_WORKSPACE}/app/node_modules`。为覆盖 PR 修改 lockfile 的场景，仍应在 checkout 后执行 `make init` 和 `npm ci`，或者实现一个经过验证的 workspace dependency seed/copy 机制。前者更简单可靠，也与 GitHub 官方标准流程一致。

dev 镜像的主要价值是消除 Calibre、系统库、编译工具和语言运行时的重复准备；checkout 后的 lockfile 同步负责保证当前分支依赖准确。

### 不建议用 `path_to_*` 解决 Talebook 依赖

建议先让 Claude Action 在 job container 内自行安装它匹配的 Bun/Claude Code，不传 `path_to_*`。这样仍然满足“Claude 运行在 dev container 内”，因为安装和执行都发生在 job container 中；同时避免 mutable `:dev` 镜像中的 Claude/Bun 版本与未来 `@v1` 不匹配。

## 7. 风险与验证重点

### mutable `:dev` 的漂移

`talebook/talebook:dev` 会随 master 更新，同一 workflow 文件在不同时间可能得到不同镜像。用户已明确接受只维护 latest；建议每次 job 输出镜像内的构建版本、Python/Node/Calibre 版本，并在发布 `:dev` 前执行完整 smoke workflow。若 registry 能获得 digest，也应记录在日志中用于追溯。

### Action 与镜像的兼容

- Action 依赖 Bash；镜像缺 Bash 会直接失败。
- 默认 Bun/Claude 安装需要网络、curl 和可信 CA。
- 若传 `path_to_*`，版本兼容责任转移给 Talebook 镜像维护者；官方明确警告不兼容版本会失败。
- 非 root 用户可能碰到 checkout、工具缓存或 `$HOME` 写权限问题；需要真实 GitHub Actions / `act` 测试覆盖。

### 项目依赖与镜像内容不一致

只在镜像构建时跑一次 `npm ci`，不能覆盖 PR 修改 `package-lock.json` 的情况。checkout 后同步依赖是必要的正确性门禁，而不是重复劳动。

### Bash 权限和供应链安全

Anthropic 官方说明 Bash 默认禁用，应只开放必需命令。[官方配置文档，第 223–244 行](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/configuration.md#L223-L244) 容器提供环境隔离，但不能抵消 prompt injection 或不可信分支在带 secrets job 中执行代码的风险。Anthropic 官方安全文档特别警告 `pull_request_target` / `workflow_run` checkout 不可信 head 到 workspace root 的风险，并建议最小权限与安全 checkout 模式。[官方安全文档](https://github.com/anthropics/claude-code-action/blob/b76a0776ae74036e77cd11018083743453d7ad35/docs/security.md)

### 本地 `act` 不是唯一兼容性证明

`act` 能证明 workflow 结构、镜像依赖和大部分 Action 运行链路，但它不是 GitHub-hosted runner 的完全等价实现。最终应至少覆盖：

1. 本地构建 `talebook/talebook:dev`；
2. 用 `act` 在 job container 内运行环境探测、checkout、依赖同步和测试；
3. 用可控的假 prompt / 最小认证路径验证 Claude Action 启动到预期阶段；
4. 合并后观察一次真实 GitHub Actions 运行，确认 token、file commands、HOME、网络和 artifact 行为。

## 最终判断

`claude.yml` 完全可以像现有 `ci.yml` 一样使用：

```yaml
container:
  image: talebook/talebook:dev
  options: --user root
```

这比在 Claude workflow 中重复安装 Calibre 和各种系统依赖更适合 Talebook。需要保留的前置步骤不是重新搭建系统环境，而是 checkout 后对当前分支执行 lockfile 驱动的依赖同步与环境 smoke check。`anthropics/claude-code-action@v1` 继续负责自身 Bun/Claude 运行时，`talebook/talebook:dev` 负责业务开发环境，两者职责清晰且与官方行为一致。
