"""Private, atomic filesystem storage shared by AI feature artifacts."""

from __future__ import annotations

import hashlib
import os
import re
import shutil
import tempfile
import threading
import uuid
from pathlib import Path, PurePosixPath
from typing import Dict, Mapping


WORKSPACE_PATTERN = re.compile(r"^[a-f0-9]{24}$")
FEATURE_PATTERN = re.compile(r"^[a-z][a-z0-9-]{0,63}$")
ARTIFACT_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
_STORE_LOCK = threading.RLock()


class AIArtifactError(RuntimeError):
    """Raised when a private AI artifact cannot be safely persisted."""


def workspace_key(owner_id: int) -> str:
    """Return a stable opaque workspace segment without exposing account fields."""
    try:
        owner = int(owner_id)
    except (TypeError, ValueError) as exc:
        raise AIArtifactError("AI 工作空间标识无效") from exc
    if owner <= 0:
        raise AIArtifactError("AI 工作空间标识无效")
    return hashlib.sha256(f"talebook-ai-workspace:{owner}".encode("utf-8")).hexdigest()[:24]


class AIArtifactStore:
    """Store one current artifact below ``<root>/<workspace>/<feature>/<artifact>``."""

    def __init__(self, root: str):
        value = str(root or "").strip()
        if not value:
            raise AIArtifactError("AI 产物根目录未配置")
        self.root = Path(value).expanduser().resolve()

    def artifact_path(self, workspace: str, feature: str, artifact_id: str) -> Path:
        if not WORKSPACE_PATTERN.fullmatch(str(workspace)):
            raise AIArtifactError("AI 工作空间标识无效")
        if not FEATURE_PATTERN.fullmatch(str(feature)):
            raise AIArtifactError("AI feature 名称无效")
        artifact = str(artifact_id)
        if not ARTIFACT_PATTERN.fullmatch(artifact) or artifact in {".", ".."}:
            raise AIArtifactError("AI 产物标识无效")
        return self.root / str(workspace) / str(feature) / artifact

    def relative_path(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError as exc:
            raise AIArtifactError("AI 产物路径越界") from exc

    def materialize(
        self,
        workspace: str,
        feature: str,
        artifact_id: str,
        files: Mapping[str, bytes],
    ) -> Path:
        """Atomically replace the complete current artifact directory."""
        checked = self._validate_files(files)
        final_path = self.artifact_path(workspace, feature, artifact_id)
        feature_path = final_path.parent
        with _STORE_LOCK:
            try:
                self._ensure_private_directory(feature_path)
                if final_path.is_dir() and self._matches(final_path, checked):
                    return final_path
                staging = Path(tempfile.mkdtemp(prefix=f".{final_path.name}-", dir=feature_path))
                staging.chmod(0o700)
                backup = feature_path / f".{final_path.name}-backup-{uuid.uuid4().hex}"
                try:
                    for relative, content in checked.items():
                        target = staging.joinpath(*relative.parts)
                        self._ensure_private_children(staging, relative.parent)
                        target.write_bytes(content)
                        target.chmod(0o600)
                    if final_path.exists():
                        os.replace(final_path, backup)
                    try:
                        os.replace(staging, final_path)
                    except Exception:
                        if backup.exists() and not final_path.exists():
                            os.replace(backup, final_path)
                        raise
                    if backup.exists():
                        self._remove_path(backup)
                    return final_path
                finally:
                    if staging.exists():
                        self._remove_path(staging)
                    if backup.exists() and final_path.exists():
                        self._remove_path(backup)
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("AI 产物写入失败") from exc

    def read(self, workspace: str, feature: str, artifact_id: str) -> Dict[str, bytes]:
        """Read an artifact only when every path is a regular private file."""
        root = self.artifact_path(workspace, feature, artifact_id)
        with _STORE_LOCK:
            self._reject_symlink_components(root)
            if root.is_symlink() or not root.is_dir():
                raise AIArtifactError("AI 产物目录不存在或无效")
            files: Dict[str, bytes] = {}
            try:
                for path in root.rglob("*"):
                    if path.is_symlink():
                        raise AIArtifactError("AI 产物不能包含符号链接")
                    if path.is_dir():
                        continue
                    if not path.is_file():
                        raise AIArtifactError("AI 产物文件无效")
                    relative = path.relative_to(root).as_posix()
                    files[relative] = path.read_bytes()
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("AI 产物读取失败") from exc
            if not files:
                raise AIArtifactError("AI 产物目录为空")
            return files

    def delete_artifact(self, workspace: str, feature: str, artifact_id: str) -> None:
        artifact_path = self.artifact_path(workspace, feature, artifact_id)
        feature_path = artifact_path.parent
        workspace_path = feature_path.parent
        with _STORE_LOCK:
            try:
                self._reject_symlink_components(feature_path)
                if artifact_path.exists() or artifact_path.is_symlink():
                    self._remove_path(artifact_path)
                for parent in (feature_path, workspace_path):
                    if parent.is_dir() and not any(parent.iterdir()):
                        parent.rmdir()
            except OSError as exc:
                raise AIArtifactError("AI 产物删除失败") from exc

    def _reject_symlink_components(self, path: Path) -> None:
        """Reject filesystem redirection anywhere below the configured root."""
        try:
            relative = path.relative_to(self.root)
        except ValueError as exc:
            raise AIArtifactError("AI 产物路径越界") from exc
        current = self.root
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise AIArtifactError("AI 产物目录不能是符号链接")

    def _ensure_private_directory(self, path: Path) -> None:
        try:
            relative = path.relative_to(self.root)
        except ValueError as exc:
            raise AIArtifactError("AI 产物路径越界") from exc
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)
        if self.root.is_symlink() or not self.root.is_dir():
            raise AIArtifactError("AI 产物目录无效")
        self.root.chmod(0o700)
        self._ensure_private_children(self.root, PurePosixPath(*relative.parts))

    @staticmethod
    def _ensure_private_children(base: Path, relative: PurePosixPath) -> None:
        current = base
        for part in relative.parts:
            current = current / part
            if current.is_symlink():
                raise AIArtifactError("AI 产物目录不能是符号链接")
            current.mkdir(mode=0o700, exist_ok=True)
            if not current.is_dir():
                raise AIArtifactError("AI 产物目录无效")
            current.chmod(0o700)

    @staticmethod
    def _validate_files(files: Mapping[str, bytes]) -> Dict[PurePosixPath, bytes]:
        if not files:
            raise AIArtifactError("AI 产物不能为空")
        checked: Dict[PurePosixPath, bytes] = {}
        for raw_path, content in files.items():
            relative = PurePosixPath(str(raw_path))
            if relative.is_absolute() or not relative.parts or any(part in {"", ".", ".."} for part in relative.parts):
                raise AIArtifactError("AI 产物文件路径无效")
            if not isinstance(content, bytes):
                raise AIArtifactError("AI 产物文件内容无效")
            checked[relative] = content
        return checked

    @staticmethod
    def _matches(root: Path, expected: Mapping[PurePosixPath, bytes]) -> bool:
        if root.is_symlink():
            return False
        paths = list(root.rglob("*"))
        if any(path.is_symlink() for path in paths):
            return False
        actual = {path.relative_to(root).as_posix() for path in paths if path.is_file()}
        if actual != {path.as_posix() for path in expected}:
            return False
        try:
            return all(root.joinpath(*path.parts).read_bytes() == content for path, content in expected.items())
        except OSError:
            return False

    @staticmethod
    def _remove_path(path: Path) -> None:
        if path.is_symlink() or path.is_file():
            path.unlink()
        elif path.exists():
            shutil.rmtree(path)
