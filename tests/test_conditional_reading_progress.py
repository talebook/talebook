import asyncio
import datetime
import hashlib
import json
import re
import shutil
import time
import uuid
import zipfile
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path
from tempfile import TemporaryDirectory
from threading import Barrier, RLock
from unittest.mock import patch

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from tornado.httpclient import AsyncHTTPClient, HTTPRequest
from tornado.httpserver import HTTPServer
from tornado.netutil import bind_sockets
from tornado.testing import AsyncHTTPTestCase, gen_test
from tornado.web import Application, create_signed_value

from webserver.handlers.reading_progress import routes
from webserver.handlers.user import UserInfo
from webserver.handlers.user import routes as user_routes
from webserver.models import Base, Item, ProgressIdentity, ProgressReceipt, Reader, ReadingState, user_syncdb
from webserver.services.reading_progress import BookFingerprint


CAPABILITY = "/api/reading-progress/conditional"
BOOK = "/api/book/1/progress/conditional/EPUB"
LEGACY = "/api/book/1/progress"
USER_INFO = "/api/user/info"
EARLY = "epubcfi(/6/4!/4/2/2)"
LATE = "epubcfi(/6/8!/4/2/4)"
SECRET = "a test-only cookie signing key"


class Library:
    """Adapter for the Calibre boundary using a real EPUB fixture on disk."""

    library_id = "library-one"

    def __init__(self, path):
        self.path = path
        self.read_lock = RLock()
        self.new_api = self
        self.exists = True

    def has_id(self, book_id):
        return self.exists and book_id == 1

    def format_abspath(self, book_id, book_format):
        return str(self.path) if self.has_id(book_id) and book_format == "EPUB" else None

    def get_data_as_dict(self, ids):
        return [{"id": bid, "fmt_epub": str(self.path)} for bid in ids if self.has_id(bid)]


