#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
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

    def test_owner_can_lock_mixed_format_book_as_ebook_or_comic(self):
        session = get_db()
        item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
        previous = (item.media_type, item.media_type_locked)
        mixed_book = {
            "id": BID_EPUB,
            "title": "Mixed media",
            "available_formats": ["EPUB", "CBZ"],
        }
        try:
            with mock.patch("webserver.handlers.book.BookSetMediaType.get_book", return_value=mixed_book):
                ebook = self.json(
                    f"/api/book/{BID_EPUB}/media_type",
                    method="POST",
                    body=json.dumps({"media_type": "ebook"}),
                )
                comic = self.json(
                    f"/api/book/{BID_EPUB}/media_type",
                    method="POST",
                    body=json.dumps({"media_type": "comic"}),
                )

            session = get_db()
            item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
            assert ebook["err"] == "ok"
            assert ebook["media_type"] == "ebook"
            assert ebook["media_type_locked"] is True
            assert comic["err"] == "ok"
            assert item.media_type == "comic"
            assert item.media_type_locked is True
        finally:
            session = get_db()
            item = session.query(Item).filter(Item.book_id == BID_EPUB).one()
            item.media_type, item.media_type_locked = previous
            session.commit()

    def test_manual_media_type_requires_both_ebook_and_comic_formats(self):
        ebook_only = {"id": BID_EPUB, "title": "Ebook", "available_formats": ["EPUB", "PDF"]}
        with mock.patch("webserver.handlers.book.BookSetMediaType.get_book", return_value=ebook_only):
            response = self.json(
                f"/api/book/{BID_EPUB}/media_type",
                method="POST",
                body=json.dumps({"media_type": "comic"}),
            )

        assert response["err"] == "media_type.not_mixed"

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
