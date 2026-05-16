#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import logging
import os
import subprocess
import time
import traceback

import psutil

from webserver import loader, utils
from webserver.i18n import _
from webserver.services import AsyncService
from webserver.services.background_service import BackgroundService, BackgroundTask
from webserver.services.mail import MailService


EBOOK_CONVERT_CMD = "ebook-convert"
DEFAULT_CONVERT_TIMEOUT = 3000

CONF = loader.get_settings()


class ConvertService(AsyncService):
    def get_path_of_fmt(self, book, fmt):
        """for mock test"""
        from calibre.utils.filenames import ascii_filename

        return os.path.join(CONF["convert_path"], "%s.%s" % (ascii_filename(book["title"]), fmt))

    def get_path_progress(self, book_id):
        return os.path.join(CONF["progress_path"], "progress-%s.log" % book_id)

    def is_book_converting(self, book):
        converted_book_path_prefix = os.path.join(
            CONF["convert_path"],
            "book-%s-" % book["id"],
        )
        found = False
        for process in psutil.process_iter(["cmdline"]):
            try:
                cmdline = process.info["cmdline"]
                if cmdline and any(converted_book_path_prefix in arg for arg in cmdline):
                    logging.info("Found process with string '%s': PID %s", converted_book_path_prefix, process.pid)
                    found = True
                    break
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        return found

    def do_ebook_convert(self, old_path, new_path, log_path):
        """convert book, and block, and wait"""
        args = [EBOOK_CONVERT_CMD, old_path, new_path]
        args += [
            "--book-producer",
            "PoxenStudio/Talebook(https://mybooks.top)&Talebook/Talebook(https://github.com/talebook/talebook/)",
        ]
        if new_path.lower().endswith(".epub"):
            args += ["--epub-version", "2"]
            if old_path.lower().endswith(".txt"):
                args += ["--chapter-mark", "pagebreak", "--output-profile", "kindle", "--flow-size", "260"]
            else:
                args += ["--flow-size", "0"]
        elif new_path.lower().endswith(".azw3"):
            args += ["--enable-heuristics", "--output-profile", "kindle"]
        elif new_path.lower().endswith(".pdf"):
            cn_font_name = '"WenQuanYi Micro Hei,文泉驛微米黑,文泉驿微米黑"'
            args += ["--paper-size=a5"]
            args += ["--pdf-page-margin-left=15"]
            args += ["--pdf-page-margin-top=15"]
            args += ["--pdf-page-margin-right=15"]
            args += ["--pdf-page-margin-bottom=15"]
            args += ["--no-chapters-in-toc"]
            args += ["--base-font-size=12"]
            args += ["--filter-css=font-family"]
            args += [f'--pdf-sans-family="{cn_font_name}"']
            args += [f'--pdf-serif-family="{cn_font_name}"']

        timeout = DEFAULT_CONVERT_TIMEOUT
        try:
            timeout = int(CONF["convert_timeout"])
        except Exception as e:
            logging.warning("Failed to get convert timeout from config: %s", e)
            timeout = DEFAULT_CONVERT_TIMEOUT

        with open(log_path, "w") as log:
            cmd = " ".join("'%s'" % v for v in args)
            logging.info("CMD: %s" % cmd)
            p = subprocess.Popen(args, stdout=log, stderr=subprocess.PIPE)
            try:
                _, stde = p.communicate(timeout=timeout)
                logging.info("ebook-convert finish: %s, err: %s" % (new_path, bytes.decode(stde)))
            except subprocess.TimeoutExpired:
                p.kill()
                logging.info("ebook-convert timeout: %s" % new_path)
                log.write("\n服务器转换书本格式时超时了。请在配置管理页面调大超时时间。\n[FINISH]")
                return False
            return True

    def convert_to_mobi_format(self, book, new_fmt):
        new_path = self.get_path_of_fmt(book, new_fmt)
        progress_file = self.get_path_progress(book["id"])

        old_path = None
        for f in ["txt", "azw3"]:
            old_path = book.get("fmt_%s" % f, old_path)

        ok = self.do_ebook_convert(old_path, new_path, progress_file)
        if not ok:
            return None
        with open(new_path, "rb") as f:
            self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
        return new_path

    @AsyncService.register_service
    def convert_and_send(self, user_id: int, site_url: str, book: dict, mail_to: str):
        # https://www.amazon.cn/gp/help/customer/display.html?ref_=hp_left_v4_sib&nodeId=G5WYD9SAF7PGXRNA
        fmt = "epub"  # best format for kindle
        fpath = self.convert_to_mobi_format(book, fmt)
        if fpath:
            MailService().send_book(user_id, site_url, book, mail_to, fmt, fpath)
        else:
            self.add_msg(user_id, "danger", _("文件格式转换失败，请在QQ群里联系管理员."))

    @AsyncService.register_service
    def convert_and_save(self, user_id, book, fpath, new_fmt):
        if new_fmt == "":
            new_fmt = "epub"
        new_path = os.path.join(
            CONF["convert_path"],
            "book-%s-%s.%s" % (book["id"], int(time.time()), new_fmt),
        )
        progress_file = ConvertService().get_path_progress(book["id"])
        logging.info("convert book: %s => %s, progress: %s" % (fpath, new_path, progress_file))

        title = book.get("title", "Unknown Title")
        if len(title) > 20:
            title = title[0:19] + "..."
        service_item = f"[{book['id']}]{title}"
        task = BackgroundService().add_task(BackgroundTask.SERVICE_TYPE_CONVERT, service_item, book_id=book["id"])
        ok = ConvertService().do_ebook_convert(fpath, new_path, progress_file)
        if task:
            BackgroundService().complete_task(task.id)
        if not ok:
            self.add_msg(user_id, "danger", "[%s]文件格式转换失败！请查看日志，或前往项目ISSUE页面反馈" % service_item)
            return

        with open(new_path, "rb") as f:
            self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
            logging.info("added new book: %s", new_path)

        # Write metadata to the new file (including cover)
        try:
            from calibre.ebooks.metadata.meta import set_metadata

            book_id = book["id"]
            mi = self.db.get_metadata(book_id, index_is_id=True)
            if mi:
                if mi.title:
                    mi.title_sort = utils.super_strip(mi.title)
                if mi.authors:
                    mi.author_sort = utils.super_strip(mi.authors[0])

                cover_data = self.db.cover(book_id, index_is_id=True)
                if cover_data:
                    mi.cover_data = ("jpeg", cover_data)

                fmt_path = self.db.format_abspath(book_id, new_fmt, index_is_id=True)
                if fmt_path and os.path.exists(fmt_path):
                    with open(fmt_path, "rb+") as stream:
                        set_metadata(stream, mi, stream_type=new_fmt)
                    logging.info(f"[CONVERT] Metadata written to {new_fmt.upper()} for book {book_id}")
                else:
                    logging.warning(f"[CONVERT] Cannot find converted file path for book {book_id} fmt {new_fmt}")
        except Exception:
            logging.error(f"[CONVERT] Failed to write metadata after conversion for book {book['id']}")
            logging.error(traceback.format_exc())

        self.add_msg(user_id, "success", _("[%s]文件格式转换成功" % service_item))
        # 清理临时文件
        os.remove(new_path)
