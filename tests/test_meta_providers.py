"""元数据源插件化后的协议与派发回归。"""

from unittest import mock

import pytest

from webserver.plugins.meta.ai.api import PROVIDER as AI_PROVIDER
from webserver.plugins.meta.base import to_book_metadata, to_calibre_metadata
from webserver.plugins.register import PROVIDER_GROUPS
from webserver.plugins.runtime import PluginManifest, contract_violations
from webserver.plugins.runtime.domains import MetadataQuery
from webserver.services.plugin_runtime import REGISTRY


class _FakeMetadata:
    """替身：只需具备 calibre Metadata 的属性访问形态。"""

    def __init__(self, title="", isbn="", cover_url=""):
        self.title = title
        self.authors = ["某作者"]
        self.isbn = isbn
        self.cover_url = cover_url
        self.cover_data = None
        self.provider_key = ""
        self.custom_column_42 = "自定义列不应丢失"


def test_every_meta_provider_satisfies_the_metadata_contract():
    for provider in PROVIDER_GROUPS["meta"]:
        manifest = PluginManifest.validate(provider.manifest)
        assert contract_violations(provider, manifest) == []
        assert provider.manifest["id"].startswith("talebook.meta.")


def test_metadata_query_accepts_bare_string_and_mapping():
    assert MetadataQuery.from_value("活着").title == "活着"
    assert MetadataQuery.from_value(MetadataQuery(isbn="978")).isbn == "978"
    query = MetadataQuery.from_value({"title": "活着", "isbn": "978", "publisher": "作家"})
    assert (query.title, query.isbn, query.publisher) == ("活着", "978", "作家")
    assert MetadataQuery().is_empty()
    assert not MetadataQuery(isbn="978").is_empty()


def test_conversion_keeps_the_original_object_for_write_back():
    """写回书库依赖 smart_update()，逐字段重建会丢自定义列，因此必须保留原对象。"""
    mi = _FakeMetadata(title="活着", isbn="9787506365437")
    record = to_book_metadata(mi, "talebook.meta.douban-v2")

    assert record["title"] == "活着"
    assert record["provider_key"] == "talebook.meta.douban-v2"
    assert to_calibre_metadata(record) is mi
    assert to_calibre_metadata(record).custom_column_42 == "自定义列不应丢失"
    assert to_calibre_metadata(None) is None


def test_conversion_does_not_overwrite_a_provider_key_set_by_the_source():
    mi = _FakeMetadata(title="活着")
    mi.provider_key = "douban_v2"
    assert to_book_metadata(mi, "talebook.meta.douban-v2")["provider_key"] == "douban_v2"


def test_metadata_providers_default_on_except_neodb_and_keep_legacy_neodb_selection():
    providers = {provider.manifest["id"]: provider for provider in PROVIDER_GROUPS["meta"]}

    assert {plugin_id for plugin_id, provider in providers.items() if provider.initial_enabled({})} == set(providers) - {
        "talebook.meta.neodb"
    }
    assert not providers["talebook.meta.neodb"].initial_enabled({"META_SELECTED_SOURCES": []})
    assert providers["talebook.meta.neodb"].initial_enabled({"META_SELECTED_SOURCES": ["neodb"]})


def test_search_books_rejects_an_empty_query_without_calling_upstream():
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.xhsd")
    with mock.patch.object(type(provider), "_search") as m:
        assert provider.search_books(MetadataQuery(), {}) == []
        m.assert_not_called()


def test_qimao_provider_keeps_catalog_search_separate_from_the_metadata_protocol():
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.qimao")

    with mock.patch.object(provider, "search_catalog", return_value=[]) as search_catalog:
        assert provider.search_books(MetadataQuery(title="活着"), {}) == []

    search_catalog.assert_called_once_with("活着")


def test_ai_provider_reads_connection_config_first_then_falls_back_to_conf():
    """D-27 双读：connection 优先，缺失回落已发布的 CONF 键。"""
    provider = AI_PROVIDER
    conf = {"ai_api_url": "https://conf.example/v1", "ai_api_key": "conf-key", "ai_model": "conf-model"}

    with mock.patch("webserver.loader.get_settings", return_value=conf):
        from_conf = provider._configured({})
        assert (from_conf.api_url, from_conf.api_key, from_conf.model) == (
            "https://conf.example/v1",
            "conf-key",
            "conf-model",
        )

        context = {"config": {"api_url": "https://conn.example/v1"}, "secrets": {"api_key": "conn-key"}}
        from_conn = provider._configured(context)
        # connection 提供的覆盖 CONF，未提供的字段仍回落
        assert from_conn.api_url == "https://conn.example/v1"
        assert from_conn.api_key == "conn-key"
        assert from_conn.model == "conf-model"


