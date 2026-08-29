import hashlib
import json
import threading
import time
from types import SimpleNamespace
from unittest import mock

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Base, PluginRunItem, PluginSourceRecord
from webserver.plugins.register import SOURCE_PROVIDERS
from webserver.plugins.runtime.domains import MetadataQuery
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult
from webserver.plugins.runtime.safe_http import EndpointPolicyError, SafeHttpClient, validate_remote_endpoint
from webserver.plugins.source.base import OPDSProvider
from webserver.plugins.source.internet_archive import InternetArchiveProvider
from webserver.plugins.source.legado import PROVIDER as LEGADO_PROVIDER
from webserver.plugins.source.standard_ebooks import StandardEbooksProvider
from webserver.plugins.source.watch_folder import WatchFolderProvider
from webserver.plugins.source.webdav import WebDAVProvider
from webserver.services.booksource import SourceHttpError
from webserver.services.booksource_search import TASK_TTL, SearchTaskService
from webserver.services.plugin_runtime import PluginRegistry, PluginRuntime, install_builtin, save_connection


SETTINGS = {"PLUGIN_SECRET_KEY": "source-test-key", "cookie_secret": "unused"}


def response(payload, content_type="application/json", status=200, headers=None):
    if isinstance(payload, (dict, list)):
        content = json.dumps(payload).encode()
    elif isinstance(payload, str):
        content = payload.encode()
    else:
        content = payload
    values = {"Content-Type": content_type, **(headers or {})}
    return SimpleNamespace(
        content=content,
        headers=values,
        status_code=status,
        json=lambda: json.loads(content.decode()),
    )


class FakeHttp:
    def __init__(self, values):
        self.values = values
        self.calls = []

    def request(self, method, url, **kwargs):
        self.calls.append((method, url, kwargs))
        value = self.values[url]
        return value() if callable(value) else value


def context(action="preview", config=None, cursor=None, platform=None):
    return {
        "action": action,
        "config": config or {},
        "cursor": cursor or {},
        "secrets": {},
        "platform": platform or {},
    }


def test_shared_connection_health_aggregates_all_bound_sources():
    service = SearchTaskService()
    service._tasks["health-test"] = {
        "done": 2,
        "total": 2,
        "sources": {
            "legado:1": {"connection_id": 7, "state": "done", "error": ""},
            "legado:2": {"connection_id": 7, "state": "failed", "error": "fetch_failed"},
        },
    }

    assert service.pop_health_updates("health-test") == [{"connection_id": 7, "healthy": False, "message": "fetch_failed"}]
    assert service.pop_health_updates("health-test") == []
    service._tasks.pop("health-test", None)


def test_search_runtime_batch_finalizes_without_status_polling():
    service = SearchTaskService()
    finalized = threading.Event()
    observed = {}

    def finish(batch, outcomes):
        observed.update(outcomes)
        finalized.set()

    result = SimpleNamespace(items=[])
    source = {
        "source_id": "plugin:one",
        "source_name": "One",
        "connection_id": 7,
        "legacy_id": None,
        "call": lambda _key, _page: result,
        "runtime_batch": {"run_id": 7001, "finalize": finish},
    }
    task = service.create_task("book", 1, [source])

    assert finalized.wait(2), "batch finalizer must not depend on a status request"
    deadline = time.time() + 2
    settled = False
    while time.time() < deadline:
        with service._lock:
            settled = 7001 in service._tasks[task["task_id"]]["settled_runtime_batches"]
        if settled:
            break
        time.sleep(0.01)
    assert settled is True
    assert observed == {"plugin:one": result}
    service._tasks.pop(task["task_id"], None)


