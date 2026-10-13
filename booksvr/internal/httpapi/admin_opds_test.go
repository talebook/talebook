package httpapi

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"
)

// newAdminOpdsFixture 建一个 OPDS 管理夹具。
func newAdminOpdsFixture(t *testing.T) (*adminOpdsWiring, *sql.DB) {
	t.Helper()
	db := netSchemaDB(t)
	createCalibreTables(t, db)
	createFormatTables(t, db)
	dir := t.TempDir()
	w := newAdminOpdsWiring(db, map[string]any{"scan_upload_path": dir})
	return w, db
}

// opdsTestFeed 是一份测试用 OPDS 目录。
const opdsTestFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>三体</title>
    <author><name>刘慈欣</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/1.epub" type="application/epub+zip"/>
  </entry>
</feed>`

// TestAdminOpdsBrowse 覆盖目录浏览。
func TestAdminOpdsBrowse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte(opdsTestFeed))
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Browse(adminCtx(1), srv.URL)
	if err != nil {
		t.Fatalf("浏览失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if resp["total"] != 1 {
		t.Errorf("total = %v，期望 1", resp["total"])
	}
}

// TestAdminOpdsBrowseMissingURL 覆盖缺少地址。
func TestAdminOpdsBrowseMissingURL(t *testing.T) {
	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Browse(adminCtx(1), "")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAdminOpdsBrowseFetchFailed 覆盖抓取失败。
func TestAdminOpdsBrowseFetchFailed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Browse(adminCtx(1), srv.URL)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "opds.fetch_failed" {
		t.Errorf("err = %v，期望 opds.fetch_failed", resp["err"])
	}
}

// TestAdminOpdsBrowseParseFailed 覆盖解析失败。
func TestAdminOpdsBrowseParseFailed(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("not xml"))
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Browse(adminCtx(1), srv.URL)
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "opds.parse_failed" {
		t.Errorf("err = %v，期望 opds.parse_failed", resp["err"])
	}
}

// TestAdminOpdsImportAll 覆盖导入整个目录。
func TestAdminOpdsImportAll(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/1.epub" {
			_, _ = w.Write([]byte("PK\x03\x04body"))
			return
		}
		_, _ = w.Write([]byte(opdsTestFeed))
	}))
	defer srv.Close()

	w, db := newAdminOpdsFixture(t)
	resp, err := w.Import(adminCtx(1), map[string]any{"url": srv.URL})
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Fatalf("err = %v，期望 ok", resp["err"])
	}
	if resp["success"] != 1 {
		t.Errorf("success = %v，期望 1", resp["success"])
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM scanfiles`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("scanfiles 记录数 = %d，期望 1", n)
	}
}

// TestAdminOpdsImportSelected 覆盖导入选中条目。
func TestAdminOpdsImportSelected(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("PK\x03\x04body"))
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Import(adminCtx(1), map[string]any{
		"url": srv.URL,
		"books": []any{
			map[string]any{"title": "三体", "href": srv.URL + "/1.epub", "format": "epub"},
		},
	})
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if resp["success"] != 1 {
		t.Errorf("success = %v，期望 1", resp["success"])
	}
}

