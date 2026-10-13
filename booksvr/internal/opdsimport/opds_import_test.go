package opdsimport

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "modernc.org/sqlite"
)

// newTestDB 建一个带 scanfiles 表的内存库。
func newTestDB(t *testing.T) *sql.DB {
	t.Helper()
	db, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("打开内存库失败: %v", err)
	}
	db.SetMaxOpenConns(1)
	t.Cleanup(func() { db.Close() })

	// 表名与列名对齐 userdb/testdata/schema.sql 的 scanfiles。
	if _, err := db.Exec(`CREATE TABLE scanfiles (
		id INTEGER PRIMARY KEY, scan_id INTEGER, import_id INTEGER, name VARCHAR(512),
		path VARCHAR(1024), hash VARCHAR(512), status VARCHAR(24), title VARCHAR(100),
		author VARCHAR(100), publisher VARCHAR(100), tags VARCHAR(100),
		create_time DATETIME, update_time DATETIME, book_id INTEGER, data TEXT,
		UNIQUE (hash))`); err != nil {
		t.Fatalf("建表失败: %v", err)
	}
	return db
}

// sampleFeed 是一份典型的 OPDS 目录。
const sampleFeed = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>测试目录</title>
  <entry>
    <title>三体</title>
    <author><name>刘慈欣</name></author>
    <link rel="http://opds-spec.org/acquisition" href="/books/1.epub" type="application/epub+zip"/>
    <link rel="http://opds-spec.org/cover" href="/covers/1.jpg"/>
    <summary>科幻小说</summary>
  </entry>
  <entry>
    <title>科幻分类</title>
    <link rel="subsection" href="/catalog/scifi"/>
  </entry>
  <entry>
    <title>无链接条目</title>
  </entry>
</feed>`

// TestParseCatalogBooks 覆盖书籍条目解析。
func TestParseCatalogBooks(t *testing.T) {
	s := NewService(t.TempDir())
	items, err := s.ParseCatalog([]byte(sampleFeed), "http://example.com/opds")
	if err != nil {
		t.Fatalf("解析失败: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("条目数 = %d，期望 2（无链接条目应被跳过）", len(items))
	}

	book := items[0]
	if book.Title != "三体" {
		t.Errorf("title = %q，期望 三体", book.Title)
	}
	if book.Author != "刘慈欣" {
		t.Errorf("author = %q，期望 刘慈欣", book.Author)
	}
	if book.IsFolder {
		t.Error("书籍不应标记为文件夹")
	}
	if book.Format != "epub" {
		t.Errorf("format = %q，期望 epub", book.Format)
	}
	if book.Href != "http://example.com/books/1.epub" {
		t.Errorf("href = %q，期望绝对地址", book.Href)
	}
	if book.Cover != "http://example.com/covers/1.jpg" {
		t.Errorf("cover = %q", book.Cover)
	}
	if book.Summary != "科幻小说" {
		t.Errorf("summary = %q", book.Summary)
	}
	if book.ID == "" {
		t.Error("id 为空")
	}
}

// TestParseCatalogFolders 覆盖目录项解析。
func TestParseCatalogFolders(t *testing.T) {
	s := NewService(t.TempDir())
	items, _ := s.ParseCatalog([]byte(sampleFeed), "http://example.com/opds")
	if len(items) < 2 {
		t.Fatal("条目不足")
	}
	folder := items[1]
	if !folder.IsFolder {
		t.Error("subsection 链接应标记为文件夹")
	}
	if folder.Href != "http://example.com/catalog/scifi" {
		t.Errorf("href = %q", folder.Href)
	}
}

// TestParseCatalogBadXML 覆盖非法 XML。
func TestParseCatalogBadXML(t *testing.T) {
	s := NewService(t.TempDir())
	if _, err := s.ParseCatalog([]byte("not xml"), ""); err == nil {
		t.Error("非法 XML 应返回错误")
	}
}

// TestParseCatalogEmpty 覆盖空 feed。
func TestParseCatalogEmpty(t *testing.T) {
	s := NewService(t.TempDir())
	items, err := s.ParseCatalog([]byte(`<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"></feed>`), "")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if len(items) != 0 {
		t.Errorf("条目数 = %d，期望 0", len(items))
	}
}

// TestParseCatalogDefaults 覆盖缺失字段的默认值。
func TestParseCatalogDefaults(t *testing.T) {
	xmlBody := `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <link rel="http://opds-spec.org/acquisition" href="http://x/a.epub" type="application/epub+zip"/>
  </entry>
</feed>`
	s := NewService(t.TempDir())
	items, err := s.ParseCatalog([]byte(xmlBody), "")
	if err != nil {
		t.Fatalf("意外错误: %v", err)
	}
	if len(items) != 1 {
		t.Fatalf("条目数 = %d，期望 1", len(items))
	}
	if items[0].Title != "未知标题" {
		t.Errorf("title = %q，期望 未知标题", items[0].Title)
	}
	if items[0].Author != "未知作者" {
		t.Errorf("author = %q，期望 未知作者", items[0].Author)
	}
}

