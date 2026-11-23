import pytest

from webserver.plugins.combo.weread.provider import WereadProvider
from webserver.plugins.runtime.protocol import UpstreamAuthError, UpstreamError, UpstreamRateLimitError


NOTICE = {"message": "download and retry", "upgrade_url": "https://example.invalid/skill"}
SECRETS = {"api_key": "unit-test-key"}


class FakeHttp:
    def __init__(self, *responses):
        self.responses = iter(responses)
        self.requests = []

    def json(self, _method, _url, **kwargs):
        self.requests.append(kwargs["json"])
        response = next(self.responses)
        if isinstance(response, Exception):
            raise response
        return response


@pytest.mark.parametrize("notice", [None, NOTICE])
@pytest.mark.parametrize("books", [[], [{"book": {"bookId": "book-1"}, "sort": 10}]])
def test_connection_accepts_normal_and_notice_responses_with_valid_books(books, notice):
    reply = {"books": books}
    if notice is not None:
        reply["upgrade_info"] = notice
    http = FakeHttp(reply)
    result = WereadProvider(http=http).execute({"action": "test", "secrets": SECRETS})

    assert result.health_message.startswith("WeRead API connection healthy")
    assert ("update is available" in result.health_message) == (notice is not None)
    assert "example.invalid" not in result.health_message
    assert "download and retry" not in result.health_message
    assert http.requests == [{"api_name": "/user/notebooks", "skill_version": "1.0.6", "count": 1}]


@pytest.mark.parametrize("action", ["test", "run"])
@pytest.mark.parametrize(
    "reply",
    [
        {"upgrade_info": NOTICE},
        {"upgrade_info": NOTICE, "errcode": 0},
        {"upgrade_info": NOTICE, "errcode": "0", "hasMore": False, "books": None},
        {"errcode": 0},
    ],
)
def test_missing_notebook_array_fails_instead_of_reporting_healthy_or_empty(action, reply):
    http = FakeHttp(reply)
    with pytest.raises(UpstreamError, match="valid books list"):
        WereadProvider(http=http).execute({"action": action, "secrets": SECRETS})
    assert len(http.requests) == 1


@pytest.mark.parametrize("response", [{"books": []}, {"books": [], "upgrade_info": NOTICE}])
def test_real_empty_notebook_page_ends_import(response):
    http = FakeHttp(response)
    result = WereadProvider(http=http).list_annotations({"secrets": SECRETS})
    assert result.items == []
    assert not result.has_more
    assert len(http.requests) == 1


@pytest.mark.parametrize(
    ("errcode", "error_type"),
    [(-2010, UpstreamAuthError), (-2009, UpstreamRateLimitError), (5000, UpstreamError)],
)
def test_real_gateway_error_wins_over_upgrade_notice_and_business_fields(errcode, error_type):
    http = FakeHttp({"errcode": errcode, "errmsg": "upstream rejected", "upgrade_info": NOTICE, "books": []})
    with pytest.raises(error_type, match="upstream rejected") as exc:
        WereadProvider(http=http).execute({"action": "test", "secrets": SECRETS})
    assert type(exc.value) is error_type
    assert len(http.requests) == 1


def test_transport_error_propagates_unchanged():
    error = UpstreamAuthError("HTTP authentication failed")
    http = FakeHttp(error)
    with pytest.raises(UpstreamAuthError) as exc:
        WereadProvider(http=http).execute({"action": "test", "secrets": SECRETS})
    assert exc.value is error
    assert len(http.requests) == 1


NOTEBOOKS = {"books": [{"book": {"bookId": "book-1"}, "sort": 10}], "upgrade_info": NOTICE}


@pytest.mark.parametrize(
    ("responses", "missing"),
    [
        ([NOTEBOOKS, {"upgrade_info": NOTICE, "errcode": 0}], "updated"),
        ([NOTEBOOKS, {"updated": []}, {"upgrade_info": NOTICE, "errcode": 0, "hasMore": False}], "reviews"),
    ],
)
def test_notice_only_detail_pages_fail_instead_of_producing_empty_import(responses, missing):
    http = FakeHttp(*responses)
    with pytest.raises(UpstreamError, match=f"valid {missing} list"):
        WereadProvider(http=http).list_annotations({"secrets": SECRETS})
    assert len(http.requests) == len(responses)


def test_upgrade_notice_does_not_interrupt_or_repeat_successful_review_pages():
    http = FakeHttp(
        NOTEBOOKS,
        {"updated": [], "upgrade_info": NOTICE},
        {"reviews": [], "hasMore": True, "synckey": 7, "upgrade_info": NOTICE},
        NOTEBOOKS,
        {"updated": [], "upgrade_info": NOTICE},
        {"reviews": [], "hasMore": False, "upgrade_info": NOTICE},
    )
    provider = WereadProvider(http=http)
    first = provider.list_annotations({"secrets": SECRETS})
    second = provider.list_annotations({"secrets": SECRETS, "cursor": first.next_cursor})
    assert first.has_more
    assert not second.has_more
    assert [body["api_name"] for body in http.requests] == [
        "/user/notebooks",
        "/book/bookmarklist",
        "/review/list/mine",
    ] * 2
    assert [body["synckey"] for body in http.requests if body["api_name"] == "/review/list/mine"] == [0, 7]


def test_other_read_payload_retains_notification_without_forwarding_context():
    response = {"results": [], "upgrade_info": NOTICE}
    http = FakeHttp(response)
    assert WereadProvider(http=http).query(SECRETS["api_key"], "search", {"keyword": "三体"}) == response
    assert http.requests == [{"api_name": "/store/search", "skill_version": "1.0.6", "keyword": "三体"}]


def test_generic_notice_and_pagination_metadata_do_not_count_as_business_data():
    http = FakeHttp({"errcode": 0, "upgrade_info": NOTICE, "hasMore": False, "maxIdx": 0})
    with pytest.raises(UpstreamError, match="without business data"):
        WereadProvider(http=http).query(SECRETS["api_key"], "search", {"keyword": "三体"})
    assert len(http.requests) == 1
