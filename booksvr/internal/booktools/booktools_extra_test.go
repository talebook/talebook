package booktools

import (
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"talebook/booksvr/internal/library"
)

// TestImportAsNewBookCopiesAllMetadata 覆盖 insertBook 的全部关联分支。
func TestImportAsNewBookCopiesAllMetadata(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")

	// 作者、出版社、标签、丛书、语言、评分、简介、标识符。
	if _, err := db.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入作者失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_authors_link (book, author) VALUES (?, 1)`, bookID); err != nil {
		t.Fatalf("关联作者失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO publishers (id, name) VALUES (1, '重庆出版社')`); err != nil {
		t.Fatalf("插入出版社失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, 1)`,
		bookID); err != nil {
		t.Fatalf("关联出版社失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO tags (id, name) VALUES (1, '科幻')`); err != nil {
		t.Fatalf("插入标签失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_tags_link (book, tag) VALUES (?, 1)`, bookID); err != nil {
		t.Fatalf("关联标签失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO series (id, name) VALUES (1, '地球往事')`); err != nil {
		t.Fatalf("插入丛书失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_series_link (book, series) VALUES (?, 1)`, bookID); err != nil {
		t.Fatalf("关联丛书失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO languages (id, lang_code) VALUES (1, 'zho')`); err != nil {
		t.Fatalf("插入语言失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_languages_link (book, lang_code, item_order)
		VALUES (?, 1, 0)`, bookID); err != nil {
		t.Fatalf("关联语言失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO comments (book, text) VALUES (?, '简介')`, bookID); err != nil {
		t.Fatalf("插入简介失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO identifiers (book, type, val) VALUES (?, 'isbn', '9787')`,
		bookID); err != nil {
		t.Fatalf("插入标识符失败: %v", err)
	}

	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}

	book, err := ResolveBook(db, newID)
	if err != nil {
		t.Fatalf("ResolveBook: %v", err)
	}
	if book.Publisher != "重庆出版社" {
		t.Errorf("publisher = %q", book.Publisher)
	}
	if book.Series != "地球往事" {
		t.Errorf("series = %q", book.Series)
	}
	if len(book.Tags) != 1 || book.Tags[0] != "科幻" {
		t.Errorf("tags = %v", book.Tags)
	}
	if book.Language != "zho" {
		t.Errorf("language = %q", book.Language)
	}
	if book.Comments != "简介" {
		t.Errorf("comments = %q", book.Comments)
	}
	if book.ISBN != "9787" {
		t.Errorf("isbn = %q", book.ISBN)
	}
	if len(book.Authors) != 1 || book.Authors[0] != "刘慈欣" {
		t.Errorf("authors = %v", book.Authors)
	}
}

// TestImportAsNewBookReusesExistingCategoryItems 验证分类项复用而非重复创建。
func TestImportAsNewBookReusesExistingCategoryItems(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	if _, err := db.Exec(`INSERT INTO publishers (id, name) VALUES (1, '重庆出版社')`); err != nil {
		t.Fatalf("插入出版社失败: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books_publishers_link (book, publisher) VALUES (?, 1)`,
		bookID); err != nil {
		t.Fatalf("关联出版社失败: %v", err)
	}
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	if _, err := ImportAsNewBook(db, bookID, out, ImportOptions{}); err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}

	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM publishers WHERE name = '重庆出版社'`).Scan(&count); err != nil {
		t.Fatalf("查出版社失败: %v", err)
	}
	if count != 1 {
		t.Errorf("publishers 行数 = %d, want 1", count)
	}
}

// TestImportAsNewBookRegistersFormat 验证新书登记了格式文件。
func TestImportAsNewBookRegistersFormat(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}

	var format, name string
	if err := db.QueryRow(`SELECT format, name FROM data WHERE book = ?`, newID).
		Scan(&format, &name); err != nil {
		t.Fatalf("查 data 失败: %v", err)
	}
	if format != "TXT" {
		t.Errorf("format = %q", format)
	}
	if name != out {
		t.Errorf("name = %q, want %q", name, out)
	}
}

// TestImportAsNewBookMissingSource 验证源书不存在时报错。
func TestImportAsNewBookMissingSource(t *testing.T) {
	db := btSchema(t)
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := ImportAsNewBook(db, 999, out, ImportOptions{}); err == nil {
		t.Fatal("源书不存在应报错")
	}
}

// TestImportAsNewBookUnknownTitle 验证空标题退化为 Unknown。
func TestImportAsNewBookUnknownTitle(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "x", "TXT", "old")
	if _, err := db.Exec(`UPDATE books SET title = '' WHERE id = ?`, bookID); err != nil {
		t.Fatalf("清空标题失败: %v", err)
	}
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	book, _ := ResolveBook(db, newID)
	if book.Title != "Unknown" {
		t.Errorf("title = %q", book.Title)
	}
}

// TestOverwriteFormatMissingTarget 验证目标格式未登记时报错。
func TestOverwriteFormatMissingTarget(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "new.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	if _, err := OverwriteFormat(db, bookID, "MOBI", out, ""); err == nil {
		t.Fatal("未登记格式应报错")
	}
}

// TestOverwriteFormatMissingOutput 验证输出文件不存在时报错。
func TestOverwriteFormatMissingOutput(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	if _, err := OverwriteFormat(db, bookID, "TXT",
		filepath.Join(t.TempDir(), "nope.txt"), ""); err == nil {
		t.Fatal("输出文件不存在应报错")
	}
}

// TestGetFormatPathUnreadable 验证不可读文件报友好错误。
//
// Windows 的 os.Chmod 只影响只读位，无法制造「不可读」；该用例仅在类 Unix 生效。
func TestGetFormatPathUnreadable(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows 无法通过 chmod 制造不可读文件")
	}
	if os.Geteuid() == 0 {
		t.Skip("root 可读任意文件，跳过权限用例")
	}
	db := btSchema(t)
	bookID, path := btSeedBook(t, db, "三体", "TXT", "hello")
	if err := os.Chmod(path, 0o000); err != nil {
		t.Skipf("无法改权限，跳过: %v", err)
	}
	t.Cleanup(func() { _ = os.Chmod(path, 0o644) })

	if _, err := GetFormatPath(db, bookID, "TXT"); err == nil {
		t.Fatal("不可读文件应报错")
	}
}

// TestInsertBookEmptyAuthors 验证无作者时不建关联行。
func TestInsertBookEmptyAuthors(t *testing.T) {
	db := btSchema(t)
	bookID, _ := btSeedBook(t, db, "三体", "TXT", "old")
	out := filepath.Join(t.TempDir(), "out.txt")
	if err := os.WriteFile(out, []byte("new"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	newID, err := ImportAsNewBook(db, bookID, out, ImportOptions{AuthorsOverride: []string{}})
	if err != nil {
		t.Fatalf("ImportAsNewBook: %v", err)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM books_authors_link WHERE book = ?`, newID).
		Scan(&count); err != nil {
		t.Fatalf("查关联失败: %v", err)
	}
	if count != 0 {
		t.Errorf("作者关联数 = %d, want 0", count)
	}
}

// 确保 library 被引用。
var _ = library.BookData{}
