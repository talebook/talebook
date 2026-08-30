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
        if os.path.dirname(extract_root) == extract_root:
            raise ValueError("extraction output root cannot be the filesystem root")
        out_dir = os.path.realpath(os.path.join(extract_root, book_id_text))  # 解压后的目录
        # These normalized-prefix guards stay inline so CodeQL can prove that
        # every filesystem sink below is constrained to the configured root.
        if not out_dir.startswith(extract_root + os.sep):
            raise ValueError("extraction output path escapes configured root")

        content_path = os.path.realpath(os.path.join(out_dir, "content.json"))
        if not content_path.startswith(out_dir + os.sep):
            raise ValueError("extraction content path escapes book directory")

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
