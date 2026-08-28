#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from unittest import mock

from tests.test_main import BID_EPUB, TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver.models import Item


def setUpModule():
    init()


class TestComicMediaApi(TestWithUserLogin):
    def test_book_api_exposes_persisted_media_type_and_epub_readability(self):
        session = get_db()
        item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
        previous = item.media_type
        try:
            item.media_type = "comic"
            session.commit()
            response = self.json(f"/api/book/{BID_EPUB}")
        finally:
            session = get_db()
            item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
            item.media_type = previous
            session.commit()

        assert response["err"] == "ok"
        assert response["book"]["media_type"] == "comic"
        assert response["book"]["online_readable"] is True

    def test_comic_container_never_enters_existing_readers(self):
        book = {
            "id": BID_EPUB,
            "title": "Container Comic",
            "media_type": "comic",
            "available_formats": ["CBZ"],
            "fmt_cbz": "/tmp/container.cbz",
        }
        with mock.patch("webserver.handlers.base.BaseHandler.get_book_or_404", return_value=book):
            with mock.patch("webserver.services.convert.ConvertService.convert_and_save") as convert:
                response = self.fetch(f"/read/{BID_EPUB}", follow_redirects=False)

        assert response.code == 415
        assert "漫画" in response.body.decode("utf-8")
        convert.assert_not_called()

    def test_comic_epub_still_opens_existing_epub_reader(self):
        book = {
            "id": BID_EPUB,
            "title": "Comic EPUB",
            "media_type": "comic",
            "available_formats": ["EPUB"],
            "fmt_epub": "/tmp/comic.epub",
        }
        with mock.patch("webserver.handlers.base.BaseHandler.get_book_or_404", return_value=book):
            response = self.fetch(f"/read/{BID_EPUB}", follow_redirects=False)

        assert response.code == 200
        assert "waitReady" not in response.body.decode("utf-8")
