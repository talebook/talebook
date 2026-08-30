import base64
import io
import json
import zipfile
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Annotation, Base, PluginConnection, PluginDefinition, PluginRunItem, PluginSourceRecord
from webserver.plugins.annotation.brs import BRSProvider
from webserver.plugins.combo.open_library import OpenLibraryProvider
from webserver.plugins.meta.base import build_field_decisions
from webserver.plugins.review.anilist import AniListReviewProvider
from webserver.plugins.review.bangumi import BangumiReviewProvider
from webserver.plugins.review.file_import import ReviewFileProvider, parse_review_file
from webserver.plugins.review.google_books import GoogleBooksReviewProvider
from webserver.plugins.review.hardcover import HardcoverProvider
from webserver.plugins.review.neodb import NeoDBReviewProvider
from webserver.plugins.runtime.domains import Annotation as PluginAnnotation
from webserver.plugins.runtime.domains import PushReceipt, SourceState
from webserver.plugins.runtime.protocol import PluginManifest, UpstreamRateLimitError
from webserver.plugins.runtime.safe_http import EndpointPolicyError, SafeHttpClient
from webserver.services.epub_metadata import extract_epub_metadata
from webserver.services.plugin_runtime import (
    PluginRegistry,
    PluginRuntime,
    ensure_builtin_definitions,
    install_builtin,
    rotate_connection_secret,
    save_connection,
)


SETTINGS = {"PLUGIN_SECRET_KEY": "enrichment-test-key", "cookie_secret": "unused-cookie-secret"}


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


def connection_for(session, provider, credentials=None, config=None):
    registry = PluginRegistry()
    registry.register(provider)
    ensure_builtin_definitions(session, registry)
    installation = install_builtin(session, provider.manifest["id"], installed_by=1, registry=registry)
    owner_type = "user" if provider.manifest["connection_owners"] == ["user"] else "instance"
    connection = save_connection(
        session,
        SETTINGS,
        installation.id,
        owner_type,
        1 if owner_type == "user" else 0,
        credentials if credentials is not None else {},
        config=config,
    )
    return registry, connection


def execute(session, registry, connection, action="run", parent_run_id=None):
    runtime = PluginRuntime(session, SETTINGS, registry=registry, sleeper=lambda _: None)
    run = runtime.prepare_run(connection.id, action, requested_by=1, parent_run_id=parent_run_id)
    runtime.execute(run.id)
    session.refresh(run)
    session.refresh(connection)
    return run


def epub_base64():
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        archive.writestr(
            "META-INF/container.xml",
            '<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="book.opf" /></rootfiles></container>',
        )
        archive.writestr(
            "book.opf",
            """<package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata>
            <dc:title>Embedded title</dc:title><dc:creator>Author One</dc:creator>
            <dc:publisher>Embedded Press</dc:publisher><dc:identifier>9781234567897</dc:identifier>
            <dc:subject>Fiction</dc:subject><dc:description>Long embedded description</dc:description>
            </metadata></package>""",
        )
    return base64.b64encode(output.getvalue()).decode("ascii")


def test_connector_manifests_are_valid_and_registered_as_installable_definitions(db_session):
    providers = [
        OpenLibraryProvider(),
        HardcoverProvider(),
        NeoDBReviewProvider(),
        GoogleBooksReviewProvider(),
        BangumiReviewProvider(),
        AniListReviewProvider(),
        BRSProvider(),
        ReviewFileProvider(),
    ]
    registry = PluginRegistry()
    for provider in providers:
        PluginManifest.validate(provider.manifest)
        registry.register(provider)

    definitions = ensure_builtin_definitions(db_session, registry)
    assert len(definitions) == 8
    assert {item.plugin_key for item in definitions} >= {
        "talebook.combo.open-library",
        "talebook.annotation.brs",
        "talebook.review.file-import",
        "talebook.review.bangumi",
        "talebook.review.anilist",
    }
    assert db_session.query(PluginConnection).count() == 0


def test_brs_accepts_user_owned_connections(db_session):
    provider = BRSProvider(transport=lambda *args, **kwargs: {"comments": []})
    registry = PluginRegistry()
    registry.register(provider)
    ensure_builtin_definitions(db_session, registry)
    installation = install_builtin(db_session, provider.manifest["id"], installed_by=1, registry=registry)
    connection = save_connection(
        db_session,
        SETTINGS,
        installation.id,
        "user",
        9,
        {"email": "reader@example.com", "password": "private"},
        config={"endpoint": "https://brs.example"},
    )
    assert connection.owner_type == "user"
    assert connection.owner_id == 9


