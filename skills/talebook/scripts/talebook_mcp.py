#!/usr/bin/env python3
"""Minimal command-line client for Talebook's stateless MCP endpoint."""

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request


PROTOCOL_VERSION = "2025-11-25"


class ClientError(Exception):
    pass


class TalebookMCPClient:
    def __init__(self, url, token, timeout=30):
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise ClientError("TALEBOOK_MCP_URL must be an absolute HTTP or HTTPS URL")
        self.url = url
        self.token = token
        self.timeout = timeout
        self.request_id = 0

    def request(self, method, params=None):
        self.request_id += 1
        payload = {"jsonrpc": "2.0", "id": self.request_id, "method": method}
        if params is not None:
            payload["params"] = params
        request = urllib.request.Request(
            self.url,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Accept": "application/json, text/event-stream",
                "Authorization": "Bearer %s" % self.token,
                "Content-Type": "application/json",
                "MCP-Protocol-Version": PROTOCOL_VERSION,
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                body = response.read().decode("utf-8")
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise ClientError("Talebook returned HTTP %d: %s" % (error.code, detail[:500]))
        except urllib.error.URLError as error:
            raise ClientError("Cannot connect to Talebook: %s" % error.reason)
        try:
            result = json.loads(body)
        except json.JSONDecodeError:
            raise ClientError("Talebook returned a non-JSON MCP response")
        if "error" in result:
            error = result["error"]
            raise ClientError("MCP error %s: %s" % (error.get("code", "unknown"), error.get("message", "")))
        return result.get("result", {})

    def initialize(self):
        return self.request(
            "initialize",
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {},
                "clientInfo": {"name": "talebook-skill", "version": "1.0.0"},
            },
        )


def load_client(timeout):
    url = os.environ.get("TALEBOOK_MCP_URL", "").strip()
    token = os.environ.get("TALEBOOK_MCP_TOKEN", "").strip()
    missing = [name for name, value in (("TALEBOOK_MCP_URL", url), ("TALEBOOK_MCP_TOKEN", token)) if not value]
    if missing:
        raise ClientError("Missing required environment variable(s): %s" % ", ".join(missing))
    return TalebookMCPClient(url, token, timeout=timeout)


def parse_arguments():
    parser = argparse.ArgumentParser(description="Call Talebook through MCP")
    parser.add_argument("--timeout", type=float, default=30, help="HTTP timeout in seconds")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("check", help="Initialize the MCP connection")
    subparsers.add_parser("list", help="List available MCP tools")
    call = subparsers.add_parser("call", help="Call one MCP tool")
    call.add_argument("tool")
    call.add_argument("arguments", nargs="?", default="{}", help="JSON object with tool arguments")
    return parser.parse_args()


def main():
    args = parse_arguments()
    try:
        client = load_client(args.timeout)
        initialized = client.initialize()
        if args.command == "check":
            output = {
                "ok": True,
                "protocolVersion": initialized.get("protocolVersion"),
                "serverInfo": initialized.get("serverInfo", {}),
            }
        elif args.command == "list":
            output = client.request("tools/list")
        else:
            try:
                arguments = json.loads(args.arguments)
            except json.JSONDecodeError as error:
                raise ClientError("Tool arguments are not valid JSON: %s" % error)
            if not isinstance(arguments, dict):
                raise ClientError("Tool arguments must be a JSON object")
            result = client.request("tools/call", {"name": args.tool, "arguments": arguments})
            output = result.get("structuredContent", result)
            if result.get("isError"):
                print(json.dumps(output, ensure_ascii=False, indent=2))
                return 2
        print(json.dumps(output, ensure_ascii=False, indent=2))
        return 0
    except ClientError as error:
        print(json.dumps({"ok": False, "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
