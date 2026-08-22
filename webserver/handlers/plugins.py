import datetime

import tornado.escape

from webserver import loader
from webserver.constants import META_SELECTED_SOURCES, META_SOURCE_AI
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.models import (
    BookSourceModel,
    OpdsSource,
    PluginConnection,
    PluginDefinition,
    PluginInstallation,
    PluginRun,
    PluginRunItem,
    PluginSecret,
)
from webserver.plugins.runtime import (
    WEREAD_PLUGIN_KEY,
    ProviderAuthError,
    ProviderError,
    WereadProvider,
)
from webserver.services.async_service import AsyncService
from webserver.services.metadata_plugin_search import METADATA_PLUGIN_SOURCES, search_metadata_plugin
from webserver.services.plugin_jobs import execute_plugin_run
from webserver.services.plugin_runtime import (
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_capability_installations,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipher, SecretCipherError, redact
from webserver.services.weread_annotations import all_book_ids, confirm_match


def _body(handler):
    try:
        value = tornado.escape.json_decode(handler.request.body or b"{}")
    except ValueError as exc:
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be valid JSON") from exc
    if not isinstance(value, dict):
        raise PluginRuntimeError("plugin.request_invalid", "Request body must be an object")
    return value


def _error(exc):
    return {"err": getattr(exc, "code", "plugin.error"), "msg": str(exc)}


class AdminPlugins(BaseHandler):
    @js
    @is_admin
    def get(self):
        try:
            ensure_builtin_capability_installations(self.session, self.user_id(), loader.get_settings())
            definitions = self.session.query(PluginDefinition).order_by(PluginDefinition.id).all()
            installations = self.session.query(PluginInstallation).order_by(PluginInstallation.id).all()
            definition_map = {item.id: item for item in definitions}
            opds_sources = self.session.query(OpdsSource).all()
            legado_sources = self.session.query(BookSourceModel).all()
            configured_metadata = [
                value for value in loader.get_settings().get(META_SELECTED_SOURCES, []) if value != META_SOURCE_AI
            ]
            return {
                "err": "ok",
                "definitions": [item.to_public_dict() for item in definitions],
                "installations": [item.to_public_dict(definition_map.get(item.definition_id)) for item in installations],
                "builtin_state": {
                    "talebook.metadata.builtin": {
                        "configured": len(configured_metadata),
                        "enabled": len(configured_metadata),
                        "sources": configured_metadata,
                    },
                    "talebook.book-source.opds": {
                        "configured": len(opds_sources),
                        "enabled": sum(1 for item in opds_sources if item.active),
                        "service_enabled": bool(loader.get_settings().get("OPDS_ENABLED", True)),
                    },
                    "talebook.book-source.legado": {
                        "configured": len(legado_sources),
                        "enabled": sum(1 for item in legado_sources if item.enabled),
                    },
                },
            }
        except PluginRuntimeError as exc:
            return _error(exc)


class AdminPluginInstall(BaseHandler):
    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            installation = install_builtin(
                self.session,
                req.get("plugin_key", ""),
                self.user_id(),
                config=req.get("config"),
                approved_permissions=req.get("permissions"),
            )
            definition = self.session.get(PluginDefinition, installation.definition_id)
            return {"err": "ok", "installation": installation.to_public_dict(definition)}
        except PluginRuntimeError as exc:
            return _error(exc)


class AdminPluginInstallationState(BaseHandler):
    @js
    @is_admin
    def post(self, installation_id):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")
            installation = self.session.get(PluginInstallation, int(installation_id))
            if installation is None:
                raise PluginRuntimeError("plugin.installation_missing", "Plugin installation was not found")
            definition = self.session.get(PluginDefinition, installation.definition_id)
            metadata_source = (definition.manifest or {}).get("ui", {}).get("metadata_source")
            if metadata_source:
                args = loader.SettingsLoader()
                args.update(loader.get_settings())
                selected = list(args.get(META_SELECTED_SOURCES, []) or [])
                selected = [item for item in selected if item != metadata_source]
                if req["enabled"]:
                    selected.append(metadata_source)
                args[META_SELECTED_SOURCES] = selected

                from webserver.handlers.admin import SettingsSaverLogic

                result = SettingsSaverLogic().save_extra_settings(args)
                if result.get("err") != "ok":
                    return result
            installation.enabled = req["enabled"]
            self.session.commit()
            return {"err": "ok", "installation": installation.to_public_dict(definition)}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginMetadataSearch(BaseHandler):
    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            source = str(req.get("source") or "").strip()
            keyword = str(req.get("keyword") or "").strip()
            if source not in METADATA_PLUGIN_SOURCES:
                raise PluginRuntimeError("plugin.metadata_source_invalid", "Unknown metadata source")
            if not keyword:
                raise PluginRuntimeError("plugin.keyword_required", "请输入搜索关键字")
            books = search_metadata_plugin(self.session, loader.get_settings(), source, keyword)
            return {"err": "ok", "source": source, "books": books[:5]}
        except PluginRuntimeError as exc:
            return _error(exc)
        except Exception:
            return {"err": "plugin.metadata_search_failed", "msg": "元数据查询失败，请稍后重试"}


class AdminPluginOpdsService(BaseHandler):
    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")

            args = loader.SettingsLoader()
            args.update(loader.get_settings())
            args["OPDS_ENABLED"] = req["enabled"]

            from webserver.handlers.admin import SettingsSaverLogic

            result = SettingsSaverLogic().save_extra_settings(args)
            if result.get("err") != "ok":
                return result
            return {"err": "ok", "enabled": req["enabled"]}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginConnections(BaseHandler):
    @js
    @is_admin
    def get(self):
        connections = self.session.query(PluginConnection).order_by(PluginConnection.id).all()
        instance_connections = [item for item in connections if item.owner_type == "instance"]
        secrets = {
            item.id: item
            for item in self.session.query(PluginSecret)
            .filter(PluginSecret.id.in_([c.secret_id for c in instance_connections]))
            .all()
        }
        user_health = {}
        for item in connections:
            if item.owner_type != "user":
                continue
            key = (item.installation_id, item.health)
            user_health[key] = user_health.get(key, 0) + 1
        return {
            "err": "ok",
            "connections": [item.to_public_dict(secrets.get(item.secret_id)) for item in instance_connections],
            "user_connection_health": [
                {"installation_id": installation_id, "health": health, "count": count}
                for (installation_id, health), count in sorted(user_health.items())
            ],
        }

    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            if req.get("owner_type", "instance") != "instance":
                raise PluginRuntimeError("plugin.owner_forbidden", "Administrators cannot manage another user's connection")
            connection = save_connection(
                self.session,
                loader.get_settings(),
                int(req.get("installation_id", 0)),
                "instance",
                0,
                req.get("credentials"),
                name=req.get("name", "default"),
                config=req.get("config"),
                scopes=req.get("scopes"),
                schedule=req.get("schedule", ""),
            )
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginConnectionState(BaseHandler):
    @js
    @is_admin
    def post(self, connection_id):
        try:
            req = _body(self)
            if not isinstance(req.get("enabled"), bool):
                raise PluginRuntimeError("plugin.request_invalid", "enabled must be a boolean")
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "instance":
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
            installation = self.session.get(PluginInstallation, connection.installation_id)
            if req["enabled"] and not installation.enabled:
                raise PluginRuntimeError("plugin.installation_disabled", "Enable the plugin installation first")
            connection.enabled = req["enabled"]
            self.session.commit()
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginConnections(BaseHandler):
    @js
    @auth
    def get(self):
        connections = (
            self.session.query(PluginConnection)
            .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == self.user_id())
            .order_by(PluginConnection.id)
            .all()
        )
        secrets = {
            item.id: item
            for item in self.session.query(PluginSecret).filter(PluginSecret.id.in_([c.secret_id for c in connections])).all()
        }
        return {"err": "ok", "connections": [item.to_public_dict(secrets.get(item.secret_id)) for item in connections]}

    @js
    @auth
    def post(self):
        try:
            req = _body(self)
            connection = save_connection(
                self.session,
                loader.get_settings(),
                int(req.get("installation_id", 0)),
                "user",
                self.user_id(),
                req.get("credentials"),
                name=req.get("name", "default"),
                config=req.get("config"),
                scopes=req.get("scopes"),
                schedule=req.get("schedule", ""),
            )
            secret = self.session.get(PluginSecret, connection.secret_id)
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginAction(BaseHandler):
    @js
    @is_admin
    def post(self, connection_id, action):
        try:
            req = _body(self)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                int(connection_id),
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
            )
            execute_plugin_run(AsyncService(), run.id)
            self.session.refresh(run)
            return {"err": "ok", "run": run.to_public_dict()}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginRuns(BaseHandler):
    @js
    @is_admin
    def get(self):
        query = self.session.query(PluginRun)
        connection_id = self.get_argument("connection_id", "")
        if connection_id:
            try:
                query = query.filter(PluginRun.connection_id == int(connection_id))
            except ValueError:
                return {"err": "plugin.request_invalid", "msg": "connection_id must be an integer"}
        runs = query.order_by(PluginRun.id.desc()).limit(100).all()
        include_items = self.get_argument("include_items", "false") == "true"
        data = []
        for run in runs:
            value = run.to_public_dict()
            if include_items:
                value["items"] = [
                    item.to_public_dict()
                    for item in self.session.query(PluginRunItem)
                    .filter(PluginRunItem.run_id == run.id)
                    .order_by(PluginRunItem.id)
                ]
            data.append(value)
        return {"err": "ok", "runs": data}


