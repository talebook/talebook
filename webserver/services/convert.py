#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import os
import logging

from gettext import gettext as _
import subprocess
import time

from webserver import loader
from webserver.services import AsyncService
from webserver.services.mail import MailService

CONF = loader.get_settings()


class ConvertService(AsyncService):
    def get_path_of_fmt(self, book, fmt):
        """for mock test"""
        from calibre.utils.filenames import ascii_filename

        return os.path.join(CONF["convert_path"], "%s.%s" % (ascii_filename(book["title"]), fmt))

    def get_path_progress(self, book_id):
        return os.path.join(CONF["progress_path"], "progress-%s.log" % book_id)

    def do_ebook_convert(self, old_path, new_path, log_path):
        """convert book, and block, and wait"""
        args = ["ebook-convert", old_path, new_path]
        if new_path.lower().endswith(".epub"):
            args += ["--flow-size", "0"]

        timeout = 300
        try:
            timeout = int(CONF["convert_timeout"])
        except:
            pass

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
                log.info("ebook-convert timeout: %s" % new_path)
                log.write(u"\n服务器转换书本格式时超时了。请在配置管理页面调大超时时间。\n[FINISH]")
                return False
            return True

    def convert_to_mobi_format(self, book, new_fmt):
        new_path = self.get_path_of_fmt(book, new_fmt)
        progress_file = self.get_path_progress(book["id"])

        old_path = None
        for f in ["txt", "azw3"]:
            old_path = book.get("fmt_%s" % f, old_path)

        logging.debug("convert book from [%s] to [%s]", old_path, new_path)
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
            self.add_msg(user_id, "danger", _(u"文件格式转换失败，请在QQ群里联系管理员."))

    @AsyncService.register_service
    def convert_and_save(self, user_id, book, fpath, new_fmt):

        new_fmt = "epub"
        new_path = os.path.join(
            CONF["convert_path"],
            "book-%s-%s.%s" % (book["id"], int(time.time()), new_fmt),
        )
        progress_file = ConvertService().get_path_progress(book["id"])
        logging.info("convert book: %s => %s, progress: %s" % (fpath, new_path, progress_file))

        ok = ConvertService().do_ebook_convert(fpath, new_path, progress_file)
        if not ok:
            self.add_msg(user_id, "danger", u"文件格式转换失败！请重试，或到Github上提交问题报告")
            return

        with open(new_path, "rb") as f:
            self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
            logging.info("add new book: %s", new_path)

        # 清理临时文件
        os.remove(new_path)
