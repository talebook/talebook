#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import datetime
import hashlib
import logging
import os
import threading
import time

from webserver import loader, utils
from webserver.i18n import _
from webserver.models import Item, ScanFile
from webserver.services import AsyncService
from webserver.services.autofill import AutoFillService
from webserver.services.external_index import (
    EXTERNAL_INDEX_FLAG,
    add_external_index_record,
)
from webserver.services.media_analysis import (
    COMIC_CONTAINER_FORMATS,
    SUPPORTED_MEDIA_FORMATS,
    InvalidMediaError,
    analyze_media_file,
    merge_media_type,
)


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


class ScanService(AsyncService):
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
        while True:
            with self._watch_lock:
                current_generation = self.__class__._watch_generation
            if generation != current_generation or not CONF.get("import_auto_watch_enabled", False):
                self._update_watch_status(state="off", message=_("自动监控已关闭"))
                return

            try:
                self._update_watch_status(state="scanning", message="")
                self._do_scan(path_dir, limit=limit)
                self.session.rollback()
                query = self.session.query(ScanFile).filter(ScanFile.status == ScanFile.READY)
                queued = query.count()
                failed = (
                    self.session.query(ScanFile).filter(ScanFile.status.in_([ScanFile.FAILED, ScanFile.DELETE_FAILED])).count()
                )
                self._update_watch_status(
                    state="queued" if queued else "watching",
                    queued=queued,
                    running=0,
                    failed=failed,
                    last_scan_at=datetime.datetime.now().isoformat(timespec="seconds"),
                    message="",
                )
                if queued:
                    self._update_watch_status(state="importing", running=queued)
                    self._do_import(None, user_id, import_mode=import_mode)
                    self.session.rollback()
                    failed = (
                        self.session.query(ScanFile)
                        .filter(ScanFile.status.in_([ScanFile.FAILED, ScanFile.DELETE_FAILED]))
                        .count()
                    )
                    self._update_watch_status(
                        state="failed" if failed else "watching",
                        queued=0,
                        running=0,
                        failed=failed,
                        last_scan_at=datetime.datetime.now().isoformat(timespec="seconds"),
                    )
            except Exception as err:
                logging.exception("auto import watch failed: %s", err)
                self._update_watch_status(state="failed", message=str(err))

            if run_once:
                return
            time.sleep(interval)

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
            # 提交事务
            self.session.commit()
            return True
        except Exception as err:
            logging.exception("save error: %s", err)
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

    def _do_scan(self, path_dir, limit=None):
        from calibre.ebooks.metadata.meta import get_metadata

        logging.info("<%s> we are: db=%s, session=%s", self, self.db, self.session)
        logging.info("start to scan %s", path_dir)

        # 先检查目录中是否有待扫描的书籍
        has_books = False
        tasks = []
        for dirpath, dirnames, filenames in os.walk(path_dir):
            # 排除隐藏文件夹（以.开头或@__thumb等）
            dirnames[:] = [
                d
                for d in dirnames
                if not (d.startswith(".") or d.startswith("@__") or os.path.islink(os.path.join(dirpath, d)))
            ]

            for fname in filenames:
                # 排除隐藏文件
                if fname.startswith("."):
                    continue

                fpath = os.path.join(dirpath, fname)
                if os.path.islink(fpath) or not os.path.isfile(fpath):
                    continue

                fmt = fpath.split(".")[-1].lower()
                if fmt in SCAN_EXT:
                    has_books = True
                    tasks.append((fname, fpath, fmt))
                    if limit and len(tasks) >= limit:
                        break
            if limit and len(tasks) >= limit:
                break

        # 检查是否有符合条件的书籍文件
        if not has_books:
            logging.info("在目录 %s 中没有找到符合条件的书籍文件", path_dir)
            return

        # 生成任务ID
        scan_id = int(time.time())
        logging.info("========== start to check files size & name ============")

        rows = []
        inserted_hash = set()
        for fname, fpath, fmt in tasks:
            # logging.info("Scan: %s", fpath)
            # 检查是否已存在相同路径的记录
            samefiles = self.session.query(ScanFile).filter(ScanFile.path == fpath)
            if samefiles.count() > 0:
                # 如果已经有相同的文件记录，则处理现有记录
                row = samefiles.first()
                # 更新扫描ID为当前扫描ID
                row.scan_id = scan_id
                # 更新时间
                row.update_time = datetime.datetime.now()
                # 只处理NEW状态的记录，其他状态跳过
                if row.status == ScanFile.NEW:
                    rows.append(row)
                else:
                    # 检查现有记录的哈希是否为真实哈希（非临时哈希），如果是则跳过
                    if not row.hash.startswith("fstat:"):
                        continue
                    # 如果是临时哈希，尝试重新处理
                    rows.append(row)
                continue

            # 检查是否已存在相同真实哈希的记录
            stat = os.stat(fpath)
            md5 = hashlib.md5(fname.encode("UTF-8")).hexdigest()
            temp_hash = "fstat:%s/%s" % (stat.st_size, md5)

            # 创建文件对象
            row = ScanFile(fpath, temp_hash, scan_id)
            if not self.save_or_rollback(row):
                continue
            rows.append(row)
            inserted_hash.add(temp_hash)
        # self.session.bulk_save_objects(rows)

        logging.info("========== start to check files hash & meta ============")
        # 检查文件哈希值，检查DB重复情况
        for row in rows:
            fpath = row.path
            fname = os.path.basename(fpath)

            # 读取文件，计算哈希值
            sha256 = hashlib.sha256()
            try:
                with open(fpath, "rb") as f:
                    # Read and update hash string value in blocks of 4K
                    for byte_block in iter(lambda: f.read(4096), b""):
                        sha256.update(byte_block)
            except FileNotFoundError:
                logging.warning("扫描时文件已不存在，跳过: %s", fpath)
                row.status = ScanFile.DROP
                self.save_or_rollback(row)
                continue

            real_hash = "sha256:" + sha256.hexdigest()

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
                        continue
                    continue
                else:
                    # 书籍已被删除，清理旧 ScanFile 记录，允许重新导入
                    logging.info("书籍已删除，清理旧扫描记录并允许重新导入: %s", fpath)
                    self.session.delete(existing)
                    self.session.commit()

            # 更新为真实的哈希值
            row.hash = real_hash
            if not self.save_or_rollback(row):
                continue

            # 在解析 metadata 前先验证签名、容器结构与资源预算，并持久化分析结果。
            fmt = fpath.split(".")[-1].lower()
            try:
                analysis = analyze_media_file(fpath, fmt)
            except InvalidMediaError as err:
                logging.warning("media analysis failed for %s: %s", fpath, err.message)
                row.status = ScanFile.FAILED
                self._set_row_data(row, analysis_error=err.message, analysis_error_code=err.code, declared_format=fmt)
                self.save_or_rollback(row)
                continue
            self._set_row_data(row, **analysis.to_dict())

            mi = None
            if fmt in COMIC_CONTAINER_FORMATS:
                from calibre.ebooks.metadata.book.base import Metadata

                mi = Metadata(os.path.splitext(fname)[0], [_("佚名")])
            else:
                try:
                    with open(fpath, "rb") as stream:
                        try:
                            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                        except Exception as err:
                            logging.error("Failed to parse metadata for %s: %s", fpath, err)
                            logging.exception("Error details:")
                except FileNotFoundError:
                    logging.warning("解析元数据时文件已不存在，跳过: %s", fpath)
                    row.status = ScanFile.DROP
                    self.save_or_rollback(row)
                    continue

            if not mi:
                # 解析失败时构造与do_import()解析失败分支一致的兜底metadata（文件名+“佚名”），
                # 避免这里另用"Unknown"作者且跳过查重，导致已入库的解析失败文件无法被判定为重复
                from calibre.ebooks.metadata.book.base import Metadata

                mi = Metadata(os.path.splitext(fname)[0], [_("佚名")])

            mi.title = utils.super_strip(mi.title)
            mi.authors = [utils.super_strip(s) for s in mi.authors]

            # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
            # 作者也需要强制置为“佚名”，与do_import()保持一致，
            # 否则本步骤的查重会用文件原始（不可靠）的作者信息比对，
            # 与实际入库时使用的“佚名”作者不一致，导致已入库文件永远无法被判定为重复
            if fmt in ["txt", "pdf"]:
                mi.title = os.path.splitext(fname)[0]
                mi.authors = [_("佚名")]

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
                for b in self.db.get_data_as_dict(ids=list(ids)):
                    book_authors = b.get("authors", [])
                    mi_authors = mi.authors

                    # 检查作者是否相同
                    if set(book_authors) == set(mi_authors):
                        if fmt.upper() in b.get("available_formats", ""):
                            row.book_id = b["id"]
                            row.status = ScanFile.EXIST
                            break

                # 如果是同名不同作者，不标记为已存在，允许导入
            # 无论是否已存在（EXIST），都必须先落库，否则book_id/status变更会在
            # 会话关闭时被回滚，导致扫描列表仍显示为可导入
            if not self.save_or_rollback(row):
                continue
            if row.status == ScanFile.EXIST:
                continue

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

    def _delete_source_after_import(self, row, fpath, fmt):
        if not self._library_format_exists(row, fmt):
            row.status = ScanFile.DELETE_FAILED
            self._set_row_data(row, delete_error=_("书库目标文件未确认存在，未删除源文件"))
            self.save_or_rollback(row)
            return False

        try:
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
            self._delete_source_after_import(row, fpath, fmt)

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
        return self.save_or_rollback(row)

    @AsyncService.register_service
    def do_import(self, hashlist, user_id, delete_after=False, import_mode=None):
        return self._do_import(hashlist, user_id, delete_after=delete_after, import_mode=import_mode)

    def _do_import(self, hashlist, user_id, delete_after=False, import_mode=None):
        from calibre.ebooks.metadata.meta import get_metadata

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

        # 逐个处理
        for row in query.all():
            fpath = row.path
            fname = os.path.basename(row.path)
            fmt = fpath.split(".")[-1].lower()
            row.status = ScanFile.IMPORTING
            self._set_row_data(row, import_mode=import_mode)
            self.save_or_rollback(row)
            try:
                analysis = analyze_media_file(fpath, fmt)
            except InvalidMediaError as err:
                logging.warning("media analysis failed during import for %s: %s", fpath, err.message)
                row.status = ScanFile.FAILED
                self._set_row_data(row, analysis_error=err.message, analysis_error_code=err.code, declared_format=fmt)
                self.save_or_rollback(row)
                continue
            self._set_row_data(row, **analysis.to_dict())

            mi = None
            if fmt in COMIC_CONTAINER_FORMATS:
                from calibre.ebooks.metadata.book.base import Metadata

                mi = Metadata(os.path.splitext(fname)[0], [_("佚名")])
            else:
                try:
                    with open(fpath, "rb") as stream:
                        try:
                            mi = get_metadata(stream, stream_type=fmt, use_libprs_metadata=True)
                        except Exception as err:
                            logging.error("Failed to parse metadata for %s during import: %s", fpath, err)
                            logging.exception("Error details:")
                            # 创建一个简单的metadata对象，避免导入失败
                            from calibre.ebooks.metadata.book.base import Metadata

                            mi = Metadata()
                            mi.title = os.path.splitext(fname)[0]
                            mi.authors = [_("佚名")]
                        else:
                            # 处理metadata
                            mi.title = utils.super_strip(mi.title)
                            mi.authors = [utils.super_strip(s) for s in mi.authors]

                            # 非结构化的格式，calibre无法识别准确的信息，直接从文件名提取
                            if fmt in ["txt", "pdf"]:
                                mi.title = os.path.splitext(fname)[0]
                                mi.authors = [_("佚名")]
                except FileNotFoundError:
                    logging.warning("导入时文件已不存在，跳过: %s", fpath)
                    row.status = ScanFile.DROP
                    self.save_or_rollback(row)
                    continue

            # 再次检查是否有重复书籍
            ids = self.db.books_with_same_title(mi)
            if ids:
                # 区分同名同作者和同名不同作者的书籍
                same_author_book_id = None

                for b in self.db.get_data_as_dict(ids=list(ids)):
                    book_authors = b.get("authors", [])
                    mi_authors = mi.authors

                    # 检查作者是否相同
                    if set(book_authors) == set(mi_authors):
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
                        continue

                    # 同名同作者，添加格式到现有书籍
                    row.book_id = same_author_book_id
                    logging.info("import [%s] from %s with format %s", repr(mi.title), fpath, fmt)
                    self.db.add_format(row.book_id, fmt.upper(), fpath, True)
                    self._set_item_media_type(row.book_id, user_id, analysis.media_type)
                    self._mark_imported(row, fpath, fmt, import_mode)
                elif row.status != ScanFile.EXIST:
                    if import_mode == IMPORT_MODE_INDEX:
                        logging.info("index [%s] from %s as new external file", repr(mi.title), fpath)
                        self._mark_indexed(row, mi, fpath, fmt, import_id, user_id, analysis.media_type)
                        continue

                    # 同名不同作者，导入为新书
                    logging.info("import [%s] from %s as new book (different author)", repr(mi.title), fpath)
                    row.book_id = self.db.import_book(mi, [fpath])
                    self._mark_imported(row, fpath, fmt, import_mode)

                    # 添加关联表
                    item = Item()
                    item.book_id = row.book_id
                    item.collector_id = user_id
                    item.media_type = analysis.media_type
                    try:
                        item.create_time = self.db.new_api.field_for("timestamp", row.book_id)
                    except Exception:
                        pass
                    try:
                        item.save()
                        imported.append(row.book_id)
                    except Exception as err:
                        self.session.rollback()
                        logging.error("save link error: %s", err)
            else:
                if import_mode == IMPORT_MODE_INDEX:
                    logging.info("index [%s] from %s", repr(mi.title), fpath)
                    self._mark_indexed(row, mi, fpath, fmt, import_id, user_id, analysis.media_type)
                    continue

                logging.info("import [%s] from %s", repr(mi.title), fpath)
                row.book_id = self.db.import_book(mi, [fpath])
                self._mark_imported(row, fpath, fmt, import_mode)

                # 添加关联表
                item = Item()
                item.book_id = row.book_id
                item.collector_id = user_id
                item.media_type = analysis.media_type
                try:
                    item.create_time = self.db.new_api.field_for("timestamp", row.book_id)
                except Exception:
                    pass
                try:
                    item.save()
                    imported.append(row.book_id)
                except Exception as err:
                    self.session.rollback()
                    logging.error("save link error: %s", err)

        # 全部导入完毕后，开始拉取书籍信息
        if imported:
            AutoFillService().auto_fill_all(imported)
