#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""Small, stateless MCP JSON-RPC protocol adapter for Talebook."""

import json
import logging


LATEST_PROTOCOL_VERSION = "2025-11-25"
SUPPORTED_PROTOCOL_VERSIONS = {LATEST_PROTOCOL_VERSION, "2025-06-18", "2025-03-26", "2024-11-05"}


class MCPProtocolError(Exception):
    def __init__(self, code, message, data=None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.data = data


class MCPProtocol:
    """Translate MCP JSON-RPC messages into calls on an MCPToolService."""

    def __init__(self, service):
        self.service = service

    async def handle(self, request):
        if not isinstance(request, dict):
            raise MCPProtocolError(-32600, "Invalid Request")
        if request.get("jsonrpc") != "2.0" or not isinstance(request.get("method"), str):
            raise MCPProtocolError(-32600, "Invalid Request")

        method = request["method"]
        request_id = request.get("id")
        is_notification = "id" not in request
        params = request.get("params", {})
        if not isinstance(params, dict):
            raise MCPProtocolError(-32602, "Invalid params")

        if method == "initialize":
            result = self._initialize(params)
        elif method == "notifications/initialized":
            return None
        elif method == "ping":
            result = {}
        elif method == "tools/list":
            result = {"tools": self.service.list_tools()}
        elif method == "tools/call":
            result = await self._call_tool(params)
        else:
            raise MCPProtocolError(-32601, "Method not found")

        if is_notification:
            return None
        return {"jsonrpc": "2.0", "id": request_id, "result": result}

    def _initialize(self, params):
        requested = params.get("protocolVersion")
        selected = requested if requested in SUPPORTED_PROTOCOL_VERSIONS else LATEST_PROTOCOL_VERSION
        return {
            "protocolVersion": selected,
            "capabilities": {"tools": {"listChanged": False}},
            "serverInfo": {
                "name": "talebook",
                "title": "Talebook Personal Library",
                "version": "1.0.0",
            },
            "instructions": (
                "Use search and detail tools to confirm book IDs before mutations. "
                "Network-library search and save operations are asynchronous; poll their status tools."
            ),
        }

    async def _call_tool(self, params):
        name = params.get("name")
        arguments = params.get("arguments", {})
        if not isinstance(name, str) or not name:
            raise MCPProtocolError(-32602, "Tool name is required")
        if not isinstance(arguments, dict):
            raise MCPProtocolError(-32602, "Tool arguments must be an object")

        try:
            payload = await self.service.call_tool(name, arguments)
            is_error = not payload.get("ok", False)
        except KeyError:
            raise MCPProtocolError(-32602, "Unknown tool: %s" % name)
        except Exception:
            logging.exception("MCP tool failed: %s", name)
            payload = {"ok": False, "error": {"code": "internal", "message": "Tool execution failed"}}
            is_error = True

        text = json.dumps(payload, ensure_ascii=False, default=str)
        return {
            "content": [{"type": "text", "text": text}],
            "structuredContent": payload,
            "isError": is_error,
        }

    @staticmethod
    def error_response(request_id, error):
        body = {"jsonrpc": "2.0", "id": request_id, "error": {"code": error.code, "message": error.message}}
        if error.data is not None:
            body["error"]["data"] = error.data
        return body
