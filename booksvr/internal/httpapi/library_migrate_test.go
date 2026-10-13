package httpapi

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// 缺陷 5 回归：Calibre 原生库没有 Talebook 扩展表（book_formats / works）。
// openLibraryDB 必须补建它们，否则导入时 AddFormat 会报
// `no such table: book_formats`，导入在最后一步失败。
//
// 这是真实界面点击才暴露的缺陷：直接调 API 时若库是测试自建的，
// 表恰好存在，就掩盖了生产库缺表的事实。

// newBareCalibreDB 建一个只有 Calibre 原生表的库，模拟真实 metadata.db。
func newBareCalibreDB(t *testing.T) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer func() { _ = db.Close() }()

	ddl := []string{
		`CREATE TABLE books (id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
			sort TEXT, timestamp TIMESTAMP, pubdate TIMESTAMP, series_index REAL,
			author_sort TEXT, isbn TEXT, lccn TEXT, path TEXT, flags INTEGER,
			uuid TEXT, has_cover BOOL, last_modified TIMESTAMP)`,
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT, sort TEXT, link TEXT)`,
		`CREATE TABLE data (id INTEGER PRIMARY KEY, book INTEGER, format TEXT,
			uncompressed_size INTEGER, name TEXT)`,
	}
	for _, stmt := range ddl {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("ddl failed: %v\n%s", err, stmt)
		}
	}
	return path
}

func TestOpenLibraryDBCreatesExtensionTables(t *testing.T) {
	path := newBareCalibreDB(t)

	db, err := openLibraryDB(path)
	if err != nil {
		t.Fatalf("openLibraryDB: %v", err)
	}
	defer func() { _ = db.Close() }()

	// book_formats 是导入路径上 AddFormat 必需的表。
	for _, table := range []string{"book_formats", "works"} {
		var name string
		err := db.QueryRow(
			`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, table).Scan(&name)
		if err != nil {
			t.Errorf("表 %q 未创建: %v", table, err)
		}
	}

	// 原生表必须保留。
	var title string
	if err := db.QueryRow(`SELECT COUNT(*) FROM books`).Scan(new(int)); err != nil {
		t.Errorf("books 表不可用: %v", err)
	}
	_ = title
}

// TestOpenLibraryDBMigrateIsIdempotent 保证对已迁移过的库重复打开不报错。
func TestOpenLibraryDBMigrateIsIdempotent(t *testing.T) {
	path := newBareCalibreDB(t)

	for i := 0; i < 2; i++ {
		db, err := openLibraryDB(path)
		if err != nil {
			t.Fatalf("第 %d 次 openLibraryDB: %v", i+1, err)
		}
		_ = db.Close()
	}
}
