import logging

import pytest

from webserver import main


main.init_calibre()

from calibre.customize.ui import metadata_plugins  # noqa: E402
from calibre.ebooks.metadata.book.base import Metadata  # noqa: E402

from webserver.plugins.meta.calibre.api import (  # noqa: E402
    PROVIDER,
    CalibreMetadataApi,
    CalibreMetadataSourceUnavailable,
    ensure_calibre_metadata_plugins,
)


EXPECTED_IDENTIFY_PLUGIN_NAMES = {"Google", "Amazon.com", "Edelweiss"}
EXPECTED_COVER_PLUGIN_NAMES = {
    "Amazon.com",
    "Big Book Search",
    "Edelweiss",
    "Google Images",
    "Open Library",
}
EXPECTED_PLUGIN_NAMES = EXPECTED_IDENTIFY_PLUGIN_NAMES | EXPECTED_COVER_PLUGIN_NAMES


def _plugins(capabilities):
    return {plugin.name: plugin for plugin in metadata_plugins(capabilities)}


def test_slim_runtime_registers_identify_and_cover_plugins():
    assert EXPECTED_IDENTIFY_PLUGIN_NAMES <= _plugins({"identify"}).keys()
    assert EXPECTED_COVER_PLUGIN_NAMES <= _plugins({"cover"}).keys()


def test_calibre_metadata_plugin_initialization_is_idempotent():
    before = {name: id(plugin) for name, plugin in _plugins({"identify", "cover"}).items() if name in EXPECTED_PLUGIN_NAMES}

    registered = ensure_calibre_metadata_plugins()

    after = {name: id(plugin) for name, plugin in _plugins({"identify", "cover"}).items() if name in EXPECTED_PLUGIN_NAMES}
    assert EXPECTED_PLUGIN_NAMES <= registered
    assert after == before


@pytest.mark.parametrize(
    ("source", "query"),
    [
        ("Google", {"identifiers": {"isbn": "9780000000002"}}),
        ("Amazon.com", {"title": "Controlled title", "authors": ["Test author"]}),
        ("Edelweiss", {"title": "Controlled title", "authors": ["Test author"]}),
    ],
)
def test_identify_dispatches_to_registered_metadata_plugin(monkeypatch, source, query):
    CalibreMetadataApi._ensure_patched()
    plugin = _plugins({"identify"})[source]
    calls = []
    expected = Metadata("Controlled result", ["Test author"])

    def identify(log, result_queue, abort, **kwargs):
        calls.append(kwargs)
        result_queue.put(expected)

    monkeypatch.setattr(plugin, "identify", identify)

    results = CalibreMetadataApi._identify(source=source, timeout=2, **query)

    assert calls == [{"title": None, "authors": None, "identifiers": {}, "timeout": 2} | query]
    assert results == [expected]


def test_missing_metadata_source_raises_diagnostic_error(monkeypatch, caplog):
    monkeypatch.setattr(
        "webserver.plugins.meta.calibre.api.ensure_calibre_metadata_plugins",
        lambda: frozenset(),
    )

    with caplog.at_level(logging.ERROR), pytest.raises(CalibreMetadataSourceUnavailable, match="Google"):
        CalibreMetadataApi.get_book_by_isbn(
            "9780000000002",
            sources=["google"],
            timeout=2,
        )

    assert "Google" in caplog.text


def test_isbn_lookup_queries_all_identify_sources(monkeypatch):
    calls = []

    def identify(*, source, **kwargs):
        calls.append((source, kwargs["identifiers"]))
        result = Metadata("西游记 %s" % source, ["吴承恩"])
        result.isbn = "978000000000%s" % len(calls)
        return [result]

    monkeypatch.setattr(CalibreMetadataApi, "_identify", identify)
    monkeypatch.setattr(CalibreMetadataApi, "_get_amazon_plugin", lambda: None)

    results = CalibreMetadataApi.get_book_by_isbn(
        "9780000000002",
        sources=["google", "amazon", "edelweiss"],
        timeout=8,
    )

    assert calls == [
        ("Google", {"isbn": "9780000000002"}),
        ("Amazon.com", {"isbn": "9780000000002"}),
        ("Edelweiss", {"isbn": "9780000000002"}),
    ]
    assert {result.source for result in results} == {"google", "amazon", "edelweiss"}


def test_title_lookup_queries_all_identify_sources_and_limits_combined_results(monkeypatch):
    calls = []

    def identify(*, source, **kwargs):
        calls.append((source, kwargs["title"], kwargs["authors"]))
        return [Metadata("西游记 %s %s" % (source, index), ["吴承恩"]) for index in range(2)]

    monkeypatch.setattr(CalibreMetadataApi, "_identify", identify)
    monkeypatch.setattr(CalibreMetadataApi, "_get_amazon_plugin", lambda: None)

    results = CalibreMetadataApi.get_book_by_title(
        "西游记",
        authors=["吴承恩"],
        sources=["google", "amazon", "edelweiss"],
        timeout=8,
    )

    assert calls == [
        ("Google", "西游记", ["吴承恩"]),
        ("Amazon.com", "西游记", ["吴承恩"]),
        ("Edelweiss", "西游记", ["吴承恩"]),
    ]
    assert len(results) == 5
    assert {result.source for result in results} == {"google", "amazon", "edelweiss"}


def test_manifest_lists_identify_and_cover_only_sources():
    assert PROVIDER.manifest["name"] == "Calibre 元数据"
    assert PROVIDER.manifest["description"] == (
        "书籍信息检索默认启用 Google Books（Google）、Amazon.com 与 Edelweiss；"
        "Calibre 运行时同时启用 Big Book Search、Google Images 与 Open Library 封面来源。"
    )
