# 番茄小说下载器书源

此书源接入 [zhongbai2333/Tomato-Novel-Downloader](https://github.com/zhongbai2333/Tomato-Novel-Downloader) 的 **v2.4.15**，与“番茄小说”元数据插件独立。默认未启用，也不改变现有番茄元数据抓取。

## 能力

在 Talebook 现有“书源管理”中配置并启用“番茄小说下载器”，随后在联网搜索中选择此源。可以搜索书名，也可以输入数字书籍 ID 或 `https://fanqienovel.com/page/书籍ID`。打开结果详情，选择“保存到本地”，完成后在本地书库阅读。

提供搜索、书籍详情和完整 **EPUB（默认）或 TXT** 下载入库。管理员在书源连接的“下载格式”中选择 `epub` 或 `txt`；保存到本地使用该配置。EPUB 直接由上游生成，保留其目录与排版，不经过 TXT 转换。没有在线逐章阅读、封面代理、分页搜索、段评或有声书功能。详情中的临时鉴权封面地址不会交给浏览器。相同书名及作者沿用已有入库去重规则。

下载器返回“完成”仍会核对本次下载历史：成功章数必须等于选择章数且失败为零，否则拒绝入库。空文件、多个输出、符号链接或超过 64 MiB 的文件也会拒绝入库。EPUB 另校验 ZIP CRC、mimetype、容器、OPF 与阅读顺序文件引用；拒绝损坏、重复 ZIP 条目或总解压大小超过 256 MiB 的文件。作品版权不因下载器使用 MIT 协议而改变。

## 安装与配置

下载器是可选依赖；只支持 Talebook 所在的 Linux amd64 / arm64 环境。使用静态 musl 发行文件，不依赖 glibc 版本，也不要求 Rust、Node 或 Wine。

在 Talebook 仓库目录执行（Docker Desktop 用户按 **容器** 架构选择）：

```sh
python3 scripts/install_tomato_downloader.py --directory ./tomato-runtime --arch amd64
# Linux arm64 容器改用 --arch arm64
```

脚本仅从固定 GitHub Release 下载，通过固定 SHA-256 后才原子替换文件，保留 LICENSE 和 NOTICE.md；失败会移除临时下载，不执行下载的文件。不使用上游滚动安装器或 latest 链接。

给现有 Talebook 容器增加只读挂载后重建该容器（按实际 Compose 服务名配置）：

```yaml
services:
  talebook:
    volumes:
      - ./tomato-runtime:/opt/tomato:ro
```

在书源连接表单中填写：

| 字段 | 值 |
| --- | --- |
| 下载器绝对路径 | `/opt/tomato/downloader`（容器内路径） |
| 下载格式 | `epub`（默认）或 `txt`，已有未配置格式的连接也默认 EPUB |
| 操作超时时间（秒） | 默认 600，范围 5–3600；影响整本下载预算 |

点击测试连接，再启用。连接测试确认文件哈希、程序版本和本地服务可启动；它不保证每本书的正文服务可用。搜索、详情继续受全站 `BOOKSOURCE_HTTP_TIMEOUT`（默认 20 秒）限制；需要时由管理员调整。单书下载采用连接预算，平台仍将其限制在一小时以内。首次设备注册每次独立进行，上游服务较慢时可重试。

无须提供 Cookie、API 密钥或自建远程 API。**这不代表程序没有在线服务依赖**，见下节。每次操作会启动随机端口、随机口令保护的 `127.0.0.1` 服务，进程及其配置、日志、缓存、下载临时文件在操作成功或失败后统一清理。文件进入 Calibre 前的导入临时文件也会清理。不启动持久后台服务，不需要开放端口。只读挂载同时阻止运行文件被覆盖；适配器还通过上游 `CARGO` 开发态判断禁用启动热更新，并在每次执行前重新校验哈希。

出现 SHA-256 不匹配时重新运行安装脚本，不要自行改哈希。上游设备注册、目录或正文失败时稍后重试；缺章不会以成功状态入库。arm64 文件的官方 Release digest 已核对，但本次没有 arm64 执行环境，尚未做运行验收。

## 源码、二进制与服务依赖核查

版本固定在提交 `e2197970c366180bb566b8acfbda67cc1331a1ef`（v2.4.15）。

| 证据 | 结论 |
| --- | --- |
| 上游 `Cargo.toml` | 默认 official-api 依赖仓库外 `../Tomato-Novel-Official-API`，所选源码不包含该 crate |
| 上游 README 的两种编译模式说明 | no-official-api 仅书信息/目录可走网页；正文强制第三方 API 地址池 |
| `src/third_party/content_client.rs` | 第三方正文客户端公开，但地址、服务授权等不是无需配置即可独立运行的正文源 |
| `src/ui/web/routes/search.rs` | 非 official-api 编译没有关键词搜索能力 |
| `src/main.rs` | `--download` 新建下载已禁用；Web `/api/jobs` 支持新建任务 |
| `src/base_system/self_update.rs` | 启动会热更新；CARGO 开发态标志可跳过，因此适配器显式设置它 |

因此选择发行二进制，通过本地 Web 接口交互，**不声称源码能够完全独立运行或二进制不依赖第三方服务**。只启用上游默认 official-api 分支、空 `api_endpoints`；不提取或转发隐藏接口令牌。

2026-09-06 在独立 Docker 网络命名空间内执行真实搜索、详情和整本下载，观测到 DNS 请求：

- `api5-normal-sinfonlinec.fqnovel.com`
- `fanqienovel.com`
- `fqnovel.ugurl.cn`
- `lf9-apk.ugapk.cn`
- `log.snssdk.com`
- `p3-reading-sign.fqnovelpic.com`
- `ugapk.com`

这些是本次执行实际访问的主机，不是完整的长期服务清单。DNS 观测无法证明各站点的所有权或具体功能；设备注册、版本发现、签名及正文的内部调用有一部分位于未公开 crate，无法逐项审计。部署仍依赖这些在线服务的可达性和稳定性。没有验证过离线运行，也不支持管理员绕过协议自行填写第三方 API。

## CLI 实测与自动化接口

2026-09-06 对已下载且哈希通过的 Linux musl amd64 v2.4.15 实际执行（每条命令使用新的临时数据目录，设置 `CARGO=talebook-pinned-release` 禁止启动热更新）：

| 命令 | 实际结果 |
| --- | --- |
| `downloader --help` | 退出码 0；列出 `--server`、`--update`、`--retry-failed` 等 |
| `downloader --download 7274791759849196579 --data-dir DATA_DIR` | 退出码 1：CLI 已禁用新建下载，请先使用 Web UI / TUI |
| `downloader --update 7274791759849196579 --data-dir DATA_DIR` | 退出码 1：没有该书本地下载记录，要求先完成首次下载 |

因此“支持命令行”与“可用命令行首次下载任意书籍”有区别。`--download` 是隐藏参数；`--update` 用于已有记录的增量更新。上述空目录探测不代表更新功能不可用，也未验证已有记录的更新成功路径。Talebook 通过 `--server` 启动下载器，以其本地 `/api/jobs` 完成首次下载；`novel_format=epub` 或 `txt` 控制原生输出。当前每次下载独立清理，不保留更新记录，也不提供自动追更。

## 版本完整性与许可

官方发行源固定为 `https://github.com/zhongbai2333/Tomato-Novel-Downloader/releases/download/v2.4.15/`。

| 文件 | SHA-256（与 GitHub Release asset digest 核对） |
| --- | --- |
| TomatoNovelDownloader-Linux_musl_amd64-v2.4.15 | `d9db872448e3cda78a18eaa3c7ee162ce631251ed51eb789f8e6676abe118722` |
| TomatoNovelDownloader-Linux_musl_arm64-v2.4.15 | `3df139fd891ebcf88c6c8b476c755b45e61b3c31075e0b465fc9d14c46800201` |

上游 LICENSE 为 MIT，`Copyright (c) 2025 zhongbai2333`。完整原文保留于 [MIT 许可](licenses/tomato-novel-downloader-MIT.txt)，来源与审计边界见 [NOTICE](licenses/tomato-novel-downloader-NOTICE.md)。安装脚本把二者放在二进制旁。

没有新增 Python 第三方依赖；沿用 requests（Apache-2.0）和标准库。上游公开的 Cargo 锁文件并不是发行二进制的完整 SBOM；缺失的私有 crate 及其依赖许可未能独立核实。Talebook 不把此二进制捆绑进默认镜像，也不把 MIT 扩张为对其全部内嵌依赖的许可保证。

## 验证

真实 Linux amd64 musl 发行版，在宿主机和 Talebook 测试容器中均完成搜索《西游记》（19 条结果）、读取书 ID `7274791759849196579` 的详情、下载完整原生 EPUB 与 TXT。宿主 EPUB 为 2,804,405 字节，容器再次下载为 2,804,379 字节（独立生成的 EPUB 字节可变化）；TXT 为 2,190,078 字节。两种格式均通过本次下载历史的完整性检查，EPUB 通过结构及 ZIP 校验。联网测试将每种格式经既有导入方法写入独立 Calibre 书库，逐次校验书名与导入前后完整字节一致，并确认导入临时文件已清理：2 passed。网络结果随上游变化；该记录不保证未来可用。

隔离测试覆盖默认 EPUB 与显式 TXT、损坏 EPUB 与缺失阅读文件拒绝、解压大小限制、插件契约、ID 校验、完整下载、缺章拒绝、错误脱敏、哈希失败不执行、进程回收、临时文件清理和下载预算。真实联网回归可显式运行：

```sh
TOMATO_TEST_BINARY=/opt/tomato/downloader pytest -q tests/test_tomato_downloader_source.py
```

未设置该变量时自动跳过联网用例；正常 CI 无须下载二进制或访问小说服务。

前端配置表单数字类型、EPUB/TXT 格式下拉框（默认 EPUB、键盘展开选择 TXT、提交配置）、浅色/深色与仅搜索书源的浏览入口经过回归：Playwright 3 passed。中英文标签通过 locale 编译；英文完整交互未验证。界面截图来自隔离 mock API 自动化环境，仅用于界面验证，不代表真实网络下载验收：

- [桌面配置](screenshots/tb-208/tomato-config-desktop.png)
- [手机配置](screenshots/tb-208/tomato-config-mobile.png)
- [320px 深色配置](screenshots/tb-208/tomato-config-dark-mobile.png)
