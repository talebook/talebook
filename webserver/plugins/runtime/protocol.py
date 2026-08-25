import re
from dataclasses import dataclass, field
from typing import Any

from .domains import DomainRecord, SourceBook, coerce_entity


PROTOCOL_VERSION = "talebook.plugin/v1"
CATEGORIES = frozenset({"metadata", "annotations", "reviews", "book_sources", "integrations"})
RUNTIME_KINDS = frozenset({"builtin", "file", "http", "managed_process"})
ACTIONS = frozenset({"test", "preview", "run", "retry", "rollback"})
REQUIRED_MANIFEST_FIELDS = frozenset(
    {
        "protocol_version",
        "id",
        "name",
        "version",
        "categories",
        "capabilities",
        "runtime_kind",
        "actions",
        "auth_schema",
        "config_schema",
        "connection_owners",
        "permissions",
        "data_policy",
        "compatibility",
        "homepage",
        "license",
    }
)
# 可选但受类型约束；其余未知键一律拒绝，避免协议被悄悄扩写。
OPTIONAL_MANIFEST_FIELDS = frozenset({"description", "ui", "download_mode", "extra_features"})
CONNECTION_OWNERS = frozenset({"instance", "user"})
PLUGIN_ID_RE = re.compile(r"^[a-z0-9]+(?:[.-][a-z0-9]+)+$")
VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")
CAPABILITY_RE = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")


class ManifestError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


class UpstreamError(RuntimeError):
    code = "provider_error"
    retryable = False

    def __init__(self, message="Upstream request failed", *, error_type="other", status_code=None):
        self.error_type = error_type
        self.status_code = status_code
        super().__init__(message)


class UpstreamAuthError(UpstreamError):
    code = "provider_unauthorized"


class UpstreamRateLimitError(UpstreamError):
    code = "provider_rate_limited"
    retryable = True

    def __init__(self, message="Upstream rate limit exceeded", retry_after=None):
        self.retry_after = retry_after
        super().__init__(message)


@dataclass(frozen=True)
class ProviderItem:
    external_id: str
    entity_type: str
    data: DomainRecord | SourceBook
    remote_updated_at: str | None = None
    error_code: str = ""
    error_message: str = ""

    def __post_init__(self):
        value = self.data
        if self.entity_type == "book_source" and isinstance(value, dict) and "external_id" not in value:
            value = {"external_id": self.external_id, **value}
        object.__setattr__(self, "data", coerce_entity(self.entity_type, value))


@dataclass(frozen=True)
class ProviderResult:
    items: list[ProviderItem] = field(default_factory=list)
    next_cursor: dict[str, Any] = field(default_factory=dict)
    health_message: str = ""


@dataclass(frozen=True)
class PluginManifest:
    raw: dict[str, Any]

    @classmethod
    def validate(cls, raw):
        if not isinstance(raw, dict):
            raise ManifestError("manifest.invalid", "manifest must be an object")
        missing = sorted(REQUIRED_MANIFEST_FIELDS - raw.keys())
        if missing:
            raise ManifestError("manifest.missing_fields", "missing manifest fields: %s" % ", ".join(missing))
        if raw["protocol_version"] != PROTOCOL_VERSION:
            raise ManifestError("manifest.protocol_unsupported", "unsupported plugin protocol version")
        plugin_id = raw["id"]
        if not isinstance(plugin_id, str) or len(plugin_id) > 200 or not PLUGIN_ID_RE.fullmatch(plugin_id):
            raise ManifestError(
                "manifest.id_invalid", "plugin id must be a dotted lowercase identifier of at most 200 characters"
            )
        if not isinstance(raw["version"], str) or not VERSION_RE.fullmatch(raw["version"]):
            raise ManifestError("manifest.version_invalid", "plugin version must be semantic versioning")
        if not isinstance(raw["name"], str) or not raw["name"].strip():
            raise ManifestError("manifest.name_invalid", "plugin name is required")
        if raw["runtime_kind"] not in RUNTIME_KINDS:
            raise ManifestError("manifest.runtime_invalid", "unsupported runtime kind")

        categories = cls._string_set(raw, "categories")
        unknown_categories = categories - CATEGORIES
        if not categories or unknown_categories:
            raise ManifestError("manifest.category_invalid", "manifest contains unsupported categories")
        capabilities = cls._string_set(raw, "capabilities")
        if not capabilities:
            raise ManifestError("manifest.capability_invalid", "at least one capability is required")
        for capability in capabilities:
            if not CAPABILITY_RE.fullmatch(capability) or capability.split(".", 1)[0] not in categories:
                raise ManifestError("manifest.capability_invalid", "capability must use a declared category prefix")

        actions = cls._string_set(raw, "actions")
        if not actions or actions - ACTIONS:
            raise ManifestError("manifest.action_invalid", "manifest contains unsupported actions")
        for key in ("auth_schema", "config_schema", "data_policy", "compatibility"):
            if not isinstance(raw[key], dict):
                raise ManifestError("manifest.schema_invalid", "%s must be an object" % key)
        permissions = cls._string_set(raw, "permissions", allow_empty=True)
        for permission in permissions:
            if not CAPABILITY_RE.fullmatch(permission):
                raise ManifestError("manifest.permission_invalid", "permissions must use dotted lowercase identifiers")
        owners = cls._string_set(raw, "connection_owners")
        if owners - CONNECTION_OWNERS:
            raise ManifestError("manifest.connection_owner_invalid", "connection_owners must be instance and/or user")
        if not isinstance(raw["homepage"], str) or not isinstance(raw["license"], str):
            raise ManifestError("manifest.metadata_invalid", "homepage and license must be strings")
        if not isinstance(raw.get("ui", {}), dict):
            raise ManifestError("manifest.ui_invalid", "ui must be an object")
        if not isinstance(raw.get("description", ""), str):
            raise ManifestError("manifest.description_invalid", "description must be a string")
        download_mode = raw.get("download_mode")
        if download_mode is not None and download_mode not in {"single_book", "by_chapters", "none"}:
            raise ManifestError("manifest.download_mode_invalid", "download_mode is invalid")
        extra_features = raw.get("extra_features", {})
        if not isinstance(extra_features, dict):
            raise ManifestError("manifest.extra_features_invalid", "extra_features must be an object")
        for action, feature in extra_features.items():
            if not isinstance(action, str) or not action or not isinstance(feature, dict):
                raise ManifestError("manifest.extra_features_invalid", "extra feature declarations are invalid")
            if feature.get("mode") not in {"read", "write", "sync"} or not isinstance(feature.get("schema", {}), dict):
                raise ManifestError("manifest.extra_features_invalid", "extra feature mode and schema are required")
            required_scopes = feature.get("required_scopes", [])
            if (
                not isinstance(required_scopes, list)
                or any(not isinstance(scope, str) or not scope for scope in required_scopes)
                or set(required_scopes) - permissions
            ):
                raise ManifestError(
                    "manifest.extra_features_invalid",
                    "extra feature scopes must be declared plugin permissions",
                )

        unknown = {
            key
            for key in raw
            if key not in REQUIRED_MANIFEST_FIELDS and key not in OPTIONAL_MANIFEST_FIELDS and not key.startswith("x-")
        }
        if unknown:
            raise ManifestError("manifest.unknown_field", "manifest contains unknown fields: %s" % ", ".join(sorted(unknown)))

        cls._reject_secret_defaults(raw["auth_schema"])
        return cls(dict(raw))

    @staticmethod
    def _string_set(raw, key, allow_empty=False):
        values = raw[key]
        if not isinstance(values, list) or any(not isinstance(value, str) or not value for value in values):
            raise ManifestError("manifest.%s_invalid" % key, "%s must be a list of strings" % key)
        if len(values) != len(set(values)):
            raise ManifestError("manifest.%s_duplicate" % key, "%s must not contain duplicates" % key)
        if not allow_empty and not values:
            raise ManifestError("manifest.%s_invalid" % key, "%s must not be empty" % key)
        return set(values)

    @staticmethod
    def _reject_secret_defaults(schema):
        properties = schema.get("properties", {})
        if not isinstance(properties, dict):
            raise ManifestError("manifest.auth_schema_invalid", "auth_schema.properties must be an object")
        for name, field_schema in properties.items():
            if not isinstance(field_schema, dict):
                raise ManifestError("manifest.auth_schema_invalid", "auth schema fields must be objects")
            if "default" in field_schema:
                raise ManifestError("manifest.secret_default_forbidden", "secret fields cannot define defaults")
            if field_schema.get("writeOnly") is not True:
                raise ManifestError("manifest.secret_write_only", "secret field %s must be writeOnly" % name)

    def to_dict(self):
        return dict(self.raw)


