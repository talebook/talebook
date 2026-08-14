import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
AGENTS = ROOT / "AGENTS.md"
WORKFLOW_AGENTS = ROOT / ".github" / "workflows" / "AGENTS.md"
SKILLS_ROOT = ROOT / ".agents" / "skills"
SKILLS_LOCK = ROOT / "skills-lock.json"


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


def test_design_document_quality_is_not_bound_to_frontend_design_skill():
    instructions = AGENTS.read_text(encoding="utf-8")

    assert "frontend-design" not in instructions
    assert all(
        requirement in instructions
        for requirement in (
            "可离线阅读的单文件 HTML",
            "原始诉求、目标、方案和测试结果",
            "不添加纯装饰图表",
            "测试结果应标记为待验证并记录计划验证项",
            "与本次改动相关的测试失败时不得转为 ACTIVE",
        )
    )


def test_design_template_usage_is_documented():
    instructions = AGENTS.read_text(encoding="utf-8")

    assert all(
        requirement in instructions
        for requirement in (
            "`design/TEMPLATE.html`",
            "默认复制",
            "响应式与可访问性基线",
            "允许按主题调整",
            "不参与 WIP/ACTIVE 状态门禁",
        )
    )


def test_each_work_item_keeps_one_design_document():
    instructions = AGENTS.read_text(encoding="utf-8")

    assert all(
        requirement in instructions
        for requirement in (
            "同一个工作只维护一份方案",
            "不得为同一工作中的设计迭代、反馈轮次或废弃选项创建多份方案",
            "最终不保留同一工作的中间稿、未生效版本或废弃方案文件",
            "SUPERSEDED 仅用于已经合并并独立生效的 ACTIVE",
            "不得用 SUPERSEDED 保存同一工作中的过程稿、方案 A/B/C 或反馈轮次",
        )
    )


def test_large_features_require_full_local_interface_review_before_activation():
    instructions = AGENTS.read_text(encoding="utf-8")

    assert all(
        requirement in instructions
        for requirement in (
            "#### 大型功能的本地界面审查",
            "仅包括新功能、用户可感知行为变化和跨模块功能",
            "`interface-review` skill",
            "`full` 模式",
            "当前分支相对默认分支的全部本地变更",
            "已提交和未提交内容",
            "将方案转为 ACTIVE 前",
            "`HIGH` 或 `MEDIUM` 问题时不得转为 ACTIVE",
            "修复后必须重新执行 `interface-review`",
            "审查范围、最终结论和问题处理情况",
            "无界面影响",
            "判断依据和剩余风险",
        )
    )


def test_interface_review_skill_and_domain_dependencies_are_installed():
    expected_skills = {
        "better-accessibility",
        "better-colors",
        "better-interface",
        "better-layout",
        "better-typography",
        "better-ui",
        "better-writing",
        "interface-review",
    }
    locked_skills = json.loads(SKILLS_LOCK.read_text(encoding="utf-8"))["skills"]

    assert expected_skills <= locked_skills.keys()
    for skill_name in expected_skills:
        instructions = (SKILLS_ROOT / skill_name / "SKILL.md").read_text(encoding="utf-8")
        assert f"name: {skill_name}" in instructions
    assert "disable-model-invocation: true" in (SKILLS_ROOT / "interface-review" / "SKILL.md").read_text(
        encoding="utf-8"
    )


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
