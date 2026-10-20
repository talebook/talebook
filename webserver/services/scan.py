#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import hashlib
import logging
import os
import threading
import time
from contextlib import contextmanager
from functools import wraps
from itertools import chain, islice

from sqlalchemy import func, or_

from webserver import loader, utils
from webserver.i18n import _
from webserver.models import Item, ScanFile
from webserver.services import AsyncService
from webserver.services.autofill import AutoFillService
from webserver.services.external_index import (
    EXTERNAL_INDEX_FLAG,
    add_external_index_record,
)
from webserver.services.import_metadata import filename_metadata, matching_import_books
from webserver.services.media_analysis import (
    COMIC_CONTAINER_FORMATS,
    MANAGED_DOCUMENT_FORMATS,
    SUPPORTED_MEDIA_FORMATS,
    InvalidMediaError,
    analyze_media_file,
    merge_media_type,
)
from webserver.services.scan_runtime import FolderEvents, MetadataCache, file_signature, full_hash, prepared_files


CONF = loader.get_settings()
SCAN_EXT = sorted(SUPPORTED_MEDIA_FORMATS)
IMPORT_MODE_INDEX = "index"
IMPORT_MODE_COPY = "copy"
IMPORT_MODE_MOVE = "move"
IMPORT_MODES = (IMPORT_MODE_INDEX, IMPORT_MODE_COPY, IMPORT_MODE_MOVE)


def normalize_import_mode(import_mode=None, delete_after=False):
    if import_mode in IMPORT_MODES:
        return import_mode
    if delete_after:
        return IMPORT_MODE_MOVE
    saved_mode = CONF.get("import_mode", IMPORT_MODE_COPY)
    return saved_mode if saved_mode in IMPORT_MODES else IMPORT_MODE_COPY


SCAN_QUERY_BATCH_SIZE = 500
IMPORT_QUERY_BATCH_SIZE = 100


def iter_scan_files(path_dir):
    """Yield candidates without retaining the whole directory tree."""
    for dirpath, dirnames, filenames in os.walk(path_dir):
        dirnames[:] = [
            d for d in dirnames if not (d.startswith(".") or d.startswith("@__") or os.path.islink(os.path.join(dirpath, d)))
        ]
        for fname in filenames:
            if fname.startswith(".") or "." not in fname:
                continue
            fmt = fname.rsplit(".", 1)[-1].lower()
            if fmt not in SCAN_EXT:
                continue
            fpath = os.path.join(dirpath, fname)
            if os.path.islink(fpath) or not os.path.isfile(fpath):
                continue
            yield fname, fpath, fmt


def iter_scan_task_batches(path_dir, limit, lookup_done, batch_size=SCAN_QUERY_BATCH_SIZE):
    """Look up only one batch of paths; completed files never consume the scan limit."""
    candidates = iter_scan_files(path_dir)
    remaining = limit if limit and limit > 0 else None
    while True:
        batch = list(islice(candidates, batch_size))
        if not batch:
            return
        done = lookup_done([path for _, path, _ in batch])
        tasks = [task for task in batch if task[1] not in done]
        if remaining is not None:
            tasks = tasks[:remaining]
            remaining -= len(tasks)
        if tasks:
            yield tasks
        if remaining == 0:
            return


def iter_scan_rows(query, batch_size=IMPORT_QUERY_BATCH_SIZE):
    """Keyset pagination survives status changes/commits and excludes newly inserted rows."""
    upper_id = query.order_by(None).with_entities(func.max(ScanFile.id)).scalar()
    if upper_id is None:
        return
    last_id = 0
    while True:
        rows = (
            query.filter(ScanFile.id > last_id, ScanFile.id <= upper_id)
            .order_by(None)
            .order_by(ScanFile.id)
            .limit(batch_size)
            .all()
        )
        if not rows:
            return
        last_id = rows[-1].id
        yield from rows


