#!/usr/bin/python
#-*- coding: UTF-8 -*-

from collections import OrderedDict
from tornado.options import define, options

class Cache(object):
    def __init__(self,  db):
        self.set_database(db)

    def reset_caches(self):
        self._category_cache = OrderedDict()
        self._search_cache = OrderedDict()

    def search_cache(self, search):
        from calibre.utils.date import utcnow
        old = self._search_cache.pop(search, None)
        if old is None or old[0] <= self.db.last_modified():
            matches = self.search_for_books(search) or []
            self._search_cache[search] = (utcnow(), frozenset(matches))
            if len(self._search_cache) > 50:
                self._search_cache.popitem(last=False)
        else:
            self._search_cache[search] = old
        return self._search_cache[search][1]

    def categories_cache(self, restrict_to=frozenset([])):
        from calibre.utils.date import utcnow
        base_restriction = self.search_cache('')
        if restrict_to:
            restrict_to = frozenset(restrict_to).intersection(base_restriction)
        else:
            restrict_to = base_restriction
        old = self._category_cache.pop(frozenset(restrict_to), None)
        if old is None or old[0] <= self.db.last_modified():
            categories = self.db.get_categories(ids=restrict_to)
            self._category_cache[restrict_to] = (utcnow(), categories)
            if len(self._category_cache) > 20:
                self._category_cache.popitem(last=False)
        else:
            self._category_cache[frozenset(restrict_to)] = old
        return self._category_cache[restrict_to][1]

    def set_database(self, db):
        self.db = db
        virt_libs = db.prefs.get('virtual_libraries', {})
        sr = getattr(options, 'restriction', None)
        msg = 'WARNING: Content server: search restriction %s does not exist' % sr
        if sr:
            if sr in virt_libs:
                sr = virt_libs[sr]
            elif sr not in self.db.saved_search_names():
                logging.error(msg)
                sr = ''
            else:
                sr = 'search:"%s"'%sr
        else:
            sr = db.prefs.get('cs_virtual_lib_on_startup', '')
            if sr:
                if sr not in virt_libs:
                    logging.error(msg)
                    sr = ''
                else:
                    sr = virt_libs[sr]
        self.search_restriction = sr
        self.reset_caches()

    def search_for_books(self, query):
        return self.db.search_getting_ids(
            (query or '').strip(), self.search_restriction,
            sort_results=False, use_virtual_library=False)

