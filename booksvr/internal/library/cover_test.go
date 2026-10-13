package library

import (
	"os"
	"path/filepath"
	"testing"
)

// TestCoverAbsolutePath 验证原地登记（绝对路径）的书也能读到封面。
//
// 这是「文件明明有封面却看不到」的回归测试：books.path 为绝对路径时
// 曾无条件拼接 libraryRoot，得到不存在的路径，Cover 返回 nil，
// 接口回退到默认占位图。
func TestCoverAbsolutePath(t *testing.T) {
	root := t.TempDir()
	srcRoot := t.TempDir()
	db := newQueryDB(t)

	bookID, err := ImportBook(db, BookMeta{Title: "封面书", Author: "佚名", Path: srcRoot})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	payload := []byte("fake-jpeg-bytes")
	if err := os.WriteFile(filepath.Join(srcRoot, "cover.jpg"), payload, 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE books SET has_cover = 1 WHERE id = ?`, bookID); err != nil {
		t.Fatal(err)
	}

	got, err := Cover(db, bookID, root)
	if err != nil {
		t.Fatalf("Cover: %v", err)
	}
	if string(got) != string(payload) {
		t.Errorf("封面内容 = %q，期望 %q", got, payload)
	}
}

// TestCoverRelativePath 验证 Calibre 相对路径的书能读到封面。
func TestCoverRelativePath(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	rel := filepath.ToSlash(filepath.Join("佚名", "相对书 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "相对书", Author: "佚名", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	dir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	payload := []byte("relative-cover")
	if err := os.WriteFile(filepath.Join(dir, "cover.jpg"), payload, 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE books SET has_cover = 1 WHERE id = ?`, bookID); err != nil {
		t.Fatal(err)
	}

	got, err := Cover(db, bookID, root)
	if err != nil {
		t.Fatalf("Cover: %v", err)
	}
	if string(got) != string(payload) {
		t.Errorf("封面内容 = %q，期望 %q", got, payload)
	}
}

// TestCoverMissingFile 验证 has_cover=1 但文件不存在时返回 nil 而非报错。
func TestCoverMissingFile(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	bookID, err := ImportBook(db, BookMeta{Title: "无封面文件", Author: "佚名", Path: "佚名/无封面文件 (1)"})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	if _, err := db.Exec(`UPDATE books SET has_cover = 1 WHERE id = ?`, bookID); err != nil {
		t.Fatal(err)
	}

	got, err := Cover(db, bookID, root)
	if err != nil {
		t.Fatalf("缺文件不应报错: %v", err)
	}
	if got != nil {
		t.Errorf("缺文件应返回 nil，实际 %d 字节", len(got))
	}
}

// TestCoverLastModifiedAbsolutePath 验证绝对路径书的封面时间也能读到。
func TestCoverLastModifiedAbsolutePath(t *testing.T) {
	root := t.TempDir()
	srcRoot := t.TempDir()
	db := newQueryDB(t)

	bookID, err := ImportBook(db, BookMeta{Title: "时间书", Author: "佚名", Path: srcRoot})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	if err := os.WriteFile(filepath.Join(srcRoot, "cover.jpg"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE books SET has_cover = 1 WHERE id = ?`, bookID); err != nil {
		t.Fatal(err)
	}

	ts, err := CoverLastModified(db, bookID, root)
	if err != nil {
		t.Fatalf("CoverLastModified: %v", err)
	}
	if ts == 0 {
		t.Error("绝对路径书的封面时间不应为 0")
	}
}
