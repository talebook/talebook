#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import base64
import json
import logging
import os
import sys
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


def setup_server():
    global _app
    # main.init_calibre()
    main.options.with_library = testdir + "/library/"
    main.CONF["ALLOW_GUEST_PUSH"] = False
    main.CONF["ALLOW_GUEST_DOWNLOAD"] = False
    main.CONF["upload_path"] = "/tmp/"
    main.CONF["html_path"] = "/tmp/"
    main.CONF["settings_path"] = "/tmp/"
    main.CONF["progress_path"] = "/tmp/"
    main.CONF["installed"] = True
    main.CONF["INVITE_MODE"] = False
    main.CONF["user_database"] = "sqlite:///%s/users.db" % testdir
    _app = main.make_app()


def setup_mock_user():
    global _mock_user
    _mock_user = mock.patch.object(BaseHandler, "user_id", return_value=1)


def setup_mock_sendmail():
    global _mock_mail
    _mock_mail = mock.patch("calibre.utils.smtp.sendmail", return_value="Yo")


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
        d = self.json("/api/index")
        self.assertEqual(len(d["new_books"]), 9)
        self.assertEqual(len(d["random_books"]), 8)
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
        self.assertEqual(d["sys"]["books"], 10)

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
        self.assert_meta("tag", 4)

    def test_author(self):
        self.assert_meta("author", 10)

    def test_series(self):
        self.assert_meta("series", 1)

    def test_publisher(self):
        self.assert_meta("publisher", 5)

    def test_rating(self):
        self.assert_meta("rating", 1)


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
        self.user.return_value = 1
        self.mail.return_value = True

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()
        _mock_mail.stop()


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

        rsp = self.fetch("/api/book/1.pdf")
        self.assertEqual(rsp.code, 404)

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
                    path = testdir + "/library/Han Han/Ta De Guo (5)/Ta De Guo - Han Han.epub"
                self.mock1 = mock.patch.object(webserver.handlers.book.BookPush, "get_path_of_fmt", return_value=path)
                self.mock2 = mock.patch("webserver.handlers.book.do_ebook_convert", return_value=True)

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
        with mock.patch.object(webserver.handlers.book.BookRead, "extract_book", return_value="Yo"):
            rsp = self.fetch("/read/1")
            self.assertEqual(rsp.code, 200)

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


class TestUpload(TestWithUserLogin):
    def mtest_upload(self):
        from email.mime.application import MIMEApplication
        from email.mime.multipart import MIMEMultipart

        fpath = testdir + "/library/Han Han/Ta De Guo (5)/Ta De Guo - Han Han.epub"
        fname = u"中文书籍.epub"
        with open(fpath, "rb") as f:
            fdata = f.read()

        with mock.patch.object(_app.settings["legacy"], "import_book", return_value="Yo") as m:
            with mock.patch("models.Item.save", return_value="Yo"):
                # build multipart message
                app = MIMEApplication(fdata, "octet-stream", charset="utf-8")
                app.add_header("Content-Disposition", "form-data", name="ebook", filename=fname)
                msg = MIMEMultipart("form-data")
                msg.attach(app)
                # split headers and body from message
                form = msg.as_string().split("\n\n", 1)
                headers = dict(line.split(": ", 1) for line in form[0].split("\n"))
                body = form[1].replace("\n", "\r\n")
                # send request
                # FIXME: tornado save original ASCII into file ?
                r = self.json("/api/book/upload", method="POST", headers=headers, body=body)
                self.assertEqual(r["err"], "ok")
                self.assertEqual(m.call_count, 1)


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


class TestAdmin(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()

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
        urls = [
            "/opds/nav/4e617574686f7273",
            "/opds/nav/4e6c616e677561676573",
            "/opds/nav/4e7075626c6973686572",
            "/opds/nav/4e726174696e67",
            "/opds/nav/4e736572696573",
            "/opds/nav/4e74616773",
            "/opds/nav/4f6e6577657374",
            "/opds/nav/4f7469746c65",
        ]
        groups = [
            2,
            main.CONF["opds_max_ungrouped_items"],
        ]
        for url in urls:
            for g in groups:
                main.CONF["opds_max_ungrouped_items"] = g
                rsp = self.fetch(url)
                self.assertEqual(rsp.code, 200)
                self.parse_xml(rsp.body)

    def test_opds_category(self):
        rsp = self.fetch("/opds/category/617574686f7273/4931303a617574686f7273")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

        import binascii

        c = binascii.hexlify(b"search").decode("utf-8")
        rsp = self.fetch("/opds/category/%s/4931303a617574686f7273" % c)
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_category_group(self):
        rsp = self.fetch("/opds/categorygroup/74616773/43")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_search(self):
        rsp = self.fetch("/opds/search/cool")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_without_login(self):
        main.CONF["INVITE_MODE"] = True
        rsp = self.fetch("/opds/nav/4f7469746c65")
        self.assertEqual(rsp.code, 401)
        main.CONF["INVITE_MODE"] = False


class TestConvert(TestApp):
    def test_convert(self):
        fin = testdir + "/library/Han Han/Ta De Guo (5)/Ta De Guo - Han Han.epub"
        fout = "/tmp/output.mobi"
        flog = "/tmp/output.log"
        ok = webserver.handlers.book.do_ebook_convert(fin, fout, flog)
        self.assertEqual(ok, True)


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
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(levelname)5s %(pathname)s:%(lineno)d %(message)s",
    )
    setup_server()
    setup_mock_user()
    setup_mock_sendmail()


if __name__ == "__main__":
    unittest.main()
