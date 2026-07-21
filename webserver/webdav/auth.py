# -*- coding: UTF-8 -*-
import logging

from webserver import demo_mode, loader


CONF = loader.get_settings()


class WebDavDomainController:
    """
    Custom authentication controller for the WebDAV service.

    Uses the same authentication mechanism as the site account sign-in
    (webserver.models.Reader.get_secure_password / can_login).

    Implements the WsgiDAV DomainController interface without inheritance.
    """

    def __init__(self, wsgidav_app, config):
        # SQLAlchemy scoped session factory, passed via config["mybooks_session"].
        self.sqlite_session = config.get("mybooks_session", None)
        if not self.sqlite_session:
            logging.error("WebDAV DomainController: sqlite_session not found in config")

    def require_authentication(self, realm, environ):
        """Return True to require authentication for this path."""
        return True

    def basic_auth_user(self, realm, user_name, password, environ):
        """
        Validate user credentials. Returns True on success, False otherwise.
        Mirrors the logic used by the site sign-in flow.
        """
        from webserver.models import Reader

        session = self.sqlite_session()
        try:
            username = user_name.strip().lower()
            password = password.strip()

            if not username or not password:
                logging.warning("WebDAV auth failed: empty username or password")
                return False

            user = session.query(Reader).filter(Reader.username == username).first()

            if not user:
                logging.warning(f"WebDAV auth failed: user '{username}' not found")
                return False

            if user.get_secure_password(password) != user.password:
                logging.warning(f"WebDAV auth failed: invalid password for user '{username}'")
                return False

            if not user.can_login():
                logging.warning(f"WebDAV auth failed: user '{username}' cannot login")
                return False

            if not demo_mode.can_login(CONF, user):
                logging.warning(f"WebDAV auth failed: user '{username}' is not the configured demo account")
                return False

            if not user.can_save() or not user.is_active():
                logging.warning(f"WebDAV auth failed: user '{username}' lacks download permission or is inactive")
                return False

            logging.info(f"WebDAV auth success: user '{username}'")
            environ["webdav.user"] = user
            return True

        except Exception as e:
            logging.error(f"WebDAV authentication error: {e}")
            import traceback

            logging.error(traceback.format_exc())
            return False
        finally:
            session.close()

    def supports_http_digest_auth(self):
        """We only support Basic Auth for simplicity."""
        return False

    def get_domain_realm(self, path_info, environ):
        """Return the realm for the given path."""
        return "Talebook WebDAV"

    def is_share_anonymous(self, share):
        """Return True if the share allows anonymous access."""
        return False

    def auth_domain_user(self, realm, user_name, environ):
        """Return True if user_name is a known user."""
        from webserver.models import Reader

        session = self.sqlite_session()
        try:
            username = user_name.strip().lower()
            user = session.query(Reader).filter(Reader.username == username).first()
            return user is not None and demo_mode.can_login(CONF, user)
        except Exception:
            return False
        finally:
            session.close()
