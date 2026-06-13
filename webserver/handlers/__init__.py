#!/usr/bin/python
# -*- coding: UTF-8 -*-
import logging


def routes():
    from . import admin, admin_webdav, book, booksource_admin, captcha, files, meta, network_library, opds, scan, user

    routes = []
    routes += admin.routes()
    routes += admin_webdav.routes()
    routes += scan.routes()
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    routes += booksource_admin.routes()
    routes += network_library.routes()
    captcha_routes = captcha.routes()
    routes += captcha_routes
    logging.info("CAPTCHA routes registered: %s", [r[0] for r in captcha_routes])
    routes += files.routes()
    return routes
