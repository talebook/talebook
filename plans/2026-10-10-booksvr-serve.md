# 阶段 2：流量切换 —— 让 booksvr 真正提供 HTTP 服务

> 本文件是**阶段 2 的可执行计划**，含 TDD 步骤。
>
> **上游依据：** `plans/2026-10-10-backend-go-migration-roadmap.md`（总纲级路线图，已通过 plan-review）。
> 路线图 Handoff Notes 第 1 条明确要求：「每个阶段开工前先产出该阶段的 `plans/*.md`（含 TDD 步骤）并单独 `plan-review`」。本文件即该产出物。
>
> **本文件不重复路线图的背景分析。** 需要背景时读路线图。

---

## User Request

**原始需求（用户原话）：**

> 我的目标从来都是替换 calibre，整个 talebook 的后端换成 go 的 booksvr 呀

> 岂有此理，没有被调用，booksvr 还有什么用。目标就是替换 calibre，只是部分功能没实现而已

**阶段 2 定位（用户 2026-10-10 澄清后确认）：**

用户问「tornado 干啥了？为什么不让 booksvr 实现所有功能」，澄清后选择：

> **A 绞杀者：先接管流量，再逐条搬 handler**

即：阶段 2 **不实现全部 215 条 handler**，而是先让 booksvr 站到生产路径上（未实现路由代理回 Tornado），此后每搬一条 handler，Tornado 就少服务一条，直到 Tornado 无事可做。

**已澄清的三个关键设计决策（2026-10-10 AskUser）：**

| # | 问题 | 用户决策 | 含义 |
|---|---|---|---|
| 1 | 切换方式 | **A 绞杀者：先接管流量，再逐条搬 handler** | booksvr 监听 8000 作主入口；未实现路由反向代理回 Tornado（Tornado 退到 8001） |
| 2 | 身份与权限传递 | **B booksvr 自行解析 Tornado cookie** | booksvr 用同一 `cookie_secret` 解 Tornado 的 secure cookie，不复刻 session 存储 |
| 3 | 数据库读写边界 | **B 读写** | booksvr 可写；merge 由 booksvr 直接落库 |

**⚠️ 决策 2 与决策 3 的风险（用户已知悉并选择，实施时必须落实缓解措施）：**

- 决策 2（自行解析 cookie）：需要在 Go 中复刻 Tornado 的 secure cookie 签名算法，且 `cookie_secret` 必须下发给 booksvr。**缓解：** 用 Tornado 真实生成的 cookie 作为测试向量做逐字节比对（见实施项 2），算法不一致时测试必须失败。
- 决策 3（读写）：两进程同时写同一 SQLite 有锁竞争与一致性风险。**缓解：**
  - 阶段 2 只有 merge 一条写路由走 booksvr。**该路由是 booksvr 新增路由，Python 侧从未注册**（已核实：`rg -n 'merge' webserver/handlers/*.py webserver/main.py` 无匹配），因此不存在「两边都服务」的双写。
  - SQLite 启用 WAL + busy_timeout。
  - **启动时序约束：** booksvr 必须在 Tornado 完成 `--syncdb`/`migrate_db.py` 自检**之后**才打开数据库（见实施项 8 的启动时序设计），否则会与 bootstrap 的库结构变更竞争。

> **评审修正记录（2026-10-10）：** 本计划初稿曾把「避免双写」寄托在「Tornado 侧摘除 merge 路由」上，但该路由在 Python 侧根本不存在。已修正为上述表述。

---

## Goal

让 `booksvr` 成为 Talebook 的**唯一对外 HTTP 后端进程**：

1. 新增 `booksvr serve` 子命令，监听 8000，提供 HTTP 服务。
2. 已实现的 3 条路由由 booksvr 直接服务。
3. 其余 215 条路由**显式反向代理**回 Tornado（Tornado 退到 8001），不得静默 404。
4. 灰度开关可按路由控制「走 booksvr / 走 Tornado」，默认全部走 Tornado。
5. 关闭开关后流量完全回到 Tornado，行为与切换前一致（可回滚）。
6. 身份由 booksvr 自行解析 Tornado secure cookie 得到。

**本阶段完成后：** `booksvr` 是唯一对外后端，Tornado 退居为「未实现路由的兜底服务」，后续阶段每搬一条 handler，兜底清单就少一条。

---

## Non-Goals

- **不实现其余 215 条 handler。** 那是阶段 3-6 的工作。阶段 2 只解决「谁提供 HTTP」。
- **不改变对外 HTTP API 契约。** 218 条路由的路径、方法、响应结构不变；前端 Nuxt 零改动。
- **不改变 Tornado 的业务逻辑。** 它只是从 8000 退到 8001，代码不动。
- **不删除 Calibre 依赖。** 阶段 2 不触碰「数据从哪来」。
- **不做与流量切换无关的重构。**

---

## Current Codebase Facts

> 以下全部为 2026-10-10 实测核实，非推测。

### Go 侧现状

| 事实 | 证据 |
|---|---|
| booksvr 无 `serve` 子命令 | `booksvr/cmd/booksvr/main.go` 只有 `import-calibre`、`reindex-normalize` |
| `Server` 只被测试使用 | `booksvr/internal/httpapi/server.go` 的 `Server` 仅由 `httptest.NewServer` 使用，无生产入口 |
| 218 条路由已声明 | `booksvr/internal/httpapi/routes.go`（215 镜像 + 3 新增） |
| 仅 3 条有 handler | `booksvr/internal/httpapi/workroutes.go` 的 `WorkRouteSpecs()` |
| 未实现路由被跳过 | `NewServer` 中 `if spec.Handler == nil { continue }` |
| 已有 `Identity` 结构 | `server.go`：`UserID`/`Username`/`IsAdmin`，`Identify func(*http.Request) (Identity, error)` 可注入 |
| 已有 `IsPublic` 注入点 | `server.go`：`IsPublic func(bookID int64) (bool, error)`，对应 `can_view_book()` |
| 已有 `@js`/`@auth` 等价语义 | `server.go`：`Auth`/`Admin` 字段 + `ErrNeedLogin`/`ErrNotAdmin` 错误码 |
| Go 版本 | `go 1.22`（`booksvr/go.mod`），本机 go1.24.13 |
| 唯一外部依赖 | `modernc.org/sqlite v1.34.5`（纯 Go，无 cgo） |

