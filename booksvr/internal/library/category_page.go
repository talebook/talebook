package library

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"modernc.org/sqlite"
	"strings"
)

func init() {
	sqlite.MustRegisterScalarFunction("browse_lower", 1, func(_ *sqlite.FunctionContext, args []driver.Value) (driver.Value, error) {
		if args[0] == nil {
			return "", nil
		}
		return strings.ToLower(fmt.Sprint(args[0])), nil
	})
}

// CategoryPage aggregates links using category/book covering indexes, and only
// returns the requested rows. Counts preserve the existing category semantics.
func CategoryPage(ctx context.Context, db *sql.DB, category, query string, page, size int, explicit bool) ([]Category, int, int, bool, error) {
	var indexed int
	if err := db.QueryRowContext(ctx, "SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_browse_counts'").Scan(&indexed); err != nil {
		return nil, 0, 0, false, err
	}
	base := ""
	order := "cnt DESC,browse_lower(name),name,CAST(id AS TEXT)"
	if category == "formats" {
		base = `SELECT format AS id,format AS name,COUNT(*) AS cnt FROM data GROUP BY format`
		if indexed > 0 {
			base = `SELECT item AS id,item AS name,n AS cnt FROM book_browse_counts WHERE kind='formats' AND n>0`
		}
	} else {
		s, ok := categorySpecs[category]
		if !ok {
			return []Category{}, 0, 0, explicit, nil
		}
		name := "i." + s.nameExpr
		if category == "ratings" {
			name = "CAST(i.rating AS TEXT)"
			order = "CAST(name AS REAL) DESC,browse_lower(name),name,CAST(id AS TEXT)"
		}
		base = fmt.Sprintf("SELECT i.id,%s AS name,COUNT(DISTINCT l.book) AS cnt FROM %s i LEFT JOIN %s l ON l.%s=i.id GROUP BY i.id", name, s.itemTable, s.linkTable, s.linkItemCol)
		if indexed > 0 {
			base = fmt.Sprintf("SELECT i.id,%s AS name,c.n AS cnt FROM book_browse_counts c CROSS JOIN %s i ON i.id=CAST(c.item AS INTEGER) WHERE c.kind='%s'", name, s.itemTable, category)
		}
	}
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, 0, false, err
	}
	defer tx.Rollback()
	// Count item names without scanning book links. The aggregation is needed only
	// once, for the requested result ordering and page.
	names := "SELECT " + "name FROM " + category
	if category == "formats" {
		names = "SELECT DISTINCT format AS name FROM data"
		if indexed > 0 {
			names = "SELECT item AS name FROM book_browse_counts WHERE kind='formats' AND n>0"
		}
	} else if category == "ratings" {
		names = "SELECT CAST(rating AS TEXT) AS name FROM ratings"
	} else {
		names = "SELECT " + categorySpecs[category].nameExpr + " AS name FROM " + categorySpecs[category].itemTable
	}
	var total, unfiltered int
	if query == "" {
		if err = tx.QueryRowContext(ctx, "SELECT count(*) FROM ("+names+")").Scan(&unfiltered); err != nil {
			return nil, 0, 0, false, err
		}
		total = unfiltered
	} else {
		if err = tx.QueryRowContext(ctx, "SELECT count(*),COALESCE(SUM(instr(browse_lower(name),?)>0),0) FROM ("+names+")", query).Scan(&unfiltered, &total); err != nil {
			return nil, 0, 0, false, err
		}
	}
	paginated := explicit || total >= 1000
	statement := "SELECT id,name,cnt FROM (" + base + ")"
	args := []any{}
	if query != "" {
		statement += " WHERE instr(browse_lower(name),?)>0"
		args = append(args, query)
	}
	statement += " ORDER BY " + order
	if paginated {
		offset := (page - 1) * size
		if page > int(^uint(0)>>1)/size {
			offset = int(^uint(0) >> 1)
		}
		statement += " LIMIT ? OFFSET ?"
		args = append(args, size, offset)
	}
	rows, err := tx.QueryContext(ctx, statement, args...)
	if err != nil {
		return nil, 0, 0, false, err
	}
	out := []Category{}
	for rows.Next() {
		var v Category
		var id any
		if err = rows.Scan(&id, &v.Name, &v.Count); err != nil {
			rows.Close()
			return nil, 0, 0, false, err
		}
		if n, ok := id.(int64); ok {
			v.ID = n
		}
		out = append(out, v)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, 0, false, err
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, 0, false, err
	}
	return out, total, unfiltered, paginated, nil
}
