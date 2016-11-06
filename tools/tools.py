#!/usr/bin/calibre-debug
#-*- coding: UTF-8 -*-

"""
This is the standard runscript for all of calibre's tools.
Do not modify it unless you know what you are doing.
"""

import sys, os, logging

path = os.environ.get('CALIBRE_PYTHON_PATH', '/usr/lib/calibre')
if path not in sys.path:
    sys.path.insert(0, path)

sys.resources_location = os.environ.get('CALIBRE_RESOURCES_PATH', '/usr/share/calibre')
sys.extensions_location = os.environ.get('CALIBRE_EXTENSIONS_PATH', '/usr/lib/calibre/calibre/plugins')
sys.executables_location = os.environ.get('CALIBRE_EXECUTABLES_PATH', '/usr/bin')

from webserver import main
from webserver import douban
from calibre.db.legacy import LibraryDatabase

class App:
    def __init__(self, library_path):
        self.fmt = "[%6s] [%4d/%4d] [ISBN=%13s] [Title=%s]"
        self.db = LibraryDatabase(os.path.expanduser(library_path))

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
            print self.fmt % ("404", book_id, self.total, "", title)
            return

        if mi.cover_data[0]: douban_mi.cover_data = None
        mi.smart_update(douban_mi, replace_metadata=True)
        self.db.set_metadata(book_id, mi)
        print self.fmt % ("Update", book_id, self.total, douban_mi.isbn, mi.title)

    def update_all_by_isbn(self):
        ids = self.db.search_getting_ids('', None)
        self.total = max(ids)
        books = self.db.get_data_as_dict(ids=ids)

        need_update = []
        for book in books:
            if book['comments']: continue
            if book['tags']: continue
            if book['isbn']: continue
            if int(book['id']) < 5347: continue
            print self.fmt%("Todo", book['id'], self.total, book['isbn'], book['title'])
            self.do_book_update(book['id'])


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print "%s library-path-dir" % sys.argv[0]
        exit(0)
    app = App(sys.argv[1])
    app.update_all_by_isbn()


