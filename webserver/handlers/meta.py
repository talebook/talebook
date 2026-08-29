#!/usr/bin/env python3
# -*- coding: UTF-8 -*-
import logging
import math
import sys
from functools import cmp_to_key

import tornado.escape

from webserver import utils
from webserver.handlers.base import ListHandler, auth, js
from webserver.i18n import _
from webserver.services.aliases import (
    AliasConflictError,
    AliasService,
    calibre_author_merge_plan,
    clean_alias_name,
    normalize_alias,
)
from webserver.services.external_index import rename_items_preserving_external_paths


def get_author_book_ids(handler, names):
    ids = set()
    for author_name in names:
        author_id = handler.cache.get_item_id("authors", author_name)
        if author_id:
            ids.update(handler.db.get_books_for_category("authors", author_id))
    return ids


class AuthorBooksUpdate(ListHandler):
    def post(self, name):
        category = "authors"
        author_id = self.cache.get_item_id(category, name)
        ids = self.db.get_books_for_category(category, author_id)
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect("/author/%s" % name, 302)


class PubBooksUpdate(ListHandler):
    def post(self, name):
        category = "publisher"
        publisher_id = self.cache.get_item_id(category, name)
        if publisher_id:
            ids = self.db.get_books_for_category(category, publisher_id)
        else:
            ids = self.cache.search_for_books("")
            books = self.db.get_data_as_dict(ids=ids)
            ids = [b["id"] for b in books if not b["publisher"]]
        for book_id in list(ids)[:40]:
            self.do_book_update(book_id)
        self.redirect("/publisher/%s" % name, 302)


class MetaList(ListHandler):
    @js
    def get(self, meta):
        SHOW_NUMBER = 300
        if self.get_argument("show", "") == "all":
            SHOW_NUMBER = sys.maxsize
        titles = {
            "tag": _("全部标签"),
            "author": _("全部作者"),
            "series": _("丛书列表"),
            "rating": _("全部评分"),
            "publisher": _("全部出版社"),
            "format": _("全部格式"),
        }
        title = titles.get(meta, _("未知")) % vars()
        if meta == "format":
            # 使用Calibre API获取所有格式及其对应的书籍数量
            from collections import defaultdict

            format_count = defaultdict(int)
            all_book_ids = self.db.new_api.all_book_ids()
            for book_id in all_book_ids:
                book_formats = self.db.new_api.formats(book_id)
                for fmt in book_formats:
                    format_count[fmt] += 1
            items = [{"id": fmt, "name": fmt, "count": count} for fmt, count in format_count.items()]
        else:
            items = self.get_category_with_count(meta)
            if meta == "author":
                alias_service = AliasService(self.session)
                author_mapping = alias_service.author_mapping()
                grouped = {}
                for item in items:
                    canonical = author_mapping.get(normalize_alias(item["name"]), item["name"])
                    key = normalize_alias(canonical)
                    if key not in grouped:
                        grouped[key] = {"id": item["id"], "name": canonical, "count": 0, "members": []}
                    grouped[key]["count"] += item["count"]
                    grouped[key]["members"].append(item["name"])
                for item in grouped.values():
                    if len(item["members"]) > 1:
                        item["count"] = len(get_author_book_ids(self, item["members"]))
                    item.pop("members")
                items = list(grouped.values())
        count = len(items)
        if items:
            if meta == "rating":
                items.sort(key=lambda x: x["name"], reverse=True)
            else:
                hotline = int(math.log10(count)) if count > SHOW_NUMBER else 0
                items = [v for v in items if v["count"] >= hotline]
                items.sort(key=lambda x: x["count"], reverse=True)
        return {"meta": meta, "title": title, "items": items, "total": count}


