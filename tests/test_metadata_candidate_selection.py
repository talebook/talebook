import asyncio
from types import SimpleNamespace
from unittest import mock

from webserver.constants import META_SOURCE_AMAZON, META_SOURCE_GOOGLE
from webserver.handlers import book
from webserver.plugins.meta.calibre.api import CalibreMetadataApi, CalibreProvider
from webserver.plugins.meta.neodb import plugin as neodb


def test_calibre_selects_second_result_from_original_query():
    provider = CalibreProvider()
    first = SimpleNamespace(title="Book", authors=["Author A"], isbn=None, source=META_SOURCE_GOOGLE)
    second = SimpleNamespace(title="Book", authors=["Author B"], isbn=None, source=META_SOURCE_AMAZON)
    first.provider_value = second.provider_value = "Original title"

    with mock.patch.object(
        CalibreMetadataApi, "get_book_by_title", side_effect=[[first, second], [first, second], [first]]
    ) as lookup:
        records = provider.search_books({"title": "Original title", "authors": ["Original author"]}, None)
        selected = records[1]["provider_value"]
        assert records[0]["provider_value"] != selected
        assert provider.get_metadata(selected, None)["authors"] == ["Author B"]
        assert provider.get_metadata(selected, None) is None

    assert lookup.call_count == 3
    for call in lookup.call_args_list:
        assert call.args == ("Original title",)
        assert call.kwargs["authors"] == ["Original author"]


def test_neodb_replays_original_query_to_retrieve_selected_record():
    provider = neodb.NeodbProvider()
    url = "https://neodb.social/book/BOOK"
    item = {"url": url, "title": "Remote title"}
    with (
        mock.patch.object(neodb.api, "search", return_value=[item]) as search,
        mock.patch.object(
            neodb.api,
            "build_metadata",
            side_effect=lambda item, **kwargs: SimpleNamespace(title=item["title"], provider_value=item["url"]),
        ) as build,
    ):
        record = provider.search_books({"title": "Original title"}, None)[0]
        assert provider.get_metadata(record["provider_value"], None)["title"] == "Remote title"

    assert search.call_args_list == [
        mock.call("Original title", max_count=1),
        mock.call("Original title", max_count=10),
    ]
    assert build.call_args.kwargs["copy_image"] is True


def test_malformed_candidate_references_skip_network_queries():
    with (
        mock.patch.object(CalibreMetadataApi, "get_book_by_isbn") as calibre_search,
        mock.patch.object(neodb.api, "search") as neodb_search,
    ):
        assert CalibreProvider().get_metadata("calibre:v1:{", None) is None
        assert neodb.NeodbProvider().get_metadata("neodb:v1:[1,2,3]", None) is None

    calibre_search.assert_not_called()
    neodb_search.assert_not_called()


def test_refer_writes_the_selected_candidate_and_skips_a_missing_record():
    provider = CalibreProvider()
    first = SimpleNamespace(
        title="Book", authors=["Author A"], isbn=None, source=META_SOURCE_GOOGLE, tags=["Tag"], cover_data=None
    )
    second = SimpleNamespace(
        title="Book", authors=["Author B"], isbn=None, source=META_SOURCE_AMAZON, tags=["Tag"], cover_data=None
    )
    local = SimpleNamespace(cover_data=None, authors=["Local author"])

    def smart_update(record, replace_metadata):
        assert replace_metadata
        local.authors = record.authors

    local.smart_update = smart_update
    handler = mock.Mock(spec=book.BookRefer)
    handler.current_user = object()
    handler.request = SimpleNamespace(headers={})
    handler._finished = False
    handler.db = mock.Mock()
    handler.db.get_metadata.return_value = local
    handler.session = mock.sentinel.session
    handler.is_admin.return_value = True
    handler.plugin_get_book_meta = book.BookRefer.plugin_get_book_meta.__get__(handler)
    handler._is_plugin_metadata_provider = book.BookRefer._is_plugin_metadata_provider.__get__(handler)
    handler._plugin_metadata_detail = book.BookRefer._plugin_metadata_detail.__get__(handler)

    with (
        mock.patch.object(CalibreMetadataApi, "get_book_by_isbn", return_value=[]),
        mock.patch.object(CalibreMetadataApi, "get_book_by_title", side_effect=[[first, second], [first, second], [first]]),
        mock.patch.object(book, "PluginRuntime") as runtime_type,
        mock.patch("webserver.services.external_index.external_index_format_paths", return_value={}),
    ):
        selected = provider.search_books({"title": "Original title"}, None)[1]
        runtime = runtime_type.return_value
        runtime.registry = book.REGISTRY
        runtime.connections_for.return_value = [SimpleNamespace(id=1)]
        runtime.plugin_key_of.return_value = selected["provider_key"]
        runtime.read_many.side_effect = lambda connections, action, reference, timeout: {
            connections[0].id: provider.get_metadata(reference, None)
        }
        handler.get_argument.side_effect = lambda name, default: selected.get(name, default)

        asyncio.run(book.BookRefer.post(handler, "42"))
        assert handler.write.call_args.args[0]["err"] == "ok"
        handler.db.set_metadata.assert_called_once_with(42, local)
        assert handler.db.set_metadata.call_args.args[1].authors == ["Author B"]

        asyncio.run(book.BookRefer.post(handler, "42"))
        assert handler.write.call_args.args[0]["err"] == "metadata.not_found"
        handler.db.set_metadata.assert_called_once()