def test_search_runtime_batch_finalizer_failure_stays_retryable_until_persisted():
    service = SearchTaskService()
    first_attempt = threading.Event()
    calls = []

    def flaky_finish(_batch, outcomes):
        calls.append(outcomes)
        if len(calls) == 1:
            first_attempt.set()
            raise RuntimeError("temporary database failure")

    result = SimpleNamespace(items=[])
    source = {
        "source_id": "plugin:retry",
        "source_name": "Retry",
        "connection_id": 8,
        "legacy_id": None,
        "call": lambda _key, _page: result,
        "runtime_batch": {"run_id": 7003, "finalize": flaky_finish},
    }
    task = service.create_task("book", 1, [source])
    task_id = task["task_id"]

    assert first_attempt.wait(2)
    deadline = time.time() + 2
    while time.time() < deadline:
        with service._lock:
            state = service._tasks[task_id]
            retryable = 7003 not in state["settling_runtime_batches"]
            persisted = 7003 in state["settled_runtime_batches"]
        if retryable:
            break
        time.sleep(0.01)
    assert retryable is True
    assert persisted is False
    assert service.get_status(task_id)["finished"] is False

    updates = service.pop_runtime_updates(task_id)
    assert [update["run_id"] for update in updates] == [7003]
    updates[0]["batch"]["finalize"](updates[0]["batch"], updates[0]["outcomes"])
    service.settle_runtime_update(task_id, 7003, True)

    assert service.get_status(task_id)["finished"] is True
    assert service.pop_runtime_updates(task_id) == []
    assert calls == [{"plugin:retry": result}, {"plugin:retry": result}]
    service._tasks.pop(task_id, None)


def test_expired_search_task_drains_runtime_batch_before_cleanup():
    service = SearchTaskService()
    finalized = []
    service._tasks["expired-audit"] = {
        "created_at": time.time() - TASK_TTL - 1,
        "done": 1,
        "total": 1,
        "sources": {
            "source:1": {
                "source_id": "source:1",
                "state": "done",
                "runtime_batch_id": 7002,
                "_outcome": "ok",
            }
        },
        "runtime_batches": {7002: {"run_id": 7002, "finalize": lambda _batch, outcomes: finalized.append(outcomes)}},
        "settled_runtime_batches": set(),
        "settling_runtime_batches": set(),
    }

    service._cleanup()

    assert finalized == [{"source:1": "ok"}]
    assert "expired-audit" not in service._tasks


def test_catalog_declares_real_capabilities_and_keeps_excluded_servers_out():
    manifests = {
        provider.manifest["id"]: provider.manifest
        for provider in SOURCE_PROVIDERS
        if provider.manifest["runtime_kind"] != "builtin"
    }

    assert set(manifests) == {
        "talebook.source.kavita",
        "talebook.source.komga",
        "talebook.source.booklore",
        "talebook.source.standard-ebooks",
        "talebook.source.gutenberg",
        "talebook.source.internet-archive",
        "talebook.source.webdav",
        "talebook.source.watch-folder",
    }
    assert manifests["talebook.source.webdav"]["capabilities"] == [
        "book_sources.browse",
        "book_sources.acquire",
    ]
    assert manifests["talebook.source.watch-folder"]["capabilities"] == [
        "book_sources.browse",
        "book_sources.acquire",
    ]
    catalog = json.dumps(list(manifests.values()), ensure_ascii=False).lower()
    assert "calibre content server" not in catalog
    assert "calibre-web" not in catalog


def test_legado_prepares_and_searches_metadata_only_for_the_metadata_interface():
    source = mock.sentinel.source
    session = mock.sentinel.session
    settings = {**SETTINGS, "BOOKSOURCE_METADATA_TOP_K": 7}

    with mock.patch("webserver.plugins.source.legado.collect_metadata_sources", return_value=[source]) as collect:
        platform = LEGADO_PROVIDER.prepare_context(session, settings, "search_books")
        assert LEGADO_PROVIDER.prepare_context(session, settings, "search") == {}

    collect.assert_called_once_with(session, 7)
    service = mock.Mock()
    outcome = mock.sentinel.outcome
    service.search.return_value = outcome
    with mock.patch("webserver.plugins.source.legado.BookSourceMetadataService", return_value=service) as service_class:
        result = LEGADO_PROVIDER.search_books(
            MetadataQuery(title="活着", authors=("余华",)),
            context(platform=platform),
        )

    assert result is outcome
    service_class.assert_called_once_with([source], settings["cookie_secret"], config=platform["booksource_config"])
    service.search.assert_called_once_with("活着", "余华")


def test_public_sources_are_ready_to_preview_without_configuration():
    manifests = {provider.manifest["id"]: provider.manifest for provider in SOURCE_PROVIDERS}

    for plugin_id in ("talebook.source.gutenberg", "talebook.source.standard-ebooks"):
        assert not manifests[plugin_id]["config_schema"].get("required")
        assert not manifests[plugin_id]["auth_schema"].get("required")
        expected_ui = {
            "icon": "mdi-bookshelf",
            "manage_kind": "book_source",
            "configuration_mode": "none",
            "primary_action": "preview",
            "catalog_access": "public_free",
        }
        assert {key: manifests[plugin_id]["ui"][key] for key in expected_ui} == expected_ui
        assert manifests[plugin_id]["ui"]["brand_icon"].startswith("/images/plugin-icons/")

    assert manifests["talebook.source.internet-archive"]["ui"]["catalog_access"] == "rights_vary"
    assert manifests["talebook.source.internet-archive"]["ui"]["primary_action"] == "details"


