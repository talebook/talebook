package library

import (
	"fmt"
	"os"
	"path/filepath"
	"testing"
)

// TestDeleteBookToTrashMovesFiles 验证公开书删除时目录被移入 .caltrash。
//
// 这是「图书删不掉 / 回收站为空」的回归测试：Python 的
// db.delete_book(bid, permanent=False) 会把书籍目录移到
// <libraryRoot>/.caltrash/b/<book_id>，Go 侧必须一致。
func TestDeleteBookToTrashMovesFiles(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)

	// 建一本带目录与文件的书。
	rel := filepath.ToSlash(filepath.Join("刘慈欣", "三体 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "三体", Author: "刘慈欣", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "三体.epub"), []byte("epub"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash 失败: %v", err)
	}

	// 原目录应已消失。
	if _, err := os.Stat(bookDir); !os.IsNotExist(err) {
		t.Errorf("原书籍目录应已移走，stat err = %v", err)
	}
	// 回收站里应出现该书目录，且文件内容保留。
	trashDir := filepath.Join(root, ".caltrash", "b", fmt.Sprintf("%d", bookID))
	data, err := os.ReadFile(filepath.Join(trashDir, "三体.epub"))
	if err != nil {
		t.Fatalf("回收站中应保留书籍文件: %v", err)
	}
	if string(data) != "epub" {
		t.Errorf("回收站文件内容 = %q", data)
	}
	// 数据库行应已删除。
	if ok, err := HasID(db, bookID); err != nil || ok {
		t.Errorf("书籍记录应已删除，HasID = %v, err = %v", ok, err)
	}
}

// TestDeleteBookToTrashMissingDir 验证目录不存在时仍能删库。
//
// 外部索引书或已手工删文件的书不应因缺目录而删除失败。
func TestDeleteBookToTrashMissingDir(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)
	bookID, err := ImportBook(db, BookMeta{Title: "无目录书", Author: "佚名", Path: "佚名/无目录书 (1)"})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("缺目录时不应报错: %v", err)
	}
	if ok, err := HasID(db, bookID); err != nil || ok {
		t.Errorf("书籍记录应已删除，HasID = %v, err = %v", ok, err)
	}
}

// TestDeleteBookToTrashLeavesExternalDir 验证原地登记的书不动磁盘。
//
// Talebook 默认「原地登记」导入，books.path 存的是源文件所在目录的绝对路径
// （如 /data/books/imports/todo）。那是用户自己的导入目录，删除书籍只能删
// 库记录，绝不能把整个目录搬进回收站或删掉。
func TestDeleteBookToTrashLeavesExternalDir(t *testing.T) {
	root := t.TempDir()
	srcRoot := t.TempDir()
	db := newQueryDB(t)

	bookID, err := ImportBook(db, BookMeta{Title: "原地登记书", Author: "佚名", Path: srcRoot})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	srcFile := filepath.Join(srcRoot, "book.epub")
	if err := os.WriteFile(srcFile, []byte("data"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash 失败: %v", err)
	}

	// 源目录与源文件必须原封不动。
	if _, err := os.Stat(srcFile); err != nil {
		t.Errorf("外部导入目录不应被动过，stat err = %v", err)
	}
 // Only a metadata snapshot enters trash; the source directory stays untouched.
 trashDir := filepath.Join(root,".caltrash","b",fmt.Sprintf("%d",bookID))
 if _,err:=os.Stat(filepath.Join(trashDir,trashSnapshotFile));err!=nil {t.Fatal(err)}
 if _,err:=os.Stat(filepath.Join(trashDir,"book.epub"));!os.IsNotExist(err){t.Fatal("source must never be copied")}
	// 库记录仍应删除。
	if ok, err := HasID(db, bookID); err != nil || ok {
		t.Errorf("书籍记录应已删除，HasID = %v, err = %v", ok, err)
	}
}

// TestDeleteBookToTrashEmptyRoot 验证未配置书库根目录时退化为直接删库。
func TestDeleteBookToTrashEmptyRoot(t *testing.T) {
	db := newQueryDB(t)
	bookID, err := ImportBook(db, BookMeta{Title: "无根目录书", Author: "佚名", Path: "佚名/无根目录书 (1)"})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}

	if err := DeleteBookToTrash(db, bookID, ""); err != nil {
		t.Fatalf("空根目录时不应报错: %v", err)
	}
	if ok, err := HasID(db, bookID); err != nil || ok {
		t.Errorf("书籍记录应已删除，HasID = %v, err = %v", ok, err)
	}
}

// TestDeleteBookToTrashReplacesExisting 验证回收站已有同名目录时被替换。
func TestDeleteBookToTrashReplacesExisting(t *testing.T) {
	root := t.TempDir()
	db := newQueryDB(t)
	rel := filepath.ToSlash(filepath.Join("佚名", "重复删除 (1)"))
	bookID, err := ImportBook(db, BookMeta{Title: "重复删除", Author: "佚名", Path: rel})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	bookDir := filepath.Join(root, filepath.FromSlash(rel))
	if err := os.MkdirAll(bookDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(bookDir, "new.epub"), []byte("new"), 0o644); err != nil {
		t.Fatal(err)
	}

	// 预置一个残留的回收站目录。
	trashDir := filepath.Join(root, ".caltrash", "b", fmt.Sprintf("%d", bookID))
	if err := os.MkdirAll(trashDir, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(trashDir, "stale.epub"), []byte("stale"), 0o644); err != nil {
		t.Fatal(err)
	}

	if err := DeleteBookToTrash(db, bookID, root); err != nil {
		t.Fatalf("DeleteBookToTrash 失败: %v", err)
	}

	// 旧文件应被清掉，新文件应在。
	if _, err := os.Stat(filepath.Join(trashDir, "stale.epub")); !os.IsNotExist(err) {
		t.Error("回收站旧文件应被清理")
	}
	if _, err := os.Stat(filepath.Join(trashDir, "new.epub")); err != nil {
		t.Errorf("回收站应包含新文件: %v", err)
	}
}
