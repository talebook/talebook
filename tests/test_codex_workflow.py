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


def workflow_text():
    return WORKFLOW.read_text(encoding="utf-8")


def workflow_data():
    return yaml.safe_load(workflow_text())


def codex_job():
    return workflow_data()["jobs"]["codex"]


def workflow_step(*, step_id=None, name=None):
    for step in codex_job()["steps"]:
        if step_id is not None and step.get("id") == step_id:
            return step
        if name is not None and step.get("name") == name:
            return step
    raise AssertionError(f"workflow step not found: id={step_id!r}, name={name!r}")


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


def test_employee_job_is_bounded_and_serialized_per_request_target():
    job = codex_job()

    assert job["timeout-minutes"] == 25
    assert job["concurrency"] == {
        "group": "codex-${{ github.repository }}-${{ github.event.issue.number || github.event.pull_request.number }}",
        "cancel-in-progress": False,
    }


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


def test_agent_has_public_network_but_cannot_read_host_credentials():
    restore_script = workflow_step(name="Restore Codex ChatGPT auth")["run"]

    required_fragments = (
        'default_permissions = "codex-employee"',
        'extends = ":workspace"',
        '":root" = "deny"',
        '":minimal" = "read"',
        '":tmpdir" = "deny"',
        '":slash_tmp" = "deny"',
        '[permissions.codex-employee.filesystem.":workspace_roots"]',
        '"." = "write"',
        '".github/workflows" = "read"',
        "[permissions.codex-employee.network.domains]",
        "network_proxy = true",
        "allow_local_binding = true",
        '"*" = "allow"',
        '"localhost" = "allow"',
        '"127.0.0.1" = "allow"',
        '"169.254.169.254" = "deny"',
        '"metadata.google.internal" = "deny"',
        'TMPDIR = "$GITHUB_WORKSPACE/.codex-runtime"',
        "'.codex/tmp/'",
        '"GITHUB_TOKEN"',
        '"CODEX_AUTH_JSON"',
    )
    assert all(fragment in restore_script for fragment in required_fragments)
    assert "allow_local_binding = false" not in restore_script
    assert "--sandbox workspace-write" not in workflow_text()
    assert 'sandbox_mode = "workspace-write"' not in restore_script


def test_sandbox_setup_fails_closed_before_codex_runs():
    setup_script = workflow_step(name="Setup bubblewrap and AppArmor for sandbox")["run"]
    step_names = [step.get("name") for step in codex_job()["steps"]]

    assert "continuing" not in setup_script
    assert "::error::Required AppArmor profile source is missing" in setup_script
    assert "::error::Bubblewrap sandbox self-test failed" in setup_script
    assert "::error::AppArmor profile is not active for bubblewrap" in setup_script
    assert setup_script.count("exit 1") >= 3
    assert step_names.index("Setup bubblewrap and AppArmor for sandbox") < step_names.index("Run Codex")


def test_trusted_assets_follow_the_immutable_workflow_version_and_acknowledge_first():
    context = workflow_step(step_id="context")
    script = context["with"]["script"]

    assert context["env"]["WORKFLOW_SHA"] == "${{ github.workflow_sha }}"
    assert "const workflowSha = process.env.WORKFLOW_SHA;" in script
    assert 'path: ".github/codex/prompts/comment-response.md"' in script
    assert 'path: ".github/codex/scripts/codex_progress_reporter.py"' in script
    assert script.count("ref: workflowSha") == 2
    assert "ref: defaultBranch" not in script
    assert script.index("reactions.createForIssueComment") < script.index("issues.createComment")
    assert script.index("issues.createComment") < script.index('path: ".github/codex/prompts/comment-response.md"')
    assert "github.rest.issues.updateComment" in script
    assert "无法加载受信任的 Codex 运行资源" in script
    assert "const codexPromptTemplate = `${runnerTemp}/codex-comment-response.md`;" in script
    assert 'core.exportVariable("CODEX_PROMPT_TEMPLATE", codexPromptTemplate)' in script
    assert 'core.exportVariable("CODEX_PROGRESS_REPORTER", codexProgressReporter)' in script
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


def test_actionlint_config_only_ignores_the_confirmed_v3_metadata_mismatch():
    config = yaml.safe_load(ACTIONLINT_CONFIG.read_text(encoding="utf-8"))
    ignores = config["paths"][".github/workflows/codex.yml"]["ignore"]

    assert len(ignores) == 2
    assert any('missing input "app-id"' in pattern for pattern in ignores)
    assert any('input "client-id" is not defined' in pattern for pattern in ignores)