def test_standard_ebooks_open_atom_enclosure_is_a_downloadable_book():
    endpoint = StandardEbooksProvider().endpoint
    body = """<?xml version="1.0"?>
    <feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>https://standardebooks.org/ebooks/example/book</id>
        <title>Example Book</title>
        <author><name>Ada Author</name></author>
        <rights>Public domain in the United States</rights>
        <updated>2026-08-29T00:00:00Z</updated>
        <link rel="enclosure" type="application/epub+zip" href="https://standardebooks.org/ebooks/example/book/downloads/example_book.epub" />
      </entry>
    </feed>"""
    provider = StandardEbooksProvider()
    provider.http = FakeHttp({endpoint: response(body, "application/atom+xml")})

    item = provider.execute(context()).items[0].data

    assert item["title"] == "Example Book"
    assert item["authors"] == ["Ada Author"]
    assert item["access"] == "download"
    assert item["format"] == "epub"
    assert item["acquisition_url"].endswith("example_book.epub")


def test_endpoint_policy_rejects_private_credentials_and_redirect_targets():
    def public(*args, **kwargs):
        return [(2, 1, 6, "", ("93.184.216.34", 443))]

    def private(*args, **kwargs):
        return [(2, 1, 6, "", ("127.0.0.1", 80))]

    assert validate_remote_endpoint("https://books.example/opds", resolver=public).startswith("https://")
    with pytest.raises(EndpointPolicyError):
        validate_remote_endpoint("http://127.0.0.1/opds", resolver=private)
    with pytest.raises(EndpointPolicyError):
        validate_remote_endpoint("https://user:pass@books.example/opds", resolver=public)

    redirect = response(b"", status=302, headers={"Location": "http://127.0.0.1/private"})
    session = SimpleNamespace(request=lambda *args, **kwargs: redirect)
    with pytest.raises(EndpointPolicyError):
        SafeHttpClient(
            session=session, resolver=lambda host, *args, **kwargs: public() if host != "127.0.0.1" else private()
        ).request("GET", "https://books.example/opds")


def test_legado_provider_does_not_auto_allowlist_source_target():
    raw = {
        "bookSourceName": "private target",
        "bookSourceUrl": "http://127.0.0.1",
        "searchUrl": "http://127.0.0.1/search?key={{key}}",
        "ruleSearch": {},
    }

    with pytest.raises(SourceHttpError) as exc:
        LEGADO_PROVIDER.search("probe", {}, context(config={"source_raw": raw, "engine_config": {}}))

    assert "non-public" in str(exc.value)


def test_private_self_hosted_endpoint_requires_exact_allowlist():
    def private(*args, **kwargs):
        return [(2, 1, 6, "", ("192.168.1.8", 443))]

    with pytest.raises(EndpointPolicyError):
        validate_remote_endpoint("https://kavita.lan/opds", resolver=private)
    assert validate_remote_endpoint("https://kavita.lan/opds", allowed_hosts=["kavita.lan"], resolver=private)


def test_opds2_keeps_download_and_external_link_distinct():
    endpoint = "https://books.example/opds"
    http = FakeHttp(
        {
            endpoint: response(
                {
                    "publications": [
                        {
                            "metadata": {
                                "identifier": "urn:isbn:9781234567890",
                                "title": "Downloadable",
                                "author": [{"name": "Ada"}],
                                "rights": "CC0",
                            },
                            "links": [
                                {
                                    "rel": "http://opds-spec.org/acquisition/open-access",
                                    "href": "/book.epub",
                                    "type": "application/epub+zip",
                                }
                            ],
                        },
                        {
                            "metadata": {"identifier": "external", "title": "External only"},
                            "links": [{"rel": "alternate", "href": "/details"}],
                        },
                    ]
                }
            )
        }
    )
    provider = OPDSProvider("test.books.opds", "Test OPDS", "test", "https://example.com", http=http)
    result = provider.execute(context(config={"endpoint": endpoint, "formats": ["epub"], "target_library": "main"}))

    assert len(result.items) == 2
    downloadable, external = [item.data for item in result.items]
    assert downloadable["access"] == "download"
    assert downloadable["acquisition_url"] == "https://books.example/book.epub"
    assert downloadable["format"] == "epub"
    assert downloadable["isbn"] == "9781234567890"
    assert external["access"] == "external_link"
    assert external["acquisition_url"] == ""
    assert all(item.data["review_status"] == "pending" for item in result.items)


