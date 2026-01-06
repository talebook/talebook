#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import base64
import json
import logging
import os
import sys
import shutil
import time
import unittest
import urllib
from unittest import mock

import requests
from tornado import testing, web

testdir = os.path.dirname(os.path.realpath(__file__))
projdir = os.path.realpath(testdir + "/../../")
sys.path.append(projdir)

import webserver.handlers.base
import webserver.handlers.book
from webserver import loader, main, models, plugins  # nosq: E402
from webserver.handlers.base import BaseHandler

_app = None
_mock_user = None
_mock_mail = None
_mock_service_async_mode = None

'''
1	EPUB	440912	Bai Nian Gu Du - Jia Xi Ya  Ma Er Ke Si
2	TXT	298421	Man Man Zi You Lu - Unknown
3	MOBI	2662851	An Tu Sheng Tong Hua - An Tu Sheng
4	AZW3	344989	Mai Ken Xi Fang Fa (Jing Guan Tu Shu De Ch - Ai Sen _La Sai Er (Ethan M.Rasiel)
5	PDF	6127496	E Yu Pa Pa Ya Yi Pa Pa - Unknown
6	EPUB	324726	Tang Shi San Bai Shou - Wei Zhi
'''
BID_EPUB = 1
BID_TXT = 2
BID_MOBI = 3
BID_AZW3 = 4
BID_PDF = 5
BIDS = list(range(1,6))


def setup_server():
    global _app
    # copy new db
    shutil.copyfile(testdir+"/cases/users.db", testdir+"/library/users.db")
    shutil.copyfile(testdir+"/cases/metadata.db", testdir+"/library/metadata.db")

    # set env
    main.options.with_library = testdir + "/library/"
    main.CONF["scan_upload_path"] = testdir + "/cases/"
    main.CONF["ALLOW_GUEST_PUSH"] = False
    main.CONF["ALLOW_GUEST_DOWNLOAD"] = False
    main.CONF["upload_path"] = "/tmp/"
    main.CONF["html_path"] = "/tmp/"
    main.CONF["settings_path"] = "/tmp/"
    main.CONF["progress_path"] = "/tmp/"
    main.CONF["extract_path"] = "/tmp/"
    main.CONF["nuxt_env_path"] = "/tmp/.env.text"
    main.CONF["installed"] = True
    main.CONF["INVITE_MODE"] = False
    main.CONF["user_database"] = "sqlite:///%s/library/users.db" % testdir
    # main.CONF["db_engine_args"] = {"echo": True}
    if _app is None:
        _app = main.make_app()


def setup_mock_user():
    global _mock_user
    _mock_user = mock.patch.object(BaseHandler, "user_id", return_value=1)


def setup_mock_sendmail():
    global _mock_mail
    _mock_mail = mock.patch("calibre.utils.smtp.sendmail", return_value="Yo")


def setup_mock_service():
    global _mock_service_async_mode
    _mock_service_async_mode = mock.patch("webserver.services.AsyncService.async_mode")

def get_db():
    return _app.settings["ScopedSession"]


def Q(s):
    if not isinstance(s, str):
        s = str(s)
    return urllib.parse.quote(s.encode("UTF-8"))


class FakeHandler(BaseHandler):
    def __init__(h):
        h.request = h
        h.request.headers = {}
        h.request.remote_ip = "1.2.3.4"
        h.rsp_headers = {}
        h.rsp = None
        h.cookie = {}
        h.session = get_db()

    def write(self, rsp):
        self.rsp = rsp

    def finish(self):
        return None

    def set_header(self, k, v):
        self.rsp_headers[k] = v

    def set_secure_cookie(self, k, v):
        self.cookie[k] = v


