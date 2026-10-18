// Package library owns the booksvr storage layer: the work / edition / format
// three-layer model backed by SQLite.
//
// Package boundaries (must not be broken):
//   - library does not depend on HTTP
//   - library owns all SQL; httpapi must not write SQL directly
package library

import (
	"database/sql"
	"fmt"
)

// Migrate brings the database up to the booksvr schema.
//
// It is additive and idempotent: the pre-existing Calibre-derived `books` table
// is extended with new columns rather than replaced, so `books.id` keeps its
// meaning (one book == one edition) and the 215 existing HTTP routes stay
// compatible.
//
// Layers:
//
//  1. works        — the work layer (normalized title + author)
//  2. books        — the edition layer (reused, extended with 4 columns)
//  3. book_formats — the format layer (absolute paths, no copying)
func Migrate(db *sql.DB) error {
	stmts := []string{
		// --- Layer 1: works -------------------------------------------------
		`CREATE TABLE IF NOT EXISTS works (
			id             INTEGER PRIMARY KEY,
			title_norm     TEXT NOT NULL,
			author_norm    TEXT NOT NULL,
			work_key       TEXT NOT NULL UNIQUE,
			display_title  TEXT NOT NULL,
			display_author TEXT NOT NULL,
			created_at     INTEGER NOT NULL,
			updated_at     INTEGER NOT NULL
		)`,
		`CREATE INDEX IF NOT EXISTS idx_works_title_norm  ON works(title_norm)`,
		`CREATE INDEX IF NOT EXISTS idx_works_author_norm ON works(author_norm)`,

		// --- Layer 3: book_formats ------------------------------------------
		`CREATE TABLE IF NOT EXISTS book_formats (
			id      INTEGER PRIMARY KEY,
			book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
			format  TEXT NOT NULL,
			path    TEXT NOT NULL,
			size    INTEGER NOT NULL,
			mtime   INTEGER NOT NULL,
			hash    TEXT,
			UNIQUE(book_id, format)
		)`,
		`CREATE INDEX IF NOT EXISTS idx_book_formats_book_id ON book_formats(book_id)`,
	}

	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}

	// --- Layer 2: extend books ---------------------------------------------
	// SQLite has no "ADD COLUMN IF NOT EXISTS", so each column is added only
	// when absent. This keeps Migrate idempotent.
	columns := []struct {
		name string
		ddl  string
	}{
		{"work_id", `ALTER TABLE books ADD COLUMN work_id INTEGER REFERENCES works(id)`},
		{"edition_key", `ALTER TABLE books ADD COLUMN edition_key TEXT`},
		{"title_norm", `ALTER TABLE books ADD COLUMN title_norm TEXT`},
		{"author_norm", `ALTER TABLE books ADD COLUMN author_norm TEXT`},
	}
	for _, col := range columns {
		exists, err := columnExists(db, "books", col.name)
		if err != nil {
			return fmt.Errorf("migrate: check books.%s: %w", col.name, err)
		}
		if exists {
			continue
		}
		if _, err := db.Exec(col.ddl); err != nil {
			return fmt.Errorf("migrate: add books.%s: %w", col.name, err)
		}
	}

	indexes := []string{
		// Import duplicate checks compare the exact title for every source file.
		`CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)`,
		`CREATE INDEX IF NOT EXISTS idx_books_work_id     ON books(work_id)`,
		`CREATE INDEX IF NOT EXISTS idx_books_edition_key ON books(work_id, edition_key)`,
	}
	for _, stmt := range indexes {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("migrate: %w", err)
		}
	}

	if err := migrateSourceSync(db); err != nil {
		return err
	}
	if err := MigrateBrowseIndexes(db); err != nil {
		return err
	}
	if err := migrateBrowseAvailability(db); err != nil {
		return err
	}
	if err := migrateBrowseCounts(db); err != nil {
		return err
	}
	if err := migrateBrowseFormats(db); err != nil {
		return err
	}
	return migrateBookDirectoryIndex(db)
}

// columnExists reports whether the named column is present on the table.
func columnExists(db *sql.DB, table, column string) (bool, error) {
	// The table name is a compile-time constant at every call site, so the
	// interpolation below cannot be influenced by user input.
	rows, err := db.Query(`PRAGMA table_info(` + table + `)`)
	if err != nil {
		return false, err
	}
	defer rows.Close()

	for rows.Next() {
		var (
			cid       int
			name      string
			ctype     string
			notnull   int
			dfltValue sql.NullString
			pk        int
		)
		if err := rows.Scan(&cid, &name, &ctype, &notnull, &dfltValue, &pk); err != nil {
			return false, err
		}
		if name == column {
			return true, nil
		}
	}
	return false, rows.Err()
}
