import hashlib
from pathlib import Path

from webserver.plugins.runtime.protocol import UpstreamError

from .base import COMMON_CONFIG_PROPERTIES, SourceBase, _manifest


class WatchFolderProvider(SourceBase):
    source_name = "Watch Folder"
    manifest = _manifest(
        "talebook.source.watch-folder",
        source_name,
        "扫描白名单内的本地目录，以内容 hash 增量发现待审电子书。",
        ["sources.browse", "sources.acquire"],
        {
            "type": "object",
            "properties": {
                **COMMON_CONFIG_PROPERTIES,
                "path": {"type": "string", "title": "监听目录"},
                "recursive": {"type": "boolean", "default": True},
            },
            "required": ["path"],
        },
        homepage="https://github.com/talebook/talebook",
        runtime_kind="file",
        network_read=False,
    )

    def discover(self, context):
        config = context.get("config") or {}
        platform = context.get("platform") or {}
        target = self._allowed_path(config.get("path"), platform.get("import_allowed_roots") or [])
        pattern = "**/*" if config.get("recursive", True) else "*"
        old = (context.get("cursor") or {}).get("files", {})
        files = {}
        entries = []
        for path in sorted(target.glob(pattern)):
            if not path.is_file():
                continue
            resolved = path.resolve(strict=True)
            self._allowed_path(resolved, platform.get("import_allowed_roots") or [])
            fmt = resolved.suffix.lower().lstrip(".")
            if fmt not in self._formats(context):
                continue
            stat = resolved.stat()
            signature = "%d:%d" % (stat.st_mtime_ns, stat.st_size)
            files[str(resolved)] = signature
            if old.get(str(resolved)) == signature:
                continue
            digest = self._hash_file(resolved)
            entries.append(
                self._normalize(
                    context,
                    identity=str(resolved),
                    title=resolved.stem,
                    format_name=fmt,
                    source_url=str(target),
                    acquisition_url=resolved.as_uri(),
                    access="download",
                    license_name="本地文件；许可由管理员确认",
                    content_hash=digest,
                    updated_at=str(stat.st_mtime_ns),
                )
            )
        return entries, {"files": files}

    @staticmethod
    def _allowed_path(value, roots):
        if not value:
            raise UpstreamError("Watch Folder path is required")
        path = Path(value).expanduser().resolve(strict=True)
        allowed = []
        for root in roots:
            try:
                allowed.append(Path(root).expanduser().resolve(strict=True))
            except OSError:
                continue
        if not any(path == root or root in path.parents for root in allowed):
            raise UpstreamError("Watch Folder path is outside the configured allowlist")
        return path

    @staticmethod
    def _hash_file(path):
        digest = hashlib.sha256()
        with path.open("rb") as stream:
            for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()


PROVIDER = WatchFolderProvider()
