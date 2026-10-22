import os

from webserver.plugins.runtime.domains import ToolOutput, ToolReport
from webserver.plugins.runtime.protocol import UpstreamError
from ..base import TextTransformPlugin, _manifest
from .engine import DIRECTION_LABELS, OpenCC
from .transform import convert_epub, convert_txt_file


ZH_DIRECTION_ORDER = ("t2s", "tw2s", "tw2sp", "s2t", "s2tw", "s2twp", "t2tw", "tw2t")
ZH_DIRECTIONS = frozenset(ZH_DIRECTION_ORDER)
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
# 另存为新书时的标题后缀
ZH_NEW_BOOK_SUFFIX = {"zh": "（简体版）", "zht": "（繁體版）"}
A5_PHRASES_FILE = os.path.join(os.path.dirname(__file__), "a5_phrases.txt")


class ZhConverterTransformPlugin(TextTransformPlugin):
    def __init__(self):
        super().__init__(
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
                    "primary_action": "open",
                    "healthy_message": "繁简转换工具可用",
                },
            ),
            {"EPUB", "TXT"},
            # 优先处理 EPUB（保留目录结构），无 EPUB 时退回 TXT
            input_formats=("EPUB", "TXT"),
        )

    def describe(self):
        return {"directions": [{"value": key, "label": DIRECTION_LABELS.get(key, key)} for key in ZH_DIRECTION_ORDER]}

    def tool_input(self, params, book):
        return {
            "direction": str(params.get("direction") or ""),
            "use_a5": bool(params.get("use_a5")),
            "convert_title": bool(params.get("convert_title")),
            "title": book.get("title") or "Unknown",
            "authors": [str(author) for author in (book.get("authors") or [])],
        }

    def audit_fields(self, tool_input):
        return {"direction": tool_input.get("direction", "")}

    def book_updates(self, output):
        """覆盖时同步库内标题/作者/语言（不加后缀），另存新书时作为新书元数据。"""
        updates = {"language": output["language"]}
        if output.get("converted_title"):
            updates["title"] = output["converted_title"]
        if output.get("converted_authors"):
            updates["authors"] = list(output["converted_authors"])
        return updates

    def new_book_title_suffix(self, output):
        return ZH_NEW_BOOK_SUFFIX.get(output.get("language"), "")

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


PROVIDER = ZhConverterTransformPlugin()
