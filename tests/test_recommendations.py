import contextlib
import datetime
from types import SimpleNamespace
from unittest import mock

import pytest

from tests import test_main as harness
from webserver.handlers.base import BaseHandler
from webserver.handlers.book import CONF
from webserver.models import ReadingState
from webserver.services.recommendations import rank_book_ids, recent_book_ids, recommend_book_ids


NOW = datetime.datetime(2026, 10, 1, tzinfo=datetime.timezone.utc)


def setUpModule():
    harness.setUpModule()


def book(bid, **kwargs):
    return dict(id=bid, **kwargs)


def state(bid, **kwargs):
    values = dict(book_id=bid, favorite=0, wants=0, read_state=0, progress={}, online_read=0)
    values.update(kwargs)
    return SimpleNamespace(**values)


def rank(books, states=(), count=12):
    return rank_book_ids(books, states, count, now=NOW)


def test_favorite_author_beats_unrelated_popular_book():
    books = [
        book(1, authors=["刘慈欣"]),
        book(2, authors=["刘慈欣"]),
        book(3, authors=["其他作者"], rating=10, count_visit=10**9, count_download=10**9),
    ]
    assert rank(books, [state(1, favorite=1, read_state=2)])[0] == 2


@pytest.mark.parametrize("field,value", [("tags", ["科幻"]), ("series", "地海")])
def test_content_affinity(field, value):
    books = [book(1, **{field: value}), book(2, **{field: value}), book(3, rating=10)]
    assert rank(books, [state(1, read_state=2)])[0] == 2


def test_explicit_favorite_is_stronger_than_reading():
    books = [book(1, authors=["甲"]), book(2, authors=["乙"]), book(3, authors=["甲"]), book(4, authors=["乙"])]
    assert rank(books, [state(1, favorite=1, read_state=2), state(2, read_state=2)])[0] == 3


def test_recent_interest_is_stronger_than_old_interest():
    books = [book(1, authors=["甲"]), book(2, authors=["乙"]), book(3, authors=["甲"]), book(4, authors=["乙"])]
    states = [state(1, read_state=2, read_date=NOW - datetime.timedelta(days=720)), state(2, read_state=2, read_date=NOW)]
    assert rank(books, states)[0] == 4


@pytest.mark.parametrize("kwargs", [{"read_state": 1}, {"read_state": 2}, {"progress": {"percentage": 1}}])
def test_started_and_finished_books_are_excluded(kwargs):
    assert rank([book(1, rating=10), book(2)], [state(1, **kwargs)]) == [2]


def test_unread_favorites_and_wants_remain_candidates():
    assert rank([book(1), book(2), book(3)], [state(1, favorite=1), state(2, wants=1)]) == [1, 2, 3]


def test_cold_start_uses_rating_popularity_and_recency():
    assert rank([book(1, rating=10), book(2, rating=8, count_visit=30), book(3)]) == [1, 2, 3]
    assert rank([book(1), book(2, count_visit=20)]) == [2, 1]
    assert rank([book(1, timestamp=NOW), book(2, timestamp=NOW - datetime.timedelta(days=300))]) == [1, 2]


def test_unknown_authors_do_not_create_false_affinity():
    assert (
        rank([book(1, authors=["Unknown"]), book(2, authors=[" unknown "]), book(3, rating=8)], [state(1, read_state=2)])[0]
        == 3
    )


def test_matching_is_case_and_whitespace_insensitive():
    assert (
        rank(
            [book(1, authors=[" Ursula Le Guin "]), book(2, authors=["ursula le guin"]), book(3, rating=10)],
            [state(1, read_state=2)],
        )[0]
        == 2
    )


def test_authors_and_series_are_diversified_without_dropping_books():
    books = [
        book(1, authors=["甲"], series="系列甲", rating=10),
        book(2, authors=["甲"], series="系列甲", rating=10),
        book(3, authors=["乙"], rating=9),
    ]
    assert rank(books) == [2, 3, 1]