class TestApp(testing.AsyncHTTPTestCase):
    def get_app(self):
        return _app

    def json(self, url, *args, **kwargs):
        if 'request_timeout' not in kwargs:
            kwargs['request_timeout'] = 60
        rsp = self.fetch(url, *args, **kwargs)
        self.assertEqual(rsp.code, 200)
        return json.loads(rsp.body)

    def gt(self, n, at_least):
        self.assertEqual(n, max(n, at_least))

    def assert_book_simple(self, book):
        self.assertTrue("img" in book)
        self.assertTrue("authors" in book)
        self.assertTrue("comments" in book)
        self.assertTrue("id" in book)
        self.assertTrue("publisher" in book)
        self.assertTrue("rating" in book)
        self.assertTrue("title" in book)

    def assert_book_fields(self, book):
        self.assert_book_simple(book)
        self.assertTrue("tags" in book)
        self.assertTrue("timestamp" in book)
        self.assertTrue("collector" in book)
        self.assertTrue("count_visit" in book)
        self.assertTrue("count_download" in book)
        self.assertTrue("pubdate" in book)
        self.assertTrue("series" in book)

    def assert_book(self, book):
        self.assert_book_fields(book)
        d = self.json("/api/book/%s" % book["id"])["book"]
        self.assert_book_fields(d)
        self.gt(len(d["files"]), 1)

    def assert_book_list(self, d, at_least):
        self.assertEqual(d["err"], "ok")
        self.gt(d["total"], at_least)
        n = len(d["books"])
        if n < 30:
            self.assertEqual(d["total"], n)
        self.assertTrue(n <= 30)
        for book in d["books"]:
            self.assert_book(book)


class TestAppWithoutLogin(TestApp):
    def test_index(self):
        d = self.json("/api/index?random=7&recent=9")
        self.assertEqual(len(d["new_books"]), 9)
        self.assertEqual(len(d["random_books"]), 7)
        for book in d["new_books"] + d["random_books"]:
            self.assert_book_simple(book)

        book = d["new_books"][0]
        for author in book["authors"]:
            self.json("/api/author/" + Q(author))

        self.json("/api/author/" + Q(book["author"]))
        self.json("/api/publisher/" + Q(book["publisher"]))

    def test_search(self):
        d = self.json("/api/search")
        self.assertEqual(d["err"], "params.invalid")

        d = self.json("/api/search?hack")
        self.assertEqual(d["err"], "params.invalid")

        d = self.json("/api/search?name=NotFound")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["total"], 0)
        self.assertEqual(len(d["books"]), 0)

        d = self.json("/api/search?name=A")
        self.assert_book_list(d, 6)

    def test_hot(self):
        d = self.json("/api/hot")
        self.assert_book_list(d, 0)

    def test_recent(self):
        d = self.json("/api/recent")
        self.assert_book_list(d, 10)

    def test_download(self):
        rsp = self.fetch("/api/book/1.epub", follow_redirects=False)
        self.assertEqual(rsp.code, 302)

    def test_push(self):
        d = self.json("/api/book/1/push", method="POST", body="mail_to=unittest@gmail.com")
        self.assertEqual(d["err"], "user.need_login")

    def test_user_info(self):
        d = self.json("/api/user/info")
        self.assertEqual(d["user"]["is_login"], False)
        self.assertEqual(d["user"]["is_admin"], False)
        self.assertEqual(d["sys"]["books"], 13)

        d = self.json("/api/user/info?detail=1")
        self.assertEqual(d["user"]["is_login"], False)
        self.assertEqual(d["sys"], {})

    def test_book(self):
        d = self.json("/api/book/1")
        self.assertEqual(d["err"], "ok")


class TestMeta(TestApp):
    def assert_meta(self, meta, total):
        d = self.json("/api/%s" % meta)
        self.assertEqual(len(d["items"]), total)
        for m in d["items"]:
            url = "/api/%s/%s" % (meta, Q(m["name"]))
            a = self.json(url)
            self.gt(len(a["books"]), 1)
            b = self.json(url + "?size=3")
            c = self.json(url + "?start=3")
            d = self.json(url + "?sort=timestamp")
            self.assertEqual(a["total"], b["total"])
            self.assertEqual(a["total"], c["total"])
            self.assertEqual(a["total"], d["total"])

    def test_tag(self):
        self.assert_meta("tag", 72)

    def test_author(self):
        self.assert_meta("author", 15)

    def test_series(self):
        self.assert_meta("series", 7)

    def test_publisher(self):
        self.assert_meta("publisher", 10)

    def test_rating(self):
        self.assert_meta("rating", 3)


class AutoResetPermission:
    def __init__(self, arg):
        if not arg:
            arg = models.Reader.id == 1
        self.arg = arg

    def __enter__(self):
        self.user = get_db().query(models.Reader).filter(self.arg).first()
        self.user.permission = ""
        return self.user

    def __exit__(self, type, value, trace):
        self.user.permission = ""


def mock_permission(arg=None):
    return AutoResetPermission(arg)


