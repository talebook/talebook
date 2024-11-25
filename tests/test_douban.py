#!/usr/bin/env python3

import json
import logging
import os
import sys
import unittest
from unittest import mock

testdir = os.path.realpath(os.path.dirname(os.path.realpath(__file__)) + "/../../../")
sys.path.append(testdir)

import webserver.main
from webserver.plugins.meta.douban import CHROME_HEADERS, DoubanBookApi

webserver.main.init_calibre()

DOUBAN_BOOK = {
    "id": "35737227",
    "author": ["[美]马修·卡拉柯"],
    "author_intro": "本书首次出版于2008年，是作者的第一本专著。在这本书中，马修·卡拉柯引用了动物行为学、进化论以及海德格尔的研究，",
    "translators": ["庞红蕊"],
    "images": {
        "small": "https://img9.doubanio.com/view/subject/s/public/s34101604.jpg",
        "medium": "https://img9.doubanio.com/view/subject/l/public/s34101604.jpg",
        "large": "https://img9.doubanio.com/view/subject/l/public/s34101604.jpg",
    },
    "binding": "平装",
    "category": "",
    "rating": {"average": 7.0},
    "isbn13": "9787570220601",
    "pages": "217",
    "price": "48.00元",
    "pubdate": "2022-1",
    "publisher": "长江文艺出版社",
    "producer": "",
    "serials": "",
    "subtitle": "从海德格尔到德里达的动物问题",
    "summary": "“要在观念和实际生活中公正地对待动物，这于人类而言是一个巨大的转变",
    "title": "动物志",
    "tags": [
        {"name": "动物"},
        {"name": "哲学"},
        {"name": "海德格尔"},
        {"name": "阿甘本"},
        {"name": "观念史"},
        {"name": "文学理论"},
        {"name": "政治哲学"},
        {"name": "德里达"},
    ],
    "origin": "Zoographies",
}

DOUBAN_SEARCH = {
    "code": 0,
    "msg": "",
    "books": [
        {
            "id": "35674151",
            "author": ["[英] 詹姆斯·切希尔", "谭羚迪"],
            "author_intro": "",
            "translators": [],
            "images": {
                "small": "",
                "medium": "",
                "large": "https://img3.doubanio.com/view/subject/s/public/s34050330.jpg",
            },
            "binding": "",
            "category": "",
            "rating": {"average": 9.2},
            "isbn13": "",
            "pages": "",
            "price": "",
            "pubdate": "2021",
            "publisher": "后浪丨湖南美术出版社",
            "producer": "",
            "serials": "",
            "subtitle": "",
            "summary": "◎获奖记录\n☆ 2017年英国地图制图学会综合大奖\n☆ 约翰·巴塞洛缪专题地图奖\n◎编辑推荐",
            "title": "动物去哪里",
            "tags": [],
            "origin": "",
        },
        {
            "id": "26889178",
            "author": ["乙一", "张筱森"],
            "author_intro": "",
            "translators": [],
            "images": {
                "small": "",
                "medium": "",
                "large": "https://img9.doubanio.com/view/subject/s/public/s33653515.jpg",
            },
            "binding": "",
            "category": "",
            "rating": {"average": 8.6},
            "isbn13": "",
            "pages": "",
            "price": "",
            "pubdate": "2016",
            "publisher": "人民文学出版社",
            "producer": "",
            "serials": "",
            "subtitle": "",
            "summary": "",
            "title": "动物园",
            "tags": [],
            "origin": "",
        },
        {
            "id": "34897038",
            "author": ["[英] 米莉·玛洛塔", "孙依静"],
            "author_intro": "",
            "translators": [],
            "images": {
                "small": "",
                "medium": "",
                "large": "https://img2.doubanio.com/view/subject/s/public/s33525533.jpg",
            },
            "binding": "",
            "category": "",
            "rating": {"average": 9.1},
            "isbn13": "",
            "pages": "",
            "price": "",
            "pubdate": "2020",
            "publisher": "后浪丨四川美术出版社",
            "producer": "",
            "serials": "",
            "subtitle": "",
            "summary": "芳踪难觅的栗腹鹭，钟爱旅行的勺嘴鹬\n感情专一的虎尾海马，雌雄难辨的曲纹唇鱼",
            "title": "地球上最孤单的动物",
            "tags": [],
            "origin": "",
        },
        {
            "id": "26579268",
            "author": ["[法] 纪尧姆·杜帕", "梅茇仁"],
            "author_intro": "",
            "translators": [],
            "images": {
                "small": "",
                "medium": "",
                "large": "https://img1.doubanio.com/view/subject/s/public/s29432778.jpg",
            },
            "binding": "",
            "category": "",
            "rating": {"average": 9.3},
            "isbn13": "",
            "pages": "",
            "price": "",
            "pubdate": "2015",
            "publisher": "明天出版社",
            "producer": "",
            "serials": "",
            "subtitle": "",
            "summary": "动物到底是如何看东西的，这一点仍然是个谜。猫的眼睛会看到怎样的东西？公牛真的害怕红色的吗？",
            "title": "动物眼中的世界",
            "tags": [],
            "origin": "",
        },
        {
            "id": "2035179",
            "author": ["[英] 乔治·奥威尔", "荣如德"],
            "author_intro": "",
            "translators": [],
            "images": {
                "small": "",
                "medium": "",
                "large": "https://img3.doubanio.com/view/subject/s/public/s2347590.jpg",
            },
            "binding": "",
            "category": "",
            "rating": {"average": 9.3},
            "isbn13": "",
            "pages": "",
            "price": "",
            "pubdate": "2007",
            "publisher": "上海译文出版社",
            "producer": "",
            "serials": "",
            "subtitle": "",
            "summary": "《动物农场》是奥威尔最优秀的作品之一，是一则入木三分的反乌托的政治讽喻寓言。",
            "title": "动物农场",
            "tags": [],
            "origin": "",
        },
    ],
}


