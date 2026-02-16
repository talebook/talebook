# Python 项目从 Flake8、Black 迁移至 Ruff - 实现计划

## \[x] Task 1: 更新 pyproject.toml 配置

* **Priority**: P0

* **Depends On**: None

* **Description**:

  * 在 pyproject.toml 中添加完整的 Ruff 配置

  * 移除旧的 \[tool.black] 配置

  * 移除 flake8 依赖，添加 ruff 依赖

  * 配置 line-length = 120

  * 配置 select 规则包含 E, W, F, I, UP

* **Acceptance Criteria Addressed**: AC-1

* **Test Requirements**:

  * `programmatic` TR-1.1: 验证 pyproject.toml 包含 \[tool.ruff], \[tool.ruff.lint], \[tool.ruff.format] 配置节

  * `programmatic` TR-1.2: 验证 line-length 为 120

  * `programmatic` TR-1.3: 验证 select 规则包含 E, W, F, I, UP

  * `programmatic` TR-1.4: 验证 \[tool.black] 已移除

  * `programmatic` TR-1.5: 验证 flake8 已移除，ruff 已添加到依赖

* **Notes**: 参考文档中的配置示例，保持与现有代码风格兼容

## \[x] Task 2: 更新 requirements.txt

* **Priority**: P0

* **Depends On**: None

* **Description**:

  * 从 requirements.txt 中移除 flake8

  * 添加 ruff 到 requirements.txt

* **Acceptance Criteria Addressed**: AC-2

* **Test Requirements**:

  * `programmatic` TR-2.1: 验证 requirements.txt 中没有 flake8

  * `programmatic` TR-2.2: 验证 requirements.txt 中包含 ruff

* **Notes**: 保持其他依赖不变

## [x] Task 3: 更新 VS Code settings.json

* **Priority**: P1

* **Depends On**: None

* **Description**:

  * 更新 .vscode/settings.json 配置

  * 配置使用 Ruff 作为格式化工具

  * 配置使用 Ruff 作为 Linter

* **Acceptance Criteria Addressed**: AC-3

* **Test Requirements**:

  * `programmatic` TR-3.1: 验证 settings.json 包含 Ruff 相关配置

  * `human-judgment` TR-3.2: 检查配置内容合理且无语法错误

* **Notes**: 参考 Ruff 官方 VS Code 配置建议

## [x] Task 4: 创建 .pre-commit-config.yaml

* **Priority**: P1

* **Depends On**: None

* **Description**:

  * 创建 .pre-commit-config.yaml 文件

  * 配置 ruff 和 ruff-format hooks

  * 使用合理的 Ruff 版本

* **Acceptance Criteria Addressed**: AC-4

* **Test Requirements**:

  * `programmatic` TR-4.1: 验证 .pre-commit-config.yaml 文件存在

  * `programmatic` TR-4.2: 验证配置包含 ruff 和 ruff-format hooks

  * `programmatic` TR-4.3: 验证 YAML 语法正确

* **Notes**: 版本号可参考文档中的建议

## [x] Task 5: 安装 Ruff 并运行初次检查

* **Priority**: P0

* **Depends On**: Task 1, Task 2

* **Description**:

  * 安装 Ruff

  * 运行 ruff check 查看现有问题

  * 评估问题数量和严重程度

* **Acceptance Criteria Addressed**: AC-5

* **Test Requirements**:

  * `programmatic` TR-5.1: 验证 ruff 命令可用

  * `human-judgment` TR-5.2: 记录初次检查的问题数量

* **Notes**: 此步骤主要用于了解当前状态，暂不修复问题

## [x] Task 6: 运行 Ruff 格式化所有代码

* **Priority**: P0

* **Depends On**: Task 5

* **Description**:

  * 运行 ruff format 格式化所有 Python 代码

  * 排除不需要格式化的目录（如 .venv）

* **Acceptance Criteria Addressed**: AC-5

* **Test Requirements**:

  * `programmatic` TR-6.1: 运行 ruff format --check 验证无格式化错误

  * `programmatic` TR-6.2: 验证 webserver/ 和 tests/ 目录下的 Python 文件已格式化

* **Notes**: 格式化是一次性操作，确保在干净的 git 状态下进行

## [x] Task 7: 更新 GitHub Actions 和 Makefile
- **Priority**: P0
- **Depends On**: Task 1, Task 2
- **Description**: 
  - 更新 Makefile 中的 lint-py 目标，使用 ruff 替代 flake8
  - 确保 ci.yml 中的 make lint-py 命令可以正常工作
- **Acceptance Criteria Addressed**: AC-1, AC-2
- **Test Requirements**:
  - `programmatic` TR-7.1: 验证 make lint-py 使用 ruff 而不是 flake8
  - `programmatic` TR-7.2: 验证 make lint-py 可以正常运行
- **Notes**: Makefile 中的 `-` 前缀表示忽略命令错误

## [ ] Task 8: 安装并配置 Pre-commit (可选)

* **Priority**: P2

* **Depends On**: Task 4

* **Description**:

  * 安装 pre-commit

  * 运行 pre-commit install 设置 hooks

* **Acceptance Criteria Addressed**: AC-4

* **Test Requirements**:

  * `human-judgment` TR-7.1: 验证 pre-commit 已安装并配置

* **Notes**: 此任务为可选，取决于项目是否需要 pre-commit

