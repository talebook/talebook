package library

import (
	"os"
	"path/filepath"
	"testing"

	_ "modernc.org/sqlite"
)

// 实施项 6：原地登记路径解析。
// 核心断言：登记后源文件位置与文件名完全不变（不复制、不改名、不写 OPF）。

// writeSourceFile creates a real file and returns its path plus a snapshot of
// its identity (path, size, mtime) for later comparison.
func writeSourceFile(t *testing.T, dir, name string, content []byte) (string, os.FileInfo) {
	t.Helper()
	path := filepath.Join(dir, name)
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatalf("write %s: %v", path, err)
	}
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf("stat %s: %v", path, err)
	}
	return path, info
}

func TestRegisterFormatLeavesSourceFileUntouched(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	content := []byte("EPUB-CONTENT-三体")
	src, before := writeSourceFile(t, dir, "三体.epub", content)

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: src, Size: before.Size(), Mtime: before.ModTime().Unix(),
	})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	// 1. The file still exists at the exact same path.
	after, err := os.Stat(src)
	if err != nil {
		t.Fatalf("source file disappeared: %v", err)
	}

	// 2. Same name, same directory.
	if filepath.Base(src) != "三体.epub" {
		t.Errorf("filename changed: %q", filepath.Base(src))
	}
	if filepath.Dir(src) != dir {
		t.Errorf("directory changed: %q, want %q", filepath.Dir(src), dir)
	}

	// 3. Same size and mtime: nothing rewrote the file.
	if after.Size() != before.Size() {
		t.Errorf("size changed: %d -> %d", before.Size(), after.Size())
	}
	if !after.ModTime().Equal(before.ModTime()) {
		t.Errorf("mtime changed: %v -> %v", before.ModTime(), after.ModTime())
	}

	// 4. Content is byte-identical.
	got, err := os.ReadFile(src)
	if err != nil {
		t.Fatalf("read source: %v", err)
	}
	if string(got) != string(content) {
		t.Errorf("content changed: %q -> %q", content, got)
	}

	// 5. The database points at the original absolute path.
	path, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if missing {
		t.Error("file should not be reported missing")
	}
	if path != src {
		t.Errorf("stored path = %q, want %q", path, src)
	}
}

func TestRegisterFormatDoesNotCreateSiblingFiles(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	src, info := writeSourceFile(t, dir, "三体.epub", []byte("x"))

	if _, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: src, Size: info.Size(), Mtime: info.ModTime().Unix(),
	}); err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	// No metadata.opf, no cover.jpg, no renamed copy may appear.
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	if len(entries) != 1 {
		names := make([]string, 0, len(entries))
		for _, e := range entries {
			names = append(names, e.Name())
		}
		t.Errorf("directory should contain only the source file, got %v", names)
	}
	if entries[0].Name() != "三体.epub" {
		t.Errorf("unexpected entry %q", entries[0].Name())
	}
}

func TestRegisterFormatKeepsNonASCIIFilename(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	// A name that Calibre's ASCII transliteration would have mangled.
	name := "三体：黑暗森林（第二版）.epub"
	src, info := writeSourceFile(t, dir, name, []byte("x"))

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: src, Size: info.Size(), Mtime: info.ModTime().Unix(),
	})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	path, _, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if filepath.Base(path) != name {
		t.Errorf("filename = %q, want %q (must not be ASCII-transliterated)", filepath.Base(path), name)
	}
}

func TestResolvePathMissingFileKeepsRecordAndReportsMissing(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	src, info := writeSourceFile(t, dir, "三体.epub", []byte("x"))

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: src, Size: info.Size(), Mtime: info.ModTime().Unix(),
	})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	// Delete the source file behind the library's back.
	if err := os.Remove(src); err != nil {
		t.Fatalf("remove source: %v", err)
	}

	path, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath should not error for a missing file: %v", err)
	}
	if !missing {
		t.Error("missing file must be reported as missing")
	}
	if path != src {
		t.Errorf("path = %q, want the recorded path %q", path, src)
	}

	// The record must survive: a later rescan can restore the file without
	// losing metadata.
	formats, err := ListFormats(db, r.BookID)
	if err != nil {
		t.Fatalf("ListFormats: %v", err)
	}
	if len(formats) != 1 {
		t.Fatalf("format record was removed, got %d entries", len(formats))
	}
	if formats[0].Path != src {
		t.Errorf("recorded path = %q, want %q", formats[0].Path, src)
	}
}

func TestResolvePathRestoresAfterFileReturns(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	src, info := writeSourceFile(t, dir, "三体.epub", []byte("x"))

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: src, Size: info.Size(), Mtime: info.ModTime().Unix(),
	})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	if err := os.Remove(src); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if _, missing, _ := ResolvePath(db, r.BookID, "EPUB"); !missing {
		t.Fatal("precondition: file should be missing")
	}

	// Put the file back at the same path.
	if err := os.WriteFile(src, []byte("x"), 0o644); err != nil {
		t.Fatalf("restore: %v", err)
	}
	_, missing, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if missing {
		t.Error("file is back; it must no longer be reported missing")
	}
}

func TestRegisterFormatRelativePathResolvedAgainstCwd(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	_, info := writeSourceFile(t, dir, "三体.epub", []byte("x"))

	// Register using a relative path; the stored value must be absolute.
	rel := filepath.Join(filepath.Base(dir), "三体.epub")
	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	if err := os.Chdir(filepath.Dir(dir)); err != nil {
		t.Fatalf("chdir: %v", err)
	}
	t.Cleanup(func() { _ = os.Chdir(wd) })

	r, err := GroupFile(db, BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: rel, Size: info.Size(), Mtime: info.ModTime().Unix(),
	})
	if err != nil {
		t.Fatalf("GroupFile: %v", err)
	}

	path, _, err := ResolvePath(db, r.BookID, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if !filepath.IsAbs(path) {
		t.Errorf("stored path %q must be absolute", path)
	}
	if filepath.Base(path) != "三体.epub" {
		t.Errorf("filename = %q, want 三体.epub", filepath.Base(path))
	}
}

func TestRegisterFormatSameFileTwoFormats(t *testing.T) {
	db := openGroupDB(t)
	dir := t.TempDir()
	epub, ei := writeSourceFile(t, dir, "三体.epub", []byte("e"))
	mobi, mi := writeSourceFile(t, dir, "三体.mobi", []byte("m"))

	meta := BookMeta{
		Title: "三体", Author: "刘慈欣", Publisher: "重庆出版社", Pubdate: "2008",
		Format: "EPUB", Path: epub, Size: ei.Size(), Mtime: ei.ModTime().Unix(),
	}
	r, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("import epub: %v", err)
	}

	meta.Format = "MOBI"
	meta.Path = mobi
	meta.Size = mi.Size()
	meta.Mtime = mi.ModTime().Unix()
	r2, err := GroupFile(db, meta)
	if err != nil {
		t.Fatalf("import mobi: %v", err)
	}
	if r2.BookID != r.BookID {
		t.Errorf("same edition expected: %d vs %d", r2.BookID, r.BookID)
	}

	formats, err := ListFormats(db, r.BookID)
	if err != nil {
		t.Fatalf("ListFormats: %v", err)
	}
	if len(formats) != 2 {
		t.Fatalf("formats = %d, want 2", len(formats))
	}
	// Both source files must still exist untouched.
	for _, f := range formats {
		if _, err := os.Stat(f.Path); err != nil {
			t.Errorf("source file %q is gone: %v", f.Path, err)
		}
	}
}