### Python 侧现状（身份相关）

| 事实 | 位置 |
|---|---|
| 身份来自 3 个 secure cookie | `webserver/handlers/base.py:288-310`：`lt`（登录时间）、`user_id`、`admin_id` |
| 登录有效期 7 天 | `base.py:289`：`int(login_time) < int(time.time()) - 7 * 86400` |
| cookie 密钥 | `webserver/settings.py:30`：`"cookie_secret": "cookie_secret"`（默认值，安装时由 `admin.py:816` 改写为 uuid） |
| Tornado 版本 | `requirements.txt:5`：`tornado==6.5.10` |
| 签名算法版本 | `tornado.web.DEFAULT_SIGNED_VALUE_VERSION = 2` |
| 已有跨语言签名先例 | `webserver/handlers/comic.py:68,77`、`network_comic.py:25,98` 已用 `create_signed_value`/`decode_signed_value` 做 token |

### 部署现状

> ⚠️ **关键：部署配置有三套，必须全部同步修改。** Dockerfile 在不同 target 引用不同文件。

| 环境 | supervisor 配置 | nginx 配置 | Dockerfile 引用行 |
|---|---|---|---|
| 生产（spa，默认） | `conf/supervisor/talebook.conf` | `conf/nginx/talebook.conf` | L210 / L208 |
| 生产（SSR） | `conf/supervisor/server-side-render.conf` | `conf/nginx/server-side-render.conf` | L285 / L283 |
| 开发 | `conf/supervisor/dev.conf` | `conf/nginx/dev.conf` | L363 / L361 |

| 事实 | 位置 |
|---|---|
| Nginx 反代目标（三套均同） | `upstream tornado { server 127.0.0.1:8000; }`（`talebook.conf:3`、`server-side-render.conf:3`、`dev.conf:3`） |
| Nginx 动态路由 | `conf/nginx/talebook.conf:82-92`：`location ~ ^/(api\|get\|read\|read-comic\|opds\|auth\|books\|media)/` → `proxy_pass http://tornado` |
| **Nginx 独立代理 location** | `conf/nginx/talebook.conf` 有 3 处：`/podcast/v1/`（L53，`access_log off`）、`/read/resource/`（L65，`expires off` 私有缓存契约）、`/read-online-comic`（L75，`expires off`）。`server-side-render.conf` 同样 3 处。**`dev.conf` 只有 2 处**（`/podcast/v1/`、`/read-online-comic`，无 `/read/resource/`） |
| supervisor 程序组（生产 spa） | `conf/supervisor/talebook.conf:2`：`programs=nginx,bootstrap,tornado,upgrade` |
| supervisor 程序组（生产 SSR） | `conf/supervisor/server-side-render.conf:2`：`programs=nginx,nodejs,bootstrap,tornado` |
| supervisor 程序组（dev） | `conf/supervisor/dev.conf:2`：`programs=tornado,nginx,nuxtdev` |
| Tornado 启动命令 | `gosu talebook:talebook python3 server.py --with-library=/data/books/library --port=8000 --host=127.0.0.1 --logging=debug --log-file-prefix=/data/log/talebook.log` |
| **Tornado `autostart=false`** | `conf/supervisor/talebook.conf:31`（SSR 同）。**tornado 不由 supervisor 自动启动**，而是由 bootstrap 自检通过后显式拉起 |
| **bootstrap 拉起 tornado** | `webserver/self_check.py:135-137`：`subprocess.run(["supervisorctl", "start", "talebook:tornado"])`；`self_check.py:155-157` 在全部检查通过后调用 |
| Tornado 端口默认值 | `webserver/main.py:25`：`define("port", default=8080)`；`main.py:363` `http_server.listen(options.port, options.host)`。**supervisor 传 `--port=8000` 覆盖默认值** |
| Tornado host | `webserver/main.py:24`：`define("host", default="")`；supervisor 传 `--host=127.0.0.1` |
| 宿主端口 8080 | `docker-compose.yml:13`：`"8080:80"` —— **宿主 8080 映射到容器 80（nginx）**，与 Tornado 端口无关 |
| booksvr 二进制 | Dockerfile `COPY --from=go-builder /out/booksvr /usr/local/bin/booksvr`，**无进程启动它** |
| 数据目录权限 | `docker/start.sh:49` 的 `chown -R talebook:talebook` 列表**不含 `/data/books/library`**；Dockerfile 有 `chmod a+w -R /data/log /data/books /var/www` |

### 已核实的 Tornado secure cookie v2 格式（实施项 3 的算法依据）

Tornado 6.5.10 `create_signed_value(secret, name, value)` 默认 version=2，输出：

```
2|<len(key_version)>:<key_version>|<len(timestamp)>:<timestamp>|<len(name)>:<name>|<len(b64value)>:<b64value>|<hex_hmac_sha256>
```

其中：
- `timestamp` = `str(int(time.time()))`
- `b64value` = `base64.b64encode(value)`
- 待签名串 `to_sign` = 上述前 6 段（含末尾的 `|`）拼接
- `signature` = `hex(HMAC-SHA256(key=secret, msg=to_sign))`
- 最终值 = `to_sign + signature`

**实测测试向量（本机 Tornado 6.5.10 生成，实施项 3 必须复现）：**

```
secret  = "cookie_secret"
name    = "user_id"
value   = "42"
cookie  = 2|1:0|10:1791565386|7:user_id|4:NDI=|9c0fda2c4e752e1982eab786b436f3ad282f45be025716063b093207792e08b9
decode  = b"42"
wrong_secret("other") -> None
```

> ⚠️ 上例 timestamp 为固定值，仅用于算法比对。Go 侧测试必须用**固定 clock** 复现该向量，而不是依赖当前时间。

---

## Proposed Design

### 总体架构（阶段 2 完成后）

```
                    ┌─────────────────────────────────────┐
   Nginx  ────────► │  booksvr :8000  （唯一对外后端）      │
   (反代 8000)       │                                     │
                    │  1. 解析 Tornado secure cookie       │
                    │     → Identity{UserID,IsAdmin}       │
                    │  2. 查灰度开关                       │
                    │     ├─ 命中 booksvr 清单 → 本地 handler│
                    │     └─ 未命中 → 反向代理 ────────┐    │
                    └──────────────────────────────────┼────┘
                                                       │
                                                       ▼
                                        ┌──────────────────────────┐
                                        │  Tornado :8001（兜底）    │
                                        │  215 条未实现路由         │
                                        └──────────────────────────┘
```

