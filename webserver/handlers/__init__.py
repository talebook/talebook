#!/usr/bin/python
# -*- coding: UTF-8 -*-
import logging


def routes():
    from . import admin, book, captcha, files, meta, opds, scan, user

    routes = []
    routes += admin.routes()
    routes += scan.routes()
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    captcha_routes = captcha.routes()
    routes += captcha_routes
    logging.info("CAPTCHA routes registered: %s", [r[0] for r in captcha_routes])
    routes += files.routes()
    return routes