class MetaBooks(ListHandler):
    @js
    def get(self, meta, name):
        titles = {
            "tag": _('含有"%(name)s"标签的书籍'),
            "author": _('"%(name)s"编著的书籍'),
            "series": _('"%(name)s"丛书包含的书籍'),
            "rating": _("评分为%(name)s星的书籍"),
            "publisher": _('"%(name)s"出版的书籍'),
            "format": _('格式为"%(name)s"的书籍'),
        }
        title = titles.get(meta, _("未知")) % vars()  # noqa: F841

        if meta == "format":
            # 使用Calibre API获取指定格式的书籍
            all_book_ids = self.db.new_api.all_book_ids()
            matching_ids = []
            for book_id in all_book_ids:
                book_formats = self.db.new_api.formats(book_id)
                if name in book_formats:
                    matching_ids.append(book_id)
            books = self.db.get_data_as_dict(ids=matching_ids)
        else:
            category = meta + "s" if meta in ["tag", "author"] else meta
            if meta == "author":
                alias_service = AliasService(self.session)
                author_group = alias_service.get_author_group(name)
                name = author_group["canonical"]
                title = titles[meta] % vars()
                ids = get_author_book_ids(self, author_group["names"])
                books = self.db.get_data_as_dict(ids=ids)
            elif meta in ["rating"]:
                # rating 字段需要使用 rating 值查找对应的 item_id
                rating_value = int(name)
                # 使用 get_item_name_map 获取 rating 映射，如果方法不存在则使用替代方案
                try:
                    rating_map = self.cache.get_item_name_map("rating")
                    # rating_map 的 key 可能是整数或字符串，尝试两种可能
                    item_id = rating_map.get(rating_value) or rating_map.get(str(rating_value))
                except AttributeError:
                    # 如果 get_item_name_map 不存在，使用 get_item_id 替代
                    item_id = self.cache.get_item_id("rating", str(rating_value))

                if item_id:
                    ids = self.db.get_books_for_category("rating", item_id)
                    books = self.db.get_data_as_dict(ids=ids)
                else:
                    books = []
            else:
                books = self.get_item_books(category, name)

        books.sort(key=cmp_to_key(utils.compare_books_by_rating_or_id), reverse=True)
        response = self.render_book_list(books, title=title)
        if meta == "author":
            response["canonical_author"] = author_group["canonical"]
            response["author_aliases"] = author_group["aliases"]
        return response


class AuthorAliases(ListHandler):
    @js
    def get(self, name):
        alias_service = AliasService(self.session)
        group = alias_service.get_author_group(name)
        group["book_count"] = len(get_author_book_ids(self, group["names"]))
        group["can_edit"] = bool(self.current_user and self.current_user.can_edit() and self.is_admin())
        return {"err": "ok", "author": group}

    @js
    @auth
    def post(self, name):
        if not self.current_user.can_edit() or not self.is_admin():
            return {"err": "permission", "msg": _("无权操作")}

        try:
            data = tornado.escape.json_decode(self.request.body)
            canonical = clean_alias_name(data.get("canonical") or name)
            aliases = data.get("aliases", [])
            merge = data.get("merge") is True
        except (AttributeError, TypeError, ValueError):
            return {"err": "params.aliases.invalid", "msg": _("别名参数无效")}

        alias_service = AliasService(self.session)
        source_names = alias_service.author_names(name)
        try:
            group = alias_service.replace_author_group(name, canonical, aliases, absorb_conflicts=merge)
        except AliasConflictError as error:
            return {"err": "author.alias.conflict", "msg": str(error)}
        except ValueError:
            return {"err": "params.aliases.invalid", "msg": _("别名参数无效")}

        merge_result = {"updated": 0, "failed": []}
        if merge:
            member_names = source_names + group["names"]
            rename_map, affected_books = calibre_author_merge_plan(self.cache, member_names, group["canonical"])
            if rename_map:
                try:
                    renamed_books, _id_map = rename_items_preserving_external_paths(
                        self.db,
                        self.session,
                        "authors",
                        rename_map,
                        affected_books,
                    )
                    merge_result["updated"] = len(renamed_books)
                except Exception:
                    logging.exception("Failed to merge Calibre authors %s", sorted(rename_map))
                    merge_result["failed"] = sorted(affected_books)
        group["book_count"] = len(get_author_book_ids(self, group["names"]))
        return {
            "err": "ok",
            "author": group,
            "merge": merge_result,
            "msg": _("作者别名更新成功"),
        }


def routes():
    return [
        (r"/api/author-aliases/(.*)", AuthorAliases),
        (r"/api/(author|publisher|tag|rating|series|format)", MetaList),
        (r"/api/(author|publisher|tag|rating|series|format)/(.*)", MetaBooks),
        (r"/api/author/(.*)/update", AuthorBooksUpdate),
        (r"/api/publisher/(.*)/update", PubBooksUpdate),
    ]
