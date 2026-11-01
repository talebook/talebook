import asyncio

from webserver import kosync
from webserver.handlers.base import BaseHandler, auth, js


class KOSyncProxy(BaseHandler):
    @js
    @auth
    async def post(self):
        def reply(result):
            self.set_header("Cache-Control", "private, no-store")
            self.finish(result)

        try:
            payload = kosync.parse_proxy_request(self.request)
        except kosync.KOSyncOriginError as exc:
            return reply({"err": "kosync.origin", "msg": str(exc)})
        except kosync.KOSyncError as exc:
            return reply({"err": "kosync.params", "msg": str(exc)})
        acquired = False
        try:
            await asyncio.wait_for(kosync.SLOTS.acquire(), timeout=2)
            acquired = True
            return reply(await kosync.proxy_request(payload))
        except asyncio.TimeoutError:
            return reply({"err": "kosync.busy", "msg": "KOSync is busy; try again shortly"})
        except kosync.KOSyncError as exc:
            return reply({"err": "kosync.upstream", "msg": str(exc)})
        finally:
            if acquired:
                kosync.SLOTS.release()


def routes():
    return [(r"/api/kosync", KOSyncProxy)]
