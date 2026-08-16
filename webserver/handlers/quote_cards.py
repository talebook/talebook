#!/usr/bin/env python3
"""Creator-private quote-card CRUD and Markdown export."""

import datetime
import hashlib
import json
import os
import uuid

from sqlalchemy.exc import IntegrityError

from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import QuoteCard
from webserver.services.quote_card import (
    PROMPT_VERSION,
    SCHEMA_VERSION,
    QuoteCardValidationError,
    card_dict,
    clean_text,
    clean_topics,
    export_markdown,
    load_epub_chapter,
    normalize_quote,
    source_hash,
    validate_locator_quote,
)


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise QuoteCardValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise QuoteCardValidationError("请求 JSON 必须是对象")
    return value


def _book_version(book):
    path = book.get("fmt_epub")
    if path and os.path.isfile(path):
        stat = os.stat(path)
        value = f"epub:{stat.st_size}:{stat.st_mtime_ns}"
    else:
        value = "book:%s:%s" % (book.get("id"), book.get("timestamp", ""))
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:32]


class _QuoteCardBase(BaseHandler):
    def _book(self, book_id):
        book = self.get_book(book_id, raise_exception=False)
        if not book or not book.get("fmt_epub") or not self.can_view_book(book_id):
            return None
        return book

    def _own_card(self, card_id):
        return self.session.query(QuoteCard).filter(QuoteCard.id == card_id, QuoteCard.creator_id == self.user_id()).first()

    def _visible_card(self, card_id):
        card = self._own_card(card_id)
        if not card or not self.can_view_book(card.book_id):
            return None, {"err": "quote_card.not_found", "msg": "金句卡片不存在"}
        book = self.get_book(card.book_id, raise_exception=False)
        if not book:
            return None, {"err": "quote_card.not_found", "msg": "金句卡片不存在"}
        valid = _book_version(book) == card.book_version
        if card.source_valid != valid:
            card.source_valid = valid
            card.update_time = datetime.datetime.now()
            self.session.commit()
        return card, None


class QuoteCardCollection(_QuoteCardBase):
    @js
    @auth
    def get(self):
        try:
            book_id = int(self.get_argument("book_id", "0") or 0)
        except (TypeError, ValueError):
            book_id = 0
        book = self._book(book_id)
        if not book:
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        version = _book_version(book)
        cards = (
            self.session.query(QuoteCard)
            .filter(QuoteCard.creator_id == self.user_id(), QuoteCard.book_id == book_id)
            .order_by(QuoteCard.create_time.desc())
            .all()
        )
        changed = False
        values = []
        for card in cards:
            valid = card.book_version == version
            if card.source_valid != valid:
                card.source_valid = valid
                changed = True
            values.append(card_dict(card, valid))
        if changed:
            self.session.commit()
        return {"err": "ok", "cards": values}

    @js
    @auth
    def post(self):
        try:
            body = _json_body(self)
            book_id = int(body.get("book_id", 0))
            explanation = clean_text(body.get("why_important"), 1_500)
            topics = clean_topics(body.get("topics"))
            note = clean_text(body.get("note"), 4_000)
        except (TypeError, ValueError, QuoteCardValidationError) as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        book = self._book(book_id)
        if not book:
            return {"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"}
        try:
            # The client chapter text is deliberately ignored for trust decisions.
            chapter = load_epub_chapter(book.get("fmt_epub"), body.get("chapter_href"), body.get("chapter_title"))
            grounded = validate_locator_quote(chapter, body.get("verbatim_quote", body.get("quote")), body.get("locator"))
            user_quote = clean_text(body.get("quote_text", grounded["quote"]), 600, required=True)
            quote_type = str(body.get("quote_type") or "verbatim")
            if normalize_quote(user_quote) != normalize_quote(grounded["quote"]):
                if quote_type != "adapted_note":
                    raise QuoteCardValidationError("修改原句后必须明确保存为摘录改写/笔记")
            else:
                quote_type = "verbatim"
        except QuoteCardValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        version = _book_version(book)
        digest = source_hash(chapter["href"], grounded["locator"], grounded["quote"])
        existing = (
            self.session.query(QuoteCard)
            .filter(
                QuoteCard.creator_id == self.user_id(),
                QuoteCard.book_id == book_id,
                QuoteCard.book_version == version,
                QuoteCard.source_hash == digest,
            )
            .first()
        )
        duplicate_action = body.get("duplicate_action")
        if existing:
            if duplicate_action == "merge":
                existing.explanation = explanation or existing.explanation
                existing.note = note or existing.note
                merged_topics = list(dict.fromkeys((existing.topics or {}).get("items", []) + topics))[:8]
                existing.topics = {"items": merged_topics}
                if quote_type == "adapted_note":
                    existing.quote_type = quote_type
                    existing.quote_text = user_quote
                existing.user_revision = {
                    "quote_text": existing.quote_text,
                    "why_important": existing.explanation,
                    "topics": merged_topics,
                    "note": existing.note,
                }
                existing.update_time = datetime.datetime.now()
                self.session.commit()
                return {"err": "ok", "card": card_dict(existing), "merged": True}
            if duplicate_action == "open":
                return {"err": "ok", "card": card_dict(existing), "idempotent": True}
            return {"err": "quote_card.duplicate", "msg": "这段原文已有金句卡片", "card": card_dict(existing)}
        now = datetime.datetime.now()
        draft = {
            "why_important": explanation,
            "topics": topics,
            "source": str(body.get("source") or "selection")[:32],
        }
        revision = {"quote_text": user_quote, "why_important": explanation, "topics": topics, "note": note}
        card = QuoteCard(
            id=str(uuid.uuid4()),
            creator_id=self.user_id(),
            book_id=book_id,
            book_version=version,
            book_title=str(book.get("title") or "")[:512],
            chapter_href=chapter["href"],
            chapter_title=chapter["title"],
            quote_type=quote_type,
            verbatim_quote=grounded["quote"],
            quote_text=user_quote,
            locator=grounded["locator"],
            source_hash=digest,
            source_valid=True,
            ai_draft=draft if body.get("source") == "recommendation" else {},
            user_revision=revision,
            explanation=explanation,
            topics={"items": topics},
            note=note,
            schema_version=SCHEMA_VERSION,
            prompt_version=PROMPT_VERSION,
            create_time=now,
            update_time=now,
        )
        self.session.add(card)
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            existing = (
                self.session.query(QuoteCard)
                .filter(
                    QuoteCard.creator_id == self.user_id(),
                    QuoteCard.book_id == book_id,
                    QuoteCard.book_version == version,
                    QuoteCard.source_hash == digest,
                )
                .first()
            )
            return {"err": "quote_card.duplicate", "msg": "这段原文已有金句卡片", "card": card_dict(existing)}
        return {"err": "ok", "card": card_dict(card), "idempotent": False}


