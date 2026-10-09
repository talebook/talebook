import json
import re
from types import SimpleNamespace
from unittest import mock
from urllib.parse import urlencode

import tornado.web

from tests.test_main import TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from tests.test_venera_source import BOOK_ID, SCRIPT, Http
from webserver.handlers.network_comic import TOKEN_NAME
from webserver.plugins.source import venera
from webserver.services.plugin_runtime import BUILTIN_CONNECTION_ROLE, install_builtin, save_connection


def setUpModule():
    init()


class TestNetworkComic(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = get_db()
        self.installation = install_builtin(session, venera.PLUGIN_ID, installed_by=1, enabled=True)
        self.connection = save_connection(
            session, {}, self.installation.id, "instance", 0, {}, role=BUILTIN_CONNECTION_ROLE, config={"source": "MangaDex"}
        )
        self.source = f"plugin:{self.connection.id}"
        self.patch_script = mock.patch.object(venera, "source_script", return_value=SCRIPT)
        self.patch_http = mock.patch.object(venera, "public_http", side_effect=Http)
        self.patch_script.start()
        self.patch_http.start()
        self.addCleanup(self.patch_script.stop)
        self.addCleanup(self.patch_http.stop)
        self.addCleanup(self.disable_source)

    def disable_source(self):
        from webserver.models import PluginInstallation

        session = get_db()
        installation = session.get(PluginInstallation, self.installation.id)
        installation.enabled = False
        session.commit()

    def query(self, path, **params):
        return self.json(path + "?" + urlencode({"source_id": self.source, **params}))

    def pages(self):
        detail = self.query("/api/book-sources/book", book_url=BOOK_ID)
        assert detail["book"]["online_readable"]
        assert detail["download_mode"] == "none"
        assert detail["book"]["cover_url"].startswith("/api/book-sources/comic/image?")
        toc = self.query("/api/book-sources/toc", book_url=BOOK_ID)
        assert len(toc["chapters"]) == 2
        return self.query("/api/book-sources/comic/pages", chapter_url=toc["chapters"][0]["url"])

    def test_browse_detail_toc_and_pages_through_plugin_runtime(self):
        browse = self.query("/api/book-sources/browse", url="recent")
        assert browse["has_more"] and browse["books"][0]["name"] == "漫画"
        pages = self.pages()
        assert pages["err"] == "ok" and len(pages["pages"]) == 2
        assert [page["id"] for page in pages["pages"]] == ["0", "1"]

    def test_reader_template_keeps_its_copy_separate_from_account_notifications(self):
        response = self.fetch("/read-online-comic?" + urlencode({"source_id": self.source}))
        assert response.code == 200
        assert response.headers["Cache-Control"] == "no-store"
        messages = re.search(rb'<script id="messages" type="application/json">(.*?)</script>', response.body)
        copy = json.loads(messages.group(1))
        assert copy["title"] == "在线漫画"
        assert copy["retry"] == "重试"
        assert b"<title>" in response.body and "在线漫画".encode() in response.body

    def test_image_token_requires_same_logged_in_user_and_current_source(self):
        url = self.pages()["pages"][0]["url"]
        with mock.patch("webserver.handlers.base.BaseHandler.user_id", return_value=None):
            assert self.fetch(url).code == 401
        with mock.patch("webserver.handlers.base.BaseHandler.user_id", return_value=2):
            assert self.fetch(url).code == 403
        assert self.fetch("/api/book-sources/comic/image?token=bad").code == 403
        self.disable_source()
        assert self.fetch(url).code == 403

    def test_non_image_upstream_content_is_rejected(self):
        http = SimpleNamespace(
            session=SimpleNamespace(close=lambda: None),
            request=lambda *a, **k: SimpleNamespace(headers={"Content-Type": "text/html"}, content=b"<html>"),
        )
        with mock.patch("webserver.handlers.network_comic.public_http", return_value=http):
            assert self.fetch(self.pages()["pages"][0]["url"]).code == 502

    def test_upstream_image_bytes_are_proxied_without_public_caching(self):
        http = SimpleNamespace(
            session=SimpleNamespace(close=lambda: None),
            request=lambda *a, **k: SimpleNamespace(headers={"Content-Type": "image/png"}, content=b"PNG bytes"),
        )
        with mock.patch("webserver.handlers.network_comic.public_http", return_value=http):
            response = self.fetch(self.pages()["pages"][0]["url"])
        assert response.code == 200 and response.body == b"PNG bytes"
        assert response.headers["Cache-Control"] == "private, no-store"
        assert response.headers["X-Content-Type-Options"] == "nosniff"

    def test_read_permission_is_checked_before_loading_source(self):
        with mock.patch("webserver.models.Reader.can_read", return_value=False):
            assert self.query("/api/book-sources/comic/pages", chapter_url="unused")["err"] == "permission.not_permit"

    def test_revoked_network_scope_blocks_source_calls_and_existing_images(self):
        from webserver.models import PluginConnection

        url = self.pages()["pages"][0]["url"]
        session = get_db()
        session.get(PluginConnection, self.connection.id).scopes = ["books.read"]
        session.commit()
        assert self.fetch(url).code == 403
        assert self.query("/api/book-sources/book", book_url=BOOK_ID)["err"] == "plugin.scope_denied"

    def test_inactive_account_cannot_open_reader_pages_or_images(self):
        url = self.pages()["pages"][0]["url"]
        with mock.patch("webserver.models.Reader.is_active", return_value=False):
            assert self.fetch(url).code == 403
            assert self.fetch("/read-online-comic?" + urlencode({"source_id": self.source})).code == 403
            assert self.query("/api/book-sources/comic/pages", chapter_url="unused")["err"] == "user.activation_required"

    def test_expired_token_is_rejected(self):
        app = self.get_app()
        token = tornado.web.create_signed_value(
            str(app.settings["cookie_secret"]), TOKEN_NAME, json.dumps({}), clock=lambda: 1
        ).decode()
        assert self.fetch("/api/book-sources/comic/image?" + urlencode({"token": token})).code == 403
