package library

import (
	"database/sql"
	"testing"

	_ "modernc.org/sqlite"
)

// 关闭的数据库用于覆盖各函数的错误返回路径（真实失败，非 mock）。

func closedDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = db.Close()
	return db
}

func TestErrorPathsOnClosedDB(t *testing.T) {
	db := closedDB(t)

	if _, err := FindOrCreateWork(db, "三体", "刘慈欣"); err == nil {
		t.Error("FindOrCreateWork should error on a closed db")
	}
	if _, err := GetWork(db, 1); err == nil {
		t.Error("GetWork should error on a closed db")
	}
	if _, err := ListVersions(db, 1); err == nil {
		t.Error("ListVersions should error on a closed db")
	}
	if _, _, err := FindOrCreateEdition(db, 1, BookMeta{Title: "三体", Author: "刘慈欣"}); err == nil {
		t.Error("FindOrCreateEdition should error on a closed db")
	}
	if _, err := GetBookWorkID(db, 1); err == nil {
		t.Error("GetBookWorkID should error on a closed db")
	}
	if err := SetBookWorkID(db, 1, 2); err == nil {
		t.Error("SetBookWorkID should error on a closed db")
	}
	if err := RegisterFormat(db, 1, "EPUB", "/a.epub", 1, 1); err == nil {
		t.Error("RegisterFormat should error on a closed db")
	}
	if _, _, err := ResolvePath(db, 1, "EPUB"); err == nil {
		t.Error("ResolvePath should error on a closed db")
	}
	if _, err := ListFormats(db, 1); err == nil {
		t.Error("ListFormats should error on a closed db")
	}
	if _, err := MergeBooks(db, 1, []int64{2}); err == nil {
		t.Error("MergeBooks should error on a closed db")
	}
	if _, err := SplitBook(db, 1); err == nil {
		t.Error("SplitBook should error on a closed db")
	}
}

// TestFindOrCreateWorkReusesExisting covers the "already present" branch.
func TestFindOrCreateWorkReusesExisting(t *testing.T) {
	db := openGroupDB(t)

	first, err := FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	// A differently-spelled but equivalent title/author must reuse the work.
	second, err := FindOrCreateWork(db, "三體（第二版）", "刘慈欣 著")
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if first != second {
		t.Errorf("work ids differ: %d vs %d", first, second)
	}
	if got := countRows(t, db, "works"); got != 1 {
		t.Errorf("works = %d, want 1", got)
	}
}

// TestFindOrCreateEditionReusesExisting covers the edition-hit branch.
func TestFindOrCreateEditionReusesExisting(t *testing.T) {
	db := openGroupDB(t)
	workID, err := FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("work: %v", err)
	}
	meta := BookMeta{Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008"}

	first, created1, err := FindOrCreateEdition(db, workID, meta)
	if err != nil {
		t.Fatalf("first edition: %v", err)
	}
	if !created1 {
		t.Error("first call should create")
	}
	second, created2, err := FindOrCreateEdition(db, workID, meta)
	if err != nil {
		t.Fatalf("second edition: %v", err)
	}
	if created2 {
		t.Error("second call should reuse")
	}
	if first != second {
		t.Errorf("edition ids differ: %d vs %d", first, second)
	}
}

// TestFindOrCreateEditionEmptyKeyAlwaysCreates covers the safety valve.
func TestFindOrCreateEditionEmptyKeyAlwaysCreates(t *testing.T) {
	db := openGroupDB(t)
	workID, err := FindOrCreateWork(db, "三体", "刘慈欣")
	if err != nil {
		t.Fatalf("work: %v", err)
	}
	meta := BookMeta{Title: "三体", Author: "刘慈欣"} // no fingerprint

	a, _, err := FindOrCreateEdition(db, workID, meta)
	if err != nil {
		t.Fatalf("first: %v", err)
	}
	b, created, err := FindOrCreateEdition(db, workID, meta)
	if err != nil {
		t.Fatalf("second: %v", err)
	}
	if !created {
		t.Error("an empty edition_key must always create a new edition")
	}
	if a == b {
		t.Error("editions must differ when the fingerprint is empty")
	}
}

// TestMergeBooksSkipsTarget covers the self-skip branch.
func TestMergeBooksSkipsTarget(t *testing.T) {
	db := openGroupDB(t)
	a, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("import: %v", err)
	}
	// Passing only the target must be a no-op that still succeeds.
	workID, err := MergeBooks(db, a.BookID, []int64{a.BookID})
	if err != nil {
		t.Fatalf("MergeBooks: %v", err)
	}
	if workID != a.WorkID {
		t.Errorf("work = %d, want %d", workID, a.WorkID)
	}
}

// TestSplitBookTwice covers repeated splits producing distinct works.
func TestSplitBookTwice(t *testing.T) {
	db := openGroupDB(t)
	a, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 1,
	})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2012",
		Format: "EPUB", Path: "/b.epub", Size: 1,
	})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}

	w1, err := SplitBook(db, b.BookID)
	if err != nil {
		t.Fatalf("split b: %v", err)
	}
	w2, err := SplitBook(db, a.BookID)
	if err != nil {
		t.Fatalf("split a: %v", err)
	}
	if w1 == w2 {
		t.Error("two splits must produce two distinct works")
	}
	if got := countRows(t, db, "works"); got != 3 {
		t.Errorf("works = %d, want 3", got)
	}
}
