# 局域网服务发现部署与自测

管理后台 → 系统设置 → 局域网发现。默认关闭。开启前配置外部 URL、监听 IP 和组播接口；顶部“保存配置”原子持久化后热切换，无需重启。下方分别显示已保存意图、实际发布状态、公开 ID 和错误。广播失败不会关闭正常书库服务。

名称来自站点标题，最多 96 个 UTF-8 字节。公开 URL、IP、接口和稳定 ID 只用于发现，不是身份认证；访问码和登录仍然生效。广播不包含口令、cookie 或配置全集。

## 配置

```python
# auto.py 中由管理页保存；也可由部署者通过 manual.py 固定覆盖。
settings = {
    'LAN_DISCOVERY_ENABLED': True,
    'LAN_DISCOVERY_ENDPOINTS': [
        {
            'url': 'http://192.168.50.10:8080',
            'addresses': ['192.168.50.10'],
            'interfaces': ['eth0'],
        },
    ],
}
```

每个 URL 对应一个 DNS-SD 实例，可选择多个接口。同一规范化 URL 只能配置一次，应在同一项合并接口/地址。最多八个端点，每项最多八个 IP 和八个接口。地址必须属于所选本机接口，只接受 RFC1918 IPv4 和 IPv6 ULA；不接受公网、loopback、link-local、容器桥或隧道。接口必须启用且支持组播。接口消失时暂停相应来源，可用来源继续发布；配置 IP 消失时暂停端点并显示错误，不猜测新 IP。接口恢复后自动恢复发布。

URL 可使用管理员的 DNS 名，域名保留给 HTTP Host 和 HTTPS SNI。发现阶段不做 DNS/HTTP/TCP 能力探测；Moke 加入前需验证域名解析全部属于私网且至少匹配一个广播地址。不能把 mDNS SRV target 能解析当作业务域名必然可用。

根 URL 规范化后无尾斜线，前缀保留，例如 `https://books.home.arpa:8443/team/books` 。不允许凭据、查询、片段、反斜线、控制字符、编码路径或点段。服务端不会跟随 URL、降级 HTTPS 或更改 Host/SNI。

独立 UUIDv4 首次发布前原子写入 `<settings_path>/lan-discovery-id` ，权限 0600。需要保留配置目录的写权限。关闭、重开、重启、更名和 cookie secret 轮换复用 ID；备份恢复保留文件。克隆为第二台独立部署时，先关播并移除克隆的 ID 文件，再开启以生成新 ID；不要在原部署运行时删除。普通设置 POST 不接受改写 ID。

`manual.py` 覆盖的发现配置以有效值显示并锁定编辑；修改此文件需重启。演示账号只看默认值，保存不落盘、不建发布资源。

## 部署矩阵

| 部署 | 配置要求与限制 | 验证情况 |
|---|---|---|
| Linux 原生 | 发布进程可加入选定 LAN 接口，网络允许 UDP5353；填写实际外部 listener 的协议/端口 | 模块与生命周期测试；本轮真实运行使用下行 host network |
| Linux Docker host network | 使用 `--network host`；填写宿主 Nginx/反向代理实际 listener，不能使用内部 Tornado 地址 | 真实 Talebook + 同宿主机独立原始 UDP 接收器验证 IPv4 |
| 默认 Docker bridge / `ports:` | 容器内地址和端口映射不是可推断的外部目标；默认保持关闭，单独映射5353不解决 LAN 组播 | 不支持此自动部署路径；没有新增宿主发布代理 |
| Docker Desktop | host 网络与宿主 LAN 组播能力需按具体版本独立验证 | 未验证，不作支持承诺 |
| macvlan / ipvlan | 地址、组播、AP 隔离、宿主互通需单独确认 | 未验证 |
| 本机反向代理 / HTTPS / 路径前缀 | URL 使用代理外部端口；地址属于所选接口；代理剥离路径，`TALEBOOK_BASE_PATH` 与公开前缀一致；需要重建/配置前端路径 | URL 编码测试通过；真实 HTTPS、代理前缀、重定向和原生 Cookie 范围未联调 |
| IPv6 ULA | 配置 ULA 和对应接口；客户端具备 IPv6 路由及组播权限 | 编码测试通过；没有真实 IPv6 网络证据 |

Talebook 生产镜像中的 Tornado 通常只监听 `127.0.0.1:8000` ，不能把它作为 LAN 地址。host network 下内置 Nginx 通常使用宿主 80/443；外层代理可以使用其他端口。普通 bridge 的 `8080:80` 不代表 host network 下也使用 8080。先单独确认客户端可达的实际 listener，再填写广播配置；发布器不会主动探测 HTTP 或推断 NAT。

## 线上记录与独立接收

固定类型 `_talebook._tcp.local.` ，UDP5353，IPv4 `224.0.0.251` 和 IPv6 `ff02::fb` 。依赖固定 `zeroconf==0.148.0` ，`host_ttl` 和 `other_ttl` 均为120；PTR/SRV/TXT/A/AAAA 的 TTL120，正常注销 TTL0。SRV priority/weight 为0。

```text
_talebook._tcp.local. PTR Talebook-<uuid>-1._talebook._tcp.local.
Talebook-<uuid>-1._talebook._tcp.local. SRV 0 0 8080 tb-<uuid>-1.local.
Talebook-<uuid>-1._talebook._tcp.local. TXT "txtvers=1" "id=<uuid>" "name=家中书库" "url=http://192.168.50.10:8080"
tb-<uuid>-1.local. A 192.168.50.10
```

TXT 为有序 DNS 长度前缀编码，单项最多255字节、总 RDATA 最多400字节，不是 UDP JSON。

独立工具使用标准库解码原始 UDP DNS 包，不调用 zeroconf 或业务 HTTP：

```bash
python3 scripts/probe_lan_discovery.py \
  --interface-address 192.168.50.20 --id <管理页显示的UUID> --timeout 15
# 在工具运行期间从管理页关闭广播，同时验证 TTL0：
python3 scripts/probe_lan_discovery.py \
  --interface-address 192.168.50.20 --id <UUID> --expect-goodbye --timeout 15
```

`--interface-address` 是运行接收工具的本机 LAN IP。工具只输出指定测试 UUID 的必要记录；返回 pass 需收到 PTR/SRV/TXT/A，并校验所有非 goodbye RR 的 TTL120。该工具仅提供 IPv4 证据，不代表 Moke 缓存、加入、TLS 或认证验收。首次可点击10秒、注销移除5秒、最后真实刷新后125秒的客户端目标仍需独立设备和 Moke 实测。

## 本地回归入口

```bash
make lint-py-fix
make lint-py
pytest tests/test_lan_discovery.py tests/test_lan_discovery_admin.py -q
make pytest
make check-spec
make check-design
cd app
npx vitest run test/components/LanDiscoverySettings.spec.ts
npm run lint
API_URL=http://127.0.0.1:18186 npm run build
MOCK_API_URL=http://127.0.0.1:18186 npx playwright test --config playwright.discovery.config.ts
```

Playwright 配置自动启动、关闭短生命周期 mock API 和生产前端，仅用于隔离自测。MCP 工具与独立 LAN/Moke 不可用时必须单列，不能将 mock 页面或同宿主机组播当成双端通过。Moke 保存/连接入口和各端平台权限由 TB-446 / TB-272 承接；现存宽松 TLS 与 Range 桥、重定向、Cookie 范围风险没有在此任务中改造或豁免。
