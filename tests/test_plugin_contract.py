"""插件契约检查：注册期就能发现契约违反，而不是等到运行时报通用错误。"""

import pytest

from webserver.plugins.runtime import PluginContext, PluginProvider, contract_violations
from webserver.services.plugin_runtime import REGISTRY, PluginRegistry


def test_every_builtin_provider_satisfies_the_contract():
    """S4 把告警改为抛错的前提：现有内置 provider 必须全部合规。"""
    providers = REGISTRY.providers()
    assert providers, "注册表不应为空"

    violations = {
        type(provider).__name__: contract_violations(provider)
        for provider in providers
        if contract_violations(provider)
    }
    assert violations == {}, "存在不满足契约的内置插件：%s" % violations

    not_matching = [type(p).__name__ for p in providers if not isinstance(p, PluginProvider)]
    assert not_matching == [], "以下插件不符合 PluginProvider 协议：%s" % not_matching


def test_contract_violations_detects_missing_execute():
    class NoExecute:
        manifest = {"id": "talebook.test.no-execute"}

    problems = contract_violations(NoExecute())
    assert any("execute" in item for item in problems)
    assert not isinstance(NoExecute(), PluginProvider)


def test_contract_violations_detects_missing_manifest():
    class NoManifest:
        def execute(self, context):
            return None

    problems = contract_violations(NoManifest())
    assert any("manifest" in item for item in problems)


def test_registry_warns_but_still_registers_during_transition(caplog):
    """过渡期只告警不拒绝（方案风险 R4），避免新校验导致服务起不来。"""

    class Broken:
        manifest = dict(REGISTRY.providers()[0].manifest)

    Broken.manifest["id"] = "talebook.test.broken-contract"
    registry = PluginRegistry()
    with caplog.at_level("WARNING"):
        registry.register(Broken())

    assert "未满足契约" in caplog.text
    assert registry.get("talebook.test.broken-contract") is not None


def test_plugin_context_round_trips_every_documented_key():
    context = PluginContext(
        action="run",
        attempt=2,
        deadline="2026-08-25T00:00:00",
        config={"a": 1},
        cursor={"offset": 3},
        secrets={"token": "unit-test-token"},
        scopes=["books.read"],
        target_external_ids=["x-1"],
        input_data={"allowed_book_ids": [1]},
        platform={"import_allowed_roots": ["/data"]},
    )
    payload = context.as_dict()

    assert set(payload) == {
        "action",
        "attempt",
        "config",
        "cursor",
        "secrets",
        "scopes",
        "target_external_ids",
        "input_data",
        "deadline",
        "platform",
    }
    assert payload["attempt"] == 2
    assert payload["secrets"] == {"token": "unit-test-token"}

    # as_dict 必须返回副本，插件改动不得回写到运行时持有的状态
    payload["config"]["a"] = 999
    assert context.config["a"] == 1


def test_plugin_context_rejects_unknown_field():
    with pytest.raises(TypeError):
        PluginContext(action="run", attempt=1, deadline="", cursors={})
