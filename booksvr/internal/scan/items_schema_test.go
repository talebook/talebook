package scan

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// 缺陷 6 回归：真实 items 表有 6 个 NOT NULL 且无默认值的列。
//
// 测试夹具 importTestDB 给每列都加了 DEFAULT，因此掩盖了这个缺陷；
// 真实 schema（webserver 的 models.py / 迁移产物）没有默认值，
// 只插 5 列会报 `NOT NULL constraint failed: items.count_guest`。
//
// 本测试用与真实库一致的严格 schema，确保插入语句覆盖全部 NOT NULL 列。

// strictItemsDB 建一个与真实 items 表约束一致的库。
func strictItemsDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	db.SetMaxOpenConns(1)

	// 与 internal/userdb/testdata/schema.sql 的 items 定义一致：
	// 全部 NOT NULL，且没有 DEFAULT。
	ddl := []string{
		`CREATE TABLE scanfiles (id INTEGER PRIMARY KEY AUTOINCREMENT, scan_id INTEGER DEFAULT 0,
			import_id INTEGER DEFAULT 0, name TEXT, path TEXT, hash TEXT UNIQUE, status TEXT,
			title TEXT, author TEXT, publisher TEXT, tags TEXT, create_time TEXT, update_time TEXT,
			book_id INTEGER DEFAULT 0, data TEXT DEFAULT '{}')`,
		`CREATE TABLE items (
			book_id INTEGER NOT NULL,
			count_guest INTEGER NOT NULL,
			count_visit INTEGER NOT NULL,
			count_download INTEGER NOT NULL,
			website VARCHAR(255) NOT NULL,
			collector_id INTEGER,
			scope VARCHAR(50) NOT NULL,
			book_type VARCHAR(20) NOT NULL,
			media_type VARCHAR(20) NOT NULL,
			media_type_locked BOOLEAN NOT NULL,
			create_time DATETIME,
			src_path VARCHAR(4096) NOT NULL,
			PRIMARY KEY (book_id)
		)`,
	}
	for _, s := range ddl {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表失败: %v\n%s", err, s)
		}
	}
	return db
}

func TestSetItemMediaTypeInsertsAllNotNullColumns(t *testing.T) {
	db := strictItemsDB(t)
	svc := &Service{DB: db}

	if err := svc.setItemMediaType(1, 7, "ebook"); err != nil {
		t.Fatalf("setItemMediaType 在严格 schema 下失败: %v", err)
	}

	var guest, visit, download int
	var website, scope, bookType, mediaType, srcPath string
	var locked int
	err := db.QueryRow(`SELECT count_guest, count_visit, count_download, website,
		scope, book_type, media_type, media_type_locked, src_path
		FROM items WHERE book_id = 1`).Scan(
		&guest, &visit, &download, &website, &scope, &bookType, &mediaType, &locked, &srcPath)
	if err != nil {
		t.Fatalf("查询 items 失败: %v", err)
	}

	if guest != 0 || visit != 0 || download != 0 {
		t.Errorf("计数器应为 0，得到 guest=%d visit=%d download=%d", guest, visit, download)
	}
	if scope != "public" {
		t.Errorf("scope = %q, want public", scope)
	}
	if bookType != "ebook" {
		t.Errorf("book_type = %q, want ebook", bookType)
	}
	if mediaType != "ebook" {
		t.Errorf("media_type = %q, want ebook", mediaType)
	}
	if locked != 0 {
		t.Errorf("media_type_locked = %d, want 0", locked)
	}
}

// TestSetItemMediaTypeMergesExisting 保证已有行时走合并分支而非插入。
func TestSetItemMediaTypeMergesExisting(t *testing.T) {
	db := strictItemsDB(t)
	svc := &Service{DB: db}

	if err := svc.setItemMediaType(1, 7, "ebook"); err != nil {
		t.Fatalf("首次插入失败: %v", err)
	}
	if err := svc.setItemMediaType(1, 7, "audiobook"); err != nil {
		t.Fatalf("合并失败: %v", err)
	}

	var mediaType string
	if err := db.QueryRow(`SELECT media_type FROM items WHERE book_id = 1`).Scan(&mediaType); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if mediaType == "" {
		t.Error("media_type 不应为空")
	}
}
