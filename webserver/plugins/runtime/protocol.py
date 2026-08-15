import re
from dataclasses import dataclass, field
from typing import Any


PROTOCOL_VERSION = "talebook.plugin/v1"
CATEGORIES = frozenset({"metadata", "annotations", "reviews", "book_sources"})
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
        "permissions",
        "data_policy",
        "compatibility",
        "homepage",
        "license",
    }
)
PLUGIN_ID_RE = re.compile(r"^[a-z0-9]+(?:[.-][a-z0-9]+)+$")
VERSION_RE = re.compile(r"^[0-9]+\.[0-9]+\.[0-9]+(?:[-+][0-9A-Za-z.-]+)?$")
CAPABILITY_RE = re.compile(r"^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$")


class ManifestError(ValueError):
    def __init__(self, code, message):
        self.code = code
        super().__init__(message)


class ProviderError(RuntimeError):
    code = "provider_error"
    retryable = False

    def __init__(self, message="Provider request failed"):
        super().__init__(message)


class ProviderAuthError(ProviderError):
    code = "provider_unauthorized"


class ProviderRateLimitError(ProviderError):
    code = "provider_rate_limited"
    retryable = True

    def __init__(self, message="Provider rate limit exceeded", retry_after=None):
        self.retry_after = retry_after
        super().__init__(message)


@dataclass(frozen=True)
class ProviderItem:
    external_id: str
    entity_type: str
    data: dict[str, Any]
    remote_updated_at: str | None = None
    error_code: str = ""
    error_message: str = ""


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
        if not isinstance(plugin_id, str) or not PLUGIN_ID_RE.fullmatch(plugin_id):
            raise ManifestError("manifest.id_invalid", "plugin id must be a dotted lowercase identifier")
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
        if not isinstance(raw["homepage"], str) or not isinstance(raw["license"], str):
            raise ManifestError("manifest.metadata_invalid", "homepage and license must be strings")
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
