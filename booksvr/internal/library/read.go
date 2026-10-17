package library

import (
	"database/sql"
	"fmt"
	"path/filepath"
	"strings"
)

// AllBookIDs 返回全部书籍 id（升序）。
func AllBookIDs(db *sql.DB) ([]int64, error) {
	rows, err := db.Query(`SELECT id FROM books ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("library: 查询全部书籍失败: %w", err)
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("library: 扫描书籍 id 失败: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历书籍 id 失败: %w", err)
	}
	return ids, nil
}

// HasID 报告书籍是否存在。
func HasID(db *sql.DB, bookID int64) (bool, error) {
	var one int
	err := db.QueryRow(`SELECT 1 FROM books WHERE id = ? LIMIT 1`, bookID).Scan(&one)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("library: 查询书籍存在性失败: %w", err)
	}
	return true, nil
}

// BooksWithSameTitle 按书名与作者查找同书。
//
// 作者为空时只按书名匹配。用于导入时的重复检测。
func BooksWithSameTitle(db *sql.DB, title, author string) ([]int64, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return []int64{}, nil
	}

	var (
		rows *sql.Rows
		err  error
	)
	if strings.TrimSpace(author) == "" {
		rows, err = db.Query(`SELECT id FROM books WHERE title = ? ORDER BY id`, title)
	} else {
		rows, err = db.Query(`
			SELECT b.id FROM books b
			JOIN books_authors_link l ON l.book = b.id
			JOIN authors a ON a.id = l.author
			WHERE b.title = ? AND a.name = ?
			ORDER BY b.id`, title, author)
	}
	if err != nil {
		return nil, fmt.Errorf("library: 查询同书失败: %w", err)
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("library: 扫描同书结果失败: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历同书结果失败: %w", err)
	}
	return ids, nil
}

// LastModified 返回库中最近一次修改时间（ISO8601 字符串）。
//
// 取 books.last_modified 的最大值；库为空时返回空串。
func LastModified(db *sql.DB) (string, error) {
	var ts sql.NullString
	err := db.QueryRow(`SELECT MAX(last_modified) FROM books`).Scan(&ts)
	if err != nil {
		return "", fmt.Errorf("library: 查询最后修改时间失败: %w", err)
	}
	if !ts.Valid {
		return "", nil
	}
	return ts.String, nil
}

// FormatAbsPath 返回某书某格式文件的绝对路径。
//
// 优先用 book_formats 表（第一阶段接管）；回退到 Calibre 的
// books.path + data.name 约定。
func FormatAbsPath(db *sql.DB, bookID int64, format, libraryRoot string) (string, error) {
	format = NormalizeFormatName(format)

	// 优先查 book_formats。
	var path string
	err := db.QueryRow(
		`SELECT path FROM book_formats WHERE book_id = ? AND format = ? LIMIT 1`,
		bookID, format).Scan(&path)
	if err == nil && path != "" {
		return path, nil
	}
	if err != nil && err != sql.ErrNoRows {
		return "", fmt.Errorf("library: 查询格式路径失败: %w", err)
	}

	// 回退：Calibre 的 books.path + data.name。
	var bookPath, name string
	err = db.QueryRow(`
		SELECT COALESCE(b.path,''), COALESCE(d.name,'')
		FROM books b JOIN data d ON d.book = b.id
		WHERE b.id = ? AND UPPER(d.format) = ? LIMIT 1`, bookID, format).Scan(&bookPath, &name)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", fmt.Errorf("library: 查询格式路径失败: %w", err)
	}
	if bookPath == "" || name == "" {
		return "", nil
	}
	return filepath.Join(libraryRoot, bookPath, name+"."+strings.ToLower(format)), nil
}

// sortableFields 是支持排序的字段到 SQL 列的映射。
var sortableFields = map[string]string{
	"title":       "b.title",
	"author_sort": "b.author_sort",
	"timestamp":   "b.timestamp",
	"pubdate":     "b.pubdate",
	"id":          "b.id",
}

// Sort 按字段排序返回书籍 id。
//
// 未知字段回退到 id 排序（不报错）。
func Sort(db *sql.DB, field string, ascending bool) ([]int64, error) {
	col, ok := sortableFields[field]
	if !ok {
		col = "b.id"
	}
	dir := "DESC"
	if ascending {
		dir = "ASC"
	}

	rows, err := db.Query(fmt.Sprintf(`SELECT b.id FROM books b ORDER BY %s %s`, col, dir))
	if err != nil {
		return nil, fmt.Errorf("library: 排序查询失败: %w", err)
	}
	defer rows.Close()

	ids := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("library: 扫描排序结果失败: %w", err)
		}
		ids = append(ids, id)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("library: 遍历排序结果失败: %w", err)
	}
	return ids, nil
}

// fieldExprs 是 FieldFor 支持的字段到 SQL 表达式的映射。
var fieldExprs = map[string]string{
	"title":        "b.title",
	"author_sort":  "b.author_sort",
	"path":         "b.path",
	"timestamp":    "b.timestamp",
	"pubdate":      "b.pubdate",
	"has_cover":    "b.has_cover",
	"series_index": "b.series_index",
}

// FieldFor 取单本书的单个字段值。
//
// 未知字段返回 nil（不报错），与 Calibre 的 field_for 语义一致。
func FieldFor(db *sql.DB, field string, bookID int64) (any, error) {
	expr, ok := fieldExprs[field]
	if !ok {
		return nil, nil
	}

	var v any
	err := db.QueryRow(fmt.Sprintf(`SELECT %s FROM books b WHERE b.id = ?`, expr), bookID).Scan(&v)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("library: 查询字段 %s 失败: %w", field, err)
	}
	return v, nil
}

// BooksForFormat retrieves IDs without loading unrelated book metadata.
func BooksForFormat(db *sql.DB, format string) ([]int64, error) {
	var exists int
	if err := db.QueryRow(`SELECT count(*) FROM sqlite_master WHERE type='table' AND name='source_sync_formats'`).Scan(&exists); err != nil {
		return nil, err
	}
	query := `SELECT DISTINCT book FROM data d WHERE UPPER(format)=UPPER(?)`
	if exists > 0 {
		query += ` AND NOT EXISTS (SELECT 1 FROM book_formats f JOIN source_sync_formats s ON s.format_id=f.id WHERE f.book_id=d.book AND UPPER(f.format)=UPPER(d.format) AND s.missing=1)`
	}
	rows, err := db.Query(query, format)
	if err != nil {
		return nil, fmt.Errorf("library: 查询格式书籍失败: %w", err)
	}
	defer rows.Close()
	ids := []int64{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}
