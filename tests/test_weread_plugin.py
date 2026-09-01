import copy
import datetime
import json
import zipfile
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import (
    Annotation,
    AnnotationSource,
    Base,
    PluginConnection,
    PluginEntityMatch,
    PluginRunItem,
    PluginSourceRecord,
)
from webserver.plugins.combo.weread import WEREAD_PLUGIN_KEY, WereadProvider, parse_weread_export
from webserver.plugins.combo.weread.provider import validate_weread_query
from webserver.plugins.runtime import UpstreamAuthError, UpstreamError, UpstreamRateLimitError
from webserver.plugins.runtime.safe_http import SafeHttpClient
from webserver.services.annotation_writer import confirm_match, locate_epub_quote, normalize_text
from webserver.services.plugin_runtime import PluginRuntime, install_builtin, save_connection


SETTINGS = {"PLUGIN_SECRET_KEY": "weread-unit-test-key", "cookie_secret": "unused-cookie-secret"}
SAMPLE = {
    "book": {"bookId": "3300045871", "title": "活着", "author": "余华"},
    "chapters": [{"chapterUid": 12, "title": "第一章"}],
    "bookmarks": [
        {
            "bookmarkId": "b1",
            "chapterUid": 12,
            "markText": "人是为活着本身而活着的",
            "range": "2959-3007",
            "createTime": 1778312777,
            "colorStyle": "orange",
            "type": 1,
        },
        {"bookmarkId": "bookmark-only", "type": 0},
    ],
    "reviews": [
        {
            "review": {
                "reviewId": "r1",
                "content": "这句话值得反复读",
                "abstract": "人是为活着本身而活着的",
                "range": "2959-3007",
                "chapterUid": 12,
                "chapterName": "第一章",
                "createTime": 1778312777,
            }
        },
        {"reviewId": "r2", "content": "五星推荐", "star": 5, "createTime": 1778312778},
    ],
}


class FakeNewAPI:
    def __init__(self, owner):
        self.owner = owner

    def all_book_ids(self):
        return list(self.owner.books)


class FakeCalibreDB:
    def __init__(self, books, epub_path=None):
        self.books = books
        self.new_api = FakeNewAPI(self)
        self.epub_path = epub_path

    def get_metadata(self, book_id, index_is_id=True):
        value = self.books[int(book_id)]
        return SimpleNamespace(
            title=value["title"],
            authors=value["authors"],
            isbn=value.get("isbn", ""),
            identifiers=value.get("identifiers", {}),
        )

    def format_abspath(self, book_id, fmt, index_is_id=True):
        return self.epub_path


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def build_connection(session):
    installation = install_builtin(session, WEREAD_PLUGIN_KEY, installed_by=1)
    return save_connection(
        session,
        SETTINGS,
        installation.id,
        "user",
        1,
        {},
        name="微信读书",
    )


def execute(session, connection, calibre_db, payload=SAMPLE, action="run", parent_run_id=None):
    runtime = PluginRuntime(session, SETTINGS, sleeper=lambda _: None, calibre_db=calibre_db)
    run = runtime.prepare_run(
        connection.id,
        action,
        requested_by=1,
        parent_run_id=parent_run_id,
        input_data={"export": payload, "allowed_book_ids": list(calibre_db.books)},
    )
    runtime.execute(run.id)
    session.refresh(run)
    return run


def test_parser_covers_issue_943_and_does_not_invent_bookmark_content():
    items = parse_weread_export(SAMPLE)
    assert len(items) == 3
    assert [item.entity_type for item in items] == ["annotation", "annotation", "annotation"]
    assert items[0].external_id == "weread:3300045871:bookmark:b1"
    assert items[0].data == {
        "source_book_id": "3300045871",
        "book": {"provider_id": "3300045871", "isbn": "", "title": "活着", "author": "余华"},
        "annotation_type": "highlight",
        "chapter": "第一章",
        "quote_text": "人是为活着本身而活着的",
        "content": "",
        "color": "orange",
        "user_modified_at": "2026-05-09T07:46:17Z",
        "source_position": "chapterUid=12;range=2959-3007",
    }
    assert items[1].data["annotation_type"] == "note"
    assert items[2].data["chapter"] == "整本书评"
    assert all("bookmark-only" not in item.external_id for item in items)
    assert len(parse_weread_export([SAMPLE, SAMPLE])) == 3


def test_parser_rejects_a_non_collection_export_payload():
    with pytest.raises(UpstreamError, match="JSON object or array"):
        parse_weread_export("invalid")


