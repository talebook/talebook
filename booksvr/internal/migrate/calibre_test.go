package migrate

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"

	"talebook/booksvr/internal/library"
)

// buildCalibreFixture creates a Calibre-shaped metadata.db with the tables the
// importer reads. It mirrors the real schema found in tests/cases/metadata.db.
func buildCalibreFixture(t *testing.T, dir string) string {
	t.Helper()
	path := filepath.Join(dir, "metadata.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	defer db.Close()

	ddl := []string{
		`CREATE TABLE books (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			title TEXT NOT NULL DEFAULT 'Unknown' COLLATE NOCASE,
			sort TEXT COLLATE NOCASE,
			timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			pubdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			series_index REAL NOT NULL DEFAULT 1.0,
			author_sort TEXT COLLATE NOCASE,
			isbn TEXT DEFAULT "" COLLATE NOCASE,
			lccn TEXT DEFAULT "" COLLATE NOCASE,
			path TEXT NOT NULL DEFAULT "",
			flags INTEGER NOT NULL DEFAULT 1
		)`,
		`CREATE TABLE authors (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL COLLATE NOCASE,
			sort TEXT COLLATE NOCASE,
			link TEXT NOT NULL DEFAULT "",
			UNIQUE(name)
		)`,
		`CREATE TABLE publishers (
			id INTEGER PRIMARY KEY,
			name TEXT NOT NULL COLLATE NOCASE,
			sort TEXT COLLATE NOCASE,
			UNIQUE(name)
		)`,
		`CREATE TABLE data (
			id INTEGER PRIMARY KEY,
			book INTEGER NOT NULL,
			format TEXT NOT NULL COLLATE NOCASE,
			uncompressed_size INTEGER NOT NULL,
			name TEXT NOT NULL,
			UNIQUE(book, format)
		)`,
		`CREATE TABLE books_authors_link (
			id INTEGER PRIMARY KEY,
			book INTEGER NOT NULL,
			author INTEGER NOT NULL,
			UNIQUE(book, author)
		)`,
		`CREATE TABLE books_publishers_link (
			id INTEGER PRIMARY KEY,
			book INTEGER NOT NULL,
			publisher INTEGER NOT NULL,
			UNIQUE(book)
		)`,
	}
	for _, stmt := range ddl {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("fixture ddl: %v", err)
		}
	}

	// Authors
	authors := []struct {
		id   int
		name string
	}{
		{1, "刘慈欣"},
		{2, "刘慈欣 著"}, // same author, role suffix -> must merge
		{3, "另一个人"},
	}
	for _, a := range authors {
		if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (?, ?)`, a.id, a.name); err != nil {
			t.Fatalf("insert author: %v", err)
		}
	}

	// Publishers
	publishers := []struct {
		id   int
		name string
	}{
		{1, "重庆出版社"},
		{2, "重慶出版社"}, // traditional form -> same publisher after normalization
	}
	for _, p := range publishers {
		if _, err := db.Exec(`INSERT INTO publishers (id, name) VALUES (?, ?)`, p.id, p.name); err != nil {
			t.Fatalf("insert publisher: %v", err)
		}
	}

	// Books: covers same-title-same-author, same-title-different-author,
	// multi-format, and a book with no publisher/pubdate (empty fingerprint).
	books := []struct {
		id       int
		title    string
		authorID int
		pubID    int // 0 = none
		pubdate  string
		path     string
	}{
		{1, "三体", 1, 1, "2008-01-01 00:00:00+00:00", "刘慈欣/三体 (1)"},
		{2, "三体", 2, 1, "2008-01-01 00:00:00+00:00", "刘慈欣/三体 (2)"},      // same edition as 1
		{3, "三体（第二版）", 1, 1, "2012-01-01 00:00:00+00:00", "刘慈欣/三体 (3)"}, // new edition
		{4, "三体", 1, 0, "", "刘慈欣/三体 (4)"},                               // empty fingerprint
		{5, "三体", 3, 1, "2008-01-01 00:00:00+00:00", "另一个人/三体 (5)"},     // different author
		{6, "三體", 1, 2, "2008-01-01 00:00:00+00:00", "刘慈欣/三体 (6)"},      // traditional -> same work+edition
	}
	for _, b := range books {
		if _, err := db.Exec(
			`INSERT INTO books (id, title, author_sort, path, pubdate) VALUES (?, ?, ?, ?, ?)`,
			b.id, b.title, "", b.path, b.pubdate,
		); err != nil {
			t.Fatalf("insert book: %v", err)
		}
		if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, ?)`, b.id, b.authorID); err != nil {
			t.Fatalf("link author: %v", err)
		}
		if b.pubID != 0 {
			if _, err := db.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, ?)`, b.id, b.pubID); err != nil {
				t.Fatalf("link publisher: %v", err)
			}
		}
	}

	// Formats: book 1 has EPUB+MOBI (same edition, two formats).
	formats := []struct {
		book   int
		format string
		size   int
		name   string
	}{
		{1, "EPUB", 1000, "三体 - 刘慈欣"},
		{1, "MOBI", 2000, "三体 - 刘慈欣"},
		{2, "EPUB", 3000, "三体 - 刘慈欣"},
		{3, "EPUB", 4000, "三体 - 刘慈欣"},
		{4, "PDF", 5000, "三体 - 刘慈欣"},
		{5, "EPUB", 6000, "三体 - 另一个人"},
		{6, "EPUB", 7000, "三體 - 劉慈欣"},
	}
	for _, f := range formats {
		if _, err := db.Exec(
			`INSERT INTO data (book, format, uncompressed_size, name) VALUES (?, ?, ?, ?)`,
			f.book, f.format, f.size, f.name,
		); err != nil {
			t.Fatalf("insert format: %v", err)
		}
	}

	return path
}

func openTargetDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open target: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`CREATE TABLE books (
		id INTEGER PRIMARY KEY,
		title TEXT NOT NULL DEFAULT '',
		author_sort TEXT NOT NULL DEFAULT '',
		path TEXT NOT NULL DEFAULT '',
		timestamp TEXT
	)`); err != nil {
		t.Fatalf("create books: %v", err)
	}
	if err := library.Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	return db
}

func fileHash(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read %s: %v", path, err)
	}
	sum := sha256.Sum256(data)
	return hex.EncodeToString(sum[:])
}

func countRows(t *testing.T, db *sql.DB, table string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&n); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	return n
}

func TestImportCalibreGroupsCorrectly(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)
	target := openTargetDB(t)

	report, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}

	// Works: 三体/刘慈欣 (books 1,2,3,4,6) and 三体/另一个人 (book 5).
	if got := countRows(t, target, "works"); got != 2 {
		t.Errorf("works = %d, want 2", got)
	}
	if report.Works != 2 {
		t.Errorf("report.Works = %d, want 2", report.Works)
	}

	// Editions under 三体/刘慈欣:
	//   1+2+6 share 重庆出版社/2008 -> one edition (3 formats: EPUB, MOBI, EPUB)
	//   3 is 重庆出版社/2012         -> second edition
	//   4 has no fingerprint         -> third edition
	// Plus 三体/另一个人 -> one edition. Total 4.
	if got := countRows(t, target, "books"); got != 4 {
		t.Errorf("books = %d, want 4", got)
	}
	if report.Editions != 4 {
		t.Errorf("report.Editions = %d, want 4", report.Editions)
	}

	// Formats: the fixture has 7 format rows, but books 1/2/6 share one edition
	// and all three carry EPUB, so two EPUB rows collapse into the existing one.
	// Stored: edition A {EPUB, MOBI} + B {EPUB} + C {PDF} + D {EPUB} = 5.
	if got := countRows(t, target, "book_formats"); got != 5 {
		t.Errorf("book_formats = %d, want 5", got)
	}
	if report.Formats != 5 {
		t.Errorf("report.Formats = %d, want 5", report.Formats)
	}

	// Book 4 has no publisher/pubdate -> empty fingerprint.
	if report.EmptyFingerprints != 1 {
		t.Errorf("report.EmptyFingerprints = %d, want 1", report.EmptyFingerprints)
	}
}

func TestImportCalibreReportFields(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)
	target := openTargetDB(t)

	report, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}

	// Every report field must be populated (no zero-value placeholders).
	if report.SourceBooks != 6 {
		t.Errorf("report.SourceBooks = %d, want 6", report.SourceBooks)
	}
	if report.Works == 0 || report.Editions == 0 || report.Formats == 0 {
		t.Errorf("report has empty counters: %+v", report)
	}
	if report.Merged == 0 {
		t.Errorf("report.Merged = 0, want > 0 (books 1/2/6 share an edition)")
	}
	if report.Duration <= 0 {
		t.Errorf("report.Duration = %v, want > 0", report.Duration)
	}
}

func TestImportCalibreIsIdempotent(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)
	target := openTargetDB(t)

	first, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("first import: %v", err)
	}
	works1 := countRows(t, target, "works")
	books1 := countRows(t, target, "books")
	formats1 := countRows(t, target, "book_formats")

	second, err := ImportCalibre(target, src, dir)
	if err != nil {
		t.Fatalf("second import: %v", err)
	}

	if got := countRows(t, target, "works"); got != works1 {
		t.Errorf("works changed across runs: %d -> %d", works1, got)
	}
	if got := countRows(t, target, "books"); got != books1 {
		t.Errorf("books changed across runs: %d -> %d", books1, got)
	}
	if got := countRows(t, target, "book_formats"); got != formats1 {
		t.Errorf("formats changed across runs: %d -> %d", formats1, got)
	}
	// 结果状态必须完全一致。
	first.Duration, second.Duration = 0, 0
	if second.Works != first.Works || second.Editions != first.Editions ||
		second.Formats != first.Formats || second.SourceBooks != first.SourceBooks ||
		second.EmptyFingerprints != first.EmptyFingerprints || second.Skipped != first.Skipped {
		t.Errorf("report state differs across runs:\n  first  = %+v\n  second = %+v", first, second)
	}

	// 合并类计数描述的是「本次运行做了什么」，不是「库里有什么」：
	// 第一次运行完成全部合并，重跑时已无新合并可做，必须归零。
	// 若重跑仍报出合并，说明计数把「命中已有行」误当成了新合并。
	if second.Merged != 0 {
		t.Errorf("second run should report merged=0, got %d", second.Merged)
	}
	if second.DuplicateFormats != 0 {
		t.Errorf("second run should report duplicate_formats=0, got %d", second.DuplicateFormats)
	}
}

func TestImportCalibreDoesNotModifySource(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)
	target := openTargetDB(t)

	before := fileHash(t, src)
	infoBefore, err := os.Stat(src)
	if err != nil {
		t.Fatalf("stat before: %v", err)
	}

	if _, err := ImportCalibre(target, src, dir); err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}

	after := fileHash(t, src)
	if before != after {
		t.Errorf("source database was modified:\n  before = %s\n  after  = %s", before, after)
	}
	infoAfter, err := os.Stat(src)
	if err != nil {
		t.Fatalf("stat after: %v", err)
	}
	if infoAfter.Size() != infoBefore.Size() {
		t.Errorf("source size changed: %d -> %d", infoBefore.Size(), infoAfter.Size())
	}
}

func TestImportCalibreMissingSource(t *testing.T) {
	dir := t.TempDir()
	target := openTargetDB(t)

	if _, err := ImportCalibre(target, filepath.Join(dir, "nope.db"), dir); err == nil {
		t.Error("ImportCalibre with a missing source should error")
	}
}

func TestImportCalibreRecordsAbsolutePaths(t *testing.T) {
	dir := t.TempDir()
	src := buildCalibreFixture(t, dir)
	target := openTargetDB(t)

	if _, err := ImportCalibre(target, src, dir); err != nil {
		t.Fatalf("ImportCalibre: %v", err)
	}

	rows, err := target.Query(`SELECT path FROM book_formats`)
	if err != nil {
		t.Fatalf("query paths: %v", err)
	}
	defer rows.Close()
	n := 0
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			t.Fatalf("scan path: %v", err)
		}
		if !filepath.IsAbs(p) {
			t.Errorf("path %q is not absolute", p)
		}
		n++
	}
	if n == 0 {
		t.Error("no formats were imported")
	}
}
