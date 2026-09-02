#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import os

from webserver.models import ScanFile


EXTERNAL_INDEX_FLAG = "external_path"


def _row_data(row):
    data = row.data or {}
    return data if isinstance(data, dict) else {}


def is_external_index_scanfile(row):
    data = _row_data(row)
    return row.status == ScanFile.INDEXED and bool(data.get(EXTERNAL_INDEX_FLAG) or data.get("source_path"))


def external_index_scanfiles(session, book_id):
    if session is None or not book_id:
        return []
    rows = session.query(ScanFile).filter(ScanFile.book_id == int(book_id)).all()
    return [row for row in rows if is_external_index_scanfile(row)]


def external_index_format_paths(session, book_id):
    paths = {}
    for row in external_index_scanfiles(session, book_id):
        data = _row_data(row)
        fmt = (data.get("format") or os.path.splitext(row.path)[1].lstrip(".")).upper()
        source_path = data.get("source_path") or row.path
        if fmt and source_path:
            paths[fmt] = os.path.realpath(os.path.abspath(source_path))
    return paths


def is_external_index_book(session, book_id):
    return bool(external_index_format_paths(session, book_id))


def is_external_index_format(session, book_id, fmt):
    return (fmt or "").upper() in external_index_format_paths(session, book_id)


def _refresh_calibre_caches(db, book_id=None, added=False):
    cache = db.new_api
    cache.reload_from_db()
    if added:
        db.data.books_added((book_id,))
        db.notify("add", [book_id])
    elif book_id:
        try:
            db.data.refresh_ids(db, [book_id])
        except Exception as err:
            logging.info("skip legacy calibre cache refresh for book %s: %s", book_id, err)


def _external_record_parts(fpath):
    real_path = os.path.realpath(os.path.abspath(fpath))
    source_dir = os.path.dirname(real_path)
    name = os.path.splitext(os.path.basename(real_path))[0]
    size = os.path.getsize(real_path)
    return real_path, source_dir, name, size


def set_external_format_record(db, book_id, fpath, fmt, added=False):
    _, source_dir, name, size = _external_record_parts(fpath)
    fmt = (fmt or "").upper()
    cache = db.new_api
    with cache.write_lock:
        cache.backend.execute("UPDATE books SET path=? WHERE id=?", (source_dir, int(book_id)))
        max_size = cache.fields["formats"].table.update_fmt(int(book_id), fmt, name, size, cache.backend)
        cache.fields["size"].table.update_sizes({int(book_id): max_size})
        try:
            cache._update_last_modified((int(book_id),))
        except Exception:
            pass
    _refresh_calibre_caches(db, book_id, added=added)


def create_external_index_book(db, mi, fpath, fmt):
    book_id = db.new_api.create_book_entry(mi, add_duplicates=True)
    set_external_format_record(db, book_id, fpath, fmt, added=True)
    return book_id


def can_attach_external_format(db, session, book_id, fpath):
    if not book_id:
        return False
    source_dir = os.path.dirname(os.path.realpath(os.path.abspath(fpath)))
    external_paths = external_index_format_paths(session, book_id)
    try:
        books = db.get_data_as_dict(ids=[int(book_id)])
    except Exception:
        books = []
    available_formats = set(books[0].get("available_formats") or []) if books else set()
    if not available_formats:
        return True
    if available_formats - set(external_paths):
        return False
    return all(os.path.dirname(path) == source_dir for path in external_paths.values())


def add_external_index_record(db, session, mi, fpath, fmt, existing_book_id=None):
    if existing_book_id and can_attach_external_format(db, session, existing_book_id, fpath):
        book_id = int(existing_book_id)
        set_external_format_record(db, book_id, fpath, fmt)
        return book_id, False
    return create_external_index_book(db, mi, fpath, fmt), True


def clear_book_path(db, book_id):
    cache = db.new_api
    with cache.write_lock:
        cache.backend.execute("UPDATE books SET path='' WHERE id=?", (int(book_id),))
    _refresh_calibre_caches(db, book_id)


def delete_external_index_book_record(db, book_id):
    clear_book_path(db, book_id)
    db.delete_book(int(book_id))


def set_metadata_preserving_external_paths(db, session, book_id, mi, **kwargs):
    paths = external_index_format_paths(session, book_id)
    if not paths:
        return db.set_metadata(book_id, mi, **kwargs)

    clear_book_path(db, book_id)
    try:
        return db.set_metadata(book_id, mi, **kwargs)
    finally:
        for fmt, path in paths.items():
            if os.path.exists(path):
                set_external_format_record(db, book_id, path, fmt)


def rename_items_preserving_external_paths(db, session, field, rename_map, book_ids):
    """Use Calibre's category rename/merge API without moving externally indexed files."""
    paths_by_book = {int(book_id): paths for book_id in book_ids if (paths := external_index_format_paths(session, book_id))}
    for book_id in paths_by_book:
        clear_book_path(db, book_id)
    try:
        return db.new_api.rename_items(field, rename_map)
    finally:
        for book_id, paths in paths_by_book.items():
            for fmt, path in paths.items():
                if os.path.exists(path):
                    set_external_format_record(db, book_id, path, fmt)


def remove_formats_preserving_external_files(db, session, book_id, formats):
    formats = [(fmt or "").upper() for fmt in formats if fmt]
    external_paths = external_index_format_paths(session, book_id)
    external_formats = [fmt for fmt in formats if fmt in external_paths]
    regular_formats = [fmt for fmt in formats if fmt not in external_paths]

    if regular_formats:
        db.new_api.remove_formats({int(book_id): regular_formats})
    if external_formats:
        db.new_api.remove_formats({int(book_id): external_formats}, db_only=True)

    if formats:
        try:
            db.data.refresh_ids(db, [int(book_id)])
        except Exception as err:
            logging.info("skip legacy calibre cache refresh for book %s: %s", book_id, err)
