#!/usr/bin/env python3
#-*- coding: UTF-8 -*-

import sys, os, unittest, json, urllib, mock, logging
from tornado import testing

dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(dir))
import server, models, settings


_app = None
_mock_user = None
_mock_mail = None

def setup_server():
    global _app
    server.options.with_library = dir + "/library/"
    server.CONF['ALLOW_GUEST_PUSH'] = False
    server.CONF['ALLOW_GUEST_DOWNLOAD'] = False
    server.CONF['html_path'] = "/tmp/"
    server.CONF['settings_path'] = "/tmp/"
    server.CONF['progress_path'] = "/tmp/"
    server.CONF['installed'] = True
    server.CONF['INVITE_MODE'] = False
    server.CONF['user_database'] = 'sqlite:///%s/users.db' % dir
    _app = server.make_app()


def setup_mock_user():
    global _mock_user
    import handlers
    _mock_user = mock.patch.object(handlers.base.BaseHandler, 'user_id', return_value=1)



def setup_mock_sendmail():
    global _mock_mail
    import handlers
    _mock_mail = mock.patch('handlers.user.sendmail', return_value='Yo')


def get_db():
    return _app.settings['ScopedSession']


def Q(s):
    if not isinstance(s, str): s = str(s)
    return urllib.parse.quote(s.encode("UTF-8"))

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
        self.assertTrue('img' in book )
        self.assertTrue('authors' in book )
        self.assertTrue('comments' in book )
        self.assertTrue('id' in book )
        self.assertTrue('publisher' in book )
        self.assertTrue('rating' in book )
        self.assertTrue('title' in book )

    def assert_book_fields(self, book):
        self.assert_book_simple(book)
        self.assertTrue('tags' in book )
        self.assertTrue('timestamp' in book )
        self.assertTrue('collector' in book )
        self.assertTrue('count_visit' in book )
        self.assertTrue('count_download' in book )
        self.assertTrue('pubdate' in book )
        self.assertTrue('series' in book )

    def assert_book(self, book):
        self.assert_book_fields(book)
        d = self.json("/api/book/%s"%book['id'])['book']
        self.assert_book_fields(d)
        self.gt(len(d['files']), 1)

    def assert_book_list(self, d, at_least):
        self.assertEqual(d['err'], 'ok')
        self.gt(d['total'], at_least)
        n = len(d['books'])
        if n < 30:
            self.assertEqual(d['total'], n)
        self.assertTrue(n <= 30)
        for book in d['books']:
            self.assert_book(book)

class TestAppWithoutLogin(TestApp):
    def test_index(self):
        d = self.json("/api/index")
        self.assertEqual(len(d['new_books']), 9)
        self.assertEqual(len(d['random_books']), 8)
        for book in d['new_books'] + d['random_books']:
            self.assert_book_simple(book)

        book = d['new_books'][0]
        for author in book['authors']:
            self.json("/api/author/"+Q(author))

        self.json("/api/author/"+Q(book['author']))
        self.json("/api/publisher/"+Q(book['publisher']))

    def test_search(self):
        d = self.json("/api/search")
        self.assertEqual(d['err'], 'params.invalid')

        d = self.json("/api/search?hack")
        self.assertEqual(d['err'], 'params.invalid')

        d = self.json("/api/search?name=NotFound")
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['total'], 0)
        self.assertEqual(len(d['books']), 0)

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
        d = self.json("/api/book/1/push", method='POST', body='mail_to=unittest@gmail.com')
        self.assertEqual(d['err'], 'user.need_login')

    def test_user_info(self):
        d = self.json("/api/user/info")
        self.assertEqual(d['user']['is_login'], False)
        self.assertEqual(d['user']['is_admin'], False)
        self.assertEqual(d['sys']['books'], 10)

        d = self.json("/api/user/info?detail=1")
        self.assertEqual(d['user']['is_login'], False)
        self.assertEqual(d['sys'], {})

    def test_book(self):
        d = self.json("/api/book/1")

class TestMeta(TestApp):
    def assert_meta(self, meta, total):
        d = self.json("/api/%s" % meta )
        self.assertEqual(len(d['items']), total)
        for m in d['items']:
            url = "/api/%s/%s" % (meta, Q(m['name']))
            a = self.json(url)
            self.gt(len(a['books']), 1)
            b = self.json(url+"?size=3")
            c = self.json(url+"?start=3")
            d = self.json(url+"?sort=timestamp")
            self.assertEqual(a['total'], b['total'])
            self.assertEqual(a['total'], c['total'])
            self.assertEqual(a['total'], d['total'])


    def test_tag(self): self.assert_meta('tag', 4)
    def test_author(self): self.assert_meta('author', 10)
    def test_series(self): self.assert_meta('series', 1)
    def test_publisher(self): self.assert_meta('publisher', 5)
    def test_rating(self): self.assert_meta('rating', 1)


