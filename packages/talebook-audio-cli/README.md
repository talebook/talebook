# Talebook Audio CLI

`talebook-audio` 是一个独立安装的 Talebook 有声书终端客户端。它使用 Talebook 自带的账号密码登录接口，列出当前账号可访问的已发布有声书，并可通过本机 `mpv` 或 OpenXiaoAI Bridge 在小爱音箱上播放章节。

## 依赖与安装

- Python 3.11 或更高版本
- 本机播放需要 `mpv`（需要在 `PATH` 中可执行）；小爱音箱播放不依赖 `mpv`
- 支持有声书 API 的 Talebook 服务端

从 Talebook 仓库安装：

```bash
python3 -m pip install ./packages/talebook-audio-cli
talebook-audio --help
```

开发安装与测试：

```bash
python3 -m pip install -e './packages/talebook-audio-cli[test]'
python3 -m pytest packages/talebook-audio-cli/tests
```

## 配置与登录

先保存服务地址和账号。地址必须是 `http` 或 `https`，不能包含 URL 用户名、密码、查询参数或片段。

```bash
talebook-audio configure --server https://books.example.com --username alice
talebook-audio login
```

`login` 使用隐藏输入读取密码。自动化场景可从标准输入读取，避免密码出现在命令历史和进程参数中：

```bash
printf '%s\n' "$TALEBOOK_PASSWORD" | talebook-audio login --password-stdin
```

客户端只保存服务地址、用户名和 Talebook 登录 Cookie，不保存密码。配置和 Cookie 默认位于 `$XDG_CONFIG_HOME/talebook-audio/`（未设置时为 `~/.config/talebook-audio/`），文件权限为 `0600`。Cookie 过期后再次执行 `talebook-audio login` 即可。

退出并删除本地会话：

```bash
talebook-audio logout
```

## 浏览与播放

```bash
# 列出当前账号可访问且已有已发布音频的书籍
talebook-audio books

# 查看一个有声版本的章节；edition id 可从 books 输出获得
talebook-audio chapters 12

# 交互选择书籍和起始章节
talebook-audio play

# 按书籍或有声版本直接播放，并从指定章节编号开始
talebook-audio play --book-id 42 --chapter 3
talebook-audio play --edition-id 12 --chapter 3
```

### 通过 OpenXiaoAI Bridge 播放

Bridge 播放使用它的带鉴权 StreamPlayer API，支持进度、暂停/继续和切章。Bridge 默认地址是
`http://127.0.0.1:9092`，token 默认从
`$XDG_CONFIG_HOME/open-xiaoai-bridge/api-token`（未设置时为
`~/.config/open-xiaoai-bridge/api-token`）读取；token 文件权限必须是 `0600`。

```bash
OPENXIAOAI_API_TOKEN_FILE=/path/to/open-xiaoai-bridge/api-token \
  talebook-audio play --player xiaoai --edition-id 12 --chapter 3
```

也可以设置 `TALEBOOK_AUDIO_PLAYER=xiaoai` 作为默认播放后端。Bridge 位于其他主机时，通过
`OPENXIAOAI_BASE_URL=https://speaker.example.com:9092` 指定地址；非本机明文 HTTP 默认拒绝。
自签 CA 和 mTLS 可分别使用 `OPENXIAOAI_TLS_CA`、`OPENXIAOAI_TLS_CLIENT_CERT`、
`OPENXIAOAI_TLS_CLIENT_KEY`。如确实处于可信内网且正在迁移，可显式设置
`OPENXIAOAI_ALLOW_INSECURE_HTTP=1` 临时允许非本机 HTTP。

### MCP server 模式

安装可选 MCP 依赖后，CLI 可以像 neteasecli 一样作为 stdio MCP server 被
OpenXiaoAI Bridge 常驻启动：

```bash
python3 -m pip install 'talebook-audio-cli[mcp]'
talebook-audio mcp
```

MCP 工具包括：

- `list_audiobooks`、`list_chapters`：浏览当前登录账号可访问的有声书和章节。
- `play_audiobook`：按 edition ID、book ID 或书名/作者查询开始播放，可指定起始章节。
- `next_chapter`、`previous_chapter`：切换当前章节队列。
- `pause`、`resume`、`stop`、`status`：控制和查询播放。

MCP 不提供登录工具，也不接收密码。管理员应先运行 `configure` 和 `login`，再把对应的
XDG 配置目录挂载给 Bridge MCP 子进程。`play_audiobook` 和切章工具会返回
OpenXiaoAI Bridge 的 `end_turn_silently / playback_started` 控制信号，避免音频开始后 AI
继续播放一段 TTS。与 neteasecli 同时启用时，Bridge 会给重名的 `pause`、`resume`、
`stop`、`status` 自动加 `talebook_audio_` 命名空间前缀。

Bridge 容器需要两个挂载：CLI 源码只读，会话目录读写。例如：

```yaml
volumes:
  - /opt/talebook-audio-cli:/opt/talebook-audio-cli:ro
  - /opt/talebook-audio-cli-data:/root/.config/talebook-audio-cli
```

对应的 stdio 配置示例：

```python
"talebook_audio": {
    "type": "stdio",
    "command": "/app/.venv/bin/python",
    "args": ["-m", "talebook_audio_cli.cli", "mcp"],
    "env": {
        "HOME": "/root",
        "PATH": "/app/.venv/bin:/usr/local/bin:/usr/bin:/bin",
        "PYTHONPATH": "/opt/talebook-audio-cli/src",
        "XDG_CONFIG_HOME": "/root/.config/talebook-audio-cli",
        "OPENXIAOAI_BASE_URL": "http://127.0.0.1:9092",
        "OPENXIAOAI_API_TOKEN_FILE": "/root/.config/open-xiaoai-bridge/api-token",
    },
    "cwd": "/opt/talebook-audio-cli",
    "enabled": True,
    "timeout": 180,
},
```

播放时可使用单键控制：

- `Space` 或 `p`：暂停/继续
- `n`：下一章
- `b`：上一章
- `s`：立即刷新进度
- `q`：退出

客户端持续显示当前章节、播放状态和 `已播放/总时长`。到达章节结尾会自动播放下一章；最后一章结束后退出。正常退出、`Ctrl-C` 或异常都会停止当前后端；mpv 超时退出时会依次 terminate/kill，Bridge 后端会调用 `/api/stream/stop`，不遗留失控的播放。

## 常见错误

- `未配置 Talebook`：先运行 `configure`。
- `登录失败`：检查账号、密码和账号权限；开启登录验证码的部署会返回验证码错误，首版 CLI 不绕过验证码。
- `无法连接 Talebook`：检查服务地址、TLS 证书和网络。
- `没有可播放的有声书/章节`：需要先在 Talebook 中生成并发布有声版本。
- `找不到 mpv`：安装 mpv 并确认 `mpv --version` 可运行。
- `找不到 Bridge API token`：检查 Bridge 是否至少成功启动过一次，或设置 `OPENXIAOAI_API_TOKEN_FILE`。
- `音频不可用`：登录态可能已过期，重新登录；也可能是书籍权限或服务端音频文件已变化。

客户端不会在普通输出或异常信息中打印密码、Cookie 值或完整请求头。