class TestConditionalReadingProgress(AsyncHTTPTestCase):
    def setUp(self):
        temp = self.enterContext(TemporaryDirectory())
        path = Path(temp) / "read.epub"
        shutil.copyfile(Path(__file__).parent / "cases" / "old.epub", path)
        self.library = Library(path)
        self.db_url = f"sqlite:///{Path(temp, 'users.db').as_posix()}"
        self.engine = create_engine(self.db_url)
        self.addCleanup(self.engine.dispose)
        self.sessions = sessionmaker(bind=self.engine)
        user_syncdb(self.engine)
        with self.sessions.begin() as session:
            session.add_all(
                [
                    Reader(id=1, username="reader_one", create_time=datetime.datetime(2026, 1, 1)),
                    Reader(id=2, username="reader_two", create_time=datetime.datetime(2026, 1, 2)),
                ]
            )
        self.enterContext(patch.dict("webserver.handlers.base.CONF", {"installed": True, "INVITE_MODE": False}))
        super().setUp()

    def get_app(self, sessions=None):
        return Application(
            routes() + user_routes(),
            SessionMaker=sessions or self.sessions,
            legacy=self.library,
            build_time=None,
            default_cover=None,
            cookie_secret=SECRET,
        )

    def headers(self, reader=1, expired=False, **extra):
        if reader is None:
            return extra
        login_time = int(time.time()) - (8 * 86400 if expired else 0)
        cookies = {
            name: create_signed_value(SECRET, name, str(value)).decode()
            for name, value in (("user_id", reader), ("lt", login_time))
        }
        return {"Cookie": "; ".join(f"{name}={value}" for name, value in cookies.items()), **extra}

    def fetch_json(self, path=BOOK, data=None, reader=1, expired=False, **headers):
        response = self.fetch(
            path,
            method="POST" if data is not None else "GET",
            body=json.dumps(data) if data is not None else None,
            headers=self.headers(reader, expired, **headers),
        )
        assert response.code == 200, response.body
        return json.loads(response.body)

    def write(self, scope, cfi=EARLY, **extra):
        return {
            **{key: scope[key] for key in ("instance_id", "account_id", "file_version")},
            "expected_progress_version": scope["current"]["progress_version"],
            "write_id": str(uuid.uuid4()),
            "operation": "save",
            "position": {"kind": "epub_cfi", "cfi": cfi, "percentage": 24.5},
            **extra,
        }

    @contextmanager
    def second_worker(self, engine):
        ready = Barrier(2, timeout=8)
        sockets = bind_sockets(0, "127.0.0.1")
        port = sockets[0].getsockname()[1]
        app = self.get_app(sessionmaker(bind=engine))

        async def serve():
            try:
                self.worker_loop = asyncio.get_running_loop()
                self.worker_stop = asyncio.Event()
                server = HTTPServer(app)
                server.add_sockets(sockets)
                ready.wait()
                await self.worker_stop.wait()
                server.stop()
                await server.close_all_connections()
            finally:
                for socket in sockets:
                    socket.close()

        with ThreadPoolExecutor(max_workers=1) as pool:
            running = pool.submit(asyncio.run, serve())
            ready.wait()
            try:
                yield f"http://127.0.0.1:{port}"
            finally:
                self.worker_loop.call_soon_threadsafe(self.worker_stop.set)
                running.result(timeout=8)

    async def compete(self, left_path, left, right_path, right):
        # Both SQL connections reach BEGIN before either can obtain the writer lock.
        second_engine = create_engine(self.db_url)
        begun = Barrier(2, timeout=8)

        def synchronize(_conn, _cursor, statement, *_args):
            if statement == "BEGIN IMMEDIATE":
                begun.wait()

        event.listen(self.engine, "before_cursor_execute", synchronize)
        event.listen(second_engine, "before_cursor_execute", synchronize)
        try:
            with self.second_worker(second_engine) as worker:
                requests = [
                    HTTPRequest(url, method="POST", headers=self.headers(), body=json.dumps(payload))
                    for url, payload in (
                        (self.get_url(left_path), left),
                        (worker + right_path, right),
                    )
                ]
                client = AsyncHTTPClient()
                responses = await asyncio.gather(*(client.fetch(request) for request in requests))
                return [json.loads(response.body) for response in responses]
        finally:
            event.remove(self.engine, "before_cursor_execute", synchronize)
            second_engine.dispose()

    def user_info(self, **session):
        with patch.object(UserInfo, "get_sys_info", return_value={"books": 1}):
            info = self.fetch_json(USER_INFO, **session)
            detail = self.fetch_json(USER_INFO + "?detail=1", **session)
        assert info["err"] == detail["err"] == "ok"
        assert info["sys"] == {"books": 1} and detail["sys"] == {}
        return info["user"], detail["user"]

    def test_user_info_identifies_the_current_reader_in_both_responses(self):
        ordinary, detailed = self.user_info()
        assert ordinary["is_login"] is detailed["is_login"] is True
        reader_id = ordinary["id"]
        assert re.fullmatch(r"[0-9a-f]{64}", reader_id)
        assert detailed["id"] == reader_id
        assert self.fetch_json(CAPABILITY)["account_id"] != reader_id

        other, other_detail = self.user_info(reader=2)
        assert other["is_login"] is other_detail["is_login"] is True
        assert other["id"] == other_detail["id"] != reader_id

        with self.sessions.begin() as session:
            session.get(Reader, 1).name = "New nickname"
        ordinary, detailed = self.user_info()
        assert ordinary["nickname"] == detailed["nickname"] == "New nickname"
        assert ordinary["id"] == detailed["id"] == reader_id

    def test_user_info_omits_id_for_guests_and_expired_sessions(self):
        for session in ({"reader": None}, {"expired": True}):
            for user in self.user_info(**session):
                assert user["is_login"] is False
                assert "id" not in user

    def test_user_info_changes_when_a_reader_primary_key_is_reused(self):
        former, _ = self.user_info(reader=2)
        with self.sessions.begin() as session:
            session.delete(session.get(Reader, 2))
        with self.sessions.begin() as session:
            session.add(Reader(id=2, username="reader_two", create_time=datetime.datetime(2026, 1, 3)))
        current, _ = self.user_info(reader=2)
        assert current["id"] != former["id"]

    def test_legacy_reader_without_creation_time_still_has_a_stable_id(self):
        with self.sessions.begin() as session:
            session.get(Reader, 1).create_time = None

        ordinary, detailed = self.user_info()
        assert ordinary["id"] == detailed["id"]
        assert re.fullmatch(r"[0-9a-f]{64}", ordinary["id"])
        assert ordinary["create_time"] == ""

    def test_demo_user_info_preserves_conditional_progress_restrictions(self):
        with patch.dict("webserver.handlers.base.CONF", {"DEMO_MODE": True, "DEMO_USERNAME": "reader_one"}):
            ordinary, detailed = self.user_info()
            assert ordinary["is_admin"] is detailed["is_admin"] is True
            assert ordinary["id"] == detailed["id"]
            assert self.fetch_json(CAPABILITY)["err"] == "user.need_login"

            for user in self.user_info(reader=2):
                assert user["is_login"] is False
                assert "id" not in user

    def test_capability_aliases_and_restart(self):
        capability = self.fetch_json(CAPABILITY)
        response = self.fetch(CAPABILITY, headers=self.headers())
        assert response.headers["Cache-Control"] == "private, no-store"
        assert capability["protocol"] == "talebook.reading-progress.v1"
        assert capability["formats"] == {"EPUB": {"file_version": "sha256", "position": "epub_cfi"}}
        assert self.fetch_json(CAPABILITY, reader=2)["account_id"] != capability["account_id"]
        assert self.fetch_json(CAPABILITY, reader=None)["err"] == "user.need_login"
        scope = self.fetch_json()
        assert scope["current"]["progress_version"] is None
        stored = self.fetch_json(data=self.write(scope))["current"]
        alias = self.fetch_json(**{"X-Forwarded-Host": "public.example.test"})
        assert alias["current"] == stored
        assert alias["instance_id"] == capability["instance_id"]
        self.engine.dispose()
        assert self.fetch_json(CAPABILITY)["instance_id"] == capability["instance_id"]
        assert self.fetch_json()["current"] == stored
        self.library.library_id = "library-two"
        assert self.fetch_json(CAPABILITY)["instance_id"] != capability["instance_id"]

    @gen_test(timeout=18)
    async def test_two_workers_compete_for_empty_progress_and_saved_progress(self):
        async def snapshot():
            response = await AsyncHTTPClient().fetch(self.get_url(BOOK), headers=self.headers())
            return json.loads(response.body)

        for target in (EARLY, LATE):
            scope = await snapshot()
            requests = [self.write(scope, target), self.write(scope, EARLY if target == LATE else LATE)]
            results = await self.compete(BOOK, requests[0], BOOK, requests[1])
            winner = next(reply for reply in results if reply["err"] == "ok")
            loser = next(reply for reply in results if reply["err"] == "progress.version_conflict")
            assert winner["current"] == loser["current"] == (await snapshot())["current"]
            assert "receipt" not in loser

    @gen_test(timeout=18)
    async def test_legacy_and_conditional_writers_use_same_transaction_lock(self):
        response = await AsyncHTTPClient().fetch(self.get_url(BOOK), headers=self.headers())
        scope = json.loads(response.body)
        old = {"progress": {"cfi": LATE}}
        conditional, legacy = await self.compete(BOOK, self.write(scope), LEGACY, old)
        assert legacy["err"] == "ok"
        assert conditional["err"] in {"ok", "progress.version_conflict"}
        response = await AsyncHTTPClient().fetch(self.get_url(BOOK), headers=self.headers())
        current = json.loads(response.body)["current"]
        assert current["source"] == "legacy" and current["preview_progress"] == old["progress"]
        assert current["position"] is None

    @gen_test(timeout=18)
    async def test_two_workers_retry_the_same_write(self):
        response = await AsyncHTTPClient().fetch(self.get_url(BOOK), headers=self.headers())
        request = self.write(json.loads(response.body))
        replies = await self.compete(BOOK, request, BOOK, request)
        assert {reply["err"] for reply in replies} == {"ok"}
        assert {reply["receipt"]["replayed"] for reply in replies} == {True, False}
        assert replies[0]["current"] == replies[1]["current"]
        with self.sessions() as session:
            assert session.query(ProgressReceipt).count() == 1

    def test_legacy_same_position_still_invalidates_expected_version(self):
        old = {"progress": {"cfi": LATE}}
        assert self.fetch_json(LEGACY, old)["progress"] == old["progress"]
        before = self.fetch_json()
        assert self.fetch_json(LEGACY, old)["err"] == "ok"
        conflict = self.fetch_json(data=self.write(before))
        assert conflict["err"] == "progress.version_conflict"
        assert conflict["current"]["progress_version"] != before["current"]["progress_version"]

    def test_replay_and_keep_never_overwrite_newer_position(self):
        first = self.write(self.fetch_json(), LATE)
        first_reply = self.fetch_json(data=first)
        second = self.write(first_reply)
        second_reply = self.fetch_json(data=second)
        self.engine.dispose()
        replay = self.fetch_json(data=first)
        assert replay["current"] == second_reply["current"]
        assert replay["receipt"] == {**first_reply["receipt"], "replayed": True}
        assert self.fetch_json(data={**first, "position": second["position"]})["err"] == "progress.write_id_reused"

        keep = self.write(first_reply, operation="keep")
        del keep["position"]
        stale = self.fetch_json(data=keep)
        assert stale["err"] == "progress.version_conflict"
        keep["expected_progress_version"] = stale["current"]["progress_version"]
        keep["write_id"] = str(uuid.uuid4())
        accepted = self.fetch_json(data=keep)
        assert accepted["err"] == "ok" and accepted["current"] == second_reply["current"]
        assert self.fetch_json(data=keep)["receipt"]["replayed"] is True
        assert self.fetch_json(LEGACY)["progress"] == {"cfi": EARLY, "percentage": 24.5}

    def test_rejects_expired_account_changed_instance_revoked_access_and_deleted_book(self):
        request = self.write(self.fetch_json())
        assert self.fetch_json(data=request, expired=True)["err"] == "user.need_login"
        assert self.fetch_json(data=request, reader=2)["err"] == "progress.account_mismatch"
        assert self.fetch_json(data={**request, "instance_id": "0" * 64})["err"] == "progress.instance_mismatch"
        with self.sessions.begin() as session:
            session.get(Reader, 1).permission = "R"
        assert self.fetch_json(data=request)["err"] == "user.no_permission"
        with self.sessions.begin() as session:
            session.get(Reader, 1).permission = ""
            item = Item()
            item.book_id = 1
            item.scope = "private"
            item.collector_id = 2
            session.add(item)
        assert self.fetch_json(data=request)["err"] == "params.book.invalid"
        with self.sessions.begin() as session:
            session.get(Item, 1).scope = "public"
        self.library.exists = False
        assert self.fetch_json(data=request)["err"] == "params.book.invalid"
        with self.sessions() as session:
            assert session.query(ProgressReceipt).count() == session.query(ReadingState).count() == 0

    def test_epub_byte_fingerprint_and_format_degradation(self):
        scope = self.fetch_json()
        assert scope["file_version"] == "sha256:" + hashlib.sha256(self.library.path.read_bytes()).hexdigest()
        request = self.write(scope)
        self.fetch_json(data=request)
        with zipfile.ZipFile(self.library.path, "a") as epub:
            epub.comment = b"changed EPUB bytes"
        changed = self.fetch_json(data=request)
        assert changed["err"] == "progress.file_version_changed"
        assert changed["file_version"] != scope["file_version"]
        assert changed["current"]["source"] == "different_file"
        assert changed["current"]["position"] is None
        assert self.fetch_json(BOOK.replace("EPUB", "PDF"))["err"] == "progress.unsupported_format"
        self.library.path.unlink()
        assert self.fetch_json()["err"] == "progress.file_unavailable"

    def test_revocation_during_file_preflight_is_rechecked_in_transaction(self):
        request = self.write(self.fetch_json())
        read = BookFingerprint.read

        def read_after_revocation(path):
            with self.sessions.begin() as session:
                session.get(Reader, 1).permission = "R"
            return read(path)

        with patch.object(BookFingerprint, "read", side_effect=read_after_revocation):
            assert self.fetch_json(data=request)["err"] == "user.no_permission"
        with self.sessions() as session:
            assert session.query(ProgressReceipt).count() == session.query(ReadingState).count() == 0

    def test_sqlite_upgrade_and_downgrade_compatible_storage(self):
        ProgressReceipt.__table__.drop(self.engine)
        ProgressIdentity.__table__.drop(self.engine)
        assert self.fetch_json(CAPABILITY)["err"] == "progress.unavailable"
        assert self.fetch_json(LEGACY, {"progress": {"cfi": EARLY}})["err"] == "ok"
        user_syncdb(self.engine)
        scope = self.fetch_json()
        assert scope["current"]["source"] == "legacy"
        assert self.fetch_json(data=self.write(scope, LATE))["err"] == "ok"
        assert self.fetch_json(LEGACY)["progress"] == {"cfi": LATE, "percentage": 24.5}
        # An old binary ignores the additive tables. Re-running syncdb preserves them.
        user_syncdb(self.engine)
        assert self.fetch_json()["current"]["position"]["cfi"] == LATE
        assert {name for name in Base.metadata.tables if name.startswith("reading_progress_")} == {
            "reading_progress_identity",
            "reading_progress_receipts",
        }
