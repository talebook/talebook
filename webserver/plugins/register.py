"""内置插件的唯一装配入口；类型包不维护第二份隐式注册表。"""

from webserver.plugins.annotation.brs import PROVIDER as BRS_PROVIDER
from webserver.plugins.combo.open_library import PROVIDER as OPEN_LIBRARY_PROVIDER
from webserver.plugins.combo.weread.provider import PROVIDER as WEREAD_PROVIDER
from webserver.plugins.metadata.calibre_provider_bridge import PROVIDER as CALIBRE_PROVIDER_BRIDGE
from webserver.plugins.metadata.embedded_file import PROVIDER as EMBEDDED_FILE_PROVIDER
from webserver.plugins.mock.multi_tab import PROVIDER as MOCK_MULTI_TAB_PROVIDER
from webserver.plugins.push.boox import PROVIDER as BOOX_PROVIDER
from webserver.plugins.push.dangdang import PROVIDER as DANGDANG_PROVIDER
from webserver.plugins.push.duokan import PROVIDER as DUOKAN_PROVIDER
from webserver.plugins.push.hanwang import PROVIDER as HANWANG_PROVIDER
from webserver.plugins.push.ireader import PROVIDER as IREADER_PROVIDER
from webserver.plugins.push.purelibro import PROVIDER as PURELIBRO_PROVIDER
from webserver.plugins.review.anilist import PROVIDER as ANILIST_PROVIDER
from webserver.plugins.review.bangumi import PROVIDER as BANGUMI_PROVIDER
from webserver.plugins.review.file_import import PROVIDER as FILE_IMPORT_PROVIDER
from webserver.plugins.review.google_books import PROVIDER as GOOGLE_BOOKS_PROVIDER
from webserver.plugins.review.hardcover import PROVIDER as HARDCOVER_PROVIDER
from webserver.plugins.review.neodb import PROVIDER as NEODB_PROVIDER
from webserver.plugins.source.booklore import PROVIDER as BOOKLORE_PROVIDER
from webserver.plugins.source.gutenberg import PROVIDER as GUTENBERG_PROVIDER
from webserver.plugins.source.internet_archive import PROVIDER as INTERNET_ARCHIVE_PROVIDER
from webserver.plugins.source.kavita import PROVIDER as KAVITA_PROVIDER
from webserver.plugins.source.komga import PROVIDER as KOMGA_PROVIDER
from webserver.plugins.source.legado import PROVIDER as LEGADO_PROVIDER
from webserver.plugins.source.opds import PROVIDER as OPDS_PROVIDER
from webserver.plugins.source.standard_ebooks import PROVIDER as STANDARD_EBOOKS_PROVIDER
from webserver.plugins.source.watch_folder import PROVIDER as WATCH_FOLDER_PROVIDER
from webserver.plugins.source.webdav import PROVIDER as WEBDAV_PROVIDER
from webserver.plugins.tool.text_replace.provider import PROVIDER as TEXT_REPLACE_PROVIDER
from webserver.plugins.tool.txt_fixer.provider import PROVIDER as TXT_FIXER_PROVIDER
from webserver.plugins.tool.zh_converter.provider import PROVIDER as ZH_CONVERTER_PROVIDER


SOURCE_PROVIDERS = (
    OPDS_PROVIDER,
    LEGADO_PROVIDER,
    KAVITA_PROVIDER,
    KOMGA_PROVIDER,
    BOOKLORE_PROVIDER,
    STANDARD_EBOOKS_PROVIDER,
    GUTENBERG_PROVIDER,
    INTERNET_ARCHIVE_PROVIDER,
    WEBDAV_PROVIDER,
    WATCH_FOLDER_PROVIDER,
)
METADATA_PROVIDERS = (OPEN_LIBRARY_PROVIDER, EMBEDDED_FILE_PROVIDER, CALIBRE_PROVIDER_BRIDGE)
REVIEW_PROVIDERS = (
    HARDCOVER_PROVIDER,
    NEODB_PROVIDER,
    GOOGLE_BOOKS_PROVIDER,
    BANGUMI_PROVIDER,
    ANILIST_PROVIDER,
    FILE_IMPORT_PROVIDER,
)
ANNOTATION_PROVIDERS = (BRS_PROVIDER,)
TOOL_PROVIDERS = (TEXT_REPLACE_PROVIDER, ZH_CONVERTER_PROVIDER, TXT_FIXER_PROVIDER)
PUSH_PROVIDERS = (
    DUOKAN_PROVIDER,
    BOOX_PROVIDER,
    HANWANG_PROVIDER,
    IREADER_PROVIDER,
    DANGDANG_PROVIDER,
    PURELIBRO_PROVIDER,
)
PUSH_PROVIDERS_BY_DEVICE = {provider.manifest["ui"]["device_type"]: provider for provider in PUSH_PROVIDERS}


BUILTIN_CAPABILITY_PROVIDERS = (OPDS_PROVIDER, LEGADO_PROVIDER, *TOOL_PROVIDERS)
BOOK_SOURCE_PROVIDERS = (
    KAVITA_PROVIDER,
    KOMGA_PROVIDER,
    BOOKLORE_PROVIDER,
    STANDARD_EBOOKS_PROVIDER,
    GUTENBERG_PROVIDER,
    INTERNET_ARCHIVE_PROVIDER,
    WEBDAV_PROVIDER,
    WATCH_FOLDER_PROVIDER,
)
EXTERNAL_CONNECTOR_PROVIDERS = (*METADATA_PROVIDERS, *REVIEW_PROVIDERS, *ANNOTATION_PROVIDERS)

ALL_BUILTIN_PROVIDERS = (
    MOCK_MULTI_TAB_PROVIDER,
    WEREAD_PROVIDER,
    *SOURCE_PROVIDERS,
    *METADATA_PROVIDERS,
    *REVIEW_PROVIDERS,
    *ANNOTATION_PROVIDERS,
    *TOOL_PROVIDERS,
    *PUSH_PROVIDERS,
)


def _legacy_plugin_key(plugin_key):
    if plugin_key.startswith("talebook.source."):
        return plugin_key.replace("talebook.source.", "talebook.book-source.", 1)
    if plugin_key.startswith("talebook.review."):
        return plugin_key.replace("talebook.review.", "talebook.reviews.", 1)
    if plugin_key.startswith("talebook.annotation."):
        return plugin_key.replace("talebook.annotation.", "talebook.annotations.", 1)
    return ""


BUILTIN_PLUGIN_KEY_MIGRATIONS = {
    legacy_key: provider.manifest["id"]
    for provider in ALL_BUILTIN_PROVIDERS
    if (legacy_key := _legacy_plugin_key(provider.manifest["id"]))
}


__all__ = [
    "ALL_BUILTIN_PROVIDERS",
    "BOOK_SOURCE_PROVIDERS",
    "BUILTIN_CAPABILITY_PROVIDERS",
    "BUILTIN_PLUGIN_KEY_MIGRATIONS",
    "EXTERNAL_CONNECTOR_PROVIDERS",
    "PUSH_PROVIDERS",
    "PUSH_PROVIDERS_BY_DEVICE",
]
