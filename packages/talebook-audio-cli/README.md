# Talebook Audio CLI

`talebook-audio` 是一个独立安装的 Talebook 有声书终端客户端。它使用 Talebook 自带的账号密码登录接口，列出当前账号可访问的已发布有声书，并通过 `mpv` 播放章节。

## 依赖与安装

- Python 3.11 或更高版本
- `mpv`（需要在 `PATH` 中可执行）
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

播放时可使用单键控制：

- `Space` 或 `p`：暂停/继续
- `n`：下一章
- `b`：上一章
- `s`：立即刷新进度
- `q`：退出

客户端持续显示当前章节、播放状态和 `已播放/总时长`。到达章节结尾会自动播放下一章；最后一章结束后退出。正常退出、`Ctrl-C` 或异常都会要求 mpv 退出，超时后依次 terminate/kill，不遗留失控的播放器进程。

## 常见错误

- `未配置 Talebook`：先运行 `configure`。
- `登录失败`：检查账号、密码和账号权限；开启登录验证码的部署会返回验证码错误，首版 CLI 不绕过验证码。
- `无法连接 Talebook`：检查服务地址、TLS 证书和网络。
- `没有可播放的有声书/章节`：需要先在 Talebook 中生成并发布有声版本。
- `找不到 mpv`：安装 mpv 并确认 `mpv --version` 可运行。
- `音频不可用`：登录态可能已过期，重新登录；也可能是书籍权限或服务端音频文件已变化。

客户端不会在普通输出或异常信息中打印密码、Cookie 值或完整请求头。
