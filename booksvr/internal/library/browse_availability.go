package library

import (
	"database/sql"
	"fmt"
	"strings"
)

// Unavailability is a derived index, never a deletion decision. The source
// synchronizer alone confirms missing files and protects disconnected mounts.
func migrateBrowseAvailability(db *sql.DB) error {
	var n int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('books','book_formats','data','source_sync_formats')`).Scan(&n); err != nil {
		return err
	}
	if n != 4 {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, sql := range []string{`CREATE TABLE IF NOT EXISTS book_unavailable_sources(book_id INTEGER PRIMARY KEY)`, `CREATE TABLE IF NOT EXISTS book_browse_state(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL)`} {
		if _, err = tx.Exec(sql); err != nil {
			return err
		}
	}
	recompute := func(expr string) string {
		return `DELETE FROM book_unavailable_sources WHERE book_id IN (` + expr + `);
  INSERT INTO book_unavailable_sources(book_id) SELECT b.id FROM books b WHERE b.id IN (` + expr + `) AND EXISTS(SELECT 1 FROM book_formats f WHERE f.book_id=b.id)
  AND NOT EXISTS(SELECT 1 FROM book_formats f LEFT JOIN source_sync_formats s ON s.format_id=f.id WHERE f.book_id=b.id AND COALESCE(s.missing,0)<>1)
  AND NOT EXISTS(SELECT 1 FROM data d WHERE d.book=b.id AND NOT EXISTS(SELECT 1 FROM book_formats f WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format)))
  AND NOT EXISTS(SELECT 1 FROM book_unavailable_sources u WHERE u.book_id=b.id);`
	}
	for _, table := range []string{"book_formats", "data", "source_sync_formats"} {
		for _, event := range []string{"INSERT", "UPDATE", "DELETE"} {
			rowExpr := func(prefix string) string {
				if table == "data" {
					return "SELECT " + prefix + ".book"
				}
				if table == "book_formats" {
					return "SELECT " + prefix + ".book_id"
				}
				return "SELECT book_id FROM book_formats WHERE id=" + prefix + ".format_id"
			}
			expr := ""
			if event != "DELETE" {
				expr = rowExpr("NEW")
			}
			if event != "INSERT" {
				if expr != "" {
					expr += " UNION "
				}
				expr += rowExpr("OLD")
			}
			spec := event
			when := ""
			if event == "UPDATE" {
				if table == "source_sync_formats" {
					spec += " OF missing,format_id"
					when = " WHEN OLD.missing IS NOT NEW.missing OR OLD.format_id IS NOT NEW.format_id"
				} else if table == "data" {
					spec += " OF book,format"
				} else {
					spec += " OF book_id,format"
				}
			}
			name := "browse_availability_" + table + "_" + strings.ToLower(event)
			sql := "CREATE TRIGGER IF NOT EXISTS " + name + " AFTER " + spec + " ON " + table + when + " BEGIN " + recompute(expr) + " END"
			if _, err = tx.Exec(sql); err != nil {
				return fmt.Errorf("availability trigger: %w", err)
			}
		}
	}
	if _, err = tx.Exec(`CREATE TRIGGER IF NOT EXISTS browse_availability_book_insert AFTER INSERT ON books BEGIN ` + recompute(`SELECT NEW.id`) + ` END`); err != nil {
		return err
	}
	if _, err = tx.Exec(`CREATE TRIGGER IF NOT EXISTS browse_availability_book_delete AFTER DELETE ON books BEGIN DELETE FROM book_unavailable_sources WHERE book_id=OLD.id; END`); err != nil {
		return err
	}
	var initialized int
	if err = tx.QueryRow(`SELECT count(*) FROM book_browse_state WHERE id=1 AND version>=1`).Scan(&initialized); err != nil {
		return err
	}
	if initialized == 0 {
		_, err = tx.Exec(`INSERT INTO book_unavailable_sources(book_id) SELECT f.book_id FROM source_sync_formats s JOIN book_formats f ON f.id=s.format_id JOIN books b ON b.id=f.book_id WHERE s.missing=1 GROUP BY f.book_id HAVING COUNT(*)=(SELECT COUNT(*) FROM book_formats other WHERE other.book_id=f.book_id) AND NOT EXISTS (SELECT 1 FROM data d WHERE d.book=f.book_id AND NOT EXISTS (SELECT 1 FROM book_formats other WHERE other.book_id=d.book AND UPPER(other.format)=UPPER(d.format)))`)
		if err != nil {
			return err
		}
		if _, err = tx.Exec(`INSERT INTO book_browse_state(id,version) VALUES(1,1)`); err != nil {
			return err
		}
	}
	return tx.Commit()
}
