package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"talebook/booksvr/internal/library"
)

// createFormatTables 补建 book_formats 与 data 表（Calibre 格式登记所需）。
func createFormatTables(t *testing.T, db *sql.DB) {
	t.Helper()
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS book_formats (
			id INTEGER PRIMARY KEY, book_id INTEGER NOT NULL, format TEXT NOT NULL,
			path TEXT NOT NULL, size INTEGER, mtime INTEGER, hash TEXT,
			UNIQUE (book_id, format))`,
		`CREATE TABLE IF NOT EXISTS data (
			id INTEGER PRIMARY KEY, book INTEGER NOT NULL, format TEXT NOT NULL,
			uncompressed_size INTEGER, name TEXT NOT NULL)`,
		// 表名必须是 scanfiles（无下划线），与 userdb 的 schema 一致。
		// 曾误写为 scan_files，导致生产代码的 DELETE 语句与夹具互相印证，
		// 测试全绿但真实库报 no such table: scan_files。
		`CREATE TABLE IF NOT EXISTS scanfiles (
			id INTEGER PRIMARY KEY, book_id INTEGER, path TEXT, hash TEXT)`,
	}
	for _, stmt := range stmts {
		if _, err := db.Exec(stmt); err != nil {
			t.Fatalf("建格式表失败: %v\n%s", err, stmt)
		}
	}
}

// newWriteFixture 建一个带真实 bookWiring 的夹具。
func newWriteFixture(t *testing.T) (*bookWiring, *sql.DB) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	w := newBookWiring(db, db, map[string]any{})
	return w, db
}

// adminCtx 返回管理员上下文。
func adminCtx(userID int64) *Context {
	return &Context{Identity: Identity{UserID: userID, IsAdmin: true}}
}

// seedFormat 给书籍登记一个格式。
func seedFormat(t *testing.T, db *sql.DB, bookID int64, format, path string) {
	t.Helper()
	if err := library.RegisterFormat(db, bookID, format, path, 100, 0); err != nil {
		t.Fatalf("登记格式失败: %v", err)
	}
}

// TestBookDeleteRemovesBook 覆盖书籍删除。
func TestBookDeleteRemovesBook(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "待删书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	ok, err := library.HasID(db, 1)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Error("书籍未被删除")
	}
}

// TestBookDeleteClearsScanFiles 回归：删除书籍时必须清理 scanfiles 记录。
//
// 表名是 scanfiles（无下划线）。曾误写为 scan_files，而测试夹具也建了
// 同名的错表，两者互相印证导致测试全绿，真实库却报 no such table: scan_files。
func TestBookDeleteClearsScanFiles(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "待删书")
	insertItem(t, db, 1, "public", 1)

	// 造一条指向该书的扫描记录。
	if _, err := db.Exec(
		`INSERT INTO scanfiles (id, book_id, path, hash) VALUES (1, 1, '/tmp/x.mobi', 'h1')`); err != nil {
		t.Fatalf("插入 scanfiles 失败: %v", err)
	}

	resp, err := w.bookDelete(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("删除失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(*) FROM scanfiles WHERE book_id = 1`).Scan(&n); err != nil {
		t.Fatalf("查询 scanfiles 失败: %v", err)
	}
	if n != 0 {
		t.Errorf("scanfiles 残留 %d 条，期望 0", n)
	}
}

// TestBookDeleteMissingBook 覆盖删除不存在的书。
func TestBookDeleteMissingBook(t *testing.T) {
	w, _ := newWriteFixture(t)
	resp, err := w.bookDelete(adminCtx(1), 999)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.book.invalid" {
		t.Errorf("err = %v，期望 params.book.invalid", resp["err"])
	}
}

// TestBookDeletePermissionDenied 覆盖非管理员非所有者被拒。
func TestBookDeletePermissionDenied(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "他人书")
	insertItem(t, db, 1, "public", 1)

	ctx := &Context{Identity: Identity{UserID: 2, IsAdmin: false}}
	resp, err := w.bookDelete(ctx, 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "permission" {
		t.Errorf("err = %v，期望 permission", resp["err"])
	}
}

// TestBookDeleteFormatRemovesOne 覆盖格式删除。
func TestBookDeleteFormatRemovesOne(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "多格式书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")
	seedFormat(t, db, 1, "MOBI", "/tmp/a.mobi")

	resp, err := w.bookDeleteFormat(adminCtx(1), 1, "mobi")
	if err != nil {
		t.Fatalf("删除格式失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	if w.hasFormat(1, "mobi") {
		t.Error("MOBI 格式未被删除")
	}
	if !w.hasFormat(1, "epub") {
		t.Error("EPUB 格式被误删")
	}
}

// TestBookDeleteFormatLastFormat 覆盖最后一个格式不可删。
func TestBookDeleteFormatLastFormat(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "单格式书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")

	resp, err := w.bookDeleteFormat(adminCtx(1), 1, "epub")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "last.format" {
		t.Errorf("err = %v，期望 last.format", resp["err"])
	}
}

// TestBookDeleteFormatNotFound 覆盖格式不存在。
func TestBookDeleteFormatNotFound(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")
	seedFormat(t, db, 1, "PDF", "/tmp/a.pdf")

	resp, err := w.bookDeleteFormat(adminCtx(1), 1, "mobi")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_found" {
		t.Errorf("err = %v，期望 format.not_found", resp["err"])
	}
}

