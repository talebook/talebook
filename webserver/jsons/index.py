#!/usr/bin/python
#-*- coding: UTF-8 -*-

import logging
from urllib import quote_plus as urlencode

def book(host, b):
    pub = b.get("publisher", None)
    if not pub: pub = _("Unknown")

    author_sort = b.get('author_sort', None)
    if not author_sort: author_sort = _("Unknown")

    comments = b.get("comments", None)
    if not comments: comments = _(u"点击浏览详情")

    return {
            "id": b['id'],
            "title": b['title'],
            "rating": b['rating'],
            "author": ", ".join(b['authors']),
            "publisher": pub,
            "comments": comments,

            "cover_large_url": host + "/get/thumb_600_840/%(id)s.jpg?t=%(timestamp)s" % b,
            "cover_url": host + "/get/thumb_155_220/%(id)s.jpg?t=%(timestamp)s" % b,
            "author_url": host + "/author/" + author_sort,
            "publisher_url": host + "/pub/" + pub,
            }

def json_output(self, vals):
    host = "https://" + self.request.host
    data = {
        "title": self.settings['site_title'],
        "random_books_count": len(vals['random_books']),
        "new_books_count": len(vals['new_books']),
        "random_books": [ book(host, b) for b in vals['random_books'] ],
        "new_books": [ book(host, b) for b in vals['new_books'] ],
    }
    user = vals['request'].user
    if user:
        data['user'] = {
                "avatar": user.avatar,
                "username": user.username,
                }
    return data

