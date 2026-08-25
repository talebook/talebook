"""微信读书插件的专属 HTTP 接口。

工作台需要的只读查询与笔记导入。通用插件 CRUD、动作与运行历史见
handlers/plugins.py。
"""

from webserver import loader
from webserver.handlers.base import BaseHandler, auth, js
from webserver.handlers.plugins_common import body as _body
from webserver.handlers.plugins_common import error as _error
from webserver.models import PluginConnection, PluginInstallation, PluginRun, PluginRunItem
from webserver.plugins.runtime import PluginManifest, UpstreamError
from webserver.services.annotation_writer import all_book_ids, confirm_match
from webserver.services.plugin_runtime import (
    DEFAULT_CONNECTION_ROLE,
    PluginRuntime,
    PluginRuntimeError,
    install_builtin,
    save_connection,
)


WORKBENCH_ROUTE = "/plugins/weread"


def _workbench_manifest(runtime):
    matches = [
        PluginManifest.validate(provider.manifest)
        for provider in runtime.registry.providers()
        if (provider.manifest.get("ui") or {}).get("manage_route") == WORKBENCH_ROUTE
    ]
    if len(matches) != 1:
        raise PluginRuntimeError("plugin.provider_unavailable", "WeRead workbench provider is not available")
    return matches[0]


def _weread_connection(handler):
    runtime = PluginRuntime(handler.session, loader.get_settings())
    manifest = _workbench_manifest(runtime)
    installation = (
        handler.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == manifest.raw["id"]).first()
    )
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
    runtime = PluginRuntime(handler.session, loader.get_settings())
    manifest = _workbench_manifest(runtime)
    installation, connection = _weread_connection(handler)
    if installation is None:
        installation = install_builtin(handler.session, manifest.raw["id"], handler.user_id())
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
            name=manifest.raw["name"],
            role=DEFAULT_CONNECTION_ROLE,
        )
    if not connection.enabled:
        raise PluginRuntimeError("plugin.connection_disabled", "WeRead connection is disabled")
    return connection


def _weread_state(handler):
    _, connection = _weread_connection(handler)
    if connection is None:
        return {"connection": None, "runs": []}
    runtime = PluginRuntime(handler.session, loader.get_settings())
    runs = (
        handler.session.query(PluginRun)
        .filter(PluginRun.connection_id == connection.id)
        .order_by(PluginRun.id.desc())
        .limit(20)
        .all()
    )
    return {"connection": runtime.connection_public_dict(connection), "runs": [run.to_public_dict() for run in runs]}


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
            runtime = PluginRuntime(self.session, loader.get_settings())
            data = runtime.read(connection, "query_with_context", req.get("operation", ""), params)
            return {
                "err": "ok",
                "connection": runtime.connection_public_dict(connection),
                "data": data,
            }
        except (PluginRuntimeError, UpstreamError, TypeError, ValueError) as exc:
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
                runtime = PluginRuntime(self.session, loader.get_settings())
                if not runtime.connection_has_credentials(connection):
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
                "connection": runtime.connection_public_dict(connection),
                "run": run.to_public_dict(),
                "items": [item.to_public_dict(include_data=True) for item in items],
            }
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


def routes():
    return [
        (r"/api/plugins/weread", UserWeread),
        (r"/api/plugins/weread/query", UserWereadQuery),
        (r"/api/plugins/weread/import", UserWereadImport),
    ]