class AutoResetPermission():
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


class TestUser(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1
        self.mail = _mock_mail.start()
        self.mail.return_value = True

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()
        _mock_mail.stop()

    def test_userinfo(self):
        d = self.json("/api/user/info")
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['user']['is_login'], True)

        d = self.json("/api/user/info?detail=1")
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['user']['is_login'], True)
        self.assertEqual(d['sys'], {})
        self.assertTrue(len(d['user']['extra']['download_history']) >= 1)

    def test_download(self):
        rsp = self.fetch("/api/book/1.epub")
        self.assertEqual(rsp.code, 200)

        rsp = self.fetch("/api/book/1.pdf")
        self.assertEqual(rsp.code, 404)

    def test_get_cover(self):
        rsp = self.fetch("/get/cover/1.jpg", follow_redirects=False)
        self.assertEqual(rsp.code, 200)

    def test_get_thumb(self):
        rsp = self.fetch("/get/thumb_80x80/1.jpg", follow_redirects=False)
        self.assertEqual(rsp.code, 200)

    def test_get_opf(self):
        rsp = self.fetch("/get/opf/1", follow_redirects=False)
        self.assertEqual(rsp.code, 200)

    def test_download_permission(self):
        with mock_permission() as user:
            user.set_permission('S') # forbid
            rsp = self.fetch("/api/book/1.epub")
            self.assertEqual(rsp.code, 403)

            user.set_permission('s') # allow
            rsp = self.fetch("/api/book/1.epub")
            self.assertEqual(rsp.code, 200)


    def test_push(self):
        import handlers
        with mock.patch.object(handlers.book.BookPush, 'convert_and_mail', return_value='Yo') as m:
            d = self.json("/api/book/1/push", method='POST', body='mail_to=unittest@gmail.com')
            self.assertEqual(d['err'], 'ok')
            self.assertTrue(m.call_count + self.mail.call_count <= 2)

    def test_push_permission(self):
        import handlers
        with mock.patch.object(handlers.book.BookPush, 'convert_and_mail', return_value='Yo') as m:
            with mock_permission() as user:
                # forbid
                user.set_permission('P')
                d = self.json("/api/book/1/push", method='POST', body='mail_to=unittest@gmail.com')
                self.assertEqual(d['err'], 'permission')

        with mock.patch.object(handlers.book.BookPush, 'convert_and_mail', return_value='Yo') as m:
            with mock_permission() as user:
                # allow
                user.set_permission('p')
                d = self.json("/api/book/1/push", method='POST', body='mail_to=unittest@gmail.com')
                self.assertEqual(d['err'], 'ok')
                self.assertTrue(m.call_count + self.mail.call_count <= 2)

    def test_delete(self):
        global _app
        with mock.patch.object(_app.settings['legacy'], 'delete_book', return_value='Yo') as m:
            # because 'delete' trigger a refresh
            with mock_permission() as user:
                # default
                d = self.json("/api/book/1/delete", method='POST', body="")
                self.assertEqual(d['err'], 'ok')
                self.assertEqual(m.call_count, 1)

            with mock_permission() as user:
                user.set_permission("D") # forbid
                d = self.json("/api/book/1/delete", method='POST', body="")
                self.assertEqual(d['err'], 'permission')
                self.assertEqual(m.call_count, 1)

            with mock_permission() as user:
                user.set_permission("d") # allow
                d = self.json("/api/book/1/delete", method='POST', body="")
                self.assertEqual(d['err'], 'ok')
                self.assertEqual(m.call_count, 2)

    def test_read(self):
        import handlers
        with mock.patch.object(handlers.book.BookRead, 'extract_book', return_value='Yo') as m:
            rsp = self.fetch("/read/1")
            self.assertEqual(rsp.code, 200)

    def test_refer(self):
        server.CONF['douban_baseurl'] = 'http://10.0.0.15:7001'
        d = self.json("/api/book/1/refer")
        self.assertEqual(d['err'], 'ok')

        for book in d['books']:
            isbn = book['isbn']
            body = "isbn=%s" % isbn
            r = self.json("/api/book/1/refer", method='POST', raise_error=True, body=body)
            self.assertEqual(r['err'], 'ok')

    def add_user(self):
        self.mail.reset_mock()
        body = "email=active@gmail.com&nickname=active&username=active&password=active66"
        d = self.json("/api/user/sign_up", method='POST', raise_error=True, body=body)
        self.assertTrue(d['err'] in ['ok', 'params.username.exist'])

    def test_login(self):
        #rsp = self.fetch("/api/done", follow_redirects=False)
        #self.assertEqual(rsp.code, 302)
        self.add_user()

        user = get_db().query(models.Reader).filter(models.Reader.username=='active').first()
        user.permission = ""
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d['err'], 'ok')

        user = get_db().query(models.Reader).filter(models.Reader.username=='active').first()
        user.set_permission("L")
        logging.debug("user[%s] id[%s] permission[%s]", user.username, user.id, user.permission)
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d['err'], 'permission')

        user = get_db().query(models.Reader).filter(models.Reader.username=='active').first()
        user.set_permission("l")
        d = self.json("/api/user/sign_in", method="POST", body="username=active&password=active66")
        self.assertEqual(d['err'], 'ok')



