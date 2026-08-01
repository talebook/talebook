import importlib.util
import io
import json
from pathlib import Path


ROOT = Path(__file__).parents[1]
REPORTER_PATH = ROOT / ".github" / "codex" / "scripts" / "codex_progress_reporter.py"


def load_reporter():
    spec = importlib.util.spec_from_file_location("codex_progress_reporter", REPORTER_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_plan_progress_has_stable_boundaries_before_and_after_plan_generation():
    reporter = load_reporter()
    state = reporter.ProgressState()

    empty_body = state.render()
    assert reporter.PLAN_PROGRESS_START in empty_body
    assert reporter.PLAN_PROGRESS_END in empty_body
    assert empty_body.index(reporter.PLAN_PROGRESS_START) < empty_body.index(reporter.PLAN_PROGRESS_END)
    assert "### 执行计划" not in empty_body

    state.consume(
        {
            "type": "item.updated",
            "item": {
                "id": "plan-1",
                "type": "todo_list",
                "items": [
                    {"text": "Inspect behavior", "completed": True},
                    {"text": "Preserve progress", "completed": False},
                ],
            },
        }
    )
    plan_body = state.render()
    plan_section = plan_body.split(reporter.PLAN_PROGRESS_START, 1)[1].split(reporter.PLAN_PROGRESS_END, 1)[0]

    assert plan_section.count("### 执行计划") == 1
    assert "- [x] Inspect behavior" in plan_section
    assert "- [ ] 🔄 Preserve progress" in plan_section


def test_plan_is_rendered_without_markdown_injection_or_mentions():
    reporter = load_reporter()
    state = reporter.ProgressState()

    force = state.consume(
        {
            "type": "item.started",
            "item": {
                "id": "plan-1",
                "type": "todo_list",
                "items": [
                    {"text": "Inspect @maintainer and [unsafe](destination)", "completed": True},
                    {"text": "Implement `<script>` safely", "completed": False},
                    {"text": "Run tests", "completed": False},
                ],
            },
        }
    )

    body = state.render()

    assert force is True
    assert "### 执行计划" in body
    assert "- [x] Inspect @\u200bmaintainer" in body
    assert "\\[unsafe\\]" in body
    assert "destination" in body
    assert "&lt;script&gt;" in body
    assert "🔄 Implement" in body


def test_activity_events_are_counted_without_exposing_payloads():
    reporter = load_reporter()
    state = reporter.ProgressState()

    assert state.consume({"type": "turn.started"}) is True
    assert (
        state.consume(
            {
                "type": "item.started",
                "item": {
                    "id": "command-1",
                    "type": "command_execution",
                    "command": "printenv TOP_SECRET",
                    "aggregated_output": "TOP_SECRET=do-not-publish",
                },
            }
        )
        is True
    )
    state.consume(
        {
            "type": "item.completed",
            "item": {"id": "file-1", "type": "file_change", "changes": [{"path": "secret.txt"}]},
        }
    )
    state.consume(
        {
            "type": "item.started",
            "item": {"id": "search-1", "type": "web_search", "query": "private query"},
        }
    )

    body = state.render()

    assert "命令 1" in body
    assert "文件变更 1" in body
    assert "网络检索 1" in body
    assert "TOP_SECRET" not in body
    assert "do-not-publish" not in body
    assert "secret.txt" not in body
    assert "private query" not in body


def test_reporter_patches_the_existing_comment_and_keeps_running_after_api_errors(monkeypatch):
    reporter = load_reporter()
    requests = []

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

    def urlopen(request, timeout):
        requests.append(
            {
                "url": request.full_url,
                "authorization": request.headers["Authorization"],
                "payload": json.loads(request.data),
                "timeout": timeout,
            }
        )
        if len(requests) == 1:
            raise reporter.urllib.error.URLError("temporary failure")
        return Response()

    monkeypatch.setattr(reporter.urllib.request, "urlopen", urlopen)
    monkeypatch.setenv("CODEX_PROGRESS_COMMENT_ID", "123")
    monkeypatch.setenv("CODEX_PROGRESS_TOKEN", "test-token")
    monkeypatch.setenv("GITHUB_REPOSITORY", "talebook/talebook")
    monkeypatch.setenv("GITHUB_API_URL", "https://api.github.test")

    events = "\n".join(
        [
            json.dumps({"type": "turn.started"}),
            json.dumps(
                {
                    "type": "item.started",
                    "item": {
                        "id": "plan-1",
                        "type": "todo_list",
                        "items": [{"text": "Inspect", "completed": False}],
                    },
                }
            ),
            json.dumps({"type": "turn.completed"}),
            "{not-json}",
        ]
    )

    assert reporter.run(io.StringIO(events), now=lambda: 1000) == 0

    assert len(requests) == 3
    assert all(request["url"] == "https://api.github.test/repos/talebook/talebook/issues/comments/123" for request in requests)
    assert all(request["authorization"] == "Bearer test-token" for request in requests)
    assert "正在验证结果并准备发布" in requests[-1]["payload"]["body"]
