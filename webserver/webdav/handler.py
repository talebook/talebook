# -*- coding: UTF-8 -*-
import logging
import threading

from tornado.web import RequestHandler
from tornado.wsgi import WSGIContainer

from webserver import loader
from webserver.handlers.base import BaseHandler


CONF = loader.get_settings()

WEBDAV_METHODS = (
    "COPY",
    "LOCK",
    "MKCOL",
    "MOVE",
    "PROPFIND",
    "PROPPATCH",
    "UNLOCK",
)


class WebDAVHandler(BaseHandler):
    """
    Tornado request handler that bridges the WebDAV WSGI application.

    Supports WebDAV queries, downloads and writes (the per-user sync directory
    is writable). The route is always registered; whether the service is
    actually enabled is controlled at request time by ENABLE_WEBDAV_SERVICE.

    The WSGI app is lazily initialized on first request and then cached.
    """

    # Tornado rejects unknown methods before prepare() runs. Register every
    # core WebDAV method that WsgiDAV handles so sync clients can reach it.
    SUPPORTED_METHODS = tuple(dict.fromkeys(RequestHandler.SUPPORTED_METHODS + WEBDAV_METHODS))

    # Lazily-initialized WSGI container; reset via reset_app() when needed.
    _wsgi_container = None
    _wsgi_container_lock = threading.Lock()

    @classmethod
    def reset_app(cls):
        """Discard the cached WSGI app so it is recreated on the next request."""
        with cls._wsgi_container_lock:
            cls._wsgi_container = None

    def _get_wsgi_container(self):
        """Return the cached WSGIContainer, creating it on first use.

        Returns None when the WebDAV service is currently disabled.
        """
        if not CONF.get("ENABLE_WEBDAV_SERVICE", False):
            return None
        with WebDAVHandler._wsgi_container_lock:
            if WebDAVHandler._wsgi_container is None:
                from webserver.webdav.server import create_webdav_app

                wsgi_app = create_webdav_app(self.cache, self.settings["SessionMaker"])
                WebDAVHandler._wsgi_container = WSGIContainer(wsgi_app)
                logging.info("[WebDAV] WSGI app initialized")
        return WebDAVHandler._wsgi_container

    def prepare(self):
        """Called before any HTTP method handler."""
        # Handle collection URL without trailing slash - redirect to add slash.
        request_path = self.request.path
        if request_path == "/books" or (
            request_path.startswith("/books/") and not request_path.endswith("/") and self.request.method == "GET"
        ):
            if request_path == "/books":
                self.redirect(request_path + "/", permanent=False)
                self._finished = True
                return

        self._handle_request()
        self._finished = True

    def _handle_request(self):
        """Delegate the request to the WSGI application."""
        container = self._get_wsgi_container()
        if container is None:
            self.set_status(404)
            self.finish("WebDAV service is not enabled")
            return
        try:
            container(self.request)
        except Exception as e:
            logging.error(f"WebDAV handler error: {e}")
            import traceback

            logging.error(traceback.format_exc())
            self.set_status(500)
            self.finish("Internal Server Error")

    # All WebDAV HTTP methods are handled in prepare(); these bodies are no-ops.
    def get(self, *args, **kwargs):
        pass

    def head(self, *args, **kwargs):
        pass

    def options(self, *args, **kwargs):
        pass

    def propfind(self, *args, **kwargs):
        """WebDAV PROPFIND method - query file/directory properties."""
        pass

    def mkcol(self, *args, **kwargs):
        """WebDAV MKCOL method - create directory."""
        pass

    def copy(self, *args, **kwargs):
        """WebDAV COPY method - copy a resource."""
        pass

    def lock(self, *args, **kwargs):
        """WebDAV LOCK method - create or refresh a resource lock."""
        pass

    def move(self, *args, **kwargs):
        """WebDAV MOVE method - move or rename a resource."""
        pass

    def proppatch(self, *args, **kwargs):
        """WebDAV PROPPATCH method - update resource properties."""
        pass

    def unlock(self, *args, **kwargs):
        """WebDAV UNLOCK method - release a resource lock."""
        pass

    def put(self, *args, **kwargs):
        """HTTP PUT method - upload file."""
        pass

    def delete(self, *args, **kwargs):
        """HTTP DELETE method - delete file/directory."""
        pass


def routes():
    """Return WebDAV routes for assembly in handlers.routes()."""
    return [
        (r"/books/?(.*)", WebDAVHandler),
    ]
