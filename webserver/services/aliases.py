#!/usr/bin/env python3
# -*- coding: UTF-8 -*-

from collections import OrderedDict

from webserver.models import AuthorAlias, BookAlias


MAX_ALIAS_LENGTH = 500
MAX_ALIASES_PER_ITEM = 50


class AliasConflictError(ValueError):
    pass


def clean_alias_name(value):
    if not isinstance(value, str):
        raise ValueError("alias must be a string")
    value = " ".join(value.split())
    if not value:
        raise ValueError("alias cannot be empty")
    if len(value) > MAX_ALIAS_LENGTH:
        raise ValueError("alias is too long")
    return value


def normalize_alias(value):
    return clean_alias_name(value).casefold()


def clean_aliases(values, excluded=()):
    if values is None:
        return []
    if not isinstance(values, list):
        raise ValueError("aliases must be a list")
    if len(values) > MAX_ALIASES_PER_ITEM:
        raise ValueError("too many aliases")

    excluded_names = set()
    for value in excluded:
        try:
            excluded_names.add(normalize_alias(value))
        except (TypeError, ValueError):
            continue
    cleaned = OrderedDict()
    for value in values:
        name = clean_alias_name(value)
        normalized = name.casefold()
        if normalized not in excluded_names:
            cleaned.setdefault(normalized, name)
    return list(cleaned.values())


class AliasService:
    def __init__(self, session):
        self.session = session

    def get_book_aliases(self, book_id):
        rows = self.session.query(BookAlias).filter(BookAlias.book_id == int(book_id)).order_by(BookAlias.id.asc()).all()
        return [row.name for row in rows]

    def replace_book_aliases(self, book_id, aliases, title=None):
        aliases = clean_aliases(aliases, excluded=[title] if title else [])
        self.session.query(BookAlias).filter(BookAlias.book_id == int(book_id)).delete()
        for name in aliases:
            self.session.add(
                BookAlias(
                    book_id=int(book_id),
                    name=name,
                    normalized_name=normalize_alias(name),
                )
            )
        self.session.commit()
        return aliases

    def delete_book_aliases(self, book_id):
        self.session.query(BookAlias).filter(BookAlias.book_id == int(book_id)).delete()

    def find_book_ids(self, keyword):
        keyword = normalize_alias(keyword)
        rows = self.session.query(BookAlias.book_id).filter(BookAlias.normalized_name.contains(keyword)).distinct().all()
        return {row.book_id for row in rows}

    def author_mapping(self):
        rows = self.session.query(AuthorAlias.normalized_name, AuthorAlias.canonical_name).all()
        return {row.normalized_name: row.canonical_name for row in rows}

    def _author_row(self, name):
        try:
            normalized = normalize_alias(name)
        except ValueError:
            return None
        return self.session.query(AuthorAlias).filter(AuthorAlias.normalized_name == normalized).first()

    def canonical_author(self, name):
        row = self._author_row(name)
        return row.canonical_name if row else clean_alias_name(name)

    def author_names(self, name):
        canonical = self.canonical_author(name)
        canonical_normalized = normalize_alias(canonical)
        rows = (
            self.session.query(AuthorAlias)
            .filter(AuthorAlias.canonical_normalized_name == canonical_normalized)
            .order_by(AuthorAlias.name.asc())
            .all()
        )
        names = OrderedDict([(canonical_normalized, canonical)])
        for row in rows:
            names.setdefault(row.normalized_name, row.name)
        return list(names.values())

    def get_author_group(self, name):
        canonical = self.canonical_author(name)
        names = self.author_names(canonical)
        aliases = [value for value in names if normalize_alias(value) != normalize_alias(canonical)]
        return {"canonical": canonical, "aliases": aliases, "names": names}

    def matching_author_names(self, keyword):
        keyword = normalize_alias(keyword)
        rows = (
            self.session.query(AuthorAlias.canonical_normalized_name)
            .filter(AuthorAlias.normalized_name.contains(keyword))
            .distinct()
            .all()
        )
        matching_canonicals = {row.canonical_normalized_name for row in rows}
        if not matching_canonicals:
            return []
        rows = self.session.query(AuthorAlias).filter(AuthorAlias.canonical_normalized_name.in_(matching_canonicals)).all()
        return list(OrderedDict((row.normalized_name, row.name) for row in rows).values())

    def replace_author_group(self, source_name, canonical, aliases, absorb_conflicts=False):
        source_group = self.get_author_group(source_name)
        canonical = clean_alias_name(canonical)
        requested_values = [canonical] + (aliases or [])
        if normalize_alias(canonical) != normalize_alias(source_group["canonical"]):
            requested_values.append(source_group["canonical"])
        requested_names = clean_aliases(requested_values)
        requested_normalized = {normalize_alias(name) for name in requested_names}

        existing_rows = self.session.query(AuthorAlias).filter(AuthorAlias.normalized_name.in_(requested_normalized)).all()
        source_canonical = normalize_alias(source_group["canonical"])
        foreign_canonicals = {
            row.canonical_normalized_name for row in existing_rows if row.canonical_normalized_name != source_canonical
        }
        if foreign_canonicals and not absorb_conflicts:
            conflicting = sorted(row.name for row in existing_rows if row.canonical_normalized_name in foreign_canonicals)
            raise AliasConflictError("aliases already belong to another author: %s" % ", ".join(conflicting))

        absorbed_rows = []
        if foreign_canonicals:
            absorbed_rows = (
                self.session.query(AuthorAlias).filter(AuthorAlias.canonical_normalized_name.in_(foreign_canonicals)).all()
            )

        all_names = OrderedDict()
        for name in requested_names + [row.name for row in absorbed_rows]:
            all_names.setdefault(normalize_alias(name), clean_alias_name(name))

        obsolete_canonicals = foreign_canonicals | {source_canonical}
        obsolete_rows = (
            self.session.query(AuthorAlias).filter(AuthorAlias.canonical_normalized_name.in_(obsolete_canonicals)).all()
        )
        existing_by_name = {row.normalized_name: row for row in obsolete_rows}
        for row in obsolete_rows:
            if row.normalized_name not in all_names:
                self.session.delete(row)

        canonical_normalized = normalize_alias(canonical)
        for normalized, name in all_names.items():
            row = existing_by_name.get(normalized)
            if row is None:
                row = AuthorAlias(
                    normalized_name=normalized,
                )
                self.session.add(row)
            row.name = canonical if normalized == canonical_normalized else name
            row.canonical_name = canonical
            row.canonical_normalized_name = canonical_normalized
        self.session.commit()
        return self.get_author_group(canonical)
