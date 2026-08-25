from .builtin_capabilities import BUILTIN_CAPABILITY_PROVIDERS, BuiltinCapabilityProvider
from .book_sources import BOOK_SOURCE_PROVIDERS
from .enrichment import EXTERNAL_CONNECTOR_PROVIDERS
from .interfaces import PluginContext, PluginProvider, contract_violations
from .mock import MockMultiTabProvider
from .protocol import (
    ACTIONS,
    CATEGORIES,
    PROTOCOL_VERSION,
    ManifestError,
    PluginManifest,
    ProviderAuthError,
    ProviderError,
    ProviderItem,
    ProviderRateLimitError,
    ProviderResult,
)
from .weread import WEREAD_PLUGIN_KEY, WereadProvider, parse_weread_export


# 内置插件清单。运行时只遍历这个元组，不认识其中任何一个具体插件。
ALL_BUILTIN_PROVIDERS = (
    MockMultiTabProvider(),
    WereadProvider(),
    *BUILTIN_CAPABILITY_PROVIDERS,
    *BOOK_SOURCE_PROVIDERS,
    *EXTERNAL_CONNECTOR_PROVIDERS,
)


__all__ = [
    "ACTIONS",
    "ALL_BUILTIN_PROVIDERS",
    "CATEGORIES",
    "PROTOCOL_VERSION",
    "ManifestError",
    "MockMultiTabProvider",
    "BuiltinCapabilityProvider",
    "BUILTIN_CAPABILITY_PROVIDERS",
    "BOOK_SOURCE_PROVIDERS",
    "EXTERNAL_CONNECTOR_PROVIDERS",
    "PluginContext",
    "PluginManifest",
    "PluginProvider",
    "ProviderAuthError",
    "ProviderError",
    "ProviderItem",
    "ProviderRateLimitError",
    "ProviderResult",
    "WEREAD_PLUGIN_KEY",
    "WereadProvider",
    "contract_violations",
    "parse_weread_export",
]
