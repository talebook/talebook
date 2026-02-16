# Python 项目从 Flake8、Black 迁移至 Ruff - 验证清单

## 配置文件验证
- [x] pyproject.toml 包含 [tool.ruff] 配置节
- [x] pyproject.toml 包含 [tool.ruff.lint] 配置节
- [x] pyproject.toml 包含 [tool.ruff.format] 配置节
- [x] pyproject.toml 中 line-length 设置为 120
- [x] pyproject.toml 中 select 规则包含 E, W, F, I, UP
- [x] pyproject.toml 中旧的 [tool.black] 配置已移除
- [x] pyproject.toml 中 flake8 依赖已移除
- [x] pyproject.toml 中 ruff 已添加为依赖
- [x] requirements.txt 中 flake8 已移除
- [x] requirements.txt 中 ruff 已添加

## 编辑器配置验证
- [x] .vscode/settings.json 已更新为使用 Ruff
- [x] .vscode/settings.json 配置无 JSON 语法错误

## Pre-commit 配置验证
- [x] .pre-commit-config.yaml 文件存在
- [x] .pre-commit-config.yaml 配置了 ruff hook
- [x] .pre-commit-config.yaml 配置了 ruff-format hook
- [x] .pre-commit-config.yaml YAML 语法正确

## 功能验证
- [x] ruff 命令可正常运行
- [x] ruff check 可正常执行
- [x] ruff format 可正常执行
- [x] 运行 ruff format --check 无格式化错误
- [x] webserver/ 目录下 Python 文件已格式化
- [x] tests/ 目录下 Python 文件已格式化
- [x] .venv/ 目录被正确排除

## CI/CD 验证
- [x] Makefile 中的 lint-py 已更新为使用 ruff
- [x] make lint-py 命令可以正常运行
- [x] GitHub Actions ci.yml 可以正常调用 make lint-py

## 代码质量验证
- [x] Ruff 报告的警告数量在可接受范围内
- [x] 没有明显的语法或逻辑错误引入
