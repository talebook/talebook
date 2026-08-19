#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

import json
from unittest import mock

from tests.test_main import BID_EPUB, BID_MOBI, Q, TestWithUserLogin, get_db, setUpModule as init

from webserver.models import AuthorAlias, BookAlias
from webserver.services.aliases import AliasConflictError, AliasService


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

    def test_admin_can_merge_author_metadata(self):
        with mock.patch("webserver.handlers.meta.set_metadata_preserving_external_paths") as set_metadata:
            result = self.json(
                "/api/author-aliases/" + Q("安徒生"),
                method="POST",
                body=json.dumps(
                    {
                        "canonical": "Hans Christian Andersen",
                        "aliases": ["安徒生"],
                        "merge": True,
                    }
                ),
            )

        self.assertEqual(result["err"], "ok")
        self.assertEqual(result["merge"]["updated"], 1)
        self.assertEqual(result["merge"]["failed"], [])
        set_metadata.assert_called_once()
        updated_metadata = set_metadata.call_args.args[3]
        self.assertEqual(updated_metadata.authors, ["Hans Christian Andersen"])

    def test_non_admin_cannot_change_global_author_aliases(self):
        with mock.patch("webserver.handlers.meta.ListHandler.is_admin", return_value=False):
            result = self.json(
                "/api/author-aliases/" + Q("安徒生"),
                method="POST",
                body=json.dumps({"canonical": "安徒生", "aliases": [], "merge": False}),
            )

        self.assertEqual(result["err"], "permission")
