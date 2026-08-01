#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
"""HTTP transport for Talebook's stateless MCP endpoint."""

import os
import secrets
import urllib.parse

import tornado.escape

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.mcp.protocol import MCPProtocol, MCPProtocolError
from webserver.mcp.service import MCPToolService
from webserver.models import Reader


CONF = loader.get_settings()


def configured_mcp_token():
    return os.environ.get("TALEBOOK_MCP_TOKEN", "").strip() or str(CONF.get("MCP_TOKEN", "")).strip()


class MCPHandler(BaseHandler):
    """Expose MCP over one stateless Streamable HTTP POST endpoint."""

    def prepare(self):
        self.set_hosts()
        self.set_i18n()
        self.should_be_installed()
        self.should_allow_demo_request()

    def get_current_user(self):
        expected = configured_mcp_token()
        if not expected:
            self._mcp_auth_error = "disabled"
            self.set_status(503)
            return None

        scheme, _, supplied = self.request.headers.get("Authorization", "").partition(" ")
        if scheme.lower() != "bearer" or not supplied or not secrets.compare_digest(supplied.strip(), expected):
            self._mcp_auth_error = "invalid"
            self.set_status(401)
            self.set_header("WWW-Authenticate", 'Bearer realm="talebook-mcp"')
            return None

        user = (
            self.session.query(Reader)
            .filter(Reader.admin.is_(True), Reader.active.is_(True))
            .order_by(Reader.id.asc())
            .first()
        )
        if not user:
            self._mcp_auth_error = "admin_missing"
            self.set_status(503)
            return None
        self.admin_user = user
        self._mcp_user_id = user.id
        return user

    def authentication_error(self):
        error = getattr(self, "_mcp_auth_error", "invalid")
        messages = {
            "disabled": ("mcp.disabled", "MCP is disabled because no Token is configured"),
            "admin_missing": ("mcp.admin_missing", "MCP requires an active Talebook administrator"),
            "invalid": ("mcp.unauthorized", "A valid Bearer Token is required"),
        }
        code, message = messages[error]
        return {"err": code, "msg": message}

    def user_id(self):
        return getattr(self, "_mcp_user_id", None)

    def _origin_allowed(self):
        origin = self.request.headers.get("Origin", "")
        if not origin:
            return True
        parsed = urllib.parse.urlparse(origin)
        return parsed.netloc == self.request.host and parsed.scheme in ("http", "https")

    @js
    @auth
    async def post(self):
        self.set_header("MCP-Protocol-Version", "2025-11-25")
        if not self._origin_allowed():
            self.set_status(403)
            return {"err": "origin.forbidden", "msg": "Cross-origin MCP requests are not allowed"}

        try:
            request = tornado.escape.json_decode(self.request.body)
        except (TypeError, ValueError):
            return MCPProtocol.error_response(None, MCPProtocolError(-32700, "Parse error"))

        if isinstance(request, list):
            return MCPProtocol.error_response(None, MCPProtocolError(-32600, "Batch requests are not supported"))

        protocol = MCPProtocol(MCPToolService(self))
        try:
            response = await protocol.handle(request)
        except MCPProtocolError as error:
            return MCPProtocol.error_response(request.get("id") if isinstance(request, dict) else None, error)

        if response is None:
            self.set_status(202)
        return response


def routes():
    return [(r"/mcp", MCPHandler)]
