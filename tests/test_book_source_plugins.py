import hashlib
import json
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from webserver.models import Base, PluginRunItem, PluginSourceRecord
from webserver.plugins.runtime.book_sources import (
    BOOK_SOURCE_PROVIDERS,
    InternetArchiveProvider,
    OPDSProvider,
    WatchFolderProvider,
    WebDAVProvider,
)
from webserver.plugins.runtime.protocol import PROTOCOL_VERSION, ProviderItem, ProviderResult
from webserver.plugins.runtime.safe_http import EndpointPolicyError, SafeHttpClient, validate_remote_endpoint
from webserver.services.plugin_runtime import PluginRegistry, PluginRuntime, install_builtin, save_connection


SETTINGS = {"PLUGIN_SECRET_KEY": "book-source-test-key", "cookie_secret": "unused"}


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


def test_catalog_declares_real_capabilities_and_keeps_excluded_servers_out():
    manifests = {provider.manifest["id"]: provider.manifest for provider in BOOK_SOURCE_PROVIDERS}

    assert set(manifests) == {
        "talebook.book-source.kavita",
        "talebook.book-source.komga",
        "talebook.book-source.booklore",
        "talebook.book-source.standard-ebooks",
        "talebook.book-source.gutenberg",
        "talebook.book-source.internet-archive",
        "talebook.book-source.webdav",
        "talebook.book-source.watch-folder",
    }
    assert manifests["talebook.book-source.webdav"]["capabilities"] == [
        "book_sources.browse",
        "book_sources.acquire",
    ]
    assert manifests["talebook.book-source.watch-folder"]["capabilities"] == [
        "book_sources.browse",
        "book_sources.acquire",
    ]
    catalog = json.dumps(list(manifests.values()), ensure_ascii=False).lower()
    assert "calibre content server" not in catalog
    assert "calibre-web" not in catalog


def test_endpoint_policy_rejects_private_credentials_and_redirect_targets():
    public = lambda *args, **kwargs: [(2, 1, 6, "", ("93.184.216.34", 443))]
    private = lambda *args, **kwargs: [(2, 1, 6, "", ("127.0.0.1", 80))]

    assert validate_remote_endpoint("https://books.example/opds", resolver=public).startswith("https://")
    with pytest.raises(EndpointPolicyError):
        validate_remote_endpoint("http://127.0.0.1/opds", resolver=private)
    with pytest.raises(EndpointPolicyError):
        validate_remote_endpoint("https://user:pass@books.example/opds", resolver=public)

    redirect = response(b"", status=302, headers={"Location": "http://127.0.0.1/private"})
    session = SimpleNamespace(request=lambda *args, **kwargs: redirect)
    with pytest.raises(EndpointPolicyError):
        SafeHttpClient(session=session, resolver=lambda host, *args, **kwargs: public() if host != "127.0.0.1" else private()).request(
            "GET", "https://books.example/opds"
        )


def test_private_self_hosted_endpoint_requires_exact_allowlist():
    private = lambda *args, **kwargs: [(2, 1, 6, "", ("192.168.1.8", 443))]
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
                    "metadata": {"access-restricted-item": "false", "licenseurl": "https://creativecommons.org/publicdomain/mark/1.0/"},
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
        provider.execute(
            context(config={"path": str(outside)}, platform={"import_allowed_roots": [str(allowed)]})
        )

    escaped = allowed / "escaped.epub"
    escaped.symlink_to(outside / "escaped.epub")
    (outside / "escaped.epub").write_bytes(b"outside")
    with pytest.raises(Exception, match="allowlist"):
        provider.execute(ctx)


class DuplicateProvider:
    manifest = {
        "protocol_version": PROTOCOL_VERSION,
        "id": "test.book-source.duplicates",
        "name": "Duplicate books",
        "version": "1.0.0",
        "categories": ["book_sources"],
        "capabilities": ["book_sources.browse", "book_sources.acquire"],
        "runtime_kind": "builtin",
        "actions": ["preview", "run"],
        "auth_schema": {"type": "object", "properties": {}},
        "config_schema": {"type": "object", "properties": {}},
        "permissions": ["books.read", "books.write"],
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
