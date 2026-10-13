package library

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// 错误路径与边界覆盖。

func TestMigrateFailsOnClosedDB(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = db.Close()

	if err := Migrate(db); err == nil {
		t.Error("Migrate on a closed database should return an error")
	}
}

func TestMigrateFailsWhenBooksMissing(t *testing.T) {
	// book_formats references books(id); without a books table the CREATE
	// still succeeds in SQLite, but the ALTER TABLE must fail.
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	if err := Migrate(db); err == nil {
		t.Error("Migrate without a books table should return an error")
	}
}

func TestColumnExistsOnMissingTable(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()

	// PRAGMA table_info on a non-existent table yields no rows, so the
	// function reports false rather than erroring.
	ok, err := columnExists(db, "no_such_table", "whatever")
	if err != nil {
		t.Fatalf("columnExists: %v", err)
	}
	if ok {
		t.Error("columnExists should be false for a missing table")
	}
}

func TestColumnExistsOnClosedDB(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = db.Close()

	if _, err := columnExists(db, "books", "id"); err == nil {
		t.Error("columnExists on a closed database should return an error")
	}
}

func TestMigrateAddsColumnsOnlyOnce(t *testing.T) {
	db := openTestDB(t)
	if err := Migrate(db); err != nil {
		t.Fatalf("first Migrate: %v", err)
	}
	// Capture the column count, run Migrate again, and assert it is unchanged.
	before := countColumns(t, db, "books")
	if err := Migrate(db); err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
	after := countColumns(t, db, "books")
	if before != after {
		t.Errorf("column count changed across Migrate runs: %d -> %d", before, after)
	}
}

func countColumns(t *testing.T, db *sql.DB, table string) int {
	t.Helper()
	rows, err := db.Query(`PRAGMA table_info(` + table + `)`)
	if err != nil {
		t.Fatalf("table_info: %v", err)
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		n++
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("rows: %v", err)
	}
	return n
}
