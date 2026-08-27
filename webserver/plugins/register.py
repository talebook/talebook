"""内置插件的唯一装配入口；类型包不维护第二份隐式注册表。"""

from webserver.plugins.annotation.brs import PROVIDER as BRS_PROVIDER
from webserver.plugins.combo.open_library import PROVIDER as OPEN_LIBRARY_PROVIDER
from webserver.plugins.combo.weread.provider import PROVIDER as WEREAD_PROVIDER
from webserver.plugins.meta.calibre_provider_bridge import PROVIDER as CALIBRE_PROVIDER_BRIDGE
from webserver.plugins.meta.embedded_file import PROVIDER as EMBEDDED_FILE_PROVIDER
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
META_PROVIDERS = (EMBEDDED_FILE_PROVIDER, CALIBRE_PROVIDER_BRIDGE)
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
COMBO_PROVIDERS = (WEREAD_PROVIDER, OPEN_LIBRARY_PROVIDER)
MOCK_PROVIDERS = (MOCK_MULTI_TAB_PROVIDER,)

# 每个 provider 只进入一个与目录类型一致的主分组；其余视图均从这里派生。
PROVIDER_GROUPS = {
    "mock": MOCK_PROVIDERS,
    "combo": COMBO_PROVIDERS,
    "source": SOURCE_PROVIDERS,
    "meta": META_PROVIDERS,
    "review": REVIEW_PROVIDERS,
    "annotation": ANNOTATION_PROVIDERS,
    "tool": TOOL_PROVIDERS,
    "push": PUSH_PROVIDERS,
}
ALL_BUILTIN_PROVIDERS = tuple(provider for providers in PROVIDER_GROUPS.values() for provider in providers)
PUSH_PROVIDERS_BY_DEVICE = {provider.manifest["ui"]["device_type"]: provider for provider in PUSH_PROVIDERS}


__all__ = [
    "ALL_BUILTIN_PROVIDERS",
    "PROVIDER_GROUPS",
    "PUSH_PROVIDERS",
    "PUSH_PROVIDERS_BY_DEVICE",
    "SOURCE_PROVIDERS",
    "TOOL_PROVIDERS",
]
