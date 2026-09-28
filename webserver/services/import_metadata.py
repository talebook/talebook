"""Metadata and conservative duplicate matching for imported documents."""

import os

from webserver.i18n import _
from webserver.services.media_analysis import MANAGED_DOCUMENT_FORMATS


def filename_metadata(path):
    from calibre.ebooks.metadata.book.base import Metadata

    return Metadata(os.path.splitext(os.path.basename(path))[0], [_("佚名")])


def matching_import_books(mi, fmt, books):
    books = list(books)
    if fmt in MANAGED_DOCUMENT_FORMATS:
        # These files have no trustworthy author metadata. A unique title is
        # sufficient, but multiple editions must never be merged arbitrarily.
        return books if len(books) == 1 else []
    return [book for book in books if set(book.get("authors", [])) == set(mi.authors)]
