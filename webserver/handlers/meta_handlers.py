#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
from tornado import web
from base_handlers import BaseHandler, ListHandler, js
from calibre.utils.filenames import ascii_filename


class TagList(ListHandler):
    @js
    def get(self):
        title = _(u'全部标签')
        category = "tags"
        tags = self.all_tags_with_count()
        hot_tags = []
        for tag_name, tag_count in tags.items():
            if tag_count < 5: continue
            hot_tags.append( (tag_name, tag_count) )
        hot_tags.sort(lambda x,y: cmp(y[1], x[1]))
        tags = hot_tags
        items = [ {"name": x, "count": y} for x,y in tags ]
        return {"title": title, "items": items }

class TagBooks(ListHandler):
    def get(self, name):
        title = _(u'含有"%(name)s"标签的书籍') % vars()
        category = "tags"
        books = self.get_item_books(category, name)
        return self.render_book_list(books, vars());

class AuthorList(ListHandler):
    @js
    def get(self):
        title = _(u'全部作者')
        category = "authors"
        authors = self.db.all_authors()
        authors.sort(cmp=lambda x,y: cmp(x[1], y[1]))
        items = [ {"id": x, "name": y} for x,y in authors ]
        return {"title": title, "items": items }

class AuthorBooks(ListHandler):
    def get(self, name):
        title = _(u'%(name)s编著的书籍') % vars()
        category = "authors"
        books = self.get_item_books(category, name)
        return self.render_book_list(books, vars());

class PubList(ListHandler):
    @js
    def get(self):
        title = _(u'全部出版社')
        category = "publisher"
        publishers = self.cache.get_id_map(category).items()
        items = [ {"id": x, "name": y} for x,y in publishers ]
        return {"title": title, "items": items }

class PubBooks(ListHandler):
    def get(self, name):
        title = _(u'%(name)s出版的书籍') % vars()
        category = "publisher"
        books = self.get_item_books(category, name)
        return self.render_book_list(books, vars());

class AuthorBooksUpdate(ListHandler):
    def post(self, name):
        category = "authors"
        author_id = self.cache.get_item_id(category, name)
        ids = self.db.get_books_for_category(category, author_id)
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect('/author/%s'%name, 302)

class PubBooksUpdate(ListHandler):
    def post(self, name):
        category = "publisher"
        publisher_id = self.cache.get_item_id(category, name)
        if publisher_id:
            ids = self.db.get_books_for_category(category, publisher_id)
        else:
            ids = self.cache.search_for_books('')
            books = self.db.get_data_as_dict(ids=ids)
            ids = [ b['id'] for b in books if not b['publisher'] ]
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect('/pub/%s'%name, 302)

class RatingList(ListHandler):
    @js
    def get(self):
        title = _(u'全部评分')
        category = "rating"
        ratings = self.cache.get_id_map(category).items()
        ratings.sort(cmp=lambda x,y: cmp(x[1], y[1]))
        items = [ {"id": x, "name": y} for x,y in ratings ]
        return {"title": title, "items": items }

class RatingBooks(ListHandler):
    def get(self, name):
        title = _('评分为%(name)s星的书籍') % vars()
        category = "rating"
        books = self.get_item_books(category, int(name))
        return self.render_book_list(books, vars());

class SeriesList(ListHandler):
    @js
    def get(self):
        title = _(u'丛书列表')
        category = "series"
        items = []
        for item in self.get_category_with_count(category):
            if item['count'] < 2: continue
            items.append( item )
        items.sort(cmp=lambda x,y: cmp(y['count'], x['count']))
        return {"title": title, "items": items }

class SeriesBooks(ListHandler):
    def get(self, name):
        title = _('"%(name)s"丛书包含的书籍') % vars()
        category = "series"
        books = self.get_item_books(category, name)
        return self.render_book_list(books, vars());

def routes():
    return [
        ( r'/api/author',             AuthorList        ),
        ( r'/api/author/(.*)',        AuthorBooks       ),
        ( r'/api/author/(.*)/update', AuthorBooksUpdate ),
        ( r'/api/tag',                TagList           ),
        ( r'/api/tag/(.*)',           TagBooks          ),
        ( r'/api/pub',                PubList           ),
        ( r'/api/pub/(.*)',           PubBooks          ),
        ( r'/api/pub/(.*)/update',    PubBooksUpdate    ),
        ( r'/api/rating',             RatingList        ),
        ( r'/api/rating/(.*)',        RatingBooks       ),
        ( r'/api/series',             SeriesList        ),
        ( r'/api/series/(.*)',        SeriesBooks       ),
        ]

