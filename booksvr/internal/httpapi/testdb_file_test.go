package httpapi

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// newTestDBFile 建一个已迁移的**文件**库，返回句柄与路径。
//
// Serve 需要真实文件路径（WAL 模式与多连接），因此不能用 :memory:。
func newTestDBFile(t *testing.T) (*sql.DB, string) {
	t.Helper()
	path := filepath.Join(t.TempDir(), "metadata.db")

	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE books (
		id          INTEGER PRIMARY KEY,
		title       TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '',
		path        TEXT NOT NULL DEFAULT '',
		timestamp   INTEGER NOT NULL DEFAULT 0
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db, path
}

// dbPathOf 返回测试库的文件路径。
//
// 仅用于由 newTestDBFile 创建的库；:memory: 库会返回空串。
func dbPathOf(t *testing.T, db *sql.DB) string {
	t.Helper()
	var path string
	// PRAGMA database_list 的第 3 列是文件路径；:memory: 时为空。
	row := db.QueryRow("PRAGMA database_list")
	var seq int
	var name, file string
	if err := row.Scan(&seq, &name, &file); err != nil {
		t.Fatalf("PRAGMA database_list: %v", err)
	}
	path = file
	if path == "" {
		t.Fatal("dbPathOf: 该库没有文件路径（是否用了 :memory:？请改用 newTestDBFile）")
	}
	return path
}
