# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 项目概述

Talebook 是基于 [Calibre](https://calibre-ebook.com/) 的个人电子书管理系统：

- **`webserver/`** — Python 后端（Tornado + Calibre），详见 `webserver/CLAUDE.md`
- **`app/`** — 前端（Nuxt 4 + Vue 3 + Vuetify），详见 `app/CLAUDE.md`

生产环境由 Nginx 托管静态前端，并将 `/api/`、`/get/`、`/read/`、`/auth/`、`/opds/` 反向代理到 8080 端口的 Tornado 后端。

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

前端命令见 `app/CLAUDE.md`。

## 开发规范

### 测试

- **每次新增或修改功能，必须附带对应的测试用例**，不允许只改业务代码不写测试。
- 后端改动在 `tests/` 中添加用例，前端改动在 `app/test/` 中添加用例。
- 具体写法见各子目录的 CLAUDE.md。

### 提交前检查

```bash
make lint-py-fix  # 后端：用 black + isort 自动修复格式，开发完代码后必须执行
make lint-py      # 后端：flake8 必须通过，不允许提交有 lint 错误的代码
make pytest       # 后端：所有测试必须通过
cd app && npm run lint   # 前端：eslint 必须通过
```

### 代码风格

- Python 行宽上限 120 字符（见 `pyproject.toml` black 配置）。
- 后端新增接口统一使用 `@js` + `@auth` 装饰器，返回 `{"err": "ok", ...}`，禁止直接抛出 HTTP 异常。
- 前端 API 调用统一使用 `plugins/talebook.js` 的 `backend()` 函数，禁止直接使用 `fetch`。

### 目录规范
- scripts 目录存放临时使用的脚本，例如迁移、构造数据、临时测试的脚本；
- document 目录存放所有技术方案和进展文档，按日期整理，例如 document/20260429/merge_summary.md