### 关键设计点

#### 1. 灰度开关：`-serve-routes` 白名单

- **默认值：空**（全部走 Tornado 兜底）。这是「开关默认全部走 Tornado，逐条开启」的落地。
- 格式：逗号分隔的路由 pattern，或 `all`（全部走 booksvr）。
- 只有**同时满足**「在 booksvr 清单中」且「有 Go handler」的路由才会被本地服务；其余一律代理。
- 环境变量 `BOOKSVR_SERVE_ROUTES` 可覆盖命令行，便于 supervisor 配置。

#### 1b. 路由匹配语义（关键，必须明确定义）

> ⚠️ **这是本计划最容易出错的地方。** `routes.go:19` 的第一条既有路由是 catch-all：
> `{Pattern: "/(.*)", Handler: "StaticFileHandler", ...}`，它的正则匹配**一切路径**。

**Dispatcher 只匹配「有 Go handler 的路由」，不遍历 218 条全表。** 具体规则：

1. Dispatcher 持有的是 `NewServer(WorkRouteSpecs())` 编译出的**已实现路由表**（当前 3 条），**不是** `httpapi.Routes()` 的 218 条。
2. 匹配顺序：按 `WorkRouteSpecs()` 返回顺序逐条正则匹配（与 `Server.ServeHTTP` 一致）。
3. 命中且（`all` 或 pattern 在白名单中）→ 交给本地 `Server` 处理。
4. **其余一切情况**（未命中、命中但不在白名单、命中但 `Handler == nil`）→ 代理到 Tornado。
5. **`/(.*)` 等 catch-all 路由永远不进 Dispatcher 的本地路由表**，因为 `NewServer` 会跳过 `Handler == nil` 的路由，而 `/(.*)` 当前无 handler。

**为什么这样设计：** 避免「先命中 `/(.*)` 就误判为本地路由」的顺序陷阱。阶段 3+ 若给宽泛路由补 handler，必须重新审视此规则。

**白名单校验的例外：** 实施项 1 要求 `-serve-routes` 中每个 pattern 必须存在于 `httpapi.Patterns()`。由于 `Patterns()` 包含 `/(.*)`，用户可传 `-serve-routes=/(.*)`；此时它仍不会本地处理（无 handler），而是走代理 —— 行为正确，但应在 `-help` 中说明。

#### 2. 兜底代理：显式、可观测

- 未命中 booksvr 的路由 → `httputil.ReverseProxy` 转发到 `-tornado-url`（默认 `http://127.0.0.1:8001`）。
- **必须保留原始 Host、X-Forwarded-For、X-Scheme**，与 Nginx 现有行为一致。
- 代理失败（Tornado 不可达）→ 返回 `502` + JSON `{"err":"upstream.unavailable"}`，并记录日志。**不得静默 404。**
- **必须原样透传的响应头（因 nginx 三个独立 location 会经此代理）：**
  - `Cache-Control`（`/read/resource/` 与 `/read-online-comic` 依赖 `private/no-store` 契约）
  - `Accept-Ranges`、`Content-Range`、`Content-Length`（阅读器字节范围请求）
  - `Set-Cookie`、`Content-Type`、`Content-Disposition`
  - `httputil.ReverseProxy` 默认透传响应头，但**必须写测试固定这个行为**（实施项 5）。
- 代理目标不可达时，`/api/welcome` 等健康检查应能反映。

#### 3. 身份解析：Go 复刻 Tornado secure cookie v2

- 新增 `booksvr/internal/httpapi/identity.go`，实现 `DecodeSignedValue(secret, name, value, maxAgeDays, clock)`。
- 解析顺序（对齐 `base.py:288-310`）：
  1. 读 `lt` cookie → 校验未过期（7 天）→ 否则游客
  2. 读 `user_id` cookie → 解出 `UserID`
  3. 读 `admin_id` cookie → 解出 `IsAdmin`
- **`Username` 阶段 2 留空**：Python 侧 `username` 来自 DB 查询（`session.get(Reader, user_id)`），booksvr 阶段 2 不查用户表。3 条已实现路由均不使用 `Username`。
- 密钥来源：`-cookie-secret` 或环境变量 `BOOKSVR_COOKIE_SECRET`；**为空时拒绝启动**（不得用默认值静默运行）。
- **安全约束：** booksvr 只信任自己解析出的 cookie，**不信任任何外部传入的身份 header**。

**⚠️ `cookie_secret` 的下发链路（阻塞项，必须实现）：**

`cookie_secret` **不是环境变量**，而是安装时由 `admin.py:816` 生成 uuid 并写入 `/data/books/settings/auto.py`（Python dict 字面量，由 `loader.py:73` 的 `import auto` 加载）。因此 supervisor 无法直接引用它。

**方案：由 `self_check.py` 读取并转交。** `self_check.py` 已经 `import` 了 webserver 的 settings 体系（它调用 `server.py --syncdb` 等），因此在拉起 booksvr 前：

1. 用 `loader.get_settings()` 读出 `cookie_secret`；
2. 写入一个仅 root/talebook 可读的临时文件（如 `/run/talebook/booksvr.env`，权限 `0600`），内容为 `BOOKSVR_COOKIE_SECRET=<值>`；
3. supervisor 的 booksvr program 用 `environment=` 或 `supervisorctl` 传环境变量启动。

**备选（更简单）：** 若 supervisor 支持 `%(ENV_...)s` 插值，可由 `self_check.py` 先 `export` 再 `supervisorctl start`；但 supervisor 的环境继承不可靠，**推荐用临时 env 文件**。

**安全要求：** 该文件权限 `0600`、属主 `talebook`；不写日志；容器重启后重建。

> **评审修正记录：** 初稿只说「密钥来源：`-cookie-secret` 或环境变量」，未说明 supervisor 如何拿到运行时生成的 secret。这是决策 2 能否落地的前置条件，已补全。

**⚠️ 已知权限偏差（阶段 2 接受，必须记录）：**

