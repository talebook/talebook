package library

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// TestRestoreTrashEntryAfterDelete 验证删除后能完整恢复。
//
// 这是「回收站恢复失败」的回归测试：删除会移除 books 行，恢复时若仍去
// 查库取 path 必然失败。原目录必须随回收站条目一起保存。
func TestRestoreTrashEntryAfterDelete(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	rel := filepath.ToSlash(filepath.Join("佚名", "待恢复书 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "待恢复书", Author: "佚名", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "book.epub"), []byte("payload"), 0o644); err != nil {
		t.Fatal(err)
	}

	// 删除 -> 进回收站。
	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash: %v", err)
	}
	// 恢复。
	if err := RestoreTrashEntry(db, root, bookID); err != nil {
		t.Fatalf("RestoreTrashEntry 失败: %v", err)
	}

	// 文件应回到原目录。
	data, err := os.ReadFile(filepath.Join(bookDir, "book.epub"))
	if err != nil {
		t.Fatalf("文件应已恢复: %v", err)
	}
	if string(data) != "payload" {
		t.Errorf("恢复内容 = %q", data)
	}
	// 回收站条目应已清空。
	entries, err := ListTrashEntries(db, root)
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("恢复后回收站应为空，实际 %d 条", len(entries))
	}
}

// TestRestoreTrashEntryNestedPath 验证多级相对路径的书能恢复到原目录。
func TestRestoreTrashEntryNestedPath(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	rel := filepath.ToSlash(filepath.Join("刘慈欣", "三体", "三体 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "三体", Author: "刘慈欣", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "book.mobi"), []byte("mobi"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash: %v", err)
	}
	if err := RestoreTrashEntry(db, root, bookID); err != nil {
		t.Fatalf("RestoreTrashEntry 失败: %v", err)
	}

	if _, err := os.Stat(filepath.Join(bookDir, "book.mobi")); err != nil {
		t.Errorf("多级路径书籍应恢复到原目录: %v", err)
	}
}

// TestTrashSidecarNotCountedAsFormat 验证侧车文件不被当成书籍格式。
func TestTrashSidecarNotCountedAsFormat(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	rel := filepath.ToSlash(filepath.Join("佚名", "格式书 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "格式书", Author: "佚名", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "book.epub"), []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash: %v", err)
	}

	entries, err := ListTrashEntries(db, root)
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("应有 1 条记录，实际 %d", len(entries))
	}
	for _, f := range entries[0].Formats {
		if f != "EPUB" {
			t.Errorf("格式列表应只含 EPUB，实际 %v", entries[0].Formats)
		}
	}
	if len(entries[0].Formats) != 1 {
		t.Errorf("格式数应为 1，实际 %v", entries[0].Formats)
	}
	_ = fmt.Sprint()
}