_JSON_TYPES = {
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "array": list,
    "object": dict,
}


def validate_against_schema(schema, value, where="config"):
    """按 manifest 声明的 schema 校验配置值。

    只覆盖现有 manifest 实际用到的子集：type、properties、required、enum、
    minimum/maximum、items.type。仓库未引入 jsonschema 依赖，也无需引入——
    未声明的键一律拒绝，能挡住的正是「任意键值流入 context["config"]」这一类问题。
    """
    if not isinstance(schema, dict) or not schema:
        return
    if not isinstance(value, dict):
        raise ManifestError("%s.invalid" % where, "%s must be an object" % where)

    properties = schema.get("properties") or {}
    unknown = set(value) - set(properties)
    if unknown:
        raise ManifestError("%s.unknown_field" % where, "unknown %s fields: %s" % (where, ", ".join(sorted(unknown))))

    missing = [name for name in (schema.get("required") or []) if name not in value]
    if missing:
        raise ManifestError("%s.missing_field" % where, "missing %s fields: %s" % (where, ", ".join(sorted(missing))))

    for name, field_schema in properties.items():
        if name not in value or not isinstance(field_schema, dict):
            continue
        _validate_field(field_schema, value[name], "%s.%s" % (where, name))


def _validate_field(schema, value, path):
    where = path.split(".", 1)[0]
    expected = schema.get("type")
    python_type = _JSON_TYPES.get(expected)
    if python_type is not None:
        # JSON 里 bool 是 int 的子类，但 {"type": "integer"} 不应接受 True。
        if expected in {"integer", "number"} and isinstance(value, bool):
            raise ManifestError("%s.type_invalid" % where, "%s must be %s" % (path, expected))
        if not isinstance(value, python_type):
            raise ManifestError("%s.type_invalid" % where, "%s must be %s" % (path, expected))

    choices = schema.get("enum")
    if choices and value not in choices:
        raise ManifestError("%s.enum_invalid" % where, "%s must be one of %s" % (path, ", ".join(map(str, choices))))

    if isinstance(value, (int, float)) and not isinstance(value, bool):
        minimum, maximum = schema.get("minimum"), schema.get("maximum")
        if minimum is not None and value < minimum:
            raise ManifestError("%s.range_invalid" % where, "%s must be >= %s" % (path, minimum))
        if maximum is not None and value > maximum:
            raise ManifestError("%s.range_invalid" % where, "%s must be <= %s" % (path, maximum))

    item_type = _JSON_TYPES.get((schema.get("items") or {}).get("type")) if isinstance(value, list) else None
    if item_type is not None and any(not isinstance(item, item_type) for item in value):
        raise ManifestError("%s.item_invalid" % where, "%s items have an unexpected type" % path)
