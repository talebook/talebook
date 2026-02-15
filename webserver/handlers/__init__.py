#!/usr/bin/python
# -*- coding: UTF-8 -*-
import logging


def routes():
    from . import book
    from . import user
    from . import meta
    from . import files
    from . import opds
    from . import admin
    from . import scan
    from . import captcha

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
