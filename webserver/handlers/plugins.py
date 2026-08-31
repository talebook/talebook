"""通用插件管理接口：目录、安装、连接、功能、动作与运行历史。

内置文本工具的书籍选择与文件写入编排见 handlers/plugin_booktools.py。
"""

from webserver import loader
from webserver.handlers import plugin_booktools
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
from webserver.plugins.runtime import MetadataQuery
from webserver.plugins.runtime.interfaces import ExtraFeatureProvider
from webserver.plugins.runtime.protocol import PluginManifest, UpstreamError, validate_against_schema
from webserver.services.annotation_writer import all_book_ids, confirm_match
from webserver.services.async_service import AsyncService
from webserver.services.plugin_jobs import execute_plugin_run
from webserver.services.plugin_runtime import (
    DEFAULT_CONNECTION_ROLE,
    REGISTRY,
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_installations,
    install_builtin,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipherError


# 这些键由服务端计算并注入，客户端传入的同名值一律丢弃，避免越权访问私有书籍。
SERVER_OWNED_INPUT_KEYS = frozenset({"allowed_book_ids", "matches"})
# 声明了这些能力的插件会做书籍匹配，需要平台注入可见书籍白名单。
BOOK_SCOPED_CAPABILITIES = frozenset({"annotations.import"})
BOOK_QUERY_FIELDS = frozenset({"title", "isbn", "publisher", "authors"})
CAPABILITY_RESULT_LIMIT = 20


def _capability_connection(handler, plugin_key, capability):
    """Resolve one enabled instance connection for a declared typed capability."""
    ensure_builtin_installations(handler.session, handler.user_id(), loader.get_settings())
    provider = REGISTRY.get(plugin_key)
    manifest = PluginManifest.validate(provider.manifest)
    if capability not in manifest.raw["capabilities"]:
        raise PluginRuntimeError(
            "plugin.capability_not_supported",
            "%s does not provide %s" % (plugin_key, capability),
        )
    installation = handler.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
    if installation is None or not installation.enabled or installation.status != "active":
        raise PluginRuntimeError("plugin.installation_disabled", "Plugin installation is not enabled")
    connection = (
        handler.session.query(PluginConnection)
        .filter(
            PluginConnection.installation_id == installation.id,
            PluginConnection.owner_type == "instance",
            PluginConnection.owner_id == 0,
            PluginConnection.enabled.is_(True),
        )
        .order_by(PluginConnection.id)
        .first()
    )
    if connection is None:
        raise PluginRuntimeError("plugin.connection_missing", "Plugin has no enabled instance configuration")
    return PluginRuntime(handler.session, loader.get_settings()), connection


def _book_query(handler):
    raw = _body(handler).get("query", {})
    if not isinstance(raw, dict):
        raise PluginRuntimeError("plugin.request_invalid", "query must be an object")
    unknown = set(raw) - BOOK_QUERY_FIELDS
    if unknown:
        raise PluginRuntimeError("plugin.request_invalid", "unknown query fields: %s" % ", ".join(sorted(unknown)))
    authors = raw.get("authors") or []
    if isinstance(authors, str):
        authors = [item.strip() for item in authors.split(",") if item.strip()]
    if not isinstance(authors, list) or len(authors) > 8 or any(not isinstance(item, str) for item in authors):
        raise PluginRuntimeError("plugin.request_invalid", "authors must be a list of strings")
    query = MetadataQuery(
        title=str(raw.get("title") or "").strip()[:300],
        isbn=str(raw.get("isbn") or "").strip()[:64],
        publisher=str(raw.get("publisher") or "").strip()[:300],
        authors=tuple(item.strip()[:300] for item in authors if item.strip()),
    )
    if query.is_empty():
        raise PluginRuntimeError("plugin.request_invalid", "title or isbn is required")
    return query


def _metadata_summary(record):
    value = record.to_dict() if callable(getattr(record, "to_dict", None)) else dict(record or {})
    return {
        "title": str(value.get("title") or ""),
        "authors": list(value.get("authors") or ([value["author"]] if value.get("author") else [])),
        "publisher": str(value.get("publisher") or ""),
        "isbn": str(value.get("isbn") or ""),
        "comments": str(value.get("comments") or "")[:500],
        "rating": value.get("rating"),
        "series": str(value.get("series") or ""),
        "language": str(value.get("language") or ""),
        "cover_url": str(value.get("cover_url") or ""),
        "website": str(value.get("website") or ""),
        "provider_value": str(value.get("provider_value") or ""),
    }


def _source_summary(record):
    value = record.to_dict() if callable(getattr(record, "to_dict", None)) else dict(record or {})
    return {
        key: value.get(key)
        for key in (
            "external_id",
            "title",
            "authors",
            "isbn",
            "format",
            "source",
            "source_url",
            "access",
            "license",
            "description",
            "cover_url",
        )
    }


def _review_summary(record):
    value = record.to_dict() if callable(getattr(record, "to_dict", None)) else dict(record or {})
    return {
        key: value.get(key)
        for key in (
            "source",
            "review_kind",
            "external_id",
            "rating",
            "source_time",
            "source_url",
            "summary",
        )
    }


def _failure_summary(failure):
    return {
        "external_id": str(getattr(failure, "external_id", "")),
        "error_code": str(getattr(failure, "error_code", "")),
        "error_message": str(getattr(failure, "error_message", "")),
    }


def _plugin_input_data(handler, connection):
    """构造插件运行输入：客户端参数经过滤后，与服务端计算的受控字段合并。"""
    req = _body(handler)
    supplied = req.get("input_data", {})
    if supplied is None:
        supplied = {}
    if not isinstance(supplied, dict):
        raise PluginRuntimeError("plugin.request_invalid", "input_data must be an object")

    input_data = {key: value for key, value in supplied.items() if key not in SERVER_OWNED_INPUT_KEYS}

    installation = handler.session.get(PluginInstallation, connection.installation_id)
    definition = handler.session.get(PluginDefinition, installation.definition_id) if installation else None
    capabilities = set((definition.capabilities if definition else None) or [])
    match_confirmations = []
    if capabilities & BOOK_SCOPED_CAPABILITIES:
        allowed_book_ids = [
            book_id for book_id in all_book_ids(handler.db) if handler.get_book(book_id, raise_exception=False) is not None
        ]
        input_data["allowed_book_ids"] = allowed_book_ids
        matches = supplied.get("matches", {})
        if matches is None:
            matches = {}
        if not isinstance(matches, dict):
            raise PluginRuntimeError("plugin.request_invalid", "matches must be an object")
        for source_book_id, book_id in matches.items():
            match_confirmations.append((str(source_book_id), book_id, allowed_book_ids))
    return req, input_data, match_confirmations


def _prepare_action_run(handler, connection, action):
    """先校验 run，再把匹配确认与 run 创建作为一个事务提交。"""
    req, input_data, match_confirmations = _plugin_input_data(handler, connection)
    runtime = PluginRuntime(handler.session, loader.get_settings())
    try:
        run = runtime.prepare_run(
            connection.id,
            action,
            handler.user_id(),
            trigger=req.get("trigger", "manual"),
            parent_run_id=req.get("parent_run_id"),
            input_data=input_data,
            server_owned_input_keys=SERVER_OWNED_INPUT_KEYS,
            commit=False,
        )
        for source_book_id, book_id, allowed_book_ids in match_confirmations:
            try:
                confirm_match(
                    handler.session,
                    connection.id,
                    source_book_id,
                    int(book_id),
                    handler.user_id(),
                    handler.db,
                    allowed_book_ids,
                    commit=False,
                )
            except (TypeError, ValueError) as exc:
                raise PluginRuntimeError("plugin.match_book_forbidden", str(exc)) from exc
        handler.session.commit()
        return run
    except Exception:
        handler.session.rollback()
        raise


def _active_user_installation(session, plugin_key, user_id):
    provider = REGISTRY.get(plugin_key)
    manifest = PluginManifest.validate(provider.manifest)
    if "user" not in manifest.raw["connection_owners"]:
        raise PluginRuntimeError("plugin.owner_forbidden", "This plugin does not support user connections")
    installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
    if installation is None:
        installation = install_builtin(session, plugin_key, user_id)
    if not installation.enabled or installation.status != "active":
        raise PluginRuntimeError("plugin.installation_disabled", "Plugin installation is disabled")
    return manifest, installation


def _public_manifest(manifest):
    raw = manifest.raw
    return {
        "plugin_key": raw["id"],
        "name": raw["name"],
        "version": raw["version"],
        "protocol_version": raw["protocol_version"],
        "description": raw.get("description", ""),
        "runtime_kind": raw["runtime_kind"],
        "categories": list(raw["categories"]),
        "capabilities": list(raw["capabilities"]),
        "actions": list(raw["actions"]),
        "auth_schema": dict(raw["auth_schema"]),
        "config_schema": dict(raw["config_schema"]),
        "connection_owners": list(raw["connection_owners"]),
        "permissions": list(raw["permissions"]),
        "extra_features": dict(raw.get("extra_features") or {}),
        "ui": dict(raw.get("ui") or {}),
    }


class AdminPlugins(BaseHandler):
    @js
    @is_admin
    def get(self):
        try:
            ensure_builtin_installations(self.session, self.user_id(), loader.get_settings())
            registered_keys = [provider.manifest["id"] for provider in REGISTRY.providers()]
            definitions = (
                self.session.query(PluginDefinition)
                .filter(PluginDefinition.plugin_key.in_(registered_keys))
                .order_by(PluginDefinition.id)
                .all()
            )
            installations = (
                self.session.query(PluginInstallation)
                .filter(PluginInstallation.plugin_key.in_(registered_keys))
                .order_by(PluginInstallation.id)
                .all()
            )
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


class AdminPluginPreferences(BaseHandler):
    """插件中心承接的全局元数据行为与共享设备设置。"""

    @js
    @is_admin
    def get(self):
        settings = loader.get_settings()
        return {
            "err": "ok",
            "metadata": {
                "auto_fill_meta": bool(settings.get("auto_fill_meta", False)),
                "auto_fill_keep_cover": bool(settings.get("auto_fill_keep_cover", False)),
            },
            "devices": list(settings.get("DEVICES") or []),
        }

    @js
    @is_admin
    def post(self):
        try:
            req = _body(self)
            updates = {}
            if "metadata" in req:
                metadata = req["metadata"]
                if not isinstance(metadata, dict):
                    raise PluginRuntimeError("plugin.request_invalid", "metadata must be an object")
                for key in ("auto_fill_meta", "auto_fill_keep_cover"):
                    if key in metadata:
                        if not isinstance(metadata[key], bool):
                            raise PluginRuntimeError("plugin.request_invalid", "%s must be a boolean" % key)
                        updates[key] = metadata[key]
            if "devices" in req:
                updates["DEVICES"] = self._validate_devices(req["devices"])
            if not updates:
                raise PluginRuntimeError("plugin.request_invalid", "No plugin preference was supplied")

            args = loader.SettingsLoader()
            args.update(loader.get_settings())
            args.update(updates)

            from webserver.handlers.admin import SettingsSaverLogic

            result = SettingsSaverLogic().save_extra_settings(args)
            if result.get("err") != "ok":
                return result
            return {"err": "ok", **updates}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)

    @staticmethod
    def _validate_devices(value):
        if not isinstance(value, list) or len(value) > 100:
            raise PluginRuntimeError("plugin.request_invalid", "devices must be a list")
        devices = []
        for item in value:
            if not isinstance(item, dict):
                raise PluginRuntimeError("plugin.request_invalid", "device must be an object")
            name = str(item.get("name") or "").strip()
            device_type = str(item.get("type") or "").strip().lower()
            if not name or len(name) > 64 or not device_type:
                raise PluginRuntimeError("plugin.request_invalid", "device name and type are required")
            device = {"name": name, "type": device_type}
            if device_type == "kindle":
                device["mailbox"] = str(item.get("mailbox") or "").strip()
            else:
                device["ip"] = str(item.get("ip") or "").strip()
                device["port"] = int(item.get("port") or 0)
                device["schema"] = str(item.get("schema") or "http").lower()
                if not 0 < device["port"] <= 65535 or device["schema"] not in {"http", "https"}:
                    raise PluginRuntimeError("plugin.request_invalid", "device port or schema is invalid")
            devices.append(device)
        return devices


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
            secret = self.session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
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
            secret = self.session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPlugins(BaseHandler):
    """当前用户可配置的插件目录；不暴露其他用户的连接与运行内容。"""

    @js
    @auth
    def get(self):
        try:
            ensure_builtin_installations(self.session, self.user_id(), loader.get_settings())
            registered_plugin_keys = {provider.manifest["id"] for provider in REGISTRY.providers()}
            definitions = {item.id: item for item in self.session.query(PluginDefinition).all()}
            installations = (
                self.session.query(PluginInstallation)
                .filter(PluginInstallation.plugin_key.in_(registered_plugin_keys))
                .order_by(PluginInstallation.id)
                .all()
            )
            user_connections = (
                self.session.query(PluginConnection)
                .filter(PluginConnection.owner_type == "user", PluginConnection.owner_id == self.user_id())
                .order_by(PluginConnection.id)
                .all()
            )
            connections_by_installation = {}
            for connection in user_connections:
                connections_by_installation.setdefault(connection.installation_id, []).append(connection)

            connection_ids = [connection.id for connection in user_connections]
            latest_run_by_connection = {}
            if connection_ids:
                for run in (
                    self.session.query(PluginRun)
                    .filter(PluginRun.connection_id.in_(connection_ids))
                    .order_by(PluginRun.id.desc())
                    .all()
                ):
                    latest_run_by_connection.setdefault(run.connection_id, run)

            runtime = PluginRuntime(self.session, loader.get_settings())
            plugins = []
            for installation in installations:
                definition = definitions.get(installation.definition_id)
                if definition is None:
                    continue
                public = definition.to_public_dict()
                if public["ui"].get("hidden") or "user" not in public["connection_owners"]:
                    continue
                connections = connections_by_installation.get(installation.id, [])
                latest_runs = [
                    latest_run_by_connection[item.id] for item in connections if item.id in latest_run_by_connection
                ]
                public["installation"] = {
                    "id": installation.id,
                    "plugin_key": installation.plugin_key,
                    "version": installation.version,
                    "enabled": bool(installation.enabled),
                    "status": installation.status,
                }
                public["connections"] = [runtime.connection_public_dict(connection) for connection in connections]
                public["latest_run"] = max(latest_runs, key=lambda item: item.id).to_public_dict() if latest_runs else None
                plugins.append(public)
            return {"err": "ok", "plugins": plugins}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
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
            plugin_key = req.get("plugin_key")
            installation_id = req.get("installation_id")
            if plugin_key is not None:
                if not isinstance(plugin_key, str) or not plugin_key or installation_id is not None:
                    raise PluginRuntimeError("plugin.request_invalid", "Provide either plugin_key or installation_id")
                manifest, installation = _active_user_installation(self.session, plugin_key, self.user_id())
                installation_id = installation.id
                default_name = manifest.raw["name"]
            else:
                installation_id = int(installation_id or 0)
                installation = self.session.get(PluginInstallation, installation_id)
                if installation is None or not installation.enabled or installation.status != "active":
                    raise PluginRuntimeError("plugin.installation_missing", "Plugin installation is not active")
                definition = self.session.get(PluginDefinition, installation.definition_id)
                default_name = definition.name
            connection = save_connection(
                self.session,
                loader.get_settings(),
                installation_id,
                "user",
                self.user_id(),
                req.get("credentials"),
                name=req.get("name", default_name),
                # role 是查询键，name 只是展示文案：不传 role 会退化回按名字定位，
                # 用户改一次名就会多出一条连接。
                role=req.get("role") or DEFAULT_CONNECTION_ROLE,
                config=req.get("config"),
                scopes=req.get("scopes"),
                schedule=req.get("schedule", ""),
            )
            secret = self.session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
            return {"err": "ok", "connection": connection.to_public_dict(secret)}
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginState(BaseHandler):
    @js
    @auth
    def get(self, plugin_key):
        try:
            provider = REGISTRY.get(plugin_key)
            manifest = PluginManifest.validate(provider.manifest)
            installation = self.session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
            connections = []
            runs = []
            if installation is not None:
                connections = (
                    self.session.query(PluginConnection)
                    .filter(
                        PluginConnection.installation_id == installation.id,
                        PluginConnection.owner_type == "user",
                        PluginConnection.owner_id == self.user_id(),
                    )
                    .order_by(PluginConnection.id)
                    .all()
                )
            connection_ids = [connection.id for connection in connections]
            if connection_ids:
                runs = (
                    self.session.query(PluginRun)
                    .filter(PluginRun.connection_id.in_(connection_ids))
                    .order_by(PluginRun.id.desc())
                    .limit(100)
                    .all()
                )
            runtime = PluginRuntime(self.session, loader.get_settings())
            return {
                "err": "ok",
                "plugin": _public_manifest(manifest),
                "installation": (
                    {
                        "id": installation.id,
                        "plugin_key": installation.plugin_key,
                        "version": installation.version,
                        "enabled": bool(installation.enabled),
                        "status": installation.status,
                    }
                    if installation is not None
                    else None
                ),
                "connections": [runtime.connection_public_dict(connection) for connection in connections],
                "runs": [run.to_public_dict() for run in runs],
            }
        except (PluginRuntimeError, SecretCipherError, TypeError, ValueError) as exc:
            return _error(exc)


