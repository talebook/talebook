#!/usr/bin/env python3
"""Authenticated API for explainable, creator-private recommendations."""

import datetime
import json
import logging
import uuid

from sqlalchemy.exc import IntegrityError

from webserver import loader, utils
from webserver.handlers.base import BaseHandler, auth, js
from webserver.models import (
    ReadingState,
    RecommendationEvent,
    RecommendationFeedback,
    RecommendationPreference,
    RecommendationSnapshot,
)
from webserver.services.recommendations import (
    VALID_FEEDBACK,
    RecommendationValidationError,
    cache_key,
    deterministic_candidates,
    deterministic_result,
    generate_with_runtime,
    normalize_preferences,
    safe_fallback_reason,
)


CONF = loader.get_settings()
LOG = logging.getLogger(__name__)
VALID_EVENTS = {"detail_click", "start_read", "add_shelf"}


def _json_body(handler):
    try:
        value = json.loads(handler.request.body or b"{}")
    except (TypeError, ValueError):
        raise RecommendationValidationError("请求 JSON 无效")
    if not isinstance(value, dict):
        raise RecommendationValidationError("请求 JSON 必须是对象")
    return value


def _iso(value):
    return value.isoformat() if value else None


class _RecommendationBase(BaseHandler):
    def _preference(self):
        record = self.session.get(RecommendationPreference, self.user_id())
        if record:
            return record
        record = RecommendationPreference(
            reader_id=self.user_id(),
            personalization_enabled=True,
            selections=normalize_preferences({}),
        )
        self.session.add(record)
        self.session.commit()
        return record

    def _visible_books(self):
        books = self.get_books(ids=self.books_by_id())
        visible = []
        for book in books:
            book_id = int(book["id"])
            if not self.can_view_book(book_id):
                continue
            formats = book.get("available_formats") or []
            if not formats:
                continue
            sizes = []
            for fmt in formats:
                try:
                    sizes.append(int(self.db.sizeof_format(book_id, fmt, index_is_id=True) or 0))
                except Exception:
                    continue
            item = dict(book)
            item["size_bytes"] = min((size for size in sizes if size > 0), default=0)
            visible.append(item)
        return visible

    def _states(self):
        records = self.session.query(ReadingState).filter(ReadingState.reader_id == self.user_id()).all()
        return {record.book_id: record for record in records}

    def _feedback(self, active_only=True):
        query = self.session.query(RecommendationFeedback).filter(RecommendationFeedback.reader_id == self.user_id())
        if active_only:
            query = query.filter(RecommendationFeedback.active.is_(True))
        return query.order_by(RecommendationFeedback.update_time.desc(), RecommendationFeedback.id.desc()).all()

    def _invalidate_snapshot(self):
        snapshot = self.session.get(RecommendationSnapshot, self.user_id())
        if snapshot:
            self.session.delete(snapshot)

    def _format_items(self, items, by_id, state_map):
        result = []
        seen = set()
        for recommendation in sorted(items, key=lambda item: item.get("rank", 999)):
            try:
                book_id = int(recommendation.get("book_id", 0))
            except (TypeError, ValueError):
                continue
            book = by_id.get(book_id)
            if not book or book_id in seen or not self.can_view_book(book_id):
                continue
            formatted = utils.BookFormatter(self, book).format()
            formatted["state"] = utils.ReadingStateFormatter.format_reading_state(state_map.get(book_id))
            formatted["recommendation"] = {
                "rank": len(result) + 1,
                "reason": recommendation.get("reason", ""),
                "evidence": recommendation.get("evidence", []),
                "confidence": recommendation.get("confidence", "low"),
            }
            result.append(formatted)
            seen.add(book_id)
        return result


