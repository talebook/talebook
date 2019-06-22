#!/usr/bin/python
#-*- coding: UTF-8 -*-

import json
import sys
import logging
from urllib import quote_plus as urlencode


def fmt(b, host, img):
    def get(k, default=_("Unknown")):
        v = b.get(k, None)
        if not v: v = default
        return v

    collector = b.get('collector', {}).get('username', None)
    try:
        pubdate = b['pubdate'].strftime("%Y-%m-%d")
    except:
        pubdate = None

    d = {
        'id':              b['id'],
        'title':           b['title'],
        'rating':          b['rating'],
        'count_visit':     get('count_visit', 0),
        'count_download':  get('count_download', 0),
        'timestamp':       b['timestamp'].strftime("%Y-%m-%d"),
        'pubdate':         pubdate,
        'collector':       collector,
        'author':          ', '.join(b['authors']),
        'authors':         b['authors'],
        'tag':             ' / '.join(b['tags']),
        'tags':            b['tags'],
        'author_sort':     get('author_sort'),
        'publisher':       get('publisher'),
        'comments':        get('comments',  _(u'暂无简介') ),
        'series':          get('series',    None),
        'language':        get('language',  None),
        'isbn':            get('isbn',      None),

        "img":             img+"/get/cover/%(id)s.jpg?t=%(timestamp)s" % b,
        "cover_large_url": img+"/get/thumb_600_840/%(id)s.jpg?t=%(timestamp)s" % b,
        "cover_url":       img+"/get/thumb_155_220/%(id)s.jpg?t=%(timestamp)s" % b,
        }
    return d

def json_output(self, vals):
    host = 'https://'+self.request.host
    img = vals['IMG']
    books = [ fmt(b, host, img) for b in list(vals['books']) ]
    return {
            'category': vals.get('category', None),
            "title": vals['title'],
        "total": vals['count'],
        'books': books,
        }

