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
    assert step["with"]["push"] == (
        "${{ github.event_name == 'push' && github.ref == 'refs/heads/master' }}"
    )
    assert step["with"]["tags"] == "${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:dev"
    assert step["with"]["labels"] == "org.opencontainers.image.revision=${{ github.sha }}"


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
        ]
    }

    decide = workflow_step(changes, "Decide Docker build")
    assert decide["env"] == {
        "REF_TYPE": "${{ github.ref_type }}",
        "DOCKER_CHANGED": "${{ steps.filter.outputs.docker }}",
    }
    assert '[[ "$REF_TYPE" == "tag" || "$DOCKER_CHANGED" == "true" ]]' in decide["run"]
