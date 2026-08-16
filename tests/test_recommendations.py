import json
import unittest
from types import SimpleNamespace
from unittest import mock

from webserver import models
from webserver.services.agent_runtime import AgentRuntimeError, RuntimeErrorCode, RuntimeResult
from webserver.services.recommendations import (
    RecommendationValidationError,
    cache_key,
    deterministic_candidates,
    generate_with_runtime,
    validate_runtime_output,
)

from tests import test_main


def setUpModule():
    test_main.setUpModule()


def book(book_id, title, tags, authors=None, rating=0, size_bytes=2_000_000):
    return {
        "id": book_id,
        "title": title,
        "tags": tags,
        "authors": authors or ["作者"],
        "comments": "不含剧透的简介",
        "rating": rating,
        "size_bytes": size_bytes,
    }


class RecommendationRankingTest(unittest.TestCase):
    def test_history_and_explicit_topics_rank_stably(self):
        books = [
            book(1, "已收藏", ["历史"], ["甲"]),
            book(2, "历史候选", ["历史", "传记"], ["乙"]),
            book(3, "其他候选", ["科幻"], ["丙"]),
        ]
        states = {1: SimpleNamespace(favorite=1, wants=0, read_state=0, online_read=0)}
        ranked, summary = deterministic_candidates(
            books,
            states,
            [],
            {"topics": ["历史"], "length": "", "difficulty": "", "seed_book_ids": []},
            True,
            reader_id=1,
        )
        self.assertEqual([item["book_id"] for item in ranked], [2, 3])
        self.assertIn("topic:历史", ranked[0]["evidence"])
        self.assertFalse(summary["cold_start"])

    def test_personalization_off_does_not_use_reading_state(self):
        books = [book(1, "信号来源", ["历史"]), book(2, "候选", ["历史"]), book(3, "探索", ["科幻"])]
        states = {1: SimpleNamespace(favorite=1, wants=0, read_state=0, online_read=0)}
        ranked, summary = deterministic_candidates(books, states, [], {}, False, reader_id=1)
        self.assertEqual(len(ranked), 3)
        self.assertFalse(any("history_" in evidence for item in ranked for evidence in item["evidence"]))
        self.assertTrue(summary["cold_start"])

    def test_seed_books_are_explained_as_explicit_input(self):
        books = [book(1, "种子书", ["历史"], ["甲"]), book(2, "候选", ["历史"], ["甲"])]
        ranked, summary = deterministic_candidates(
            books,
            {},
            [],
            {"seed_book_ids": [1], "length": "short"},
            False,
            reader_id=1,
        )
        self.assertEqual(ranked[0]["book_id"], 2)
        self.assertTrue(any(value.startswith("seed_") for value in ranked[0]["evidence"]))
        self.assertFalse(any(value.startswith("history_") for value in ranked[0]["evidence"]))
        self.assertFalse(summary["cold_start"])

    def test_cache_key_tracks_recommendation_metadata(self):
        first = book(1, "候选", ["历史"])
        key = cache_key([first], {}, [], {}, False, 0, 8)
        changed = {**first, "tags": ["科幻"]}
        self.assertNotEqual(key, cache_key([changed], {}, [], {}, False, 0, 8))

    def test_negative_feedback_excludes_and_downranks(self):
        books = [book(1, "排除", ["悬疑"]), book(2, "相似", ["悬疑"]), book(3, "不同", ["诗歌"])]
        feedback = [
            SimpleNamespace(id=1, book_id=1, action="not_interested", active=True),
            SimpleNamespace(id=2, book_id=2, action="less_like", active=True),
        ]
        ranked, _summary = deterministic_candidates(books, {}, feedback, {}, True, reader_id=1)
        self.assertNotIn(1, [item["book_id"] for item in ranked])
        self.assertEqual(ranked[-1]["book_id"], 2)

    def test_runtime_output_rejects_unknown_evidence(self):
        candidates = [{"book_id": 2, "allowed_evidence": ["topic:历史"]}]
        payload = {
            "items": [
                {"book_id": 2, "rank": 1, "reason": "适合这次阅读。", "evidence": ["invented"], "confidence": "medium"}
            ]
        }
        with self.assertRaisesRegex(RecommendationValidationError, "不可追溯"):
            validate_runtime_output(payload, candidates, 1)

    def test_runtime_receives_only_minimized_candidates(self):
        books = [book(2, "历史候选", ["历史"])]
        candidates = [
            {
                "book_id": 2,
                "score": 8.0,
                "allowed_evidence": ["topic:历史"],
                "evidence": ["topic:历史"],
                "reason": "符合主题。",
                "confidence": "medium",
            }
        ]
        output = {
            "items": [
                {"book_id": 2, "rank": 1, "reason": "符合你选择的历史主题。", "evidence": ["topic:历史"], "confidence": "medium"}
            ]
        }
        runtime = mock.Mock()
        runtime.generate.return_value = RuntimeResult(output=output, usage={})
        result = generate_with_runtime({}, books, candidates, {"signal_count": 1}, 1, "task", runtime=runtime)
        self.assertEqual(result[0]["book_id"], 2)
        request = runtime.generate.call_args.args[0]
        self.assertIn("历史候选", request.prompt)
        self.assertNotIn("完整阅读历史", request.prompt)


