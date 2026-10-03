"""Real pinned MangaDex source/API; inject only controlled HTTP 503 failures."""

import datetime
import json
from unittest import mock

from webserver.plugins.runtime.protocol import UpstreamError
from webserver.plugins.source import venera


BOOK = "df25d42b-806c-4cc5-9aef-ce08daa4b83a"


def run():
    real_http = venera.public_http
    calls = []

    def fault_http(*args, **kwargs):
        client = real_http(*args, **kwargs)
        request = client.request

        def faulty(method, url, **options):
            calls.append(url.split("?")[0])
            if "/statistics/manga/" in url:
                raise UpstreamError("Controlled HTTP 503")
            return request(method, url, **options)

        client.request = faulty
        return client

    provider = venera.VeneraProvider()
    with mock.patch.object(venera, "public_http", side_effect=fault_http):
        book = provider.get_book(BOOK, {"config": {"timeout_seconds": 45}})
        chapters = provider.get_toc(book, {})
    assert chapters and any("/statistics/manga/" in url for url in calls)
    required_http = real_http()
    required_http.request = mock.Mock(side_effect=UpstreamError("Controlled required HTTP 503"))
    with mock.patch.object(venera, "public_http", return_value=required_http):
        try:
            provider.get_book(BOOK, {})
        except UpstreamError as exc:
            required_error = exc.code
        else:
            raise AssertionError("Required request failure must not be swallowed")
    report = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "source_commit": venera.SOURCE_COMMIT,
        "source_sha256": venera.SOURCE_SHA256,
        "real_pinned_script": True,
        "required_metadata_chapter_api_mocks": False,
        "statistics_injected_status": 503,
        "detail_succeeded": True,
        "title": book.title,
        "chapters": len(chapters),
        "successful_calls_before_statistics": len(calls) - 1,
        "successful_required_mangadex_requests": sum(
            url.startswith("https://api.mangadex.org/") and "/statistics/" not in url for url in calls
        ),
        "separate_required_failure_error": required_error,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    run()
