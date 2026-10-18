package library

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// The format index stores only catalog membership and ranking. It does not
// inspect files or decide whether a mount is healthy.
func migrateBrowseFormats(db *sql.DB) error {
	var tables int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('books','data','book_formats','source_sync_formats')`).Scan(&tables); err != nil {
		return err
	}
	if tables != 4 {
		return nil
	}
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, stmt := range []string{
		`CREATE TABLE IF NOT EXISTS book_browse_formats(format TEXT NOT NULL,book_id INTEGER NOT NULL,rating INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(format,book_id))`,
		`CREATE INDEX IF NOT EXISTS book_browse_formats_book ON book_browse_formats(book_id,format)`,
		`CREATE TABLE IF NOT EXISTS book_browse_format_counts(format TEXT PRIMARY KEY,n INTEGER NOT NULL DEFAULT 0)`,
		`CREATE TABLE IF NOT EXISTS book_browse_format_state(id INTEGER PRIMARY KEY CHECK(id=1),has_ratings INTEGER NOT NULL DEFAULT 0)`,
	} {
		if _, err = tx.Exec(stmt); err != nil {
			return err
		}
	}
	var ratingTables int
	if err = tx.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name IN ('ratings','books_ratings_link')`).Scan(&ratingTables); err != nil {
		return err
	}
	rating := `0`
	if ratingTables == 2 {
		rating = `COALESCE((SELECT MAX(r.rating) FROM books_ratings_link l JOIN ratings r ON r.id=l.rating WHERE l.book=b.id),0)`
	}
	selectFormats := func(expr string) string {
		return `SELECT UPPER(d.format),b.id,` + rating + ` FROM books b JOIN data d ON d.book=b.id WHERE b.id IN (` + expr + `) AND d.format IS NOT NULL AND NOT EXISTS(SELECT 1 FROM book_formats f CROSS JOIN source_sync_formats s ON s.format_id=f.id WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format) AND s.missing=1) GROUP BY b.id,UPPER(d.format)`
	}
	var initialized, hasRatings int
	err = tx.QueryRow(`SELECT 1,has_ratings FROM book_browse_format_state WHERE id=1`).Scan(&initialized, &hasRatings)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	if initialized == 0 {
		if _, err = tx.Exec(`INSERT INTO book_browse_formats(format,book_id,rating) ` + selectFormats(`SELECT id FROM books`)); err != nil {
			return err
		}
		if _, err = tx.Exec(`INSERT INTO book_browse_format_counts(format,n) SELECT format,COUNT(*) FROM book_browse_formats GROUP BY format`); err != nil {
			return err
		}
		if ratingTables == 2 {
			hasRatings = 1
		}
		if _, err = tx.Exec(`INSERT INTO book_browse_format_state(id,has_ratings) VALUES(1,?)`, hasRatings); err != nil {
			return err
		}
	} else if ratingTables == 2 && hasRatings == 0 {
		if _, err = tx.Exec(`UPDATE book_browse_formats SET rating=COALESCE((SELECT MAX(r.rating) FROM books_ratings_link l JOIN ratings r ON r.id=l.rating WHERE l.book=book_browse_formats.book_id),0)`); err != nil {
			return err
		}
		if _, err = tx.Exec(`UPDATE book_browse_format_state SET has_ratings=1 WHERE id=1`); err != nil {
			return err
		}
	}
	if _, err = tx.Exec(`CREATE INDEX IF NOT EXISTS book_browse_formats_rank ON book_browse_formats(format,rating DESC,book_id DESC)`); err != nil {
		return err
	}
	createTrigger := func(stmt string) error {
		fields := strings.Fields(stmt)
		name := fields[5]
		if _, e := tx.Exec("DROP TRIGGER IF EXISTS " + name); e != nil {
			return e
		}
		_, e := tx.Exec(stmt)
		return e
	}
	// Guarded INSERT works under an outer UPSERT as well as an ordinary INSERT.
	for _, stmt := range []string{
		`CREATE TRIGGER IF NOT EXISTS browse_format_count_insert AFTER INSERT ON book_browse_formats BEGIN INSERT INTO book_browse_format_counts(format,n) SELECT NEW.format,0 WHERE NOT EXISTS(SELECT 1 FROM book_browse_format_counts WHERE format=NEW.format); UPDATE book_browse_format_counts SET n=n+1 WHERE format=NEW.format; END`,
		`CREATE TRIGGER IF NOT EXISTS browse_format_count_delete AFTER DELETE ON book_browse_formats BEGIN UPDATE book_browse_format_counts SET n=MAX(0,n-1) WHERE format=OLD.format; END`,
	} {
		if err = createTrigger(stmt); err != nil {
			return err
		}
	}
	recompute := func(expr string) string {
		return `DELETE FROM book_browse_formats WHERE book_id IN (` + expr + `); INSERT INTO book_browse_formats(format,book_id,rating) ` + selectFormats(expr) + `;`
	}
	for _, table := range []string{"books", "data", "book_formats", "source_sync_formats"} {
		for _, event := range []string{"INSERT", "DELETE", "UPDATE"} {
			if table == "books" && event == "UPDATE" {
				continue
			}
			row := func(prefix string) string {
				switch table {
				case "books":
					return "SELECT " + prefix + ".id"
				case "data":
					return "SELECT " + prefix + ".book"
				case "book_formats":
					return "SELECT " + prefix + ".book_id"
				default:
					return "SELECT book_id FROM book_formats WHERE id=" + prefix + ".format_id"
				}
			}
			expr := ""
			if event != "DELETE" {
				expr = row("NEW")
			}
			if event != "INSERT" {
				if expr != "" {
					expr += " UNION "
				}
				expr += row("OLD")
			}
			spec := event
			when := ""
			if table == "source_sync_formats" {
				if event == "INSERT" {
					when = " WHEN NEW.missing=1"
				} else if event == "DELETE" {
					when = " WHEN OLD.missing=1"
				} else {
					spec += " OF missing,format_id"
					when = " WHEN OLD.missing IS NOT NEW.missing OR OLD.format_id IS NOT NEW.format_id"
				}
			} else if event == "UPDATE" {
				if table == "data" {
					spec += " OF book,format"
					when = " WHEN OLD.book IS NOT NEW.book OR OLD.format IS NOT NEW.format"
				} else {
					spec += " OF book_id,format"
					when = " WHEN OLD.book_id IS NOT NEW.book_id OR OLD.format IS NOT NEW.format"
				}
			}
			stmt := fmt.Sprintf("CREATE TRIGGER IF NOT EXISTS browse_format_%s_%s AFTER %s ON %s%s BEGIN %s END", table, strings.ToLower(event), spec, table, when, recompute(expr))
			if err = createTrigger(stmt); err != nil {
				return err
			}
		}
	}
	if ratingTables == 2 {
		update := func(expr string) string {
			return `UPDATE book_browse_formats SET rating=COALESCE((SELECT MAX(r.rating) FROM books_ratings_link l JOIN ratings r ON r.id=l.rating WHERE l.book=book_browse_formats.book_id),0) WHERE book_id IN (` + expr + `);`
		}
		for _, table := range []string{"ratings", "books_ratings_link"} {
			for _, event := range []string{"INSERT", "DELETE", "UPDATE"} {
				row := func(prefix string) string {
					if table == "ratings" {
						return "SELECT book FROM books_ratings_link WHERE rating=" + prefix + ".id"
					}
					return "SELECT " + prefix + ".book"
				}
				expr := ""
				if event != "DELETE" {
					expr = row("NEW")
				}
				if event != "INSERT" {
					if expr != "" {
						expr += " UNION "
					}
					expr += row("OLD")
				}
				spec := event
				when := ""
				if event == "UPDATE" {
					if table == "ratings" {
						spec += " OF id,rating"
						when = " WHEN OLD.id IS NOT NEW.id OR OLD.rating IS NOT NEW.rating"
					} else {
						spec += " OF book,rating"
						when = " WHEN OLD.book IS NOT NEW.book OR OLD.rating IS NOT NEW.rating"
					}
				}
				stmt := fmt.Sprintf("CREATE TRIGGER IF NOT EXISTS browse_format_rating_%s_%s AFTER %s ON %s%s BEGIN %s END", table, strings.ToLower(event), spec, table, when, update(expr))
				if err = createTrigger(stmt); err != nil {
					return err
				}
			}
		}
	}
	return tx.Commit()
}

