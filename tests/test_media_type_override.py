#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from types import SimpleNamespace
from unittest import mock

from webserver.handlers.book import BookSetMediaType, BookUploadBase, routes
from webserver.services.scan import ScanService


def media_item(media_type="ebook", locked=False):
    return SimpleNamespace(
        media_type=media_type,
        media_type_locked=locked,
        save=mock.Mock(),
    )


def test_manual_media_type_route_is_registered():
    assert dict(routes())[r"/api/book/([0-9]+)/media_type"] is BookSetMediaType


def test_manual_media_type_survives_later_format_upload_analysis():
    item = media_item(locked=True)

    saved = BookUploadBase._save_media_type(SimpleNamespace(), 14, "comic", item=item)

    assert saved is item
    assert item.media_type == "ebook"
    item.save.assert_called_once_with()


def test_manual_media_type_survives_later_directory_scan_analysis():
    item = media_item(locked=True)

    saved = ScanService._set_item_media_type(SimpleNamespace(), 14, 1, "comic", item=item)

    assert saved is item
    assert item.media_type == "ebook"


def test_automatic_media_type_still_merges_when_not_manually_locked():
    uploaded = media_item(locked=False)
    scanned = media_item(locked=False)

    BookUploadBase._save_media_type(SimpleNamespace(), 14, "comic", item=uploaded)
    ScanService._set_item_media_type(SimpleNamespace(), 14, 1, "comic", item=scanned)

    assert uploaded.media_type == "comic"
    assert scanned.media_type == "comic"
