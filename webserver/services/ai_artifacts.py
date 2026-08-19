"""Filesystem-backed, current-version storage for durable AI artifacts."""

from __future__ import annotations

import datetime
import hashlib
import hmac
import json
import os
import re
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Dict, Optional


DEFAULT_AI_ARTIFACT_ROOT = "/data/books/ai"
DEFAULT_WORKSPACE_SECRET = "cookie_secret"
SAFE_SEGMENT_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$")


class TaleAgentArtifactError(RuntimeError):
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

    del secret
    try:
        value = int(owner_id)
    except (TypeError, ValueError) as exc:
        raise TaleAgentArtifactError("invalid artifact owner") from exc
    if value <= 0:
        raise TaleAgentArtifactError("invalid artifact owner")
    return workspace_identifier(value, {})


class TaleAgentArtifactStore:
    """Store current AI artifacts below books/ai using safe relative paths."""

    def __init__(self, root: str, feature: str, workspace_secret: str = DEFAULT_WORKSPACE_SECRET):
        if not SAFE_SEGMENT_RE.fullmatch(feature or ""):
            raise TaleAgentArtifactError("invalid artifact feature")
        self.root = Path(root or DEFAULT_AI_ARTIFACT_ROOT).expanduser().resolve()
        self.feature = feature
        self.workspace_secret = str(workspace_secret or DEFAULT_WORKSPACE_SECRET)

    @classmethod
    def from_config(cls, config: Dict[str, Any], feature: str) -> "TaleAgentArtifactStore":
        return cls(
            str(config.get("AI_ARTIFACT_ROOT") or DEFAULT_AI_ARTIFACT_ROOT),
            feature,
            str(config.get("AI_ARTIFACT_WORKSPACE_SECRET") or config.get("cookie_secret") or DEFAULT_WORKSPACE_SECRET),
        )

    def manifest_path(self, owner_id: int, artifact_id: str, preview: bool = False) -> str:
        if not SAFE_SEGMENT_RE.fullmatch(str(artifact_id or "")):
            raise TaleAgentArtifactError("invalid artifact id")
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
            raise TaleAgentArtifactError("artifact payload must be an object")
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
            raise TaleAgentArtifactError("artifact is unavailable") from exc
        actual_sha256 = hashlib.sha256(content).hexdigest()
        if not expected_sha256 or actual_sha256 != expected_sha256:
            raise TaleAgentArtifactError("artifact integrity check failed")
        try:
            payload = json.loads(content.decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as exc:
            raise TaleAgentArtifactError("artifact content is invalid") from exc
        if not isinstance(payload, dict):
            raise TaleAgentArtifactError("artifact content is invalid")
        return payload

    def delete(self, owner_id: int, relative_path: str) -> None:
        target = self._resolve(owner_id, relative_path)
        try:
            target.unlink()
        except FileNotFoundError:
            return
        except OSError as exc:
            raise TaleAgentArtifactError("artifact cleanup failed") from exc

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
            raise TaleAgentArtifactError("artifact path is outside the owner workspace")
        if any(part in {"", ".", ".."} or not SAFE_SEGMENT_RE.fullmatch(part) for part in parts[:-1]):
            raise TaleAgentArtifactError("artifact path is invalid")
        if parts[-1] != "manifest.json":
            raise TaleAgentArtifactError("artifact path is invalid")
        target = self.root.joinpath(*parts).resolve()
        try:
            target.relative_to(self.root)
        except ValueError as exc:
            raise TaleAgentArtifactError("artifact path is outside the storage root") from exc
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


SUMMARY_DUCK_FEATURE = "summary_duck"
SUMMARY_DUCK_DIRECTORY = "summary-duck"
ARTIFACT_FORMAT = "talebook.ai.summary-duck.v1"
WORKSPACE_RE = re.compile(r"^[a-f0-9]{32}$")
TASK_ID_RE = re.compile(r"^[a-f0-9-]{36}$")
WORKSPACE_NAMESPACE = uuid.UUID("fd75df4a-22c1-4bf1-bb30-83534b556b6b")


class AIArtifactError(RuntimeError):
    """An artifact could not be accessed without weakening storage guarantees."""

    def __init__(self, code: str, safe_message: str):
        self.code = code
        self.safe_message = safe_message
        super().__init__(safe_message)


def workspace_identifier(creator_id: int, config: Dict[str, Any]) -> str:
    """Return a stable opaque directory identifier without exposing user fields."""

    del config
    return uuid.uuid5(WORKSPACE_NAMESPACE, f"talebook:reader:{int(creator_id)}").hex


def _iso(value: Optional[datetime.datetime]) -> Optional[str]:
    return value.isoformat() if value else None


class AIArtifactStore:
    """Store one authoritative JSON file per artifact, without application versions."""

    def __init__(self, config: Dict[str, Any]):
        configured = config.get("AI_ARTIFACT_ROOT") or "/data/books/ai"
        self.root = Path(str(configured)).expanduser().resolve()
        self.config = config

    def prepare_summary_duck_record(self, record) -> str:
        if record.feature != SUMMARY_DUCK_FEATURE:
            raise AIArtifactError("artifact.feature_invalid", "AI 产物类型无效")
        workspace_id = record.workspace_id or workspace_identifier(record.creator_id, self.config)
        if not WORKSPACE_RE.fullmatch(workspace_id):
            raise AIArtifactError("artifact.workspace_invalid", "AI 工作空间标识无效")
        if not TASK_ID_RE.fullmatch(str(record.id)):
            raise AIArtifactError("artifact.task_invalid", "AI 任务标识无效")
        relative_path = f"{workspace_id}/{SUMMARY_DUCK_DIRECTORY}/{record.id}.json"
        if record.artifact_path and record.artifact_path != relative_path:
            raise AIArtifactError("artifact.path_invalid", "AI 产物路径无效")
        record.workspace_id = workspace_id
        record.artifact_path = relative_path
        return relative_path

    def _path(self, record) -> Path:
        relative_path = self.prepare_summary_duck_record(record)
        candidate = (self.root / relative_path).resolve()
        try:
            candidate.relative_to(self.root)
        except ValueError as exc:
            raise AIArtifactError("artifact.path_invalid", "AI 产物路径无效") from exc
        return candidate

    @staticmethod
    def _document(record, ai_draft, user_revision, status, updated_at):
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
        updated_at = updated_at or datetime.datetime.now()
        path = self._path(record)
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        try:
            os.chmod(path.parent.parent, 0o700)
            os.chmod(path.parent, 0o700)
        except OSError as exc:
            raise AIArtifactError("artifact.write_failed", "AI 产物目录不可写") from exc
        document = self._document(record, ai_draft, user_revision, status, updated_at)
        payload = json.dumps(document, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
        digest = hashlib.sha256(payload).hexdigest()
        fd = None
        temp_path = None
        try:
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
        path = self._path(record)
        try:
            payload = path.read_bytes()
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
        path = self._path(record)
        try:
            path.unlink()
        except FileNotFoundError:
            return False
        except OSError as exc:
            raise AIArtifactError("artifact.delete_failed", "AI 产物删除失败，请重试") from exc
        for directory in (path.parent, path.parent.parent):
            try:
                directory.rmdir()
            except OSError:
                break
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
