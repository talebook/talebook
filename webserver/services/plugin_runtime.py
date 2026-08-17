import datetime
import hashlib
import json
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeoutError

from sqlalchemy import or_

from webserver.constants import AUTO_FILL_META
from webserver.models import (
    PluginConnection,
    PluginDefinition,
    PluginInstallation,
    PluginPermission,
    PluginRun,
    PluginRunItem,
    PluginSecret,
    PluginSourceRecord,
)
from webserver.plugins.runtime import (
    ACTIONS,
    BUILTIN_CAPABILITY_PROVIDERS,
    EXTERNAL_CONNECTOR_PROVIDERS,
    MockMultiTabProvider,
    PluginManifest,
    ProviderAuthError,
    ProviderError,
    ProviderRateLimitError,
    ProviderResult,
)
from webserver.services.plugin_secrets import SENSITIVE_KEY_RE, SecretCipher, SecretCipherError, redact, secret_mask_hint


TERMINAL_STATUSES = frozenset({"succeeded", "failed", "partial", "rolled_back"})
ENTITY_TYPES = frozenset({"metadata", "annotation", "review", "book_source"})
DEFAULT_COUNTS = {"fetched": 0, "written": 0, "updated": 0, "skipped": 0, "failed": 0, "conflicts": 0}


class PluginRuntimeError(RuntimeError):
    def __init__(self, code, message, retryable=False):
        self.code = code
        self.retryable = retryable
        super().__init__(message)


class PluginRegistry:
    def __init__(self):
        self._providers = {}

    def register(self, provider):
        manifest = PluginManifest.validate(provider.manifest)
        self._providers[manifest.raw["id"]] = provider
        return manifest

    def get(self, plugin_key):
        provider = self._providers.get(plugin_key)
        if provider is None:
            raise PluginRuntimeError("plugin.provider_unavailable", "Plugin provider is not available")
        return provider

    def manifests(self):
        return [PluginManifest.validate(provider.manifest) for provider in self._providers.values()]


REGISTRY = PluginRegistry()
REGISTRY.register(MockMultiTabProvider())
for _builtin_provider in BUILTIN_CAPABILITY_PROVIDERS:
    REGISTRY.register(_builtin_provider)
for _connector_provider in EXTERNAL_CONNECTOR_PROVIDERS:
    REGISTRY.register(_connector_provider)


def ensure_builtin_definitions(session, registry=REGISTRY):
    definitions = []
    for manifest in registry.manifests():
        raw = manifest.raw
        definition = (
            session.query(PluginDefinition)
            .filter(PluginDefinition.plugin_key == raw["id"], PluginDefinition.version == raw["version"])
            .first()
        )
        if definition is None:
            definition = PluginDefinition(plugin_key=raw["id"], version=raw["version"], create_time=datetime.datetime.now())
            session.add(definition)
        definition.protocol_version = raw["protocol_version"]
        definition.name = raw["name"]
        definition.runtime_kind = raw["runtime_kind"]
        definition.categories = list(raw["categories"])
        definition.capabilities = list(raw["capabilities"])
        definition.actions = list(raw["actions"])
        definition.auth_schema = dict(raw["auth_schema"])
        definition.config_schema = dict(raw["config_schema"])
        definition.permissions = list(raw["permissions"])
        definition.data_policy = dict(raw["data_policy"])
        definition.compatibility = dict(raw["compatibility"])
        definition.homepage = raw["homepage"]
        definition.license = raw["license"]
        definition.manifest = dict(raw)
        definitions.append(definition)
    session.commit()
    return definitions


def ensure_builtin_capability_installations(session, installed_by, settings, registry=REGISTRY):
    """Idempotently install Talebook-owned capabilities in the shared runtime."""
    ensure_builtin_definitions(session, registry)
    installations = []
    for provider in BUILTIN_CAPABILITY_PROVIDERS:
        plugin_key = provider.manifest["id"]
        installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
        if installation is None:
            enabled = True
            if plugin_key == "talebook.metadata.builtin":
                enabled = bool(settings.get(AUTO_FILL_META, False))
            installation = install_builtin(session, plugin_key, installed_by)
            installation.enabled = enabled
            session.commit()
        connection = (
            session.query(PluginConnection)
            .filter(
                PluginConnection.installation_id == installation.id,
                PluginConnection.owner_type == "instance",
                PluginConnection.owner_id == 0,
                PluginConnection.name == "内置连接",
            )
            .first()
        )
        if connection is None:
            connection = PluginConnection(
                installation_id=installation.id,
                owner_type="instance",
                owner_id=0,
                name="内置连接",
                config={},
                scopes=list(provider.manifest["permissions"]),
                health="unknown",
                enabled=True,
                create_time=datetime.datetime.now(),
                update_time=datetime.datetime.now(),
            )
            session.add(connection)
            session.commit()
        installations.append(installation)
    return installations


