package library

import (
	"database/sql"
	"encoding/json"
	"fmt"
)

// Category 是一个分类项及其书籍数。
type Category struct {
	ID    int64  `json:"id"`
	Name  string `json:"name"`
	Count int64  `json:"count"`
}

// categorySpec 描述一个分类在 Calibre schema 中的表与关联表。
type categorySpec struct {
	// itemTable 是分类项表（authors/tags/publishers/series/ratings/languages）。
	itemTable string
	// linkTable 是书与分类项的关联表。
	linkTable string
	// linkItemCol 是关联表中指向分类项的列名。
	linkItemCol string
	// nameExpr 是取分类项显示名的 SQL 表达式。
	nameExpr string
}

// categorySpecs 是支持的分类清单，对齐 Calibre 的 field_metadata 分类字段。
var categorySpecs = map[string]categorySpec{
	"authors":    {itemTable: "authors", linkTable: "books_authors_link", linkItemCol: "author", nameExpr: "name"},
	"tags":       {itemTable: "tags", linkTable: "books_tags_link", linkItemCol: "tag", nameExpr: "name"},
	"publishers": {itemTable: "publishers", linkTable: "books_publishers_link", linkItemCol: "publisher", nameExpr: "name"},
	"series":     {itemTable: "series", linkTable: "books_series_link", linkItemCol: "series", nameExpr: "name"},
	"ratings":    {itemTable: "ratings", linkTable: "books_ratings_link", linkItemCol: "rating", nameExpr: "rating"},
	"languages":  {itemTable: "languages", linkTable: "books_languages_link", linkItemCol: "lang_code", nameExpr: "lang_code"},
}

// GetBooksForCategory 返回某分类项下的全部书籍 id。
//
// 未知分类返回空结果（不报错），与 Calibre 的行为一致。
func GetBooksForCategory(db *sql.DB, category string, itemID int64) ([]int64, error) {
	spec, ok := categorySpecs[category]
	if !ok {
		return []int64{}, nil
	}

	rows, err := db.Query(fmt.Sprintf(`
		SELECT DISTINCT book FROM %s WHERE %s = ? ORDER BY book`,
		spec.linkTable, spec.linkItemCol), itemID)
	if err != nil {
		return nil, fmt.Errorf("library: 查询分类 %s 失败: %w", category, err)
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("library: 扫描分类结果失败: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历分类结果失败: %w", err)
	}
	return ids, nil
}

// GetCategories 返回某分类下全部项及其书籍数。
//
// 未知分类返回空结果（不报错）。
func GetCategories(db *sql.DB, category string) ([]Category, error) {
	spec, ok := categorySpecs[category]
	if !ok {
		return []Category{}, nil
	}

	// ratings 的显示名是整数，需要转成文本。
	//
	// 列名必须用 i. 限定：ratings 表的 rating 列与 books_ratings_link 表的
	// rating 列同名，不限定会触发 "ambiguous column name"。
	nameCol := "i." + spec.nameExpr
	if category == "ratings" {
		nameCol = "CAST(i." + spec.nameExpr + " AS TEXT)"
	}

	var indexed int
	if err := db.QueryRow("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='book_browse_counts'").Scan(&indexed); err != nil {
		return nil, err
	}
	if indexed > 0 {
		rows, err := db.Query(fmt.Sprintf("SELECT i.id,%s,COALESCE(c.n,0) FROM %s i LEFT JOIN book_browse_counts c ON c.kind=? AND c.item=CAST(i.id AS TEXT) ORDER BY 2", nameCol, spec.itemTable), category)
		if err != nil {
			return nil, err
		}
		defer rows.Close()
		out := []Category{}
		for rows.Next() {
			var c Category
			if err = rows.Scan(&c.ID, &c.Name, &c.Count); err != nil {
				return nil, err
			}
			out = append(out, c)
		}
		return out, rows.Err()
	}
	rows, err := db.Query(fmt.Sprintf(`
		SELECT i.id, %s AS name, COUNT(DISTINCT l.book) AS cnt
		FROM %s i
		LEFT JOIN %s l ON l.%s = i.id
		GROUP BY i.id
		ORDER BY name`,
		nameCol, spec.itemTable, spec.linkTable, spec.linkItemCol))
	if err != nil {
		return nil, fmt.Errorf("library: 查询分类列表 %s 失败: %w", category, err)
	}
	defer rows.Close()

	out := []Category{}
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.Name, &c.Count); err != nil {
			return nil, fmt.Errorf("library: 扫描分类列表失败: %w", err)
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历分类列表失败: %w", err)
	}
	return out, nil
}

