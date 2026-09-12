# 容器内应用升级与资源分发

此功能替换 Python 应用和已编译 SPA，重启应用进程，容器本身不重建。服务会短暂中断，阅读、下载和管理请求可能需要重试。

历史镜像不含可信加载器，**首次启用必须升级一次容器镜像**。目前尚未发布官方升级签名公钥、渠道或国内域名；代码合并不代表这些资源已经上线。没有可信密钥时安装功能默认关闭。

## 支持范围

- 生产 SPA，非零 `PUID`，默认 `/data/books/library` 书库和 `sqlite:////data/books/calibre-webserver.db` 数据库。自动导入目录监听须关闭，升级期间不得有容器外的程序写入书库。
- SSR、开发模式、外部数据库、自定义书库路径不支持应用内安装，使用镜像更新。
- Python、Calibre、系统软件包、实际安装的 Python distributions、CPU 架构、加载器和启动配置共同决定 runtime 指纹。依赖或启动协议改变必须更新镜像；不会在后台执行 pip、apt 或 git pull。
- 数据库 `models.py` / `migrate_db.py` 指纹必须相同，清单必须声明 `migration: none`。数据库结构变动走备份与镜像迁移流程。签名发布者仍须审查其他代码是否包含隐式数据迁移；指纹不能替代迁移评审。
- 发布工作流分别构建 amd64、arm64、armv7 包。清单架构必须匹配；首轮本地真实容器验证以 amd64 为范围，不代表其他架构已经实测。

## 首次部署

1. 使用可信镜像；镜像构建需携带 `GIT_COMMIT`（完整 40 位 SHA）、`GIT_VERSION`、`UPGRADE_SEQUENCE`（该提交的 Unix commit 时间，正整数）。仓库镜像发布 workflow 已设置这些参数。手工构建也应设置；缺少元信息时关闭应用内升级，避免重建后旧持久化版本覆盖未知镜像。
2. 持久化挂载整个 `/data`。`/data/updates` 保存已安装应用、备份和事务状态，与书库 `/data/books` 分离。挂载父目录 `/data` 及 `/data/updates` 必须由 root 拥有且不能被组/其他账号写入，防止整个升级目录被替换；不符合时禁用升级并继续使用内置应用，不自动修改宿主目录所有权。不应只挂载 `/data/books` 后期待升级版本保留，也不要让应用账号或其他容器拥有 `/data/updates` 写权限。
3. 在可信部署端获取并核对发布公钥的指纹，创建 root 拥有、应用账号不可写的配置，挂载到 `/etc/talebook-upgrade.json:ro`。不要从正在校验的升级镜像源下载并信任公钥。

```json
{
  "keys": {
    "release-2026": "由可信发布者提供的 Ed25519 原始32字节公钥的Base64"
  },
  "sources": [
    "https://github.com/talebook/talebook/releases/download"
  ]
}
```

配置示例中的公钥必须替换，不能直接启用。每个源根目录须拥有同样布局：

```text
app-stable/stable-amd64.json
app-COMMIT/package-amd64.tar.gz
app-COMMIT/stable-amd64.json
```

国内/自建源可放在 `sources` 前面作为优先下载源，GitHub 留作回退。源必须为标准 443 端口的公共 HTTPS，证书与主机名均校验。禁止用户名、密码、查询参数、片段和私网地址；每次连接解析全部 DNS 地址并拒绝非公网 IP，连接固定到已验证 IP，避免二次解析重绑定。默认不使用环境代理、不携带 Cookie/Authorization。重定向只允许同域名，以及 GitHub 到 `release-assets.githubusercontent.com` 的固定例外。对象桶保持公开只读；私有桶带凭证/签名 URL 不适合作为客户端源。

连接及每次读取超时 10 秒，单次清单下载总时限 30 秒，包下载 180 秒；字节上限分别为 128 KiB 和 512 MiB，展开上限 2 GiB / 50000 个文件。系统 DNS 解析仍受操作系统 resolver 超时影响。中途下载失败会从其他源重新下载同一 SHA 对应的完整包，不继续混合分片。

## 使用与恢复

### 删除容器后重建，如何保留升级和数据

**复用同一个 `/data` 持久化目录或命名卷，重建后会保留已安装的兼容升级。** `/data/books` 保存书库、账号数据库、配置与插件资源；`/data/updates` 保存应用版本、升级状态和备份。容器内的 `/run/talebook-release/current` 只是临时指针，每次启动都会根据持久化记录重新生成。

官方 `docker-compose.yml` 已挂载整个 `/data`。建议在 Compose 同目录的 `.env` 中固定**已有数据目录的绝对路径**，避免移动 Compose 文件后误用新的空目录：

