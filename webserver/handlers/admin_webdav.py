#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import tornado.escape

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.i18n import _


CONF = loader.get_settings()


class WebDAVStatus(BaseHandler):
    """公开的 WebDAV 状态查询接口，无需登录即可访问。"""

    @js
    def get(self):
        from webserver.services.webdav_service import WebDAVService

        service = WebDAVService.instance()
        return {
            "err": "ok",
            "running": service.is_running(),
            "port": service.get_port() or CONF.get("WEBDAV_PORT", 8083),
        }


class AdminWebDAV(BaseHandler):
    @js
    @auth
    def get(self):
        if not self.admin_user:
            return {"err": "permission", "msg": _("无权访问此接口")}
        from webserver.services.webdav_service import WebDAVService

        service = WebDAVService.instance()
        return {
            "err": "ok",
            "running": service.is_running(),
            "port": service.get_port() or CONF.get("WEBDAV_PORT", 8083),
        }

    @js
    @auth
    def post(self):
        if not self.admin_user:
            return {"err": "permission", "msg": _("无权访问此接口")}

        data = tornado.escape.json_decode(self.request.body)
        action = data.get("action", "")

        from webserver.services.webdav_service import WebDAVService

        service = WebDAVService.instance()

        if action == "start":
            port = int(CONF.get("WEBDAV_PORT", 8083))
            username = CONF.get("WEBDAV_USERNAME", "")
            password = CONF.get("WEBDAV_PASSWORD", "")
            library_path = CONF.get("with_library", "/data/books/library/")
            ok = service.start(library_path, port, username or None, password or None)
            if ok:
                return {
                    "err": "ok",
                    "msg": _("WebDAV 服务已启动"),
                    "running": True,
                    "port": service.get_port() or port,
                }
            return {"err": "start_failed", "msg": _("WebDAV 服务启动失败，请检查日志"), "running": False}

        if action == "stop":
            service.stop()
            return {"err": "ok", "msg": _("WebDAV 服务已停止"), "running": False}

        return {"err": "params.invalid", "msg": _("无效操作")}


def routes():
    return [
        (r"/api/webdav/status", WebDAVStatus),
        (r"/api/admin/webdav", AdminWebDAV),
    ]
