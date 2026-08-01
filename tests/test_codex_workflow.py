import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest
import yaml


ROOT = Path(__file__).parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "codex.yml"
ACTIONLINT_CONFIG = ROOT / ".github" / "actionlint.yaml"
PROMPT = ROOT / ".github" / "codex" / "prompts" / "comment-response.md"
PROGRESS_REPORTER = ROOT / ".github" / "codex" / "scripts" / "codex_progress_reporter.py"
DEV_CONTAINER_OPTIONS = (
    "--user 1001:1001 --cap-drop ALL --security-opt no-new-privileges --tmpfs /data:rw,uid=1001,gid=1001,mode=0755"
)
requires_node = pytest.mark.skipif(
    shutil.which("node") is None,
    reason="Node.js is required to execute the real actions/github-script response body",
)


def workflow_text():
    return WORKFLOW.read_text(encoding="utf-8")


def workflow_data():
    return yaml.safe_load(workflow_text())


def codex_job():
    return workflow_data()["jobs"]["codex"]


def sandbox_smoke_job():
    return workflow_data()["jobs"]["codex-sandbox-smoke"]


def workflow_step(*, step_id=None, name=None):
    for step in codex_job()["steps"]:
        if step_id is not None and step.get("id") == step_id:
            return step
        if name is not None and step.get("name") == name:
            return step
    raise AssertionError(f"workflow step not found: id={step_id!r}, name={name!r}")


def smoke_workflow_step(*, name):
    for step in sandbox_smoke_job()["steps"]:
        if step.get("name") == name:
            return step
    raise AssertionError(f"smoke workflow step not found: name={name!r}")


def prompt_text():
    return PROMPT.read_text(encoding="utf-8")


def progress_reporter_text():
    return PROGRESS_REPORTER.read_text(encoding="utf-8")