def test_ranking_is_stable_independent_of_candidate_order():
    books = [book(1), book(2), book(3)]
    assert rank(books) == rank(list(reversed(books))) == [3, 2, 1]


def test_large_recommendation_count_remains_supported():
    books = [book(bid, authors=[str(bid % 25)], rating=bid % 11) for bid in range(1000)]
    result = rank(books, count=768)
    assert len(result) == len(set(result)) == 768


def test_an_author_cannot_crowd_all_alternatives_out_of_the_candidate_pool():
    books = [book(bid, authors=["甲"], rating=10) for bid in range(200)]
    books.append(book(200, authors=["乙"], rating=9))
    assert rank(books, count=12)[1] == 200


def test_missing_metadata_and_stale_states_are_safe():
    assert rank([book(1), book(2, authors=None, tags=None, rating=None)], [state(99, favorite=1)]) == [2, 1]


@pytest.mark.parametrize("count", [0, -1])
def test_disabled_or_negative_count_is_empty(count):
    assert rank([book(1)], count=count) == []
    cache, session = mock.Mock(), mock.Mock()
    assert recommend_book_ids(cache, session, 1, [1], count) == []
    cache.all_field_for.assert_not_called()
    session.query.assert_not_called()


def test_empty_library_and_all_read_never_backfill_read_books():
    assert rank([]) == []
    assert rank([book(1)], [state(1, read_state=2)]) == []
    assert rank([book(1)], count=20) == [1]


def test_recent_uses_timestamp_instead_of_id_and_has_no_hundred_book_cap():
    cache = mock.Mock()
    cache.all_field_for.return_value = {1: NOW, 500: NOW - datetime.timedelta(days=1)}
    assert recent_book_ids(cache, [1, 500], 1) == [1]
    cache.all_field_for.return_value = {bid: NOW for bid in range(250)}
    assert len(recent_book_ids(cache, list(range(250)), 200)) == 200


@contextlib.contextmanager
def reading_state(bid, reader_id=1, **kwargs):
    session = harness.get_db()
    row = session.get(ReadingState, (bid, reader_id))
    created = row is None
    if created:
        row = ReadingState(bid, reader_id)
        session.add(row)
    previous = {key: getattr(row, key) for key in kwargs}
    for key, value in kwargs.items():
        setattr(row, key, value)
    session.commit()
    try:
        yield
    finally:
        session = harness.get_db()
        row = session.get(ReadingState, (bid, reader_id))
        if created:
            session.delete(row)
        else:
            for key, value in previous.items():
                setattr(row, key, value)
        session.commit()


