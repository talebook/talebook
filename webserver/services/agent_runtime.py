"""Runtime-neutral contracts for one-shot AI generation tasks."""

from __future__ import annotations

import abc
import dataclasses
import enum
from typing import Any, Callable, Dict, Optional


class RuntimeCapability(str, enum.Enum):
    NATIVE_OUTPUT_SCHEMA = "native_output_schema"
    RESUME = "resume"
    CANCEL = "cancel"
    USAGE = "usage"
    MODEL_SELECTION = "model_selection"


class RuntimeEventType(str, enum.Enum):
    STARTED = "started"
    PROGRESS = "progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


@dataclasses.dataclass(frozen=True)
class RuntimeEvent:
    type: RuntimeEventType
    message: str = ""
    session_id: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None


@dataclasses.dataclass(frozen=True)
class RuntimeRequest:
    task_id: str
    prompt: str
    output_schema: Dict[str, Any]
    model: Optional[str] = None


@dataclasses.dataclass(frozen=True)
class RuntimeResult:
    output: Dict[str, Any]
    usage: Dict[str, Any]
    session_id: Optional[str] = None


@dataclasses.dataclass(frozen=True)
class RuntimeProbe:
    available: bool
    runtime: str
    version: str = ""
    reason: str = ""
    capabilities: frozenset[RuntimeCapability] = frozenset()


class RuntimeErrorCode(str, enum.Enum):
    UNAVAILABLE = "runtime.unavailable"
    NOT_AUTHENTICATED = "runtime.not_authenticated"
    VERSION_UNSUPPORTED = "runtime.version_unsupported"
    HANDSHAKE_TIMEOUT = "runtime.handshake_timeout"
    FIRST_PROGRESS_TIMEOUT = "runtime.first_progress_timeout"
    SILENCE_TIMEOUT = "runtime.silence_timeout"
    TOTAL_TIMEOUT = "runtime.total_timeout"
    PROTOCOL = "runtime.protocol_error"
    CRASHED = "runtime.crashed"
    USAGE_LIMIT = "runtime.usage_limit"
    CANCELLED = "runtime.cancelled"
    INVALID_OUTPUT = "runtime.invalid_output"


class AgentRuntimeError(RuntimeError):
    """A safe-to-persist runtime failure.

    ``message`` must never include prompts, chapter text, credentials, or raw
    process output. Detailed diagnostics belong in redacted server logs only.
    """

    def __init__(self, code: RuntimeErrorCode, message: str):
        super().__init__(message)
        self.code = code
        self.safe_message = message


ProgressCallback = Callable[[RuntimeEvent], None]


class AgentRuntime(abc.ABC):
    name = "unknown"
    capabilities: frozenset[RuntimeCapability] = frozenset()

    @abc.abstractmethod
    def probe(self) -> RuntimeProbe:
        raise NotImplementedError

    @abc.abstractmethod
    def generate(self, request: RuntimeRequest, on_event: ProgressCallback) -> RuntimeResult:
        raise NotImplementedError

    @abc.abstractmethod
    def cancel(self, task_id: str) -> bool:
        raise NotImplementedError


class StubAgentRuntime(AgentRuntime):
    """Capability/test stub reserved for future runtime adapters."""

    def __init__(self, name: str, capabilities: frozenset[RuntimeCapability]):
        self.name = name
        self.capabilities = capabilities

    def probe(self) -> RuntimeProbe:
        return RuntimeProbe(False, self.name, reason="adapter_not_implemented", capabilities=self.capabilities)

    def generate(self, request: RuntimeRequest, on_event: ProgressCallback) -> RuntimeResult:
        raise AgentRuntimeError(RuntimeErrorCode.UNAVAILABLE, "该 AI 运行时尚未启用")

    def cancel(self, task_id: str) -> bool:
        return False


CLAUDE_CODE_STUB = StubAgentRuntime(
    "claude_code",
    frozenset({RuntimeCapability.CANCEL, RuntimeCapability.USAGE, RuntimeCapability.MODEL_SELECTION}),
)
TRAE_ACP_STUB = StubAgentRuntime(
    "trae_acp",
    frozenset({RuntimeCapability.RESUME, RuntimeCapability.CANCEL, RuntimeCapability.MODEL_SELECTION}),
)
