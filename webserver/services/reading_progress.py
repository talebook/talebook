"""Storage and file checks for conditional EPUB progress."""

import hashlib
import json
import os
import stat
import uuid
from dataclasses import dataclass

from sqlalchemy import text

from webserver.models import ProgressIdentity, ProgressReceipt, ReadingState


PROTOCOL = "talebook.reading-progress.v1"
POSITION_KIND = "epub_cfi"


def supports_conditional_progress(session):
    return session.get_bind().dialect.name == "sqlite"


def lock_progress_transaction(session):
    # Request authentication may already have queried using this session.
    # Start a fresh SQLite write transaction before taking any decision based on rows.
    if supports_conditional_progress(session):
        session.rollback()
        session.execute(text("BEGIN IMMEDIATE"))


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode("ascii")).hexdigest()


def instance_id(session, library_id):
    identity = session.get(ProgressIdentity, 1)
    if identity is None:
        identity = ProgressIdentity(id=1, value=uuid.uuid4().hex)
        session.add(identity)
    return digest([identity.value, library_id])


def account_id(reader):
    created = reader.create_time.isoformat() if reader.create_time else reader.username
    return digest([reader.id, created])


def progress_version(state):
    if state is None:
        return None
    updated = state.progress_update_time
    progress = state.get_progress()
    if updated is None and not progress:
        return None
    return digest([updated.isoformat() if updated else None, progress])


def save_progress(session, book_id, reader_id, progress):
    state = session.get(ReadingState, (book_id, reader_id))
    if state is None:
        state = ReadingState(book_id, reader_id)
        session.add(state)
    state.set_progress(progress)
    return state


def progress_snapshot(session, state, scope):
    version = progress_version(state)
    current = {"progress_version": version, "position": None, "preview_progress": None, "source": "empty"}
    if version is None:
        return current

    progress = state.get_progress()
    written_file = (
        session.query(ProgressReceipt.file_version)
        .filter_by(
            instance_id=scope["instance_id"],
            account_id=scope["account_id"],
            book_id=scope["book_id"],
            progress_version=version,
        )
        .filter(ProgressReceipt.file_version.is_not(None))
        .scalar()
    )
    if written_file == scope["file_version"]:
        current.update(source="conditional", position={"kind": POSITION_KIND, **progress})
    else:
        current.update(source="different_file" if written_file else "legacy", preview_progress=progress)
    return current


def file_stamp(info):
    return (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)


@dataclass(frozen=True)
class BookFingerprint:
    path: str
    stamp: tuple
    version: str

    @classmethod
    def read(cls, path):
        before = os.stat(path)
        if not stat.S_ISREG(before.st_mode):
            raise OSError("EPUB is not a regular file")
        path_stamp = file_stamp(before)
        with open(path, "rb") as book:
            opened_stamp = file_stamp(os.fstat(book.fileno()))
            # On Windows stat() and fstat() can report different ctime semantics.
            if path_stamp[:-1] != opened_stamp[:-1]:
                raise OSError("EPUB changed before hashing")
            version = "sha256:" + hashlib.file_digest(book, "sha256").hexdigest()
            if opened_stamp != file_stamp(os.fstat(book.fileno())):
                raise OSError("EPUB changed during hashing")
        return cls(path, path_stamp, version)

    def matches(self, path):
        try:
            return self.path == path and self.stamp == file_stamp(os.stat(path))
        except OSError:
            return False
