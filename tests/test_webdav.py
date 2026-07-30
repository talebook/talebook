#!/usr/bin/python
# -*- coding: UTF-8 -*-
"""Tests for the WebDAV service endpoint (/books/).

These tests require the optional ``wsgidav`` dependency. When it is not
installed (e.g. local dev without the extra), the whole module is skipped so
it never blocks the default test run.

Run with the dependency installed: ``pip install -r requirements.txt``.
"""

import logging
from unittest import mock

import pytest


pytest.importorskip("wsgidav")

from tests.test_main import TestApp  # noqa: E402
from tests.test_main import setUpModule as init, get_db  # noqa: E402


logger = logging.getLogger(__name__)


def setUpModule():
    init()
    # ponytail: WebDAV auth queries DB directly, mock user_id patch doesn't help;
    # seed a real admin user so tests can authenticate via Basic Auth.
    from datetime import datetime
    from webserver.models import Reader

    session = get_db()
    user = session.query(Reader).filter(Reader.username == "admin").first()
    if not user:
        user = Reader()
        user.username = "admin"
        user.name = "Admin"
        user.email = "admin@talebook.local"
        user.permission = ""
        user.create_time = datetime.now()
        user.set_secure_password("admin")
        session.add(user)
    user.admin = True
    session.commit()


class TestWebDav(TestApp):
    def _auth_header(self, username, password):
        token = "%s:%s" % (username, password)
        # Use base64 (urlsafe not required here).
        import base64

        encoded = base64.b64encode(token.encode("utf-8")).decode("ascii")
        return "Basic %s" % encoded

    def test_disabled_returns_404(self):
        """When ENABLE_WEBDAV_SERVICE is False, /books/ returns 404."""
        from webserver import loader

        loader.get_settings()["ENABLE_WEBDAV_SERVICE"] = False
        try:
            rsp = self.fetch("/books/")
            self.assertEqual(rsp.code, 404)
        finally:
            loader.get_settings()["ENABLE_WEBDAV_SERVICE"] = True

    def test_enabled_requires_auth(self):
        """When enabled, an unauthenticated PROPFIND is challenged (401)."""
        from webserver import loader

        loader.get_settings()["ENABLE_WEBDAV_SERVICE"] = True
        rsp = self.fetch("/books/", method="PROPFIND", allow_nonstandard_methods=True)
        # WsgiDAV responds 401 with a WWW-Authenticate header when unauthenticated.
        self.assertEqual(rsp.code, 401)
        self.assertIn("WWW-Authenticate", rsp.headers)

    def test_enabled_with_valid_auth(self):
        """A valid site account can authenticate and reach the WebDAV root."""
        from webserver import loader

        loader.get_settings()["ENABLE_WEBDAV_SERVICE"] = True
        # The mock user created by setUpModule uses username/password "admin"/"admin".
        username, password = "admin", "admin"
        rsp = self.fetch(
            "/books/",
            method="PROPFIND",
            headers={"Authorization": self._auth_header(username, password)},
            allow_nonstandard_methods=True,
        )
        # 207 Multi-Status is the WebDAV success code for PROPFIND.
        self.assertEqual(rsp.code, 207)

    def test_core_webdav_methods_are_dispatchable(self):
        """RFC 4918 sync methods must pass Tornado's method gate."""
        from webserver.webdav.handler import WEBDAV_METHODS, WebDAVHandler

        for method in WEBDAV_METHODS:
            with self.subTest(method=method):
                self.assertIn(method, WebDAVHandler.SUPPORTED_METHODS)
                self.assertTrue(callable(getattr(WebDAVHandler, method.lower(), None)))

    def test_admin_has_no_invisible_private_books(self):
        """WebDAV 管理员应能看到其他用户的私藏书。"""
        from webserver.models import Item, Reader
        from webserver.webdav.dav_provider import MyBooksDavProvider

        session = get_db()
        admin = session.query(Reader).filter(Reader.username == "admin").first()
        item = session.query(Item).filter(Item.book_id == 1).first()
        original_scope = item.scope
        original_collector_id = item.collector_id
        item.scope = "private"
        item.collector_id = 2
        session.commit()

        try:
            provider = MyBooksDavProvider(mock.Mock(), get_session_func=get_db)
            self.assertNotIn(1, provider._get_other_private_book_ids(admin.id))
        finally:
            session = get_db()
            item = session.query(Item).filter(Item.book_id == 1).first()
            item.scope = original_scope
            item.collector_id = original_collector_id
            session.commit()


if __name__ == "__main__":
    import unittest

    unittest.main()