def test_opds_source_provider_returns_typed_detail_and_download_file():
    endpoint = "https://books.example/opds"
    acquisition = "https://books.example/book.epub"
    payload = {
        "publications": [
            {
                "metadata": {"identifier": "urn:book:1", "title": "Typed Book", "author": [{"name": "Ada"}]},
                "links": [
                    {
                        "rel": "http://opds-spec.org/acquisition/open-access",
                        "href": acquisition,
                        "type": "application/epub+zip",
                    }
                ],
            }
        ]
    }
    provider = OPDSProvider(
        "test.books.typed-opds",
        "Typed OPDS",
        "test",
        "https://example.com",
        http=FakeHttp(
            {
                endpoint: response(payload),
                acquisition: response(b"epub-bytes", "application/epub+zip"),
            }
        ),
    )
    ctx = context(config={"endpoint": endpoint, "formats": ["epub"]})

    item = provider.browse("", {}, ctx).items[0]
    detail = provider.get_book(item.external_id, ctx)
    book_file = provider.download(detail, ctx)

    assert detail.title == "Typed Book"
    assert detail.downloadable is True
    assert book_file.filename == "book.epub"
    assert book_file.format == "epub"
    assert book_file.content == b"epub-bytes"


def test_internet_archive_never_exposes_restricted_file_as_download():
    search_url = InternetArchiveProvider.endpoint
    restricted_meta = "https://archive.org/metadata/loaned"
    open_meta = "https://archive.org/metadata/open"
    http = FakeHttp(
        {
            search_url: response(
                {
                    "response": {
                        "docs": [
                            {"identifier": "loaned", "title": "Loaned"},
                            {"identifier": "open", "title": "Open"},
                        ]
                    }
                }
            ),
            restricted_meta: response(
                {
                    "metadata": {"access-restricted-item": "true", "rights": "Borrowing required"},
                    "files": [{"name": "loaned.epub", "private": "false"}],
                }
            ),
            open_meta: response(
                {
                    "metadata": {
                        "access-restricted-item": "false",
                        "licenseurl": "https://creativecommons.org/publicdomain/mark/1.0/",
                    },
                    "files": [{"name": "open.epub", "private": "false"}],
                }
            ),
        }
    )
    items = InternetArchiveProvider(http=http).execute(context(config={"formats": ["epub"]})).items
    values = {item.data["title"]: item.data for item in items}

    assert values["Loaned"]["access"] == "restricted"
    assert values["Loaned"]["acquisition_url"] == ""
    assert values["Open"]["access"] == "download"
    assert values["Open"]["acquisition_url"].endswith("/open/open.epub")


def test_webdav_filters_extensions_and_uses_etag_cursor():
    endpoint = "https://dav.example/books/"
    body = """<?xml version="1.0"?>
    <d:multistatus xmlns:d="DAV:">
      <d:response><d:href>/books/</d:href><d:propstat><d:prop><d:resourcetype><d:collection/></d:resourcetype></d:prop></d:propstat></d:response>
      <d:response><d:href>/books/new.epub</d:href><d:propstat><d:prop><d:resourcetype/><d:getetag>"abc"</d:getetag><d:getlastmodified>now</d:getlastmodified></d:prop></d:propstat></d:response>
      <d:response><d:href>/books/ignore.exe</d:href><d:propstat><d:prop><d:resourcetype/><d:getetag>"bad"</d:getetag></d:prop></d:propstat></d:response>
    </d:multistatus>"""
    provider = WebDAVProvider(http=FakeHttp({endpoint: response(body, "application/xml")}))
    first = provider.execute(context(config={"endpoint": endpoint, "formats": ["epub"]}))
    second = provider.execute(context(config={"endpoint": endpoint, "formats": ["epub"]}, cursor=first.next_cursor))

    assert [item.data["title"] for item in first.items] == ["new"]
    assert first.items[0].data["format"] == "epub"
    assert first.items[0].data["remote_etag"] == "abc"
    assert first.items[0].data["content_hash"] == ""
    assert second.items == []


