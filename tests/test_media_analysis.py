#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import struct
import tempfile
import zipfile

import pytest

from webserver.constants import MEDIA_TYPE_COMIC, MEDIA_TYPE_EBOOK, MEDIA_TYPE_UNKNOWN
from webserver.services.media_analysis import InvalidMediaError, analyze_media_file, merge_media_type


PNG = b"\x89PNG\r\n\x1a\n" + b"test-image"
JPEG = b"\xff\xd8\xff\xe0" + b"test-image"


def _write_epub(path, *, comic, fixed_layout=False):
    metadata = '<meta property="rendition:layout">pre-paginated</meta>' if fixed_layout else ""
    if comic:
        manifest = """
          <item id="page1" href="pages/1.xhtml" media-type="application/xhtml+xml"/>
          <item id="image1" href="images/1.png" media-type="image/png"/>
          <item id="image2" href="images/2.jpg" media-type="image/jpeg"/>
        """
        spine = '<itemref idref="page1"/><itemref idref="image2"/>'
        page = '<html xmlns="http://www.w3.org/1999/xhtml"><body>1<img src="../images/1.png"/></body></html>'
    else:
        manifest = '<item id="page1" href="pages/1.xhtml" media-type="application/xhtml+xml"/>'
        spine = '<itemref idref="page1"/>'
        page = (
            '<html xmlns="http://www.w3.org/1999/xhtml"><body>'
            "This is flowing prose with substantially more than fifteen characters."
            "</body></html>"
        )

    container = """<?xml version="1.0"?>
      <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
        <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
      </container>
    """
    package = f"""<?xml version="1.0"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Test</dc:title>{metadata}
        </metadata>
        <manifest>{manifest}</manifest>
        <spine>{spine}</spine>
      </package>
    """
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("mimetype", b"application/epub+zip", compress_type=zipfile.ZIP_STORED)
        archive.writestr("META-INF/container.xml", container)
        archive.writestr("OEBPS/content.opf", package)
        archive.writestr("OEBPS/pages/1.xhtml", page)
        if comic:
            archive.writestr("OEBPS/images/1.png", PNG)
            archive.writestr("OEBPS/images/2.jpg", JPEG)


def _write_image_zip(path):
    with zipfile.ZipFile(path, "w") as archive:
        archive.writestr("001.png", PNG)
        archive.writestr("chapter/002.jpg", JPEG)
        archive.writestr("ComicInfo.xml", "<ComicInfo/>")


def test_image_zip_and_cbz_are_comics():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "comic.cbz")
        _write_image_zip(path)

        cbz = analyze_media_file(path, "cbz")
        zip_result = analyze_media_file(path, "zip")

    assert cbz.detected_format == "zip"
    assert cbz.media_type == MEDIA_TYPE_COMIC
    assert cbz.mime_type == "application/vnd.comicbook+zip"
    assert zip_result.media_type == MEDIA_TYPE_COMIC
    assert zip_result.mime_type == "application/zip"


@pytest.mark.parametrize("fixture", ["images-rar4.rar", "images-rar5.rar"])
@pytest.mark.parametrize("declared_format", ["rar", "cbr"])
def test_image_rar_and_cbr_are_comics(fixture, declared_format):
    path = os.path.join(os.path.dirname(__file__), "cases", "comics", fixture)
    result = analyze_media_file(path, declared_format)

    assert result.detected_format == "rar"
    assert result.media_type == MEDIA_TYPE_COMIC


def test_comic_epub_uses_spine_images_not_fixed_layout_flag():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "comic.epub")
        _write_epub(path, comic=True, fixed_layout=False)
        result = analyze_media_file(path, "epub")

    assert result.media_type == MEDIA_TYPE_COMIC
    assert result.reason == "image_spine"


def test_text_epub_stays_ebook_even_when_pre_paginated():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "novel.epub")
        _write_epub(path, comic=False, fixed_layout=True)
        result = analyze_media_file(path, "epub")

    assert result.media_type == MEDIA_TYPE_EBOOK
    assert result.reason == "text_spine"


@pytest.mark.parametrize(
    ("filename", "content", "declared_format"),
    [
        ("fake.epub", b"PK\x03\x04not-an-epub", "epub"),
        ("fake.pdf", b"MZ-not-a-pdf", "pdf"),
        ("fake.cbz", b"Rar!\x1a\x07\x00", "cbz"),
        ("fake.cbr", b"PK\x03\x04not-a-rar", "cbr"),
    ],
)
def test_signature_or_container_mismatch_is_rejected(filename, content, declared_format):
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, filename)
        with open(path, "wb") as stream:
            stream.write(content)
        with pytest.raises(InvalidMediaError):
            analyze_media_file(path, declared_format)


def test_non_image_and_unsafe_zip_entries_are_rejected():
    with tempfile.TemporaryDirectory() as tmpdir:
        non_image = os.path.join(tmpdir, "documents.zip")
        with zipfile.ZipFile(non_image, "w") as archive:
            archive.writestr("readme.txt", "not a comic")
        with pytest.raises(InvalidMediaError, match="只能包含图片"):
            analyze_media_file(non_image, "zip")

        unsafe = os.path.join(tmpdir, "unsafe.cbz")
        with zipfile.ZipFile(unsafe, "w") as archive:
            archive.writestr("../page.png", PNG)
        with pytest.raises(InvalidMediaError, match="不安全路径"):
            analyze_media_file(unsafe, "cbz")


def test_entry_count_is_rejected_before_zipfile_builds_the_entry_list():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "too-many.cbz")
        eocd = struct.pack("<4s4H2LH", b"PK\x05\x06", 0, 0, 10001, 10001, 0, 0, 0)
        with open(path, "wb") as stream:
            stream.write(b"PK\x03\x04")
            stream.write(eocd)

        with pytest.raises(InvalidMediaError, match="条目过多"):
            analyze_media_file(path, "cbz")


def test_image_extension_must_match_inner_signature():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "fake.cbz")
        with zipfile.ZipFile(path, "w") as archive:
            archive.writestr("page.png", JPEG)
        with pytest.raises(InvalidMediaError, match="扩展名与内容不匹配"):
            analyze_media_file(path, "cbz")


def test_pdf_remains_unknown_and_media_type_merge_never_downgrades_comic():
    with tempfile.TemporaryDirectory() as tmpdir:
        path = os.path.join(tmpdir, "book.pdf")
        with open(path, "wb") as stream:
            stream.write(b"%PDF-1.7\n")
        result = analyze_media_file(path, "pdf")

    assert result.media_type == MEDIA_TYPE_UNKNOWN
    assert merge_media_type(MEDIA_TYPE_COMIC, MEDIA_TYPE_EBOOK) == MEDIA_TYPE_COMIC
    assert merge_media_type(MEDIA_TYPE_UNKNOWN, MEDIA_TYPE_EBOOK) == MEDIA_TYPE_EBOOK
