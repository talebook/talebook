package httpapi

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// 缺陷 10 回归：/read/<id> 必须返回阅读器 **HTML 页面**，不是 JSON。
//
// 用户可见现象：点「阅读」按钮打开新标签页，只看到一串 JSON
// `{"book_id":1,"err":"ok","formats":["mobi"],...}`，书根本打不开。
//
// 根因：bookReadBook 实现成了 JSON 接口，而 Python 的 BookRead.get
// 返回的是 html_page 渲染的阅读器页面。

// TestBookReadReturnsHTML 断言 /read/<id> 返回 HTML 页面。
func TestBookReadReturnsHTML(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	// 一本只有 MOBI 的书（走「转换中」分支）。
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '红星照耀中国', '佚名', '')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', '/tmp/x.mobi', 1, 0)`); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	w := newBookWiring(db, db, map[string]any{})
	cfg := w.Config("")
	cfg.CanViewBook = func(*Context, int64) bool { return true }

	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	rec := serveReadAsAdmin(t, srv, 1)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", rec.Code, rec.Body.String())
	}
	ct := rec.Header().Get("Content-Type")
	if !strings.Contains(ct, "text/html") {
		t.Errorf("Content-Type = %q, want text/html（JSON 说明仍是接口而非页面）", ct)
	}
	body := rec.Body.String()
	if !strings.Contains(body, "<!DOCTYPE html>") {
		t.Errorf("响应不是 HTML 文档: %q", body[:min(200, len(body))])
	}
	// 页面必须挂载阅读器并指向书籍资源。
	if !strings.Contains(body, `id="app"`) {
		t.Error("缺少阅读器挂载点 #app")
	}
	// book_url 在页面里是运行时拼接的（API + "/read/extract/" + BOOK_ID + "/"），
	// 因此断言拼接片段而非完整 URL。
	if !strings.Contains(body, `"/read/extract/" + BOOK_ID + "/"`) {
		t.Error("book_url 未指向 /read/extract/<id>/")
	}
	// MOBI 未就绪时应显示转换提示。
	if !strings.Contains(body, "正在转换为 EPUB") {
		t.Error("MOBI 书应显示转换中提示")
	}
}

// TestBookReadEPUBIsReady EPUB 书直接渲染，不显示转换提示。
func TestBookReadEPUBIsReady(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', '')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'EPUB', '/tmp/x.epub', 1, 0)`); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	w := newBookWiring(db, db, map[string]any{})
	cfg := w.Config("")
	cfg.CanViewBook = func(*Context, int64) bool { return true }

	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	rec := serveReadAsAdmin(t, srv, 1)

	body := rec.Body.String()
	if !strings.Contains(body, "const IS_READY = true") {
		t.Errorf("EPUB 书应直接就绪，body 片段: %q", body[:min(400, len(body))])
	}
}

// TestBookReadUnsupportedFormat 不可读格式返回 415。
func TestBookReadUnsupportedFormat(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, 'X', 'Y', '')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'CBR', '/tmp/x.cbr', 1, 0)`); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	w := newBookWiring(db, db, map[string]any{})
	cfg := w.Config("")
	cfg.CanViewBook = func(*Context, int64) bool { return true }

	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	srv.DB = db
	rec := serveReadAsAdmin(t, srv, 1)

	if rec.Code != http.StatusUnsupportedMediaType {
		t.Errorf("status = %d, want 415", rec.Code)
	}
}

// TestReaderBootstrapReportsConversionPending 回归：只有 MOBI 时报告转换中。
//
// 旧实现返回 {book_id, epub_ready, ...} 的 Candle 形状，
// 与 Readest 启动协议（schema/engine/book/resource/navigation）不符，
// 前端会报「阅读器启动协议不兼容」。现在改为返回 reader.conversion_pending。
func TestReaderBootstrapReportsConversionPending(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, 'X', 'Y', '')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', '/tmp/x.mobi', 1, 0)`); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	w := newBookWiring(db, db, map[string]any{})
	rec := httptest.NewRecorder()
	ctx := &Context{
		Identity: Identity{UserID: 1, IsAdmin: true},
		Writer:   rec,
		Request:  httptest.NewRequest(http.MethodGet, "/api/book/1/reader-bootstrap?engine=readest", nil),
	}
	got, err := w.bookReaderBootstrap(ctx, 1)
	if err != nil {
		t.Fatalf("bookReaderBootstrap: %v", err)
	}
	if got["err"] != "reader.conversion_pending" {
		t.Errorf("err = %v, want reader.conversion_pending（只有 MOBI，待转 EPUB）", got["err"])
	}
	if rec.Code != http.StatusConflict {
		t.Errorf("status = %d, want 409", rec.Code)
	}
}

// serveReadAsAdmin 以已激活的管理员身份请求 /read/<id>。
//
// 阅读入口有权限门禁（登录 + 激活 + 可读），测试必须同时注入身份与
// readers 行，否则会先被 user.need_login / user.activation_required 拦住，
// 测不到页面渲染。
func serveReadAsAdmin(t *testing.T, srv *Server, bookID int64) *httptest.ResponseRecorder {
	t.Helper()
	if srv.DB != nil {
		if _, err := srv.DB.Exec(
			`INSERT OR REPLACE INTO readers (id, username, active, permission) VALUES (1, 'admin', 1, '')`); err != nil {
			t.Fatalf("insert reader: %v", err)
		}
	}
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}
	req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/read/%d", bookID), nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