def test_annotation_pages_advance_nested_notebook_and_review_cursors(monkeypatch):
    provider = WereadProvider()
    review_calls = []

    def gateway(_api_key, api_name, **params):
        if api_name == "/user/notebooks":
            if params.get("lastSort") == 10:
                return {
                    "books": [{"book": {"bookId": "book-2", "title": "第二本"}, "sort": 20}],
                    "hasMore": False,
                }
            return {
                "books": [{"book": {"bookId": "book-1", "title": "第一本"}, "sort": 10}],
                "hasMore": True,
            }
        if api_name == "/book/bookmarklist":
            return {"book": {"bookId": params["bookId"], "title": params["bookId"]}, "updated": []}
        if api_name == "/review/list/mine":
            review_calls.append((params["bookid"], params["synckey"]))
            if params["bookid"] == "book-1" and params["synckey"] == 0:
                return {"reviews": [], "hasMore": True, "synckey": 7}
            return {"reviews": [], "hasMore": False}
        raise AssertionError(api_name)

    monkeypatch.setattr(provider, "_gateway", gateway)
    context = {"secrets": {"api_key": "unit-test-key"}, "cursor": {}}

    first = provider.list_annotations(context)
    second = provider.list_annotations({**context, "cursor": first.next_cursor})
    third = provider.list_annotations({**context, "cursor": second.next_cursor})

    assert first.has_more is True
    assert first.next_cursor == {"last_sort": None, "notebook_index": 0, "review_synckey": 7}
    assert second.has_more is True
    assert second.next_cursor == {"last_sort": 10, "notebook_index": 0, "review_synckey": 0}
    assert third.has_more is False
    assert review_calls == [("book-1", 0), ("book-1", 7), ("book-2", 0)]


@pytest.mark.parametrize(
    ("status", "error_type"),
    [(401, UpstreamAuthError), (403, UpstreamAuthError), (429, UpstreamRateLimitError)],
)
def test_gateway_maps_auth_and_rate_limit_errors_without_leaking_key(status, error_type):
    class FakeSession:
        def request(self, *_args, **_kwargs):
            return SimpleNamespace(
                status_code=status,
                headers={"Retry-After": "0"},
                content=b"",
                json=lambda: {},
            )

    def public(*args, **kwargs):
        return [(2, 1, 6, "", ("93.184.216.34", 443))]
    provider = WereadProvider(http=SafeHttpClient(session=FakeSession(), resolver=public))
    with pytest.raises(error_type) as exc:
        provider._gateway("wrk-do-not-leak", "/user/notebooks", count=1)
    assert "wrk-do-not-leak" not in str(exc.value)


@pytest.mark.parametrize(
    ("operation", "params", "api_name"),
    [
        ("search", {"keyword": "三体", "scope": 10, "count": 20, "maxIdx": 0}, "/store/search"),
        ("book_info", {"bookId": "book-1"}, "/book/info"),
        ("chapters", {"bookId": "book-1"}, "/book/chapterinfo"),
        ("progress", {"bookId": "book-1"}, "/book/getprogress"),
        ("shelf", {}, "/shelf/sync"),
        ("statistics", {"mode": "monthly", "baseTime": 0}, "/readdata/detail"),
        ("notebooks", {"count": 20, "lastSort": 0}, "/user/notebooks"),
        ("highlights", {"bookId": "book-1"}, "/book/bookmarklist"),
        ("my_reviews", {"bookid": "book-1", "synckey": 0, "count": 20}, "/review/list/mine"),
        (
            "popular_highlights",
            {"bookId": "book-1", "chapterUid": 1, "synckey": 0},
            "/book/bestbookmarks",
        ),
        ("underline_stats", {"bookId": "book-1", "chapterUid": 1, "synckey": 0}, "/book/underlines"),
        (
            "highlight_reviews",
            {"bookId": "book-1", "chapterUid": 1, "reviews": [{"range": "10-20", "count": 20}]},
            "/book/readreviews",
        ),
        (
            "review_detail",
            {
                "reviewId": "review-1",
                "commentsCount": 20,
                "commentsDirection": 0,
                "likesCount": 20,
                "likesDirection": 1,
                "synckey": 0,
            },
            "/review/single",
        ),
        (
            "public_reviews",
            {"bookId": "book-1", "reviewListType": 0, "count": 20, "maxIdx": 0, "synckey": 0},
            "/review/list",
        ),
        ("recommendations", {"count": 20, "maxIdx": 0}, "/book/recommend"),
        ("similar", {"bookId": "book-1", "count": 20, "maxIdx": 0, "sessionId": "session-1"}, "/book/similar"),
        ("friends_reading", {"count": 20, "maxIdx": 0, "synckey": 0}, "/discover/interact/type3"),
    ],
)
def test_query_allowlist_forwards_all_documented_read_operations_without_serializing_key(operation, params, api_name):
    captured = {}

    class FakeHttp:
        def json(self, method, url, **kwargs):
            captured["method"] = method
            captured["url"] = url
            captured["body"] = kwargs.get("json")
            captured["authorization"] = (kwargs.get("headers") or {}).get("Authorization")
            captured["timeout"] = kwargs.get("timeout")
            return {"errcode": 0, "items": []}

    result = WereadProvider(http=FakeHttp()).query("wrk-unit-test-secret", operation, params)

    assert result["errcode"] == 0
    assert captured["body"] == {"api_name": api_name, "skill_version": "1.0.4", **params}
    assert "wrk-unit-test-secret" not in json.dumps(captured["body"])
    assert captured["authorization"] == "Bearer wrk-unit-test-secret"
    assert captured["timeout"] == 30


