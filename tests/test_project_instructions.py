from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AGENTS = ROOT / "AGENTS.md"
WORKFLOW_AGENTS = ROOT / ".github" / "workflows" / "AGENTS.md"


def test_pull_request_description_and_design_preview_rules_are_documented():
    instructions = AGENTS.read_text(encoding="utf-8")

    assert "### Pull Request 提交规范" in instructions
    assert all(
        requirement in instructions
        for requirement in (
            "背景或目标",
            "关键改动",
            "实际验证结果",
            "风险或兼容性",
            "方案路径或豁免原因",
            "截图",
            "完整 commit SHA",
        )
    )
    assert "https://github.com/<owner>/<repo>/blob/<commit-sha>/<path>" in instructions
    assert "https://raw.githack.com/<owner>/<repo>/<commit-sha>/<path>" in instructions
    assert (
        "https://raw.githack.com/talebook/talebook/18113f147aefa0ad79e8c7efd93f1c882610b3ed/"
        "design/webserver/20260721-booksource-large-json-import.active.html"
    ) in instructions


def test_workflow_changes_require_real_local_act_validation():
    instructions = WORKFLOW_AGENTS.read_text(encoding="utf-8")

    assert all(
        requirement in instructions
        for requirement in (
            "gh act",
            "修改任何 workflow 时，必须在提交 PR 前使用本地 `act` 执行器测试",
            "所有本地可复现的 Action bootstrap、依赖安装、脚本和步骤必须跑通",
            "真实 workflow",
            "匹配触发类型的事件",
            "不得用简化 smoke workflow 替代",
            "临时路径",
            "实际执行命令",
            "未执行原因和风险",
        )
    )
    assert "/private/tmp" not in instructions
