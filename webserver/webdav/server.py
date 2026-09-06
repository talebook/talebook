# -*- coding: UTF-8 -*-
import logging

from wsgidav.wsgidav_app import WsgiDAVApp

from webserver import loader
from webserver.base_path import BASE_PATH

from .dav_provider import MyBooksDavProvider


CONF = loader.get_settings()


def create_webdav_app(calibre_cache, sqlite_session):
    """
    Create and configure the WsgiDAV WSGI application.

    Args:
        calibre_cache: Calibre library cache (new_api)
        sqlite_session: SQLAlchemy Session factory (callable returning a new
            Session) used for user authentication and reading states.

    Returns:
        A configured WsgiDAVApp instance.
    """

    def get_session():
        return sqlite_session()

    provider = MyBooksDavProvider(calibre_cache, get_session_func=get_session)

    config = {
        "host": "0.0.0.0",
        "port": 8080,
        "app_title": "Talebook/WebDAV",
        "mount_path": BASE_PATH,
        "provider_mapping": {
            "/books": provider,
        },
        "http_authenticator": {
            # Pass the module path as string so WsgiDAV can import it.
            "domain_controller": "webserver.webdav.auth.WebDavDomainController",
            "accept_basic": True,
            "accept_digest": False,
            "default_to_digest": False,
        },
        "verbose": 1,
        "logging": {
            "enable_loggers": [],
        },
        "property_manager": True,
        "lock_storage": True,
        # Customize directory browser appearance.
        "dir_browser": {
            "icon": False,  # Hide the default logo.png
            "davmount": False,  # Disable the MS Office mount helper
            "ms_sharepoint_support": False,
            "ignore": [".DS_Store", "Thumbs.db", "._*"],
            "show_user": True,
            "show_logout": True,
            "htdocs_path": CONF["resource_path"] + "/webdav/",
        },
        # Stored so the domain controller can access the session factory.
        "mybooks_session": sqlite_session,
    }

    # Monkey-patch: restore the original ordering of WsgiDavDirBrowser._get_context
    # (directories first, files after) using the provider's real member list.
    from wsgidav.dir_browser._dir_browser import WsgiDavDirBrowser

    if not getattr(WsgiDavDirBrowser, "_patched_for_order", False):
        original_get_context = WsgiDavDirBrowser._get_context

        def custom_get_context(self, environ, dav_res):
            context = original_get_context(self, environ, dav_res)
            if hasattr(dav_res, "get_member_list") and context.get("rows"):
                original_names = [m.get_display_name() for m in dav_res.get_member_list()]
                name_to_row = {row["display_name"]: row for row in context["rows"]}

                sorted_rows = []
                for name in original_names:
                    if name in name_to_row:
                        sorted_rows.append(name_to_row[name])

                dirs = [r for r in sorted_rows if r.get("is_collection")]
                files = [r for r in sorted_rows if not r.get("is_collection")]
                context["rows"] = dirs + files

            return context

        WsgiDavDirBrowser._get_context = custom_get_context
        WsgiDavDirBrowser._patched_for_order = True

    logging.info("Creating WebDAV application with WsgiDAV v4.x configuration")
    app = WsgiDAVApp(config)

    return app
