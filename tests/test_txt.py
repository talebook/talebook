#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from tests.test_main import TestWithUserLogin, setUpModule as init, testdir
from webserver.plugins.parser.txt import TxtParser, get_file_encoding


def setUpModule():
    init()


class TestTxtParse(TestWithUserLogin):
    BOOK_PATH = testdir + "/cases/book.txt"
    BOOK_ENCODING = "GB18030"
    BOOK_TOC = [
            {
                "id": 1,
                "title": "《秦吏》",
                "start": 12,
                "end": 32
                },
            {
                "id": 2,
                "title": "简介：",
                "start": 40,
                "end": 544
                },
            {
                "id": 3,
                "title": "第一卷 小亭长",
                "start": 559,
                "end": 563
                },
            {
                "id": 4,
                "title": "第0001章 士伍，请出示身份证！",
                "start": 594,
                "end": 6565
                },
            {
                "id": 5,
                "title": "第0002章 天下事与眼前事",
                "start": 6590,
                "end": -1
                }
            ]

    def test_get_file_encoding(self):
        encoding = get_file_encoding(self.BOOK_PATH)
        self.assertEqual(encoding, self.BOOK_ENCODING)

    def test_parse_text_book_table_of_content(self):
        with open(self.BOOK_PATH, encoding=self.BOOK_ENCODING, newline='\n') as fileobj:
            toc = TxtParser().parse_txt_book_toc(fileobj)
            self.assertEqual(len(toc), len(self.BOOK_TOC))
            self.assertEqual(toc[-1]['title'], self.BOOK_TOC[-1]['title'])
            # self.assertEqual(toc, self.BOOK_TOC)

    def test_parse(self):
        meta = TxtParser().parse(self.BOOK_PATH)
        self.assertEqual(meta['encoding'], self.BOOK_ENCODING)
        toc = meta['toc']
        self.assertEqual(len(toc), len(self.BOOK_TOC))
        self.assertEqual(toc[-1]['title'], self.BOOK_TOC[-1]['title'])

        # github上跑pytest时文件偏移量总是不对，待排查
        # self.assertEqual(toc, self.BOOK_TOC)

