#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import os
import logging
import subprocess
import time
import traceback

from webserver import loader
from webserver.services import AsyncService
from webserver.services.convert import ConvertService
from webserver.plugins.parser.txt import TxtParser

CONF = loader.get_settings()


class ExtractService(AsyncService):
    @AsyncService.register_service
    def extract_book(self, user_id, book, fpath, fmt):
        # 解压后的目录
        fdir = os.path.join(CONF["extract_path"], str(book["id"]))
        subprocess.call(["mkdir", "-p", fdir])
        if os.path.isfile(fdir + "/META-INF/container.xml"):
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            return
        progress_file = ConvertService().get_path_progress(book["id"])
        new_path = ""
        if fmt != "epub":
            new_fmt = "epub"
            new_path = os.path.join(
                CONF["convert_path"],
                "book-%s-%s.%s" % (book["id"], int(time.time()), new_fmt),
            )
            logging.info("convert book: %s => %s, progress: %s" % (fpath, new_path, progress_file))
            os.chdir("/tmp/")

            ok = ConvertService().do_ebook_convert(fpath, new_path, progress_file)
            if not ok:
                self.add_msg(user_id, "danger", u"文件格式转换失败！请重试，或到Github上提交问题报告")
                return

            with open(new_path, "rb") as f:
                self.db.add_format(book["id"], new_fmt, f, index_is_id=True)
                logging.info("add new book: %s", new_path)
            fpath = new_path

        # extract to dir
        logging.error("extract book: [%s] into [%s]", fpath, fdir)
        os.chdir(fdir)
        with open(progress_file, "a") as log:
            log.write(u"Dir: %s\n" % fdir)
            subprocess.call(["unzip", fpath, "-d", fdir], stdout=log)
            subprocess.call(["chmod", "a+rx", "-R", fdir + "/META-INF"])
            if new_path:
                subprocess.call(["rm", new_path])
        return

    @AsyncService.register_service
    def parse_txt_content(self, bid):
        '''从TXT文件中提取目录并存储为json'''
        book = self.get_book(bid)
        outDir = os.path.join(CONF["extract_path"], str(bid))  # 解压后的目录
        content_path = os.path.join(outDir, "content.json")
        if os.path.isfile(content_path):
            logging.info(f"书籍<{bid}>已转换, {content_path} exists")
            return

        if not os.path.exists(outDir):
            os.mkdir(outDir)

        fpath = book.get("fmt_txt", "book-has-no-txt-path")
        try:
            ret = TxtParser().parse(fpath)
            content = json.dumps(ret, ensure_ascii=False)
            with open(content_path, 'w', encoding="utf8") as f:
                f.write(content)
        except Exception as e:
            logging.info(f"TXT convert error: {e}")
            logging.error(traceback.format_exc())