Python 的 `base.py:306-310` 是：

```python
admin_id = self.get_secure_cookie("admin_id")
if admin_id:
    self.admin_user = self.session.get(Reader, int(admin_id))   # 查库取 Reader
elif user and user.is_admin():
    self.admin_user = user
```

即 Python **查库取 Reader 对象**，`is_admin()` 再读 `admin` 字段。阶段 2 的 Go 实现不查用户表，因此：

- 若 `admin_id` 指向的用户已被删除或降权，Python 会得到 `None`/非管理员，而 Go 会判为管理员 —— **存在权限提升风险**。
- **缓解：** `admin_id` 只在 `AdminOwnerMode` 下由已确认的管理员写入（`admin.py:293-300`），且 cookie 有 HMAC 签名保护，外部无法伪造。阶段 2 的 3 条路由中只有 merge 需管理员权限，且 merge 是新增路由、无历史数据。
- **后续：** 阶段 3（数据库层接管）时改为查库校验 `admin` 字段。

> 评审修正记录：初稿写「`admin_id` 存在即管理员（对齐 base.py）」并命名为 `TestIdentifyAdminImpersonation`，措辞不准确且测试名暗示冒充。已修正为上述表述，测试改名为 `TestIdentifyAdminOwnerMode`。

#### 4. 数据库：读写 + WAL

- `-db` 指向书库 SQLite（与 Tornado 同一个库）：`/data/books/library/metadata.db`。
- 连接串启用 `_pragma=journal_mode(WAL)` 与 `_pragma=busy_timeout(30000)`，降低两进程并发写的锁冲突。
- 阶段 2 只有 merge 一条写路由走 booksvr。**该路由是 booksvr 新增路由，Python 侧从未注册**（已核实），因此不存在双写。
- **启动时序约束：** booksvr 必须在 Tornado 完成 `--syncdb`/`migrate_db.py` 自检**之后**才打开数据库（见实施项 8）。
- **目录权限：** WAL 模式会在库文件旁创建 `-wal`/`-shm` 文件，需确认 `/data/books/library` 对 `talebook` 用户可写（`docker/start.sh` 的 `chown -R` 列表不含它，但 Dockerfile 有 `chmod a+w -R /data/books`）。实施项 8 需验证。

#### 5. 进程与端口

| 进程 | 端口 | 说明 |
|---|---|---|
| nginx | 80/443 | 不变；宿主映射 8080→80（`docker-compose.yml:13`） |
| booksvr | 8000 | **新增**，唯一对外后端 |
| tornado | 8001 | **改端口**，退居兜底；`--host=127.0.0.1` 保留 |

- supervisor 新增 `[program:booksvr]`，`tornado` 的 `--port` 从 8000 改为 8001（`--host=127.0.0.1` 不变）。
- **启动时序（关键，已核实）：** tornado 是 `autostart=false`，由 `webserver/self_check.py:135-137` 在自检通过后 `supervisorctl start talebook:tornado` 拉起。因此 **`priority` 对 tornado 无效**。
  - **方案：** booksvr 也设为 `autostart=false`，由 `self_check.py` 在拉起 tornado **之后**再拉起 booksvr（`supervisorctl start talebook:booksvr`）。这同时满足「booksvr 晚于 syncdb/migrate 打开库」的约束。
  - 代价：需修改 `webserver/self_check.py`（已列入改动文件清单）。
- Nginx `upstream tornado` 的 `server 127.0.0.1:8000` **保持不变**（8000 现在是 booksvr），因此 nginx 的 upstream 定义无需改动；变量名 `tornado` 保留以减少 diff，阶段 6 再改名。
- **但 nginx 的三个独立代理 location 需评估：** `/podcast/v1/`、`/read/resource/`、`/read-online-comic` 都指向 `upstream tornado`（8000），改后流量会先到 booksvr 再被代理回 8001。功能上能通，但多一跳，且必须保证 booksvr 代理**原样透传** `Cache-Control: private/no-store`、`Accept-Ranges`、`Content-Range`（见实施项 5）。

---

## Planned File Structure

### 新增文件

| 文件 | 职责 |
|---|---|
| `booksvr/internal/httpapi/identity.go` | Tornado secure cookie v2 解码 + `Identity` 解析 |
| `booksvr/internal/httpapi/identity_test.go` | 用真实 Tornado 测试向量做逐字节比对 |
| `booksvr/internal/httpapi/proxy.go` | 兜底反向代理 + 灰度开关路由分发 |
| `booksvr/internal/httpapi/proxy_test.go` | 代理行为、开关语义、502 兜底测试 |
| `booksvr/internal/httpapi/serve.go` | `serve` 子命令的 HTTP 服务器装配（监听、优雅退出） |
| `booksvr/internal/httpapi/serve_test.go` | 端到端：真实监听 + 真实请求 |
| `booksvr/cmd/booksvr/serve.go` | `serve` 子命令的 CLI 参数解析 |
| `booksvr/cmd/booksvr/serve_test.go` | CLI 参数校验测试 |

### 修改文件

| 文件 | 预期改动 |
|---|---|
| `booksvr/cmd/booksvr/main.go` | 注册 `serve` 子命令；usage 文本补充 |
| `booksvr/internal/httpapi/server.go` | 可能新增「路由清单 + 开关」的装配入口（不改现有语义）；处理死代码 `ErrNoHandler` |
| `conf/supervisor/talebook.conf` | 新增 `[program:booksvr]`（`autostart=false`）；`tornado` 端口 8000→8001 |
| `conf/supervisor/server-side-render.conf` | **同步**（SSR 生产镜像，Dockerfile L285） |
| `conf/supervisor/dev.conf` | **同步**（dev 环境，Dockerfile L363） |
| `conf/nginx/talebook.conf` | upstream 端口 8000 保持不变；**但需评估三个独立代理 location**（见设计第 5 节） |
| `conf/nginx/server-side-render.conf` | 同步评估 |
| `conf/nginx/dev.conf` | 同步评估 |
| `webserver/self_check.py` | **新增**：在拉起 tornado 后拉起 booksvr（`supervisorctl start talebook:booksvr`） |
| `Dockerfile` | **无需改动**（理由：`COPY --from=go-builder /out/booksvr /usr/local/bin/booksvr` 已存在且已 `chmod +x`） |
| `docker/start.sh` | **需核实**：`/data/books/library` 对 talebook 用户可写（WAL 需建 `-wal`/`-shm`） |
| `tests/test_booksvr_contract.py` | 扩展：新增身份解析与路由分发的契约断言 |
| `tests/test_deploy_config.py` | **新增**：三套 supervisor/nginx 配置的断言 |