```dotenv
TALEBOOK_DATA_DIR=/srv/talebook/data
```

这里的路径是示例，必须替换成当前实际目录。重建前用以下命令核对正在运行的容器挂载，并保存 `/data` 的 Source（bind 目录）或 Name（命名卷）：

```sh
docker inspect --format '{{json .Mounts}}' "$(docker compose ps -q talebook)"
docker compose config
```

核实 Compose 将继续使用同一份数据，且升级可信配置 `/etc/talebook-upgrade.json:ro` 的挂载仍在后，可以停止、删除并重建应用容器：

```sh
docker compose stop talebook
docker compose rm -f talebook
docker compose up -d talebook
```

该操作不删除数据目录或数据卷；不需要再次下载已安装的升级。不要同时启动两个容器读写同一份 `/data`。如果使用命名卷，应固定卷名；也可将已有卷声明为 `external: true`，使其生命周期独立于 Compose 项目。不要删除卷、清空宿主目录或使用 `docker compose down -v`。重建后重新登录，核对后台当前应用版本、书库和阅读是否正常。

**仅挂载 `/data/books` 不足以保留应用升级。** 镜像的 `VOLUME /data` 声明也不保证独立 `docker run` 重建时复用原匿名卷。已有这类部署时，在删除旧容器前停止全部写入，备份并复制完整 `/data`（包括 books、updates、隐藏文件及权限）到固定持久化目录，再调整挂载并核验。若保留现有 `/data/books` 单独挂载，必须另外为 `/data/updates` 配置固定持久化挂载，并满足前述 root 所有权要求。不要将空卷覆盖到唯一数据副本上；已经删除的旧容器无法替你找回被删除的卷。

自动选择模式下，同一镜像或运行时兼容且内置序号较旧的镜像会继续运行持久化升级；更新的内置镜像优先。手动固定版本的例外见下文。运行时不兼容时使用内置版本，保留旧升级文件供诊断，并非删除数据。更换镜像不代表任意旧代码都能读取新数据库，数据库迁移仍遵守后文的备份与恢复边界。

### 安装与故障恢复

在管理后台「通用设置 → 系统更新」检查版本、阅读说明，然后选择「下载并安装」，确认服务中断。普通账号或未登录请求不能执行检查/安装；请求不能改变源、命令或目录。

检查会验证所有配置源，选择最高签名序号，持久化防回放水位。同一序号内容冲突会报错。镜像落后会显示诊断，不能静默降级。下载回退必须得到相同提交、相同哈希的包。

安装流程：下载 → 校验/安全解包 → 维护闸门 → 等待 HTTP 请求、后台队列、有声书及插件任务结束 → 停止 Tornado 和子进程 → SQLite 一致性备份 → 原子切换整套前后端 → 重启与健康检查。维护期间后台暂时不可达，现有页面自动重连；新版本启动后，旧标签页请求携带的前端版本若与后端不一致，会在业务处理前返回 409 并自动刷新；也可使用按钮手动刷新页面以加载新的前端。

`/data/updates/state.json` 是持久化结果；`/data/log/upgrade.log` 保存执行器日志并轮转。操作具有全局互斥，同一版本的重复安装请求返回已有状态。启动器在进程崩溃或容器重启后处理未完成事务；下载/校验中断保持现有版本，切换阶段中断恢复记录的上一版本。

自动选择模式下，镜像重建时只有**比内置序号更新且运行时兼容**的持久化版本被选中。在后台手动选择的版本通过 `pin.json` 绑定当前基础镜像的提交、runtime 和 database 指纹；使用同一基础镜像重建会继续使用该版本，即使它的序号更旧。更换基础镜像会使此固定选择失效，重新按自动选择规则判断。内置镜像更新、序号未知或运行时不兼容时优先内置镜像，旧版本保留用于诊断。升级目录不应跨不同书库实例共用。勿并发启动两个容器使用同一 `/data`；执行器有进程锁，但它不能把共享 Calibre 书库变成多实例数据库。

健康检查失败会尝试恢复上一应用。**应用回退不会自动恢复数据库**。所有备份包含独立 SQLite 文件及 `inventory.json` 哈希清单，目录位于 `/data/updates/backups/`，仅 root 可读。恢复数据库是独立运维操作：停止所有访问和写进程，保留当前库的副本，核实需要舍弃哪些备份之后的新数据，再使用 SQLite backup API 恢复到新路径并校验 `PRAGMA integrity_check`，确认后替换文件。绝不能在恢复服务、产生新数据后自动覆盖数据库。