@pytest.mark.parametrize(
    ("operation", "params"),
    [
        ("write_note", {}),
        ("search", {}),
        ("shelf", []),
        ("search", {"keyword": "x", "unexpected": 1}),
        ("search", {"keyword": "x", "scope": 99}),
        ("recommendations", {"count": 101}),
        ("review_detail", {"reviewId": "r1", "commentsCount": 21}),
        ("highlight_reviews", {"bookId": "b1", "chapterUid": 1, "reviews": []}),
        (
            "highlight_reviews",
            {"bookId": "b1", "chapterUid": 1, "reviews": [{"range": "1-2", "unknown": 1}]},
        ),
    ],
)
def test_query_validation_rejects_writes_unknown_parameters_and_out_of_range_values(operation, params):
    with pytest.raises(UpstreamError):
        validate_weread_query(operation, params)


def test_normalization_handles_fullwidth_case_and_spacing():
    assert normalize_text(" Ａl-i v e ") == normalize_text("ALIVE")
    assert normalize_text("活著") == normalize_text("活着")


def test_unique_epub_text_node_generates_cfi_but_ambiguous_text_does_not(tmp_path):
    epub = tmp_path / "book.epub"
    with zipfile.ZipFile(epub, "w") as archive:
        archive.writestr(
            "META-INF/container.xml",
            """<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>""",
        )
        archive.writestr(
            "OPS/content.opf",
            """<package xmlns="http://www.idpf.org/2007/opf"><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>""",
        )
        archive.writestr(
            "OPS/chapter.xhtml",
            """<html xmlns="http://www.w3.org/1999/xhtml"><body><p id="only">这是唯一，能够定位的原文。</p><p>重复的较长原文</p><p>重复的较长原文</p></body></html>""",
        )
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}}, str(epub))

    cfi = locate_epub_quote(calibre, 7, "这是唯一 能够定位的原文")
    assert cfi.startswith("epubcfi(/6/2[chapter]!")
    assert locate_epub_quote(calibre, 7, "重复的较长原文") is None


def test_end_to_end_import_is_idempotent_and_materializes_no_cfi_annotations(db_session):
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}})
    connection = build_connection(db_session)

    first = execute(db_session, connection, calibre)
    second = execute(db_session, connection, calibre)

    assert first.status == "succeeded"
    assert first.counts["written"] == 3
    assert second.status == "succeeded"
    assert second.counts["written"] == 0
    assert second.counts["skipped"] == 3
    assert db_session.query(Annotation).count() == 3
    assert db_session.query(AnnotationSource).count() == 3
    assert db_session.query(PluginSourceRecord).count() == 3
    annotations = db_session.query(Annotation).order_by(Annotation.id).all()
    assert {item.book_id for item in annotations} == {7}
    assert all(item.cfi is None for item in annotations)
    assert annotations[0].sources[0].source_position == "chapterUid=12;range=2959-3007"
    assert connection.cursor == {"last_sync_at": "2026-05-09T07:46:18Z"}


