package library

import (
	"database/sql"
	"fmt"
	"strings"
)

// Category counters avoid reaggregating every book link on each page. Updates
// are O(log links), including duplicate-link fixtures, and never recount a
// popular category while importing another book.
func migrateBrowseCounts(db *sql.DB) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.Exec(`CREATE TABLE IF NOT EXISTS book_browse_counts(kind TEXT NOT NULL,item TEXT NOT NULL,n INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(kind,item))`); err != nil {
		return err
	}
	if _, err = tx.Exec(`CREATE TABLE IF NOT EXISTS book_browse_count_state(kind TEXT PRIMARY KEY)`); err != nil {
		return err
	}
	for kind, s := range categorySpecs {
		var initialized int
		if err = tx.QueryRow(`SELECT count(*) FROM book_browse_count_state WHERE kind=?`, kind).Scan(&initialized); err != nil {
			return err
		}
		var exists int
		if err = tx.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?`, s.linkTable).Scan(&exists); err != nil {
			return err
		}
		if exists == 0 {
			continue
		}
		change := func(prefix string, delta int) string {
			ref := prefix + "." + s.linkItemCol
			guard := fmt.Sprintf("NOT EXISTS(SELECT 1 FROM %s WHERE book=%s.book AND %s=%s)", s.linkTable, prefix, s.linkItemCol, ref)
			if delta > 0 {
				guard = fmt.Sprintf("(SELECT COUNT(*) FROM %s WHERE book=%s.book AND %s=%s)=1", s.linkTable, prefix, s.linkItemCol, ref)
			}
			return fmt.Sprintf(`INSERT INTO book_browse_counts(kind,item,n) SELECT '%s',CAST(%s AS TEXT),0 WHERE %s IS NOT NULL AND NOT EXISTS(SELECT 1 FROM book_browse_counts WHERE kind='%s' AND item=CAST(%s AS TEXT)); UPDATE book_browse_counts SET n=MAX(0,n+(%d)) WHERE kind='%s' AND item=CAST(%s AS TEXT) AND %s AND %s.book IS NOT NULL;`, kind, ref, ref, kind, ref, delta, kind, ref, guard, prefix)
		}
		for _, event := range []string{"INSERT", "DELETE", "UPDATE"} {
			body := ""
			spec := event
			when := ""
			if event != "INSERT" {
				body += change("OLD", -1)
			}
			if event != "DELETE" {
				body += change("NEW", 1)
			}
			if event == "UPDATE" {
				spec += " OF book," + s.linkItemCol
				when = fmt.Sprintf(" WHEN OLD.book IS NOT NEW.book OR OLD.%s IS NOT NEW.%s", s.linkItemCol, s.linkItemCol)
			}
			stmt := fmt.Sprintf("CREATE TRIGGER IF NOT EXISTS browse_count_%s_%s AFTER %s ON %s%s BEGIN %s END", kind, strings.ToLower(event), spec, s.linkTable, when, body)
			if _, err = tx.Exec(stmt); err != nil {
				return err
			}
		}
		if initialized == 0 {
			if _, err = tx.Exec(fmt.Sprintf("INSERT INTO book_browse_counts(kind,item,n) SELECT '%s',CAST(%s AS TEXT),COUNT(DISTINCT book) FROM %s WHERE %s IS NOT NULL GROUP BY %s", kind, s.linkItemCol, s.linkTable, s.linkItemCol, s.linkItemCol)); err != nil {
				return err
			}
			if _, err = tx.Exec(`INSERT INTO book_browse_count_state(kind) VALUES(?)`, kind); err != nil {
				return err
			}
		}
	}
	for kind, s := range categorySpecs {
		var exists int
		if err = tx.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?`, s.itemTable).Scan(&exists); err != nil {
			return err
		}
		if exists == 0 {
			continue
		}
		stmt := fmt.Sprintf(`CREATE TRIGGER IF NOT EXISTS browse_count_%s_new_item AFTER INSERT ON %s BEGIN INSERT INTO book_browse_counts(kind,item,n) SELECT '%s',CAST(NEW.id AS TEXT),0 WHERE NOT EXISTS(SELECT 1 FROM book_browse_counts WHERE kind='%s' AND item=CAST(NEW.id AS TEXT)); END`, kind, s.itemTable, kind, kind)
		if _, err = tx.Exec(stmt); err != nil {
			return err
		}
		var ranked int
		if err = tx.QueryRow(`SELECT count(*) FROM book_browse_count_state WHERE kind=?`, "ranked-"+kind).Scan(&ranked); err != nil {
			return err
		}
		if ranked == 0 {
			if _, err = tx.Exec(fmt.Sprintf(`INSERT INTO book_browse_counts(kind,item,n) SELECT '%s',CAST(i.id AS TEXT),0 FROM %s i WHERE NOT EXISTS(SELECT 1 FROM book_browse_counts WHERE kind='%s' AND item=CAST(i.id AS TEXT))`, kind, s.itemTable, kind)); err != nil {
				return err
			}
			if _, err = tx.Exec(`INSERT INTO book_browse_count_state(kind) VALUES(?)`, "ranked-"+kind); err != nil {
				return err
			}
		}

	}
	if _, err = tx.Exec(`CREATE INDEX IF NOT EXISTS book_browse_counts_rank ON book_browse_counts(kind,n DESC)`); err != nil {
		return err
	}
	var hasData int
	if err = tx.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='data'`).Scan(&hasData); err != nil {
		return err
	}
	if hasData > 0 {
		var initialized int
		if err = tx.QueryRow(`SELECT count(*) FROM book_browse_count_state WHERE kind='formats'`).Scan(&initialized); err != nil {
			return err
		}
		change := func(prefix string, delta int) string {
			return fmt.Sprintf(`INSERT INTO book_browse_counts(kind,item,n) SELECT 'formats',%s.format,0 WHERE %s.format IS NOT NULL AND NOT EXISTS(SELECT 1 FROM book_browse_counts WHERE kind='formats' AND item=%s.format); UPDATE book_browse_counts SET n=MAX(0,n+(%d)) WHERE kind='formats' AND item=%s.format;`, prefix, prefix, prefix, delta, prefix)
		}
		for _, event := range []string{"INSERT", "DELETE", "UPDATE"} {
			body := ""
			spec := event
			when := ""
			if event != "INSERT" {
				body += change("OLD", -1)
			}
			if event != "DELETE" {
				body += change("NEW", 1)
			}
			if event == "UPDATE" {
				spec += " OF format"
				when = " WHEN OLD.format IS NOT NEW.format"
			}
			stmt := fmt.Sprintf("CREATE TRIGGER IF NOT EXISTS browse_count_formats_%s AFTER %s ON data%s BEGIN %s END", strings.ToLower(event), spec, when, body)
			if _, err = tx.Exec(stmt); err != nil {
				return err
			}
		}
		if initialized == 0 {
			if _, err = tx.Exec(`INSERT INTO book_browse_counts(kind,item,n) SELECT 'formats',format,COUNT(*) FROM data WHERE format IS NOT NULL GROUP BY format`); err != nil {
				return err
			}
			if _, err = tx.Exec(`INSERT INTO book_browse_count_state(kind) VALUES('formats')`); err != nil {
				return err
			}
		}
	}
	return tx.Commit()
}
