import re
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
    build_workflow = workflow("build.yml")
    build_job = build_workflow["jobs"]["build"]
    step = workflow_step(build_job, "Build development image")

    assert step["if"] == (
        "matrix.platform == 'linux/amd64' && "
        "(github.event_name == 'pull_request' || github.ref == 'refs/heads/master')"
    )
    assert step["uses"] == "docker/build-push-action@v5"
    assert step["with"]["target"] == "dev"
    assert step["with"]["platforms"] == "linux/amd64"
    assert step["with"]["push"] == (
        "${{ github.event_name == 'push' && github.ref == 'refs/heads/master' }}"
    )
    assert step["with"]["tags"].splitlines() == [
        "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:dev",
        "${{ env.GHCR_REGISTRY }}/${{ env.IMAGE_NAME }}:dev",
    ]
    assert step["with"]["labels"] == "org.opencontainers.image.revision=${{ github.sha }}"


def test_build_workflow_publishes_docker_hub_and_ghcr_from_the_same_build():
    build_workflow = workflow("build.yml")
    jobs = build_workflow["jobs"]
    build = jobs["build"]
    merge = jobs["merge"]

    assert build_workflow["env"] == {
        "REGISTRY": "docker.io",
        "GHCR_REGISTRY": "ghcr.io",
        "IMAGE_NAME": "${{ github.repository }}",
    }

    for job in (build, merge):
        login = workflow_step(job, "Log in to GitHub Container Registry")
        assert login["uses"] == "docker/login-action@v3"
        assert login["with"] == {
            "registry": "${{ env.GHCR_REGISTRY }}",
            "username": "${{ github.actor }}",
            "password": "${{ secrets.GITHUB_TOKEN }}",
        }

    outputs = workflow_step(build, "Set build outputs")
    assert "type=image,name=${REGISTRY}/${IMAGE_NAME}" in outputs["run"]
    assert "type=image,name=${GHCR_REGISTRY}/${IMAGE_NAME}" in outputs["run"]
    assert outputs["env"]["GHCR_REGISTRY"] == "${{ env.GHCR_REGISTRY }}"

    for name in ("Create SPA manifest", "Create SSR manifest"):
        manifest = workflow_step(merge, name)
        assert 'for TARGET_REGISTRY in "$REGISTRY" "$GHCR_REGISTRY"' in manifest["run"]
        assert 'SRCS+=("${IMAGE}@$(cat "$f")")' in manifest["run"]
        assert manifest["env"]["GHCR_REGISTRY"] == "${{ env.GHCR_REGISTRY }}"


def test_build_workflow_filters_docker_jobs_to_image_inputs():
    jobs = workflow("build.yml")["jobs"]
    changes = jobs["changes"]
    prepare = jobs["prepare"]

    assert changes["permissions"] == {"contents": "read", "pull-requests": "read"}
    assert changes["outputs"]["docker"] == "${{ steps.decide.outputs.docker }}"
    assert prepare["needs"] == "changes"
    assert prepare["if"] == "${{ needs.changes.outputs.docker == 'true' }}"

    filter_step = workflow_step(changes, "Filter Docker build inputs")
    assert filter_step["if"] == "github.ref_type != 'tag'"
    assert filter_step["uses"] == "dorny/paths-filter@v3"
    assert filter_step["with"]["base"] == "${{ github.event_name == 'push' && github.event.before || '' }}"

    filters = yaml.safe_load(filter_step["with"]["filters"])
    assert filters == {
        "docker": [
            "app/**",
            "webserver/**",
            "conf/nginx/**",
            "conf/supervisor/**",
            "docker/**",
            "Dockerfile",
            ".dockerignore",
            "Makefile",
            "server.py",
            "requirements.txt",
            "requirements-test.txt",
            "docker-compose.yml",
            "docker-compose.dev.yml",
            ".github/workflows/build.yml",
        ]
    }

    decide = workflow_step(changes, "Decide Docker build")
    assert decide["env"] == {
        "REF_TYPE": "${{ github.ref_type }}",
        "DOCKER_CHANGED": "${{ steps.filter.outputs.docker }}",
    }
    assert '[[ "$REF_TYPE" == "tag" || "$DOCKER_CHANGED" == "true" ]]' in decide["run"]


def test_docker_root_context_is_a_runtime_input_allowlist():
    rules = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()

    assert rules[1] == "**"
    for path in (
        "!Dockerfile",
        "!requirements.txt",
        "!requirements-test.txt",
        "!server.py",
        "!app/**",
        "!conf/**",
        "!docker/**",
        "!webserver/**",
        "!tests/**",
    ):
        assert path in rules

    assert "!design/**" not in rules
    assert "!document/**" not in rules
    assert "app/test" in rules


def test_test_sources_are_available_to_test_and_dev_but_not_production():
    dockerfile = (ROOT / "Dockerfile").read_text(encoding="utf-8")
    makefile = (ROOT / "Makefile").read_text(encoding="utf-8")
    stage_parents = {
        stage.lower(): parent.lower()
        for parent, stage in re.findall(
            r"^FROM\s+(\S+)\s+AS\s+(\S+)\s*$",
            dockerfile,
            re.MULTILINE | re.IGNORECASE,
        )
    }

    assert stage_parents["test"] == "server"
    assert stage_parents["dev"] == "test"
    assert stage_parents["production"] == "server"
    assert stage_parents["production-ssr"] == "production"
    assert stage_parents["production-spa"] == "production"
    assert "COPY tests/ /var/www/talebook/tests/" in dockerfile
    assert "--build-context" not in makefile