class TestWithUserLogin(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.mail = _mock_mail.start()
        self.async_service = _mock_service_async_mode.start()
        self.user.return_value = 1
        self.mail.return_value = True
        self.async_service.return_value = False

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()
        _mock_mail.stop()
        _mock_service_async_mode.start()


class TestUser(TestWithUserLogin):
    def test_userinfo(self):
        d = self.json("/api/user/info")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["user"]["is_login"], True)

        d = self.json("/api/user/info?detail=1")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["user"]["is_login"], True)
        self.assertEqual(d["sys"], {})
        self.assertTrue(len(d["user"]["extra"]["download_history"]) >= 1)

    def add_user(self):
        self.mail.reset_mock()
        body = "email=active@gmail.com&nickname=active&username=active&password=active66"
        d = self.json("/api/user/sign_up", method="POST", raise_error=True, body=body)
        self.assertTrue(d["err"] in ["ok", "params.username.exist"])

    def test_login(self):
        # rsp = self.fetch("/api/done", follow_redirects=False)
        # self.assertEqual(rsp.code, 302)
        self.add_user()

        user = get_db().query(models.Reader).filter(models.Reader.username == "active").first()
        user.permission = ""
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d["err"], "ok")

        user = get_db().query(models.Reader).filter(models.Reader.username == "active").first()
        user.set_permission("L")
        logging.debug("user[%s] id[%s] permission[%s]", user.username, user.id, user.permission)
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d["err"], "permission")

        user = get_db().query(models.Reader).filter(models.Reader.username == "active").first()
        user.set_permission("l")
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d["err"], "ok")


class TestFile(TestWithUserLogin):
    def test_get_cover(self):
        rsp = self.fetch("/get/cover/1.jpg", follow_redirects=False)
        self.assertEqual(rsp.code, 200)

    def test_get_thumb(self):
        rsp = self.fetch("/get/thumb_80x80/1.jpg", follow_redirects=False)
        self.assertEqual(rsp.code, 200)

    def test_get_opf(self):
        rsp = self.fetch("/get/opf/1", follow_redirects=False)
        self.assertEqual(rsp.code, 200)


class TestBook(TestWithUserLogin):
    def test_nav(self):
        rsp = self.fetch("/api/book/nav")
        self.assertEqual(rsp.code, 200)

    def test_download(self):
        rsp = self.fetch("/api/book/1.epub")
        self.assertEqual(rsp.code, 200)
        book_body = rsp.body

        rsp = self.fetch("/api/book/1.pdf")
        self.assertEqual(rsp.code, 404)

        rsp = self.fetch("/api/book/1.epub", headers={"Range": "bytes=0-0"})
        self.assertEqual(rsp.code, 206)
        self.assertEqual(len(rsp.body), 1)

        rsp = self.fetch("/api/book/1.EPUB", headers={"Range": "bytes=1-"})
        self.assertEqual(rsp.code, 206)
        self.assertEqual(rsp.body, book_body[1:])


    def test_download_permission(self):
        with mock_permission() as user:
            user.set_permission("S")  # forbid
            rsp = self.fetch("/api/book/1.epub")
            self.assertEqual(rsp.code, 403)

            user.set_permission("s")  # allow
            rsp = self.fetch("/api/book/1.epub")
            self.assertEqual(rsp.code, 200)

    def mock_convert(self):
        class MockConvertPath:
            def __init__(self, path=None):
                if not path:
                    path = testdir + "/cases/old.epub"
                self.mock1 = mock.patch("webserver.services.convert.ConvertService.get_path_of_fmt", return_value=path)
                self.mock2 = mock.patch("webserver.services.convert.ConvertService.do_ebook_convert", return_value=True)

            def __enter__(self):
                self.mock1.start()
                return self.mock2.start()

            def __exit__(self, type, value, trace):
                self.mock1.stop()
                self.mock2.stop()

        return MockConvertPath()

    def test_push(self):
        with self.mock_convert() as m:
            d = self.json("/api/book/1/push", method="POST", body="mail_to=unittest@gmail.com")
            self.assertEqual(d["err"], "ok")
            self.assertTrue(m.call_count + self.mail.call_count <= 2)

    def test_push_permission(self):
        with self.mock_convert():
            with mock_permission() as user:
                # forbid
                user.set_permission("P")
                d = self.json("/api/book/1/push", method="POST", body="mail_to=unittest@gmail.com")
                self.assertEqual(d["err"], "permission")

        with self.mock_convert() as m:
            with mock_permission() as user:
                # allow
                user.set_permission("p")
                d = self.json("/api/book/1/push", method="POST", body="mail_to=unittest@gmail.com")
                self.assertEqual(d["err"], "ok")
                self.assertTrue(m.call_count + self.mail.call_count <= 2)

    def test_delete(self):
        global _app
        with mock.patch.object(_app.settings["legacy"], "delete_book", return_value="Yo") as m:
            # because 'delete' trigger a refresh
            with mock_permission() as user:
                # default
                d = self.json("/api/book/1/delete", method="POST", body="")
                self.assertEqual(d["err"], "ok")
                self.assertEqual(m.call_count, 1)

            with mock_permission() as user:
                user.set_permission("D")  # forbid
                d = self.json("/api/book/1/delete", method="POST", body="")
                self.assertEqual(d["err"], "permission")
                self.assertEqual(m.call_count, 1)

            with mock_permission() as user:
                user.set_permission("d")  # allow
                d = self.json("/api/book/1/delete", method="POST", body="")
                self.assertEqual(d["err"], "ok")
                self.assertEqual(m.call_count, 2)

    def test_read(self):
        with mock.patch("webserver.services.convert.ConvertService.convert_and_save", return_value="Yo"):
            for bid in BIDS:
                rsp = self.fetch("/read/%s" % bid, follow_redirects=False)
                self.assertEqual(rsp.code, 302 if bid == BID_PDF or bid == BID_TXT else 200)

    def test_edit(self):
        body = {
            "id": 5,
            "title": "老人与海",
            "rating": 8,
            "count_visit": 4,
            "count_download": 1,
            "timestamp": "2022-01-20",
            "pubdate": "1999-10-01",
            "collector": "admin",
            "authors": ["海明威"],
            "author": "海明威",
            "tags": ["海明威", "老人与海", "外国文学", "经典", "励志", "小说", "名著", "美国"],
            "author_sort": "海明威",
            "publisher": "上海译文出版社",
            "comments": "本书讲述了一个渔夫的故事。古巴老渔夫圣地亚哥在连续八十四天没捕到鱼的情况下。",
            "series": "x",
            "language": None,
            "isbn": "9787532723447",
            "is_public": True,
            "is_owner": True,
        }
        with mock.patch.object(_app.settings["legacy"], "set_metadata", return_value="Yo"):
            r = self.json("/api/book/1/edit", method="POST", raise_error=True, body=json.dumps(body))
            self.assertEqual(r["err"], "ok")