def test_brs_push_annotation_logs_in_resolves_the_book_and_writes_the_public_note():
    calls = []

    def transport(method, url, **kwargs):
        calls.append((method, url, kwargs))
        if url.endswith("/api/user/sign_in"):
            return {"err": "ok"}
        if url.endswith("/api/review/book"):
            return {"err": "ok", "data": {"id": "remote-book"}}
        return {
            "err": "ok",
            "data": {
                "reviewId": "remote-review-7",
                "createTime": "2026-08-30 12:00:00",
            },
        }

    provider = BRSProvider(transport=transport)
    item = PluginAnnotation.from_dict(
        {
            "id": 7,
            "book_id": 11,
            "book_title": "山中一夜雨",
            "annotation_type": "note",
            "chapter": "第一章",
            "cfi": "epubcfi(/6/4!/4/2/2,:0,:8)",
            "quote_text": "山中一夜雨",
            "content": "这是我的公开笔记",
        }
    )

    receipt = provider.push_annotation(
        item,
        SourceState.from_dict({"source_annotation_id": ""}),
        {
            "secrets": {"email": "reader@example.com", "password": "private"},
            "config": {"endpoint": "https://brs.example"},
        },
    )

    assert "annotations.push" in provider.manifest["capabilities"]
    assert isinstance(receipt, PushReceipt)
    assert receipt.source_annotation_id == "remote-review-7"
    assert [call[:2] for call in calls] == [
        ("POST", "https://brs.example/api/user/sign_in"),
        ("GET", "https://brs.example/api/review/book"),
        ("POST", "https://brs.example/api/review/add"),
    ]
    assert calls[0][2]["data"] == {"email": "reader@example.com", "password": "private"}
    assert calls[1][2]["params"] == {"title": "山中一夜雨"}
    assert calls[2][2]["json"]["book_id"] == "remote-book"
    assert calls[2][2]["json"]["refer_text"] == "山中一夜雨"
    assert calls[2][2]["json"]["content"] == "这是我的公开笔记"


def test_field_decisions_never_silently_replace_locked_or_nonempty_values():
    decisions = {
        item["field"]: item
        for item in build_field_decisions(
            {"title": "Manual title", "publisher": "", "language": "zh"},
            {"title": "Remote title", "publisher": "Remote Press", "language": "en", "isbn": "123"},
            ["title"],
        )
    }
    assert decisions["title"] == {
        "field": "title",
        "current": "Manual title",
        "candidate": "Remote title",
        "decision": "locked",
        "locked": True,
        "will_apply": False,
    }
    assert decisions["publisher"]["decision"] == "fill_empty"
    assert decisions["publisher"]["will_apply"] is True
    assert decisions["language"]["decision"] == "candidate"
    assert decisions["isbn"]["decision"] == "fill_empty"


