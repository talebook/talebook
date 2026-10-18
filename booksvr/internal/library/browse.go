package library

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

// BrowseQuery keeps filtering, visibility and paging in SQLite. Candidates is
// optional; a non-nil empty slice deliberately matches no books.
type BrowseQuery struct {
	Filters      map[string]string
	Category     string
	Names        []string
	Format       string
	FormatFilter bool // true for literal category names, including empty or 全部
	Excluded     map[int64]bool
	Candidates   []int64
	RatingSort   bool
	Start, Size  int
}

func jsonIDs(ids []int64) string {
	if ids == nil {
		ids = []int64{}
	}
	b, _ := json.Marshal(ids)
	return string(b)
}

func (q BrowseQuery) where(ctx context.Context, db *sql.DB) (string, []any, error) {
	parts := []string{"1=1"}
	args := []any{}
	if q.Candidates != nil {
		parts = append(parts, "b.id IN (SELECT value FROM json_each(?))")
		args = append(args, jsonIDs(q.Candidates))
	}
	if len(q.Excluded) > 0 {
		ids := []int64{}
		for id, excluded := range q.Excluded {
			if excluded {
				ids = append(ids, id)
			}
		}
		parts = append(parts, "b.id NOT IN (SELECT value FROM json_each(?))")
		args = append(args, jsonIDs(ids))
	}
	var sources int
	if err := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='source_sync_formats'").Scan(&sources); err != nil {
		return "", nil, err
	}
	if sources > 0 {
		var indexed int
		if err := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_unavailable_sources'").Scan(&indexed); err != nil {
			return "", nil, err
		}
		if indexed > 0 {
			parts = append(parts, "b.id NOT IN (SELECT book_id FROM book_unavailable_sources)")
		} else {
			// Start at the missing index, never enumerate all book IDs in the handler.
			parts = append(parts, `b.id NOT IN (SELECT f.book_id FROM source_sync_formats s JOIN book_formats f ON f.id=s.format_id WHERE s.missing=1 GROUP BY f.book_id HAVING COUNT(*)=(SELECT COUNT(*) FROM book_formats other WHERE other.book_id=f.book_id) AND NOT EXISTS (SELECT 1 FROM data d WHERE d.book=f.book_id AND NOT EXISTS (SELECT 1 FROM book_formats other WHERE other.book_id=d.book AND UPPER(other.format)=UPPER(d.format))))`)
		}
	}
	for _, field := range []string{"publisher", "author", "tag"} {
		value := q.Filters[field]
		if value == "" || value == "全部" {
			continue
		}
		spec := categorySpecs[field+"s"]
		parts = append(parts, fmt.Sprintf("b.id IN (SELECT l.book FROM %s l JOIN %s i ON i.id=l.%s WHERE i.name LIKE ?)", spec.linkTable, spec.itemTable, spec.linkItemCol))
		args = append(args, "%"+value+"%")
	}
	if q.Category != "" {
		spec, ok := categorySpecs[q.Category]
		if !ok {
			parts = append(parts, "0=1")
		} else {
			names, _ := json.Marshal(q.Names)
			expr := "i." + spec.nameExpr
			if q.Category == "ratings" {
				expr = "CAST(i.rating AS TEXT)"
			}
			parts = append(parts, fmt.Sprintf("b.id IN (SELECT l.book FROM %s l JOIN %s i ON i.id=l.%s WHERE %s IN (SELECT value FROM json_each(?)))", spec.linkTable, spec.itemTable, spec.linkItemCol, expr))
			args = append(args, string(names))
		}
	}
	if q.FormatFilter || (q.Format != "" && q.Format != "全部") {
		var indexed int
		if err := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_browse_formats'").Scan(&indexed); err != nil {
			return "", nil, err
		}
		if indexed > 0 {
			parts = append(parts, `b.id IN (SELECT book_id FROM book_browse_formats WHERE format=UPPER(?))`)
			args = append(args, q.Format)
		} else {
			cond := `b.id IN (SELECT d.book FROM data d WHERE UPPER(d.format)=UPPER(?)`
			if sources > 0 {
				cond += ` AND NOT EXISTS (SELECT 1 FROM book_formats f CROSS JOIN source_sync_formats s ON s.format_id=f.id WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format) AND s.missing=1)`
			}
			parts = append(parts, cond+")")
			args = append(args, q.Format)
		}
	}
	return strings.Join(parts, " AND "), args, nil
}

