import os

from webserver.plugins.texttools import (
    ANALYZE_LIMIT,
    DIRECTION_LABELS,
    OpenCC,
    analyze_bytes,
    compile_rule,
    convert_epub,
    convert_txt_file,
    fix_bytes,
    replace_epub_file,
    replace_preview,
    replace_txt_file,
)

from .book_sources import OPDSProvider
from .domains import CheckReport, ToolOutput, ToolReport
from .protocol import PROTOCOL_VERSION, ProviderResult
from .legado import LegadoSourcePlugin
from .protocol import UpstreamError
from .triggers import TRIGGER_SCHEMA


def _opds_status(session, settings):
    from webserver.models import OpdsSource

    sources = session.query(OpdsSource).all()
    return {
        "configured": len(sources),
        "enabled": sum(1 for item in sources if item.active),
        "service_enabled": bool(settings.get("OPDS_ENABLED", True)),
    }


def _legado_status(session, settings):
    from webserver.models import BookSourceModel

    sources = session.query(BookSourceModel).all()
    return {"configured": len(sources), "enabled": sum(1 for item in sources if item.enabled)}


class BuiltinCapabilityProvider:
    """Expose a Talebook-owned capability through the plugin catalog.

    The provider owns no duplicate configuration. Its management action points
    to the capability's native UI while the shared plugin runtime supplies
    health checks and durable run history.
    """

    def __init__(self, manifest, enabled_setting=None, status_fn=None):
        self.manifest = manifest
        # 首次安装时是否启用：默认启用；给定设置名时跟随该设置。
        self.enabled_setting = enabled_setting
        # 自报配置状态（已配置多少来源、启用多少），供管理页展示。
        self.status_fn = status_fn

    def status(self, session, settings):
        return self.status_fn(session, settings) if self.status_fn else {}

    def initial_enabled(self, settings):
        if self.enabled_setting is None:
            return True
        return bool(settings.get(self.enabled_setting, False))

    def self_check(self, context):
        return CheckReport(healthy=True, message=self.manifest["ui"]["healthy_message"])


class GenericOPDSSourcePlugin(OPDSProvider):
    """把 OpdsSource 事实表绑定到标准 SourceProvider。"""

    def __init__(self, manifest, status_fn):
        super().__init__(manifest["id"], manifest["name"], manifest["description"], manifest["homepage"])
        self.manifest = {**manifest, "download_mode": "single_book"}
        self.status_fn = status_fn

    def status(self, session, settings):
        return self.status_fn(session, settings)

    @staticmethod
    def initial_enabled(settings):
        return True

    def execute(self, context):
        if not (context.get("config") or {}).get("endpoint"):
            return ProviderResult(health_message=self.manifest["ui"]["healthy_message"])
        return super().execute(context)

    def self_check(self, context):
        if not (context.get("config") or {}).get("endpoint"):
            return CheckReport(healthy=True, message=self.manifest["ui"]["healthy_message"])
        return super().self_check(context)


class TextTransformPlugin(BuiltinCapabilityProvider):
    """正文工具共享契约；具体子类必须实现真实 preview/apply。"""

    def __init__(self, manifest, supported_formats, supports_auto_trigger=False):
        super().__init__(manifest)
        self.supported_formats = frozenset(supported_formats)
        self.supports_auto_trigger = supports_auto_trigger

    def preview(self, src, context):
        raise NotImplementedError

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        raise NotImplementedError

    @staticmethod
    def _path(src, formats=None):
        path = str(src.get("path") or "")
        fmt = str(src.get("format") or "").upper()
        if not path or not os.path.isfile(path):
            raise UpstreamError("Transform input file is missing")
        if formats and fmt not in formats:
            raise UpstreamError("Transform input format is not supported")
        return path, fmt