def test_watch_folder_enforces_root_hashes_content_and_discovers_incrementally(tmp_path):
    allowed = tmp_path / "allowed"
    allowed.mkdir()
    book = allowed / "same.epub"
    book.write_bytes(b"book bytes")
    (allowed / "ignore.exe").write_bytes(b"ignore")
    provider = WatchFolderProvider()
    ctx = context(
        config={"path": str(allowed), "formats": ["epub"], "target_library": "main"},
        platform={"import_allowed_roots": [str(allowed)]},
    )
    first = provider.execute(ctx)
    second = provider.execute({**ctx, "cursor": first.next_cursor})

    assert len(first.items) == 1
    assert first.items[0].data["content_hash"] == hashlib.sha256(b"book bytes").hexdigest()
    assert first.items[0].data["target_library"] == "main"
    assert second.items == []

    outside = tmp_path / "outside"
    outside.mkdir()
    with pytest.raises(Exception, match="allowlist"):
        provider.execute(context(config={"path": str(outside)}, platform={"import_allowed_roots": [str(allowed)]}))

    escaped = allowed / "escaped.epub"
    escaped.symlink_to(outside / "escaped.epub")
    (outside / "escaped.epub").write_bytes(b"outside")
    with pytest.raises(Exception, match="allowlist"):
        provider.execute(ctx)


class DuplicateProvider:
    download_mode = "single_book"
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "test.source.duplicates",
        "name": "Duplicate books",
        "version": "1.0.0",
        "categories": ["book_sources"],
        "capabilities": ["book_sources.browse", "book_sources.acquire"],
        "download_mode": "single_book",
        "runtime_kind": "builtin",
        "actions": ["preview", "run"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read", "books.write"],
        "connection_owners": ["instance"],
        "data_policy": {},
        "compatibility": {},
        "homepage": "",
        "license": "GPL-3.0",
    }

    def execute(self, context):
        common = {
            "isbn": "9781234567890",
            "format": "epub",
            "content_hash": "abc",
            "source": "test",
            "access": "download",
            "license": "CC0",
            "target_library": "main",
            "review_status": "pending",
        }
        return ProviderResult(
            items=[
                ProviderItem("one", "book_source", {**common, "title": "One"}),
                ProviderItem("two", "book_source", {**common, "title": "Two"}),
            ]
        )

    def search(self, query, cursor, context):
        raise NotImplementedError

    def browse(self, category_id, cursor, context):
        raise NotImplementedError

    def get_categories(self, context):
        return []

    def get_book(self, external_id, context):
        raise NotImplementedError

    def download(self, book, context):
        raise NotImplementedError

    def get_toc(self, book, context):
        return []

    def get_chapter(self, chapter, context):
        raise NotImplementedError

    def self_check(self, context):
        raise NotImplementedError


def test_runtime_previews_and_skips_same_isbn_hash_format_before_pending_write():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    registry = PluginRegistry()
    registry.register(DuplicateProvider())
    installation = install_builtin(session, DuplicateProvider.manifest["id"], 1, registry=registry)
    connection = save_connection(session, SETTINGS, installation.id, "instance", 0, {})
    runtime = PluginRuntime(session, SETTINGS, registry=registry)

    preview = runtime.prepare_run(connection.id, "preview", 1)
    runtime.execute(preview.id)
    preview_items = session.query(PluginRunItem).filter(PluginRunItem.run_id == preview.id).order_by(PluginRunItem.id).all()
    assert [item.status for item in preview_items] == ["previewed", "skipped"]
    assert preview_items[1].operation == "duplicate"
    assert preview_items[1].data["duplicate_reason"] in {"content_hash", "isbn"}
    assert session.query(PluginSourceRecord).count() == 0

    run = runtime.prepare_run(connection.id, "run", 1)
    runtime.execute(run.id)
    assert run.counts["written"] == 1
    assert run.counts["skipped"] == 1
    assert session.query(PluginSourceRecord).count() == 1
    session.close()
    engine.dispose()


def test_public_source_connection_needs_no_secret_key_or_secret_row():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine)()
    registry = PluginRegistry()
    registry.register(DuplicateProvider())
    installation = install_builtin(session, DuplicateProvider.manifest["id"], 1, registry=registry)

    connection = save_connection(
        session,
        {"PLUGIN_SECRET_KEY": "", "cookie_secret": "cookie_secret"},
        installation.id,
        "instance",
        0,
        {},
    )

    assert connection.secret_id is None
    session.close()
    engine.dispose()
