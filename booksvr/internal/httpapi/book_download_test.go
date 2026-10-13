package httpapi

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// 缺陷 7 回归：/api/book/<id>.<fmt> 是**文件下载**，不是书籍详情。
//
// 该路由曾被绑定到 BookDetailHandler，导致 /api/book/1.MOBI 返回详情 JSON，
// 前端「下载」与「在线阅读」全部失效（用户可见现象：书打不开）。

func TestParseBookDownloadPath(t *testing.T) {
	cases := []struct {
		raw     string
		wantID  int64
		wantFmt string
		wantErr bool
	}{
		{"1.MOBI", 1, "MOBI", false},
		{"42.epub", 42, "EPUB", false},
		{"7.PDF", 7, "PDF", false},
		{"1", 0, "", true},        // 没有扩展名
		{"1.", 0, "", true},       // 扩展名为空
		{".epub", 0, "", true},    // 没有 id
		{"abc.epub", 0, "", true}, // id 非数字
	}
	for _, c := range cases {
		id, format, err := parseBookDownloadPath(c.raw)
		if c.wantErr {
			if err == nil {
				t.Errorf("parseBookDownloadPath(%q) 应报错，得到 (%d, %q)", c.raw, id, format)
			}
			continue
		}
		if err != nil {
			t.Errorf("parseBookDownloadPath(%q) 报错: %v", c.raw, err)
			continue
		}
		if id != c.wantID || format != c.wantFmt {
			t.Errorf("parseBookDownloadPath(%q) = (%d, %q), want (%d, %q)",
				c.raw, id, format, c.wantID, c.wantFmt)
		}
	}
}

// TestBookDownloadRouteServesFile 通过**真实路由表**验证下载。
//
// 这是缺陷 7 的关键回归：直接调 BookDownloadHandler 无法发现「路由绑错」，
// 必须让请求经过 NewServer 的路由匹配，才能复现
// 「/api/book/1.MOBI 返回详情 JSON」这一真实故障。
func TestBookDownloadRouteServesFile(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	dir := t.TempDir()
	content := []byte("MOBI-BYTES-红星照耀中国")
	path := filepath.Join(dir, "红星照耀中国.mobi")
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '红星照耀中国', '佚名', ?)`, dir); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', ?, ?, 0)`,
		path, len(content)); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	cfg := BookConfig{
		DB:          db,
		LibraryDB:   db,
		CanViewBook: func(*Context, int64) bool { return true },
		BookTitle:   func(int64) string { return "红星照耀中国" },
	}

	// 只装书籍模块的路由，避免其它模块的 catch-all 干扰。
	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}

	req := httptest.NewRequest(http.MethodGet, "/api/book/1.MOBI", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%q)", rec.Code, rec.Body.String())
	}
	// 核心断言：必须是文件内容，而不是详情 JSON。
	if got := rec.Body.String(); got != string(content) {
		t.Errorf("body = %q, want %q（若为 JSON 说明路由绑到了详情 handler）", got, content)
	}
	if ct := rec.Header().Get("Content-Type"); strings.Contains(ct, "json") {
		t.Errorf("Content-Type = %q，不应是 JSON", ct)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") {
		t.Errorf("Content-Disposition = %q, want attachment", cd)
	}
}

// TestBookDownloadServesFile 端到端：登记一个真实文件后下载应返回文件内容。
func TestBookDownloadServesFile(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	// 造一个真实文件并登记。
	dir := t.TempDir()
	content := []byte("MOBI-BYTES-红星照耀中国")
	path := filepath.Join(dir, "红星照耀中国.mobi")
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path) VALUES (1, '红星照耀中国', '佚名', ?)`, dir); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', ?, ?, 0)`,
		path, len(content)); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	cfg := BookConfig{
		DB:          db,
		LibraryDB:   db,
		CanViewBook: func(*Context, int64) bool { return true },
		BookTitle:   func(int64) string { return "红星照耀中国" },
	}

	ctx := newDownloadCtx(t, "1.MOBI")
	if _, err := BookDownloadHandler(cfg)(ctx); err != nil {
		t.Fatalf("handler 报错: %v", err)
	}

	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if got := rec.Body.String(); got != string(content) {
		t.Errorf("body = %q, want %q", got, content)
	}
	// 必须是附件下载，不是 JSON。
	if ct := rec.Header().Get("Content-Type"); strings.Contains(ct, "json") {
		t.Errorf("Content-Type = %q, 不应是 JSON（说明命中了详情 handler）", ct)
	}
	if cd := rec.Header().Get("Content-Disposition"); !strings.Contains(cd, "attachment") {
		t.Errorf("Content-Disposition = %q, want attachment", cd)
	}
}

