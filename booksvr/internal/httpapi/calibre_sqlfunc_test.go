package httpapi

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// 本文件回归真实缺陷：Calibre 书库的 books_insert_trg 触发器调用
// title_sort() 与 uuid4() 两个自定义 SQL 函数，它们由 Calibre 在连接上注册。
// Go 侧未注册时，任何 INSERT INTO books 都会报 `no such function: title_sort`，
// 导致真实书库导入失败。
//
// 单元测试库此前没建这个触发器，所以缺陷没被暴露。

// newCalibreTriggerDB 建一个带 books_insert_trg 触发器的书库（复刻真实 schema）。
func newCalibreTriggerDB(t *testing.T) (*sql.DB, string) {
	t.Helper()
	registerCalibreFunctions()

	path := filepath.Join(t.TempDir(), "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	stmts := []string{
		`CREATE TABLE books (
			id INTEGER PRIMARY KEY,
			title TEXT NOT NULL DEFAULT '',
			sort TEXT,
			author_sort TEXT,
			path TEXT,
			timestamp TEXT,
			uuid TEXT,
			has_cover BOOLEAN DEFAULT 0,
			last_modified TEXT
		)`,
		// 与真实 Calibre schema 一致：插入后由触发器补 sort 与 uuid。
		`CREATE TRIGGER books_insert_trg AFTER INSERT ON books
		BEGIN
			UPDATE books SET sort=title_sort(NEW.title),uuid=uuid4() WHERE id=NEW.id;
		END`,
	}
	for _, s := range stmts {
		if _, err := db.Exec(s); err != nil {
			t.Fatalf("建表/触发器失败: %v\n%s", err, s)
		}
	}
	return db, path
}

// TestTitleSort 复刻 Calibre title_sort 的关键行为。
func TestTitleSort(t *testing.T) {
	cases := map[string]string{
		"The Hobbit":     "Hobbit, The",
		"A Tale of Two":  "Tale of Two, A",
		"An Apple":       "Apple, An",
		"Red Star":       "Red Star",
		"the lower":      "lower, the",
		"  The Spaced  ": "Spaced, The",
		"《三体》":           "三体",
		"“Quoted Title”": "Quoted Title",
		"":               "",
		"The":            "The",
		"【精排】红星照耀中国":     "精排】红星照耀中国",
	}
	for in, want := range cases {
		if got := titleSort(in); got != want {
			t.Errorf("titleSort(%q) = %q, want %q", in, got, want)
		}
	}
}

// TestUUID4Shape uuid4 返回标准 v4 形态。
func TestUUID4Shape(t *testing.T) {
	got := uuid4()
	if len(got) != 36 {
		t.Fatalf("长度 = %d, want 36: %q", len(got), got)
	}
	if got[14] != '4' {
		t.Errorf("版本位 = %c, want 4: %q", got[14], got)
	}
	if got[8] != '-' || got[13] != '-' || got[18] != '-' || got[23] != '-' {
		t.Errorf("连字符位置不对: %q", got)
	}
	if uuid4() == got {
		t.Error("两次调用应返回不同值")
	}
}

// TestInsertBookWithCalibreTrigger 插入书籍时触发器可正常求值。
//
// 这是缺陷的直接回归：未注册 title_sort 时该 INSERT 会失败。
func TestInsertBookWithCalibreTrigger(t *testing.T) {
	db, _ := newCalibreTriggerDB(t)

	if _, err := db.Exec(
		`INSERT INTO books (title, path, timestamp) VALUES (?, ?, ?)`,
		"The Hobbit", "Tolkien/Hobbit (1)", "2026-01-01 00:00:00"); err != nil {
		t.Fatalf("插入书籍失败（触发器求值出错）: %v", err)
	}

	var sort, uuid string
	if err := db.QueryRow(`SELECT sort, uuid FROM books WHERE id = 1`).Scan(&sort, &uuid); err != nil {
		t.Fatalf("读回失败: %v", err)
	}
	if sort != "Hobbit, The" {
		t.Errorf("sort = %q, want %q", sort, "Hobbit, The")
	}
	if len(uuid) != 36 {
		t.Errorf("uuid = %q，形态不对", uuid)
	}
}

// TestInsertChineseTitleWithTrigger 中文书名同样可插入（无冠词时不改写）。
func TestInsertChineseTitleWithTrigger(t *testing.T) {
	db, _ := newCalibreTriggerDB(t)

	if _, err := db.Exec(
		`INSERT INTO books (title, path, timestamp) VALUES (?, ?, ?)`,
		"红星照耀中国", "佚名/红星照耀中国 (1)", "2026-01-01 00:00:00"); err != nil {
		t.Fatalf("插入中文书籍失败: %v", err)
	}

	var sort string
	if err := db.QueryRow(`SELECT sort FROM books WHERE id = 1`).Scan(&sort); err != nil {
		t.Fatalf("读回失败: %v", err)
	}
	if sort != "红星照耀中国" {
		t.Errorf("sort = %q, want 红星照耀中国", sort)
	}
}