class TestReferDouban(TestWithUserLogin):
    def setUp(self):
        self.douban_url = "http://10.0.0.15:7001"
        try:
            requests.get(self.douban_url, timeout=2)
        except:
            self.skipTest("without douban plugin, skip refer test")
        super().setUp()

    def tttest_refer(self):
        # with mock.patch("plugins.meta.baike.BaiduBaikeApi.get_book", return_value=self.fake_baidu) as m:
        main.CONF["douban_baseurl"] = self.douban_url
        d = self.json("/api/book/1/refer")
        self.assertEqual(d["err"], "ok")

        global _app
        with mock.patch.object(_app.settings["legacy"], "set_metadata", return_value="Yo"):
            for book in d["books"]:
                body = "provider_key=%(provider_key)s&provider_value=%(provider_value)s" % book
                r = self.json("/api/book/1/refer", method="POST", raise_error=True, body=body)
                self.assertEqual(r["err"], "ok")


class TestRefer(TestWithUserLogin):
    @mock.patch("webserver.plugins.meta.douban.DoubanBookApi.search_books")
    @mock.patch("webserver.plugins.meta.douban.DoubanBookApi.get_book_by_isbn")
    @mock.patch("webserver.plugins.meta.douban.DoubanBookApi.get_book_by_id")
    @mock.patch("webserver.plugins.meta.douban.DoubanBookApi.get_cover")
    @mock.patch("webserver.plugins.meta.baike.BaiduBaikeApi._baike")
    @mock.patch("webserver.plugins.meta.baike.BaiduBaikeApi.get_cover")
    def test_refer(self, m6, m5, m4, m3, m2, m1):
        from tests.test_douban import DOUBAN_BOOK, DOUBAN_SEARCH
        from tests.test_baike import BAIKE_PAGE

        m1.return_value = DOUBAN_SEARCH['books']
        m2.return_value = dict(DOUBAN_BOOK)
        m3.return_value = dict(DOUBAN_BOOK)
        m4.return_value = ("jpg", b"image-body")

        m5.return_value = BAIKE_PAGE
        m6.return_value = ("jpg", b"image-body")

        # with mock.patch("plugins.meta.baike.BaiduBaikeApi.get_book", return_value=self.fake_baidu) as m:
        # main.CONF["douban_baseurl"] = self.douban_url
        d = self.json("/api/book/1/refer")
        self.assertEqual(d["err"], "ok")

        global _app
        with mock.patch.object(_app.settings["legacy"], "set_metadata", return_value="Yo"):
            for book in d["books"]:
                body = "provider_key=%(provider_key)s&provider_value=%(provider_value)s" % book
                r = self.json("/api/book/1/refer", method="POST", raise_error=True, body=body)
                self.assertEqual(r["err"], "ok")


