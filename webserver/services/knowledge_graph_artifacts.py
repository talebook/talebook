"""Directory-backed storage for creator-private AI artifacts."""

from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import tempfile
import uuid
from pathlib import Path
from typing import Any, Dict, Iterable

from webserver.models import Reader


DEFAULT_ARTIFACT_ROOT = "/data/books/ai"
WORKSPACE_EXTRA_KEY = "ai_workspace_id"
WORKSPACE_RE = re.compile(r"^[0-9a-f]{32}$")
COMPONENT_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
TASK_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f-]{27}$")


class AIArtifactError(RuntimeError):
    """An artifact path, payload, or storage operation is unsafe or invalid."""


def ensure_workspace_id(session, owner_id: int) -> str:
    """Return the user's stable opaque AI workspace, creating it transactionally."""
    reader = session.get(Reader, int(owner_id))
    if reader is None:
        raise AIArtifactError("AI 产物所属用户不存在")
    extra = dict(reader.extra or {})
    workspace = str(extra.get(WORKSPACE_EXTRA_KEY, ""))
    if WORKSPACE_RE.fullmatch(workspace):
        return workspace
    # Deterministic generation prevents two first-use requests from assigning
    # different workspaces before either transaction commits.  The value is an
    # opaque directory key, not an authorization token; ACLs remain database-backed.
    workspace = uuid.uuid5(
        uuid.NAMESPACE_URL,
        f"talebook-ai-workspace:{reader.id}:{reader.create_time or ''}",
    ).hex
    extra[WORKSPACE_EXTRA_KEY] = workspace
    reader.extra = extra
    return workspace


def workspace_id_from_reader(reader: Reader) -> str:
    workspace = str((reader.extra or {}).get(WORKSPACE_EXTRA_KEY, ""))
    return workspace if WORKSPACE_RE.fullmatch(workspace) else ""