def test_ai_provider_stays_silent_without_credentials():
    provider = AI_PROVIDER
    with mock.patch("webserver.loader.get_settings", return_value={}):
        assert provider.search_books(MetadataQuery(title="活着"), {}) == []


def test_calibre_provider_uses_all_identify_sources_without_secondary_configuration():
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.calibre")
    expected = ["google", "amazon", "edelweiss"]
    # 启用这个插件就是启用完整的 Calibre identify 能力，不再暴露二次选源配置。
    assert provider._sources({}) == expected
    assert provider._sources({"config": {"sources": []}}) == expected
    assert provider._sources({"config": {"sources": ["google", "baidu"]}}) == expected


def test_metadata_plugins_only_declare_configuration_when_they_need_it():
    providers = {provider.manifest["id"]: provider for provider in PROVIDER_GROUPS["meta"]}

    assert AI_PROVIDER.manifest["ui"]["configuration_mode"] == "form"
    assert all(provider.manifest["ui"]["configuration_mode"] == "none" for provider in providers.values())


@pytest.mark.parametrize(
    "plugin_id",
    [
        provider.manifest["id"]
        for provider in PROVIDER_GROUPS["meta"]
        if "metadata.lookup" in provider.manifest["capabilities"]
    ],
)
def test_every_mapped_plugin_exposes_the_three_protocol_methods(plugin_id):
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == plugin_id)
    for name in ("search_books", "get_metadata", "get_cover"):
        assert callable(getattr(provider, name, None)), "%s 缺少 %s" % (plugin_id, name)


@pytest.mark.parametrize(
    "plugin_id",
    [
        provider.manifest["id"]
        for provider in PROVIDER_GROUPS["meta"]
        if "metadata.lookup" in provider.manifest["capabilities"]
    ],
)
def test_every_mapped_plugin_is_resolvable_through_the_shared_registry(plugin_id):
    assert REGISTRY.get(plugin_id) is not None


def test_refer_tasks_follow_enabled_plugin_connections_instead_of_legacy_source_settings():
    from webserver.handlers.book import BookRefer

    handler = BookRefer.__new__(BookRefer)
    handler.session = mock.sentinel.session
    handler.user_id = lambda: 1
    call = mock.Mock(return_value=[])
    unit = {
        "key": 17,
        "plugin_key": "talebook.meta.baike",
        "call": call,
    }

    with mock.patch("webserver.handlers.book.ensure_runtime_installations"):
        with mock.patch("webserver.handlers.book.PluginRuntime") as runtime_class:
            runtime = runtime_class.return_value
            runtime.connections_for.return_value = [mock.sentinel.connection]
            runtime.prepare_read.return_value = ([unit], {})
            with mock.patch.dict("webserver.handlers.book.CONF", {"META_SELECTED_SOURCES": ["qimao"]}):
                tasks = handler._build_search_tasks(_FakeMetadata(title="活着", isbn="9787506365437"))

    assert list(tasks) == ["百度百科"]
    tasks["百度百科"]()
    query = call.call_args.args[1]
    assert call.call_args.args[0] == "search_books"
    assert query.title == "活着"
    assert query.isbn == "9787506365437"


def test_xhsd_only_queries_upstream_for_real_isbn():
    """新华书店只支持 ISBN；书名必须被挡在 get_book 里，不能直接送进 ISBN 搜索。"""
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.xhsd")

    with mock.patch.object(type(provider), "get_book_by_isbn") as m:
        assert provider._search(MetadataQuery(title="百年孤独"), {}) == []
        assert not m.called

        m.return_value = _FakeMetadata(title="百年孤独")
        assert len(provider._search(MetadataQuery(isbn="9787544253994"), {})) == 1
        m.assert_called_once_with("9787544253994")


def test_failure_summary_uses_display_names_not_plugin_ids():
    """失败摘要的 source 会直接渲染进用户提示，不能暴露 talebook.meta.* 这类内部 id。"""
    from webserver.handlers.book import BookRefer

    handler = BookRefer.__new__(BookRefer)
    for plugin_id in {
        provider.manifest["id"]
        for provider in PROVIDER_GROUPS["meta"]
        if "metadata.lookup" in provider.manifest["capabilities"]
    }:
        name = handler._meta_task_name(plugin_id)
        assert name == REGISTRY.get(plugin_id).manifest["name"]
        assert not name.startswith("talebook.")
    assert handler._meta_task_name("talebook.meta.does-not-exist") == "talebook.meta.does-not-exist"
