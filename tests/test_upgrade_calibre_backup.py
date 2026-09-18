"""Exercise the actual image's Calibre FTS tokenizer during offline backup validation."""

import sqlite3
import sys
from pathlib import Path

import pytest


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts/upgrade"))
import executor


def test_backup_validates_real_calibre_fts_with_isolated_configuration(tmp_path, monkeypatch):
    backend = pytest.importorskip("calibre.db.backend")
    books = tmp_path / "books"
    books.mkdir()
    database = books / "notes.db"
    connection = backend.Connection(str(database))
    connection.execute("CREATE VIRTUAL TABLE notes_fts USING fts5(text, tokenize='calibre')")
    connection.execute("INSERT INTO notes_fts(text) VALUES ('升级前的笔记')")
    connection.close()
    monkeypatch.setattr(executor, "ROOT", tmp_path)
    assert executor.backup_databases(tmp_path / "backup", books) == 1
    assert (tmp_path / "backup/inventory.json").is_file()
    # SQLite's standard reader can inspect the preserved application table; tokenization
    # itself is validated by the isolated Calibre checker used inside backup_databases.
    with sqlite3.connect(tmp_path / "backup/notes.db") as saved:
        assert saved.execute("SELECT count(*) FROM notes_fts_content").fetchone() == (1,)
