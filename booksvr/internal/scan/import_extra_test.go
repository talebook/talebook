package scan

import (
	"os"
	"path/filepath"
	"testing"

	"talebook/booksvr/internal/userdb"
)

// TestDeleteSourceAfterImportSuccess 目标存在时删除源文件。
func TestDeleteSourceAfterImportSuccess(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", p); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	if err := svc.deleteSourceAfterImport(row, p, "epub"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if row.Status == userdb.ScanStatusDeleteFailed {
		t.Errorf("目标存在时不应标记 delete_failed: %v", row.Data)
	}
	if _, err := os.Stat(p); !os.IsNotExist(err) {
		t.Errorf("源文件应被删除，stat err = %v", err)
	}
}

// TestDeleteSourceAfterImportRemoveError 删除失败时标记 delete_failed。
func TestDeleteSourceAfterImportRemoveError(t *testing.T) {
	dir := t.TempDir()
	// 非空目录：os.Remove 会失败。
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "x"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}

	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)
	if err := libraryRegisterFormat(lib, 1, "EPUB", sub); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: sub, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	if err := svc.deleteSourceAfterImport(row, sub, "epub"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	if row.Status != userdb.ScanStatusDeleteFailed {
		t.Errorf("删除失败应标记 delete_failed，得到 %q", row.Status)
	}
	if row.Data["delete_error"] == nil {
		t.Error("应记录 delete_error")
	}
}

// TestImportNewBookRegistersInPlace 新书导入必须**原地登记**：
// 源文件位置与文件名完全不变，只把绝对路径写进 book_formats。
//
// 方案 5.4 导入语义表：旧 Calibre「必须复制 + 改名」→ 新 Go「默认原地登记」。
// 目录约定（作者/书名 (id)）与 ASCII 转写都是被废弃的旧行为。
func TestImportNewBookRegistersInPlace(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "Author")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	p := makeValidEpub(t, sub, "三体.epub")
	before, err := os.Stat(p)
	if err != nil {
		t.Fatalf("stat 源文件失败: %v", err)
	}

	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	bookID, err := svc.importNewBook(importmetaForTest(), p, "epub", 7, "ebook", ModeIndex)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}

	// 1. 源文件必须原地不动：路径、文件名、大小、mtime 全不变。
	after, err := os.Stat(p)
	if err != nil {
		t.Fatalf("源文件消失了: %v", err)
	}
	if filepath.Base(p) != "三体.epub" {
		t.Errorf("源文件名被改: %q", filepath.Base(p))
	}
	if filepath.Dir(p) != sub {
		t.Errorf("源文件被移动: %q, want %q", filepath.Dir(p), sub)
	}
	if after.Size() != before.Size() {
		t.Errorf("源文件大小变了: %d -> %d", before.Size(), after.Size())
	}
	if !after.ModTime().Equal(before.ModTime()) {
		t.Errorf("源文件 mtime 变了: %v -> %v", before.ModTime(), after.ModTime())
	}

	// 2. book_formats 必须登记源文件的绝对路径。
	var stored string
	if err := lib.QueryRow(
		`SELECT path FROM book_formats WHERE book_id = ? AND format = ?`, bookID, "EPUB").Scan(&stored); err != nil {
		t.Fatalf("book_formats 未登记: %v", err)
	}
	abs, err := filepath.Abs(p)
	if err != nil {
		t.Fatalf("abs: %v", err)
	}
	if stored != abs {
		t.Errorf("book_formats.path = %q, want %q", stored, abs)
	}

	// 3. 不得在书库根目录下新建任何目录（无目录约定）。
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatalf("read dir: %v", err)
	}
	for _, e := range entries {
		if e.Name() != "Author" {
			t.Errorf("导入不应在源目录旁新建 %q", e.Name())
		}
	}
}

// TestImportNewBookEmptyTitle 空书名时报错。
func TestImportNewBookEmptyTitle(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	mi := importmetaForTest()
	mi.Title = ""
	if _, err := svc.importNewBook(mi, p, "epub", 7, "ebook", ModeIndex); err == nil {
		t.Error("空书名应报错")
	}
}

// TestImportNewBookNoAuthors 无作者时 author 为空。
func TestImportNewBookNoAuthors(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	mi := importmetaForTest()
	mi.Authors = nil
	bookID, err := svc.importNewBook(mi, p, "epub", 7, "ebook", ModeIndex)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	var author string
	if err := lib.QueryRow(`SELECT COALESCE(author_sort,'') FROM books WHERE id = ?`, bookID).Scan(&author); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if author != "" {
		t.Errorf("author = %q, want 空", author)
	}
}

