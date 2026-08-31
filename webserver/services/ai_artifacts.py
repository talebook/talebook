"""Private, atomic filesystem storage shared by durable AI features."""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import os
import re
import shutil
import tempfile
import threading
import uuid
from pathlib import Path, PurePosixPath
from typing import Any, Dict, Mapping, Optional


SUMMARY_DUCK_FEATURE = "summary_duck"
SUMMARY_DUCK_DIRECTORY = "summary-duck"
ARTIFACT_FORMAT = "talebook.ai.summary-duck.v1"
WORKSPACE_PATTERN = re.compile(r"^(?:[a-f0-9]{24}|[a-f0-9]{32})$")
FEATURE_PATTERN = re.compile(r"^[a-z][a-z0-9-]{0,63}$")
ARTIFACT_PATTERN = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$")
TASK_ID_PATTERN = re.compile(r"^[a-f0-9-]{36}$")
WORKSPACE_NAMESPACE = uuid.UUID("fd75df4a-22c1-4bf1-bb30-83534b556b6b")
_STORE_LOCK = threading.RLock()


class AIArtifactError(RuntimeError):
    """Raised when an AI artifact cannot be accessed without weakening storage guarantees."""

    def __init__(self, code: str, safe_message: Optional[str] = None):
        if safe_message is None:
            safe_message = str(code)
            code = "artifact.invalid"
        self.code = code
        self.safe_message = safe_message
        super().__init__(safe_message)


def workspace_key(owner_id: int) -> str:
    """Return the stable opaque workspace segment used by SKILL artifacts."""
    try:
        owner = int(owner_id)
    except (TypeError, ValueError) as exc:
        raise AIArtifactError("AI 工作空间标识无效") from exc
    if owner <= 0:
        raise AIArtifactError("AI 工作空间标识无效")
    return hashlib.sha256(f"talebook-ai-workspace:{owner}".encode("utf-8")).hexdigest()[:24]


def workspace_identifier(creator_id: int, config: Mapping[str, Any]) -> str:
    """Return the stable opaque workspace segment used by Summary Duck artifacts."""
    del config
    return uuid.uuid5(WORKSPACE_NAMESPACE, f"talebook:reader:{int(creator_id)}").hex


def _iso(value: Optional[datetime.datetime]) -> Optional[str]:
    return value.isoformat() if value else None


