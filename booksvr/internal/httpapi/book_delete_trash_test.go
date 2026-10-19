package httpapi

import (
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/library"
)

// TestBookDeletePublicGoesToTrash 验证公开书删除时目录进入 .caltrash。
//
// 这是「图书删不掉 / 回收站为空」的回归测试。Python 的
// BookDelete.post 用 permanent = (item.scope == "private") 决定是否绕过
// 回收站；Go 侧曾把 permanent 算出来却从不使用，导致公开书被硬删除，
// 管理员回收站永远为空、无法恢复。
func TestBookDeletePublicGoesToTrash(t *testing.T) {
	w, db := newWriteFixture(t)
	root := t.TempDir()
	w.libraryRoot = root

	rel := filepath.ToSlash(filepath.Join("佚名", "公开书 (1)"))
	insertBook(t, db, 1, "公开书")
	insertItem(t, db, 1, "public", 1)
	if _, err := db.Exec(`UPDATE books SET path = ? WHERE id = ?`, rel, 1); err != nil {
		t.Fatal(err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "book.epub"), []byte("data"), 0o644); err != nil {
		t.Fatal(err)
	}

	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v", resp["err"])
	}

	// 公开书必须进回收站，而不是被硬删除。
	trashDir := filepath.Join(root, ".caltrash", "b", "1")
	if _, err := os.Stat(filepath.Join(trashDir, "book.epub")); err != nil {
		t.Errorf("公开书应进入回收站，stat err = %v", err)
	}
	// 原目录应已移走。
	if _, err := os.Stat(bookDir); !os.IsNotExist(err) {
		t.Errorf("Calibre 托管目录应已移走，stat err = %v", err)
	}
	// 回收站列表应能列出它。
	entries, err := library.ListTrashEntries(db, root)
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("回收站应有 1 条记录，实际 %d", len(entries))
	}
}

// TestBookDeletePrivateBypassesTrash 验证私藏书永久删除、不进回收站。
//
// 私藏书的文件与元数据不得出现在管理员回收站里。
func TestBookDeletePrivateBypassesTrash(t *testing.T) {
	w, db := newWriteFixture(t)
	root := t.TempDir()
	w.libraryRoot = root

	rel := filepath.ToSlash(filepath.Join("佚名", "私藏书 (1)"))
	insertBook(t, db, 1, "私藏书")
	insertItem(t, db, 1, "private", 1)
	if _, err := db.Exec(`UPDATE books SET path = ? WHERE id = ?`, rel, 1); err != nil {
		t.Fatal(err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "book.epub"), []byte("data"), 0o644); err != nil {
		t.Fatal(err)
	}

	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v", resp["err"])
	}

	// 私藏书不得进入回收站。
	entries, err := library.ListTrashEntries(db, root)
	if err != nil {
		t.Fatalf("ListTrashEntries: %v", err)
	}
	if len(entries) != 0 {
		t.Errorf("私藏书不应进入回收站，实际 %d 条", len(entries))
	}
}

// TestBookDeleteNoLibraryRootStillWorks 验证未配置书库根目录时仍能删库。
func TestBookDeleteNoLibraryRootStillWorks(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "无根目录书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v", resp["err"])
	}
	if ok, err := library.HasID(db, 1); err != nil || ok {
		t.Errorf("书籍记录应已删除，HasID = %v, err = %v", ok, err)
	}
}

func TestBookDeleteIndexedSnapshotPreservesSourceAndScan(t *testing.T) {
	w, db := newWriteFixture(t)
	w.libraryRoot = t.TempDir()
	source := t.TempDir()
	file := filepath.Join(source, "sample.epub")
	os.WriteFile(file, []byte("original"), 0644)
	insertBook(t, db, 1, "索引测试书")
	insertItem(t, db, 1, "public", 1)
	for _, q := range []string{`CREATE TABLE external_index_books(book_id INTEGER PRIMARY KEY)`, `INSERT INTO external_index_books VALUES(1)`, `INSERT INTO scanfiles(id,book_id,path,hash) VALUES(1,1,'/source/sample.epub','x')`} {
		if _, err := db.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	db.Exec(`UPDATE books SET path=? WHERE id=1`, source)
	seedFormat(t, db, 1, "EPUB", file)
	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil || resp["err"] != "ok" {
		t.Fatalf("%v %v", resp, err)
	}
	if ok, _ := library.HasID(db, 1); ok {
		t.Fatal("indexed book remains visible")
	}
	entries, err := library.ListTrashEntries(db, w.libraryRoot)
	if err != nil || len(entries) != 1 || entries[0].Title != "索引测试书" {
		t.Fatalf("%v %v", entries, err)
	}
	var count int
	db.QueryRow(`SELECT COUNT(*) FROM scanfiles WHERE book_id=1`).Scan(&count)
	if count != 1 {
		t.Fatal("scan can resurrect deleted book")
	}
	if err = library.RestoreTrashEntry(db, w.libraryRoot, 1); err != nil {
		t.Fatal(err)
	}
	if raw, err := os.ReadFile(file); err != nil || string(raw) != "original" {
		t.Fatal("source modified")
	}
}
