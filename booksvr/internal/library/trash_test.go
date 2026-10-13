package library

import (
	"database/sql"
	"os"
	"path/filepath"
	"testing"
)

// newTrashFixture 建一个带 .caltrash 的书库目录。
//
// 目录结构对齐 Calibre：<library>/.caltrash/b/<book_id>/
func newTrashFixture(t *testing.T) (libraryRoot string, db *sql.DB) {
	t.Helper()
	root := t.TempDir()

	// 建两本被删除的书。
	for _, id := range []string{"1", "2"} {
		dir := filepath.Join(root, ".caltrash", "b", id)
		if err := os.MkdirAll(dir, 0o755); err != nil {
			t.Fatalf("mkdir: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, "book.epub"), []byte("epub-data"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, "cover.jpg"), []byte("cover"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
		if err := os.WriteFile(filepath.Join(dir, "metadata.opf"), []byte("<package/>"), 0o644); err != nil {
			t.Fatalf("write: %v", err)
		}
	}
	// 一个非目录条目，应被忽略。
	if err := os.WriteFile(filepath.Join(root, ".caltrash", "b", "stray.txt"), []byte("x"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	return root, nil
}

// TestListTrashEntries 列出回收站条目。
func TestListTrashEntries(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)

	entries, err := ListTrashEntries(db, root)
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("应有 2 个条目，实际 %d", len(entries))
	}

	byID := map[int64]TrashEntry{}
	for _, e := range entries {
		byID[e.BookID] = e
	}
	e1, ok := byID[1]
	if !ok {
		t.Fatal("缺少 book_id=1")
	}
	if len(e1.Formats) != 1 || e1.Formats[0] != "EPUB" {
		t.Errorf("Formats = %#v, want [EPUB]", e1.Formats)
	}
	if e1.Size <= 0 {
		t.Errorf("Size 应大于 0，实际 %d", e1.Size)
	}
}

// TestListTrashEntriesEmpty 目录不存在返回空结果。
func TestListTrashEntriesEmpty(t *testing.T) {
	db := newQueryDB(t)
	entries, err := ListTrashEntries(db, t.TempDir())
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("应返回空，实际 %#v", entries)
	}
}

// TestTrashBookFormatsExcludesMeta 格式列表排除 cover/metadata/annotations。
func TestTrashBookFormatsExcludesMeta(t *testing.T) {
	root, _ := newTrashFixture(t)
	dir := filepath.Join(root, ".caltrash", "b", "1")
	if err := os.WriteFile(filepath.Join(dir, "annotations.json"), []byte("{}"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "noext"), []byte("x"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}

	formats, err := trashBookFormats(dir)
	if err != nil {
		t.Fatalf("trashBookFormats: %v", err)
	}
	if len(formats) != 1 || formats[0] != "EPUB" {
		t.Fatalf("Formats = %#v, want [EPUB]", formats)
	}
}

// TestDeleteTrashEntry 永久删除。
func TestDeleteTrashEntry(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)

	if err := DeleteTrashEntry(db, root, 1); err != nil {
		t.Fatalf("DeleteTrashEntry: %v", err)
	}
	if _, err := os.Stat(filepath.Join(root, ".caltrash", "b", "1")); !os.IsNotExist(err) {
		t.Fatal("目录应已被删除")
	}
	// 另一个条目仍在。
	if _, err := os.Stat(filepath.Join(root, ".caltrash", "b", "2")); err != nil {
		t.Fatal("book_id=2 不应被删除")
	}
}

// TestDeleteTrashEntryMissing 删除不存在的条目返回错误。
func TestDeleteTrashEntryMissing(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)
	if err := DeleteTrashEntry(db, root, 999); err == nil {
		t.Fatal("删除不存在的条目应返回错误")
	}
}

// TestTrashPathTraversalRejected 路径穿越被拒绝。
func TestTrashPathTraversalRejected(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)
	// 负数 id 会构造出越界路径。
	if err := DeleteTrashEntry(db, root, -1); err == nil {
		t.Fatal("非法 id 应被拒绝")
	}
}

// TestRestoreTrashEntry 恢复条目。
func TestRestoreTrashEntry(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)

	// 先给 book_id=1 建一个 books 行与 path，模拟恢复目标。
	if _, err := db.Exec(`UPDATE books SET path = '刘慈欣/三体 (1)' WHERE id = 1`); err != nil {
		t.Fatalf("seed: %v", err)
	}

	if err := RestoreTrashEntry(db, root, 1); err != nil {
		t.Fatalf("RestoreTrashEntry: %v", err)
	}
	// 文件应回到书库目录。
	restored := filepath.Join(root, "刘慈欣/三体 (1)", "book.epub")
	if _, err := os.Stat(restored); err != nil {
		t.Fatalf("文件应已恢复到 %s: %v", restored, err)
	}
	// 回收站目录应已清空。
	if _, err := os.Stat(filepath.Join(root, ".caltrash", "b", "1")); !os.IsNotExist(err) {
		t.Fatal("回收站目录应已移除")
	}
}

// TestRestoreTrashEntryMissing 恢复不存在的条目返回错误。
func TestRestoreTrashEntryMissing(t *testing.T) {
	root, _ := newTrashFixture(t)
	db := newQueryDB(t)
	if err := RestoreTrashEntry(db, root, 999); err == nil {
		t.Fatal("恢复不存在的条目应返回错误")
	}
}