class QuoteCardItem(_QuoteCardBase):
    @js
    @auth
    def get(self, card_id):
        card, error = self._visible_card(card_id)
        return error or {"err": "ok", "card": card_dict(card)}

    @js
    @auth
    def patch(self, card_id):
        card, error = self._visible_card(card_id)
        if error:
            return error
        try:
            body = _json_body(self)
            explanation = clean_text(body.get("why_important", card.explanation), 1_500)
            topics = clean_topics(body.get("topics", (card.topics or {}).get("items", [])))
            note = clean_text(body.get("note", card.note), 4_000)
            quote_text = clean_text(body.get("quote_text", card.quote_text), 600, required=True)
            if normalize_quote(quote_text) != normalize_quote(card.verbatim_quote):
                if not body.get("convert_to_note") and card.quote_type == "verbatim":
                    raise QuoteCardValidationError("修改原句后必须确认转为摘录改写/笔记")
                quote_type = "adapted_note"
            else:
                quote_type = "verbatim"
        except QuoteCardValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        card.quote_text = quote_text
        card.quote_type = quote_type
        card.explanation = explanation
        card.topics = {"items": topics}
        card.note = note
        card.user_revision = {
            "quote_text": quote_text,
            "why_important": explanation,
            "topics": topics,
            "note": note,
        }
        card.update_time = datetime.datetime.now()
        self.session.commit()
        return {"err": "ok", "card": card_dict(card)}

    @js
    @auth
    def delete(self, card_id):
        card, error = self._visible_card(card_id)
        if error:
            return error
        self.session.delete(card)
        self.session.commit()
        return {"err": "ok", "msg": "金句卡片已删除"}


class QuoteCardMarkdownExport(_QuoteCardBase):
    @auth
    def get(self):
        try:
            book_id = int(self.get_argument("book_id", "0") or 0)
        except (TypeError, ValueError):
            book_id = 0
        book = self._book(book_id)
        if not book:
            self.set_header("Content-Type", "application/json; charset=UTF-8")
            self.write({"err": "book.not_found", "msg": "仅支持可访问的 EPUB 书籍"})
            return
        cards = (
            self.session.query(QuoteCard)
            .filter(QuoteCard.creator_id == self.user_id(), QuoteCard.book_id == book_id)
            .order_by(QuoteCard.create_time.asc())
            .all()
        )
        self.set_header("Content-Type", "text/markdown; charset=UTF-8")
        self.set_header("Content-Disposition", f'attachment; filename="quote-cards-{book_id}.md"')
        self.write(export_markdown(cards, str(book.get("title") or "")))


def routes():
    return [
        (r"/api/quote-cards", QuoteCardCollection),
        (r"/api/quote-cards/export", QuoteCardMarkdownExport),
        (r"/api/quote-cards/([0-9a-f-]+)", QuoteCardItem),
    ]
