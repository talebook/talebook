"""Codex app-server adapter for isolated, one-shot generation tasks.

Protocol source: https://learn.chatgpt.com/docs/app-server (checked 2026-08-15).
The adapter deliberately uses only the stable stdio JSONL transport.
"""

from __future__ import annotations

import json
import logging
import os
import re
import selectors
import shutil
import signal
import subprocess
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from webserver.services.agent_runtime import (
    AgentRuntime,
    AgentRuntimeError,
    ProgressCallback,
    RuntimeCapability,
    RuntimeErrorCode,
    RuntimeEvent,
    RuntimeEventType,
    RuntimeProbe,
    RuntimeRequest,
    RuntimeResult,
)


LOG = logging.getLogger(__name__)
# The executable is `codex`; parse only the semantic version so the adapter is
# independent of the product label printed by a particular CLI release.
VERSION_RE = re.compile(r"(\d+)\.(\d+)\.(\d+)")


class _ActiveTask:
    def __init__(self, process: subprocess.Popen):
        self.process = process
        self.thread_id: Optional[str] = None
        self.turn_id: Optional[str] = None
        self.cancel_requested = threading.Event()


class CodexAppServerRuntime(AgentRuntime):
    name = "codex_app_server"
    capabilities = frozenset(
        {
            RuntimeCapability.NATIVE_OUTPUT_SCHEMA,
            RuntimeCapability.RESUME,
            RuntimeCapability.CANCEL,
            RuntimeCapability.USAGE,
            RuntimeCapability.MODEL_SELECTION,
        }
    )

    def __init__(self, config: Dict[str, Any]):
        self.command = config.get("AI_CODEX_COMMAND", "codex")
        self.identity_path = config.get("AI_CODEX_IDENTITY_PATH", "")
        self.task_root = config.get("AI_TASK_ROOT", "") or None
        self.model = config.get("AI_CODEX_MODEL", "") or None
        self.minimum_version = self._parse_version(config.get("AI_CODEX_MIN_VERSION", "0.147.0"))
        self.maximum_version = self._parse_version(config.get("AI_CODEX_MAX_VERSION", "0.148.0"))
        self.handshake_timeout = float(config.get("AI_HANDSHAKE_TIMEOUT_SECONDS", 10))
        self.first_progress_timeout = float(config.get("AI_FIRST_PROGRESS_TIMEOUT_SECONDS", 30))
        self.silence_timeout = float(config.get("AI_SILENCE_TIMEOUT_SECONDS", 45))
        self.total_timeout = float(config.get("AI_TOTAL_TIMEOUT_SECONDS", 180))
        self.terminate_timeout = float(config.get("AI_CANCEL_TERM_SECONDS", 5))
        self._active: Dict[str, _ActiveTask] = {}
        self._read_buffers: Dict[int, bytearray] = {}
        self._lock = threading.Lock()

    def _ensure_task_root(self) -> None:
        if self.task_root:
            Path(self.task_root).mkdir(mode=0o700, parents=True, exist_ok=True)

    @staticmethod
    def _parse_version(value: str) -> Tuple[int, int, int]:
        match = VERSION_RE.search(str(value))
        if not match:
            return (0, 0, 0)
        return tuple(int(part) for part in match.groups())

    def _version(self) -> Tuple[str, Tuple[int, int, int]]:
        try:
            result = subprocess.run(
                [self.command, "--version"],
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                text=True,
                timeout=5,
                check=False,
            )
        except (OSError, subprocess.SubprocessError):
            return "", (0, 0, 0)
        text = (result.stdout or "").strip()
        return text, self._parse_version(text)

    def _copy_identity(self, codex_home: Path) -> bool:
        source_root = Path(self.identity_path).expanduser() if self.identity_path else Path.home() / ".codex"
        source = source_root / "auth.json"
        if not source.is_file():
            return False
        codex_home.mkdir(mode=0o700, parents=True, exist_ok=True)
        target = codex_home / "auth.json"
        shutil.copyfile(source, target)
        target.chmod(0o600)
        return True

    def _isolated_env(self, root: Path) -> Tuple[Dict[str, str], bool]:
        home = root / "home"
        codex_home = root / "codex-home"
        home.mkdir(mode=0o700, parents=True, exist_ok=True)
        authenticated = self._copy_identity(codex_home)
        allowed = ("PATH", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR", "HTTPS_PROXY", "HTTP_PROXY", "NO_PROXY")
        env = {key: os.environ[key] for key in allowed if key in os.environ}
        env.update({"HOME": str(home), "CODEX_HOME": str(codex_home)})
        return env, authenticated

    def probe(self) -> RuntimeProbe:
        version_text, version = self._version()
        if not version_text:
            return RuntimeProbe(False, self.name, reason="not_installed", capabilities=self.capabilities)
        if version < self.minimum_version or version >= self.maximum_version:
            return RuntimeProbe(
                False,
                self.name,
                version=version_text,
                reason="version_unsupported",
                capabilities=self.capabilities,
            )
        self._ensure_task_root()
        with tempfile.TemporaryDirectory(prefix="talebook-ai-probe-", dir=self.task_root) as tmp:
            env, authenticated = self._isolated_env(Path(tmp))
            if not authenticated:
                return RuntimeProbe(
                    False,
                    self.name,
                    version=version_text,
                    reason="not_authenticated",
                    capabilities=self.capabilities,
                )
            try:
                status = subprocess.run(
                    [self.command, "login", "status"],
                    env=env,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    timeout=5,
                    check=False,
                )
            except (OSError, subprocess.SubprocessError):
                status = None
            if not status or status.returncode != 0:
                return RuntimeProbe(
                    False,
                    self.name,
                    version=version_text,
                    reason="not_authenticated",
                    capabilities=self.capabilities,
                )
        return RuntimeProbe(True, self.name, version=version_text, capabilities=self.capabilities)

    @staticmethod
    def _send(process: subprocess.Popen, message: Dict[str, Any]) -> None:
        if process.stdin is None:
            raise AgentRuntimeError(RuntimeErrorCode.CRASHED, "AI 运行时已退出")
        process.stdin.write((json.dumps(message, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8"))
        process.stdin.flush()

    def _read(self, process: subprocess.Popen, selector: selectors.BaseSelector, timeout: float) -> Optional[Dict[str, Any]]:
        buffer = self._read_buffers.setdefault(process.pid, bytearray())
        if b"\n" not in buffer:
            if not selector.select(max(0.0, timeout)):
                return None
            if process.stdout is None:
                raise AgentRuntimeError(RuntimeErrorCode.CRASHED, "AI 运行时已退出")
            chunk = os.read(process.stdout.fileno(), 65536)
            if not chunk:
                raise AgentRuntimeError(RuntimeErrorCode.CRASHED, "AI 运行时异常退出")
            buffer.extend(chunk)
        if process.stdout is None:
            raise AgentRuntimeError(RuntimeErrorCode.CRASHED, "AI 运行时已退出")
        line, _, remainder = buffer.partition(b"\n")
        self._read_buffers[process.pid] = bytearray(remainder)
        try:
            message = json.loads(line.decode("utf-8"))
        except (TypeError, ValueError, UnicodeError):
            raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时返回了无效协议消息")
        if not isinstance(message, dict):
            raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时返回了无效协议消息")
        return message

    def _request(
        self,
        process: subprocess.Popen,
        selector: selectors.BaseSelector,
        request_id: int,
        method: str,
        params: Dict[str, Any],
        timeout: float,
    ) -> Dict[str, Any]:
        self._send(process, {"method": method, "id": request_id, "params": params})
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            message = self._read(process, selector, deadline - time.monotonic())
            if message is None:
                break
            if message.get("id") != request_id:
                continue
            if message.get("error"):
                raise self._protocol_error(message["error"])
            result = message.get("result")
            if not isinstance(result, dict):
                raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时响应格式不兼容")
            return result
        raise AgentRuntimeError(RuntimeErrorCode.HANDSHAKE_TIMEOUT, "AI 运行时握手超时")

    @staticmethod
    def _protocol_error(error: Any) -> AgentRuntimeError:
        data = error if isinstance(error, dict) else {}
        message = str(data.get("message", ""))
        info = str(data.get("data", ""))
        combined = (message + " " + info).lower()
        if "usage" in combined or "limit" in combined or "quota" in combined:
            return AgentRuntimeError(RuntimeErrorCode.USAGE_LIMIT, "AI 使用额度已耗尽，请稍后重试")
        if "auth" in combined or "login" in combined or "unauthorized" in combined:
            return AgentRuntimeError(RuntimeErrorCode.NOT_AUTHENTICATED, "AI 运行时尚未登录")
        return AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时协议不兼容")

    @staticmethod
    def _error_from_turn(turn: Dict[str, Any]) -> AgentRuntimeError:
        error = turn.get("error") if isinstance(turn.get("error"), dict) else {}
        info = str(error.get("codexErrorInfo", ""))
        if "UsageLimitExceeded" in info:
            return AgentRuntimeError(RuntimeErrorCode.USAGE_LIMIT, "AI 使用额度已耗尽，请稍后重试")
        return AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 生成失败，请重试")

    def generate(self, request: RuntimeRequest, on_event: ProgressCallback) -> RuntimeResult:
        probe = self.probe()
        if not probe.available:
            code = RuntimeErrorCode.UNAVAILABLE
            message = "AI 运行时不可用"
            if probe.reason == "not_authenticated":
                code, message = RuntimeErrorCode.NOT_AUTHENTICATED, "AI 运行时尚未登录"
            elif probe.reason == "version_unsupported":
                code, message = RuntimeErrorCode.VERSION_UNSUPPORTED, "AI 运行时版本不兼容"
            raise AgentRuntimeError(code, message)

        terminal_sent = False
        turn_terminal = False
        self._ensure_task_root()
        with tempfile.TemporaryDirectory(prefix=f"talebook-ai-{request.task_id[:8]}-", dir=self.task_root) as tmp:
            task_root = Path(tmp)
            workdir = task_root / "work"
            workdir.mkdir(mode=0o700)
            env, authenticated = self._isolated_env(task_root)
            if not authenticated:
                raise AgentRuntimeError(RuntimeErrorCode.NOT_AUTHENTICATED, "AI 运行时尚未登录")
            process = subprocess.Popen(
                [self.command, "app-server", "--listen", "stdio://"],
                cwd=str(workdir),
                env=env,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=0,
                start_new_session=True,
            )
            active = _ActiveTask(process)
            with self._lock:
                self._active[request.task_id] = active
            selector = selectors.DefaultSelector()
            assert process.stdout is not None
            selector.register(process.stdout, selectors.EVENT_READ)
            try:
                self._request(
                    process,
                    selector,
                    1,
                    "initialize",
                    {"clientInfo": {"name": "talebook", "title": "Talebook", "version": "1.0"}},
                    self.handshake_timeout,
                )
                self._send(process, {"method": "initialized", "params": {}})
                thread_params: Dict[str, Any] = {
                    "cwd": str(workdir),
                    "approvalPolicy": "never",
                    "sandbox": "readOnly",
                    "serviceName": request.service_name,
                }
                if request.model or self.model:
                    thread_params["model"] = request.model or self.model
                started = self._request(process, selector, 2, "thread/start", thread_params, self.handshake_timeout)
                thread = started.get("thread") if isinstance(started.get("thread"), dict) else {}
                active.thread_id = thread.get("id")
                if not active.thread_id:
                    raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时未返回会话 ID")
                turn_params = {
                    "threadId": active.thread_id,
                    "input": [{"type": "text", "text": request.prompt}],
                    "approvalPolicy": "never",
                    "sandboxPolicy": {
                        "type": "readOnly",
                        "access": {"type": "restricted", "includePlatformDefaults": False, "readableRoots": []},
                    },
                    "outputSchema": request.output_schema,
                }
                turn_started = self._request(process, selector, 3, "turn/start", turn_params, self.handshake_timeout)
                turn = turn_started.get("turn") if isinstance(turn_started.get("turn"), dict) else {}
                active.turn_id = turn.get("id")
                if not active.turn_id:
                    raise AgentRuntimeError(RuntimeErrorCode.PROTOCOL, "AI 运行时未返回任务 ID")
                on_event(RuntimeEvent(RuntimeEventType.STARTED, "AI 任务已启动", active.thread_id))

                started_at = time.monotonic()
                last_message_at = started_at
                first_progress = False
                final_text = ""
                usage: Dict[str, Any] = {}
                while True:
                    now = time.monotonic()
                    if active.cancel_requested.is_set():
                        raise AgentRuntimeError(RuntimeErrorCode.CANCELLED, "生成已取消")
                    if now - started_at >= self.total_timeout:
                        raise AgentRuntimeError(RuntimeErrorCode.TOTAL_TIMEOUT, "AI 生成超过总时长限制")
                    if not first_progress and now - started_at >= self.first_progress_timeout:
                        raise AgentRuntimeError(RuntimeErrorCode.FIRST_PROGRESS_TIMEOUT, "AI 运行时长时间没有进度")
                    if first_progress and now - last_message_at >= self.silence_timeout:
                        raise AgentRuntimeError(RuntimeErrorCode.SILENCE_TIMEOUT, "AI 运行时响应中断")
                    wait_for = min(1.0, self.total_timeout - (now - started_at))
                    message = self._read(process, selector, wait_for)
                    if message is None:
                        continue
                    last_message_at = time.monotonic()
                    method = message.get("method")
                    params = message.get("params") if isinstance(message.get("params"), dict) else {}
                    if method in {"turn/started", "item/started", "item/completed", "item/agentMessage/delta"}:
                        if not first_progress:
                            first_progress = True
                            on_event(RuntimeEvent(RuntimeEventType.PROGRESS, "AI 正在生成结构化结果", active.thread_id))
                    if method == "item/completed":
                        item = params.get("item") if isinstance(params.get("item"), dict) else {}
                        if item.get("type") == "agentMessage" and item.get("text"):
                            final_text = str(item["text"])
                    elif method == "thread/tokenUsage/updated":
                        usage_value = params.get("tokenUsage", params.get("usage", {}))
                        if isinstance(usage_value, dict):
                            usage = usage_value
                    elif method == "turn/completed":
                        completed = params.get("turn") if isinstance(params.get("turn"), dict) else {}
                        turn_terminal = True
                        status = completed.get("status")
                        if status == "interrupted":
                            raise AgentRuntimeError(RuntimeErrorCode.CANCELLED, "生成已取消")
                        if status != "completed":
                            raise self._error_from_turn(completed)
                        break

                if not final_text:
                    raise AgentRuntimeError(RuntimeErrorCode.INVALID_OUTPUT, "AI 运行时没有返回最终结果")
                try:
                    output = json.loads(final_text)
                except (TypeError, ValueError):
                    raise AgentRuntimeError(RuntimeErrorCode.INVALID_OUTPUT, "AI 返回内容不符合结构要求")
                if not isinstance(output, dict):
                    raise AgentRuntimeError(RuntimeErrorCode.INVALID_OUTPUT, "AI 返回内容不符合结构要求")
                terminal_sent = True
                on_event(RuntimeEvent(RuntimeEventType.COMPLETED, "生成完成", active.thread_id, usage))
                return RuntimeResult(output=output, usage=usage, session_id=active.thread_id)
            except AgentRuntimeError as exc:
                if not terminal_sent:
                    terminal_type = (
                        RuntimeEventType.CANCELLED if exc.code == RuntimeErrorCode.CANCELLED else RuntimeEventType.FAILED
                    )
                    on_event(RuntimeEvent(terminal_type, exc.safe_message, active.thread_id))
                    terminal_sent = True
                raise
            finally:
                if active.thread_id and active.turn_id and not turn_terminal and process.poll() is None:
                    try:
                        self._send(
                            process,
                            {
                                "method": "turn/interrupt",
                                "id": 89,
                                "params": {"threadId": active.thread_id, "turnId": active.turn_id},
                            },
                        )
                        interrupt_deadline = time.monotonic() + min(2.0, self.handshake_timeout)
                        while time.monotonic() < interrupt_deadline:
                            pending = self._read(process, selector, interrupt_deadline - time.monotonic())
                            if pending is None:
                                break
                            if pending.get("method") == "turn/completed":
                                break
                    except (AgentRuntimeError, BrokenPipeError, OSError):
                        pass
                if active.thread_id and process.poll() is None:
                    try:
                        self._request(
                            process,
                            selector,
                            90,
                            "thread/delete",
                            {"threadId": active.thread_id},
                            min(2.0, self.handshake_timeout),
                        )
                    except (AgentRuntimeError, BrokenPipeError, OSError):
                        pass
                selector.close()
                self._stop_process(process)
                with self._lock:
                    self._active.pop(request.task_id, None)
                self._read_buffers.pop(process.pid, None)

    def _stop_process(self, process: subprocess.Popen) -> None:
        if process.poll() is not None:
            return
        try:
            os.killpg(process.pid, signal.SIGTERM)
            process.wait(timeout=self.terminate_timeout)
        except (ProcessLookupError, subprocess.TimeoutExpired):
            if process.poll() is None:
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                try:
                    process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    LOG.warning("codex app-server process group did not exit task_pid=%s", process.pid)

    def cancel(self, task_id: str) -> bool:
        with self._lock:
            active = self._active.get(task_id)
        if not active:
            return False
        active.cancel_requested.set()
        if active.thread_id and active.turn_id and active.process.poll() is None:
            try:
                self._send(
                    active.process,
                    {
                        "method": "turn/interrupt",
                        "id": 80,
                        "params": {"threadId": active.thread_id, "turnId": active.turn_id},
                    },
                )
            except (AgentRuntimeError, BrokenPipeError, OSError):
                pass
        return True
