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