def run_publish_gate(
    tmp_path,
    result,
    *,
    changed=False,
    publish_block_reason="",
    issue_branches=(),
    run_id="123456",
):
    tmp_path.mkdir(parents=True)
    subprocess.run(["git", "init", "-b", "main"], cwd=tmp_path, check=True, capture_output=True, text=True)
    (tmp_path / "tracked.txt").write_text("base\n", encoding="utf-8")
    subprocess.run(["git", "add", "tracked.txt"], cwd=tmp_path, check=True, capture_output=True, text=True)
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Codex Test",
            "-c",
            "user.email=codex@example.invalid",
            "-c",
            "commit.gpgsign=false",
            "commit",
            "-m",
            "test: base",
        ],
        cwd=tmp_path,
        check=True,
        capture_output=True,
        text=True,
    )
    target_sha = subprocess.run(
        ["git", "rev-parse", "HEAD"], cwd=tmp_path, check=True, capture_output=True, text=True
    ).stdout.strip()
    (tmp_path / ".git" / "info" / "exclude").write_text(".codex-result.json\n", encoding="utf-8")
    (tmp_path / ".codex-result.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
    if changed:
        (tmp_path / "tracked.txt").write_text("changed\n", encoding="utf-8")

    output_file = tmp_path / ".git" / "publish-gate-output"
    env = {
        **os.environ,
        "CODEX_OUTCOME": "success",
        "TARGET_SHA": target_sha,
        "TARGET_REF": "main",
        "IS_PR": "false",
        "ISSUE_NUMBER": "875",
        "EXISTING_ISSUE_BRANCH": "",
        "PUBLISH_BLOCK_REASON": publish_block_reason,
        "ISSUE_BRANCHES_JSON": json.dumps(issue_branches),
        "RUN_ID": run_id,
        "RESULT_FILE": ".codex-result.json",
        "GITHUB_OUTPUT": str(output_file),
    }
    subprocess.run(
        ["bash", "-c", workflow_step(step_id="publish_gate")["run"]],
        cwd=tmp_path,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )
    return dict(line.split("=", 1) for line in output_file.read_text(encoding="utf-8").splitlines())


def run_response_step(
    tmp_path,
    *,
    progress_body,
    progress_comment_id="456",
    get_comment_error=False,
    update_comment_error=False,
    tests=(),
):
    result_file = tmp_path / ".codex-result.json"
    result_file.write_text(
        json.dumps(
            {
                "delivery": "reply",
                "feature": "",
                "commit_message": "",
                "summary": "已完成处理，并保留执行计划。",
                "tests": list(tests),
            },
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    final_message = tmp_path / "codex-final.md"
    final_message.write_text("fallback", encoding="utf-8")
    trace_file = tmp_path / "response-trace.json"
    response_script = workflow_step(name="Post Codex response")["with"]["script"]
    harness = (
        """
const harnessFs = require("fs");
const calls = [];
const github = {
  rest: {
    issues: {
      getComment: async (args) => {
        calls.push({name: "getComment", args});
        if (process.env.TEST_GET_COMMENT_ERROR === "true") {
          throw new Error("get comment failed");
        }
        return {data: {body: process.env.TEST_PROGRESS_BODY}};
      },
      updateComment: async (args) => {
        calls.push({name: "updateComment", args});
        if (process.env.TEST_UPDATE_COMMENT_ERROR === "true") {
          throw new Error("update comment failed");
        }
        return {data: {id: args.comment_id}};
      },
      createComment: async (args) => {
        calls.push({name: "createComment", args});
        return {data: {id: 789}};
      },
    },
  },
};
const context = {
  serverUrl: "https://github.test",
  repo: {owner: "talebook", repo: "talebook"},
};
const core = {
  warning: (message) => calls.push({name: "warning", message}),
};
const finish = (error) => {
  harnessFs.writeFileSync(
    process.env.TEST_TRACE_FILE,
    JSON.stringify({calls, error: error ? error.message : ""}),
  );
};
(async () => {
"""
        + response_script
        + """
})().then(
  () => finish(null),
  (error) => {
    finish(error);
    process.exitCode = 1;
  },
);
"""
    )
    env = {
        **os.environ,
        "CODEX_FINAL_MESSAGE": str(final_message),
        "CODEX_RESULT_FILE": str(result_file),
        "CODEX_RUN_OUTCOME": "success",
        "CODEX_CONTRACT_VALID": "true",
        "CODEX_DELIVERY": "reply",
        "CODEX_GATE_READY": "true",
        "CODEX_GATE_REASON": "",
        "CODEX_NO_CHANGES": "true",
        "CODEX_APP_TOKEN_OUTCOME": "skipped",
        "CODEX_PUBLISH_OUTCOME": "skipped",
        "CODEX_PUBLISH_BRANCH": "",
        "CODEX_COMMIT_SHA": "",
        "IS_PR": "false",
        "EXISTING_ISSUE_BRANCH": "",
        "EXISTING_PR_NUMBER": "",
        "CREATED_PR_OUTCOME": "skipped",
        "CREATED_PR_URL": "",
        "CODEX_HAS_PATCH": "false",
        "CODEX_ARTIFACT_NAME": "codex-patch-test",
        "ISSUE_NUMBER": "77",
        "CODEX_PROGRESS_COMMENT_ID": progress_comment_id,
        "TEST_PROGRESS_BODY": progress_body,
        "TEST_GET_COMMENT_ERROR": "true" if get_comment_error else "false",
        "TEST_UPDATE_COMMENT_ERROR": "true" if update_comment_error else "false",
        "TEST_TRACE_FILE": str(trace_file),
    }
    completed = subprocess.run(
        ["node", "-e", harness],
        cwd=tmp_path,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    return completed, json.loads(trace_file.read_text(encoding="utf-8"))


def test_employee_job_is_bounded_and_serialized_per_request_target():
    job = codex_job()

    assert job["timeout-minutes"] == 25
    assert job["concurrency"] == {
        "group": "codex-${{ github.repository }}-${{ github.event.issue.number || github.event.pull_request.number }}",
        "cancel-in-progress": False,
    }


def test_codex_runs_in_the_hardened_dev_container_without_runtime_install_steps():
    job = codex_job()
    steps = codex_job()["steps"]
    checkout = workflow_step(name="Checkout repository")
    prepare = workflow_step(name="Prepare Codex runtime and repository")
    verify = workflow_step(name="Verify development environment and outer sandbox")
    synchronize = workflow_step(name="Synchronize project dependencies")
    restore_auth = workflow_step(name="Restore Codex ChatGPT auth")
    run_codex = workflow_step(name="Run Codex")

    assert job["runs-on"] == "ubuntu-latest"
    assert job["container"] == {
        "image": "talebook/talebook:dev",
        "options": DEV_CONTAINER_OPTIONS,
    }
    assert job["defaults"] == {"run": {"shell": "bash"}}
    assert "env" not in workflow_data()
    assert job["env"]["USER"] == "codex"
    assert job["env"]["LOGNAME"] == "codex"
    assert all(
        unsafe not in job["container"]["options"]
        for unsafe in ("--user root", "privileged", "SYS_ADMIN", "SYS_PTRACE", "seccomp=unconfined", "/var/run/docker.sock")
    )
    assert all(
        probe in verify["run"]
        for probe in (
            "ebook-convert --version",
            'python3 -c "import calibre; print(calibre.__file__)"',
            "python3 --version",
            "node --version",
            "npm --version",
            "make --version",
            "python3 -m pytest --version",
            "ruff --version",
            "codex --version",
        )
    )
    assert all(
        name not in [step.get("name") for step in steps]
        for name in (
            "Setup Node for Codex runtime",
            "Setup Python for Codex validation",
            "Install Codex CLI and test tools",
            "Setup bubblewrap and AppArmor for sandbox",
        )
    )
    assert synchronize["run"] == "make init\nnpm --prefix app ci\n"
    assert (
        steps.index(checkout)
        < steps.index(prepare)
        < steps.index(verify)
        < steps.index(synchronize)
        < steps.index(restore_auth)
    )
    assert steps.index(restore_auth) < steps.index(run_codex)


def test_codex_runtime_home_and_repository_trust_are_prepared_before_verification():
    prepare = workflow_step(name="Prepare Codex runtime and repository")
    verify = workflow_step(name="Verify development environment and outer sandbox")

    assert prepare["if"] == ("steps.context.outputs.authorized == 'true' && steps.context.outputs.supported_target == 'true'")
    assert prepare["run"] == (
        "set -euo pipefail\n"
        'mkdir -p "$CODEX_HOME"\n'
        'chmod 700 "$CODEX_HOME"\n'
        'git config --global --add safe.directory "$GITHUB_WORKSPACE"\n'
        'git config --global --get-all safe.directory | grep -Fqx "$GITHUB_WORKSPACE"\n'
        "git status --short\n"
    )
    assert "safe.directory '*'" not in prepare["run"]
    assert 'safe.directory "*"' not in prepare["run"]
    assert 'sandbox_mode=\\"danger-full-access\\"' in verify["run"]
    assert 'approval_policy=\\"never\\"' in verify["run"]


def test_only_repository_writers_can_trigger_the_employee():
    job = codex_job()
    job_condition = job["if"]
    context_script = workflow_step(step_id="context")["with"]["script"]

    assert workflow_data()["permissions"] == {"contents": "read"}
    assert "!endsWith(github.actor, '[bot]')" in job_condition
    assert "github.actor != 'github-actions[bot]'" not in job_condition
    assert all(role in job_condition for role in ("OWNER", "MEMBER", "COLLABORATOR"))
    assert all(trigger in job_condition for trigger in ("@codex", "/codex"))
    assert "github.rest.repos.getCollaboratorPermissionLevel" in context_script
    assert '["admin", "maintain", "write"].includes(permission)' in context_script


def test_outer_container_mode_filters_shell_tokens_without_claiming_inner_isolation():
    restore_script = workflow_step(name="Restore Codex ChatGPT auth")["run"]
    run_script = workflow_step(step_id="run_codex")["run"]

    required_fragments = (
        'sandbox_mode = "danger-full-access"',
        'approval_policy = "never"',
        "[shell_environment_policy]",
        'inherit = "core"',
        "ignore_default_excludes = false",
        'TMPDIR = "$GITHUB_WORKSPACE/.codex-runtime"',
        "'.codex/tmp/'",
        '"GITHUB_TOKEN"',
        '"CODEX_AUTH_JSON"',
    )
    assert all(fragment in restore_script for fragment in required_fragments)
    assert "default_permissions" not in restore_script
    assert "[permissions." not in restore_script
    assert "network_proxy" not in restore_script
    assert "[permissions.codex-employee.network" not in restore_script
    assert "--sandbox danger-full-access" in run_script
    assert "--sandbox workspace-write" not in workflow_text()
    assert 'sandbox_mode = "workspace-write"' not in restore_script


def test_outer_container_verification_fails_closed_before_codex_runs():
    verify_script = workflow_step(name="Verify development environment and outer sandbox")["run"]
    step_names = [step.get("name") for step in codex_job()["steps"]]

    assert "continuing" not in verify_script
    assert "::error::The dev container must not run as root" in verify_script
    assert "::error::The dev container must run only as uid/gid 1001:1001" in verify_script
    assert "::error::The dev container retained supplementary groups" in verify_script
    assert "::error::The dev container retained Linux capabilities" in verify_script
    assert "::error::The dev container does not enforce no-new-privileges" in verify_script
    assert "::error::The dev container does not use the default seccomp filter" in verify_script
    assert "::error::The ephemeral /data filesystem is not writable" in verify_script
    assert "::error::Docker socket is writable by the Codex user" in verify_script
    assert "::error::Docker socket connection was not denied" in verify_script
    assert "::error::Codex external-sandbox self-test failed" in verify_script
    assert 'codex sandbox -c "sandbox_mode=\\"danger-full-access\\""' in verify_script
    assert '[ "$(id -u)" -eq 0 ]' in verify_script
    assert '[ "$(id -u):$(id -g)" != "1001:1001" ]' in verify_script
    assert '[ "$(id -G)" != "1001" ]' in verify_script
    assert 'grep -Eq "^CapEff:[[:space:]]*0+$" /proc/1/status' in verify_script
    assert 'grep -Eq "^NoNewPrivs:[[:space:]]*1$" /proc/1/status' in verify_script
    assert 'grep -Eq "^Seccomp:[[:space:]]*2$" /proc/1/status' in verify_script
    assert "[ ! -w /data ]" in verify_script
    assert 'stat -c "docker_socket=%A uid=%u gid=%g" /var/run/docker.sock' in verify_script
    assert "socket.socket(socket.AF_UNIX)" in verify_script
    assert 'connect_ex("/var/run/docker.sock")' in verify_script
    assert '"1" | "13"' in verify_script
    assert "sudo" not in verify_script
    assert "bwrap" not in verify_script
    assert "AppArmor" not in verify_script
    assert step_names.index("Verify development environment and outer sandbox") < step_names.index("Run Codex")


def test_pull_requests_run_a_secretless_full_dev_container_smoke_job():
    triggers = workflow_data()[True]
    smoke = sandbox_smoke_job()
    smoke_steps = smoke["steps"]
    main_verify_script = workflow_step(name="Verify development environment and outer sandbox")["run"]
    smoke_verify = smoke_workflow_step(name="Verify development environment and outer sandbox")
    full_tests = smoke_workflow_step(name="Run full project test suite")

    assert triggers["pull_request"] == {"paths": [".github/workflows/codex.yml"]}
    assert smoke["name"] == "Verify Codex dev container on hosted runner"
    assert smoke["if"] == "github.event_name == 'pull_request'"
    assert smoke["runs-on"] == "ubuntu-latest"
    assert smoke["timeout-minutes"] == 10
    assert smoke["container"] == codex_job()["container"]
    assert smoke["defaults"] == {"run": {"shell": "bash"}}
    assert smoke["env"]["CODEX_HOME"] == "${{ github.workspace }}/.codex-smoke-home"
    assert smoke["env"]["USER"] == "codex"
    assert smoke["env"]["LOGNAME"] == "codex"
    assert all("secrets." not in str(step) for step in smoke_steps)
    assert smoke_steps[0] == {
        "name": "Checkout repository",
        "uses": "actions/checkout@v4",
    }
    assert smoke_verify["run"] == main_verify_script
    assert smoke_workflow_step(name="Synchronize project dependencies")["run"] == "make init\nnpm --prefix app ci\n"
    assert full_tests["run"] == "python3 -m pytest tests\n"
    assert smoke_steps.index(smoke_verify) < smoke_steps.index(full_tests)


def test_trusted_assets_follow_the_immutable_workflow_version_and_acknowledge_first():
    context = workflow_step(step_id="context")
    script = context["with"]["script"]

    assert context["env"]["WORKFLOW_SHA"] == "${{ github.workflow_sha }}"
    assert "const workflowSha = process.env.WORKFLOW_SHA;" in script
    assert 'path: ".github/codex/prompts/comment-response.md"' in script
    assert 'path: ".github/codex/scripts/codex_progress_reporter.py"' in script
    assert 'path: "requirements-test.txt"' not in script
    assert script.count("ref: workflowSha") == 2
    assert "ref: defaultBranch" not in script
    assert script.index("reactions.createForIssueComment") < script.index("issues.createComment")
    assert script.index("issues.createComment") < script.index('path: ".github/codex/prompts/comment-response.md"')
    assert "github.rest.issues.updateComment" in script
    assert "无法加载受信任的 Codex 运行资源" in script
    assert "const codexPromptTemplate = `${runnerTemp}/codex-comment-response.md`;" in script
    assert 'core.exportVariable("CODEX_PROMPT_TEMPLATE", codexPromptTemplate)' in script
    assert 'core.exportVariable("CODEX_PROGRESS_REPORTER", codexProgressReporter)' in script
    assert "codexTestRequirements" not in script
    assert "CODEX_TEST_REQUIREMENTS" not in script
    assert 'cat "$CODEX_PROMPT_TEMPLATE"' in workflow_step(name="Build Codex prompt")["run"]
    assert "python3 .github/codex/scripts/codex_progress_reporter.py" not in workflow_text()


def test_request_context_rejects_missing_or_external_pr_head_repositories():
    context_script = workflow_step(step_id="context")["with"]["script"]
    checkout = workflow_step(name="Checkout repository")

    assert 'const headRepoFullName = pr?.head?.repo?.full_name || "";' in context_script
    assert "该 Pull Request 的 head 仓库已不可用。" in context_script
    assert "headRepo: headRepoFullName" in context_script
    assert "sameRepository: headRepoFullName === `${owner}/${repo}`" in context_script
    assert "pr.head.repo.full_name" not in context_script
    assert checkout["with"]["ref"] == "${{ steps.context.outputs.target_sha }}"
    assert checkout["with"]["persist-credentials"] is False
    assert "CODEX_PR_DIFF" not in workflow_text()
    assert "CODEX_PR_FILES_JSON" not in workflow_text()


def test_issue_comments_ignore_historical_pr_branches_and_defer_active_branch_conflicts():
    context_script = workflow_step(step_id="context")["with"]["script"]

    assert "github.rest.git.listMatchingRefs" in context_script
    assert "codex/issue-${issueNumber}-" in context_script
    assert "const activeIssueTargets = [];" in context_script
    assert "const historicalIssueBranches = [];" in context_script
    assert "historicalIssueBranches.push(branchName);" in context_script
    assert "activeIssueTargets.push" in context_script
    assert "activeIssueTargets.length === 1" in context_script
    assert "activeIssueTargets.length > 1" in context_script
    assert "已存在多个活动 Codex 分支" in context_script
    assert "publishBlockReason" in context_script
    assert 'core.setOutput("publish_block_reason", publishBlockReason);' in context_script
    assert 'core.setOutput("issue_branches_json", JSON.stringify(issueBranches));' in context_script
    assert "属于已关闭或已合并的 Pull Request" not in context_script


def test_agent_contract_distinguishes_conversational_replies_from_code_publication():
    run_step = workflow_step(step_id="run_codex")
    prompt = prompt_text()

    assert "timeout --signal=TERM --kill-after=30s 20m env -u CODEX_PROGRESS_TOKEN codex exec" in run_step["run"]
    assert "--sandbox danger-full-access" in run_step["run"]
    assert "--json" in run_step["run"]
    assert "tee .codex/tmp/codex-events.jsonl" in run_step["run"]
    assert run_step["env"]["CODEX_PROGRESS_TOKEN"] == "${{ steps.interaction_token.outputs.token }}"
    assert all(field in prompt for field in ('"delivery"', '"feature"', '"commit_message"', '"summary"', '"tests"'))
    assert '"delivery": "reply"' in prompt
    assert '"delivery": "publish"' in prompt
    assert '"ready_to_publish"' not in prompt
    assert "不得根据关键词预先判断" in prompt
    assert "纯问答" in prompt
    assert ".codex-result.json" in prompt
    assert ".github/workflows/" in prompt
    assert "不得自行 commit 或 push" in prompt
    assert "当前 PR head" in prompt
    assert "patch artifact" not in prompt


def test_agent_prompt_and_all_maintainer_facing_output_are_in_chinese():
    prompt = prompt_text()
    response_script = workflow_step(name="Post Codex response")["with"]["script"]

    assert "Talebook Codex 维护者请求" in prompt
    assert "必须使用中文" in prompt
    assert "执行计划、进度说明、结构化摘要和最终答复" in prompt
    assert "必须先使用计划工具创建中文执行计划" in prompt
    assert "及时更新计划状态" in prompt
    assert "本文件不经过 vue-i18n" in prompt
    assert all(text in response_script for text in ("### 验证", "已发布提交", "未发布", "无需提交仓库改动", "恢复补丁"))
    assert all(
        text not in response_script
        for text in (
            "### Validation",
            "Published commit",
            "Not published",
            "No repository changes were required",
            "Recovery patch",
        )
    )


def test_model_and_reasoning_effort_can_be_overridden_without_enabling_fast_mode():
    job_env = codex_job()["env"]
    restore_script = workflow_step(name="Restore Codex ChatGPT auth")["run"]

    assert job_env["CODEX_MODEL"] == "${{ vars.CODEX_MODEL || 'gpt-5.6-sol' }}"
    assert job_env["CODEX_REASONING_EFFORT"] == "${{ vars.CODEX_REASONING_EFFORT || 'high' }}"
    assert 'model = "$CODEX_MODEL"' in restore_script
    assert 'model_reasoning_effort = "$CODEX_REASONING_EFFORT"' in restore_script
    assert 'service_tier = "fast"' not in restore_script
    assert "fast_mode = true" not in restore_script


def test_publish_gate_rejects_incomplete_or_unsafe_changes():
    gate = workflow_step(step_id="publish_gate")
    script = gate["run"]

    assert gate["env"]["RESULT_FILE"] == ".codex-result.json"
    assert gate["env"]["PUBLISH_BLOCK_REASON"] == "${{ steps.context.outputs.publish_block_reason }}"
    assert '(keys | sort) == ["commit_message", "delivery", "feature", "summary", "tests"]' in script
    assert '(.delivery == "reply" or .delivery == "publish")' in script
    assert 'delivery="$(jq -r \'.delivery\' "$RESULT_FILE")"' in script
    assert 'echo "delivery=$delivery" >> "$GITHUB_OUTPUT"' in script
    assert "ready_to_publish" not in script
    assert 'test("^[a-z0-9]+(-[a-z0-9]+)*$")' in script
    assert "Conventional Commit" in script
    assert "git rev-parse HEAD" in script
    assert "git add -A" in script
    assert "git diff --cached --check" in script
    assert "design -type f -name '*.wip.html'" in script
    assert "^\\.github/workflows/" in script
    assert 'echo "ready=true" >> "$GITHUB_OUTPUT"' in script
    assert 'echo "ready=false" >> "$GITHUB_OUTPUT"' in script


def test_conversational_reply_bypasses_publish_conflicts_only_when_the_diff_is_empty():
    script = workflow_step(step_id="publish_gate")["run"]
    no_change_gate = 'if [ -z "$reason" ] && git diff --cached --quiet; then'
    reply_diff_gate = 'if [ -z "$reason" ] && [ "$delivery" = "reply" ] && [ "$no_changes" != "true" ]; then'
    publish_conflict_gate = 'if [ -z "$reason" ] && [ "$delivery" = "publish" ] && [ -n "$PUBLISH_BLOCK_REASON" ]; then'

    assert 'if [ "$delivery" = "publish" ]; then' in script
    assert 'reject "回复模式不得产生仓库改动。"' in script
    assert 'reject "$PUBLISH_BLOCK_REASON"' in script
    assert script.index(no_change_gate) < script.index(reply_diff_gate)
    assert script.index(reply_diff_gate) < script.index(publish_conflict_gate)


@pytest.mark.skipif(
    any(shutil.which(command) is None for command in ("bash", "git", "jq")),
    reason="发布门禁行为测试需要 bash、git 和 jq",
)
def test_publish_gate_executes_reply_and_publish_paths_against_a_real_git_worktree(tmp_path):
    reply = {
        "delivery": "reply",
        "feature": "",
        "commit_message": "",
        "summary": "当前运行模型由工作流配置决定。",
        "tests": [],
    }
    publish = {
        "delivery": "publish",
        "feature": "conversation-routing",
        "commit_message": "fix(codex): route conversational requests",
        "summary": "已修复纯问答路由。",
        "tests": [{"command": "pytest -q tests/test_codex_workflow.py", "result": "passed"}],
    }

    reply_outputs = run_publish_gate(
        tmp_path / "reply",
        reply,
        publish_block_reason="存在冲突分支。",
    )
    assert reply_outputs == {
        "ready": "false",
        "contract_valid": "true",
        "no_changes": "true",
        "reason": "",
        "delivery": "reply",
        "feature": "",
        "commit_message": "",
        "publish_branch": "",
    }

    changed_reply_outputs = run_publish_gate(tmp_path / "changed-reply", reply, changed=True)
    assert changed_reply_outputs["reason"] == "回复模式不得产生仓库改动。"
    assert changed_reply_outputs["no_changes"] == "false"

    blocked_publish_outputs = run_publish_gate(
        tmp_path / "blocked-publish",
        publish,
        changed=True,
        publish_block_reason="存在冲突分支。",
    )
    assert blocked_publish_outputs["reason"] == "存在冲突分支。"
    assert blocked_publish_outputs["ready"] == "false"

    publish_outputs = run_publish_gate(tmp_path / "publish", publish, changed=True)
    assert publish_outputs["ready"] == "true"
    assert publish_outputs["publish_branch"] == "codex/issue-875-conversation-routing"

    collision_outputs = run_publish_gate(
        tmp_path / "historical-collision",
        publish,
        changed=True,
        issue_branches=["codex/issue-875-conversation-routing"],
    )
    assert collision_outputs["ready"] == "true"
    assert collision_outputs["publish_branch"] == "codex/issue-875-conversation-routing-123456"


def test_repository_wip_gate_runs_before_no_change_classification():
    script = workflow_step(step_id="publish_gate")["run"]
    wip_gate = "find design -type f -name '*.wip.html'"
    no_change_gate = 'if [ -z "$reason" ] && git diff --cached --quiet; then'

    assert script.index(wip_gate) < script.index(no_change_gate)


def test_controlled_publisher_uses_a_short_lived_app_token_and_fast_forward_push():
    token_step = workflow_step(step_id="app_token")
    publish = workflow_step(step_id="publish")

    assert token_step["uses"] == "actions/create-github-app-token@v3"
    assert token_step["with"] == {
        "client-id": "${{ secrets.CODEX_APP_CLIENT_ID }}",
        "private-key": "${{ secrets.CODEX_APP_PRIVATE_KEY }}",
        "permission-contents": "write",
        "permission-issues": "write",
        "permission-pull-requests": "write",
    }
    assert "steps.publish_gate.outputs.ready == 'true'" in token_step["if"]
    assert "git fetch" in publish["run"]
    assert 'remote_sha="$TARGET_SHA"' in publish["run"]
    assert "Remote branch moved while Codex was running" in publish["run"]
    assert '-H "Authorization: Bearer $APP_TOKEN"' in publish["run"]
    assert 'git commit -m "$COMMIT_MESSAGE"' in publish["run"]
    assert 'git push "$authenticated_remote" "HEAD:refs/heads/$PUBLISH_BRANCH"' in publish["run"]
    assert "--force" not in publish["run"]


def test_reply_delivery_never_requests_a_publisher_token_or_creates_a_pull_request():
    token_condition = workflow_step(step_id="app_token")["if"]
    create_pr_condition = workflow_step(step_id="create_issue_pr")["if"]

    assert "steps.publish_gate.outputs.delivery == 'publish'" in token_condition
    assert "steps.publish_gate.outputs.delivery == 'publish'" in create_pr_condition


def test_all_interactive_github_calls_use_the_low_privilege_app_token():
    interaction_token = workflow_step(step_id="interaction_token")
    steps = codex_job()["steps"]

    assert interaction_token["uses"] == "actions/create-github-app-token@v3"
    assert interaction_token["with"] == {
        "client-id": "${{ secrets.CODEX_APP_CLIENT_ID }}",
        "private-key": "${{ secrets.CODEX_APP_PRIVATE_KEY }}",
        "permission-contents": "read",
        "permission-issues": "write",
        "permission-pull-requests": "write",
    }
    assert "if" not in interaction_token
    assert steps.index(interaction_token) < steps.index(workflow_step(step_id="context"))

    interaction_token_ref = "${{ steps.interaction_token.outputs.token }}"
    assert workflow_step(step_id="context")["with"]["github-token"] == interaction_token_ref
    assert workflow_step(name="Explain unsupported target")["with"]["github-token"] == interaction_token_ref
    assert workflow_step(step_id="run_codex")["env"]["CODEX_PROGRESS_TOKEN"] == interaction_token_ref
    assert workflow_step(name="Post Codex response")["with"]["github-token"] == interaction_token_ref

    github_script_steps = [step for step in steps if step.get("uses", "").startswith("actions/github-script@")]
    assert all(step["with"].get("github-token") for step in github_script_steps)
    assert "${{ github.token }}" not in workflow_text()


def test_first_successful_issue_run_creates_one_draft_pull_request():
    create_pr = workflow_step(step_id="create_issue_pr")
    script = create_pr["with"]["script"]

    assert "steps.context.outputs.is_pr != 'true'" in create_pr["if"]
    assert "steps.context.outputs.existing_issue_pr_number == ''" in create_pr["if"]
    assert create_pr["with"]["github-token"] == "${{ steps.app_token.outputs.token }}"
    assert "github.rest.pulls.create" in script
    assert "draft: true" in script
    assert "head: process.env.PUBLISH_BRANCH" in script
    assert "base: process.env.DEFAULT_BRANCH" in script
    assert "Closes #${process.env.ISSUE_NUMBER}" in script


def test_existing_issue_branch_without_a_pr_can_recover_after_a_partial_publish():
    token_condition = workflow_step(step_id="app_token")["if"]
    final_status = workflow_step(step_id="final_status")["run"]
    response_script = workflow_step(name="Post Codex response")["with"]["script"]

    assert "steps.publish_gate.outputs.no_changes == 'true'" in token_condition
    assert "steps.context.outputs.existing_issue_branch != ''" in token_condition
    assert '[ "$CREATED_PR_OUTCOME" != "success" ]' in final_status
    assert "无法为现有 Issue 分支创建 Draft PR" in response_script


def test_failed_publication_keeps_a_recovery_patch_but_success_does_not():
    diff = workflow_step(step_id="diff")
    upload = workflow_step(name="Upload Codex patch")

    assert diff["env"]["PUBLISH_OUTCOME"] == "${{ steps.publish.outcome }}"
    assert 'if [ "$PUBLISH_OUTCOME" = "success" ]' in diff["run"]
    assert 'git diff --cached --quiet "$TARGET_SHA"' in diff["run"]
    assert 'git diff --cached --binary "$TARGET_SHA" > .codex/tmp/codex.patch' in diff["run"]
    assert upload["if"] == "always() && steps.diff.outputs.has_patch == 'true'"


def test_comment_reports_validated_metadata_and_remote_delivery_result():
    response = workflow_step(name="Post Codex response")
    script = response["with"]["script"]

    assert response["env"]["CODEX_CONTRACT_VALID"] == "${{ steps.publish_gate.outputs.contract_valid }}"
    assert response["env"]["CODEX_DELIVERY"] == "${{ steps.publish_gate.outputs.delivery }}"
    assert response["env"]["CODEX_RESULT_FILE"] == ".codex-result.json"
    assert "const validatedResult" in script
    assert "validatedResult.summary" in script
    assert "validatedResult.tests.map" in script
    assert "test.command" in script
    assert "test.result" in script
    assert "CODEX_COMMIT_SHA" in response["env"]
    assert "CREATED_PR_URL" in response["env"]
    assert "github.rest.issues.updateComment" in script


def test_reply_comment_is_the_summary_with_validation_only_when_records_exist():
    response_script = workflow_step(name="Post Codex response")["with"]["script"]
    final_status = workflow_step(step_id="final_status")

    assert "if (validatedResult.tests.length > 0)" in response_script
    assert 'if (process.env.CODEX_DELIVERY === "reply"' in response_script
    assert "纯问答直接使用 summary，不追加发布状态。" in response_script
    assert final_status["env"]["DELIVERY"] == "${{ steps.publish_gate.outputs.delivery }}"
    assert final_status["env"]["CONTRACT_VALID"] == "${{ steps.publish_gate.outputs.contract_valid }}"
    assert 'if [ "$DELIVERY" = "reply" ]; then' in final_status["run"]


def test_publish_delivery_without_a_diff_only_succeeds_for_missing_pr_recovery():
    response_script = workflow_step(name="Post Codex response")["with"]["script"]
    final_status_script = workflow_step(step_id="final_status")["run"]

    assert 'else if (process.env.CODEX_DELIVERY === "publish" && process.env.CODEX_NO_CHANGES === "true")' in response_script
    assert '未发布：${process.env.CODEX_GATE_REASON || "未产生仓库改动。"}' in response_script
    assert 'if [ "$DELIVERY" = "publish" ] && [ "$GATE_NO_CHANGES" = "true" ]; then' in final_status_script
    assert 'if [ "$CREATED_PR_OUTCOME" = "success" ]; then' in final_status_script


def test_one_progress_comment_is_created_then_updated_throughout_the_run():
    context_script = workflow_step(step_id="context")["with"]["script"]
    run_step = workflow_step(step_id="run_codex")
    reporter = progress_reporter_text()

    assert 'core.setOutput("progress_comment_id"' in context_script
    assert "Codex 正在处理" in context_script
    assert run_step["env"]["CODEX_PROGRESS_COMMENT_ID"] == "${{ steps.context.outputs.progress_comment_id }}"
    assert "env -u CODEX_PROGRESS_TOKEN codex exec" in run_step["run"]
    assert "todo_list" in reporter
    assert "UPDATE_INTERVAL_SECONDS = 60" in reporter
    assert "reasoning" not in reporter


def test_initial_progress_comment_reserves_the_plan_progress_boundaries():
    context_script = workflow_step(step_id="context")["with"]["script"]

    assert '"<!-- codex-plan-progress:start -->"' in context_script
    assert '"<!-- codex-plan-progress:end -->"' in context_script
    assert context_script.index('"<!-- codex-plan-progress:start -->"') < context_script.index(
        '"<!-- codex-plan-progress:end -->"'
    )


@requires_node
def test_final_response_preserves_the_latest_plan_in_the_same_comment(tmp_path):
    progress_body = "\n".join(
        [
            "<!-- codex-live-progress -->",
            "## Codex 正在处理",
            "",
            "正在验证结果并准备发布。",
            "",
            "<!-- codex-plan-progress:start -->",
            "",
            "### 执行计划",
            "",
            "- [x] 定位覆盖路径",
            "- [ ] 🔄 验证最终评论",
            "<!-- codex-plan-progress:end -->",
            "",
            "活动汇总：命令 3 · 文件变更 2 · 网络检索 0",
        ]
    )

    completed, trace = run_response_step(tmp_path, progress_body=progress_body)

    assert completed.returncode == 0, completed.stderr
    assert [call["name"] for call in trace["calls"]] == ["getComment", "updateComment"]
    update = trace["calls"][1]["args"]
    assert update["comment_id"] == 456
    assert "已完成处理，并保留执行计划。" in update["body"]
    assert "<!-- codex-plan-progress:start -->" in update["body"]
    assert "- [x] 定位覆盖路径" in update["body"]
    assert "- [ ] 🔄 验证最终评论" in update["body"]
    assert update["body"].index("已完成处理，并保留执行计划。") < update["body"].index("### 执行计划")
    assert "Codex 正在处理" not in update["body"]
    assert "活动汇总" not in update["body"]


@requires_node
def test_final_response_keeps_the_original_comment_when_plan_reading_fails(tmp_path):
    progress_body = "\n".join(
        [
            "<!-- codex-plan-progress:start -->",
            "### 执行计划",
            "- [x] 已执行步骤",
            "<!-- codex-plan-progress:end -->",
        ]
    )

    completed, trace = run_response_step(tmp_path, progress_body=progress_body, get_comment_error=True)

    assert completed.returncode != 0
    assert [call["name"] for call in trace["calls"] if call["name"] != "warning"] == ["getComment"]
    assert "get comment failed" in trace["error"]


@requires_node
def test_final_response_reserves_comment_space_for_the_complete_plan(tmp_path):
    plan_items = [f"- [x] 步骤 {index} " + ("进" * 230) for index in range(10)]
    progress_body = "\n".join(
        [
            "<!-- codex-plan-progress:start -->",
            "### 执行计划",
            *plan_items,
            "<!-- codex-plan-progress:end -->",
        ]
    )
    tests = [
        {
            "command": "python3 -m pytest " + ("tests/" * 12000),
            "result": "passed",
            "details": "验证通过",
        }
    ]

    completed, trace = run_response_step(tmp_path, progress_body=progress_body, tests=tests)

    assert completed.returncode == 0, completed.stderr
    update_body = next(call["args"]["body"] for call in trace["calls"] if call["name"] == "updateComment")
    assert len(update_body) <= 64000
    assert all(item in update_body for item in plan_items)
    assert update_body.endswith("<!-- codex-plan-progress:end -->")


@pytest.mark.parametrize(
    "progress_body",
    [
        "### 执行计划\n- [x] 缺少边界",
        "\n".join(
            [
                "<!-- codex-plan-progress:start -->",
                "<!-- codex-plan-progress:start -->",
                "### 执行计划",
                "<!-- codex-plan-progress:end -->",
            ]
        ),
        "\n".join(
            [
                "<!-- codex-plan-progress:end -->",
                "### 执行计划",
                "<!-- codex-plan-progress:start -->",
            ]
        ),
    ],
)
@requires_node
def test_final_response_keeps_the_original_comment_when_plan_boundaries_are_invalid(tmp_path, progress_body):
    completed, trace = run_response_step(tmp_path, progress_body=progress_body)

    assert completed.returncode != 0
    assert [call["name"] for call in trace["calls"] if call["name"] != "warning"] == ["getComment"]
    assert "one valid plan boundary pair" in trace["error"]


@requires_node
def test_final_response_does_not_create_a_second_comment_when_the_existing_update_fails(tmp_path):
    progress_body = "\n".join(
        [
            "<!-- codex-plan-progress:start -->",
            "### 执行计划",
            "- [x] 已执行步骤",
            "<!-- codex-plan-progress:end -->",
        ]
    )

    completed, trace = run_response_step(tmp_path, progress_body=progress_body, update_comment_error=True)

    assert completed.returncode != 0
    assert [call["name"] for call in trace["calls"] if call["name"] != "warning"] == ["getComment", "updateComment"]
    assert "update comment failed" in trace["error"]


@requires_node
def test_final_response_creates_one_comment_only_when_the_initial_comment_was_never_created(tmp_path):
    completed, trace = run_response_step(tmp_path, progress_body="", progress_comment_id="")

    assert completed.returncode == 0, completed.stderr
    assert [call["name"] for call in trace["calls"]] == ["createComment"]
    assert trace["calls"][0]["args"]["issue_number"] == 77
    assert trace["calls"][0]["args"]["body"] == "已完成处理，并保留执行计划。"


@requires_node
def test_final_response_omits_an_empty_plan_section(tmp_path):
    progress_body = "\n".join(
        [
            "<!-- codex-live-progress -->",
            "<!-- codex-plan-progress:start -->",
            "<!-- codex-plan-progress:end -->",
        ]
    )

    completed, trace = run_response_step(tmp_path, progress_body=progress_body)

    assert completed.returncode == 0, completed.stderr
    update_body = next(call["args"]["body"] for call in trace["calls"] if call["name"] == "updateComment")
    assert update_body == "已完成处理，并保留执行计划。"


def test_actionlint_config_only_ignores_the_confirmed_v3_metadata_mismatch():
    config = yaml.safe_load(ACTIONLINT_CONFIG.read_text(encoding="utf-8"))
    ignores = config["paths"][".github/workflows/codex.yml"]["ignore"]

    assert len(ignores) == 2
    assert any('missing input "app-id"' in pattern for pattern in ignores)
    assert any('input "client-id" is not defined' in pattern for pattern in ignores)
