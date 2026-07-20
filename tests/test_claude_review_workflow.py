from pathlib import Path

import yaml


ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = ROOT / ".github" / "workflows" / "claude-code-review.yml"


def load_workflow() -> dict:
    return yaml.safe_load(WORKFLOW.read_text(encoding="utf-8"))


def test_review_action_allows_only_the_trusted_codex_bot():
    steps = load_workflow()["jobs"]["claude-review"]["steps"]
    review = next(step for step in steps if step.get("id") == "claude-review")

    assert review["uses"] == "anthropics/claude-code-action@v1"
    assert review["with"]["allowed_bots"] == "codex-talebook[bot]"
    assert "*" not in review["with"]["allowed_bots"]
