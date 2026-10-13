package library

import (
	"database/sql"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// openGroupDB returns a migrated in-memory database with the minimal books
// table the grouping logic extends.
func openGroupDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
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
	if err := Migrate(db); err != nil {
		t.Fatalf("Migrate: %v", err)
	}
	return db
}

func countRows(t *testing.T, db *sql.DB, table string) int {
	t.Helper()
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM ` + table).Scan(&n); err != nil {
		t.Fatalf("count %s: %v", table, err)
	}
	return n
}

// TestGroupFileSanTiScenario is the acceptance test from the plan: importing
// four 《三体》 files must yield exactly 1 work / 3 books / 4 formats.
func TestGroupFileSanTiScenario(t *testing.T) {
	db := openGroupDB(t)

	// 1. 三体.epub (重庆社/2008) -> new work + new book + 1 format
	r1, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/books/三体.epub", Size: 1000, Mtime: 1,
	})
	if err != nil {
		t.Fatalf("import 三体.epub: %v", err)
	}
	if !r1.Created {
		t.Error("first import should create a new book")
	}
	if got := countRows(t, db, "works"); got != 1 {
		t.Fatalf("after 1st import: works = %d, want 1", got)
	}
	if got := countRows(t, db, "books"); got != 1 {
		t.Fatalf("after 1st import: books = %d, want 1", got)
	}
	if got := countRows(t, db, "book_formats"); got != 1 {
		t.Fatalf("after 1st import: formats = %d, want 1", got)
	}

	// 2. 三体.mobi (same edition) -> reuse the same book, formats become 2
	r2, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "MOBI", Path: "/books/三体.mobi", Size: 2000, Mtime: 2,
	})
	if err != nil {
		t.Fatalf("import 三体.mobi: %v", err)
	}
	if r2.Created {
		t.Error("same edition should reuse the existing book")
	}
	if r2.BookID != r1.BookID {
		t.Errorf("same edition should share book id: got %d, want %d", r2.BookID, r1.BookID)
	}
	if got := countRows(t, db, "books"); got != 1 {
		t.Fatalf("after 2nd import: books = %d, want 1", got)
	}
	if got := countRows(t, db, "book_formats"); got != 2 {
		t.Fatalf("after 2nd import: formats = %d, want 2", got)
	}

	// 3. 三体（第二版）.epub (重庆社/2012) -> same work, new book
	r3, err := GroupFile(db, BookMeta{
		Title: "三体（第二版）", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2012",
		Format: "EPUB", Path: "/books/三体第二版.epub", Size: 3000, Mtime: 3,
	})
	if err != nil {
		t.Fatalf("import 三体（第二版）.epub: %v", err)
	}
	if !r3.Created {
		t.Error("a different edition should create a new book")
	}
	if r3.WorkID != r1.WorkID {
		t.Errorf("same work expected: got %d, want %d", r3.WorkID, r1.WorkID)
	}
	if got := countRows(t, db, "books"); got != 2 {
		t.Fatalf("after 3rd import: books = %d, want 2", got)
	}

	// 4. 三体.pdf (no fingerprint) -> same work, new book (never auto-merged)
	r4, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣",
		Format: "PDF", Path: "/books/三体.pdf", Size: 4000, Mtime: 4,
	})
	if err != nil {
		t.Fatalf("import 三体.pdf: %v", err)
	}
	if !r4.Created {
		t.Error("an empty fingerprint must create its own book")
	}
	if r4.WorkID != r1.WorkID {
		t.Errorf("same work expected: got %d, want %d", r4.WorkID, r1.WorkID)
	}

	// Final acceptance: 1 work / 3 books / 4 formats
	if got := countRows(t, db, "works"); got != 1 {
		t.Errorf("FINAL: works = %d, want 1", got)
	}
	if got := countRows(t, db, "books"); got != 3 {
		t.Errorf("FINAL: books = %d, want 3", got)
	}
	if got := countRows(t, db, "book_formats"); got != 4 {
		t.Errorf("FINAL: formats = %d, want 4", got)
	}
}

func TestGroupFileEmptyEditionKeyDoesNotMerge(t *testing.T) {
	db := openGroupDB(t)

	// Two files with no publisher/pubdate/translator must NOT be merged.
	a, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "PDF", Path: "/a.pdf", Size: 1})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "TXT", Path: "/b.txt", Size: 1})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}
	if a.BookID == b.BookID {
		t.Error("books with an empty edition_key must not be auto-merged")
	}
	if got := countRows(t, db, "books"); got != 2 {
		t.Errorf("books = %d, want 2", got)
	}
	if got := countRows(t, db, "works"); got != 1 {
		t.Errorf("works = %d, want 1", got)
	}
}

func TestGroupFileDuplicateFormatReturnsSamebook(t *testing.T) {
	db := openGroupDB(t)

	meta := BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/books/三体.epub", Size: 1000, Mtime: 1,
	}
	first, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("first import: %v", err)
	}
	if first.Status != "ok" {
		t.Errorf("first import status = %q, want \"ok\"", first.Status)
	}

	second, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("second import: %v", err)
	}
	if second.Status != "samebook" {
		t.Errorf("duplicate format status = %q, want \"samebook\"", second.Status)
	}
	if second.BookID != first.BookID {
		t.Errorf("duplicate should resolve to the same book: %d vs %d", second.BookID, first.BookID)
	}
	if got := countRows(t, db, "book_formats"); got != 1 {
		t.Errorf("formats = %d, want 1 (no duplicate row)", got)
	}
}

func TestGroupFileDifferentAuthorsDifferentWorks(t *testing.T) {
	db := openGroupDB(t)

	a, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{Title: "三体", Author: "另一个人", Format: "EPUB", Path: "/b.epub", Size: 1})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}
	if a.WorkID == b.WorkID {
		t.Error("different authors must produce different works")
	}
	if got := countRows(t, db, "works"); got != 2 {
		t.Errorf("works = %d, want 2", got)
	}
}

func TestGroupFileNormalizesAcrossScripts(t *testing.T) {
	db := openGroupDB(t)

	// 繁體 + 版本后缀 + 作者角色词 must all land in the same work.
	a, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 1,
	})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{
		Title: "三體（第二版）", Author: "刘慈欣 著", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "MOBI", Path: "/b.mobi", Size: 1,
	})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}
	if a.WorkID != b.WorkID {
		t.Errorf("繁简/后缀/角色词差异应归入同一作品: %d vs %d", a.WorkID, b.WorkID)
	}
	// Same publisher+pubdate, but b carries a version suffix -> different edition.
	if a.BookID == b.BookID {
		t.Error("a version suffix must produce a distinct edition")
	}
}

func TestGroupFileStoresAbsolutePath(t *testing.T) {
	db := openGroupDB(t)

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/books/三体.epub", Size: 1234, Mtime: 5678,
	})
	if err != nil {
		t.Fatalf("import: %v", err)
	}

	var path, format string
	var size, mtime int64
	err = db.QueryRow(`SELECT path, format, size, mtime FROM book_formats WHERE book_id = ?`, r.BookID).
		Scan(&path, &format, &size, &mtime)
	if err != nil {
		t.Fatalf("query format: %v", err)
	}
	// The stored path must be absolute and must still point at the source file
	// (no copying, no renaming). Compare against filepath.Abs so the assertion
	// holds on both POSIX and Windows.
	wantPath, absErr := filepath.Abs("/books/三体.epub")
	if absErr != nil {
		t.Fatalf("filepath.Abs: %v", absErr)
	}
	if path != wantPath {
		t.Errorf("path = %q, want %q", path, wantPath)
	}
	if !filepath.IsAbs(path) {
		t.Errorf("path %q is not absolute", path)
	}
	if filepath.Base(path) != "三体.epub" {
		t.Errorf("filename changed: %q", filepath.Base(path))
	}
	if format != "EPUB" {
		t.Errorf("format = %q, want \"EPUB\"", format)
	}
	if size != 1234 || mtime != 5678 {
		t.Errorf("size/mtime = %d/%d, want 1234/5678", size, mtime)
	}
}

func TestGroupFileWorkKeyPersisted(t *testing.T) {
	db := openGroupDB(t)

	if _, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 1,
	}); err != nil {
		t.Fatalf("import: %v", err)
	}

	var titleNorm, authorNorm, workKey string
	err := db.QueryRow(`SELECT title_norm, author_norm, work_key FROM works`).Scan(&titleNorm, &authorNorm, &workKey)
	if err != nil {
		t.Fatalf("query work: %v", err)
	}
	if titleNorm != "三体" {
		t.Errorf("title_norm = %q, want \"三体\"", titleNorm)
	}
	if authorNorm != "刘慈欣" {
		t.Errorf("author_norm = %q, want \"刘慈欣\"", authorNorm)
	}
	if workKey != "三体\x1f刘慈欣" {
		t.Errorf("work_key = %q, want \"三体\\x1f刘慈欣\"", workKey)
	}
}

func TestGroupFileEditionKeyPersisted(t *testing.T) {
	db := openGroupDB(t)

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 1,
	})
	if err != nil {
		t.Fatalf("import: %v", err)
	}

	var editionKey string
	if err := db.QueryRow(`SELECT edition_key FROM books WHERE id = ?`, r.BookID).Scan(&editionKey); err != nil {
		t.Fatalf("query edition_key: %v", err)
	}
	if editionKey != "重庆出版社\x1f2008\x1f-" {
		t.Errorf("edition_key = %q, want \"重庆出版社\\x1f2008\\x1f-\"", editionKey)
	}
}