def test_open_library_preview_persists_field_diff_and_source_specific_rating(db_session):
    calls = []

    def transport(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return {
            "ISBN:9781234567897": {
                "title": "Remote title",
                "authors": [{"name": "Remote Author"}],
                "publishers": [{"name": "Remote Press"}],
                "publish_date": "2020",
                "url": "https://openlibrary.org/books/OL1M",
                "ratings": {"average": 4.25, "count": 80, "updated_at": "2026-08-01T00:00:00Z"},
            }
        }

    provider = OpenLibraryProvider(transport=transport)
    registry, connection = connection_for(
        db_session,
        provider,
        config={
            "queries": [
                {
                    "book_id": 42,
                    "isbn": "978-1-234567-89-7",
                    "current_metadata": {"title": "Manual title", "publisher": ""},
                    "locked_fields": ["title"],
                }
            ]
        },
    )
    preview = execute(db_session, registry, connection, "preview")
    items = db_session.query(PluginRunItem).filter_by(run_id=preview.id).order_by(PluginRunItem.id).all()

    assert preview.status == "succeeded"
    assert [item.entity_type for item in items] == ["metadata", "review"]
    field_map = {item["field"]: item for item in items[0].data["fields"]}
    assert field_map["title"]["decision"] == "locked"
    assert field_map["publisher"]["decision"] == "fill_empty"
    assert items[1].data["rating"] == {"value": 4.25, "scale": 5, "sample_count": 80}
    assert items[1].data["source_url"] == "https://openlibrary.org/books/OL1M"
    assert db_session.query(PluginSourceRecord).count() == 0
    assert calls[0][2]["params"]["bibkeys"] == "ISBN:9781234567897"


def test_embedded_epub_metadata_is_a_platform_parser_instead_of_an_installable_plugin():
    parsed = extract_epub_metadata(base64.b64decode(epub_base64()))
    assert parsed["title"] == "Embedded title"
    assert parsed["authors"] == ["Author One"]
    assert parsed["isbn"] == "9781234567897"


@pytest.mark.parametrize(
    ("source", "content", "expected"),
    [
        (
            "goodreads",
            'Book Id,Title,Author,My Rating,Date Read,My Review,URL,ISBN13\n1,Book A,Author A,4,2026-08-01,"Useful review",https://goodreads.com/book/show/1,9781\n',
            (4.0, "Useful review"),
        ),
        (
            "storygraph",
            'ISBN/UID,Title,Authors,Star Rating,Date Read,Review\nuid-1,Book B,Author B,4.5,2026/08/02,"StoryGraph note"\n',
            (4.5, "StoryGraph note"),
        ),
    ],
)
def test_goodreads_and_storygraph_csv_keep_original_rating_and_bounded_summary(source, content, expected):
    rows = parse_review_file(content, source)
    assert len(rows) == 1
    assert rows[0][1]["rating"] == {"value": expected[0], "scale": 5.0, "sample_count": None}
    assert rows[0][1]["summary"] == expected[1]


def test_generic_json_mapping_reports_bad_rows_without_losing_good_rows():
    content = json.dumps(
        [
            {"uid": "one", "score": "8", "name": "Series A", "note": "A" * 700},
            {"uid": "two", "score": "bad", "name": "Series B"},
        ]
    )
    rows = parse_review_file(
        content,
        "generic",
        "json",
        {"external_id": "uid", "rating": "score", "title": "name", "summary": "note", "scale": 10},
    )
    assert rows[0][1]["rating"]["scale"] == 10.0
    assert len(rows[0][1]["summary"]) == 500
    assert rows[1][2] == "review_file.invalid_rating"


def test_review_file_runtime_is_idempotent_retries_failed_row_and_rolls_back_source(db_session):
    bad_content = "id,score,title\none,4,Good\ntwo,bad,Bad\n"
    provider = ReviewFileProvider()
    registry, connection = connection_for(
        db_session,
        provider,
        credentials={"content": bad_content},
        config={
            "source": "generic",
            "format": "csv",
            "mapping": {"external_id": "id", "rating": "score", "title": "title", "scale": 5},
        },
    )
    first = execute(db_session, registry, connection)
    assert first.status == "partial"
    assert first.counts["written"] == 1
    assert first.counts["failed"] == 1
    assert connection.cursor == {}

    rotate_connection_secret(db_session, SETTINGS, connection.id, {"content": "id,score,title\ntwo,5,Fixed\n"})
    retried = execute(db_session, registry, connection, "retry", parent_run_id=first.id)
    assert retried.status == "succeeded"
    assert db_session.query(PluginSourceRecord).count() == 2

    duplicate = execute(db_session, registry, connection)
    assert duplicate.counts["skipped"] == 1
    assert db_session.query(PluginSourceRecord).count() == 2

    rollback = execute(db_session, registry, connection, "rollback", parent_run_id=retried.id)
    assert rollback.status == "rolled_back"
    statuses = {item.external_id: item.status for item in db_session.query(PluginSourceRecord).all()}
    assert statuses == {"generic:one": "active", "generic:two": "rolled_back"}
    public = json.dumps(
        [item.to_public_dict(include_data=True) for item in db_session.query(PluginRunItem).all()], ensure_ascii=False
    )
    assert bad_content not in public


def test_brs_uses_separate_review_domain_supports_mapping_and_runtime_rate_limit_retry(db_session):
    attempts = {"count": 0}

    def transport(method, url, **kwargs):
        attempts["count"] += 1
        if attempts["count"] == 1:
            raise UpstreamRateLimitError("slow down", retry_after=0)
        return {
            "comments": [
                {
                    "id": "comment-1",
                    "book_id": "remote-book",
                    "chapter_id": "remote-chapter",
                    "segment_id": "remote-segment",
                    "rating": 9,
                    "rating_scale": 10,
                    "content": "Public chapter comment " + "x" * 600,
                    "updated_at": "2026-08-17T10:00:00Z",
                    "url": "https://brs.example/comments/comment-1",
                }
            ],
            "next_cursor": "cursor-2",
        }

    provider = BRSProvider(transport=transport)
    registry, connection = connection_for(
        db_session,
        provider,
        credentials={"email": "reader@example.com", "password": "brs-private-password"},
        config={
            "endpoint": "https://brs.example",
            "book_map": {"remote-book": 11},
            "chapter_map": {"remote-chapter": "Chapter 1"},
            "segment_map": {"remote-segment": "segment-cfi"},
            "max_retries": 1,
            "backoff_seconds": 0,
        },
    )
    run = execute(db_session, registry, connection)
    record = db_session.query(PluginSourceRecord).one()

    assert run.status == "succeeded"
    assert run.attempt == 2
    assert connection.cursor == {"cursor": "cursor-2"}
    assert record.entity_type == "review"
    assert record.data["domain"] == "chapter_reviews"
    assert record.data["review_kind"] == "chapter_comment"
    assert record.data["book_id"] == 11
    assert record.data["chapter"] == "Chapter 1"
    assert len(record.data["summary"]) == 500
    assert db_session.query(Annotation).count() == 0
    assert "brs-private-password" not in json.dumps(record.data)


@pytest.mark.parametrize(
    ("source", "payload", "query", "expected"),
    [
        (
            "hardcover",
            {"data": {"books": [{"id": 1, "slug": "book-a", "rating": 4.1, "rating_count": 200}]}},
            {"book_id": 1, "isbn": "9781"},
            (4.1, 5, 200),
        ),
        (
            "neodb",
            {"data": [{"id": "https://neodb.social/book/1", "rating": 8.2, "rating_count": 30}]},
            {"book_id": 1, "isbn": "9781"},
            (8.2, 10, 30),
        ),
        (
            "google_books",
            {"items": [{"volumeInfo": {"averageRating": 4.0, "ratingsCount": 50, "infoLink": "https://books.google/1"}}]},
            {"book_id": 1, "isbn": "9781"},
            (4.0, 5, 50),
        ),
        (
            "bangumi",
            {"rating": {"score": 7.9, "total": 900}, "date": "2025-01-01"},
            {"book_id": 1, "domain_id": "100", "series_id": "series-1"},
            (7.9, 10, 900),
        ),
        (
            "anilist",
            {"data": {"Media": {"averageScore": 83, "popularity": 1000, "siteUrl": "https://anilist.co/manga/9"}}},
            {"book_id": 1, "domain_id": "9", "series_id": "series-1"},
            (83, 100, 1000),
        ),
    ],
)
def test_catalog_ratings_preserve_each_sources_raw_scale_and_samples(source, payload, query, expected):
    providers = {
        "hardcover": HardcoverProvider,
        "neodb": NeoDBReviewProvider,
        "google_books": GoogleBooksReviewProvider,
        "bangumi": BangumiReviewProvider,
        "anilist": AniListReviewProvider,
    }
    provider = providers[source](transport=lambda *args, **kwargs: payload)
    result = provider.execute(
        {
            "action": "preview",
            "config": {"queries": [query]},
            "secrets": {"token": "configured"} if source == "hardcover" else {},
            "target_external_ids": [],
        }
    )
    assert len(result.items) == 1
    rating = result.items[0].data["rating"]
    assert (rating["value"], rating["scale"], rating["sample_count"]) == expected
    if source in {"bangumi", "anilist"}:
        assert result.items[0].data["domain_id"] == query["domain_id"]
        assert result.items[0].data["series_id"] == query["series_id"]


def _resolver(address):
    return lambda *args, **kwargs: [(2, 1, 6, "", (address, 443))]


def _ok_session():
    return SimpleNamespace(
        request=lambda *args, **kwargs: SimpleNamespace(status_code=200, headers={}, content=b"{}", json=lambda: {})
    )


def test_brs_endpoint_pointing_at_private_network_is_blocked():
    """BRS endpoint 由管理员自由填写，必须挡住指向内网与云元数据服务的地址。"""
    for address in ("127.0.0.1", "169.254.169.254", "192.168.1.10", "10.0.0.5"):
        client = SafeHttpClient(session=_ok_session(), resolver=_resolver(address))
        with pytest.raises(EndpointPolicyError):
            client.request("GET", "https://brs.internal/api/v1/comments")

    # 管理员为自托管实例显式配置白名单后才放行
    client = SafeHttpClient(session=_ok_session(), resolver=_resolver("192.168.1.10"))
    client.request("GET", "https://brs.lan/api/v1/comments", allowed_hosts=["brs.lan"])


def test_connector_http_layer_rejects_embedded_credentials():
    client = SafeHttpClient(session=_ok_session(), resolver=_resolver("93.184.216.34"))
    with pytest.raises(EndpointPolicyError):
        client.request("GET", "https://user:pass@brs.example/api/v1/comments")


def test_brs_provider_forwards_configured_allowlist_to_http_layer():
    captured = {}

    def transport(method, url, **kwargs):
        captured.update(kwargs)
        captured["url"] = url
        return {"comments": []}

    BRSProvider(transport=transport).execute(
        {
            "action": "test",
            "config": {"endpoint": "https://brs.lan", "allowed_hosts": ["brs.lan"]},
            "secrets": {"email": "reader@example.com", "password": "unit-test-password"},
            "cursor": {},
        }
    )
    assert captured["url"] == "https://brs.lan/api/v1/comments"
    assert captured["allowed_hosts"] == ["brs.lan"]
    assert captured["headers"]["Authorization"].startswith("Basic ")
    assert "unit-test-password" not in captured["headers"]["Authorization"]