// GetItemID 按名字取分类项 id；不存在返回 0。
func GetItemID(db *sql.DB, category, name string) (int64, error) {
	spec, ok := categorySpecs[category]
	if !ok {
		return 0, nil
	}

	nameCol := spec.nameExpr
	if category == "ratings" {
		nameCol = "CAST(" + spec.nameExpr + " AS TEXT)"
	}

	var id int64
	err := db.QueryRow(fmt.Sprintf(
		`SELECT id FROM %s WHERE %s = ? LIMIT 1`, spec.itemTable, nameCol), name).Scan(&id)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	if err != nil {
		return 0, fmt.Errorf("library: 查询分类项 %s/%s 失败: %w", category, name, err)
	}
	return id, nil
}

// GetItemNameMap 返回分类项的 id→name 映射。
func GetItemNameMap(db *sql.DB, category string) (map[int64]string, error) {
	spec, ok := categorySpecs[category]
	if !ok {
		return map[int64]string{}, nil
	}

	nameCol := spec.nameExpr
	if category == "ratings" {
		nameCol = "CAST(" + spec.nameExpr + " AS TEXT)"
	}

	rows, err := db.Query(fmt.Sprintf(`SELECT id, %s FROM %s`, nameCol, spec.itemTable))
	if err != nil {
		return nil, fmt.Errorf("library: 查询分类名映射 %s 失败: %w", category, err)
	}
	defer rows.Close()

	out := map[int64]string{}
	for rows.Next() {
		var id int64
		var name string
		if err := rows.Scan(&id, &name); err != nil {
			return nil, fmt.Errorf("library: 扫描分类名映射失败: %w", err)
		}
		out[id] = name
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历分类名映射失败: %w", err)
	}
	return out, nil
}

// CountAuthorBooks deduplicates aliases in SQLite without returning all IDs.
func CountAuthorBooks(db *sql.DB, names []string) (int64, error) {
	raw, _ := json.Marshal(names)
	var n int64
	err := db.QueryRow(`SELECT COUNT(DISTINCT l.book) FROM books_authors_link l JOIN authors a ON a.id=l.author WHERE a.name IN (SELECT value FROM json_each(?))`, string(raw)).Scan(&n)
	return n, err
}

// CountAuthorGroups deduplicates all multi-name groups in one indexed query.
type categoryQuerier interface {
	Query(string, ...any) (*sql.Rows, error)
}

func CountAuthorGroups(db *sql.DB, groups map[string][]string) (map[string]int64, error) {
	return countAuthorGroups(db, groups)
}
func countAuthorGroups(db categoryQuerier, groups map[string][]string) (map[string]int64, error) {
	out := map[string]int64{}
	if len(groups) == 0 {
		return out, nil
	}
	raw, _ := json.Marshal(groups)
	rows, err := db.Query(`SELECT g.key,COUNT(DISTINCT l.book) FROM json_each(?) g JOIN json_each(g.value) n JOIN authors a ON a.name=n.value JOIN books_authors_link l ON l.author=a.id GROUP BY g.key`, string(raw))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		var n int64
		if err = rows.Scan(&key, &n); err != nil {
			return nil, err
		}
		out[key] = n
	}
	return out, rows.Err()
}