### 不改动

- `webserver/` 其余 Python 代码（除 `self_check.py` 的启动时序与密钥转交）。
- `app/` 前端全部代码。
- `plans/2026-10-07-calibre-go-rewrite.md` 与 `design/booksvr/20261007-calibre-go-rewrite.active.html`。
- **经核实无需改动（显式豁免）：** `conf/nginx/nginx.conf`（纯 http 块，无 upstream/端口）、`kubernetes/`（无 8000/8080/tornado 引用）、`docker-compose.dev.yml`（`8080:80` 走容器内 nginx）、`Makefile`（已有 `build-go`/`test-go`/`lint-go`）。

> **评审修正记录：** 初稿遗漏了 `server-side-render.conf`（supervisor + nginx）与 `dev.conf`（nginx），会导致 SSR 生产镜像端口冲突崩溃；也遗漏了 `self_check.py` 的启动时序。已补全。

---

## Implementation Steps（TDD）

> 每一步都遵循「先写失败测试 → 实现 → 测试通过」。测试命令在 `booksvr/` 目录下执行。

### 实施项 1：`serve` 子命令骨架与参数校验

**测试先行**（`booksvr/cmd/booksvr/serve_test.go`）：

- `TestServeRequiresDB`：不传 `-db` → 返回错误，错误信息含 `-db`。
- `TestServeRequiresCookieSecret`：不传 `-cookie-secret` 且环境变量为空 → 返回错误，错误信息含 `cookie-secret`。
- `TestServeRejectsUnknownRoute`：`-serve-routes` 含未注册 pattern → 返回错误。
- `TestServeHelpMentionsOptions`：`serve --help` 输出含 `-db`、`-addr`、`-tornado-url`、`-serve-routes`、`-cookie-secret`。

**实现**（`booksvr/cmd/booksvr/serve.go`）：

- `flag.NewFlagSet("serve", ...)`，参数（**统一单横线**，与 Go `flag` 包一致）：`-db`、`-addr`（默认 `127.0.0.1:8000`）、`-tornado-url`（默认 `http://127.0.0.1:8001`）、`-serve-routes`（默认空）、`-cookie-secret`。
- 环境变量回退：`BOOKSVR_DB`、`BOOKSVR_ADDR`、`BOOKSVR_TORNADO_URL`、`BOOKSVR_SERVE_ROUTES`、`BOOKSVR_COOKIE_SECRET`。
- 校验：`-db` 必填且文件存在；`-cookie-secret` 必填且非空；`-serve-routes` 中每个 pattern 必须存在于 `httpapi.Patterns()`。
- `-help` 文本需说明：白名单中的 pattern 若对应路由无 Go handler，仍会走代理（见设计第 1b 节）。

**验收：** `cd booksvr && go test ./cmd/booksvr/ -run TestServe -v` 全绿。

---

### 实施项 2：Tornado secure cookie v2 解码器

**测试先行**（`booksvr/internal/httpapi/identity_test.go`）：

- `TestDecodeSignedValueV2RealVector`：用上文实测向量
  （`secret="cookie_secret"`, `name="user_id"`, `value="42"`,
  `cookie="2|1:0|10:1791565386|7:user_id|4:NDI=|9c0fda2c4e752e1982eab786b436f3ad282f45be025716063b093207792e08b9"`）
  配合固定 clock（`1791565386`）→ 解出 `"42"`。
- `TestDecodeSignedValueWrongSecret`：换密钥 → 返回 `nil`（不报错，视为未登录）。
- `TestDecodeSignedValueExpired`：clock 设为 `1791565386 + 8*86400` → 返回 `nil`。
- `TestDecodeSignedValueTampered`：改动签名任一字节 → 返回 `nil`。
- `TestDecodeSignedValueMalformed`：`""`、`"garbage"`、`"2|"` → 返回 `nil`，不 panic。
- `TestDecodeSignedValueV1Rejected`：v1 格式（`value|timestamp|sha1sig`）→ 返回 `nil`（阶段 2 只支持 v2，与 Tornado 默认一致）。

**实现**（`booksvr/internal/httpapi/identity.go`）：

- `func DecodeSignedValue(secret, name string, value []byte, maxAgeDays float64, clock func() int64) []byte`
- 严格按上文格式解析：按 `|` 切分，校验 version==2，逐字段校验长度前缀，重算 HMAC-SHA256，`hmac.Equal` 比对，校验 name 与 timestamp。
- 任何异常一律返回 `nil`（对齐 Tornado 的 `return None` 语义）。

**验收：** `cd booksvr && go test ./internal/httpapi/ -run TestDecodeSignedValue -v` 全绿。

---

### 实施项 3：`Identity` 解析（对齐 `base.py:288-310`）

**测试先行**（`booksvr/internal/httpapi/identity_test.go`）：

- `TestIdentifyGuestNoCookies`：无 cookie → `Identity{UserID:0, IsAdmin:false}`，`IsGuest()==true`。
- `TestIdentifyLoggedInUser`：`lt` + `user_id=42` → `UserID==42`。
- `TestIdentifyExpiredLogin`：`lt` 为 8 天前 → 游客。
- `TestIdentifyAdmin`：`lt` + `user_id=42` + `admin_id=42` → `IsAdmin==true`。
- `TestIdentifyAdminOwnerMode`：`user_id=42` + `admin_id=7` → `IsAdmin==true`。**注释必须说明：** 这是 `AdminOwnerMode` 下的 owner 切换（`admin.py:293-300`），不是冒充；且阶段 2 不查库校验 `admin` 字段，存在已知权限偏差（见设计第 3 节）。
- `TestIdentifyIgnoresExternalHeaders`：请求带 `X-Talebook-User-Id: 999` → **不影响** `Identity`（安全约束）。
- `TestIdentifyBadCookieIsGuest`：cookie 签名错误 → 游客，不报错。

**实现**：

