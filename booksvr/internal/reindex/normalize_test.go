package reindex

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// newTestDB 建一个已迁移的内存库。
//
// Migrate 是「扩展既有 books 表」而非「从零建表」，因此先建最小 Calibre 风格表。
func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
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
	return db
}

// insertBook 直接插入一行 book，绕过归一化，用于构造「陈旧」数据。
func insertBook(t *testing.T, db *sql.DB, id int64, title, author string, workID any, editionKey, titleNorm, authorNorm string) {
	t.Helper()
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path, timestamp, work_id, edition_key, title_norm, author_norm)
		 VALUES (?, ?, ?, '', 0, ?, ?, ?, ?)`,
		id, title, author, workID, editionKey, titleNorm, authorNorm,
	); err != nil {
		t.Fatalf("insert book %d: %v", id, err)
	}
}

// insertWork 直接插入一行 work。
func insertWork(t *testing.T, db *sql.DB, id int64, titleNorm, authorNorm, workKey, displayTitle, displayAuthor string) {
	t.Helper()
	if _, err := db.Exec(
		`INSERT INTO works (id, title_norm, author_norm, work_key, display_title, display_author, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, 0, 0)`,
		id, titleNorm, authorNorm, workKey, displayTitle, displayAuthor,
	); err != nil {
		t.Fatalf("insert work %d: %v", id, err)
	}
}

// ---------- 差异报告 ----------

func TestReindexReportsStaleNormalizedFields(t *testing.T) {
	db := newTestDB(t)
	// 陈旧数据：title_norm 与真实标题不符
	insertWork(t, db, 1, "旧", "旧", "旧\x1f旧", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.BooksScanned != 1 {
		t.Errorf("BooksScanned = %d, want 1", diff.BooksScanned)
	}
	if diff.NormalizedFieldsUpdated != 1 {
		t.Errorf("NormalizedFieldsUpdated = %d, want 1", diff.NormalizedFieldsUpdated)
	}
}

func TestReindexReportsNoChangeWhenAlreadyCorrect(t *testing.T) {
	db := newTestDB(t)
	workID, err := library.FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("create work: %v", err)
	}
	if _, _, err := library.FindOrCreateEdition(db, workID, library.BookMeta{Title: "三体", Author: "刘慈欣"}); err != nil {
		t.Fatalf("create edition: %v", err)
	}

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.NormalizedFieldsUpdated != 0 {
		t.Errorf("NormalizedFieldsUpdated = %d, want 0（数据已正确）", diff.NormalizedFieldsUpdated)
	}
	if diff.WorksCreated != 0 {
		t.Errorf("WorksCreated = %d, want 0", diff.WorksCreated)
	}
}

func TestReindexMergesWorksThatNowShareKey(t *testing.T) {
	db := newTestDB(t)
	// 模拟「旧规则把繁简当作不同作品」的陈旧状态：
	// 两个 work 的 work_key 不同（旧规则），但新规则下应归为同一作品。
	//
	// 注意 works.work_key 有 UNIQUE 约束，因此两个 work 不能共用同一个 key；
	// 这里用旧规则下的不同 key 建模，重算后两书应被合并到同一 work。
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertWork(t, db, 2, "三體", "劉慈欣", "三體\x1f劉慈欣", "三體", "劉慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")
	insertBook(t, db, 11, "三體", "劉慈欣", 2, "", "三體", "劉慈欣")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.WorksMerged != 1 {
		t.Errorf("WorksMerged = %d, want 1", diff.WorksMerged)
	}

	// 两本书必须归入同一 work（繁简归一后 work_key 相同）
	var w1, w2 int64
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = 10`).Scan(&w1); err != nil {
		t.Fatalf("read book 10: %v", err)
	}
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = 11`).Scan(&w2); err != nil {
		t.Fatalf("read book 11: %v", err)
	}
	if w1 != w2 {
		t.Errorf("归一化后两书 work_id 应相同: %d vs %d", w1, w2)
	}
}

func TestReindexSplitsWorksThatNoLongerShareKey(t *testing.T) {
	db := newTestDB(t)
	// 一个 work 下两本书，归一化后 work_key 不同（模拟规则变更后应拆分）
	insertWork(t, db, 1, "旧", "旧", "旧\x1f旧", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")
	insertBook(t, db, 11, "流浪地球", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.WorksSplit != 1 {
		t.Errorf("WorksSplit = %d, want 1", diff.WorksSplit)
	}

	var w1, w2 int64
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = 10`).Scan(&w1); err != nil {
		t.Fatalf("read book 10: %v", err)
	}
	if err := db.QueryRow(`SELECT work_id FROM books WHERE id = 11`).Scan(&w2); err != nil {
		t.Fatalf("read book 11: %v", err)
	}
	if w1 == w2 {
		t.Errorf("归一化后两书应分属不同 work，实际都是 %d", w1)
	}
}

func TestReindexRecomputesEditionKey(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	// edition_key 为空，但标题带版本后缀 → 重算后应非空
	insertBook(t, db, 10, "三体（第二版）", "刘慈欣", 1, "", "三体", "刘慈欣")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.EditionKeysUpdated != 1 {
		t.Errorf("EditionKeysUpdated = %d, want 1", diff.EditionKeysUpdated)
	}

	var key string
	if err := db.QueryRow(`SELECT edition_key FROM books WHERE id = 10`).Scan(&key); err != nil {
		t.Fatalf("read edition_key: %v", err)
	}
	if key == "" {
		t.Error("edition_key 重算后不应为空（标题带版本后缀）")
	}
}

