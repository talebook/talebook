#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import importlib.util
import json
import os
import pathlib
import subprocess
import sys
import unittest
from unittest import mock


ROOT = pathlib.Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "skills" / "talebook" / "scripts" / "talebook_mcp.py"


def load_client_module():
    spec = importlib.util.spec_from_file_location("talebook_mcp_client", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


class TestTalebookSkillClient(unittest.TestCase):
    def test_missing_environment_is_reported_without_secret_argument(self):
        env = os.environ.copy()
        env.pop("TALEBOOK_MCP_URL", None)
        env.pop("TALEBOOK_MCP_TOKEN", None)
        result = subprocess.run(
            [sys.executable, str(SCRIPT), "check"],
            capture_output=True,
            text=True,
            env=env,
            check=False,
        )
        self.assertEqual(result.returncode, 1)
        self.assertIn("TALEBOOK_MCP_URL", result.stderr)
        self.assertIn("TALEBOOK_MCP_TOKEN", result.stderr)

    def test_request_uses_bearer_header_and_mcp_version(self):
        module = load_client_module()
        response = FakeResponse({"jsonrpc": "2.0", "id": 1, "result": {"tools": []}})
        with mock.patch.object(module.urllib.request, "urlopen", return_value=response) as opened:
            client = module.TalebookMCPClient("https://books.example/mcp", "secret-token")
            result = client.request("tools/list")
        request = opened.call_args.args[0]
        self.assertEqual(result, {"tools": []})
        self.assertEqual(request.get_header("Authorization"), "Bearer secret-token")
        self.assertEqual(request.get_header("Mcp-protocol-version"), "2025-11-25")
        self.assertNotIn(b"secret-token", request.data)

    def test_rejects_non_object_tool_arguments(self):
        env = os.environ.copy()
        env["TALEBOOK_MCP_URL"] = "https://books.example/mcp"
        env["TALEBOOK_MCP_TOKEN"] = "secret"
        module = load_client_module()
        with mock.patch.object(module.TalebookMCPClient, "initialize", return_value={}):
            with mock.patch.object(sys, "argv", [str(SCRIPT), "call", "search_books", "[]"]):
                self.assertEqual(module.main(), 1)


if __name__ == "__main__":
    unittest.main()
