import datetime
import json

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import (
    Base,
    PluginConnection,
    PluginDefinition,
    PluginPermission,
    PluginRunItem,
    PluginSecret,
    PluginSourceRecord,
)
from webserver.plugins.runtime import MockMultiTabProvider, PluginManifest
from webserver.plugins.runtime.protocol import ManifestError
from webserver.services.plugin_runtime import (
    PluginRuntime,
    PluginRuntimeError,
    ensure_builtin_definitions,
    ensure_builtin_capability_installations,
    install_builtin,
    rotate_connection_secret,
    save_connection,
)
from webserver.services.plugin_secrets import SecretCipher, SecretCipherError, redact


SETTINGS = {"PLUGIN_SECRET_KEY": "unit-test-plugin-key", "cookie_secret": "unused-cookie-secret"}
PLUGIN_KEY = MockMultiTabProvider.manifest["id"]


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def build_connection(session, credentials=None, config=None, owner_type="instance", owner_id=0):
    installation = install_builtin(session, PLUGIN_KEY, installed_by=1)
    return save_connection(
        session,
        SETTINGS,
        installation.id,
        owner_type,
        owner_id,
        credentials or {"token": "super-secret-token"},
        config=config,
    )


def execute(session, connection, action="run", parent_run_id=None):
    runtime = PluginRuntime(session, SETTINGS, sleeper=lambda _: None)
    run = runtime.prepare_run(connection.id, action, requested_by=1, parent_run_id=parent_run_id)
    runtime.execute(run.id)
    session.refresh(run)
    session.refresh(connection)
    return run


def test_manifest_protocol_and_category_capability_contract():
    manifest = PluginManifest.validate(MockMultiTabProvider.manifest)
    assert manifest.raw["protocol_version"] == "talebook.plugin/v1"
    assert manifest.raw["categories"] == ["metadata", "reviews"]
    assert set(manifest.raw["actions"]) == {"test", "preview", "run", "retry", "rollback"}

    invalid = dict(MockMultiTabProvider.manifest)
    invalid["capabilities"] = ["annotations.import"]
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(invalid)
    assert exc.value.code == "manifest.capability_invalid"


def test_manifest_forbids_plaintext_secret_defaults():
    invalid = dict(MockMultiTabProvider.manifest)
    invalid["auth_schema"] = {
        "type": "object",
        "properties": {"token": {"type": "string", "writeOnly": True, "default": "leak"}},
    }
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(invalid)
    assert exc.value.code == "manifest.secret_default_forbidden"


def test_builtin_definition_installation_and_permissions_are_shared(db_session):
    definitions = ensure_builtin_definitions(db_session)
    installation = install_builtin(db_session, PLUGIN_KEY, installed_by=7)
    definition = db_session.get(PluginDefinition, installation.definition_id)

    assert len(definitions) >= 1
    assert definition.categories == ["metadata", "reviews"]
    assert installation.scope == "shared"
    assert installation.plugin_key == PLUGIN_KEY
    assert db_session.query(PluginPermission).filter(PluginPermission.installation_id == installation.id).count() == 2


def test_builtin_capabilities_are_registered_without_ai_or_calibre_server(db_session):
    definitions = ensure_builtin_definitions(db_session)
    builtins = {item.plugin_key: item for item in definitions if item.plugin_key.startswith("talebook.")}

    assert "talebook.metadata.builtin" in builtins
    assert "talebook.book-source.opds" in builtins
    assert "talebook.book-source.legado" in builtins
    catalog = json.dumps([item.to_public_dict() for item in builtins.values()], ensure_ascii=False).lower()
    assert "calibre content server" not in catalog
    assert "calibre-web" not in catalog
    assert '"ai"' not in catalog
    assert builtins["talebook.book-source.opds"].to_public_dict()["ui"]["manage_kind"] == "opds"


def test_builtin_capability_bootstrap_is_idempotent_and_keeps_empty_auth_local(db_session):
    settings = {**SETTINGS, "auto_fill_meta": False}
    first = ensure_builtin_capability_installations(db_session, installed_by=1, settings=settings)
    second = ensure_builtin_capability_installations(db_session, installed_by=1, settings=settings)

    assert len(first) == len(second) == 6
    assert db_session.query(PluginConnection).count() == 6
    metadata = next(item for item in first if item.plugin_key == "talebook.metadata.builtin")
    assert metadata.enabled is False
    opds = next(item for item in first if item.plugin_key == "talebook.book-source.opds")
    connection = db_session.query(PluginConnection).filter(PluginConnection.installation_id == opds.id).one()
    assert connection.secret_id is None

    run = PluginRuntime(db_session, settings).prepare_run(connection.id, "test", requested_by=1)
    PluginRuntime(db_session, settings).execute(run.id)
    assert run.status == "succeeded"
    assert connection.health == "healthy"


