from social_tornado.handlers import AuthHandler, CompleteHandler, DisconnectHandler
from tornado.web import url

from webserver import demo_mode, loader


CONF = loader.get_settings()


class DemoModeDisabledMixin:
    def prepare(self):
        if demo_mode.is_demo_mode(CONF):
            self.set_status(403)
            self.finish({"err": "demo.read_only", "msg": "演示模式不支持社交账号操作"})
            return None
        return super().prepare()


class DemoProtectedAuthHandler(DemoModeDisabledMixin, AuthHandler):
    pass


class DemoProtectedCompleteHandler(DemoModeDisabledMixin, CompleteHandler):
    pass


class DemoProtectedDisconnectHandler(DemoModeDisabledMixin, DisconnectHandler):
    pass


SOCIAL_AUTH_ROUTES = [
    url(r"/auth/login/(?P<backend>[^/]+)/?", DemoProtectedAuthHandler, name="begin"),
    url(r"/auth/complete/(?P<backend>[^/]+).do", DemoProtectedCompleteHandler, name="complete"),
    url(r"/auth/disconnect/(?P<backend>[^/]+)/?", DemoProtectedDisconnectHandler, name="disconnect"),
    url(
        r"/auth/disconnect/(?P<backend>[^/]+)/(?P<association_id>\d+)/?",
        DemoProtectedDisconnectHandler,
        name="disconect_individual",
    ),
]
