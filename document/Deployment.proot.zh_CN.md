# 在 PRoot 中部署 Talebook（实验性）

Talebook 可以在不使用 Docker daemon、宿主 root 权限或 systemd 的 PRoot Linux 中运行，但目前只属于**有限支持**。本文给出 Debian 12 的手工部署路径，并明确已经验证和仍需验证的范围。

## 支持范围

- 已验证：Linux amd64、PRoot 5.1.0、Debian 12 (bookworm)、Python 3.11、Debian Calibre 6.13。
- 已验证：SQLite 初始化、服务启动、首次安装、书库列表和检索、EPUB 上传和下载、在线阅读入口、EPUB 转 AZW3、停止和重启方式、`/data` 数据持久化布局。
- 未验证：Android Termux/proot-distro、arm64、低内存设备、完整前端的 PRoot 内构建、HTTPS 和公网部署。
- 不支持 systemd。进程由 `tools/proot-talebook.sh` 管理；PRoot 或 Termux 被系统回收后仍需重新启动。

验证以上未验证项之前，不应将本文视为 Android 或 arm64 的正式支持声明。

## 资源与限制

建议至少准备 3 GB 可用磁盘和 2 GB 可用内存。一次 amd64 验证中，安装 Calibre、构建工具和 Node.js 后的 Debian 根文件系统约占 2.7 GB；Calibre 是主要的软件包体积来源。电子书转换会持续占用一个 CPU 核心，7.1 MB EPUB 转 AZW3 约耗时 2 分钟。

PRoot 本身不提供内核隔离。不要把不可信程序放入同一个 PRoot 环境，也不要直接将开发用 Tornado 端口暴露到公网。需要公网访问时，应在宿主侧使用经过维护的反向代理和 TLS。

## 准备 PRoot Debian

在 Android Termux 中可用 `proot-distro` 创建 Debian；进入 Debian 后执行其余命令：

```sh
pkg install proot-distro
proot-distro install debian
proot-distro login debian
```

本文未在 Android/arm64 上执行过以上三条命令。应先记录 `uname -m`、`proot --version` 和 `/etc/os-release`，再进行独立复核。

在 Debian 内安装系统依赖。Node.js 20 仅用于构建前端：

```sh
apt update
apt install -y ca-certificates curl git python3 python3-pip python3-venv \
  python3-dev build-essential sqlite3 calibre ffmpeg unar
curl -fsSL https://deb.nodesource.com/setup_20.x | sh
apt install -y nodejs
```

某些发行版提供的旧 PRoot 会错误处理 `statx`，表现为文件明明存在但 `ls`、证书安装脚本或 npm 报 `No such file or directory`。遇到该现象时应升级 Termux 与 PRoot，或更换 `proot-distro` 提供的根文件系统；不要通过关闭证书校验绕过。

## 安装 Talebook

```sh
git clone https://github.com/talebook/talebook.git
cd talebook

python3 -m venv --system-site-packages .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt

cd app
npm ci
npm run build-spa
cd ..
```

必须使用 `--system-site-packages`：Debian 的 Calibre Python 模块和 `msgpack` 等配套模块位于系统 Python 路径，而 Talebook 的其他依赖位于虚拟环境中。

## 初始化

Talebook 默认使用 `/data`。在 PRoot 内它只是根文件系统中的普通目录，不要求宿主 root 权限：

```sh
mkdir -p /data/log /data/run /data/books/{library,extract,upload,imports,convert,progress,settings,logo,ssl}
calibredb add --library-path=/data/books/library -r docker/book
.venv/bin/python server.py --syncdb
touch /data/books/settings/auto.py
```

如需将数据放在宿主可持久化目录，应在进入 PRoot 时把该目录绑定到 `/data`。备份时停止服务并完整备份 `/data`；其中包含书库、用户 SQLite 数据库、设置、阅读进度和上传文件。

## 启动、停止与重启

```sh
chmod +x tools/proot-talebook.sh
TALEBOOK_HOST=0.0.0.0 TALEBOOK_PORT=8080 tools/proot-talebook.sh start
tools/proot-talebook.sh status
tools/proot-talebook.sh stop
tools/proot-talebook.sh restart
```

日志位于 `/data/log/talebook.log`，PID 位于 `/data/run/talebook.pid`。首次启动后访问 `http://设备地址:8080/` 完成管理员设置。若只允许本机访问，请保持默认的 `TALEBOOK_HOST=127.0.0.1`。

## 最小验收

```sh
curl -fsS http://127.0.0.1:8080/api/index
curl -fsS 'http://127.0.0.1:8080/api/search?name=Alice'
curl -fL -o /tmp/book.epub http://127.0.0.1:8080/api/book/1.EPUB
curl -fsS http://127.0.0.1:8080/read/1 >/tmp/read.html
```

还应通过页面实际完成登录、上传一本测试 EPUB，并确认书库数量增加。Calibre 转换属于可选但重要的复核项：从书籍详情发起 EPUB→AZW3，等待任务结束后确认下载列表出现 AZW3。上传或元数据提取时若看到 Calibre 渲染子进程 `EOFError`，需要检查封面/预览结果；文件导入成功并不代表所有 Calibre 子功能都正常。

## 升级与回滚

```sh
tools/proot-talebook.sh stop
cp -a /data "/data.backup.$(date +%Y%m%d-%H%M%S)"
git pull --ff-only
.venv/bin/python -m pip install -r requirements.txt
cd app && npm ci && npm run build-spa && cd ..
.venv/bin/python server.py --syncdb
tools/proot-talebook.sh start
```

升级失败时停止服务，恢复升级前的代码提交和 `/data` 备份，再重新启动。不要在服务运行时复制 SQLite 数据库作为一致性备份。