- `func NewCookieIdentifier(secret string, clock func() int64) func(*http.Request) (Identity, error)`
- 逻辑对齐 `base.py:288-310`：
  - `lt` 缺失或 `int(lt) < now - 7*86400` → 游客
  - `user_id` 解出数字 → `UserID`
  - `admin_id` 存在 → `IsAdmin = true`（阶段 2 不查库，已知偏差见设计第 3 节）
- 返回的 `error` 恒为 `nil`（身份解析失败即游客，不阻断请求）。

**验收：** `cd booksvr && go test ./internal/httpapi/ -run TestIdentify -v` 全绿。

---

### 实施项 4：灰度开关与路由分发

**测试先行**（`booksvr/internal/httpapi/proxy_test.go`）：

- `TestDispatchEmptyWhitelistGoesToProxy`：`serve-routes` 为空 → 所有请求走代理。
- `TestDispatchWhitelistedImplementedRouteGoesLocal`：`serve-routes=/api/work/([0-9]+)` → 该路由本地处理。
- `TestDispatchWhitelistedButUnimplementedGoesToProxy`：`serve-routes` 含一条**无 handler** 的路由 → 仍走代理（不得 404）。
- `TestDispatchAllGoesLocalForImplemented`：`serve-routes=all` → 3 条已实现路由本地处理，其余代理。
- `TestDispatchUnknownPathGoesToProxy`：未注册路径 → 代理（不得静默 404）。

**实现**（`booksvr/internal/httpapi/proxy.go`）：

- `type Dispatcher struct { server *Server; proxy http.Handler; whitelist map[string]bool; all bool }`
- `ServeHTTP`：按**设计第 1b 节**的匹配语义：
  1. 遍历 `server.routes`（即 `NewServer(WorkRouteSpecs())` 编译出的**已实现路由表**，当前 3 条），按顺序正则匹配；
  2. 命中且（`all` 或 pattern 在白名单中）→ 交给 `Server`；
  3. **其余一切情况** → `proxy`。
- **不得遍历 `httpapi.Routes()` 的 218 条全表**（含 catch-all `/(.*)`，会导致顺序陷阱）。
- 白名单匹配用**原始 pattern 字符串**（与 `-serve-routes` 一致），不做正则二次匹配。
- 复用 `server.go` 已有的 `ErrNoHandler`（当前是死代码）表达「路由存在但无 handler」语义，或删除它并在注释中说明原因。

**验收：** `cd booksvr && go test ./internal/httpapi/ -run TestDispatch -v` 全绿。

---

### 实施项 5：兜底反向代理

**测试先行**（`booksvr/internal/httpapi/proxy_test.go`）：

- `TestProxyForwardsToUpstream`：起一个 `httptest` 上游，断言路径、方法、body 被转发。
- `TestProxyPreservesHostAndForwardedHeaders`：断言 `Host`、`X-Forwarded-For`、`X-Scheme` 被保留/补充。
- `TestProxyUpstreamDownReturns502`：上游不可达 → `502` + `{"err":"upstream.unavailable"}`。
- `TestProxyDoesNotSwallowResponseHeaders`：上游的 `Content-Type`、`Set-Cookie` 原样透传。
- `TestProxyPreservesCacheAndRangeHeaders`：上游返回 `Cache-Control: private, no-store`、`Accept-Ranges: bytes`、`Content-Range: bytes 0-99/1000` → 全部原样透传（因 nginx 三个独立 location 会经此代理）。

**实现**：

- 用 `net/http/httputil.NewSingleHostReverseProxy`，自定义 `Director` 保留 Host 与转发头。
- `ErrorHandler` 返回 502 + JSON，并 `log` 记录上游地址与错误。
- 确认 `ReverseProxy` 默认透传响应头（包括 `Cache-Control`/`Accept-Ranges`/`Content-Range`），用测试固定该行为。

**验收：** `cd booksvr && go test ./internal/httpapi/ -run TestProxy -v` 全绿。

---

### 实施项 6：`serve` 装配与端到端

**测试先行**（`booksvr/internal/httpapi/serve_test.go`）：

- `TestServeEndToEndLocalRoute`：起真实 booksvr（随机端口）+ 真实 SQLite 测试库 → `GET /api/work/{id}` 返回预期 JSON。
- `TestServeEndToEndProxiedRoute`：同上 + 假上游 → 未实现路由被代理，响应来自上游。
- `TestServeGracefulShutdown`：`Shutdown` 后端口释放，无 goroutine 泄漏。
- `TestServeAuthEnforced`：`/api/book/{id}/merge` 无 cookie → **HTTP 200** + `{"err":"user.need_login"}`（对齐 `server.go` 的 `writeJSON(w, http.StatusOK, ...)`，**不是 401**）。

**实现**（`booksvr/internal/httpapi/serve.go`）：

- `func Serve(ctx context.Context, opts ServeOptions) error`
- 打开 DB（WAL + busy_timeout）→ `NewServer(WorkRouteSpecs())` → 装配 `Dispatcher` → `http.Server` 监听 → `ctx.Done()` 时优雅退出。

**验收：** `cd booksvr && go test ./internal/httpapi/ -run TestServe -v` 全绿。

---

### 实施项 7：merge 路由归属确认（无双写风险）

**背景（已核实）：** 决策 3 选择「读写」，merge 由 booksvr 落库。

**关键事实：** `/api/book/([0-9]+)/merge` 是 booksvr **新增**的 3 条路由之一（`routes.go` 的 `newRoutes`），**Python 侧从未注册过该路由**。已核实：

```
$ rg -n 'merge' webserver/handlers/*.py webserver/main.py
(无匹配)
```

因此**不存在「两进程同时服务 merge」的双写风险**。初稿的「Tornado 侧摘除」表述基于错误前提，已删除。

**测试先行**（`tests/test_booksvr_contract.py` 扩展）：

- `TestMergeRouteIsBooksvrOnly`：断言 `/api/book/([0-9]+)/merge` 出现在 `newRoutes`，**不**出现在 `registeredRoutes`（即 Python 侧无对应实现）。
- `TestMergeRouteInServeWhitelist`：断言 supervisor 配置的 `-serve-routes` 包含该 pattern。

**实现：**

