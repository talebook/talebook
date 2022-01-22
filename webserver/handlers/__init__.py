#!/usr/bin/python
# -*- coding: UTF-8 -*-

from . import book
from . import user
from . import meta
from . import files
from . import opds


def routes():
    routes = []
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    routes += files.routes()
    return routes
