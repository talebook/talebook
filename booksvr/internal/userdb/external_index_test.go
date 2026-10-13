package userdb

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

// extCalibreDDL 建 Calibre 侧的表（权威 schema.sql 只含 Talebook 自有表）。
var extCalibreDDL = []string{
	`CREATE TABLE IF NOT EXISTS books (id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0, pubdate TEXT,
		series_index REAL NOT NULL DEFAULT 1.0, sort TEXT,
		has_cover INTEGER NOT NULL DEFAULT 0, uuid TEXT, last_modified TEXT)`,
	`CREATE TABLE IF NOT EXISTS authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_authors_link (id INTEGER PRIMARY KEY, book INTEGER, author INTEGER)`,
	`CREATE TABLE IF NOT EXISTS tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_tags_link (id INTEGER PRIMARY KEY, book INTEGER, tag INTEGER)`,
	`CREATE TABLE IF NOT EXISTS publishers (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_publishers_link (id INTEGER PRIMARY KEY, book INTEGER, publisher INTEGER)`,
	`CREATE TABLE IF NOT EXISTS series (id INTEGER PRIMARY KEY, name TEXT NOT NULL, sort TEXT, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_series_link (id INTEGER PRIMARY KEY, book INTEGER, series INTEGER)`,
	`CREATE TABLE IF NOT EXISTS ratings (id INTEGER PRIMARY KEY, rating INTEGER, link TEXT)`,
	`CREATE TABLE IF NOT EXISTS books_ratings_link (id INTEGER PRIMARY KEY, book INTEGER, rating INTEGER)`,
	`CREATE TABLE IF NOT EXISTS data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT,
		uncompressed_size INTEGER, name TEXT)`,
	`CREATE TABLE IF NOT EXISTS book_formats (id INTEGER PRIMARY KEY, book_id INTEGER, format TEXT,
		uncompressed_size INTEGER, name TEXT)`,
}

// extDB 建库（Talebook 自有表 + Calibre 表）。
func extDB(t *testing.T) *sql.DB {
	t.Helper()
	db := newSchemaDB(t)
	for _, stmt := range extCalibreDDL {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建 Calibre 表失败: %v\n%s", err, stmt)
		}
	}
	return db
}

// extBook 插入一本书。
func extBook(t *testing.T, db *sql.DB, id int64, title string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path, timestamp, pubdate,
		series_index, has_cover) VALUES (?, ?, 'a', 'p', 0, '', 1.0, 0)`, id, title); err != nil {
		t.Fatalf("插入书失败: %v", err)
	}
}

// extAuthor 插入作者并关联书籍。
func extAuthor(t *testing.T, db *sql.DB, id int64, name string, bookIDs ...int64) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (?, ?)`, id, name); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	for _, bid := range bookIDs {
		if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`, bid, id); err != nil {
			t.Fatalf("关联作者失败: %v", err)
		}
	}
}

// ---- CalibreAuthorMergePlan ----

func TestCalibreAuthorMergePlanBasic(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extBook(t, db, 2, "书二")
	extAuthor(t, db, 10, "刘慈欣", 1)
	extAuthor(t, db, 11, "刘慈欣别名", 2)

	renameMap, affected := CalibreAuthorMergePlan(db, []string{"刘慈欣别名"}, "刘慈欣")
	if len(renameMap) != 1 || renameMap[11] != "刘慈欣" {
		t.Fatalf("renameMap = %v", renameMap)
	}
	if !affected[2] || len(affected) != 1 {
		t.Errorf("affected = %v", affected)
	}
}

func TestCalibreAuthorMergePlanCanonicalExcluded(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extAuthor(t, db, 10, "刘慈欣", 1)

	renameMap, affected := CalibreAuthorMergePlan(db, []string{"刘慈欣"}, "刘慈欣")
	if len(renameMap) != 0 {
		t.Errorf("规范名自身不应改名: %v", renameMap)
	}
	if len(affected) != 0 {
		t.Errorf("affected = %v", affected)
	}
}

func TestCalibreAuthorMergePlanNormalizes(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extAuthor(t, db, 10, "刘慈欣", 1)
	extAuthor(t, db, 11, "刘慈欣 ", 1) // 归一化后同名

	renameMap, _ := CalibreAuthorMergePlan(db, []string{"刘慈欣 "}, "刘慈欣")
	if len(renameMap) != 1 || renameMap[11] != "刘慈欣" {
		t.Errorf("renameMap = %v", renameMap)
	}
}

func TestCalibreAuthorMergePlanEmpty(t *testing.T) {
	db := extDB(t)
	renameMap, affected := CalibreAuthorMergePlan(db, nil, "某人")
	if len(renameMap) != 0 || len(affected) != 0 {
		t.Errorf("renameMap = %v, affected = %v", renameMap, affected)
	}
}

// ---- RenameItemsPreservingExternalPaths ----

func TestRenameItemsAuthors(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extBook(t, db, 2, "书二")
	extAuthor(t, db, 10, "刘慈欣", 1)
	extAuthor(t, db, 11, "刘慈欣别名", 2)

	renamed, err := RenameItemsPreservingExternalPaths(db, "authors",
		map[int64]string{11: "刘慈欣"}, map[int64]bool{2: true})
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(renamed) != 1 || renamed[0] != 2 {
		t.Errorf("renamed = %v", renamed)
	}
	var authorID int64
	if err := db.QueryRow(`SELECT author FROM books_authors_link WHERE book = 2`).Scan(&authorID); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if authorID != 10 {
		t.Errorf("author = %d, want 10", authorID)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM authors WHERE id = 11`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 0 {
		t.Error("源作者应已删除")
	}
}

