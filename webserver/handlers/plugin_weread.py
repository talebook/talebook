"""微信读书插件的专属 HTTP 接口。

工作台需要的只读查询与笔记导入。通用插件 CRUD、动作与运行历史见
handlers/plugins.py。
"""

import datetime

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.handlers.plugins_common import body as _body
from webserver.handlers.plugins_common import error as _error
from webserver.models import PluginConnection, PluginInstallation, PluginRun, PluginRunItem, PluginSecret
from webserver.plugins.runtime import WEREAD_PLUGIN_KEY, ProviderAuthError, ProviderError, WereadProvider
from webserver.services.annotation_writer import all_book_ids, confirm_match
from webserver.services.plugin_runtime import (
    DEFAULT_CONNECTION_ROLE,
    PluginRuntime,
    PluginRuntimeError,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipher, SecretCipherError, redact


def _weread_connection(handler):
    installation = handler.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == WEREAD_PLUGIN_KEY).first()
    if installation is None:
        return None, None
    connection = (
        handler.session.query(PluginConnection)
        .filter(
            PluginConnection.installation_id == installation.id,
            PluginConnection.owner_type == "user",
            PluginConnection.owner_id == handler.user_id(),
            PluginConnection.role == DEFAULT_CONNECTION_ROLE,
        )
        .first()
    )
    return installation, connection


def _ensure_weread_connection(handler, api_key=None):
    installation, connection = _weread_connection(handler)
    if installation is None:
        installation = install_builtin(handler.session, WEREAD_PLUGIN_KEY, handler.user_id())
    if not installation.enabled:
        raise PluginRuntimeError("plugin.installation_disabled", "WeRead integration is disabled")
    if connection is None or api_key:
        connection = save_connection(
            handler.session,
            loader.get_settings(),
            installation.id,
            "user",
            handler.user_id(),
            {"api_key": api_key.strip()} if api_key else {},
            name="微信读书",
            role=DEFAULT_CONNECTION_ROLE,
        )
    if not connection.enabled:
        raise PluginRuntimeError("plugin.connection_disabled", "WeRead connection is disabled")
    return connection


def _weread_api_key(handler, connection):
    secret = handler.session.get(PluginSecret, connection.secret_id) if connection else None
    if secret is None:
        raise PluginRuntimeError("plugin.credentials_missing", "Provide a WeRead API key")
    values = SecretCipher(loader.get_settings()).decrypt(secret.ciphertext)
    api_key = str(values.get("api_key") or "")
    if not api_key:
        raise PluginRuntimeError("plugin.credentials_missing", "Provide a WeRead API key")
    return api_key


def _weread_state(handler):
    _, connection = _weread_connection(handler)
    if connection is None:
        return {"connection": None, "runs": []}
    secret = handler.session.get(PluginSecret, connection.secret_id)
    runs = (
        handler.session.query(PluginRun)
        .filter(PluginRun.connection_id == connection.id)
        .order_by(PluginRun.id.desc())
        .limit(20)
        .all()
    )
    return {"connection": connection.to_public_dict(secret), "runs": [run.to_public_dict() for run in runs]}


class UserWeread(BaseHandler):
    @js
    @auth
    def get(self):
        return {
            "err": "ok",
            **_weread_state(self),
            "operations": [
                "search",
                "book_info",
                "chapters",
                "progress",
                "shelf",
                "statistics",
                "notebooks",
                "highlights",
                "my_reviews",
                "popular_highlights",
                "underline_stats",
                "highlight_reviews",
                "review_detail",
                "public_reviews",
                "recommendations",
                "similar",
                "friends_reading",
            ],
            "read_only": True,
            "skill_version": "1.0.4",
        }


class UserWereadQuery(BaseHandler):
    @js
    @auth
    def post(self):
        connection = None
        try:
            req = _body(self)
            api_key = req.get("api_key")
            if api_key is not None and (not isinstance(api_key, str) or not api_key.strip()):
                raise PluginRuntimeError("plugin.credentials_invalid", "WeRead API key must be a non-empty string")
            params = req.get("params", {})
            if not isinstance(params, dict):
                raise PluginRuntimeError("params.invalid", "WeRead query parameters must be an object")
            connection = _ensure_weread_connection(self, api_key)
            stored_key = _weread_api_key(self, connection)
            data = WereadProvider().query(stored_key, req.get("operation", ""), params)
            connection.health = "healthy"
            connection.health_message = "WeRead read-only API connected"
            connection.last_tested_at = datetime.datetime.now()
            self.session.commit()
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {
                "err": "ok",
                "connection": connection.to_public_dict(secret),
                "data": redact(data, {"api_key": stored_key}),
            }
        except (PluginRuntimeError, ProviderError, SecretCipherError, TypeError, ValueError) as exc:
            if connection is not None and isinstance(exc, ProviderError):
                connection.health = "unauthorized" if isinstance(exc, ProviderAuthError) else "degraded"
                connection.health_message = str(exc)
                connection.last_tested_at = datetime.datetime.now()
                self.session.commit()
            return _error(exc)


class UserWereadImport(BaseHandler):
    def _allowed_book_ids(self):
        return [book_id for book_id in all_book_ids(self.db) if self.get_book(book_id, raise_exception=False) is not None]

    @js
    @auth
    def get(self):
        return {"err": "ok", **_weread_state(self)}

    @js
    @auth
    def post(self):
        try:
            req = _body(self)
            action = req.get("action", "preview")
            if action not in {"test", "preview", "run"}:
                raise PluginRuntimeError("plugin.action_invalid", "Unsupported WeRead import action")
            export_data = req.get("export")
            api_key = req.get("api_key")
            if api_key is not None and (not isinstance(api_key, str) or not api_key.strip()):
                raise PluginRuntimeError("plugin.credentials_invalid", "WeRead API key must be a non-empty string")

            connection = _ensure_weread_connection(self, api_key)
            if export_data is None and not api_key:
                secret = self.session.get(PluginSecret, connection.secret_id) if connection else None
                if secret is None or not secret.mask_hint:
                    raise PluginRuntimeError(
                        "plugin.credentials_missing",
                        "Provide a WeRead API key or official export JSON",
                    )

            allowed_book_ids = self._allowed_book_ids()
            matches = req.get("matches") or {}
            if not isinstance(matches, dict):
                raise PluginRuntimeError("plugin.request_invalid", "matches must be an object")
            for source_book_id, book_id in matches.items():
                try:
                    confirm_match(
                        self.session,
                        connection.id,
                        str(source_book_id),
                        int(book_id),
                        self.user_id(),
                        self.db,
                        allowed_book_ids,
                    )
                except (TypeError, ValueError) as exc:
                    raise PluginRuntimeError("plugin.match_book_forbidden", str(exc)) from exc

            input_data = {"allowed_book_ids": allowed_book_ids}
            if export_data is not None:
                input_data["export"] = export_data
            runtime = PluginRuntime(self.session, loader.get_settings(), calibre_db=self.db)
            run = runtime.prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger="manual",
                input_data=input_data,
            )
            runtime.execute(run.id)
            self.session.refresh(run)
            items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
            return {
                "err": "ok",
                "connection": connection.to_public_dict(self.session.get(PluginSecret, connection.secret_id)),
                "run": run.to_public_dict(),
                "items": [item.to_public_dict(include_data=True) for item in items],
            }
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


def routes():
    return [
        (r"/api/plugins/weread", UserWeread),
        (r"/api/plugins/weread/query", UserWereadQuery),
        (r"/api/plugins/weread/import", UserWereadImport),
    ]