// TestBookDownloadMissingFormat 未登记的格式应 404。
func TestBookDownloadMissingFormat(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	if _, err := db.Exec(`INSERT INTO books (id, title, author_sort, path) VALUES (1, 'X', 'Y', '')`); err != nil {
		t.Fatalf("insert book: %v", err)
	}

	cfg := BookConfig{
		DB:          db,
		LibraryDB:   db,
		CanViewBook: func(*Context, int64) bool { return true },
	}
	ctx := newDownloadCtx(t, "1.EPUB")
	if _, err := BookDownloadHandler(cfg)(ctx); err != nil {
		t.Fatalf("handler 报错: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

// TestBookDownloadDeniedWhenNotViewable 无权限时 404。
func TestBookDownloadDeniedWhenNotViewable(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	cfg := BookConfig{
		DB:          db,
		LibraryDB:   db,
		CanViewBook: func(*Context, int64) bool { return false },
	}
	ctx := newDownloadCtx(t, "1.MOBI")
	if _, err := BookDownloadHandler(cfg)(ctx); err != nil {
		t.Fatalf("handler 报错: %v", err)
	}
	rec := ctx.Writer.(*httptest.ResponseRecorder)
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

// TestBookDownloadFilenameUsesTitle 回归：下载文件名必须是原书名。
//
// 用户可见现象：下载后文件名不是书名。旧实现沿用 Python 的
// "%(id)d-%(title)s" 且对标题做 quote_plus，得到 "1-【精排】红星+（又名...）.mobi"
// —— 多了 id 前缀，空格还变成了 '+'。
func TestBookDownloadFilenameUsesTitle(t *testing.T) {
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	dir := t.TempDir()
	content := []byte("MOBI")
	path := filepath.Join(dir, "x.mobi")
	if err := os.WriteFile(path, content, 0o644); err != nil {
		t.Fatalf("write: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '红星照耀中国 （又名：西行漫记）', '佚名', ?)`, dir); err != nil {
		t.Fatalf("insert book: %v", err)
	}
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'MOBI', ?, ?, 0)`,
		path, len(content)); err != nil {
		t.Fatalf("insert format: %v", err)
	}

	cfg := BookConfig{
		DB:          db,
		LibraryDB:   db,
		CanViewBook: func(*Context, int64) bool { return true },
		BookTitle:   func(int64) string { return "红星照耀中国 （又名：西行漫记）" },
	}
	srv, err := NewServer(BookRouteSpecs(cfg))
	if err != nil {
		t.Fatalf("NewServer: %v", err)
	}
	req := httptest.NewRequest(http.MethodGet, "/api/book/1.MOBI", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	cd := rec.Header().Get("Content-Disposition")
	if !strings.Contains(cd, "attachment") {
		t.Fatalf("Content-Disposition = %q", cd)
	}
	// filename* 必须携带原始书名（RFC 5987 百分号编码）。
	if !strings.Contains(cd, "filename*=UTF-8''") {
		t.Fatalf("缺少 filename* 参数: %q", cd)
	}
	// 不得出现 id 前缀。
	if strings.Contains(cd, "filename=\"1-") {
		t.Errorf("文件名不应带 id 前缀: %q", cd)
	}
	// 不得出现 quote_plus 的 '+'（空格应保留为空格或 %20）。
	if strings.Contains(cd, "+") {
		t.Errorf("文件名不应含 '+'（quote_plus 副作用）: %q", cd)
	}
	// 解码 filename* 后应等于原书名 + 扩展名。
	idx := strings.Index(cd, "filename*=UTF-8''")
	encoded := cd[idx+len("filename*=UTF-8''"):]
	decoded, err := url.PathUnescape(encoded)
	if err != nil {
		t.Fatalf("PathUnescape(%q): %v", encoded, err)
	}
	want := "红星照耀中国 （又名：西行漫记）.mobi"
	if decoded != want {
		t.Errorf("filename* = %q, want %q", decoded, want)
	}
}

// TestSanitizeDownloadName 文件名清洗。
func TestSanitizeDownloadName(t *testing.T) {
	cases := []struct{ in, want string }{
		{"三体", "三体"},
		{"a/b\\c:d*e?f\"g<h>i|j", "a_b_c_d_e_f_g_h_i_j"},
		{"trailing. ", "trailing"},
		{"", "book"},
	}
	for _, c := range cases {
		if got := sanitizeDownloadName(c.in); got != c.want {
			t.Errorf("sanitizeDownloadName(%q) = %q, want %q", c.in, got, c.want)
		}
	}
}

// TestAsciiFallbackName 非 ASCII 名生成 ASCII 兜底。
func TestAsciiFallbackName(t *testing.T) {
	got := asciiFallbackName("三体.epub")
	if got != "__.epub" {
		t.Errorf("asciiFallbackName = %q, want %q", got, "__.epub")
	}
	if got := asciiFallbackName("Three Body.epub"); got != "Three Body.epub" {
		t.Errorf("ASCII 名不应被改写，得到 %q", got)
	}
}

// newDownloadCtx 造一个带 ResponseRecorder 的 Context。
func newDownloadCtx(t *testing.T, path string) *Context {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/book/"+path, nil)
	rec := httptest.NewRecorder()
	// Params[0] 是正则第一个捕获组，即 "1.MOBI" 这类原始路径段。
	return &Context{Writer: rec, Request: req, Params: []string{path}}
}
