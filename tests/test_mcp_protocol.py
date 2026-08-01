#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import asyncio
import unittest

from webserver.mcp.protocol import MCPProtocol, MCPProtocolError


class FakeService:
    def list_tools(self):
        return [{"name": "echo", "description": "Echo input", "inputSchema": {"type": "object"}}]

    async def call_tool(self, name, arguments):
        if name != "echo":
            raise KeyError(name)
        return {"ok": True, "data": arguments}


class TestMCPProtocol(unittest.TestCase):
    def run_message(self, message):
        return asyncio.run(MCPProtocol(FakeService()).handle(message))

    def test_initialize_negotiates_supported_version(self):
        response = self.run_message(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {"protocolVersion": "2025-06-18"},
            }
        )
        self.assertEqual(response["result"]["protocolVersion"], "2025-06-18")
        self.assertEqual(response["result"]["serverInfo"]["name"], "talebook")

    def test_tools_call_returns_structured_content(self):
        response = self.run_message(
            {
                "jsonrpc": "2.0",
                "id": "call-1",
                "method": "tools/call",
                "params": {"name": "echo", "arguments": {"value": "书"}},
            }
        )
        result = response["result"]
        self.assertFalse(result["isError"])
        self.assertEqual(result["structuredContent"]["data"]["value"], "书")
        self.assertIn("书", result["content"][0]["text"])

    def test_initialized_notification_has_no_response(self):
        response = self.run_message({"jsonrpc": "2.0", "method": "notifications/initialized"})
        self.assertIsNone(response)

    def test_unknown_method_is_protocol_error(self):
        with self.assertRaises(MCPProtocolError) as raised:
            self.run_message({"jsonrpc": "2.0", "id": 2, "method": "books/copy"})
        self.assertEqual(raised.exception.code, -32601)


if __name__ == "__main__":
    unittest.main()
