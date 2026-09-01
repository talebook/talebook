#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import datetime
import logging
import os
import shutil
import threading
import time

from webserver import loader
from webserver.i18n import _


CONF = loader.get_settings()


class TrashManager:
    TRASH_SIZES_CACHE = {"trash": 0, "upload": 0, "ts": 0}
    CACHE_EXPIRATION_SECONDS = 30
    TRASH_SIZE_CACHE_LOCK = threading.Lock()
    TRASH_PATH = os.path.join(CONF.get("with_library", "/data/books/library/"), ".caltrash")
    UPLOAD_TRASH_PATH = CONF.get("upload_path", "/data/books/upload/")

    @staticmethod
    def _is_safe_cleanup_path(path, expected_basename=None):
        if not path:
            return False, "empty path"
        abs_path = os.path.abspath(path)
        real_path = os.path.realpath(abs_path)

        if real_path in ("/", "."):
            return False, "path points to root"

        if not os.path.isabs(abs_path):
            return False, "path is not absolute"

        if abs_path != real_path:
            return False, "path is redirected by symlink"

        if expected_basename and os.path.basename(real_path) != expected_basename:
            return False, "unexpected basename"

        depth = len([p for p in real_path.split(os.sep) if p])
        if depth < 3:
            return False, "path depth too shallow"

        return True, ""

    @staticmethod
    def _calc_dir_size(path):
        size = 0
        logging.debug("Calculating size of directory: %s", path)
        if not os.path.exists(path):
            return size
        for root, dirs, files in os.walk(path):
            for f in files:
                fp = os.path.join(root, f)
                if os.path.islink(fp) or not os.path.isfile(fp):
                    continue
                if not os.access(fp, os.R_OK):
                    continue
                try:
                    size += os.path.getsize(fp)
                except Exception:
                    pass
        logging.debug("Calculated size for directory %s: %d bytes", path, size)
        return size

    @staticmethod
    def get_trash_sizes():
        now = time.time()
        with TrashManager.TRASH_SIZE_CACHE_LOCK:
            if now - TrashManager.TRASH_SIZES_CACHE["ts"] < TrashManager.CACHE_EXPIRATION_SECONDS:
                return {"trash": TrashManager.TRASH_SIZES_CACHE["trash"], "upload": TrashManager.TRASH_SIZES_CACHE["upload"]}
        trash_size = TrashManager._calc_dir_size(TrashManager.TRASH_PATH)
        upload_size = TrashManager._calc_dir_size(TrashManager.UPLOAD_TRASH_PATH)
        with TrashManager.TRASH_SIZE_CACHE_LOCK:
            TrashManager.TRASH_SIZES_CACHE["trash"] = trash_size
            TrashManager.TRASH_SIZES_CACHE["upload"] = upload_size
            TrashManager.TRASH_SIZES_CACHE["ts"] = now
        return {"trash": trash_size, "upload": upload_size}

    @staticmethod
    def clear_trash_cache():
        with TrashManager.TRASH_SIZE_CACHE_LOCK:
            TrashManager.TRASH_SIZES_CACHE["trash"] = 0
            TrashManager.TRASH_SIZES_CACHE["upload"] = 0
            TrashManager.TRASH_SIZES_CACHE["ts"] = 0

    @staticmethod
    def _book_trash_path(cache, book_id):
        """Return a Calibre-owned trash path for an integer book id."""
        book_id = int(book_id)
        trash_root = os.path.realpath(cache.backend.trash_dir)
        book_root = os.path.realpath(os.path.join(trash_root, "b"))
        path = os.path.realpath(os.path.join(book_root, str(book_id)))
        if os.path.commonpath((book_root, path)) != book_root:
            raise ValueError("invalid trash book path")
        return path

    @staticmethod
    def _trash_book_formats(path):
        formats = []
        try:
            entries = os.scandir(path)
        except OSError:
            return formats
        with entries:
            for entry in entries:
                if not entry.is_file(follow_symlinks=False):
                    continue
                name = entry.name.lower()
                if name in ("cover.jpg", "metadata.opf", "annotations.json") or "." not in name:
                    continue
                formats.append(name.rsplit(".", 1)[-1].upper())
        return sorted(set(formats))

    @classmethod
    def list_books(cls, cache):
        """List whole-book entries using Calibre as the source of truth."""
        books, _ = cache.list_trash_entries()
        items = []
        for entry in books:
            path = cls._book_trash_path(cache, entry.book_id)
            deleted_at = datetime.datetime.fromtimestamp(entry.mtime, tz=datetime.timezone.utc)
            items.append(
                {
                    "id": entry.book_id,
                    "title": entry.title,
                    "author": entry.author,
                    "deleted_at": deleted_at.isoformat().replace("+00:00", "Z"),
                    "size": cls._calc_dir_size(path),
                    "formats": cls._trash_book_formats(path),
                }
            )
        items.sort(key=lambda item: item["deleted_at"], reverse=True)
        return items

    @classmethod
    def restore_books(cls, db, book_ids):
        """Restore trash entries and refresh the legacy Calibre facade."""
        cache = db.new_api
        available = {entry.book_id for entry in cache.list_trash_entries()[0]}
        existing = set(cache.all_book_ids())
        restored = []
        failures = []
        for book_id in dict.fromkeys(book_ids):
            if book_id not in available:
                failures.append({"id": book_id, "reason": "not_found"})
                continue
            if book_id in existing:
                failures.append({"id": book_id, "reason": "id_conflict"})
                continue
            try:
                cache.move_book_from_trash(book_id)
                # LibraryDatabase keeps a separate legacy data cache. The new
                # API restores metadata.db and files; explicitly publish the
                # added id so existing Talebook reads see it immediately.
                db.data.books_added((book_id,))
                db.notify("add", [book_id])
                restored.append(book_id)
                existing.add(book_id)
            except Exception:
                logging.exception("Failed to restore Calibre trash book %s", book_id)
                failures.append({"id": book_id, "reason": "restore_failed"})
        cls.clear_trash_cache()
        return restored, failures

    @classmethod
    def delete_books(cls, cache, book_ids):
        """Permanently delete whole-book trash entries by integer id."""
        available = {entry.book_id for entry in cache.list_trash_entries()[0]}
        deleted = []
        failures = []
        for book_id in dict.fromkeys(book_ids):
            if book_id not in available:
                failures.append({"id": book_id, "reason": "not_found"})
                continue
            try:
                cache.delete_trash_entry(book_id, "b")
                deleted.append(book_id)
            except Exception:
                logging.exception("Failed to permanently delete Calibre trash book %s", book_id)
                failures.append({"id": book_id, "reason": "delete_failed"})
        cls.clear_trash_cache()
        return deleted, failures

    @staticmethod
    def clear_trashs():
        errors = []
        trash_path = os.path.abspath(TrashManager.TRASH_PATH)
        upload_path = os.path.abspath(TrashManager.UPLOAD_TRASH_PATH)

        if trash_path != TrashManager.TRASH_PATH:
            msg = _("配置的 Calibre Library 不是绝对路径，为了安全起见，跳过清理!")
            logging.error(msg)
            errors.append(msg)
            return errors

        ok, reason = TrashManager._is_safe_cleanup_path(trash_path, expected_basename=".caltrash")
        if not ok:
            msg = "Skip clearing trash path %s: %s" % (trash_path, reason)
            logging.error(msg)
            errors.append(msg)

        ok, reason = TrashManager._is_safe_cleanup_path(upload_path)
        if not ok:
            msg = "Skip clearing upload path %s: %s" % (upload_path, reason)
            logging.error(msg)
            errors.append(msg)

        if errors:
            TrashManager.clear_trash_cache()
            return errors

        if os.path.exists(trash_path):
            new_name = "%s.bak" % (trash_path)
            try:
                if os.path.exists(new_name):
                    shutil.rmtree(new_name)
                trash_parent = os.path.dirname(trash_path)
                if os.path.dirname(new_name) != trash_parent:
                    raise RuntimeError("invalid backup target")
                os.rename(trash_path, new_name)
                os.makedirs(trash_path, exist_ok=True)
                shutil.rmtree(new_name)
            except Exception as e:
                logging.error("Error clearing Calibre trash bin: %s", e)
                errors.append(str(e))

        if os.path.exists(upload_path):
            try:
                upload_real_path = os.path.realpath(upload_path)
                upload_prefix = upload_real_path + os.sep
                for item in os.listdir(upload_path):
                    item_path = os.path.join(upload_path, item)
                    item_real_path = os.path.realpath(item_path)
                    if not item_real_path.startswith(upload_prefix):
                        logging.warning("Skip unsafe upload item path: %s", item_path)
                        continue
                    if os.path.isfile(item_path) or os.path.islink(item_path):
                        os.remove(item_path)
                    elif os.path.isdir(item_path):
                        shutil.rmtree(item_path)
            except Exception as e:
                logging.error("Error clearing upload temp directory: %s", e)
                errors.append(str(e))
        TrashManager.clear_trash_cache()
        return errors
