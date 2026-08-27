import re

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
        "ui": {"icon": icon, "primary_action": "configure"},
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
