import collections
import contextlib
import ipaddress
import socket
import threading
import time
import urllib.parse

import requests

from .protocol import UpstreamAuthError, UpstreamError, UpstreamRateLimitError


HOST_CONCURRENCY_CONFIG_KEY = "host_concurrency"
DEFAULT_HOST_CONCURRENCY = 10


class HostQueueTimeout(UpstreamError):
    code = "plugin.host_queue_timeout"

    def __init__(self, message="Plugin host queue deadline expired", *, error_type="timeout", status_code=None):
        # Keep the normal UpstreamError constructor shape so runtime redaction
        # can rebuild this typed error without losing its public error code.
        super().__init__(message, error_type=error_type, status_code=status_code)


class _PluginHostQueue:
    """Process-local fair queue keyed only by plugin and normalized host."""

    def __init__(self):
        self._condition = threading.Condition()
        self._states = {}

    @staticmethod
    def _key(plugin_key, url):
        parsed = urllib.parse.urlsplit(url)
        hostname = (parsed.hostname or "").rstrip(".").lower()
        if not plugin_key or not hostname:
            return None
        default_port = 443 if parsed.scheme.lower() == "https" else 80
        return str(plugin_key), hostname, parsed.port or default_port

    @contextlib.contextmanager
    def slot(self, plugin_key, url, limit, deadline=None):
        key = self._key(plugin_key, url)
        if key is None:
            yield
            return

        limit = max(1, min(100, int(limit)))
        waiter = object()
        acquired = False
        with self._condition:
            state = self._states.get(key)
            if state is None:
                state = {"active": 0, "limit": limit, "waiters": collections.deque()}
                self._states[key] = state
            else:
                # A plugin configuration change must not temporarily exceed the
                # stricter value while an older request is still in flight.
                state["limit"] = min(state["limit"], limit)
            state["waiters"].append(waiter)
            while state["waiters"][0] is not waiter or state["active"] >= state["limit"]:
                remaining = None if deadline is None else deadline - time.monotonic()
                if remaining is not None and remaining <= 0:
                    state["waiters"].remove(waiter)
                    if not state["waiters"] and state["active"] == 0:
                        self._states.pop(key, None)
                    self._condition.notify_all()
                    raise HostQueueTimeout()
                self._condition.wait(remaining)
            state["waiters"].popleft()
            state["active"] += 1
            acquired = True

        try:
            yield
        finally:
            if acquired:
                with self._condition:
                    state = self._states.get(key)
                    if state is not None:
                        state["active"] -= 1
                        if not state["waiters"] and state["active"] == 0:
                            self._states.pop(key, None)
                    self._condition.notify_all()


_PLUGIN_HOST_QUEUE = _PluginHostQueue()
_PLUGIN_HTTP_POLICY = threading.local()


@contextlib.contextmanager
def plugin_http_policy(plugin_key, max_concurrency=DEFAULT_HOST_CONCURRENCY, deadline=None):
    """Bind runtime-owned plugin identity to SafeHttpClient calls in this thread."""

    previous = getattr(_PLUGIN_HTTP_POLICY, "value", None)
    _PLUGIN_HTTP_POLICY.value = {
        "plugin_key": str(plugin_key or ""),
        "max_concurrency": max(1, min(100, int(max_concurrency))),
        "deadline": deadline,
    }
    try:
        yield
    finally:
        if previous is None:
            try:
                del _PLUGIN_HTTP_POLICY.value
            except AttributeError:
                pass
        else:
            _PLUGIN_HTTP_POLICY.value = previous


class EndpointPolicyError(UpstreamError):
    code = "book_source.endpoint_blocked"


class EndpointResponseTooLarge(UpstreamError):
    code = "book_source.response_too_large"


def validate_remote_endpoint(url, allowed_hosts=(), resolver=socket.getaddrinfo, enforce_public_address=True):
    """Validate one HTTP endpoint before every request and redirect.

    ``enforce_public_address`` may only be disabled by platform-owned plugin
    configuration. URL-controlled allowlists remain forbidden.
    """
    try:
        parsed = urllib.parse.urlsplit(url)
        port = parsed.port
    except ValueError as exc:
        raise EndpointPolicyError("Endpoint URL is invalid") from exc
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise EndpointPolicyError("Endpoint must be an absolute HTTP(S) URL")
    if parsed.username or parsed.password:
        raise EndpointPolicyError("Credentials are not allowed in endpoint URLs")

    hostname = parsed.hostname.rstrip(".").lower()
    allowlist = {str(item).rstrip(".").lower() for item in allowed_hosts if item}
    if hostname in allowlist:
        return url

    try:
        addresses = {item[4][0].split("%", 1)[0] for item in resolver(hostname, port or 443, type=socket.SOCK_STREAM)}
    except (OSError, socket.gaierror) as exc:
        raise EndpointPolicyError("Endpoint hostname could not be resolved") from exc
    if not addresses:
        raise EndpointPolicyError("Endpoint hostname did not resolve to an address")
    for address in addresses:
        try:
            ip = ipaddress.ip_address(address)
        except ValueError as exc:
            raise EndpointPolicyError("Endpoint resolved to an invalid address") from exc
        if enforce_public_address and not ip.is_global:
            raise EndpointPolicyError("Endpoint resolves to a non-public address")
    return url


