package httpapi

import (
	"database/sql"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/library"

	_ "modernc.org/sqlite"
)

// TestOpenLibraryDBOnFixtureWithOpenHandle 复现 startServe 场景：
// 测试夹具已用另一个句柄打开同一个库文件并跑过 Migrate，
// 此时 openLibraryDB 再开一个句柄跑 Migrate 必须成功（幂等且不锁死）。
func TestOpenLibraryDBOnFixtureWithOpenHandle(t *testing.T) {
	path := filepath.Join(t.TempDir(), "metadata.db")

	// 夹具句柄：保持打开，模拟 newTestDBFile 的行为。
	fixture, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	defer func() { _ = fixture.Close() }()

	if _, err := fixture.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(fixture); err != nil {
		t.Fatalf("fixture migrate: %v", err)
	}

	// 第二个句柄：openLibraryDB 会再跑一次 Migrate。
	db, err := openLibraryDB(path)
	if err != nil {
		t.Fatalf("openLibraryDB 在夹具句柄仍打开时失败: %v", err)
	}
	defer func() { _ = db.Close() }()

	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM book_formats`).Scan(&n); err != nil {
		t.Errorf("book_formats 不可查: %v", err)
	}
}
