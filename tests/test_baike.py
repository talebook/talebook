#!/usr/bin/env pytest
# -*- coding: UTF-8 -*-


import json
import logging
import os
import sys
import unittest
from unittest import mock

testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

import webserver.main
from webserver.plugins.meta.baike import BaiduBaikeApi

webserver.main.init_calibre()


BAIKE_DATA = {
    "info": {
        "作品名称": "东周列国志",
        "作者": "冯梦龙、蔡元放",
        "创作年代": "明代、清代",
        "文学体裁": "长篇历史演义小说",
        "字数": "800000",
        "title": "东周列国志（冯梦龙所著长篇历史小说）",
        "url": "https://baike.baidu.com/item/%E4%B8%9C%E5%91%A8%E5%88%97%E5%9B%BD%E5%BF%97/2653",
    },
    "tags": ["明代","长篇小说", "历史" ],
    "summary": "《东周列国志》是明末小说家冯梦龙著、清代蔡元放改编的长篇历史演义小说，成书于清代乾隆年间。《东周列国志》写的是西周结束（公元前789年）至秦统一六国（公元前221年），包括春秋、战国五百多年间的历史故事，内容相当丰富复杂。小说描写了周幽王凶残无道，周平王东迁，诸侯国争霸，士大夫势力日益壮大，最终形成七雄对峙局面；批判了昏庸愚昧的昏君暴君，揭示了战争给人民带来的深重灾难；歌颂了赏罚分明的王侯和有胆识的将相勇夫。小说的布局谋篇主次分明，错落有致。每一故事既可独立成篇，又可贯穿一体。人物形象栩栩如生，故事描写引人入胜。[1]",
    "id": "2653",
    "image": "https://bkimg.cdn.bcebos.com/pic/bd3eb13533fa828b9d95cebbf21f4134970a5a37?x-bce-process=image/resize,m_lfit,w_536,limit_1/format,f_jpg",
}


def get_mock_page():
    p = mock.Mock()
    p.get_id.return_value = BAIKE_DATA['id']
    p.get_tags.return_value = BAIKE_DATA['tags']
    p.get_info.return_value = BAIKE_DATA['info']
    p.get_image.return_value = BAIKE_DATA['image']
    p.get_summary.return_value = BAIKE_DATA['summary']
    p.http.url = BAIKE_DATA['info']['url']
    return p

BAIKE_PAGE = get_mock_page()

class TestBaike(unittest.TestCase):
    def test_baike_api(self):
        api = BaiduBaikeApi(copy_image=False)
        with mock.patch.object(api, "_baike") as mk:
            mk.return_value = None
            d = api.get_book("东周列国志")
            self.assertEqual(d, None)

            mk.return_value = BAIKE_PAGE
            d = api.get_book("东周")
            self.assertTrue(d != None)
            self.assertEqual(d.title, "东周列国志（冯梦龙所著长篇历史小说）")
