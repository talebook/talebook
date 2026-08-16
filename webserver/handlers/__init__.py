#!/usr/bin/python
# -*- coding: UTF-8 -*-
import logging


def routes():
    from webserver.webdav import handler as webdav

    from . import (
        admin,
        ai,
        audiobook,
        book,
        booksource_admin,
        captcha,
        files,
        meta,
        network_library,
        opds,
        scan,
        skill_library,
        theme,
        user,
    )

    routes = []
    routes += admin.routes()
    routes += scan.routes()
    routes += opds.routes()
    routes += book.routes()
    routes += user.routes()
    routes += meta.routes()
    routes += booksource_admin.routes()
    routes += network_library.routes()
    routes += audiobook.routes()
    routes += ai.routes()
    routes += skill_library.routes()
    captcha_routes = captcha.routes()
    routes += captcha_routes
    logging.info("CAPTCHA routes registered: %s", [r[0] for r in captcha_routes])
    routes += theme.routes()  # 必须在 files.routes() 之前，否则静态 catch-all 会拦截 /api/themes/*
    routes += webdav.routes()  # 必须在 files.routes() 之前，否则静态 catch-all 会拦截 /books/*
    routes += files.routes()
    return routes