// TestAdminOpdsImportMissingURL 覆盖缺少地址。
func TestAdminOpdsImportMissingURL(t *testing.T) {
	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Import(adminCtx(1), map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestAdminOpdsImportPartialFailure 覆盖部分失败。
func TestAdminOpdsImportPartialFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Import(adminCtx(1), map[string]any{
		"url": srv.URL,
		"books": []any{
			map[string]any{"title": "失败书", "href": srv.URL + "/missing.epub", "format": "epub"},
		},
	})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["success"] != 0 {
		t.Errorf("success = %v，期望 0", resp["success"])
	}
	failed, ok := resp["failed"].([]map[string]any)
	if !ok || len(failed) != 1 {
		t.Errorf("failed = %v，期望 1 项", resp["failed"])
	}
}

// TestAdminOpdsStatus 覆盖状态查询。
func TestAdminOpdsStatus(t *testing.T) {
	w, db := newAdminOpdsFixture(t)
	if _, err := db.Exec(`INSERT INTO scanfiles
		(scan_id, import_id, name, path, hash, status, title, author, publisher, tags,
		 create_time, update_time, book_id, data)
		VALUES (0, 0, 'opds_a.epub', '/tmp/a.epub', 'h1', 'new', '', '', '', '',
		 '2026-01-01', '2026-01-01', 0, '')`); err != nil {
		t.Fatal(err)
	}

	status := w.Status()
	if status["total"] != int64(1) {
		t.Errorf("total = %v，期望 1", status["total"])
	}
	if status["pending"] != int64(1) {
		t.Errorf("pending = %v，期望 1", status["pending"])
	}
}

// TestAdminOpdsFailed 覆盖失败列表。
func TestAdminOpdsFailed(t *testing.T) {
	w, db := newAdminOpdsFixture(t)
	if _, err := db.Exec(`INSERT INTO scanfiles
		(scan_id, import_id, name, path, hash, status, title, author, publisher, tags,
		 create_time, update_time, book_id, data)
		VALUES (0, 0, 'opds_b.epub', '/tmp/b.epub', 'h2', 'failed', '', '', '', '',
		 '2026-01-01', '2026-01-01', 0, '下载失败')`); err != nil {
		t.Fatal(err)
	}

	failed := w.Failed()
	if len(failed) != 1 {
		t.Fatalf("failed 数 = %d，期望 1", len(failed))
	}
	if failed[0]["error"] != "下载失败" {
		t.Errorf("error = %v，期望 下载失败", failed[0]["error"])
	}
}

// TestAdminOpdsRetry 覆盖重试。
func TestAdminOpdsRetry(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("PK\x03\x04body"))
	}))
	defer srv.Close()

	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Retry(adminCtx(1), map[string]any{
		"url": srv.URL,
		"books": []any{
			map[string]any{"title": "书", "href": srv.URL + "/1.epub", "format": "epub"},
		},
	})
	if err != nil {
		t.Fatalf("重试失败: %v", err)
	}
	if resp["err"] != "ok" {
		t.Errorf("err = %v，期望 ok", resp["err"])
	}
}

// TestAdminOpdsRetryMissingURL 覆盖重试缺少地址。
func TestAdminOpdsRetryMissingURL(t *testing.T) {
	w, _ := newAdminOpdsFixture(t)
	resp, err := w.Retry(adminCtx(1), map[string]any{})
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if resp["err"] != "params.invalid" {
		t.Errorf("err = %v，期望 params.invalid", resp["err"])
	}
}

// TestScanDirOfFallback 覆盖落盘目录回落。
func TestScanDirOfFallback(t *testing.T) {
	if got := scanDirOf(map[string]any{"upload_path": "/tmp/up"}); got != "/tmp/up" {
		t.Errorf("scanDirOf = %q，期望 /tmp/up", got)
	}
	if got := scanDirOf(map[string]any{}); got != "" {
		t.Errorf("scanDirOf = %q，期望空串", got)
	}
}

// TestSelectedItemsParses 覆盖选中条目解析。
func TestSelectedItemsParses(t *testing.T) {
	items := selectedItems(map[string]any{
		"books": []any{
			map[string]any{"title": "书", "href": "http://x/1.epub", "format": "epub"},
			"not-a-map",
		},
	})
	if len(items) != 1 {
		t.Fatalf("items 数 = %d，期望 1", len(items))
	}
	if items[0].Title != "书" {
		t.Errorf("title = %q", items[0].Title)
	}
}

// TestSelectedItemsEmpty 覆盖无选中条目。
func TestSelectedItemsEmpty(t *testing.T) {
	if got := selectedItems(map[string]any{}); got != nil {
		t.Errorf("应返回 nil，实际 %v", got)
	}
}