// TestEnsureIndexedItemAbsPath src_path 写入绝对路径。
func TestEnsureIndexedItemAbsPath(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if err := svc.ensureIndexedItem(1, 7, p, "ebook"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	item, err := userdb.GetItem(db, 1)
	if err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if !filepath.IsAbs(item.SrcPath) {
		t.Errorf("src_path 应为绝对路径，得到 %q", item.SrcPath)
	}
}

// TestMarkIndexedNewBook 索引模式新建书籍。
func TestMarkIndexedNewBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 5, 7, "ebook", 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusIndexed {
		t.Errorf("status = %q, want indexed", status)
	}
	if bookID == 0 {
		t.Error("应返回书籍 ID")
	}
	if row.Data["created_book"] != true {
		t.Errorf("created_book = %v, want true", row.Data["created_book"])
	}
	if row.Data["format"] != "EPUB" {
		t.Errorf("format = %v, want EPUB", row.Data["format"])
	}
	if row.ImportID != 5 {
		t.Errorf("import_id = %d, want 5", row.ImportID)
	}
}

// TestMarkIndexedFailure 建立索引失败时标记 failed。
func TestMarkIndexedFailure(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	mi := importmetaForTest()
	mi.Title = ""
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markIndexed(row, mi, p, "epub", 5, 7, "ebook", 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", status)
	}
	if row.Data["index_error"] == nil {
		t.Error("应记录 index_error")
	}
}

// TestAddExternalIndexRecordNewBook 新建索引记录。
func TestAddExternalIndexRecordNewBook(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	lib := importLibraryDB(t)
	svc := newImportService(t, importTestDB(t), lib)

	id, created, err := svc.addExternalIndexRecord(importmetaForTest(), p, "epub", 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id == 0 || !created {
		t.Errorf("应新建书籍，得到 (%d,%v)", id, created)
	}
}

// TestAddExternalIndexRecordEmptyTitle 空书名时报错。
func TestAddExternalIndexRecordEmptyTitle(t *testing.T) {
	svc := newImportService(t, importTestDB(t), importLibraryDB(t))
	mi := importmetaForTest()
	mi.Title = ""
	if _, _, err := svc.addExternalIndexRecord(mi, "/x.epub", "epub", 0); err == nil {
		t.Error("空书名应报错")
	}
}

// TestAddExternalIndexRecordNoAuthors 无作者。
func TestAddExternalIndexRecordNoAuthors(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	lib := importLibraryDB(t)
	svc := newImportService(t, importTestDB(t), lib)

	mi := importmetaForTest()
	mi.Authors = nil
	id, created, err := svc.addExternalIndexRecord(mi, p, "epub", 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id == 0 || !created {
		t.Errorf("应新建书籍，得到 (%d,%v)", id, created)
	}
}

// TestFindSameAuthorBookExist 已有该格式。
func TestFindSameAuthorBookExist(t *testing.T) {
	lib := importLibraryDB(t)
	svc := newImportService(t, importTestDB(t), lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	id, exist, err := svc.findSameAuthorBook(importmetaForTest(), "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 42 || !exist {
		t.Errorf("应返回 (42,true)，得到 (%d,%v)", id, exist)
	}
}

// TestFindSameAuthorBookDifferentAuthor 同名不同作者。
func TestFindSameAuthorBookDifferentAuthor(t *testing.T) {
	lib := importLibraryDB(t)
	svc := newImportService(t, importTestDB(t), lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '刘慈欣')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '刘慈欣')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	id, exist, err := svc.findSameAuthorBook(importmetaForTest(), "epub")
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if id != 0 || exist {
		t.Errorf("同名不同作者应返回 (0,false)，得到 (%d,%v)", id, exist)
	}
}

// TestImportRowExistBranch 导入时命中 exist 分支。
func TestImportRowExistBranch(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.importRow(row, 7, ModeCopy, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusExist {
		t.Errorf("status = %q, want exist", status)
	}
	if bookID != 0 {
		t.Errorf("exist 分支不应返回 book_id，得到 %d", bookID)
	}
}

// TestImportRowIndexNewBook 索引模式新建书籍。
func TestImportRowIndexNewBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.importRow(row, 7, ModeIndex, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusIndexed {
		t.Errorf("status = %q, want indexed", status)
	}
	if bookID == 0 {
		t.Error("应返回书籍 ID")
	}
}

// TestImportRowSameAuthorIndexMode 同名同作者 + 索引模式。
func TestImportRowSameAuthorIndexMode(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.importRow(row, 7, ModeIndex, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusIndexed {
		t.Errorf("status = %q, want indexed", status)
	}
	if bookID != 42 {
		t.Errorf("book_id = %d, want 42", bookID)
	}
}

// TestImportRowSameAuthorAddFormat 同名同作者 + 复制模式添加格式。
func TestImportRowSameAuthorAddFormat(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.importRow(row, 7, ModeCopy, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", status)
	}
	if bookID != 42 {
		t.Errorf("book_id = %d, want 42", bookID)
	}
}

// TestImportRowNewBook 新书导入分支。
func TestImportRowNewBook(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.importRow(row, 7, ModeCopy, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", status)
	}
	if bookID == 0 {
		t.Error("应返回书籍 ID")
	}
}

// TestImportRowMarkImportedNoDelete 非剪切模式不删除。
func TestImportRowMarkImportedNoDelete(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markImported(row, p, "epub", ModeCopy, true)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", status)
	}
	if _, err := os.Stat(p); err != nil {
		t.Errorf("复制模式不应删除源文件: %v", err)
	}
}

// TestImportRowMarkImportedDeleteSourceFalse 剪切模式但 deleteSource=false。
func TestImportRowMarkImportedDeleteSourceFalse(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markImported(row, p, "epub", ModeMove, false)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusImported {
		t.Errorf("status = %q, want imported", status)
	}
	if _, err := os.Stat(p); err != nil {
		t.Errorf("deleteSource=false 时不应删除源文件: %v", err)
	}
}

// TestImportRowMarkImportedDeleteSourceError 剪切模式删除失败。
func TestImportRowMarkImportedDeleteSourceError(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "x"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", sub); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: sub, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markImported(row, sub, "epub", ModeMove, true)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusDeleteFailed {
		t.Errorf("status = %q, want delete_failed", status)
	}
}

// TestImportRowMarkIndexedReuseExisting 索引复用已有书籍。
func TestImportRowMarkIndexedReuseExisting(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, bookID, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 42)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusIndexed || bookID != 42 {
		t.Errorf("得到 (%q,%d), want (indexed,42)", status, bookID)
	}
	if row.Data["created_book"] != false {
		t.Errorf("created_book = %v, want false", row.Data["created_book"])
	}
}

// TestImportRowMarkIndexedReuseAddFormatError 复用但添加格式失败。
func TestImportRowMarkIndexedReuseAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 42)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", status)
	}
}

