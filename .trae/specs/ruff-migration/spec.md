# Python 项目从 Flake8、Black 迁移至 Ruff - 产品需求文档

## Overview
- **Summary**: 将 talebook 项目的 Python 代码检查和格式化工具从当前的 Flake8 和 Black 迁移至 Ruff，统一使用单一工具链来提高开发效率并避免工具间冲突。
- **Purpose**: 解决当前多工具（Flake8 + Black）配置复杂、运行速度慢、容易产生工具间冲突的问题，同时利用 Ruff 集成的 pyupgrade 功能来统一代码风格和语法。
- **Target Users**: talebook 项目的 Python 开发者和维护者

## Goals
- 完全移除 Flake8 和 Black，统一使用 Ruff 作为唯一的 Linter 和 Formatter
- 配置 Ruff 以保持与现有代码风格尽可能一致，减少不必要的代码变更
- 更新 VS Code 配置以支持 Ruff
- 配置 Pre-commit hooks 使用 Ruff
- 运行一次统一格式化确保所有代码风格一致

## Non-Goals (Out of Scope)
- 不进行大规模的代码重构，仅进行工具迁移
- 不更改项目的核心功能逻辑
- 不引入除 Ruff 之外的其他新依赖
- 不配置复杂的自定义规则，优先使用与当前配置兼容的默认规则

## Background & Context
- 当前项目使用 pyproject.toml 进行配置，已包含 `[tool.black]` 配置，行长度为 120
- 当前项目使用 `requirements.txt` 和 `pyproject.toml` 管理依赖
- Python 版本要求为 >= 3.11
- VS Code 配置中设置了 `python.formatting.provider: "black"`
- 项目有大量 Python 代码在 `webserver/` 和 `tests/` 目录下

## Functional Requirements
- **FR-1**: 在 pyproject.toml 中添加 Ruff 配置，移除 Flake8 依赖
- **FR-2**: 在 requirements.txt 中更新依赖，将 flake8 替换为 ruff
- **FR-3**: 更新 VS Code settings.json，配置使用 Ruff 作为格式化和检查工具
- **FR-4**: 创建并配置 .pre-commit-config.yaml 使用 Ruff
- **FR-5**: 运行 Ruff 格式化所有 Python 代码

## Non-Functional Requirements
- **NFR-1**: Ruff 配置应保持与当前 Black 的行长度设置一致 (120)
- **NFR-2**: 迁移后运行 Ruff 检查不应有大量错误
- **NFR-3**: 配置应包含 pyupgrade (UP) 规则以保持代码语法现代化

## Constraints
- **Technical**: 
  - Python 版本 >= 3.11
  - 使用 pyproject.toml 作为主要配置文件
  - 保持当前的行长度限制为 120
- **Business**:
  - 迁移应在不影响项目功能开发的前提下进行
- **Dependencies**:
  - 依赖 Ruff 0.4.x 以上版本

## Assumptions
- 项目开发者对代码工具的变更有合理的接受度
- 统一格式化带来的一次性代码变更不会造成严重的版本控制问题
- 没有依赖特定 Flake8 插件的特殊需求

## Acceptance Criteria

### AC-1: pyproject.toml 正确配置 Ruff
- **Given**: 项目根目录存在 pyproject.toml
- **When**: 检查 pyproject.toml 配置
- **Then**: 
  - 包含 `[tool.ruff]` 配置节
  - 包含 `[tool.ruff.lint]` 和 `[tool.ruff.format]` 配置
  - line-length 设置为 120
  - select 包含 E, W, F, I, UP 规则
  - 已移除旧的 `[tool.black]` 配置
  - flake8 依赖已从 `[project.dependencies]` 中移除
  - ruff 已添加为依赖
- **Verification**: `programmatic`

### AC-2: requirements.txt 正确更新
- **Given**: 项目根目录存在 requirements.txt
- **When**: 检查 requirements.txt 内容
- **Then**: 
  - flake8 依赖已移除
  - ruff 依赖已添加
- **Verification**: `programmatic`

### AC-3: VS Code 配置已更新
- **Given**: 项目存在 .vscode/settings.json
- **When**: 检查 settings.json 配置
- **Then**: 
  - 配置了使用 Ruff 作为格式化工具
  - 配置了使用 Ruff 作为 Linter
- **Verification**: `programmatic`

### AC-4: Pre-commit 配置已创建
- **Given**: 项目根目录
- **When**: 检查是否存在 .pre-commit-config.yaml
- **Then**: 
  - 文件存在
  - 配置了 ruff 和 ruff-format hooks
  - 使用合理的 Ruff 版本
- **Verification**: `programmatic`

### AC-5: 代码已统一格式化
- **Given**: 所有 Python 源文件
- **When**: 运行 `ruff check` 和 `ruff format --check`
- **Then**: 
  - 没有格式化错误
  - Linter 警告数量在可接受范围内
- **Verification**: `programmatic`

## Open Questions
- [ ] 是否需要保留 pre-commit 配置？（当前项目没有该配置）
- [ ] 对于 Ruff 报告的现有问题，是否需要一次性修复？