class UserPluginFeature(BaseHandler):
    """插件自有、无法标准化的只读/写入动作的唯一逃生舱。"""

    @js
    @auth
    def post(self, plugin_key, action):
        try:
            req = _body(self)
            provider = REGISTRY.get(plugin_key)
            manifest = PluginManifest.validate(provider.manifest)
            feature = (manifest.raw.get("extra_features") or {}).get(action)
            if feature is None or not isinstance(provider, ExtraFeatureProvider):
                raise PluginRuntimeError("plugin.feature_not_supported", "Plugin feature is not supported")
            params = req.get("params", {})
            if params is None:
                params = {}
            if not isinstance(params, dict):
                raise PluginRuntimeError("plugin.request_invalid", "Feature params must be an object")
            try:
                validate_against_schema(feature.get("schema") or {}, params, where="feature")
            except ValueError as exc:
                raise PluginRuntimeError(getattr(exc, "code", "plugin.request_invalid"), str(exc)) from exc

            _, installation = _active_user_installation(self.session, plugin_key, self.user_id())
            credentials = req.get("credentials")
            if credentials is not None:
                if not isinstance(credentials, dict):
                    raise PluginRuntimeError("plugin.credentials_invalid", "credentials must be an object")
                connection = save_connection(
                    self.session,
                    loader.get_settings(),
                    installation.id,
                    "user",
                    self.user_id(),
                    credentials,
                    role=DEFAULT_CONNECTION_ROLE,
                    name=manifest.raw["name"],
                )
            else:
                connection = (
                    self.session.query(PluginConnection)
                    .filter(
                        PluginConnection.installation_id == installation.id,
                        PluginConnection.owner_type == "user",
                        PluginConnection.owner_id == self.user_id(),
                        PluginConnection.role == DEFAULT_CONNECTION_ROLE,
                    )
                    .first()
                )
            if connection is None or not connection.enabled:
                raise PluginRuntimeError("plugin.connection_missing", "Plugin connection is not enabled")
            runtime = PluginRuntime(self.session, loader.get_settings())
            dispatch = getattr(runtime, feature["mode"])
            data = dispatch(
                connection,
                "execute_feature",
                action,
                params,
                required_scopes=tuple(feature.get("required_scopes") or ()),
            )
            secret = self.session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
            return {"err": "ok", "connection": connection.to_public_dict(secret), "data": data}
        except (PluginRuntimeError, SecretCipherError, UpstreamError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginMetadataSearch(BaseHandler):
    """Test MetadataProvider.search_books with a structured MetadataQuery."""

    @js
    @is_admin
    def post(self, plugin_key):
        try:
            query = _book_query(self)
            runtime, connection = _capability_connection(self, plugin_key, "metadata.lookup")
            records = runtime.read(
                connection,
                "search_books",
                query,
                required_scopes=("books.read",),
                requested_by=self.user_id(),
            )
            result_items = getattr(records, "books", records) or []
            items = [_metadata_summary(record) for record in list(result_items)[:CAPABILITY_RESULT_LIMIT]]
            return {"err": "ok", "capability": "metadata.lookup", "items": items}
        except (PluginRuntimeError, SecretCipherError, UpstreamError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginSourceSearch(BaseHandler):
    """Test SourceProvider.search without creating a generic preview/run job."""

    @js
    @is_admin
    def post(self, plugin_key):
        try:
            query = _body(self).get("query", "")
            if not isinstance(query, str) or not query.strip():
                raise PluginRuntimeError("plugin.request_invalid", "query must be a non-empty string")
            runtime, connection = _capability_connection(self, plugin_key, "sources.search")
            page = runtime.read(
                connection,
                "search",
                query.strip()[:300],
                {},
                required_scopes=("books.read",),
                requested_by=self.user_id(),
            )
            return {
                "err": "ok",
                "capability": "sources.search",
                "items": [_source_summary(record) for record in list(page.items or [])[:CAPABILITY_RESULT_LIMIT]],
                "failures": [_failure_summary(item) for item in list(page.failures or [])[:CAPABILITY_RESULT_LIMIT]],
                "has_more": bool(page.has_more),
                "health_message": str(page.health_message or ""),
            }
        except (PluginRuntimeError, SecretCipherError, UpstreamError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginReviewLookup(BaseHandler):
    """Test ReviewProvider.get_reviews with the provider's typed read contract."""

    @js
    @is_admin
    def post(self, plugin_key):
        try:
            query = _book_query(self)
            runtime, connection = _capability_connection(self, plugin_key, "reviews.lookup")
            page = runtime.read(
                connection,
                "get_reviews",
                {
                    "title": query.title,
                    "isbn": query.isbn,
                    "publisher": query.publisher,
                    "authors": list(query.authors),
                },
                required_scopes=("books.read",),
                requested_by=self.user_id(),
            )
            return {
                "err": "ok",
                "capability": "reviews.lookup",
                "items": [_review_summary(record) for record in list(page.items or [])[:CAPABILITY_RESULT_LIMIT]],
                "failures": [_failure_summary(item) for item in list(page.failures or [])[:CAPABILITY_RESULT_LIMIT]],
                "has_more": bool(page.has_more),
                "health_message": str(page.health_message or ""),
            }
        except (PluginRuntimeError, SecretCipherError, UpstreamError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginAction(BaseHandler):
    @js
    @is_admin
    def post(self, connection_id, action):
        try:
            connection = self.session.get(PluginConnection, int(connection_id))
            if connection is None or connection.owner_type != "instance":
                raise PluginRuntimeError("plugin.connection_forbidden", "Plugin connection is not available")
            run = _prepare_action_run(self, connection, action)
            execute_plugin_run(AsyncService(), run.id)
            self.session.refresh(run)
            return {"err": "ok", "run": run.to_public_dict()}
        except (PluginRuntimeError, TypeError, ValueError) as exc:
            return _error(exc)


class AdminPluginRuns(BaseHandler):
    @js
    @is_admin
    def get(self):
        query = (
            self.session.query(PluginRun)
            .join(PluginConnection, PluginConnection.id == PluginRun.connection_id)
            .filter(PluginConnection.owner_type == "instance")
        )
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
        connection = self.session.get(PluginConnection, run.connection_id) if run is not None else None
        if connection is None or connection.owner_type != "instance":
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
            run = _prepare_action_run(self, connection, action)
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
    return [
        (r"/api/admin/plugins", AdminPlugins),
        (r"/api/admin/plugins/install", AdminPluginInstall),
        (r"/api/admin/plugins/opds-service", AdminPluginOpdsService),
        (r"/api/admin/plugins/preferences", AdminPluginPreferences),
        (r"/api/admin/plugins/([a-z0-9.-]+)/metadata/search", AdminPluginMetadataSearch),
        (r"/api/admin/plugins/([a-z0-9.-]+)/source/search", AdminPluginSourceSearch),
        (r"/api/admin/plugins/([a-z0-9.-]+)/reviews/lookup", AdminPluginReviewLookup),
        (r"/api/admin/plugins/installations/([0-9]+)/state", AdminPluginInstallationState),
        (r"/api/admin/plugins/connections", AdminPluginConnections),
        (r"/api/admin/plugins/connections/([0-9]+)/state", AdminPluginConnectionState),
        (r"/api/admin/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", AdminPluginAction),
        (r"/api/admin/plugins/runs", AdminPluginRuns),
        (r"/api/admin/plugins/runs/([0-9]+)", AdminPluginRunDetail),
        (r"/api/plugins", UserPlugins),
        (r"/api/plugins/connections", UserPluginConnections),
        (r"/api/plugins/([a-z0-9.-]+)/features/([a-z0-9_]+)", UserPluginFeature),
        (r"/api/plugins/connections/([0-9]+)/(test|preview|run|retry|rollback)", UserPluginAction),
        (r"/api/plugins/runs", UserPluginRuns),
        (r"/api/plugins/runs/([0-9]+)", UserPluginRunDetail),
        (r"/api/plugins/([a-z0-9.-]+)", UserPluginState),
    ] + plugin_booktools.routes()
