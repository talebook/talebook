from social_core.exceptions import AuthForbidden
from social_core.pipeline.user import create_user
from social_tornado.handlers import AuthHandler, CompleteHandler, DisconnectHandler
from tornado.web import url

from webserver import demo_mode, i18n, loader
from webserver.base_path import PublicPathMixin


CONF = loader.get_settings()


class SocialRegistrationDisabled(AuthForbidden):
    pass


def create_user_if_registration_allowed(strategy, details, backend, user=None, *args, **kwargs):
    # social_user has already resolved the provider-bound user (or the signed-in
    # account). Only a callback that needs a new local account is registration.
    if user is None and not CONF.get("ALLOW_REGISTER", False):
        raise SocialRegistrationDisabled(backend)
    return create_user(strategy, details, backend, user, *args, **kwargs)


class DemoModeDisabledMixin(PublicPathMixin):
    def prepare(self):
        if demo_mode.is_demo_mode(CONF):
            self.set_status(403)
            self.finish({"err": "demo.read_only", "msg": "演示模式不支持社交账号操作"})
            return None
        return super().prepare()


class DemoProtectedAuthHandler(DemoModeDisabledMixin, AuthHandler):
    pass


class DemoProtectedCompleteHandler(DemoModeDisabledMixin, CompleteHandler):
    def _complete(self, backend):
        try:
            return super()._complete(backend)
        except SocialRegistrationDisabled:
            i18n.set_language(
                i18n.choose_language(
                    self.get_cookie("i18n_redirected", ""),
                    self.request.headers.get("Accept-Language", ""),
                )
            )
            self.set_status(403)
            self.set_header("Content-Type", "text/plain; charset=UTF-8")
            self.finish(i18n._("本站已关闭自助注册。需要账号时，请联系管理员。"))


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
