#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock

from tests.test_main import BID_EPUB, BID_MOBI, Q, TestWithUserLogin, get_db
from tests.test_main import setUpModule as init
from webserver.handlers.meta import routes as meta_routes
from webserver.models import AuthorAlias, BookAlias
from webserver.services.aliases import AliasConflictError, AliasService, calibre_author_merge_plan
from webserver.services.external_index import rename_items_preserving_external_paths


def setUpModule():
    init()


class TestAliasService(TestWithUserLogin):
    def setUp(self):
        super().setUp()
        self.session = get_db()
        self.session.query(BookAlias).delete()
        self.session.query(AuthorAlias).delete()
        self.session.commit()

    def tearDown(self):
        self.session.rollback()
        self.session.query(BookAlias).delete()
        self.session.query(AuthorAlias).delete()
        self.session.commit()
        super().tearDown()

    def test_book_aliases_are_trimmed_deduplicated_and_exclude_title(self):
        aliases = AliasService(self.session).replace_book_aliases(
            BID_EPUB,
            [" One Hundred Years of Solitude ", "one hundred years of solitude", "百年孤独"],
            title="百年孤独",
        )

        self.assertEqual(aliases, ["One Hundred Years of Solitude"])
        self.assertEqual(AliasService(self.session).get_book_aliases(BID_EPUB), aliases)

    def test_author_alias_conflict_requires_explicit_absorb(self):
        service = AliasService(self.session)
        service.replace_author_group("安徒生", "Hans Christian Andersen", ["安徒生"])
        service.replace_author_group("安徒生童话作者", "安徒生童话作者", [])

        with self.assertRaises(AliasConflictError):
            service.replace_author_group(
                "Hans Christian Andersen",
                "Hans Christian Andersen",
                ["安徒生童话作者"],
            )

        group = service.replace_author_group(
            "Hans Christian Andersen",
            "Hans Christian Andersen",
            ["安徒生", "安徒生童话作者"],
            absorb_conflicts=True,
        )
        self.assertEqual(group["canonical"], "Hans Christian Andersen")
        self.assertEqual(set(group["aliases"]), {"安徒生", "安徒生童话作者"})

    def test_changing_canonical_name_preserves_the_previous_name_as_an_alias(self):
        service = AliasService(self.session)
        service.replace_author_group("安徒生", "安徒生", [])

        group = service.replace_author_group("安徒生", "Hans Christian Andersen", [])

        self.assertEqual(group["canonical"], "Hans Christian Andersen")
        self.assertEqual(group["aliases"], ["安徒生"])

    def test_calibre_author_merge_plan_uses_native_author_ids(self):
        cache = mock.Mock()
        cache.author_data.return_value = {
            10: {"name": "Hans Christian Andersen", "sort": "Andersen, Hans Christian", "link": ""},
            11: {"name": "安徒生", "sort": "安徒生", "link": ""},
            12: {"name": "Other Author", "sort": "Author, Other", "link": ""},
        }
        cache.books_for_field.return_value = {BID_MOBI}

        rename_map, affected_books = calibre_author_merge_plan(
            cache,
            ["Hans Christian Andersen", "安徒生"],
            "Hans Christian Andersen",
        )

        self.assertEqual(rename_map, {11: "Hans Christian Andersen"})
        self.assertEqual(affected_books, {BID_MOBI})
        cache.books_for_field.assert_called_once_with("authors", 11)

    def test_book_detail_and_search_include_saved_title_alias(self):
        AliasService(self.session).replace_book_aliases(BID_EPUB, ["One Hundred Years of Solitude"])

        detail = self.json(f"/api/book/{BID_EPUB}")
        self.assertEqual(detail["book"]["aliases"], ["One Hundred Years of Solitude"])

        result = self.json("/api/search?name=" + Q("Hundred Years"))
        self.assertEqual(result["err"], "ok")
        self.assertIn(BID_EPUB, [book["id"] for book in result["books"]])

    def test_author_alias_search_and_page_aggregate_books(self):
        AliasService(self.session).replace_author_group(
            "安徒生",
            "Hans Christian Andersen",
            ["安徒生"],
        )

        search = self.json("/api/search?name=" + Q("Hans Christian"))
        self.assertIn(BID_MOBI, [book["id"] for book in search["books"]])

        page = self.json("/api/author/" + Q("Hans Christian Andersen"))
        self.assertEqual(page["canonical_author"], "Hans Christian Andersen")
        self.assertEqual(page["author_aliases"], ["安徒生"])
        self.assertIn(BID_MOBI, [book["id"] for book in page["books"]])

        authors = self.json("/api/author?show=all")
        names = [item["name"] for item in authors["items"]]
        self.assertIn("Hans Christian Andersen", names)
        self.assertNotIn("安徒生", names)

    def test_author_alias_resources_use_numeric_author_ids(self):
        author_id = self._app.settings["legacy"].new_api.get_item_id("authors", "安徒生")

        lookup = self.json("/api/authors?name=" + Q("安徒生"))
        aliases = self.json(f"/api/authors/{author_id}/aliases")
        updated = self.json(
            f"/api/authors/{author_id}/aliases",
            method="PUT",
            body=json.dumps(
                {
                    "canonical": "Hans Christian Andersen",
                    "aliases": ["安徒生"],
                }
            ),
        )

        self.assertEqual(lookup["author"], {"id": author_id, "name": "安徒生"})
        self.assertEqual(aliases["author"]["id"], author_id)
        self.assertEqual(aliases["author"]["canonical"], "安徒生")
        self.assertEqual(updated["err"], "ok")
        self.assertEqual(updated["author"]["canonical"], "Hans Christian Andersen")
        self.assertEqual(updated["author"]["aliases"], ["安徒生"])

    def test_author_alias_routes_have_explicit_resources_and_methods(self):
        route_map = {pattern: handler.__name__ for pattern, handler in meta_routes()}

        self.assertEqual(route_map[r"/api/authors"], "AuthorCollection")
        self.assertEqual(route_map[r"/api/authors/([0-9]+)/aliases"], "AuthorAliases")
        self.assertEqual(route_map[r"/api/authors/([0-9]+)/merges"], "AuthorMerges")
        self.assertFalse(any("author-aliases" in pattern for pattern in route_map))

    def test_book_edit_persists_aliases(self):
        body = {"title": "百年孤独", "aliases": ["One Hundred Years of Solitude"]}
        with mock.patch.object(self._app.settings["legacy"], "set_metadata"):
            result = self.json(
                f"/api/book/{BID_EPUB}/edit",
                method="POST",
                body=json.dumps(body),
            )

        self.assertEqual(result["err"], "ok")
        self.assertEqual(
            AliasService(self.session).get_book_aliases(BID_EPUB),
            ["One Hundred Years of Solitude"],
        )

    def test_admin_batch_delete_cleans_book_aliases(self):
        regular_book_id = 987650
        external_book_id = 987651
        service = AliasService(self.session)
        service.replace_book_aliases(regular_book_id, ["One Hundred Years of Solitude"])
        service.replace_book_aliases(external_book_id, ["Andersen Fairy Tales"])

        with (
            mock.patch("webserver.handlers.admin.is_external_index_book", side_effect=[False, True]),
            mock.patch("webserver.handlers.admin.delete_external_index_book_record") as delete_external,
            mock.patch.object(self._app.settings["legacy"], "delete_book") as delete_book,
        ):
            result = self.json(
                "/api/admin/book/delete",
                method="POST",
                body=json.dumps({"idlist": [regular_book_id, external_book_id]}),
            )

        self.assertEqual(result["err"], "ok")
        delete_book.assert_called_once_with(regular_book_id)
        delete_external.assert_called_once_with(self._app.settings["legacy"], external_book_id)
        self.assertEqual(service.get_book_aliases(regular_book_id), [])
        self.assertEqual(service.get_book_aliases(external_book_id), [])

    def test_admin_merge_uses_calibre_native_author_rename(self):
        cache = self._app.settings["legacy"].new_api
        author_id = cache.get_item_id("authors", "安徒生")
        with (
            mock.patch.object(
                cache,
                "author_data",
                return_value={author_id: {"name": "安徒生", "sort": "安徒生", "link": ""}},
            ),
            mock.patch.object(cache, "books_for_field", return_value={BID_MOBI}),
            mock.patch(
                "webserver.handlers.meta.rename_items_preserving_external_paths",
                return_value=({BID_MOBI}, {author_id: author_id}),
            ) as rename_items,
        ):
            result = self.json(
                f"/api/authors/{author_id}/merges",
                method="POST",
                body=json.dumps(
                    {
                        "canonical": "Hans Christian Andersen",
                        "aliases": ["安徒生"],
                    }
                ),
            )

        self.assertEqual(result["err"], "ok")
        self.assertEqual(result["merge"]["updated"], 1)
        self.assertEqual(result["merge"]["failed"], [])
        args = rename_items.call_args.args
        self.assertIs(args[0], self._app.settings["legacy"])
        self.assertEqual(args[2:], ("authors", {author_id: "Hans Christian Andersen"}, {BID_MOBI}))

    def test_native_rename_restores_external_index_paths(self):
        db = mock.Mock()
        db.new_api.rename_items.return_value = ({BID_MOBI}, {10: 10})
        source_path = "/external/books/andersen.epub"

        with (
            mock.patch(
                "webserver.services.external_index.external_index_format_paths",
                side_effect=lambda _session, book_id: {"EPUB": source_path} if book_id == BID_MOBI else {},
            ),
            mock.patch("webserver.services.external_index.clear_book_path") as clear_path,
            mock.patch("webserver.services.external_index.set_external_format_record") as restore_format,
            mock.patch("webserver.services.external_index.os.path.exists", return_value=True),
        ):
            result = rename_items_preserving_external_paths(
                db,
                self.session,
                "authors",
                {10: "Hans Christian Andersen"},
                {BID_MOBI},
            )

        self.assertEqual(result, ({BID_MOBI}, {10: 10}))
        clear_path.assert_called_once_with(db, BID_MOBI)
        db.new_api.rename_items.assert_called_once_with("authors", {10: "Hans Christian Andersen"})
        restore_format.assert_called_once_with(db, BID_MOBI, source_path, "EPUB")

    def test_non_admin_cannot_change_global_author_aliases(self):
        author_id = self._app.settings["legacy"].new_api.get_item_id("authors", "安徒生")
        body = json.dumps({"canonical": "安徒生", "aliases": []})

        with mock.patch("webserver.handlers.meta.ListHandler.is_admin", return_value=False):
            for method, path in (
                ("PUT", f"/api/authors/{author_id}/aliases"),
                ("POST", f"/api/authors/{author_id}/merges"),
            ):
                with self.subTest(method=method, path=path):
                    result = self.json(path, method=method, body=body)
                    self.assertEqual(result["err"], "permission")