class AdminPluginRunDetail(BaseHandler):
    @js
    @is_admin
    def get(self, run_id):
        try:
            run = self.session.get(PluginRun, int(run_id))
        except (TypeError, ValueError):
            run = None
        if run is None:
            return {"err": "plugin.run_missing", "msg": "Plugin run was not found"}
        items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
        return {"err": "ok", "run": run.to_public_dict(), "items": [item.to_public_dict(include_data=True) for item in items]}


class UserPluginAction(BaseHandler):
    @js
    @auth
    def post(self, connection_id, action):
        try:
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "user" or connection.owner_id != self.user_id():
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
            installation = self.session.get(PluginInstallation, connection.installation_id)
            if installation.plugin_key == WEREAD_PLUGIN_KEY and action in {"test", "preview", "run"}:
                raise PluginRuntimeError(
                    "plugin.action_requires_import_endpoint",
                    "WeRead actions must use the private import endpoint",
                )
            req = _body(self)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
            )
            execute_plugin_run(AsyncService(), run.id)
            self.session.refresh(run)
            return {"err": "ok", "run": run.to_public_dict()}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginRuns(BaseHandler):
    @js
    @auth
    def get(self):
        connection_ids = [
            item.id
            for item in self.session.query(PluginConnection.id)
            .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == self.user_id())
            .all()
        ]
        runs = (
            self.session.query(PluginRun)
            .filter(PluginRun.connection_id.in_(connection_ids))
            .order_by(PluginRun.id.desc())
            .limit(100)
            .all()
        )
        return {"err": "ok", "runs": [run.to_public_dict() for run in runs]}


