import asyncio
import json
from urllib.parse import urlsplit

from tornado import web

from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.loader import get_settings
from webserver.models import AudiobookJob, PluginRun
from webserver.services.application_upgrade import request_executor
from webserver.services.async_service import AsyncService
from webserver.version import VERSION


class AdminUpgrade(BaseHandler):
    @js
    @auth
    @is_admin
    async def get(self):
        return await asyncio.to_thread(request_executor, "status")

    @js
    @auth
    @is_admin
    async def post(self):
        # Existing JSON decorators allow CORS, so require an explicit same-origin JSON request here.
        origin = self.request.headers.get("Origin")
        if (
            self.request.headers.get("X-Talebook-Upgrade") != "1"
            or not self.request.headers.get("Content-Type", "").startswith("application/json")
            or (origin and urlsplit(origin).netloc != self.request.host)
            or self.request.headers.get("Sec-Fetch-Site") == "cross-site"
        ):
            return {"err": "origin"}
        try:
            args = json.loads(self.request.body)
        except (ValueError, TypeError):
            return {"err": "params"}
        if not isinstance(args, dict) or args.get("action") not in ("check", "install"):
            return {"err": "params"}
        return await asyncio.to_thread(request_executor, args["action"], args.get("release"))


class UpgradeHealth(web.RequestHandler):
    """Fixed loopback readiness/drain probe; never routed as a public operation."""

    def get(self):
        if self.request.remote_ip != "127.0.0.1" or self.request.headers.get("X-Forwarded-For"):
            self.set_status(404)
            self.finish()
            return
        conf = get_settings()
        # Remote DBs and custom layouts need a separately reviewed backup/drain adapter.
        supported = (
            conf.get("user_database") == "sqlite:////data/books/calibre-webserver.db"
            and conf.get("with_library").rstrip("/") == "/data/books/library"
            and not conf.get("import_auto_watch_enabled")
            and conf.get("installed") is True
        )
        with self.application.settings["SessionMaker"]() as session:
            durable_busy = (
                session.query(AudiobookJob.id)
                .filter(AudiobookJob.status.in_(("queued", "inspecting", "generating", "finalizing")))
                .first()
                is not None
                or session.query(PluginRun.id).filter(PluginRun.status.in_(("queued", "running"))).first() is not None
            )
        self.write(
            {
                "err": "ok",
                "version": VERSION,
                "supported": supported,
                "busy": BaseHandler.upgrade_requests > 0 or AsyncService().upgrade_busy() or durable_busy,
            }
        )


def routes():
    return [(r"/api/admin/upgrade", AdminUpgrade), (r"/api/upgrade/health", UpgradeHealth)]
