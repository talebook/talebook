from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]


def workflow(name):
    with (ROOT / ".github" / "workflows" / name).open(encoding="utf-8") as file:
        return yaml.safe_load(file)


def workflow_step(job, name):
    for step in job["steps"]:
        if step.get("name") == name:
            return step
    raise AssertionError(f"workflow step not found: {name}")


def test_build_workflow_only_publishes_the_validated_dev_image_from_master():
    build_job = workflow("build.yml")["jobs"]["build"]
    step = workflow_step(build_job, "Build development image")

    assert step["if"] == (
        "matrix.platform == 'linux/amd64' && "
        "(github.event_name == 'pull_request' || github.ref == 'refs/heads/master')"
    )
    assert step["uses"] == "docker/build-push-action@v5"
    assert step["with"]["target"] == "dev"
    assert step["with"]["platforms"] == "linux/amd64"
    assert step["with"]["push"] == "${{ github.event_name == 'push' && github.ref == 'refs/heads/master' }}"
    assert step["with"]["tags"] == "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:dev"
    assert step["with"]["labels"] == "org.opencontainers.image.revision=${{ github.sha }}"


def test_claude_action_uses_the_dev_container_and_prepares_current_checkout():
    claude_job = workflow("claude.yml")["jobs"]["claude"]
    steps = claude_job["steps"]
    verify = workflow_step(claude_job, "Verify development environment")
    synchronize = workflow_step(claude_job, "Synchronize project dependencies")
    run_claude = workflow_step(claude_job, "Run Claude Code")

    assert claude_job["container"] == {"image": "talebook/talebook:dev", "options": "--user root"}
    assert claude_job["defaults"] == {"run": {"shell": "bash"}}
    assert all(
        probe in verify["run"]
        for probe in (
            "ebook-convert --version",
            "python3 --version",
            "node --version",
            "npm --version",
            "make --version",
            "python3 -m pytest --version",
            "ruff --version",
        )
    )
    assert synchronize["run"] == "make init\nnpm --prefix app ci\n"
    assert steps.index(verify) < steps.index(synchronize) < steps.index(run_claude)

    action_inputs = run_claude["with"]
    assert "path_to_claude_code_executable" not in action_inputs
    assert "path_to_bun_executable" not in action_inputs
    assert "--allowedTools" in action_inputs["claude_args"]
    assert all(
        command in action_inputs["claude_args"]
        for command in (
            "Bash(make:*)",
            "Bash(npm:*)",
            "Bash(npx:*)",
            "Bash(node:*)",
            "Bash(python3:*)",
            "Bash(pytest:*)",
            "Bash(ruff:*)",
        )
    )


def test_agent_dev_smoke_exercises_the_shared_container_without_model_credentials():
    smoke = workflow("agent-dev-smoke.yml")
    job = smoke["jobs"]["smoke"]
    steps = job["steps"]
    verify = workflow_step(job, "Verify development environment and sandbox")
    synchronize = workflow_step(job, "Synchronize project dependencies")
    validate = workflow_step(job, "Run development checks")

    assert list(smoke["on"]) == ["workflow_dispatch"]
    assert job["container"] == {
        "image": "talebook/talebook:dev",
        "options": "--user root --security-opt seccomp=unconfined",
    }
    assert job["defaults"] == {"run": {"shell": "bash"}}
    assert "codex sandbox -- /bin/true" in verify["run"]
    assert synchronize["run"] == "make init\nnpm --prefix app ci\n"
    assert all(
        command in validate["run"]
        for command in (
            "make lint-py",
            "make pytest",
            "make check-design",
            "npm --prefix app run lint",
            "npm --prefix app run build",
        )
    )
    assert steps.index(verify) < steps.index(synchronize) < steps.index(validate)
    assert "CLAUDE_CODE_OAUTH_TOKEN" not in str(smoke)
    assert "CODEX_AUTH_JSON" not in str(smoke)
