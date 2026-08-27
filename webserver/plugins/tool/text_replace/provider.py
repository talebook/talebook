import os

from webserver.plugins.runtime.domains import ToolOutput, ToolReport
from webserver.plugins.runtime.protocol import UpstreamError
from .transform import (
    compile_rule,
    preview as replace_preview,
    replace_epub_file,
    replace_txt_file,
)

from ..base import TextTransformPlugin, _manifest


class TextReplaceTransformPlugin(TextTransformPlugin):
    def __init__(self):
        super().__init__(
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
        )

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


PROVIDER = TextReplaceTransformPlugin()
