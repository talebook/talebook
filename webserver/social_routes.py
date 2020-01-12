
from tornado.web import url
from social_tornado.handlers import AuthHandler, CompleteHandler, DisconnectHandler

SOCIAL_AUTH_ROUTES = [
    url(r'/auth/login/(?P<backend>[^/]+)/?', AuthHandler, name='begin'),
    url(r'/auth/complete/(?P<backend>[^/]+).do', CompleteHandler, name='complete'),
    url(r'/auth/disconnect/(?P<backend>[^/]+)/?', DisconnectHandler,
        name='disconnect'),
    url(r'/auth/disconnect/(?P<backend>[^/]+)/(?P<association_id>\d+)/?',
        DisconnectHandler, name='disconect_individual'),
]