class TestUserSignUp(TestWithUserLogin):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1
        self.mail = _mock_mail.start()
        self.mail.return_value = True
        self.async_service = _mock_service_async_mode.start()
        self.async_service.return_value = False

    @classmethod
    def tearDownClass(self):
        self.delete_user()
        _mock_mail.stop()

    @classmethod
    def get_user(self):
        return get_db().query(models.Reader).filter(models.Reader.username == "unittest")

    @classmethod
    def delete_user(self):
        self.get_user().delete()
        get_db().commit()

    def test_signup(self):
        self.delete_user()
        self.mail.reset_mock()

        d = self.json("/api/user/sign_up", method="POST", raise_error=True, body="")
        self.assertEqual(d["err"], "params.invalid")

        body = "email=unittest@gmail.com&nickname=unittest&username=unittest&password=unittest"
        d = self.json("/api/user/sign_up", method="POST", raise_error=True, body=body)
        self.assertEqual(d["err"], "ok")
        self.assertEqual(self.mail.call_count, 1)

        user = self.get_user().first()
        self.assertEqual(user.name, "unittest")
        self.assertEqual(user.email, "unittest@gmail.com")
        self.assertEqual(user.active, False)

        code = "123456"
        rsp = self.fetch("/api/active/%s/%s" % ("unittest", code))
        self.assertEqual(rsp.code, 403)

        code = user.get_active_code()
        rsp = self.fetch("/api/active/%s/%s" % ("unittest", code), follow_redirects=False)
        self.assertEqual(rsp.code, 302)
        user = self.get_user().first()
        self.assertEqual(user.active, True)

        self.user.return_value = user.id
        d = self.json("/api/user/active/send")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(self.mail.call_count, 2)

        # build fake auth header unittest:unittest
        f = FakeHandler()
        f.request.headers["Authorization"] = "xxxxx"
        self.assertEqual(False, BaseHandler.process_auth_header(f))

        f.request.headers["Authorization"] = self.auth("username:password")
        self.assertEqual(False, BaseHandler.process_auth_header(f))

        f.request.headers["Authorization"] = self.auth("unittest:password")
        self.assertEqual(False, BaseHandler.process_auth_header(f))

        ts = int(time.time())
        f.request.headers["Authorization"] = self.auth("unittest:unittest")
        self.assertEqual(True, BaseHandler.process_auth_header(f))
        self.assertTrue(int(f.cookie["invited"]) >= ts)
        self.assertTrue(int(f.cookie["lt"]) >= ts)
        self.assertTrue(int(f.cookie["lt"]) >= ts)

        self.delete_user()

    def auth(self, s):
        return "Basic " + base64.encodebytes(s.encode("ascii")).decode("ascii")