class TestRecommendationIndex(harness.TestApp):
    def setUp(self):
        super().setUp()
        user_patch = mock.patch.object(BaseHandler, "user_id", return_value=1)
        admin_patch = mock.patch.object(BaseHandler, "is_admin", return_value=False)
        self.user = user_patch.start()
        self.admin = admin_patch.start()
        self.addCleanup(user_patch.stop)
        self.addCleanup(admin_patch.stop)

    def test_current_reader_state_is_used_but_another_readers_is_not(self):
        with reading_state(1, read_state=2), reading_state(2, reader_id=2, read_state=2):
            result = self.json("/api/index?random=200&recent=0")
            ids = [b["id"] for b in result["random_books"]]
            self.assertNotIn(1, ids)
            self.assertIn(2, ids)
            self.assertEqual(result["random_books_count"], len(ids))

    def test_guest_does_not_inherit_personal_reading_states(self):
        self.user.return_value = None
        with reading_state(1, read_state=2):
            result = self.json("/api/index?random=200")
            self.assertIn(1, [b["id"] for b in result["random_books"]])

    def test_private_book_and_its_seed_are_hidden_from_non_owner(self):
        cache = self.get_app().settings["legacy"].new_api
        with harness.temporary_book_scope(1, "private", collector_id=2), reading_state(1, favorite=1):
            with mock.patch.object(cache, "all_field_for", wraps=cache.all_field_for) as fields:
                result = self.json("/api/index")
                for call in fields.call_args_list:
                    self.assertNotIn(1, call.args[1])
            self.assertNotIn(1, [b["id"] for b in result["random_books"] + result["new_books"]])

    def test_guest_cannot_see_private_book(self):
        self.user.return_value = None
        with harness.temporary_book_scope(1, "private", collector_id=1):
            result = self.json("/api/index?random=200&recent=200")
            self.assertNotIn(1, [b["id"] for b in result["random_books"] + result["new_books"]])

    def test_owner_and_admin_can_see_private_book(self):
        with harness.temporary_book_scope(1, "private", collector_id=1):
            result = self.json("/api/index?random=200&recent=200")
            self.assertIn(1, [b["id"] for b in result["new_books"]])
            self.admin.return_value = True
            self.user.return_value = 2
            result = self.json("/api/index?random=200&recent=200")
            self.assertIn(1, [b["id"] for b in result["new_books"]])

    def test_ranking_order_survives_full_book_loading(self):
        with mock.patch("webserver.handlers.book.recommend_book_ids", return_value=[2, 1]):
            result = self.json("/api/index?recent=0")
            self.assertEqual([b["id"] for b in result["random_books"]], [2, 1])
            self.assertIn("state", result["random_books"][0])

    def test_batch_cache_reads_and_deterministic_response(self):
        cache = self.get_app().settings["legacy"].new_api
        with mock.patch.object(cache, "all_field_for", wraps=cache.all_field_for) as fields:
            first = self.json("/api/index")
            self.assertEqual(fields.call_count, 6)
        second = self.json("/api/index")
        self.assertEqual(first, second)

    def test_disabled_and_invalid_counts(self):
        with mock.patch.dict(CONF, {"MAIN_PAGE_RANDOM_COUNT": 0}):
            result = self.json("/api/index?random=20&recent=-1")
            self.assertEqual(result["random_books"], [])
            self.assertEqual(result["new_books"], [])
            self.assertFalse(result["recommendations_enabled"])
            self.assertGreater(result["visible_books_count"], 0)
        self.assertEqual(self.json("/api/index?random=invalid")["err"], "params.invalid")
        result = self.json("/api/index?random=-1&recent=0")
        self.assertEqual(result["random_books"], [])

    def test_limits_and_real_empty_library(self):
        with mock.patch.dict(CONF, {"MAIN_PAGE_RANDOM_COUNT": 2}):
            result = self.json("/api/index?random=999")
            self.assertEqual(len(result["random_books"]), 2)
        cache = self.get_app().settings["legacy"].new_api
        with mock.patch.object(cache, "search", return_value=set()):
            result = self.json("/api/index")
            self.assertEqual(result["visible_books_count"], 0)
            self.assertEqual(result["random_books"], [])
            self.assertEqual(result["new_books"], [])

    def test_existing_768_book_setting_is_not_clamped_to_200(self):
        with mock.patch.dict(CONF, {"MAIN_PAGE_RANDOM_COUNT": 768}):
            with mock.patch("webserver.handlers.book.recommend_book_ids", return_value=[1]) as recommend:
                self.json("/api/index?random=999&recent=0")
                self.assertEqual(recommend.call_args.args[-1], 768)

    def test_all_read_returns_empty_recommendations_with_library_count(self):
        ids = list(self.get_app().settings["legacy"].new_api.all_book_ids())
        with contextlib.ExitStack() as stack:
            for bid in ids:
                stack.enter_context(reading_state(bid, read_state=2))
            result = self.json("/api/index")
            self.assertEqual(result["random_books"], [])
            self.assertGreater(result["visible_books_count"], 0)
            self.assertGreater(len(result["new_books"]), 0)


def test_opening_without_reading_progress_does_not_exclude_a_book():
    assert rank([book(1)], [state(1, online_read=1)]) == [1]
