#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import logging
import os
import re
import traceback

from webserver import loader
from webserver.plugins.parser.txt import TxtParser
from webserver.services import AsyncService


CONF = loader.get_settings()
BOOK_ID_RE = re.compile(r"[0-9]+")


class ExtractService(AsyncService):
    @AsyncService.register_service
    def parse_txt_content(self, bid, fpath):
        """从TXT文件中提取目录并存储为json"""
        book_id_text = str(bid)
        if not BOOK_ID_RE.fullmatch(book_id_text):
            raise ValueError("invalid book id")

        extract_root = os.path.realpath(CONF["extract_path"])
        out_dir = os.path.realpath(os.path.join(extract_root, book_id_text))  # 解压后的目录
        try:
            if os.path.commonpath([extract_root, out_dir]) != extract_root:
                raise ValueError("extraction output path escapes configured root")
        except ValueError as exc:
            raise ValueError("invalid extraction output path") from exc

        content_path = os.path.realpath(os.path.join(out_dir, "content.json"))
        try:
            if os.path.commonpath([out_dir, content_path]) != out_dir:
                raise ValueError("extraction content path escapes book directory")
        except ValueError as exc:
            raise ValueError("invalid extraction content path") from exc

        if os.path.isfile(content_path):
            logging.info(f"书籍<{book_id_text}>已转换, {content_path} exists")
            return False

        if not os.path.exists(out_dir):
            os.mkdir(out_dir)

        try:
            ret = TxtParser().parse(fpath)
            content = json.dumps(ret, ensure_ascii=False)
            with open(content_path, "w", encoding="utf8") as f:
                f.write(content)
                return True
        except Exception as e:
            logging.info(f"TXT convert error: {e}")
            logging.error(traceback.format_exc())
            return False
