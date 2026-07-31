#!/usr/bin/env python3

import html
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


UPDATE_INTERVAL_SECONDS = 60
MAX_PLAN_ITEMS = 10
MAX_PLAN_ITEM_LENGTH = 240
PLAN_PROGRESS_START = "<!-- codex-plan-progress:start -->"
PLAN_PROGRESS_END = "<!-- codex-plan-progress:end -->"


def sanitize_markdown(value):
    text = " ".join(str(value).split())[:MAX_PLAN_ITEM_LENGTH]
    text = html.escape(text, quote=False).replace("@", "@\u200b")
    for character in ("\\", "`", "*", "_", "[", "]"):
        text = text.replace(character, f"\\{character}")
    return text


class ProgressState:
    def __init__(self):
        self.phase = "已接收请求，正在准备执行环境。"
        self.plan_items = []
        self.turn_started = False
        self.turn_finished = False
        self.activity_started = False
        self.command_ids = set()
        self.file_change_ids = set()
        self.web_search_ids = set()

    def consume(self, event):
        event_type = event.get("type", "")
        item = event.get("item") if isinstance(event.get("item"), dict) else {}
        item_type = item.get("type", "")
        item_id = str(item.get("id", ""))

        if event_type == "turn.started":
            self.turn_started = True
            self.phase = "正在分析需求并制定执行计划。"
            return True

        if item_type == "todo_list" and event_type in {"item.started", "item.updated", "item.completed"}:
            items = item.get("items") if isinstance(item.get("items"), list) else []
            self.plan_items = [
                {
                    "text": entry.get("text", ""),
                    "completed": entry.get("completed") is True,
                }
                for entry in items[:MAX_PLAN_ITEMS]
                if isinstance(entry, dict) and str(entry.get("text", "")).strip()
            ]
            self.phase = "执行计划已生成，正在按计划处理。"
            return True

        activity_force = False
        if item_type == "command_execution" and event_type == "item.started" and item_id not in self.command_ids:
            self.command_ids.add(item_id)
            activity_force = not self.activity_started
        elif item_type == "file_change" and event_type in {"item.started", "item.completed"}:
            if item_id not in self.file_change_ids:
                self.file_change_ids.add(item_id)
                activity_force = not self.activity_started
        elif item_type == "web_search" and event_type == "item.started" and item_id not in self.web_search_ids:
            self.web_search_ids.add(item_id)
            activity_force = not self.activity_started

        if activity_force:
            self.activity_started = True
            self.phase = "正在按计划执行修改与检查。"
            return True

        if event_type == "turn.completed":
            self.turn_finished = True
            self.phase = "Codex 执行完成，正在验证结果并准备发布。"
            return True

        if event_type in {"turn.failed", "error"}:
            self.turn_finished = True
            self.phase = "Codex 执行遇到问题，正在整理可交付结果。"
            return True

        return False

    def render(self):
        plan_ready = bool(self.plan_items)
        execution_started = self.activity_started or plan_ready
        lines = [
            "<!-- codex-live-progress -->",
            "## Codex 正在处理",
            "",
            self.phase,
            "",
            "### 当前阶段",
            "",
            "- [x] 已接收请求",
            f"- [{'x' if plan_ready else ' '}] {'已生成执行计划' if plan_ready else '正在分析并制定计划'}",
            f"- [{'x' if self.turn_finished else ' '}] {'执行完成' if self.turn_finished else ('正在执行' if execution_started else '等待执行')}",
            f"- [ ] {'正在验证并准备发布' if self.turn_finished else '验证并发布'}",
        ]

        lines.extend(["", PLAN_PROGRESS_START])
        if self.plan_items:
            lines.extend(["", "### 执行计划", ""])
            highlighted_pending = False
            for entry in self.plan_items:
                completed = entry["completed"]
                marker = "x" if completed else " "
                prefix = ""
                if not completed and not highlighted_pending:
                    prefix = "🔄 "
                    highlighted_pending = True
                lines.append(f"- [{marker}] {prefix}{sanitize_markdown(entry['text'])}")
        lines.append(PLAN_PROGRESS_END)

        lines.extend(
            [
                "",
                (
                    f"活动汇总：命令 {len(self.command_ids)} · "
                    f"文件变更 {len(self.file_change_ids)} · 网络检索 {len(self.web_search_ids)}"
                ),
                "",
                "<sub>该评论会持续更新，任务完成后将替换为最终结果。</sub>",
            ]
        )
        return "\n".join(lines)


class GitHubCommentClient:
    def __init__(self):
        self.comment_id = os.environ.get("CODEX_PROGRESS_COMMENT_ID", "").strip()
        self.token = os.environ.get("CODEX_PROGRESS_TOKEN", "").strip()
        self.repository = os.environ.get("GITHUB_REPOSITORY", "").strip()
        self.api_url = os.environ.get("GITHUB_API_URL", "https://api.github.com").rstrip("/")

    @property
    def enabled(self):
        return self.comment_id.isdigit() and bool(self.token) and self.repository.count("/") == 1

    def update(self, body):
        if not self.enabled:
            return False

        owner, repo = self.repository.split("/", 1)
        url = (
            f"{self.api_url}/repos/{urllib.parse.quote(owner, safe='')}"
            f"/{urllib.parse.quote(repo, safe='')}/issues/comments/{self.comment_id}"
        )
        request = urllib.request.Request(
            url,
            data=json.dumps({"body": body}, ensure_ascii=False).encode("utf-8"),
            method="PATCH",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
                "User-Agent": "talebook-codex-progress",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return 200 <= response.status < 300
        except (OSError, urllib.error.HTTPError, urllib.error.URLError) as error:
            print(f"Codex progress update skipped: {error}", file=sys.stderr)
            return False


def run(stream, now=time.monotonic):
    state = ProgressState()
    client = GitHubCommentClient()
    last_body = ""
    last_update_at = float("-inf")

    for raw_line in stream:
        try:
            event = json.loads(raw_line)
        except (TypeError, json.JSONDecodeError):
            print("Ignoring malformed Codex progress event.", file=sys.stderr)
            continue
        if not isinstance(event, dict):
            continue

        force = state.consume(event)
        body = state.render()
        current_time = now()
        due = current_time - last_update_at >= UPDATE_INTERVAL_SECONDS
        if body != last_body and (force or due):
            last_update_at = current_time
            if client.update(body):
                last_body = body

    return 0


if __name__ == "__main__":
    raise SystemExit(run(sys.stdin))
