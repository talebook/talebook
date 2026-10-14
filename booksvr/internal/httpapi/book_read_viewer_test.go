package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// 缺陷回归：系统设置里改「EPUB 阅读器」完全不生效。
//
// 根因两处：
//  1. wiring.go 把 EPUBViewer 写死成 "creader.html"，从不读设置；
//  2. bookReadBook 对 EPUB 一律渲染 Candle Reader，
//     没有 Python 的 use_readest 分支与 /readest/talebook-launch.html 重定向。
//
// 用户可见现象：把阅读器改成 Readest 后，点「阅读」仍然打开 Candle Reader。

// epubBookWiring 造一本只有 EPUB 的书，settings 由调用方指定。
func epubBookWiring(t *testing.T, settings map[string]any) *bookWiring {
	t.Helper()
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
	return newBookWiring(db, db, settings)
}

// serveRead 以管理员身份请求 /read/1，可带 query。
func serveRead(t *testing.T, w *bookWiring, query string) *httptest.ResponseRecorder {
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
	path := "/read/1"
	if query != "" {
		path += "?" + query
	}
	req := httptest.NewRequest(http.MethodGet, path, nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)
	return rec
}

// TestBookReadUsesConfiguredViewer 回归：EPUB_VIEWER=readest 时必须重定向到 Readest。
func TestBookReadUsesConfiguredViewer(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "readest"})
	rec := serveRead(t, w, "")

	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d，期望 302 重定向到 Readest（body=%q）",
			rec.Code, rec.Body.String()[:min(200, rec.Body.Len())])
	}
	loc := rec.Header().Get("Location")
	if !strings.Contains(loc, "/readest/talebook-launch.html") {
		t.Errorf("Location = %q，期望指向 /readest/talebook-launch.html", loc)
	}
	if !strings.Contains(loc, "bookId=1") {
		t.Errorf("Location = %q，缺少 bookId=1", loc)
	}
}

// TestBookReadDefaultViewerIsCandle 回归：默认（creader.html）仍渲染 Candle Reader 页面。
func TestBookReadDefaultViewerIsCandle(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	rec := serveRead(t, w, "")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d，期望 200（body=%q）", rec.Code, rec.Body.String()[:min(200, rec.Body.Len())])
	}
	if ct := rec.Header().Get("Content-Type"); !strings.Contains(ct, "text/html") {
		t.Errorf("Content-Type = %q，期望 text/html", ct)
	}
	if !strings.Contains(rec.Body.String(), `id="app"`) {
		t.Error("缺少阅读器挂载点 #app")
	}
}

// TestBookReadExplicitReaderParamWins 回归：?reader=readest 覆盖设置。
func TestBookReadExplicitReaderParamWins(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "creader.html"})
	rec := serveRead(t, w, "reader=readest")

	if rec.Code != http.StatusFound {
		t.Fatalf("status = %d，期望 302（?reader=readest 应覆盖设置）", rec.Code)
	}
	if loc := rec.Header().Get("Location"); !strings.Contains(loc, "/readest/talebook-launch.html") {
		t.Errorf("Location = %q", loc)
	}
}

// TestBookReadExplicitCandleParam 回归：?reader=candle 时即使设置是 readest 也走 Candle。
func TestBookReadExplicitCandleParam(t *testing.T) {
	w := epubBookWiring(t, map[string]any{"EPUB_VIEWER": "readest"})
	rec := serveRead(t, w, "reader=candle")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d，期望 200（?reader=candle 应走 Candle Reader）", rec.Code)
	}
	if !strings.Contains(rec.Body.String(), `id="app"`) {
		t.Error("缺少阅读器挂载点 #app")
	}
}

// TestBookReadViewerFollowsLiveSettings 回归：改设置后不重启进程也要生效。
//
// 缺陷背景：w.settings 是启动快照，改完 EPUB_VIEWER 后 /read/<id>
// 仍按旧值选阅读器，用户看到「设置不起作用」。
func TestBookReadViewerFollowsLiveSettings(t *testing.T) {
	dir := t.TempDir()
	auto := filepath.Join(dir, "auto.py")
	if err := os.WriteFile(auto, []byte("settings = {\n    'EPUB_VIEWER' : 'creader.html',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	w := epubBookWiring(t, LoadSettings(auto)).withSettingsPath(auto)

	// 初始：creader.html → 渲染 Candle 页面。
	if rec := serveRead(t, w, ""); rec.Code != http.StatusOK {
		t.Fatalf("初始 status = %d，期望 200（Candle 页面）", rec.Code)
	}

	// 磁盘上的设置变了（相当于管理员在设置页保存）。
	if err := os.WriteFile(auto, []byte("settings = {\n    'EPUB_VIEWER' : 'readest',\n}\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	rec := serveRead(t, w, "")
	if rec.Code != http.StatusFound {
		t.Fatalf("改设置后 status = %d，期望 302（应重读磁盘走 Readest）", rec.Code)
	}
	if loc := rec.Header().Get("Location"); !strings.Contains(loc, "/readest/talebook-launch.html") {
		t.Errorf("Location = %q", loc)
	}
}

// TestBookConfigEPUBViewerFromSettings 回归：Config 必须从 settings 读 EPUBViewer。
func TestBookConfigEPUBViewerFromSettings(t *testing.T) {
	w := newBookWiring(nil, nil, map[string]any{"EPUB_VIEWER": "readest"})
	if got := w.Config("").EPUBViewer; got != "readest" {
		t.Errorf("EPUBViewer = %q，期望从 settings 读到 readest（写死会导致设置不生效）", got)
	}

	w2 := newBookWiring(nil, nil, map[string]any{})
	if got := w2.Config("").EPUBViewer; got != "" {
		t.Errorf("EPUBViewer = %q，settings 无该键时应为空", got)
	}
}