class SafeHttpClient:
    def __init__(
        self,
        session=None,
        resolver=None,
        max_redirects=5,
        max_bytes=8 * 1024 * 1024,
        allowed_hosts=(),
        enforce_public_address=True,
        plugin_key="",
        max_concurrency=None,
    ):
        self.session = session or requests.Session()
        self.resolver = resolver or getattr(self.session, "resolver", socket.getaddrinfo)
        self.max_redirects = max_redirects
        self.max_bytes = max_bytes
        # Only platform/admin configuration may provide this allowlist. The
        # request target itself must never auto-whitelist its host.
        self.allowed_hosts = tuple(allowed_hosts or ())
        self.enforce_public_address = bool(enforce_public_address)
        self.plugin_key = str(plugin_key or "")
        self.max_concurrency = max_concurrency

    def request(self, method, url, *, allowed_hosts=None, headers=None, timeout=30, data=None, params=None, json=None):
        current = url
        origin = self._origin(url)
        allowed_hosts = self.allowed_hosts if allowed_hosts is None else tuple(allowed_hosts or ())
        policy = getattr(_PLUGIN_HTTP_POLICY, "value", None) or {}
        plugin_key = self.plugin_key or policy.get("plugin_key", "")
        max_concurrency = self.max_concurrency
        if max_concurrency is None:
            max_concurrency = policy.get("max_concurrency", DEFAULT_HOST_CONCURRENCY)
        max_concurrency = max(1, min(100, int(max_concurrency)))
        deadline = policy.get("deadline")
        timeout_seconds = self._timeout_seconds(timeout)
        if plugin_key and timeout_seconds is not None:
            request_deadline = time.monotonic() + timeout_seconds
            deadline = request_deadline if deadline is None else min(deadline, request_deadline)
        for redirect_count in range(self.max_redirects + 1):
            validate_remote_endpoint(
                current,
                allowed_hosts,
                self.resolver,
                enforce_public_address=self.enforce_public_address,
            )
            if self._origin(current) != origin:
                raise EndpointPolicyError("Cross-origin redirects are not allowed")
            with _PLUGIN_HOST_QUEUE.slot(plugin_key, current, max_concurrency, deadline):
                request_timeout = self._remaining_timeout(timeout, deadline) if plugin_key else timeout
                response = self.session.request(
                    method,
                    current,
                    headers=dict(headers or {}),
                    data=data,
                    params=params,
                    json=json,
                    timeout=request_timeout,
                    allow_redirects=False,
                )
            if response.status_code in {301, 302, 303, 307, 308}:
                if redirect_count >= self.max_redirects:
                    raise EndpointPolicyError("Endpoint exceeded the redirect limit")
                location = response.headers.get("Location", "")
                if not location:
                    raise EndpointPolicyError("Endpoint returned a redirect without a location")
                current = urllib.parse.urljoin(current, location)
                if response.status_code == 303:
                    method, data, json = "GET", None, None
                continue
            if response.status_code in {401, 403}:
                raise UpstreamAuthError("Upstream rejected the configured credentials")
            if response.status_code == 429:
                retry_after = response.headers.get("Retry-After")
                try:
                    retry_after = float(retry_after) if retry_after else None
                except ValueError:
                    retry_after = None
                raise UpstreamRateLimitError("Upstream rate limit exceeded", retry_after=retry_after)
            if response.status_code >= 400:
                raise UpstreamError("Upstream returned HTTP %d" % response.status_code)
            content = response.content
            if len(content) > self.max_bytes:
                raise EndpointResponseTooLarge("Upstream response exceeded the size limit")
            return response
        raise EndpointPolicyError("Endpoint exceeded the redirect limit")

    # requests.Session-compatible surface used by the Legado parser. Every
    # call still crosses the endpoint, redirect and response-size policy above.
    def get(self, url, **kwargs):
        return self.request("GET", url, **kwargs)

    def post(self, url, **kwargs):
        return self.request("POST", url, **kwargs)

    def json(self, method, url, **kwargs):
        """发起受策略约束的请求并解析 JSON 响应。"""
        response = self.request(method, url, **kwargs)
        try:
            return response.json()
        except ValueError as exc:
            raise UpstreamError("Upstream returned invalid JSON") from exc

    @staticmethod
    def _origin(url):
        parsed = urllib.parse.urlsplit(url)
        default_port = 443 if parsed.scheme == "https" else 80
        return parsed.scheme.lower(), (parsed.hostname or "").lower(), parsed.port or default_port

    @staticmethod
    def _timeout_seconds(timeout):
        if isinstance(timeout, (int, float)):
            return max(0.0, float(timeout))
        if isinstance(timeout, (tuple, list)) and timeout:
            values = [float(value) for value in timeout if isinstance(value, (int, float))]
            return sum(max(0.0, value) for value in values) if values else None
        return None

    @staticmethod
    def _remaining_timeout(timeout, deadline):
        if deadline is None:
            return timeout
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise HostQueueTimeout()
        if isinstance(timeout, (int, float)):
            return max(0.001, min(float(timeout), remaining))
        return timeout