class TestWithAdminUser(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()


class TestAdmin(TestWithAdminUser):
    def test_admin_users(self):
        d = self.json("/api/admin/users")
        self.assertEqual(d["err"], "ok")
        self.assertEqual(d["users"]["total"], 31)

    def test_admin_settings(self):
        d = self.json("/api/admin/settings")
        self.assertEqual(d["err"], "ok")
        self.assertTrue(len(d["settings"]) > 10)

        with mock.patch.object(loader.SettingsLoader, "set_store_path", return_value="/tmp/"):
            req = {"site_title": "abc", "not_work": "en"}
            d = self.json("/api/admin/settings", method="POST", body=json.dumps(req))
            self.assertEqual(d["err"], "ok")
            self.assertEqual(d["rsp"]["site_title"], "abc")
            self.assertTrue("not_work" not in d["rsp"])


class TestOpds(TestWithUserLogin):
    def parse_xml(self, text):
        from xml.parsers.expat import ParserCreate

        ParserCreate()

    def test_opds(self):
        rsp = self.fetch("/opds/")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_nav(self):
        rsp = self.fetch("/opds/nav/4e617574686f7273?offset=1")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_nav2(self):
        main.CONF["opds_max_ungrouped_items"] = 2
        navs = [
                b'Nauthors',
                b'Nlanguages',
                b'Npublisher',
                b'Nrating',
                b'Nseries',
                b'Ntags',
                b'Onewest',
                b'Otitle',
        ]
        groups = [
            2,
            main.CONF["opds_max_ungrouped_items"],
        ]
        for nav in navs:
            url = "/opds/nav/%s" % nav.hex()
            for g in groups:
                main.CONF["opds_max_ungrouped_items"] = g
                rsp = self.fetch(url)
                self.assertEqual(rsp.code, 200)
                self.parse_xml(rsp.body)

    def test_opds_category(self):
        a = b'tags'.hex()
        b = b'I71:tags'.hex()
        rsp = self.fetch("/opds/category/%s/%s" % (a,b))
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    @unittest.skip("category里的search功能暂时搞不懂，以后考虑删掉")
    def test_opds_category_search(self):
        b = ("I"+urllib.parse.quote("韩寒")+":authors").encode("UTF-8").hex()
        a = b"search".hex()
        b = b'I5:authors'.hex()
        b = "I文学:tags".encode("UTF-8").hex()
        rsp = self.fetch("/opds/category/%s/%s" % (a, b))
        self.assertEqual(rsp.code, 200, rsp.body)
        self.parse_xml(rsp.body)

    def test_opds_category_group(self):
        a = b'tags'.hex()
        b = b'C'.hex()
        rsp = self.fetch("/opds/categorygroup/%s/%s" % (a,b))
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_search(self):
        rsp = self.fetch("/opds/search/%s" % urllib.parse.quote("韩寒"))
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_search_not_found(self):
        rsp = self.fetch("/opds/search/%s" % urllib.parse.quote("豪士"))
        self.assertEqual(rsp.code, 404)

    def test_opds_without_login(self):
        main.CONF["INVITE_MODE"] = True
        rsp = self.fetch("/opds/nav/%s" % b'Otitle'.hex())
        self.assertEqual(rsp.code, 401)
        main.CONF["INVITE_MODE"] = False


class TestJsonResponse(TestApp):
    def raise_(self, err):
        raise err

    def assertHeaders(self, headers):
        self.assertEqual(
            headers,
            {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Credentials": "true",
                "Cache-Control": "max-age=0",
            },
        )

    def test_err(self):
        f = FakeHandler()
        with mock.patch("traceback.format_exc", return_value=""):
            webserver.handlers.base.js(lambda x: self.raise_(RuntimeError()))(f)
        self.assertTrue(isinstance(f.rsp["msg"], str))
        self.assertEqual(f.rsp["err"], "exception")
        self.assertHeaders(f.rsp_headers)

    def test_finish(self):
        f = FakeHandler()
        with mock.patch("traceback.format_exc", return_value=""):
            webserver.handlers.base.js(lambda x: self.raise_(web.Finish()))(f)
        self.assertEqual(f.rsp, "")
        self.assertHeaders(f.rsp_headers)


class TestInviteMode(TestApp):
    def setUp(self):
        main.CONF["INVITE_MODE"] = True
        TestApp.setUp(self)

    def tearDown(self):
        main.CONF["INVITE_MODE"] = False
        TestApp.tearDown(self)

    def test_index(self):
        d = self.json("/api/index")
        self.assertEqual(d["err"], "not_invited")

        d = self.json("/api/book/1")
        self.assertEqual(d["err"], "not_invited")

        r = self.fetch("/api/book/1.epub")
        self.assertEqual(r.code, 401)

    def test_opds_index(self):
        r = self.fetch("/opds/")
        self.assertEqual(r.code, 401)

        r = self.fetch("/opds/nav/4e617574686f7273?offset=1")
        self.assertEqual(r.code, 401)


def setUpModule():
    os.environ["ASYNC_TEST_TIMEOUT"] = "60"
    setup_server()
    setup_mock_user()
    setup_mock_sendmail()
    setup_mock_service()


if __name__ == "__main__":
    '''
    logging.basicConfig(
        level=logging.DEBUG,
        datefmt="%Y-%m-%d %H:%M:%S",
        filename="/data/log/unittest.log",
        format="%(asctime)s %(levelname)7s %(pathname)s:%(lineno)d %(message)s",
    )'''
    unittest.main()
