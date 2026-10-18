package userdb

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// CalibreAuthorMergePlan 构造 Calibre 作者 id → 规范名的改名映射，
// 以及受影响的书籍集合。
//
// 对应 Python 的 calibre_author_merge_plan。
func CalibreAuthorMergePlan(db *sql.DB, names []string, canonical string) (map[int64]string, map[int64]bool) {
	cleaned, err := CleanAliasName(canonical)
	if err != nil {
		cleaned = canonical
	}

	memberNames := map[string]bool{}
	if n, err := NormalizeAlias(cleaned); err == nil {
		memberNames[n] = true
	}
	for _, name := range names {
		n, err := NormalizeAlias(name)
		if err != nil {
			continue
		}
		memberNames[n] = true
	}

	renameMap := map[int64]string{}
	affected := map[int64]bool{}

	rows, err := db.Query(`SELECT id, name FROM authors`)
	if err != nil {
		return renameMap, affected
	}
	defer rows.Close()

	type pair struct {
		id   int64
		name string
	}
	pairs := []pair{}
	for rows.Next() {
		var p pair
		if err := rows.Scan(&p.id, &p.name); err != nil {
			return renameMap, affected
		}
		pairs = append(pairs, p)
	}
	if err := rows.Err(); err != nil {
		return renameMap, affected
	}

	for _, p := range pairs {
		n, err := NormalizeAlias(p.name)
		if err != nil {
			continue
		}
		if !memberNames[n] || p.name == cleaned {
			continue
		}
		renameMap[p.id] = cleaned
		ids, err := booksForAuthorID(db, p.id)
		if err != nil {
			continue
		}
		for _, id := range ids {
			affected[id] = true
		}
	}
	return renameMap, affected
}

