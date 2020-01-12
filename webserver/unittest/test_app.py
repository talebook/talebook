#!/usr/bin/python
#-*- coding: UTF-8 -*-

import sys, os, unittest, json, urllib, mock, logging
from tornado import testing

sys.path.append('..')
import server, models

_app = None
_mock_user = None
_mock_mail = None

def setup_server():
    global _app
    server.options.with_library = "./library/"
    server.CONF['ALLOW_GUEST_PUSH'] = False
    server.CONF['installed'] = True
    server.CONF['user_database'] = 'sqlite:///users.db'
    _app = server.make_app()


def setup_mock_user():
    global _mock_user
    import handlers
    _mock_user = mock.patch.object(handlers.base_handlers.BaseHandler, 'user_id', return_value=1)

def setup_mock_sendmail():
    global _mock_mail
    import handlers
    _mock_mail = mock.patch('handlers.user_handlers.sendmail', return_value='Yo')

def get_db():
    return _app.settings['ScopedSession']

def Q(s):
    if not isinstance(s, (str,unicode)): s = str(s)
    return urllib.quote(s.encode("UTF-8"))

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
        rsp = self.fetch("/api/book/1.epub")
        self.assertEqual(rsp.code, 403)

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

    def test_push(self):
        import handlers
        with mock.patch.object(handlers.book_handlers.BookPush, 'convert_book', return_value='Yo') as m:
            d = self.json("/api/book/1/push", method='POST', body='mail_to=unittest@gmail.com')
            self.assertEqual(d['err'], 'ok')
            # should convert then push
            self.assertEqual(m.call_count, 1)
            self.assertEqual(self.mail.call_count, 0)

    def test_read(self):
        rsp = self.fetch("/read/1")
        self.assertEqual(rsp.code, 200)

    def test_refer(self):
        d = self.json("/api/book/1/refer")
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


def setUpModule():
    setup_server()
    setup_mock_user()
    setup_mock_sendmail()

if __name__ == '__main__':
    logging.basicConfig(level=logging.ERROR, format='%(asctime)s %(levelname)s %(filename)s:%(lineno)d %(message)s')
    unittest.main()


