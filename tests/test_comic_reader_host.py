#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from pathlib import Path
from unittest import mock

import pytest
import tornado.web
from jinja2 import Environment, FileSystemLoader

from webserver.handlers.comic import ComicReaderHandler, KOMGA_READER_VERSION, routes
from webserver.services.comic_archive import ComicArchiveError


ROOT = Path(__file__).resolve().parents[1]


def handler_mock(current_user=object()):
    handler = mock.Mock()
    handler.current_user = current_user
    handler.redirect.return_value = "redirected"
    handler.html_page.return_value = "rendered"
    return handler


def test_backend_host_redirects_anonymous_users_without_loading_a_book():
    handler = handler_mock(current_user=None)

    result = ComicReaderHandler.get(handler, "14")

    assert result == "redirected"
    handler.redirect.assert_called_once_with("/login")
    handler.get_authorized_comic.assert_not_called()


def test_backend_host_authorizes_and_renders_the_versioned_template():
    handler = handler_mock()
    book = {"id": 14, "title": "模板 <安全> 漫画"}
    handler.get_authorized_comic.return_value = (book, "/private/archive.cbz", "cbz")

    result = ComicReaderHandler.get(handler, "14")

    assert result == "rendered"
    handler.get_authorized_comic.assert_called_once_with("14")
    template_name, context = handler.html_page.call_args.args
    assert template_name == "book/comic-reader.html"
    assert context["book"] is book
    assert context["READER_VERSION"] == (ROOT / "komga-reader-version.txt").read_text().strip()
    assert context["LANGUAGE"] in ("zh-CN", "en-US")

    environment = Environment(loader=FileSystemLoader(ROOT / "webserver/resources"))
    html = environment.get_template(template_name).render(**context)
    assert "模板 &lt;安全&gt; 漫画" in html
    assert "/static/komga-reader/komga-reader.es.js" in html
    assert "/api/book/${bookId}/comic/pages" in html
    assert "/private/archive.cbz" not in html


def test_backend_host_preserves_authorization_status_without_rendering():
    handler = handler_mock()
    handler.get_authorized_comic.side_effect = ComicArchiveError("comic.no_permission", "无权在线阅读", status=403)

    with pytest.raises(tornado.web.HTTPError) as raised:
        ComicReaderHandler.get(handler, "14")

    assert raised.value.status_code == 403
    handler.html_page.assert_not_called()


def test_backend_route_and_static_version_are_registered():
    route_map = dict(routes())

    assert route_map[r"/read-comic/([0-9]+)"] is ComicReaderHandler
    assert KOMGA_READER_VERSION == (ROOT / "komga-reader-version.txt").read_text().strip()
