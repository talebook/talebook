import os

from webserver.plugins.runtime.domains import ToolOutput, ToolReport
from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.runtime.triggers import TRIGGER_SCHEMA
from ..base import TextTransformPlugin, _manifest
from .transform import ANALYZE_LIMIT, analyze_bytes, fix_bytes


class TxtFixerTransformPlugin(TextTransformPlugin):
    def __init__(self):
        super().__init__(
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
                    "primary_action": "open",
                    "healthy_message": "TXT 编码修复工具可用",
                    "supports_auto_trigger": True,
                },
                config_schema={"type": "object", "properties": {"trigger": dict(TRIGGER_SCHEMA)}},
            ),
            {"TXT"},
            supports_auto_trigger=True,
        )

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


PROVIDER = TxtFixerTransformPlugin()
