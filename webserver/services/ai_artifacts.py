"""Directory-backed storage for creator-private AI artifacts."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import tempfile
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Dict, Optional


DEFAULT_AI_ARTIFACT_ROOT = "/data/books/ai"
DEFAULT_WORKSPACE_SECRET = "cookie_secret"
SAFE_SEGMENT_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$")


class AIArtifactError(RuntimeError):
    """Raised when an artifact path or its content cannot be trusted."""


@dataclass(frozen=True)
class ArtifactRef:
    relative_path: str
    sha256: str
    status: str = "ready"

    def to_dict(self) -> Dict[str, str]:
        return {
            "artifact_path": self.relative_path,
            "artifact_sha256": self.sha256,
            "artifact_status": self.status,
        }


@dataclass(frozen=True)
class ArtifactWrite:
    ref: ArtifactRef
    previous: Optional[bytes]


def workspace_id(owner_id: int, secret: str = DEFAULT_WORKSPACE_SECRET) -> str:
    """Return a stable opaque directory name without user-facing identifiers."""

    try:
        value = int(owner_id)
    except (TypeError, ValueError) as exc:
        raise AIArtifactError("invalid artifact owner") from exc
    if value <= 0:
        raise AIArtifactError("invalid artifact owner")
    key = str(secret or DEFAULT_WORKSPACE_SECRET).encode("utf-8")
    return hmac.new(key, f"reader:{value}".encode("utf-8"), hashlib.sha256).hexdigest()[:32]


class AIArtifactStore:
    """Store current AI artifacts below books/ai using safe relative paths."""

    def __init__(self, root: str, feature: str, workspace_secret: str = DEFAULT_WORKSPACE_SECRET):
        if not SAFE_SEGMENT_RE.fullmatch(feature or ""):
            raise AIArtifactError("invalid artifact feature")
        self.root = Path(root or DEFAULT_AI_ARTIFACT_ROOT).expanduser().resolve()
        self.feature = feature
        self.workspace_secret = str(workspace_secret or DEFAULT_WORKSPACE_SECRET)

    @classmethod
    def from_config(cls, config: Dict[str, Any], feature: str) -> "AIArtifactStore":
        return cls(
            str(config.get("AI_ARTIFACT_ROOT") or DEFAULT_AI_ARTIFACT_ROOT),
            feature,
            str(config.get("AI_ARTIFACT_WORKSPACE_SECRET") or config.get("cookie_secret") or DEFAULT_WORKSPACE_SECRET),
        )

    def manifest_path(self, owner_id: int, artifact_id: str, preview: bool = False) -> str:
        if not SAFE_SEGMENT_RE.fullmatch(str(artifact_id or "")):
            raise AIArtifactError("invalid artifact id")
        parts = [workspace_id(owner_id, self.workspace_secret), self.feature]
        if preview:
            parts.append("previews")
        parts.extend([str(artifact_id), "manifest.json"])
        return PurePosixPath(*parts).as_posix()

    def replace_json(
        self,
        owner_id: int,
        artifact_id: str,
        payload: Dict[str, Any],
        preview: bool = False,
    ) -> ArtifactWrite:
        if not isinstance(payload, dict):
            raise AIArtifactError("artifact payload must be an object")
        relative_path = self.manifest_path(owner_id, artifact_id, preview=preview)
        target = self._resolve(owner_id, relative_path)
        previous = target.read_bytes() if target.is_file() else None
        content = (json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
        self._atomic_write(target, content)
        return ArtifactWrite(
            ref=ArtifactRef(relative_path=relative_path, sha256=hashlib.sha256(content).hexdigest()),
            previous=previous,
        )

    def restore(self, owner_id: int, write: ArtifactWrite) -> None:
        target = self._resolve(owner_id, write.ref.relative_path)
        if write.previous is None:
            self.delete(owner_id, write.ref.relative_path)
            return
        self._atomic_write(target, write.previous)

    def read_json(self, owner_id: int, relative_path: str, expected_sha256: str) -> Dict[str, Any]:
        target = self._resolve(owner_id, relative_path)
        try:
            content = target.read_bytes()
        except OSError as exc:
            raise AIArtifactError("artifact is unavailable") from exc
        actual_sha256 = hashlib.sha256(content).hexdigest()
        if not expected_sha256 or actual_sha256 != expected_sha256:
            raise AIArtifactError("artifact integrity check failed")
        try:
            payload = json.loads(content.decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as exc:
            raise AIArtifactError("artifact content is invalid") from exc
        if not isinstance(payload, dict):
            raise AIArtifactError("artifact content is invalid")
        return payload

    def delete(self, owner_id: int, relative_path: str) -> None:
        target = self._resolve(owner_id, relative_path)
        try:
            target.unlink()
        except FileNotFoundError:
            return
        except OSError as exc:
            raise AIArtifactError("artifact cleanup failed") from exc

        feature_root = self.root / workspace_id(owner_id, self.workspace_secret) / self.feature
        parent = target.parent
        while parent != feature_root and feature_root in parent.parents:
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent

    def _resolve(self, owner_id: int, relative_path: str) -> Path:
        path = PurePosixPath(str(relative_path or ""))
        parts = path.parts
        expected_prefix = (workspace_id(owner_id, self.workspace_secret), self.feature)
        if path.is_absolute() or len(parts) < 4 or tuple(parts[:2]) != expected_prefix:
            raise AIArtifactError("artifact path is outside the owner workspace")
        if any(part in {"", ".", ".."} or not SAFE_SEGMENT_RE.fullmatch(part) for part in parts[:-1]):
            raise AIArtifactError("artifact path is invalid")
        if parts[-1] != "manifest.json":
            raise AIArtifactError("artifact path is invalid")
        target = self.root.joinpath(*parts).resolve()
        try:
            target.relative_to(self.root)
        except ValueError as exc:
            raise AIArtifactError("artifact path is outside the storage root") from exc
        return target

    @staticmethod
    def _atomic_write(target: Path, content: bytes) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        descriptor, temporary = tempfile.mkstemp(prefix=".manifest-", suffix=".tmp", dir=str(target.parent))
        try:
            with os.fdopen(descriptor, "wb") as stream:
                os.fchmod(stream.fileno(), 0o600)
                stream.write(content)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, target)
            try:
                directory_fd = os.open(str(target.parent), os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            except OSError:
                pass
        except Exception:
            try:
                os.unlink(temporary)
            except FileNotFoundError:
                pass
            raise
