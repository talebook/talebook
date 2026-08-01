# Talebook MCP

Talebook 提供内置的 MCP Streamable HTTP 端点，可让支持 MCP 的智能体检索和管理个人书库。MCP 默认关闭，不会使用或保存 Talebook 登录密码。

## 启用

为 Talebook 容器设置一个足够长的随机 Token：

```bash
TALEBOOK_MCP_TOKEN="replace-with-a-long-random-token" docker compose up -d
```

也可以在仅限本机的 `manual.py` 中设置 `MCP_TOKEN`。环境变量 `TALEBOOK_MCP_TOKEN` 的优先级更高。不要把真实 Token 提交到仓库、镜像或公开配置示例中。

MCP 需要数据库中至少有一个已启用的管理员账号。Token 只对 `/mcp` 生效，不能用于 Talebook 的其他 HTTP API。

## 客户端配置

连接地址为 Talebook 站点根地址加 `/mcp`，例如：

```text
https://books.example.com/mcp
```

客户端需要为每个请求添加：

```text
Authorization: Bearer replace-with-a-long-random-token
```

服务采用无状态 JSON 响应，不要求保存 MCP Session ID。支持协议版本 `2025-11-25`，并兼容 `2025-06-18`、`2025-03-26` 和 `2024-11-05` 的初始化协商。

## Skill

仓库中的 `skills/talebook/` 可安装到支持 Skill 的智能体环境。配置：

```bash
export TALEBOOK_MCP_URL="https://books.example.com/mcp"
export TALEBOOK_MCP_TOKEN="replace-with-a-long-random-token"
python skills/talebook/scripts/talebook_mcp.py check
```

Skill 和 CLI 不接收用户名或密码，也不会通过命令行参数传递 Token。

## 能力与边界

MCP 支持本地书库搜索和详情、作者与分类、个人阅读状态和进度、元数据编辑与补全、元数据写回文件，以及 Talebook 网络书库的异步搜索、阅读和保存流程。

MCP 不提供电子书上传或下载、邮件推送、局域网设备推送、删除书籍、用户管理或书源管理工具。
