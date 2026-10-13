package library

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// openTestDB returns an in-memory SQLite database with a minimal `books` table
// that mimics the Calibre-derived schema Talebook relies on.
func openTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	// Minimal pre-existing schema: the new migration must extend it, not
	// replace it.
	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY,
		title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '',
		path TEXT NOT NULL DEFAULT '',
		timestamp TEXT
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	return db
}

func TestMigrateCreatesTables(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	for _, table := range []string{"works", "book_formats"} {
		if !tableExists(t, db, table) {
			t.Errorf("table %q was not created", table)
		}
	}
}

func TestMigrateAddsBookColumns(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	for _, col := range []string{"work_id", "edition_key", "title_norm", "author_norm"} {
		if !testColumnExists(t, db, "books", col) {
			t.Errorf("books.%s was not added", col)
		}
	}
}

func TestMigrateCreatesIndexes(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	for _, idx := range []string{
		"idx_works_title_norm",
		"idx_works_author_norm",
		"idx_books_work_id",
		"idx_books_edition_key",
	} {
		if !indexExists(t, db, idx) {
			t.Errorf("index %q was not created", idx)
		}
	}
}

func TestMigrateIsIdempotent(t *testing.T) {
	db := openTestDB(t)
	for i := 1; i <= 3; i++ {
		if err := Migrate(db); err != nil {
			t.Fatalf("Migrate run %d: %v", i, err)
		}
	}
	// The schema must still be intact after repeated runs.
	for _, table := range []string{"works", "book_formats"} {
		if !tableExists(t, db, table) {
			t.Errorf("table %q missing after repeated Migrate", table)
		}
	}
}

func TestMigrateWorkKeyUnique(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	insert := `INSERT INTO works (title_norm, author_norm, work_key, display_title, display_author, created_at, updated_at)
	           VALUES (?, ?, ?, ?, ?, 0, 0)`
	if _, err := db.Exec(insert, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣"); err != nil {
		t.Fatalf("first insert: %v", err)
	}
	if _, err := db.Exec(insert, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣"); err == nil {
		t.Error("duplicate work_key should violate the UNIQUE constraint")
	}
}

func TestMigrateBookFormatsUnique(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books (id, title) VALUES (1, '三体')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}

	insert := `INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (?, ?, ?, ?, ?)`
	if _, err := db.Exec(insert, 1, "EPUB", "/books/三体.epub", 100, 0); err != nil {
		t.Fatalf("first format insert: %v", err)
	}
	if _, err := db.Exec(insert, 1, "EPUB", "/books/三体2.epub", 200, 0); err == nil {
		t.Error("duplicate (book_id, format) should violate the UNIQUE constraint")
	}
}

func TestMigrateBookFormatsCascade(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	if _, err := db.Exec(`PRAGMA foreign_keys = ON`); err != nil {
		t.Fatalf("enable fk: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books (id, title) VALUES (1, '三体')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'EPUB', '/x.epub', 1, 0)`); err != nil {
		t.Fatalf("insert format: %v", err)
	}
	if _, err := db.Exec(`DELETE FROM books WHERE id = 1`); err != nil {
		t.Fatalf("delete book: %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM book_formats`).Scan(&n); err != nil {
		t.Fatalf("count formats: %v", err)
	}
	if n != 0 {
		t.Errorf("ON DELETE CASCADE did not remove formats, %d remain", n)
	}
}

// --- helpers ---

func tableExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var n int
	err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?`, name).Scan(&n)
	if err != nil {
		t.Fatalf("tableExists(%s): %v", name, err)
	}
	return n > 0
}

func indexExists(t *testing.T, db *sql.DB, name string) bool {
	t.Helper()
	var n int
	err := db.QueryRow(`SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?`, name).Scan(&n)
	if err != nil {
		t.Fatalf("indexExists(%s): %v", name, err)
	}
	return n > 0
}

// columnExists is provided by schema.go; the test only needs a t-aware wrapper.
func testColumnExists(t *testing.T, db *sql.DB, table, column string) bool {
	t.Helper()
	ok, err := columnExists(db, table, column)
	if err != nil {
		t.Fatalf("columnExists(%s.%s): %v", table, column, err)
	}
	return ok
}
