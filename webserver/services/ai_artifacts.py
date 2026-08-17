"""Private, atomic filesystem storage shared by AI feature artifacts."""

from __future__ import annotations

import os
import re
import shutil
import tempfile
import threading
import uuid
from pathlib import Path, PurePosixPath
from typing import Dict, Mapping


FEATURE_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
ARTIFACT_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
_STORE_LOCK = threading.RLock()


class AIArtifactError(RuntimeError):
    """Raised when a private AI artifact cannot be safely persisted."""


class AIArtifactStore:
    """Store generated files below ``<root>/<feature>/<owner>/<artifact>/vN``."""

    def __init__(self, root: str):
        value = str(root or "").strip()
        if not value:
            raise AIArtifactError("AI 产物根目录未配置")
        self.root = Path(value).expanduser().resolve()

    def version_path(self, feature: str, owner_id: int, artifact_id: str, version: int) -> Path:
        if not FEATURE_PATTERN.fullmatch(str(feature)):
            raise AIArtifactError("AI feature 名称无效")
        try:
            owner = str(int(owner_id))
            version_number = int(version)
        except (TypeError, ValueError) as exc:
            raise AIArtifactError("AI 产物坐标无效") from exc
        if int(owner) <= 0 or version_number <= 0:
            raise AIArtifactError("AI 产物坐标无效")
        artifact = str(artifact_id)
        if not ARTIFACT_PATTERN.fullmatch(artifact) or artifact in {".", ".."}:
            raise AIArtifactError("AI 产物标识无效")
        return self.root / str(feature) / owner / artifact / f"v{version_number}"

    def relative_path(self, path: Path) -> str:
        try:
            return path.resolve().relative_to(self.root).as_posix()
        except ValueError as exc:
            raise AIArtifactError("AI 产物路径越界") from exc

    def materialize(
        self,
        feature: str,
        owner_id: int,
        artifact_id: str,
        version: int,
        files: Mapping[str, bytes],
    ) -> Path:
        checked = self._validate_files(files)
        final_path = self.version_path(feature, owner_id, artifact_id, version)
        artifact_path = final_path.parent
        with _STORE_LOCK:
            try:
                self._ensure_private_directory(artifact_path)
                if final_path.is_dir() and self._matches(final_path, checked):
                    return final_path
                staging = Path(tempfile.mkdtemp(prefix=f".{final_path.name}-", dir=artifact_path))
                staging.chmod(0o700)
                backup = artifact_path / f".{final_path.name}-backup-{uuid.uuid4().hex}"
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

    def delete_artifact(self, feature: str, owner_id: int, artifact_id: str) -> None:
        version_path = self.version_path(feature, owner_id, artifact_id, 1)
        artifact_path = version_path.parent
        owner_path = artifact_path.parent
        with _STORE_LOCK:
            try:
                if artifact_path.exists():
                    self._remove_path(artifact_path)
                if owner_path.is_dir() and not any(owner_path.iterdir()):
                    owner_path.rmdir()
            except OSError as exc:
                raise AIArtifactError("AI 产物删除失败") from exc

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
        actual = {path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()}
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