class TextReplaceTransformPlugin(TextTransformPlugin):
    def preview(self, src, context):
        path, fmt = self._path(src, self.supported_formats)
        return ToolReport.from_dict(
            replace_preview(
                fmt,
                path,
                str(src.get("pattern") or ""),
                str(src.get("replacement") or ""),
                bool(src.get("use_regex")),
            )
        )

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        path, fmt = self._path(src, self.supported_formats)
        apply_fn, error = compile_rule(
            str(src.get("pattern") or ""),
            str(src.get("replacement") or ""),
            bool(src.get("use_regex")),
        )
        if apply_fn is None:
            raise UpstreamError(error)
        out_path = os.path.join(out_dir, "replaced.%s" % fmt.lower())
        transform = replace_txt_file if fmt == "TXT" else replace_epub_file
        matches = transform(path, out_path, apply_fn)
        return ToolOutput.from_dict({"path": out_path, "format": fmt, "matches": matches})


ZH_DIRECTIONS = frozenset({"t2s", "tw2s", "tw2sp", "s2t", "s2tw", "s2twp", "t2tw", "tw2t"})
ZH_DIRECTION_LANG = {
    "t2s": "zh",
    "tw2s": "zh",
    "tw2sp": "zh",
    "s2t": "zht",
    "s2tw": "zht",
    "s2twp": "zht",
    "t2tw": "zht",
    "tw2t": "zht",
}
A5_PHRASES_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "texttools", "a5_phrases.txt")


class ZhConverterTransformPlugin(TextTransformPlugin):
    def _engine(self, src):
        direction = str(src.get("direction") or "")
        if direction not in ZH_DIRECTIONS:
            raise UpstreamError("Unsupported Chinese conversion direction")
        extra = [A5_PHRASES_FILE] if bool(src.get("use_a5")) and direction in {"t2s", "tw2s"} else []
        return direction, OpenCC(direction, extra_dicts=extra)

    def preview(self, src, context):
        direction, _engine = self._engine(src)
        return ToolReport.from_dict({"direction": direction, "direction_label": DIRECTION_LABELS.get(direction, direction)})

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        path, fmt = self._path(src, self.supported_formats)
        direction, engine = self._engine(src)
        out_path = os.path.join(out_dir, "converted.%s" % fmt.lower())
        convert_title = bool(src.get("convert_title"))
        if fmt == "EPUB":
            convert_epub(path, out_path, engine.convert, convert_metadata=convert_title)
            source_encoding = ""
        else:
            source_encoding = convert_txt_file(path, out_path, engine.convert)
        result = {
            "path": out_path,
            "format": fmt,
            "direction": direction,
            "direction_label": DIRECTION_LABELS.get(direction, direction),
            "language": ZH_DIRECTION_LANG[direction],
            "source_encoding": source_encoding,
        }
        if convert_title:
            result["converted_title"] = engine.convert(str(src.get("title") or ""))
            result["converted_authors"] = [engine.convert(str(value)) for value in src.get("authors") or []]
        return ToolOutput.from_dict(result)


class TxtFixerTransformPlugin(TextTransformPlugin):
    """TXT 编码修复的 typed provider；平台只负责编排书籍文件。"""

    def preview(self, src, context):
        content = src.get("content")
        if content is None and src.get("path"):
            with open(src["path"], "rb") as handle:
                content = handle.read(ANALYZE_LIMIT)
        if not isinstance(content, bytes):
            raise UpstreamError("TXT fixer requires byte content")
        return ToolReport.from_dict(analyze_bytes(content))

    def apply(self, src, out_dir, context):
        if not out_dir:
            raise UpstreamError("Transform output directory is required")
        content = src.get("content")
        if content is None and src.get("path"):
            with open(src["path"], "rb") as handle:
                content = handle.read()
        if not isinstance(content, bytes):
            raise UpstreamError("TXT fixer requires byte content")
        text, report = fix_bytes(content)
        if report.get("unrecoverable") or (report.get("garbage") and not report.get("mojibake")):
            raise UpstreamError("TXT content cannot be repaired safely")
        out_path = os.path.join(out_dir, "fixed.txt")
        with open(out_path, "wb") as handle:
            handle.write(text.encode("utf-8"))
        return ToolOutput.from_dict(
            {
                "path": out_path,
                "format": "TXT",
                "encoding": report.get("encoding"),
                "mojibake": report.get("mojibake", False),
                "report": report,
            }
        )