func TestRenameItemsCreatesTarget(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extAuthor(t, db, 11, "旧名", 1)

	// 目标名不存在 → 应新建。
	if _, err := RenameItemsPreservingExternalPaths(db, "authors",
		map[int64]string{11: "新名"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("err = %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM authors WHERE name = '新名'`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Error("应新建目标作者")
	}
}

func TestRenameItemsEmptyMap(t *testing.T) {
	db := extDB(t)
	renamed, err := RenameItemsPreservingExternalPaths(db, "authors", nil, nil)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(renamed) != 0 {
		t.Errorf("renamed = %v", renamed)
	}
}

func TestRenameItemsUnknownField(t *testing.T) {
	db := extDB(t)
	if _, err := RenameItemsPreservingExternalPaths(db, "unknown",
		map[int64]string{1: "x"}, map[int64]bool{}); err == nil {
		t.Error("未知分类应报错")
	}
}

func TestRenameItemsTags(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extBook(t, db, 2, "书二")
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (10, '科幻'), (11, '科幻小说')`); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (1, 10), (2, 11)`); err != nil {
		t.Fatalf("关联标签失败: %v", err)
	}

	if _, err := RenameItemsPreservingExternalPaths(db, "tags",
		map[int64]string{11: "科幻"}, map[int64]bool{2: true}); err != nil {
		t.Fatalf("err = %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM books_tags_link WHERE tag = 10`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 2 {
		t.Errorf("关联数 = %d, want 2", n)
	}
}

func TestRenameItemsSkipsExistingLink(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (10, '科幻'), (11, '科幻小说')`); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	// 书 1 同时挂两个标签 → 合并后不应产生重复关联。
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (1, 10), (1, 11)`); err != nil {
		t.Fatalf("关联标签失败: %v", err)
	}

	if _, err := RenameItemsPreservingExternalPaths(db, "tags",
		map[int64]string{11: "科幻"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("err = %v", err)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM books_tags_link WHERE tag = 10`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Errorf("关联数 = %d, want 1（不应重复）", n)
	}
}

// ---- ExternalIndexFormatPaths ----

func TestExternalIndexFormatPathsFromData(t *testing.T) {
	db := extDB(t)
	if _, err := db.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES
		(1, '/tmp/a.epub', '{"format":"EPUB","source_path":"/tmp/a.epub"}', 1)`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}
	paths, err := ExternalIndexFormatPaths(db, 1)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(paths) != 1 {
		t.Fatalf("paths = %v", paths)
	}
	if _, ok := paths["EPUB"]; !ok {
		t.Errorf("缺少 EPUB: %v", paths)
	}
}

func TestExternalIndexFormatPathsFromExtension(t *testing.T) {
	db := extDB(t)
	// data 里没有 format → 回退到文件扩展名。
	if _, err := db.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES
		(1, '/tmp/b.mobi', '{}', 1)`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}
	paths, err := ExternalIndexFormatPaths(db, 1)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if _, ok := paths["MOBI"]; !ok {
		t.Errorf("应从扩展名推断 MOBI: %v", paths)
	}
}

func TestExternalIndexFormatPathsEmpty(t *testing.T) {
	db := extDB(t)
	paths, err := ExternalIndexFormatPaths(db, 999)
	if err != nil {
		t.Fatalf("err = %v", err)
	}
	if len(paths) != 0 {
		t.Errorf("paths = %v", paths)
	}
}

// ---- setExternalFormatRecord ----

func TestSetExternalFormatRecord(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")

	dir := t.TempDir()
	fpath := filepath.Join(dir, "book.epub")
	if err := os.WriteFile(fpath, []byte("data"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	if err := setExternalFormatRecord(db, 1, fpath, "epub"); err != nil {
		t.Fatalf("err = %v", err)
	}

	var path string
	if err := db.QueryRow(`SELECT path FROM books WHERE id = 1`).Scan(&path); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if path != dir {
		t.Errorf("path = %q, want %q", path, dir)
	}

	var format, name string
	var size int64
	if err := db.QueryRow(`SELECT format, uncompressed_size, name FROM book_formats WHERE book_id = 1`).
		Scan(&format, &size, &name); err != nil {
		t.Fatalf("查询格式失败: %v", err)
	}
	if format != "EPUB" || name != "book.epub" || size != 4 {
		t.Errorf("格式记录 = %q, %q, %d", format, name, size)
	}

	// data 表也应写入（GetBooksData 读 data 表）。
	var dataFormat string
	if err := db.QueryRow(`SELECT format FROM data WHERE book = 1`).Scan(&dataFormat); err != nil {
		t.Fatalf("查询 data 失败: %v", err)
	}
	if dataFormat != "EPUB" {
		t.Errorf("data.format = %q", dataFormat)
	}
}

func TestSetExternalFormatRecordMissingFile(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	if err := setExternalFormatRecord(db, 1, "/nonexistent/x.epub", "EPUB"); err == nil {
		t.Error("文件不存在应报错")
	}
}

func TestSetExternalFormatRecordEmptyFormat(t *testing.T) {
	db := extDB(t)
	if err := setExternalFormatRecord(db, 1, "/tmp/x", ""); err != nil {
		t.Errorf("空格式应静默跳过: %v", err)
	}
}

// ---- clearBookPath ----

func TestClearBookPath(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	if err := clearBookPath(db, 1); err != nil {
		t.Fatalf("err = %v", err)
	}
	var path string
	if err := db.QueryRow(`SELECT path FROM books WHERE id = 1`).Scan(&path); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if path != "" {
		t.Errorf("path = %q, want 空", path)
	}
}

// ---- 小工具 ----

func TestLookupCategoryTableSpec(t *testing.T) {
	for _, field := range []string{"authors", "tags", "publishers", "series", "ratings"} {
		if _, ok := lookupCategoryTableSpec(field); !ok {
			t.Errorf("缺少分类 %q", field)
		}
	}
	if _, ok := lookupCategoryTableSpec("unknown"); ok {
		t.Error("未知分类不应命中")
	}
}

func TestStringField(t *testing.T) {
	if got := stringField(map[string]any{"a": "x"}, "a"); got != "x" {
		t.Errorf("got = %q", got)
	}
	if got := stringField(map[string]any{"a": 1}, "a"); got != "" {
		t.Errorf("非字符串应返回空: %q", got)
	}
	if got := stringField(nil, "a"); got != "" {
		t.Errorf("nil map 应返回空: %q", got)
	}
}

// TestRenameItemsPreservesExternalPaths 覆盖外部索引路径的保留与写回。
func TestRenameItemsPreservesExternalPaths(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extAuthor(t, db, 10, "刘慈欣", 1)
	extAuthor(t, db, 11, "刘慈欣别名", 1)

	// 造一个真实存在的外部文件，并登记到 scanfiles。
	dir := t.TempDir()
	fpath := filepath.Join(dir, "ext.epub")
	if err := os.WriteFile(fpath, []byte("epub-data"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES
		(1, ?, ?, 1)`, fpath, `{"format":"EPUB","source_path":"`+fpath+`"}`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}

	if _, err := RenameItemsPreservingExternalPaths(db, "authors",
		map[int64]string{11: "刘慈欣"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("err = %v", err)
	}

	// 外部格式记录应被写回：books.path 指向外部目录，book_formats 有 EPUB。
	var path string
	if err := db.QueryRow(`SELECT path FROM books WHERE id = 1`).Scan(&path); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if path != dir {
		t.Errorf("path = %q, want %q", path, dir)
	}
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM book_formats WHERE book_id = 1 AND format = 'EPUB'`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 1 {
		t.Error("外部格式记录应被写回")
	}
}

// TestRenameItemsSkipsMissingExternalFile 覆盖外部文件已不存在时跳过写回。
func TestRenameItemsSkipsMissingExternalFile(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	extAuthor(t, db, 10, "刘慈欣", 1)
	extAuthor(t, db, 11, "刘慈欣别名", 1)

	// 登记一个不存在的路径。
	if _, err := db.Exec(`INSERT INTO scanfiles (id, path, data, book_id) VALUES
		(1, '/nonexistent/gone.epub', '{"format":"EPUB"}', 1)`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}

	if _, err := RenameItemsPreservingExternalPaths(db, "authors",
		map[int64]string{11: "刘慈欣"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("err = %v", err)
	}
	// 文件不存在 → 不应写回格式记录。
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM book_formats WHERE book_id = 1`).Scan(&n); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if n != 0 {
		t.Error("文件不存在时不应写回格式记录")
	}
}

// TestRenameItemsSeriesAndPublishers 覆盖 series / publishers 分类。
func TestRenameItemsSeriesAndPublishers(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	if _, err := db.Exec(`INSERT INTO series (id, name) VALUES (10, '三体'), (11, '三体全集')`); err != nil {
		t.Fatalf("插入丛书失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_series_link (book, series) VALUES (1, 11)`); err != nil {
		t.Fatalf("关联丛书失败: %v", err)
	}
	if _, err := RenameItemsPreservingExternalPaths(db, "series",
		map[int64]string{11: "三体"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("series err = %v", err)
	}
	var seriesID int64
	if err := db.QueryRow(`SELECT series FROM books_series_link WHERE book = 1`).Scan(&seriesID); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if seriesID != 10 {
		t.Errorf("series = %d, want 10", seriesID)
	}

	if _, err := db.Exec(`INSERT INTO publishers (id, name) VALUES (20, '某社'), (21, '某出版社')`); err != nil {
		t.Fatalf("插入出版社失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (1, 21)`); err != nil {
		t.Fatalf("关联出版社失败: %v", err)
	}
	if _, err := RenameItemsPreservingExternalPaths(db, "publishers",
		map[int64]string{21: "某社"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("publishers err = %v", err)
	}
	var pubID int64
	if err := db.QueryRow(`SELECT publisher FROM books_publishers_link WHERE book = 1`).Scan(&pubID); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if pubID != 20 {
		t.Errorf("publisher = %d, want 20", pubID)
	}
}

// TestRenameItemsRatings 覆盖 ratings 分类。
func TestRenameItemsRatings(t *testing.T) {
	db := extDB(t)
	extBook(t, db, 1, "书一")
	if _, err := db.Exec(`INSERT INTO ratings (id, rating) VALUES (10, 8), (11, 8)`); err != nil {
		t.Fatalf("插入评分失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_ratings_link (book, rating) VALUES (1, 11)`); err != nil {
		t.Fatalf("关联评分失败: %v", err)
	}
	if _, err := RenameItemsPreservingExternalPaths(db, "ratings",
		map[int64]string{11: "8"}, map[int64]bool{1: true}); err != nil {
		t.Fatalf("err = %v", err)
	}
}

func TestSortedInt64(t *testing.T) {
	got := sortedInt64(map[int64]bool{3: true, 1: true, 2: true})
	if len(got) != 3 || got[0] != 1 || got[1] != 2 || got[2] != 3 {
		t.Errorf("got = %v", got)
	}
	if got := sortedInt64(nil); len(got) != 0 {
		t.Errorf("got = %v", got)
	}
}