class Recommendations(_RecommendationBase):
    @js
    @auth
    def get(self):
        try:
            limit = max(1, min(12, int(self.get_argument("limit", "8"))))
            batch = max(0, min(50, int(self.get_argument("batch", "0"))))
        except (TypeError, ValueError):
            return {"err": "params.invalid", "msg": "分页参数无效"}
        refresh = self.get_argument("refresh", "0") == "1"
        preference = self._preference()
        selections = normalize_preferences(preference.selections or {})
        books = self._visible_books()
        by_id = {int(book["id"]): book for book in books}
        all_states = self._states()
        ranking_states = all_states if preference.personalization_enabled else {}
        feedback = self._feedback()
        key = cache_key(
            books,
            ranking_states,
            feedback,
            selections,
            preference.personalization_enabled,
            batch,
            limit,
        )
        now = datetime.datetime.now()
        snapshot = self.session.get(RecommendationSnapshot, self.user_id())
        cached = bool(snapshot and not refresh and snapshot.cache_key == key and snapshot.expires_at > now)
        signal_summary = None
        if cached:
            items = (snapshot.result_data or {}).get("items", [])
            source = snapshot.source
            fallback_reason = snapshot.fallback_reason or ""
            signal_summary = (snapshot.result_data or {}).get("signal_summary")
        else:
            candidates, signal_summary = deterministic_candidates(
                books,
                ranking_states,
                feedback,
                selections,
                preference.personalization_enabled,
                self.user_id(),
                batch=batch,
            )
            count = min(limit, len(candidates))
            source = "deterministic"
            fallback_reason = ""
            if count and CONF.get("AI_ENABLED", True) and CONF.get("AI_RECOMMENDATIONS_ENABLED", True):
                try:
                    items = generate_with_runtime(
                        CONF,
                        books,
                        candidates,
                        signal_summary,
                        count,
                        task_id="recommendations-" + uuid.uuid4().hex,
                    )
                    source = "agent"
                except Exception as exc:
                    LOG.info("Recommendation runtime fallback: %s", safe_fallback_reason(exc))
                    fallback_reason = safe_fallback_reason(exc)
                    items = deterministic_result(candidates, count)
            else:
                items = deterministic_result(candidates, count)
                if count and not (CONF.get("AI_ENABLED", True) and CONF.get("AI_RECOMMENDATIONS_ENABLED", True)):
                    fallback_reason = "runtime.disabled"
            if not snapshot:
                snapshot = RecommendationSnapshot(reader_id=self.user_id(), cache_key=key, expires_at=now)
                self.session.add(snapshot)
            snapshot.cache_key = key
            snapshot.source = source
            snapshot.fallback_reason = fallback_reason
            snapshot.result_data = {"items": items, "signal_summary": signal_summary}
            snapshot.create_time = now
            snapshot.expires_at = now + datetime.timedelta(
                seconds=max(30, int(CONF.get("AI_RECOMMENDATIONS_CACHE_SECONDS", 900)))
            )
            self.session.add(
                RecommendationEvent(
                    reader_id=self.user_id(),
                    event_type="generated" if source == "agent" else "fallback_generated",
                    source=source,
                )
            )
            self.session.commit()
        formatted = self._format_items(items, by_id, all_states)
        return {
            "err": "ok",
            "books": formatted,
            "source": source,
            "fallback": bool(fallback_reason),
            "fallback_reason": fallback_reason,
            "cached": cached,
            "generated_at": _iso(snapshot.create_time) if snapshot else None,
            "signal_summary": signal_summary,
            "preferences": {
                "personalization_enabled": bool(preference.personalization_enabled),
                **selections,
            },
        }


class RecommendationPreferences(_RecommendationBase):
    @js
    @auth
    def get(self):
        preference = self._preference()
        return {
            "err": "ok",
            "preferences": {
                "personalization_enabled": bool(preference.personalization_enabled),
                **normalize_preferences(preference.selections or {}),
            },
        }

    @js
    @auth
    def patch(self):
        try:
            body = _json_body(self)
            selections = normalize_preferences(body)
        except RecommendationValidationError as exc:
            return {"err": "params.invalid", "msg": str(exc)}
        visible_ids = {int(book["id"]) for book in self._visible_books()}
        if any(book_id not in visible_ids for book_id in selections["seed_book_ids"]):
            return {"err": "book.not_found", "msg": "种子书不存在或无权访问"}
        preference = self._preference()
        if "personalization_enabled" in body:
            if not isinstance(body["personalization_enabled"], bool):
                return {"err": "params.invalid", "msg": "个性化开关必须是布尔值"}
            preference.personalization_enabled = body["personalization_enabled"]
        preference.selections = selections
        preference.update_time = datetime.datetime.now()
        self._invalidate_snapshot()
        self.session.commit()
        return {
            "err": "ok",
            "preferences": {
                "personalization_enabled": bool(preference.personalization_enabled),
                **selections,
            },
        }