def test_reinstall_does_not_silently_reapprove_revoked_permissions(db_session):
    installation = install_builtin(db_session, PLUGIN_KEY, installed_by=7)
    permission = (
        db_session.query(PluginPermission)
        .filter(PluginPermission.installation_id == installation.id, PluginPermission.permission == "plugin_records.write")
        .one()
    )
    permission.revoked_at = datetime.datetime.now()
    db_session.commit()

    install_builtin(db_session, PLUGIN_KEY, installed_by=7)
    db_session.refresh(permission)
    assert permission.revoked_at is not None


def test_connection_scopes_must_be_approved(db_session):
    installation = install_builtin(db_session, PLUGIN_KEY, installed_by=1, approved_permissions=["books.read"])
    with pytest.raises(PluginRuntimeError) as exc:
        save_connection(
            db_session,
            SETTINGS,
            installation.id,
            "instance",
            0,
            {"token": "secret"},
            scopes=["plugin_records.write"],
        )
    assert exc.value.code == "plugin.scope_not_approved"


def test_secret_values_are_rejected_from_public_config(db_session):
    installation = install_builtin(db_session, PLUGIN_KEY, installed_by=1)
    with pytest.raises(PluginRuntimeError) as exc:
        save_connection(
            db_session,
            SETTINGS,
            installation.id,
            "instance",
            0,
            {"token": "secret"},
            config={"nested": {"api_token": "secret"}},
        )
    assert exc.value.code == "plugin.secret_in_config"


def test_secret_is_encrypted_masked_and_rotatable(db_session):
    connection = build_connection(db_session, {"token": "visible-only-at-provider"})
    secret = db_session.get(PluginSecret, connection.secret_id)

    assert "visible-only-at-provider" not in secret.ciphertext
    assert "ciphertext" not in secret.to_public_dict()
    assert secret.to_public_dict()["mask"] == "••••ider"
    assert SecretCipher(SETTINGS).decrypt(secret.ciphertext) == {"token": "visible-only-at-provider"}

    rotate_connection_secret(db_session, SETTINGS, connection.id, {"token": "rotated-secret"})
    db_session.refresh(secret)
    assert secret.version == 2
    assert "rotated-secret" not in secret.ciphertext
    assert SecretCipher(SETTINGS).decrypt(secret.ciphertext) == {"token": "rotated-secret"}


def test_default_placeholder_key_cannot_store_credentials():
    with pytest.raises(SecretCipherError):
        SecretCipher({"PLUGIN_SECRET_KEY": "", "cookie_secret": "cookie_secret"})


def test_redactor_handles_nested_values_headers_and_error_strings():
    secret = {"token": "secret-value"}
    value = {
        "authorization": "Bearer secret-value",
        "nested": [{"source_token": "secret-value"}, "request token=secret-value"],
    }
    safe = redact(value, secret)
    assert "secret-value" not in json.dumps(safe)
    assert safe["authorization"] == "[REDACTED]"
    assert safe["nested"][0]["source_token"] == "[REDACTED]"


def test_mock_provider_test_preview_and_cross_tab_run_share_connection(db_session):
    connection = build_connection(db_session)

    test_run = execute(db_session, connection, "test")
    assert test_run.status == "succeeded"
    assert connection.health == "healthy"
    assert db_session.query(PluginSourceRecord).count() == 0

    preview = execute(db_session, connection, "preview")
    assert preview.status == "succeeded"
    assert db_session.query(PluginRunItem).filter(PluginRunItem.run_id == preview.id).count() == 2
    assert db_session.query(PluginSourceRecord).count() == 0
    assert connection.cursor == {}

    run = execute(db_session, connection, "run")
    records = db_session.query(PluginSourceRecord).order_by(PluginSourceRecord.id).all()
    assert run.status == "succeeded"
    assert run.counts["written"] == 2
    assert connection.cursor == {"offset": 1}
    assert {record.entity_type for record in records} == {"metadata", "review"}
    assert {record.connection_id for record in records} == {connection.id}
    assert "super-secret-token" not in json.dumps([record.data for record in records])
    assert "super-secret-token" not in json.dumps(
        [item.to_public_dict() for item in db_session.query(PluginRunItem).all()], ensure_ascii=False
    )
    secret = db_session.get(PluginSecret, connection.secret_id)
    public_payload = {
        "connection": connection.to_public_dict(secret),
        "run": run.to_public_dict(),
        "items": [item.to_public_dict() for item in db_session.query(PluginRunItem).all()],
    }
    assert "super-secret-token" not in json.dumps(public_payload, ensure_ascii=False)
    assert "ciphertext" not in json.dumps(public_payload, ensure_ascii=False)


