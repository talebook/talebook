#!/usr/bin/python
#-*- coding: UTF-8 -*-

import sys, os, unittest, json, urllib, mock, logging
from tornado import testing

sys.path.append('..')
import server

_app = None

def setUpServer():
    global _app
    server.options.with_library = "./library/"
    server.CONF['installed'] = True
    server.CONF['user_database'] = 'sqlite:///users.db'
    _app = server.make_app()

def Q(s):
    if not isinstance(s, (str,unicode)): s = str(s)
    return urllib.quote(s.encode("UTF-8"))

class TestApp(testing.AsyncHTTPTestCase):
    def get_app(self):
        return _app

    def json(self, url):
        rsp = self.fetch(url)
        self.assertEqual(rsp.code, 200)
        return json.loads(rsp.body)

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
        if not d['files']:
            logging.error("BOOK=%s" % d)
        self.assertEqual(len(d['files']), max(1, len(d['files'])))

    def assert_book_list(self, d, at_least):
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['total'], max(at_least, d['total']))
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
            try:
                url = "/api/%s/%s" % (meta, Q(m['name']))
            except:
                logging.error("META=%s" % m)
                continue
            a = self.json(url)
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


class TestAppWithUser(TestApp):
    @classmethod
    def setUpClass(self):
        import handlers
        self.user = mock.patch.object(handlers.base_handlers.BaseHandler, 'user_id')
        self.user.return_value = 1
        self.user.start()

        import calibre
        self.sendmail = mock.patch.object(calibre.utils.smtp, 'sendmail')
        self.sendmail.return_value = True
        self.sendmail.start()

    @classmethod
    def tearDownClass(self):
        self.user.stop()
        self.sendmail.stop()

    def test_userinfo(self):
        d = self.json("/api/user/info")
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['user']['is_login'], True)

        d = self.json("/api/user/info?detail=1")
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['user']['is_login'], True)
        self.assertEqual(d['sys'], {})
        self.assertTrue(len(d['user']['extra']['download_history']) >= 1)

def setUpModule():
    setUpServer()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    unittest.main()


