import json
from types import SimpleNamespace
from unittest import mock

import pytest
import requests

from webserver.plugins.runtime.domains import SourceChapter
from webserver.plugins.runtime.protocol import UpstreamAuthError, UpstreamError, UpstreamRateLimitError
from webserver.plugins.runtime.safe_http import EndpointPolicyError, EndpointResponseTooLarge
from webserver.plugins.source import venera


BOOK_ID = "00000000-0000-0000-0000-000000000001"
EP_ID = "00000000-0000-0000-0000-000000000002"
COVER = f"https://uploads.mangadex.org/covers/{BOOK_ID}/cover.jpg"
IMAGE = "https://uploads.mangadex.org/data/hash/01.jpg"
SCRIPT = (
    """
class MangaDex extends ComicSource {
    key = 'manga_dex';
    api = {getRecent: async page => (await fetch('https://api.mangadex.org/manga?page='+page)).json()};
    search = {load: async (query, options, page) => this.api.getRecent(page)};
    comic = {
        loadInfo: async id => new ComicDetails({title: '漫画', cover: 'COVER',
            chapters: new Map([['Volume 1 - EN', new Map([['EP_ID', '2: First'], ['BOOK_ID', '10: Next']])]])}),
        loadEp: async () => ({images: ['IMAGE', 'https://uploads.mangadex.org/data/hash/02.jpg']}),
        onImageLoad: url => ({url, headers: {Referer: 'https://mangadex.org/', Origin: 'https://mangadex.org'}}),
    };
}
""".replace("COVER", COVER)
    .replace("EP_ID", EP_ID)
    .replace("BOOK_ID", BOOK_ID)
    .replace("IMAGE", IMAGE)
)


class Http:
    def __init__(self, payload=None):
        self.payload = payload or {"comics": [{"id": BOOK_ID, "title": "漫画", "cover": COVER}], "maxPage": 2}
        self.calls = []
        self.session = SimpleNamespace(close=lambda: None)

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        return SimpleNamespace(status_code=200, content=json.dumps(self.payload).encode())


@pytest.fixture
def provider():
    with (
        mock.patch.object(venera, "source_script", return_value=SCRIPT),
        mock.patch.object(venera, "public_http", side_effect=Http),
    ):
        yield venera.VeneraProvider()


def test_async_source_runs_with_pagination_and_nested_map_order(provider):
    page = provider.browse("recent", {"page": 1}, {})
    assert page.items[0].extra["media_type"] == "comic"
    assert page.has_more and page.next_cursor == {"page": 2}
    assert not provider.search("漫画", {"page": 2}, {}).has_more
    book = provider.get_book(BOOK_ID, {})
    toc = provider.get_toc(book, {})
    assert [chapter.title for chapter in toc] == ["Volume 1 - EN · 2: First", "Volume 1 - EN · 10: Next"]
    content = provider.get_chapter(toc[0], {})
    assert [image["url"] for image in content.extra["images"]] == [IMAGE, IMAGE.replace("01", "02")]


def test_worker_does_not_expose_environment_or_native_host():
    script = SCRIPT.replace(
        "key = 'manga_dex';",
        "key = 'manga_dex'; init() { if (typeof process !== 'undefined' || typeof require !== 'undefined' || typeof __input.secrets !== 'undefined') throw 'leaked'; }",
    )
    result = venera.run_source(script, "browse", {"category": "recent", "page": 1}, {}, Http())
    assert result["comics"][0]["id"] == BOOK_ID


def test_cpu_loop_is_interrupted_and_worker_collected():
    script = SCRIPT.replace("key = 'manga_dex';", "key = 'manga_dex'; init() { while (true) {} }")
    with pytest.raises(venera.VeneraUnsupported):
        venera.run_source(script, "browse", {"category": "recent", "page": 1}, {}, Http())


def test_memory_exhaustion_is_bounded():
    script = SCRIPT.replace(
        "key = 'manga_dex';",
        "key = 'manga_dex'; init() { let list=[]; while(true) list.push(new Array(100000).fill('data')); }",
    )
    with pytest.raises(venera.VeneraUnsupported):
        venera.run_source(script, "browse", {"category": "recent", "page": 1}, {}, Http())


def test_revoked_runtime_scope_prevents_network_calls(provider):
    with mock.patch.object(venera, "public_http") as http:
        with pytest.raises(venera.VeneraScopeDenied):
            provider.browse("recent", {}, {"scopes": ["books.read"]})
        http.assert_not_called()


@pytest.mark.parametrize(
    "url",
    [
        "http://api.mangadex.org/manga",
        "https://127.0.0.1/manga",
        "https://api.mangadex.org.evil.test/manga",
        "https://x:y@api.mangadex.org/manga",
        "https://api.mangadex.org:8080/manga",
    ],
)
def test_network_policy_is_applied_before_host_request(url):
    http = Http()
    script = SCRIPT.replace("https://api.mangadex.org/manga?page=", url + "?page=")
    with pytest.raises(EndpointPolicyError):
        venera.run_source(script, "browse", {"category": "recent", "page": 1}, {}, http)
    assert not http.calls


@pytest.mark.parametrize(
    "url",
    [
        "file:///etc/passwd",
        "https://evil.test/data/x",
        "https://api.mangadex.org/users",
        "https://mangadex.org/login",
        "https://user:pass@uploads.mangadex.org/data/x",
    ],
)
def test_image_policy(url):
    with pytest.raises(EndpointPolicyError):
        venera.image_endpoint(url)


