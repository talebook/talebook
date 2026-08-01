#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import unittest
from types import SimpleNamespace
from unittest import mock

from tests.test_main import TestApp
from tests.test_main import setUpModule as init
from webserver import loader


TOKEN = "test-mcp-token"


def setUpModule():
    init()


class TestMCPHTTP(TestApp):
    def setUp(self):
        super().setUp()
        self.original_token = loader.get_settings().get("MCP_TOKEN", "")
        loader.get_settings()["MCP_TOKEN"] = TOKEN

    def tearDown(self):
        loader.get_settings()["MCP_TOKEN"] = self.original_token
        super().tearDown()

    def post_mcp(self, payload, token=TOKEN, headers=None):
        request_headers = {"Authorization": "Bearer %s" % token, "Content-Type": "application/json"}
        request_headers.update(headers or {})
        return self.fetch("/mcp", method="POST", headers=request_headers, body=json.dumps(payload))

    def test_requires_bearer_token(self):
        response = self.post_mcp({"jsonrpc": "2.0", "id": 1, "method": "ping"}, token="wrong")
        self.assertEqual(response.code, 401)
        self.assertNotIn(TOKEN.encode(), response.body)

    def test_initialize(self):
        response = self.post_mcp(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {"protocolVersion": "2025-11-25", "clientInfo": {"name": "test", "version": "1"}},
            }
        )
        self.assertEqual(response.code, 200)
        body = json.loads(response.body)
        self.assertEqual(body["result"]["protocolVersion"], "2025-11-25")
        self.assertEqual(response.headers["MCP-Protocol-Version"], "2025-11-25")

    def test_tool_list_contains_talebook_features_and_excludes_file_transfer(self):
        response = self.post_mcp({"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}})
        tools = {tool["name"] for tool in json.loads(response.body)["result"]["tools"]}
        self.assertIn("search_books", tools)
        self.assertIn("search_network_books", tools)
        self.assertIn("save_network_book", tools)
        self.assertNotIn("upload_book", tools)
        self.assertNotIn("download_book", tools)
        self.assertNotIn("send_to_device", tools)

    def test_library_overview_tool(self):
        response = self.post_mcp(
            {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {"name": "library_overview", "arguments": {}},
            }
        )
        result = json.loads(response.body)["result"]
        self.assertFalse(result["isError"])
        self.assertGreater(result["structuredContent"]["data"]["books"], 0)

    def test_cross_origin_browser_request_is_rejected(self):
        response = self.post_mcp({"jsonrpc": "2.0", "id": 4, "method": "ping"}, headers={"Origin": "https://evil.example"})
        self.assertEqual(response.code, 403)

    def test_token_is_not_returned_by_admin_settings(self):
        with mock.patch("webserver.handlers.base.BaseHandler.user_id", return_value=1):
            response = self.fetch("/api/admin/settings")
        self.assertEqual(response.code, 200)
        self.assertNotIn("MCP_TOKEN", json.loads(response.body)["settings"])


class TestToolSchemas(unittest.TestCase):
    def test_tool_allowlist_has_unique_names(self):
        from webserver.mcp.service import MCPToolService

        handler = SimpleNamespace(current_user=SimpleNamespace(id=1))
        service = MCPToolService(handler)
        tools = service.list_tools()
        names = [tool["name"] for tool in tools]
        self.assertEqual(len(names), len(set(names)))
        self.assertGreaterEqual(len(names), 20)

    def test_mutating_tools_are_annotated(self):
        from webserver.mcp.service import MCPToolService

        handler = SimpleNamespace(current_user=SimpleNamespace(id=1))
        tools = {tool["name"]: tool for tool in MCPToolService(handler).list_tools()}
        for name in ("update_book_metadata", "save_metadata_to_file", "save_network_book"):
            self.assertFalse(tools[name]["annotations"]["readOnlyHint"])


if __name__ == "__main__":
    unittest.main()
