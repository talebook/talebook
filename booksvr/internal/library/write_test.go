package library

import (
	"os"
	"path/filepath"
	"testing"
)

// TestImportBookCreatesRow 导入创建 books 行与关联。
func TestImportBookCreatesRow(t *testing.T) {
	db := newQueryDB(t)

	id, err := ImportBook(db, BookMeta{
		Title:     "新书",
		Author:    "新作者",
		Publisher: "新出版社",
		Tags:      []string{"新标签"},
		Comments:  "简介",
		Path:      "新作者/新书 (100)",
	})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	if id <= 0 {
		t.Fatalf("应返回正数 id，实际 %d", id)
	}

	books, err := GetBooksData(db, []int64{id})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books) != 1 {
		t.Fatalf("应能读回新书，实际 %d", len(books))
	}
	b := books[0]
	if b.Title != "新书" || b.Publisher != "新出版社" {
		t.Errorf("字段错误: %#v", b)
	}
	if len(b.Authors) != 1 || b.Authors[0] != "新作者" {
		t.Errorf("作者错误: %#v", b.Authors)
	}
	if len(b.Tags) != 1 || b.Tags[0] != "新标签" {
		t.Errorf("标签错误: %#v", b.Tags)
	}
}

// TestImportBookReusesExistingAuthor 复用已存在的作者。
func TestImportBookReusesExistingAuthor(t *testing.T) {
	db := newQueryDB(t)

	id, err := ImportBook(db, BookMeta{Title: "另一本", Author: "刘慈欣", Path: "p"})
	if err != nil {
		t.Fatalf("ImportBook: %v", err)
	}
	var authorID int64
	if err := db.QueryRow(`
		SELECT l.author FROM books_authors_link l WHERE l.book = ?`, id).Scan(&authorID); err != nil {
		t.Fatalf("查询作者关联: %v", err)
	}
	if authorID != 1 {
		t.Fatalf("应复用作者 id=1，实际 %d", authorID)
	}
}

// TestImportBookRequiresTitle 缺标题报错。
func TestImportBookRequiresTitle(t *testing.T) {
	db := newQueryDB(t)
	if _, err := ImportBook(db, BookMeta{Author: "某人"}); err == nil {
		t.Fatal("缺标题应报错")
	}
}

// TestDeleteBookRemovesRow 删除书籍行与关联。
func TestDeleteBookRemovesRow(t *testing.T) {
	db := newQueryDB(t)

	if err := DeleteBook(db, 1); err != nil {
		t.Fatalf("DeleteBook: %v", err)
	}
	ok, err := HasID(db, 1)
	if err != nil {
		t.Fatalf("HasID: %v", err)
	}
	if ok {
		t.Fatal("书籍应已被删除")
	}
	// 关联应被清理。
	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM books_authors_link WHERE book = 1`).Scan(&n); err != nil {
		t.Fatalf("查询关联: %v", err)
	}
	if n != 0 {
		t.Fatalf("作者关联应被清理，实际 %d", n)
	}
}

// TestDeleteBookMissing 删除不存在的书返回错误。
func TestDeleteBookMissing(t *testing.T) {
	db := newQueryDB(t)
	if err := DeleteBook(db, 999); err == nil {
		t.Fatal("删除不存在的书应报错")
	}
}

// TestAddFormatRegistersFormat 登记格式。
func TestAddFormatRegistersFormat(t *testing.T) {
	db := newQueryDB(t)

	src := filepath.Join(t.TempDir(), "x.epub")
	if err := os.WriteFile(src, []byte("data"), 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if err := AddFormat(db, 2, "epub", src, 1234, 5678); err != nil {
		t.Fatalf("AddFormat: %v", err)
	}
	path, missing, err := ResolvePath(db, 2, "EPUB")
	if err != nil {
		t.Fatalf("ResolvePath: %v", err)
	}
	if missing {
		t.Fatalf("文件存在，missing 应为 false")
	}
	if filepath.Base(path) != "x.epub" {
		t.Fatalf("格式登记错误: path=%q", path)
	}
}

// TestAddFormatRejectsEmptyFormat 空格式报错。
func TestAddFormatRejectsEmptyFormat(t *testing.T) {
	db := newQueryDB(t)
	if err := AddFormat(db, 1, "", "/tmp/x", 1, 1); err == nil {
		t.Fatal("空格式应报错")
	}
}

// TestSetTagsReplacesTags 替换标签关联。
func TestSetTagsReplacesTags(t *testing.T) {
	db := newQueryDB(t)

	if err := SetTags(db, 1, []string{"新标签A", "新标签B"}); err != nil {
		t.Fatalf("SetTags: %v", err)
	}
	books, err := GetBooksData(db, []int64{1})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books[0].Tags) != 2 {
		t.Fatalf("应有 2 个标签，实际 %#v", books[0].Tags)
	}
}

// TestSetTagsEmptyClearsTags 空列表清空标签。
func TestSetTagsEmptyClearsTags(t *testing.T) {
	db := newQueryDB(t)

	if err := SetTags(db, 1, nil); err != nil {
		t.Fatalf("SetTags: %v", err)
	}
	books, err := GetBooksData(db, []int64{1})
	if err != nil {
		t.Fatalf("GetBooksData: %v", err)
	}
	if len(books[0].Tags) != 0 {
		t.Fatalf("标签应被清空，实际 %#v", books[0].Tags)
	}
}

// TestWriteRejectsClosedDB 关闭的库返回错误。
func TestWriteRejectsClosedDB(t *testing.T) {
	db := newQueryDB(t)
	_ = db.Close()
	if _, err := ImportBook(db, BookMeta{Title: "x"}); err == nil {
		t.Fatal("关闭的库应报错")
	}
	if err := DeleteBook(db, 1); err == nil {
		t.Fatal("关闭的库应报错")
	}
	if err := SetTags(db, 1, []string{"a"}); err == nil {
		t.Fatal("关闭的库应报错")
	}
}
