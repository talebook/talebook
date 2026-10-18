package library

import (
	"context"
	"database/sql"
	"encoding/json"
	"strings"
)

// AuthorCategoryPage normalizes names without fetching every author's book
// count. Only merged/renamed groups need replacement rows; the ordinary author
// rows remain ordered by the category rank index and are paginated in SQLite.
func AuthorCategoryPage(ctx context.Context, db *sql.DB, mapping map[string]string, normalize func(string) (string, error), query string, page, size int, explicit bool) ([]Category, int, int, bool, error) {
	tx, err := db.BeginTx(ctx, &sql.TxOptions{ReadOnly: true})
	if err != nil {
		return nil, 0, 0, false, err
	}
	defer tx.Rollback()
	rows, err := tx.QueryContext(ctx, `SELECT id,name FROM authors ORDER BY name`)
	if err != nil {
		return nil, 0, 0, false, err
	}
	type group struct {
		Category
		raw   string
		ids   []int64
		names []string
	}
	groups := map[string]*group{}
	replacements := map[string]*group{}
	for rows.Next() {
		var id int64
		var name string
		if err = rows.Scan(&id, &name); err != nil {
			rows.Close()
			return nil, 0, 0, false, err
		}
		key, e := normalize(name)
		if e != nil {
			key = name
		}
		canonical := name
		if mapped, ok := mapping[key]; ok {
			canonical = mapped
		}
		if canonical != name {
			key, e = normalize(canonical)
			if e != nil {
				key = canonical
			}
		}
		g := groups[key]
		if g == nil {
			g = &group{Category: Category{ID: id, Name: canonical}, raw: name}
			groups[key] = g
			if canonical != name {
				replacements[key] = g
			}
		} else {
			g.ids = append(g.ids, id)
			g.names = append(g.names, name)
			replacements[key] = g
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, 0, false, err
	}
	excluded := []int64{}
	overlays := []Category{}
	merged := map[string][]string{}
	total := len(groups)
	if query != "" {
		total = 0
		for _, g := range groups {
			if strings.Contains(strings.ToLower(g.Name), query) {
				total++
			}
		}
	}
	for key, g := range replacements {
		excluded = append(excluded, g.ID)
		excluded = append(excluded, g.ids...)
		merged[key] = append([]string{g.raw}, g.names...)
	}
	counts, err := countAuthorGroups(tx, merged)
	if err != nil {
		return nil, 0, 0, false, err
	}
	for key, g := range replacements {
		g.Count = counts[key]
		overlays = append(overlays, g.Category)
	}
	// The compound ORDER BY is inside the subquery so SQLite can merge an indexed
	// ordinary-author stream with the small replacement stream, rather than sort
	// every author after a UNION has been materialized.
	extra, _ := json.Marshal(overlays)
	compound := `SELECT i.id AS id,i.name AS name,c.n AS cnt,browse_lower(i.name) AS fold,CAST(i.id AS TEXT) AS sid FROM book_browse_counts c CROSS JOIN authors i ON i.id=CAST(c.item AS INTEGER) WHERE c.kind='authors' AND i.id NOT IN (SELECT value FROM json_each(?))`
	args := []any{jsonIDs(excluded)}
	if query != "" {
		compound += ` AND instr(browse_lower(i.name),?)>0`
		args = append(args, query)
	}
	compound += ` UNION ALL SELECT json_extract(value,'$.id'),json_extract(value,'$.name'),json_extract(value,'$.count'),browse_lower(json_extract(value,'$.name')),CAST(json_extract(value,'$.id') AS TEXT) FROM json_each(?)`
	args = append(args, string(extra))
	if query != "" {
		compound += ` WHERE instr(browse_lower(json_extract(value,'$.name')),?)>0`
		args = append(args, query)
	}
	compound += ` ORDER BY 3 DESC,4,2,5`
	paginated := explicit || total >= 1000
	if paginated {
		offset := (page - 1) * size
		if page > int(^uint(0)>>1)/size {
			offset = int(^uint(0) >> 1)
		}
		compound += ` LIMIT ? OFFSET ?`
		args = append(args, size, offset)
	}
	rows, err = tx.QueryContext(ctx, "SELECT id,name,cnt FROM ("+compound+")", args...)
	if err != nil {
		return nil, 0, 0, false, err
	}
	out := []Category{}
	for rows.Next() {
		var c Category
		if err = rows.Scan(&c.ID, &c.Name, &c.Count); err != nil {
			rows.Close()
			return nil, 0, 0, false, err
		}
		out = append(out, c)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, 0, 0, false, err
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, 0, false, err
	}
	return out, total, len(groups), paginated, nil
}