def install_builtin(session, plugin_key, installed_by, config=None, approved_permissions=None, registry=REGISTRY):
    ensure_builtin_definitions(session, registry)
    provider = registry.get(plugin_key)
    manifest = PluginManifest.validate(provider.manifest)
    raw = manifest.raw
    _validate_public_config(config or {})
    definition = (
        session.query(PluginDefinition)
        .filter(PluginDefinition.plugin_key == plugin_key, PluginDefinition.version == raw["version"])
        .one()
    )
    installation = session.query(PluginInstallation).filter(PluginInstallation.plugin_key == plugin_key).first()
    is_new_installation = installation is None
    if installation is None:
        installation = PluginInstallation(plugin_key=plugin_key, definition_id=definition.id, installed_by=installed_by)
        session.add(installation)
    installation.definition_id = definition.id
    installation.version = definition.version
    installation.enabled = True
    installation.scope = "shared"
    installation.config = dict(config or {})
    installation.installed_from = "builtin"
    installation.checksum = hashlib.sha256(
        json.dumps(raw, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    installation.status = "active"
    installation.update_time = datetime.datetime.now()
    session.flush()

    declared = set(raw["permissions"])
    existing = {
        item.permission: item
        for item in session.query(PluginPermission).filter(PluginPermission.installation_id == installation.id).all()
    }
    if approved_permissions is None:
        requested = declared if is_new_installation else {name for name, item in existing.items() if item.revoked_at is None}
    else:
        requested = set(approved_permissions)
    if requested - declared:
        session.rollback()
        raise PluginRuntimeError("plugin.permission_invalid", "Cannot approve undeclared plugin permission")
    now = datetime.datetime.now()
    for permission in declared:
        item = existing.get(permission)
        if item is None:
            item = PluginPermission(
                installation_id=installation.id,
                permission=permission,
                scope="instance",
                approved_by=installed_by,
                approved_at=now,
            )
            session.add(item)
        item.revoked_at = None if permission in requested else now
    session.commit()
    return installation


def save_connection(
    session,
    settings,
    installation_id,
    owner_type,
    owner_id,
    credentials,
    name="default",
    config=None,
    scopes=None,
    schedule="",
):
    if owner_type not in {"instance", "user"}:
        raise PluginRuntimeError("plugin.owner_invalid", "Connection owner must be instance or user")
    if owner_type == "instance":
        owner_id = 0
    elif not isinstance(owner_id, int) or owner_id <= 0:
        raise PluginRuntimeError("plugin.owner_invalid", "User connection requires a user id")
    installation = session.get(PluginInstallation, installation_id)
    if installation is None or installation.status != "active":
        raise PluginRuntimeError("plugin.installation_missing", "Plugin installation is not active")
    definition = session.get(PluginDefinition, installation.definition_id)
    allowed_owners = set((definition.manifest or {}).get("connection_owners") or ["instance", "user"])
    if owner_type not in allowed_owners:
        raise PluginRuntimeError("plugin.owner_forbidden", "This plugin does not support this connection owner")
    _validate_credentials(definition, credentials)
    _validate_public_config(config or {}, credentials)
    approved = {
        item.permission
        for item in session.query(PluginPermission)
        .filter(PluginPermission.installation_id == installation.id, PluginPermission.revoked_at.is_(None))
        .all()
    }
    requested_scopes = set(scopes) if scopes is not None else approved
    if requested_scopes - approved:
        raise PluginRuntimeError("plugin.scope_not_approved", "Connection requests permissions that were not approved")

    auth_schema = definition.auth_schema or {}
    stores_credentials = bool(auth_schema.get("properties") or auth_schema.get("required"))
    cipher = SecretCipher(settings) if stores_credentials else None
    connection = (
        session.query(PluginConnection)
        .filter(
            PluginConnection.installation_id == installation_id,
            PluginConnection.owner_type == owner_type,
            PluginConnection.owner_id == owner_id,
            PluginConnection.name == name,
        )
        .first()
    )
    now = datetime.datetime.now()
    if connection is None:
        connection = PluginConnection(
            installation_id=installation_id,
            owner_type=owner_type,
            owner_id=owner_id,
            name=name,
            create_time=now,
        )
        session.add(connection)
        session.flush()
    if stores_credentials:
        secret = session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
        if secret is None:
            secret = PluginSecret(
                owner_type=owner_type,
                owner_id=owner_id,
                kind="credentials",
                ciphertext="pending",
                key_id=cipher.key_id,
                create_time=now,
                last_rotated_at=now,
            )
            session.add(secret)
            session.flush()
            connection.secret_id = secret.id
        else:
            secret.version = int(secret.version or 0) + 1
            secret.last_rotated_at = now
        secret.ciphertext = cipher.encrypt(credentials)
        secret.key_id = cipher.key_id
        secret.mask_hint = secret_mask_hint(credentials)
    connection.config = dict(config or {})
    connection.scopes = sorted(requested_scopes)
    connection.schedule = schedule or ""
    connection.enabled = True
    connection.update_time = now
    session.commit()
    return connection


def rotate_connection_secret(session, settings, connection_id, credentials):
    connection = session.get(PluginConnection, connection_id)
    if connection is None:
        raise PluginRuntimeError("plugin.connection_missing", "Plugin connection was not found")
    installation = session.get(PluginInstallation, connection.installation_id)
    definition = session.get(PluginDefinition, installation.definition_id)
    _validate_credentials(definition, credentials)
    secret = session.get(PluginSecret, connection.secret_id)
    cipher = SecretCipher(settings)
    secret.ciphertext = cipher.encrypt(credentials)
    secret.key_id = cipher.key_id
    secret.mask_hint = secret_mask_hint(credentials)
    secret.version = int(secret.version or 0) + 1
    secret.last_rotated_at = datetime.datetime.now()
    session.commit()
    return secret


def _validate_credentials(definition, credentials):
    if not isinstance(credentials, dict):
        raise PluginRuntimeError("plugin.credentials_invalid", "Credentials must be an object")
    schema = definition.auth_schema or {}
    properties = schema.get("properties", {})
    required = set(schema.get("required", []))
    if required - credentials.keys():
        raise PluginRuntimeError("plugin.credentials_missing", "Required plugin credentials are missing")
    if credentials.keys() - properties.keys():
        raise PluginRuntimeError("plugin.credentials_unknown", "Credentials contain undeclared fields")
    if any(not isinstance(value, str) or not value for value in credentials.values()):
        raise PluginRuntimeError("plugin.credentials_invalid", "Credential values must be non-empty strings")


def _validate_public_config(config, credentials=None):
    if not isinstance(config, dict):
        raise PluginRuntimeError("plugin.config_invalid", "Plugin config must be an object")
    secret_values = {str(value) for value in (credentials or {}).values() if value not in (None, "")}

    def visit(value, key=""):
        if SENSITIVE_KEY_RE.search(key):
            raise PluginRuntimeError("plugin.secret_in_config", "Secrets must be stored in the credentials object")
        if isinstance(value, dict):
            for child_key, child_value in value.items():
                visit(child_value, str(child_key))
        elif isinstance(value, (list, tuple)):
            for child in value:
                visit(child, key)
        elif str(value) in secret_values:
            raise PluginRuntimeError("plugin.secret_in_config", "Credential values cannot be copied into plugin config")

    visit(config)


class PluginRuntime:
    def __init__(self, session, settings, registry=REGISTRY, sleeper=time.sleep):
        self.session = session
        self.settings = settings
        self.registry = registry
        self.sleeper = sleeper

    def prepare_run(self, connection_id, action, requested_by, trigger="manual", parent_run_id=None):
        if action not in ACTIONS:
            raise PluginRuntimeError("plugin.action_invalid", "Unsupported plugin action")
        connection = self.session.get(PluginConnection, connection_id)
        if connection is None or not connection.enabled:
            raise PluginRuntimeError("plugin.connection_missing", "Plugin connection is not enabled")
        installation = self.session.get(PluginInstallation, connection.installation_id)
        definition = self.session.get(PluginDefinition, installation.definition_id)
        if not installation.enabled or installation.status != "active":
            raise PluginRuntimeError("plugin.installation_disabled", "Plugin installation is disabled")
        if action not in (definition.actions or []):
            raise PluginRuntimeError("plugin.action_not_supported", "Plugin does not support this action")
        parent = None
        if action in {"retry", "rollback"}:
            parent = self.session.get(PluginRun, parent_run_id)
            if parent is None or parent.connection_id != connection_id or parent.status not in TERMINAL_STATUSES:
                raise PluginRuntimeError("plugin.parent_run_invalid", "A terminal run from this connection is required")
            if action == "retry" and parent.status not in {"failed", "partial"}:
                raise PluginRuntimeError("plugin.retry_not_allowed", "Only failed or partial runs can be retried")
            if action == "rollback" and parent.action not in {"run", "retry"}:
                raise PluginRuntimeError("plugin.rollback_not_allowed", "Only write runs can be rolled back")
        run = PluginRun(
            connection_id=connection_id,
            parent_run_id=parent.id if parent else None,
            action=action,
            trigger=trigger,
            status="queued",
            requested_by=requested_by,
            counts=dict(DEFAULT_COUNTS),
            cursor_before=dict(connection.cursor or {}),
            cursor_after=dict(connection.cursor or {}),
            create_time=datetime.datetime.now(),
        )
        self.session.add(run)
        self.session.commit()
        return run

    def execute(self, run_id):
        run = self.session.get(PluginRun, run_id)
        if run is None:
            raise PluginRuntimeError("plugin.run_missing", "Plugin run was not found")
        if run.status != "queued":
            return run
        connection = self.session.get(PluginConnection, run.connection_id)
        token = uuid.uuid4().hex
        now = datetime.datetime.now()
        timeout = max(0.01, float((connection.config or {}).get("timeout_seconds", 30)))
        lease_until = now + datetime.timedelta(seconds=timeout + 30)
        acquired = (
            self.session.query(PluginConnection)
            .filter(
                PluginConnection.id == connection.id,
                or_(PluginConnection.lease_until.is_(None), PluginConnection.lease_until < now),
            )
            .update(
                {PluginConnection.lease_token: token, PluginConnection.lease_until: lease_until},
                synchronize_session=False,
            )
        )
        if not acquired:
            self._finish_error(run, connection, "plugin.concurrent_run", "Another run is active for this connection")
            return run
        run.status = "running"
        run.started_at = now
        run.attempt = 0
        self.session.commit()
        secrets = {}
        try:
            if run.action == "rollback":
                self._rollback(run, connection)
            else:
                secrets = self._load_secrets(connection)
                result = self._call_provider(run, connection, secrets, timeout)
                self._apply_result(run, connection, result, secrets)
        except (PluginRuntimeError, SecretCipherError, ProviderError) as exc:
            code = getattr(exc, "code", "plugin.execution_failed")
            self._finish_error(run, connection, code, redact(str(exc), secrets))
        except Exception as exc:
            self._finish_error(run, connection, "plugin.execution_failed", redact(str(exc), secrets))
        finally:
            self.session.query(PluginConnection).filter(
                PluginConnection.id == connection.id, PluginConnection.lease_token == token
            ).update({PluginConnection.lease_token: "", PluginConnection.lease_until: None}, synchronize_session=False)
            self.session.commit()
        return run

    def _load_secrets(self, connection):
        secret = self.session.get(PluginSecret, connection.secret_id) if connection.secret_id else None
        if secret is None:
            installation = self.session.get(PluginInstallation, connection.installation_id)
            definition = self.session.get(PluginDefinition, installation.definition_id)
            auth_schema = definition.auth_schema or {}
            if not auth_schema.get("properties") and not auth_schema.get("required"):
                return {}
            raise PluginRuntimeError("plugin.credentials_missing", "Plugin connection has no credentials")
        cipher = SecretCipher(self.settings)
        if secret.key_id != cipher.key_id:
            raise PluginRuntimeError("plugin.secret_key_mismatch", "Plugin credential requires key rotation")
        return cipher.decrypt(secret.ciphertext)

    def _call_provider(self, run, connection, secrets, timeout):
        installation = self.session.get(PluginInstallation, connection.installation_id)
        provider = self.registry.get(installation.plugin_key)
        target_ids = []
        if run.action == "retry":
            target_ids = [
                item.external_id
                for item in self.session.query(PluginRunItem)
                .filter(PluginRunItem.run_id == run.parent_run_id, PluginRunItem.status == "failed")
                .all()
            ]
            if not target_ids:
                raise PluginRuntimeError("plugin.retry_empty", "The source run has no failed items")
        max_retries = max(0, min(5, int((connection.config or {}).get("max_retries", 2))))
        base_backoff = max(0.0, min(60.0, float((connection.config or {}).get("backoff_seconds", 0.05))))
        last_error = None
        for attempt in range(1, max_retries + 2):
            run.attempt = attempt
            self.session.commit()
            context = {
                "action": run.action,
                "attempt": attempt,
                "config": {**dict(installation.config or {}), **dict(connection.config or {})},
                "cursor": dict(connection.cursor or {}),
                "secrets": dict(secrets),
                "scopes": list(connection.scopes or []),
                "target_external_ids": target_ids,
                "deadline": (datetime.datetime.now() + datetime.timedelta(seconds=timeout)).isoformat(),
            }
            try:
                result = self._call_with_timeout(provider, context, timeout)
                if not isinstance(result, ProviderResult):
                    raise PluginRuntimeError("plugin.provider_contract", "Provider returned an invalid result")
                return result
            except ProviderAuthError:
                raise
            except ProviderRateLimitError as exc:
                last_error = exc
                if attempt > max_retries:
                    raise
                delay = exc.retry_after if exc.retry_after is not None else base_backoff * (2 ** (attempt - 1))
                self.sleeper(max(0.0, min(60.0, float(delay))))
            except PluginRuntimeError as exc:
                last_error = exc
                if not exc.retryable or attempt > max_retries:
                    raise
                self.sleeper(base_backoff * (2 ** (attempt - 1)))
        raise last_error or PluginRuntimeError("plugin.execution_failed", "Plugin execution failed")

    @staticmethod
    def _call_with_timeout(provider, context, timeout):
        executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="plugin-provider")
        future = executor.submit(provider.execute, context)
        try:
            return future.result(timeout=timeout)
        except FutureTimeoutError as exc:
            future.cancel()
            raise PluginRuntimeError("plugin.timeout", "Plugin execution timed out", retryable=True) from exc
        finally:
            executor.shutdown(wait=False, cancel_futures=True)

    def _apply_result(self, run, connection, result, secrets):
        counts = dict(DEFAULT_COUNTS)
        counts["fetched"] = len(result.items)
        for item in result.items:
            safe_data = redact(dict(item.data or {}), secrets)
            if item.entity_type not in ENTITY_TYPES or not item.external_id:
                self._add_item(
                    run,
                    item.external_id or "invalid-item",
                    item.entity_type or "unknown",
                    "failed",
                    "",
                    "plugin.item_invalid",
                    "Provider item identity is invalid",
                    safe_data,
                )
                counts["failed"] += 1
                continue
            if item.error_code:
                self._add_item(
                    run,
                    item.external_id,
                    item.entity_type,
                    "failed",
                    "",
                    item.error_code,
                    redact(item.error_message, secrets),
                    safe_data,
                )
                counts["failed"] += 1
                continue
            payload_hash = hashlib.sha256(
                json.dumps(safe_data, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
            ).hexdigest()
            if run.action in {"preview", "test"}:
                self._add_item(
                    run, item.external_id, item.entity_type, "previewed", "preview", "", "", safe_data, payload_hash
                )
                continue
            operation, status = self._upsert_source_record(run, connection, item, safe_data, payload_hash)
            self._add_item(run, item.external_id, item.entity_type, status, operation, "", "", safe_data, payload_hash)
            if status == "conflict":
                counts["conflicts"] += 1
            elif operation == "created":
                counts["written"] += 1
            elif operation == "updated":
                counts["updated"] += 1
            else:
                counts["skipped"] += 1

        problems = counts["failed"] + counts["conflicts"]
        successful = counts["written"] + counts["updated"] + counts["skipped"]
        run.counts = counts
        if problems:
            run.status = "partial" if successful else "failed"
            run.cursor_after = dict(run.cursor_before or {})
        else:
            run.status = "succeeded"
            if run.action in {"run", "retry"}:
                connection.cursor = dict(result.next_cursor or connection.cursor or {})
                run.cursor_after = dict(connection.cursor or {})
        connection.health = "healthy" if run.status == "succeeded" else "degraded"
        connection.health_message = str(redact(result.health_message or "", secrets))[:500]
        self._finish_timing(run)
        self.session.commit()

    def _upsert_source_record(self, run, connection, item, safe_data, payload_hash):
        record = (
            self.session.query(PluginSourceRecord)
            .filter(
                PluginSourceRecord.connection_id == connection.id,
                PluginSourceRecord.entity_type == item.entity_type,
                PluginSourceRecord.external_id == item.external_id,
            )
            .first()
        )
        now = datetime.datetime.now()
        remote_updated_at = _parse_datetime(item.remote_updated_at)
        if record is None:
            record = PluginSourceRecord(
                connection_id=connection.id,
                source=self.session.get(PluginInstallation, connection.installation_id).plugin_key,
                external_id=item.external_id,
                entity_type=item.entity_type,
                entity_id=item.external_id,
                run_id=run.id,
                raw_hash=payload_hash,
                remote_updated_at=remote_updated_at,
                local_modified=False,
                status="active",
                data=safe_data,
                create_time=now,
                update_time=now,
            )
            self.session.add(record)
            return "created", "succeeded"
        if record.local_modified and record.raw_hash != payload_hash:
            return "protected", "conflict"
        if record.status == "active" and record.raw_hash == payload_hash:
            return "skipped", "succeeded"
        record.run_id = run.id
        record.raw_hash = payload_hash
        record.remote_updated_at = remote_updated_at
        record.status = "active"
        record.data = safe_data
        record.update_time = now
        record.rolled_back_at = None
        return "updated", "succeeded"

    def _rollback(self, run, connection):
        parent = self.session.get(PluginRun, run.parent_run_id)
        records = (
            self.session.query(PluginSourceRecord)
            .filter(PluginSourceRecord.run_id == parent.id, PluginSourceRecord.status == "active")
            .all()
        )
        counts = dict(DEFAULT_COUNTS)
        counts["fetched"] = len(records)
        now = datetime.datetime.now()
        for record in records:
            if record.local_modified:
                counts["conflicts"] += 1
                self._add_item(
                    run,
                    record.external_id,
                    record.entity_type,
                    "conflict",
                    "protected",
                    "plugin.rollback_local_modified",
                    "Local changes protect this record from rollback",
                    {},
                    record.raw_hash,
                )
                continue
            record.status = "rolled_back"
            record.rolled_back_at = now
            record.update_time = now
            counts["written"] += 1
            self._add_item(
                run,
                record.external_id,
                record.entity_type,
                "rolled_back",
                "rolled_back",
                "",
                "",
                {},
                record.raw_hash,
            )
        cursor_conflict = dict(connection.cursor or {}) != dict(parent.cursor_after or {})
        if not cursor_conflict:
            connection.cursor = dict(parent.cursor_before or {})
            run.cursor_after = dict(connection.cursor or {})
        else:
            counts["conflicts"] += 1
        run.counts = counts
        run.status = "partial" if counts["conflicts"] else "rolled_back"
        connection.health_message = "rollback completed with conflicts" if counts["conflicts"] else "rollback completed"
        self._finish_timing(run)
        self.session.commit()

    def _add_item(
        self,
        run,
        external_id,
        entity_type,
        status,
        operation,
        error_code,
        error_message,
        data,
        payload_hash="",
    ):
        self.session.add(
            PluginRunItem(
                run_id=run.id,
                external_id=str(external_id)[:500],
                entity_type=str(entity_type)[:64],
                status=status,
                operation=operation,
                error_code=error_code,
                error_message=str(error_message or "")[:1000],
                payload_hash=payload_hash,
                data=data,
            )
        )

    def _finish_error(self, run, connection, code, message):
        run.status = "failed"
        run.error_code = str(code)[:128]
        run.error_message = str(message or "Plugin execution failed")[:1000]
        run.cursor_after = dict(run.cursor_before or {})
        if code == ProviderAuthError.code:
            connection.health = "unauthorized"
        elif code not in {"plugin.concurrent_run", "plugin.secret_key_mismatch"}:
            connection.health = "degraded"
        connection.health_message = run.error_message[:500]
        self._finish_timing(run)
        self.session.commit()

    @staticmethod
    def _finish_timing(run):
        run.finished_at = datetime.datetime.now()
        if run.started_at:
            run.duration_ms = max(0, int((run.finished_at - run.started_at).total_seconds() * 1000))


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime.datetime):
        return value
    try:
        return datetime.datetime.fromisoformat(str(value).replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return None
