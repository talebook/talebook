#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import logging
import os
import threading
import time

from webserver import loader
from webserver.i18n import _
from webserver.services import AsyncService
from webserver.services.background_service import BackgroundService, BackgroundTask
from webserver.services.convert import ConvertService


CONF = loader.get_settings()


class BatchConvertService(AsyncService):
    """批量转换Kindle格式(azw3/mobi)为EPUB格式的服务"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized"):
            return
        self.count_total = 0
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0
        self.is_running = False
        self.current_book_id = None
        self.start_time = None
        self.task_id = None
        self._initialized = True
        AsyncService.__init__(self)

    def status(self):
        return {
            "is_running": self.is_running,
            "current_book_id": self.current_book_id,
            "start_time": self.start_time,
            "count_total": self.count_total,
            "count_skip": self.count_skip,
            "count_done": self.count_done,
            "count_fail": self.count_fail,
            "task_id": self.task_id,
        }

    def _has_kindle_format(self, book_id: int) -> tuple:
        try:
            mi = self.db.get_metadata(book_id, index_is_id=True)
            if not mi:
                return (False, None, None)

            formats = mi.formats
            if not formats:
                return (False, None, None)

            formats_lower = [f.lower() for f in formats]
            if "epub" in formats_lower:
                return (False, None, None)

            kindle_format = None
            if "azw3" in formats_lower:
                kindle_format = "azw3"
            elif "mobi" in formats_lower:
                kindle_format = "mobi"

            if not kindle_format:
                return (False, None, None)

            kindle_path = self.db.format_abspath(book_id, kindle_format.upper(), index_is_id=True)
            if not kindle_path:
                return (False, None, None)

            return (True, kindle_format, kindle_path)
        except Exception as e:
            logging.error("[BatchConvert] Failed to check formats for id=%d: %s", book_id, e)
            return (False, None, None)

    def _collect_books_to_convert(self, idlist: list) -> list:
        books_to_convert = []

        if idlist is None or len(idlist) == 0:
            all_book_ids = list(self.db.all_book_ids())
            logging.info("[BatchConvert] Scanning all books for Kindle formats")
        else:
            all_book_ids = idlist
            logging.info("[BatchConvert] Scanning %d specified books for Kindle formats", len(all_book_ids))

        for book_id in all_book_ids:
            has_kindle, kindle_format, kindle_path = self._has_kindle_format(book_id)
            if has_kindle:
                books_to_convert.append((book_id, kindle_format, kindle_path))

        logging.info("[BatchConvert] Found %d books to convert", len(books_to_convert))
        return books_to_convert

    def _convert_one_book(self, book_id: int, kindle_format: str, kindle_path: str) -> bool:
        try:
            logging.info("[BatchConvert] Converting book id=%d from %s to epub", book_id, kindle_format)
            new_path = os.path.join(CONF["convert_path"], f"batch-convert-{book_id}-{int(time.time())}.epub")
            progress_file = ConvertService().get_path_progress(book_id)
            ok = ConvertService().do_ebook_convert(kindle_path, new_path, progress_file)
            if not ok:
                logging.error("[BatchConvert] Failed to convert book id=%d", book_id)
                return False

            with open(new_path, "rb") as f:
                self.db.add_format(book_id, "EPUB", f, index_is_id=True)

            try:
                os.remove(new_path)
            except Exception as e:
                logging.warning("[BatchConvert] Failed to delete temp file %s: %s", new_path, e)
            logging.info("[BatchConvert] Successfully converted book id=%d to epub", book_id)
            return True
        except Exception as e:
            logging.error("[BatchConvert] Failed to convert book id=%d: %s", book_id, e)
            return False

    @AsyncService.register_service
    def convert_all(self, user_id, idlist: list):
        self.is_running = True
        self.start_time = time.time()
        self.count_skip = 0
        self.count_done = 0
        self.count_fail = 0

        logging.info("[BatchConvert] Starting batch conversion task")
        self.add_msg(user_id, "success", _("Kindle转EPUB任务已启动"))
        books_to_convert = self._collect_books_to_convert(idlist)
        self.count_total = len(books_to_convert)

        if self.count_total == 0:
            logging.info("[BatchConvert] No books to convert")
            self.is_running = False
            self.add_msg(user_id, "success", _("Kindle转EPUB任务已结束，未找到需要转换的书籍"))
            return

        try:
            task = BackgroundService().update_task(
                service_type=BackgroundTask.SERVICE_TYPE_CONVERT,
                service_item=_("Kindle格式转EPUB"),
                progress=0,
                progress_data={
                    "total": self.count_total,
                    "done": 0,
                    "skip": 0,
                    "fail": 0,
                },
            )
            self.task_id = task.id
        except Exception as e:
            logging.error("[BatchConvert] Failed to create background task: %s", e)
            self.task_id = None

        for book_id, kindle_format, kindle_path in books_to_convert:
            self.current_book_id = book_id
            ok = self._convert_one_book(book_id, kindle_format, kindle_path)
            if ok:
                self.count_done += 1
            else:
                self.count_fail += 1
            self._update_task_progress()

        self._finish_task()
        msg = _("Kindle转EPUB任务已完成，成功转换%d本书，%d本书转换失败，%d本书跳过") % (
            self.count_done,
            self.count_fail,
            self.count_skip,
        )
        if self.count_fail + self.count_skip > 0:
            self.add_msg(user_id, "warning", msg)
        else:
            self.add_msg(user_id, "success", msg)

    def _update_task_progress(self):
        """更新后台任务进度"""
        if not self.task_id:
            return
        try:
            processed = self.count_done + self.count_skip + self.count_fail
            progress = int(processed * 100 / self.count_total) if self.count_total else 100
            BackgroundService().update_progress(
                task_id=self.task_id,
                progress=progress,
                progress_data={
                    "total": self.count_total,
                    "done": self.count_done,
                    "skip": self.count_skip,
                    "fail": self.count_fail,
                    "current_book_id": self.current_book_id,
                },
            )
        except Exception as e:
            logging.error("[BatchConvert] Failed to update task progress: %s", e)

    def _finish_task(self, failed: bool = False, error_msg: str = ""):
        if self.task_id:
            try:
                BackgroundService().complete_task(
                    task_id=self.task_id,
                    error_message=error_msg if failed else None,
                )
            except Exception as e:
                logging.error("[BatchConvert] Failed to finish task: %s", e)

        self.is_running = False
        self.current_book_id = None
        self.task_id = None
