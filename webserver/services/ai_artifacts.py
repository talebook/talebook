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
from pathlib import Path
from typing import Any, Dict, Optional


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