// TestParseCatalogContentFallback 覆盖 content 作为摘要回落。
func TestParseCatalogContentFallback(t *testing.T) {
	xmlBody := `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>书</title>
    <content>来自 content 的摘要</content>
    <link rel="http://opds-spec.org/acquisition" href="http://x/a.epub" type="application/epub+zip"/>
  </entry>
</feed>`
	s := NewService(t.TempDir())
	items, _ := s.ParseCatalog([]byte(xmlBody), "")
	if items[0].Summary != "来自内容 的摘要" && items[0].Summary != "来自 content 的摘要" {
		t.Errorf("summary = %q", items[0].Summary)
	}
}

// TestFetchCatalog 覆盖目录抓取。
func TestFetchCatalog(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/atom+xml")
		_, _ = w.Write([]byte(sampleFeed))
	}))
	defer srv.Close()

	s := NewService(t.TempDir())
	body, err := s.FetchCatalog(srv.URL)
	if err != nil {
		t.Fatalf("抓取失败: %v", err)
	}
	if !strings.Contains(string(body), "三体") {
		t.Errorf("响应缺少内容: %s", string(body))
	}
}

// TestFetchCatalogError 覆盖抓取失败。
func TestFetchCatalogError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	s := NewService(t.TempDir())
	if _, err := s.FetchCatalog(srv.URL); err == nil {
		t.Error("500 应返回错误")
	}
}

// TestDownloadWritesFile 覆盖下载落盘。
func TestDownloadWritesFile(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("PK\x03\x04book-body"))
	}))
	defer srv.Close()

	dir := t.TempDir()
	s := NewService(dir)
	path, err := s.Download(CatalogItem{
		Title:  "三体",
		Href:   srv.URL + "/1.epub",
		Format: "epub",
	})
	if err != nil {
		t.Fatalf("下载失败: %v", err)
	}
	body, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("文件不存在: %v", err)
	}
	if string(body) != "PK\x03\x04book-body" {
		t.Errorf("内容 = %q", string(body))
	}
	if !strings.HasPrefix(filepath.Base(path), "opds_") {
		t.Errorf("文件名 = %q，期望 opds_ 前缀", filepath.Base(path))
	}
}

// TestDownloadMissingHref 覆盖缺少链接。
func TestDownloadMissingHref(t *testing.T) {
	s := NewService(t.TempDir())
	if _, err := s.Download(CatalogItem{Title: "书"}); err == nil {
		t.Error("缺少链接应返回错误")
	}
}

// TestDownloadDeduplicatesName 覆盖重名文件加后缀。
func TestDownloadDeduplicatesName(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("body"))
	}))
	defer srv.Close()

	dir := t.TempDir()
	s := NewService(dir)
	item := CatalogItem{Title: "同名", Href: srv.URL + "/a.epub", Format: "epub"}

	first, err := s.Download(item)
	if err != nil {
		t.Fatal(err)
	}
	second, err := s.Download(item)
	if err != nil {
		t.Fatal(err)
	}
	if first == second {
		t.Error("重名文件应生成不同路径")
	}
}

