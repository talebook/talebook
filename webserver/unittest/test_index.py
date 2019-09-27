#!/usr/bin/python
#-*- coding: UTF-8 -*-

import sys, os, unittest, json, urllib, mock
from tornado import testing

import logging

sys.path.append('..')
import server

app = None

def Q(s):
    return urllib.quote(s.encode("UTF-8"))

class TestApp(testing.AsyncHTTPTestCase):
    def get_app(self):
        return app

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
        #d = self.json("/api/book/%s"%book['id'])
        #self.assertTrue('files' in book)

    def test_index(self):
        d = self.json("/api/index")
        self.assertEqual(len(d['new_books']), 10)
        self.assertEqual(len(d['random_books']), 8)
        for book in d['new_books'] + d['random_books']:
            self.assert_book_simple(book)

        book = d['new_books'][0]
        for author in book['authors']:
            self.json("/api/author/"+Q(author))

        self.json("/api/author/"+Q(book['author']))
        self.json("/api/pub/"+Q(book['publisher']))

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
        self.assert_book_list(d, 16)

    def test_hot(self):
        d = self.json("/api/hot")
        self.assert_book_list(d, 0)

    def test_recent(self):
        d = self.json("/api/recent")
        self.assert_book_list(d, 29)

    def test_download(self):
        rsp = self.fetch("/api/book/1.epub")
        self.assertEqual(rsp.code, 403)

    def assert_book_list(self, d, at_least):
        self.assertEqual(d['err'], 'ok')
        self.assertEqual(d['total'], max(at_least, d['total']))
        n = len(d['books'])
        if n < 30:
            self.assertEqual(d['total'], n)
        self.assertTrue(n <= 30)
        for book in d['books']:
            self.assert_book(book)

def mock_cookie(*args, **kwargs):
    print("mock.patch.call = %s, %s" % (args, kwargs))
    return 1

class TestAppWithUser(TestApp):
    @classmethod
    def setUpClass(self):
        import handlers
        self.m = mock.patch.object(handlers.base_handlers.BaseHandler, 'user_id')
        self.m.return_value = 1

    @classmethod
    def tearDownClass(self):
        pass

    def test_userinfo(self):
        self.m.start()
        d = self.json("/api/user/info")
        self.assertEqual(d['err'], 'ok')
        self.m.stop()


def setUpModule():
    global app
    server.options.with_library = "."
    server.CONF['installed'] = True
    server.CONF['user_database'] = 'sqlite:///users.db'
    app = server.make_app()

if __name__ == '__main__':
    logging.basicConfig(level=logging.DEBUG)
    unittest.main()


