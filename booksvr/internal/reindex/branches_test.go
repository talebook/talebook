package reindex

import (
	"database/sql"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// ---------- Diff.String 的备份行 ----------

func TestDiffStringIncludesBackupLine(t *testing.T) {
	d := Diff{BooksScanned: 1, BackupFile: "/tmp/x.bak"}
	if !strings.Contains(d.String(), "/tmp/x.bak") {
		t.Errorf("报告应含备份路径\n%s", d.String())
	}
}

func TestDiffStringWithoutBackupOmitsLine(t *testing.T) {
	d := Diff{BooksScanned: 1}
	if strings.Contains(d.String(), "备份文件") {
		t.Errorf("无备份时不应输出备份行\n%s", d.String())
	}
}

// ---------- Options.Now 注入 ----------

func TestOptionsNowUsesInjectedClock(t *testing.T) {
	fixed := time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
	o := Options{Now: func() time.Time { return fixed }}
	if got := o.now(); !got.Equal(fixed) {
		t.Errorf("now() = %v, want %v", got, fixed)
	}
}

func TestOptionsNowDefaultsToTimeNow(t *testing.T) {
	o := Options{}
	got := o.now()
	if got.IsZero() {
		t.Error("默认 now() 不应为零值")
	}
}

// ---------- 备份路径边界 ----------

func TestBackupPathIsDirectoryIsNotFatal(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	// 指向一个目录：备份应失败但不阻断重算
	diff, err := ReindexNormalize(db, Options{BackupPath: t.TempDir()})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BackupFile != "" {
		t.Errorf("目录路径不应产生备份，实际 %q", diff.BackupFile)
	}
	if diff.NormalizedFieldsUpdated != 1 {
		t.Errorf("NormalizedFieldsUpdated = %d, want 1（备份失败不应阻断重算）", diff.NormalizedFieldsUpdated)
	}
}

func TestBackupUsesInjectedClockInFilename(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "library.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	fixed := time.Date(2026, 10, 9, 12, 34, 56, 0, time.UTC)
	diff, err := ReindexNormalize(db, Options{
		BackupPath: dbPath,
		Now:        func() time.Time { return fixed },
	})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if !strings.Contains(diff.BackupFile, "20261009-123456") {
		t.Errorf("备份文件名应含注入的时间戳，实际 %q", diff.BackupFile)
	}
}

func TestBackupFileIsAbsolute(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "library.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if !filepath.IsAbs(diff.BackupFile) {
		t.Errorf("备份路径应为绝对路径，实际 %q", diff.BackupFile)
	}
}

// ---------- 空 work 清理 ----------

func TestReindexPrunesEmptyWorks(t *testing.T) {
	db := newTestDB(t)
	// 一个没有任何 book 引用的孤儿 work
	insertWork(t, db, 99, "孤儿", "孤儿", "孤儿\x1f孤儿", "孤儿", "孤儿")
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")

	if _, err := ReindexNormalize(db, Options{}); err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM works WHERE id = 99`).Scan(&n); err != nil {
		t.Fatalf("count: %v", err)
	}
	if n != 0 {
		t.Error("孤儿 work 应被清理")
	}
}

// ---------- book 无 work_id ----------

func TestReindexHandlesBookWithoutWorkID(t *testing.T) {
	db := newTestDB(t)
	insertBook(t, db, 10, "三体", "刘慈欣", nil, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BooksScanned != 1 {
		t.Errorf("BooksScanned = %d, want 1", diff.BooksScanned)
	}

	// 应被归入一个新建的 work
	var workID sql.NullInt64
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = 10`).Scan(&workID); err != nil {
		t.Fatalf("read work_id: %v", err)
	}
	if !workID.Valid {
		t.Error("重算后 book 应被归入 work")
	}
	if diff.WorksCreated != 1 {
		t.Errorf("WorksCreated = %d, want 1", diff.WorksCreated)
	}
}

// ---------- 错误路径 ----------

func TestReindexUpdateErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	// 用触发器让 UPDATE books 失败
	if _, err := db.Exec(`
		CREATE TRIGGER block_update BEFORE UPDATE ON books
		BEGIN
			SELECT RAISE(ABORT, 'update blocked');
		END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("UPDATE 失败时应返回 error")
	}
}

func TestReindexPruneErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")
	// 孤儿 work：确保 pruneEmptyWorks 真的会删行，从而触发触发器
	insertWork(t, db, 99, "孤儿", "孤儿", "孤儿\x1f孤儿", "孤儿", "孤儿")

	// 用触发器让 DELETE FROM works 失败
	if _, err := db.Exec(`
		CREATE TRIGGER block_delete BEFORE DELETE ON works
		BEGIN
			SELECT RAISE(ABORT, 'delete blocked');
		END`); err != nil {
		t.Fatalf("create trigger: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("DELETE 失败时应返回 error")
	}
}

func TestReindexMissingWorksTableIsError(t *testing.T) {
	db := newTestDB(t)
	insertBook(t, db, 10, "三体", "刘慈欣", nil, "", "旧", "旧")
	if _, err := db.Exec(`DROP TABLE works`); err != nil {
		t.Fatalf("drop works: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("works 表缺失时应返回 error")
	}
}

func TestReindexMissingEditionKeyColumnIsError(t *testing.T) {
	db := newTestDB(t)
	if _, err := db.Exec(`ALTER TABLE books RENAME COLUMN edition_key TO edition_key_x`); err != nil {
		t.Fatalf("rename column: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("edition_key 列缺失时应返回 error")
	}
}

// ---------- 备份文件内容完整性 ----------

func TestBackupPreservesRowCount(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "library.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")
	insertBook(t, db, 11, "流浪地球", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	backup, err := sql.Open("sqlite", diff.BackupFile)
	if err != nil {
		t.Fatalf("open backup: %v", err)
	}
	defer func() { _ = backup.Close() }()

	var n int
	if err := backup.QueryRow(`SELECT COUNT(*) FROM books`).Scan(&n); err != nil {
		t.Fatalf("count backup: %v", err)
	}
	if n != 2 {
		t.Errorf("备份里 book 数 = %d, want 2", n)
	}
}

func TestBackupFileHasNonZeroSize(t *testing.T) {
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "library.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	defer func() { _ = db.Close() }()

	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	info, err := os.Stat(diff.BackupFile)
	if err != nil {
		t.Fatalf("stat backup: %v", err)
	}
	if info.Size() == 0 {
		t.Error("备份文件不应为空")
	}
}

// ---------- 多作品合并计数 ----------

func TestReindexMergesThreeWorksIntoOne(t *testing.T) {
	db := newTestDB(t)
	// 三个 work，新规则下都应归为同一作品
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertWork(t, db, 2, "三體", "劉慈欣", "三體\x1f劉慈欣", "三體", "劉慈欣")
	insertWork(t, db, 3, "三体", "刘慈欣 著", "三体\x1f刘慈欣著", "三体", "刘慈欣 著")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")
	insertBook(t, db, 11, "三體", "劉慈欣", 2, "", "三體", "劉慈欣")
	insertBook(t, db, 12, "三体", "刘慈欣 著", 3, "", "三体", "刘慈欣著")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.WorksMerged != 2 {
		t.Errorf("WorksMerged = %d, want 2（三个 work 合为一个）", diff.WorksMerged)
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(DISTINCT work_id) FROM books`).Scan(&n); err != nil {
		t.Fatalf("count distinct: %v", err)
	}
	if n != 1 {
		t.Errorf("不同 work_id 数 = %d, want 1", n)
	}
}

// ---------- 单 work 单书不产生合并/拆分 ----------

func TestReindexSingleBookNoMergeOrSplit(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.WorksMerged != 0 || diff.WorksSplit != 0 {
		t.Errorf("单书不应产生合并/拆分: merged=%d split=%d", diff.WorksMerged, diff.WorksSplit)
	}
}

// ---------- 同一 work 下多书同 key 不算拆分 ----------

func TestReindexSameWorkSameKeyIsNotSplit(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")
	insertBook(t, db, 11, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.WorksSplit != 0 {
		t.Errorf("同 key 不应拆分，实际 WorksSplit = %d", diff.WorksSplit)
	}
}

// testTime 返回一个固定时间，供备份文件名断言使用。
func testTime() time.Time {
	return time.Date(2026, 10, 9, 12, 0, 0, 0, time.UTC)
}

// openFileDB 建一个落在磁盘上的已迁移库，供备份相关用例使用。
func openFileDB(t *testing.T, path string) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })

	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY, title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '', path TEXT NOT NULL DEFAULT '',
		timestamp INTEGER NOT NULL DEFAULT 0)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}
