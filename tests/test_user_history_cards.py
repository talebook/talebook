import contextlib
import copy
from unittest import mock

from tests import test_main as harness
from webserver.models import Reader


def setUpModule():
    harness.setUpModule()


@contextlib.contextmanager
def history_records(reader_id, records):
    session = harness.get_db()
    reader = session.get(Reader, reader_id)
    previous = copy.deepcopy(reader.extra)
    reader.extra = records
    session.commit()
    try:
        yield
    finally:
        reader.extra = previous
        session.commit()


class TestUserHistoryCards(harness.TestWithUserLogin):
    def test_current_introduction_is_added_without_modifying_saved_history(self):
        record = {"id": 1, "title": "原历史书名", "timestamp": 123}
        with history_records(1, {"read_history": [record]}):
            first = self.json("/api/user/info?detail=1")["user"]["extra"]["read_history"][0]
            expected = self.get_app().settings["legacy"].get_data_as_dict(ids=[1])[0]["comments"]
            self.assertEqual(first["comments"], expected)
            self.assertEqual(first["title"], record["title"])
            self.assertEqual(first["timestamp"], record["timestamp"])
            updated = dict(self.get_app().settings["legacy"].get_data_as_dict(ids=[1])[0], comments="更新后的当前简介")
            with mock.patch.object(self.get_app().settings["legacy"], "get_data_as_dict", return_value=[updated]):
                second = self.json("/api/user/info?detail=1")["user"]["extra"]["read_history"][0]
                self.assertEqual(second["comments"], "更新后的当前简介")
            session = harness.get_db()
            session.expire_all()
            self.assertEqual(session.get(Reader, 1).extra["read_history"], [record])

    def test_history_keeps_order_and_omits_missing_books(self):
        records = [{"id": bid, "title": str(bid), "timestamp": bid} for bid in [2, 999999, 1]]
        with history_records(1, {"visit_history": records}):
            result = self.json("/api/user/info?detail=1")["user"]["extra"]["visit_history"]
            self.assertEqual([book["id"] for book in result], [2, 1])
            self.assertTrue(all("comments" in book for book in result))

    def test_hidden_private_book_is_not_enriched_or_returned(self):
        with history_records(1, {"read_history": [{"id": 1, "title": "私藏", "timestamp": 1}]}):
            with harness.temporary_book_scope(1, "private", collector_id=2), mock.patch.object(
                harness.BaseHandler, "is_admin", return_value=False
            ):
                result = self.json("/api/user/info?detail=1")["user"]["extra"]["read_history"]
                self.assertEqual(result, [])

    def test_owner_can_still_see_private_book_introduction(self):
        with history_records(1, {"read_history": [{"id": 1, "title": "私藏", "timestamp": 1}]}):
            with harness.temporary_book_scope(1, "private", collector_id=1), mock.patch.object(
                harness.BaseHandler, "is_admin", return_value=False
            ):
                result = self.json("/api/user/info?detail=1")["user"]["extra"]["read_history"]
                self.assertEqual(result[0]["id"], 1)
                self.assertIn("comments", result[0])

    def test_guest_and_other_reader_do_not_inherit_history(self):
        with history_records(1, {"read_history": [{"id": 1, "title": "读者一", "timestamp": 1}]}):
            with mock.patch.object(harness.BaseHandler, "user_id", return_value=None):
                self.assertEqual(self.json("/api/user/info?detail=1")["user"]["extra"], {})
            with mock.patch.object(harness.BaseHandler, "user_id", return_value=2):
                result = self.json("/api/user/info?detail=1")["user"]["extra"]
                self.assertNotIn("读者一", [book["title"] for book in result.get("read_history", [])])