class TestDoubanApi(unittest.TestCase):
    @mock.patch("requests.get")
    def test_metadata(self, mk):
        api = DoubanBookApi("apikey", "baseurl")
        book = dict(DOUBAN_BOOK)
        image = unittest.TestResult()
        image.content = b"image-body"
        mk.return_value = image

        mi = api._metadata(book)
        self.assertEqual(mi.title, book["title"])
        self.assertEqual(mi.authors, ["马修·卡拉柯"])
        self.assertEqual(mi.author, "马修·卡拉柯")
        self.assertEqual(mi.cover_data, ("jpg", b"image-body"))
        self.assertEqual(mi.rating, 7)
        self.assertEqual(mi.pubdate.strftime("%Y-%m-%d"), "2022-01-01")

        book["author"] = []
        mi = api._metadata(book)
        self.assertEqual(mi.authors, ["佚名"])
        self.assertEqual(mi.author, "佚名")

    @mock.patch("requests.get")
    def test_isbn_and_id(self, mk):
        testcases = [
            {"result": None, "case": {}, "err": RuntimeError("Yo!")},
            {"result": None, "case": {"status_code": 404, "content": ""}},
            {"result": None, "case": {"status_code": 200, "content": "bad_json"}},
            {"result": dict(DOUBAN_BOOK), "case": {"status_code": 200, "content": json.dumps(DOUBAN_BOOK)}},
        ]

        api = DoubanBookApi("key", "baseurl")
        for case in testcases:
            mk.side_effect = case.get("err", None)
            fake = mk.return_value
            for k, v in case["case"].items():
                setattr(fake, k, v)
            fake.json = lambda: json.loads(case["case"]["content"])

            d = api.get_book_by_isbn("123")
            self.assertEqual(d, case["result"])
            mk.assert_called_with("baseurl/v2/book/isbn/123", timeout=10, headers=CHROME_HEADERS, params={"apikey": "key"})

            d = api.get_book_by_id("456")
            self.assertEqual(d, case["result"])
            mk.assert_called_with("baseurl/v2/book/id/456", timeout=10, headers=CHROME_HEADERS, params={"apikey": "key"})

    @mock.patch("requests.get")
    def test_search_books(self, mk):
        api = DoubanBookApi("key", "baseurl")
        fake = mk.return_value
        fake.status_code = 200
        fake.json.return_value = dict(DOUBAN_SEARCH)

        title = "动物"
        d = api.search_books(title)
        self.assertEqual(d, DOUBAN_SEARCH["books"])
        mk.assert_called_with(
            "baseurl/v2/book/search",
            timeout=10,
            headers=CHROME_HEADERS,
            params={"q": title.encode("UTF-8"), "count": 2, "apikey": "key"},
        )

    @mock.patch("requests.get")
    def test_get_book_by_title(self, mk):
        r2 = mock.Mock()
        r2.status_code = 200
        r2.json.return_value = dict(DOUBAN_SEARCH)
        mk.return_value = r2

        api = DoubanBookApi("key", "baseurl")

        title = "动物园"
        author = None
        book = api.get_book_by_title(title, author)
        self.assertEqual(book["title"], "动物园")
        self.assertEqual(book["id"], "26889178")

    @mock.patch("requests.get")
    def test_get_book(self, mk):
        mk.return_value.status_code = 200
        mk.return_value.json.return_value = dict(DOUBAN_BOOK)
        api = DoubanBookApi("key", "baseurl", copy_image=False)

        q = mock.Mock()
        q.douban_id = 123
        book = api.get_book(q)
        self.assertEqual(book.title, DOUBAN_BOOK["title"])

        q = mock.Mock()
        q.isbn = 123
        book = api.get_book(q)
        self.assertEqual(book.title, DOUBAN_BOOK["title"])

    @mock.patch("requests.get")
    def test_get_book2(self, mk):
        r1 = mock.Mock()
        r1.status_code = 404

        r2 = mock.Mock()
        r2.status_code = 200
        r2.json.return_value = dict(DOUBAN_SEARCH)

        mk.side_effect = [r1, r2]

        api = DoubanBookApi("key", "baseurl", copy_image=False)

        q = mock.Mock()
        q.douban_id = 123
        q.isbn = 123
        q.title = "动物园"
        q.author_sort = None
        book = api.get_book(q)
        self.assertEqual(book.title, "动物园")
        self.assertEqual(book.provider_value, "26889178")


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    unittest.main()