def _manifest(plugin_id, name, description, categories, capabilities, permissions, ui, config_schema=None):
    return {
        "protocol_version": PROTOCOL_VERSION,
        "id": plugin_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "categories": categories,
        "capabilities": capabilities,
        "runtime_kind": "builtin",
        "actions": ["test"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": config_schema or {"type": "object", "properties": {}},
        "permissions": permissions,
        "data_policy": {"stores_full_text": False, "retention": "source_owned"},
        "compatibility": {"talebook": ">=0.1.0"},
        # Talebook 自有能力由管理员在实例级配置，不存在每用户连接。
        "connection_owners": ["instance"],
        "homepage": "https://github.com/talebook/talebook",
        "license": "GPL-3.0",
        "ui": ui,
    }


BUILTIN_CAPABILITY_PROVIDERS = (
    GenericOPDSSourcePlugin(
        _manifest(
            "talebook.book-source.opds",
            "Generic OPDS",
            "管理已保存的 OPDS 1/2 目录，并浏览、搜索与批量导入。",
            ["book_sources"],
            ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
            ["books.read", "books.write", "network.read"],
            {
                "icon": "mdi-rss-box",
                "service_toggle": "opds",
                "manage_dialog": "opds",
                "manage_label_key": "pluginManagement.browse",
                "primary_action": "browse",
                "healthy_message": "Generic OPDS 适配器可用",
            },
        ),
        _opds_status,
    ),
    LegadoSourcePlugin(
        {
            **_manifest(
                "talebook.book-source.legado",
                "Legado 在线书源",
                "管理、导入、搜索、阅读与体检兼容 Legado 的在线书源。",
                ["book_sources"],
                ["book_sources.browse", "book_sources.search", "book_sources.acquire"],
                ["books.read", "books.write", "network.read"],
                {
                    "icon": "mdi-book-cog-outline",
                    "manage_dialog": "legado",
                    "manage_label_key": "pluginManagement.manage",
                    "primary_action": "manage",
                    "healthy_message": "Legado 书源适配器可用",
                },
            ),
            "download_mode": "by_chapters",
        },
        _legado_status,
    ),
    TextReplaceTransformPlugin(
        _manifest(
            "talebook.tool.text-replace",
            "正文查找替换",
            "对书籍的 EPUB / TXT 正文执行查找替换（支持正则），可写回原书或另存为新书。",
            ["integrations"],
            ["integrations.tool"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-find-replace",
                "manage_route": "/plugins/text-replace",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "正文查找替换工具可用",
            },
        ),
        {"EPUB", "TXT"},
    ),
    ZhConverterTransformPlugin(
        _manifest(
            "talebook.tool.zh-converter",
            "繁简转换",
            "对书库书籍执行简体↔繁体中文转换（EPUB/TXT，8 种方向，可选增强词表）。",
            ["integrations"],
            ["integrations.tool"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-translate",
                "manage_route": "/plugins/zh-converter",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "繁简转换工具可用",
            },
        ),
        {"EPUB", "TXT"},
    ),
    TxtFixerTransformPlugin(
        _manifest(
            "talebook.tool.txt-fixer",
            "TXT编码修复",
            "检测 TXT 电子书编码（含乱码反转恢复），修复为 UTF-8 后写回或另存为新书。",
            ["integrations"],
            ["integrations.tool"],
            ["books.read", "books.write"],
            {
                "icon": "mdi-file-restore-outline",
                "manage_route": "/plugins/txt-fixer",
                "manage_label_key": "pluginManagement.openTool",
                "primary_action": "open",
                "healthy_message": "TXT 编码修复工具可用",
                "supports_auto_trigger": True,
            },
            # 编码错误是客观事实、可自动判定，因此允许配置为新书入库后自动处理。
            # 查找替换与繁简转换依赖用户意图，不提供该选项。
            config_schema={"type": "object", "properties": {"trigger": dict(TRIGGER_SCHEMA)}},
        ),
        {"TXT"},
        supports_auto_trigger=True,
    ),
)