class AIArtifactStorage:
    """Write and read JSON artifacts beneath one non-public persistent root."""

    def __init__(self, config: Dict[str, Any]):
        configured = str(config.get("AI_ARTIFACT_ROOT", "") or DEFAULT_ARTIFACT_ROOT)
        root = Path(configured).expanduser()
        if not root.is_absolute():
            raise AIArtifactError("AI 产物根目录必须是绝对路径")
        self.root = root
        self.max_bytes = int(config.get("AI_ARTIFACT_MAX_BYTES", 128 * 1024 * 1024))

    @staticmethod
    def _validate_identity(workspace: str, feature: str, task_id: str) -> None:
        if not WORKSPACE_RE.fullmatch(str(workspace)):
            raise AIArtifactError("AI workspace 标识无效")
        if not COMPONENT_RE.fullmatch(str(feature)):
            raise AIArtifactError("AI feature 标识无效")
        if not TASK_RE.fullmatch(str(task_id)):
            raise AIArtifactError("AI task 标识无效")

    def _root_resolved(self) -> Path:
        self.root.mkdir(parents=True, exist_ok=True, mode=0o700)
        return self.root.resolve(strict=True)

    def _task_dir(self, workspace: str, feature: str, task_id: str, create: bool = False) -> Path:
        self._validate_identity(workspace, feature, task_id)
        root = self._root_resolved()
        path = self.root / workspace / feature / task_id
        if create:
            path.mkdir(parents=True, exist_ok=True, mode=0o700)
        resolved = path.resolve(strict=False)
        if resolved.parent.parent.parent != root:
            raise AIArtifactError("AI 产物路径越界")
        return path

    def _metadata_path(
        self,
        metadata: Dict[str, Any],
        workspace: str,
        feature: str,
        task_id: str,
        allowed_names: Iterable[str],
    ) -> Path:
        self._validate_identity(workspace, feature, task_id)
        if not isinstance(metadata, dict):
            raise AIArtifactError("AI 产物索引缺失")
        relative = metadata.get("relative_path")
        digest = metadata.get("sha256")
        if not isinstance(relative, str) or not isinstance(digest, str) or len(digest) != 64:
            raise AIArtifactError("AI 产物索引无效")
        relative_path = Path(relative)
        if relative_path.is_absolute() or len(relative_path.parts) != 4:
            raise AIArtifactError("AI 产物相对路径无效")
        expected_prefix = (workspace, feature, task_id)
        if relative_path.parts[:3] != expected_prefix or relative_path.name not in set(allowed_names):
            raise AIArtifactError("AI 产物索引与任务不匹配")
        path = self.root / relative_path
        root = self._root_resolved()
        if path.resolve(strict=False).parent.parent.parent.parent != root:
            raise AIArtifactError("AI 产物路径越界")
        return path

    def write_json(
        self,
        workspace: str,
        feature: str,
        task_id: str,
        filename: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        if filename not in {"checkpoint.json", "graph.json"} or not isinstance(payload, dict):
            raise AIArtifactError("AI 产物文件或内容无效")
        directory = self._task_dir(workspace, feature, task_id, create=True)
        encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        if len(encoded) > self.max_bytes:
            raise AIArtifactError("AI 产物超过大小限制")
        target = directory / filename
        temporary = None
        try:
            descriptor, temporary = tempfile.mkstemp(prefix=f".{filename}.", dir=str(directory))
            os.fchmod(descriptor, 0o600)
            with os.fdopen(descriptor, "wb") as stream:
                stream.write(encoded)
                stream.flush()
                os.fsync(stream.fileno())
            checked = Path(temporary).read_bytes()
            if checked != encoded or not isinstance(json.loads(checked.decode("utf-8")), dict):
                raise AIArtifactError("AI 产物暂存校验失败")
            os.replace(temporary, target)
            temporary = None
            directory_fd = os.open(directory, os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
        except (OSError, UnicodeError, ValueError, TypeError) as exc:
            raise AIArtifactError("AI 产物写入失败") from exc
        finally:
            if temporary:
                try:
                    os.unlink(temporary)
                except FileNotFoundError:
                    pass
        relative = target.relative_to(self.root).as_posix()
        return {
            "workspace": workspace,
            "feature": feature,
            "relative_path": relative,
            "sha256": hashlib.sha256(encoded).hexdigest(),
            "size": len(encoded),
        }

    def read_json(
        self,
        metadata: Dict[str, Any],
        workspace: str,
        feature: str,
        task_id: str,
        allowed_names: Iterable[str],
    ) -> Dict[str, Any]:
        path = self._metadata_path(metadata, workspace, feature, task_id, allowed_names)
        try:
            size = path.stat().st_size
            if size < 2 or size > self.max_bytes:
                raise AIArtifactError("AI 产物大小无效")
            encoded = path.read_bytes()
        except (OSError, ValueError) as exc:
            raise AIArtifactError("AI 产物不可用") from exc
        if hashlib.sha256(encoded).hexdigest() != metadata["sha256"]:
            raise AIArtifactError("AI 产物摘要不匹配")
        try:
            payload = json.loads(encoded.decode("utf-8"))
        except (UnicodeError, ValueError) as exc:
            raise AIArtifactError("AI 产物 JSON 无效") from exc
        if not isinstance(payload, dict):
            raise AIArtifactError("AI 产物结构无效")
        return payload

    def delete_file(
        self,
        metadata: Dict[str, Any],
        workspace: str,
        feature: str,
        task_id: str,
        allowed_names: Iterable[str],
    ) -> None:
        path = self._metadata_path(metadata, workspace, feature, task_id, allowed_names)
        try:
            path.unlink(missing_ok=True)
        except OSError as exc:
            raise AIArtifactError("AI 产物清理失败") from exc

    def delete_task(self, workspace: str, feature: str, task_id: str) -> None:
        path = self._task_dir(workspace, feature, task_id)
        if not path.exists():
            return
        if path.is_symlink() or len(path.relative_to(self.root).parts) != 3:
            raise AIArtifactError("拒绝清理不安全的 AI task 目录")
        try:
            shutil.rmtree(path)
            self._prune_empty(path.parent, stop=self.root / workspace)
        except OSError as exc:
            raise AIArtifactError("AI task 目录清理失败") from exc

    def delete_workspace(self, workspace: str) -> None:
        if not WORKSPACE_RE.fullmatch(str(workspace)):
            raise AIArtifactError("AI workspace 标识无效")
        root = self._root_resolved()
        path = self.root / workspace
        if not path.exists():
            return
        if path.is_symlink() or path.resolve(strict=False).parent != root:
            raise AIArtifactError("拒绝清理不安全的 AI workspace 目录")
        try:
            shutil.rmtree(path)
        except OSError as exc:
            raise AIArtifactError("AI workspace 目录清理失败") from exc

    @staticmethod
    def _prune_empty(path: Path, stop: Path) -> None:
        while path != stop.parent:
            try:
                path.rmdir()
            except OSError:
                return
            if path == stop:
                return
            path = path.parent