// TestBookDeleteFormatEmpty 覆盖空格式参数。
func TestBookDeleteFormatEmpty(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookDeleteFormat(adminCtx(1), 1, "  ")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.missing" {
		t.Errorf("err = %v，期望 params.missing", resp["err"])
	}
}

// TestBookEditUpdatesTitle 覆盖书名编辑。
func TestBookEditUpdatesTitle(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "旧书名")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookEdit(adminCtx(1), 1, map[string]any{"title": "新书名"})
	if err != nil {
		t.Fatalf("编辑失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	var title string
	if err := db.QueryRow(`SELECT title FROM books WHERE id = 1`).Scan(&title); err != nil {
		t.Fatal(err)
	}
	if title != "新书名" {
		t.Errorf("title = %q，期望 新书名", title)
	}
}

// TestBookEditEmptyTitle 覆盖空书名被拒。
func TestBookEditEmptyTitle(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookEdit(adminCtx(1), 1, map[string]any{"title": "   "})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.title" {
		t.Errorf("err = %v，期望 params.title", resp["err"])
	}
}

// TestBookEditWritesAuthors 覆盖作者写入。
func TestBookEditWritesAuthors(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)

	resp, err := w.bookEdit(adminCtx(1), 1, map[string]any{
		"title":   "书",
		"authors": []any{"刘慈欣", "阿西莫夫"},
	})
	if err != nil {
		t.Fatalf("编辑失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM books_authors_link WHERE book = 1`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 2 {
		t.Errorf("作者数 = %d，期望 2", n)
	}
}

// TestBookReadBookReturnsFormats 覆盖在线阅读入口。
//
// 注意：/read/<id> 是**页面**而非 JSON 接口（见缺陷 10）。
// 本测试只验证有 EPUB 时不报错且写出了 HTML；页面内容由
// book_read_page_test.go 的 TestBookReadReturnsHTML 覆盖。
func TestBookReadBookReturnsFormats(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "可读书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")

	ctx := adminCtx(1)
	ctx.Writer = httptest.NewRecorder()
	resp, err := w.bookReadBook(ctx, 1)
	if err != nil {
		t.Fatalf("阅读失败: %v", err)
	}
	// 页面已由 handler 自行写出，返回值为 nil。
	if resp != nil {
		t.Errorf("resp = %v，页面 handler 应返回 nil", resp)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if !strings.Contains(rec.Body.String(), "<!DOCTYPE html>") {
		t.Errorf("未写出 HTML 页面: %q", rec.Body.String())
	}
}

// TestBookReadBookNoFormat 覆盖无格式可读。
//
// 无格式时返回 415（与 Python 的 HTTPError(415) 一致），不再返回 JSON。
func TestBookReadBookNoFormat(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "空书")
	insertItem(t, db, 1, "public", 1)

	ctx := adminCtx(1)
	ctx.Writer = httptest.NewRecorder()
	resp, err := w.bookReadBook(ctx, 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp != nil {
		t.Errorf("resp = %v，应直接写响应", resp)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusUnsupportedMediaType {
		t.Errorf("status = %d, want 415", rec.Code)
	}
}

// TestBookReaderBootstrapPrefersEpub 覆盖阅读器引导的格式优先级。
func TestBookReaderBootstrapPrefersEpub(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "MOBI", "/tmp/a.mobi")
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")

	resp, err := w.bookReaderBootstrap(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("引导失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if resp["preferred"] != "epub" {
		t.Errorf("preferred = %v，期望 epub", resp["preferred"])
	}
}

// TestBookReadTxtMissingFormat 覆盖无 TXT 格式。
func TestBookReadTxtMissingFormat(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "EPUB", "/tmp/a.epub")

	resp, err := w.bookReadTxt(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "format.not_found" {
		t.Errorf("err = %v，期望 format.not_found", resp["err"])
	}
}

// TestBookReadTxtMissingFile 覆盖 TXT 文件缺失。
func TestBookReadTxtMissingFile(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "public", 1)
	seedFormat(t, db, 1, "TXT", "/nonexistent/a.txt")

	resp, err := w.bookReadTxt(adminCtx(1), 1)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "file.missing" {
		t.Errorf("err = %v，期望 file.missing", resp["err"])
	}
}

// TestDecodeTxtBodyStripsBOM 覆盖 BOM 剥离。
func TestDecodeTxtBodyStripsBOM(t *testing.T) {
	body := []byte{0xEF, 0xBB, 0xBF, 'h', 'i'}
	if got := decodeTxtBody(body); got != "hi" {
		t.Errorf("decodeTxtBody = %q，期望 hi", got)
	}
}

// TestDecodeTxtBodyEmpty 覆盖空内容。
func TestDecodeTxtBodyEmpty(t *testing.T) {
	if got := decodeTxtBody(nil); got != "" {
		t.Errorf("decodeTxtBody = %q，期望空串", got)
	}
}

// TestItemScopeAndExternalIndex 覆盖 scope 与外部索引判定。
func TestItemScopeAndExternalIndex(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	insertItem(t, db, 1, "private", 1)

	if got := w.itemScope(1); got != "private" {
		t.Errorf("itemScope = %q，期望 private", got)
	}
	if w.isExternalIndexBook(1) {
		t.Error("非外部索引书被误判")
	}
}

// TestAvailableFormatsEmpty 覆盖无格式时返回空。
func TestAvailableFormatsEmpty(t *testing.T) {
	w, db := newWriteFixture(t)
	insertBook(t, db, 1, "书")
	if got := w.availableFormats(1); len(got) != 0 {
		t.Errorf("availableFormats = %v，期望空", got)
	}
}