def test_repeated_run_is_idempotent(db_session):
    connection = build_connection(db_session)
    first = execute(db_session, connection)
    second = execute(db_session, connection)

    assert first.counts["written"] == 2
    assert second.status == "succeeded"
    assert second.counts["written"] == 0
    assert second.counts["skipped"] == 2
    assert db_session.query(PluginSourceRecord).count() == 2
    assert connection.cursor == {"offset": 2}


def test_partial_run_does_not_advance_cursor_and_retry_only_failed_items(db_session):
    connection = build_connection(db_session, config={"fail_external_ids": ["mock-review-1"]})
    failed = execute(db_session, connection)

    assert failed.status == "partial"
    assert failed.counts["failed"] == 1
    assert connection.cursor == {}
    assert db_session.query(PluginSourceRecord).count() == 1

    retried = execute(db_session, connection, "retry", parent_run_id=failed.id)
    retry_items = db_session.query(PluginRunItem).filter(PluginRunItem.run_id == retried.id).all()
    assert retried.status == "succeeded"
    assert [item.external_id for item in retry_items] == ["mock-review-1"]
    assert db_session.query(PluginSourceRecord).count() == 2
    assert connection.cursor == {"offset": 1}


def test_rollback_restores_cursor_and_protects_local_edits(db_session):
    connection = build_connection(db_session)
    source_run = execute(db_session, connection)
    protected = db_session.query(PluginSourceRecord).filter(PluginSourceRecord.external_id == "mock-book-1").one()
    protected.local_modified = True
    db_session.commit()

    rollback = execute(db_session, connection, "rollback", parent_run_id=source_run.id)
    records = db_session.query(PluginSourceRecord).order_by(PluginSourceRecord.external_id).all()
    assert rollback.status == "partial"
    assert rollback.counts["conflicts"] == 1
    assert connection.cursor == {}
    assert {record.external_id: record.status for record in records} == {
        "mock-book-1": "active",
        "mock-review-1": "rolled_back",
    }


def test_rollback_does_not_regress_cursor_after_newer_run(db_session):
    connection = build_connection(db_session)
    first = execute(db_session, connection)
    execute(db_session, connection)

    rollback = execute(db_session, connection, "rollback", parent_run_id=first.id)
    assert rollback.status == "partial"
    assert rollback.counts["conflicts"] == 1
    assert connection.cursor == {"offset": 2}


def test_connection_lease_rejects_concurrent_execution(db_session):
    connection = build_connection(db_session)
    connection.lease_token = "another-worker"
    connection.lease_until = datetime.datetime.now() + datetime.timedelta(minutes=5)
    db_session.commit()

    run = execute(db_session, connection)
    assert run.status == "failed"
    assert run.error_code == "plugin.concurrent_run"
    assert db_session.query(PluginSourceRecord).count() == 0


def test_rate_limit_retries_then_succeeds(db_session):
    connection = build_connection(
        db_session,
        config={"rate_limit_attempts": 1, "max_retries": 2, "backoff_seconds": 0},
    )
    run = execute(db_session, connection)
    assert run.status == "succeeded"
    assert run.attempt == 2
    assert connection.health == "healthy"


def test_rate_limit_exhaustion_is_structured_and_redacted(db_session):
    connection = build_connection(
        db_session,
        config={"rate_limit_attempts": 5, "max_retries": 1, "backoff_seconds": 0},
    )
    run = execute(db_session, connection)
    assert run.status == "failed"
    assert run.error_code == "provider_rate_limited"
    assert "super-secret-token" not in run.error_message
    assert "[REDACTED]" in run.error_message
    assert connection.health == "degraded"


def test_unauthorized_is_not_retried(db_session):
    connection = build_connection(db_session, credentials={"token": "bad-token"}, config={"max_retries": 5})
    run = execute(db_session, connection, "test")
    assert run.status == "failed"
    assert run.error_code == "provider_unauthorized"
    assert run.attempt == 1
    assert connection.health == "unauthorized"
    assert "bad-token" not in run.error_message


def test_timeout_is_retried_and_never_advances_cursor(db_session):
    connection = build_connection(
        db_session,
        config={"delay_seconds": 0.08, "timeout_seconds": 0.01, "max_retries": 1, "backoff_seconds": 0},
    )
    run = execute(db_session, connection)
    assert run.status == "failed"
    assert run.error_code == "plugin.timeout"
    assert run.attempt == 2
    assert connection.cursor == {}
    assert db_session.query(PluginSourceRecord).count() == 0


def test_user_and_instance_connections_can_share_one_installation(db_session):
    instance_connection = build_connection(db_session, credentials={"token": "instance-token"})
    user_connection = save_connection(
        db_session,
        SETTINGS,
        instance_connection.installation_id,
        "user",
        42,
        {"token": "user-token"},
    )
    assert instance_connection.installation_id == user_connection.installation_id
    assert instance_connection.owner_type == "instance"
    assert user_connection.owner_type == "user"
    assert user_connection.owner_id == 42
    assert db_session.query(PluginConnection).count() == 2