func browseSimpleFormat(q BrowseQuery) bool {
	if (!q.FormatFilter && (q.Format == "" || q.Format == "全部")) || q.Category != "" || q.Candidates != nil {
		return false
	}
	for _, v := range q.Filters {
		if v != "" && v != "全部" {
			return false
		}
	}
	return true
}

func browseFormatPage(ctx context.Context, db *sql.DB, q BrowseQuery) ([]int64, int, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	var total int
	if err = tx.QueryRowContext(ctx, `SELECT COALESCE((SELECT n FROM book_browse_format_counts WHERE format=UPPER(?)),0)`, q.Format).Scan(&total); err != nil {
		return nil, 0, err
	}
	excluded := []int64{}
	for id, hidden := range q.Excluded {
		if hidden {
			excluded = append(excluded, id)
		}
	}
	args := []any{q.Format}
	where := `format=UPPER(?)`
	if len(excluded) > 0 {
		raw := jsonIDs(excluded)
		var hidden int
		if err = tx.QueryRowContext(ctx, `SELECT COUNT(*) FROM book_browse_formats WHERE format=UPPER(?) AND book_id IN (SELECT value FROM json_each(?))`, q.Format, raw).Scan(&hidden); err != nil {
			return nil, 0, err
		}
		total -= hidden
		where += ` AND book_id NOT IN (SELECT value FROM json_each(?))`
		args = append(args, raw)
	}
	if q.Start < 0 {
		q.Start = 0
	}
	if q.Size < 1 {
		q.Size = 1
	}
	ids := []int64{}
	if q.Start < total {
		order := `book_id DESC`
		if q.RatingSort {
			order = `rating DESC,book_id DESC`
		}
		args = append(args, q.Size, q.Start)
		rows, e := tx.QueryContext(ctx, `SELECT book_id FROM book_browse_formats WHERE `+where+` ORDER BY `+order+` LIMIT ? OFFSET ?`, args...)
		if e != nil {
			return nil, 0, e
		}
		for rows.Next() {
			var id int64
			if e = rows.Scan(&id); e != nil {
				rows.Close()
				return nil, 0, e
			}
			ids = append(ids, id)
		}
		e = rows.Err()
		rows.Close()
		if e != nil {
			return nil, 0, e
		}
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, err
	}
	return ids, total, nil
}