自动恢复失败会保持维护状态。先读取状态与日志，确认 Tornado 是否运行及 `/run/talebook-release/current` 的目标；使用 `supervisorctl stop talebook:tornado` 停止后选择已知安全的应用或更新镜像，再验证本地健康检查。人工处理恢复失败时不要删除 `active.json` 或数据库来“试一下”。维护状态文件只能在恢复确认后由部署管理员移除。外部数据库和跨 schema 回退需要单独制定恢复方案。

### 本地版本与数据库快照管理

后台同一页面列出镜像内置版本和已安装版本，可选择兼容版本、删除未受保护的版本、设置保留数量。默认保留 3 个下载版本，可设 2–20；内置镜像不计入数量。保存数量及每次成功切换后自动清理。当前运行、持久化选择和上一次回退版本受保护；保护项优先，必要时超过 N。删除应用版本不会同时删除数据库快照。

每个版本目录内的 `release.json` 保存清单和安装时间。旧数据卷尽量从原有 active/previous/candidate 记录补全元数据；缺少可靠元数据的历史目录仅可查看和删除，不允许猜测兼容性后启用。

**数据库是持续写入的共享数据，不是每个版本一份独立运行的数据库。** 安装或手动切换前，先停写并备份所有受支持的 SQLite 库。每个快照目录包含数据库副本、`inventory.json` 哈希清单和 `snapshot.json`（来源版本、目标版本、数据库指纹、时间及数据库数量）。页面的“来源 → 目标”表示切换前来源版本的数据，绝不是目标版本运行后的数据库。

手动回滚同样检查运行时与数据库指纹，并要求 `migration: none`；不兼容的版本禁用切换。切换前再次备份最新数据，继续使用当前数据库，避免自动覆盖回滚前的新书、账号或阅读记录。跨结构回滚必须停服并单独制定数据库恢复方案。

已关联的数据库快照独立保留 N 份，最新事务快照和受保护版本的最近来源快照优先保留，必要时超过 N。旧执行器留下的无关联快照不参与自动删除；页面明确标注，可单独确认删除。此保留策略不是长期备份方案，重要快照应另行归档。清理失败会显示警告，不撤销已健康运行的版本。磁盘不足仍会拒绝下载或备份。

## 发布、轮换与国内同步

`.github/workflows/application-upgrade.yml` 在发布正式 `v*` GitHub Release（`published` 事件、非草稿、非预发布）后自动构建并上传应用更新资源。先把 tag 解析为固定 commit，并确认属于 `master` 历史；签名和发布分别经过受保护环境。`app-COMMIT` 与 `app-stable` 属于资源预发布，不会递归触发。

保留手动入口：输入完整已审查的 `master` 提交和版本，默认 `publish=false` 仅上传 Actions 构建产物，不修改 Releases 或渠道；选择 `publish=true` 后才上传客户端资源。可选 `release_tag` 指定已有正式 Release，须与版本名及 commit 完全一致；留空仅发布 `app-COMMIT` / `app-stable`。请为以下环境设置人工审核和受保护分支/tag：

- `application-upgrade`：secret `UPGRADE_SIGNING_KEY`，Ed25519 PKCS8 PEM 私钥；variable `UPGRADE_KEY_ID`。
- `application-upgrade-publish`：variable `UPGRADE_TRUSTED_KEYS`（key_id 到原始公钥 Base64 的 JSON）；仓库 `GITHUB_TOKEN` 仅此 job 授予 contents:write。

### 第一次让客户端获取升级包

PR 合并前这些工作流还没有进入默认分支；当前已有历史 Release 不会因合并而自动补包。此处说明操作流程，本次开发没有生成正式私钥、修改仓库 secrets 或发布版本。

1. 在可信发布管理机离线生成一次 Ed25519 密钥，私钥只交给签名环境，不上传 Release，也不放入容器。以下命令只打印公钥 JSON；私钥文件权限为 600：

   ```sh
   umask 077
   openssl genpkey -algorithm ED25519 -out release-signing.pem
   openssl pkey -in release-signing.pem -pubout -outform DER -out release-public.der
   python3 - <<'PY'
   import base64, json
   from pathlib import Path
   public = Path('release-public.der').read_bytes()
   assert public[:12] == bytes.fromhex('302a300506032b6570032100') and len(public) == 44
   keys = {'release-2026': base64.b64encode(public[12:]).decode()}
   Path('upgrade-keys.json').write_text(json.dumps(keys))
   Path('talebook-upgrade.json').write_text(json.dumps({
       'keys': keys,
       'sources': ['https://github.com/talebook/talebook/releases/download']
   }, indent=2))
   print(json.dumps(keys))
   PY
   ```