class RecommendationAPITest(test_main.TestWithUserLogin):
    def setUp(self):
        super().setUp()
        session = test_main.get_db()
        session.query(models.RecommendationEvent).delete()
        session.query(models.RecommendationFeedback).delete()
        session.query(models.RecommendationSnapshot).delete()
        session.query(models.RecommendationPreference).delete()
        session.commit()

    @staticmethod
    def _agent_result(_config, _books, candidates, _summary, count, task_id):
        del task_id
        return [
            {
                "book_id": item["book_id"],
                "rank": index + 1,
                "reason": "依据书库元数据生成的非剧透理由。",
                "evidence": item["allowed_evidence"][:1],
                "confidence": "medium",
            }
            for index, item in enumerate(candidates[:count])
        ]

    @mock.patch("webserver.handlers.recommendations.generate_with_runtime", side_effect=_agent_result)
    def test_get_recommendations_and_cache(self, runtime):
        response = self.json("/api/ai/recommendations?limit=4")
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["source"], "agent")
        self.assertFalse(response["cached"])
        self.assertEqual(len(response["books"]), 4)
        self.assertTrue(all(book["recommendation"]["reason"] for book in response["books"]))

        cached = self.json("/api/ai/recommendations?limit=4")
        self.assertTrue(cached["cached"])
        self.assertEqual(runtime.call_count, 1)

    @mock.patch(
        "webserver.handlers.recommendations.generate_with_runtime",
        side_effect=AgentRuntimeError(RuntimeErrorCode.UNAVAILABLE, "unavailable"),
    )
    def test_runtime_failure_is_explicit_deterministic_fallback(self, _runtime):
        response = self.json("/api/ai/recommendations?limit=3&refresh=1")
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["source"], "deterministic")
        self.assertTrue(response["fallback"])
        self.assertEqual(response["fallback_reason"], "runtime.unavailable")
        self.assertEqual(len(response["books"]), 3)

    def test_feedback_affects_next_result_and_can_be_undone(self):
        created = self.json(
            "/api/ai/recommendations/feedback",
            method="POST",
            headers={"Content-Type": "application/json"},
            body=json.dumps({"book_id": 1, "action": "not_interested"}),
        )
        self.assertEqual(created["err"], "ok")
        feedback_id = created["feedback"]["id"]
        with mock.patch(
            "webserver.handlers.recommendations.generate_with_runtime",
            side_effect=AgentRuntimeError(RuntimeErrorCode.UNAVAILABLE, "unavailable"),
        ):
            response = self.json("/api/ai/recommendations?limit=12&refresh=1")
        self.assertNotIn(1, [book["id"] for book in response["books"]])

        undone = self.json(f"/api/ai/recommendations/feedback/{feedback_id}", method="DELETE")
        self.assertEqual(undone["err"], "ok")
        self.assertFalse(test_main.get_db().get(models.RecommendationFeedback, feedback_id).active)

    def test_preferences_disable_behavioral_personalization(self):
        response = self.json(
            "/api/ai/recommendations/preferences",
            method="PATCH",
            headers={"Content-Type": "application/json"},
            body=json.dumps(
                {
                    "personalization_enabled": False,
                    "topics": ["历史"],
                    "length": "short",
                    "difficulty": "deep",
                    "seed_book_ids": [1],
                }
            ),
        )
        self.assertEqual(response["err"], "ok")
        self.assertFalse(response["preferences"]["personalization_enabled"])
        self.assertEqual(response["preferences"]["topics"], ["历史"])

    @mock.patch(
        "webserver.handlers.recommendations.generate_with_runtime",
        side_effect=AgentRuntimeError(RuntimeErrorCode.UNAVAILABLE, "unavailable"),
    )
    def test_private_book_acl_is_rechecked_before_response(self, _runtime):
        with mock.patch("webserver.handlers.base.BaseHandler.is_admin", return_value=False):
            with test_main.temporary_book_scope(2, "private", collector_id=999):
                response = self.json("/api/ai/recommendations?limit=12&refresh=1")
        self.assertNotIn(2, [book["id"] for book in response["books"]])

    def test_clear_feedback_is_user_private(self):
        session = test_main.get_db()
        session.add_all(
            [
                models.RecommendationFeedback(reader_id=1, book_id=1, action="read", active=True),
                models.RecommendationFeedback(reader_id=2, book_id=2, action="read", active=True),
            ]
        )
        session.commit()
        response = self.json("/api/ai/recommendations/feedback", method="DELETE")
        self.assertEqual(response["cleared"], 1)
        session = test_main.get_db()
        other = session.query(models.RecommendationFeedback).filter_by(reader_id=2).one()
        self.assertTrue(other.active)

    @mock.patch("webserver.handlers.recommendations.Recommendations._visible_books", return_value=[])
    def test_empty_library_is_not_reported_as_runtime_fallback(self, _visible_books):
        response = self.json("/api/ai/recommendations?refresh=1")
        self.assertEqual(response["err"], "ok")
        self.assertEqual(response["books"], [])
        self.assertFalse(response["fallback"])


if __name__ == "__main__":
    unittest.main()
