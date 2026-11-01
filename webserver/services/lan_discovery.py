"""Opt-in DNS-SD publisher. No sockets or tasks are created at import/make_app time."""

import asyncio
import ipaddress
import json
import logging
import os
import re
import socket
import sys
import tempfile
import unicodedata
import uuid
from pathlib import Path
from urllib.parse import urlsplit

import psutil


SERVICE_TYPE = "_talebook._tcp.local."
TTL = 120
CONFIG_KEYS = ("LAN_DISCOVERY_ENABLED", "LAN_DISCOVERY_ENDPOINTS")
NETWORKS = tuple(ipaddress.ip_network(n) for n in ("10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "fc00::/7"))


def lan_address(value):
    address = ipaddress.ip_address(value)
    if "%" in str(address) or not any(address in network for network in NETWORKS):
        raise ValueError("地址必须是 RFC1918 IPv4 或 IPv6 ULA")
    return str(address)


def normalize_url(value, addresses):
    if not isinstance(value, str) or not value or not value.isascii() or len(value) > 200:
        raise ValueError("公开地址必须是最多 200 字节的 ASCII HTTP(S) URL")
    if any(c in value for c in "\\@?#%") or any(ord(c) <= 32 or ord(c) == 127 for c in value):
        raise ValueError("公开地址不能包含凭据、查询、片段、编码路径或控制字符")
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise ValueError("公开地址必须使用 HTTP(S)")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if parsed.port == 0 or not 1 <= port <= 65535 or parsed.netloc.endswith(":"):
        raise ValueError("公开端口必须在 1 到 65535 之间")
    path = parsed.path.rstrip("/") if parsed.path in ("", "/") else parsed.path
    if path and not re.fullmatch(r"(?:/[A-Za-z0-9_-]+)+/?", path):
        raise ValueError("路径只允许由字母、数字、下划线、短横线组成的路径段")
    path = path.rstrip("/")
    host = parsed.hostname.lower()
    try:
        literal = ipaddress.ip_address(host)
    except ValueError:
        if re.fullmatch(r"(?:0x[0-9a-f]+|[0-9]+)(?:\.(?:0x[0-9a-f]+|[0-9]+))*", host):
            raise ValueError("IP 地址必须使用标准 IPv4 或 IPv6 表示")
        if len(host) > 253 or not all(re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?", part) for part in host.split(".")):
            raise ValueError("公开域名格式不合法")
        # No DNS/HTTP probes: hostname reachability is verified by the joining client.
    else:
        host = lan_address(str(literal))
        if host not in addresses:
            raise ValueError("URL 中的 IP 必须出现在公开地址列表中")
        if literal.version == 6:
            host = "[%s]" % host
    default_port = 443 if parsed.scheme == "https" else 80
    authority = host if port == default_port else "%s:%s" % (host, port)
    return "%s://%s%s" % (parsed.scheme, authority, path), port


def public_name(config):
    name = config.get("site_title", "")
    if not isinstance(name, str) or not name.strip() or len(name.encode("utf-8")) > 96:
        raise ValueError("公开名称不能为空且不能超过 96 个 UTF-8 字节")
    if any(unicodedata.category(c) == "Cc" for c in name):
        raise ValueError("公开名称不能包含控制字符")
    return name


def validate_config(config):
    if type(config.get("LAN_DISCOVERY_ENABLED", False)) is not bool:
        raise ValueError("局域网广播开关必须是布尔值")
    endpoints = config.get("LAN_DISCOVERY_ENDPOINTS", [])
    if not isinstance(endpoints, list) or len(endpoints) > 8:
        raise ValueError("最多配置 8 个广播端点")
    result = []
    urls = set()
    for endpoint in endpoints:
        if not isinstance(endpoint, dict) or set(endpoint) != {"url", "addresses", "interfaces"}:
            raise ValueError("每个端点需要 url、addresses、interfaces")
        addresses, interfaces = endpoint["addresses"], endpoint["interfaces"]
        if not isinstance(addresses, list) or not 1 <= len(addresses) <= 8 or not all(isinstance(a, str) for a in addresses):
            raise ValueError("每个端点需要 1 到 8 个公开 IP 地址")
        addresses = sorted({lan_address(a) for a in addresses})
        if not isinstance(interfaces, list) or not 1 <= len(interfaces) <= 8:
            raise ValueError("每个端点需要 1 到 8 个明确选择的网络接口")
        if any(not isinstance(i, str) or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,64}", i) for i in interfaces):
            raise ValueError("网络接口名称格式不合法")
        url, _ = normalize_url(endpoint["url"], addresses)
        if url in urls:
            raise ValueError("不能重复配置同一个规范化 URL；请合并它的接口和地址")
        urls.add(url)
        result.append({"url": url, "addresses": addresses, "interfaces": sorted(set(interfaces))})
    if config.get("LAN_DISCOVERY_ENABLED"):
        if not result:
            raise ValueError("开启广播前必须配置外部端点和网络接口")
        public_name(config)
    return sorted(result, key=lambda e: e["url"])


def manual_overrides():
    manual = sys.modules.get("manual")
    settings = getattr(manual, "settings", {})
    return {key: settings[key] for key in (*CONFIG_KEYS, "site_title") if key in settings}


def effective_config(config):
    return dict(config, **manual_overrides())


def stable_instance_id(settings_path):
    """Publish a fully written UUID exactly once, without replacing another creator's ID."""
    path = Path(settings_path) / "lan-discovery-id"
    if not path.exists():
        fd, temporary = tempfile.mkstemp(prefix=".lan-discovery-id-", dir=settings_path)
        try:
            with os.fdopen(fd, "w", encoding="ascii") as output:
                os.fchmod(output.fileno(), 0o600)
                output.write(str(uuid.uuid4()) + "\n")
                output.flush()
                os.fsync(output.fileno())
            try:
                os.link(temporary, path)
                directory = os.open(settings_path, os.O_RDONLY | os.O_DIRECTORY)
                try:
                    os.fsync(directory)
                finally:
                    os.close(directory)
            except FileExistsError:
                pass
        finally:
            os.unlink(temporary)
    value = path.read_text(encoding="ascii").strip()
    parsed = uuid.UUID(value)
    if parsed.version != 4 or str(parsed) != value:
        raise ValueError("发现实例标识损坏；请管理员检查独立 ID 文件")
    return value


def encode_txt(instance_id, name, url):
    parts = [s.encode("utf-8") for s in ("txtvers=1", "id=" + instance_id, "name=" + name, "url=" + url)]
    if any(len(part) > 255 for part in parts) or sum(len(part) + 1 for part in parts) > 400:
        raise ValueError("广播 TXT 超出协议长度限制")
    return b"".join(bytes([len(part)]) + part for part in parts)


def interface_inventory():
    stats = psutil.net_if_stats()
    result = {}
    for name, entries in psutil.net_if_addrs().items():
        info = stats.get(name)
        flags = str(getattr(info, "flags", "")).split(",")
        if not info or not info.isup or "multicast" not in flags or "loopback" in flags:
            continue
        # Never offer known container bridges/tunnels as an external listener.
        if name.startswith(("docker", "br-", "veth", "virbr", "cni", "tun", "tap", "wg", "tailscale")):
            continue
        addresses = []
        for entry in entries:
            if entry.family not in (socket.AF_INET, socket.AF_INET6):
                continue
            try:
                addresses.append(lan_address(entry.address))
            except ValueError:
                pass
        if addresses:
            result[name] = {"index": socket.if_nametoindex(name), "addresses": sorted(set(addresses))}
    return result


class DiscoveryManager:
    """One application-owned worker; all mutations run on the Tornado asyncio loop."""

    def __init__(self, config, inventory=interface_inventory, publisher=None):
        self.config = config
        self.inventory = inventory
        self.publisher = publisher
        self.state = "disabled"
        self.error = None
        self.instance_id = None
        self.resources = []
        self.task = None
        self.changed = asyncio.Event()
        self.closed = False
        self.fingerprint = None
        self.retry_at = 0

    def status(self):
        return {"state": self.state, "error": self.error, "instance_id": self.instance_id}

    def start(self):
        if self.task is None:
            self.task = asyncio.create_task(self.run())

    def request(self):
        self.changed.set()

    async def run(self):
        while not self.closed:
            requested = self.changed.is_set()
            self.changed.clear()
            try:
                await self.reconcile(force=requested)
            except Exception:
                logging.exception("LAN discovery manager failed")
                try:
                    await self._release()
                except Exception:
                    logging.exception("LAN discovery emergency cleanup failed")
                self.state, self.error = "error", "广播管理器失败；请检查服务端日志"
            try:
                await asyncio.wait_for(self.changed.wait(), 1)
            except asyncio.TimeoutError:
                pass

    async def _release(self):
        resources, self.resources = self.resources, []
        if resources:
            self.state = "stopping"
        failures = await asyncio.gather(*(publisher.close() for publisher in resources), return_exceptions=True)
        if any(isinstance(failure, BaseException) for failure in failures):
            raise RuntimeError("广播资源注销失败；请检查日志和网络")

    async def reconcile(self, force=False):
        config = effective_config(self.config)
        enabled = config.get("LAN_DISCOVERY_ENABLED", False)
        # Disabled operation does not enumerate interfaces, create IDs or initialize zeroconf.
        inventory = self.inventory() if enabled else {}
        fingerprint = json.dumps(
            [enabled, config.get("LAN_DISCOVERY_ENDPOINTS", []), config.get("site_title"), inventory], sort_keys=True
        )
        if fingerprint == self.fingerprint and not force:
            if self.state != "error" or asyncio.get_running_loop().time() < self.retry_at:
                return
        if fingerprint == self.fingerprint and self.state == "advertising":
            return
        self.fingerprint = fingerprint
        try:
            self.error = None
            if not enabled:
                await self._release()
                self.state = "disabled"
                return
            self.state = "starting"
            endpoints = validate_config(config)
            eligible = []
            suspended = False
            for endpoint in endpoints:
                available = set()
                interfaces = [name for name in endpoint["interfaces"] if name in inventory]
                for name in interfaces:
                    available.update(inventory[name]["addresses"])
                if not interfaces or not set(endpoint["addresses"]) <= available:
                    suspended = True
                    continue
                suspended = suspended or interfaces != endpoint["interfaces"]
                eligible.append(dict(endpoint, interfaces=interfaces))
            if not eligible:
                raise ValueError("公开地址或所选接口已不可用；暂停发布，不能猜测 NAT 映射")
            self.instance_id = stable_instance_id(config["settings_path"])
            name = public_name(config)
            indexes = {endpoint["url"]: index for index, endpoint in enumerate(endpoints, 1)}
            signatures = {
                interface: json.dumps(
                    [
                        name,
                        self.instance_id,
                        inventory[interface],
                        [(indexes[e["url"]], e["url"], e["addresses"]) for e in eligible if interface in e["interfaces"]],
                    ],
                    sort_keys=True,
                )
                for interface in {i for e in eligible for i in e["interfaces"]}
            }
            obsolete = [p for p in self.resources if signatures.get(p.interface) != p.signature]
            self.resources = [p for p in self.resources if p not in obsolete]
            results = await asyncio.gather(*(p.close() for p in obsolete), return_exceptions=True)
            if any(isinstance(result, BaseException) for result in results):
                raise RuntimeError("广播资源注销失败")
            new_resources = []
            for interface in sorted(signatures):
                if any(p.interface == interface for p in self.resources):
                    continue
                factory = self.publisher or ZeroconfPublisher
                publisher = factory(interface, inventory[interface])
                publisher.signature = signatures[interface]
                publisher.indexes = indexes
                self.resources.append(publisher)
                new_resources.append(publisher)
            results = await asyncio.gather(
                *(p.publish(eligible, self.instance_id, name) for p in new_resources), return_exceptions=True
            )
            for result in results:
                if isinstance(result, BaseException):
                    raise result
            self.state = "advertising"
            if suspended:
                self.error = "部分端点或接口不可用，已暂停相应来源；可用来源继续广播"
        except Exception as exc:
            logging.exception("LAN discovery publication failed (%s)", type(exc).__name__)
            try:
                await self._release()
            except Exception:
                logging.exception("LAN discovery cleanup failed")
            self.state = "error"
            # Never echo arbitrary config/library errors which may contain URLs/credentials.
            self.error = (
                str(exc) if isinstance(exc, ValueError) else "广播失败；请检查 ID 文件权限、接口、UDP 5353 和服务端日志"
            )
            self.retry_at = asyncio.get_running_loop().time() + 5

    async def close(self):
        self.closed = True
        self.changed.set()
        if self.task:
            await self.task
        try:
            await self._release()
            self.state = "disabled"
        except Exception:
            logging.exception("LAN discovery shutdown failed")
            self.state, self.error = "error", "广播注销失败"


class ZeroconfPublisher:
    def __init__(self, interface, inventory):
        from zeroconf import IPVersion
        from zeroconf.asyncio import AsyncZeroconf

        self.interface = interface
        self.inventory = inventory
        ipv4 = [a for a in inventory["addresses"] if ipaddress.ip_address(a).version == 4]
        has_ipv6 = any(ipaddress.ip_address(a).version == 6 for a in inventory["addresses"])
        interfaces = ipv4 + ([inventory["index"]] if has_ipv6 else [])
        self.zc = AsyncZeroconf(interfaces=interfaces, ip_version=IPVersion.All if has_ipv6 else IPVersion.V4Only)

    async def publish(self, endpoints, instance_id, name):
        from zeroconf import ServiceInfo

        registrations = []
        for index, endpoint in enumerate(endpoints, 1):
            if self.interface not in endpoint["interfaces"]:
                continue
            index = self.indexes[endpoint["url"]]
            _, port = normalize_url(endpoint["url"], endpoint["addresses"])
            info = ServiceInfo(
                SERVICE_TYPE,
                "Talebook-%s-%s.%s" % (instance_id, index, SERVICE_TYPE),
                server="tb-%s-%s.local." % (instance_id, index),
                port=port,
                addresses=[ipaddress.ip_address(a).packed for a in endpoint["addresses"]],
                properties=encode_txt(instance_id, name, endpoint["url"]),
                host_ttl=TTL,
                other_ttl=TTL,
            )
            registrations.append(self.zc.async_register_service(info, allow_name_change=True))
        results = await asyncio.gather(*registrations, return_exceptions=True)
        broadcasts = [result for result in results if not isinstance(result, BaseException)]
        await asyncio.gather(*broadcasts)
        for result in results:
            if isinstance(result, BaseException):
                raise result

    async def close(self):
        try:
            await self.zc.async_unregister_all_services()
        finally:
            await self.zc.async_close()
