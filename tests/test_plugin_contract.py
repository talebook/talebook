"""插件契约检查：注册期就能发现契约违反，而不是等到运行时报通用错误。"""

import pytest

import webserver.plugins.runtime as plugin_contract
from webserver.plugins.runtime import CheckReport, PluginContext, PluginManifest, contract_violations
from webserver.services.plugin_runtime import REGISTRY, PluginRegistry


def _metadata_manifest(plugin_id):
    return {
        **REGISTRY.get("talebook.metadata.open-library").manifest,
        "id": plugin_id,
        "categories": ["metadata"],
        "capabilities": ["metadata.lookup"],
    }


def test_every_builtin_provider_satisfies_the_contract():
    """S4 把告警改为抛错的前提：现有内置 provider 必须全部合规。"""
    providers = REGISTRY.providers()
    assert providers, "注册表不应为空"

    violations = {}
    for provider in providers:
        manifest = PluginManifest.validate(provider.manifest)
        problems = contract_violations(provider, manifest)
        if problems:
            violations[type(provider).__name__] = problems
    assert violations == {}, "存在不满足契约的内置插件：%s" % violations

    assert not hasattr(plugin_contract, "PluginProvider"), "通用 PluginProvider 已被七类能力接口取代"


def test_all_book_source_plugins_use_the_source_namespace():
    expected = {
        "talebook.source.opds",
        "talebook.source.legado",
        "talebook.source.kavita",
        "talebook.source.komga",
        "talebook.source.booklore",
        "talebook.source.standard-ebooks",
        "talebook.source.gutenberg",
        "talebook.source.internet-archive",
        "talebook.source.webdav",
        "talebook.source.watch-folder",
    }

    actual = {
        provider.manifest["id"]
        for provider in REGISTRY.providers()
        if "book_sources" in provider.manifest["categories"]
    }

    assert actual == expected
    assert not any(plugin_id.startswith("talebook.book-source.") for plugin_id in actual)


def test_contract_violations_detects_missing_manifest():
    class NoManifest:
        def search_books(self, query, context):
            return []

    problems = contract_violations(NoManifest())
    assert any("manifest" in item for item in problems)


def test_registry_accepts_typed_provider_without_execute():
    """标准能力插件只实现其 Protocol，不再被迫保留通用 execute。"""

    class TypedMetadata:
        manifest = _metadata_manifest("talebook.test.typed-only")

        def search_books(self, query, context):
            return []

        def get_metadata(self, external_id, context):
            return None

        def self_check(self, context):
            return CheckReport(healthy=True, message="ready")

    provider = TypedMetadata()
    PluginRegistry().register(provider)
    assert not hasattr(provider, "execute")

    for builtin in REGISTRY.providers():
        if builtin.manifest["id"].startswith(("talebook.tool.", "talebook.push.")):
            assert not hasattr(builtin, "execute"), builtin.manifest["id"]


def test_registry_rejects_typed_only_test_action_without_self_check():
    class UntestableMetadata:
        manifest = _metadata_manifest("talebook.test.missing-self-check")

        def search_books(self, query, context):
            return []

        def get_metadata(self, external_id, context):
            return None

    with pytest.raises(TypeError) as exc:
        PluginRegistry().register(UntestableMetadata())

    assert "self_check" in str(exc.value)


def test_registry_rejects_provider_without_declared_capability_interface():
    """契约违反在注册期失败，而不是等到用户调用时报通用错误。"""

    class Broken:
        manifest = dict(REGISTRY.providers()[0].manifest)

    Broken.manifest["id"] = "talebook.test.broken-contract"
    registry = PluginRegistry()
    with pytest.raises(TypeError) as exc:
        registry.register(Broken())

    assert "未满足契约" in str(exc.value)
    assert "MetadataProvider" in str(exc.value)


def test_registry_rejects_capability_without_its_typed_interface():
    """声明能力却没有对应方法时，应在注册阶段指出具体接口。"""

    class MissingMetadataMethods:
        manifest = _metadata_manifest("talebook.test.missing-metadata-interface")

    with pytest.raises(TypeError) as exc:
        PluginRegistry().register(MissingMetadataMethods())

    assert "metadata.lookup" in str(exc.value)
    assert "MetadataProvider" in str(exc.value)


def test_registry_rejects_unknown_capability_instead_of_ignoring_it():
    class UnknownCapability:
        manifest = {
            **_metadata_manifest("talebook.test.unknown-capability"),
            "capabilities": ["metadata.unmapped"],
        }

        def search_books(self, query, context):
            return []

        def get_metadata(self, external_id, context):
            return None

    with pytest.raises(TypeError) as exc:
        PluginRegistry().register(UnknownCapability())

    assert "metadata.unmapped" in str(exc.value)
    assert "未知" in str(exc.value)


def test_registry_requires_extra_feature_interface_when_features_are_declared():
    class MissingExtraFeatureInterface:
        manifest = {
            **_metadata_manifest("talebook.test.missing-extra-feature"),
            "extra_features": {
                "inspect": {"mode": "read", "schema": {}, "required_scopes": []},
            },
        }

        def search_books(self, query, context):
            return []

        def get_metadata(self, external_id, context):
            return None

    with pytest.raises(TypeError) as exc:
        PluginRegistry().register(MissingExtraFeatureInterface())

    assert "ExtraFeatureProvider" in str(exc.value)


def test_registry_rejects_book_source_download_mode_mismatch():
    provider = REGISTRY.get("talebook.source.gutenberg")

    class MismatchedSource:
        manifest = {**provider.manifest, "id": "talebook.test.mode-mismatch", "download_mode": "by_chapters"}
        download_mode = "single_book"
        execute = provider.execute
        search = provider.search
        browse = provider.browse
        get_categories = provider.get_categories
        get_book = provider.get_book
        download = provider.download
        get_toc = provider.get_toc
        get_chapter = provider.get_chapter
        self_check = provider.self_check

    with pytest.raises(TypeError) as exc:
        PluginRegistry().register(MismatchedSource())

    assert "download_mode" in str(exc.value)


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
