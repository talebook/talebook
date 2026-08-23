import logging

import pytest
import requests

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
        CalibreMetadataApi._identify(
            source="Google",
            identifiers={"isbn": "9780000000002"},
            timeout=2,
        )

    assert "Google" in caplog.text


def test_google_search_falls_back_from_isbn_to_title_and_marks_provider(monkeypatch):
    calls = []
    payloads = iter(
        [
            {"totalItems": 0},
            {
                "items": [
                    {
                        "id": "google-book-id",
                        "volumeInfo": {
                            "title": "西游记",
                            "authors": ["吴承恩"],
                            "publisher": "测试出版社",
                            "industryIdentifiers": [{"type": "ISBN_13", "identifier": "9780000000002"}],
                        },
                    }
                ]
            },
        ]
    )

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return next(payloads)

    def get(*args, **kwargs):
        calls.append(kwargs)
        return Response()

    monkeypatch.setattr("webserver.plugins.meta.calibre.api.requests.get", get)

    results = CalibreMetadataApi.search(
        "google",
        title="西游记",
        authors=["吴承恩"],
        isbn="9780000000002",
        timeout=10,
    )

    assert [call["params"]["q"] for call in calls] == [
        "isbn:9780000000002",
        'intitle:"西游记" inauthor:"吴承恩"',
    ]
    assert [result.title for result in results] == ["西游记"]
    assert results[0].source == "Google Books"
    assert results[0].provider_key == "Calibre"
    assert results[0].provider_value == "google"


def test_calibre_search_limits_one_source_to_five_candidates(monkeypatch):
    candidates = [Metadata("候选%d" % index, ["作者"]) for index in range(8)]
    monkeypatch.setattr(CalibreMetadataApi, "_search_google_books", lambda *args, **kwargs: candidates)

    results = CalibreMetadataApi.search("google", title="西游记", limit=5)

    assert len(results) == 5


def test_google_search_falls_back_to_atom_feed_when_json_api_is_rate_limited(monkeypatch):
    feed = """<?xml version="1.0" encoding="UTF-8"?>
    <feed xmlns="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/terms">
      <entry>
        <id>http://www.google.com/books/feeds/volumes/google-feed-id</id>
        <title>西游记</title>
        <link rel="alternate" href="http://books.google.com/books?id=google-feed-id" />
        <dc:creator>吴承恩</dc:creator>
        <dc:identifier>ISBN:9787570402083</dc:identifier>
        <dc:description>古典名著</dc:description>
      </entry>
    </feed>""".encode()

    class RateLimited:
        status_code = 429

        def raise_for_status(self):
            raise requests.HTTPError("429")

    class FeedResponse:
        status_code = 200
        content = feed

        def raise_for_status(self):
            return None

    responses = iter([RateLimited(), FeedResponse()])
    monkeypatch.setattr("webserver.plugins.meta.calibre.api.requests.get", lambda *args, **kwargs: next(responses))

    results = CalibreMetadataApi.search("google", title="西游记", authors=["吴承恩"], limit=5)

    assert [result.title for result in results] == ["西游记"]
    assert results[0].isbn == "9787570402083"
    assert results[0].website.startswith("https://books.google.com/")


def test_google_search_ignores_synthetic_isbn(monkeypatch):
    calls = []
    expected = Metadata("西游记", ["吴承恩"])

    def search(title, authors, isbn, timeout, limit):
        calls.append({"title": title, "authors": authors, "isbn": isbn, "timeout": timeout, "limit": limit})
        return [expected]

    monkeypatch.setattr(CalibreMetadataApi, "_search_google_books", search)

    results = CalibreMetadataApi.search(
        "google",
        title="西游记",
        authors=["吴承恩"],
        isbn="0000000000004",
    )

    assert results == [expected]
    assert len(calls) == 1
    assert calls[0]["title"] == "西游记"
    assert calls[0]["isbn"] == ""


def test_amazon_search_uses_public_catalog_and_limits_results(monkeypatch):
    rows = "".join(
        """
        <div data-component-type="s-search-result" data-asin="ASIN{index}">
          <div data-component-type="s-product-image"><img src="https://img/{index}.jpg"></div>
          <div data-cy="title-recipe">
            <a href="/dp/ASIN{index}"><h2><span>西游记 {index}</span></h2></a>
            <div class="a-color-secondary">中文版本 | 吴承恩 | 2024出版</div>
          </div>
        </div>
        """.format(index=index)
        for index in range(7)
    )
    response = type(
        "Response",
        (),
        {
            "content": ("<html><body>%s</body></html>" % rows).encode(),
            "encoding": "utf-8",
            "raise_for_status": lambda self: None,
        },
    )()
    monkeypatch.setattr("webserver.plugins.meta.calibre.api.requests.get", lambda *args, **kwargs: response)

    results = CalibreMetadataApi.search("amazon", title="西游记", authors=["吴承恩"], limit=5)

    assert len(results) == 5
    assert results[0].title == "西游记 0"
    assert results[0].authors == ["吴承恩"]
    assert results[0].get_identifiers()["amazon"] == "ASIN0"
    assert results[0].source == "Amazon"
    assert results[0].cover_url == "https://img/0.jpg"
    assert results[0].website == "https://www.amazon.com/dp/ASIN0"
