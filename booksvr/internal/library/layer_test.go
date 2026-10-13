package library

import (
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// --- work.go ---

func TestGetWork(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	w, err := GetWork(db, r.WorkID)
	if err != nil {
		t.Fatalf("GetWork: %v", err)
	}
	if w.DisplayTitle != "三体" || w.DisplayAuthor != "刘慈欣" {
		t.Errorf("work = %+v, want 三体/刘慈欣", w)
	}
	if w.WorkKey != "三体\x1f刘慈欣" {
		t.Errorf("work_key = %q", w.WorkKey)
	}
	if w.CreatedAt == 0 || w.UpdatedAt == 0 {
		t.Error("timestamps should be set")
	}
}

func TestGetWorkNotFound(t *testing.T) {
	db := openGroupDB(t)
	if _, err := GetWork(db, 999); err == nil {
		t.Error("GetWork on a missing id should error")
	}
}

func TestListVersions(t *testing.T) {
	db := openGroupDB(t)
	// Two editions of the same work.
	if _, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 1,
	}); err != nil {
		t.Fatalf("import a: %v", err)
	}
	if _, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2012",
		Format: "EPUB", Path: "/b.epub", Size: 1,
	}); err != nil {
		t.Fatalf("import b: %v", err)
	}

	workID, err := GetBookWorkID(db, 1)
	if err != nil {
		t.Fatalf("GetBookWorkID: %v", err)
	}
	ids, err := ListVersions(db, workID)
	if err != nil {
		t.Fatalf("ListVersions: %v", err)
	}
	if len(ids) != 2 {
		t.Errorf("ListVersions = %v, want 2 entries", ids)
	}
}

func TestListVersionsEmpty(t *testing.T) {
	db := openGroupDB(t)
	ids, err := ListVersions(db, 12345)
	if err != nil {
		t.Fatalf("ListVersions: %v", err)
	}
	if len(ids) != 0 {
		t.Errorf("ListVersions on an unknown work = %v, want empty", ids)
	}
}

// --- book.go ---

func TestGetBookWorkIDMissing(t *testing.T) {
	db := openGroupDB(t)
	if _, err := GetBookWorkID(db, 999); err == nil {
		t.Error("GetBookWorkID on a missing book should error")
	}
}

func TestGetBookWorkIDNull(t *testing.T) {
	db := openGroupDB(t)
	// A book row with no work_id (legacy row) must be reported as an error.
	if _, err := db.Exec(`INSERT INTO books (id, title) VALUES (42, 'legacy')`); err != nil {
		t.Fatalf("insert legacy book: %v", err)
	}
	if _, err := GetBookWorkID(db, 42); err == nil {
		t.Error("GetBookWorkID on a book without work_id should error")
	}
}

func TestSetBookWorkID(t *testing.T) {
	db := openGroupDB(t)
	a, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{Title: "流浪地球", Author: "刘慈欣", Format: "EPUB", Path: "/b.epub", Size: 1})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}
	if a.WorkID == b.WorkID {
		t.Fatal("precondition: works should differ")
	}

	if err := SetBookWorkID(db, b.BookID, a.WorkID); err != nil {
		t.Fatalf("SetBookWorkID: %v", err)
	}
	got, err := GetBookWorkID(db, b.BookID)
	if err != nil {
		t.Fatalf("GetBookWorkID: %v", err)
	}
	if got != a.WorkID {
		t.Errorf("work_id = %d, want %d", got, a.WorkID)
	}
}

// --- format.go ---

func TestRegisterFormatRejectsDuplicate(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}
	err = RegisterFormat(db, r.BookID, "EPUB", "/other.epub", 2, 2)
	if !errors.Is(err, ErrFormatExists) {
		t.Errorf("RegisterFormat duplicate err = %v, want ErrFormatExists", err)
	}
}

func TestRegisterFormatNormalizesToAbsolute(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "rel.epub", Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}
	path, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if !filepath.IsAbs(path) {
		t.Errorf("path %q should be absolute", path)
	}
	if !missing {
		t.Error("a non-existent file should be reported as missing")
	}
}

func TestResolvePathMissingFileKeepsRecord(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/definitely/not/here.epub", Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	_, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if !missing {
		t.Error("missing file should be flagged")
	}
	// The record must survive: the format is still registered.
	if got := countRows(t, db, "book_formats"); got != 1 {
		t.Errorf("format record was deleted, count = %d", got)
	}
}

func TestResolvePathExistingFile(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	file := filepath.Join(dir, "三体.epub")
	if err := os.WriteFile(file, []byte("x"), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}

	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: file, Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}
	path, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if missing {
		t.Error("existing file should not be flagged missing")
	}
	if path != file {
		t.Errorf("path = %q, want %q", path, file)
	}
}

func TestResolvePathUnknownFormat(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}
	if _, _, err := ResolvePath(db, r.BookID, "MOBI"); err == nil {
		t.Error("ResolvePath for an unregistered format should error")
	}
}

