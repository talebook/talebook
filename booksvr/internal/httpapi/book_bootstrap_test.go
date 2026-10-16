package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

// 缺陷回归：/api/book/<id>/reader-bootstrap 返回的字段与 Readest 启动协议不符。
//
// 用户可见现象：点「阅读」进入 Readest 页面，报
// 「暂时无法使用 Readest / 阅读器启动协议不兼容」。
//
// 根因：Go 侧实现的是旧的 Candle 引导形状
// {book_id, title, formats, preferred, epub_ready}，
// 而前端 app/public/readest/talebook-launch.js 的 validateReadestBootstrap
// 要求 schema/engine/book/resource/navigation 五组字段，缺一个就拒绝启动。

// bootstrapWiring 造一本带真实 EPUB 文件的书，便于算出 revision。
func bootstrapWiring(t *testing.T) (*bookWiring, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	root := t.TempDir()
	epubDir := filepath.Join(root, "Author", "Book")
	if err := os.MkdirAll(epubDir, 0o755); err != nil {
		t.Fatal(err)
	}
	epubFile := filepath.Join(epubDir, "book.epub")
	if err := os.WriteFile(epubFile, []byte("PK\x03\x04fake-epub"), 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', 'Author/Book')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'EPUB', ?, 12, 0)`,
		filepath.Join("Author", "Book", "book.epub")); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	w := newBookWiring(db, db, map[string]any{}, nil)
	w.libraryRoot = root
	return w, epubFile
}

// serveBootstrap 以管理员身份请求 reader-bootstrap。
func serveBootstrap(t *testing.T, w *bookWiring, query string) *httptest.ResponseRecorder {
	t.Helper()
	cfg := w.Config("")
	cfg.CanViewBook = func(*Context, int64) bool { return true }

	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = w.db
	if _, err := srv.DB.Exec(
		`INSERT OR REPLACE INTO readers (id, username, active, permission) VALUES (1, 'admin', 1, '')`); err != nil {
		t.Fatalf("insert reader: %v", err)
	}
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}
	path := "/api/book/1/reader-bootstrap"
	if query != "" {
		path += "?" + query
	}
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

// TestReaderBootstrapMatchesReadestProtocol 断言响应满足前端校验契约。
func TestReaderBootstrapMatchesReadestProtocol(t *testing.T) {
	w, epubFile := bootstrapWiring(t)
	rec := serveBootstrap(t, w, "engine=readest")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d，期望 200（body=%q）", rec.Code, rec.Body.String())
	}

	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("响应不是 JSON: %v", err)
	}

	if got["err"] != "ok" {
		t.Fatalf("err = %v", got["err"])
	}
	if got["schema"] != "talebook.reader.bootstrap.v1" {
		t.Errorf("schema = %v，期望 talebook.reader.bootstrap.v1", got["schema"])
	}
	if got["engine"] != "readest" {
		t.Errorf("engine = %v，期望 readest", got["engine"])
	}

	book, ok := got["book"].(map[string]any)
	if !ok {
		t.Fatalf("book 类型是 %T，期望对象", got["book"])
	}
	if book["format"] != "epub" {
		t.Errorf("book.format = %v，期望 epub", book["format"])
	}
	revision, _ := book["revision"].(string)
	if revision == "" {
		t.Error("book.revision 为空，前端会报「书籍版本标识无效」")
	}

	resource, ok := got["resource"].(map[string]any)
	if !ok {
		t.Fatalf("resource 类型是 %T，期望对象", got["resource"])
	}
	if resource["mime"] != "application/epub+zip" {
		t.Errorf("resource.mime = %v", resource["mime"])
	}
	if resource["range"] != true {
		t.Errorf("resource.range = %v，期望 true", resource["range"])
	}
	wantURL := "/read/resource/1.epub?revision=" + revision
	if resource["url"] != wantURL {
		t.Errorf("resource.url = %v，期望 %v", resource["url"], wantURL)
	}

	nav, ok := got["navigation"].(map[string]any)
	if !ok {
		t.Fatalf("navigation 类型是 %T，期望对象", got["navigation"])
	}
	if nav["back"] != "/book/1" {
		t.Errorf("navigation.back = %v", nav["back"])
	}
	if nav["fallback"] != "/read/1?reader=candle" {
		t.Errorf("navigation.fallback = %v", nav["fallback"])
	}

	// revision 必须与文件真实 mtime/size 对应，否则资源版本校验会失败。
	if want := readerResourceRevision(epubFile); revision != want {
		t.Errorf("revision = %q，期望 %q", revision, want)
	}
}