2. 在 GitHub Settings → Environments 创建 `application-upgrade`：添加 secret `UPGRADE_SIGNING_KEY`（`release-signing.pem` 全文）及 variable `UPGRADE_KEY_ID=release-2026`。在 `application-upgrade-publish` 添加 variable `UPGRADE_TRUSTED_KEYS`（`upgrade-keys.json` 的 JSON 全文）。配置审核人，并允许经过审核的 `v*` tag 和手动入口所用分支。`GITHUB_TOKEN` 自动提供，无需额外 PAT。缺少配置会失败，不会悄悄发布无签名包。
3. 容器首次换成包含本功能的可信镜像；通过可信管理渠道核对公钥，将生成的 `talebook-upgrade.json` 以 root 所有、644 权限放到固定宿主路径，并在 Compose 加入只读挂载。继续保留整个 `/data`，配置 `PUID=1000` / `PGID=1000`：

   ```yaml
   services:
     talebook:
       volumes:
         - "${TALEBOOK_DATA_DIR:-./data}:/data"
         - "/srv/talebook/talebook-upgrade.json:/etc/talebook-upgrade.json:ro"
   ```

4. 对包含本功能的已审查 `master` 提交发布正式 `v*` Release。在 Actions 完成签名与发布环境审核后，该 Release 附上 `package-amd64.tar.gz`、`package-arm64.tar.gz`、`package-armv7.tar.gz` 及对应三个 `stable-架构.json` 签名清单；同时创建客户端需要的固定资源路径，并最后更新渠道。
5. 如需为**已有且包含本功能的 Release**补包，在 Actions 手动运行本工作流，填写对应完整 commit、相同 version 和 `release_tag`，勾选 `publish`。由其他 workflow 的 `GITHUB_TOKEN` 创建的 Release 通常不会触发第二个 workflow，亦使用此手动入口；仅推送 tag、仅保存草稿或预发布不会自动推进稳定渠道。更早的提交没有加载器/打包脚本，不能直接补出可安装包。
6. 在后台点击“检查版本”。以 amd64 为例，客户端实际读取以下地址，而不是 GitHub 自动生成的 Source code 压缩包：

   ```text
   https://github.com/talebook/talebook/releases/download/app-stable/stable-amd64.json
   https://github.com/talebook/talebook/releases/download/app-完整40位提交/package-amd64.tar.gz
   ```

   普通版本 Release 中的附件是同一份字节的可见入口，不能只上传附件就省略 `app-stable`。无新版本时显示当前版本是正常结果；包必须比当前序号新且运行时/数据库兼容才能安装。新依赖、Calibre 或启动布局变化仍需镜像升级；自动发布附件不等于强制允许不兼容安装。GitHub 访问受限时按后文配置国内源。

同一次构建产生的 artifacts 可以安全重试发布；已有固定资产内容不同会拒绝覆盖。重新构建不保证得到完全相同的 gzip/前端/运行时字节，失败后优先重跑失败的 publish job 复用原始产物；不要删除不可变资产来绕过冲突。多架构任一构建失败都不会启动 publish；上传中断不会先推进渠道。

密钥轮换顺序：通过可信镜像或只读部署配置先发放新旧公钥 → 重启加载新配置 → 发布端切换 `UPGRADE_KEY_ID` 和私钥 → 观察旧客户端覆盖 → 移除旧公钥。若私钥泄漏，立即暂停渠道发布并更新可信配置/镜像；仅在镜像站放一个新公钥无法建立新信任。不要将私钥提交到 Git、下载包、容器或日志。

打包脚本从候选生产镜像提取应用与预编译前端，生成固定提交、版本、运行时、架构、大小、SHA-256、说明和签名的清单。发布脚本逐个上传并读回验证固定资源，所有架构完成后最后替换 `app-stable` 清单。相同提交内容不同会拒绝覆盖；渠道不得倒退。构建产物尚无正式版本和公钥时，不应手工启用客户端绕过验证。

国内资源尚未配置，本次没有创建云账号、桶、CDN、域名或付费资源。推荐选择阿里云 OSS 或腾讯云 COS 配合大陆 CDN：需要账号、实名/备案域名、证书、公开读/发布身份写权限和流量预算。存储、回源、CDN 流量及跨区复制费用以云厂商当前报价与实际用量评估，不提供假设报价或未经测量的大陆测速结论。无大陆备案可评估香港节点，但跨境链路不等同大陆 CDN；Cloudflare/R2 不作为大陆稳定访问保证。