def test_source_digest_must_match_before_execution():
    with mock.patch.object(venera, "_SOURCE", None):
        with pytest.raises(venera.VeneraUnsupported, match="摘要不匹配"):
            venera.source_script(Http(), 1)


def test_credentials_and_unsupported_sources_are_rejected(provider):
    with pytest.raises(venera.VeneraUnsupported, match="无需账号"):
        provider.browse("recent", {}, {"secrets": {"password": "not-to-be-forwarded"}})
    with pytest.raises(venera.VeneraUnsupported):
        provider.browse("recent", {}, {"config": {"source": "unknown"}})


def test_malformed_or_empty_chapters_fail_explicitly(provider):
    with pytest.raises(venera.VeneraUnsupported):
        provider.get_chapter(SourceChapter("invalid", ""), {})
    with mock.patch.object(provider, "_call", return_value={"images": []}):
        with pytest.raises(venera.VeneraUnsupported, match="没有可读取"):
            provider.get_chapter(SourceChapter(venera.chapter_id(BOOK_ID, EP_ID), ""), {})


def test_unsettled_promise_is_rejected_without_hanging():
    script = SCRIPT.replace("this.api.getRecent(page)", "new Promise(() => {})")
    with pytest.raises(venera.VeneraUnsupported):
        venera.run_source(script, "search", {"query": "", "page": 1}, {}, Http())


@pytest.mark.parametrize(
    "failure, expected",
    [
        (requests.ReadTimeout(), venera.VeneraTimeout),
        (requests.ConnectionError(), venera.UpstreamError),
        (UpstreamAuthError(), UpstreamAuthError),
    ],
)
def test_connection_and_access_failures_are_explicit(provider, failure, expected):
    with mock.patch.object(venera, "run_source", side_effect=failure):
        with pytest.raises(expected):
            provider.browse("recent", {}, {})


def test_http_size_limit_is_enforced_during_streaming():
    response = mock.Mock()
    response.iter_content.return_value = [b"a" * 8, b"b" * 8]
    session = venera.PublicSession(10)
    with mock.patch.object(requests.Session, "request", return_value=response):
        with pytest.raises(EndpointResponseTooLarge):
            session.request("GET", "https://api.mangadex.org/manga")
    response.close.assert_called_once()
    session.close()


def test_source_request_count_is_bounded():
    script = SCRIPT.replace(
        "key = 'manga_dex';",
        "key = 'manga_dex'; async init() { for(let i=0;i<100;i++) await fetch('https://api.mangadex.org/manga'); }",
    )
    http = Http()
    with pytest.raises(venera.VeneraUnsupported, match="请求过多"):
        venera.run_source(script, "browse", {"category": "recent", "page": 1}, {}, http)
    assert len(http.calls) == venera.MAX_REQUESTS


OPTIONAL_SCRIPT = """
class MangaDex extends ComicSource {
    key = 'manga_dex';
    comic = {loadInfo: async id => {
        await fetch('https://api.mangadex.org/manga/' + id);
        let description = 'Statistics available';
        try { await fetch('https://api.mangadex.org/statistics/manga/' + id); }
        catch (error) { description = error.message; }
        return new ComicDetails({title: '漫画', description,
            chapters: new Map([['Volume 1 - EN', new Map([['EP_ID', '1: First']])]])});
    }};
}
""".replace("EP_ID", EP_ID)


@pytest.mark.parametrize(
    "failure",
    [UpstreamError("private HTTP 503 body"), requests.ConnectionError("private URL"), requests.ReadTimeout()],
)
def test_optional_request_failure_is_catchable_without_exposing_exception_text(failure):
    http = Http()
    original = http.request

    def request(method, url, **kwargs):
        if "/statistics/manga/" in url:
            raise failure
        return original(method, url, **kwargs)

    http.request = request
    with (
        mock.patch.object(venera, "source_script", return_value=OPTIONAL_SCRIPT),
        mock.patch.object(venera, "public_http", return_value=http),
    ):
        provider = venera.VeneraProvider()
        book = provider.get_book(BOOK_ID, {})
        assert book.description == "Venera upstream request failed"
        assert provider.get_toc(book, {})[0].title == "Volume 1 - EN · 1: First"


@pytest.mark.parametrize(
    "failure,expected",
    [
        (UpstreamError("HTTP 503"), UpstreamError),
        (UpstreamAuthError(), UpstreamAuthError),
        (UpstreamRateLimitError(), UpstreamRateLimitError),
        (requests.ConnectionError("private URL"), UpstreamError),
        (requests.ReadTimeout(), venera.VeneraTimeout),
    ],
)
def test_uncaught_required_request_failure_preserves_explicit_error_type(failure, expected):
    with (
        mock.patch.object(venera, "source_script", return_value=OPTIONAL_SCRIPT),
        mock.patch.object(venera, "public_http", return_value=Http()) as factory,
    ):
        factory.return_value.request = mock.Mock(side_effect=failure)
        with pytest.raises(expected):
            venera.VeneraProvider().get_book(BOOK_ID, {})


@pytest.mark.parametrize("failure", [EndpointPolicyError(), EndpointResponseTooLarge()])
def test_source_catch_cannot_bypass_host_network_or_size_limits(failure):
    http = Http()
    http.request = mock.Mock(side_effect=failure)
    catching = OPTIONAL_SCRIPT.replace("await fetch('https://api.mangadex.org/manga/' + id);", "")
    with pytest.raises(type(failure)):
        venera.run_source(catching, "book", {"id": BOOK_ID}, {}, http)
