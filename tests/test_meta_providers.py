"""元数据源插件化后的协议与派发回归。"""

from unittest import mock

import pytest

from webserver.plugins.meta.base import CALIBRE_MI_KEY, to_book_metadata, to_calibre_metadata
from webserver.plugins.register import META_SOURCE_TO_PLUGIN, PROVIDER_GROUPS, plugin_ids_for_sources
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


def test_legacy_source_values_map_onto_registered_plugins():
    registered = {provider.manifest["id"] for group in PROVIDER_GROUPS.values() for provider in group}
    assert set(META_SOURCE_TO_PLUGIN.values()) <= registered
    # google 与 amazon 是同一个 Calibre 插件的两个 source，展开后不产生重复项
    assert plugin_ids_for_sources(["google", "amazon"]) == ["talebook.meta.calibre"]
    # booksource 是平台的在线书源服务，不是元数据插件
    assert plugin_ids_for_sources(["booksource"]) == []
    assert plugin_ids_for_sources([]) == []
    # 展开保持配置顺序
    assert plugin_ids_for_sources(["baidu", "douban_v2"]) == [
        "talebook.meta.baike",
        "talebook.meta.douban-v2",
    ]


def test_search_books_rejects_an_empty_query_without_calling_upstream():
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.xhsd")
    with mock.patch.object(type(provider), "_search") as m:
        assert provider.search_books(MetadataQuery(), {}) == []
        m.assert_not_called()


def test_ai_provider_reads_connection_config_first_then_falls_back_to_conf():
    """D-27 双读：connection 优先，缺失回落已发布的 CONF 键。"""
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.ai")
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
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.ai")
    with mock.patch("webserver.loader.get_settings", return_value={}):
        assert provider.search_books(MetadataQuery(title="活着"), {}) == []


def test_calibre_provider_only_uses_google_and_amazon_sources():
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == "talebook.meta.calibre")
    # connection 明确指定时只保留 calibre 认识的两个 source
    assert provider._sources({"config": {"sources": ["google", "baidu"]}}) == ["google"]

    with mock.patch("webserver.loader.get_settings", return_value={"META_SELECTED_SOURCES": ["amazon", "xinhua"]}):
        # 未配置 connection 时回落 CONF，并同样只保留这两个
        assert provider._sources({}) == ["amazon"]
        assert provider._sources({"config": {"sources": []}}) == ["amazon"]

    with mock.patch("webserver.loader.get_settings", return_value={"META_SELECTED_SOURCES": ["xinhua"]}):
        # 两个 source 都没启用时不发起查询
        assert provider._sources({}) == []
        assert provider._search(MetadataQuery(title="活着"), {}) == []


@pytest.mark.parametrize("plugin_id", [pid for pid in META_SOURCE_TO_PLUGIN.values()])
def test_every_mapped_plugin_exposes_the_three_protocol_methods(plugin_id):
    provider = next(p for p in PROVIDER_GROUPS["meta"] if p.manifest["id"] == plugin_id)
    for name in ("search_books", "get_metadata", "get_cover"):
        assert callable(getattr(provider, name, None)), "%s 缺少 %s" % (plugin_id, name)


@pytest.mark.parametrize("plugin_id", [pid for pid in META_SOURCE_TO_PLUGIN.values()])
def test_every_mapped_plugin_is_resolvable_through_the_shared_registry(plugin_id):
    assert REGISTRY.get(plugin_id) is not None


def test_refer_task_reaches_the_provider_instead_of_swallowing_lookup_errors():
    """派发任务必须真正拿到 provider：查不到时只能是插件缺失，不能是调用写错。"""
    from webserver.handlers.book import BookRefer

    handler = BookRefer.__new__(BookRefer)
    plugin_id = "talebook.meta.douban-v2"
    query = MetadataQuery(title="活着")
    records = [to_book_metadata(_FakeMetadata(title="活着"), plugin_id)]

    with mock.patch.object(type(REGISTRY.get(plugin_id)), "search_books", return_value=records) as m:
        results = handler._make_metadata_task(plugin_id, query, ["douban_v2"])()

    assert m.called, "provider 未被调用，说明 registry 查找被静默吞掉了"
    assert [b.title for b in results] == ["活着"]
    assert results[0].provider_key == plugin_id


def test_refer_task_returns_empty_for_an_unregistered_plugin():
    from webserver.handlers.book import BookRefer

    handler = BookRefer.__new__(BookRefer)
    task = handler._make_metadata_task("talebook.meta.does-not-exist", MetadataQuery(title="活着"), [])
    assert task() == []


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
    for plugin_id in set(META_SOURCE_TO_PLUGIN.values()):
        name = handler._meta_task_name(plugin_id)
        assert name == REGISTRY.get(plugin_id).manifest["name"]
        assert not name.startswith("talebook.")
    assert handler._meta_task_name("talebook.meta.does-not-exist") == "talebook.meta.does-not-exist"
