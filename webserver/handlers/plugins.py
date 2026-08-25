"""通用插件管理接口：目录、安装、连接、动作与运行历史。

微信读书专属接口见 handlers/plugin_weread.py，内置文本工具见
handlers/plugin_booktools.py。
"""

from webserver import loader
from webserver.handlers import plugin_booktools, plugin_weread
from webserver.handlers.base import BaseHandler, auth, is_admin, js
from webserver.handlers.plugins_common import body as _body
from webserver.handlers.plugins_common import error as _error
from webserver.models import (
    PluginConnection,
    PluginDefinition,
    PluginInstallation,
    PluginRun,
    PluginRunItem,
    PluginSecret,
)
from webserver.services.annotation_writer import all_book_ids
from webserver.services.async_service import AsyncService
from webserver.services.plugin_jobs import execute_plugin_run
from webserver.services.plugin_runtime import (
    DEFAULT_CONNECTION_ROLE,
    REGISTRY,
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_capability_installations,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipherError


# 这些键由服务端计算并注入，客户端传入的同名值一律丢弃，避免越权访问私有书籍。
SERVER_OWNED_INPUT_KEYS = frozenset({"allowed_book_ids"})
# 声明了这些能力的插件会做书籍匹配，需要平台注入可见书籍白名单。
BOOK_SCOPED_CAPABILITIES = frozenset({"annotations.import"})


def _plugin_input_data(handler, connection):
    """构造插件运行输入：客户端参数经过滤后，与服务端计算的受控字段合并。"""
    req = _body(handler)
    supplied = req.get("input_data") or {}
    if not isinstance(supplied, dict):
        raise PluginRuntimeError("plugin.request_invalid", "input_data must be an object")

    input_data = {key: value for key, value in supplied.items() if key not in SERVER_OWNED_INPUT_KEYS}

    installation = handler.session.get(PluginInstallation, connection.installation_id)
    definition = handler.session.get(PluginDefinition, installation.definition_id) if installation else None
    capabilities = set((definition.capabilities if definition else None) or [])
    if capabilities & BOOK_SCOPED_CAPABILITIES:
        input_data["allowed_book_ids"] = [
            book_id for book_id in all_book_ids(handler.db) if handler.get_book(book_id, raise_exception=False) is not None
        ]
    return req, input_data


class AdminPlugins(BaseHandler):
    @js
    @is_admin
    def get(self):
        try:
            ensure_builtin_capability_installations(self.session, self.user_id(), loader.get_settings())
            definitions = self.session.query(PluginDefinition).order_by(PluginDefinition.id).all()
            installations = self.session.query(PluginInstallation).order_by(PluginInstallation.id).all()
            definition_map = {item.id: item for item in definitions}
            settings = loader.get_settings()
            # 各插件自报配置状态，此处不认识任何具体 plugin_key。
            builtin_state = {}
            for provider in REGISTRY.providers():
                status = getattr(provider, "status", None)
                if status is None:
                    continue
                value = status(self.session, settings)
                if value:
                    builtin_state[provider.manifest["id"]] = value
            return {
                "err": "ok",
                "definitions": [item.to_public_dict() for item in definitions],
                "installations": [item.to_public_dict(definition_map.get(item.definition_id)) for item in installations],
                "builtin_state": builtin_state,
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
                # role 是查询键，name 只是展示文案：不传 role 会退化回按名字定位，
                # 用户改一次名就会多出一条连接。
                role=req.get("role") or DEFAULT_CONNECTION_ROLE,
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
                # role 是查询键，name 只是展示文案：不传 role 会退化回按名字定位，
                # 用户改一次名就会多出一条连接。
                role=req.get("role") or DEFAULT_CONNECTION_ROLE,
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
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None:
                raise PluginRuntimeError("plugin.connection_missing", "Plugin connection is not available")
            req, input_data = _plugin_input_data(self, connection)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
                input_data=input_data,
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
            req, input_data = _plugin_input_data(self, connection)
            run = PluginRuntime(self.session, loader.get_settings()).prepare_run(
                connection.id,
                action,
                self.user_id(),
                trigger=req.get("trigger", "manual"),
                parent_run_id=req.get("parent_run_id"),
                input_data=input_data,
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


def routes():
    return (
        [
            (r"/api/admin/plugins", AdminPlugins),
            (r"/api/admin/plugins/install", AdminPluginInstall),
            (r"/api/admin/plugins/opds-service", AdminPluginOpdsService),
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
        ]
        + plugin_weread.routes()
        + plugin_booktools.routes()
    )