// BrowseBooks returns only one page of IDs and the exact filtered count from
// one read transaction. No read transaction is held while formatting cards.
func BrowseBooks(ctx context.Context, db *sql.DB, q BrowseQuery) ([]int64, int, error) {
	if browseSimpleFormat(q) {
		var indexed int
		if err := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_browse_formats'").Scan(&indexed); err != nil {
			return nil, 0, err
		}
		if indexed > 0 {
			return browseFormatPage(ctx, db, q)
		}
	}
	where, args, err := q.where(ctx, db)
	if err != nil {
		return nil, 0, err
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	var total int
	countSQL := "SELECT count(*) FROM books b WHERE " + where
	countArgs := args
	unfiltered := !q.FormatFilter && q.Candidates == nil && q.Category == "" && len(q.Excluded) == 0 && (q.Format == "" || q.Format == "全部")
	for _, value := range q.Filters {
		if value != "" && value != "全部" {
			unfiltered = false
		}
	}
	if unfiltered {
		var indexed int
		if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_unavailable_sources'").Scan(&indexed); err != nil {
			return nil, 0, err
		}
		if indexed > 0 {
			countSQL = "SELECT (SELECT count(*) FROM books)-(SELECT count(*) FROM book_unavailable_sources)"
			countArgs = nil
		}
	}
	if err = tx.QueryRowContext(ctx, countSQL, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	order := "b.id DESC"
	if q.RatingSort {
		var scored int
		if err = tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM ratings WHERE COALESCE(rating,0)<>0)`).Scan(&scored); err != nil {
			return nil, 0, err
		}
		if scored > 0 {
			order = `COALESCE((SELECT MAX(r.rating) FROM books_ratings_link l JOIN ratings r ON r.id=l.rating WHERE l.book=b.id),0) DESC,b.id DESC`
		}
	}
	if q.Start < 0 {
		q.Start = 0
	}
	if q.Size < 1 {
		q.Size = 1
	}
	pageArgs := append(append([]any{}, args...), q.Size, q.Start)
	rows, err := tx.QueryContext(ctx, "SELECT b.id FROM books b WHERE "+where+" ORDER BY "+order+" LIMIT ? OFFSET ?", pageArgs...)
	if err != nil {
		return nil, 0, err
	}
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return nil, 0, err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, err
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, err
	}
	return ids, total, nil
}

// MigrateBrowseIndexes is additive and skips tables absent in legacy fixtures.
func MigrateBrowseIndexes(db *sql.DB) error {
	indexes := map[string][]string{
		"data":         {"CREATE INDEX IF NOT EXISTS browse_data_format_book ON data(UPPER(format),book)", "CREATE INDEX IF NOT EXISTS browse_data_book_format ON data(book,UPPER(format))"},
		"comments":     {"CREATE INDEX IF NOT EXISTS browse_comments_book ON comments(book)"},
		"identifiers":  {"CREATE INDEX IF NOT EXISTS browse_identifiers_book ON identifiers(book)"},
		"book_formats": {"CREATE INDEX IF NOT EXISTS browse_format_book_name ON book_formats(book_id,UPPER(format))"},
	}
	for _, s := range categorySpecs {
		indexes[s.linkTable] = []string{fmt.Sprintf("CREATE INDEX IF NOT EXISTS browse_%s_book ON %s(book,%s)", s.linkTable, s.linkTable, s.linkItemCol), fmt.Sprintf("CREATE INDEX IF NOT EXISTS browse_%s_item ON %s(%s,book)", s.linkTable, s.linkTable, s.linkItemCol)}
	}
	for table, stmts := range indexes {
		var exists int
		if err := db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name=?", table).Scan(&exists); err != nil {
			return err
		}
		if exists == 0 {
			continue
		}
		for _, stmt := range stmts {
			if !strings.Contains(stmt, "UPPER(") {
				cols := stmt[strings.LastIndex(stmt, "(")+1 : len(stmt)-1]
				covered, err := browseIndexCovered(db, table, strings.Split(cols, ","))
				if err != nil {
					return err
				}
				if covered {
					continue
				}
			}
			if _, err := db.Exec(stmt); err != nil {
				return fmt.Errorf("browse index: %w", err)
			}
		}
	}
	return nil
}

// Reuse Calibre's existing unique/covering indexes instead of duplicating them.
func browseIndexCovered(db *sql.DB, table string, want []string) (bool, error) {
	rows, err := db.Query("SELECT name FROM pragma_index_list(?) WHERE partial=0", table)
	if err != nil {
		return false, err
	}
	names := []string{}
	for rows.Next() {
		var n string
		if err = rows.Scan(&n); err != nil {
			rows.Close()
			return false, err
		}
		names = append(names, n)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return false, err
	}
	for _, name := range names {
		r, e := db.Query("SELECT name FROM pragma_index_info(?) ORDER BY seqno", name)
		if e != nil {
			return false, e
		}
		cols := []string{}
		for r.Next() {
			var c sql.NullString
			if e = r.Scan(&c); e != nil {
				r.Close()
				return false, e
			}
			cols = append(cols, c.String)
		}
		e = r.Err()
		r.Close()
		if e != nil {
			return false, e
		}
		if len(cols) < len(want) {
			continue
		}
		ok := true
		for i, c := range want {
			if cols[i] != c {
				ok = false
				break
			}
		}
		if ok {
			return true, nil
		}
	}
	return false, nil
}
