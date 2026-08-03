#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from unittest import mock

from tests.test_main import TestWithUserLogin
from tests.test_main import setUpModule as init
from webserver.services.autofill import AutoFillService


def setUpModule():
    init()


class TestAutoFillKeepCover(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.service = AutoFillService()
        self.original_db = self.service.db
        self.service.db = mock.MagicMock()

    def tearDown(self):
        self.service.db = self.original_db
        super().tearDown()

    def _make_mi(self, title, has_cover, cover_data):
        from calibre.ebooks.metadata.book.base import Metadata

        mi = Metadata(title, ["原作者"])
        mi.comments = "原简介"
        mi.has_cover = has_cover
        mi.cover_data = cover_data
        return mi

    @mock.patch.object(AutoFillService, "plugin_search_best_book_info")
    def test_keeps_original_cover_when_option_enabled(self, mock_search):
        mi = self._make_mi("原书名", has_cover=True, cover_data=("jpg", b"old-cover"))
        refer_mi = self._make_mi("错误的书名", has_cover=True, cover_data=("jpg", b"wrong-cover"))
        refer_mi.comments = "新简介"
        refer_mi.authors = ["新作者"]
        mock_search.return_value = refer_mi

        with mock.patch.dict("webserver.services.autofill.CONF", {"auto_fill_keep_cover": True}):
            ok = self.service.do_fill_metadata(1, mi)

        self.assertTrue(ok)
        # 封面保持原样，未被抓取到的错误封面覆盖
        self.assertEqual(mi.cover_data, ("jpg", b"old-cover"))
        # 其它字段仍然被更新
        self.assertEqual(mi.comments, "新简介")
        self.assertEqual(mi.authors, ["新作者"])

    @mock.patch.object(AutoFillService, "plugin_search_best_book_info")
    def test_overwrites_cover_when_option_disabled(self, mock_search):
        mi = self._make_mi("原书名", has_cover=True, cover_data=("jpg", b"old-cover"))
        refer_mi = self._make_mi("错误的书名", has_cover=True, cover_data=("jpg", b"wrong-cover"))
        mock_search.return_value = refer_mi

        with mock.patch.dict("webserver.services.autofill.CONF", {"auto_fill_keep_cover": False}):
            ok = self.service.do_fill_metadata(1, mi)

        self.assertTrue(ok)
        self.assertEqual(mi.cover_data, ("jpg", b"wrong-cover"))

    @mock.patch.object(AutoFillService, "plugin_search_best_book_info")
    def test_updates_other_metadata_when_no_cover_found_and_option_disabled(self, mock_search):
        # 无法获取封面时，不应放弃其余元数据（作者、简介等）的更新
        mi = self._make_mi("原书名", has_cover=False, cover_data=None)
        refer_mi = self._make_mi("错误的书名", has_cover=False, cover_data=None)
        refer_mi.comments = "新简介"
        refer_mi.authors = ["新作者"]
        mock_search.return_value = refer_mi

        with mock.patch.dict("webserver.services.autofill.CONF", {"auto_fill_keep_cover": False}):
            ok = self.service.do_fill_metadata(1, mi)

        self.assertTrue(ok)
        self.assertEqual(mi.comments, "新简介")
        self.assertEqual(mi.authors, ["新作者"])
        self.assertFalse(mi.has_cover and mi.cover_data and mi.cover_data[1])

    @mock.patch.object(AutoFillService, "plugin_search_best_book_info")
    def test_keeps_existing_cover_when_no_cover_found(self, mock_search):
        # 书籍原本已有封面，抓取结果没有封面时，不应清空原有封面
        mi = self._make_mi("原书名", has_cover=True, cover_data=("jpg", b"old-cover"))
        refer_mi = self._make_mi("错误的书名", has_cover=False, cover_data=None)
        refer_mi.comments = "新简介"
        mock_search.return_value = refer_mi

        with mock.patch.dict("webserver.services.autofill.CONF", {"auto_fill_keep_cover": False}):
            ok = self.service.do_fill_metadata(1, mi)

        self.assertTrue(ok)
        self.assertEqual(mi.comments, "新简介")
        self.assertEqual(mi.cover_data, ("jpg", b"old-cover"))