// TestReaderBootstrapCapabilities 断言能力表与 Python 一致。
func TestReaderBootstrapCapabilities(t *testing.T) {
	caps := readerBootstrapCapabilities()

	for _, k := range []string{
		"readerCore", "navigation", "tableOfContents", "textSearch",
		"localPosition", "localSettings", "layoutSettings",
		"appearanceSettings", "languageSettings",
	} {
		if caps[k] != true {
			t.Errorf("capabilities[%q] = %v，期望 true", k, caps[k])
		}
	}
	for _, k := range []string{
		"cloud", "sync", "payment", "account", "auth", "annotations",
		"serverProgress", "pdf", "tts", "readestGateway", "tauri",
	} {
		if caps[k] != false {
			t.Errorf("capabilities[%q] = %v，期望 false", k, caps[k])
		}
	}
}

// TestReaderBootstrapRequiresReadestEngine 回归：engine 不是 readest 时 400。
func TestReaderBootstrapRequiresReadestEngine(t *testing.T) {
	w, _ := bootstrapWiring(t)

	for _, q := range []string{"", "engine=candle", "engine=other"} {
		rec := serveBootstrap(t, w, q)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("query=%q status = %d，期望 400", q, rec.Code)
		}
		var got map[string]any
		if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
			t.Fatalf("响应不是 JSON: %v", err)
		}
		if got["err"] != "reader.engine_unsupported" {
			t.Errorf("query=%q err = %v，期望 reader.engine_unsupported", q, got["err"])
		}
	}
}

// TestReaderBootstrapNoEpub 回归：没有 EPUB 时 404 format_unsupported。
func TestReaderBootstrapNoEpub(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '纯TXT', 'x', '')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'TXT', '/tmp/a.txt', 1, 0)`); err != nil {
		t.Fatal(err)
	}

	w := newBookWiring(db, db, map[string]any{}, nil)
	rec := serveBootstrap(t, w, "engine=readest")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d，期望 404", rec.Code)
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["err"] != "reader.format_unsupported" {
		t.Errorf("err = %v，期望 reader.format_unsupported", got["err"])
	}
}

// TestReaderBootstrapConversionPending 回归：只有 mobi 时 409 conversion_pending。
func TestReaderBootstrapConversionPending(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, 'Kindle书', 'x', '')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', '/tmp/a.mobi', 1, 0)`); err != nil {
		t.Fatal(err)
	}

	w := newBookWiring(db, db, map[string]any{}, nil)
	rec := serveBootstrap(t, w, "engine=readest")

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d，期望 409", rec.Code)
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["err"] != "reader.conversion_pending" {
		t.Errorf("err = %v，期望 reader.conversion_pending", got["err"])
	}
}

// TestReaderResourceRevisionChangesWithFile 回归：文件一变 revision 就变。
func TestReaderResourceRevisionChangesWithFile(t *testing.T) {
	dir := t.TempDir()
	f := filepath.Join(dir, "a.epub")
	if err := os.WriteFile(f, []byte("v1"), 0o644); err != nil {
		t.Fatal(err)
	}
	first := readerResourceRevision(f)
	if first == "" {
		t.Fatal("revision 为空")
	}

	if err := os.WriteFile(f, []byte("v2-longer"), 0o644); err != nil {
		t.Fatal(err)
	}
	second := readerResourceRevision(f)
	if second == first {
		t.Error("文件内容变化后 revision 未变，前端会读到过期缓存")
	}

	if got := readerResourceRevision(filepath.Join(dir, "missing.epub")); got != "" {
		t.Errorf("文件不存在时 revision = %q，期望空串", got)
	}
}