class UserPluginRunDetail(BaseHandler):
    @js
    @auth
    def get(self, run_id):
        try:
            run = self.session.get(PluginRun, int(run_id))
        except (TypeError, ValueError):
            run = None
        connection = self.session.get(PluginConnection, run.connection_id) if run is not None else None
        if connection is None or connection.owner_type != "user" or connection.owner_id != self.user_id():
            return {"err": "plugin.run_missing", "msg": "Plugin run was not found"}
        items = self.session.query(PluginRunItem).filter(PluginRunItem.run_id == run.id).order_by(PluginRunItem.id).all()
        return {"err": "ok", "run": run.to_public_dict(), "items": [item.to_public_dict(include_data=True) for item in items]}


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
            PluginConnection.name == "微信读书",
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
        (r"/api/admin/plugins", AdminPlugins),
        (r"/api/admin/plugins/install", AdminPluginInstall),
        (r"/api/admin/plugins/opds-service", AdminPluginOpdsService),
        (r"/api/admin/plugins/metadata-search", AdminPluginMetadataSearch),
        (r"/api/admin/plugins/installations/([0-9]+)/state", AdminPluginInstallationState),
        (r"/api/admin/plugins/connections", AdminPluginConnections),
        (r"/api/admin/plugins/connections/([0-9]+)/state", AdminPluginConnectionState),
        (r"/api/admin/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", AdminPluginAction),
        (r"/api/admin/plugins/runs", AdminPluginRuns),
        (r"/api/admin/plugins/runs/([0-9]+)", AdminPluginRunDetail),
        (r"/api/plugins/connections", UserPluginConnections),
        (r"/api/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", UserPluginAction),
        (r"/api/plugins/runs", UserPluginRuns),
        (r"/api/plugins/runs/([0-9]+)", UserPluginRunDetail),
        (r"/api/plugins/weread", UserWeread),
        (r"/api/plugins/weread/query", UserWereadQuery),
        (r"/api/plugins/weread/import", UserWereadImport),
    ]
