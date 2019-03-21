#!/usr/bin/python2.7
# vim:fileencoding=UTF-8:ts=4:sw=4:sta:et:sts=4:ai

__license__   = 'GPL v3'
__copyright__ = '2014, Rex<talebook@foxmail.com>'
__docformat__ = 'restructuredtext en'

import os, re, sys, json, logging, datetime, requests
from urllib import urlopen

REMOVES = [
        re.compile(u'^\([^)]*\)\s*'),
        re.compile(u'^\[[^\]]*\]\s*'),
        re.compile(u'^【[^】]*】\s*'),
        re.compile(u'^（[^）]*）\s*')
        ]

CHROME_HEADERS = {
        'Accept-Language': 'zh-CN,zh;q=0.8,zh-TW;q=0.6',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.139 Safari/537.36',
        }


class DoubanBookApi(object):
    def __init__(self, apikey, copy_image=True, manual_select=False):
        self.apikey = apikey
        self.copy_image = copy_image
        self.manual_select = manual_select

    def author(self, book):
        author = book['author']
        if not author: return None
        if isinstance(author, list): return author[0]
        return author

    def get_book_by_isbn(self, isbn):
        API_SEARCH = "https://api.douban.com/v2/book/isbn/%s"
        url = API_SEARCH % isbn
        args = {'apikey': self.apikey}
        rsp = requests.get(url, headers=CHROME_HEADERS, params=args).json()
        if 'code' in rsp and rsp['code'] != 0:
            logging.error("******** douban API error: %d-%s **********" % (rsp['code'], rsp['msg']) )
            return None
        return rsp

    def get_books_by_title(self, title, author=None):
        url = "https://api.douban.com/v2/book/search"
        q = title + " " + author if author else title
        args = {'apikey': self.apikey, 'q': q.encode('UTF-8') }
        rsp = requests.get(url, headers=CHROME_HEADERS, params=args).json()
        if 'code' in rsp and rsp['code'] != 0:
            logging.error("******** douban API error: %d-%s **********" % (rsp['code'], rsp['msg']) )
            return None

        return rsp['books']

    def get_book_by_title(self, title, author=None):
        books = self.get_book_by_title(title, author)
        if not books: return None
        for b in books:
            if not b['author']: b['author'] = b['translator']
            if b['title'] != title and b['title']+":"+b['subtitle'] != title: continue
            if not author: return b
            if self.author(b) == author: return b

        # for console tools
        if not self.manual_select: return None
        print ("\nSearch: <<%s>>, %s" % (title, author))
        for idx, b in enumerate(books):
            t = b['title']
            t += ":" + b['subtitle'] if b['subtitle'] else ""
            a = b['author'][0] if b['author'] else "unknonw"
            print("%6d: <<%s>>, %s, %s/%s" % (idx, t, a, b['rating']['average'], b['rating']['numRaters']))
        try:
            n = int(input("Select: "))
            return books[n]
        except:
            return None

    def str2date(self, s):
        for fmt in ("%Y-%m-%d", "%Y-%m"):
            try:
                return datetime.datetime.strptime(s, fmt)
            except:
                continue
        return None

    def get_book(self, md):
        return self.get_metadata(md)

    def get_metadata(self, md):
        book = None
        if md.isbn:
            book = self.get_book_by_isbn(md.isbn)
        if not book:
            book = self.get_book_by_title(md.title, md.author_sort)
        if not book:
            return None
        return self._metadata(book)

    def _metadata(self, book):
        authors = []
        if book['author']:
            for author in book['author']:
                for r in REMOVES:
                    author = r.sub("", author)
                authors.append( author )
        if not authors: authors = [ u'佚名' ]

        from calibre.ebooks.metadata.book.base import Metadata
        from cStringIO import StringIO
        mi = Metadata(book['title'])
        mi.authors     = authors
        mi.author_sort = mi.authors[0]
        mi.publisher   = book['publisher']
        mi.comments    = book['summary']
        mi.isbn        = book.get('isbn13', None)
        mi.tags        = [ t['name'] for t in book['tags'] ][:8]
        mi.rating      = int(float(book['rating']['average']))
        mi.pubdate     = self.str2date(book['pubdate'])
        mi.timestamp   = datetime.datetime.now()
        mi.douban_id   = book['id']
        mi.douban_author_intro = book['author_intro']
        mi.douban_subtitle = book.get('subtitle', None)
        mi.website     = "https://book.douban.com/isbn/%s" % mi.isbn
        mi.source      = u'豆瓣'

        mi.cover_url = book['images']['large']
        if self.copy_image:
            img = StringIO(urlopen(mi.cover_url).read())
            img_fmt = mi.cover_url.split(".")[-1]
            mi.cover_data = (img_fmt, img)

        logging.debug("=================\ndouban metadata:\n%s" % mi)
        return mi

def get_douban_metadata(mi):
    api = DoubanBookApi()
    try:
        return api.get_metadata(mi, False)
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return None

def select_douban_metadata(mi):
    api = DoubanBookApi()
    try:
        return api.get_metadata(mi, True)
    except Exception as e:
        import traceback
        logging.error(traceback.format_exc())
        return None

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("%s BOOK-TITLE" % sys.argv[0])
        exit(0)

    logging.basicConfig(level=logging.DEBUG)
    from settings import settings
    api = DoubanBookApi(settings['douban_apikey'])
    books = api.get_books_by_title(sys.argv[1].decode('UTF-8'))
    from pprint import pprint
    pprint(books)


