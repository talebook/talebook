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
from webserver.services.async_service import AsyncService
from webserver.services.plugin_jobs import execute_plugin_run
from webserver.services.plugin_runtime import (
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_capability_installations,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipherError


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
            installation.enabled = req["enabled"]
            self.session.commit()
            definition = self.session.get(PluginDefinition, installation.definition_id)
            return {"err": "ok", "installation": installation.to_public_dict(definition)}
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
        return {"err": "ok", "run": run.to_public_dict(), "items": [item.to_public_dict() for item in items]}


class UserPluginAction(BaseHandler):
    @js
    @auth
    def post(self, connection_id, action):
        try:
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "user" or connection.owner_id != self.user_id():
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
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


def routes():
    return [
        (r"/api/admin/plugins", AdminPlugins),
        (r"/api/admin/plugins/install", AdminPluginInstall),
        (r"/api/admin/plugins/installations/([0-9]+)/state", AdminPluginInstallationState),
        (r"/api/admin/plugins/connections", AdminPluginConnections),
        (r"/api/admin/plugins/connections/([0-9]+)/state", AdminPluginConnectionState),
        (r"/api/admin/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", AdminPluginAction),
        (r"/api/admin/plugins/runs", AdminPluginRuns),
        (r"/api/admin/plugins/runs/([0-9]+)", AdminPluginRunDetail),
        (r"/api/plugins/connections", UserPluginConnections),
        (r"/api/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", UserPluginAction),
        (r"/api/plugins/runs", UserPluginRuns),
    ]
