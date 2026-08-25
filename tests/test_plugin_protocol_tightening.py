"""协议收口：connection_owners 必填无默认、config_schema 落地校验、未知键拒绝。"""

import copy

import pytest

from webserver.plugins.runtime.protocol import ManifestError, PluginManifest, validate_against_schema
from webserver.services.plugin_runtime import REGISTRY


def _valid_manifest():
    return copy.deepcopy(dict(REGISTRY.get("talebook.mock.multi-tab").manifest))


def test_connection_owners_is_required_and_has_no_default():
    """此前该字段不在必填集，缺失时 save_connection 会 fail-open 到 instance + user。"""
    raw = _valid_manifest()
    del raw["connection_owners"]
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(raw)
    assert exc.value.code == "manifest.missing_fields"
    assert "connection_owners" in str(exc.value)


def test_connection_owners_rejects_values_outside_the_enum():
    raw = _valid_manifest()
    raw["connection_owners"] = ["instance", "everyone"]
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(raw)
    assert exc.value.code == "manifest.connection_owner_invalid"


def test_every_builtin_manifest_declares_connection_owners():
    for provider in REGISTRY.providers():
        owners = provider.manifest.get("connection_owners")
        assert owners, "%s 未声明 connection_owners" % provider.manifest["id"]
        assert set(owners) <= {"instance", "user"}


def test_manifest_rejects_unknown_fields_but_allows_x_prefix():
    raw = _valid_manifest()
    raw["autoload"] = True
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(raw)
    assert exc.value.code == "manifest.unknown_field"

    raw.pop("autoload")
    raw["x-experimental"] = {"note": "扩展区不受协议约束"}
    assert PluginManifest.validate(raw)


def test_manifest_type_checks_optional_ui_and_description():
    raw = _valid_manifest()
    raw["ui"] = "not-an-object"
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(raw)
    assert exc.value.code == "manifest.ui_invalid"

    raw = _valid_manifest()
    raw["description"] = 42
    with pytest.raises(ManifestError) as exc:
        PluginManifest.validate(raw)
    assert exc.value.code == "manifest.description_invalid"


SCHEMA = {
    "type": "object",
    "properties": {
        "endpoint": {"type": "string"},
        "count": {"type": "integer", "minimum": 0, "maximum": 10},
        "ratio": {"type": "number", "minimum": 0},
        "enabled": {"type": "boolean"},
        "hosts": {"type": "array", "items": {"type": "string"}},
        "mode": {"type": "string", "enum": ["manual", "auto"]},
    },
    "required": ["endpoint"],
}


def test_config_schema_rejects_undeclared_keys():
    with pytest.raises(ManifestError) as exc:
        validate_against_schema(SCHEMA, {"endpoint": "https://x.example", "sneaky": 1})
    assert exc.value.code == "config.unknown_field"


def test_config_schema_enforces_types_ranges_enums_and_required():
    with pytest.raises(ManifestError) as exc:
        validate_against_schema(SCHEMA, {})
    assert exc.value.code == "config.missing_field"

    for payload, code in [
        ({"endpoint": 1}, "config.type_invalid"),
        ({"endpoint": "x", "count": 99}, "config.range_invalid"),
        ({"endpoint": "x", "count": -1}, "config.range_invalid"),
        ({"endpoint": "x", "mode": "sometimes"}, "config.enum_invalid"),
        ({"endpoint": "x", "hosts": ["ok", 5]}, "config.item_invalid"),
    ]:
        with pytest.raises(ManifestError) as exc:
            validate_against_schema(SCHEMA, payload)
        assert exc.value.code == code, payload


def test_config_schema_does_not_accept_bool_as_integer():
    """JSON 里 bool 是 int 的子类，但 {"type": "integer"} 不该接受 True。"""
    with pytest.raises(ManifestError) as exc:
        validate_against_schema(SCHEMA, {"endpoint": "x", "count": True})
    assert exc.value.code == "config.type_invalid"


def test_config_schema_accepts_a_well_formed_payload():
    validate_against_schema(
        SCHEMA,
        {
            "endpoint": "https://x.example",
            "count": 3,
            "ratio": 0.5,
            "enabled": True,
            "hosts": ["a.lan"],
            "mode": "auto",
        },
    )