同步与原始发布使用同一份下载产物和可信公钥文件，不重新压缩或重新签名。部署端凭据只保留在受保护 job 环境中：

- `MIRROR_ACCESS_KEY_ID`、`MIRROR_ACCESS_KEY_SECRET`（限制到专用桶前缀写权限）；
- `MIRROR_BUCKET`；OSS 还需 `MIRROR_ENDPOINT`（HTTPS），COS 需 `MIRROR_REGION`；
- 独立的可信 `keys.json` 公钥表，以及产物目录。

```sh
# 在发布机的独立 venv 中按所选提供商安装 SDK，不在 Talebook 应用内安装。
python -m pip install 'cryptography>=38' oss2
python scripts/upgrade/mirror.py --provider oss --directory output --keys keys.json
# 或安装 cos-python-sdk-v5 后使用 --provider cos
```

同步脚本校验本地签名/大小/哈希，拒绝固定资源覆盖，上传并读回校验全部版本文件，然后最后推进渠道清单。每个桶的发布任务须串行执行（CI concurrency group 或部署锁）；脚本不是分布式锁。CDN 固定资源设置一年 `immutable` 缓存，渠道 60 秒；更新渠道后按提供商流程刷新对应渠道 URL，不能缓存 404。保留历史不可变包至少 90 天并确认无人引用后才回收。镜像失效时客户端自动回退；国内只有包、没有渠道清单的部署不合格。

上线清单：配置并验证公钥/发布 secret、保护发布环境、准备真实域名与 HTTPS、测试源布局、验证所有架构完整上传、验证渠道 TTL/失效缓存、确认大陆真实网络检查及下载都可达、演练失败回退与数据库恢复，然后再向开发者开放升级入口。

## 本地验证工具

`pytest tests/test_application_upgrade.py` 可独立验证协议和恢复状态机；`tests/test_upgrade_api.py` 需要 Calibre 测试环境。前端运行 `npx vitest run --config test/upgrade.vitest.config.ts`。

`scripts/upgrade/smoke_container.py --work <专用空目录> --frontend app/.output/public` 构造一次性测试镜像，基于本机已有可信运行时和真实后端。它生成隔离 HTTPS 签名资源，**仅测试 fixture 的公共 IP 连接检查被替换为 loopback TLS**；生产下载器不提供此开关。必须在报告中注明该边界，不能把它说成公网/大陆源可用性验证。测试用密钥、Cookie 和账号文件不得交付，测试结束后停止并删除专用容器。

`tests/test_upgrade_recreation.py` 提供显式启用的真实 Docker 重建回归：先复制一份已完成升级的隔离测试数据，再启动容器、验证登录和版本、停止并删除容器，分别用同一镜像和兼容镜像重建。检查容器 ID 已改变、前后端版本及书目保持、应用文件/书库文件/配置/插件文件哈希保持。不会改写原始 fixture；禁止提供生产数据。

```sh
TALEBOOK_RECREATE_FIXTURE=/path/to/disposable-upgraded-fixture \
TALEBOOK_RECREATE_IMAGE=talebook:tb213-smoke \
TALEBOOK_RECREATE_COMPATIBLE_IMAGE=talebook:tb213-compatible \
python3 -m pytest tests/test_upgrade_recreation.py -v -s --tb=short
```

fixture 目录须包含 `data/updates/active.json`、已安装包和真实书库，以及 `fixture/config.json`、`fixture/credentials.json`。测试镜像须与该包运行时兼容。未配置 fixture 时跳过这两项，不算完成容器验收。主机磁盘不足时可将 pytest 的 `--basetemp` 和 `TMPDIR` 指向足够大的 tmpfs，并设置 `TALEBOOK_RECREATE_COPY_APP=1`：每次从对应镜像重新复制内置应用到临时目录再挂载，避免启动时 chown 触发磁盘 copy-up。这个测试适配不改生产加载器，且不会把前一个容器的内置应用带到重建容器；应在报告注明未验证默认磁盘 overlay 的限制。


`tests/test_upgrade_version_management.py` 是显式启用的版本管理容器验收。fixture 需包含隔离的书库/账号及 smoke_container.py 生成的 v2、v3、v4 签名包（相同 runtime/database，序号分别 2、3、4）。测试只操作数据和资源副本，完成后删除专用容器；不得指定生产数据。启用浏览器参数后同时运行真实页面的列表、重复开关弹窗、输入校验和窄屏回归。

```sh
TALEBOOK_VERSION_FIXTURE=/path/to/disposable-version-fixture \
TALEBOOK_VERSION_BROWSER=1 \
python3 -m pytest tests/test_upgrade_version_management.py -v -s --tb=short
```