func TestReindexReportsEmptyEditionKeyCount(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "三体", "刘慈欣")
	insertBook(t, db, 11, "三体（第二版）", "刘慈欣", 1, "", "三体", "刘慈欣")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	// 无出版社/版次/译者的书 edition_key 为空
	if diff.EmptyEditionKeys != 1 {
		t.Errorf("EmptyEditionKeys = %d, want 1", diff.EmptyEditionKeys)
	}
}

func TestReindexEmptyLibrary(t *testing.T) {
	db := newTestDB(t)

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BooksScanned != 0 {
		t.Errorf("BooksScanned = %d, want 0", diff.BooksScanned)
	}
	if diff.String() == "" {
		t.Error("空库的报告不应为空字符串")
	}
}

// ---------- 备份 ----------

func TestReindexBacksUpDatabaseFile(t *testing.T) {
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

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	if diff.BackupFile == "" {
		t.Fatal("BackupFile 不应为空")
	}
	if _, err := os.Stat(diff.BackupFile); err != nil {
		t.Fatalf("备份文件不存在: %v", err)
	}
}

func TestReindexBackupIsReadableSQLite(t *testing.T) {
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

	diff, err := ReindexNormalize(db, Options{BackupPath: dbPath})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}

	// 备份必须是一个可打开的 SQLite 库，且含重算前的数据
	backup, err := sql.Open("sqlite", diff.BackupFile)
	if err != nil {
		t.Fatalf("open backup: %v", err)
	}
	defer func() { _ = backup.Close() }()

	var titleNorm string
	if err := backup.QueryRow(`SELECT title_norm FROM books WHERE id = 10`).Scan(&titleNorm); err != nil {
		t.Fatalf("read backup: %v", err)
	}
	if titleNorm != "旧" {
		t.Errorf("备份里的 title_norm = %q, want %q（应为重算前的值）", titleNorm, "旧")
	}
}

func TestReindexNoBackupWhenPathEmpty(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	diff, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.BackupFile != "" {
		t.Errorf("未指定 BackupPath 时不应产生备份，实际 %q", diff.BackupFile)
	}
}

func TestReindexBackupMissingFileIsNotFatal(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "三体", "刘慈欣", "三体\x1f刘慈欣", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")

	// 指向一个不存在的文件：备份应被跳过，重算照常进行
	diff, err := ReindexNormalize(db, Options{BackupPath: filepath.Join(t.TempDir(), "nope.db")})
	if err != nil {
		t.Fatalf("ReindexNormalize: %v", err)
	}
	if diff.NormalizedFieldsUpdated != 1 {
		t.Errorf("NormalizedFieldsUpdated = %d, want 1（备份失败不应阻断重算）", diff.NormalizedFieldsUpdated)
	}
}

// ---------- 报告 ----------

func TestDiffStringMentionsAllCounters(t *testing.T) {
	d := Diff{
		BooksScanned:            10,
		NormalizedFieldsUpdated: 3,
		EditionKeysUpdated:      2,
		WorksCreated:            1,
		WorksMerged:             4,
		WorksSplit:              5,
		EmptyEditionKeys:        6,
	}
	s := d.String()
	for _, want := range []string{"10", "3", "2", "1", "4", "5", "6"} {
		if !contains(s, want) {
			t.Errorf("报告缺少计数 %q\n%s", want, s)
		}
	}
}

func contains(haystack, needle string) bool {
	return len(haystack) >= len(needle) && indexOf(haystack, needle) >= 0
}

func indexOf(haystack, needle string) int {
	for i := 0; i+len(needle) <= len(haystack); i++ {
		if haystack[i:i+len(needle)] == needle {
			return i
		}
	}
	return -1
}

// ---------- 幂等 ----------

func TestReindexIsIdempotent(t *testing.T) {
	db := newTestDB(t)
	insertWork(t, db, 1, "旧", "旧", "旧\x1f旧", "三体", "刘慈欣")
	insertBook(t, db, 10, "三体", "刘慈欣", 1, "", "旧", "旧")
	insertBook(t, db, 11, "三体（第二版）", "刘慈欣", 1, "", "旧", "旧")

	first, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("first reindex: %v", err)
	}
	second, err := ReindexNormalize(db, Options{})
	if err != nil {
		t.Fatalf("second reindex: %v", err)
	}

	if second.NormalizedFieldsUpdated != 0 {
		t.Errorf("第二次重算 NormalizedFieldsUpdated = %d, want 0（幂等）", second.NormalizedFieldsUpdated)
	}
	if second.WorksMerged != 0 || second.WorksSplit != 0 {
		t.Errorf("第二次重算不应再合并/拆分: merged=%d split=%d", second.WorksMerged, second.WorksSplit)
	}
	if first.BooksScanned != second.BooksScanned {
		t.Errorf("两次扫描书数应相同: %d vs %d", first.BooksScanned, second.BooksScanned)
	}
}

// ---------- 错误路径 ----------

func TestReindexDBErrorPropagates(t *testing.T) {
	db := newTestDB(t)
	if err := db.Close(); err != nil {
		t.Fatalf("close: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("数据库不可用时应返回 error")
	}
}

func TestReindexMissingBooksTableIsError(t *testing.T) {
	db := newTestDB(t)
	if _, err := db.Exec(`DROP TABLE books`); err != nil {
		t.Fatalf("drop books: %v", err)
	}

	if _, err := ReindexNormalize(db, Options{}); err == nil {
		t.Error("books 表缺失时应返回 error")
	}
}