class AIArtifactStore:
    """Store authoritative artifacts below ``<root>/<workspace>/<feature>``."""

    def __init__(self, config_or_root):
        if isinstance(config_or_root, Mapping):
            self.config = dict(config_or_root)
            configured = self.config.get("AI_ARTIFACT_ROOT") or "/data/books/ai"
        else:
            configured = str(config_or_root or "").strip()
            self.config = {"AI_ARTIFACT_ROOT": configured}
        if not configured:
            raise AIArtifactError("AI 产物根目录未配置")
        self.root = Path(str(configured)).expanduser().resolve()

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
        """Atomically replace one complete current artifact directory."""
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
                    if final_path.exists() or final_path.is_symlink():
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
        """Read a directory artifact only when every path is a regular private file."""
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
                self._remove_empty_directories(feature_path, workspace_path)
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("AI 产物删除失败") from exc

    def prepare_summary_duck_record(self, record) -> str:
        if record.feature != SUMMARY_DUCK_FEATURE:
            raise AIArtifactError("artifact.feature_invalid", "AI 产物类型无效")
        workspace_id = record.workspace_id or workspace_identifier(record.creator_id, self.config)
        if not re.fullmatch(r"[a-f0-9]{32}", workspace_id):
            raise AIArtifactError("artifact.workspace_invalid", "AI 工作空间标识无效")
        if not TASK_ID_PATTERN.fullmatch(str(record.id)):
            raise AIArtifactError("artifact.task_invalid", "AI 任务标识无效")
        relative_path = f"{workspace_id}/{SUMMARY_DUCK_DIRECTORY}/{record.id}.json"
        if record.artifact_path and record.artifact_path != relative_path:
            raise AIArtifactError("artifact.path_invalid", "AI 产物路径无效")
        record.workspace_id = workspace_id
        record.artifact_path = relative_path
        return relative_path

    def _summary_duck_path(self, record) -> Path:
        relative_path = self.prepare_summary_duck_record(record)
        candidate = self.root / relative_path
        self._reject_symlink_components(candidate)
        resolved = candidate.resolve()
        try:
            resolved.relative_to(self.root)
        except ValueError as exc:
            raise AIArtifactError("artifact.path_invalid", "AI 产物路径无效") from exc
        return resolved

    @staticmethod
    def _summary_duck_document(record, ai_draft, user_revision, status, updated_at):
        return {
            "format": ARTIFACT_FORMAT,
            "task": {
                "id": record.id,
                "creator_id": record.creator_id,
                "workspace_id": record.workspace_id,
                "feature": record.feature,
                "book_id": record.book_id,
                "book_version": record.book_version,
                "chapter": {
                    "href": record.chapter_href,
                    "title": record.chapter_title or "",
                    "text_sha256": record.chapter_text_hash,
                    "length": record.chapter_length,
                },
                "schema_version": record.schema_version,
                "prompt_version": record.prompt_version,
                "status": status,
                "created_at": _iso(record.create_time),
                "updated_at": _iso(updated_at),
            },
            "ai_draft": ai_draft or {},
            "user_revision": user_revision or {},
        }

    def write_summary_duck(
        self,
        record,
        ai_draft: Dict[str, Any],
        user_revision: Dict[str, Any],
        *,
        status: str = "succeeded",
        updated_at: Optional[datetime.datetime] = None,
    ) -> str:
        """Atomically replace one Summary Duck JSON artifact and update its digest index."""
        updated_at = updated_at or datetime.datetime.now()
        path = self._summary_duck_path(record)
        document = self._summary_duck_document(record, ai_draft, user_revision, status, updated_at)
        payload = json.dumps(document, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()
        with _STORE_LOCK:
            fd = None
            temp_path = None
            try:
                self._ensure_private_directory(path.parent)
                fd, temp_path = tempfile.mkstemp(dir=str(path.parent), prefix=f".{record.id}.", suffix=".tmp")
                os.fchmod(fd, 0o600)
                with os.fdopen(fd, "wb") as output:
                    fd = None
                    output.write(payload)
                    output.flush()
                    os.fsync(output.fileno())
                os.replace(temp_path, path)
                temp_path = None
                directory_fd = os.open(str(path.parent), os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("artifact.write_failed", "AI 产物保存失败，请重试") from exc
            finally:
                if fd is not None:
                    os.close(fd)
                if temp_path:
                    try:
                        os.unlink(temp_path)
                    except OSError:
                        pass
        record.artifact_sha256 = digest
        return digest

    def read_summary_duck(self, record) -> Dict[str, Any]:
        path = self._summary_duck_path(record)
        with _STORE_LOCK:
            try:
                self._reject_symlink_components(path)
                payload = path.read_bytes()
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("artifact.unavailable", "总结产物暂时不可用，请重试或重新生成") from exc
        digest = hashlib.sha256(payload).hexdigest()
        if not record.artifact_sha256 or not hmac.compare_digest(digest, record.artifact_sha256):
            raise AIArtifactError("artifact.digest_mismatch", "总结产物校验失败，请重新生成")
        try:
            document = json.loads(payload)
        except (TypeError, ValueError) as exc:
            raise AIArtifactError("artifact.invalid", "总结产物格式无效，请重新生成") from exc
        if not isinstance(document, dict):
            raise AIArtifactError("artifact.invalid", "总结产物格式无效，请重新生成")
        task = document.get("task")
        if (
            document.get("format") != ARTIFACT_FORMAT
            or not isinstance(task, dict)
            or task.get("id") != record.id
            or task.get("creator_id") != record.creator_id
            or task.get("workspace_id") != record.workspace_id
            or task.get("feature") != SUMMARY_DUCK_FEATURE
            or task.get("book_id") != record.book_id
            or task.get("book_version") != record.book_version
        ):
            raise AIArtifactError("artifact.invalid", "总结产物身份校验失败，请重新生成")
        return document

    def delete_summary_duck(self, record) -> bool:
        if not record.artifact_path:
            return False
        path = self._summary_duck_path(record)
        with _STORE_LOCK:
            try:
                self._reject_symlink_components(path)
                path.unlink()
            except FileNotFoundError:
                return False
            except AIArtifactError:
                raise
            except OSError as exc:
                raise AIArtifactError("artifact.delete_failed", "AI 产物删除失败，请重试") from exc
            try:
                self._remove_empty_directories(path.parent, path.parent.parent)
            except OSError as exc:
                raise AIArtifactError("artifact.delete_failed", "AI 产物删除失败，请重试") from exc
        return True

    def migrate_summary_duck_record(self, session, record) -> bool:
        """Move one legacy database-backed result to the authoritative file."""
        if record.artifact_sha256:
            return False
        ai_draft = dict(record.ai_draft or record.result_data or {})
        user_revision = dict(record.user_revision or record.result_data or ai_draft)
        if not ai_draft and not user_revision:
            self.prepare_summary_duck_record(record)
            return False
        self.write_summary_duck(
            record,
            ai_draft,
            user_revision,
            status=record.status,
            updated_at=record.update_time,
        )
        record.result_data = {}
        record.ai_draft = {}
        record.user_revision = {}
        session.add(record)
        session.commit()
        return True

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
    def _remove_empty_directories(*directories: Path) -> None:
        for directory in directories:
            if directory.is_dir() and not any(directory.iterdir()):
                directory.rmdir()

    @staticmethod
    def _remove_path(path: Path) -> None:
        if path.is_symlink() or path.is_file():
            path.unlink()
        elif path.exists():
            shutil.rmtree(path)


def migrate_legacy_summary_duck_artifacts(session_maker, config: Dict[str, Any]) -> Dict[str, int]:
    """Migrate legacy Summary Duck blobs after the additive DB schema migration."""
    from webserver.models import AITask

    store = AIArtifactStore(config)
    session = session_maker()
    migrated = 0
    failed = 0
    try:
        records = session.query(AITask).filter(AITask.feature == SUMMARY_DUCK_FEATURE).all()
        for record in records:
            try:
                migrated += int(store.migrate_summary_duck_record(session, record))
            except Exception:
                failed += 1
                session.rollback()
        return {"migrated": migrated, "failed": failed}
    finally:
        session.close()