def scan_operation(kind):
    def decorate(function):
        @wraps(function)
        def run(self, *args, **kwargs):
            # Serialize scan/import/auto consumers; file-only preparation may overlap.
            with self._operation_lock:
                outer = not getattr(self._local, "scan_operation", False)
                if outer:
                    self._local.scan_operation = True
                    with self._progress_lock:
                        self._cancel.clear()
                        if self._cancel_queued:
                            self._cancel.set()
                            self._cancel_queued = False
                        self._progress = {"active": True, "kind": kind, "cancelled": False, "processed": 0, "failed": 0}
                try:
                    if self._cancel.is_set():
                        return None
                    return function(self, *args, **kwargs)
                except Exception as err:
                    with self._progress_lock:
                        self._progress["error"] = str(err)
                    raise
                finally:
                    if outer:
                        self._local.scan_operation = False
                        with self._progress_lock:
                            self._progress.update(active=False, cancelled=self._cancel.is_set())

        return run

    return decorate


class ScanService(AsyncService):
    _operation_lock = threading.RLock()
    _progress_lock = threading.Lock()
    _cancel = threading.Event()
    _cancel_queued = False
    _progress = {"active": False, "kind": None, "cancelled": False, "processed": 0, "failed": 0}
    _metadata_cache = MetadataCache()

    def task_status(self):
        with self._progress_lock:
            status = dict(self._progress)
        pending = any(
            self.get_queue(name) is not None and self.get_queue(name).unfinished_tasks for name in ("do_scan", "do_import")
        )
        status["active"] = status["active"] or pending
        return status

    def cancel_task(self):
        with self._progress_lock:
            if self._progress["active"]:
                self._cancel.set()
                self._progress["cancelled"] = True
            elif any(self.get_queue(name) is not None and self.get_queue(name).qsize() for name in ("do_scan", "do_import")):
                self._cancel_queued = True
                self._progress["cancelled"] = True
        return self.task_status()

    def _prepare_file(self, path, saved=None):
        from calibre.ebooks.metadata.book.base import Metadata
        from calibre.ebooks.metadata.meta import get_metadata

        signature = file_signature(path)
        cached = self._metadata_cache.get(path, signature)
        if cached is not None:
            return cached
        saved = saved or {}
        digest = saved.get("content_hash") if saved.get("file_signature") == signature else None
        if not digest or not digest.startswith("sha256:"):
            digest = full_hash(path, self._cancel.is_set)
        fmt = path.rsplit(".", 1)[-1].lower()
        analysis = analyze_media_file(path, fmt)
        if fmt in MANAGED_DOCUMENT_FORMATS:
            mi = filename_metadata(path)
        elif fmt in COMIC_CONTAINER_FORMATS:
            mi = Metadata(os.path.splitext(os.path.basename(path))[0], [_("佚名")])
        else:
            try:
                with open(path, "rb") as stream:
                    mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
            except Exception:
                logging.exception("metadata parsing failed: %s", path)
                mi = None
            if not mi:
                mi = Metadata(os.path.splitext(os.path.basename(path))[0], [_("佚名")])
        mi.title = utils.super_strip(mi.title)
        mi.authors = [utils.super_strip(author) for author in mi.authors]
        if fmt in ("txt", "pdf"):
            mi.title = os.path.splitext(os.path.basename(path))[0]
            mi.authors = [_("佚名")]
        if file_signature(path) != signature:
            raise OSError("file changed while preparing metadata")
        result = {"metadata": mi, "analysis": analysis, "signature": signature, "hash": digest}
        # A cover pathname may refer to a Calibre temporary directory. Retain the
        # actual bytes so reuse never depends on its lifetime.
        if getattr(mi, "cover", None):
            try:
                with open(mi.cover, "rb") as cover:
                    data = cover.read(8 * 1024 * 1024 + 1)
                if len(data) <= 8 * 1024 * 1024:
                    mi.cover_data = ("jpg", data)
                    mi.cover = None
                else:
                    return result
            except OSError:
                return result
        self._metadata_cache.put(path, signature, result)
        return result

    @contextmanager
    def _write_batch(self):
        previous = getattr(self._local, "scan_batch", False)
        self._local.scan_batch = True
        self._local.scan_deletes = []
        self._local.scan_autofill = []
        try:
            yield
            self.session.commit()
            self._local.scan_batch = False
            for row_id, path, fmt, signature in self._local.scan_deletes:
                row = self.session.get(ScanFile, row_id)
                if row is not None:
                    if not self._delete_source_after_import(row, path, fmt, signature=signature):
                        with self._progress_lock:
                            self._progress["failed"] += 1
            if self._local.scan_autofill:
                AutoFillService().auto_fill_all(self._local.scan_autofill)
        except Exception:
            self.session.rollback()
            raise
        finally:
            self._local.scan_batch = previous

    def _process_rows(self, rows, process):
        iterator = iter(rows)
        while not self._cancel.is_set():
            first = next(iterator, None)
            if first is None:
                break
            with self._write_batch():
                # SQLite legacy transaction mode otherwise commits every released
                # SAVEPOINT. Establish a real outer transaction first.
                connection = self.session.connection()
                if connection.dialect.name == "sqlite" and not connection.connection.driver_connection.in_transaction:
                    connection.exec_driver_sql("BEGIN")
                for row in chain([first], islice(iterator, 19)):
                    if self._cancel.is_set():
                        break
                    delete_count = len(self._local.scan_deletes)
                    autofill_count = len(self._local.scan_autofill)
                    try:
                        with self.session.begin_nested():
                            process(row)
                        with self._progress_lock:
                            self._progress["processed"] += 1
                            if row.status in (ScanFile.FAILED, ScanFile.DELETE_FAILED):
                                self._progress["failed"] += 1
                    except InterruptedError:
                        break
                    except Exception as err:
                        del self._local.scan_deletes[delete_count:]
                        del self._local.scan_autofill[autofill_count:]
                        logging.exception("scan file operation failed: %s", row.path)
                        row.status = ScanFile.FAILED
                        self._set_row_data(row, processing_error=str(err))
                        if isinstance(err, InvalidMediaError):
                            self._set_row_data(row, analysis_error=err.message, analysis_error_code=err.code)
                        self.session.add(row)
                        with self._progress_lock:
                            self._progress["processed"] += 1
                            self._progress["failed"] += 1

    _watch_lock = threading.Lock()
    _watch_generation = 0
    _watch_status = {
        "state": "off",
        "queued": 0,
        "running": 0,
        "failed": 0,
        "last_scan_at": None,
        "message": "",
    }

    def get_watch_status(self):
        with self._watch_lock:
            return dict(self._watch_status)

    def _update_watch_status(self, **values):
        with self._watch_lock:
            self._watch_status.update(values)

    def stop_auto_watch(self, message=""):
        with self._watch_lock:
            self.__class__._watch_generation += 1
            self._watch_status.update({"state": "off", "message": message})
            return self.__class__._watch_generation

    @AsyncService.register_service
    def run_auto_watch(self, path_dir, user_id, import_mode=None, interval=None, limit=None, generation=None, run_once=False):
        import_mode = normalize_import_mode(import_mode)
        interval = max(5, int(interval or CONF.get("import_watch_interval_seconds", 30)))
        limit = max(1, int(limit or CONF.get("import_scan_batch_size", 500)))
        if generation is None:
            generation = self.__class__._watch_generation

        self._update_watch_status(state="starting", message="")
        events = FolderEvents(path_dir, SCAN_EXT)
        deadline = 0
        paths = None
        try:
            while True:
                with self._watch_lock:
                    current_generation = self.__class__._watch_generation
                if generation != current_generation or not CONF.get("import_auto_watch_enabled", False):
                    self._update_watch_status(state="off", message=_("自动监控已关闭"))
                    return
                try:
                    self._auto_cycle(path_dir, paths, user_id, import_mode, limit)
                    self._update_watch_status(
                        state="watching",
                        queued=0,
                        running=0,
                        last_scan_at=datetime.datetime.now().isoformat(timespec="seconds"),
                    )
                except Exception as err:
                    logging.exception("auto import watch failed")
                    self._update_watch_status(state="failed", message=str(err))
                if run_once or self._cancel.is_set():
                    # Cancellation pauses this monitor generation instead of immediately
                    # restarting the cancelled batch on the next poll.
                    self.stop_auto_watch(_("自动导入已停止"))
                    return
                if paths is None:
                    deadline = time.monotonic() + interval
                    events.close()
                    events = FolderEvents(path_dir, SCAN_EXT)
                while True:
                    if generation != self.__class__._watch_generation or not CONF.get("import_auto_watch_enabled", False):
                        return
                    paths, rescan = events.wait(min(1.0, max(0, deadline - time.monotonic())))
                    if rescan or time.monotonic() >= deadline:
                        paths = None
                        break
                    if paths:
                        break
        finally:
            events.close()

    @scan_operation("auto")
    def _auto_cycle(self, root, paths, user_id, import_mode, limit):
        self._update_watch_status(state="scanning")
        if paths is None:
            candidates = (path for batch in iter_scan_task_batches(root, limit, self._load_done_paths) for _, path, _ in batch)
        else:
            candidates = []
            root = os.path.realpath(root)
            for path in paths:
                absolute = os.path.abspath(path)
                relative = os.path.relpath(absolute, root)
                if (
                    os.path.commonpath([root, os.path.realpath(path)]) != root
                    or any(part.startswith((".", "@__")) for part in relative.split(os.sep))
                    or os.path.islink(path)
                    or not os.path.isfile(path)
                ):
                    continue
                if path not in self._load_done_paths([path]):
                    candidates.append(path)
            candidates = iter(candidates[:limit])
        # Materialize only a bounded path batch in the DB thread. The producer
        # parses files; the consumer alone touches both databases.
        candidates = iter(candidates)
        while not self._cancel.is_set():
            batch = list(islice(candidates, min(limit, 20)))
            if not batch:
                break
            scan_id = int(time.time())
            tasks = [(os.path.basename(path), path, path.rsplit(".", 1)[-1].lower()) for path in batch]
            with self._write_batch():
                self._register_scan_batch(tasks, scan_id)
            imported = []
            prepared = prepared_files(batch, self._prepare_file, self._cancel.is_set)

            def rows(prepared=prepared):
                for path, result in prepared:
                    row = self.session.query(ScanFile).filter(ScanFile.path == path).first()
                    if row is not None:
                        row._prepared_scan = result
                        yield row

            def consume(row, scan_id=scan_id, imported=imported):
                result = row._prepared_scan
                del row._prepared_scan
                self._scan_metadata_row(row, result)
                if row.status == ScanFile.READY and not self._cancel.is_set():
                    self._update_watch_status(state="importing", running=1)
                    row.import_id = scan_id
                    self._import_row(row, user_id, import_mode, scan_id, imported, result)

            try:
                self._process_rows(rows(), consume)
            finally:
                prepared.close()
            if imported:
                AutoFillService().auto_fill_all(imported)
        if not self._cancel.is_set():
            # Include READY records left by an earlier interrupted generation.
            self._do_import(None, user_id, import_mode=import_mode)

    def start_auto_watch(self, path_dir, user_id, import_mode=None, run_once=False):
        with self._watch_lock:
            self.__class__._watch_generation += 1
            generation = self.__class__._watch_generation
        run_once = run_once or not self.async_mode()
        self.run_auto_watch(
            path_dir,
            user_id,
            import_mode=import_mode,
            interval=CONF.get("import_watch_interval_seconds", 30),
            limit=CONF.get("import_scan_batch_size", 500),
            generation=generation,
            run_once=run_once,
        )
        return generation

    def save_or_rollback(self, row):
        try:
            # 直接使用session.add和flush，避免多次commit导致的事务冲突
            self.session.add(row)
            # 更新时间
            row.update_time = datetime.datetime.now()
            self.session.flush()
            bid = "[ book-id=%s ]" % row.book_id
            logging.info("update: status=%-5s, path=%s %s", row.status, row.path, bid if row.book_id > 0 else "")
            # Batch ownership stays with the caller.
            if not getattr(self._local, "scan_batch", False):
                self.session.commit()
            return True
        except Exception as err:
            logging.exception("save error: %s", err)
            if getattr(self._local, "scan_batch", False):
                raise
            # 回滚事务
            self.session.rollback()
            return False

    def build_query(self, hashlist):
        query = self.session.query(ScanFile).filter(ScanFile.status == ScanFile.READY)  # .filter(ScanFile.import_id == 0)
        if isinstance(hashlist, (list, tuple)):
            query = query.filter(ScanFile.hash.in_(hashlist))
        elif isinstance(hashlist, str):
            query = query.filter(ScanFile.hash == hashlist)
        return query

    @AsyncService.register_service
    def do_scan(self, path_dir, limit=None):
        return self._do_scan(path_dir, limit=limit)

    def _load_done_paths(self, paths):
        """Fetch completed paths only for the current candidate batch, not the whole library."""
        query = self.session.query(ScanFile.path).filter(
            ScanFile.path.in_(paths),
            ScanFile.status != ScanFile.NEW,
            ~ScanFile.hash.like("fstat:%"),
        )
        return {row[0] for row in query}

    @scan_operation("scan")
    def _do_scan(self, path_dir, limit=None):
        logging.info("start to scan %s", path_dir)
        scan_id = int(time.time())
        processed = 0
        for tasks in iter_scan_task_batches(path_dir, limit, self._load_done_paths):
            if self._cancel.is_set():
                break
            with self._write_batch():
                self._register_scan_batch(tasks, scan_id)
            processed += len(tasks)
        logging.info("scan %s: candidates=%d, limit=%s", path_dir, processed, limit)
        if processed:
            query = self.session.query(ScanFile).filter(
                ScanFile.scan_id == scan_id,
                or_(ScanFile.status == ScanFile.NEW, ScanFile.hash.like("fstat:%")),
            )
            self._scan_metadata(iter_scan_rows(query))

    def _register_scan_batch(self, tasks, scan_id):
        for fname, fpath, fmt in tasks:
            if self._cancel.is_set():
                break
            # logging.info("Scan: %s", fpath)
            # 检查是否已存在相同路径的记录
            row = self.session.query(ScanFile).filter(ScanFile.path == fpath).first()
            if row is not None:
                # 如果已经有相同的文件记录，则处理现有记录
                # 更新扫描ID为当前扫描ID
                row.scan_id = scan_id
                # 更新时间
                row.update_time = datetime.datetime.now()
                # 只处理NEW状态的记录，其他状态跳过
                if row.status == ScanFile.NEW or row.hash.startswith("fstat:"):
                    row.status = ScanFile.NEW
                    self.save_or_rollback(row)
                continue

            # 检查是否已存在相同真实哈希的记录
            stat = os.stat(fpath)
            md5 = hashlib.md5(fpath.encode("UTF-8")).hexdigest()
            temp_hash = "fstat:%s/%s" % (stat.st_size, md5)

            # 创建文件对象
            row = ScanFile(fpath, temp_hash, scan_id)
            if not self.save_or_rollback(row):
                continue

    def _scan_metadata(self, rows):
        self._process_rows(rows, self._scan_metadata_row)

    def _scan_metadata_row(self, row, prepared=None):
        fpath = row.path
        try:
            if isinstance(prepared, InvalidMediaError):
                # Persist a verified content hash even for invalid media, so an
                # automatic scan does not retry it ahead of every later file.
                prepared = None
            if isinstance(prepared, Exception):
                raise prepared
            signature = file_signature(fpath)
            if prepared is None or prepared["signature"] != signature:
                prepared = self._metadata_cache.get(fpath, signature)
                if prepared is None:
                    saved = row.data or {}
                    digest = saved.get("content_hash") if saved.get("file_signature") == signature else None
                    if not digest or not digest.startswith("sha256:"):
                        digest = full_hash(fpath, self._cancel.is_set)
                    if file_signature(fpath) != signature:
                        raise OSError("file changed while hashing")
                    prepared = {"hash": digest, "signature": signature}
        except FileNotFoundError:
            row.status = ScanFile.DROP
            self.save_or_rollback(row)
            return
        except InvalidMediaError as err:
            row.status = ScanFile.FAILED
            self._set_row_data(row, analysis_error=err.message, analysis_error_code=err.code)
            self.save_or_rollback(row)
            return
        if self._cancel.is_set():
            raise InterruptedError("scan cancelled")
        real_hash = prepared["hash"]
        # 检查真实哈希值是否已经存在
        existing = self.session.query(ScanFile).filter(ScanFile.hash == real_hash).first()
        if existing and existing.id != row.id:
            # 如果已经有相同的真实哈希值记录，且不是当前记录
            # 需额外检查该旧记录关联的书籍是否仍存在
            # 若书籍已被删除，旧记录应被清理，不应阻止重新导入
            book_still_exists = False
            if existing.book_id:
                books = self.db.get_data_as_dict(ids=[existing.book_id])
                book_still_exists = len(books) > 0
            if book_still_exists:
                row.status = ScanFile.DROP
                if not self.save_or_rollback(row):
                    return
                return
            else:
                # 书籍已被删除，清理旧 ScanFile 记录，允许重新导入
                logging.info("书籍已删除，清理旧扫描记录并允许重新导入: %s", fpath)
                self.session.delete(existing)
                self.session.flush()

        # 更新为真实的哈希值
        row.hash = real_hash
        if not self.save_or_rollback(row):
            return

        if "metadata" not in prepared:
            hashed_signature = prepared["signature"]
            try:
                prepared = self._prepare_file(fpath, {"content_hash": real_hash, "file_signature": hashed_signature})
            except InvalidMediaError as err:
                row.status = ScanFile.FAILED
                self._set_row_data(row, analysis_error=err.message, analysis_error_code=err.code)
                self.save_or_rollback(row)
                return
            if prepared["signature"] != hashed_signature or prepared["hash"] != real_hash:
                raise OSError("file changed between hashing and metadata preparation")
        analysis = prepared["analysis"]
        mi = prepared["metadata"]
        fmt = fpath.rsplit(".", 1)[-1].lower()
        self._set_row_data(row, file_signature=prepared["signature"], content_hash=real_hash, **analysis.to_dict())

        row.title = mi.title
        # 使用mi.authors列表而不是mi.author_sort，避免作者信息丢失
        row.author = mi.authors[0] if mi.authors else ""
        row.publisher = mi.publisher
        row.tags = ", ".join(mi.tags)
        row.status = ScanFile.READY  # 设置为可处理

        # TODO calibre提供的书籍重复接口只有对比title；应当提前对整个书库的文件做哈希，才能准确去重
        ids = self.db.books_with_same_title(mi)
        if ids:
            # 区分同名同作者和同名不同作者的书籍
            for b in matching_import_books(mi, fmt, self.db.get_data_as_dict(ids=list(ids))):
                book_authors = b.get("authors", [])
                mi_authors = mi.authors

                # 检查作者是否相同
                if fmt in MANAGED_DOCUMENT_FORMATS or set(book_authors) == set(mi_authors):
                    if fmt.upper() in b.get("available_formats", ""):
                        row.book_id = b["id"]
                        row.status = ScanFile.EXIST
                        break

            # 如果是同名不同作者，不标记为已存在，允许导入
        # 无论是否已存在（EXIST），都必须先落库，否则book_id/status变更会在
        # 会话关闭时被回滚，导致扫描列表仍显示为可导入
        if not self.save_or_rollback(row):
            return
        if row.status == ScanFile.EXIST:
            return

    def _set_row_data(self, row, **values):
        data = dict(row.data or {})
        data.update(values)
        row.data = data

    def _library_format_exists(self, row, fmt):
        if not row.book_id:
            return False
        try:
            target = self.db.format_abspath(row.book_id, fmt.upper(), index_is_id=True)
            return bool(target and os.path.exists(target))
        except Exception as err:
            # Calibre versions used by tests and deployments differ. If the import
            # API returned a book id but format_abspath is unavailable, keep the
            # legacy behavior and do not block source cleanup on introspection.
            logging.info("skip library format existence check for book %s: %s", row.book_id, err)
            return True

    def _delete_source_after_import(self, row, fpath, fmt, signature=None):
        if not self._library_format_exists(row, fmt):
            row.status = ScanFile.DELETE_FAILED
            self._set_row_data(row, delete_error=_("书库目标文件未确认存在，未删除源文件"))
            self.save_or_rollback(row)
            return False

        try:
            if signature is not None and file_signature(fpath) != signature:
                raise OSError("source file changed after import; retained instead of deleting")
            os.remove(fpath)
            logging.info("删除源文件: %s", fpath)
            return True
        except Exception as err:
            logging.error("删除源文件失败: %s, %s", fpath, err)
            row.status = ScanFile.DELETE_FAILED
            self._set_row_data(row, delete_error=str(err))
            self.save_or_rollback(row)
            return False

    def _mark_imported(self, row, fpath, fmt, import_mode, delete_source=True):
        row.status = ScanFile.IMPORTED
        self._set_row_data(row, import_mode=import_mode)
        self.save_or_rollback(row)
        if import_mode == IMPORT_MODE_MOVE and delete_source:
            if getattr(self._local, "scan_batch", False):
                self._local.scan_deletes.append((row.id, fpath, fmt, (row.data or {}).get("file_signature")))
            else:
                self._delete_source_after_import(row, fpath, fmt, signature=(row.data or {}).get("file_signature"))

    def _set_item_media_type(self, book_id, user_id, media_type, item=None):
        item = item or self.session.query(Item).filter(Item.book_id == book_id).first()
        if not item:
            item = Item()
            item.book_id = book_id
            item.collector_id = user_id
            try:
                item.create_time = self.db.new_api.field_for("timestamp", book_id)
            except Exception:
                pass
            self.session.add(item)
        if not item.media_type_locked:
            item.media_type = merge_media_type(item.media_type, media_type)
        return item

    def _ensure_indexed_item(self, book_id, user_id, fpath, media_type):
        item = self._set_item_media_type(book_id, user_id, media_type)
        item.src_path = os.path.realpath(os.path.abspath(fpath))
        return item

    def _mark_indexed(self, row, mi, fpath, fmt, import_id, user_id, media_type, same_author_book_id=None):
        try:
            book_id, created = add_external_index_record(
                self.db,
                self.session,
                mi,
                fpath,
                fmt,
                existing_book_id=same_author_book_id,
            )
        except Exception as err:
            logging.exception("index external book failed: %s", err)
            row.status = ScanFile.FAILED
            self._set_row_data(row, import_mode=IMPORT_MODE_INDEX, index_error=str(err))
            self.save_or_rollback(row)
            return False

        row.import_id = import_id
        row.book_id = book_id
        row.status = ScanFile.INDEXED
        self._ensure_indexed_item(book_id, user_id, fpath, media_type)
        self._set_row_data(
            row,
            import_mode=IMPORT_MODE_INDEX,
            source_path=os.path.realpath(os.path.abspath(fpath)),
            format=fmt.upper(),
            created_book=created,
            **{EXTERNAL_INDEX_FLAG: True},
            index_note=_("仅索引模式已将原始文件路径写入 Calibre 书库"),
        )
        saved = self.save_or_rollback(row)
        if saved and fmt in MANAGED_DOCUMENT_FORMATS:
            if getattr(self._local, "scan_batch", False):
                self._local.scan_autofill.append(book_id)
            else:
                AutoFillService().auto_fill(book_id)
        return saved

    @AsyncService.register_service
    def do_import(self, hashlist, user_id, delete_after=False, import_mode=None):
        return self._do_import(hashlist, user_id, delete_after=delete_after, import_mode=import_mode)

    @scan_operation("import")
    def _do_import(self, hashlist, user_id, delete_after=False, import_mode=None):
        import_mode = normalize_import_mode(import_mode, delete_after)
        # 生成任务ID
        import_id = int(time.time())

        query = self.build_query(hashlist)

        # 检查是否有可导入的书籍
        if query.count() == 0:
            logging.info("没有找到可导入的书籍文件")
            return

        query.update({ScanFile.import_id: import_id}, synchronize_session=False)
        self.session.commit()

        imported = []

        self._process_rows(
            iter_scan_rows(query.filter(ScanFile.import_id == import_id)),
            lambda row: self._import_row(row, user_id, import_mode, import_id, imported),
        )

        # 全部导入完毕后，开始拉取书籍信息
        if imported:
            AutoFillService().auto_fill_all(imported)

    def _import_row(self, row, user_id, import_mode, import_id, imported, prepared=None):
        fpath = row.path
        fmt = fpath.rsplit(".", 1)[-1].lower()
        try:
            if isinstance(prepared, Exception):
                raise prepared
            if prepared is None or prepared["signature"] != file_signature(fpath):
                prepared = self._prepare_file(fpath, row.data)
        except FileNotFoundError:
            row.status = ScanFile.DROP
            self.save_or_rollback(row)
            return
        if self._cancel.is_set():
            raise InterruptedError("import cancelled")
        if (row.data or {}).get("file_signature") not in (None, prepared["signature"]):
            # Re-enter scan/dedup before importing a file that changed after preview.
            row.status = ScanFile.NEW
            self._set_row_data(row, processing_error=_("文件已变化，请重新扫描"))
            self.save_or_rollback(row)
            return
        analysis = prepared["analysis"]
        mi = prepared["metadata"]
        row.status = ScanFile.IMPORTING
        self._set_row_data(row, import_mode=import_mode, file_signature=prepared["signature"], **analysis.to_dict())
        self.save_or_rollback(row)

        # 再次检查是否有重复书籍
        ids = self.db.books_with_same_title(mi)
        if ids:
            # 区分同名同作者和同名不同作者的书籍
            same_author_book_id = None

            for b in matching_import_books(mi, fmt, self.db.get_data_as_dict(ids=list(ids))):
                book_authors = b.get("authors", [])
                mi_authors = mi.authors

                # 检查作者是否相同
                if fmt in MANAGED_DOCUMENT_FORMATS or set(book_authors) == set(mi_authors):
                    same_author_book_id = b["id"]
                    if fmt.upper() in b.get("available_formats", ""):
                        row.status = ScanFile.EXIST
                        self._set_row_data(row, import_mode=import_mode)
                        self.save_or_rollback(row)
                        break

            if same_author_book_id and row.status != ScanFile.EXIST:
                if import_mode == IMPORT_MODE_INDEX:
                    logging.info("index [%s] from %s with existing book %s", repr(mi.title), fpath, same_author_book_id)
                    self._mark_indexed(
                        row,
                        mi,
                        fpath,
                        fmt,
                        import_id,
                        user_id,
                        analysis.media_type,
                        same_author_book_id=same_author_book_id,
                    )
                    return

                # 同名同作者，添加格式到现有书籍
                row.book_id = same_author_book_id
                logging.info("import [%s] from %s with format %s", repr(mi.title), fpath, fmt)
                self.db.add_format(row.book_id, fmt.upper(), fpath, True)
                self._set_item_media_type(row.book_id, user_id, analysis.media_type)
                self._mark_imported(row, fpath, fmt, import_mode)
                if fmt in MANAGED_DOCUMENT_FORMATS:
                    imported.append(row.book_id)
            elif row.status != ScanFile.EXIST:
                if import_mode == IMPORT_MODE_INDEX:
                    logging.info("index [%s] from %s as new external file", repr(mi.title), fpath)
                    self._mark_indexed(row, mi, fpath, fmt, import_id, user_id, analysis.media_type)
                    return

                # 同名不同作者，导入为新书
                logging.info("import [%s] from %s as new book (different author)", repr(mi.title), fpath)
                row.book_id = self.db.import_book(mi, [fpath])
                self._mark_imported(row, fpath, fmt, import_mode)

                self._set_item_media_type(row.book_id, user_id, analysis.media_type)
                self.session.flush()
                imported.append(row.book_id)
        else:
            if import_mode == IMPORT_MODE_INDEX:
                logging.info("index [%s] from %s", repr(mi.title), fpath)
                self._mark_indexed(row, mi, fpath, fmt, import_id, user_id, analysis.media_type)
                return

            logging.info("import [%s] from %s", repr(mi.title), fpath)
            row.book_id = self.db.import_book(mi, [fpath])
            self._mark_imported(row, fpath, fmt, import_mode)

            self._set_item_media_type(row.book_id, user_id, analysis.media_type)
            self.session.flush()
            imported.append(row.book_id)