// TestImportRowMarkIndexedNewBookAddFormatError 新建但添加格式失败。
func TestImportRowMarkIndexedNewBookAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 0)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", status)
	}
}

// TestImportRowMarkIndexedEnsureError 索引 items 失败。
func TestImportRowMarkIndexedEnsureError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 0); err == nil {
		t.Error("items 表缺失应报错")
	}
}

// TestImportRowMarkIndexedSaveError 索引最终保存失败。
func TestImportRowMarkIndexedSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 0); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkIndexedFailureSaveError 索引失败后保存失败。
func TestImportRowMarkIndexedFailureSaveError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	mi := importmetaForTest()
	mi.Title = ""
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, mi, p, "epub", 1, 7, "ebook", 0); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkImportedSaveError 保存失败。
func TestImportRowMarkImportedSaveError(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))
	row := &userdb.ScanFile{Path: "/x", Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markImported(row, "/x", "epub", ModeCopy, false); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowDeleteSourceSaveError 删除后保存失败。
func TestImportRowDeleteSourceSaveError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", filepath.Join(dir, "gone.epub")); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if err := svc.deleteSourceAfterImport(row, p, "epub"); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowDeleteSourceRemoveErrorSaveError 删除失败后保存失败。
func TestImportRowDeleteSourceRemoveErrorSaveError(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "x"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", sub); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: sub, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if err := svc.deleteSourceAfterImport(row, sub, "epub"); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowEnsureIndexedItemUpdateError src_path 更新失败。
func TestImportRowEnsureIndexedItemUpdateError(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE items (book_id INTEGER PRIMARY KEY, media_type TEXT,
		media_type_locked BOOLEAN DEFAULT 0, collector_id INTEGER)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if err := svc.ensureIndexedItem(1, 7, "/x.epub", "ebook"); err == nil {
		t.Error("src_path 列缺失应报错")
	}
}

// TestSetItemMediaTypeUpdateError items 列缺失。
func TestSetItemMediaTypeUpdateError(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE items (book_id INTEGER PRIMARY KEY, collector_id INTEGER)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if err := svc.setItemMediaType(1, 7, "ebook"); err == nil {
		t.Error("media_type 列缺失应报错")
	}
}

// TestSetItemMediaTypeMergeExisting 已有行时按优先级合并。
func TestSetItemMediaTypeMergeExisting(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if _, err := db.Exec(`INSERT INTO items (book_id, media_type, media_type_locked) VALUES (1, 'ebook', 0)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := svc.setItemMediaType(1, 7, "comic"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	var mt string
	if err := db.QueryRow(`SELECT media_type FROM items WHERE book_id = 1`).Scan(&mt); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if mt != "comic" {
		t.Errorf("media_type = %q, want comic", mt)
	}
}

// TestImportRowSetItemError items 表缺失。
func TestImportRowSetItemError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("items 表缺失应报错")
	}
}

// TestImportRowAddFormatError 同名同作者添加格式失败。
func TestImportRowAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("book_formats 缺失应报错")
	}
}

// TestImportRowNewBookAddFormatError 新书添加格式失败。
func TestImportRowNewBookAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("book_formats 缺失应报错")
	}
}

// TestImportRowIndexAddFormatError 索引模式添加格式失败。
//
// 索引模式复用已有书籍时，若 book_formats 缺失则标记 failed。
func TestImportRowIndexAddFormatError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`DROP TABLE book_formats`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	status, _, err := svc.importRow(row, 7, ModeIndex, 1)
	if err != nil {
		t.Fatalf("失败: %v", err)
	}
	if status != userdb.ScanStatusFailed {
		t.Errorf("status = %q, want failed", status)
	}
}

// TestImportRowSameAuthorSetItemError 同名同作者分支 items 失败。
func TestImportRowSameAuthorSetItemError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("items 表缺失应报错")
	}
}

// TestImportRowIndexSameAuthorEnsureError 索引 + 同作者 items 失败。
func TestImportRowIndexSameAuthorEnsureError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeIndex, 1); err == nil {
		t.Error("items 表缺失应报错")
	}
}

// TestImportRowSaveErrors 各阶段保存失败。
func TestImportRowSaveErrors(t *testing.T) {
	cases := []struct {
		name  string
		setup func(t *testing.T, db, lib interface {
			Exec(string, ...any) (interface{}, error)
		})
	}{
		// 占位：具体场景由下方独立测试覆盖。
	}
	_ = cases
}

// TestImportReadyRowsSaveError Import 中保存 import_id 失败。
func TestImportReadyRowsSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)
	seedReadyRow(t, db, p, "sha256:x")

	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := svc.Import(nil, 7, false, ModeCopy); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowInitialSaveError 初始保存失败。
func TestImportRowInitialSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowAnalysisSaveError 分析失败后保存失败。
func TestImportRowAnalysisSaveError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "bad.epub", []byte("not a zip"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowExistSaveError exist 分支保存失败。
func TestImportRowExistSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowNewBookImportError 新书导入失败。
func TestImportRowNewBookImportError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	_ = lib.Close()
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportRowIndexError 索引模式建立记录失败。
func TestImportRowIndexError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	_ = lib.Close()
	if _, _, err := svc.importRow(row, 7, ModeIndex, 1); err == nil {
		t.Error("书库损坏应报错")
	}
}

// TestImportRowMarkImportedSaveError2 复制模式最终保存失败。
func TestImportRowMarkImportedSaveError2(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowDeleteSourceSaveError2 剪切模式保存失败。
func TestImportRowDeleteSourceSaveError2(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeMove, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowIndexSaveError 索引模式保存失败。
func TestImportRowIndexSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeIndex, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowSameAuthorAddFormatSaveError 同作者添加格式后保存失败。
func TestImportRowSameAuthorAddFormatSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowIndexSameAuthorAddFormatSaveError 索引 + 同作者保存失败。
func TestImportRowIndexSameAuthorAddFormatSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'MOBI', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeIndex, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowNewBookSaveError 新书导入后保存失败。
func TestImportRowNewBookSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowIndexNewBookSaveError 索引新书保存失败。
func TestImportRowIndexNewBookSaveError(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeIndex, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowExistSaveError2 exist 分支保存失败（重复覆盖）。
func TestImportRowExistSaveError2(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := lib.Exec(`INSERT INTO books (id, title, author_sort) VALUES (42, '三体', '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO authors (id, name) VALUES (1, '佚名')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO books_authors_link (book, author) VALUES (42, 1)`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := lib.Exec(`INSERT INTO data (book, format, name) VALUES (42, 'EPUB', 'x')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}

	row := &userdb.ScanFile{Path: p, Hash: "sha256:x", Status: userdb.ScanStatusReady, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.importRow(row, 7, ModeCopy, 1); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkIndexedSaveError2 索引保存失败（重复覆盖）。
func TestImportRowMarkIndexedSaveError2(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 42); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkIndexedEnsureError2 索引 items 失败（复用分支）。
func TestImportRowMarkIndexedEnsureError2(t *testing.T) {
	dir := t.TempDir()
	p := makeValidEpub(t, dir, "三体.epub")
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, importmetaForTest(), p, "epub", 1, 7, "ebook", 42); err == nil {
		t.Error("items 表缺失应报错")
	}
}

// TestImportRowMarkImportedDeleteSourceSaveError 删除后保存失败。
func TestImportRowMarkImportedDeleteSourceSaveError(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", p); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markImported(row, p, "epub", ModeMove, true); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkImportedDeleteSourceRemoveError 删除失败后保存失败。
func TestImportRowMarkImportedDeleteSourceRemoveError(t *testing.T) {
	dir := t.TempDir()
	sub := filepath.Join(dir, "sub")
	if err := os.Mkdir(sub, 0o755); err != nil {
		t.Fatalf("建目录失败: %v", err)
	}
	if err := os.WriteFile(filepath.Join(sub, "x"), []byte("x"), 0o644); err != nil {
		t.Fatalf("写文件失败: %v", err)
	}
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	if err := libraryRegisterFormat(lib, 1, "EPUB", sub); err != nil {
		t.Fatalf("登记失败: %v", err)
	}
	row := &userdb.ScanFile{BookID: 1, Path: sub, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markImported(row, sub, "epub", ModeMove, true); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowMarkIndexedFailureSaveError2 索引失败保存失败（重复覆盖）。
func TestImportRowMarkIndexedFailureSaveError2(t *testing.T) {
	dir := t.TempDir()
	p := writeBook(t, dir, "a.epub", []byte("x"))
	db := importTestDB(t)
	lib := importLibraryDB(t)
	svc := newImportService(t, db, lib)

	mi := importmetaForTest()
	mi.Title = ""
	row := &userdb.ScanFile{Path: p, Data: map[string]any{}}
	if err := insertScanFile(db, row); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if _, err := db.Exec(`DROP TABLE scanfiles`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, _, err := svc.markIndexed(row, mi, p, "epub", 1, 7, "ebook", 42); err == nil {
		t.Error("scanfiles 缺失应报错")
	}
}

// TestImportRowEnsureIndexedItemError2 src_path 更新失败（重复覆盖）。
func TestImportRowEnsureIndexedItemError2(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if _, err := db.Exec(`DROP TABLE items`); err != nil {
		t.Fatalf("删表失败: %v", err)
	}
	if _, err := db.Exec(`CREATE TABLE items (book_id INTEGER PRIMARY KEY, media_type TEXT,
		media_type_locked BOOLEAN DEFAULT 0, collector_id INTEGER)`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	if err := svc.ensureIndexedItem(1, 7, "/x.epub", "comic"); err == nil {
		t.Error("src_path 列缺失应报错")
	}
}

// TestImportRowSetItemMediaTypeUpdateError2 已有行时按优先级合并。
func TestImportRowSetItemMediaTypeUpdateError2(t *testing.T) {
	db := importTestDB(t)
	svc := newImportService(t, db, importLibraryDB(t))

	if _, err := db.Exec(`INSERT INTO items (book_id, collector_id, media_type, scope, book_type)
		VALUES (1, 7, 'ebook', 'public', 'ebook')`); err != nil {
		t.Fatalf("插入失败: %v", err)
	}
	if err := svc.setItemMediaType(1, 7, "comic"); err != nil {
		t.Fatalf("失败: %v", err)
	}
	var mt string
	if err := db.QueryRow(`SELECT media_type FROM items WHERE book_id = 1`).Scan(&mt); err != nil {
		t.Fatalf("查询失败: %v", err)
	}
	if mt != "comic" {
		t.Errorf("media_type = %q, want comic", mt)
	}
}
