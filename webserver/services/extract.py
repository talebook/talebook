#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
import os
import logging
import traceback

from webserver import loader
from webserver.services import AsyncService
from webserver.plugins.parser.txt import TxtParser

CONF = loader.get_settings()


class ExtractService(AsyncService):
    @AsyncService.register_service
    def parse_txt_content(self, bid, fpath):
        '''从TXT文件中提取目录并存储为json'''
        outDir = os.path.join(CONF["extract_path"], str(bid))  # 解压后的目录
        content_path = os.path.join(outDir, "content.json")
        if os.path.isfile(content_path):
            logging.info(f"书籍<{bid}>已转换, {content_path} exists")
            return False

        if not os.path.exists(outDir):
            os.mkdir(outDir)

        try:
            ret = TxtParser().parse(fpath)
            content = json.dumps(ret, ensure_ascii=False)
            with open(content_path, 'w', encoding="utf8") as f:
                f.write(content)
                return True
        except Exception as e:
            logging.info(f"TXT convert error: {e}")
            logging.error(traceback.format_exc())
            return False