class TestRegister(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1
        self.mail = _mock_mail.start()
        self.mail.return_value = True

    @classmethod
    def tearDownClass(self):
        _mock_mail.stop()

    def get_user(self):
        return get_db().query(models.Reader).filter(models.Reader.username=='unittest')

    def delete_user(self):
        self.get_user().delete()
        get_db().commit()

    def test_signup(self):
        self.delete_user()
        self.mail.reset_mock()

        d = self.json("/api/user/sign_up", method='POST', raise_error=True, body='')
        self.assertEqual(d['err'], 'params.invalid')

        body = "email=unittest@gmail.com&nickname=unittest&username=unittest&password=unittest"
        d = self.json("/api/user/sign_up", method='POST', raise_error=True, body=body)
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(self.mail.call_count, 1)

        user = self.get_user().first()
        self.assertEqual(user.name, 'unittest')
        self.assertEqual(user.email, 'unittest@gmail.com')
        self.assertEqual(user.active, False)

        code = '123456'
        rsp = self.fetch("/api/active/%s/%s" % ('unittest', code))
        self.assertEqual(rsp.code, 403)

        code = user.get_active_code()
        rsp = self.fetch("/api/active/%s/%s" % ('unittest', code), follow_redirects=False)
        self.assertEqual(rsp.code, 302)
        user = self.get_user().first()
        self.assertEqual(user.active, True)

        self.user.return_value = user.id
        d = self.json('/api/user/active/send')
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(self.mail.call_count, 2)

        self.delete_user()


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
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['users']['total'], 31)

    def test_admin_settings(self):
        d = self.json("/api/admin/settings")
        self.assertEqual(d['err'], 'ok')
        self.assertTrue(len(d['settings']) > 10)

        req = {"settings_path": "/tmp/", "site_title": "abc", "not_work": "en"}
        d = self.json("/api/admin/settings", method="POST", body=json.dumps(req))
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['rsp']['site_title'], 'abc')
        self.assertTrue('not_work' not in d['rsp'])

class TestOpds(TestApp):
    @classmethod
    def setUpClass(self):
        self.user = _mock_user.start()
        self.user.return_value = 1
        self.mail = _mock_mail.start()
        self.mail.return_value = True

    @classmethod
    def tearDownClass(self):
        _mock_user.stop()
        _mock_mail.stop()

    def parse_xml(self, text):
        from xml.parsers.expat import ParserCreate, ExpatError, errors
        p = ParserCreate()
        return p.Parse(text)

    def test_opds(self):
        rsp = self.fetch("/opds/")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_nav(self):
        rsp = self.fetch("/opds/nav/4e617574686f7273?offset=1")
        self.assertEqual(rsp.code, 200)
        self.parse_xml(rsp.body)

    def test_opds_nav2(self):
        server.CONF['opds_max_ungrouped_items'] = 2
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
                server.CONF['opds_max_ungrouped_items'],
                ]
        for url in urls:
            for g in groups:
                server.CONF['opds_max_ungrouped_items'] = g
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
        server.CONF['INVITE_MODE'] = True
        rsp = self.fetch("/opds/nav/4f7469746c65")
        self.assertEqual(rsp.code, 401)
        server.CONF['INVITE_MODE'] = False


def setUpModule():
    setup_server()
    setup_mock_user()
    setup_mock_sendmail()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG,
            format='%(asctime)s %(levelname)5s %(pathname)s:%(lineno)d %(message)s')
    unittest.main()


