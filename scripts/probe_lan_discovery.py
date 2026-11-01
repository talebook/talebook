#!/usr/bin/env python3
"""Independent IPv4 DNS-SD wire probe (stdlib only; no zeroconf or HTTP probes)."""

import argparse
import json
import select
import socket
import struct
import time


def dns_name(packet, offset):
    labels, end, seen = [], None, set()
    while True:
        if offset in seen:
            raise ValueError("DNS compression loop")
        seen.add(offset)
        length = packet[offset]
        if length & 0xC0 == 0xC0:
            if end is None:
                end = offset + 2
            offset = ((length & 0x3F) << 8) | packet[offset + 1]
            continue
        offset += 1
        if not length:
            return ".".join(labels) + ".", end or offset
        labels.append(packet[offset : offset + length].decode("utf-8"))
        offset += length


def records(packet):
    _, _, questions, answers, authorities, additional = struct.unpack_from("!6H", packet)
    offset = 12
    for _ in range(questions):
        _, offset = dns_name(packet, offset)
        offset += 4
    for _ in range(answers + authorities + additional):
        name, offset = dns_name(packet, offset)
        kind, cls, ttl, length = struct.unpack_from("!HHIH", packet, offset)
        offset += 10
        raw = packet[offset : offset + length]
        value = raw.hex()
        if kind == 12:
            value, _ = dns_name(packet, offset)
        elif kind == 33:
            priority, weight, port = struct.unpack_from("!HHH", raw)
            target, _ = dns_name(packet, offset + 6)
            value = {"priority": priority, "weight": weight, "port": port, "target": target}
        elif kind == 16:
            value, cursor = [], 0
            while cursor < len(raw):
                size = raw[cursor]
                if cursor + size + 1 > len(raw):
                    raise ValueError("truncated TXT")
                value.append(raw[cursor + 1 : cursor + 1 + size].decode("utf-8"))
                cursor += size + 1
        elif kind in (1, 28):
            value = socket.inet_ntop(socket.AF_INET if kind == 1 else socket.AF_INET6, raw)
        offset += length
        yield {"name": name, "type": kind, "ttl": ttl, "value": value}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--interface-address", required=True)
    parser.add_argument("--id", required=True, help="Only inspect this test instance's public UUID")
    parser.add_argument("--timeout", type=float, default=15)
    parser.add_argument("--expect-goodbye", action="store_true")
    args = parser.parse_args()
    multicast = ("224.0.0.251", 5353)
    query_name = b"".join(bytes([len(s)]) + s.encode("ascii") for s in "_talebook._tcp.local".split(".")) + b"\0"
    query = struct.pack("!6H", 0, 0, 1, 0, 0, 0) + query_name + struct.pack("!HH", 12, 1)
    observed, goodbyes = {}, set()
    start = time.monotonic()
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind(("", 5353))
        sock.setsockopt(
            socket.IPPROTO_IP,
            socket.IP_ADD_MEMBERSHIP,
            socket.inet_aton(multicast[0]) + socket.inet_aton(args.interface_address),
        )
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_IF, socket.inet_aton(args.interface_address))
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 255)
        next_query = start
        while time.monotonic() - start < args.timeout:
            now = time.monotonic()
            if now >= next_query:
                sock.sendto(query, multicast)
                next_query = now + 1
            if not select.select([sock], [], [], 0.2)[0]:
                continue
            packet = sock.recv(9000)
            for record in records(packet):
                if args.id not in record["name"] and args.id not in str(record["value"]):
                    continue
                record["elapsed"] = round(time.monotonic() - start, 3)
                if record["type"] not in (1, 12, 16, 28, 33):
                    continue
                if record["ttl"] == 0:
                    goodbyes.add(record["type"])
                else:
                    assert record["ttl"] == 120, record
                    observed[record["type"]] = record
                print(json.dumps(record, ensure_ascii=False), flush=True)
            required = {1, 12, 16, 33}
            if required <= observed.keys() and (not args.expect_goodbye or required <= goodbyes):
                print(
                    json.dumps(
                        {
                            "result": "pass",
                            "elapsed": round(time.monotonic() - start, 3),
                            "records": sorted(observed),
                            "goodbyes": sorted(goodbyes),
                        }
                    ),
                    flush=True,
                )
                return
    raise SystemExit("Incomplete DNS-SD records or goodbye before timeout")


if __name__ == "__main__":
    main()