def test_multiple_candidates_never_write_until_user_confirms(db_session):
    calibre = FakeCalibreDB(
        {
            7: {"title": "活着", "authors": ["余华"]},
            8: {"title": "活着", "authors": ["余华"]},
        }
    )
    connection = build_connection(db_session)

    blocked = execute(db_session, connection, calibre)
    blocked_items = db_session.query(PluginRunItem).filter(PluginRunItem.run_id == blocked.id).all()

    assert blocked.status == "failed"
    assert blocked.counts["conflicts"] == 3
    assert db_session.query(Annotation).count() == 0
    assert db_session.query(PluginSourceRecord).count() == 0
    assert {candidate["book_id"] for candidate in blocked_items[0].data["candidates"]} == {7, 8}
    assert connection.cursor == {}

    confirm_match(db_session, connection.id, "3300045871", 8, 1, calibre, [7, 8])
    imported = execute(db_session, connection, calibre)
    assert imported.status == "succeeded"
    assert {item.book_id for item in db_session.query(Annotation).all()} == {8}
    match = db_session.query(PluginEntityMatch).one()
    assert match.status == "confirmed"
    assert match.confirmed_by == 1


def test_sync_preserves_materialized_annotations_that_were_locally_edited_or_deleted(db_session):
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}})
    connection = build_connection(db_session)
    execute(db_session, connection, calibre)
    records = {record.external_id: record for record in db_session.query(PluginSourceRecord).all()}
    edited_record = records["weread:3300045871:bookmark:b1"]
    deleted_record = records["weread:3300045871:review:r1"]
    edited = db_session.get(Annotation, int(edited_record.entity_id))
    edited.content = "manual local content"
    edited.user_modified_at = datetime.datetime(2026, 8, 31, 12, 0, 0)
    deleted_id = int(deleted_record.entity_id)
    db_session.delete(db_session.get(Annotation, deleted_id))
    db_session.commit()

    changed_payload = copy.deepcopy(SAMPLE)
    changed_payload["bookmarks"][0]["markText"] = "remote replacement"
    changed_payload["reviews"][0]["review"]["content"] = "remote recreation"
    synced = execute(db_session, connection, calibre, payload=changed_payload)

    assert synced.status == "partial"
    assert synced.counts["conflicts"] == 2
    assert db_session.get(Annotation, edited.id).content == "manual local content"
    assert db_session.get(Annotation, deleted_id) is None
    assert db_session.get(PluginSourceRecord, edited_record.id).local_modified is True
    assert db_session.get(PluginSourceRecord, deleted_record.id).local_modified is True


def test_rollback_preserves_materialized_annotations_that_were_locally_edited_or_deleted(db_session):
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}})
    connection = build_connection(db_session)
    imported = execute(db_session, connection, calibre)
    records = {record.external_id: record for record in db_session.query(PluginSourceRecord).all()}
    edited_record = records["weread:3300045871:bookmark:b1"]
    deleted_record = records["weread:3300045871:review:r1"]
    edited = db_session.get(Annotation, int(edited_record.entity_id))
    edited.content = "manual local content"
    edited.user_modified_at = datetime.datetime(2026, 8, 31, 12, 0, 0)
    deleted_id = int(deleted_record.entity_id)
    db_session.delete(db_session.get(Annotation, deleted_id))
    db_session.commit()

    rolled_back = execute(db_session, connection, calibre, action="rollback", parent_run_id=imported.id)

    assert rolled_back.status == "partial"
    assert rolled_back.counts["conflicts"] == 2
    assert db_session.get(Annotation, edited.id).content == "manual local content"
    assert db_session.get(Annotation, deleted_id) is None
    assert db_session.get(PluginSourceRecord, edited_record.id).status == "active"
    assert db_session.get(PluginSourceRecord, deleted_record.id).status == "active"


def test_rollback_deletes_only_annotations_materialized_by_source_run(db_session):
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}})
    connection = build_connection(db_session)
    imported = execute(db_session, connection, calibre)

    rolled_back = execute(db_session, connection, calibre, action="rollback", parent_run_id=imported.id)

    assert rolled_back.status == "rolled_back"
    assert db_session.query(Annotation).count() == 0
    assert {record.status for record in db_session.query(PluginSourceRecord).all()} == {"rolled_back"}


def test_private_export_never_appears_in_public_run_payload(db_session):
    calibre = FakeCalibreDB({7: {"title": "活着", "authors": ["余华"]}})
    connection = build_connection(db_session)
    run = execute(db_session, connection, calibre)
    assert "input_data" not in run.to_public_dict()
    assert "人是为活着本身而活着的" not in str(run.to_public_dict())
    assert db_session.get(PluginConnection, connection.id).owner_type == "user"