// booksForAuthorID 取某作者 id 下的全部书籍 id。
func booksForAuthorID(db *sql.DB, authorID int64) ([]int64, error) {
	rows, err := db.Query(`SELECT book FROM books_authors_link WHERE author = ?`, authorID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []int64{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		out = append(out, id)
	}
	return out, rows.Err()
}

// RenameItemsPreservingExternalPaths 执行分类项改名/合并，
// 同时保留外部索引书籍的原始文件路径。
//
// 对应 Python 的 rename_items_preserving_external_paths：
// 先把外部索引书籍的 books.path 清空，改名后再把外部格式记录写回。
func RenameItemsPreservingExternalPaths(db *sql.DB, field string, renameMap map[int64]string,
	bookIDs map[int64]bool) ([]int64, error) {
	if len(renameMap) == 0 {
		return []int64{}, nil
	}

	// 记录受影响书籍的外部格式路径。
	pathsByBook := map[int64]map[string]string{}
	for bookID := range bookIDs {
		paths, err := ExternalIndexFormatPaths(db, bookID)
		if err != nil {
			return nil, err
		}
		if len(paths) > 0 {
			pathsByBook[bookID] = paths
		}
	}

	// 清空这些书籍的 path，避免 Calibre 改名时移动外部文件。
	for bookID := range pathsByBook {
		if err := clearBookPath(db, bookID); err != nil {
			return nil, err
		}
	}

	renamed, renameErr := renameCategoryItems(db, field, renameMap)

	// 无论改名成败，都要把外部格式记录写回。
	for bookID, paths := range pathsByBook {
		for format, path := range paths {
			if _, err := os.Stat(path); err != nil {
				continue
			}
			if err := setExternalFormatRecord(db, bookID, path, format); err != nil {
				return renamed, err
			}
		}
	}
	return renamed, renameErr
}

// renameCategoryItems 把分类项合并到目标名称，返回受影响的书籍 id。
//
// 语义对齐 Calibre 的 new_api.rename_items：把 renameMap 中的每个源项
// 合并到同名目标项，并更新关联表。
func renameCategoryItems(db *sql.DB, field string, renameMap map[int64]string) ([]int64, error) {
	spec, ok := lookupCategoryTableSpec(field)
	if !ok {
		return nil, fmt.Errorf("userdb: 未知分类 %q", field)
	}

	tx, err := db.Begin()
	if err != nil {
		return nil, fmt.Errorf("userdb: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	affected := map[int64]bool{}
	// 按源 id 升序处理，保证结果稳定。
	srcIDs := make([]int64, 0, len(renameMap))
	for id := range renameMap {
		srcIDs = append(srcIDs, id)
	}
	sort.Slice(srcIDs, func(i, j int) bool { return srcIDs[i] < srcIDs[j] })

	for _, srcID := range srcIDs {
		target := renameMap[srcID]

		// 找到或创建目标项。
		var targetID int64
		err := tx.QueryRow(`SELECT id FROM `+spec.itemTable+` WHERE `+spec.nameCol+` = ? LIMIT 1`, target).Scan(&targetID)
		if err == sql.ErrNoRows {
			res, err := tx.Exec(`INSERT INTO `+spec.itemTable+` (`+spec.nameCol+`) VALUES (?)`, target)
			if err != nil {
				return nil, fmt.Errorf("userdb: 创建分类项失败: %w", err)
			}
			targetID, err = res.LastInsertId()
			if err != nil {
				return nil, fmt.Errorf("userdb: 取分类项 id 失败: %w", err)
			}
		} else if err != nil {
			return nil, fmt.Errorf("userdb: 查询分类项失败: %w", err)
		}

		if targetID == srcID {
			continue
		}

		// 收集源项下的书籍。
		rows, err := tx.Query(`SELECT book FROM `+spec.linkTable+` WHERE `+spec.linkItemCol+` = ?`, srcID)
		if err != nil {
			return nil, fmt.Errorf("userdb: 查询关联书籍失败: %w", err)
		}
		bookIDs := []int64{}
		for rows.Next() {
			var id int64
			if err := rows.Scan(&id); err != nil {
				_ = rows.Close()
				return nil, fmt.Errorf("userdb: 扫描关联书籍失败: %w", err)
			}
			bookIDs = append(bookIDs, id)
		}
		if err := rows.Err(); err != nil {
			_ = rows.Close()
			return nil, fmt.Errorf("userdb: 遍历关联书籍失败: %w", err)
		}
		_ = rows.Close()

		// 把书籍重新挂到目标项，跳过已存在的关联。
		for _, bookID := range bookIDs {
			var exists int
			err := tx.QueryRow(`SELECT 1 FROM `+spec.linkTable+` WHERE book = ? AND `+
				spec.linkItemCol+` = ? LIMIT 1`, bookID, targetID).Scan(&exists)
			if err == nil {
				continue
			}
			if err != sql.ErrNoRows {
				return nil, fmt.Errorf("userdb: 查询关联失败: %w", err)
			}
			if _, err := tx.Exec(`INSERT INTO `+spec.linkTable+` (book, `+spec.linkItemCol+`) VALUES (?, ?)`,
				bookID, targetID); err != nil {
				return nil, fmt.Errorf("userdb: 写入关联失败: %w", err)
			}
			affected[bookID] = true
		}

		// 删除源项的关联与源项本身。
		if _, err := tx.Exec(`DELETE FROM `+spec.linkTable+` WHERE `+spec.linkItemCol+` = ?`, srcID); err != nil {
			return nil, fmt.Errorf("userdb: 清理关联失败: %w", err)
		}
		if _, err := tx.Exec(`DELETE FROM `+spec.itemTable+` WHERE id = ?`, srcID); err != nil {
			return nil, fmt.Errorf("userdb: 删除分类项失败: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("userdb: 提交改名失败: %w", err)
	}
	return sortedInt64(affected), nil
}

// categoryTableSpec 描述一个分类在 Calibre schema 中的表与关联表。
type categoryTableSpec struct {
	itemTable   string
	linkTable   string
	linkItemCol string
	// nameCol 是分类项的名称列；ratings 表用 rating 而非 name。
	nameCol string
}

// categoryTableSpecs 是分类名到表结构的映射。
var categoryTableSpecs = map[string]categoryTableSpec{
	"authors":    {"authors", "books_authors_link", "author", "name"},
	"tags":       {"tags", "books_tags_link", "tag", "name"},
	"publishers": {"publishers", "books_publishers_link", "publisher", "name"},
	"series":     {"series", "books_series_link", "series", "name"},
	"ratings":    {"ratings", "books_ratings_link", "rating", "rating"},
}

// lookupCategoryTableSpec 查表。
func lookupCategoryTableSpec(field string) (categoryTableSpec, bool) {
	spec, ok := categoryTableSpecs[field]
	return spec, ok
}

// ExternalIndexFormatPaths 返回某书的外部索引格式 → 真实文件路径。
//
// 对应 Python 的 external_index_format_paths：从 scanfiles 表里
// 找出该书的记录，取 data.format 或文件扩展名作为格式。
func ExternalIndexFormatPaths(db *sql.DB, bookID int64) (map[string]string, error) {
	rows, err := db.Query(`SELECT path, COALESCE(data,'{}') FROM scanfiles WHERE book_id = ?`, bookID)
	if err != nil {
		return nil, fmt.Errorf("userdb: 查询外部索引失败: %w", err)
	}
	defer rows.Close()

	out := map[string]string{}
	for rows.Next() {
		var path, data string
		if err := rows.Scan(&path, &data); err != nil {
			return nil, fmt.Errorf("userdb: 扫描外部索引失败: %w", err)
		}
		meta := jsonMap(data)
		format := strings.ToUpper(strings.TrimSpace(stringField(meta, "format")))
		if format == "" {
			format = strings.ToUpper(strings.TrimPrefix(filepath.Ext(path), "."))
		}
		sourcePath := stringField(meta, "source_path")
		if sourcePath == "" {
			sourcePath = path
		}
		if format == "" || sourcePath == "" {
			continue
		}
		abs, err := filepath.Abs(sourcePath)
		if err != nil {
			abs = sourcePath
		}
		if resolved, err := filepath.EvalSymlinks(abs); err == nil {
			abs = resolved
		}
		out[format] = abs
	}
	return out, rows.Err()
}

// clearBookPath 把书籍的 path 置空，避免 Calibre 改名时移动外部文件。
func clearBookPath(db *sql.DB, bookID int64) error {
	if _, err := db.Exec(`UPDATE books SET path = '' WHERE id = ?`, bookID); err != nil {
		return fmt.Errorf("userdb: 清空书籍路径失败: %w", err)
	}
	return nil
}

// setExternalFormatRecord 把外部文件重新登记为书籍的某个格式。
func setExternalFormatRecord(db *sql.DB, bookID int64, fpath, format string) error {
	format = strings.ToUpper(strings.TrimSpace(format))
	if format == "" {
		return nil
	}
	dir := filepath.Dir(fpath)
	name := filepath.Base(fpath)

	info, err := os.Stat(fpath)
	if err != nil {
		return fmt.Errorf("userdb: 读取外部文件失败: %w", err)
	}

	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("userdb: 开启事务失败: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.Exec(`UPDATE books SET path = ? WHERE id = ?`, dir, bookID); err != nil {
		return fmt.Errorf("userdb: 写回书籍路径失败: %w", err)
	}
	if _, err := tx.Exec(`DELETE FROM book_formats WHERE book_id = ? AND format = ?`, bookID, format); err != nil {
		return fmt.Errorf("userdb: 清理格式记录失败: %w", err)
	}
	if _, err := tx.Exec(`INSERT INTO book_formats (book_id, format, uncompressed_size, name) VALUES (?, ?, ?, ?)`,
		bookID, format, info.Size(), name); err != nil {
		return fmt.Errorf("userdb: 写入格式记录失败: %w", err)
	}
	// Explicit replacement fires ordinary delete/insert triggers even when
	// SQLite recursive_triggers is disabled (the default).
	if _, err := tx.Exec(`DELETE FROM data WHERE book=? AND format=?`, bookID, format); err != nil {
		return fmt.Errorf("userdb: 清理 data 格式失败: %w", err)
	}
	if _, err := tx.Exec(`INSERT INTO data (book, format, uncompressed_size, name) VALUES (?, ?, ?, ?)`,
		bookID, format, info.Size(), name); err != nil {
		return fmt.Errorf("userdb: 写入 data 记录失败: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("userdb: 提交格式记录失败: %w", err)
	}
	return nil
}

// stringField 从 map 里取字符串字段。
func stringField(m map[string]any, key string) string {
	if m == nil {
		return ""
	}
	s, _ := m[key].(string)
	return s
}

// sortedInt64 把集合转成升序切片。
func sortedInt64(set map[int64]bool) []int64 {
	out := make([]int64, 0, len(set))
	for id := range set {
		out = append(out, id)
	}
	sort.Slice(out, func(i, j int) bool { return out[i] < out[j] })
	return out
}
