import re
from collections.abc import Mapping

from webserver.plugins.runtime.protocol import PROTOCOL_VERSION


SUMMARY_LIMIT = 500
EMPTY_VALUES = (None, "", [], {})


def _manifest(
    plugin_id,
    name,
    description,
    categories,
    capabilities,
    auth_schema,
    config_schema,
    permissions,
    icon,
    homepage,
    connection_owners=("instance",),
):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": categories,
        "capabilities": capabilities,
        "runtime_kind": "builtin",
        "actions": ["test", "preview", "run", "retry", "rollback"],
        "auth_schema": auth_schema,
        "config_schema": config_schema,
        "permissions": permissions,
        "data_policy": {
            "stores_full_text": False,
            "retention": "rating_summary_and_source_link",
        },
        "compatibility": {"talebook": ">=0.1.0"},
        "homepage": homepage,
        "license": "GPL-3.0",
        "ui": {
            "icon": icon,
            "configuration_mode": "none",
            "primary_action": "details",
        },
        "connection_owners": list(connection_owners),
    }


def _first(value, default=None):
    if isinstance(value, list):
        return value[0] if value else default
    return value if value not in EMPTY_VALUES else default


def _summary(value):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    return text[:SUMMARY_LIMIT]


def build_field_decisions(current, candidate, locked_fields=()):
    """Describe an enrichment without mutating authoritative metadata."""
    current = dict(current or {})
    locked = {str(field) for field in locked_fields or []}
    decisions = []
    for field in sorted(candidate):
        proposed = candidate[field]
        if proposed in EMPTY_VALUES:
            continue
        existing = current.get(field)
        if field in locked:
            decision = "locked"
        elif existing in EMPTY_VALUES:
            decision = "fill_empty"
        elif existing == proposed:
            decision = "unchanged"
        else:
            decision = "candidate"
        decisions.append(
            {
                "field": field,
                "current": existing,
                "candidate": proposed,
                "decision": decision,
                "locked": field in locked,
                "will_apply": decision == "fill_empty",
            }
        )
    return decisions


# ---------------------------------------------------------------------------
# calibre Metadata 与平台 BookMetadata 的互转
#
# 元数据源内部统一构造 calibre 的 ``Metadata``：候选展示只需要下列字段，但应用
# 路径要调用 ``mi.smart_update()`` 写回书库，依赖的是 ``Metadata`` 自身的内部
# 状态（含自定义列）。逐字段重建必然遗漏，因此转换保留原对象引用，由写库路径
# 通过 ``to_calibre_metadata()`` 取回，展示路径则只读取类型化字段。
# ---------------------------------------------------------------------------

CALIBRE_MI_KEY = "_calibre_mi"

METADATA_FIELDS = (
    "title",
    "authors",
    "author",
    "author_sort",
    "publisher",
    "isbn",
    "comments",
    "pubdate",
    "tags",
    "rating",
    "series",
    "language",
    "cover_url",
    "source",
    "website",
    "provider_key",
    "provider_value",
)


def to_book_metadata(mi, provider_key=None):
    """calibre ``Metadata`` → ``BookMetadata``；原对象随记录一并携带。"""
    from webserver.plugins.runtime.domains import BookMetadata

    if mi is None:
        return None
    values = {field: getattr(mi, field, None) for field in METADATA_FIELDS}
    if provider_key and not values.get("provider_key"):
        values["provider_key"] = provider_key
    values[CALIBRE_MI_KEY] = mi
    return BookMetadata.from_dict(values)


def to_calibre_metadata(record):
    """取回可直接写回书库的 calibre ``Metadata``。"""
    if record is None:
        return None
    if isinstance(record, Mapping):
        return record.get(CALIBRE_MI_KEY) or None
    return record


def meta_manifest(
    plugin_id,
    name,
    description,
    icon,
    homepage,
    config_schema=None,
    auth_schema=None,
    configuration_mode="none",
    brand_icon="",
    deprecated=False,
):
    """元数据源共用的 manifest：能力固定为 metadata.lookup。"""
    manifest = _manifest(
        plugin_id,
        name,
        description,
        ["metadata"],
        ["metadata.lookup"],
        auth_schema or {"type": "object", "properties": {}},
        config_schema or {"type": "object", "properties": {}},
        ["books.read"],
        icon,
        homepage,
    )
    manifest["ui"].update(
        {
            "configuration_mode": configuration_mode,
            "primary_action": "configure" if configuration_mode == "form" else "details",
        }
    )
    if brand_icon:
        manifest["ui"]["brand_icon"] = brand_icon
    if deprecated:
        manifest["ui"]["deprecated"] = True
    return manifest


class MetaSourceMixin:
    """元数据源共用的 MetadataProvider 样板。

    具体源只需实现 ``_search(query, context)`` 返回 calibre ``Metadata`` 列表，
    以及可选的 ``_fetch(external_id, context)``；协议要求的三个方法在此统一。
    """

    default_enabled = True
    legacy_sources = ()

    def initial_enabled(self, settings):
        """元数据源默认开启；显式关闭默认值的源仍可承接旧来源选择。"""
        selected = set((settings or {}).get("META_SELECTED_SOURCES") or [])
        return bool(self.default_enabled or selected.intersection(self.legacy_sources))

    def initial_config(self, settings):
        return {}

    def search_books(self, query, context):
        from webserver.plugins.runtime.domains import MetadataQuery

        query = MetadataQuery.from_value(query)
        if query.is_empty():
            return []
        key = self.manifest["id"]
        records = []
        for metadata in self._search(query, context) or []:
            metadata.provider_key = key
            record = to_book_metadata(metadata, key)
            if record:
                records.append(record)
        return records

    def get_metadata(self, external_id, context):
        fetch = getattr(self, "_fetch", None)
        if fetch is None or not external_id:
            return None
        metadata = fetch(external_id, context)
        if metadata is None:
            return None
        metadata.provider_key = self.manifest["id"]
        return to_book_metadata(metadata, self.manifest["id"])

    def self_check(self, context):
        from webserver.plugins.runtime.domains import CheckReport

        return CheckReport(healthy=True, message="%s ready" % self.manifest["name"])


def _setting(config, key, conf_key, default=""):
    """D-27 配置双读：connection.config 优先，缺失时回落已发布的 CONF 键。

    元数据源的配置在插件体系之前就已随正式版本发布并写入用户的 auto.py，
    因此不做一次性迁移；connection 优先保证用户在插件页做的修改真正生效。
    """
    value = (config or {}).get(key)
    if value not in (None, ""):
        return value
    from webserver import loader

    return loader.get_settings().get(conf_key, default)
