# GitHub Actions Workflow 开发规范

本文件适用于 `.github/workflows/` 目录中的 GitHub Actions workflow。根目录 `AGENTS.md` 的通用开发、测试、方案和 PR 规范继续生效。

## 修改后必须执行真实 workflow

修改任何 workflow 时，必须在提交 PR 前使用本地 `act` 执行器测试。此要求包括触发器、权限、job、容器、Action、环境变量、步骤和脚本等变更。团队环境如果通过 `gh act` 扩展调用，可以使用该入口，但必须确认底层实际运行的是 `act`，并记录 act 版本。

本地验收必须满足：

1. 使用 `-W .github/workflows/<name>.yml` 加载本次修改的真实 workflow。
2. 使用与 workflow 匹配触发类型的事件，例如 `issue_comment`、`pull_request` 或 `workflow_dispatch`，并提供能让目标 job 命中的最小事件 JSON。
3. 使用 `-j <job>` 运行受影响的目标 job；存在多个受影响 job 时逐一验证。
4. workflow 使用本仓库构建的容器镜像时，先构建对应本地 target，并使用 `--pull=false` 等方式确认 `act` 没有强制拉取旧镜像。
5. 所有本地可复现的 Action bootstrap、依赖安装、脚本和步骤必须跑通。不得用简化 smoke workflow 替代真实 workflow，也不得用 actionlint、YAML 解析或读取 workflow 文本的单元测试代替真实执行。

参考命令如下，其中 `EVENT_FILE` 应指向当前操作系统临时路径中的事件文件：

```bash
act issue_comment \
  -W .github/workflows/claude.yml \
  -j claude \
  -e "$EVENT_FILE" \
  --pull=false
```

## 事件、密钥与外部边界

- 一次性事件 JSON 放在临时路径中，验证完成后删除，不得提交进仓库。
- 本地测试不得使用生产密钥、真实 OAuth token 或长期 GitHub token。
- GitHub OIDC、仓库写入、回帖、发布和真实模型调用等 `act` 无法完整模拟的边界，必须明确记录本地已经通过的最后一个步骤，并在真实 GitHub Actions 运行中继续验收。
- 如果本地可复现步骤失败，必须先修复，不得声明 workflow 验证通过。
- 如果环境限制导致 `act` 无法执行，PR 必须写明未执行原因和风险，并把缺失的真实 workflow 验证作为合并阻断项，不能以静态检查通过代替。

## PR 验证记录

PR 正文必须记录：

- `act` 或 `gh act` 的版本；
- 实际执行命令、事件类型和目标 job；
- 成功执行到的关键 Action 与步骤；
- 本地运行的最终结果；
- 无法本地模拟的外部边界及其真实 GitHub Actions 验证结果；
- 任何未执行原因和风险。