func TestListFormats(t *testing.T) {
	db := openGroupDB(t)
	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: "/a.epub", Size: 10, Mtime: 1,
	})
	if err != nil {
		t.Fatalf("import epub: %v", err)
	}
	if _, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "MOBI", Path: "/a.mobi", Size: 20, Mtime: 2,
	}); err != nil {
		t.Fatalf("import mobi: %v", err)
	}

	formats, err := ListFormats(db, r.BookID)
	if err != nil {
		t.Fatalf("ListFormats: %v", err)
	}
	if len(formats) != 2 {
		t.Fatalf("ListFormats = %d entries, want 2", len(formats))
	}
	// Ordered by format name: EPUB before MOBI.
	if formats[0].Format != "EPUB" || formats[1].Format != "MOBI" {
		t.Errorf("order = %s,%s, want EPUB,MOBI", formats[0].Format, formats[1].Format)
	}
	if formats[0].Size != 10 || formats[1].Size != 20 {
		t.Errorf("sizes = %d,%d, want 10,20", formats[0].Size, formats[1].Size)
	}
}

func TestNormalizeFormatName(t *testing.T) {
	for _, c := range []struct{ in, want string }{
		{"epub", "EPUB"},
		{" EPUB ", "EPUB"},
		{"Mobi", "MOBI"},
	} {
		if got := NormalizeFormatName(c.in); got != c.want {
			t.Errorf("NormalizeFormatName(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// --- group.go ---

func TestGroupFileRequiresFormatAndPath(t *testing.T) {
	db := openGroupDB(t)
	if _, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Path: "/a.epub"}); err == nil {
		t.Error("missing format should error")
	}
	if _, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB"}); err == nil {
		t.Error("missing path should error")
	}
}

func TestGroupFileLowercaseFormatNormalized(t *testing.T) {
	db := openGroupDB(t)
	// A fingerprint is required so that both imports resolve to the SAME
	// edition; otherwise the empty edition_key rule creates two editions and
	// the format conflict never arises.
	meta := BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "epub", Path: "/a.epub", Size: 1,
	}
	r, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}
	if r.Format != "EPUB" {
		t.Errorf("format = %q, want \"EPUB\"", r.Format)
	}

	// Re-importing with a different case must be detected as the same format.
	meta.Format = "Epub"
	r2, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("second GroupFile: %v", err)
	}
	if r2.Status != "samebook" {
		t.Errorf("status = %q, want \"samebook\"", r2.Status)
	}
	if r2.BookID != r.BookID {
		t.Errorf("book id = %d, want %d", r2.BookID, r.BookID)
	}
}

func TestMergeBooks(t *testing.T) {
	db := openGroupDB(t)
	a, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub", Size: 1})
	if err != nil {
		t.Fatalf("import a: %v", err)
	}
	b, err := GroupFile(db, BookMeta{Title: "三体全集", Author: "刘慈欣", Format: "EPUB", Path: "/b.epub", Size: 1})
	if err != nil {
		t.Fatalf("import b: %v", err)
	}

	workID, err := MergeBooks(db, a.BookID, []int64{a.BookID, b.BookID})
	if err != nil {
		t.Fatalf("MergeBooks: %v", err)
	}
	if workID != a.WorkID {
		t.Errorf("merged work = %d, want %d", workID, a.WorkID)
	}
	got, err := GetBookWorkID(db, b.BookID)
	if err != nil {
		t.Fatalf("GetBookWorkID: %v", err)
	}
	if got != a.WorkID {
		t.Errorf("book b work_id = %d, want %d", got, a.WorkID)
	}
}

func TestMergeBooksMissingTarget(t *testing.T) {
	db := openGroupDB(t)
	if _, err := MergeBooks(db, 999, []int64{1}); err == nil {
		t.Error("MergeBooks with a missing target should error")
	}
}

func TestSplitBook(t *testing.T) {
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
	if a.WorkID != b.WorkID {
		t.Fatal("precondition: both editions should share a work")
	}

	newWorkID, err := SplitBook(db, b.BookID)
	if err != nil {
		t.Fatalf("SplitBook: %v", err)
	}
	if newWorkID == a.WorkID {
		t.Error("SplitBook should create a distinct work")
	}
	got, err := GetBookWorkID(db, b.BookID)
	if err != nil {
		t.Fatalf("GetBookWorkID: %v", err)
	}
	if got != newWorkID {
		t.Errorf("book work_id = %d, want %d", got, newWorkID)
	}
	// The other edition must stay where it was.
	other, err := GetBookWorkID(db, a.BookID)
	if err != nil {
		t.Fatalf("GetBookWorkID a: %v", err)
	}
	if other != a.WorkID {
		t.Errorf("book a moved unexpectedly: %d, want %d", other, a.WorkID)
	}
}

func TestSplitBookMissing(t *testing.T) {
	db := openGroupDB(t)
	if _, err := SplitBook(db, 999); err == nil {
		t.Error("SplitBook on a missing book should error")
	}
}

func TestGroupFileFailsOnClosedDB(t *testing.T) {
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	_ = db.Close()
	if _, err := GroupFile(db, BookMeta{Title: "三体", Author: "刘慈欣", Format: "EPUB", Path: "/a.epub"}); err == nil {
		t.Error("GroupFile on a closed database should error")
	}
}