- 在 supervisor 的 booksvr 启动参数中，`-serve-routes` 包含 `/api/book/([0-9]+)/merge`。
- 在计划与 design 文档中记录：**该路由的写操作唯一入口是 booksvr**。

> ⚠️ 若实施时发现 Python 侧新增了同名路由（例如上游合并），必须停止并重新评估双写风险。

**验收：** 契约测试通过；手工确认 merge 请求由 booksvr 处理（看日志）。

---

### 实施项 8：supervisor / nginx / 启动时序配置

**背景（已核实）：** tornado 是 `autostart=false`（`talebook.conf:31`），由 `webserver/self_check.py:135-137` 在自检通过后 `supervisorctl start talebook:tornado` 拉起。**`priority` 对 autostart=false 的进程无效**，初稿的「用 priority 控制启动顺序」不成立。

**启动时序设计：**

1. nginx 启动（`autostart=true`）
2. bootstrap 自检（`autostart=true`）：权限校验、nginx 配置检查、`--syncdb`、`migrate_db.py`、`--update-config`
3. 自检全部通过 → `self_check.py` 拉起 tornado（8001）
4. **紧接其后** → `self_check.py` 拉起 booksvr（8000）

这保证 booksvr 在库结构变更（syncdb/migrate）**之后**才打开数据库。

**测试先行**（新增 `tests/test_deploy_config.py`）：

- `TestAllSupervisorConfigsHaveBooksvr`：三份 supervisor 配置（`talebook.conf`、`server-side-render.conf`、`dev.conf`）均含 `[program:booksvr]`。
- `TestAllSupervisorConfigsTornadoPort8001`：三份均含 `--port=8001`。
- `TestBooksvrAutostartFalse`：booksvr 为 `autostart=false`（由 self_check 拉起）。
- `TestSelfCheckStartsBooksvrAfterTornado`：`webserver/self_check.py` 中 `start_tornado` 的调用先于 `start_booksvr`。
- `TestAllNginxConfigsUpstream8000`：三份 nginx 配置的 upstream 均指向 8000。
- `TestBooksvrCookieSecretConfigured`：`self_check.py` 含从 settings 读 `cookie_secret` 并转交 booksvr 的逻辑（断言 `start_booksvr` 存在且引用 `cookie_secret`）。
- `TestBooksvrServeRoutesIncludesMerge`：`-serve-routes` 含 merge pattern。

**实现：**

- `conf/supervisor/talebook.conf`、`server-side-render.conf`、`dev.conf`（三份）：
  - 新增 `[program:booksvr]`，`autostart=false`，命令为：
    ```ini
    command=/usr/local/bin/booksvr serve -db=/data/books/library/metadata.db -addr=127.0.0.1:8000 -tornado-url=http://127.0.0.1:8001 -serve-routes=/api/work/([0-9]+),/api/book/([0-9]+)/versions,/api/book/([0-9]+)/merge
    environment=BOOKSVR_COOKIE_SECRET="%(ENV_BOOKSVR_COOKIE_SECRET)s"
    ```
    **注意：** 密钥**不**写在命令行（避免 `ps` 泄露），而是由 `self_check.py` 先 `export BOOKSVR_COOKIE_SECRET` 再 `supervisorctl start`；若 supervisor 的环境继承不可靠，改用 `/run/talebook/booksvr.env`（`0600`）+ `startsecs` 前读取。
  - `tornado` 的 `--port=8000` 改为 `--port=8001`（`--host=127.0.0.1` 不变）。
  - `programs=` 加入 `booksvr`。
- `webserver/self_check.py`：新增 `start_booksvr()`，在 `start_tornado_fn()` 之后调用；并在其中从 `loader.get_settings()` 读出 `cookie_secret` 并转交（见设计第 3 节的下发链路）。
- `conf/nginx/talebook.conf`、`server-side-render.conf`：`upstream` 端口 8000 **保持不变**（8000 现在是 booksvr）；评估 3 个独立代理 location。`dev.conf` 只有 2 个 location。
- `docker/start.sh`：核实 `/data/books/library` 对 talebook 用户可写。

**验收：** `python -m pytest tests/test_deploy_config.py -v` 全绿。

> **评审修正记录：** 初稿只改 `talebook.conf` 与 `dev.conf`，遗漏 `server-side-render.conf`（SSR 生产镜像会端口冲突崩溃）；且错误地依赖 `priority` 控制启动顺序。已修正。

---

### 实施项 9：契约测试扩展

**测试先行**（`tests/test_booksvr_contract.py` 扩展）：

- `TestServeSubcommandDeclared`：`main.go` 的 usage 含 `serve`。
- `TestIdentityAlgorithmMatchesTornado`：用 Python 的 `tornado.web.create_signed_value`（固定 clock）生成 cookie，断言其与计划中硬编码的测试向量逐字节一致；Go 侧测试用同一硬编码向量。两侧共用同一向量即达成跨语言一致性。
  - **注：** 本测试只依赖 `tornado`，**不依赖 Calibre**，因此在本机可运行（与现有契约测试的「无 Calibre」限制不冲突）。
- `TestWhitelistDefaultsEmpty`：`serve` 的 `-serve-routes` 默认值为空串。

**实现：** 按断言补齐。

**验收：** `python -m pytest tests/test_booksvr_contract.py -v` 全绿。

---

### 实施项 10：真实环境端到端验证

**前置：** Docker Hub 可达（阶段 1 遗留缺口）。

**端口说明（避免混淆）：**

- 宿主 `8080` → 容器 `80`（nginx），由 `docker-compose.yml:13` 的 `"8080:80"` 映射。
- 容器内 nginx → `127.0.0.1:8000`（booksvr）→ 代理 → `127.0.0.1:8001`（tornado）。
- 因此 `curl http://127.0.0.1:8080/api/welcome` 访问的是 **nginx**，不是 Tornado。

**步骤：**

1. `make build` 构建镜像。
2. `make up` 启动。
3. 确认 `curl http://127.0.0.1:8080/api/welcome` 可用（经 nginx → booksvr → 代理 → tornado）。
4. 浏览器验证：登录、书库列表、书籍详情、阅读、书架、管理页。
5. 验证 merge 路由走 booksvr（看 booksvr 日志）。
6. 验证未实现路由走 Tornado（看 Tornado 日志）。
7. 验证阅读器字节范围请求（`/read/resource/`）与 Podcast（`/podcast/v1/`）经代理后仍正常（缓存头、range 头未被破坏）。
8. **回滚验证：** 把 `-serve-routes` 置空重启 → 全部流量回 Tornado，行为与切换前一致。