// TestImportToScanRecords 覆盖导入并登记 ScanFile。
func TestImportToScanRecords(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("PK\x03\x04body"))
	}))
	defer srv.Close()

	db := newTestDB(t)
	s := NewService(t.TempDir())
	out, err := s.ImportToScan(db, CatalogItem{
		Title: "三体", Author: "刘慈欣", Href: srv.URL + "/1.epub", Format: "epub",
	})
	if err != nil {
		t.Fatalf("导入失败: %v", err)
	}
	if out["title"] != "三体" {
		t.Errorf("title = %v", out["title"])
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM scanfiles`).Scan(&status); err != nil {
		t.Fatalf("ScanFile 未登记: %v", err)
	}
	if status != "new" {
		t.Errorf("status = %q，期望 new", status)
	}
}

// TestImportToScanFailure 覆盖下载失败时登记 failed。
func TestImportToScanFailure(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
	}))
	defer srv.Close()

	db := newTestDB(t)
	s := NewService(t.TempDir())
	if _, err := s.ImportToScan(db, CatalogItem{
		Title: "书", Href: srv.URL + "/missing.epub", Format: "epub",
	}); err == nil {
		t.Fatal("下载失败应返回错误")
	}

	var status string
	if err := db.QueryRow(`SELECT status FROM scanfiles`).Scan(&status); err != nil {
		t.Fatalf("ScanFile 未登记: %v", err)
	}
	if status != "failed" {
		t.Errorf("status = %q，期望 failed", status)
	}
}

// TestImportToScanUpdatesExisting 覆盖重复导入更新既有记录。
func TestImportToScanUpdatesExisting(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, _ = w.Write([]byte("body"))
	}))
	defer srv.Close()

	db := newTestDB(t)
	s := NewService(t.TempDir())
	item := CatalogItem{Title: "书", Href: srv.URL + "/a.epub", Format: "epub"}

	if _, err := s.ImportToScan(db, item); err != nil {
		t.Fatal(err)
	}
	if _, err := s.ImportToScan(db, item); err != nil {
		t.Fatal(err)
	}

	var n int
	if err := db.QueryRow(`SELECT COUNT(1) FROM scanfiles`).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 1 {
		t.Errorf("记录数 = %d，期望 1（应更新而非重复插入）", n)
	}
}

// TestGuessFormat 覆盖格式推断。
func TestGuessFormat(t *testing.T) {
	cases := map[string]string{
		"http://x/a.epub":         "epub",
		"http://x/a.PDF":          "pdf",
		"http://x/a.mobi?token=1": "mobi",
		"http://x/noext":          "",
	}
	for in, want := range cases {
		if got := GuessFormat(in); got != want {
			t.Errorf("GuessFormat(%q) = %q，期望 %q", in, got, want)
		}
	}
}

// TestFormatFromType 覆盖 MIME 推断。
func TestFormatFromType(t *testing.T) {
	cases := map[string]string{
		"application/epub+zip": "epub",
		"application/pdf":      "pdf",
		"":                     "",
		"invalid":              "",
	}
	for in, want := range cases {
		if got := formatFromType(in); got != want {
			t.Errorf("formatFromType(%q) = %q，期望 %q", in, got, want)
		}
	}
}

// TestResolveURL 覆盖相对地址解析。
func TestResolveURL(t *testing.T) {
	if got := resolveURL("http://x/opds", "/a.epub"); got != "http://x/a.epub" {
		t.Errorf("resolveURL = %q", got)
	}
	if got := resolveURL("http://x/opds", "http://y/b.epub"); got != "http://y/b.epub" {
		t.Errorf("绝对地址不应改写: %q", got)
	}
	if got := resolveURL("", "/a.epub"); got != "/a.epub" {
		t.Errorf("无 base 时原样返回: %q", got)
	}
}

// TestItemIDStable 覆盖 id 稳定性。
func TestItemIDStable(t *testing.T) {
	a := itemID("http://x/a.epub")
	b := itemID("http://x/a.epub")
	if a != b {
		t.Error("同一 href 的 id 应一致")
	}
	if len(a) != 16 {
		t.Errorf("id 长度 = %d，期望 16", len(a))
	}
	if itemID("http://x/b.epub") == a {
		t.Error("不同 href 的 id 应不同")
	}
}

// TestItemHashEmpty 覆盖空 href。
func TestItemHashEmpty(t *testing.T) {
	if got := itemHash(""); got != "" {
		t.Errorf("空 href 应返回空串，实际 %q", got)
	}
}

// TestTargetFilenameSanitizes 覆盖文件名清理。
func TestTargetFilenameSanitizes(t *testing.T) {
	got := targetFilename("三体/第一部", "epub")
	if strings.ContainsAny(got, "/\\") {
		t.Errorf("文件名含非法字符: %q", got)
	}
	if !strings.HasPrefix(got, "opds_") || !strings.HasSuffix(got, ".epub") {
		t.Errorf("文件名格式错误: %q", got)
	}
}

// TestTargetFilenameTruncates 覆盖超长标题截断。
func TestTargetFilenameTruncates(t *testing.T) {
	got := targetFilename(strings.Repeat("a", 200), "epub")
	if len(got) > 70 {
		t.Errorf("文件名过长: %d", len(got))
	}
}

// TestTargetFilenameEmptyTitle 覆盖空标题回落。
func TestTargetFilenameEmptyTitle(t *testing.T) {
	got := targetFilename("", "epub")
	if got != "opds_book.epub" {
		t.Errorf("targetFilename = %q，期望 opds_book.epub", got)
	}
}

// TestUniqueSuffix 覆盖唯一后缀。
func TestUniqueSuffix(t *testing.T) {
	a := uniqueSuffix("a.epub")
	b := uniqueSuffix("a.epub")
	if a == b {
		t.Error("两次生成应不同")
	}
	if !strings.HasSuffix(a, ".epub") {
		t.Errorf("后缀丢失: %q", a)
	}
}
