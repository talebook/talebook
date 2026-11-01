"""Bounded KOSync transport, independent of the book database."""

import asyncio
import json
import re
from urllib.parse import urlsplit

from tornado.httpclient import HTTPClientError, HTTPRequest
from tornado.netutil import DefaultLoopResolver, Resolver
from tornado.simple_httpclient import SimpleAsyncHTTPClient


MAX_REQUEST_BYTES = 16 * 1024
MAX_RESPONSE_BYTES = 64 * 1024
SLOTS = asyncio.Semaphore(8)


class KOSyncError(ValueError):
    pass


class KOSyncOriginError(KOSyncError):
    pass


def parse_proxy_request(request):
    origin = request.headers.get("Origin")
    try:
        origin_host = urlsplit(origin).netloc if origin else None
    except ValueError:
        origin_host = "invalid"
    if (
        request.headers.get("X-Talebook-KOSync") != "1"
        or request.headers.get("Content-Type", "").split(";", 1)[0].strip() != "application/json"
        or (origin and origin_host != request.host)
        or request.headers.get("Sec-Fetch-Site") == "cross-site"
    ):
        raise KOSyncOriginError("KOSync requires a same-origin JSON request")
    if len(request.body) > MAX_REQUEST_BYTES:
        raise KOSyncError("KOSync request is too large")
    try:
        payload = json.loads(request.body)
        validate_payload(payload)
    except (ValueError, TypeError, UnicodeError, RecursionError):
        raise KOSyncError("Invalid KOSync request") from None
    return payload


def server_url(value):
    if not isinstance(value, str) or len(value) > 2048 or re.search(r"[\s\\%]", value):
        raise KOSyncError("Invalid KOSync server URL")
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError:
        raise KOSyncError("Invalid KOSync server URL") from None
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or any(part in {".", ".."} for part in parsed.path.split("/"))
        or not re.fullmatch(r"[/a-zA-Z0-9_.~-]*", parsed.path)
        or port == 0
    ):
        raise KOSyncError("Invalid KOSync server URL")
    host = parsed.hostname.encode("idna").decode("ascii").lower()
    if ":" in host:
        host = "[%s]" % host
    default_port = 443 if parsed.scheme == "https" else 80
    authority = host if port in (None, default_port) else "%s:%d" % (host, port)
    return "%s://%s%s" % (parsed.scheme, authority, parsed.path.rstrip("/"))


def validate_payload(payload):
    if not isinstance(payload, dict):
        raise KOSyncError("Invalid KOSync request")
    base = server_url(payload.get("serverUrl"))
    method, endpoint = payload.get("method"), payload.get("endpoint")
    valid = (
        (method, endpoint)
        in {
            ("GET", "/users/auth"),
            ("POST", "/users/create"),
            ("PUT", "/syncs/progress"),
        }
        if isinstance(method, str) and isinstance(endpoint, str)
        else False
    )
    if not valid and not (
        method == "GET" and isinstance(endpoint, str) and re.fullmatch(r"/syncs/progress/[a-fA-F0-9]{32}", endpoint)
    ):
        raise KOSyncError("Unsupported KOSync operation")
    custom = payload.get("headers", {})
    if not isinstance(custom, dict) or len(custom) > 24:
        raise KOSyncError("Invalid KOSync headers")
    headers = {}
    blocked = {
        "cookie",
        "cookie2",
        "host",
        "connection",
        "keep-alive",
        "te",
        "trailer",
        "upgrade",
        "content-length",
        "transfer-encoding",
        "accept-encoding",
        "proxy-authorization",
        "proxy-connection",
        "forwarded",
        "origin",
        "referer",
    }
    for key, value in custom.items():
        if (
            not isinstance(key, str)
            or not re.fullmatch(r"[!#$%&'*+.^_`|~0-9A-Za-z-]{1,80}", key)
            or key.lower() in blocked
            or key.lower().startswith(("x-forwarded-", "sec-", "proxy-"))
            or not isinstance(value, str)
            or len(value) > 4096
            or any(ord(char) < 32 or ord(char) > 126 for char in value)
        ):
            raise KOSyncError("Invalid KOSync headers")
        headers[key.lower()] = value
    headers["accept"] = "application/vnd.koreader.v1+json"
    body = payload.get("body")
    if method == "GET":
        if body is not None:
            raise KOSyncError("GET requests cannot have a body")
        encoded = None
    else:
        if not isinstance(body, dict):
            raise KOSyncError("KOSync request body must be an object")
        encoded = json.dumps(body, allow_nan=False).encode("utf-8")
        if len(encoded) > MAX_REQUEST_BYTES:
            raise KOSyncError("KOSync request is too large")
        headers["content-type"] = "application/json"
    return base, endpoint, method, headers, encoded


class PinnedResolver(Resolver):
    def initialize(self, hostname, port, addresses):
        self.hostname, self.port, self.addresses = hostname, port, addresses

    async def resolve(self, host, port, family=0):
        if host != self.hostname or port != self.port:
            raise KOSyncError("Unexpected KOSync connection target")
        return [address for address in self.addresses if not family or address[0] == family]

    def close(self):
        pass


async def proxy_request(payload):
    base, endpoint, method, headers, body = validate_payload(payload)
    parsed = urlsplit(base)
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    resolver = DefaultLoopResolver()
    try:
        addresses = await asyncio.wait_for(resolver.resolve(parsed.hostname, port), timeout=5)
    except (OSError, asyncio.TimeoutError):
        raise KOSyncError("KOSync server could not be resolved") from None
    finally:
        resolver.close()
    if not addresses:
        raise KOSyncError("KOSync server could not be resolved")
    pinned = PinnedResolver(hostname=parsed.hostname, port=port, addresses=addresses)
    client = SimpleAsyncHTTPClient(
        force_instance=True, resolver=pinned, max_buffer_size=MAX_RESPONSE_BYTES, max_body_size=MAX_RESPONSE_BYTES
    )
    try:
        request = HTTPRequest(
            base + endpoint,
            method=method,
            headers=headers,
            body=body,
            follow_redirects=False,
            connect_timeout=5,
            request_timeout=15,
            decompress_response=False,
        )
        response = await client.fetch(request, raise_error=False)
        if 300 <= response.code < 400:
            raise KOSyncError("KOSync redirects are not supported; enter the final server URL")
        if len(response.body) > MAX_RESPONSE_BYTES:
            raise KOSyncError("KOSync response is too large")
        try:
            data = json.loads(response.body)
        except (ValueError, UnicodeError):
            data = None
        if not isinstance(data, dict):
            if response.code in (400, 401):
                # Authentication gateways may return HTML or no body. Keep the
                # status so the reader can retry with Basic Auth, without HTML.
                data = {"message": "KOSync authentication failed"}
            else:
                raise KOSyncError("KOSync server returned invalid JSON")
        return {"err": "ok", "status": response.code, "data": data}
    except (HTTPClientError, OSError, asyncio.TimeoutError):
        raise KOSyncError("KOSync server is unavailable or its response exceeds the limit") from None
    finally:
        client.close()
        pinned.close()
