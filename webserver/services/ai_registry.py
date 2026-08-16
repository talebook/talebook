"""Provider-neutral registration contracts for AI features shown in the hub."""

from __future__ import annotations

import logging
from collections import OrderedDict
from typing import Any, Dict, Iterable, Optional, Protocol


LOG = logging.getLogger(__name__)


class AIFeatureAdapter(Protocol):
    """One business feature plugged into the shared AI task surface.

    Adapters own feature semantics and business actions. The hub only discovers
    them through this protocol and never imports a runtime/provider adapter.
    """

    key: str

    def capability(self, handler: Any) -> Dict[str, Any]: ...

    def can_access(self, handler: Any, record: Any) -> tuple[bool, Optional[Dict[str, Any]]]: ...

    def task_summary(self, handler: Any, record: Any) -> Dict[str, Any]: ...

    def cancel(self, handler: Any, record: Any) -> Dict[str, Any]: ...

    def retry(self, handler: Any, record: Any) -> Dict[str, Any]: ...


class AIFeatureRegistry:
    """Ordered feature registry with per-adapter failure isolation."""

    def __init__(self, features: Iterable[AIFeatureAdapter] = ()):
        self._features: "OrderedDict[str, AIFeatureAdapter]" = OrderedDict()
        for feature in features:
            self.register(feature)

    def register(self, feature: AIFeatureAdapter) -> None:
        key = str(getattr(feature, "key", "")).strip()
        if not key:
            raise ValueError("AI feature key is required")
        if key in self._features:
            raise ValueError(f"AI feature already registered: {key}")
        self._features[key] = feature

    def get(self, key: str) -> Optional[AIFeatureAdapter]:
        return self._features.get(str(key or "").strip())

    def values(self) -> Iterable[AIFeatureAdapter]:
        return self._features.values()

    def capabilities(self, handler: Any) -> tuple[list[Dict[str, Any]], list[Dict[str, str]]]:
        items = []
        errors = []
        for feature in self.values():
            try:
                capability = feature.capability(handler)
                if capability.get("id") != feature.key:
                    raise ValueError("capability id does not match feature key")
                items.append(capability)
            except Exception:
                LOG.exception("AI capability probe failed feature=%s", feature.key)
                items.append(
                    {
                        "id": feature.key,
                        "name": feature.key,
                        "description": "",
                        "icon": "mdi-alert-circle",
                        "scope": "unknown",
                        "entry": "",
                        "permissions": ["login"],
                        "feature_flag": "",
                        "available": False,
                        "reason": "capability_probe_failed",
                    }
                )
                errors.append({"feature": feature.key, "code": "capability_probe_failed"})
        return items, errors
