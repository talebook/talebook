package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// 缺陷回归：/read/resource/<id>.epub 用音频助手返回，导致 Readest 打不开书。
//
// 用户可见现象：Readest 页面报
// 「Failed to open the book file: online.network」。
//
// 根因两处：
//  1. handler 调 serveAudioFile，把 Content-Type 写死成 audio/mpeg；
//  2. 路由只注册 GET，Readest 先发的 HEAD 探测得到 405。

// epubResourceWiring 造一本带真实 EPUB 文件的书。
func epubResourceWiring(t *testing.T) (*bookWiring, string) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)

	root := t.TempDir()
	dir := filepath.Join(root, "A", "B")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	epub := filepath.Join(dir, "book.epub")
	content := []byte("PK\x03\x04" + strings.Repeat("epub-payload-", 100))
	if err := os.WriteFile(epub, content, 0o644); err != nil {
		t.Fatal(err)
	}

	if _, err := db.Exec(
		`INSERT INTO books (id, title, author_sort, path) VALUES (1, '三体', '刘慈欣', 'A/B')`); err != nil {
		t.Fatal(err)
	}
	// ResolvePath 直接拿 book_formats.path 去 os.Stat，所以必须存绝对路径。
	if _, err := db.Exec(
		`INSERT INTO book_formats (book_id, format, path, size, mtime) VALUES (1, 'EPUB', ?, ?, 0)`,
		epub, len(content)); err != nil {
		t.Fatal(err)
	}

	w := newBookWiring(db, db, map[string]any{}, nil)
	w.libraryRoot = root
	return w, epub
}

// serveResource 以管理员身份请求 /read/resource/1.epub。
func serveResource(t *testing.T, w *bookWiring, method string, headers map[string]string) *httptest.ResponseRecorder {
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
		t.Fatal(err)
	}
	srv.Identify = func(*http.Request) (Identity, error) {
		return Identity{UserID: 1, IsAdmin: true}, nil
	}
	req := httptest.NewRequest(method, "/read/resource/1.epub?revision=x", nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

// TestReaderResourceContentTypeIsEPUB 回归：MIME 必须是 application/epub+zip。
func TestReaderResourceContentTypeIsEPUB(t *testing.T) {
	w, _ := epubResourceWiring(t)
	rec := serveResource(t, w, http.MethodGet, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d，期望 200", rec.Code)
	}
	ct := rec.Header().Get("Content-Type")
	if !strings.Contains(ct, "application/epub+zip") {
		t.Errorf("Content-Type = %q，期望 application/epub+zip（audio/mpeg 会让 Readest 拒绝打开）", ct)
	}
	if strings.Contains(ct, "audio/") {
		t.Errorf("Content-Type = %q，仍是音频类型", ct)
	}
}

// TestReaderResourceSupportsHEAD 回归：HEAD 必须返回 200 与长度信息。
//
// Readest 会先发 HEAD 探测；405 会让它报
// 「Failed to open the book file: online.network」。
func TestReaderResourceSupportsHEAD(t *testing.T) {
	w, epub := epubResourceWiring(t)
	rec := serveResource(t, w, http.MethodHead, nil)

	if rec.Code != http.StatusOK {
		t.Fatalf("HEAD status = %d，期望 200（405 会让 Readest 打不开书）", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "application/epub+zip") {
		t.Errorf("HEAD Content-Type = %q", ct)
	}
	if ar := rec.Header().Get("Accept-Ranges"); ar != "bytes" {
		t.Errorf("Accept-Ranges = %q，期望 bytes", ar)
	}
	if cl := rec.Header().Get("Content-Length"); cl == "" {
		t.Error("HEAD 缺少 Content-Length")
	}
	// HEAD 不能带响应体。
	if rec.Body.Len() != 0 {
		t.Errorf("HEAD 响应体长度 = %d，期望 0", rec.Body.Len())
	}
	_ = epub
}

// TestReaderResourceSupportsRange 回归：Range 请求返回 206 与正确分片。
func TestReaderResourceSupportsRange(t *testing.T) {
	w, epub := epubResourceWiring(t)
	rec := serveResource(t, w, http.MethodGet, map[string]string{"Range": "bytes=0-9"})

	if rec.Code != http.StatusPartialContent {
		t.Fatalf("status = %d，期望 206", rec.Code)
	}
	if rec.Body.Len() != 10 {
		t.Errorf("分片长度 = %d，期望 10", rec.Body.Len())
	}
	want, err := os.ReadFile(epub)
	if err != nil {
		t.Fatal(err)
	}
	if got := rec.Body.String(); got != string(want[:10]) {
		t.Errorf("分片内容 = %q，期望 %q", got, string(want[:10]))
	}
	if cr := rec.Header().Get("Content-Range"); cr == "" {
		t.Error("206 响应缺少 Content-Range")
	}
}

// TestReaderResourceRouteAllowsHead 回归：路由表必须包含 HEAD。
func TestReaderResourceRouteAllowsHead(t *testing.T) {
	specs := BookRouteSpecs(BookConfig{})
	for _, s := range specs {
		if s.Pattern != rBookReaderRes {
			continue
		}
		hasHead := false
		for _, m := range s.Methods {
			if m == http.MethodHead {
				hasHead = true
			}
		}
		if !hasHead {
			t.Errorf("路由 %s 的方法 %v 不含 HEAD", s.Pattern, s.Methods)
		}
		return
	}
	t.Fatalf("未找到路由 %s", rBookReaderRes)
}

// TestReaderResourceSendsETagAndNoCache 回归：Readest 的在线源校验
// 要求响应带 ETag（HEAD 与 GET 各取一次并比对，缺失报
// online.response_invalid），且禁止启发式缓存——否则浏览器会复用
// 修复前无 ETag 的旧响应，书永远打不开。
func TestReaderResourceSendsETagAndNoCache(t *testing.T) {
	w, epub := epubResourceWiring(t)

	want := readerResourceRevision(epub)
	if want == "" {
		t.Fatal("readerResourceRevision 返回空")
	}

	for _, method := range []string{http.MethodHead, http.MethodGet} {
		rec := serveResource(t, w, method, nil)
		if rec.Code != http.StatusOK {
			t.Fatalf("%s status = %d，期望 200", method, rec.Code)
		}
		etag := rec.Header().Get("ETag")
		if etag != `"`+want+`"` {
			t.Errorf("%s ETag = %q，期望 %q", method, etag, `"`+want+`"`)
		}
		if cc := rec.Header().Get("Cache-Control"); cc != "no-cache" {
			t.Errorf("%s Cache-Control = %q，期望 no-cache", method, cc)
		}
	}
}