**验收：** 全流程可用；回滚后行为一致。

> ⚠️ 若 Docker Hub 不可达，如实记录为未执行项与风险，不得写成已通过。
> **替代验证方案：** 若 Docker Hub 不可达，可用 `docker build --target dev` 本地构建（不依赖拉取新基础镜像），或退而用 `go test ./...` + `pytest tests/test_deploy_config.py` 做静态验证，并在 design 文档中如实记录降级情况。

---

### 实施项 11：design 方案文档

**产出：** `design/booksvr/20261010-booksvr-serve.wip.html`

- 复制 `design/TEMPLATE.html`，按仓库规范填写。
- 必备内容：原始诉求、目标、方案、测试结果。
- 测试结果先标记「待验证」，实施项 10 完成后回写实际命令与结果。
- 运行 `make check-design` 校验。

**验收：** `make check-design` 通过。

---

## Testing Strategy

| 层级 | 命令 | 覆盖 |
|---|---|---|
| Go 单元 | `cd booksvr && go test ./...` | 解码器、身份、分发、代理 |
| Go 静态 | `cd booksvr && go vet ./... && gofmt -l .` | 无输出 |
| Python 契约 | `python -m pytest tests/test_booksvr_contract.py -v` | 跨语言一致性 |
| 部署配置 | `python -m pytest tests/test_deploy_config.py -v` | supervisor/nginx |
| 方案校验 | `make check-design` | design HTML |
| 规格校验 | `make check-spec` | spec/ |
| 端到端 | 实施项 10 | 真实 Docker + 浏览器 |

**覆盖率目标：** 新增代码 ≥ 90%（对齐阶段 1 的 `httpapi` 99.6%）。

---

## Risks and Mitigations

| 风险 | 影响 | 缓解 |
|---|---|---|
| Go 复刻的 cookie 算法与 Tornado 不一致 | 所有人被判定为游客，全站 401 | 用真实 Tornado 测试向量逐字节比对（实施项 2）；跨语言契约测试（实施项 9） |
| `cookie_secret` 下发到 booksvr | 密钥泄露面扩大 | 只经环境变量/命令行传入，不落盘、不写日志；容器内同机通信 |
| 代理逻辑有 bug | 全站不可用 | 白名单默认空（全部走 Tornado）；先只开 3 条路由；回滚只需改一个参数 |
| **catch-all `/(.*)` 路由导致分发顺序错乱** | 全站路由错乱 | Dispatcher 只匹配「有 handler 的路由表」，不遍历 218 条全表（设计第 1b 节） |
| 两进程并发写 SQLite | 数据错乱 | WAL + busy_timeout；阶段 2 只有 merge 一条写路由，且该路由 Python 侧不存在（无双写） |
| **booksvr 早于 syncdb/migrate 打开库** | 库结构变更竞争 | booksvr `autostart=false`，由 `self_check.py` 在 tornado 之后拉起（实施项 8） |
| **遗漏 SSR 生产配置** | SSR 镜像端口冲突崩溃 | 三套 supervisor + 三套 nginx 配置全部同步（实施项 8） |
| **代理破坏缓存/range 头** | 阅读器/Podcast 异常 | 实施项 5 新增 `Cache-Control`/`Accept-Ranges`/`Content-Range` 透传测试 |
| **`admin_id` 不查库导致权限偏差** | 已删除/降权用户仍被当管理员 | 阶段 2 接受并记录；cookie 有 HMAC 保护；阶段 3 改为查库校验 |
| 未实现路由静默 404 | 前端功能缺失且难排查 | 分发器对未命中一律代理；代理失败返回显式 502 + 日志 |
| 端口/进程管理复杂化 | 部署失败 | 实施项 8 的配置测试；实施项 10 真实环境验证 |

---

## Rollback Plan

1. **单条路由回滚：** 从 `-serve-routes` 中移除该 pattern，重启 booksvr。
2. **全量回滚：** `-serve-routes` 置空，重启 booksvr → 全部流量回 Tornado。
3. **彻底回滚：** 三份 supervisor 配置中把 tornado 端口改回 8000、停用 booksvr program，并回退 `self_check.py` 的 `start_booksvr` 调用，重启。
4. **镜像回滚：** 保留变更前的镜像 tag。

**回滚验证是实施项 10 的必做步骤，不得省略。**

---

## Handoff Notes

1. **本计划是阶段 2 的可执行计划**，上游是 `plans/2026-10-10-backend-go-migration-roadmap.md`。
2. **三个设计决策已由用户确认**（切换方式 A / 身份 B / 读写 B），实施时不得擅自更改。
3. **不要重复第一阶段会话的错误表述。** booksvr **已经真实接管了格式路径解析层**（`format_keys.py` 被 `get_books()` 与 WebDAV 调用）。不要说「booksvr 没被调用」。
4. **218 条路由中仅 3 条有 Go handler。** 其余 215 条是「已声明未实现」，阶段 2 靠代理兜底，不实现它们。
5. **第一阶段成果保留。** `plans/2026-10-07-calibre-go-rewrite.md` 与 `design/booksvr/20261007-calibre-go-rewrite.active.html` 不推翻、不修改。
6. **`plans/` 不进仓库。**
7. **前端 Nuxt 零改动**是硬验收口径。
8. **若实施时发现 plan 与代码事实冲突、范围越界或关键需求不明，应停止并说明，不要自行猜测或改设计。**

---

## 附：实施项依赖顺序

```
1 (CLI 骨架)
 └─► 2 (cookie 解码器)
      └─► 3 (Identity 解析)
           └─► 4 (灰度开关与分发)
                └─► 5 (兜底代理)
                     └─► 6 (serve 装配与端到端)
                          ├─► 7 (merge 单边化)
                          ├─► 8 (supervisor/nginx 配置)
                          └─► 9 (契约测试扩展)
                               └─► 10 (真实环境端到端)
                                    └─► 11 (design 方案文档)
```

实施项 1-6 是核心链路，必须按序；7-9 可在 6 之后并行；10-11 收尾。