class RecommendationFeedbackCollection(_RecommendationBase):
    @js
    @auth
    def get(self):
        return {
            "err": "ok",
            "feedback": [
                {
                    "id": record.id,
                    "book_id": record.book_id,
                    "action": record.action,
                    "create_time": _iso(record.create_time),
                }
                for record in self._feedback()
            ],
        }

    @js
    @auth
    def post(self):
        try:
            body = _json_body(self)
            book_id = int(body.get("book_id", 0))
        except (RecommendationValidationError, TypeError, ValueError) as exc:
            return {"err": "params.invalid", "msg": str(exc) or "反馈参数无效"}
        action = str(body.get("action", "") or "")
        if action not in VALID_FEEDBACK:
            return {"err": "params.invalid", "msg": "反馈类型无效"}
        book = self.get_book(book_id, raise_exception=False)
        if not book or not self.can_view_book(book_id):
            return {"err": "book.not_found", "msg": "书籍不存在"}
        record = (
            self.session.query(RecommendationFeedback)
            .filter(
                RecommendationFeedback.reader_id == self.user_id(),
                RecommendationFeedback.book_id == book_id,
                RecommendationFeedback.action == action,
            )
            .first()
        )
        now = datetime.datetime.now()
        if not record:
            record = RecommendationFeedback(
                reader_id=self.user_id(),
                book_id=book_id,
                action=action,
                create_time=now,
            )
            self.session.add(record)
        record.active = True
        record.update_time = now
        record.context = {
            "authors": list(book.get("authors") or [])[:5],
            "tags": list(book.get("tags") or [])[:10],
        }
        self._invalidate_snapshot()
        try:
            self.session.commit()
        except IntegrityError:
            self.session.rollback()
            return {"err": "recommendation.conflict", "msg": "反馈保存冲突，请重试"}
        return {
            "err": "ok",
            "feedback": {"id": record.id, "book_id": book_id, "action": action},
            "undo_seconds": 10,
        }

    @js
    @auth
    def delete(self):
        now = datetime.datetime.now()
        records = self._feedback(active_only=True)
        for record in records:
            record.active = False
            record.update_time = now
        self._invalidate_snapshot()
        self.session.commit()
        return {"err": "ok", "cleared": len(records)}


class RecommendationFeedbackItem(_RecommendationBase):
    @js
    @auth
    def delete(self, feedback_id):
        record = (
            self.session.query(RecommendationFeedback)
            .filter(
                RecommendationFeedback.id == int(feedback_id),
                RecommendationFeedback.reader_id == self.user_id(),
                RecommendationFeedback.active.is_(True),
            )
            .first()
        )
        if not record:
            return {"err": "recommendation.feedback_not_found", "msg": "反馈不存在或已撤销"}
        record.active = False
        record.update_time = datetime.datetime.now()
        self._invalidate_snapshot()
        self.session.commit()
        return {"err": "ok", "feedback_id": record.id}


class RecommendationEvents(_RecommendationBase):
    @js
    @auth
    def post(self):
        try:
            body = _json_body(self)
            event_type = str(body.get("event_type", "") or "")
            book_id = int(body.get("book_id", 0) or 0)
        except (RecommendationValidationError, TypeError, ValueError):
            return {"err": "params.invalid", "msg": "事件参数无效"}
        if event_type not in VALID_EVENTS:
            return {"err": "params.invalid", "msg": "事件类型无效"}
        if not book_id or not self.can_view_book(book_id) or not self.get_book(book_id, raise_exception=False):
            return {"err": "book.not_found", "msg": "书籍不存在"}
        source = str(body.get("source", "") or "")
        if source not in {"agent", "deterministic"}:
            source = ""
        self.session.add(
            RecommendationEvent(
                reader_id=self.user_id(),
                book_id=book_id,
                event_type=event_type,
                source=source,
            )
        )
        self.session.commit()
        return {"err": "ok"}


def routes():
    return [
        (r"/api/ai/recommendations", Recommendations),
        (r"/api/ai/recommendations/preferences", RecommendationPreferences),
        (r"/api/ai/recommendations/feedback", RecommendationFeedbackCollection),
        (r"/api/ai/recommendations/feedback/([0-9]+)", RecommendationFeedbackItem),
        (r"/api/ai/recommendations/events", RecommendationEvents),
    ]
