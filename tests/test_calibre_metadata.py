import logging

import pytest

from webserver import main


main.init_calibre()

from calibre.customize.ui import metadata_plugins  # noqa: E402
from calibre.ebooks.metadata.book.base import Metadata  # noqa: E402

from webserver.plugins.meta.calibre.api import (  # noqa: E402
    CalibreMetadataApi,
    CalibreMetadataSourceUnavailable,
    ensure_calibre_metadata_plugins,
)


EXPECTED_PLUGIN_NAMES = {"Google", "Amazon.com"}


def _identify_plugins():
    return {plugin.name: plugin for plugin in metadata_plugins({"identify"})}


def test_slim_runtime_registers_google_and_amazon_plugins():
    assert EXPECTED_PLUGIN_NAMES <= _identify_plugins().keys()


def test_calibre_metadata_plugin_initialization_is_idempotent():
    before = {name: id(plugin) for name, plugin in _identify_plugins().items() if name in EXPECTED_PLUGIN_NAMES}

    registered = ensure_calibre_metadata_plugins()

    after = {name: id(plugin) for name, plugin in _identify_plugins().items() if name in EXPECTED_PLUGIN_NAMES}
    assert EXPECTED_PLUGIN_NAMES <= registered
    assert after == before


@pytest.mark.parametrize(
    ("source", "query"),
    [
        ("Google", {"identifiers": {"isbn": "9780000000002"}}),
        ("Amazon.com", {"title": "Controlled title", "authors": ["Test author"]}),
    ],
)
def test_identify_dispatches_to_registered_metadata_plugin(monkeypatch, source, query):
    CalibreMetadataApi._ensure_patched()
    plugin = _identify_plugins()[source]
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
