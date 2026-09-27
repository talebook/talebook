"""Deployment-owned public path; the reverse proxy strips it from requests."""

import os
import re


def normalize_base_path(value):
    if value in ("", "/"):
        return ""
    if not isinstance(value, str) or not re.fullmatch(r"(?:/[A-Za-z0-9_-]+)+/?", value):
        raise ValueError("TALEBOOK_BASE_PATH must be empty or /path[/path] using letters, digits, _ and -")
    return value.rstrip("/")


BASE_PATH = normalize_base_path(os.environ.get("TALEBOOK_BASE_PATH", ""))


def public_url(url, base_path=None):
    """Prefix local absolute paths once, preserving external and relative URLs."""
    prefix = BASE_PATH if base_path is None else normalize_base_path(base_path)
    if not isinstance(url, str) or not prefix or not url.startswith("/") or url.startswith("//"):
        return url
    path = re.split(r"[?#]", url, maxsplit=1)[0]
    if path == prefix or path.startswith(prefix + "/"):
        return url
    return prefix + url


class PublicPathMixin:
    """Use on both application handlers and social-auth's own handlers."""

    def redirect(self, url, *args, **kwargs):
        if isinstance(url, bytes):
            url = url.decode("utf-8")
        return super().redirect(public_url(url), *args, **kwargs)

    def reverse_url(self, name, *args):
        return public_url(super().reverse_url(name, *args))

    def set_cookie(self, name, value, *args, **kwargs):
        # Tornado clear_cookie also calls set_cookie, so logout uses the same path.
        if BASE_PATH and not args:
            kwargs["path"] = public_url(kwargs.get("path", "/"))
        return super().set_cookie(name, value, *args, **kwargs)
