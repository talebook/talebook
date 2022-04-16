#!/usr/bin/calibre-debug
# -*- coding: UTF-8 -*-
# flake8: noqa

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import sys, os, logging, re
from calibre.ebooks.metadata.book.base import Metadata
import datetime

path = os.environ.get('CALIBRE_PYTHON_PATH', '/usr/lib/calibre')
if path not in sys.path:
    sys.path.insert(0, path)
sys.path.insert(0, '../')

sys.resources_location = os.environ.get('CALIBRE_RESOURCES_PATH', '/usr/share/calibre')
sys.extensions_location = os.environ.get('CALIBRE_EXTENSIONS_PATH', '/usr/lib/calibre/calibre/plugins')
sys.executables_location = os.environ.get('CALIBRE_EXECUTABLES_PATH', '/usr/bin')

from webserver.plugins.meta import douban
from calibre.db.legacy import LibraryDatabase

class App:
    def __init__(self, library_path):
        self.fmt = "[%6s] [%4d/%4d] [ISBN=%13s] [Title=%s]"
        if os.path.isfile(library_path):
            library_path = os.path.dirname(library_path)
        self.db = LibraryDatabase(os.path.expanduser(library_path))

    def log_error(self, msg):
        print("\033[1;31;40m%s\033[0m" % msg)

    def log_succ(self, msg):
        print("\033[1;32;40m%s\033[0m" % msg)

    def get_baike_metadata(self, title):
        from webserver.plugins.meta.baike.baidubaike.baidubaike import Page

        try: baike = Page(title)
        except: return None

        info = baike.get_info()
        print("\n".join( "%s:\t%s" % v for v in info.items()))
        mi = Metadata(info['title'])
        plat = info.get(u'首发网站', None)
        if not plat:
            plat = info.get(u'首发状态', "网络小说平台")
        plat = plat.replace(u'首发', '')
        mi.publisher = info.get(u'连载平台', plat)
        mi.authors   = [info[u'作者']]
        mi.isbn      = '0000000000001'
        mi.tags      = baike.get_tags()
        mi.pubdate   = datetime.datetime.now()
        mi.timestamp = datetime.datetime.now()
        mi.comments  = baike.get_summary()
        if u'完结' in info.get(u'连载状态', ""):
            day = re.findall('\d*-\d*-\d*', info[u'连载状态'])
            try: mi.pubdate = datetime.datetime.strptime(day[0], '%Y-%m-%d')
            except: pass
        return mi

    def do_book_update(self, book_id):
        book_id = int(book_id)
        mi = self.db.get_metadata(book_id, index_is_id=True)
        #if not mi.comments or mi.comments == "None":
            #logging.error("\n\n[%s]\n=================\nCalibre Metadata:\n%s\n===========" % (mi.title, mi))

        title = mi.title
        mi.title = title.split("(")[0].split("（")[0].strip()
        #douban_mi = douban.select_douban_metadata(mi)
        douban_mi = douban.get_douban_metadata(mi)
        if not douban_mi:
            try:
                douban_mi = self.get_baike_metadata(mi.title)
            except Exception as e:
                logging.error(e)
                pass

        if not douban_mi:
            self.log_error(self.fmt % ("404", book_id, self.total, "", title))
            return

        if mi.cover_data[0]: douban_mi.cover_data = None
        mi.smart_update(douban_mi, replace_metadata=True)
        self.db.set_metadata(book_id, mi)
        self.log_succ(self.fmt % ("Update", book_id, self.total, douban_mi.isbn, mi.title))

    def update_all_by_isbn(self):
        ids = self.db.search_getting_ids('', None)
        self.total = max(ids)
        books = self.db.get_data_as_dict(ids=ids)

        need_update = []
        for book in books:
            if book['comments']: continue
            if book['tags']: continue
            if book['isbn']: continue
            if int(book['id']) < 6722: continue
            print(self.fmt%("Todo", book['id'], self.total, book['isbn'], book['title']))
            self.do_book_update(book['id'])


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print("%s library-path-dir" % sys.argv[0])
        exit(0)
    app = App(sys.argv[1])
    #print app.get_baike_metadata(u'法神重生')
    app.update_all_by_isbn()


