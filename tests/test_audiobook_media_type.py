#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from webserver.handlers.audiobook import _supports_audiobook_source


def test_comics_are_never_audiobook_sources_even_with_text_formats():
    assert not _supports_audiobook_source({"media_type": "comic", "available_formats": ["EPUB"]})
    assert not _supports_audiobook_source({"media_type": "comic", "available_formats": ["TXT"]})


def test_non_comics_keep_existing_epub_and_txt_support():
    assert _supports_audiobook_source({"media_type": "ebook", "available_formats": ["EPUB"]})
    assert _supports_audiobook_source({"media_type": "unknown", "available_formats": ["TXT"]})
    assert not _supports_audiobook_source({"media_type": "ebook", "available_formats": ["PDF"]})
