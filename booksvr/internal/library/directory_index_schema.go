package library

import (
	"database/sql"
	"fmt"
)

// This queue coalesces source writes in their original transaction. It stores
// only book IDs; directory indexing never copies source contents.
func migrateBookDirectoryIndex(db *sql.DB) error {
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS book_directory_meta(id INTEGER PRIMARY KEY CHECK(id=1),root TEXT,initialized INTEGER NOT NULL DEFAULT 0)`,
		`INSERT OR IGNORE INTO book_directory_meta(id) VALUES(1)`,
		`CREATE TABLE IF NOT EXISTS book_directory_dirty(book_id INTEGER PRIMARY KEY)`,
		`CREATE TABLE IF NOT EXISTS book_directory_locations(book_id INTEGER NOT NULL,format_key TEXT NOT NULL,directory TEXT NOT NULL,PRIMARY KEY(book_id,format_key))`,
		`CREATE INDEX IF NOT EXISTS book_directory_location_path ON book_directory_locations(directory,book_id)`,
		`CREATE TABLE IF NOT EXISTS book_directory_nodes(path TEXT PRIMARY KEY,parent TEXT NOT NULL,name TEXT NOT NULL,total_count INTEGER NOT NULL DEFAULT 0,direct_count INTEGER NOT NULL DEFAULT 0,nested_count INTEGER NOT NULL DEFAULT 0)`,
		`CREATE INDEX IF NOT EXISTS book_directory_node_parent ON book_directory_nodes(parent,path)`,
		`CREATE TABLE IF NOT EXISTS book_directory_members(node_id INTEGER NOT NULL,book_id INTEGER NOT NULL,direct INTEGER NOT NULL,nested INTEGER NOT NULL,PRIMARY KEY(node_id,book_id))`,
		`CREATE INDEX IF NOT EXISTS book_directory_member_book ON book_directory_members(book_id,node_id)`,
		`CREATE INDEX IF NOT EXISTS book_directory_member_direct ON book_directory_members(node_id,direct,book_id)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return err
		}
	}
	stmts = nil
	for _, name := range []string{"total_count", "direct_count", "nested_count"} {
		exists, err := columnExists(db, "book_directory_nodes", name)
		if err != nil {
			return err
		}
		if !exists {
			if _, err = db.Exec(`ALTER TABLE book_directory_nodes ADD COLUMN ` + name + ` INTEGER NOT NULL DEFAULT 0`); err != nil {
				return err
			}
			if _, err = db.Exec(`UPDATE book_directory_meta SET initialized=0 WHERE id=1`); err != nil {
				return err
			}
		}
	}
	stmts = append(stmts,
		`CREATE TRIGGER IF NOT EXISTS directory_member_insert AFTER INSERT ON book_directory_members BEGIN UPDATE book_directory_nodes SET total_count=total_count+1,direct_count=direct_count+NEW.direct,nested_count=nested_count+NEW.nested WHERE rowid=NEW.node_id; END`,
		`CREATE TRIGGER IF NOT EXISTS directory_member_delete AFTER DELETE ON book_directory_members BEGIN UPDATE book_directory_nodes SET total_count=total_count-1,direct_count=direct_count-OLD.direct,nested_count=nested_count-OLD.nested WHERE rowid=OLD.node_id; END`)
	type trigger struct{ name, event, table, condition, body string }
	mark := func(id string) string {
		return `INSERT INTO book_directory_dirty(book_id) SELECT ` + id + ` WHERE NOT EXISTS(SELECT 1 FROM book_directory_dirty WHERE book_id=` + id + `);`
	}
	triggers := []trigger{
		{"format_insert", "INSERT", "book_formats", "", mark("NEW.book_id")},
		{"format_delete", "DELETE", "book_formats", "", mark("OLD.book_id")},
		{"format_update", "UPDATE OF path,book_id,format", "book_formats", "", mark("OLD.book_id") + mark("NEW.book_id")},
		{"book_delete", "DELETE", "books", "", mark("OLD.id")},
		{"book_path", "UPDATE OF path", "books", "WHEN OLD.path IS NOT NEW.path", mark("NEW.id")},
	}
	stateMark := func(ref string) string {
		return `INSERT INTO book_directory_dirty(book_id) SELECT f.book_id FROM book_formats f WHERE f.id=` + ref + `.format_id AND NOT EXISTS(SELECT 1 FROM book_directory_dirty d WHERE d.book_id=f.book_id);`
	}
	triggers = append(triggers,
		trigger{"missing_insert", "INSERT", "source_sync_formats", "", stateMark("NEW")},
		trigger{"missing_delete", "DELETE", "source_sync_formats", "", stateMark("OLD")},
		trigger{"missing_update", "UPDATE OF missing,format_id", "source_sync_formats", "WHEN OLD.missing IS NOT NEW.missing OR OLD.format_id IS NOT NEW.format_id", stateMark("OLD") + stateMark("NEW")})
	var hasData int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='data'`).Scan(&hasData); err != nil {
		return err
	}
	if hasData > 0 {
		stmts = append(stmts, `CREATE INDEX IF NOT EXISTS book_directory_data_book ON data(book)`)
		triggers = append(triggers,
			trigger{"data_insert", "INSERT", "data", "", mark("NEW.book")},
			trigger{"data_delete", "DELETE", "data", "", mark("OLD.book")},
			trigger{"data_update", "UPDATE OF book,name,format", "data", "", mark("OLD.book") + mark("NEW.book")})
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			return fmt.Errorf("directory index migration: %w", err)
		}
	}
	// Upgrade outdated source triggers atomically; concurrent imports never
	// observe a gap. WHERE NOT EXISTS avoids inherited outer UPSERT conflicts.
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`UPDATE book_directory_meta SET initialized=initialized WHERE id=1`); err != nil {
		return err
	}
	for _, t := range triggers {
		name := "directory_" + t.name
		definition := fmt.Sprintf(`CREATE TRIGGER %s AFTER %s ON %s %s BEGIN %s END`, name, t.event, t.table, t.condition, t.body)
		var old string
		err = tx.QueryRow(`SELECT sql FROM sqlite_master WHERE type='trigger' AND name=?`, name).Scan(&old)
		if err != nil && err != sql.ErrNoRows {
			return err
		}
		if old == definition {
			continue
		}
		if _, err = tx.Exec(`DROP TRIGGER IF EXISTS ` + name); err != nil {
			return err
		}
		if _, err = tx.Exec(definition); err != nil {
			return err
		}
	}
	return tx.Commit()
}
