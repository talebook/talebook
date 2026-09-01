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
import urllib.parse
import uuid
from dataclasses import dataclass
from pathlib import Path, PurePosixPath
from typing import Any, Dict, Mapping, Optional


DEFAULT_AI_ARTIFACT_ROOT = "/data/books/ai"
DEFAULT_WORKSPACE_SECRET = "cookie_secret"
SAFE_SEGMENT_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$")
AGENT_ENTRY_FILENAME = "AGENTS.md"
AGENT_PROFILE_PATH = PurePosixPath("references", "profile.md")
AGENT_THINKING_PATH = PurePosixPath("references", "thinking.md")
AGENT_SOURCES_PATH = PurePosixPath("references", "sources.md")
AGENT_REFERENCE_PATHS = (AGENT_PROFILE_PATH, AGENT_THINKING_PATH, AGENT_SOURCES_PATH)
AGENT_BUNDLE_PATHS = (AGENT_ENTRY_FILENAME, *(path.as_posix() for path in AGENT_REFERENCE_PATHS))
AGENT_MAX_LINES = 80


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
    previous: Optional[Dict[str, bytes]]


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
    """Store one standard Markdown Agent directory below books/ai."""

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

    def agent_path(self, owner_id: int, artifact_id: str, preview: bool = False) -> str:
        if not SAFE_SEGMENT_RE.fullmatch(str(artifact_id or "")):
            raise TaleAgentArtifactError("invalid artifact id")
        parts = [workspace_id(owner_id, self.workspace_secret), self.feature]
        if preview:
            parts.append("previews")
        parts.extend([str(artifact_id), AGENT_ENTRY_FILENAME])
        return PurePosixPath(*parts).as_posix()

    def replace_agent(
        self,
        owner_id: int,
        artifact_id: str,
        payload: Dict[str, Any],
        preview: bool = False,
    ) -> ArtifactWrite:
        checked = self._normalize_payload(payload)
        relative_path = self.agent_path(owner_id, artifact_id, preview=preview)
        entry = self._resolve_entry(owner_id, relative_path)
        previous = self._read_existing_bundle(entry.parent)
        bundle = {
            AGENT_ENTRY_FILENAME: self._render_agents(checked).encode("utf-8"),
            AGENT_PROFILE_PATH.as_posix(): self._render_profile(checked).encode("utf-8"),
            AGENT_THINKING_PATH.as_posix(): self._render_thinking(checked).encode("utf-8"),
            AGENT_SOURCES_PATH.as_posix(): self._render_sources(checked).encode("utf-8"),
        }
        self._replace_bundle(entry.parent, bundle)
        return ArtifactWrite(
            ref=ArtifactRef(relative_path=relative_path, sha256=self._bundle_digest(bundle)),
            previous=previous,
        )

    def restore(self, owner_id: int, write: ArtifactWrite) -> None:
        entry = self._resolve_entry(owner_id, write.ref.relative_path)
        if write.previous is None:
            self.delete(owner_id, write.ref.relative_path)
            return
        self._replace_bundle(entry.parent, write.previous)

    def read_agent(self, owner_id: int, relative_path: str, expected_sha256: str) -> Dict[str, Any]:
        entry = self._resolve_entry(owner_id, relative_path)
        try:
            bundle = {path: entry.parent.joinpath(*PurePosixPath(path).parts).read_bytes() for path in AGENT_BUNDLE_PATHS}
        except OSError as exc:
            raise TaleAgentArtifactError("artifact is unavailable") from exc
        actual_paths = {path.relative_to(entry.parent).as_posix() for path in entry.parent.rglob("*") if path.is_file()}
        if actual_paths != set(AGENT_BUNDLE_PATHS):
            raise TaleAgentArtifactError("artifact integrity check failed")
        if not expected_sha256 or not hmac.compare_digest(self._bundle_digest(bundle), expected_sha256):
            raise TaleAgentArtifactError("artifact integrity check failed")
        try:
            agents_text = bundle[AGENT_ENTRY_FILENAME].decode("utf-8")
            profile_text = bundle[AGENT_PROFILE_PATH.as_posix()].decode("utf-8")
            thinking_text = bundle[AGENT_THINKING_PATH.as_posix()].decode("utf-8")
            sources_text = bundle[AGENT_SOURCES_PATH.as_posix()].decode("utf-8")
        except UnicodeDecodeError as exc:
            raise TaleAgentArtifactError("artifact content is invalid") from exc
        if len(agents_text.splitlines()) > AGENT_MAX_LINES:
            raise TaleAgentArtifactError("AGENTS.md exceeds 80 lines")
        payload = self._parse_references(profile_text, thinking_text, sources_text)
        expected_title = f"# TaleAgent: {payload['display_name']}"
        referenced_paths = {f"`{path.as_posix()}`" for path in AGENT_REFERENCE_PATHS}
        if not agents_text.startswith(expected_title + "\n") or any(path not in agents_text for path in referenced_paths):
            raise TaleAgentArtifactError("artifact content is invalid")
        return payload

    def delete(self, owner_id: int, relative_path: str) -> None:
        entry = self._resolve_entry(owner_id, relative_path)
        artifact_root = entry.parent
        try:
            shutil.rmtree(artifact_root)
        except FileNotFoundError:
            return
        except OSError as exc:
            raise TaleAgentArtifactError("artifact cleanup failed") from exc

        feature_root = self.root / workspace_id(owner_id, self.workspace_secret) / self.feature
        parent = artifact_root.parent
        while parent != feature_root and feature_root in parent.parents:
            try:
                parent.rmdir()
            except OSError:
                break
            parent = parent.parent

    def _resolve_entry(self, owner_id: int, relative_path: str) -> Path:
        path = PurePosixPath(str(relative_path or ""))
        parts = path.parts
        expected_prefix = (workspace_id(owner_id, self.workspace_secret), self.feature)
        if path.is_absolute() or tuple(parts[:2]) != expected_prefix or parts[-1:] != (AGENT_ENTRY_FILENAME,):
            raise TaleAgentArtifactError("artifact path is outside the owner workspace")
        artifact_parts = parts[2:-1]
        valid_final = len(artifact_parts) == 1 and artifact_parts[0] != "previews"
        valid_preview = len(artifact_parts) == 2 and artifact_parts[0] == "previews"
        artifact_id = artifact_parts[-1] if artifact_parts else ""
        if not (valid_final or valid_preview) or not SAFE_SEGMENT_RE.fullmatch(artifact_id):
            raise TaleAgentArtifactError("artifact path is invalid")
        target = self.root.joinpath(*parts).resolve()
        try:
            target.relative_to(self.root)
        except ValueError as exc:
            raise TaleAgentArtifactError("artifact path is outside the storage root") from exc
        return target

    def _read_existing_bundle(self, artifact_root: Path) -> Optional[Dict[str, bytes]]:
        if not artifact_root.exists():
            return None
        previous: Dict[str, bytes] = {}
        for path in artifact_root.rglob("*"):
            if path.is_file():
                previous[path.relative_to(artifact_root).as_posix()] = path.read_bytes()
        return previous

    @staticmethod
    def _bundle_digest(bundle: Dict[str, bytes]) -> str:
        digest = hashlib.sha256()
        for relative_path in sorted(bundle):
            digest.update(relative_path.encode("utf-8"))
            digest.update(b"\0")
            digest.update(bundle[relative_path])
            digest.update(b"\0")
        return digest.hexdigest()

    @staticmethod
    def _replace_bundle(artifact_root: Path, bundle: Dict[str, bytes]) -> None:
        artifact_root.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        staging = Path(tempfile.mkdtemp(prefix=f".{artifact_root.name}-", suffix=".tmp", dir=str(artifact_root.parent)))
        backup = artifact_root.parent / f".{artifact_root.name}-{uuid.uuid4().hex}.bak"
        moved_old = False
        try:
            os.chmod(staging, 0o700)
            for relative_path, content in bundle.items():
                target = staging.joinpath(*PurePosixPath(relative_path).parts)
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                with os.fdopen(descriptor, "wb") as stream:
                    stream.write(content)
                    stream.flush()
                    os.fsync(stream.fileno())
            if artifact_root.exists():
                os.replace(artifact_root, backup)
                moved_old = True
            os.replace(staging, artifact_root)
            directory_fd = os.open(str(artifact_root.parent), os.O_RDONLY)
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
            if moved_old:
                shutil.rmtree(backup, ignore_errors=True)
        except Exception:
            if moved_old and artifact_root.exists():
                shutil.rmtree(artifact_root, ignore_errors=True)
            if moved_old and backup.exists():
                os.replace(backup, artifact_root)
            raise
        finally:
            shutil.rmtree(staging, ignore_errors=True)
            if backup.exists() and artifact_root.exists():
                shutil.rmtree(backup, ignore_errors=True)

    @staticmethod
    def _one_line(value: Any, label: str) -> str:
        if not isinstance(value, str):
            raise TaleAgentArtifactError(f"{label} is invalid")
        text = " ".join(value.split())
        if not text:
            raise TaleAgentArtifactError(f"{label} is invalid")
        return text

    @classmethod
    def _normalize_payload(cls, payload: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(payload, dict):
            raise TaleAgentArtifactError("artifact payload must be an object")

        def values(key: str, minimum: int, maximum: int) -> list[str]:
            raw = payload.get(key)
            if not isinstance(raw, list) or not minimum <= len(raw) <= maximum:
                raise TaleAgentArtifactError(f"{key} is invalid")
            return [cls._one_line(item, key) for item in raw]

        raw_sources = payload.get("sources")
        if not isinstance(raw_sources, list) or not raw_sources:
            raise TaleAgentArtifactError("sources is invalid")
        sources = []
        for source in raw_sources:
            if not isinstance(source, dict):
                raise TaleAgentArtifactError("sources is invalid")
            sources.append(
                {
                    "href": cls._one_line(source.get("href"), "source href"),
                    "title": cls._one_line(source.get("title"), "source title"),
                }
            )
        return {
            "display_name": cls._one_line(payload.get("display_name"), "display_name"),
            "introduction": cls._one_line(payload.get("introduction"), "introduction"),
            "thinking_patterns": values("thinking_patterns", 3, 6),
            "decision_principles": values("decision_principles", 2, 6),
            "problem_solving_steps": values("problem_solving_steps", 3, 6),
            "blind_spots": values("blind_spots", 1, 4),
            "sources": sources,
            "ai_derived": True,
        }

    @staticmethod
    def _render_agents(payload: Dict[str, Any]) -> str:
        content = f"""# TaleAgent: {payload["display_name"]}

You are a TaleAgent derived from a person described in a book.

## Required context

Read all of these authoritative context documents before answering:

- `references/profile.md`
- `references/thinking.md`
- `references/sources.md`

## Working method

- Understand the user's real problem before applying the reference model.
- Use its thinking patterns, decision principles, and problem-solving steps to propose concrete next actions.
- Surface the documented blind spots when this perspective may fail.
- Do not invent evidence or claim to be the original person.
- Keep the answer concise and useful rather than performing a character imitation.
"""
        if len(content.splitlines()) > AGENT_MAX_LINES:
            raise TaleAgentArtifactError("AGENTS.md exceeds 80 lines")
        return content

    @staticmethod
    def _render_profile(payload: Dict[str, Any]) -> str:
        lines = [
            "# TaleAgent Profile",
            "",
            "## Display Name",
            payload["display_name"],
            "",
            "## Introduction",
            payload["introduction"],
            "",
        ]
        return "\n".join(lines)

    @staticmethod
    def _render_thinking(payload: Dict[str, Any]) -> str:
        lines = ["# TaleAgent Thinking Model", ""]
        sections = (
            ("Thinking Patterns", payload["thinking_patterns"]),
            ("Decision Principles", payload["decision_principles"]),
            ("Problem-Solving Steps", payload["problem_solving_steps"]),
            ("Blind Spots", payload["blind_spots"]),
        )
        for heading, values in sections:
            lines.extend([f"## {heading}", *[f"- {value}" for value in values], ""])
        return "\n".join(lines)

    @staticmethod
    def _render_sources(payload: Dict[str, Any]) -> str:
        lines = ["# TaleAgent Sources", ""]
        for source in payload["sources"]:
            href = urllib.parse.quote(source["href"], safe="/._-~")
            lines.extend([f"- href: `{href}`", f"  title: {source['title']}"])
        return "\n".join(lines) + "\n"

    @classmethod
    def _parse_sections(cls, content: str, title: str, expected: set[str]) -> Dict[str, list[str]]:
        lines = content.splitlines()
        if not lines or lines[0] != title:
            raise TaleAgentArtifactError("artifact content is invalid")
        sections: Dict[str, list[str]] = {}
        current = ""
        for line in lines[1:]:
            if line.startswith("## "):
                current = line[3:]
                if current in sections:
                    raise TaleAgentArtifactError("artifact content is invalid")
                sections[current] = []
            elif current and line:
                sections[current].append(line)
        if set(sections) != expected:
            raise TaleAgentArtifactError("artifact content is invalid")
        return sections

    @classmethod
    def _parse_references(cls, profile: str, thinking: str, sources_content: str) -> Dict[str, Any]:
        profile_sections = cls._parse_sections(
            profile,
            "# TaleAgent Profile",
            {"Display Name", "Introduction"},
        )
        thinking_sections = cls._parse_sections(
            thinking,
            "# TaleAgent Thinking Model",
            {"Thinking Patterns", "Decision Principles", "Problem-Solving Steps", "Blind Spots"},
        )

        def scalar(sections: Dict[str, list[str]], name: str) -> str:
            values = sections[name]
            if len(values) != 1:
                raise TaleAgentArtifactError("artifact content is invalid")
            return cls._one_line(values[0], name)

        def bullets(name: str) -> list[str]:
            values = thinking_sections[name]
            if not values or any(not value.startswith("- ") for value in values):
                raise TaleAgentArtifactError("artifact content is invalid")
            return [cls._one_line(value[2:], name) for value in values]

        source_lines = sources_content.splitlines()
        if len(source_lines) < 3 or source_lines[:2] != ["# TaleAgent Sources", ""]:
            raise TaleAgentArtifactError("artifact content is invalid")
        source_lines = source_lines[2:]
        if not source_lines or len(source_lines) % 2:
            raise TaleAgentArtifactError("artifact content is invalid")
        sources = []
        for index in range(0, len(source_lines), 2):
            href_line, title_line = source_lines[index : index + 2]
            if not href_line.startswith("- href: `") or not href_line.endswith("`") or not title_line.startswith("  title: "):
                raise TaleAgentArtifactError("artifact content is invalid")
            sources.append(
                {
                    "href": urllib.parse.unquote(href_line[len("- href: `") : -1]),
                    "title": cls._one_line(title_line[len("  title: ") :], "source title"),
                }
            )
        payload = {
            "display_name": scalar(profile_sections, "Display Name"),
            "introduction": scalar(profile_sections, "Introduction"),
            "thinking_patterns": bullets("Thinking Patterns"),
            "decision_principles": bullets("Decision Principles"),
            "problem_solving_steps": bullets("Problem-Solving Steps"),
            "blind_spots": bullets("Blind Spots"),
            "sources": sources,
        }
        return cls._normalize_payload(payload)


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
