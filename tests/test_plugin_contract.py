"""插件契约检查：注册期就能发现契约违反，而不是等到运行时报通用错误。"""

from pathlib import Path

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


def test_concrete_plugins_live_outside_the_platform_runtime():
    runtime_dir = Path(plugin_contract.__file__).parent
    plugins_dir = runtime_dir.parent
    assert {path.name for path in runtime_dir.glob("*.py")} == {
        "__init__.py",
        "domains.py",
        "interfaces.py",
        "protocol.py",
        "safe_http.py",
        "triggers.py",
    }
    assert not (plugins_dir / "texttools").exists()
    assert not (plugins_dir / "meta" / "weread").exists()
    assert not (plugins_dir / "metadata" / "open_library.py").exists()
    for legacy_module in (
        "book_sources.py",
        "builtin_capabilities.py",
        "enrichment.py",
        "legado.py",
        "mock.py",
        "push.py",
        "weread.py",
    ):
        assert not (runtime_dir / legacy_module).exists()
    assert not (plugins_dir / "push" / "devices.py").exists()

    for relative_path, concrete_prefix in {
        "source/base.py": "talebook.source.",
        "metadata/base.py": "talebook.metadata.",
        "review/base.py": "talebook.review.",
        "push/base.py": "talebook.push.",
        "tool/base.py": "talebook.tool.",
        "tool/common.py": "talebook.tool.",
    }.items():
        assert concrete_prefix not in (plugins_dir / relative_path).read_text(encoding="utf-8")

    for type_name in ("source", "metadata", "review", "annotation", "tool", "push", "mock", "combo"):
        type_init = (plugins_dir / type_name / "__init__.py").read_text(encoding="utf-8")
        assert "PROVIDER" not in type_init, "%s/__init__.py 不应维护第二份装配表" % type_name

    for relative_path in ("tool/epub.py", "tool/text_replace/transform.py", "tool/zh_converter/transform.py"):
        source = (plugins_dir / relative_path).read_text(encoding="utf-8")
        assert "plugins.tool.txt_fixer" not in source

    expected_modules = {
        "talebook.mock.multi-tab": "webserver.plugins.mock.multi_tab",
        "talebook.weread": "webserver.plugins.combo.weread.provider",
        "talebook.source.opds": "webserver.plugins.source.opds",
        "talebook.source.legado": "webserver.plugins.source.legado",
        "talebook.source.kavita": "webserver.plugins.source.kavita",
        "talebook.source.komga": "webserver.plugins.source.komga",
        "talebook.source.booklore": "webserver.plugins.source.booklore",
        "talebook.source.standard-ebooks": "webserver.plugins.source.standard_ebooks",
        "talebook.source.gutenberg": "webserver.plugins.source.gutenberg",
        "talebook.source.internet-archive": "webserver.plugins.source.internet_archive",
        "talebook.source.webdav": "webserver.plugins.source.webdav",
        "talebook.source.watch-folder": "webserver.plugins.source.watch_folder",
        "talebook.metadata.open-library": "webserver.plugins.combo.open_library",
        "talebook.metadata.embedded-file": "webserver.plugins.metadata.embedded_file",
        "talebook.metadata.calibre-provider-bridge": "webserver.plugins.metadata.calibre_provider_bridge",
        "talebook.review.hardcover": "webserver.plugins.review.hardcover",
        "talebook.review.neodb": "webserver.plugins.review.neodb",
        "talebook.review.google-books": "webserver.plugins.review.google_books",
        "talebook.review.bangumi": "webserver.plugins.review.bangumi",
        "talebook.review.anilist": "webserver.plugins.review.anilist",
        "talebook.review.file-import": "webserver.plugins.review.file_import",
        "talebook.annotation.brs": "webserver.plugins.annotation.brs",
        "talebook.tool.text-replace": "webserver.plugins.tool.text_replace.provider",
        "talebook.tool.zh-converter": "webserver.plugins.tool.zh_converter.provider",
        "talebook.tool.txt-fixer": "webserver.plugins.tool.txt_fixer.provider",
        "talebook.push.duokan": "webserver.plugins.push.duokan",
        "talebook.push.boox": "webserver.plugins.push.boox",
        "talebook.push.hanwang": "webserver.plugins.push.hanwang",
        "talebook.push.ireader": "webserver.plugins.push.ireader",
        "talebook.push.dangdang": "webserver.plugins.push.dangdang",
        "talebook.push.purelibro": "webserver.plugins.push.purelibro",
    }
    providers = {provider.manifest["id"]: provider for provider in REGISTRY.providers()}
    register_source = (plugins_dir / "register.py").read_text(encoding="utf-8")

    assert set(providers) == set(expected_modules)
    assert {
        plugin_id: provider.__class__.__module__ for plugin_id, provider in providers.items()
    } == expected_modules
    for module in expected_modules.values():
        assert "from %s import PROVIDER" % module in register_source
    assert not any(plugin_id.startswith(("talebook.reviews.", "talebook.annotations.")) for plugin_id in providers)


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
